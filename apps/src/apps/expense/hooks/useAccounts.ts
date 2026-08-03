import { useState, useEffect } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../../firebase'
import { accountFromWire, accountInputToWire } from '../types'
import type { Account, AccountInput, WireAccount } from '../types'

const BATCH_LIMIT = 500

export function useAccounts(uid: string | undefined) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setAccounts([]); setLoading(false); return }
    const q = query(
      collection(db, 'expense', uid, 'accounts'),
      orderBy('ca', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setAccounts(snap.docs.map((d) => accountFromWire(d.id, d.data() as WireAccount)))
      setLoading(false)
    })
    return unsub
  }, [uid])

  const addAccount = async (input: AccountInput) => {
    if (!uid) throw new Error('Not authenticated')
    const ref = await addDoc(collection(db, 'expense', uid, 'accounts'), {
      ...accountInputToWire(input),
      ca: serverTimestamp(),
      ua: serverTimestamp(),
    })
    return ref.id
  }

  const updateAccount = async (id: string, input: Partial<AccountInput>) => {
    if (!uid) throw new Error('Not authenticated')
    const wire: Record<string, unknown> = { ua: serverTimestamp() }
    if (input.institution !== undefined) wire.i = input.institution
    if (input.type !== undefined) wire.t = input.type
    if (input.last4 !== undefined) wire.l4 = input.last4
    if (input.currency !== undefined) wire.c = input.currency
    if (input.nickname !== undefined) wire.nm = input.nickname
    await updateDoc(doc(db, 'expense', uid, 'accounts', id), wire)
  }

  const deleteAccount = async (id: string) => {
    if (!uid) throw new Error('Not authenticated')
    // Cascade: delete every transaction and statement linked to the account
    // before removing the account itself.
    const [txSnap, stmtSnap] = await Promise.all([
      getDocs(query(collection(db, 'expense', uid, 'transactions'), where('aId', '==', id))),
      getDocs(query(collection(db, 'expense', uid, 'statements'), where('aId', '==', id))),
    ])
    const refs = [...txSnap.docs, ...stmtSnap.docs].map((d) => d.ref)
    for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db)
      for (const ref of refs.slice(i, i + BATCH_LIMIT)) batch.delete(ref)
      await batch.commit()
    }
    await deleteDoc(doc(db, 'expense', uid, 'accounts', id))
  }

  return { accounts, loading, addAccount, updateAccount, deleteAccount }
}
