import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import type { OpenedFile } from '../../shared/types.js'

export function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex')
}

export async function readMarkdownFile(filePath: string): Promise<OpenedFile> {
  const content = await fs.readFile(filePath, 'utf-8')
  return {
    path: filePath,
    name: path.basename(filePath),
    content,
    contentHash: computeContentHash(content),
  }
}

export function resolveImagePath(mdFilePath: string, imageSrc: string): string {
  if (
    imageSrc.startsWith('http://') ||
    imageSrc.startsWith('https://') ||
    imageSrc.startsWith('data:')
  ) {
    return imageSrc
  }
  const baseDir = path.dirname(mdFilePath)
  const resolved = path.resolve(baseDir, imageSrc)
  return `file://${resolved.replace(/\\/g, '/')}`
}
