const SEARCH_CLASS = 'mdtool-search-match'
const SEARCH_ACTIVE_CLASS = 'mdtool-search-active'

export function clearSearchHighlights(root: HTMLElement) {
  root.querySelectorAll(`mark.${SEARCH_CLASS}`).forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark)
    }
    parent.removeChild(mark)
    parent.normalize()
  })
}

export interface SearchMatch {
  mark: HTMLElement
}

export function applySearchHighlights(
  root: HTMLElement,
  query: string,
): SearchMatch[] {
  clearSearchHighlights(root)
  const trimmed = query.trim()
  if (!trimmed) return []

  const lowerQuery = trimmed.toLowerCase()
  const matches: SearchMatch[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodesToProcess: Text[] = []

  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    if (!node.textContent) continue
    if (node.parentElement?.closest('pre, code, mark.mdtool-search-match')) continue
    nodesToProcess.push(node)
  }

  for (const textNode of nodesToProcess) {
    const parent = textNode.parentNode
    if (!parent) continue

    const text = textNode.textContent ?? ''
    const lowerText = text.toLowerCase()
    if (!lowerText.includes(lowerQuery)) continue

    const fragments: Node[] = []
    let start = 0

    while (start < text.length) {
      const idx = lowerText.indexOf(lowerQuery, start)
      if (idx < 0) {
        fragments.push(document.createTextNode(text.slice(start)))
        break
      }
      if (idx > start) {
        fragments.push(document.createTextNode(text.slice(start, idx)))
      }
      const mark = document.createElement('mark')
      mark.className = SEARCH_CLASS
      mark.textContent = text.slice(idx, idx + trimmed.length)
      fragments.push(mark)
      matches.push({ mark })
      start = idx + trimmed.length
    }

    for (const frag of fragments) {
      parent.insertBefore(frag, textNode)
    }
    parent.removeChild(textNode)
  }

  matches.forEach((m, i) => {
    m.mark.dataset.searchIndex = String(i)
  })

  return matches
}

export function setActiveSearchMatch(matches: SearchMatch[], index: number) {
  matches.forEach((m, i) => {
    m.mark.classList.toggle(SEARCH_ACTIVE_CLASS, i === index)
  })
}

export function scrollToSearchMatch(
  scrollContainer: HTMLElement,
  match: SearchMatch,
) {
  const containerRect = scrollContainer.getBoundingClientRect()
  const targetRect = match.mark.getBoundingClientRect()
  const top = targetRect.top - containerRect.top + scrollContainer.scrollTop - 80
  scrollContainer.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}
