import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getDb, getFirebaseAuth } from '@/common/firebase/client'
import { API_BASE } from './api'

export interface ExchangeRates {
  base: 'GBP'
  rates: { USD: number; EUR: number; INR: number }
  updatedAt: number // unix ms
}

const RATES_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Get exchange rates.
 * 1. Reads Firestore config/exchangeRates — if fresh (< 1 hour old), returns it.
 * 2. Otherwise calls the /api/rates endpoint (server-side fetch, no CORS).
 * 3. Stores the fresh result in Firestore so all users benefit.
 *
 * The Worker cron job keeps Firestore up-to-date every hour, so step 2
 * is only a fallback for the first load or if the cron hasn't run yet.
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const ref = doc(getDb(), 'config', 'exchangeRates')
  const snap = await getDoc(ref)

  if (snap.exists()) {
    const data = snap.data() as ExchangeRates
    if (Date.now() - data.updatedAt < RATES_TTL_MS) {
      return data
    }
  }

  // Rates are stale or missing — fetch via the API (avoids CORS)
  const idToken = await getFirebaseAuth().currentUser?.getIdToken()
  if (!idToken) throw new Error('Not authenticated')

  const resp = await fetch(`${API_BASE}/rates`, {
    headers: { Authorization: `Bearer ${idToken}` },
  })
  if (!resp.ok) throw new Error(`/rates returned ${resp.status}`)

  const rates = (await resp.json()) as ExchangeRates

  // Persist to Firestore so all users get the cached value
  setDoc(ref, rates).catch(() => {})

  return rates
}

/** Convert an amount from one currency to another using GBP-based rates. */
export function convert(amount: number, from: string, to: string, rates: ExchangeRates): number {
  const src = from === 'GBX' ? 'GBP' : from
  const dst = to === 'GBX' ? 'GBP' : to
  if (src === dst) return amount
  const inGbp = src === 'GBP' ? amount : amount / (rates.rates as Record<string, number>)[src]
  return dst === 'GBP' ? inGbp : inGbp * (rates.rates as Record<string, number>)[dst]
}
