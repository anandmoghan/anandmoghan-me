'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { useConsent } from '@/common/visitors/ConsentProvider';

// Loads GA only after the visitor accepts analytics in the consent banner. Declining later
// sets GA's opt-out flag, which stops a script that is already loaded. The gtag queue is set up
// here rather than in an inline script, so the Content-Security-Policy needs no inline hash.
export default function GoogleAnalytics({ gaId }: { gaId: string }) {
  const { consent } = useConsent();

  useEffect(() => {
    const flags = window as unknown as Record<string, boolean>;
    flags[`ga-disable-${gaId}`] = consent !== 'granted';
    if (consent !== 'granted' || window.gtag) return;
    const dataLayer = (window.dataLayer = window.dataLayer ?? []);
    window.gtag = function gtag() {
      // gtag.js reads the Arguments object itself, not an array copy of it.
      dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', gaId, { page_path: window.location.pathname });
  }, [consent, gaId]);

  if (consent !== 'granted') return null;

  return <Script strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />;
}
