import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useT212Snapshot } from '../hooks/useTrading212'
import { useAssets } from '../hooks/useAssets'
import { useExchangeRates } from '../hooks/useExchangeRates'
import { useGroups } from '../hooks/useGroups'
import { useGroupOverview } from '../hooks/useGroupOverview'
import { convert } from '../services/exchangeRates'
import { CurrencySelector } from '../components/CurrencySelector'
import { InlineSpinner } from '../../../components/Spinner'
import type { Asset, AssetType } from '../types'
import type { T212Snapshot } from '../hooks/useTrading212'
import type { ExchangeRates } from '../services/exchangeRates'
import type { Currency } from '../hooks/useExchangeRates'

// ── Formatters ────────────────────────────────────────────────────────────────

const CURRENCY_FMT: Record<string, Intl.NumberFormat> = {
  GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
  INR: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }),
}

function fmt(n: number, currency: string) {
  return (CURRENCY_FMT[currency] ?? CURRENCY_FMT.GBP).format(n)
}

function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

function timeAgo(ts: number | null): string {
  if (!ts) return 'Never'
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const ASSET_TYPE_ICONS: Record<AssetType, string> = {
  stocks: '📈', real_estate: '🏠', crypto: '₿', bonds: '📋', cash: '💵', other: '📦',
}
const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stocks: 'Stocks', real_estate: 'Real Estate', crypto: 'Crypto',
  bonds: 'Bonds', cash: 'Cash', other: 'Other',
}

// ── T212 summary ──────────────────────────────────────────────────────────────

interface T212CardProps {
  snapshot: T212Snapshot
  rates: ExchangeRates | null
  displayCurrency: Currency
  onClick: () => void
}

