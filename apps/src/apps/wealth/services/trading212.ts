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
