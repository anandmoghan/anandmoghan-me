'use client';

import Link from 'next/link';
import { useConsent } from '../ConsentProvider';
import { useReadingHistory } from './useReadingHistory';

const MAX_ITEMS = 3;

/** Static-build metadata of a published post, passed from the server component. */
export interface ReadNextPost {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  published: boolean;
  tags: { id: string; name: string }[];
}

interface ReadNextProps {
  currentTagIds: string[];
  /** Every other post (drafts only in development). */
  posts: ReadNextPost[];
}

function byRecency(a: ReadNextPost, b: ReadNextPost): number {
  return b.publishedAt.localeCompare(a.publishedAt);
}

/**
 * Up to three suggestions at the end of a post. With consent: posts the visitor has not opened,
 * ranked by tags shared with this post, then recency. Without: the most recent posts, and the
 * history is never read.
 */
export function ReadNext({ currentTagIds, posts }: ReadNextProps) {
  const { consent, loaded } = useConsent();
  const { reads, loading } = useReadingHistory();
  if (!loaded || loading) return null;

  let picks: ReadNextPost[];
  if (consent === 'granted') {
    const seen = new Set(reads.map((entry) => entry.slug));
    const shared = (post: ReadNextPost) => post.tags.filter((tag) => currentTagIds.includes(tag.id)).length;
    picks = posts
      .filter((post) => !seen.has(post.slug))
      .sort((a, b) => shared(b) - shared(a) || byRecency(a, b));
  } else {
    picks = [...posts].sort(byRecency);
  }
  picks = picks.slice(0, MAX_ITEMS);
  if (picks.length === 0) return null;

  return (
    <section className="mt-12" aria-label="Read next">
      <h2 className="section-title mb-4">Read next</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {picks.map((post) => (
          <Link key={post.slug} href={`/posts/${post.slug}`} className="card tap h-full">
            <article className="h-full flex flex-col">
              <div className="flex items-start gap-2 mb-2">
                {!post.published && <span className="badge badge--warn flex-shrink-0 mt-1">Draft</span>}
                <h3 className="text-lg font-extrabold leading-tight text-foreground">{post.title}</h3>
              </div>
              <p className="mb-3 text-sm leading-relaxed text-muted line-clamp-3">{post.excerpt}</p>
              <div className="flex flex-wrap gap-2 mt-auto">
                {post.tags.map((tag) => (
                  <span key={tag.id} className="badge">
                    {tag.name}
                  </span>
                ))}
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
