import Link from 'next/link';
import type { Post } from '../types/post';

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
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span
                key={tag.id}
                className="px-2 py-1 text-xs font-medium rounded"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--accent)',
                  border: '1px solid var(--border)'
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </article>
    </Link>
  );
}
