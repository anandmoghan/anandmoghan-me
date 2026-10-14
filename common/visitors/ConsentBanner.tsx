'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/common/firebase/AuthProvider';
import { useConsent } from './ConsentProvider';

// First-visit welcome card with the cookie choice. A small corner card, not a modal: no overlay,
// no focus trap, no scroll lock, so the page stays readable and usable underneath (blocking
// interstitials hurt usability and search ranking). Shown until the visitor chooses; both choices
// carry equal weight, and the footer's "Cookie settings" link (privacy page) changes it later.
export function ConsentBanner() {
  const { consent, loaded, choose } = useConsent();
  const { isAnonymous, displayName } = useAuth();
  const pathname = usePathname();
  if (!loaded || consent) return null;

  return (
    <aside
      aria-label="Welcome"
      className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:left-4 sm:bottom-4 sm:max-w-sm print:hidden"
    >
      <div className="card card--compact flex flex-col gap-3 shadow-lg">
        <p className="text-sm">
          {isAnonymous ? (
            <>
              Welcome. You are browsing as{' '}
              {displayName ? <span className="font-bold">{displayName}</span> : 'a guest'}.
              {pathname !== '/login' && (
                <>
                  {' '}
                  <Link
                    href={`/login?return=${encodeURIComponent(pathname)}`}
                    className="underline underline-offset-2"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              Welcome back
              {displayName ? (
                <>
                  , <span className="font-bold">{displayName}</span>
                </>
              ) : null}
              .
            </>
          )}
        </p>
        <p className="text-sm">
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
    </aside>
  );
}
