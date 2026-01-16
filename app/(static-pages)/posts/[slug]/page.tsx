import { getAllPosts, getPostBySlug } from '@/common/utils/post';
import { compile } from '@mdx-js/mdx';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';
import { run } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map(post => ({
    slug: post.slug,
  }));
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const compiled = await compile(post.content, {
    outputFormat: 'function-body',
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex, rehypeHighlight],
  });

  const { default: Content } = await run(compiled, runtime as any);

  return (
    <main className="min-h-screen">
      {/* Header Section */}
      <section className="relative py-8 px-6 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10" style={{
          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
        }}></div>
        <div className="max-w-6xl mx-auto">
          <Link 
            href="/posts" 
            className="inline-flex items-center gap-2 mb-6 text-sm font-medium transition-colors hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Posts
          </Link>
          
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 leading-tight" style={{ color: 'var(--foreground)' }}>
            {post.title}
          </h1>
          <div className="w-20 h-1 rounded-full mb-4" style={{ backgroundColor: 'var(--accent)' }}></div>
          
          <div className="flex items-center gap-3 text-sm mb-3" style={{ color: 'var(--muted)' }}>
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
                  className="px-3 py-1 text-sm font-medium rounded-full"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                    border: `1px solid ${tag.color}40`
                  }}
                  title={tag.description}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Content Section */}
      <section className="pb-8 px-6 sm:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="p-6 sm:p-8 rounded-lg shadow-sm prose prose-lg" style={{
            backgroundColor: 'white',
            border: '1px solid var(--border)',
            maxWidth: 'none'
          }}>
            <Content />
          </div>
        </div>
      </section>
    </main>
  );
}
