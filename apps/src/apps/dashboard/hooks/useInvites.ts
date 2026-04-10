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
import { db } from '../../../firebase'
import { useAuth } from '../../../hooks/useAuth'
import type { Invite, UserProfile } from '../../../types'

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

    const sentQ = query(collection(db, 'invites'), where('fromUid', '==', user.uid))
    const recvQ = query(
      collection(db, 'invites'),
      where('toUid', '==', user.uid),
      where('status', '==', 'pending')
    )

    let sentDone = false, recvDone = false
    const check = () => { if (sentDone && recvDone) setLoading(false) }

    const unsubSent = onSnapshot(sentQ, (snap) => {
      setSentInvites(snap.docs
        .filter(d => d.data().toUid)  // skip legacy toEmail docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Invite, 'id' | 'createdAt'>),
          createdAt: d.data().createdAt?.toDate() || new Date(),
        })))
      sentDone = true; check()
    })

    const unsubRecv = onSnapshot(recvQ, (snap) => {
      setReceivedInvites(snap.docs
        .filter(d => d.data().toUid)  // skip legacy toEmail docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Invite, 'id' | 'createdAt'>),
          createdAt: d.data().createdAt?.toDate() || new Date(),
        })))
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

    Promise.all([...uids].map(uid => getDoc(doc(db, 'users', uid)))).then(snaps => {
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
    const q = query(collection(db, 'users'), where('email', '==', email), limit(1))
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

    await addDoc(collection(db, 'invites'), {
      groupId,
      groupName,
      fromUid: user.uid,
      fromName: user.displayName || user.email,
      toUid,
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
