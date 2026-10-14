'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, type Timestamp } from 'firebase/firestore';
import { getDb } from '@/common/firebase/client';
import { useAuth } from '@/common/firebase/AuthProvider';
import { useConsent } from '../ConsentProvider';
import type { ReadEntry } from './reads';

interface History {
  /** Most recently read first. Empty without consent. */
  reads: ReadEntry[];
  /** Consent is granted (so history is in play) and the fetch has not finished yet. */
  loading: boolean;
}

/** The visitor's reading history, fetched once per mount; no read happens without consent. */
export function useReadingHistory(): History {
  const { user, loading: authLoading } = useAuth();
  const { consent } = useConsent();
  const uid = user?.uid ?? null;
  const granted = consent === 'granted';
  // The uid the loaded `reads` belong to.
  const [loaded, setLoaded] = useState<{ uid: string; reads: ReadEntry[] } | null>(null);

  useEffect(() => {
    if (!granted || !uid) return;
    let cancelled = false;
    const recent = query(collection(getDb(), 'users', uid, 'reads'), orderBy('lastReadAt', 'desc'), limit(100));
    getDocs(recent)
      .then((snap) => {
        if (cancelled) return;
        const reads = snap.docs.map((d) => ({
          slug: String(d.get('slug')),
          title: String(d.get('title')),
          progress: Number(d.get('progress')),
          lastHeadingId: String(d.get('lastHeadingId') ?? ''),
          lastReadAt: (d.get('lastReadAt') as Timestamp | null)?.toDate() ?? new Date(),
        }));
        setLoaded({ uid, reads });
      })
      .catch((err) => {
        console.error('Loading reading history failed', err);
        if (!cancelled) setLoaded({ uid, reads: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [granted, uid]);

  if (!granted) return { reads: [], loading: false };
  if (loaded && loaded.uid === uid) return { reads: loaded.reads, loading: false };
  // Still waiting on auth or the fetch. With no session once auth settles, nothing will load.
  return { reads: [], loading: authLoading || !!uid };
}
