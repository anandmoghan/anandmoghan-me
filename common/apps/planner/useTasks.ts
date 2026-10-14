'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, Timestamp, where } from 'firebase/firestore'
import { getDb } from '@/common/firebase/client'
import type { Task } from './lib'

function toTask(ownerUid: string, id: string, data: Record<string, unknown>): Task {
  return {
    id,
    ownerUid,
    title: typeof data.title === 'string' ? data.title : '(no title)',
    notes: typeof data.notes === 'string' ? data.notes : '',
    due: data.due instanceof Timestamp ? data.due.toDate() : null,
    dueHasTime: data.dueHasTime === true,
    done: data.done === true,
    shared: data.shared === true,
  }
}

// Live tasks, keyed by owner uid: all of the signed-in user's own and only the shared ones of the
// other household members (the rules reject a query that could return a private task).
export function useTasks(myUid: string, uids: string[]) {
  const [tasks, setTasks] = useState<Record<string, Task[]>>({})
  const [error, setError] = useState<string | null>(null)
  const uidKey = uids.join(',')

  useEffect(() => {
    const unsubs = uidKey.split(',').filter(Boolean).map((uid) => {
      const col = collection(getDb(), 'planner', uid, 'tasks')
      return onSnapshot(
        uid === myUid ? col : query(col, where('shared', '==', true)),
        (snap) => setTasks((prev) => ({ ...prev, [uid]: snap.docs.map((d) => toTask(uid, d.id, d.data())) })),
        (err) => {
          console.error('[planner] reading tasks failed', err)
          setError(err.message)
        },
      )
    })
    return () => unsubs.forEach((u) => u())
  }, [uidKey, myUid])

  return { tasks, error }
}
