// Trading212 API client via CORS proxy
// Proxy URL: https://t212-proxy.anandmoghan-apps.workers.dev
// For local dev, can also hit the proxy at localhost

const PROXY_BASE = import.meta.env.VITE_T212_PROXY_URL || 'https://t212-proxy.anandmoghan-apps.workers.dev'

async function t212Fetch<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${PROXY_BASE}${path}`, {
    headers: {
      'X-T212-Key': apiKey,
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

export async function getPortfolio(apiKey: string): Promise<Position[]> {
  return t212Fetch<Position[]>('/equity/portfolio', apiKey)
}

export async function getAccountCash(apiKey: string): Promise<AccountCash> {
  return t212Fetch<AccountCash>('/equity/account/cash', apiKey)
}

export async function getOrders(apiKey: string, limit = 50): Promise<HistoryOrders> {
  return t212Fetch<HistoryOrders>(`/equity/history/orders?limit=${limit}`, apiKey)
}
