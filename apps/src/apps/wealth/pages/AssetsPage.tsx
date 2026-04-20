import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useAssets } from '../hooks/useAssets'
import { useGroups } from '../hooks/useGroups'
import { useGroupOverview } from '../hooks/useGroupOverview'
import { useExchangeRates } from '../hooks/useExchangeRates'
import { useT212Snapshot, useInstruments } from '../hooks/useTrading212'
import { convert } from '../services/exchangeRates'
import { inferTickerCurrency, cleanTicker } from '../services/trading212'
import { CurrencySelector } from '../components/CurrencySelector'
import { InlineSpinner } from '../../../components/Spinner'
import type { Asset, AssetInput, AssetType, AssetCurrency } from '../types'
import type { Position } from '../services/trading212'

// ── Constants ─────────────────────────────────────────────────────────────────

const ASSET_TYPES: Array<{ value: AssetType; label: string; icon: string }> = [
  { value: 'stocks', label: 'Stocks / ISA / ETF', icon: '📈' },
  { value: 'mutual_funds', label: 'Mutual Funds', icon: '🏦' },
  { value: 'real_estate', label: 'Real Estate', icon: '🏠' },
  { value: 'crypto', label: 'Crypto', icon: '₿' },
  { value: 'bonds', label: 'Bonds / FD', icon: '📋' },
  { value: 'pension', label: 'Pension / PF', icon: '🏖️' },
  { value: 'insurance', label: 'Insurance / ULIP', icon: '🛡️' },
  { value: 'gold', label: 'Gold', icon: '🥇' },
  { value: 'vehicle', label: 'Vehicle', icon: '🚗' },
  { value: 'cash', label: 'Cash / Savings', icon: '💵' },
  { value: 'other', label: 'Other', icon: '📦' },
]

const CURRENCIES: AssetCurrency[] = ['GBP', 'USD', 'INR']

const DISPLAY_FMT: Record<string, Intl.NumberFormat> = {
  GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
  INR: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }),
}
const PRICE_FMT: Record<string, Intl.NumberFormat> = {
  GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  INR: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
}
function fmtPrice(n: number, currency: string) {
  return (PRICE_FMT[currency] ?? PRICE_FMT.GBP).format(n)
}

function fmt(n: number, currency: string) {
  return (DISPLAY_FMT[currency] ?? DISPLAY_FMT.GBP).format(n)
}

function typeIcon(t: AssetType) {
  return ASSET_TYPES.find((a) => a.value === t)?.icon ?? '📦'
}

function typeLabel(t: AssetType) {
  return ASSET_TYPES.find((a) => a.value === t)?.label ?? t
}

// ── Asset Form Modal ──────────────────────────────────────────────────────────

interface AssetFormProps {
  initial?: Asset
  onSave: (data: AssetInput) => Promise<void>
  onCancel: () => void
}

// Types where investment-style fields (purchase date, growth rate, initial value) don't apply
const SIMPLE_TYPES = new Set<AssetType>(['cash', 'vehicle'])

