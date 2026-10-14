'use client';

import { useEffect, useRef } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDb } from '@/common/firebase/client';
import { useAuth } from '@/common/firebase/AuthProvider';
import { useConsent } from '../ConsentProvider';
import { readDocId } from './reads';

interface ReadingTrackerProps {
  /** Post slug, or materials:<page>[/<chapter>]. */
  slug: string;
  title: string;
  /** CSS selector of the element whose scroll extent counts as the whole read. */
  container: string;
}

const STEP = 0.25;
// Opening a page and leaving at once is not a read.
const MIN_PROGRESS = 0.02;

function scrollFraction(el: HTMLElement): number {
  const top = el.getBoundingClientRect().top + window.scrollY;
  const seen = window.scrollY + window.innerHeight - top;
  return Math.min(1, Math.max(0, seen / el.offsetHeight));
}

// The h2/h3 in view: the last one whose top has passed 120px below the viewport top. Section
// h2s carry no id of their own, so they use the id of their section.
function headingInView(el: HTMLElement): string {
  let current = '';
  for (const heading of el.querySelectorAll<HTMLElement>('h2, h3')) {
    if (heading.getBoundingClientRect().top > 120) break;
    current = heading.id || heading.closest('section')?.id || current;
  }
  return current;
}

/**
 * Records how far the visitor got in the container (max scroll fraction) and the heading in
 * view, on every 25% step and when they leave. Renders nothing; does nothing without consent.
 */
export function ReadingTracker({ slug, title, container }: ReadingTrackerProps) {
  const { user } = useAuth();
  const { consent } = useConsent();
  const uid = user?.uid ?? null;
  const enabled = consent === 'granted' && !!uid;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled || !uid) return;
    const ref = doc(getDb(), 'users', uid, 'reads', readDocId(slug));
    let best = 0;
    let heading = '';
    let written = { progress: -1, heading: '' };
    let stored = 0;
    let ready = false;
    let frame = 0;

    const flush = () => {
      if (!enabledRef.current || !ready) return;
      const progress = Math.max(best, stored);
      if (best < MIN_PROGRESS || (progress === written.progress && heading === written.heading)) return;
      written = { progress, heading };
      setDoc(ref, {
        slug,
        title,
        lastReadAt: serverTimestamp(),
        progress,
        lastHeadingId: heading,
      }).catch((err) => console.error('Saving reading progress failed', err));
    };

    const update = () => {
      frame = 0;
      const el = document.querySelector<HTMLElement>(container);
      if (!el) return;
      best = Math.max(best, scrollFraction(el));
      heading = headingInView(el);
      if (Math.floor(best / STEP) > Math.floor(Math.max(written.progress, 0) / STEP)) flush();
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        update();
        flush();
      }
    };

    // Never lower an earlier, deeper read.
    getDoc(ref)
      .then((snap) => {
        stored = Number(snap.get('progress') ?? 0);
        written.progress = stored;
        ready = true;
        update();
      })
      .catch((err) => console.error('Loading reading progress failed', err));

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      if (frame) window.cancelAnimationFrame(frame);
      update();
      flush();
    };
  }, [enabled, uid, slug, title, container]);

  return null;
}
