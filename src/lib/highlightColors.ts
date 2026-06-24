export const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: '黄' },
  { id: 'green', label: '绿' },
  { id: 'blue', label: '蓝' },
  { id: 'pink', label: '粉' },
] as const

export type HighlightColorId = (typeof HIGHLIGHT_COLORS)[number]['id']

export const DEFAULT_HIGHLIGHT_COLOR: HighlightColorId = 'yellow'

export function isHighlightColor(value: string): value is HighlightColorId {
  return HIGHLIGHT_COLORS.some((c) => c.id === value)
}
