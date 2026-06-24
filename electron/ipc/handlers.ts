import fs from 'node:fs/promises'
import { dialog, ipcMain, BrowserWindow, shell } from 'electron'
import { IPC_CHANNELS } from '../../shared/types.js'
import type { AnnotationFile, AppConfig, OpenedFile, PdfExportPayload, PdfExportProgress, ThemeMode } from '../../shared/types.js'
import { readMarkdownFile } from '../services/fileService'
import {
  readAnnotationFile,
  writeAnnotationFile,
} from '../services/annotationService'
import { readConfig, writeConfig } from '../services/configService'
import {
  applyNativeTheme,
  registerNativeThemeListener,
} from '../services/themeService'
import {
  unwatchMarkdownFile,
  watchMarkdownFile,
} from '../services/fileWatchService'
import {
  exportHtmlToPdf,
} from '../services/pdfExportService'

let mainWindow: BrowserWindow | null = null

const FILE_FILTERS: Electron.FileFilter[] = [
  { name: 'Markdown', extensions: ['md', 'markdown'] },
  { name: '所有文件', extensions: ['*'] },
]

export function setMainWindow(win: BrowserWindow | null) {
  mainWindow = win
}

function getDialogParent(): BrowserWindow | undefined {
  const focused = BrowserWindow.getFocusedWindow()
  if (focused) return focused
  return mainWindow ?? undefined
}

export async function notifyRendererFileOpened(file: OpenedFile) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send(IPC_CHANNELS.ON_FILE_OPENED, file)
    })
    return
  }
  mainWindow.webContents.send(IPC_CHANNELS.ON_FILE_OPENED, file)
}

export async function openFileByPathInRenderer(filePath: string) {
  const file = await readMarkdownFile(filePath)
  await notifyRendererFileOpened(file)
  return file
}

export async function showOpenFileDialog(): Promise<OpenedFile | null> {
  const parent = getDialogParent()
  parent?.focus()

  const result = await dialog.showOpenDialog(parent ?? mainWindow!, {
    properties: ['openFile'],
    filters: FILE_FILTERS,
  })

  if (result.canceled || !result.filePaths[0]) {
    return null
  }

  return readMarkdownFile(result.filePaths[0])
}

export async function requestExportAnnotationsInRenderer() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send(IPC_CHANNELS.ON_EXPORT_ANNOTATIONS)
}

export function requestToggleFocusModeInRenderer() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send(IPC_CHANNELS.ON_TOGGLE_FOCUS_MODE)
}

export async function requestExportPdfInRenderer() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send(IPC_CHANNELS.ON_EXPORT_PDF)
}

export async function pickAndOpenFileInRenderer(): Promise<void> {
  try {
    const file = await showOpenFileDialog()
    if (file) {
      await notifyRendererFileOpened(file)
    }
  } catch (error) {
    dialog.showErrorBox(
      '打开文件失败',
      error instanceof Error ? error.message : String(error),
    )
  }
}

export function registerIpcHandlers() {
  registerNativeThemeListener(() => mainWindow)

  ipcMain.handle(IPC_CHANNELS.OPEN_FILE_DIALOG, async () => {
    try {
      return await showOpenFileDialog()
    } catch (error) {
      dialog.showErrorBox(
        '打开文件失败',
        error instanceof Error ? error.message : String(error),
      )
      return null
    }
  })

  ipcMain.handle(IPC_CHANNELS.READ_FILE, async (_event, filePath: string) => {
    return readMarkdownFile(filePath)
  })

  ipcMain.handle(
    IPC_CHANNELS.READ_ANNOTATION,
    async (_event, filePath: string) => {
      return readAnnotationFile(filePath)
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.WRITE_ANNOTATION,
    async (_event, filePath: string, data: AnnotationFile) => {
      await writeAnnotationFile(filePath, data)
    },
  )

  ipcMain.handle(IPC_CHANNELS.GET_CONFIG, async () => {
    return readConfig()
  })

  ipcMain.handle(
    IPC_CHANNELS.SET_CONFIG,
    async (_event, partial: Partial<AppConfig>) => {
      return writeConfig(partial)
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.ADD_RECENT_FILE,
    async (_event, filePath: string) => {
      const config = await readConfig()
      const recent = [
        filePath,
        ...config.recentFiles.filter((p) => p !== filePath),
      ].slice(0, 20)
      return writeConfig({ recentFiles: recent })
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.SET_NATIVE_THEME,
    async (_event, theme: ThemeMode) => {
      applyNativeTheme(theme, mainWindow)
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.EXPORT_MARKDOWN,
    async (_event, content: string, defaultName: string) => {
      const parent = getDialogParent()
      const result = await dialog.showSaveDialog(parent ?? mainWindow!, {
        defaultPath: defaultName,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      })
      if (result.canceled || !result.filePath) return false
      await fs.writeFile(result.filePath, content, 'utf-8')
      return true
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.EXPORT_PDF,
    async (_event, payload: PdfExportPayload, defaultName: string) => {
      const sendProgress = (progress: PdfExportProgress) => {
        if (!mainWindow || mainWindow.isDestroyed()) return
        mainWindow.webContents.send(IPC_CHANNELS.ON_PDF_EXPORT_PROGRESS, progress)
      }
      return exportHtmlToPdf(
        getDialogParent(),
        mainWindow,
        payload,
        defaultName,
        sendProgress,
      )
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.REVEAL_IN_FOLDER,
    async (_event, filePath: string) => {
      shell.showItemInFolder(filePath)
    },
  )

  ipcMain.handle(IPC_CHANNELS.WATCH_FILE, async (_event, filePath: string) => {
    watchMarkdownFile(filePath, (changedPath) => {
      mainWindow?.webContents.send(IPC_CHANNELS.ON_FILE_CHANGED, changedPath)
    })
  })

  ipcMain.handle(IPC_CHANNELS.UNWATCH_FILE, async (_event, filePath: string) => {
    unwatchMarkdownFile(filePath)
  })
}
