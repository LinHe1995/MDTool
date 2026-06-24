import {
  useDocumentStore,
  selectBookmarks,
} from '@/stores/documentStore'
import type { Bookmark } from '@shared/types'

interface BookmarksPanelProps {
  onNavigate: (bookmark: Bookmark) => void
}

export function BookmarksPanel({ onNavigate }: BookmarksPanelProps) {
  const bookmarks = useDocumentStore(selectBookmarks)
  const removeBookmark = useDocumentStore((s) => s.removeBookmark)

  if (bookmarks.length === 0) {
    return (
      <div className="panel-empty">
        暂无书签
        <p className="panel-hint">阅读时按 Ctrl+D 添加书签</p>
      </div>
    )
  }

  return (
    <ul className="bookmarks-list">
      {bookmarks.map((b) => (
        <li key={b.id} className="bookmark-item">
          <button
            type="button"
            className="bookmark-title"
            onClick={() => onNavigate(b)}
          >
            {b.title}
          </button>
          <button
            type="button"
            className="annotation-action danger"
            onClick={() => void removeBookmark(b.id)}
            title="删除书签"
          >
            删
          </button>
        </li>
      ))}
    </ul>
  )
}
