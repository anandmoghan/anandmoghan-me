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
import { assetFromWire, assetInputToWire } from '../types'
import type { Asset, AssetInput, WireAsset } from '../types'

export function useAssets(uid: string | undefined) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setAssets([]); setLoading(false); return }
    const q = query(
      collection(db, 'wealth', uid, 'assets'),
      orderBy('ca', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setAssets(snap.docs.map((d) => assetFromWire(d.id, d.data() as WireAsset)))
      setLoading(false)
    })
    return unsub
  }, [uid])

  const addAsset = async (input: AssetInput) => {
    if (!uid) throw new Error('Not authenticated')
    await addDoc(collection(db, 'wealth', uid, 'assets'), {
      ...assetInputToWire(input),
      ca: serverTimestamp(),
      ua: serverTimestamp(),
    })
  }

  const updateAsset = async (id: string, input: Partial<AssetInput>) => {
    if (!uid) throw new Error('Not authenticated')
    const wire: Record<string, unknown> = { ua: serverTimestamp() }
    if (input.name !== undefined) wire.n = input.name
    if (input.type !== undefined) wire.t = input.type
    if (input.currency !== undefined) wire.c = input.currency
    if (input.initialValue !== undefined) wire.iv = input.initialValue
    if (input.currentValue !== undefined) wire.cv = input.currentValue
    if (input.growthRate !== undefined) wire.gr = input.growthRate
    if (input.yearlyContribution !== undefined) wire.yc = input.yearlyContribution
    if (input.purchaseDate !== undefined) wire.pd = input.purchaseDate
    if (input.contributionEndDate !== undefined) wire.ed = input.contributionEndDate
    await updateDoc(doc(db, 'wealth', uid, 'assets', id), wire)
  }

  const deleteAsset = async (id: string) => {
    if (!uid) throw new Error('Not authenticated')
    await deleteDoc(doc(db, 'wealth', uid, 'assets', id))
  }

  return { assets, loading, addAsset, updateAsset, deleteAsset }
}
