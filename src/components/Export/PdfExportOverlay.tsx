import { useUiStore } from '@/stores/uiStore'

export function PdfExportOverlay() {
  const pdfExport = useUiStore((s) => s.pdfExport)

  if (!pdfExport?.active) return null

  return (
    <div className="pdf-export-overlay" role="dialog" aria-modal="true" aria-label="正在导出 PDF">
      <div className="pdf-export-panel">
        <h2 className="pdf-export-title">正在导出 PDF</h2>
        <p className="pdf-export-message">{pdfExport.message}</p>
        <div className="pdf-export-bar-track" aria-hidden="true">
          <div
            className="pdf-export-bar-fill"
            style={{ width: `${pdfExport.percent}%` }}
          />
        </div>
        <span className="pdf-export-percent">{pdfExport.percent}%</span>
      </div>
    </div>
  )
}
