const BLOCK_SELECTOR = '[data-block-index]'
const CONTEXT_LEN = 20

export function isHighlightableBlock(element: Element | null): boolean {
  if (!element) return false
  if (element.closest('pre, code')) return false
  return element.hasAttribute('data-block-index')
}

export function getBlockElement(node: Node | null): HTMLElement | null {
  if (!node) return null
  const el =
    node.nodeType === Node.TEXT_NODE
      ? node.parentElement
      : (node as Element)
  return el?.closest(BLOCK_SELECTOR) as HTMLElement | null
}

export function getBlockIndex(block: HTMLElement): number {
  return Number(block.dataset.blockIndex ?? -1)
}

export function getBlockText(block: HTMLElement): string {
  return block.textContent ?? ''
}

export function getOffsetInBlock(block: HTMLElement, container: Node, offset: number): number {
  const range = document.createRange()
  range.selectNodeContents(block)
  range.setEnd(container, offset)
  return range.toString().length
}

export function createAnchorFromSelection(
  selection: Selection,
  root: HTMLElement,
): {
  anchor: {
    type: 'paragraph-offset'
    blockIndex: number
    startOffset: number
    endOffset: number
  }
  text: string
  prefix: string
  suffix: string
} | null {
  if (selection.isCollapsed || selection.rangeCount === 0) return null

  const range = selection.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null

  const startBlock = getBlockElement(range.startContainer)
  const endBlock = getBlockElement(range.endContainer)
  if (!startBlock || !endBlock || startBlock !== endBlock) return null
  if (!isHighlightableBlock(startBlock)) return null

  const blockIndex = getBlockIndex(startBlock)
  if (blockIndex < 0) return null

  const startOffset = getOffsetInBlock(
    startBlock,
    range.startContainer,
    range.startOffset,
  )
  const endOffset = getOffsetInBlock(
    startBlock,
    range.endContainer,
    range.endOffset,
  )

  if (startOffset >= endOffset) return null

  const blockText = getBlockText(startBlock)
  const text = blockText.slice(startOffset, endOffset)
  if (!text.trim()) return null

  return {
    anchor: {
      type: 'paragraph-offset',
      blockIndex,
      startOffset,
      endOffset,
    },
    text,
    prefix: blockText.slice(Math.max(0, startOffset - CONTEXT_LEN), startOffset),
    suffix: blockText.slice(endOffset, endOffset + CONTEXT_LEN),
  }
}

export { findOffsetsInBlock } from './locateHighlight'

export function wrapTextRange(
  block: HTMLElement,
  start: number,
  end: number,
  className: string,
  dataset: Record<string, string>,
): boolean {
  const textNodes: Text[] = []
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    if (node.textContent) textNodes.push(node)
  }

  let pos = 0
  let startNode: Text | null = null
  let endNode: Text | null = null
  let startOffset = 0
  let endOffset = 0

  for (const textNode of textNodes) {
    const len = textNode.textContent?.length ?? 0
    if (!startNode && pos + len > start) {
      startNode = textNode
      startOffset = start - pos
    }
    if (!endNode && pos + len >= end) {
      endNode = textNode
      endOffset = end - pos
      break
    }
    pos += len
  }

  if (!startNode || !endNode) return false

  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)

  const mark = document.createElement('mark')
  mark.className = className
  Object.entries(dataset).forEach(([key, value]) => {
    mark.dataset[key] = value
  })

  try {
    range.surroundContents(mark)
    return true
  } catch {
    const contents = range.extractContents()
    mark.appendChild(contents)
    range.insertNode(mark)
    return true
  }
}

function findScrollableParent(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement
  while (parent) {
    const { overflowY } = getComputedStyle(parent)
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent
    }
    parent = parent.parentElement
  }
  return null
}

export function scrollToHeading(
  scrollContainer: HTMLElement,
  contentRoot: HTMLElement,
  headingId: string,
  blockIndex: number,
) {
  const scope = contentRoot.classList.contains('markdown-body')
    ? contentRoot
    : (contentRoot.querySelector<HTMLElement>('.markdown-body') ?? contentRoot)

  const target =
    scope.querySelector<HTMLElement>(`#${CSS.escape(headingId)}`) ??
    scope.querySelector<HTMLElement>(`[data-block-index="${blockIndex}"]`)

  if (!target) return

  const container =
    scrollContainer.scrollHeight > scrollContainer.clientHeight
      ? scrollContainer
      : (findScrollableParent(target) ?? scrollContainer)

  const containerRect = container.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const top = targetRect.top - containerRect.top + container.scrollTop - 24

  container.scrollTo({
    top: Math.max(0, top),
    behavior: 'smooth',
  })
}

/** @deprecated 使用 scrollToHeading */
export function scrollToBlock(
  scrollContainer: HTMLElement,
  contentRoot: HTMLElement,
  blockIndex: number,
) {
  scrollToHeading(
    scrollContainer,
    contentRoot,
    `heading-${blockIndex}`,
    blockIndex,
  )
}
