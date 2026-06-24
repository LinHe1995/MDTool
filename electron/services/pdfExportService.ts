import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { app, BrowserWindow, dialog } from 'electron'
import type { PdfExportPayload } from '../../shared/types.js'

export type PdfExportProgressCallback = (progress: {
  percent: number
  message: string
}) => void

export type PdfExportOutcome =
  | { ok: true; filePath: string }
  | { ok: false; canceled: boolean }

const PRINT_MARKDOWN_CSS = `
.markdown-body {
  font-size: 16px;
  line-height: 1.75;
  color: var(--text-primary);
}
.markdown-body h1, .markdown-body h2, .markdown-body h3,
.markdown-body h4, .markdown-body h5, .markdown-body h6 {
  line-height: 1.3;
  margin: 1.2em 0 0.5em;
}
.markdown-body h1 { font-size: 2em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
.markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.25em; }
.markdown-body h3 { font-size: 1.25em; }
.markdown-body p, .markdown-body ul, .markdown-body ol, .markdown-body blockquote {
  margin: 0.8em 0;
}
.markdown-body blockquote {
  border-left: 4px solid var(--border);
  padding-left: 16px;
  color: var(--text-secondary);
}
.markdown-body pre {
  background: var(--code-bg);
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
.markdown-body code {
  font-family: Consolas, "Cascadia Code", monospace;
  font-size: 0.9em;
}
.markdown-body :not(pre) > code {
  background: var(--code-bg);
  padding: 2px 6px;
  border-radius: 4px;
}
.markdown-body table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}
.markdown-body th, .markdown-body td {
  border: 1px solid var(--border);
  padding: 8px 12px;
}
.markdown-body img { max-width: 100%; }
.markdown-body a { color: var(--accent); }
.markdown-body .katex-display {
  margin: 1em 0;
  overflow-x: auto;
}
.mermaid-diagram {
  margin: 1em 0;
  text-align: center;
}
.mermaid-diagram svg { max-width: 100%; }
mark.mdtool-highlight { border-radius: 2px; padding: 0 2px; }
`

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 防止文档片段意外闭合外层 HTML 结构 */
function sanitizeFragment(html: string): string {
  return html
    .replace(/<\/script/gi, '&lt;/script')
    .replace(/<\/body/gi, '&lt;/body')
    .replace(/<\/html/gi, '&lt;/html')
}

async function loadKatexCss(): Promise<string> {
  const candidates = [
    path.join(app.getAppPath(), 'node_modules/katex/dist/katex.min.css'),
    path.join(process.cwd(), 'node_modules/katex/dist/katex.min.css'),
  ]
  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, 'utf-8')
    } catch {
      // try next
    }
  }
  return ''
}

function buildPrintHtml(payload: PdfExportPayload, extraCss: string): string {
  const { html, title, theme } = payload
  const bodyHtml = sanitizeFragment(html)

  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${theme}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root, :root[data-theme='light'] {
      --text-primary: #1a1a1a;
      --text-secondary: #5c6370;
      --border: #e1e4e8;
      --accent: #2563eb;
      --code-bg: #f6f8fa;
    }
    :root[data-theme='dark'] {
      --text-primary: #e8eaed;
      --text-secondary: #9aa3b2;
      --border: #2a3142;
      --accent: #3b82f6;
      --code-bg: #1a1f2b;
    }
    body {
      margin: 0;
      padding: 24px 32px;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: #fff;
      color: var(--text-primary);
    }
    :root[data-theme='dark'] body { background: #12151c; }
    .markdown-body { max-width: 800px; margin: 0 auto; }
    ${PRINT_MARKDOWN_CSS}
    ${extraCss}
  </style>
</head>
<body>
  <div class="markdown-body">${bodyHtml}</div>
</body>
</html>`
}

function ensurePdfExtension(filePath: string): string {
  return filePath.toLowerCase().endsWith('.pdf') ? filePath : `${filePath}.pdf`
}

export async function exportHtmlToPdf(
  parent: BrowserWindow | null | undefined,
  fallbackParent: BrowserWindow | null | undefined,
  payload: PdfExportPayload,
  defaultName: string,
  onProgress?: PdfExportProgressCallback,
): Promise<PdfExportOutcome> {
  const report = (percent: number, message: string) => {
    onProgress?.({ percent, message })
  }

  const dialogParent =
    (parent && !parent.isDestroyed()
      ? parent
      : fallbackParent && !fallbackParent.isDestroyed()
        ? fallbackParent
        : undefined) ?? fallbackParent

  if (!dialogParent || dialogParent.isDestroyed()) {
    throw new Error('无法打开保存对话框：主窗口不可用')
  }

  const saveResult = await dialog.showSaveDialog(dialogParent, {
    defaultPath: defaultName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })

  if (saveResult.canceled || !saveResult.filePath) {
    return { ok: false, canceled: true }
  }

  const outputPath = ensurePdfExtension(saveResult.filePath)

  report(8, '正在准备导出内容…')

  const printWin = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdtool-pdf-'))
  const tempHtmlPath = path.join(tempDir, 'export.html')

  try {
    const katexCss = await loadKatexCss()
    const fullHtml = buildPrintHtml(payload, katexCss)
    await fs.writeFile(tempHtmlPath, fullHtml, 'utf-8')

    report(28, '正在加载预览页面…')
    await printWin.loadFile(tempHtmlPath)

    report(55, '正在渲染 PDF…')
    await new Promise((resolve) => setTimeout(resolve, 400))

    const pdf = await printWin.webContents.printToPDF({
      printBackground: true,
      margins: {
        marginType: 'default',
      },
    })

    if (!pdf || pdf.byteLength === 0) {
      throw new Error('生成的 PDF 为空')
    }

    report(88, '正在保存文件…')
    await fs.writeFile(outputPath, Buffer.from(pdf))
    report(100, '导出完成')
    return { ok: true, filePath: outputPath }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    if (!printWin.isDestroyed()) {
      printWin.destroy()
    }
  }
}
