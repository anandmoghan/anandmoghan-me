'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { getDb } from '@/common/firebase/client'
import { sessionFromWire } from '../schema'
import type { WireSession } from '../schema'
import type { Session } from '../types'
import { localDayKey } from '../services/time'

export function useTodaySessions(uid: string | undefined, tz: string): {
  todaySessions: Session[]
  todayKey: number
  loading: boolean
} {
  const todayKey = localDayKey(new Date(), tz)
  const [todaySessions, setTodaySessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setTodaySessions([])
      setLoading(false)
      return
    }

    const q = query(
      collection(getDb(), 'time', uid, 'sessions'),
      where('dk', '==', todayKey),
    )

    const unsub = onSnapshot(q, (snap) => {
      const sessions = snap.docs.map(d => sessionFromWire(d.id, d.data() as WireSession))
      sessions.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
      setTodaySessions(sessions)
      setLoading(false)
    })

    return unsub
  }, [uid, todayKey])

  return { todaySessions, todayKey, loading }
}
