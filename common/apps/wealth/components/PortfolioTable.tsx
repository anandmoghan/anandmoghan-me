'use client'

import type { Position } from '../services/trading212'
import type { ExchangeRates } from '../services/exchangeRates'
import type { Currency } from '../hooks/useExchangeRates'
import { convert } from '../services/exchangeRates'

interface Props {
  positions: Position[]
  loading?: boolean
  currencyMap?: Map<string, string>
  nameMap?: Map<string, string>
  rates: ExchangeRates | null
  displayCurrency: Currency
}

const FORMATTERS: Record<string, Intl.NumberFormat> = {
  GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }),
  EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }),
  INR: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }),
}

function fmt(amount: number, currency: string) {
  return (FORMATTERS[currency] ?? FORMATTERS.GBP).format(amount)
}

function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

export function PortfolioTable({ positions, loading, currencyMap = new Map(), nameMap = new Map(), rates, displayCurrency }: Props) {
  // GBX instruments are priced in pence — divide by 100 to get £
  const normalisePrice = (ticker: string, price: number) =>
    currencyMap.get(ticker) === 'GBX' ? price / 100 : price

  // Native currency after normalisation (GBX → GBP)
  const nativeCurrency = (ticker: string) => {
    const c = currencyMap.get(ticker) ?? 'GBP'
    return c === 'GBX' ? 'GBP' : c
  }

  // Convert from a ticker's native currency to display currency
  const cx = (amount: number, ticker: string) => {
    if (!rates) return amount
    return convert(amount, nativeCurrency(ticker), displayCurrency, rates)
  }

  // Convert from GBP (where T212 always reports P&L) to display currency
  const cxGbp = (amount: number) => {
    if (!rates) return amount
    return convert(amount, 'GBP', displayCurrency, rates)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted/10 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (positions.length === 0) {
    return <p className="text-muted text-sm text-center py-8">No positions found.</p>
  }

  // Sort by value descending (in native GBP terms as proxy)
  const sorted = [...positions].sort((a, b) => {
    const aVal = normalisePrice(a.ticker, a.currentPrice) * a.quantity
    const bVal = normalisePrice(b.ticker, b.currentPrice) * b.quantity
    return bVal - aVal
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 font-medium text-muted">Ticker</th>
            <th className="text-right py-2 px-3 font-medium text-muted">Qty</th>
            <th className="text-right py-2 px-3 font-medium text-muted">Avg Price</th>
            <th className="text-right py-2 px-3 font-medium text-muted">Current</th>
            <th className="text-right py-2 px-3 font-medium text-muted">Value</th>
            <th className="text-right py-2 px-3 font-medium text-muted">P&L</th>
            <th className="text-right py-2 px-3 font-medium text-muted hidden sm:table-cell">Return</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((pos) => {
            const normAvg = normalisePrice(pos.ticker, pos.averagePrice)
            const normCurrent = normalisePrice(pos.ticker, pos.currentPrice)
            const cost = normAvg * pos.quantity
            const pctReturn = cost > 0 ? ((normCurrent - normAvg) / normAvg) * 100 : 0
            return (
              <tr key={pos.ticker} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                <td className="py-2.5 px-3 font-medium">
                  <span>{nameMap.get(pos.ticker) ?? pos.ticker}</span>
                  <span className="block text-xs text-muted font-normal">{pos.ticker}</span>
                </td>
                <td className="py-2.5 px-3 text-right text-muted">{pos.quantity.toFixed(4)}</td>
                <td className="py-2.5 px-3 text-right">{fmt(cx(normAvg, pos.ticker), displayCurrency)}</td>
                <td className="py-2.5 px-3 text-right">{fmt(cx(normCurrent, pos.ticker), displayCurrency)}</td>
                <td className="py-2.5 px-3 text-right font-medium">{fmt(cx(normCurrent * pos.quantity, pos.ticker), displayCurrency)}</td>
                <td className={`py-2.5 px-3 text-right font-medium ${pos.ppl >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {fmt(cxGbp(pos.ppl), displayCurrency)}
                </td>
                <td className={`py-2.5 px-3 text-right hidden sm:table-cell ${pctReturn >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {fmtPct(pctReturn)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
