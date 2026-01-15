import Link from 'next/link';
import type { Post } from '../types/post';
import { InlineTagList } from './TagList';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <Link href={`/posts/${post.slug}`} className="block">
      <article className="h-full p-5 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md" style={{
        backgroundColor: 'white',
        border: '1px solid var(--border)',
      }}>
        <h2 className="text-xl font-bold mb-2 leading-tight" style={{ 
          color: 'var(--foreground)'
        }}>
          {post.title}
        </h2>
        
        <p className="mb-3 text-sm leading-relaxed" style={{ 
          color: 'var(--muted)',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {post.excerpt}
        </p>

        <div className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--muted)' }}>
          <time dateTime={post.publishedAt.toISOString()}>
            {post.publishedAt.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </time>
          <span>•</span>
          <span>{post.metadata.readingTime} min read</span>
          {post.metadata.hasFormulas && (
            <>
              <span>•</span>
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
