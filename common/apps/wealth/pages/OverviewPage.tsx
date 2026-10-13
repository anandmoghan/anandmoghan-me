'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/common/firebase/AuthProvider'
import { useT212Snapshot } from '../hooks/useTrading212'
import { useAssets } from '../hooks/useAssets'
import { useExchangeRates } from '../hooks/useExchangeRates'
import { useGroups } from '../hooks/useGroups'
import { useGroupOverview } from '../hooks/useGroupOverview'
import { convert } from '../services/exchangeRates'
import { CurrencySelector } from '../components/CurrencySelector'
import { InlineSpinner } from '@/common/apps/components/Spinner'
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
  if (!snapshot.cash || snapshot.cash.total <= 0.01) return []
  // Roll the whole T212 account (invested + free cash) into a single stocks entry.
  return [{
    id: '__t212_portfolio',
    name: 'Trading 212 ISA',
    type: 'stocks',
    currency: 'GBP',
    initialValue: snapshot.cash.invested,
    currentValue: snapshot.cash.total,
    growthRate: 0, yearlyContribution: 0, purchaseDate: '',
    createdAt: new Date(), updatedAt: new Date(),
  }]
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

// ── Asset group card (with inline popover) ────────────────────────────────────

interface MemberBreakdown {
  uid: string
  name: string
  assets: Asset[]  // manual + broker virtual, already combined
}

interface ExpansionAsset {
  key: string
  name: string
  value: number
}

interface ExpansionSection {
  key: string
  title: string | null  // null when there's no grouping (single-user view)
  total: number
  items: ExpansionAsset[]
}

function AssetGroupCard({
  type,
  count,
  total,
  netWorth,
  displayCurrency,
  sections,
}: {
  type: AssetType
  count: number
  total: number
  netWorth: number
  displayCurrency: Currency
  sections: ExpansionSection[]
}) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setOpenUpward(spaceBelow < 200 && rect.top > spaceBelow)
    }
    setOpen((o) => !o)
  }

  const pct = netWorth > 0 ? (total / netWorth) * 100 : 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className={`w-full text-left border px-4 py-3 transition-colors flex items-center justify-between ${
          open
            ? 'border-accent bg-accent/10'
            : 'border-border bg-background hover:bg-muted/10'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-base w-5 text-center shrink-0">{ASSET_TYPE_ICONS[type]}</span>
          <div>
            <p className="text-sm font-medium">{ASSET_TYPE_LABELS[type]}</p>
            <p className="text-xs text-muted">
              {count} asset{count !== 1 ? 's' : ''} · {pct.toFixed(1)}% of net worth
            </p>
          </div>
        </div>
        <p className="text-sm font-semibold tabular-nums">{fmt(total, displayCurrency)}</p>
      </button>

      {open && (
        <div
          className={`absolute z-20 left-0 right-0 border border-border bg-background shadow-lg ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {sections.length === 0 || sections.every((s) => s.items.length === 0) ? (
            <p className="text-xs text-muted px-3 py-2">No holdings</p>
          ) : (
            <div>
              {sections.map((sec, si) => (
                <div key={sec.key} className={si > 0 ? 'border-t border-border' : ''}>
                  {sec.title && (
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                      <p className="text-xs font-semibold uppercase tracking-wide">{sec.title}</p>
                      <span className="text-xs font-semibold tabular-nums">
                        {fmt(sec.total, displayCurrency)}
                      </span>
                    </div>
                  )}
                  {sec.items.map((it) => (
                    <div
                      key={it.key}
                      className={`flex items-center justify-between gap-3 py-2 pr-3 ${
                        sec.title ? 'pl-6' : 'pl-3'
                      }`}
                    >
                      <p className="text-xs truncate min-w-0">{it.name}</p>
                      <p className="text-xs tabular-nums text-muted flex-shrink-0">
                        {fmt(it.value, displayCurrency)}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AssetGroupList({
  assets,
  rates,
  displayCurrency,
  netWorth,
  memberBreakdown,
  onNavigateEmpty,
}: {
  assets: Asset[]
  rates: ExchangeRates | null
  displayCurrency: Currency
  netWorth: number
  memberBreakdown: MemberBreakdown[] | null  // non-null → family combined view
  onNavigateEmpty: () => void
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

  const sectionsForType = (type: AssetType): ExpansionSection[] => {
    if (memberBreakdown) {
      return memberBreakdown
        .map((m) => {
          const items = m.assets
            .filter((a) => a.type === type)
            .map((a) => ({
              key: `${m.uid}:${a.id}`,
              name: a.name,
              value: cx(a),
            }))
            .sort((a, b) => b.value - a.value)
          const total = items.reduce((s, it) => s + it.value, 0)
          return { key: m.uid, title: m.name, total, items }
        })
        .filter((sec) => sec.total > 0.01)
        .sort((a, b) => b.total - a.total)
    }
    const items = assets
      .filter((a) => a.type === type)
      .map((a) => ({
        key: a.id,
        name: a.name,
        value: cx(a),
      }))
      .sort((a, b) => b.value - a.value)
    return [{ key: 'single', title: null, total: items.reduce((s, it) => s + it.value, 0), items }]
  }

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
          onClick={onNavigateEmpty}
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
          {groupedList.map((g) => (
            <AssetGroupCard
              key={g.type}
              type={g.type}
              count={g.count}
              total={g.total}
              netWorth={netWorth}
              displayCurrency={displayCurrency}
              sections={sectionsForType(g.type)}
            />
          ))}
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
  const router = useRouter()

  const { groups, selectedGroupId, setSelectedGroupId, selectedGroup, loading: groupsLoading } = useGroups()
  const { members, loading: groupLoading } = useGroupOverview(selectedGroup, uid || undefined)

  // Personal data (used when no group or viewing individual self)
  const { snapshot: selfSnapshot, loading: selfSnapshotLoading } = useT212Snapshot(uid || undefined)
  const { assets: selfAssets, loading: selfAssetsLoading } = useAssets(uid || undefined)

  const { rates, displayCurrency, setDisplayCurrency, loading: ratesLoading } = useExchangeRates()

  const [view, setView] = useState<ViewMode>('combined')

  const hasGroup = !!selectedGroup
  const isFamilyCombined = hasGroup && view === 'combined'

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

  // Per-member breakdown (family combined view only): each member's manual
  // assets plus their own broker virtuals so expansions show individual contributions.
  const memberBreakdown: MemberBreakdown[] | null = isFamilyCombined
    ? members.map((m) => ({
        uid: m.uid,
        name: m.uid === uid ? 'Me' : (m.displayName || '…').split(' ')[0],
        assets: [...m.assets, ...snapshotToVirtualAssets(m.snapshot)],
      }))
    : null

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
        memberBreakdown={memberBreakdown}
        onNavigateEmpty={() => router.push('/apps/wealth/assets')}
      />
    </div>
  )
}
