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

// ── T212 snapshot → virtual assets ───────────────────────────────────────────
// Converts T212 account data into Asset-shaped objects so they appear alongside
// manual assets in the group list without any special-casing downstream.

function snapshotToVirtualAssets(snapshot: T212Snapshot): Asset[] {
  if (!snapshot.cash) return []
  const out: Asset[] = []

  // Invested portfolio (total account value minus free uninvested cash)
  const portfolioValue = snapshot.cash.total - snapshot.cash.free
  if (portfolioValue > 0.01) {
    out.push({
      id: '__t212_portfolio',
      name: 'Trading 212 ISA',
      type: 'stocks',
      currency: 'GBP',
      initialValue: snapshot.cash.invested,
      currentValue: portfolioValue,
      growthRate: 0, yearlyContribution: 0, purchaseDate: '',
      createdAt: new Date(), updatedAt: new Date(),
    })
  }

  // Free/uninvested cash sitting in the account
  if (snapshot.cash.free > 0.01) {
    out.push({
      id: '__t212_cash',
      name: 'T212 Free Cash',
      type: 'cash',
      currency: 'GBP',
      initialValue: 0, currentValue: snapshot.cash.free,
      growthRate: 0, yearlyContribution: 0, purchaseDate: '',
      createdAt: new Date(), updatedAt: new Date(),
    })
  }

  return out
}

const ASSET_TYPE_ICONS: Record<AssetType, string> = {
  stocks: '📈', real_estate: '🏠', crypto: '₿', bonds: '📋', cash: '💵',
  mutual_funds: '🏦', pension: '🏖️', insurance: '🛡️', gold: '🥇', vehicle: '🚗', other: '📦',
}
const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stocks: 'Stocks / ISA', real_estate: 'Real Estate', crypto: 'Crypto',
  bonds: 'Bonds / FD', cash: 'Cash', mutual_funds: 'Mutual Funds',
  pension: 'Pension / PF', insurance: 'Insurance', gold: 'Gold', vehicle: 'Vehicle', other: 'Other',
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {groupedList.map((g) => {
            const pct = netWorth > 0 ? (g.total / netWorth) * 100 : 0
            return (
              <button
                key={g.type}
                onClick={onNavigate}
                className="text-left border border-border bg-background px-4 py-3 hover:bg-muted/10 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base w-5 text-center shrink-0">{ASSET_TYPE_ICONS[g.type]}</span>
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
        meta: {},
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
    if (!member) return { assets: [], snapshot: { portfolio: [], cash: null, orders: [], meta: {}, syncedAt: null, error: null }, loading: false }
    return {
      assets: member.assets,
      snapshot: member.snapshot,
      loading: member.assetsLoading || member.snapshotLoading,
    }
  }

  const { assets, snapshot, loading: dataLoading } = getActiveData()

  const cx = (a: Asset) => rates ? convert(a.currentValue, a.currency, displayCurrency, rates) : a.currentValue

  // Merge broker virtual assets into the manual list for unified display
  const brokerAssets = snapshotToVirtualAssets(snapshot)
  const allAssets = [...assets, ...brokerAssets]
  const netWorth = allAssets.reduce((s, a) => s + cx(a), 0)

  const loading = groupsLoading || ratesLoading || dataLoading

  // Block until all data is loaded — prevents partial renders when members load at different times
  if (loading) {
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
                  {m.uid === uid ? 'Me' : (m.displayName || '…').split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {dataLoading && <InlineSpinner text="Loading data" />}

      {/* All assets (manual + broker connections) grouped by type */}
      <AssetGroupList
        assets={allAssets}
        rates={rates}
        displayCurrency={displayCurrency}
        netWorth={netWorth}
        onNavigate={() => navigate('/wealth/assets')}
      />
    </div>
  )
}
