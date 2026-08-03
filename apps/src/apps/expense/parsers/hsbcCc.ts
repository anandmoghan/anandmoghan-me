import type { PdfPage, ParseResult, ParsedTransaction } from './types'
import { lineText, allText } from './extractText'
import { parseDdMmmYy, parseDdMonthYyyy, previousMonth } from './dateUtil'

const TX_LINE_RE = /^(\d{2}\s+[A-Za-z]{3}\s+\d{2})\s+(\d{2}\s+[A-Za-z]{3}\s+\d{2})\s+(?:\)\)\)\s+)?(.+?)\s+([\d,]+\.\d{2})(CR)?$/
const CARD_NUMBER_RE = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/
const STATEMENT_DATE_RE = /Statement\s+Date\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/

export function parseHsbcCc(pages: PdfPage[]): ParseResult {
  const fullText = allText(pages)

  const cardMatch = fullText.match(CARD_NUMBER_RE)
  const accountIdentifierFull = cardMatch ? cardMatch[1].replace(/\s+/g, '') : ''
  const accountIdentifier = accountIdentifierFull.slice(-4)
  if (!accountIdentifier) {
    return { reason: 'Could not find HSBC CC card number' }
  }

  const stmtDateMatch = fullText.match(STATEMENT_DATE_RE)
  if (!stmtDateMatch) return { reason: 'Could not find statement date' }
  const periodEnd = parseDdMonthYyyy(stmtDateMatch[1])
  if (!periodEnd) return { reason: `Bad statement date: ${stmtDateMatch[1]}` }
  const periodStart = previousMonth(periodEnd)

  const transactions: ParsedTransaction[] = []
  let position = 0
  for (const page of pages) {
    for (const line of page.lines) {
      const text = lineText(line)
      const m = text.match(TX_LINE_RE)
      if (!m) continue
      const [, receivedDateRaw, txDateRaw, description, amountRaw, crFlag] = m
      const receivedDate = parseDdMmmYy(receivedDateRaw)
      const txDate = parseDdMmmYy(txDateRaw)
      if (!receivedDate || !txDate) continue
      const absAmount = parseFloat(amountRaw.replace(/,/g, ''))
      if (isNaN(absAmount)) continue
      // CC convention: a charge increases what you owe (we model as a negative
      // expense from the cardholder's perspective, i.e. money out).
      // CR (payment received from bank) is a credit on the card, money "in"
      // from the card's perspective.
      const amount = crFlag ? absAmount : -absAmount
      transactions.push({
        date: txDate,
        rawDescription: description.trim(),
        amount,
        currency: 'GBP',
        metadata: { transactionDate: txDate },
        position: position++,
      })
    }
  }

  if (transactions.length === 0) {
    return { reason: 'No transactions parsed from HSBC CC statement' }
  }

  return {
    issuer: 'hsbc',
    accountType: 'cc',
    accountIdentifier,
    accountIdentifierFull,
    periodStart,
    periodEnd,
    currency: 'GBP',
    transactions,
  }
}
