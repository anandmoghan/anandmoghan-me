'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import { useAuth } from '@/common/firebase/AuthProvider';
import { BellIcon } from '@/common/apps/shell/icons';
import {
  appFor,
  markAllRead,
  markRead,
  useBellNotifications,
  UNREAD_COUNT_CAP,
  type AppNotification,
} from './notifications';

const rowClass =
  'tap flex min-h-11 w-full items-start gap-2 rounded-xl px-3 py-2 text-left hover:bg-subtle';

function badgeText(unread: number) {
  return unread >= UNREAD_COUNT_CAP ? '9+' : String(unread);
}

function Row({ item, onOpen }: { item: AppNotification; onOpen: (item: AppNotification) => void }) {
  const app = appFor(item);
  const when = item.createdAt ? formatDistanceToNowStrict(item.createdAt.toDate(), { addSuffix: true }) : '';
  return (
    <button type="button" className={rowClass} onClick={() => onOpen(item)}>
      <span
        className={`mt-1.5 h-2 w-2 flex-none rounded-full ${item.readAt ? 'bg-transparent' : 'bg-accent'}`}
        aria-label={item.readAt ? undefined : 'Unread'}
        role={item.readAt ? undefined : 'img'}
      />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm ${item.readAt ? 'font-medium' : 'font-bold'}`}>{item.title}</span>
        <span className="block truncate text-xs text-muted">
          {[app?.name, when].filter(Boolean).join(' · ')}
        </span>
      </span>
    </button>
  );
}

// Bell in the site header for signed-in, non-anonymous users: unread badge and a panel with the
// newest few notifications. The full list lives at /notifications.
export function NotificationBell() {
  const { user, isAnonymous } = useAuth();
  const uid = user && !isAnonymous ? user.uid : null;
  const { recent, unreadIds } = useBellNotifications(uid);
  const unread = unreadIds.length;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!uid) return null;

  const openItem = (item: AppNotification) => {
    setOpen(false);
    if (!item.readAt) void markRead(uid, item.id);
    if (item.link) router.push(item.link);
  };
  const label = unread > 0 ? `Notifications, ${unread >= UNREAD_COUNT_CAP ? 'more than 9' : unread} unread` : 'Notifications';

  return (
    <div className="popover" ref={ref}>
      <button
        type="button"
        className="btn btn--ghost btn--icon relative"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <BellIcon size={20} />
        {unread > 0 && (
          <span
            className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] font-bold leading-none text-white"
            aria-hidden
          >
            {badgeText(unread)}
          </span>
        )}
      </button>

      {open && (
        <div className="popover__panel popover__panel--end w-80 max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:top-[var(--topbar-height)] max-sm:w-auto max-sm:max-w-none">
          <div className="flex min-h-11 items-center justify-between gap-2 px-3">
            <p className="font-bold">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                className="tap text-sm font-semibold text-accent"
                onClick={() => void markAllRead(uid, unreadIds)}
              >
                Mark all as read
              </button>
            )}
          </div>
          {recent.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">No notifications yet.</p>
          ) : (
            <ul>
              {recent.map((item) => (
                <li key={item.id}>
                  <Row item={item} onOpen={openItem} />
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/notifications"
            className="tap flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold hover:bg-subtle"
            onClick={() => setOpen(false)}
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
