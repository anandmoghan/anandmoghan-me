import type { Position } from '../services/trading212'

interface Props {
  positions: Position[]
  loading?: boolean
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(n)
}

function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

export function PortfolioTable({ positions, loading }: Props) {
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

  const sorted = [...positions].sort((a, b) => {
    const aVal = a.currentPrice * a.quantity
    const bVal = b.currentPrice * b.quantity
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
            const value = pos.currentPrice * pos.quantity
            const cost = pos.averagePrice * pos.quantity
            const pctReturn = cost > 0 ? ((value - cost) / cost) * 100 : 0
            return (
              <tr key={pos.ticker} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                <td className="py-2.5 px-3 font-medium">{pos.ticker}</td>
                <td className="py-2.5 px-3 text-right text-muted">{pos.quantity.toFixed(4)}</td>
                <td className="py-2.5 px-3 text-right">{fmt(pos.averagePrice)}</td>
                <td className="py-2.5 px-3 text-right">{fmt(pos.currentPrice)}</td>
                <td className="py-2.5 px-3 text-right font-medium">{fmt(value)}</td>
                <td className={`py-2.5 px-3 text-right font-medium ${pos.ppl >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {fmt(pos.ppl)}
                </td>
                <td className={`py-2.5 px-3 text-right hidden sm:table-cell ${pctReturn >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {fmtPct(pctReturn)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border">
            <td colSpan={4} className="py-2.5 px-3 font-semibold">Total</td>
            <td className="py-2.5 px-3 text-right font-semibold">
              {fmt(sorted.reduce((s, p) => s + p.currentPrice * p.quantity, 0))}
            </td>
            <td className={`py-2.5 px-3 text-right font-semibold ${
              sorted.reduce((s, p) => s + p.ppl, 0) >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {fmt(sorted.reduce((s, p) => s + p.ppl, 0))}
            </td>
            <td className="py-2.5 px-3 hidden sm:table-cell" />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
