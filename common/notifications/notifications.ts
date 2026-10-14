import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { getDb } from '@/common/firebase/client';
import { apps } from '@/common/apps/registry';

// users/{uid}/notifications/{id}, written by the server only (see firebase/rules/core.rules).
export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  /** Registry id of the app that sent it, e.g. "planner". */
  app?: string;
  /** Site path starting with "/". */
  link?: string;
  createdAt: Timestamp | null;
  readAt: Timestamp | null;
}

export const BELL_RECENT = 5;
export const UNREAD_COUNT_CAP = 10;
export const PAGE_SIZE = 30;
export const MARK_ALL_MAX = 500;

export function notificationsCollection(uid: string) {
  return collection(getDb(), 'users', uid, 'notifications');
}

export function toNotification(id: string, data: Record<string, unknown>): AppNotification {
  return {
    id,
    title: String(data.title ?? ''),
    body: typeof data.body === 'string' ? data.body : undefined,
    app: typeof data.app === 'string' ? data.app : undefined,
    link: typeof data.link === 'string' && data.link.startsWith('/') ? data.link : undefined,
    createdAt: (data.createdAt as Timestamp | undefined) ?? null,
    readAt: (data.readAt as Timestamp | null | undefined) ?? null,
  };
}

export function appFor(notification: AppNotification) {
  return apps.find((a) => a.id === notification.app);
}

export function markRead(uid: string, id: string) {
  return updateDoc(doc(notificationsCollection(uid), id), { readAt: serverTimestamp() });
}

export function removeNotification(uid: string, id: string) {
  return deleteDoc(doc(notificationsCollection(uid), id));
}

export function markAllRead(uid: string, ids: string[]) {
  const batch = writeBatch(getDb());
  for (const id of ids.slice(0, MARK_ALL_MAX)) {
    batch.update(doc(notificationsCollection(uid), id), { readAt: serverTimestamp() });
  }
  return batch.commit();
}

// The bell's data: the newest few (read and unread) and how many are unread, capped at
// UNREAD_COUNT_CAP so the query stays small. Both are live.
export function useBellNotifications(uid: string | null) {
  const [recent, setRecent] = useState<AppNotification[]>([]);
  const [unreadIds, setUnreadIds] = useState<string[]>([]);

  useEffect(() => {
    if (!uid) return;
    const col = notificationsCollection(uid);
    const stopRecent = onSnapshot(
      query(col, orderBy('createdAt', 'desc'), limit(BELL_RECENT)),
      (snap) => setRecent(snap.docs.map((d) => toNotification(d.id, d.data()))),
      () => setRecent([]),
    );
    const stopUnread = onSnapshot(
      query(col, where('readAt', '==', null), limit(UNREAD_COUNT_CAP)),
      (snap) => setUnreadIds(snap.docs.map((d) => d.id)),
      () => setUnreadIds([]),
    );
    return () => {
      stopRecent();
      stopUnread();
    };
  }, [uid]);

  return { recent: uid ? recent : [], unreadIds: uid ? unreadIds : [] };
}
