'use client'

import { useState } from 'react'
import { useAuth } from '@/common/firebase/AuthProvider'
import { useCategories } from '../hooks/useCategories'
import { useTzCheck } from '../hooks/useTzCheck'
import { CategoryList } from '../components/CategoryList'
import { SettingsCard, SettingsRow } from '@/common/apps/components/SettingsRows'
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
      <CategoryList uid={uid} categories={allCategories} />

      <SettingsCard title="Timezone">
        <SettingsRow label="Stored" description="Used for days, weeks and months.">
          <span className="settings-row__mono">{effectiveTz}</span>
        </SettingsRow>
        <SettingsRow label="Detected" description="From this device.">
          <span className="settings-row__mono">{runtimeTz}</span>
        </SettingsRow>
        {effectiveTz !== runtimeTz && (
          <p className="settings-row text-sm text-accent">
            Timezone mismatch — a banner will appear on the Today tab to let you switch.
          </p>
        )}
      </SettingsCard>

      <SettingsCard title="Data">
        <SettingsRow
          label="Recompute rollups"
          description="Recalculates all weekly, monthly, and lifetime totals from scratch. Use this if budget bars seem incorrect."
        >
          <button type="button" onClick={handleRecompute} disabled={recomputing} className="btn btn--sm">
            {recomputing ? 'Recomputing…' : 'Recompute'}
          </button>
        </SettingsRow>
        {recomputeDone && (
          <p className="settings-row text-sm text-success" role="status">
            Done! Rollups are up to date.
          </p>
        )}
        {recomputeError && (
          <p className="settings-row text-sm text-destructive" role="status">
            {recomputeError}
          </p>
        )}
      </SettingsCard>
    </div>
  )
}
