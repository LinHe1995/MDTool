import { useDocumentStore } from '@/stores/documentStore'

import { HIGHLIGHT_COLORS, type HighlightColorId } from '@/lib/highlightColors'

import type { SelectionInfo } from '@/hooks/useTextSelection'



interface SelectionToolbarProps {

  selection: SelectionInfo

  onCopy: () => void

  onCopyMarkdown: () => void

  onHighlight: (color: HighlightColorId) => void

  onClose: () => void

}



export function SelectionToolbar({

  selection,

  onCopy,

  onCopyMarkdown,

  onHighlight,

  onClose,

}: SelectionToolbarProps) {

  const top = Math.max(8, selection.rect.top - 44)

  const left = selection.rect.left + selection.rect.width / 2



  return (

    <>

      <div className="selection-backdrop" onMouseDown={onClose} />

      <div

        className="selection-toolbar"

        style={{ top, left }}

        role="toolbar"

        aria-label="选区工具"

      >

        <button type="button" onClick={onCopy} title="复制 (Ctrl+C)">

          复制

        </button>

        <button type="button" onClick={onCopyMarkdown} title="复制为 Markdown">

          MD

        </button>

        {selection.canHighlight ? (

          <div className="highlight-colors" role="group" aria-label="高亮颜色">

            {HIGHLIGHT_COLORS.map((c) => (

              <button

                key={c.id}

                type="button"

                className={`highlight-color-btn highlight-color-${c.id}`}

                title={`高亮（${c.label}）`}

                onClick={() => onHighlight(c.id)}

              >

                <span className="sr-only">{c.label}</span>

              </button>

            ))}

          </div>

        ) : null}

      </div>

    </>

  )

}



export function Toast() {
  const toast = useDocumentStore((s) => s.toast)
  const isSuccess = toast?.startsWith('PDF 已保存')

  if (!toast) return null

  return (
    <div className={`toast${isSuccess ? ' toast-success' : ''}`} role="status">
      {toast}
    </div>
  )
}

