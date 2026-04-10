// Trading212 API client via CORS proxy
// Proxy URL: https://t212-proxy.anand-mohan.workers.dev
// For local dev, set VITE_T212_PROXY_URL=http://localhost:8787

import { auth } from '../../../firebase'

const PROXY_BASE = import.meta.env.VITE_T212_PROXY_URL || 'https://t212-proxy.anand-mohan.workers.dev'

async function t212Fetch<T>(path: string, apiKey: string, apiSecret: string): Promise<T> {
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) throw new Error('Not authenticated')

  const res = await fetch(`${PROXY_BASE}${path}`, {
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'X-T212-Key': apiKey,
      'X-T212-Secret': apiSecret,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Trading212 API error ${res.status}: ${text}`)
  }
  return res.json()
}

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
  currencyCode: string // 'GBP', 'GBX', 'USD', etc.
}

export async function getPortfolio(apiKey: string, apiSecret: string): Promise<Position[]> {
  return t212Fetch<Position[]>('/equity/portfolio', apiKey, apiSecret)
}

export async function getAccountCash(apiKey: string, apiSecret: string): Promise<AccountCash> {
  return t212Fetch<AccountCash>('/equity/account/cash', apiKey, apiSecret)
}

export async function getInstruments(apiKey: string, apiSecret: string): Promise<Instrument[]> {
  return t212Fetch<Instrument[]>('/equity/metadata/instruments', apiKey, apiSecret)
}

export async function getOrders(apiKey: string, apiSecret: string, limit = 50): Promise<HistoryOrders> {
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) throw new Error('Not authenticated')

  const res = await fetch(`${PROXY_BASE}/equity/history/orders?limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${idToken}`, 'X-T212-Key': apiKey, 'X-T212-Secret': apiSecret },
  })
  // 403 = API key doesn't have order history permission — return empty gracefully
  if (res.status === 403) return { items: [], nextPagePath: null }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Trading212 API error ${res.status}: ${text}`)
  }
  return res.json()
}
