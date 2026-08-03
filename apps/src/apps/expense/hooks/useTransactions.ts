import { useState, useEffect, useMemo } from 'react'
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
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../../firebase'
import { transactionFromWire, transactionInputToWire } from '../types'
import type { Transaction, TransactionInput, WireTransaction } from '../types'

export interface TxFilter {
  accountId?: string
  vendorId?: string | null  // null filter = "needs grouping"
  fromDate?: string
  toDate?: string
  query?: string
  transfersOnly?: boolean
  excludeTransfers?: boolean
}

export function useTransactions(uid: string | undefined) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setTransactions([]); setLoading(false); return }
    const q = query(
      collection(db, 'expense', uid, 'transactions'),
      orderBy('d', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map((d) => transactionFromWire(d.id, d.data() as WireTransaction)))
      setLoading(false)
    })
    return unsub
  }, [uid])

  const addTransaction = async (input: TransactionInput) => {
    if (!uid) throw new Error('Not authenticated')
    const ref = await addDoc(collection(db, 'expense', uid, 'transactions'), {
      ...transactionInputToWire(input),
      ca: serverTimestamp(),
      ua: serverTimestamp(),
    })
    return ref.id
  }

  const updateTransaction = async (id: string, patch: Partial<TransactionInput> & {
    vendorId?: string | null
    transferGroupId?: string | null
    userOverrides?: Partial<Transaction['userOverrides']>
  }) => {
    if (!uid) throw new Error('Not authenticated')
    const wire: Record<string, unknown> = { ua: serverTimestamp() }
    if (patch.accountId !== undefined) wire.aId = patch.accountId
    if (patch.date !== undefined) wire.d = patch.date
    if (patch.amount !== undefined) {
      wire.m = patch.amount
      wire.sg = patch.amount < 0 ? 'd' : 'c'
    }
    if (patch.currency !== undefined) wire.c = patch.currency
    if (patch.rawDescription !== undefined) wire.r = patch.rawDescription
    if (patch.vendorName !== undefined) wire.vn = patch.vendorName
    if (patch.vendorId !== undefined) wire.vId = patch.vendorId
    if (patch.transferGroupId !== undefined) wire.tg = patch.transferGroupId
    if (patch.userOverrides !== undefined) {
      const uo: Record<string, boolean> = {}
      if (patch.userOverrides.vendorName) uo.vn = true
      if (patch.userOverrides.vendorId) uo.vId = true
      if (patch.userOverrides.transferGroupId) uo.tg = true
      if (patch.userOverrides.category) uo.cat = true
      wire.uo = uo
    }
    await updateDoc(doc(db, 'expense', uid, 'transactions', id), wire)
  }

  const deleteTransaction = async (id: string) => {
    if (!uid) throw new Error('Not authenticated')
    await deleteDoc(doc(db, 'expense', uid, 'transactions', id))
  }

  const deleteMany = async (ids: string[]) => {
    if (!uid) throw new Error('Not authenticated')
    if (ids.length === 0) return
    const batch = writeBatch(db)
    for (const id of ids) {
      batch.delete(doc(db, 'expense', uid, 'transactions', id))
    }
    await batch.commit()
  }

  return { transactions, loading, addTransaction, updateTransaction, deleteTransaction, deleteMany }
}

export function useFilteredTransactions(transactions: Transaction[], filter: TxFilter): Transaction[] {
  return useMemo(() => {
    return transactions.filter((t) => {
      if (filter.accountId && t.accountId !== filter.accountId) return false
      if (filter.vendorId === null && t.vendorId !== null) return false
      if (filter.vendorId && t.vendorId !== filter.vendorId) return false
      if (filter.fromDate && t.date < filter.fromDate) return false
      if (filter.toDate && t.date > filter.toDate) return false
      if (filter.transfersOnly && !t.transferGroupId) return false
      if (filter.excludeTransfers && t.transferGroupId) return false
      if (filter.query) {
        const q = filter.query.toLowerCase()
        if (!t.rawDescription.toLowerCase().includes(q) && !t.vendorName.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [transactions, filter.accountId, filter.vendorId, filter.fromDate, filter.toDate, filter.query, filter.transfersOnly, filter.excludeTransfers])
}
