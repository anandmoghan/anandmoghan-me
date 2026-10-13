import { getFirestore } from 'firebase-admin/firestore'

const T212_BASE = 'https://live.trading212.com/api/v0'

async function t212Get<T>(path: string, apiKey: string, apiSecret: string): Promise<T> {
  const basicAuth = 'Basic ' + btoa(`${apiKey}:${apiSecret}`)
  const resp = await fetch(`${T212_BASE}${path}`, {
    headers: { Authorization: basicAuth, 'Content-Type': 'application/json' },
  })
  if (resp.status === 403) return [] as unknown as T  // no permission, return empty
  if (!resp.ok) throw new Error(`T212 ${resp.status} on ${path}`)
  return resp.json() as Promise<T>
}

interface T212Position {
  ticker: string; quantity: number; averagePrice: number; currentPrice: number
  ppl: number; fxPpl: number; initialFillDate: string; frontend: string
  maxBuy: number; maxSell: number; pieQuantity: number
}
interface T212Cash {
  blocked: number; free: number; invested: number; pieCash: number
  ppl: number; result: number; total: number
}
interface T212Order {
  dateModified: string; dateCreated: string; executor: string; fillCost: number
  fillId: number; fillPrice: number; fillResult: number; fillType: string
  filledQuantity: number; id: number; orderedQuantity: number; orderedValue: number
  parentOrder: number; status: string; ticker: string; timeValidity: string; type: string
}
interface T212Instrument { ticker: string; currencyCode: string; name: string; shortname: string }

// Fetch portfolio, cash, orders, and instrument metadata for a user.
// Snapshot fields use minimal keys: p=portfolio, c=cash, o=orders, ts=timestamp,
// err=error, m=instrument metadata map (ticker -> {n: name, c: currency}).
export async function fetchAndWriteSnapshot(
  uid: string, apiKey: string, apiSecret: string
): Promise<void> {
  let error: string | null = null
  let portfolio: T212Position[] = []
  let cash: T212Cash | null = null
  let orders: T212Order[] = []
  const meta: Record<string, { n: string; c: string }> = {}

  try {
    const [p, c, oResp] = await Promise.all([
      t212Get<T212Position[]>('/equity/portfolio', apiKey, apiSecret),
      t212Get<T212Cash>('/equity/account/cash', apiKey, apiSecret),
      fetch(`${T212_BASE}/equity/history/orders?limit=50`, {
        headers: { Authorization: 'Basic ' + btoa(`${apiKey}:${apiSecret}`) },
      }),
    ])
    portfolio = p
    cash = c
    if (oResp.status !== 403 && oResp.ok) {
      const oBody = (await oResp.json()) as { items: T212Order[] }
      orders = oBody.items ?? []
    }

    // T212 returns 10k+ instruments; we only store what the user holds.
    if (portfolio.length > 0) {
      const needed = new Set(portfolio.map((pos) => pos.ticker))
      const allInstruments = await t212Get<T212Instrument[]>('/equity/metadata/instruments', apiKey, apiSecret)
      for (const instr of allInstruments) {
        if (needed.has(instr.ticker)) {
          meta[instr.ticker] = {
            n: instr.name || instr.shortname || instr.ticker,
            c: instr.currencyCode,
          }
        }
      }
    }
  } catch (e) {
    error = String(e)
  }

  // Full replace (the worker's PATCH had no update mask); include meta only when present.
  const doc: Record<string, unknown> = {
    p: portfolio,
    c: cash,
    o: orders,
    ts: Date.now(),
    err: error,
  }
  if (Object.keys(meta).length > 0) doc.m = meta

  await getFirestore().doc(`t212Snapshots/${uid}`).set(doc)
}
