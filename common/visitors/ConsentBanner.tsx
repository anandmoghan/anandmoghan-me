'use client';

import Link from 'next/link';
import { useConsent } from './ConsentProvider';

// Shown once until the visitor chooses; both choices carry equal weight, and the footer's
// "Cookie settings" link (privacy page) lets them change their mind later.
export function ConsentBanner() {
  const { consent, loaded, choose } = useConsent();
  if (!loaded || consent) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookies"
      aria-describedby="consent-body"
      className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:left-4 sm:bottom-4 sm:max-w-sm print:hidden"
    >
      <div className="card card--compact flex flex-col gap-3 shadow-lg">
        <p id="consent-body" className="text-sm">
          I use cookies to personalise your reading and see what is useful.{' '}
          <Link href="/privacy#analytics" className="underline underline-offset-2">
            Learn more
          </Link>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn--outline btn--sm" onClick={() => choose('denied')}>
            Reject
          </button>
          <button type="button" className="btn btn--outline btn--sm" onClick={() => choose('granted')}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
