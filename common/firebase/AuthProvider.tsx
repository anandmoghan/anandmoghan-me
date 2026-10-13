'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getDb, getFirebaseAuth } from './client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  displayName: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInAsGuest: (nickname: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestNickname, setGuestNickname] = useState<string | null>(null);

  useEffect(() => {
    setGuestNickname(localStorage.getItem('shareGuestNickname'));
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
    const firebaseUser = result.user;

    // Create user doc if first time
    const userRef = doc(getDb(), 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        createdAt: serverTimestamp(),
      });
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    await updateProfile(result.user, { displayName });
    await setDoc(doc(getDb(), 'users', result.user.uid), {
      email: result.user.email,
      displayName,
      photoURL: null,
      createdAt: serverTimestamp(),
    });
  };

  const signInAsGuest = async (nickname: string) => {
    const result = await signInAnonymously(getFirebaseAuth());
    await updateProfile(result.user, { displayName: nickname });
    localStorage.setItem('shareGuestNickname', nickname);
    setGuestNickname(nickname);
  };

  const signOut = async () => {
    await firebaseSignOut(getFirebaseAuth());
  };

  const displayName: string | null = !user
    ? null
    : user.isAnonymous
      ? guestNickname
      : user.displayName || user.email || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        displayName,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
