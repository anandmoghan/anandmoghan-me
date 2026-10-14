import { getAllPosts, getPostBySlug } from '@/common/utils/post';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import CodeCopyButtons from '@/common/components/CodeCopyButtons';
import TableOfContents from '@/common/components/TableOfContents';
import { PostViews } from '@/common/posts/PostViews';
import PrintButton from '@/common/components/PrintButton';
import { PostComments } from '@/common/visitors/comments/PostComments';
import { ReadingTracker } from '@/common/visitors/reads/ReadingTracker';
import { ReadNext, type ReadNextPost } from '@/common/visitors/reads/ReadNext';
import type { Metadata } from 'next';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  // Generate paths for all posts (including unpublished) so they're accessible with the URL param
  const posts = getAllPosts(true);
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

  // Add noindex for unpublished posts
  const robotsConfig = post.published 
    ? undefined 
    : { index: false, follow: false };

  return {
    title: post.title,
    description: post.excerpt,
    robots: robotsConfig,
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

  // Small static list for Read next; the client ranks it against the visitor's history.
  const readNextPosts: ReadNextPost[] = getAllPosts()
    .filter(other => other.slug !== post.slug)
    .map(other => ({
      slug: other.slug,
      title: other.title,
      excerpt: other.excerpt,
      publishedAt: other.publishedAt.toISOString(),
      published: other.published,
      tags: other.tags.map(tag => ({ id: tag.id, name: tag.name })),
    }));

  return (
    <main className="min-h-screen">
      {/* Header Section */}
      <section className="post-header py-8">
        <div className="site-container">

          {!post.published && (
            <div className="mb-3">
              <span className="badge badge--warn">
                Draft
              </span>
            </div>
          )}

          <h1 className="page-title mb-4">
            {post.title}
          </h1>
          <div className="accent-rule mb-4"></div>

          <div className="meta-line mb-3">
            <time dateTime={post.publishedAt.toISOString()}>
              {post.publishedAt.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            <span>{post.metadata.readingTime} min read</span>
            <span>{post.metadata.wordCount} words</span>
            {post.published && <PostViews slug={post.slug} />}
          </div>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <span
                  key={tag.id}
                  className="badge tag-color"
                  style={{ '--tag': tag.color } as React.CSSProperties}
                  title={tag.description}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <Link
              href="/posts"
              className="btn btn--outline btn--sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Posts
            </Link>
            <PrintButton />
          </div>
        </div>
      </section>

      {/* Content Section with TOC */}
      <section className="py-8">
        <div className="site-container">
          <div className="flex gap-8 items-start">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <article
                id="post-body"
                className="prose"
                dangerouslySetInnerHTML={{ __html: post.html }}
              />
              <CodeCopyButtons containerId="post-body" />
              {post.published && (
                <>
                  <ReadingTracker slug={post.slug} title={post.title} container="#post-body" />
                  <ReadNext currentTagIds={post.tags.map(tag => tag.id)} posts={readNextPosts} />
                  <PostComments slug={post.slug} />
                </>
              )}
            </div>

            {/* Table of Contents */}
            <TableOfContents headings={post.headings} />
          </div>
        </div>
      </section>
    </main>
  );
}
