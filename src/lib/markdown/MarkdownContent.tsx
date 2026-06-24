import {
  useMemo,
  useRef,
  useLayoutEffect,
  forwardRef,
  Children,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import type { Components } from 'react-markdown'
import type { Highlight } from '@shared/types'
import {
  useDocumentStore,
  selectAnnotation,
  selectFile,
  type HighlightRepairPayload,
} from '@/stores/documentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { applyHighlightsToDom } from '@/components/Highlight/applyHighlights'
import { assignBlockIndices } from '@/lib/markdown/assignBlockIndices'
import { rehypeSourcePosition } from '@/lib/markdown/rehypeSourcePosition'
import {
  createSourcePositionComponents,
  sourcePositionProps,
} from '@/lib/markdown/sourcePositionComponents'
import { MermaidDiagram } from '@/components/Markdown/MermaidDiagram'

interface MarkdownContentProps {
  content: string
  filePath: string | null
  onOutlineReady?: (root: HTMLElement) => void
}

const EMPTY_HIGHLIGHTS: Highlight[] = []
const CONTEXT_LEN = 20
const notifiedPaths = new Set<string>()

function resolveImageSrc(filePath: string, src: string): string {
  if (!src || src.startsWith('http') || src.startsWith('data:')) {
    return src
  }
  const normalized = filePath.replace(/\\/g, '/')
  const dir = normalized.slice(0, normalized.lastIndexOf('/'))
  const joined = `${dir}/${src.replace(/^\.\//, '')}`
  if (/^[a-zA-Z]:/.test(joined)) {
    return `file:///${joined}`
  }
  return `file://${joined}`
}

function buildRepairs(
  root: HTMLElement,
  repairs: ReturnType<typeof applyHighlightsToDom>['repairs'],
): HighlightRepairPayload[] {
  return repairs.map(({ id, match }) => {
    const block = root.querySelector<HTMLElement>(
      `[data-block-index="${match.blockIndex}"]`,
    )
    const blockText = block?.textContent ?? ''
    return {
      id,
      blockIndex: match.blockIndex,
      startOffset: match.start,
      endOffset: match.end,
      prefix: blockText.slice(
        Math.max(0, match.start - CONTEXT_LEN),
        match.start,
      ),
      suffix: blockText.slice(match.end, match.end + CONTEXT_LEN),
    }
  })
}

function isMermaidCodeChild(child: React.ReactNode): child is ReactElement<{
  className?: string
  children?: React.ReactNode
}> {
  if (!isValidElement(child)) return false
  const props = child.props as { className?: string }
  return (
    typeof props.className === 'string' &&
    props.className.includes('language-mermaid')
  )
}

export const MarkdownContent = forwardRef<HTMLDivElement, MarkdownContentProps>(
  function MarkdownContent({ content, filePath, onOutlineReady }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const onOutlineReadyRef = useRef(onOutlineReady)
    onOutlineReadyRef.current = onOutlineReady

    const setContainerRef = (el: HTMLDivElement | null) => {
      containerRef.current = el
      if (typeof ref === 'function') {
        ref(el)
      } else if (ref) {
        ref.current = el
      }
    }

    const file = useDocumentStore(selectFile)
    const highlights = useDocumentStore(
      (s) => selectAnnotation(s)?.highlights ?? EMPTY_HIGHLIGHTS,
    )
    const setHighlightApplyResults = useDocumentStore(
      (s) => s.setHighlightApplyResults,
    )
    const showToast = useDocumentStore((s) => s.showToast)
    const sourceContentChanged = useDocumentStore(
      (s) => s.tabs[s.activePath ?? '']?.sourceContentChanged ?? false,
    )
    const enableMath = useSettingsStore((s) => s.enableMath)
    const enableMermaid = useSettingsStore((s) => s.enableMermaid)

    const remarkPlugins = useMemo(() => {
      const plugins: NonNullable<Parameters<typeof ReactMarkdown>[0]['remarkPlugins']> = [
        remarkGfm,
      ]
      if (enableMath) {
        plugins.push(remarkMath)
      }
      return plugins
    }, [enableMath])

    const rehypePlugins = useMemo(() => {
      const plugins: NonNullable<Parameters<typeof ReactMarkdown>[0]['rehypePlugins']> = [
        rehypeSourcePosition,
        rehypeHighlight,
      ]
      if (enableMath) {
        plugins.push(rehypeKatex)
      }
      return plugins
    }, [enableMath])

    const components = useMemo((): Components => {
      const img = ({ src, alt, ...props }: ComponentPropsWithoutRef<'img'>) => {
        const resolved =
          filePath && src ? resolveImageSrc(filePath, src) : (src ?? '')
        return <img src={resolved} alt={alt ?? ''} {...props} />
      }
      const a = ({
        node,
        href,
        children,
        ...props
      }: ComponentPropsWithoutRef<'a'> & {
        node?: { position?: { start?: { offset?: number }; end?: { offset?: number } } }
      }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          {...props}
          {...sourcePositionProps(node)}
        >
          {children}
        </a>
      )
      const pre = ({
        node,
        children,
        ...props
      }: ComponentPropsWithoutRef<'pre'> & {
        node?: { position?: { start?: { offset?: number }; end?: { offset?: number } } }
      }) => {
        if (enableMermaid) {
          try {
            const child = Children.only(children)
            if (isMermaidCodeChild(child)) {
              const code = String(child.props.children).replace(/\n$/, '')
              return <MermaidDiagram code={code} node={node} />
            }
          } catch {
            // 多个子节点时按普通 pre 渲染
          }
        }
        return (
          <pre {...props} {...sourcePositionProps(node)}>
            {children}
          </pre>
        )
      }

      return { ...createSourcePositionComponents(), pre, img, a }
    }, [filePath, enableMermaid])

    useLayoutEffect(() => {
      const root = containerRef.current
      if (!root || !file) return

      assignBlockIndices(root)
      const report = applyHighlightsToDom(root, highlights)
      const repairs = buildRepairs(root, report.repairs)

      void setHighlightApplyResults(
        report,
        repairs,
        file.contentHash,
      ).then(() => {
        const invalidCount = report.results.filter(
          (r) => r.status === 'orphaned' || r.status === 'ambiguous',
        ).length
        const repairedCount = report.results.filter(
          (r) => r.status === 'repaired',
        ).length

        const notifyKey = `${file.path}:${file.contentHash}:${highlights.length}`
        if (notifiedPaths.has(notifyKey)) return
        notifiedPaths.add(notifyKey)

        if (sourceContentChanged && highlights.length > 0) {
          showToast('原文已修改，正在校验批注…')
        }
        if (invalidCount > 0) {
          showToast(
            `${invalidCount} 条批注无法定位，请在批注面板查看`,
          )
        } else if (repairedCount > 0) {
          showToast(`已自动修复 ${repairedCount} 条批注位置`)
        }
      })

      onOutlineReadyRef.current?.(root)
    }, [content, highlights, file, setHighlightApplyResults, showToast, sourceContentChanged])

    return (
      <div ref={setContainerRef} className="markdown-body">
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    )
  },
)
