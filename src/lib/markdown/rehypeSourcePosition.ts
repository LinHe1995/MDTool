import { visit } from 'unist-util-visit'
import type { Root, Element, Text } from 'hast'

const SKIP_TEXT_WRAP_TAGS = new Set(['pre', 'code', 'script', 'style'])

/** 为 HAST 节点注入 data-source-start/end，便于从 DOM 选区还原原始 Markdown */
export function rehypeSourcePosition() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const start = node.position?.start?.offset
      const end = node.position?.end?.offset
      if (start == null || end == null) return

      node.properties ??= {}
      node.properties.dataSourceStart = String(start)
      node.properties.dataSourceEnd = String(end)
    })

    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || parent.type !== 'element' || index == null) return
      if (SKIP_TEXT_WRAP_TAGS.has(parent.tagName)) return

      const start = node.position?.start?.offset
      const end = node.position?.end?.offset
      if (start == null || end == null) return

      const wrapper: Element = {
        type: 'element',
        tagName: 'span',
        properties: {
          dataSourceStart: String(start),
          dataSourceEnd: String(end),
          className: ['mdtool-src'],
        },
        children: [node],
      }
      parent.children[index] = wrapper
    })
  }
}
