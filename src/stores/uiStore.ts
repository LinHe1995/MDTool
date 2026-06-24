import { create } from 'zustand'

interface UiState {
  focusMode: boolean
  sidebarVisible: boolean
  externalChangePath: string | null

  toggleFocusMode: () => void
  setFocusMode: (enabled: boolean) => void
  toggleSidebar: () => void
  setSidebarVisible: (visible: boolean) => void
  setExternalChangePath: (path: string | null) => void

  pdfExport: {
    active: boolean
    percent: number
    message: string
  } | null
  startPdfExport: (message?: string) => void
  setPdfExportProgress: (progress: { percent: number; message: string }) => void
  endPdfExport: () => void
}

function applySidebarClass(visible: boolean) {
  document.documentElement.classList.toggle('sidebar-hidden', !visible)
}

export const useUiStore = create<UiState>((set, get) => ({
  focusMode: false,
  sidebarVisible: true,
  externalChangePath: null,

  toggleFocusMode: () => {
    const next = !get().focusMode
    document.documentElement.classList.toggle('focus-mode', next)
    set({ focusMode: next })
  },

  setFocusMode: (enabled) => {
    document.documentElement.classList.toggle('focus-mode', enabled)
    set({ focusMode: enabled })
  },

  toggleSidebar: () => {
    const next = !get().sidebarVisible
    applySidebarClass(next)
    set({ sidebarVisible: next })
  },

  setSidebarVisible: (visible) => {
    applySidebarClass(visible)
    set({ sidebarVisible: visible })
  },

  setExternalChangePath: (path) => set({ externalChangePath: path }),

  pdfExport: null,

  startPdfExport: (message = '请选择保存位置…') => {
    set({
      pdfExport: { active: true, percent: 0, message },
    })
  },

  setPdfExportProgress: ({ percent, message }) => {
    set((state) => ({
      pdfExport: state.pdfExport
        ? { active: true, percent, message }
        : { active: true, percent, message },
    }))
  },

  endPdfExport: () => set({ pdfExport: null }),
}))
