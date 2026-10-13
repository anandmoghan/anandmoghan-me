'use client'

import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getDb } from '@/common/firebase/client'
import { useAuth } from '@/common/firebase/AuthProvider'
import { useTheme } from '@/common/components/ThemeProvider'

// Mirrors the theme choice to users/<uid>/prefs/p while signed in.
export function ThemeSync() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [firestoreLoaded, setFirestoreLoaded] = useState(false)
  const uid = user?.uid

  useEffect(() => {
    setFirestoreLoaded(false)
    if (!uid) return
    let cancelled = false
    getDoc(doc(getDb(), 'users', uid, 'prefs', 'p')).then(snap => {
      if (cancelled) return
      if (snap.exists() && snap.data().th) {
        setTheme(snap.data().th)
      }
      setFirestoreLoaded(true)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  useEffect(() => {
    if (!uid || !firestoreLoaded) return
    setDoc(doc(getDb(), 'users', uid, 'prefs', 'p'), { th: theme }, { merge: true })
  }, [theme, uid, firestoreLoaded])

  return null
}
