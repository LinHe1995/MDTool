export type HighlightApplyStatus = 'active' | 'repaired' | 'orphaned' | 'ambiguous'

export interface ParagraphAnchor {
  type: 'paragraph-offset'
  blockIndex: number
  startOffset: number
  endOffset: number
}

export interface Highlight {
  id: string
  color: string
  text: string
  prefix: string
  suffix: string
  anchor: ParagraphAnchor
  note?: string
  createdAt: string
  updatedAt: string
}

export interface Bookmark {
  id: string
  title: string
  anchor: { blockIndex: number; offset: number }
  createdAt: string
}

export interface AnnotationFile {
  version: number
  sourceFile: string
  sourceHash?: string
  highlights: Highlight[]
  bookmarks: Bookmark[]
  scratchpad?: {
    content: string
    isPersisted: boolean
  }
  lastPosition?: {
    scrollRatio: number
    nearestHeading?: string
  }
}

export type ThemeMode = 'light' | 'dark' | 'system'

export interface AppConfig {
  theme: ThemeMode
  fontSize: number
  contentWidth: 'narrow' | 'medium' | 'wide'
  recentFiles: string[]
  enableMath: boolean
  enableMermaid: boolean
}

export interface OutlineItem {
  id: string
  level: number
  text: string
  blockIndex: number
}

export interface OpenedFile {
  path: string
  name: string
  content: string
  contentHash: string
}

export const IPC_CHANNELS = {
  OPEN_FILE_DIALOG: 'dialog:openFile',
  READ_FILE: 'file:read',
  READ_ANNOTATION: 'annotation:read',
  WRITE_ANNOTATION: 'annotation:write',
  GET_CONFIG: 'config:get',
  SET_CONFIG: 'config:set',
  ADD_RECENT_FILE: 'config:addRecent',
  ON_FILE_OPENED: 'file:opened',
  SET_NATIVE_THEME: 'theme:setNative',
  EXPORT_MARKDOWN: 'file:exportMarkdown',
  EXPORT_PDF: 'file:exportPdf',
  ON_EXPORT_ANNOTATIONS: 'annotation:exportRequest',
  ON_EXPORT_PDF: 'file:exportPdfRequest',
  ON_PDF_EXPORT_PROGRESS: 'file:exportPdfProgress',
  REVEAL_IN_FOLDER: 'file:revealInFolder',
  WATCH_FILE: 'file:watch',
  UNWATCH_FILE: 'file:unwatch',
  ON_FILE_CHANGED: 'file:changed',
  ON_TOGGLE_FOCUS_MODE: 'view:toggleFocus',
} as const

export interface PdfExportPayload {
  html: string
  title: string
  theme: 'light' | 'dark'
}

export interface PdfExportProgress {
  percent: number
  message: string
}

export interface PdfExportResult {
  ok: boolean
  canceled?: boolean
  filePath?: string
}

export interface MdtoolApi {
  openFileDialog: () => Promise<OpenedFile | null>
  readFile: (filePath: string) => Promise<OpenedFile>
  readAnnotation: (filePath: string) => Promise<AnnotationFile>
  writeAnnotation: (filePath: string, data: AnnotationFile) => Promise<void>
  getConfig: () => Promise<AppConfig>
  setConfig: (config: Partial<AppConfig>) => Promise<AppConfig>
  addRecentFile: (filePath: string) => Promise<AppConfig>
  setNativeTheme: (theme: ThemeMode) => Promise<void>
  exportMarkdown: (content: string, defaultName: string) => Promise<boolean>
  exportPdf: (payload: PdfExportPayload, defaultName: string) => Promise<PdfExportResult>
  onExportAnnotations: (callback: () => void) => () => void
  onExportPdf: (callback: () => void) => () => void
  onPdfExportProgress: (callback: (progress: PdfExportProgress) => void) => () => void
  revealInFolder: (filePath: string) => Promise<void>
  watchFile: (filePath: string) => Promise<void>
  unwatchFile: (filePath: string) => Promise<void>
  onFileChanged: (callback: (filePath: string) => void) => () => void
  onToggleFocusMode: (callback: () => void) => () => void
  onFileOpened: (callback: (file: OpenedFile) => void) => () => void
}

declare global {
  interface Window {
    mdtool: MdtoolApi
  }
}

export const DEFAULT_CONFIG: AppConfig = {
  theme: 'system',
  fontSize: 16,
  contentWidth: 'medium',
  recentFiles: [],
  enableMath: true,
  enableMermaid: true,
}

export const DEFAULT_ANNOTATION = (sourceFile: string): AnnotationFile => ({
  version: 1,
  sourceFile,
  highlights: [],
  bookmarks: [],
})
