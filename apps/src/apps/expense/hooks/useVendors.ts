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
} from 'firebase/firestore'
import { db } from '../../../firebase'
import { vendorFromWire, vendorInputToWire } from '../types'
import type { Vendor, VendorInput, WireVendor } from '../types'

export function useVendors(uid: string | undefined) {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setVendors([]); setLoading(false); return }
    const q = query(
      collection(db, 'expense', uid, 'vendors'),
      orderBy('n', 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setVendors(snap.docs.map((d) => vendorFromWire(d.id, d.data() as WireVendor)))
      setLoading(false)
    })
    return unsub
  }, [uid])

  const addVendor = async (input: VendorInput) => {
    if (!uid) throw new Error('Not authenticated')
    const ref = await addDoc(collection(db, 'expense', uid, 'vendors'), {
      ...vendorInputToWire(input),
      ca: serverTimestamp(),
      ua: serverTimestamp(),
    })
    return ref.id
  }

  const updateVendor = async (id: string, input: Partial<VendorInput>) => {
    if (!uid) throw new Error('Not authenticated')
    const wire: Record<string, unknown> = { ua: serverTimestamp() }
    if (input.name !== undefined) wire.n = input.name
    if (input.aliases !== undefined) wire.a = input.aliases
    if (input.category !== undefined) wire.cat = input.category
    if (input.color !== undefined) wire.col = input.color
    await updateDoc(doc(db, 'expense', uid, 'vendors', id), wire)
  }

  const deleteVendor = async (id: string) => {
    if (!uid) throw new Error('Not authenticated')
    await deleteDoc(doc(db, 'expense', uid, 'vendors', id))
  }

  return { vendors, loading, addVendor, updateVendor, deleteVendor }
}
