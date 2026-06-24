import { BrowserWindow, nativeTheme } from 'electron'
import type { ThemeMode } from '../../shared/types.js'

const WINDOW_BG = {
  light: '#f4f5f7',
  dark: '#0f1117',
} as const

let currentThemeMode: ThemeMode = 'system'

function resolveWindowTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  }
  return theme
}

export function applyNativeTheme(
  theme: ThemeMode,
  mainWindow?: BrowserWindow | null,
) {
  currentThemeMode = theme
  nativeTheme.themeSource = theme

  const resolved = resolveWindowTheme(theme)
  const bg = WINDOW_BG[resolved]

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setBackgroundColor(bg)
  }

  return resolved
}

export function getInitialWindowBackground(theme: ThemeMode): string {
  return WINDOW_BG[resolveWindowTheme(theme)]
}

export function registerNativeThemeListener(
  getMainWindow: () => BrowserWindow | null,
) {
  nativeTheme.on('updated', () => {
    if (currentThemeMode === 'system') {
      applyNativeTheme('system', getMainWindow())
    }
  })
}
