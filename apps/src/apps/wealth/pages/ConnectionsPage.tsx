import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useT212Snapshot, useT212Configured, useInstruments, triggerT212Sync, useT212Settings } from '../hooks/useTrading212'
import { useExchangeRates } from '../hooks/useExchangeRates'
import { CurrencySelector } from '../components/CurrencySelector'
import { CashSummary } from '../components/CashSummary'
import { TransactionList } from '../components/TransactionList'
import { InlineSpinner } from '../../../components/Spinner'
import { convert } from '../services/exchangeRates'
import { inferTickerCurrency, cleanTicker } from '../services/trading212'
import type { Position } from '../services/trading212'
import { auth } from '../../../firebase'

const PROXY_BASE = import.meta.env.VITE_T212_PROXY_URL || 'https://t212-proxy.anand-mohan.workers.dev'

async function saveT212Key(apiKey: string, apiSecret: string): Promise<void> {
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) throw new Error('Not authenticated')
  const res = await fetch(`${PROXY_BASE}/api/key`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to save: ${text}`)
  }
}

function timeAgo(ts: number | null): string {
  if (!ts) return 'Never'
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Numeric input (commits on blur / Enter) ──────────────────────────────────

function NumField({
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
    <div className="flex items-center w-full border border-border bg-background px-2 py-1.5 gap-1 focus-within:ring-1 focus-within:ring-accent focus-within:border-accent">
      {prefix && <span className="text-xs text-muted select-none shrink-0">{prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value) }}
        className="min-w-0 flex-1 text-sm bg-transparent text-right tabular-nums focus:outline-none"
      />
      {suffix && <span className="text-xs text-muted select-none shrink-0">{suffix}</span>}
    </div>
  )
}

// ── Eye icon ──────────────────────────────────────────────────────────────────

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {visible
        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      }
    </svg>
  )
}

// ── Dense positions list ──────────────────────────────────────────────────────

const POSITION_FMT: Record<string, Intl.NumberFormat> = {
  GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
  INR: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }),
}
const PRICE_FMT: Record<string, Intl.NumberFormat> = {
  GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  INR: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
}
function fmtC(n: number, cur: string) {
  return (POSITION_FMT[cur] ?? POSITION_FMT.GBP).format(n)
}
function fmtP(n: number, cur: string) {
  return (PRICE_FMT[cur] ?? PRICE_FMT.GBP).format(n)
}

interface PositionsListProps {
  positions: Position[]
  currencyMap: Map<string, string>
  nameMap: Map<string, string>
  rates: import('../services/exchangeRates').ExchangeRates | null
  displayCurrency: import('../hooks/useExchangeRates').Currency
}

function PositionsList({ positions, currencyMap, nameMap, rates, displayCurrency }: PositionsListProps) {
  const rawCur = (ticker: string) => currencyMap.get(ticker) ?? inferTickerCurrency(ticker)

  const normalise = (ticker: string, price: number) =>
    rawCur(ticker) === 'GBX' ? price / 100 : price

  const nativeCur = (ticker: string) => {
    const c = rawCur(ticker)
    return c === 'GBX' ? 'GBP' : c
  }

  const cx = (amount: number, ticker: string) =>
    rates ? convert(amount, nativeCur(ticker), displayCurrency, rates) : amount

  const cxGbp = (amount: number) =>
    rates ? convert(amount, 'GBP', displayCurrency, rates) : amount

  const sorted = [...positions].sort((a, b) => {
    const aVal = normalise(a.ticker, a.currentPrice) * a.quantity
    const bVal = normalise(b.ticker, b.currentPrice) * b.quantity
    return bVal - aVal
  })

  if (sorted.length === 0) {
    return <p className="text-sm text-muted text-center py-6">No positions found.</p>
  }

  return (
    <div className="divide-y divide-border">
      {sorted.map((pos) => {
        const currentPrice = normalise(pos.ticker, pos.currentPrice)
        const avgPrice = normalise(pos.ticker, pos.averagePrice)
        const currentValue = cx(currentPrice * pos.quantity, pos.ticker)
        const pnl = cxGbp(pos.ppl)
        const pnlPct = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0
        const name = nameMap.get(pos.ticker) ?? cleanTicker(pos.ticker)

        const avgPriceDisplay = cx(avgPrice, pos.ticker)
        const currentPriceDisplay = cx(currentPrice, pos.ticker)

        return (
          <div key={pos.ticker} className="px-4 py-3">
            {/* Row 1: name (ticker) + total value */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-tight truncate">{name}</p>
              <p className="text-sm font-semibold tabular-nums flex-shrink-0">{fmtC(currentValue, displayCurrency)}</p>
            </div>
            {/* Row 2: avg price, current price + P&L */}
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <p className="text-xs text-muted truncate">
                avg: {fmtP(avgPriceDisplay, displayCurrency)} | current: {fmtP(currentPriceDisplay, displayCurrency)}
              </p>
              <p className={`text-xs tabular-nums flex-shrink-0 font-medium ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                {pnl >= 0 ? '+' : ''}{fmtC(pnl, displayCurrency)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Trading 212 Connection ────────────────────────────────────────────────────

function Trading212Connection({ uid }: { uid: string }) {
  const { snapshot, loading: snapshotLoading } = useT212Snapshot(uid || undefined)
  const configured = useT212Configured(uid || undefined)
  const { currencyMap, nameMap } = useInstruments(snapshot)
  const { rates, displayCurrency, setDisplayCurrency } = useExchangeRates()
  const { settings: t212Settings, update: updateT212Settings } = useT212Settings(uid || undefined)

  const [expanded, setExpanded] = useState(false)
  const [showCredForm, setShowCredForm] = useState(false)

  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)

  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiKey.trim() || !apiSecret.trim()) return
    setSaving(true)
    setKeyError(null)
    setKeySaved(false)
    try {
      await saveT212Key(apiKey.trim(), apiSecret.trim())
      setApiKey('')
      setApiSecret('')
      setKeySaved(true)
      setShowCredForm(false)
      setSyncing(true)
      setSyncDone(false)
      setSyncError(null)
      try {
        await triggerT212Sync()
        setSyncDone(true)
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Sync failed')
      } finally {
        setSyncing(false)
      }
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncDone(false)
    setSyncError(null)
    try {
      await triggerT212Sync()
      setSyncDone(true)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  // Only block on snapshot loading; configured===null means t212Creds unreadable,
  // treat as unknown and fall through (snapshot data determines effective state).
  if (snapshotLoading) {
    return (
      <div className="border border-border p-4">
        <InlineSpinner />
      </div>
    )
  }

  // Infer connected state: either explicit true, or snapshot has data
  const isConnected = configured === true || snapshot.syncedAt !== null || snapshot.portfolio.length > 0

  return (
    <div className="border border-border">
      {/* Card header */}
      <div className="p-4 space-y-2">
        {/* Row 1: icon + name + status dot + edit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">📊</span>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">Trading 212</p>
                {isConnected && (
                  <span className="inline-block w-2 h-2 rounded-full bg-success" title="Connected" />
                )}
                {isConnected && (
                  <button
                    onClick={() => setShowCredForm(v => !v)}
                    className="text-muted hover:text-foreground transition-colors"
                    title="Update credentials"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-xs text-muted">
                {isConnected ? `Synced ${timeAgo(snapshot.syncedAt)}` : 'Not connected'}
              </p>
            </div>
          </div>
        </div>
        {/* Row 2: sync + view/hide (right-aligned) */}
        <div className="flex items-center justify-end gap-2">
          {isConnected && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-xs px-3 py-1.5 border border-border hover:bg-muted/20 transition-colors disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs px-3 py-1.5 border border-border hover:bg-muted/20 transition-colors"
          >
            {expanded ? 'Hide' : isConnected ? 'View' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Status messages */}
      {(syncDone || syncError || keySaved) && (
        <div className="px-4 pb-2">
          {syncDone && <p className="text-xs text-success">Portfolio synced successfully.</p>}
          {syncError && <p className="text-xs text-destructive">{syncError}</p>}
          {keySaved && !keyError && <p className="text-xs text-success">Credentials saved. Syncing portfolio…</p>}
        </div>
      )}

      {/* Credential form — shown when not connected, or when editing */}
      {(expanded && !isConnected) || showCredForm ? (
        <div className="border-t border-border p-4 space-y-3 bg-muted/5">
          <p className="text-xs text-muted">
            {isConnected ? 'Update your API credentials:' : 'Enter your Trading 212 API key and secret to connect:'}
          </p>
          <form onSubmit={handleSaveKey} className="space-y-3">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isConnected ? 'New API key' : 'API key'}
                autoComplete="off"
                className="w-full text-sm border border-border bg-background px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-accent font-mono"
              />
              <button type="button" onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground" tabIndex={-1}>
                <EyeIcon visible={showKey} />
              </button>
            </div>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder={isConnected ? 'New API secret' : 'API secret'}
                autoComplete="off"
                className="w-full text-sm border border-border bg-background px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-accent font-mono"
              />
              <button type="button" onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground" tabIndex={-1}>
                <EyeIcon visible={showSecret} />
              </button>
            </div>
            <div className="flex gap-2">
              {showCredForm && (
                <button type="button" onClick={() => setShowCredForm(false)}
                  className="flex-1 py-2 text-xs border border-border hover:bg-muted/20 transition-colors">
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving || !apiKey.trim() || !apiSecret.trim()}
                className="flex-1 py-2 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 font-medium"
              >
                {saving ? 'Saving…' : isConnected ? 'Update Credentials' : 'Connect'}
              </button>
            </div>
            {keyError && <p className="text-xs text-destructive">{keyError}</p>}
          </form>
          <p className="text-xs text-muted">
            Credentials are encrypted server-side. Portfolio syncs every 4 hours.
            Get your key from Trading 212: Settings → API (Beta) → Generate key.
          </p>
        </div>
      ) : null}

      {/* Portfolio detail — shown when expanded and connected */}
      {expanded && isConnected && (
        <div className="border-t border-border">
          {snapshot.error && (
            <div className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              Last sync error: {snapshot.error}
            </div>
          )}

          {!snapshot.cash && !snapshot.error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted mb-3">Your portfolio is being fetched.</p>
              <button onClick={handleSync} disabled={syncing}
                className="text-xs px-4 py-2 bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50">
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
            </div>
          ) : !rates ? (
            <div className="p-6 flex justify-center"><InlineSpinner /></div>
          ) : (
            <div className="space-y-6 pb-4">
              <div className="flex items-center justify-between px-4 pt-4">
                <span className="text-xs text-muted">Synced {timeAgo(snapshot.syncedAt)}</span>
                <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} />
              </div>

              <section className="px-4">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Account Summary</h3>
                <CashSummary cash={snapshot.cash} loading={false} rates={rates} displayCurrency={displayCurrency} />
              </section>

              <section className="px-4">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Projection Assumptions</h3>
                <p className="text-xs text-muted mb-3">Used by the FIRE projection. Contribution is in GBP — T212 ISA only accepts GBP.</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wide mb-1.5">Growth / yr</p>
                    <NumField
                      value={t212Settings.growthRate}
                      onChange={(v) => updateT212Settings({ growthRate: v })}
                      suffix="%"
                      min={-20}
                      max={100}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wide mb-1.5">Add / yr</p>
                    <NumField
                      value={t212Settings.contribution}
                      onChange={(v) => updateT212Settings({ contribution: Math.max(0, v) })}
                      prefix="£"
                      min={0}
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 px-4">Holdings ({snapshot.portfolio.length})</h3>
                <div className="border-t border-b border-border bg-background">
                  <PositionsList
                    positions={snapshot.portfolio}
                    currencyMap={currencyMap}
                    nameMap={nameMap}
                    rates={rates}
                    displayCurrency={displayCurrency}
                  />
                </div>
              </section>

              <section className="px-4">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Recent Transactions</h3>
                <div className="border border-border bg-background p-2">
                  <TransactionList orders={snapshot.orders} loading={false} nameMap={nameMap} />
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Zerodha Connection (placeholder) ─────────────────────────────────────────

function ZerodhaConnection() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-border">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">📈</span>
          <div>
            <p className="font-semibold text-sm">Zerodha</p>
            <p className="text-xs text-muted">Not connected</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-muted border border-border px-2 py-0.5">Coming soon</span>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs px-3 py-1.5 border border-border hover:bg-muted/20 transition-colors"
          >
            {expanded ? 'Hide' : 'Details'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 bg-muted/5 space-y-3">
          <p className="text-sm font-medium">Zerodha Kite Connect</p>
          <p className="text-xs text-muted">
            Zerodha integration is in progress. Once available, you will be able to connect your Kite account
            using your API key and access token to sync your holdings automatically.
          </p>
          <div className="space-y-2 opacity-50 pointer-events-none">
            <input
              type="text"
              placeholder="API key"
              disabled
              className="w-full text-sm border border-border bg-background px-3 py-2 font-mono"
            />
            <input
              type="password"
              placeholder="API secret"
              disabled
              className="w-full text-sm border border-border bg-background px-3 py-2 font-mono"
            />
            <input
              type="text"
              placeholder="Access token (changes daily)"
              disabled
              className="w-full text-sm border border-border bg-background px-3 py-2 font-mono"
            />
            <button disabled className="w-full py-2 text-sm bg-foreground text-background opacity-50 font-medium">
              Connect Zerodha
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Connections Page ──────────────────────────────────────────────────────────

export function ConnectionsPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 space-y-4">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Connections</h2>
      <p className="text-xs text-muted">
        Connect your brokerage accounts to automatically sync holdings into your asset view.
      </p>

      <Trading212Connection uid={uid} />
      <ZerodhaConnection />
    </div>
  )
}
