'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  type User,
  type UserCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  onIdTokenChanged,
  sendEmailVerification,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDb, getFirebaseAuth } from './client';
import { mergeAnonymous, refreshClaims } from './account';

// Every visitor has a session: anonymous until they upgrade to Google or email. Upgrading links
// the credential to the same uid; if that account already exists we sign in to it and the api
// function merges the anonymous session's data into it (POST /api/account/merge).

interface Session {
  user: User;
  isAnonymous: boolean;
  isAdmin: boolean;
  apps: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
  /** Admin claim on a verified email (mirrored from roles/{email}). */
  isAdmin: boolean;
  /** Apps granted by roles/{email}. */
  apps: string[];
  /** Real name or email, or the share-guest nickname for an anonymous session. */
  displayName: string | null;
  upgradeWithGoogle: () => Promise<void>;
  /** 'linked': new account on this uid, verification email sent. 'existing': signed in and merged. */
  upgradeWithEmail: (email: string, password: string, displayName?: string) => Promise<'linked' | 'existing'>;
  signInExisting: (email: string, password: string) => Promise<void>;
  /** Reloads the user and claims, e.g. after the email verification link was clicked. */
  refresh: () => Promise<void>;
  /** Share-deck guests: names the anonymous session. */
  signInAsGuest: (nickname: string) => Promise<void>;
  /** Signs out; a fresh anonymous session starts straight away. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_NICKNAME_KEY = 'shareGuestNickname';

async function syncUserDoc(user: User): Promise<void> {
  const ref = doc(getDb(), 'users', user.uid);
  const snap = await getDoc(ref);
  const profile = user.isAnonymous
    ? { isAnonymous: true }
    : { isAnonymous: false, email: user.email, displayName: user.displayName, photoURL: user.photoURL };
  // No lastSeenAt here: last seen, country and visit counts are written by the visit function,
  // and only after the visitor accepts cookies.
  await setDoc(ref, { ...profile, ...(snap.exists() ? {} : { createdAt: serverTimestamp() }) }, { merge: true });
}

function errorCode(err: unknown): string | null {
  return err instanceof FirebaseError ? err.code : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestNickname, setGuestNickname] = useState<string | null>(null);
  // `${uid}:${isAnonymous}` keys already synced this page load (users doc, claims).
  const synced = useRef(new Set<string>());
  const anonPending = useRef(false);

  // Users doc and role claims, once per identity per page load. A claims change forces a
  // token refresh, which re-enters the listener with the new claims.
  const syncIdentity = useCallback(async (user: User) => {
    const key = `${user.uid}:${user.isAnonymous}`;
    if (synced.current.has(key)) return;
    synced.current.add(key);
    try {
      await syncUserDoc(user);
      if (!user.isAnonymous && (await refreshClaims(user))) await user.getIdToken(true);
    } catch (err) {
      console.error('Session sync failed', err);
    }
  }, []);

  const loadSession = useCallback(async (user: User) => {
    const { claims } = await user.getIdTokenResult();
    const verified = claims.email_verified === true;
    setSession({
      user,
      isAnonymous: user.isAnonymous,
      isAdmin: verified && claims.admin === true,
      apps: verified && Array.isArray(claims.apps) ? (claims.apps as string[]) : [],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    setGuestNickname(localStorage.getItem(GUEST_NICKNAME_KEY));
    const auth = getFirebaseAuth();
    return onIdTokenChanged(auth, (user) => {
      if (!user) {
        setSession(null);
        if (anonPending.current) return;
        anonPending.current = true;
        signInAnonymously(auth)
          .catch((err) => {
            console.error('Anonymous sign-in failed', err);
            setLoading(false);
          })
          .finally(() => {
            anonPending.current = false;
          });
        return;
      }
      loadSession(user).catch((err) => console.error('Loading session failed', err));
      syncIdentity(user);
    });
  }, [loadSession, syncIdentity]);

  // After switching from an anonymous session to an existing account.
  const finishSwitch = async (result: UserCredential, anonIdToken: string | null) => {
    if (!anonIdToken) return;
    try {
      await mergeAnonymous(result.user, anonIdToken);
    } catch (err) {
      console.error('Merging the guest session failed', err);
    }
  };

  // After linking a credential to the anonymous uid: same user object, new provider.
  const finishLink = async (user: User) => {
    await user.getIdToken(true);
    await syncIdentity(user);
    await loadSession(user);
  };

  const anonToken = async (): Promise<string | null> => {
    const current = getFirebaseAuth().currentUser;
    return current?.isAnonymous ? current.getIdToken() : null;
  };

  const upgradeWithGoogle = async () => {
    const auth = getFirebaseAuth();
    const current = auth.currentUser;
    const provider = new GoogleAuthProvider();
    if (!current?.isAnonymous) {
      await signInWithPopup(auth, provider);
      return;
    }
    const token = await current.getIdToken();
    try {
      const result = await linkWithPopup(current, provider);
      await finishLink(result.user);
    } catch (err) {
      const credential = err instanceof FirebaseError ? GoogleAuthProvider.credentialFromError(err) : null;
      if (errorCode(err) !== 'auth/credential-already-in-use' || !credential) throw err;
      await finishSwitch(await signInWithCredential(auth, credential), token);
    }
  };

  const upgradeWithEmail = async (email: string, password: string, name?: string): Promise<'linked' | 'existing'> => {
    const auth = getFirebaseAuth();
    const current = auth.currentUser;
    let user: User;
    if (current?.isAnonymous) {
      const token = await current.getIdToken();
      try {
        user = (await linkWithCredential(current, EmailAuthProvider.credential(email, password))).user;
      } catch (err) {
        const code = errorCode(err);
        if (code !== 'auth/email-already-in-use' && code !== 'auth/credential-already-in-use') throw err;
        await finishSwitch(await signInWithEmailAndPassword(auth, email, password), token);
        return 'existing';
      }
    } else {
      user = (await createUserWithEmailAndPassword(auth, email, password)).user;
    }
    if (name) await updateProfile(user, { displayName: name });
    await sendEmailVerification(user);
    await finishLink(user);
    return 'linked';
  };

  const signInExisting = async (email: string, password: string) => {
    const token = await anonToken();
    await finishSwitch(await signInWithEmailAndPassword(getFirebaseAuth(), email, password), token);
  };

  const refresh = async () => {
    const current = getFirebaseAuth().currentUser;
    if (!current) return;
    await current.reload();
    if (!current.isAnonymous) await refreshClaims(current);
    await current.getIdToken(true);
    await loadSession(current);
  };

  const signInAsGuest = async (nickname: string) => {
    const auth = getFirebaseAuth();
    const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
    await updateProfile(user, { displayName: nickname });
    localStorage.setItem(GUEST_NICKNAME_KEY, nickname);
    setGuestNickname(nickname);
  };

  const signOut = async () => {
    localStorage.removeItem(GUEST_NICKNAME_KEY);
    setGuestNickname(null);
    await firebaseSignOut(getFirebaseAuth());
  };

  const user = session?.user ?? null;
  const displayName: string | null = !session
    ? null
    : session.isAnonymous
      ? guestNickname
      : user?.displayName || user?.email || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAnonymous: session?.isAnonymous ?? true,
        isAdmin: session?.isAdmin ?? false,
        apps: session?.apps ?? [],
        displayName,
        upgradeWithGoogle,
        upgradeWithEmail,
        signInExisting,
        refresh,
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