function T212Card({ snapshot, rates, displayCurrency, onClick }: T212CardProps) {
  const cx = (n: number) => rates ? convert(n, 'GBP', displayCurrency, rates) : n
  const total = snapshot.cash ? cx(snapshot.cash.total) : null
  const invested = snapshot.cash ? cx(snapshot.cash.invested) : null
  const ret = snapshot.cash ? snapshot.cash.ppl + snapshot.cash.result : 0
  const retPct = snapshot.cash && snapshot.cash.invested > 0
    ? (ret / snapshot.cash.invested) * 100 : null

  if (!snapshot.cash) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left border border-border bg-background hover:bg-muted/10 transition-colors p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <div>
            <p className="font-semibold text-sm">Trading 212 ISA</p>
            <p className="text-xs text-muted">No data yet — tap to configure</p>
          </div>
        </div>
        <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    )
  }

  return (
    <button onClick={onClick} className="w-full text-left border border-border bg-background hover:bg-muted/10 transition-colors p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <div>
            <p className="font-semibold text-sm">Trading 212 ISA</p>
            <p className="text-xs text-muted">Synced {timeAgo(snapshot.syncedAt)}</p>
          </div>
        </div>
        <svg className="w-4 h-4 text-muted mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-px bg-border border border-border">
        <div className="bg-background px-3 py-2">
          <p className="text-[10px] text-muted uppercase tracking-wide font-medium">Total</p>
          <p className="text-base font-semibold tabular-nums mt-0.5">{total !== null ? fmt(total, displayCurrency) : '—'}</p>
        </div>
        <div className="bg-background px-3 py-2">
          <p className="text-[10px] text-muted uppercase tracking-wide font-medium">Invested</p>
          <p className="text-base font-semibold tabular-nums mt-0.5">{invested !== null ? fmt(invested, displayCurrency) : '—'}</p>
        </div>
        <div className="bg-background px-3 py-2">
          <p className="text-[10px] text-muted uppercase tracking-wide font-medium">Return</p>
          <p className={`text-base font-semibold tabular-nums mt-0.5 ${ret >= 0 ? 'text-success' : 'text-destructive'}`}>
            {retPct !== null ? fmtPct(retPct) : '—'}
          </p>
          {retPct !== null && (
            <p className={`text-[10px] tabular-nums ${ret >= 0 ? 'text-success' : 'text-destructive'}`}>
              {ret >= 0 ? '+' : ''}{fmt(cx(ret), displayCurrency)}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Asset group list ──────────────────────────────────────────────────────────

function AssetGroupList({
  assets,
  rates,
  displayCurrency,
  netWorth,
  onNavigate,
}: {
  assets: Asset[]
  rates: ExchangeRates | null
  displayCurrency: Currency
  netWorth: number
  onNavigate: () => void
}) {
  const cx = (a: Asset) => rates ? convert(a.currentValue, a.currency, displayCurrency, rates) : a.currentValue
  const manualTotal = assets.reduce((s, a) => s + cx(a), 0)

  type GroupedAsset = { type: AssetType; total: number; count: number }
  const grouped = assets.reduce<Record<string, GroupedAsset>>((acc, a) => {
    const val = cx(a)
    if (!acc[a.type]) acc[a.type] = { type: a.type, total: 0, count: 0 }
    acc[a.type].total += val
    acc[a.type].count++
    return acc
  }, {})
  const groupedList = Object.values(grouped).sort((a, b) => b.total - a.total)

  const headerRight = manualTotal > 0
    ? <span className="text-sm font-semibold tabular-nums">{fmt(manualTotal, displayCurrency)}</span>
    : null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Assets</h2>
        {headerRight}
      </div>

      {assets.length === 0 ? (
        <button
          onClick={onNavigate}
          className="w-full text-left border border-border bg-background hover:bg-muted/10 transition-colors p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🏦</span>
            <div>
              <p className="font-semibold text-sm">Add your first asset</p>
              <p className="text-xs text-muted">Real estate, crypto, savings, and more</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <div className="border border-border bg-background divide-y divide-border">
          {groupedList.map((g) => {
            const pct = netWorth > 0 ? (g.total / netWorth) * 100 : 0
            return (
              <button
                key={g.type}
                onClick={onNavigate}
                className="w-full text-left px-4 py-3 hover:bg-muted/10 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{ASSET_TYPE_ICONS[g.type]}</span>
                  <div>
                    <p className="text-sm font-medium">{ASSET_TYPE_LABELS[g.type]}</p>
                    <p className="text-xs text-muted">
                      {g.count} asset{g.count !== 1 ? 's' : ''} · {pct.toFixed(1)}% of net worth
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold tabular-nums">{fmt(g.total, displayCurrency)}</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Overview Page ─────────────────────────────────────────────────────────────

type ViewMode = 'combined' | string  // 'combined' or a member uid

export function OverviewPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const navigate = useNavigate()

  const { groups, selectedGroupId, setSelectedGroupId, selectedGroup, loading: groupsLoading } = useGroups()
  const { members, loading: groupLoading } = useGroupOverview(selectedGroup, uid || undefined)

  // Personal data (used when no group or viewing individual self)
  const { snapshot: selfSnapshot, loading: selfSnapshotLoading } = useT212Snapshot(uid || undefined)
  const { assets: selfAssets, loading: selfAssetsLoading } = useAssets(uid || undefined)

  const { rates, displayCurrency, setDisplayCurrency, loading: ratesLoading } = useExchangeRates()

  const [view, setView] = useState<ViewMode>('combined')

  const hasGroup = !!selectedGroup

  // Active data for current view
  const getActiveData = (): { assets: Asset[]; snapshot: T212Snapshot; loading: boolean } => {
    if (!hasGroup) {
      return { assets: selfAssets, snapshot: selfSnapshot, loading: selfSnapshotLoading || selfAssetsLoading }
    }
    if (view === 'combined') {
      const allAssets = members.flatMap((m) => m.assets)
      const combinedSnapshot: T212Snapshot = {
        portfolio: [],
        orders: [],
        syncedAt: null,
        error: null,
        cash: members.reduce<import('../services/trading212').AccountCash | null>((acc, m) => {
          if (!m.snapshot.cash) return acc
          if (!acc) return { ...m.snapshot.cash }
          return {
            blocked: acc.blocked + m.snapshot.cash.blocked,
            free: acc.free + m.snapshot.cash.free,
            invested: acc.invested + m.snapshot.cash.invested,
            pieCash: acc.pieCash + m.snapshot.cash.pieCash,
            ppl: acc.ppl + m.snapshot.cash.ppl,
            result: acc.result + m.snapshot.cash.result,
            total: acc.total + m.snapshot.cash.total,
          }
        }, null),
      }
      const loading = groupLoading || members.some((m) => m.assetsLoading || m.snapshotLoading)
      return { assets: allAssets, snapshot: combinedSnapshot, loading }
    }
    // Individual member view
    const member = members.find((m) => m.uid === view)
    if (!member) return { assets: [], snapshot: { portfolio: [], cash: null, orders: [], syncedAt: null, error: null }, loading: false }
    return {
      assets: member.assets,
      snapshot: member.snapshot,
      loading: member.assetsLoading || member.snapshotLoading,
    }
  }

  const { assets, snapshot, loading: dataLoading } = getActiveData()

  const cx = (a: Asset) => rates ? convert(a.currentValue, a.currency, displayCurrency, rates) : a.currentValue
  const manualTotal = assets.reduce((s, a) => s + cx(a), 0)
  const t212Total = snapshot.cash
    ? (rates ? convert(snapshot.cash.total, 'GBP', displayCurrency, rates) : snapshot.cash.total)
    : 0
  const netWorth = manualTotal + t212Total

  const loading = groupsLoading || ratesLoading || dataLoading

  if (loading && !members.length && !selfAssets.length) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <InlineSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 space-y-6">

      {/* Top row: net worth + currency */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide font-medium">Net Worth</p>
          <p className="text-3xl font-bold tabular-nums leading-tight mt-0.5">
            {fmt(netWorth, displayCurrency)}
          </p>
        </div>
        <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} />
      </div>

      {/* Group selector + view toggle */}
      {groups.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Group / Personal selector */}
          <select
            value={selectedGroupId ?? ''}
            onChange={(e) => {
              setSelectedGroupId(e.target.value || null)
              setView('combined')
            }}
            className="text-xs border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Personal</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          {/* Member toggle — only when a group is selected */}
          {hasGroup && members.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setView('combined')}
                className={`text-xs px-3 py-1.5 border transition-colors ${
                  view === 'combined'
                    ? 'border-accent bg-accent/10 text-foreground font-medium'
                    : 'border-border hover:bg-muted/20 text-muted'
                }`}
              >
                Family
              </button>
              {members.map((m) => (
                <button
                  key={m.uid}
                  onClick={() => setView(m.uid)}
                  className={`text-xs px-3 py-1.5 border transition-colors ${
                    view === m.uid
                      ? 'border-accent bg-accent/10 text-foreground font-medium'
                      : 'border-border hover:bg-muted/20 text-muted'
                  }`}
                >
                  {m.uid === uid ? 'Me' : m.displayName.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {dataLoading && <InlineSpinner text="Loading data" />}

      {/* T212 ISA card */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Brokerage</h2>
        <T212Card
          snapshot={snapshot}
          rates={rates}
          displayCurrency={displayCurrency}
          onClick={() => navigate('/wealth/trading212')}
        />
      </div>

      {/* Manual assets */}
      <AssetGroupList
        assets={assets}
        rates={rates}
        displayCurrency={displayCurrency}
        netWorth={netWorth}
        onNavigate={() => navigate('/wealth/assets')}
      />
    </div>
  )
}
