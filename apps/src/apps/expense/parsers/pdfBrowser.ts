// Must run before pdfjs-dist loads — see iosPolyfills.ts. ES module imports
// are hoisted, so the polyfill is in its own module to guarantee order.
import './iosPolyfills'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Vite resolves the worker URL at build time
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import { extractPdfText } from './extractText'
import type { PdfPage } from './types'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export async function extractFromFile(file: File): Promise<PdfPage[]> {
  const buffer = await file.arrayBuffer()
  const data = new Uint8Array(buffer)
  const doc = await pdfjsLib.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
  }).promise
  return extractPdfText(doc)
}

export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
