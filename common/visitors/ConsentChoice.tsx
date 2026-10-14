'use client';

import { useConsent } from './ConsentProvider';

const LABEL = {
  granted: 'You accepted analytics.',
  denied: 'You declined analytics.',
} as const;

// Privacy page: shows the current analytics choice and lets the visitor change it.
export function ConsentChoice() {
  const { consent, loaded, choose } = useConsent();
  if (!loaded) return null;

  return (
    <div className="card card--compact flex flex-col gap-3 sm:flex-row sm:items-center">
      <p className="flex-1 text-sm">{consent ? LABEL[consent] : 'You have not chosen yet.'}</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn--sm"
          aria-pressed={consent === 'denied'}
          onClick={() => choose('denied')}
        >
          Decline
        </button>
        <button
          type="button"
          className="btn btn--sm btn--primary"
          aria-pressed={consent === 'granted'}
          onClick={() => choose('granted')}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
