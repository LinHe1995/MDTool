import { useEffect, useCallback } from 'react'
import { Header } from '@/components/Layout/Header'
import { Welcome } from '@/components/Layout/Welcome'
import { Reader } from '@/components/Reader/Reader'
import { Toast } from '@/components/Toolbar/SelectionToolbar'
import { useDocumentStore, selectFile } from '@/stores/documentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { exportActiveDocumentPdf } from '@/lib/export/exportActiveDocumentPdf'
import { PdfExportOverlay } from '@/components/Export/PdfExportOverlay'

export function App() {
  const file = useDocumentStore(selectFile)
  const hasOpenDocs = useDocumentStore((s) => s.tabOrder.length > 0)

  useEffect(() => {
    void useSettingsStore.getState().init()
  }, [])

  useEffect(() => {
    if (!window.mdtool?.onFileOpened) {
      console.error('window.mdtool API 不可用')
      return
    }
    return window.mdtool.onFileOpened((opened) => {
      void useDocumentStore.getState().openFile(opened).catch((error) => {
        console.error('打开文件失败', error)
      })
    })
  }, [])

  useEffect(() => {
    return window.mdtool?.onToggleFocusMode?.(() => {
      useUiStore.getState().toggleFocusMode()
    })
  }, [])

  useEffect(() => {
    return window.mdtool?.onPdfExportProgress?.((progress) => {
      useUiStore.getState().setPdfExportProgress(progress)
    })
  }, [])

  useEffect(() => {
    return window.mdtool?.onExportPdf?.(() => {
      void exportActiveDocumentPdf()
    })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const dropped = e.dataTransfer.files[0] as (File & { path?: string }) | undefined
    if (!dropped?.path) return
    const name = dropped.name.toLowerCase()
    if (!name.endsWith('.md') && !name.endsWith('.markdown')) return
    try {
      const opened = await window.mdtool.readFile(dropped.path)
      await useDocumentStore.getState().openFile(opened)
    } catch (error) {
      useDocumentStore
        .getState()
        .showToast(
          `打开失败：${error instanceof Error ? error.message : String(error)}`,
        )
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        useUiStore.getState().toggleFocusMode()
        return
      }

      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault()
        useUiStore.getState().toggleSidebar()
        return
      }

      if (!file) return

      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault()
        document.dispatchEvent(new CustomEvent('mdtool:highlight-selection'))
      }
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        document.dispatchEvent(new CustomEvent('mdtool:open-search'))
      }
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault()
        document.dispatchEvent(new CustomEvent('mdtool:add-bookmark'))
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        document.dispatchEvent(new CustomEvent('mdtool:open-scratchpad'))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [file])

  return (
    <div
      className="app-shell"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Header />
      <main className="app-main">{hasOpenDocs ? <Reader /> : <Welcome />}</main>
      <PdfExportOverlay />
      <Toast />
    </div>
  )
}
