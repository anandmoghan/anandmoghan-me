'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/common/firebase/AuthProvider';
import { useConsent } from './ConsentProvider';
import { logVisit } from './api';

const SESSION_KEY = 'visitSessionId';
// The admin panel's own page views would only skew the dashboard.
const SKIP_PREFIX = '/apps/admin';

// One id per browser tab session, so the dashboard can tell returning visitors apart.
function sessionId(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

// Logs a page view on every route change once analytics consent is recorded. The first view
// sends document.referrer; later ones send the previous in-site path.
export function VisitLogger() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { analyticsReady } = useConsent();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!analyticsReady || !user || !pathname || pathname === lastPath.current) return;
    const referrer = lastPath.current ?? (document.referrer || null);
    lastPath.current = pathname;
    if (pathname.startsWith(SKIP_PREFIX)) return;
    logVisit(user, { path: pathname, referrer, sessionId: sessionId() }).catch((err) =>
      console.warn('Visit not logged', err),
    );
  }, [analyticsReady, user, pathname]);

  return null;
}
