import { getFirestore } from 'firebase-admin/firestore'

const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?base=GBP&symbols=USD,EUR,INR'

export interface Rates { USD: number; EUR: number; INR: number }

export async function fetchFrankfurterRates(): Promise<Rates> {
  const resp = await fetch(FRANKFURTER_URL)
  if (!resp.ok) throw new Error(`Frankfurter error ${resp.status}`)
  const json = (await resp.json()) as { rates: Rates }
  return json.rates
}

export async function writeRatesToFirestore(rates: Rates): Promise<void> {
  await getFirestore().doc('config/exchangeRates').set({
    base: 'GBP',
    rates,
    updatedAt: Date.now(),
  })
}
