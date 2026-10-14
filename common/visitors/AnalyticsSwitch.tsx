'use client';

import Link from 'next/link';
import { useConsent } from './ConsentProvider';

// The analytics on/off row shared by Settings and the privacy page. Render it inside a
// `.card.settings-rows`.
export function AnalyticsSwitch({ linkToPrivacy = false }: { linkToPrivacy?: boolean }) {
  const { consent, loaded, choose } = useConsent();

  return (
    <div className="settings-row">
      <div className="min-w-0">
        <p className="font-semibold">Analytics</p>
        <p className="text-sm text-muted break-words">
          {consent
            ? 'Page visits and Google Analytics, only while this is on.'
            : 'Nothing is recorded until you turn this on.'}
          {linkToPrivacy && (
            <>
              {' '}
              <Link href="/privacy#analytics" className="underline underline-offset-2">
                What is recorded
              </Link>
            </>
          )}
        </p>
      </div>
      <div className="settings-row__control">
        {loaded && (
          <button
            type="button"
            role="switch"
            aria-checked={consent === 'granted'}
            aria-label="Analytics"
            onClick={() => choose(consent === 'granted' ? 'denied' : 'granted')}
            className="switch"
          />
        )}
      </div>
    </div>
  );
}
