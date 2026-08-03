import { useState, useEffect } from 'react'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  where,
} from 'firebase/firestore'
import { db } from '../../../firebase'
import { statementFromWire } from '../types'
import type { Statement, WireStatement } from '../types'

export function useStatements(uid: string | undefined) {
  const [statements, setStatements] = useState<Statement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setStatements([]); setLoading(false); return }
    const q = query(
      collection(db, 'expense', uid, 'statements'),
      orderBy('ia', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setStatements(snap.docs.map((d) => statementFromWire(d.id, d.data() as WireStatement)))
      setLoading(false)
    })
    return unsub
  }, [uid])

  return { statements, loading }
}

/** Synchronous one-shot lookup (used by import flow before commit). */
export async function findStatementByHash(uid: string, hash: string): Promise<Statement | null> {
  const q = query(
    collection(db, 'expense', uid, 'statements'),
    where('h', '==', hash)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const doc = snap.docs[0]
  return statementFromWire(doc.id, doc.data() as WireStatement)
}
