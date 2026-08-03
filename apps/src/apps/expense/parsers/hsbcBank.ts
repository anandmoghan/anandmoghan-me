import type { PdfPage, ParseResult, ParsedTransaction, PdfLine, PdfTextItem } from './types'
import { lineText, allText } from './extractText'
import { parseDdMmmYy } from './dateUtil'

const SORTCODE_RE = /(\d{2}-\d{2}-\d{2})/
const ACCOUNT_NUM_RE = /(\d{8})\s+\d+\s*$|Account\s+Num[a-z\s]+\s+(\d{8})/
// "19 March to 18 April 2026"
const PERIOD_RE = /(\d{1,2}\s+[A-Za-z]+)\s+to\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/

const MONTH_LONG: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

const DATE_PREFIX_RE = /^(\d{2})\s+([A-Za-z]{3})\s+(\d{2})\b/
const AMOUNT_RE = /^[\d,]+\.\d{2}$/
const TYPE_CODES = new Set(['DD', 'CR', 'OBP', 'BP', 'TFR', 'ATM', 'SO', 'BAC', 'CHQ', 'POS', 'VIS', 'DR', 'INT'])

// Column thresholds derived from header inspection of the sample HSBC bank statement.
// Paid out  ~x in [330, 415]
// Paid in   ~x in [415, 490]
// Balance   ~x in [490, 600]
const PAID_OUT_MIN = 330
const PAID_OUT_MAX = 415
const PAID_IN_MIN = 415
const PAID_IN_MAX = 490
const BALANCE_MIN = 490

interface AmountClassified {
  paidOut: number | null
  paidIn: number | null
  balance: number | null
}

function classifyAmounts(items: PdfTextItem[]): AmountClassified {
  const result: AmountClassified = { paidOut: null, paidIn: null, balance: null }
  for (const it of items) {
    const s = it.str.trim()
    if (!AMOUNT_RE.test(s)) continue
    const n = parseFloat(s.replace(/,/g, ''))
    if (isNaN(n)) continue
    if (it.x >= BALANCE_MIN) result.balance = n
    else if (it.x >= PAID_IN_MIN && it.x < PAID_IN_MAX) result.paidIn = n
    else if (it.x >= PAID_OUT_MIN && it.x < PAID_OUT_MAX) result.paidOut = n
  }
  return result
}

interface FlatRow {
  date: string | null  // YYYY-MM-DD if line starts with date prefix
  typeCode: string | null  // DD/CR/OBP/BP if present
  description: string  // text portion
  amounts: AmountClassified
}

function parseRow(line: PdfLine): FlatRow {
  const items = line.items
  const fullText = items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim()

  let date: string | null = null
  let remaining = fullText
  const dateMatch = fullText.match(DATE_PREFIX_RE)
  if (dateMatch) {
    date = parseDdMmmYy(`${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]}`)
    remaining = fullText.slice(dateMatch[0].length).trim()
  }

  let typeCode: string | null = null
  const typeMatch = remaining.match(/^([A-Z]{2,3})\s+/)
  if (typeMatch && TYPE_CODES.has(typeMatch[1])) {
    typeCode = typeMatch[1]
    remaining = remaining.slice(typeMatch[0].length)
  }

  // Strip trailing amounts from description
  remaining = remaining.replace(/\s+([\d,]+\.\d{2})(\s+([\d,]+\.\d{2}))?\s*$/, '').trim()

  return { date, typeCode, description: remaining, amounts: classifyAmounts(items) }
}

