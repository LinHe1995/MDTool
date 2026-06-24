import { useEffect, useRef, useState } from 'react'
import {
  useDocumentStore,
  selectScratchpad,
} from '@/stores/documentStore'

export function ScratchpadPanel() {
  const content = useDocumentStore(selectScratchpad)
  const setScratchpad = useDocumentStore((s) => s.setScratchpad)
  const activePath = useDocumentStore((s) => s.activePath)
  const [draft, setDraft] = useState(content)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDraft(content)
  }, [content, activePath])

  const handleChange = (value: string) => {
    setDraft(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      void setScratchpad(value)
    }, 400)
  }

  return (
    <div className="scratchpad">
      <p className="panel-hint">与当前文档绑定的自由笔记，自动保存至侧车文件。</p>
      <textarea
        className="scratchpad-editor"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="在此记录阅读想法…"
      />
    </div>
  )
}
