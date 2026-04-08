import type { Order } from '../services/trading212'

interface Props {
  orders: Order[]
  loading?: boolean
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(n)
}

export function TransactionList({ orders, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-muted/10 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return <p className="text-muted text-sm text-center py-8">No recent transactions.</p>
  }

  return (
    <div className="space-y-1">
      {orders.slice(0, 20).map((order) => {
        const isBuy = order.type === 'LIMIT' || order.fillCost > 0
        const date = new Date(order.dateModified)
        return (
          <div key={order.id} className="flex items-center justify-between py-2.5 px-3 rounded-md hover:bg-muted/10 transition-colors border border-transparent hover:border-border">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                order.type === 'SELL_LIMIT' || order.type === 'SELL'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-success/10 text-success'
              }`}>
                {order.type.includes('SELL') ? 'SELL' : 'BUY'}
              </span>
              <div>
                <p className="font-medium text-sm">{order.ticker}</p>
                <p className="text-xs text-muted">{date.toLocaleDateString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{fmt(Math.abs(order.fillCost))}</p>
              <p className="text-xs text-muted">{order.filledQuantity.toFixed(4)} @ {fmt(order.fillPrice)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
