'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore'
import { getDb } from '@/common/firebase/client'
import { sessionFromWire } from '../schema'
import type { WireSession } from '../schema'
import type { Session } from '../types'

export function useActiveSession(uid: string | undefined): {
  activeSession: Session | null
  loading: boolean
} {
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setActiveSession(null)
      setLoading(false)
      return
    }

    const q = query(
      collection(getDb(), 'time', uid, 'sessions'),
      where('e', '==', null),
      limit(1),
    )

    const unsub = onSnapshot(q, (snap) => {
      console.log('[useActiveSession] snap size:', snap.size, 'docs:', snap.docs.map(d => d.id))
      if (snap.empty) {
        setActiveSession(null)
      } else {
        const d = snap.docs[0]
        setActiveSession(sessionFromWire(d.id, d.data() as WireSession))
      }
      setLoading(false)
    }, (err) => {
      console.error('[useActiveSession] error:', err)
    })

    return unsub
  }, [uid])

  return { activeSession, loading }
}
