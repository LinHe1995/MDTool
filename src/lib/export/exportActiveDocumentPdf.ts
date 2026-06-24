import { useDocumentStore } from '@/stores/documentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'

function fileNameFromPath(filePath: string): string {
  const parts = filePath.split(/[/\\]/)
  return parts[parts.length - 1] || filePath
}

export async function exportActiveDocumentPdf(): Promise<void> {
  const showToast = useDocumentStore.getState().showToast
  const activePath = useDocumentStore.getState().activePath
  const file = activePath
    ? useDocumentStore.getState().tabs[activePath]?.file
    : undefined

  if (!file) {
    showToast('请先打开文档')
    return
  }

  if (!window.mdtool?.exportPdf) {
    showToast('PDF 导出不可用，请通过 Electron 窗口运行')
    return
  }

  const root = document.querySelector('.reader-content .markdown-body')
  if (!root) {
    showToast('无法获取文档内容，请稍后重试')
    return
  }

  const stem = file.name.replace(/\.(md|markdown)$/i, '')
  const theme = useSettingsStore.getState().resolvedTheme
  const { startPdfExport } = useUiStore.getState()

  startPdfExport('请选择保存位置…')

  try {
    const result = await window.mdtool.exportPdf(
      {
        html: root.innerHTML,
        title: file.name,
        theme,
      },
      `${stem}.pdf`,
    )

    if (result.ok && result.filePath) {
      const fileName = fileNameFromPath(result.filePath)
      showToast(`PDF 已保存：${fileName}`, 4500)
      await window.mdtool.revealInFolder?.(result.filePath)
      return
    }

    if (result.canceled) {
      showToast('已取消导出')
      return
    }

    showToast('PDF 导出失败')
  } catch (error) {
    showToast(
      `PDF 导出失败：${error instanceof Error ? error.message : String(error)}`,
      4000,
    )
  } finally {
    const state = useUiStore.getState()
    if (state.pdfExport && state.pdfExport.percent >= 100) {
      state.setPdfExportProgress({ percent: 100, message: '导出完成' })
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
    state.endPdfExport()
  }
}
