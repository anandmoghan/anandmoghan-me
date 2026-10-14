'use client';

import Link from 'next/link';
import { useConsent } from './ConsentProvider';

// Small site-wide bar at the bottom until the visitor accepts or declines analytics.
export function ConsentBanner() {
  const { consent, loaded, choose } = useConsent();
  if (!loaded || consent) return null;

  return (
    <div
      role="region"
      aria-label="Analytics consent"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl print:hidden"
    >
      <div className="card card--compact flex flex-col gap-3 shadow-lg sm:flex-row sm:items-center">
        <p className="flex-1 text-sm">
          May I record the pages you visit and your country, and use Google Analytics?
          {' '}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="btn btn--sm" onClick={() => choose('denied')}>
            Decline
          </button>
          <button type="button" className="btn btn--sm btn--primary" onClick={() => choose('granted')}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
