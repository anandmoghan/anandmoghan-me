'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { API_BASE, getDb } from '@/common/firebase/client';

const formatter = new Intl.NumberFormat('en-US');

/** Counts this tab's first visit to the post, at most once per tab session. */
async function countView(slug: string): Promise<void> {
  const key = `post-view:${slug}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    await fetch(`${API_BASE}/views/${slug}`, { method: 'POST', keepalive: true });
  } catch {
    // Counting is best effort; the stored count is still shown.
  }
}

/**
 * "N views" for the post header meta line. Counts the visit (POST /api/views/:slug, no auth, no
 * cookie), then reads the public postStats/{slug}. Renders nothing until the count is known and
 * when anything fails.
 */
export function PostViews({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await countView(slug);
      try {
        const snap = await getDoc(doc(getDb(), 'postStats', slug));
        const count = snap.get('views');
        if (!cancelled && typeof count === 'number') setViews(count);
      } catch {
        // No count to show.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (views === null) return null;
  return <span>{views === 1 ? '1 view' : `${formatter.format(views)} views`}</span>;
}
