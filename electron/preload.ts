import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/types.js'
import type { AnnotationFile, AppConfig, OpenedFile, PdfExportPayload, PdfExportProgress, ThemeMode } from '../shared/types.js'

const api = {
  openFileDialog: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE_DIALOG),

  readFile: (filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, filePath),

  readAnnotation: (filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_ANNOTATION, filePath),

  writeAnnotation: (filePath: string, data: AnnotationFile) =>
    ipcRenderer.invoke(IPC_CHANNELS.WRITE_ANNOTATION, filePath, data),

  getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CONFIG),

  setConfig: (config: Partial<AppConfig>) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_CONFIG, config),

  addRecentFile: (filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_RECENT_FILE, filePath),

  setNativeTheme: (theme: ThemeMode) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_NATIVE_THEME, theme),

  exportMarkdown: (content: string, defaultName: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_MARKDOWN, content, defaultName),

  exportPdf: (payload: PdfExportPayload, defaultName: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_PDF, payload, defaultName),

  watchFile: (filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.WATCH_FILE, filePath),

  unwatchFile: (filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.UNWATCH_FILE, filePath),

  onExportAnnotations: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.ON_EXPORT_ANNOTATIONS, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_EXPORT_ANNOTATIONS, handler)
    }
  },

  onExportPdf: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.ON_EXPORT_PDF, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_EXPORT_PDF, handler)
    }
  },

  onPdfExportProgress: (callback: (progress: PdfExportProgress) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: PdfExportProgress) => {
      callback(progress)
    }
    ipcRenderer.on(IPC_CHANNELS.ON_PDF_EXPORT_PROGRESS, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_PDF_EXPORT_PROGRESS, handler)
    }
  },

  revealInFolder: (filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.REVEAL_IN_FOLDER, filePath),

  onFileChanged: (callback: (filePath: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string) => {
      callback(filePath)
    }
    ipcRenderer.on(IPC_CHANNELS.ON_FILE_CHANGED, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_FILE_CHANGED, handler)
    }
  },

  onToggleFocusMode: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.ON_TOGGLE_FOCUS_MODE, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_TOGGLE_FOCUS_MODE, handler)
    }
  },

  onFileOpened: (callback: (file: OpenedFile) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, file: OpenedFile) => {
      callback(file)
    }
    ipcRenderer.on(IPC_CHANNELS.ON_FILE_OPENED, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_FILE_OPENED, handler)
    }
  },
}

contextBridge.exposeInMainWorld('mdtool', api)
