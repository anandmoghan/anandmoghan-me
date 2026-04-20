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
import type { Asset, AssetInput } from '../types'

export function useAssets(uid: string | undefined) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setAssets([]); setLoading(false); return }
    const q = query(
      collection(db, 'users', uid, 'assets'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setAssets(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>),
          createdAt: d.data().createdAt?.toDate() ?? new Date(),
          updatedAt: d.data().updatedAt?.toDate() ?? new Date(),
        }))
      )
      setLoading(false)
    })
    return unsub
  }, [uid])

  const addAsset = async (input: AssetInput) => {
    if (!uid) throw new Error('Not authenticated')
    await addDoc(collection(db, 'users', uid, 'assets'), {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  const updateAsset = async (id: string, input: Partial<AssetInput>) => {
    if (!uid) throw new Error('Not authenticated')
    await updateDoc(doc(db, 'users', uid, 'assets', id), {
      ...input,
      updatedAt: serverTimestamp(),
    })
  }

  const deleteAsset = async (id: string) => {
    if (!uid) throw new Error('Not authenticated')
    await deleteDoc(doc(db, 'users', uid, 'assets', id))
  }

  return { assets, loading, addAsset, updateAsset, deleteAsset }
}
