import { extractPdfText } from './extractText'
import type { PdfPage } from './types'

// pdfjs touches browser globals at import time, so it is loaded lazily and only
// in the browser. The iOS polyfill must be installed before pdfjs evaluates, so
// it is awaited first.
async function loadPdfjs() {
  await import('./iosPolyfills')
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
  return pdfjsLib
}

export async function extractFromFile(file: File): Promise<PdfPage[]> {
  const pdfjsLib = await loadPdfjs()
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
