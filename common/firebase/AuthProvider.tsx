'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  type User,
  type UserCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  type AuthProvider as FirebaseAuthProvider,
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
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDb, getFirebaseAuth } from './client';
import { mergeAnonymous, refreshClaims } from './account';
import type { SocialProviderId } from './providers';
import { clearOffline, readKey, writeKey } from '@/common/apps/family/lib/offlineStore';
import { NICKNAME_RULE, guestNickname, isGuestNickname, isValidNickname, toNickname } from './nickname';

// Every visitor has a session: anonymous until they upgrade to Google, Apple or email. Upgrading links
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
  /** Profile nickname (users/{uid}.displayName), guest-7f3a style for guests; null until loaded. */
  displayName: string | null;
  /** Renames the profile; throws when the name breaks the nickname rule. */
  setDisplayName: (name: string) => Promise<void>;
  /** Sign in with Google or Apple; on a guest session the credential is linked to the same uid. */
  upgradeWithProvider: (id: SocialProviderId) => Promise<void>;
  /** Adds Google or Apple to the signed-in account. Throws the Firebase error (see providerErrorMessage). */
  linkProvider: (id: SocialProviderId) => Promise<void>;
  /** 'linked': new account on this uid, verification email sent. 'existing': signed in and merged. */
  upgradeWithEmail: (email: string, password: string, displayName?: string) => Promise<'linked' | 'existing'>;
  signInExisting: (email: string, password: string) => Promise<void>;
  /** Reloads the user and claims, e.g. after the email verification link was clicked. */
  refresh: () => Promise<void>;
  /** Signs out; a fresh anonymous session starts straight away. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Nickname the share decks used to keep in localStorage; taken over as the profile name once.
const LEGACY_NICKNAME_KEY = 'shareGuestNickname';

// The nickname is set when the doc has none: the account's own name, else the legacy share-deck
// nickname, else guest-7f3a. An account's own name also replaces a generated guest name, so
// linking Google to a guest session picks up the Google name unless the guest chose one.
function profileName(user: User, stored: unknown): string {
  const current = typeof stored === 'string' && isValidNickname(stored) ? stored : null;
  const own = user.isAnonymous
    ? (toNickname(localStorage.getItem(LEGACY_NICKNAME_KEY)) ?? toNickname(user.displayName))
    : toNickname(user.displayName);
  if (!current) return own ?? guestNickname(user.uid);
  return !user.isAnonymous && own && isGuestNickname(current) ? own : current;
}

async function syncUserDoc(user: User): Promise<void> {
  const ref = doc(getDb(), 'users', user.uid);
  const snap = await getDoc(ref);
  const stored: unknown = snap.get('displayName');
  const displayName = profileName(user, stored);
  const profile = user.isAnonymous
    ? { isAnonymous: true }
    : { isAnonymous: false, email: user.email, photoURL: user.photoURL };
  // No lastSeenAt here: last seen, country and visit counts are written by the visit function,
  // and only after the visitor accepts cookies.
  await setDoc(
    ref,
    {
      ...profile,
      ...(displayName !== stored ? { displayName } : {}),
      ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
  localStorage.removeItem(LEGACY_NICKNAME_KEY);
}

interface Claims {
  isAdmin: boolean;
  apps: string[];
}

// The role claims of the ID token. A signed-in user's last claims are kept on the device: with no network and an
// expired token (the token refresh needs the network) the Nila app on a phone still opens for the same user, and
// the claims are read again as soon as the token refreshes online. The rules still decide on the server.
async function claimsOf(user: User): Promise<Claims> {
  try {
    const { claims } = await user.getIdTokenResult();
    const verified = claims.email_verified === true;
    const result = { isAdmin: verified && claims.admin === true, apps: verified && Array.isArray(claims.apps) ? (claims.apps as string[]) : [] };
    if (!user.isAnonymous) writeKey(`claims:${user.uid}`, result).catch(() => undefined);
    return result;
  } catch (err) {
    const saved = err instanceof FirebaseError && err.code === 'auth/network-request-failed' && !user.isAnonymous
      ? await readKey<Claims>(`claims:${user.uid}`).catch(() => null)
      : null;
    if (!saved) throw err;
    return saved;
  }
}

function socialProvider(id: SocialProviderId): FirebaseAuthProvider {
  if (id === 'google.com') return new GoogleAuthProvider();
  const apple = new OAuthProvider('apple.com');
  apple.addScope('email');
  apple.addScope('name');
  return apple;
}

function credentialFromError(id: SocialProviderId, err: unknown) {
  if (!(err instanceof FirebaseError)) return null;
  return id === 'google.com' ? GoogleAuthProvider.credentialFromError(err) : OAuthProvider.credentialFromError(err);
}

function errorCode(err: unknown): string | null {
  return err instanceof FirebaseError ? err.code : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // users/{uid}.displayName of the current session, live (edits, merges).
  const [profile, setProfile] = useState<{ uid: string; displayName: string | null } | null>(null);
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
      // Claims need a verified email (the api function refuses others).
      if (!user.isAnonymous && user.emailVerified && (await refreshClaims(user))) await user.getIdToken(true);
    } catch (err) {
      console.error('Session sync failed', err);
    }
  }, []);

  const loadSession = useCallback(async (user: User) => {
    const { isAdmin, apps } = await claimsOf(user);
    setSession({ user, isAnonymous: user.isAnonymous, isAdmin, apps });
    setLoading(false);
  }, []);

  useEffect(() => {
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

  const uid = session?.user.uid ?? null;

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(getDb(), 'users', uid),
      (snap) => {
        const name: unknown = snap.get('displayName');
        setProfile({ uid, displayName: typeof name === 'string' ? name : null });
      },
      (err) => console.error('Loading the profile failed', err),
    );
  }, [uid]);

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

  const upgradeWithProvider = async (id: SocialProviderId) => {
    const auth = getFirebaseAuth();
    const current = auth.currentUser;
    const provider = socialProvider(id);
    if (!current?.isAnonymous) {
      await signInWithPopup(auth, provider);
      return;
    }
    const token = await current.getIdToken();
    try {
      const result = await linkWithPopup(current, provider);
      await finishLink(result.user);
    } catch (err) {
      const credential = credentialFromError(id, err);
      if (errorCode(err) !== 'auth/credential-already-in-use' || !credential) throw err;
      await finishSwitch(await signInWithCredential(auth, credential), token);
    }
  };

  const linkProvider = async (id: SocialProviderId) => {
    const current = getFirebaseAuth().currentUser;
    if (!current || current.isAnonymous) throw new Error('Sign in before linking an account');
    const result = await linkWithPopup(current, socialProvider(id));
    await finishLink(result.user);
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
    if (!current.isAnonymous && current.emailVerified) await refreshClaims(current);
    await current.getIdToken(true);
    await loadSession(current);
  };

  const setDisplayName = async (name: string) => {
    const current = getFirebaseAuth().currentUser;
    if (!current) throw new Error('No session');
    const trimmed = name.trim();
    if (!isValidNickname(trimmed)) throw new Error(NICKNAME_RULE);
    await setDoc(doc(getDb(), 'users', current.uid), { displayName: trimmed }, { merge: true });
    if (!current.isAnonymous) await updateProfile(current, { displayName: trimmed });
  };

  const signOut = async () => {
    // What Nila saved on this device (data, claims, access) goes with the session.
    await clearOffline().catch(() => undefined);
    await firebaseSignOut(getFirebaseAuth());
  };

  const user = session?.user ?? null;
  const displayName = profile && profile.uid === uid ? profile.displayName : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAnonymous: session?.isAnonymous ?? true,
        isAdmin: session?.isAdmin ?? false,
        apps: session?.apps ?? [],
        displayName,
        setDisplayName,
        upgradeWithProvider,
        linkProvider,
        upgradeWithEmail,
        signInExisting,
        refresh,
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
