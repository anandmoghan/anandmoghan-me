import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../../firebase'
import { rollupMapFromWire } from '../schema'
import type { RollupMap } from '../types'
import { isoWeekKey, monthKey } from '../services/time'
import { WEEK_PREFIX, MONTH_PREFIX } from '../constants'

interface UseRollupsResult {
  weekRollup: RollupMap   // current ISO week (past days only)
  monthRollup: RollupMap  // current month (past days only)
  lifetimeRollup: RollupMap
}

/**
 * Subscribes to current week, month, and lifetime rollup docs.
 * Used by BudgetBar to show budget progress.
 */
export function useRollups(uid: string | undefined, tz: string): UseRollupsResult {
  const [weekRollup, setWeekRollup] = useState<RollupMap>({})
  const [monthRollup, setMonthRollup] = useState<RollupMap>({})
  const [lifetimeRollup, setLifetimeRollup] = useState<RollupMap>({})

  useEffect(() => {
    if (!uid) return

    const now = new Date()
    const wKey = WEEK_PREFIX + isoWeekKey(now, tz)
    const mKey = MONTH_PREFIX + monthKey(now, tz)

    const unsubWeek = onSnapshot(doc(db, 'time', uid, 'rollups', wKey), snap => {
      setWeekRollup(snap.exists() ? rollupMapFromWire(snap.data()) : {})
    })
    const unsubMonth = onSnapshot(doc(db, 'time', uid, 'rollups', mKey), snap => {
      setMonthRollup(snap.exists() ? rollupMapFromWire(snap.data()) : {})
    })
    const unsubLifetime = onSnapshot(doc(db, 'time', uid, 'rollups', 'lifetime'), snap => {
      setLifetimeRollup(snap.exists() ? rollupMapFromWire(snap.data()) : {})
    })

    return () => {
      unsubWeek()
      unsubMonth()
      unsubLifetime()
    }
  }, [uid, tz])

  return { weekRollup, monthRollup, lifetimeRollup }
}
