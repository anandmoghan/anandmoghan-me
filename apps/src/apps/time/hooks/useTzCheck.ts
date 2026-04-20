import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../../firebase'

interface UseTzCheckResult {
  effectiveTz: string    // the tz to use for day/week/month calculations
  storedTz: string | null
  runtimeTz: string
  tzMismatch: boolean    // true when storedTz differs from runtimeTz
  initialized: boolean
}

/**
 * Reads prefs.tz from Firestore. On first login (no tz stored), initialises it
 * to the current runtime timezone. Returns mismatch state for TzChangeBanner.
 */
export function useTzCheck(uid: string | undefined): UseTzCheckResult {
  const runtimeTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [storedTz, setStoredTz] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!uid) {
      setStoredTz(null)
      setInitialized(false)
      return
    }

    const ref = doc(db, 'time', uid, 'prefs', 'p')
    const unsub = onSnapshot(ref, async (snap) => {
      if (snap.exists() && snap.data().tz) {
        setStoredTz(snap.data().tz)
      } else {
        // First time: initialise to runtime tz
        const { setDoc } = await import('firebase/firestore')
        await setDoc(ref, { tz: runtimeTz }, { merge: true })
        setStoredTz(runtimeTz)
      }
      setInitialized(true)
    })

    return unsub
  }, [uid])

  const effectiveTz = storedTz ?? runtimeTz
  const tzMismatch = initialized && storedTz !== null && storedTz !== runtimeTz

  return { effectiveTz, storedTz, runtimeTz, tzMismatch, initialized }
}
