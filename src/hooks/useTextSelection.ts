import { useCallback, useEffect, useState } from 'react'
import {
  createAnchorFromSelection,
  getBlockElement,
} from '@/lib/anchor'

export interface SelectionInfo {
  text: string
  rect: DOMRect
  canHighlight: boolean
}

export function useTextSelection(contentRootRef: React.RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<SelectionInfo | null>(null)

  const clearSelection = useCallback(() => setSelection(null), [])

  useEffect(() => {
    const onMouseUp = () => {
      requestAnimationFrame(() => {
        const root = contentRootRef.current
        const sel = window.getSelection()
        if (!root || !sel || sel.isCollapsed) {
          setSelection(null)
          return
        }

        const text = sel.toString().trim()
        if (!text) {
          setSelection(null)
          return
        }

        const range = sel.getRangeAt(0)
        if (!root.contains(range.commonAncestorContainer)) {
          setSelection(null)
          return
        }

        const rect = range.getBoundingClientRect()
        const startBlock = getBlockElement(range.startContainer)
        const canHighlight = !!startBlock && !startBlock.closest('pre, code')

        setSelection({
          text,
          rect,
          canHighlight,
        })
      })
    }

    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [contentRootRef])

  const getAnchorPayload = useCallback(() => {
    const root = contentRootRef.current
    const sel = window.getSelection()
    if (!root || !sel) return null
    return createAnchorFromSelection(sel, root)
  }, [contentRootRef])

  return { selection, clearSelection, getAnchorPayload }
}
