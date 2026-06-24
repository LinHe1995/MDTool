import { getOffsetInBlock } from '@/lib/anchor'

const INLINE_MARKUP_TAGS = new Set([
  'STRONG',
  'EM',
  'CODE',
  'A',
  'DEL',
  'S',
])

const BLOCK_MARKUP_TAGS = new Set([
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'P',
  'LI',
  'BLOCKQUOTE',
  'PRE',
  'TABLE',
  'THEAD',
  'TBODY',
  'TFOOT',
  'TR',
  'TD',
  'TH',
])

function parseSourceOffset(el: Element): number | null {
  const raw = el.getAttribute('data-source-start')
  if (raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function parseSourceEnd(el: Element): number | null {
  const raw = el.getAttribute('data-source-end')
  if (raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function rangeIntersectsElement(range: Range, el: Element): boolean {
  try {
    return range.intersectsNode(el)
  } catch {
    return false
  }
}

function findTopLevelIntersecting(
  root: HTMLElement,
  range: Range,
): HTMLElement[] {
  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>('[data-source-start]'),
  ).filter((el) => rangeIntersectsElement(range, el))

  return candidates.filter(
    (el) => !candidates.some((other) => other !== el && other.contains(el)),
  )
}

/** 多单元格选区时提升到整张 table，以保留表格 Markdown */
function hoistTableSpans(elements: HTMLElement[]): HTMLElement[] {
  const result: HTMLElement[] = []
  const consumed = new Set<HTMLElement>()

  for (const el of elements) {
    if (consumed.has(el)) continue

    if (el.tagName === 'TD' || el.tagName === 'TH') {
      const table = el.closest('table[data-source-start]') as HTMLElement | null
      if (table) {
        const cellsInSelection = elements.filter(
          (e) =>
            (e.tagName === 'TD' || e.tagName === 'TH') &&
            table.contains(e),
        )
        if (cellsInSelection.length > 1) {
          result.push(table)
          cellsInSelection.forEach((c) => consumed.add(c))
          continue
        }
      }
    }

    result.push(el)
    consumed.add(el)
  }

  return result
}

function getPlainOffsetsInElement(
  el: HTMLElement,
  range: Range,
): { start: number; end: number } {
  const blockRange = document.createRange()
  blockRange.selectNodeContents(el)

  const start =
    range.compareBoundaryPoints(Range.START_TO_START, blockRange) <= 0
      ? 0
      : getOffsetInBlock(el, range.startContainer, range.startOffset)

  const end =
    range.compareBoundaryPoints(Range.END_TO_END, blockRange) >= 0
      ? (el.textContent?.length ?? 0)
      : getOffsetInBlock(el, range.endContainer, range.endOffset)

  return { start, end }
}

function isFullySelected(el: HTMLElement, range: Range): boolean {
  const blockRange = document.createRange()
  blockRange.selectNodeContents(el)
  return (
    range.compareBoundaryPoints(Range.START_TO_START, blockRange) <= 0 &&
    range.compareBoundaryPoints(Range.END_TO_END, blockRange) >= 0
  )
}

/** 选区是否覆盖元素全部可见文本（比 isFullySelected 更耐受嵌套 span） */
function isFullPlainTextSelected(el: HTMLElement, range: Range): boolean {
  const text = el.textContent ?? ''
  if (!text) return isFullySelected(el, range)

  const { start, end } = getPlainOffsetsInElement(el, range)
  if (start > 0) return false

  return end >= text.length || isFullySelected(el, range)
}

function collectSourceAncestors(el: HTMLElement): HTMLElement[] {
  const ancestors: HTMLElement[] = []
  let current: HTMLElement | null = el
  while (current) {
    if (parseSourceOffset(current) != null) {
      ancestors.push(current)
    }
    current = current.parentElement
  }
  return ancestors
}

/**
 * 将选区节点提升到最合适的 Markdown 源节点：
 * 行内格式（粗体/斜体等）优先于块级；单独选中标题时提升到 h1–h6。
 */
function findBestSourceElement(el: HTMLElement, range: Range): HTMLElement {
  const ancestors = collectSourceAncestors(el)

  for (const node of ancestors) {
    if (
      INLINE_MARKUP_TAGS.has(node.tagName) &&
      isFullPlainTextSelected(node, range)
    ) {
      return node
    }
  }

  for (const node of ancestors) {
    if (
      BLOCK_MARKUP_TAGS.has(node.tagName) &&
      isFullPlainTextSelected(node, range)
    ) {
      return node
    }
  }

  return el
}

function resolveInlineSourceOwner(node: Element): Element {
  let current: Element | null = node
  while (current) {
    if (
      INLINE_MARKUP_TAGS.has(current.tagName) &&
      parseSourceOffset(current) != null
    ) {
      return current
    }
    current = current.parentElement
  }
  return node
}

/**
 * 将元素内 plain text 偏移映射回源 Markdown 字符区间。
 * 行内标记节点在部分选中时扩展为完整语法（如 **bold**、*italic*）。
 */
function mapPlainRangeToSource(
  el: HTMLElement,
  plainStart: number,
  plainEnd: number,
): { start: number; end: number } {
  let plainOffset = 0
  let sourceStart = Infinity
  let sourceEnd = -Infinity

  const includeLeaf = (node: Element, plainLen: number) => {
    const pStart = plainOffset
    const pEnd = plainOffset + plainLen
    plainOffset = pEnd

    if (pEnd <= plainStart || pStart >= plainEnd) return

    const owner = resolveInlineSourceOwner(node)
    const ss = parseSourceOffset(owner)
    const se = parseSourceEnd(owner)
    if (ss == null || se == null) return

    sourceStart = Math.min(sourceStart, ss)
    sourceEnd = Math.max(sourceEnd, se)
  }

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement
      if (parent) {
        includeLeaf(parent, (node.textContent ?? '').length)
      }
      return
    }

    if (!(node instanceof Element)) return

    const ss = parseSourceOffset(node)
    const se = parseSourceEnd(node)

    const isLeafInline =
      ss != null &&
      se != null &&
      node.childNodes.length <= 1 &&
      (node.childNodes.length === 0 ||
        node.firstChild?.nodeType === Node.TEXT_NODE)

    if (isLeafInline) {
      includeLeaf(node, node.textContent?.length ?? 0)
      return
    }

    node.childNodes.forEach(walk)
  }

  walk(el)

  if (sourceStart !== Infinity && sourceEnd !== -Infinity) {
    return { start: sourceStart, end: sourceEnd }
  }

  const fallbackStart = parseSourceOffset(el)
  const fallbackEnd = parseSourceEnd(el)
  if (fallbackStart == null || fallbackEnd == null) {
    return { start: 0, end: 0 }
  }

  const totalPlain = el.textContent?.length ?? 1
  const srcLen = fallbackEnd - fallbackStart
  return {
    start:
      fallbackStart +
      Math.round((plainStart / totalPlain) * srcLen),
    end:
      fallbackStart + Math.round((plainEnd / totalPlain) * srcLen),
  }
}

function resolveSpanForElement(
  el: HTMLElement,
  range: Range,
  trimStart: boolean,
  trimEnd: boolean,
): { start: number; end: number } {
  el = findBestSourceElement(el, range)

  const ss = parseSourceOffset(el)
  const se = parseSourceEnd(el)
  if (ss == null || se == null) {
    return { start: 0, end: 0 }
  }

  if (isFullPlainTextSelected(el, range)) {
    return { start: ss, end: se }
  }

  const { start: plainStart, end: plainEnd } = getPlainOffsetsInElement(
    el,
    range,
  )
  const plainLen = el.textContent?.length ?? 0

  if (!trimStart && !trimEnd) {
    return { start: ss, end: se }
  }

  if (trimStart && trimEnd) {
    if (plainStart === 0 && plainEnd >= plainLen) {
      return { start: ss, end: se }
    }
    return mapPlainRangeToSource(el, plainStart, plainEnd)
  }

  if (trimStart && !trimEnd) {
    if (plainStart === 0) {
      return { start: ss, end: se }
    }
    const mapped = mapPlainRangeToSource(
      el,
      plainStart,
      plainLen,
    )
    return { start: mapped.start, end: se }
  }

  if (plainEnd >= plainLen) {
    return { start: ss, end: se }
  }

  const mapped = mapPlainRangeToSource(el, 0, plainEnd)
  return { start: ss, end: mapped.end }
}

function extractFromSource(
  sourceContent: string,
  root: HTMLElement,
  range: Range,
): string | null {
  let elements = findTopLevelIntersecting(root, range)
  if (elements.length === 0) return null

  elements = hoistTableSpans(elements)
  elements.sort(
    (a, b) => (parseSourceOffset(a) ?? 0) - (parseSourceOffset(b) ?? 0),
  )

  const spans = elements.map((el, index) =>
    resolveSpanForElement(
      el,
      range,
      index === 0,
      index === elements.length - 1,
    ),
  )

  const start = spans[0]?.start ?? 0
  const end = spans[spans.length - 1]?.end ?? 0
  if (end <= start) return null

  return sourceContent.slice(start, end)
}

export function formatCopyAsMarkdown(
  selection: Selection,
  root: HTMLElement,
  sourceContent: string,
): string {
  if (selection.isCollapsed || selection.rangeCount === 0) {
    return selection.toString()
  }

  const range = selection.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) {
    return selection.toString()
  }

  const extracted = extractFromSource(sourceContent, root, range)
  if (extracted != null) {
    return extracted
  }

  return selection.toString()
}
