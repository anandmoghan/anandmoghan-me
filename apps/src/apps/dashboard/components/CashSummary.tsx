import type { AccountCash } from '../services/trading212'

interface Props {
  cash: AccountCash | null
  loading?: boolean
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(n)
}

export function CashSummary({ cash, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
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

  const items = [
    { label: 'Total', value: cash.total, highlight: true },
    { label: 'Free Cash', value: cash.free },
    { label: 'Invested', value: cash.invested },
    { label: 'P&L', value: cash.ppl, pnl: true },
    { label: 'Result', value: cash.result, pnl: true },
    { label: 'Blocked', value: cash.blocked },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs text-muted mb-1">{item.label}</p>
          <p className={`font-semibold text-sm ${
            item.pnl
              ? item.value >= 0 ? 'text-success' : 'text-destructive'
              : item.highlight ? 'text-lg' : ''
          }`}>
            {fmt(item.value)}
          </p>
        </div>
      ))}
    </div>
  )
}
