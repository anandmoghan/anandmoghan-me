'use client'

import { useState } from 'react'
import { useAuth } from '@/common/firebase/AuthProvider'
import { useCategories } from '../hooks/useCategories'
import { useTzCheck } from '../hooks/useTzCheck'
import { CategoryList } from '../components/CategoryList'
import { recomputeRollups } from '../services/rollup'
import { InlineSpinner } from '@/common/apps/components/Spinner'

export function SettingsPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const { effectiveTz, runtimeTz, initialized } = useTzCheck(uid || undefined)
  const { allCategories, loading: catsLoading } = useCategories(uid || undefined)

  const [recomputing, setRecomputing] = useState(false)
  const [recomputeDone, setRecomputeDone] = useState(false)
  const [recomputeError, setRecomputeError] = useState('')

  const handleRecompute = async () => {
    if (!uid || recomputing) return
    if (!confirm('Recompute all rollups from scratch? This may take a moment.')) return
    setRecomputing(true)
    setRecomputeDone(false)
    setRecomputeError('')
    try {
      await recomputeRollups(uid, effectiveTz)
      setRecomputeDone(true)
    } catch (err) {
      setRecomputeError(String(err))
    } finally {
      setRecomputing(false)
    }
  }

  if (!initialized || catsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <InlineSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 pt-4 space-y-8">
      {/* Categories */}
      <CategoryList uid={uid} categories={allCategories} />

      {/* Timezone info */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Timezone</h2>
        <div className="border border-border p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Stored</span>
            <span className="font-mono text-xs">{effectiveTz}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Detected</span>
            <span className="font-mono text-xs">{runtimeTz}</span>
          </div>
          {effectiveTz !== runtimeTz && (
            <p className="text-xs text-accent mt-1">
              Timezone mismatch — a banner will appear on the Today tab to let you switch.
            </p>
          )}
        </div>
      </div>

      {/* Data */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Data</h2>
        <div className="border border-border p-3 space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">Recompute rollups</p>
            <p className="text-xs text-muted mb-3">
              Recalculates all weekly, monthly, and lifetime totals from scratch.
              Use this if budget bars seem incorrect.
            </p>
            <button
              onClick={handleRecompute}
              disabled={recomputing}
              className="px-4 py-2 text-sm border border-border hover:bg-muted/20 transition-colors disabled:opacity-50"
            >
              {recomputing ? 'Recomputing…' : 'Recompute'}
            </button>
            {recomputeDone && (
              <p className="text-xs text-success mt-2">Done! Rollups are up to date.</p>
            )}
            {recomputeError && (
              <p className="text-xs text-destructive mt-2">{recomputeError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
