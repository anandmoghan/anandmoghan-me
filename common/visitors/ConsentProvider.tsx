'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDb } from '@/common/firebase/client';
import { useAuth } from '@/common/firebase/AuthProvider';

// Analytics consent (UK PECR). The anonymous session itself is functional and needs no consent;
// Google Analytics and visit logging run only after Accept. The choice lives in localStorage and
// in users/{uid}.consent, which the api function checks before logging a visit.

export type Consent = 'granted' | 'denied';

interface ConsentContextType {
  /** null until the visitor chooses (or before localStorage has been read). */
  consent: Consent | null;
  /** False until localStorage has been read, so the banner does not flash. */
  loaded: boolean;
  /** Consent is granted and recorded on the current user's doc: visits may be logged. */
  analyticsReady: boolean;
  choose: (consent: Consent) => void;
  /** Forgets the choice (after the visitor deleted their data); the banner shows again. */
  reset: () => void;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export const CONSENT_KEY = 'analyticsConsent';

function readStored(): Consent | null {
  const value = localStorage.getItem(CONSENT_KEY);
  return value === 'granted' || value === 'denied' ? value : null;
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [consent, setConsent] = useState<Consent | null>(null);
  const [loaded, setLoaded] = useState(false);
  // `${uid}:${consent}` once that choice is on users/{uid}.
  const [recorded, setRecorded] = useState<string | null>(null);

  useEffect(() => {
    setConsent(readStored());
    setLoaded(true);
  }, []);

  const uid = user?.uid ?? null;

  // Mirror the choice onto the current user's doc (a new anonymous session after sign-out, or a
  // switch to another account, gets it too). Writes only when the stored value differs.
  useEffect(() => {
    if (!uid || !consent) return;
    let cancelled = false;
    const ref = doc(getDb(), 'users', uid);
    getDoc(ref)
      .then(async (snap) => {
        if (snap.get('consent') !== consent) {
          await setDoc(ref, { consent, consentAt: serverTimestamp() }, { merge: true });
        }
        if (!cancelled) setRecorded(`${uid}:${consent}`);
      })
      .catch((err) => console.error('Saving the consent choice failed', err));
    return () => {
      cancelled = true;
    };
  }, [uid, consent]);

  const choose = useCallback((next: Consent) => {
    localStorage.setItem(CONSENT_KEY, next);
    setConsent(next);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(CONSENT_KEY);
    setConsent(null);
    setRecorded(null);
  }, []);

  return (
    <ConsentContext.Provider
      value={{
        consent,
        loaded,
        analyticsReady: consent === 'granted' && !!uid && recorded === `${uid}:granted`,
        choose,
        reset,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (context === undefined) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return context;
}
