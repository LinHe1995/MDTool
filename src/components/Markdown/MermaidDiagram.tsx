import { useEffect, useId, useRef } from 'react'
import mermaid from 'mermaid'
import { useSettingsStore } from '@/stores/settingsStore'
import { sourcePositionProps } from '@/lib/markdown/sourcePositionComponents'

interface MdNode {
  position?: {
    start?: { offset?: number }
    end?: { offset?: number }
  }
}

interface MermaidDiagramProps {
  code: string
  node?: MdNode
}

function ensureMermaid(theme: 'light' | 'dark') {
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'dark' ? 'dark' : 'default',
    securityLevel: 'strict',
    fontFamily: 'Segoe UI, system-ui, sans-serif',
  })
}

export function MermaidDiagram({ code, node }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const id = useId().replace(/:/g, '')
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let cancelled = false

    const render = async () => {
      ensureMermaid(resolvedTheme)

      try {
        const { svg } = await mermaid.render(`mdtool-mermaid-${id}`, code.trim())
        if (!cancelled) {
          el.innerHTML = svg
        }
      } catch (error) {
        if (!cancelled) {
          el.innerHTML = `<pre class="mermaid-error">Mermaid 渲染失败：${
            error instanceof Error ? error.message : String(error)
          }</pre>`
        }
      }
    }

    void render()
    return () => {
      cancelled = true
    }
  }, [code, id, resolvedTheme])

  return (
    <div
      ref={containerRef}
      className="mermaid-diagram"
      {...sourcePositionProps(node)}
    />
  )
}
