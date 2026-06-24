import { useState } from 'react'
import {
  useDocumentStore,
  selectHighlights,
  selectHighlightStatuses,
} from '@/stores/documentStore'
import { HIGHLIGHT_COLORS } from '@/lib/highlightColors'
import type { Highlight, HighlightApplyStatus } from '@shared/types'

interface AnnotationsPanelProps {
  onNavigate: (highlight: Highlight) => void
}

const STATUS_LABEL: Record<HighlightApplyStatus, string> = {
  active: '',
  repaired: '已修复',
  orphaned: '已失效',
  ambiguous: '无法定位',
}

export function AnnotationsPanel({ onNavigate }: AnnotationsPanelProps) {
  const highlights = useDocumentStore(selectHighlights)
  const statuses = useDocumentStore(selectHighlightStatuses)
  const updateHighlight = useDocumentStore((s) => s.updateHighlight)
  const removeHighlight = useDocumentStore((s) => s.removeHighlight)
  const removeInvalidHighlights = useDocumentStore(
    (s) => s.removeInvalidHighlights,
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftNote, setDraftNote] = useState('')

  const invalidCount = highlights.filter((h) => {
    const status = statuses[h.id]
    return status === 'orphaned' || status === 'ambiguous'
  }).length

  if (highlights.length === 0) {
    return <div className="panel-empty">暂无高亮批注</div>
  }

  const startEdit = (h: Highlight) => {
    setEditingId(h.id)
    setDraftNote(h.note ?? '')
  }

  const saveNote = async (id: string) => {
    await updateHighlight(id, { note: draftNote.trim() || undefined })
    setEditingId(null)
    setDraftNote('')
  }

  const colorLabel = (color: string) =>
    HIGHLIGHT_COLORS.find((c) => c.id === color)?.label ?? color

  const isNavigable = (id: string) => {
    const status = statuses[id] ?? 'active'
    return status === 'active' || status === 'repaired'
  }

  return (
    <>
      {invalidCount > 0 ? (
        <div className="annotation-alert">
          <span>{invalidCount} 条批注无法在正文中恢复</span>
          <button type="button" onClick={() => void removeInvalidHighlights()}>
            清理失效项
          </button>
        </div>
      ) : null}
      <ul className="annotations-list">
        {highlights.map((h) => {
          const status = statuses[h.id] ?? 'active'
          const invalid = status === 'orphaned' || status === 'ambiguous'
          const statusLabel = STATUS_LABEL[status]

          return (
            <li
              key={h.id}
              className={`annotation-item${invalid ? ' annotation-item-invalid' : ''}`}
            >
              <div className="annotation-item-header">
                <span
                  className={`annotation-color annotation-color-${h.color}`}
                  title={colorLabel(h.color)}
                />
                <button
                  type="button"
                  className="annotation-text"
                  onClick={() => {
                    if (isNavigable(h.id)) onNavigate(h)
                  }}
                  disabled={!isNavigable(h.id)}
                  title={
                    isNavigable(h.id) ? '跳转到正文' : '原文已不存在，无法跳转'
                  }
                >
                  {h.text.length > 60 ? `${h.text.slice(0, 60)}…` : h.text}
                </button>
                {statusLabel ? (
                  <span className={`annotation-status annotation-status-${status}`}>
                    {statusLabel}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="annotation-action"
                  onClick={() => startEdit(h)}
                  title="编辑备注"
                >
                  备注
                </button>
                <button
                  type="button"
                  className="annotation-action danger"
                  onClick={() => void removeHighlight(h.id)}
                  title="删除高亮"
                >
                  删
                </button>
              </div>
              {h.note && editingId !== h.id ? (
                <p className="annotation-note">{h.note}</p>
              ) : null}
              {invalid ? (
                <p className="annotation-stale-hint">
                  保存的原文片段仍保留在侧车文件中，可手动删除或等待后续重新关联。
                </p>
              ) : null}
              {editingId === h.id ? (
                <div className="annotation-edit">
                  <textarea
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                    placeholder="添加备注…"
                    rows={3}
                  />
                  <div className="annotation-edit-actions">
                    <button type="button" onClick={() => void saveNote(h.id)}>
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null)
                        setDraftNote('')
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </>
  )
}
