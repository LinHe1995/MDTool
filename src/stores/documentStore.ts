import { create } from 'zustand'
import type {
  AnnotationFile,
  Bookmark,
  Highlight,
  HighlightApplyStatus,
  OpenedFile,
  OutlineItem,
} from '@shared/types'
import type { ApplyHighlightsReport } from '@/components/Highlight/applyHighlights'
import { useSettingsStore } from '@/stores/settingsStore'

export interface HighlightRepairPayload {
  id: string
  blockIndex: number
  startOffset: number
  endOffset: number
  prefix: string
  suffix: string
}

export interface TabDocument {
  file: OpenedFile
  annotation: AnnotationFile
  outline: OutlineItem[]
  activeHeadingId: string | null
  highlightStatuses: Record<string, HighlightApplyStatus>
  sourceContentChanged: boolean
}

interface DocumentState {
  tabs: Record<string, TabDocument>
  tabOrder: string[]
  activePath: string | null
  isLoading: boolean
  toast: string | null

  setOutline: (outline: OutlineItem[]) => void
  setActiveHeadingId: (id: string | null) => void
  showToast: (message: string, durationMs?: number) => void
  clearToast: () => void
  openFile: (file: OpenedFile) => Promise<void>
  switchTab: (path: string) => Promise<void>
  closeTab: (path: string) => Promise<void>
  flushActiveTab: () => Promise<void>
  loadAnnotation: () => Promise<void>
  persistAnnotation: (patch: Partial<AnnotationFile>) => Promise<void>
  addHighlight: (highlight: Highlight) => Promise<void>
  updateHighlight: (id: string, patch: Partial<Highlight>) => Promise<void>
  removeHighlight: (id: string) => Promise<void>
  addBookmark: (bookmark: Bookmark) => Promise<void>
  removeBookmark: (id: string) => Promise<void>
  setScratchpad: (content: string, isPersisted?: boolean) => Promise<void>
  setHighlightApplyResults: (
    report: ApplyHighlightsReport,
    repairs: HighlightRepairPayload[],
    contentHash: string,
  ) => Promise<void>
  removeInvalidHighlights: () => Promise<void>
  reloadActiveFile: () => Promise<void>
  updateLastPosition: (scrollRatio: number, nearestHeading?: string) => void
}

let persistTimer: ReturnType<typeof setTimeout> | null = null

export function selectActiveTab(state: DocumentState): TabDocument | null {
  if (!state.activePath) return null
  return state.tabs[state.activePath] ?? null
}

function patchActiveTab(
  tabs: Record<string, TabDocument>,
  activePath: string | null,
  patch: Partial<TabDocument>,
): Record<string, TabDocument> {
  if (!activePath || !tabs[activePath]) return tabs
  return {
    ...tabs,
    [activePath]: { ...tabs[activePath], ...patch },
  }
}

function isSourceContentChanged(
  annotation: AnnotationFile,
  contentHash: string,
): boolean {
  return Boolean(
    annotation.sourceHash && annotation.sourceHash !== contentHash,
  )
}

function createTabDocument(
  file: OpenedFile,
  annotation: AnnotationFile,
): TabDocument {
  return {
    file,
    annotation,
    outline: [],
    activeHeadingId: null,
    highlightStatuses: {},
    sourceContentChanged: isSourceContentChanged(annotation, file.contentHash),
  }
}

