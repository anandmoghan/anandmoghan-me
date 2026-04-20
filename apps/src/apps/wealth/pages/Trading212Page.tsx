import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useT212Snapshot, useT212Configured, useInstruments, triggerT212Sync } from '../hooks/useTrading212'
import { useExchangeRates } from '../hooks/useExchangeRates'
import { CurrencySelector } from '../components/CurrencySelector'
import { PortfolioTable } from '../components/PortfolioTable'
import { CashSummary } from '../components/CashSummary'
import { TransactionList } from '../components/TransactionList'
import { InlineSpinner } from '../../../components/Spinner'

function timeAgo(ts: number | null): string {
  if (!ts) return 'Never'
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function Trading212Page() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const navigate = useNavigate()

  const { snapshot, loading: snapshotLoading } = useT212Snapshot(uid || undefined)
  const configured = useT212Configured(uid || undefined)
  const { currencyMap, nameMap } = useInstruments(snapshot)
  const { rates, displayCurrency, setDisplayCurrency } = useExchangeRates()

  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      await triggerT212Sync()
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  // Still loading configured status
  if (configured === null || snapshotLoading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <InlineSpinner />
      </div>
    )
  }

  // No API key configured
  if (!configured) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-4xl mb-3">📊</p>
        <h2 className="text-lg font-semibold mb-2">Connect Trading 212</h2>
        <p className="text-muted text-sm mb-6">
          Add your API key in Settings to start syncing your portfolio.
        </p>
        <button
          onClick={() => navigate('/wealth/settings')}
          className="inline-block px-5 py-2.5 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          Go to Settings
        </button>
      </div>
    )
  }

  // Key configured but no snapshot yet
  if (!snapshot.cash && !snapshot.error) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-4xl mb-3">⏳</p>
        <h2 className="text-lg font-semibold mb-2">Syncing your portfolio</h2>
        <p className="text-muted text-sm mb-6">
          Your data is being fetched. This can take a moment.
        </p>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-block px-5 py-2.5 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
        {syncError && <p className="text-xs text-destructive mt-3">{syncError}</p>}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 space-y-6">
      {/* Sub-header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>Synced {timeAgo(snapshot.syncedAt)}</span>
          <span>·</span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-accent hover:underline disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
        <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} />
      </div>

      {syncError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          {syncError}
        </div>
      )}

      {snapshot.error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          Last sync error: {snapshot.error}
        </div>
      )}

      {/* Cash summary */}
      <section>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Account Summary</h2>
        <CashSummary
          cash={snapshot.cash}
          loading={false}
          rates={rates}
          displayCurrency={displayCurrency}
        />
      </section>

      {/* Portfolio */}
      <section>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Portfolio</h2>
        <div className="border border-border bg-background overflow-hidden">
          <PortfolioTable
            positions={snapshot.portfolio}
            loading={false}
            currencyMap={currencyMap}
            nameMap={nameMap}
            rates={rates}
            displayCurrency={displayCurrency}
          />
        </div>
      </section>

      {/* Recent transactions */}
      <section>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Recent Transactions</h2>
        <div className="border border-border bg-background p-2">
          <TransactionList orders={snapshot.orders} loading={false} nameMap={nameMap} />
        </div>
      </section>
    </div>
  )
}
