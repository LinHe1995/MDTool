import { app, BrowserWindow, Menu, shell, session } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  registerIpcHandlers,
  setMainWindow,
  pickAndOpenFileInRenderer,
  openFileByPathInRenderer,
  requestExportAnnotationsInRenderer,
  requestExportPdfInRenderer,
  requestToggleFocusModeInRenderer,
} from './ipc/handlers'
import { readConfig } from './services/configService'
import {
  applyNativeTheme,
  getInitialWindowBackground,
} from './services/themeService'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let pendingFilePath: string | null = null

function getPendingFileFromArgv(): string | null {
  const arg = process.argv.find(
    (a) => a.endsWith('.md') || a.endsWith('.markdown'),
  )
  return arg ?? null
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开…',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            void pickAndOpenFileInRenderer()
          },
        },
        {
          label: '导出批注…',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => {
            void requestExportAnnotationsInRenderer()
          },
        },
        {
          label: '导出 PDF…',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            void requestExportPdfInRenderer()
          },
        },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        {
          label: '专注模式',
          accelerator: 'F11',
          click: () => {
            requestToggleFocusModeInRenderer()
          },
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function resolvePreloadPath(): string {
  for (const name of ['preload.js', 'preload.cjs', 'preload.mjs']) {
    const candidate = path.join(__dirname, name)
    if (fs.existsSync(candidate)) return candidate
  }
  return path.join(__dirname, 'preload.js')
}

function createWindow(backgroundColor: string) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'MDTool',
    show: false,
    backgroundColor,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  setMainWindow(mainWindow)

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('Preload 加载失败:', preloadPath, error)
  })

  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error(
        '页面加载失败:',
        errorCode,
        errorDescription,
        validatedURL,
      )
    },
  )

  mainWindow.webContents.on('console-message', (_event, _level, message) => {
    if (message.includes('Content Security Policy')) {
      console.error('[Renderer CSP]', message)
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  mainWindow.webContents.on('did-finish-load', () => {
    const fileToOpen = pendingFilePath ?? getPendingFileFromArgv()
    if (fileToOpen) {
      void openFileByPathInRenderer(fileToOpen)
      pendingFilePath = null
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    setMainWindow(null)
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  // 生产环境设置 CSP（开发模式由 Vite 提供脚本，不可限制 unsafe-eval）
  if (!process.env.VITE_DEV_SERVER_URL) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: file:; font-src 'self' data: file:",
          ],
        },
      })
    })
  }

  registerIpcHandlers()

  const config = await readConfig()
  applyNativeTheme(config.theme)
  buildMenu()
  createWindow(getInitialWindowBackground(config.theme))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void readConfig().then((cfg) => {
        createWindow(getInitialWindowBackground(cfg.theme))
      })
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('open-file', (event, filePath) => {
  event.preventDefault()
  if (mainWindow) {
    void openFileByPathInRenderer(filePath)
  } else {
    pendingFilePath = filePath
  }
})
