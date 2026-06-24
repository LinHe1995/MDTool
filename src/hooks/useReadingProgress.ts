import { useCallback, useEffect, useRef } from 'react'
import type { OutlineItem } from '@shared/types'
import {
  useDocumentStore,
  selectAnnotation,
} from '@/stores/documentStore'
import { scrollToBlock } from '@/lib/anchor'

interface UseReadingProgressOptions {
  scrollContainerRef: React.RefObject<HTMLElement | null>
  contentRootRef: React.RefObject<HTMLElement | null>
  outline: OutlineItem[]
}

export function useReadingProgress({
  scrollContainerRef,
  contentRootRef,
  outline,
}: UseReadingProgressOptions) {
  const annotation = useDocumentStore(selectAnnotation)
  const sourceFile = annotation?.sourceFile
  const lastScrollRatio = annotation?.lastPosition?.scrollRatio
  const updateLastPosition = useDocumentStore((s) => s.updateLastPosition)
  const setActiveHeadingId = useDocumentStore((s) => s.setActiveHeadingId)
  const restoredRef = useRef(false)
  const scrollSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    restoredRef.current = false
  }, [sourceFile])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || lastScrollRatio == null || restoredRef.current) return

    requestAnimationFrame(() => {
      container.scrollTop =
        lastScrollRatio * (container.scrollHeight - container.clientHeight)
      restoredRef.current = true
    })
  }, [sourceFile, lastScrollRatio, scrollContainerRef])

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    const root = contentRootRef.current
    if (!container || !root) return

    const maxScroll = container.scrollHeight - container.clientHeight
    const scrollRatio = maxScroll > 0 ? container.scrollTop / maxScroll : 0

    let nearestHeading: string | undefined
    let activeId: string | null = null
    const containerTop = container.getBoundingClientRect().top + 80

    for (const item of outline) {
      const el = root.querySelector(`[data-block-index="${item.blockIndex}"]`)
      if (!el) continue
      const top = el.getBoundingClientRect().top
      if (top <= containerTop) {
        activeId = item.id
        nearestHeading = item.text
      }
    }

    setActiveHeadingId(activeId)

    if (scrollSaveTimer.current) clearTimeout(scrollSaveTimer.current)
    scrollSaveTimer.current = setTimeout(() => {
      updateLastPosition(scrollRatio, nearestHeading)
    }, 400)
  }, [
    contentRootRef,
    outline,
    scrollContainerRef,
    setActiveHeadingId,
    updateLastPosition,
  ])

  return { handleScroll }
}

export function useOutlineNavigation(
  scrollContainerRef: React.RefObject<HTMLElement | null>,
  contentRootRef: React.RefObject<HTMLElement | null>,
) {
  return useCallback(
    (blockIndex: number) => {
      const scrollContainer = scrollContainerRef.current
      const root = contentRootRef.current
      if (scrollContainer && root) {
        scrollToBlock(scrollContainer, root, blockIndex)
      }
    },
    [scrollContainerRef, contentRootRef],
  )
}
