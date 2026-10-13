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
  getDocs,
  getDoc,
  limit,
} from 'firebase/firestore'
import { getDb } from '@/common/firebase/client'
import { useAuth } from '@/common/firebase/AuthProvider'
import type { Invite, UserProfile } from '@/common/apps/types'

export function useInvites() {
  const { user } = useAuth()
  const [sentInvites, setSentInvites] = useState<Invite[]>([])
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([])
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setSentInvites([])
      setReceivedInvites([])
      setLoading(false)
      return
    }

    // 'fu' = fromUid, 'tu' = toUid, 's' = status
    const sentQ = query(collection(getDb(), 'invites'), where('fu', '==', user.uid))
    const recvQ = query(
      collection(getDb(), 'invites'),
      where('tu', '==', user.uid),
      where('s', '==', 'pending')
    )

    let sentDone = false, recvDone = false
    const check = () => { if (sentDone && recvDone) setLoading(false) }

    const wireToInvite = (d: ReturnType<typeof doc> extends never ? never : { id: string; data: () => Record<string, unknown> }): Invite | null => {
      const w = (d as { id: string; data: () => Record<string, unknown> }).data()
      if (!w.tu) return null  // skip legacy toEmail docs
      return {
        id: (d as { id: string }).id,
        groupId: w.gi as string,
        groupName: w.gn as string,
        fromUid: w.fu as string,
        fromName: w.fn as string,
        toUid: w.tu as string,
        status: w.s as 'pending' | 'accepted' | 'declined',
        createdAt: (w.ca as { toDate?: () => Date } | null)?.toDate?.() ?? new Date(),
      }
    }

    const unsubSent = onSnapshot(sentQ, (snap) => {
      setSentInvites(snap.docs.map(wireToInvite).filter(Boolean) as Invite[])
      sentDone = true; check()
    })

    const unsubRecv = onSnapshot(recvQ, (snap) => {
      setReceivedInvites(snap.docs.map(wireToInvite).filter(Boolean) as Invite[])
      recvDone = true; check()
    })

    return () => { unsubSent(); unsubRecv() }
  }, [user])

  // Fetch user profiles for all relevant UIDs
  useEffect(() => {
    const uids = new Set<string>()
    sentInvites.forEach(i => i.toUid && uids.add(i.toUid))
    receivedInvites.forEach(i => i.fromUid && uids.add(i.fromUid))
    if (uids.size === 0) return

    Promise.all([...uids].map(uid => getDoc(doc(getDb(), 'users', uid)))).then(snaps => {
      const profiles: Record<string, UserProfile> = {}
      snaps.forEach(snap => {
        if (snap.exists()) {
          profiles[snap.id] = { uid: snap.id, ...snap.data() } as UserProfile
        }
      })
      setUserProfiles(profiles)
    })
  }, [sentInvites, receivedInvites])

  const lookupUserByEmail = async (email: string): Promise<string> => {
    const q = query(collection(getDb(), 'users'), where('email', '==', email), limit(1))
    const snap = await getDocs(q)
    if (snap.empty) throw new Error(`No account found for ${email}`)
    return snap.docs[0].id
  }

  const sendInvite = async (groupId: string, groupName: string, email: string) => {
    if (!user) throw new Error('Not authenticated')
    const toUid = await lookupUserByEmail(email)
    if (toUid === user.uid) throw new Error("You can't invite yourself")

    const existing = sentInvites.find(
      (i) => i.groupId === groupId && i.toUid === toUid && i.status === 'pending'
    )
    if (existing) throw new Error('Invite already sent to this user for this group')

    await addDoc(collection(getDb(), 'invites'), {
      gi: groupId,
      gn: groupName,
      fu: user.uid,
      fn: user.displayName || user.email,
      tu: toUid,
      s: 'pending',
      ca: serverTimestamp(),
    })
  }

  const respondToInvite = async (inviteId: string, status: 'accepted' | 'declined', groupId?: string) => {
    if (!user) throw new Error('Not authenticated')
    await updateDoc(doc(getDb(), 'invites', inviteId), { s: status })

    if (status === 'accepted' && groupId) {
      await updateDoc(doc(getDb(), 'groups', groupId), { m: arrayUnion(user.uid) })
    }
  }

  const getGroupInvites = (groupId: string) =>
    sentInvites.filter((i) => i.groupId === groupId)

  return {
    sentInvites,
    receivedInvites,
    userProfiles,
    loading,
    sendInvite,
    respondToInvite,
    getGroupInvites,
  }
}
