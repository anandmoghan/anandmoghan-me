import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useAuth } from '../../../hooks/useAuth'
import { getExchangeRates } from '../services/exchangeRates'
import type { ExchangeRates } from '../services/exchangeRates'

export type Currency = 'GBP' | 'USD' | 'INR'

export function useExchangeRates() {
  const { user } = useAuth()
  const [rates, setRates] = useState<ExchangeRates | null>(null)
  const [displayCurrency, setDisplayCurrencyState] = useState<Currency>('GBP')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    async function init() {
      // Load user's preferred currency
      try {
        const prefSnap = await getDoc(doc(db, 'users', user!.uid, 'settings', 'preferences'))
        if (!cancelled && prefSnap.exists()) {
          setDisplayCurrencyState((prefSnap.data().displayCurrency as Currency) ?? 'GBP')
        }
      } catch { /* ignore */ }

      // Load exchange rates
      try {
        const r = await getExchangeRates()
        if (!cancelled) setRates(r)
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
        doc(db, 'users', user.uid, 'settings', 'preferences'),
        { displayCurrency: currency },
        { merge: true }
      ).catch(() => {})
    }
  }

  return { rates, displayCurrency, setDisplayCurrency, loading }
}
