'use client'

import { useCallback, useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useAuth } from '@/common/firebase/AuthProvider'
import { getDb } from '@/common/firebase/client'
import { ladderAccessFromClaims, type LadderAccess } from './access'

// users/{uid}/prefs/p.ladderShowAll: also show the other trackers the role allows. Off by default.
export function useLadderShowAll() {
  const { user } = useAuth()
  const uid = user?.uid
  const [state, setState] = useState<{ uid: string; showAll: boolean } | null>(null)

  useEffect(() => {
    if (!uid) return
    return onSnapshot(
      doc(getDb(), 'users', uid, 'prefs', 'p'),
      (snap) => setState({ uid, showAll: snap.get('ladderShowAll') === true }),
      (err) => {
        console.error('[ladder] reading prefs failed', err)
        setState({ uid, showAll: false })
      },
    )
  }, [uid])

  const setShowAll = useCallback(
    (next: boolean) => {
      if (!uid) return Promise.resolve()
      return setDoc(doc(getDb(), 'users', uid, 'prefs', 'p'), { ladderShowAll: next }, { merge: true })
    },
    [uid],
  )

  const ready = state !== null && state.uid === uid
  return { showAll: ready ? state.showAll : false, ready, setShowAll }
}

/** The user's ladder access from their ID token; null until the claims are read. */
export function useLadderAccess(): LadderAccess | null {
  const { user } = useAuth()
  const [read, setRead] = useState<{ uid: string; access: LadderAccess } | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    user.getIdTokenResult().then(
      ({ claims }) => {
        if (!cancelled) setRead({ uid: user.uid, access: ladderAccessFromClaims(claims) })
      },
      (err) => console.error('[ladder] reading claims failed', err),
    )
    return () => {
      cancelled = true
    }
  }, [user])

  return read && read.uid === user?.uid ? read.access : null
}
