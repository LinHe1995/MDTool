import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { MarkdownContent } from '@/lib/markdown/MarkdownContent'
import { collectOutlineFromDom } from '@/lib/markdown/collectOutline'
import { Outline } from '@/components/Outline/Outline'
import { Sidebar, type SidebarPanel } from '@/components/Sidebar/Sidebar'
import { AnnotationsPanel } from '@/components/Notes/AnnotationsPanel'
import { BookmarksPanel } from '@/components/Bookmarks/BookmarksPanel'
import { ScratchpadPanel } from '@/components/Scratchpad/ScratchpadPanel'
import { SelectionToolbar } from '@/components/Toolbar/SelectionToolbar'
import { SearchBar } from '@/components/Search/SearchBar'
import {
  useDocumentStore,
  selectFile,
  selectOutline,
  selectHighlights,
  selectBookmarks,
  selectAnnotation,
  selectActiveHeadingId,
  selectHighlightStatuses,
  selectSourceContentChanged,
} from '@/stores/documentStore'
import { useUiStore } from '@/stores/uiStore'
import { useReadingProgress } from '@/hooks/useReadingProgress'
import { scrollToBlock, scrollToHeading } from '@/lib/anchor'
import { useTextSelection } from '@/hooks/useTextSelection'
import { DEFAULT_HIGHLIGHT_COLOR, type HighlightColorId } from '@/lib/highlightColors'
import { buildAnnotationsMarkdown } from '@/lib/exportAnnotations'
import { formatCopyAsMarkdown } from '@/lib/clipboard/formatCopy'
import {
  applySearchHighlights,
  clearSearchHighlights,
  scrollToSearchMatch,
  setActiveSearchMatch,
  type SearchMatch,
} from '@/lib/search/applySearchHighlights'
import type { Bookmark, Highlight } from '@shared/types'

