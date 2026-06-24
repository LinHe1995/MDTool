import fs from 'node:fs/promises'
import path from 'node:path'
import type { AnnotationFile } from '../../shared/types.js'
import { DEFAULT_ANNOTATION } from '../../shared/types.js'

export function getAnnotationPath(mdFilePath: string): string {
  const dir = path.dirname(mdFilePath)
  const stem = path.basename(mdFilePath, path.extname(mdFilePath))
  return path.join(dir, `${stem}.mdtool.json`)
}

export async function readAnnotationFile(
  mdFilePath: string,
): Promise<AnnotationFile> {
  const annotationPath = getAnnotationPath(mdFilePath)
  try {
    const raw = await fs.readFile(annotationPath, 'utf-8')
    const data = JSON.parse(raw) as AnnotationFile
    return { ...DEFAULT_ANNOTATION(mdFilePath), ...data, sourceFile: mdFilePath }
  } catch {
    return DEFAULT_ANNOTATION(mdFilePath)
  }
}

export async function writeAnnotationFile(
  mdFilePath: string,
  data: AnnotationFile,
): Promise<void> {
  const annotationPath = getAnnotationPath(mdFilePath)
  await fs.writeFile(annotationPath, JSON.stringify(data, null, 2), 'utf-8')
}
