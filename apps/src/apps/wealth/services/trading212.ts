// Trading212 type definitions.
// All API calls are made by the Cloudflare Worker (cron + /api/sync).
// The frontend reads pre-fetched snapshots from Firestore.

export interface Position {
  ticker: string
  quantity: number
  averagePrice: number
  currentPrice: number
  ppl: number
  fxPpl: number
  initialFillDate: string
  frontend: string
  maxBuy: number
  maxSell: number
  pieQuantity: number
}

export interface AccountCash {
  blocked: number
  free: number
  invested: number
  pieCash: number
  ppl: number
  result: number
  total: number
}

export interface Order {
  dateModified: string
  dateCreated: string
  executor: string
  fillCost: number
  fillId: number
  fillPrice: number
  fillResult: number
  fillType: string
  filledQuantity: number
  id: number
  orderedQuantity: number
  orderedValue: number
  parentOrder: number
  status: string
  ticker: string
  timeValidity: string
  type: string
}

export interface HistoryOrders {
  items: Order[]
  nextPagePath: string | null
}

export interface Instrument {
  ticker: string
  currencyCode: string  // 'GBP', 'GBX', 'USD', etc.
  name: string
  shortname: string
}

/**
 * Infer a position's native currency from its T212 ticker format when
 * the instruments metadata document is unavailable.
 *
 * Patterns observed:
 *   - Ends with lowercase-letter + "_EQ"  (e.g. "SSLNl_EQ", "RRl_EQ") → GBX (LSE, pence)
 *   - Contains "_US_EQ"                   (e.g. "NVDA_US_EQ")           → USD
 *   - Contains "_DE_EQ" / "_EU_EQ"        (e.g. "SAP_DE_EQ")            → EUR
 *   - Contains "_CA_EQ"                                                  → CAD
 *   - Fallback                                                           → GBP
 */
export function inferTickerCurrency(ticker: string): string {
  if (/[a-z]_EQ$/.test(ticker)) return 'GBX'
  if (ticker.includes('_US_EQ')) return 'USD'
  if (ticker.includes('_DE_EQ') || ticker.includes('_EU_EQ') || ticker.includes('_FR_EQ') || ticker.includes('_NL_EQ')) return 'EUR'
  if (ticker.includes('_CA_EQ')) return 'CAD'
  if (ticker.includes('_AU_EQ')) return 'AUD'
  return 'GBP'
}

/**
 * Return a clean display ticker by stripping the T212 exchange/market suffix.
 *   "SSLNl_EQ" → "SSLN", "NVDA_US_EQ" → "NVDA"
 */
export function cleanTicker(ticker: string): string {
  return ticker.replace(/[a-z]_EQ$/, '').replace(/_[A-Z]{2,3}_EQ$/, '')
}
