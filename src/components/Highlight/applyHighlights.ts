import type { Highlight } from '@shared/types'
import { wrapTextRange } from '@/lib/anchor'
import {
  locateHighlight,
  type ApplyHighlightsReport,
  type HighlightApplyResult,
  type BlockMatch,
} from '@/lib/anchor/locateHighlight'

const HIGHLIGHT_CLASS = 'mdtool-highlight'

export function clearAppliedHighlights(root: HTMLElement) {
  root.querySelectorAll(`mark.${HIGHLIGHT_CLASS}`).forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark)
    }
    parent.removeChild(mark)
    parent.normalize()
  })
}

function applyMatchToDom(
  root: HTMLElement,
  highlight: Highlight,
  match: BlockMatch,
): boolean {
  const block = root.querySelector<HTMLElement>(
    `[data-block-index="${match.blockIndex}"]`,
  )
  if (!block) return false

  return wrapTextRange(
    block,
    match.start,
    match.end,
    HIGHLIGHT_CLASS,
    { highlightId: highlight.id, color: highlight.color },
  )
}

export function applyHighlightsToDom(
  root: HTMLElement,
  highlights: Highlight[],
): ApplyHighlightsReport {
  clearAppliedHighlights(root)

  const results: HighlightApplyResult[] = []
  const repairs: Array<{ id: string; match: BlockMatch }> = []

  for (const highlight of highlights) {
    const located = locateHighlight(root, highlight)
    const result: HighlightApplyResult = {
      id: highlight.id,
      status: located.status,
      match: located.match,
    }
    results.push(result)

    if (
      located.match &&
      (located.status === 'active' || located.status === 'repaired')
    ) {
      applyMatchToDom(root, highlight, located.match)
      if (located.status === 'repaired') {
        repairs.push({ id: highlight.id, match: located.match })
      }
    }
  }

  return { results, repairs }
}

export type { HighlightApplyStatus, HighlightApplyResult, ApplyHighlightsReport } from '@/lib/anchor/locateHighlight'
