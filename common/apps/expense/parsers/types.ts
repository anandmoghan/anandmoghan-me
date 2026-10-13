import type { Currency, Issuer, AccountType } from '../types'

export interface PdfTextItem {
  x: number
  y: number
  str: string
}

export interface PdfLine {
  y: number
  items: PdfTextItem[]
}

export interface PdfPage {
  pageNum: number
  lines: PdfLine[]
}

export interface ParsedTransaction {
  date: string                    // YYYY-MM-DD
  rawDescription: string
  amount: number                  // signed; negative = money out, positive = money in
  currency: Currency
  metadata?: {
    reference?: string
    location?: string
    foreignAmount?: string
    transactionDate?: string      // when CC has both process+transaction date
  }
  position: number                // stable index for ordering / dedup
}

export interface ParsedStatement {
  issuer: Issuer
  accountType: AccountType
  accountIdentifier: string       // last 4 digits
  accountIdentifierFull?: string  // full sortcode+number or full card number, for cross-statement linking
  periodStart: string             // YYYY-MM-DD
  periodEnd: string
  currency: Currency
  transactions: ParsedTransaction[]
}

export interface ParserError {
  reason: string
}

export type ParseResult = ParsedStatement | ParserError

export function isParserError(r: ParseResult): r is ParserError {
  return 'reason' in r
}
