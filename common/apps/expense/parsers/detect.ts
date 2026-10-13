import type { PdfPage, ParseResult } from './types'
import { allText } from './extractText'
import { parseHsbcBank } from './hsbcBank'
import { parseHsbcCc } from './hsbcCc'
import { parseAmex } from './amex'

export type StatementKind = 'hsbc-bank' | 'hsbc-cc' | 'amex' | 'unknown'

export function detectIssuer(pages: PdfPage[]): StatementKind {
  const text = allText(pages).toLowerCase()
  if (text.includes('americanexpress.co.uk') || text.includes('american express')) {
    return 'amex'
  }
  if (text.includes('hsbc') && (text.includes('credit card') || text.includes('credit lim it'))) {
    return 'hsbc-cc'
  }
  if (text.includes('hsbc') && (text.includes('your premier statement') || text.includes('account num') || text.includes('sortcode'))) {
    return 'hsbc-bank'
  }
  return 'unknown'
}

export function parseStatement(pages: PdfPage[]): { kind: StatementKind; result: ParseResult } {
  const kind = detectIssuer(pages)
  switch (kind) {
    case 'amex': return { kind, result: parseAmex(pages) }
    case 'hsbc-cc': return { kind, result: parseHsbcCc(pages) }
    case 'hsbc-bank': return { kind, result: parseHsbcBank(pages) }
    default: return { kind, result: { reason: 'Could not detect statement issuer' } }
  }
}
