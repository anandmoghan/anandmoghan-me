'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackRedirectSource } from '@/common/utils/analytics';

/**
 * Tracks redirect source from UTM parameters
 */
export default function RedirectTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const utmSource = searchParams.get('utm_source');
    if (utmSource) {
      trackRedirectSource(utmSource);
    }
  }, [searchParams]);

  return null;
}
