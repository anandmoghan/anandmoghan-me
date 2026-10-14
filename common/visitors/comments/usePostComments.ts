'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  type Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDb } from '@/common/firebase/client';
import { useAuth } from '@/common/firebase/AuthProvider';

// posts/{slug}/comments/{id}. Rules: firebase/rules/visitors.rules.

export type CommentStatus = 'visible' | 'hidden';

export interface PostComment {
  id: string;
  uid: string;
  displayName: string;
  body: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  status: CommentStatus;
}

export const COMMENT_MAX = 2000;

function commentsRef(slug: string) {
  return collection(getDb(), 'posts', slug, 'comments');
}

/** Visible comments, oldest first; admins also get hidden ones. */
export function usePostComments(slug: string) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const q = isAdmin
      ? query(commentsRef(slug), orderBy('createdAt', 'asc'))
      : query(commentsRef(slug), where('status', '==', 'visible'), orderBy('createdAt', 'asc'));
    return onSnapshot(
      q,
      (snap) => {
        setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PostComment));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Loading comments failed', err);
        setError('Comments could not be loaded.');
        setLoading(false);
      },
    );
  }, [slug, isAdmin, authLoading]);

  const add = useCallback(
    async (displayName: string, body: string) => {
      if (!user) throw new Error('No session');
      await addDoc(commentsRef(slug), {
        uid: user.uid,
        displayName,
        body,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'visible',
      });
    },
    [slug, user],
  );

  const edit = useCallback(
    (id: string, body: string) => updateDoc(doc(commentsRef(slug), id), { body, updatedAt: serverTimestamp() }),
    [slug],
  );

  const setStatus = useCallback(
    (id: string, status: CommentStatus) => updateDoc(doc(commentsRef(slug), id), { status }),
    [slug],
  );

  const remove = useCallback((id: string) => deleteDoc(doc(commentsRef(slug), id)), [slug]);

  return { comments, loading, error, add, edit, setStatus, remove };
}
