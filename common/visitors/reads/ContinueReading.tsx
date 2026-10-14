'use client';

import Link from 'next/link';
import { FINISHED, readHref } from './reads';
import { useReadingHistory } from './useReadingHistory';

const MAX_ITEMS = 3;

/**
 * Up to three unfinished reads, each linking to the heading the visitor stopped at. Renders
 * nothing without consent, while loading, or when there is nothing to continue.
 */
export function ContinueReading() {
  const { reads, loading } = useReadingHistory();
  const unfinished = reads.filter((entry) => entry.progress < FINISHED).slice(0, MAX_ITEMS);
  if (loading || unfinished.length === 0) return null;

  return (
    <section className="card space-y-3 mb-6" aria-label="Continue reading">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Continue reading</h2>
      <ul className="space-y-2">
        {unfinished.map((entry) => (
          <li key={entry.slug} className="flex items-baseline justify-between gap-3">
            <Link href={readHref(entry)} className="font-semibold underline">
              {entry.title}
            </Link>
            <span className="badge shrink-0">{Math.round(entry.progress * 100)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
