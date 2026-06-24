/** 与锚点/高亮系统一致的 Markdown 块级元素选择器 */
export const MARKDOWN_BLOCK_SELECTOR =
  'h1, h2, h3, h4, h5, h6, p, li, blockquote, td, th'

/** 渲染完成后按 DOM 顺序统一写入 data-block-index 与标题 id */
export function assignBlockIndices(root: HTMLElement): void {
  const blocks = root.querySelectorAll(MARKDOWN_BLOCK_SELECTOR)

  blocks.forEach((el, idx) => {
    el.setAttribute('data-block-index', String(idx))
    if (/^H[1-6]$/.test(el.tagName)) {
      el.id = `heading-${idx}`
    }
  })
}
