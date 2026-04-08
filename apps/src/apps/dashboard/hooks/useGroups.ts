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
import { db } from '../../../firebase'
import { useAuth } from '../../../hooks/useAuth'
import type { Group } from '../../../types'

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

    const q = query(collection(db, 'groups'), where('members', 'array-contains', user.uid))
    const unsub = onSnapshot(q, (snap) => {
      const data: Group[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Group, 'id' | 'createdAt'>),
        createdAt: d.data().createdAt?.toDate() || new Date(),
      }))
      setGroups(data)
      setLoading(false)
      // Auto-select first group if none selected
      if (data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(data[0].id)
      }
    })
    return unsub
  }, [user])

  const createGroup = async (name: string) => {
    if (!user) throw new Error('Not authenticated')
    const docRef = await addDoc(collection(db, 'groups'), {
      name,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      members: [user.uid],
    })
    setSelectedGroupId(docRef.id)
    return docRef.id
  }

  const addMemberToGroup = async (groupId: string, uid: string) => {
    await updateDoc(doc(db, 'groups', groupId), {
      members: arrayUnion(uid),
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
