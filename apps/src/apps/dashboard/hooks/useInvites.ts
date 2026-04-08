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
import type { Invite } from '../../../types'

export function useInvites() {
  const { user } = useAuth()
  const [sentInvites, setSentInvites] = useState<Invite[]>([])
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setSentInvites([])
      setReceivedInvites([])
      setLoading(false)
      return
    }

    const sentQ = query(collection(db, 'invites'), where('fromUid', '==', user.uid))
    const recvQ = query(
      collection(db, 'invites'),
      where('toEmail', '==', user.email),
      where('status', '==', 'pending')
    )

    let sentDone = false, recvDone = false
    const check = () => { if (sentDone && recvDone) setLoading(false) }

    const unsubSent = onSnapshot(sentQ, (snap) => {
      setSentInvites(snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Invite, 'id' | 'createdAt'>),
        createdAt: d.data().createdAt?.toDate() || new Date(),
      })))
      sentDone = true; check()
    })

    const unsubRecv = onSnapshot(recvQ, (snap) => {
      setReceivedInvites(snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Invite, 'id' | 'createdAt'>),
        createdAt: d.data().createdAt?.toDate() || new Date(),
      })))
      recvDone = true; check()
    })

    return () => { unsubSent(); unsubRecv() }
  }, [user])

  const sendInvite = async (groupId: string, groupName: string, toEmail: string) => {
    if (!user) throw new Error('Not authenticated')
    // Check for duplicate pending invite
    const existing = sentInvites.find(
      (i) => i.groupId === groupId && i.toEmail === toEmail && i.status === 'pending'
    )
    if (existing) throw new Error('Invite already sent to this email for this group')

    await addDoc(collection(db, 'invites'), {
      groupId,
      groupName,
      fromUid: user.uid,
      fromName: user.displayName || user.email,
      toEmail,
      status: 'pending',
      createdAt: serverTimestamp(),
    })
  }

  const respondToInvite = async (inviteId: string, status: 'accepted' | 'declined', groupId?: string) => {
    if (!user) throw new Error('Not authenticated')
    await updateDoc(doc(db, 'invites', inviteId), { status })

    if (status === 'accepted' && groupId) {
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayUnion(user.uid),
      })
    }
  }

  // Get users who have been invited to a group
  const getGroupInvites = (groupId: string) =>
    sentInvites.filter((i) => i.groupId === groupId)

  return {
    sentInvites,
    receivedInvites,
    loading,
    sendInvite,
    respondToInvite,
    getGroupInvites,
  }
}
