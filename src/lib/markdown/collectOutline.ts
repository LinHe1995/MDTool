import type { OutlineItem } from '@shared/types'

export function collectOutlineFromDom(root: HTMLElement): OutlineItem[] {
  const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6')

  return Array.from(headings)
    .filter((el) => el.hasAttribute('data-block-index'))
    .map((el) => {
      const blockIndex = Number(el.getAttribute('data-block-index'))
      return {
        id: el.id || `heading-${blockIndex}`,
        level: Number(el.tagName.charAt(1)),
        text: el.textContent?.trim() ?? '',
        blockIndex,
      }
    })
}
