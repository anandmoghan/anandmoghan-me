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
    const utmSource = searchParams.get('utm_source');
    const ref = searchParams.get('ref');
    
    const source = ref || utmSource;
    if (source) {
      trackRedirectSource(source);
    }
  }, [searchParams]);

  return null;
}
