import {
  useDocumentStore,
  selectOutline,
  selectActiveHeadingId,
} from '@/stores/documentStore'

interface OutlineProps {
  onNavigate: (blockIndex: number, headingId: string) => void
}

export function Outline({ onNavigate }: OutlineProps) {
  const outline = useDocumentStore(selectOutline)
  const activeHeadingId = useDocumentStore(selectActiveHeadingId)

  if (outline.length === 0) {
    return <div className="outline-empty">暂无标题目录</div>
  }

  return (
    <nav className="outline" aria-label="文档目录">
      <ul>
        {outline.map((item) => (
          <li
            key={item.id}
            className={activeHeadingId === item.id ? 'active' : undefined}
            style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
          >
            <button
              type="button"
              onClick={() => onNavigate(item.blockIndex, item.id)}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
