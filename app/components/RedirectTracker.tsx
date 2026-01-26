'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackRedirectSource } from '@/common/utils/analytics';

/**
 * Tracks redirect source from UTM parameters and ref parameter
 */
export default function RedirectTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track UTM source
    const utmSource = searchParams.get('utm_source');
    if (utmSource) {
      trackRedirectSource(utmSource, 'utm');
    }

    // Track ref parameter
    const ref = searchParams.get('ref');
    if (ref) {
      trackRedirectSource(ref, 'ref');
    }
  }, [searchParams]);

  return null;
}
