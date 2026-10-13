'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore'
import { getDb } from '@/common/firebase/client'
import { useAuth } from '@/common/firebase/AuthProvider'
import type { Group } from '@/common/apps/types'

export function useGroups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setGroups([])
      setLoading(false)
      return
    }

    // 'm' is the wire name for the members array
    const q = query(collection(getDb(), 'groups'), where('m', 'array-contains', user.uid))
    const unsub = onSnapshot(q, (snap) => {
      const data: Group[] = snap.docs.map((d) => {
        const w = d.data()
        return {
          id: d.id,
          name: w.n as string,
          createdBy: w.cb as string,
          members: (w.m as string[]) ?? [],
          createdAt: (w.ca as { toDate?: () => Date } | null)?.toDate?.() ?? new Date(),
        }
      })
      setGroups(data)
      setLoading(false)
      if (data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(data[0].id)
      }
    })
    return unsub
  }, [user])

  const createGroup = async (name: string) => {
    if (!user) throw new Error('Not authenticated')
    const docRef = await addDoc(collection(getDb(), 'groups'), {
      n: name,
      cb: user.uid,
      ca: serverTimestamp(),
      m: [user.uid],
    })
    setSelectedGroupId(docRef.id)
    return docRef.id
  }

  const addMemberToGroup = async (groupId: string, uid: string) => {
    await updateDoc(doc(getDb(), 'groups', groupId), {
      m: arrayUnion(uid),
    })
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null

  return {
    groups,
    loading,
    selectedGroupId,
    setSelectedGroupId,
    selectedGroup,
    createGroup,
    addMemberToGroup,
  }
}
