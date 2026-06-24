export type SidebarPanel = 'outline' | 'annotations' | 'bookmarks' | 'scratchpad'



const PANELS: { id: SidebarPanel; label: string }[] = [

  { id: 'outline', label: '目录' },

  { id: 'annotations', label: '批注' },

  { id: 'bookmarks', label: '书签' },

  { id: 'scratchpad', label: '便签' },

]



interface SidebarTabsProps {

  active: SidebarPanel

  onChange: (panel: SidebarPanel) => void

  annotationCount: number

  bookmarkCount: number

}



export function SidebarTabs({

  active,

  onChange,

  annotationCount,

  bookmarkCount,

}: SidebarTabsProps) {

  return (

    <div className="sidebar-tabs" role="tablist" aria-label="侧栏面板">

      {PANELS.map((panel) => {

        const count =

          panel.id === 'annotations'

            ? annotationCount

            : panel.id === 'bookmarks'

              ? bookmarkCount

              : 0

        return (

          <button

            key={panel.id}

            type="button"

            role="tab"

            aria-selected={active === panel.id}

            className={active === panel.id ? 'active' : undefined}

            onClick={() => onChange(panel.id)}

          >

            {panel.label}

            {count > 0 ? <span className="sidebar-tab-badge">{count}</span> : null}

          </button>

        )

      })}

    </div>

  )

}

