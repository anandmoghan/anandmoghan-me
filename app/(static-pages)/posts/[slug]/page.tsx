import { getAllPosts, getPostBySlug } from '@/common/utils/post';
import { compile } from '@mdx-js/mdx';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeHeadingIds from '@/common/utils/rehype-heading-ids';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import { run } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import CodeBlock from '@/common/components/CodeBlock';
import TableOfContents from '@/common/components/TableOfContents';
import type { Metadata } from 'next';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map(post => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found"
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://anandmoghan.me';
  const postUrl = `${baseUrl}/posts/${slug}`;

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: postUrl,
      siteName: "Anand Mohan",
      locale: "en_US",
      type: "article",
      publishedTime: post.publishedAt.toISOString(),
      authors: ["Anand Mohan"],
      tags: post.tags.map(tag => tag.name),
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: "Anand Mohan - Applied Scientist at Amazon AGI",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      creator: "@anandmoghan",
      images: [`${baseUrl}/og-image.png`],
    },
    alternates: {
      canonical: postUrl
    }
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const compiled = await compile(post.content, {
    outputFormat: 'function-body',
    remarkPlugins: [remarkMath, remarkGfm],
    rehypePlugins: [rehypeKatex, rehypeHighlight, rehypeHeadingIds],
  });

  const { default: Content } = await run(compiled, {
    ...runtime,
    baseUrl: import.meta.url,
  } as any);

  // Custom components for MDX
  const components = {
    pre: (props: any) => (
      <div style={{ margin: '1em 0' }}>
        <CodeBlock {...props} />
      </div>
    ),
    img: (props: any) => (
      <span style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '2rem auto',
        maxWidth: '800px'
      }}>
        <img
          {...props}
          style={{
            maxWidth: '100%',
            maxHeight: '600px',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
        />
        {props.alt && (
          <span style={{ 
            display: 'block',
            marginTop: '0.75rem', 
            textAlign: 'center', 
            fontSize: '0.875rem', 
            fontStyle: 'italic',
            color: 'var(--muted)',
            maxWidth: '90%'
          }}>
            {props.alt}
          </span>
        )}
      </span>
    ),
    table: (props: any) => (
      <div className="table-wrapper">
        <table {...props} />
      </div>
    ),
    a: (props: any) => (
      <a {...props} 
        target="_blank"
        rel="noopener noreferrer"
        style={{
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          ...props.style
        }} 
      />
    ),
  };

  return (
    <main className="min-h-screen">
      {/* Header Section */}
      <section className="relative py-8 px-6 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10" style={{
          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
        }}></div>
        <div className="max-w-7xl mx-auto">
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
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight" style={{ color: 'var(--foreground)' }}>
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

      {/* Content Section with TOC */}
      <section className="pb-8 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-8 items-start">
            {/* Main Content */}
            <div className="flex-1 min-w-0 overflow-x-hidden">
              <div className="p-4 sm:p-6 lg:p-8 rounded-lg shadow-sm prose prose-lg" style={{
                backgroundColor: 'white',
                border: '1px solid var(--border)',
                maxWidth: 'none'
              }}>
                <Content components={components} />
              </div>
            </div>
            
            {/* Table of Contents */}
            <TableOfContents content={post.content} />
          </div>
        </div>
      </section>
    </main>
  );
}
