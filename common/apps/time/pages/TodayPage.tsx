'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/common/firebase/AuthProvider'
import { useCategories } from '../hooks/useCategories'
import { useActiveSession } from '../hooks/useActiveSession'
import { useTodaySessions } from '../hooks/useTodaySessions'
import { useRollups } from '../hooks/useRollups'
import { useTzCheck } from '../hooks/useTzCheck'
import { CategoryGrid } from '../components/CategoryGrid'
import { TzChangeBanner } from '../components/TzChangeBanner'
import { switchActivity, stopActivity } from '../services/activity'
import { runRollupCatchup } from '../services/rollup'
import { InlineSpinner } from '@/common/apps/components/Spinner'

export function TodayPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  const { effectiveTz, storedTz, runtimeTz, tzMismatch, initialized } = useTzCheck(uid || undefined)
  const [tzDismissed, setTzDismissed] = useState(false)

  const { categories, categoryMap, loading: catsLoading } = useCategories(uid || undefined)
  const { activeSession } = useActiveSession(uid || undefined)
  const { todaySessions } = useTodaySessions(uid || undefined, effectiveTz)
  const { weekRollup, monthRollup } = useRollups(uid || undefined, effectiveTz)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    if (uid && initialized) {
      runRollupCatchup(uid, effectiveTz).catch(console.error)
    }
  }, [uid, initialized, effectiveTz])

  const handleSwitch = async (cid: string) => {
    if (!uid || switching) return
    if (activeSession?.categoryId === cid) return handleStop()
    const cat = categoryMap[cid]
    setSwitching(true)
    try {
      await switchActivity(uid, cid, effectiveTz, cat?.minDuration)
    } catch (err) {
      console.error('[TodayPage] switchActivity failed:', err)
    } finally {
      setSwitching(false)
    }
  }

  const handleStop = async () => {
    if (!uid || switching) return
    const activeCat = activeSession ? categoryMap[activeSession.categoryId] : undefined
    setSwitching(true)
    try {
      await stopActivity(uid, effectiveTz, activeCat?.minDuration)
    } catch (err) {
      console.error('[TodayPage] stopActivity failed:', err)
    } finally {
      setSwitching(false)
    }
  }

  if (catsLoading || !initialized) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <InlineSpinner />
      </div>
    )
  }

  const showBanner = tzMismatch && !tzDismissed

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 space-y-4">
      {showBanner && storedTz && (
        <TzChangeBanner
          uid={uid}
          storedTz={storedTz}
          runtimeTz={runtimeTz}
          onDismiss={() => setTzDismissed(true)}
        />
      )}

      {categories.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">⏱️</p>
          <h2 className="text-lg font-semibold mb-2">Welcome to Time</h2>
          <p className="text-muted text-sm mb-6">
            Create categories to start tracking your time.
          </p>
          <Link
            href="/apps/time/settings"
            className="inline-block px-5 py-2.5 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            Go to Settings
          </Link>
        </div>
      ) : (
        <CategoryGrid
          categories={categories}
          activeCategoryId={activeSession?.categoryId ?? null}
          activeStartedAt={activeSession?.startedAt ?? null}
          todaySessions={todaySessions}
          weekRollup={weekRollup}
          monthRollup={monthRollup}
          onSelect={handleSwitch}
          onStop={handleStop}
          disabled={switching}
        />
      )}
    </div>
  )
}
