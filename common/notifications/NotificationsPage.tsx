'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { useAuth } from '@/common/firebase/AuthProvider';
import { Card } from '@/common/apps/shell/Card';
import { Spinner } from '@/common/apps/components/Spinner';
import {
  MARK_ALL_MAX,
  PAGE_SIZE,
  appFor,
  markAllRead,
  markRead,
  notificationsCollection,
  removeNotification,
  toNotification,
  type AppNotification,
} from './notifications';

const actionClass = 'tap min-h-11 px-2 text-sm font-semibold text-muted hover:text-fg';

function NotificationRow({
  item,
  onOpen,
  onRead,
  onDelete,
}: {
  item: AppNotification;
  onOpen: (item: AppNotification) => void;
  onRead: (item: AppNotification) => void;
  onDelete: (item: AppNotification) => void;
}) {
  const app = appFor(item);
  const unread = !item.readAt;
  const when = item.createdAt ? formatDistanceToNowStrict(item.createdAt.toDate(), { addSuffix: true }) : '';
  const content = (
    <>
      <span className="flex flex-wrap items-center gap-2 text-xs">
        {unread && <span className="h-2 w-2 rounded-full bg-accent" role="img" aria-label="Unread" />}
        {app && <span className={`domain-${app.domain} font-bold uppercase tracking-wide text-domain`}>{app.name}</span>}
        <span className="text-muted">{when}</span>
      </span>
      <span className={`mt-1 block ${unread ? 'font-bold' : 'font-medium'}`}>{item.title}</span>
      {item.body && <span className="mt-0.5 block text-sm text-muted">{item.body}</span>}
    </>
  );

  return (
    <Card compact>
      {item.link ? (
        <Link href={item.link} className="block no-underline" onClick={() => onOpen(item)}>
          {content}
        </Link>
      ) : (
        <div>{content}</div>
      )}
      <div className="mt-1 flex justify-end gap-1">
        {unread && (
          <button type="button" className={actionClass} onClick={() => onRead(item)}>
            Mark as read
          </button>
        )}
        <button type="button" className={actionClass} onClick={() => onDelete(item)}>
          Delete
        </button>
      </div>
    </Card>
  );
}

export function NotificationsPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [items, setItems] = useState<AppNotification[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (after: QueryDocumentSnapshot | null) => {
      if (!uid) return;
      setError('');
      try {
        const base = [orderBy('createdAt', 'desc'), limit(PAGE_SIZE)];
        const snap = await getDocs(
          query(notificationsCollection(uid), ...(after ? [...base, startAfter(after)] : base)),
        );
        setItems((prev) => [...(after ? prev : []), ...snap.docs.map((d) => toNotification(d.id, d.data()))]);
        setCursor(snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : after);
        setMore(snap.docs.length === PAGE_SIZE);
      } catch {
        setError('Could not load notifications.');
      } finally {
        setLoading(false);
      }
    },
    [uid],
  );

  useEffect(() => {
    void load(null);
  }, [load]);

  if (!uid) return <Spinner text="Loading" />;

  const setRead = (ids: string[]) => {
    const now = Timestamp.now();
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, readAt: now } : n)));
  };
  const act = async (action: Promise<unknown>, apply: () => void) => {
    try {
      await action;
      apply();
    } catch {
      setError('That did not save. Try again.');
    }
  };

  const unreadIds = items.filter((n) => !n.readAt).map((n) => n.id).slice(0, MARK_ALL_MAX);

  return (
    <main className="min-h-screen">
      <section className="py-12">
        <div className="site-container">
          <h1 className="page-title mb-4">Notifications</h1>
          <div className="accent-rule mb-6"></div>

          {unreadIds.length > 0 && (
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => act(markAllRead(uid, unreadIds), () => setRead(unreadIds))}
              >
                Mark all as read
              </button>
            </div>
          )}

          {error && (
            <p className="mb-4 text-sm text-warn" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <Spinner text="Loading" />
          ) : items.length === 0 ? (
            <p className="text-muted">No notifications yet.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id}>
                  <NotificationRow
                    item={item}
                    onOpen={(n) => {
                      if (!n.readAt) void markRead(uid, n.id);
                    }}
                    onRead={(n) => act(markRead(uid, n.id), () => setRead([n.id]))}
                    onDelete={(n) =>
                      act(removeNotification(uid, n.id), () => setItems((prev) => prev.filter((x) => x.id !== n.id)))
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          {more && (
            <div className="mt-6 flex justify-center">
              <button type="button" className="btn btn--outline" onClick={() => void load(cursor)}>
                Load more
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