export function parseHsbcBank(pages: PdfPage[]): ParseResult {
  const fullText = allText(pages)

  const sortMatch = fullText.match(SORTCODE_RE)
  const sortcode = sortMatch ? sortMatch[1] : ''
  // Account number appears like "Mr Anand Mohan 40-12-64 00515701 39"
  const acctMatch = fullText.match(/\b(\d{8})\s+\d{1,3}\b/)
  const accountNum = acctMatch ? acctMatch[1] : ''
  if (!accountNum) return { reason: 'Could not find HSBC bank account number' }
  const accountIdentifier = accountNum.slice(-4)
  const accountIdentifierFull = sortcode ? `${sortcode.replace(/-/g, '')}${accountNum}` : accountNum

  const periodMatch = fullText.match(PERIOD_RE)
  if (!periodMatch) return { reason: 'Could not find HSBC bank statement period' }
  const endParts = periodMatch[2].split(/\s+/)
  const yearMatch = parseInt(endParts[2])
  const monStart = MONTH_LONG[periodMatch[1].split(/\s+/)[1].toLowerCase()]
  const dayStart = parseInt(periodMatch[1].split(/\s+/)[0])
  const monEnd = MONTH_LONG[endParts[1].toLowerCase()]
  const dayEnd = parseInt(endParts[0])
  if (!monStart || !monEnd) return { reason: `Bad period: ${periodMatch[0]}` }
  // If month-start > month-end, the start was in the previous calendar year.
  const yearStart = monStart > monEnd ? yearMatch - 1 : yearMatch
  const periodStart = `${yearStart}-${pad(monStart)}-${pad(dayStart)}`
  const periodEnd = `${yearMatch}-${pad(monEnd)}-${pad(dayEnd)}`

  // Walk the lines: find start (first BALANCE BROUGHT FORWARD) and end (BALANCE CARRIED FORWARD).
  // Inside that span, every line is either: a date row, a type-code row, a continuation row,
  // or an amount row (terminates the current transaction).
  const transactions: ParsedTransaction[] = []
  let position = 0
  let currentDate: string | null = null

  // Buffer of lines that comprise the "in-flight" transaction.
  let buffer: { typeCode: string | null; description: string[] } | null = null

  function flushIfHasAmount(amounts: AmountClassified) {
    if (!buffer || !currentDate) return
    if (amounts.paidOut == null && amounts.paidIn == null) return
    const desc = (buffer.typeCode ? buffer.typeCode + ' ' : '') + buffer.description.filter(Boolean).join(' ')
    const signed = amounts.paidIn != null ? amounts.paidIn : -(amounts.paidOut ?? 0)
    transactions.push({
      date: currentDate,
      rawDescription: desc.trim(),
      amount: signed,
      currency: 'GBP',
      position: position++,
    })
    buffer = null
  }

  for (const page of pages) {
    let inTxSection = false
    for (const line of page.lines) {
      const text = lineText(line)
      if (text.includes('BALANCE BROUGHT FORWARD') || text.includes('Pay m e nt t y pe and de t ails')) {
        inTxSection = true
        // Update date from a brought-forward line if present
        const row = parseRow(line)
        if (row.date) currentDate = row.date
        continue
      }
      if (text.includes('BALANCE CARRIED FORWARD')) {
        inTxSection = false
        continue
      }
      if (!inTxSection) continue

      const row = parseRow(line)
      if (row.date) currentDate = row.date

      const hasAmount = row.amounts.paidOut != null || row.amounts.paidIn != null

      if (row.typeCode) {
        // Starting a new transaction. Flush any pending one (shouldn't usually have one
        // unless the prior line had a typeCode without amount and this line continues).
        if (buffer) {
          // Pending tx with no amount yet — append the new one's description as continuation? No;
          // a new typeCode means the prior tx is malformed. Discard buffer to avoid corruption.
          buffer = null
        }
        buffer = { typeCode: row.typeCode, description: [row.description] }
        if (hasAmount) flushIfHasAmount(row.amounts)
      } else {
        // Continuation of prior tx
        if (!buffer) {
          // No prior tx (e.g. CR line without explicit type). Use raw text.
          if (row.description) buffer = { typeCode: null, description: [row.description] }
        } else {
          if (row.description) buffer.description.push(row.description)
        }
        if (hasAmount) flushIfHasAmount(row.amounts)
      }
    }
  }

  if (transactions.length === 0) return { reason: 'No transactions parsed from HSBC bank statement' }

  return {
    issuer: 'hsbc',
    accountType: 'bank',
    accountIdentifier,
    accountIdentifierFull,
    periodStart,
    periodEnd,
    currency: 'GBP',
    transactions,
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}