export function Reader() {
  const file = useDocumentStore(selectFile)
  const activePath = useDocumentStore((s) => s.activePath)
  const annotation = useDocumentStore(selectAnnotation)
  const highlights = useDocumentStore(selectHighlights)
  const bookmarks = useDocumentStore(selectBookmarks)
  const outline = useDocumentStore(selectOutline)
  const activeHeadingId = useDocumentStore(selectActiveHeadingId)
  const highlightStatuses = useDocumentStore(selectHighlightStatuses)
  const sourceContentChanged = useDocumentStore(selectSourceContentChanged)
  const removeInvalidHighlights = useDocumentStore((s) => s.removeInvalidHighlights)
  const reloadActiveFile = useDocumentStore((s) => s.reloadActiveFile)

  const externalChangePath = useUiStore((s) => s.externalChangePath)
  const setExternalChangePath = useUiStore((s) => s.setExternalChangePath)

  const setOutline = useDocumentStore((s) => s.setOutline)
  const addHighlight = useDocumentStore((s) => s.addHighlight)
  const addBookmark = useDocumentStore((s) => s.addBookmark)
  const showToast = useDocumentStore((s) => s.showToast)
  const setActiveHeadingId = useDocumentStore((s) => s.setActiveHeadingId)

  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanel>('outline')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatchIndex, setSearchMatchIndex] = useState(0)
  const [searchMatchCount, setSearchMatchCount] = useState(0)
  const searchMatchesRef = useRef<SearchMatch[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const { selection, clearSelection, getAnchorPayload } =
    useTextSelection(contentRef)

  const onOutlineReady = useCallback(
    (root: HTMLElement) => {
      setOutline(collectOutlineFromDom(root))
    },
    [setOutline],
  )

  const navigateToBlock = useCallback(
    (blockIndex: number, headingId?: string) => {
      const scrollContainer = scrollRef.current
      const root = contentRef.current
      if (!scrollContainer || !root) return

      if (headingId) {
        scrollToHeading(scrollContainer, root, headingId, blockIndex)
        setActiveHeadingId(headingId)
      } else {
        scrollToBlock(scrollContainer, root, blockIndex)
      }
    },
    [setActiveHeadingId],
  )

  const navigateToHighlight = useCallback(
    (highlight: Highlight) => {
      const status = highlightStatuses[highlight.id] ?? 'active'
      if (status === 'orphaned' || status === 'ambiguous') {
        showToast('该批注已失效，无法跳转到正文')
        return
      }
      navigateToBlock(highlight.anchor.blockIndex)
    },
    [highlightStatuses, navigateToBlock, showToast],
  )

  const invalidHighlightCount = highlights.filter((h) => {
    const status = highlightStatuses[h.id]
    return status === 'orphaned' || status === 'ambiguous'
  }).length

  const navigateToBookmark = useCallback(
    (bookmark: Bookmark) => {
      navigateToBlock(bookmark.anchor.blockIndex)
    },
    [navigateToBlock],
  )

  const { handleScroll } = useReadingProgress({
    scrollContainerRef: scrollRef,
    contentRootRef: contentRef,
    outline,
  })

  const createHighlight = useCallback(
    async (color: HighlightColorId = DEFAULT_HIGHLIGHT_COLOR) => {
      const payload = getAnchorPayload()
      if (!payload) {
        showToast('无法高亮：请勿跨段落选择')
        return
      }

      const now = new Date().toISOString()
      await addHighlight({
        id: uuidv4(),
        color,
        text: payload.text,
        prefix: payload.prefix,
        suffix: payload.suffix,
        anchor: payload.anchor,
        createdAt: now,
        updatedAt: now,
      })

      showToast('已添加高亮')
      clearSelection()
      window.getSelection()?.removeAllRanges()
    },
    [addHighlight, clearSelection, getAnchorPayload, showToast],
  )

  const handleCopy = useCallback(async () => {
    if (!selection) return
    await navigator.clipboard.writeText(selection.text)
    showToast('已复制到剪贴板')
    clearSelection()
    window.getSelection()?.removeAllRanges()
  }, [selection, showToast, clearSelection])

  const handleCopyMarkdown = useCallback(async () => {
    const sel = window.getSelection()
    const root = contentRef.current
    if (!sel || !root || sel.isCollapsed || !file) return
    const text = formatCopyAsMarkdown(sel, root, file.content)
    await navigator.clipboard.writeText(text)
    showToast('已复制为 Markdown')
    clearSelection()
    sel.removeAllRanges()
  }, [file, showToast, clearSelection])

  const handleAddBookmark = useCallback(async () => {
    if (!file) return
    const heading = activeHeadingId
      ? outline.find((item) => item.id === activeHeadingId)
      : outline[0]
    const blockIndex = heading?.blockIndex ?? 0
    const title = heading?.text ?? file.name

    const now = new Date().toISOString()
    await addBookmark({
      id: uuidv4(),
      title,
      anchor: { blockIndex, offset: 0 },
      createdAt: now,
    })
    showToast('已添加书签')
    setSidebarPanel('bookmarks')
  }, [activeHeadingId, addBookmark, file, outline, showToast])

  const handleExport = useCallback(async () => {
    if (!file || !annotation) return
    const md = buildAnnotationsMarkdown(file.name, annotation, highlightStatuses)
    const stem = file.name.replace(/\.(md|markdown)$/i, '')
    const ok = await window.mdtool.exportMarkdown(md, `${stem}-ann.md`)
    showToast(ok ? '批注已导出' : '已取消导出')
  }, [annotation, file, highlightStatuses, showToast])

  const handleReloadExternal = useCallback(async () => {
    await reloadActiveFile()
    setExternalChangePath(null)
  }, [reloadActiveFile, setExternalChangePath])

  useEffect(() => {
    const onHighlight = () => void createHighlight()
    const onBookmark = () => void handleAddBookmark()
    const onSearch = () => setSearchOpen(true)
    const onScratchpad = () => setSidebarPanel('scratchpad')

    document.addEventListener('mdtool:highlight-selection', onHighlight)
    document.addEventListener('mdtool:add-bookmark', onBookmark)
    document.addEventListener('mdtool:open-search', onSearch)
    document.addEventListener('mdtool:open-scratchpad', onScratchpad)

    return () => {
      document.removeEventListener('mdtool:highlight-selection', onHighlight)
      document.removeEventListener('mdtool:add-bookmark', onBookmark)
      document.removeEventListener('mdtool:open-search', onSearch)
      document.removeEventListener('mdtool:open-scratchpad', onScratchpad)
    }
  }, [createHighlight, handleAddBookmark])

  useEffect(() => {
    return window.mdtool?.onExportAnnotations?.(() => {
      void handleExport()
    })
  }, [handleExport])

  useEffect(() => {
    if (!activePath) return
    void window.mdtool.watchFile(activePath)
    return () => {
      void window.mdtool.unwatchFile(activePath)
    }
  }, [activePath])

  useEffect(() => {
    return window.mdtool?.onFileChanged?.((changedPath) => {
      if (changedPath === useDocumentStore.getState().activePath) {
        setExternalChangePath(changedPath)
      }
    })
  }, [setExternalChangePath])

  useLayoutEffect(() => {
    const root = contentRef.current
    if (!root) return

    if (!searchQuery.trim()) {
      clearSearchHighlights(root)
      searchMatchesRef.current = []
      setSearchMatchCount(0)
      setSearchMatchIndex(0)
      return
    }

    const matches = applySearchHighlights(root, searchQuery)
    searchMatchesRef.current = matches
    setSearchMatchCount(matches.length)
    const index =
      matches.length > 0
        ? Math.min(searchMatchIndex, matches.length - 1)
        : 0
    setSearchMatchIndex(index)
    setActiveSearchMatch(matches, index)
    if (matches.length > 0 && scrollRef.current) {
      scrollToSearchMatch(scrollRef.current, matches[index])
    }
  }, [searchQuery, file?.content, highlights, activePath])

  const goSearchMatch = useCallback((delta: number) => {
    const matches = searchMatchesRef.current
    if (matches.length === 0) return
    const next = (searchMatchIndex + delta + matches.length) % matches.length
    setSearchMatchIndex(next)
    setActiveSearchMatch(matches, next)
    if (scrollRef.current) {
      scrollToSearchMatch(scrollRef.current, matches[next])
    }
  }, [searchMatchIndex])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
    const root = contentRef.current
    if (root) clearSearchHighlights(root)
    searchMatchesRef.current = []
    setSearchMatchIndex(0)
  }, [])

  if (!file || !activePath) return null

  return (
    <div className="reader" key={activePath}>
      <Sidebar
        activePanel={sidebarPanel}
        onPanelChange={setSidebarPanel}
        annotationCount={highlights.length}
        bookmarkCount={bookmarks.length}
      >
        {sidebarPanel === 'outline' ? (
          <Outline onNavigate={navigateToBlock} />
        ) : null}
        {sidebarPanel === 'annotations' ? (
          <AnnotationsPanel onNavigate={navigateToHighlight} />
        ) : null}
        {sidebarPanel === 'bookmarks' ? (
          <BookmarksPanel onNavigate={navigateToBookmark} />
        ) : null}
        {sidebarPanel === 'scratchpad' ? <ScratchpadPanel /> : null}
      </Sidebar>

      <div className="reader-main">
        {externalChangePath === activePath ? (
          <div className="reader-alert reader-alert-external" role="status">
            <span>文件已在外部修改</span>
            <button type="button" onClick={() => void handleReloadExternal()}>
              重新加载
            </button>
            <button
              type="button"
              onClick={() => setExternalChangePath(null)}
            >
              忽略
            </button>
          </div>
        ) : null}

        {invalidHighlightCount > 0 ? (
          <div className="reader-alert" role="status">
            <span>
              {sourceContentChanged ? '原文已修改，' : ''}
              {invalidHighlightCount} 条批注无法在正文中恢复
            </span>
            <button
              type="button"
              onClick={() => {
                setSidebarPanel('annotations')
              }}
            >
              查看批注
            </button>
            <button type="button" onClick={() => void removeInvalidHighlights()}>
              清理失效项
            </button>
          </div>
        ) : null}

        <SearchBar
          open={searchOpen}
          query={searchQuery}
          matchIndex={searchMatchIndex}
          matchCount={searchMatchCount}
          onQueryChange={(q) => {
            setSearchQuery(q)
            setSearchMatchIndex(0)
          }}
          onClose={closeSearch}
          onNext={() => goSearchMatch(1)}
          onPrev={() => goSearchMatch(-1)}
        />

        <div
          ref={scrollRef}
          className="reader-scroll"
          onScroll={handleScroll}
        >
          <div className="reader-content">
            <MarkdownContent
              ref={contentRef}
              content={file.content}
              filePath={file.path}
              onOutlineReady={onOutlineReady}
            />
          </div>
        </div>
      </div>

      {selection ? (
        <SelectionToolbar
          selection={selection}
          onCopy={handleCopy}
          onCopyMarkdown={handleCopyMarkdown}
          onHighlight={(color) => void createHighlight(color)}
          onClose={clearSelection}
        />
      ) : null}
    </div>
  )
}
