import type { PdfPage, ParseResult, ParsedTransaction, PdfLine } from './types'
import { lineText, allText } from './extractText'
import { parseMmmD, parseDdMonthYyyy } from './dateUtil'

// Header on each tx line: "MMM D MMM D Description ..."
const TX_HEADER_RE = /^([A-Za-z]{3}\s+\d{1,2})\s+([A-Za-z]{3}\s+\d{1,2})\s+(.+)$/
// Statement period like "From 1 March to 28 March 2026"
const PERIOD_RE = /From\s+(\d{1,2}\s+[A-Za-z]+)\s+to\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/
// Membership number on the statement is masked: "xxxx-xxxxxx-62000". Only the last
// group is visible, so we capture that.
const MEMBER_RE = /(?:[x\d]{4}-[x\d]{6}-)(\d{5})/i

const AMOUNT_RE = /^[\d,]+\.\d{2}$/
const X_AMOUNT_MIN = 480  // amount column is right-aligned around x=500-520

export function parseAmex(pages: PdfPage[]): ParseResult {
  const fullText = allText(pages)

  const memberMatch = fullText.match(MEMBER_RE)
  const accountIdentifier = memberMatch ? memberMatch[1] : ''
  if (!accountIdentifier) return { reason: 'Could not find Amex membership number' }
  // For Amex we only ever see the last 5 digits, so use them as the full identifier too.
  const accountIdentifierFull = accountIdentifier

  const periodMatch = fullText.match(PERIOD_RE)
  if (!periodMatch) return { reason: 'Could not find Amex statement period' }
  const periodEnd = parseDdMonthYyyy(periodMatch[2])
  if (!periodEnd) return { reason: `Bad period end: ${periodMatch[2]}` }
  const year = parseInt(periodEnd.slice(0, 4))
  const startWithYear = `${periodMatch[1]} ${year}`
  const periodStart = parseDdMonthYyyy(startWithYear)
  if (!periodStart) return { reason: `Bad period start: ${startWithYear}` }

  const transactions: ParsedTransaction[] = []
  let position = 0

  for (const page of pages) {
    const lines = page.lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const text = lineText(line)
      const m = text.match(TX_HEADER_RE)
      if (!m) continue
      const [, processDateRaw, txDateRaw, rest] = m

      // Skip section headers like "Date Date Transaction Details Foreign Spend" by
      // requiring real month abbreviations (parseMmmD will return null otherwise).
      const processDate = parseMmmD(processDateRaw, year)
      const txDate = parseMmmD(txDateRaw, year)
      if (!processDate || !txDate) continue

      // The amount may be inline on the same line, or on the next visual line below.
      // Look for an item with x >= X_AMOUNT_MIN matching AMOUNT_RE on this line first.
      let amountStr: string | null = null
      let descriptionFromLine = rest.trim()

      const inlineAmount = line.items.find((it) => it.x >= X_AMOUNT_MIN && AMOUNT_RE.test(it.str.trim()))
      if (inlineAmount) {
        amountStr = inlineAmount.str.trim()
        // Remove amount from description text (strip from end)
        descriptionFromLine = descriptionFromLine.replace(new RegExp(`\\s*${escapeRe(amountStr)}\\s*$`), '').trim()
      } else {
        // Look at next line for amount in the right column.
        const next = lines[i + 1]
        if (next) {
          const nextAmount = next.items.find((it) => it.x >= X_AMOUNT_MIN && AMOUNT_RE.test(it.str.trim()))
          if (nextAmount) amountStr = nextAmount.str.trim()
        }
      }

      if (!amountStr) continue
      const absAmount = parseFloat(amountStr.replace(/,/g, ''))
      if (isNaN(absAmount)) continue

      // Look for CR flag in items between this line and a couple lines below.
      let isCredit = false
      for (let j = i; j < Math.min(i + 3, lines.length); j++) {
        const items = lines[j].items
        if (items.some((it) => it.str.trim() === 'CR' && it.x >= X_AMOUNT_MIN)) {
          isCredit = true
          break
        }
        // Also handle "AmountCR" stuck together
        if (items.some((it) => /^[\d,]+\.\d{2}CR$/.test(it.str.trim()))) {
          isCredit = true
          break
        }
      }

      const amount = isCredit ? absAmount : -absAmount
      transactions.push({
        date: txDate,
        rawDescription: descriptionFromLine,
        amount,
        currency: 'GBP',
        metadata: { transactionDate: txDate },
        position: position++,
      })
    }
  }

  if (transactions.length === 0) return { reason: 'No transactions parsed from Amex statement' }

  return {
    issuer: 'amex',
    accountType: 'cc',
    accountIdentifier,
    accountIdentifierFull: accountIdentifierFull || undefined,
    periodStart,
    periodEnd,
    currency: 'GBP',
    transactions,
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
