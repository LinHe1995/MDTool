import { createElement } from 'react'
import type { Components } from 'react-markdown'

interface MdNode {
  position?: {
    start?: { offset?: number }
    end?: { offset?: number }
  }
}

export function sourcePositionProps(node?: MdNode): Record<string, string> {
  const start = node?.position?.start?.offset
  const end = node?.position?.end?.offset
  const props: Record<string, string> = {}
  if (start != null) props['data-source-start'] = String(start)
  if (end != null) props['data-source-end'] = String(end)
  return props
}

const SOURCE_POSITION_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'li',
  'blockquote',
  'pre',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'em',
  'strong',
  'code',
  'del',
] as const

function createTagComponent(tag: string) {
  return function SourcePositionComponent({
    node,
    children,
    ...props
  }: {
    node?: MdNode
    children?: React.ReactNode
  } & Record<string, unknown>) {
    return createElement(
      tag,
      { ...props, ...sourcePositionProps(node) },
      children,
    )
  }
}

export function createSourcePositionComponents(): Partial<Components> {
  const result: Record<string, ReturnType<typeof createTagComponent>> = {}

  for (const tag of SOURCE_POSITION_TAGS) {
    result[tag] = createTagComponent(tag)
  }

  return result as Partial<Components>
}
