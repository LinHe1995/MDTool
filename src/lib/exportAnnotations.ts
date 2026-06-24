import type { AnnotationFile, Highlight, HighlightApplyStatus } from '@shared/types'
import { HIGHLIGHT_COLORS } from '@/lib/highlightColors'

function formatHighlight(h: Highlight, status?: HighlightApplyStatus): string {
  const lines = [`- **${h.text}**`]
  if (status === 'orphaned' || status === 'ambiguous') {
    lines.push(`  - 状态：${status === 'orphaned' ? '已失效（原文已删除或无法匹配）' : '无法唯一定位'}`)
  }
  if (h.note?.trim()) {
    lines.push(`  - 备注：${h.note.trim()}`)
  }
  lines.push(`  - 时间：${new Date(h.createdAt).toLocaleString('zh-CN')}`)
  return lines.join('\n')
}

function groupHighlightsByColor(
  highlights: Highlight[],
  statuses: Record<string, HighlightApplyStatus>,
  includeInvalid: boolean,
): Map<string, Highlight[]> {
  const groups = new Map<string, Highlight[]>()

  for (const color of HIGHLIGHT_COLORS) {
    groups.set(color.id, [])
  }

  for (const h of highlights) {
    const status = statuses[h.id] ?? 'active'
    const invalid = status === 'orphaned' || status === 'ambiguous'
    if (invalid !== includeInvalid) continue

    const key = HIGHLIGHT_COLORS.some((c) => c.id === h.color)
      ? h.color
      : '_other'
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(h)
  }

  return groups
}

function appendColorGroups(
  lines: string[],
  groups: Map<string, Highlight[]>,
  statuses: Record<string, HighlightApplyStatus>,
) {
  for (const { id, label } of HIGHLIGHT_COLORS) {
    const items = groups.get(id) ?? []
    if (items.length === 0) continue
    lines.push(`### ${label}色（${items.length}）`, '')
    for (const h of items) {
      lines.push(formatHighlight(h, statuses[h.id]), '')
    }
  }

  const other = groups.get('_other') ?? []
  if (other.length > 0) {
    lines.push(`### 其他（${other.length}）`, '')
    for (const h of other) {
      lines.push(formatHighlight(h, statuses[h.id]), '')
    }
  }
}

export function buildAnnotationsMarkdown(
  fileName: string,
  annotation: AnnotationFile,
  statuses: Record<string, HighlightApplyStatus> = {},
): string {
  const lines: string[] = [
    `# ${fileName} — 批注摘要`,
    '',
    `> 导出时间：${new Date().toLocaleString('zh-CN')}`,
    '',
  ]

  const validGroups = groupHighlightsByColor(
    annotation.highlights,
    statuses,
    false,
  )
  const invalidGroups = groupHighlightsByColor(
    annotation.highlights,
    statuses,
    true,
  )

  const hasValid = [...validGroups.values()].some((items) => items.length > 0)
  const hasInvalid = [...invalidGroups.values()].some((items) => items.length > 0)

  if (hasValid) {
    lines.push('## 高亮', '')
    appendColorGroups(lines, validGroups, statuses)
  }

  if (hasInvalid) {
    lines.push('## 已失效批注', '')
    appendColorGroups(lines, invalidGroups, statuses)
  }

  if (annotation.bookmarks.length > 0) {
    lines.push('## 书签', '')
    for (const b of annotation.bookmarks) {
      lines.push(`- ${b.title}`)
    }
    lines.push('')
  }

  if (annotation.scratchpad?.content?.trim()) {
    lines.push('## 便签', '', annotation.scratchpad.content.trim(), '')
  }

  if (!hasValid && !hasInvalid && annotation.bookmarks.length === 0 && !annotation.scratchpad?.content?.trim()) {
    lines.push('_（暂无批注内容）_')
  }

  return lines.join('\n')
}
