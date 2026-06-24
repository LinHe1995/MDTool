import type { Highlight } from '@shared/types'
import { MARKDOWN_BLOCK_SELECTOR } from '@/lib/markdown/assignBlockIndices'

export type HighlightApplyStatus = 'active' | 'repaired' | 'orphaned' | 'ambiguous'

export type OffsetMatchKind = 'direct' | 'context' | 'text'

export interface BlockMatch {
  blockIndex: number
  start: number
  end: number
  kind: OffsetMatchKind
}

export interface LocateHighlightResult {
  status: HighlightApplyStatus
  match?: BlockMatch
}

export interface HighlightApplyResult {
  id: string
  status: HighlightApplyStatus
  match?: BlockMatch
}

export interface ApplyHighlightsReport {
  results: HighlightApplyResult[]
  repairs: Array<{ id: string; match: BlockMatch }>
}

function getBlockText(block: HTMLElement): string {
  return block.textContent ?? ''
}

function getBlockIndex(block: HTMLElement): number {
  return Number(block.dataset.blockIndex ?? -1)
}

export function findOffsetsInBlock(
  blockText: string,
  highlight: {
    text: string
    prefix: string
    suffix: string
    anchor: { startOffset: number; endOffset: number }
  },
): BlockMatch | null {
  const { anchor, text, prefix, suffix } = highlight
  const direct = blockText.slice(anchor.startOffset, anchor.endOffset)
  if (direct === text) {
    return {
      blockIndex: -1,
      start: anchor.startOffset,
      end: anchor.endOffset,
      kind: 'direct',
    }
  }

  const pattern = `${prefix}${text}${suffix}`
  const ctxIdx = blockText.indexOf(pattern)
  if (ctxIdx >= 0) {
    const start = ctxIdx + prefix.length
    return { blockIndex: -1, start, end: start + text.length, kind: 'context' }
  }

  const textIdx = blockText.indexOf(text)
  if (textIdx >= 0) {
    return {
      blockIndex: -1,
      start: textIdx,
      end: textIdx + text.length,
      kind: 'text',
    }
  }

  return null
}

function listContentBlocks(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(MARKDOWN_BLOCK_SELECTOR),
  ).filter((el) => !el.closest('pre, code'))
}

function findContextMatchesInBlock(
  block: HTMLElement,
  highlight: Highlight,
): BlockMatch | null {
  const blockText = getBlockText(block)
  const pattern = `${highlight.prefix}${highlight.text}${highlight.suffix}`
  const idx = blockText.indexOf(pattern)
  if (idx < 0) return null
  const start = idx + highlight.prefix.length
  return {
    blockIndex: getBlockIndex(block),
    start,
    end: start + highlight.text.length,
    kind: 'context',
  }
}

function findUniqueTextMatchInDocument(
  root: HTMLElement,
  text: string,
): BlockMatch | null {
  if (!text) return null
  let found: BlockMatch | null = null
  let count = 0

  for (const block of listContentBlocks(root)) {
    const blockText = getBlockText(block)
    let from = 0
    while (from <= blockText.length) {
      const idx = blockText.indexOf(text, from)
      if (idx < 0) break
      count += 1
      found = {
        blockIndex: getBlockIndex(block),
        start: idx,
        end: idx + text.length,
        kind: 'text',
      }
      from = idx + text.length
      if (count > 1) return null
    }
  }

  return count === 1 ? found : null
}

export function locateHighlight(
  root: HTMLElement,
  highlight: Highlight,
): LocateHighlightResult {
  const originalBlock = root.querySelector<HTMLElement>(
    `[data-block-index="${highlight.anchor.blockIndex}"]`,
  )

  if (originalBlock && !originalBlock.closest('pre, code')) {
    const blockText = getBlockText(originalBlock)
    const local = findOffsetsInBlock(blockText, highlight)
    if (local) {
      const match: BlockMatch = {
        ...local,
        blockIndex: getBlockIndex(originalBlock),
      }
      return {
        status: local.kind === 'direct' ? 'active' : 'repaired',
        match,
      }
    }
  }

  const contextMatches: BlockMatch[] = []
  for (const block of listContentBlocks(root)) {
    const ctx = findContextMatchesInBlock(block, highlight)
    if (ctx) contextMatches.push(ctx)
  }

  if (contextMatches.length === 1) {
    return { status: 'repaired', match: contextMatches[0] }
  }
  if (contextMatches.length > 1) {
    return { status: 'ambiguous' }
  }

  const uniqueText = findUniqueTextMatchInDocument(root, highlight.text)
  if (uniqueText) {
    return { status: 'repaired', match: uniqueText }
  }

  if (highlight.text && listContentBlocks(root).some((b) => getBlockText(b).includes(highlight.text))) {
    return { status: 'ambiguous' }
  }

  return { status: 'orphaned' }
}