async function flushTab(path: string, tab: TabDocument) {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  await window.mdtool.writeAnnotation(path, tab.annotation)
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  tabs: {},
  tabOrder: [],
  activePath: null,
  isLoading: false,
  toast: null,

  setOutline: (outline) => {
    const { activePath, tabs } = get()
    const prev = activePath ? tabs[activePath]?.outline : []
    const unchanged =
      prev &&
      prev.length === outline.length &&
      prev.every(
        (item, index) =>
          item.id === outline[index]?.id &&
          item.blockIndex === outline[index]?.blockIndex,
      )
    if (!unchanged && activePath) {
      set({ tabs: patchActiveTab(tabs, activePath, { outline }) })
    }
  },

  setActiveHeadingId: (id) => {
    const { activePath, tabs } = get()
    if (!activePath) return
    set({ tabs: patchActiveTab(tabs, activePath, { activeHeadingId: id }) })
  },

  showToast: (message, durationMs = 2000) => {
    set({ toast: message })
    setTimeout(() => {
      if (get().toast === message) {
        set({ toast: null })
      }
    }, durationMs)
  },

  clearToast: () => set({ toast: null }),

  flushActiveTab: async () => {
    const { activePath, tabs } = get()
    if (!activePath || !tabs[activePath]) return
    await flushTab(activePath, tabs[activePath])
  },

  openFile: async (file) => {
    const state = get()
    if (state.activePath && state.tabs[state.activePath]) {
      await flushTab(state.activePath, state.tabs[state.activePath])
    }

    set({ isLoading: true })
    try {
      const config = await window.mdtool.addRecentFile(file.path)
      useSettingsStore.setState({ recentFiles: config.recentFiles })

      if (state.tabs[file.path]) {
        const fresh = await window.mdtool.readFile(file.path)
        const annotation = await window.mdtool.readAnnotation(file.path)
        set({
          tabs: {
            ...get().tabs,
            [file.path]: {
              ...createTabDocument(fresh, annotation),
            },
          },
          activePath: file.path,
        })
        return
      }

      const annotation = await window.mdtool.readAnnotation(file.path)
      const newTab = createTabDocument(file, annotation)

      set({
        tabs: { ...get().tabs, [file.path]: newTab },
        tabOrder: [...get().tabOrder, file.path],
        activePath: file.path,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '打开文件时发生未知错误'
      get().showToast(`打开失败：${message}`)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  switchTab: async (path) => {
    const { activePath, tabs } = get()
    if (path === activePath) return
    if (activePath && tabs[activePath]) {
      await flushTab(activePath, tabs[activePath])
    }
    set({ activePath: path })
  },

  closeTab: async (path) => {
    const { activePath, tabs, tabOrder } = get()
    const tab = tabs[path]
    if (!tab) return

    await flushTab(path, tab)

    const nextTabs = { ...tabs }
    delete nextTabs[path]
    const nextOrder = tabOrder.filter((p) => p !== path)

    if (activePath !== path) {
      set({ tabs: nextTabs, tabOrder: nextOrder })
      return
    }

    const idx = tabOrder.indexOf(path)
    const nextActive =
      nextOrder.length === 0
        ? null
        : (nextOrder[idx] ?? nextOrder[idx - 1] ?? nextOrder[0])

    set({
      tabs: nextTabs,
      tabOrder: nextOrder,
      activePath: nextActive,
    })
  },

  loadAnnotation: async () => {
    const { activePath } = get()
    const tab = selectActiveTab(get())
    if (!activePath || !tab) return
    const annotation = await window.mdtool.readAnnotation(activePath)
    set({ tabs: patchActiveTab(get().tabs, activePath, { annotation }) })
  },

  persistAnnotation: async (patch) => {
    const { activePath, tabs } = get()
    const tab = selectActiveTab(get())
    if (!activePath || !tab) return

    const nextAnnotation = { ...tab.annotation, ...patch }
    set({ tabs: patchActiveTab(tabs, activePath, { annotation: nextAnnotation }) })

    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(async () => {
      await window.mdtool.writeAnnotation(activePath, nextAnnotation)
    }, 300)
  },

  addHighlight: async (highlight) => {
    const tab = selectActiveTab(get())
    if (!tab) return
    await get().persistAnnotation({
      highlights: [...tab.annotation.highlights, highlight],
      sourceHash: tab.file.contentHash,
    })
  },

  updateHighlight: async (id, patch) => {
    const tab = selectActiveTab(get())
    if (!tab) return
    const now = new Date().toISOString()
    await get().persistAnnotation({
      highlights: tab.annotation.highlights.map((h) =>
        h.id === id ? { ...h, ...patch, updatedAt: now } : h,
      ),
    })
  },

  removeHighlight: async (id) => {
    const tab = selectActiveTab(get())
    if (!tab) return
    await get().persistAnnotation({
      highlights: tab.annotation.highlights.filter((h) => h.id !== id),
    })
  },

  addBookmark: async (bookmark) => {
    const tab = selectActiveTab(get())
    if (!tab) return
    await get().persistAnnotation({
      bookmarks: [...tab.annotation.bookmarks, bookmark],
    })
  },

  removeBookmark: async (id) => {
    const tab = selectActiveTab(get())
    if (!tab) return
    await get().persistAnnotation({
      bookmarks: tab.annotation.bookmarks.filter((b) => b.id !== id),
    })
  },

  setScratchpad: async (content, isPersisted = true) => {
    await get().persistAnnotation({
      scratchpad: { content, isPersisted },
    })
  },

  setHighlightApplyResults: async (report, repairs, contentHash) => {
    const { activePath, tabs } = get()
    const tab = selectActiveTab(get())
    if (!activePath || !tab) return

    const highlightStatuses: Record<string, HighlightApplyStatus> = {}
    for (const result of report.results) {
      highlightStatuses[result.id] = result.status
    }

    const repairMap = new Map(repairs.map((r) => [r.id, r]))
    const now = new Date().toISOString()
    const highlights =
      repairs.length === 0
        ? tab.annotation.highlights
        : tab.annotation.highlights.map((h) => {
            const repair = repairMap.get(h.id)
            if (!repair) return h
            return {
              ...h,
              anchor: {
                type: 'paragraph-offset' as const,
                blockIndex: repair.blockIndex,
                startOffset: repair.startOffset,
                endOffset: repair.endOffset,
              },
              prefix: repair.prefix,
              suffix: repair.suffix,
              updatedAt: now,
            }
          })

    const nextAnnotation: AnnotationFile = {
      ...tab.annotation,
      highlights,
      sourceHash: contentHash,
    }

    set({
      tabs: patchActiveTab(tabs, activePath, {
        annotation: nextAnnotation,
        highlightStatuses,
        sourceContentChanged: false,
      }),
    })

    if (repairs.length > 0) {
      if (persistTimer) clearTimeout(persistTimer)
      await window.mdtool.writeAnnotation(activePath, nextAnnotation)
    }
  },

  removeInvalidHighlights: async () => {
    const tab = selectActiveTab(get())
    if (!tab) return
    const invalidIds = new Set(
      Object.entries(tab.highlightStatuses)
        .filter(
          ([, status]) => status === 'orphaned' || status === 'ambiguous',
        )
        .map(([id]) => id),
    )
    if (invalidIds.size === 0) return

    const highlights = tab.annotation.highlights.filter(
      (h) => !invalidIds.has(h.id),
    )
    const highlightStatuses = Object.fromEntries(
      Object.entries(tab.highlightStatuses).filter(
        ([id]) => !invalidIds.has(id),
      ),
    )

    const { activePath, tabs } = get()
    if (!activePath) return

    const nextAnnotation = { ...tab.annotation, highlights }
    set({
      tabs: patchActiveTab(tabs, activePath, {
        annotation: nextAnnotation,
        highlightStatuses,
      }),
    })

    if (persistTimer) clearTimeout(persistTimer)
    await window.mdtool.writeAnnotation(activePath, nextAnnotation)
    get().showToast(`已清理 ${invalidIds.size} 条失效批注`)
  },

  reloadActiveFile: async () => {
    const { activePath, tabs } = get()
    if (!activePath || !tabs[activePath]) return

    await flushTab(activePath, tabs[activePath])
    const fresh = await window.mdtool.readFile(activePath)
    const annotation = await window.mdtool.readAnnotation(activePath)

    set({
      tabs: {
        ...get().tabs,
        [activePath]: createTabDocument(fresh, annotation),
      },
    })
    get().showToast('已重新加载文件')
  },

  updateLastPosition: (scrollRatio, nearestHeading) => {
    const tab = selectActiveTab(get())
    if (!tab) return
    void get().persistAnnotation({
      lastPosition: { scrollRatio, nearestHeading },
    })
  },
}))

export async function openFileByPath(path: string) {
  try {
    const file = await window.mdtool.readFile(path)
    await useDocumentStore.getState().openFile(file)
  } catch (error) {
    useDocumentStore
      .getState()
      .showToast(
        `打开失败：${error instanceof Error ? error.message : String(error)}`,
      )
  }
}

export async function openFileDialog() {
  if (!window.mdtool?.openFileDialog) {
    useDocumentStore
      .getState()
      .showToast('请在 Electron 应用窗口中使用（勿在浏览器打开 localhost）')
    return
  }
  try {
    const file = await window.mdtool.openFileDialog()
    if (file) {
      await useDocumentStore.getState().openFile(file)
    }
  } catch (error) {
    useDocumentStore
      .getState()
      .showToast(
        `打开失败：${error instanceof Error ? error.message : String(error)}`,
      )
  }
}

const EMPTY_OUTLINE: OutlineItem[] = []

// 兼容旧组件的便捷 selector
export const selectFile = (s: DocumentState) => selectActiveTab(s)?.file ?? null
export const selectAnnotation = (s: DocumentState) =>
  selectActiveTab(s)?.annotation ?? null
export const selectOutline = (s: DocumentState) =>
  selectActiveTab(s)?.outline ?? EMPTY_OUTLINE
export const selectActiveHeadingId = (s: DocumentState) =>
  selectActiveTab(s)?.activeHeadingId ?? null
export const selectBookmarks = (s: DocumentState) =>
  selectActiveTab(s)?.annotation.bookmarks ?? []
export const selectHighlights = (s: DocumentState) =>
  selectActiveTab(s)?.annotation.highlights ?? []
export const selectScratchpad = (s: DocumentState) =>
  selectActiveTab(s)?.annotation.scratchpad?.content ?? ''
export const selectHighlightStatuses = (s: DocumentState) =>
  selectActiveTab(s)?.highlightStatuses ?? {}
export const selectSourceContentChanged = (s: DocumentState) =>
  selectActiveTab(s)?.sourceContentChanged ?? false
