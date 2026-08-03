import type { PdfPage, PdfLine, PdfTextItem } from './types'

/**
 * Wraps pdfjs's getTextContent to produce a stable, line-oriented view of a PDF.
 * Items on the same visual row (within Y_TOLERANCE) are merged into a single line.
 *
 * Caller passes in the loaded PDFDocumentProxy (because pdfjs setup differs
 * between Node and browser environments).
 */

const Y_TOLERANCE = 3

// pdfjs' TextContent.items can include both real TextItems and TextMarkedContent;
// we narrow at runtime by checking for `transform`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPdfDoc = { numPages: number; getPage(n: number): Promise<any> }

export async function extractPdfText(doc: AnyPdfDoc): Promise<PdfPage[]> {
  const pages: PdfPage[] = []
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    const items: PdfTextItem[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const it of content.items as any[]) {
      const str = it.str
      const transform = it.transform
      if (!str || !str.trim() || !transform) continue
      items.push({ x: transform[4], y: transform[5], str })
    }
    pages.push({ pageNum, lines: groupItemsByLine(items) })
  }
  return pages
}

function groupItemsByLine(items: PdfTextItem[]): PdfLine[] {
  if (items.length === 0) return []
  const sorted = [...items].sort((a, b) => b.y - a.y)
  const lines: PdfLine[] = []
  for (const item of sorted) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(last.y - item.y) <= Y_TOLERANCE) {
      last.items.push(item)
    } else {
      lines.push({ y: item.y, items: [item] })
    }
  }
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x)
  }
  return lines
}

export function lineText(line: PdfLine): string {
  return line.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim()
}

export function pageText(page: PdfPage): string {
  return page.lines.map(lineText).join('\n')
}

export function allText(pages: PdfPage[]): string {
  return pages.map(pageText).join('\n')
}
