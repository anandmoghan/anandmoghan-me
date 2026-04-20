import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useAuth } from '../../../hooks/useAuth'
import { getExchangeRates } from '../services/exchangeRates'
import type { ExchangeRates } from '../services/exchangeRates'

export type Currency = 'GBP' | 'USD' | 'INR'

const RATES_CACHE_KEY = 'wr_rates_v1'
const RATES_TTL = 60 * 60 * 1000 // 1 hour

function readCachedRates(): ExchangeRates | null {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw) as { data: ExchangeRates; ts: number }
    if (Date.now() - ts < RATES_TTL) return data
  } catch {}
  return null
}

function writeCachedRates(rates: ExchangeRates) {
  try {
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ data: rates, ts: Date.now() }))
  } catch {}
}

export function useExchangeRates() {
  const { user } = useAuth()

  // Seed from cache so values are stable on first render — no currency flash
  const [rates, setRates] = useState<ExchangeRates | null>(readCachedRates)
  const [displayCurrency, setDisplayCurrencyState] = useState<Currency>('GBP')
  const [loading, setLoading] = useState(() => readCachedRates() === null)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    async function init() {
      // Load user's preferred currency
      try {
        const prefSnap = await getDoc(doc(db, 'wealth', user!.uid, 'prefs', 'p'))
        if (!cancelled && prefSnap.exists()) {
          setDisplayCurrencyState((prefSnap.data().dc as Currency) ?? 'GBP')
        }
      } catch { /* ignore */ }

      // Load exchange rates (skip fetch if cache is still fresh)
      if (readCachedRates()) {
        if (!cancelled) setLoading(false)
        return
      }

      try {
        const r = await getExchangeRates()
        if (!cancelled) {
          setRates(r)
          writeCachedRates(r)
        }
      } catch { /* fall back to no conversion */ } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [user])

  const setDisplayCurrency = (currency: Currency) => {
    setDisplayCurrencyState(currency)
    if (user) {
      setDoc(
        doc(db, 'wealth', user.uid, 'prefs', 'p'),
        { dc: currency },
        { merge: true }
      ).catch(() => {})
    }
  }

  return { rates, displayCurrency, setDisplayCurrency, loading }
}
