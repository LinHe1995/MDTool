import { useSettingsStore } from '@/stores/settingsStore'
import {
  useDocumentStore,
} from '@/stores/documentStore'
import type { ThemeMode } from '@shared/types'

export function Header() {
  const tabOrder = useDocumentStore((s) => s.tabOrder)
  const tabs = useDocumentStore((s) => s.tabs)
  const activePath = useDocumentStore((s) => s.activePath)
  const switchTab = useDocumentStore((s) => s.switchTab)
  const closeTab = useDocumentStore((s) => s.closeTab)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const fontSize = useSettingsStore((s) => s.fontSize)
  const setFontSize = useSettingsStore((s) => s.setFontSize)
  const contentWidth = useSettingsStore((s) => s.contentWidth)
  const setContentWidth = useSettingsStore((s) => s.setContentWidth)
  const enableMath = useSettingsStore((s) => s.enableMath)
  const setEnableMath = useSettingsStore((s) => s.setEnableMath)
  const enableMermaid = useSettingsStore((s) => s.enableMermaid)
  const setEnableMermaid = useSettingsStore((s) => s.setEnableMermaid)

  const cycleTheme = () => {
    const order: ThemeMode[] = ['light', 'dark', 'system']
    const next = order[(order.indexOf(theme) + 1) % order.length]
    void setTheme(next)
  }

  return (
    <header className="app-header">
      <div className="app-header-left">
        {tabOrder.length > 0 ? (
          <nav className="doc-tabs" aria-label="已打开文档">
            {tabOrder.map((path) => {
              const name = tabs[path]?.file.name ?? path
              const isActive = path === activePath
              return (
                <div
                  key={path}
                  className={`doc-tab${isActive ? ' active' : ''}`}
                  title={path}
                >
                  <button
                    type="button"
                    className="doc-tab-label"
                    onClick={() => void switchTab(path)}
                  >
                    {name}
                  </button>
                  <button
                    type="button"
                    className="doc-tab-close"
                    aria-label={`关闭 ${name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      void closeTab(path)
                    }}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </nav>
        ) : (
          <span className="app-title-placeholder">未打开文档</span>
        )}
      </div>

      <div className="app-header-right">
        <label className="header-control">
          字号
          <input
            type="range"
            min={12}
            max={24}
            value={fontSize}
            onChange={(e) => void setFontSize(Number(e.target.value))}
          />
        </label>

        <select
          value={contentWidth}
          onChange={(e) =>
            void setContentWidth(e.target.value as 'narrow' | 'medium' | 'wide')
          }
          aria-label="行宽"
        >
          <option value="narrow">窄</option>
          <option value="medium">中</option>
          <option value="wide">宽</option>
        </select>

        <label className="header-toggle" title="渲染 KaTeX 数学公式">
          <input
            type="checkbox"
            checked={enableMath}
            onChange={(e) => void setEnableMath(e.target.checked)}
          />
          公式
        </label>

        <label className="header-toggle" title="渲染 Mermaid 图表">
          <input
            type="checkbox"
            checked={enableMermaid}
            onChange={(e) => void setEnableMermaid(e.target.checked)}
          />
          图表
        </label>

        <button type="button" onClick={cycleTheme} title="切换主题">
          主题：{theme === 'system' ? '跟随系统' : theme === 'dark' ? '深色' : '浅色'}
        </button>
      </div>
    </header>
  )
}