function AssetForm({ initial, onSave, onCancel }: AssetFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<AssetType>(initial?.type ?? 'stocks')
  const [currency, setCurrency] = useState<AssetCurrency>(initial?.currency ?? 'GBP')
  const [initialValue, setInitialValue] = useState(initial?.initialValue?.toString() ?? '')
  const [currentValue, setCurrentValue] = useState(initial?.currentValue?.toString() ?? '')
  const [growthRate, setGrowthRate] = useState(initial?.growthRate?.toString() ?? '7')
  const [yearlyContribution, setYearlyContribution] = useState(initial?.yearlyContribution?.toString() ?? '0')
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!initial
  const isSimple = SIMPLE_TYPES.has(type)

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required.'); return }
    if (!currentValue || isNaN(parseFloat(currentValue))) { setError('Balance is required.'); return }
    setSaving(true)
    setError('')
    try {
      const cv = parseFloat(currentValue)
      await onSave({
        name: name.trim(),
        type,
        currency,
        initialValue: isSimple ? cv : (parseFloat(initialValue) || 0),
        currentValue: cv,
        growthRate: isSimple ? 0 : (parseFloat(growthRate) || 0),
        yearlyContribution: isSimple ? 0 : (parseFloat(yearlyContribution) || 0),
        purchaseDate: isSimple ? new Date().toISOString().slice(0, 10) : purchaseDate,
      })
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
      <div className="bg-background border border-border w-full sm:max-w-md max-h-[calc(90vh-4rem)] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">{isEdit ? 'Edit Asset' : 'New Asset'}</h2>
          <button onClick={onCancel} className="text-muted hover:text-foreground p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'cash' ? 'e.g. Barclays Current Account' : 'e.g. Flat in London'}
              className="w-full text-sm border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-muted font-medium mb-2 block">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {ASSET_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs border transition-colors ${
                    type === t.value
                      ? 'border-accent bg-accent/10 text-foreground font-medium'
                      : 'border-border hover:bg-muted/20'
                  }`}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Currency</label>
            <div className="flex gap-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`px-4 py-1.5 text-xs border transition-colors ${
                    currency === c
                      ? 'border-accent bg-accent/10 font-medium'
                      : 'border-border hover:bg-muted/20'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Cash/Vehicle: just current balance */}
          {isSimple ? (
            <div>
              <label className="text-xs text-muted font-medium mb-1 block">
                {type === 'cash' ? `Current Balance (${currency})` : `Current Value (${currency})`}
              </label>
              <input
                type="number"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full text-sm border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          ) : (
            <>
              {/* Values */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted font-medium mb-1 block">Initial Value ({currency})</label>
                  <input
                    type="number"
                    value={initialValue}
                    onChange={(e) => setInitialValue(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full text-sm border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted font-medium mb-1 block">Current Value ({currency})</label>
                  <input
                    type="number"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full text-sm border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Growth rate and contribution */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted font-medium mb-1 block">Growth Rate (% / yr)</label>
                  <input
                    type="number"
                    value={growthRate}
                    onChange={(e) => setGrowthRate(e.target.value)}
                    placeholder="7"
                    step="0.5"
                    className="w-full text-sm border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted font-medium mb-1 block">Yearly Contribution ({currency})</label>
                  <input
                    type="number"
                    value={yearlyContribution}
                    onChange={(e) => setYearlyContribution(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full text-sm border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Purchase date */}
              <div>
                <label className="text-xs text-muted font-medium mb-1 block">Purchase Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full text-sm border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="p-4 border-t border-border flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm border border-border hover:bg-muted/20 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim() || !currentValue}
            className="flex-1 py-2.5 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Asset Detail Modal ────────────────────────────────────────────────────────

interface AssetDetailProps {
  asset: Asset
  displayCurrency: string
  rates: import('../services/exchangeRates').ExchangeRates | null
  onEdit: () => void
  onDelete: () => Promise<void>
  onClose: () => void
}

function AssetDetailModal({ asset, displayCurrency, rates, onEdit, onDelete, onClose }: AssetDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const cx = (v: number) => rates ? convert(v, asset.currency, displayCurrency, rates) : v
  const pnl = asset.currentValue - asset.initialValue
  const pnlPct = asset.initialValue > 0 ? (pnl / asset.initialValue) * 100 : 0

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch (e) {
      setError(String(e))
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
      <div className="bg-background border border-border w-full sm:max-w-md">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{typeIcon(asset.type)}</span>
            <h2 className="font-semibold">{asset.name}</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-px bg-border border border-border">
            <div className="bg-background px-4 py-3">
              <p className="text-[10px] text-muted uppercase tracking-wide font-medium">Current Value</p>
              <p className="text-lg font-semibold tabular-nums mt-0.5">
                {fmt(cx(asset.currentValue), displayCurrency)}
              </p>
            </div>
            <div className="bg-background px-4 py-3">
              <p className="text-[10px] text-muted uppercase tracking-wide font-medium">Cost Basis</p>
              <p className="text-lg font-semibold tabular-nums mt-0.5">
                {asset.initialValue > 0 ? fmt(cx(asset.initialValue), displayCurrency) : '—'}
              </p>
            </div>
            <div className="bg-background px-4 py-3">
              <p className="text-[10px] text-muted uppercase tracking-wide font-medium">P&L</p>
              <p className={`text-base font-semibold tabular-nums mt-0.5 ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                {pnl >= 0 ? '+' : ''}{fmt(cx(pnl), displayCurrency)}
              </p>
            </div>
            <div className="bg-background px-4 py-3">
              <p className="text-[10px] text-muted uppercase tracking-wide font-medium">Return</p>
              <p className={`text-base font-semibold tabular-nums mt-0.5 ${pnlPct >= 0 ? 'text-success' : 'text-destructive'}`}>
                {asset.initialValue > 0 ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%` : '—'}
              </p>
            </div>
          </div>

          {/* Meta */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Type</span>
              <span className="font-medium">{typeLabel(asset.type)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Currency</span>
              <span className="font-medium">{asset.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Growth rate</span>
              <span className="font-medium">{asset.growthRate}% / yr</span>
            </div>
            {asset.yearlyContribution > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Yearly contribution</span>
                <span className="font-medium">{fmt(asset.yearlyContribution, asset.currency)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted">Purchase date</span>
              <span className="font-medium">{asset.purchaseDate}</span>
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="p-4 border-t border-border space-y-2">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-border hover:bg-muted/20 transition-colors"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="flex-1 py-2.5 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium"
            >
              Edit
            </button>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`w-full py-2.5 text-sm transition-colors disabled:opacity-50 ${
              confirmDelete
                ? 'bg-destructive text-white font-medium'
                : 'text-destructive border border-destructive/30 hover:bg-destructive/10'
            }`}
          >
            {deleting ? 'Deleting…' : confirmDelete ? 'Confirm delete?' : 'Delete asset'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Assets Page ───────────────────────────────────────────────────────────────

// ── T212 position helpers ─────────────────────────────────────────────────────

/** Returns position current value and its actual currency (GBX normalised to GBP). */
function positionNative(pos: Position, currencyMap: Map<string, string>): { value: number; currency: string } {
  const raw = currencyMap.get(pos.ticker) ?? inferTickerCurrency(pos.ticker)
  const isGbx = raw === 'GBX'
  const price = isGbx ? pos.currentPrice / 100 : pos.currentPrice
  return { value: price * pos.quantity, currency: isGbx ? 'GBP' : raw }
}

/** Returns position cost basis and its actual currency. */
function positionCostNative(pos: Position, currencyMap: Map<string, string>): { value: number; currency: string } {
  const raw = currencyMap.get(pos.ticker) ?? inferTickerCurrency(pos.ticker)
  const isGbx = raw === 'GBX'
  const price = isGbx ? pos.averagePrice / 100 : pos.averagePrice
  return { value: price * pos.quantity, currency: isGbx ? 'GBP' : raw }
}

export function AssetsPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  const { assets, loading, addAsset, updateAsset, deleteAsset } = useAssets(uid || undefined)
  const { rates, displayCurrency, setDisplayCurrency, loading: ratesLoading } = useExchangeRates()
  const { groups, selectedGroupId, setSelectedGroupId } = useGroups()
  const selectedGroup = groups.find(g => g.id === selectedGroupId) ?? null
  const { members, loading: groupLoading } = useGroupOverview(selectedGroup, uid)
  const { snapshot: t212Snapshot, loading: t212Loading } = useT212Snapshot(uid || undefined)
  const { currencyMap, nameMap } = useInstruments(t212Snapshot)

  const [view, setView] = useState<'mine' | 'family'>('mine')
  const [showForm, setShowForm] = useState(false)
  const [editAsset, setEditAsset] = useState<Asset | null>(null)
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null)

  const fmt2 = (n: number) => (DISPLAY_FMT[displayCurrency] ?? DISPLAY_FMT.GBP).format(n)
  const cx = (a: Asset) => rates ? convert(a.currentValue, a.currency, displayCurrency, rates) : a.currentValue
  const cxGbp = (n: number) => rates ? convert(n, 'GBP', displayCurrency, rates) : n

  const hasGroup = groups.length > 0

  // T212 total for "mine" view (family view totals are computed per-member below)
  const myT212Total = view === 'mine' && t212Snapshot.cash
    ? cxGbp(t212Snapshot.cash.total)
    : 0

  // In family view: group assets by member; in mine view: just own assets
  const memberSections = view === 'family' && hasGroup
    ? members.map(m => {
        const memberT212Total = m.snapshot.cash ? cxGbp(m.snapshot.cash.total) : 0
        return {
          uid: m.uid,
          name: m.uid === uid ? 'Me' : (m.displayName || '…'),
          isMine: m.uid === uid,
          assets: m.assets,
          snapshot: m.snapshot,
          total: m.assets.reduce((s, a) => s + cx(a), 0) + memberT212Total,
        }
      })
    : [{ uid, name: 'Me', isMine: true, assets, snapshot: t212Snapshot, total: assets.reduce((s, a) => s + cx(a), 0) + myT212Total }]

  const total = memberSections.reduce((s, m) => s + m.total, 0)
  const isLoading = ratesLoading || loading || (view === 'family' && groupLoading)

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <InlineSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Assets</h2>
          {total > 0 && (
            <p className="text-2xl font-bold tabular-nums mt-0.5">{fmt2(total)}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border hover:bg-muted/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>
      </div>

      {/* View toggle — only shown when in a group */}
      {hasGroup && (
        <div className="flex items-center gap-0">
          {/* Group selector if multiple groups */}
          {groups.length > 1 && (
            <select
              value={selectedGroupId ?? ''}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="text-xs border border-border bg-background px-2 py-1.5 mr-2 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
          <div className="flex border border-border overflow-hidden text-xs">
            <button
              onClick={() => setView('mine')}
              className={`px-4 py-1.5 transition-colors ${view === 'mine' ? 'bg-foreground text-background font-medium' : 'hover:bg-muted/20'}`}
            >
              Mine
            </button>
            <button
              onClick={() => setView('family')}
              className={`px-4 py-1.5 border-l border-border transition-colors ${view === 'family' ? 'bg-foreground text-background font-medium' : 'hover:bg-muted/20'}`}
            >
              {selectedGroup?.name ?? 'Family'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {memberSections[0]?.assets.length === 0 && view === 'mine' && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏦</p>
          <h2 className="text-lg font-semibold mb-2">Track your assets</h2>
          <p className="text-muted text-sm mb-6">
            Add real estate, crypto, savings, or any asset you want to track.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-block px-5 py-2.5 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            Add your first asset
          </button>
        </div>
      )}

      {/* Asset list — grouped by member in family view */}
      <div className="space-y-6">
        {memberSections.map(section => {
          const snap = section.snapshot
          const hasT212 = snap.portfolio.length > 0 || (snap.cash?.free ?? 0) > 0
          const sectionT212Total = snap.cash ? cxGbp(snap.cash.total) : 0

          return (
            <div key={section.uid} className="space-y-3">
              {/* Section header — only in family view */}
              {view === 'family' && (
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wide">
                    {section.name}
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-muted">{fmt2(section.total)}</span>
                </div>
              )}

              {/* Unified asset list: manual assets + T212 positions in one block */}
              {(() => {
                type Row =
                  | { kind: 'asset'; key: string; icon: string; name: string; label: string; value: number; pnl: number | null; pnlPct: number | null; onClick?: () => void }

                const rows: Row[] = []

                // Manual assets
                for (const a of section.assets) {
                  const displayVal = cx(a)
                  const pnl = a.currentValue - a.initialValue
                  const pnlPct = a.initialValue > 0 ? (pnl / a.initialValue) * 100 : null
                  const displayPnl = rates ? convert(pnl, a.currency, displayCurrency, rates) : pnl
                  rows.push({
                    kind: 'asset',
                    key: a.id,
                    icon: typeIcon(a.type),
                    name: a.name,
                    label: `${typeLabel(a.type)} · ${a.currency}`,
                    value: displayVal,
                    pnl: pnlPct !== null ? displayPnl : null,
                    pnlPct,
                    onClick: section.isMine ? () => setDetailAsset(a) : undefined,
                  })
                }

                // T212 positions
                for (const pos of snap.portfolio) {
                  const { value: nativeValue, currency: nativeCur } = positionNative(pos, currencyMap)
                  const { value: nativeCost } = positionCostNative(pos, currencyMap)
                  const value = rates ? convert(nativeValue, nativeCur, displayCurrency, rates) : nativeValue
                  const pnl = cxGbp(pos.ppl)
                  const pnlPct = nativeCost > 0 ? ((nativeValue - nativeCost) / nativeCost) * 100 : null
                  rows.push({
                    kind: 'asset',
                    key: pos.ticker,
                    icon: '📈',
                    name: nameMap.get(pos.ticker) ?? cleanTicker(pos.ticker),
                    label: 'Stocks / ISA · T212',
                    value,
                    pnl,
                    pnlPct,
                  })
                }

                // T212 free cash
                if ((snap.cash?.free ?? 0) > 0) {
                  rows.push({
                    kind: 'asset',
                    key: '__t212_cash',
                    icon: '💵',
                    name: 'T212 Free Cash',
                    label: 'Cash · T212',
                    value: cxGbp(snap.cash!.free),
                    pnl: null,
                    pnlPct: null,
                  })
                }

                // Sort by value descending
                rows.sort((a, b) => b.value - a.value)

                if (rows.length === 0) return null

                return (
                  <div className="border border-border bg-background divide-y divide-border">
                    {rows.map((row) => (
                      <button
                        key={row.key}
                        onClick={row.onClick}
                        className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between gap-3 ${row.onClick ? 'hover:bg-muted/10 cursor-pointer' : 'cursor-default'}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg flex-shrink-0">{row.icon}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{row.name}</p>
                            <p className="text-xs text-muted">{row.label}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold tabular-nums">{fmt2(row.value)}</p>
                          {row.pnlPct !== null && row.pnl !== null && (
                            <p className={`text-xs tabular-nums ${row.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {row.pnl >= 0 ? '+' : ''}{fmt2(row.pnl)} ({row.pnlPct >= 0 ? '+' : ''}{row.pnlPct.toFixed(1)}%)
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>

      {/* Add form modal */}
      {showForm && (
        <AssetForm
          onSave={async (data) => {
            await addAsset(data)
            setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Edit form modal */}
      {editAsset && (
        <AssetForm
          initial={editAsset}
          onSave={async (data) => {
            await updateAsset(editAsset.id, data)
            setEditAsset(null)
            setDetailAsset(null)
          }}
          onCancel={() => setEditAsset(null)}
        />
      )}

      {/* Detail modal — only for own assets */}
      {detailAsset && !editAsset && (
        <AssetDetailModal
          asset={detailAsset}
          displayCurrency={displayCurrency}
          rates={rates}
          onEdit={() => { setEditAsset(detailAsset); setDetailAsset(null) }}
          onDelete={() => deleteAsset(detailAsset.id)}
          onClose={() => setDetailAsset(null)}
        />
      )}
    </div>
  )
}
