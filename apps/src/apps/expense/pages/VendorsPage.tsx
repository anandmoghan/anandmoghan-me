import { useState, useMemo } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useVendors } from '../hooks/useVendors'
import { useTransactions } from '../hooks/useTransactions'
import { VendorForm } from '../components/VendorForm'
import { InlineSpinner } from '../../../components/Spinner'
import { detectAndApplyVendors } from '../services/applyVendors'
import { fmt } from '../services/format'
import type { Vendor } from '../types'

export function VendorsPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const { vendors, loading: vendorsLoading, addVendor, updateVendor, deleteVendor } = useVendors(uid || undefined)
  const { transactions, loading: txLoading } = useTransactions(uid || undefined)
  const [showForm, setShowForm] = useState(false)
  const [editVendor, setEditVendor] = useState<Vendor | null>(null)
  const [retagging, setRetagging] = useState(false)
  const [retagResult, setRetagResult] = useState<string | null>(null)

  // Per-vendor stats: count + sum of money out
  const stats = useMemo(() => {
    const byVendor = new Map<string, { count: number; spend: number }>()
    let unmatched = 0
    for (const tx of transactions) {
      if (tx.transferGroupId) continue  // exclude transfers from spend totals
      if (!tx.vendorId) { unmatched++; continue }
      const cur = byVendor.get(tx.vendorId) ?? { count: 0, spend: 0 }
      cur.count++
      if (tx.amount < 0) cur.spend += Math.abs(tx.amount)
      byVendor.set(tx.vendorId, cur)
    }
    return { byVendor, unmatched }
  }, [transactions])

  const handleRetag = async () => {
    if (!uid) return
    setRetagging(true)
    setRetagResult(null)
    try {
      const { tagged } = await detectAndApplyVendors(uid)
      setRetagResult(tagged === 0 ? 'No new matches.' : `Tagged ${tagged} transaction${tagged === 1 ? '' : 's'}.`)
    } catch (e) {
      setRetagResult(`Error: ${e}`)
    } finally {
      setRetagging(false)
    }
  }

  const loading = vendorsLoading || txLoading
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <InlineSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Vendors</h2>
          <p className="text-xs text-muted mt-0.5">{vendors.length} defined · {stats.unmatched} transactions unmatched</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRetag}
            disabled={retagging || vendors.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border hover:bg-muted/20 transition-colors disabled:opacity-50"
          >
            {retagging ? 'Tagging…' : 'Re-tag'}
          </button>
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

      {retagResult && <p className="text-xs text-success">{retagResult}</p>}

      {vendors.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏷️</p>
          <h2 className="text-lg font-semibold mb-2">No vendors yet</h2>
          <p className="text-muted text-sm mb-6">
            Vendors group transactions by merchant. Each vendor has aliases that match against the raw description.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-block px-5 py-2.5 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            Add your first vendor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {vendors.map((v) => {
            const s = stats.byVendor.get(v.id) ?? { count: 0, spend: 0 }
            return (
              <button
                key={v.id}
                onClick={() => setEditVendor(v)}
                className="text-left border border-border bg-background p-4 hover:bg-muted/10 transition-colors flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ background: v.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{v.name}</p>
                    <p className="text-xs text-muted truncate capitalize">{v.category}</p>
                    <p className="text-[10px] text-muted truncate mt-1 font-mono">
                      {v.aliases.join(', ')}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums">{fmt(s.spend)}</p>
                  <p className="text-[10px] text-muted">{s.count} tx</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showForm && (
        <VendorForm
          onSave={async (data) => {
            await addVendor(data)
            setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editVendor && (
        <VendorForm
          initial={editVendor}
          onSave={async (data) => {
            await updateVendor(editVendor.id, data)
            setEditVendor(null)
          }}
          onDelete={async () => {
            await deleteVendor(editVendor.id)
            setEditVendor(null)
          }}
          onCancel={() => setEditVendor(null)}
        />
      )}
    </div>
  )
}
