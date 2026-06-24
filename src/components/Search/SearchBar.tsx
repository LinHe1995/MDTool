import { useEffect, useRef } from 'react'

interface SearchBarProps {
  open: boolean
  query: string
  matchIndex: number
  matchCount: number
  onQueryChange: (query: string) => void
  onClose: () => void
  onNext: () => void
  onPrev: () => void
}

export function SearchBar({
  open,
  query,
  matchIndex,
  matchCount,
  onQueryChange,
  onClose,
  onNext,
  onPrev,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="search-bar" role="search">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.shiftKey ? onPrev() : onNext()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
          }
        }}
        placeholder="搜索本文…"
        aria-label="全文搜索"
      />
      <span className="search-count">
        {matchCount > 0 ? `${matchIndex + 1} / ${matchCount}` : '无结果'}
      </span>
      <button type="button" onClick={onPrev} disabled={matchCount === 0} title="上一个">
        ↑
      </button>
      <button type="button" onClick={onNext} disabled={matchCount === 0} title="下一个">
        ↓
      </button>
      <button type="button" onClick={onClose} title="关闭 (Esc)">
        ×
      </button>
    </div>
  )
}
