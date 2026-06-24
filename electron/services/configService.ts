import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import type { AppConfig } from '../../shared/types.js'
import { DEFAULT_CONFIG } from '../../shared/types.js'

function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

export async function readConfig(): Promise<AppConfig> {
  try {
    const raw = await fs.readFile(getConfigPath(), 'utf-8')
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export async function writeConfig(partial: Partial<AppConfig>): Promise<AppConfig> {
  const current = await readConfig()
  const next = { ...current, ...partial }
  await fs.mkdir(path.dirname(getConfigPath()), { recursive: true })
  await fs.writeFile(getConfigPath(), JSON.stringify(next, null, 2), 'utf-8')
  return next
}

export async function addRecentFile(filePath: string): Promise<AppConfig> {
  const config = await readConfig()
  const recent = [
    filePath,
    ...config.recentFiles.filter((p) => p !== filePath),
  ].slice(0, 20)
  return writeConfig({ recentFiles: recent })
}
