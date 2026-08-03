import { useMemo } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useAccounts } from '../hooks/useAccounts'
import { useVendors } from '../hooks/useVendors'
import { useTransactions } from '../hooks/useTransactions'
import { useExchangeRates } from '../../wealth/hooks/useExchangeRates'
import { convert } from '../../wealth/services/exchangeRates'
import { CurrencySelector } from '../../wealth/components/CurrencySelector'
import { InlineSpinner } from '../../../components/Spinner'
import { fmt, fmtWhole } from '../services/format'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { Transaction, Account, Vendor } from '../types'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function ymKey(date: string): string {
  return date.slice(0, 7)
}

function ymLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${String(y).slice(-2)}`
}

function todayYmd(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftYmd(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

function aggregate<T>(items: T[], keyFn: (t: T) => string, valueFn: (t: T) => number): Map<string, number> {
  const m = new Map<string, number>()
  for (const it of items) {
    const k = keyFn(it)
    m.set(k, (m.get(k) ?? 0) + valueFn(it))
  }
  return m
}

export function OverviewPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const { transactions, loading: txLoading } = useTransactions(uid || undefined)
  const { accounts, loading: accLoading } = useAccounts(uid || undefined)
  const { vendors } = useVendors(uid || undefined)
  const { rates, displayCurrency, setDisplayCurrency, loading: ratesLoading } = useExchangeRates()

  const cx = (amt: number, cur: string) => (rates ? convert(amt, cur, displayCurrency, rates) : amt)

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a] as [string, Account])), [accounts])
  const vendorMap = useMemo(() => new Map(vendors.map((v) => [v.id, v] as [string, Vendor])), [vendors])

  // Convert each tx to display currency and exclude transfers from spend.
  const spendTxs = useMemo(() => {
    return transactions
      .filter((t) => !t.transferGroupId && t.amount < 0)
      .map((t) => ({
        ...t,
        displayAmount: Math.abs(cx(t.amount, t.currency)),
      }))
  }, [transactions, rates, displayCurrency])

  const today = todayYmd()
  const thisMonthKey = today.slice(0, 7)
  const lastMonthDate = shiftYmd(today.slice(0, 8) + '01', -1)
  const lastMonthKey = lastMonthDate.slice(0, 7)

  // KPIs
  const monthlyTotals = useMemo(() => aggregate(spendTxs, (t) => ymKey(t.date), (t) => t.displayAmount), [spendTxs])
  const thisMonth = monthlyTotals.get(thisMonthKey) ?? 0
  const lastMonth = monthlyTotals.get(lastMonthKey) ?? 0
  const monthDelta = thisMonth - lastMonth

  // Per-account spend (this month)
  const perAccountThisMonth = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of spendTxs) {
      if (ymKey(t.date) !== thisMonthKey) continue
      m.set(t.accountId, (m.get(t.accountId) ?? 0) + t.displayAmount)
    }
    return m
  }, [spendTxs, thisMonthKey])

  // Monthly chart (last 12 months including this one)
  const monthlyChart = useMemo(() => {
    const out: { ym: string; label: string; spend: number }[] = []
    const [y, m] = thisMonthKey.split('-').map(Number)
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(y, m - 1 - i, 1)
      const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      out.push({ ym, label: ymLabel(ym), spend: monthlyTotals.get(ym) ?? 0 })
    }
    return out
  }, [monthlyTotals, thisMonthKey])

  // Daily chart (past 30 days)
  const dailyChart = useMemo(() => {
    const out: { date: string; label: string; spend: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = shiftYmd(today, -i)
      const label = `${d.slice(8, 10)}/${d.slice(5, 7)}`
      out.push({ date: d, label, spend: 0 })
    }
    const idx = new Map(out.map((o, i) => [o.date, i]))
    for (const t of spendTxs) {
      const i = idx.get(t.date)
      if (i !== undefined) out[i].spend += t.displayAmount
    }
    return out
  }, [spendTxs, today])

  // Yearly aggregation (only show if >1 year of data)
  const yearlyTotals = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of spendTxs) {
      const y = t.date.slice(0, 4)
      m.set(y, (m.get(y) ?? 0) + t.displayAmount)
    }
    return m
  }, [spendTxs])
  const showYearly = yearlyTotals.size > 1
  const yearlyChart = useMemo(() => {
    const years = [...yearlyTotals.keys()].sort()
    return years.map((y) => ({ y, spend: yearlyTotals.get(y) ?? 0 }))
  }, [yearlyTotals])

  // Top vendors (this month)
  const topVendors = useMemo(() => {
    const m = new Map<string | null, number>()
    for (const t of spendTxs) {
      if (ymKey(t.date) !== thisMonthKey) continue
      m.set(t.vendorId, (m.get(t.vendorId) ?? 0) + t.displayAmount)
    }
    return [...m.entries()]
      .map(([id, total]) => ({ id, total, vendor: id ? vendorMap.get(id) : null }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [spendTxs, thisMonthKey, vendorMap])

  const loading = txLoading || accLoading || ratesLoading
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <InlineSpinner />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📊</p>
          <h2 className="text-lg font-semibold mb-2">No transactions yet</h2>
          <p className="text-muted text-sm">Upload a statement to start tracking your expenses.</p>
        </div>
      </div>
    )
  }

  const cssAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#58a6ff'
  const cssMuted = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#8b949e'

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 space-y-6">
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide font-medium">This Month</p>
          <p className="text-3xl font-bold tabular-nums leading-tight mt-0.5">{fmt(thisMonth, displayCurrency)}</p>
          <p className={`text-xs mt-1 tabular-nums ${monthDelta > 0 ? 'text-destructive' : 'text-success'}`}>
            {monthDelta >= 0 ? '+' : '−'}{fmt(Math.abs(monthDelta), displayCurrency)} vs last month
          </p>
        </div>
        <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} />
      </div>

      {/* Per-account stats this month */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
          {accounts.map((a) => (
            <div key={a.id} className="bg-background px-4 py-3">
              <p className="text-[10px] text-muted uppercase tracking-wide font-medium truncate">{a.nickname}</p>
              <p className="text-base font-semibold tabular-nums mt-0.5">
                {fmt(perAccountThisMonth.get(a.id) ?? 0, displayCurrency)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Monthly chart */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">Monthly Spend</h2>
        <div className="border border-border bg-background p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={cssMuted} opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: cssMuted }} axisLine={{ stroke: cssMuted, opacity: 0.3 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: cssMuted }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtWhole(v as number, displayCurrency)} width={70} />
              <Tooltip
                contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', fontSize: 12 }}
                labelStyle={{ color: 'var(--foreground)' }}
                formatter={(v) => fmt(v as number, displayCurrency)}
              />
              <Bar dataKey="spend" fill={cssAccent} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily chart */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">Last 30 Days</h2>
        <div className="border border-border bg-background p-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={cssMuted} opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: cssMuted }} axisLine={{ stroke: cssMuted, opacity: 0.3 }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: cssMuted }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtWhole(v as number, displayCurrency)} width={70} />
              <Tooltip
                contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', fontSize: 12 }}
                formatter={(v) => fmt(v as number, displayCurrency)}
              />
              <Line type="monotone" dataKey="spend" stroke={cssAccent} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Yearly chart (when >1 year) */}
      {showYearly && (
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">Yearly</h2>
          <div className="border border-border bg-background p-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={cssMuted} opacity={0.2} />
                <XAxis dataKey="y" tick={{ fontSize: 11, fill: cssMuted }} axisLine={{ stroke: cssMuted, opacity: 0.3 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: cssMuted }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtWhole(v as number, displayCurrency)} width={70} />
                <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', fontSize: 12 }} formatter={(v) => fmt(v as number, displayCurrency)} />
                <Bar dataKey="spend" fill={cssAccent} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top vendors this month */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">Top Spend This Month</h2>
        {topVendors.length === 0 ? (
          <p className="text-sm text-muted py-4">No transactions in {ymLabel(thisMonthKey)} yet.</p>
        ) : (
          <div className="border border-border bg-background overflow-hidden">
            {topVendors.map((row, i) => {
              const v = row.vendor
              const name = v?.name ?? 'Ungrouped'
              const color = v?.color ?? '#6b7280'
              const pct = thisMonth > 0 ? (row.total / thisMonth) * 100 : 0
              return (
                <div key={row.id ?? 'none'} className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                    <p className="text-sm font-medium truncate">{name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{fmt(row.total, displayCurrency)}</p>
                    <p className="text-[10px] text-muted">{pct.toFixed(0)}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
