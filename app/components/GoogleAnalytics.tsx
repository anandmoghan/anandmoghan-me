'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { useConsent } from '@/common/visitors/ConsentProvider';

// Loads GA only after the visitor accepts analytics in the consent banner. Declining later
// sets GA's opt-out flag, which stops a script that is already loaded.
export default function GoogleAnalytics({ gaId }: { gaId: string }) {
  const { consent } = useConsent();

  useEffect(() => {
    const flags = window as unknown as Record<string, boolean>;
    flags[`ga-disable-${gaId}`] = consent !== 'granted';
  }, [consent, gaId]);

  if (consent !== 'granted') return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
