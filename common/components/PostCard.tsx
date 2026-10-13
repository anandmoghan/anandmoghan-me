import Link from 'next/link';
import type { Post } from '../types/post';
import { InlineTagList } from './TagList';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <Link href={`/posts/${post.slug}`} className="card tap h-full">
      <article className="h-full flex flex-col">
        <div className="flex items-start gap-2 mb-2">
          {!post.published && (
            <span className="badge badge--warn flex-shrink-0 mt-1">
              Draft
            </span>
          )}
          <h2 className="text-xl font-extrabold leading-tight text-foreground">
            {post.title}
          </h2>
        </div>

        <p className="mb-3 text-sm leading-relaxed text-muted line-clamp-3">
          {post.excerpt}
        </p>

        <div className="meta-line text-xs mb-3 mt-auto">
          <time dateTime={post.publishedAt.toISOString()}>
            {post.publishedAt.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </time>
          <span>{post.metadata.readingTime} min read</span>
          {post.metadata.hasFormulas && (
            <>
              <span className="inline-flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Math
              </span>
            </>
          )}
        </div>

        <InlineTagList tags={post.tags} size="sm" />
      </article>
    </Link>
  );
}
