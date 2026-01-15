import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import type { Post as PostType } from '../types/post';

interface PostProps {
  post: PostType;
  mdxSource: MDXRemoteSerializeResult;
}

export default function Post({ post, mdxSource }: PostProps) {
  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-foreground">
          {post.title}
        </h1>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <time dateTime={post.publishedAt.toISOString()}>
            {post.publishedAt.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          <span>•</span>
          <span>{post.metadata.readingTime} min read</span>
          <span>•</span>
          <span>{post.metadata.wordCount} words</span>
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span
                key={tag.id}
                className="px-3 py-1 text-xs rounded-full"
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <MDXRemote {...mdxSource} />
      </div>
    </article>
  );
}
