import { useState, useEffect, useMemo, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useAuth } from '../../../hooks/useAuth'
import { useT212Snapshot, useT212Settings } from '../hooks/useTrading212'
import { useAssets } from '../hooks/useAssets'
import { useExchangeRates } from '../hooks/useExchangeRates'
import { convert } from '../services/exchangeRates'
import { CurrencySelector } from '../components/CurrencySelector'
import { InlineSpinner } from '../../../components/Spinner'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import type { AssetType } from '../types'
import type { Currency } from '../hooks/useExchangeRates'

// ── Formatters ────────────────────────────────────────────────────────────────

const FULL_FMT: Record<string, Intl.NumberFormat> = {
  GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
  INR: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }),
}

/** Full precision — use for user-entered values (monthly spending, contributions). */
function fmtFull(n: number, currency: Currency | string): string {
  return (FULL_FMT[currency] ?? FULL_FMT.GBP).format(n)
}

/** Compact — use for projected/derived large numbers. */
function fmt(n: number, currency: Currency | string): string {
  const sym = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '₹'
  const abs = Math.abs(n)
  if (currency === 'INR') {
    if (abs >= 1e7) { const v = n / 1e7; return `${sym}${v < 10 ? v.toFixed(1) : Math.round(v)}Cr` }
    if (abs >= 1e5) { const v = n / 1e5; return `${sym}${v < 10 ? v.toFixed(1) : Math.round(v)}L` }
    if (abs >= 1e3) { const v = n / 1e3; return `${sym}${v < 10 ? v.toFixed(1) : Math.round(v)}K` }
    return `${sym}${Math.round(n)}`
  }
  if (abs >= 1e9) { const v = n / 1e9; return `${sym}${v < 10 ? v.toFixed(1) : Math.round(v)}B` }
  if (abs >= 1e6) { const v = n / 1e6; return `${sym}${v < 10 ? v.toFixed(1) : Math.round(v)}M` }
  if (abs >= 1e3) { const v = n / 1e3; return `${sym}${v < 10 ? v.toFixed(1) : Math.round(v)}K` }
  return `${sym}${Math.round(n)}`
}

