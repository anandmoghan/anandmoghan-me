import { createContext, useContext, useEffect, useState, ReactNode, createElement } from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  displayName: string | null
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>
  signInAsGuest: (nickname: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [guestNickname, setGuestNickname] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('shareGuestNickname') : null
  )

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    const firebaseUser = result.user

    // Create user doc if first time
    const userRef = doc(db, 'users', firebaseUser.uid)
    const userSnap = await getDoc(userRef)
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        createdAt: serverTimestamp(),
      })
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(result.user, { displayName })
    const userRef = doc(db, 'users', result.user.uid)
    await setDoc(userRef, {
      email: result.user.email,
      displayName,
      photoURL: null,
      createdAt: serverTimestamp(),
    })
  }

  const signInAsGuest = async (nickname: string) => {
    const result = await signInAnonymously(auth)
    await updateProfile(result.user, { displayName: nickname })
    localStorage.setItem('shareGuestNickname', nickname)
    setGuestNickname(nickname)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  const displayName: string | null = !user
    ? null
    : user.isAnonymous
      ? guestNickname
      : user.displayName || user.email || null

  return createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        loading,
        displayName,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
        signOut,
      },
    },
    children
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
