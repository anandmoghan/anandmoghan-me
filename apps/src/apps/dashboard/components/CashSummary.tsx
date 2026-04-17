import type { AccountCash } from '../services/trading212'
import type { ExchangeRates } from '../services/exchangeRates'
import type { Currency } from '../hooks/useExchangeRates'
import { convert } from '../services/exchangeRates'

interface Props {
  cash: AccountCash | null
  loading?: boolean
  rates: ExchangeRates | null
  displayCurrency: Currency
}

const FORMATTERS: Record<string, Intl.NumberFormat> = {
  GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }),
  INR: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }),
}

function fmt(amount: number, currency: Currency) {
  return (FORMATTERS[currency] ?? FORMATTERS.GBP).format(amount)
}

export function CashSummary({ cash, loading, rates, displayCurrency }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-4 animate-pulse">
            <div className="h-3 bg-muted/30 rounded mb-2 w-16" />
            <div className="h-5 bg-muted/30 rounded w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (!cash) {
    return <p className="text-muted text-sm">No cash data available.</p>
  }

  // T212 cash values are always in GBP (account base currency)
  const cx = (n: number) => rates ? convert(n, 'GBP', displayCurrency, rates) : n

  // totalReturn = realized + unrealized P&L
  const totalReturn = cash.result + cash.ppl
  // Return % relative to current total portfolio value
  const returnPct = cash.total > 0 ? (totalReturn / cash.total) * 100 : 0

  const items = [
    { label: 'Total', value: cx(cash.total), highlight: true },
    { label: 'Return', value: cx(totalReturn), pnl: true },
    { label: 'Return %', pct: returnPct, pnl: true },
    { label: 'Invested', value: cx(cash.invested) },
    { label: 'Cash', value: cx(cash.free + cash.blocked) },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs text-muted mb-1">{item.label}</p>
          <p className={`font-semibold text-sm ${
            item.pnl
              ? (item.pct ?? item.value ?? 0) >= 0 ? 'text-success' : 'text-destructive'
              : item.highlight ? 'text-lg' : ''
          }`}>
            {item.pct !== undefined
              ? `${item.pct >= 0 ? '+' : ''}${item.pct.toFixed(2)}%`
              : fmt(item.value!, displayCurrency)}
          </p>
        </div>
      ))}
    </div>
  )
}
