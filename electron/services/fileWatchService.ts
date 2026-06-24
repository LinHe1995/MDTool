import fs from 'node:fs'

const watchers = new Map<string, fs.FSWatcher>()
let activeWatchPath: string | null = null

export function watchMarkdownFile(
  filePath: string,
  onChange: (path: string) => void,
) {
  if (activeWatchPath === filePath) return

  if (activeWatchPath) {
    watchers.get(activeWatchPath)?.close()
    watchers.delete(activeWatchPath)
  }

  activeWatchPath = filePath

  try {
    const watcher = fs.watch(filePath, (eventType) => {
      if (eventType === 'change') {
        onChange(filePath)
      }
    })
    watchers.set(filePath, watcher)
  } catch (error) {
    console.error('文件监听失败:', filePath, error)
  }
}

export function unwatchMarkdownFile(filePath?: string) {
  const target = filePath ?? activeWatchPath
  if (!target) return
  watchers.get(target)?.close()
  watchers.delete(target)
  if (activeWatchPath === target) {
    activeWatchPath = null
  }
}
