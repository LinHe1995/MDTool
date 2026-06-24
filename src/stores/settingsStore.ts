import { create } from 'zustand'
import type { AppConfig, ThemeMode } from '@shared/types'

interface SettingsState extends AppConfig {
  resolvedTheme: 'light' | 'dark'
  initialized: boolean
  init: () => Promise<void>
  setTheme: (theme: ThemeMode) => Promise<void>
  setFontSize: (fontSize: number) => Promise<void>
  setContentWidth: (contentWidth: AppConfig['contentWidth']) => Promise<void>
  setEnableMath: (enableMath: boolean) => Promise<void>
  setEnableMermaid: (enableMermaid: boolean) => Promise<void>
  applyResolvedTheme: () => void
}

let themeMediaQuery: MediaQueryList | null = null

function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return theme
}

function applyDomTheme(
  resolved: 'light' | 'dark',
  fontSize: number,
  contentWidth: string,
  themeMode: ThemeMode,
) {
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.setProperty('--font-size', `${fontSize}px`)
  document.documentElement.dataset.width = contentWidth
  void window.mdtool?.setNativeTheme?.(themeMode)
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'system',
  fontSize: 16,
  contentWidth: 'medium',
  recentFiles: [],
  enableMath: true,
  enableMermaid: true,
  resolvedTheme: 'light',
  initialized: false,

  init: async () => {
    if (get().initialized) return
    if (!window.mdtool?.getConfig) {
      console.error('window.mdtool 未注入，请通过 Electron 窗口运行（npm run dev）')
      return
    }

    const config = await window.mdtool.getConfig()
    const resolvedTheme = resolveTheme(config.theme)
    applyDomTheme(resolvedTheme, config.fontSize, config.contentWidth, config.theme)
    set({ ...config, resolvedTheme, initialized: true })

    if (!themeMediaQuery) {
      themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      themeMediaQuery.addEventListener('change', () => {
        if (get().theme === 'system') {
          get().applyResolvedTheme()
        }
      })
    }
  },

  setTheme: async (theme) => {
    const config = await window.mdtool.setConfig({ theme })
    const resolvedTheme = resolveTheme(config.theme)
    applyDomTheme(resolvedTheme, get().fontSize, get().contentWidth, config.theme)
    set({ theme: config.theme, resolvedTheme })
  },

  setFontSize: async (fontSize) => {
    const config = await window.mdtool.setConfig({ fontSize })
    applyDomTheme(get().resolvedTheme, config.fontSize, get().contentWidth, get().theme)
    set({ fontSize: config.fontSize })
  },

  setContentWidth: async (contentWidth) => {
    const config = await window.mdtool.setConfig({ contentWidth })
    applyDomTheme(get().resolvedTheme, get().fontSize, config.contentWidth, get().theme)
    set({ contentWidth: config.contentWidth })
  },

  setEnableMath: async (enableMath) => {
    const config = await window.mdtool.setConfig({ enableMath })
    set({ enableMath: config.enableMath })
  },

  setEnableMermaid: async (enableMermaid) => {
    const config = await window.mdtool.setConfig({ enableMermaid })
    set({ enableMermaid: config.enableMermaid })
  },

  applyResolvedTheme: () => {
    const { theme, fontSize, contentWidth, resolvedTheme: current } = get()
    const resolved = resolveTheme(theme)
    applyDomTheme(resolved, fontSize, contentWidth, theme)
    if (current !== resolved) {
      set({ resolvedTheme: resolved })
    }
  },
}))
