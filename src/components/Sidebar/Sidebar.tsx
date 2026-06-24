import type { ReactNode } from 'react'
import { SidebarTabs, type SidebarPanel } from './SidebarTabs'

export type { SidebarPanel }

interface SidebarProps {
  activePanel: SidebarPanel
  onPanelChange: (panel: SidebarPanel) => void
  annotationCount: number
  bookmarkCount: number
  children: ReactNode
}

export function Sidebar({
  activePanel,
  onPanelChange,
  annotationCount,
  bookmarkCount,
  children,
}: SidebarProps) {
  return (
    <aside className="reader-sidebar">
      <SidebarTabs
        active={activePanel}
        onChange={onPanelChange}
        annotationCount={annotationCount}
        bookmarkCount={bookmarkCount}
      />
      <div className="sidebar-panel">{children}</div>
    </aside>
  )
}