function currencySymbol(c: Currency) {
  return c === 'GBP' ? '£' : c === 'USD' ? '$' : '₹'
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface FireSettings {
  inflationRate: number
  taxRate: number
  // Per-currency monthly spend — each currency has its own native amount, so
  // switching display currency picks up a different absolute value
  // (cost of living differs per country).
  monthlySpending: Record<Currency, number>
  pensionIncome: Record<Currency, number>   // monthly pension/annuity income, offsets withdrawals
  endAge: number            // final age of the projection (absolute, independent of retirement age)
  currentAge: number
  retirementAge: number     // age at which contributions stop and withdrawals begin
}

interface ProjectionItem {
  id: string
  name: string
  type: AssetType
  value: number
  defaultGrowthRate: number
  defaultYearlyContrib: number
  isBroker: boolean
}

interface AssetSnapshot {
  id: string
  name: string
  type: AssetType
  value: number
}

interface ProjectionRow {
  year: number
  age: number
  totalNominal: number             // wealth remaining after withdrawal (if any)
  wealthBeforeWithdrawal: number | null  // nominal wealth before first withdrawal (retirement year only)
  phase: 'accumulation' | 'withdrawal'
  isRetirementYear: boolean
  monthlyNominal: number | null    // nominal spending this year (null during accumulation)
  depleted: boolean                // wealth hit zero this year
  assetValues: AssetSnapshot[]     // per-asset values at end of this year (after withdrawal)
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: FireSettings = {
  inflationRate: 3,
  taxRate: 20,
  monthlySpending: { GBP: 3000, USD: 3800, INR: 250000 },
  pensionIncome: { GBP: 0, USD: 0, INR: 0 },
  endAge: 85,
  currentAge: 30,
  retirementAge: 60,
}

const ASSET_TYPE_ICONS: Partial<Record<AssetType, string>> = {
  stocks: '📈', real_estate: '🏠', crypto: '₿', bonds: '📋', cash: '💵',
  mutual_funds: '🏦', pension: '🏖️', insurance: '🛡️', gold: '🥇', vehicle: '🚗', other: '📦',
}

// Asset types you can't withdraw cash from (you can't spend half a house).
// These keep growing but are excluded from drawdown; they show up in the final
// net-worth total but don't cover retirement spending.
const ILLIQUID_TYPES = new Set<AssetType>(['real_estate', 'vehicle'])

const ASSET_TYPE_COLORS: Partial<Record<AssetType, string>> = {
  stocks: '#6366f1',       // indigo
  real_estate: '#f59e0b',  // amber
  crypto: '#f97316',       // orange
  bonds: '#64748b',        // slate
  cash: '#10b981',         // emerald
  mutual_funds: '#8b5cf6', // violet
  pension: '#06b6d4',      // cyan
  insurance: '#ec4899',    // pink
  gold: '#eab308',         // yellow
  vehicle: '#94a3b8',      // slate
  other: '#6b7280',        // gray
}

// ── NumInput component ────────────────────────────────────────────────────────

function NumInput({
  value, onChange, suffix, prefix, min, max,
}: {
  value: number
  onChange: (v: number) => void
  suffix?: string
  prefix?: string
  min?: number
  max?: number
}) {
  const [local, setLocal] = useState(String(value))

  useEffect(() => { setLocal(String(value)) }, [value])

  const commit = (raw: string) => {
    const v = parseFloat(raw)
    if (isNaN(v)) { setLocal(String(value)); return }
    const clamped = min !== undefined && v < min ? min : max !== undefined && v > max ? max : v
    onChange(clamped)
    setLocal(String(clamped))
  }

  return (
    <div className="flex items-center w-full border border-border bg-background px-2 py-1 gap-1 focus-within:ring-1 focus-within:ring-accent focus-within:border-accent">
      {prefix && <span className="text-xs text-muted select-none shrink-0">{prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value) }}
        className="min-w-0 flex-1 text-xs bg-transparent text-right tabular-nums focus:outline-none"
      />
      {suffix && <span className="text-xs text-muted select-none shrink-0">{suffix}</span>}
    </div>
  )
}

// ── Year Card ─────────────────────────────────────────────────────────────────

function YearCard({
  row,
  inflationRate,
  totalYears,
  displayCurrency,
  assetSort,
}: {
  row: ProjectionRow
  inflationRate: number
  totalYears: number
  displayCurrency: Currency
  assetSort: 'name' | 'value'
}) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
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
      // Open upward only if less than 200px below AND more space above
      setOpenUpward(spaceBelow < 200 && rect.top > spaceBelow)
    }
    setOpen((o) => !o)
  }

  const isAcc = row.phase === 'accumulation'
  const inflFactor = Math.pow(1 + inflationRate / 100, row.year - new Date().getFullYear())
  const adjustedTotal = row.totalNominal / inflFactor

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className={`w-full text-left border bg-background px-3 py-3 transition-colors hover:bg-muted/10 ${
          row.depleted
            ? 'border-destructive/40'
            : row.isRetirementYear
            ? 'border-accent/50'
            : 'border-border'
        } ${isAcc ? 'opacity-70' : ''}`}
      >
        {/* Year + age row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium tabular-nums">{row.year}</span>
            <span className="text-[10px] text-muted">· age {row.age}</span>
            {row.isRetirementYear && (
              <span className="text-[9px] bg-accent/20 text-accent px-1 py-0.5 font-semibold uppercase tracking-wide">Retire</span>
            )}
            {row.depleted && (
              <span className="text-[9px] bg-destructive/20 text-destructive px-1 py-0.5 font-semibold uppercase tracking-wide">Depleted</span>
            )}
          </div>
          <span className="text-[9px] text-muted">{isAcc ? 'accumulation' : 'withdrawal'}</span>
        </div>

        {/* Values */}
        <div className="grid grid-cols-3 gap-1">
          <div>
            <p className="text-[9px] text-muted uppercase tracking-wide mb-0.5">Total</p>
            <p className={`text-sm font-semibold tabular-nums ${row.depleted ? 'text-destructive' : ''}`}>
              {fmt(row.totalNominal, displayCurrency)}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-muted uppercase tracking-wide mb-0.5">Adjusted</p>
            <p className="text-sm font-semibold tabular-nums text-muted">
              {fmt(adjustedTotal, displayCurrency)}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-muted uppercase tracking-wide mb-0.5">Withdrawn</p>
            <p className="text-sm font-semibold tabular-nums">
              {row.monthlyNominal != null ? fmt(row.monthlyNominal, displayCurrency) + '/mo' : '—'}
            </p>
          </div>
        </div>
      </button>

      {/* Asset breakdown popover */}
      {open && row.assetValues.length > 0 && (
        <div className={`absolute z-20 left-0 right-0 border border-border bg-background shadow-lg p-3 space-y-1.5 ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          <p className="text-[10px] text-muted uppercase tracking-wide font-medium mb-2">Asset breakdown</p>
          {[...row.assetValues].sort((a, b) =>
            assetSort === 'name' ? a.name.localeCompare(b.name) : b.value - a.value
          ).map((a) => {
            const adjVal = a.value / inflFactor
            return (
              <div key={a.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs shrink-0">{ASSET_TYPE_ICONS[a.type] ?? '📦'}</span>
                  <span className="text-xs text-muted truncate">{a.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-medium tabular-nums">{fmt(a.value, displayCurrency)}</span>
                  <span className="text-xs text-muted tabular-nums">{fmt(adjVal, displayCurrency)}</span>
                </div>
              </div>
            )
          })}
          <div className="border-t border-border pt-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium">Total</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold tabular-nums">{fmt(row.totalNominal, displayCurrency)}</span>
              <span className="text-xs text-muted tabular-nums">{fmt(adjustedTotal, displayCurrency)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────

function ChartTooltipContent({
  active, payload, label, displayCurrency, retirementAge,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: number
  displayCurrency: Currency
  retirementAge: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="border border-border bg-background px-3 py-2 text-xs shadow-md space-y-1">
      <p className="text-muted font-medium">Age {label}{label === retirementAge ? ' · Retire' : ''}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted">{p.name}:</span>
          <span className="font-semibold tabular-nums">{fmt(p.value ?? 0, displayCurrency)}</span>
        </div>
      ))}
    </div>
  )
}

// ── FIRE Page ─────────────────────────────────────────────────────────────────

export function FirePage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  const { assets, loading: assetsLoading } = useAssets(uid || undefined)
  const { snapshot, loading: snapshotLoading } = useT212Snapshot(uid || undefined)
  const { settings: t212Settings } = useT212Settings(uid || undefined)
  const { rates, displayCurrency, setDisplayCurrency, loading: ratesLoading } = useExchangeRates()

  const [settings, setSettings] = useState<FireSettings>(DEFAULT_SETTINGS)
  const [growthOverrides, setGrowthOverrides] = useState<Record<string, number>>({})
  const [contribOverrides, setContribOverrides] = useState<Record<string, number>>({})
  const [showRates, setShowRates] = useState(true)
  const [assetSort, setAssetSort] = useState<'name' | 'value'>('value')

  // Load settings from Firestore on mount
  useEffect(() => {
    if (!uid) return
    getDoc(doc(db, 'wealth', uid)).then((snap) => {
      if (!snap.exists()) return
      const saved = snap.data()?.fireSettings
      if (!saved) return
      // Drop any keys that don't match the current shape; the spread falls back
      // to defaults for anything missing. No legacy migration.
      const cleaned: Partial<FireSettings> = {}
      if (typeof saved.inflationRate === 'number') cleaned.inflationRate = saved.inflationRate
      if (typeof saved.taxRate === 'number') cleaned.taxRate = saved.taxRate
      if (typeof saved.currentAge === 'number') cleaned.currentAge = saved.currentAge
      if (typeof saved.retirementAge === 'number') cleaned.retirementAge = saved.retirementAge
      if (typeof saved.endAge === 'number') cleaned.endAge = saved.endAge
      if (saved.monthlySpending && typeof saved.monthlySpending === 'object' && !Array.isArray(saved.monthlySpending)) {
        cleaned.monthlySpending = { ...DEFAULT_SETTINGS.monthlySpending, ...saved.monthlySpending }
      }
      if (saved.pensionIncome && typeof saved.pensionIncome === 'object' && !Array.isArray(saved.pensionIncome)) {
        cleaned.pensionIncome = { ...DEFAULT_SETTINGS.pensionIncome, ...saved.pensionIncome }
      }
      setSettings((prev) => ({ ...prev, ...cleaned }))
    })
  }, [uid])

  const updateSettings = (patch: Partial<FireSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    if (uid) setDoc(doc(db, 'wealth', uid), { fireSettings: next }, { merge: true })
  }

  const loading = assetsLoading || snapshotLoading || ratesLoading

  // ── Projection items ──────────────────────────────────────────────────────

  const projectionItems = useMemo<ProjectionItem[]>(() => {
    if (!rates) return []
    const cx = (v: number, c: string) => convert(v, c, displayCurrency, rates)
    const items: ProjectionItem[] = []

    for (const a of assets) {
      items.push({
        id: a.id,
        name: a.name,
        type: a.type,
        value: cx(a.currentValue, a.currency),
        defaultGrowthRate: a.growthRate,
        defaultYearlyContrib: cx(a.yearlyContribution || 0, a.currency),
        isBroker: false,
      })
    }

    if (snapshot.cash && snapshot.cash.total > 0.01) {
      items.push({
        id: '__t212_portfolio',
        name: 'Trading 212 ISA',
        type: 'stocks',
        value: cx(snapshot.cash.total, 'GBP'),
        defaultGrowthRate: t212Settings.growthRate,
        defaultYearlyContrib: cx(t212Settings.contribution, 'GBP'),
        isBroker: true,
      })
    }

    return items
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, snapshot, rates, displayCurrency, t212Settings.growthRate, t212Settings.contribution])

  const growthFor = (id: string, defaultRate: number) => growthOverrides[id] ?? defaultRate
  const contribFor = (id: string, defaultContrib: number) => contribOverrides[id] ?? defaultContrib

  // ── Two-phase projection ──────────────────────────────────────────────────

  const projection = useMemo<ProjectionRow[]>(() => {
    if (projectionItems.length === 0) return []

    const { inflationRate, taxRate, endAge, currentAge, retirementAge } = settings
    const monthlySpending = settings.monthlySpending[displayCurrency] ?? 0
    const monthlyPension = settings.pensionIncome[displayCurrency] ?? 0
    // Pension income offsets spending; only the shortfall is drawn from the pot.
    const netMonthlyNeeded = Math.max(0, monthlySpending - monthlyPension)
    const accYears = Math.max(0, retirementAge - currentAge)
    const totalYears = Math.max(accYears, endAge - currentAge)
    const currentYear = new Date().getFullYear()
    const values = projectionItems.map((item) => item.value)

    return Array.from({ length: totalYears }, (_, idx) => {
      const y = idx + 1
      const year = currentYear + y
      const age = currentAge + y
      // Contributions run through the retirement year itself; withdrawals start the year after.
      const isWithdrawal = age > retirementAge
      const isRetirementYear = age === retirementAge

      // Grow each asset; contributions stop after retirement, growth continues always
      for (let i = 0; i < projectionItems.length; i++) {
        const item = projectionItems[i]
        const g = growthFor(item.id, item.defaultGrowthRate) / 100
        const contrib = isWithdrawal ? 0 : contribFor(item.id, item.defaultYearlyContrib)
        values[i] = Math.max(0, values[i] * (1 + g) + contrib)
      }

      const totalAfterGrowth = values.reduce((s, v) => s + v, 0)

      if (!isWithdrawal) {
        const assetValues: AssetSnapshot[] = projectionItems.map((item, i) => ({
          id: item.id, name: item.name, type: item.type, value: values[i],
        }))
        return {
          year, age, totalNominal: totalAfterGrowth,
          // For the retirement year itself we also report the end-of-year wealth —
          // that's the "at age X" number the summary card refers to.
          wealthBeforeWithdrawal: isRetirementYear ? totalAfterGrowth : null,
          phase: 'accumulation' as const,
          isRetirementYear,
          monthlyNominal: null,
          depleted: false,
          assetValues,
        }
      }

      const inflFactor = Math.pow(1 + inflationRate / 100, y)
      const annualSpendingNominal = netMonthlyNeeded * 12 * inflFactor
      const annualGrossNeeded = taxRate > 0 ? annualSpendingNominal / (1 - taxRate / 100) : annualSpendingNominal

      // Only draw from liquid assets — house, vehicle etc. keep growing untouched.
      let liquidTotal = 0
      for (let i = 0; i < projectionItems.length; i++) {
        if (!ILLIQUID_TYPES.has(projectionItems[i].type)) liquidTotal += values[i]
      }
      const illiquidTotal = totalAfterGrowth - liquidTotal

      const depleted = netMonthlyNeeded > 0 && liquidTotal < annualGrossNeeded
      const newLiquid = Math.max(0, liquidTotal - annualGrossNeeded)
      if (liquidTotal > 0 && annualGrossNeeded > 0) {
        const ratio = newLiquid / liquidTotal
        for (let i = 0; i < values.length; i++) {
          if (!ILLIQUID_TYPES.has(projectionItems[i].type)) values[i] *= ratio
        }
      }
      const newTotal = newLiquid + illiquidTotal

      const assetValues: AssetSnapshot[] = projectionItems.map((item, i) => ({
        id: item.id, name: item.name, type: item.type, value: values[i],
      }))

      return {
        year, age, totalNominal: newTotal,
        wealthBeforeWithdrawal: null,
        phase: 'withdrawal' as const,
        isRetirementYear: false,
        monthlyNominal: annualSpendingNominal / 12,
        depleted,
        assetValues,
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectionItems, settings, growthOverrides, contribOverrides, displayCurrency])

  const retirementRow = projection.find((r) => r.isRetirementYear)
  const depletionRow = projection.find((r) => r.depleted)
  const hasWithdrawalPhase = projection.some((r) => r.phase === 'withdrawal')
  const netMonthlyNeeded = Math.max(
    0,
    (settings.monthlySpending[displayCurrency] ?? 0) - (settings.pensionIncome[displayCurrency] ?? 0)
  )
  const lastsFullRetirement = hasWithdrawalPhase && !depletionRow
  const totalNetWorth = projectionItems.reduce((s, i) => s + i.value, 0)
  const accYears = Math.max(0, settings.retirementAge - settings.currentAge)

  // Chart data — include year 0 (today) as starting point
  const chartData = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const today = {
      age: settings.currentAge,
      nominal: totalNetWorth,
      adjusted: totalNetWorth, // today's money = today's value
    }
    return [today, ...projection.map((r) => {
      const inflFactor = Math.pow(1 + settings.inflationRate / 100, r.year - currentYear)
      return {
        age: r.age,
        nominal: r.totalNominal,
        adjusted: r.totalNominal / inflFactor,
      }
    })]
  }, [projection, totalNetWorth, settings.currentAge, settings.inflationRate])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <InlineSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted uppercase tracking-wide font-medium">Retirement Projection</p>
          <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="border border-border bg-background px-4 py-3">
            <p className="text-[10px] text-muted uppercase tracking-wide font-medium mb-1">Net Worth Now</p>
            <p className="text-xl font-bold tabular-nums leading-tight">{fmt(totalNetWorth, displayCurrency)}</p>
          </div>
          <div className="border border-border bg-background px-4 py-3">
            <p className="text-[10px] text-muted uppercase tracking-wide font-medium mb-1">At Age {settings.retirementAge} · Nominal</p>
            <p className="text-xl font-bold tabular-nums leading-tight">
              {retirementRow?.wealthBeforeWithdrawal != null
                ? fmt(retirementRow.wealthBeforeWithdrawal, displayCurrency)
                : '—'}
            </p>
          </div>
          <div className="border border-border bg-background px-4 py-3">
            <p className="text-[10px] text-muted uppercase tracking-wide font-medium mb-1">At Age {settings.retirementAge} · Adjusted</p>
            <p className="text-xl font-bold tabular-nums leading-tight">
              {retirementRow?.wealthBeforeWithdrawal != null && accYears > 0
                ? fmt(retirementRow.wealthBeforeWithdrawal / Math.pow(1 + settings.inflationRate / 100, accYears), displayCurrency)
                : retirementRow?.wealthBeforeWithdrawal != null ? fmt(retirementRow.wealthBeforeWithdrawal, displayCurrency) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Assumptions */}
      <section>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Assumptions</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
          <div className="flex items-center justify-between px-4 py-3 bg-background">
            <span className="text-sm text-muted">Current age</span>
            <div className="w-28 shrink-0"><NumInput value={settings.currentAge} onChange={(v) => updateSettings({ currentAge: Math.round(Math.max(0, v)) })} suffix="yrs" min={0} max={80} /></div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-background">
            <span className="text-sm text-muted">Retirement age</span>
            <div className="w-28 shrink-0"><NumInput value={settings.retirementAge} onChange={(v) => updateSettings({ retirementAge: Math.round(Math.max(0, v)) })} suffix="yrs" min={0} max={90} /></div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-background">
            <span className="text-sm text-muted">Monthly spending</span>
            <div className="w-28 shrink-0"><NumInput value={settings.monthlySpending[displayCurrency] ?? 0} onChange={(v) => updateSettings({ monthlySpending: { ...settings.monthlySpending, [displayCurrency]: Math.max(0, v) } })} prefix={currencySymbol(displayCurrency)} min={0} /></div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-background">
            <span className="text-sm text-muted">Monthly pension</span>
            <div className="w-28 shrink-0"><NumInput value={settings.pensionIncome[displayCurrency] ?? 0} onChange={(v) => updateSettings({ pensionIncome: { ...settings.pensionIncome, [displayCurrency]: Math.max(0, v) } })} prefix={currencySymbol(displayCurrency)} min={0} /></div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-background">
            <span className="text-sm text-muted">Inflation rate</span>
            <div className="w-28 shrink-0"><NumInput value={settings.inflationRate} onChange={(v) => updateSettings({ inflationRate: v })} suffix="%" min={0} max={20} /></div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-background">
            <span className="text-sm text-muted">Tax rate</span>
            <div className="w-28 shrink-0"><NumInput value={settings.taxRate} onChange={(v) => updateSettings({ taxRate: v })} suffix="%" min={0} max={60} /></div>
          </div>
        </div>

        <div className="border-l border-r border-b border-border bg-background px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Project until age</span>
            <span className="text-sm font-semibold tabular-nums">
              {settings.endAge}
              <span className="text-muted font-normal ml-1">
                · {Math.max(0, settings.endAge - settings.retirementAge)} yrs in retirement
              </span>
            </span>
          </div>
          {(() => {
            const minEnd = Math.max(settings.retirementAge + 1, settings.currentAge + 1)
            return (
              <>
                <input
                  type="range"
                  min={minEnd}
                  max={100}
                  step={1}
                  value={Math.max(minEnd, settings.endAge)}
                  onChange={(e) => updateSettings({ endAge: parseInt(e.target.value) })}
                  className="w-full accent-accent h-1.5 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted mt-1">
                  <span>age {minEnd}</span>
                  <span>age 100</span>
                </div>
              </>
            )
          })()}
        </div>
      </section>

      {/* Plan verdict */}
      {hasWithdrawalPhase && (settings.monthlySpending[displayCurrency] ?? 0) > 0 && (() => {
        const lastRow = projection[projection.length - 1]
        const endAge = settings.endAge
        return (
          <div className={`border px-4 py-3 bg-background ${lastsFullRetirement ? 'border-success/50' : 'border-destructive/40'}`}>
            {lastsFullRetirement ? (
              <>
                <p className="text-sm font-semibold text-success">
                  Plan works — {fmtFull(settings.monthlySpending[displayCurrency] ?? 0, displayCurrency)}/mo through age {endAge}
                </p>
                {lastRow && (
                  <p className="text-xs text-muted mt-1">
                    Remaining at age {endAge}: {fmt(lastRow.totalNominal, displayCurrency)} nominal
                    {accYears > 0 && (
                      <span className="ml-1">
                        · {fmt(lastRow.totalNominal / Math.pow(1 + settings.inflationRate / 100, projection.length), displayCurrency)} adjusted
                      </span>
                    )}
                  </p>
                )}
              </>
            ) : depletionRow ? (
              <p className="text-sm font-semibold text-destructive">
                Shortfall — pot runs out at age {depletionRow.age}, {depletionRow.age - settings.retirementAge} year{depletionRow.age - settings.retirementAge !== 1 ? 's' : ''} into retirement
              </p>
            ) : null}
          </div>
        )
      })()}

      {/* Assets — growth & contribution settings */}
      <section>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Assets</h2>
            <p className="text-xs text-muted mt-0.5">Growth applies throughout · Add/yr stops at retirement</p>
          </div>
          <button
            onClick={() => setShowRates((s) => !s)}
            className="text-xs text-muted hover:text-foreground transition-colors shrink-0"
          >
            {showRates ? 'Hide' : 'Show'}
          </button>
        </div>

        {/* Yearly contributions breakdown — sits just under the Assets header */}
        {showRates && projectionItems.length > 0 && (() => {
          const contribs = projectionItems
            .map((item) => ({
              id: item.id,
              name: item.name,
              type: item.type,
              amount: contribFor(item.id, item.defaultYearlyContrib),
            }))
            .filter((c) => c.amount > 0)
            .sort((a, b) => b.amount - a.amount)
          const total = contribs.reduce((s, c) => s + c.amount, 0)
          if (total <= 0) return null
          const accYearsLeft = Math.max(0, settings.retirementAge - settings.currentAge)
          return (
            <div className="border border-border bg-background px-4 py-3 space-y-3 mb-3">
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] text-muted uppercase tracking-wide font-medium">Investments / yr</p>
                <div>
                  <span className="text-lg font-bold tabular-nums">{fmtFull(total, displayCurrency)}</span>
                  <span className="text-xs text-muted ml-1">/ yr</span>
                </div>
              </div>

              {/* Stacked bar */}
              <div className="flex h-3 overflow-hidden bg-muted/10">
                {contribs.map((c) => {
                  const pct = (c.amount / total) * 100
                  return (
                    <div
                      key={c.id}
                      title={`${c.name}: ${fmtFull(c.amount, displayCurrency)}`}
                      style={{
                        width: `${pct}%`,
                        background: ASSET_TYPE_COLORS[c.type] ?? '#6b7280',
                      }}
                    />
                  )
                })}
              </div>

              {/* Legend — responsive grid so items spread across the full width */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5">
                {contribs.map((c) => {
                  const pct = (c.amount / total) * 100
                  return (
                    <div key={c.id} className="flex items-center gap-2 text-xs min-w-0">
                      <span
                        className="inline-block w-2.5 h-2.5 shrink-0"
                        style={{ background: ASSET_TYPE_COLORS[c.type] ?? '#6b7280' }}
                      />
                      <span className="text-muted truncate flex-1 min-w-0">{c.name}</span>
                      <span className="tabular-nums font-medium shrink-0">{fmtFull(c.amount, displayCurrency)}</span>
                      <span className="text-muted tabular-nums shrink-0">({pct.toFixed(0)}%)</span>
                    </div>
                  )
                })}
              </div>

              <p className="text-[10px] text-muted">
                Applies for {accYearsLeft} year{accYearsLeft !== 1 ? 's' : ''} until retirement at age {settings.retirementAge} · total contributed: {fmt(total * accYearsLeft, displayCurrency)}
              </p>
            </div>
          )
        })()}

        {showRates && (
          <>
            {projectionItems.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted text-center border border-border bg-background">No assets found.</p>
            )}

            {/* Sort controls — right above the asset list */}
            {projectionItems.length > 0 && (
              <div className="flex items-center justify-end gap-2 mb-2">
                <span className="text-[10px] text-muted">Sort:</span>
                <div className="flex border border-border overflow-hidden text-[10px]">
                  {(['name', 'value'] as const).map((s, i) => (
                    <button
                      key={s}
                      onClick={() => setAssetSort(s)}
                      className={`px-2.5 py-1 capitalize transition-colors ${assetSort === s ? 'bg-foreground text-background font-medium' : 'hover:bg-muted/20'} ${i > 0 ? 'border-l border-border' : ''}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[...projectionItems].sort((a, b) =>
                assetSort === 'name' ? a.name.localeCompare(b.name) : b.value - a.value
              ).map((item) => {
                const effectiveGrowth = growthFor(item.id, item.defaultGrowthRate)
                const effectiveContrib = contribFor(item.id, item.defaultYearlyContrib)

                return (
                  <div key={item.id} className="border border-border bg-background px-4 py-3">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base w-5 text-center shrink-0">
                        {ASSET_TYPE_ICONS[item.type] ?? '📦'}
                      </span>
                      <p className="text-sm font-medium truncate flex-1 min-w-0">{item.name}</p>
                      <p className="text-sm font-semibold tabular-nums shrink-0">{fmt(item.value, displayCurrency)}</p>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted uppercase tracking-wide mb-1.5">Growth / yr</p>
                        <NumInput
                          value={effectiveGrowth}
                          onChange={(v) => setGrowthOverrides((p) => ({ ...p, [item.id]: v }))}
                          suffix="%"
                          min={-20}
                          max={100}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted uppercase tracking-wide mb-1.5">Add / yr</p>
                        <NumInput
                          value={effectiveContrib}
                          onChange={(v) => {
                            const val = Math.max(0, v)
                            setContribOverrides((p) => ({ ...p, [item.id]: val }))
                          }}
                          prefix={currencySymbol(displayCurrency)}
                          min={0}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* Projection chart + year cards */}
      {projection.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Projection</h2>

          {/* Chart */}
          <div className="border border-border bg-background px-2 pt-4 pb-2 mb-4">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" strokeOpacity={0.5} />
                <XAxis
                  dataKey="age"
                  tick={{ fontSize: 10, fill: 'var(--color-muted-foreground, #6b7280)' }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Age', position: 'insideBottomRight', offset: -8, fontSize: 9, fill: 'var(--color-muted-foreground, #6b7280)' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--color-muted-foreground, #6b7280)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => fmt(v, displayCurrency)}
                  width={60}
                />
                <RechartsTooltip
                  content={
                    <ChartTooltipContent
                      displayCurrency={displayCurrency}
                      retirementAge={settings.retirementAge}
                    />
                  }
                />
                <Legend
                  iconType="line"
                  iconSize={12}
                  wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                />
                <ReferenceLine
                  x={settings.retirementAge}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: 'Retire', position: 'insideTopRight', fontSize: 9, fill: '#94a3b8' }}
                />
                <Line
                  type="monotone"
                  dataKey="nominal"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  name="Nominal"
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="adjusted"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  name="Adjusted"
                  strokeDasharray="5 3"
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Year cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {projection.map((row) => (
              <YearCard
                key={row.year}
                row={row}
                inflationRate={settings.inflationRate}
                totalYears={projection.length}
                displayCurrency={displayCurrency}
                assetSort={assetSort}
              />
            ))}
          </div>

          <p className="text-xs text-muted mt-3">
            Accumulation: contributions on, no withdrawals.
            Retirement: each year withdraws {fmtFull(settings.monthlySpending[displayCurrency] ?? 0, displayCurrency)}/mo in today's money (grossed up for {settings.taxRate}% tax and {settings.inflationRate}% inflation).
            Click any card to see per-asset breakdown.
          </p>
        </section>
      )}
    </div>
  )
}
