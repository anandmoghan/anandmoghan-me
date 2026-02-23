import { getAllPosts } from '@/common/utils/post';
import PostsClient from './PostsClient';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: "Posts",
  description: "Technical blog posts on AI, machine learning, speech recognition, and deep learning by Anand Mohan. Topics include attention mechanisms, transformers, ASR systems, and production ML.",
  openGraph: {
    title: "Posts - Anand Mohan",
    description: "Technical blog posts on AI, machine learning, speech recognition, and deep learning.",
    url: "https://anandmoghan.me/posts",
    siteName: "Anand Mohan",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Posts - Anand Mohan",
    description: "Technical blog posts on AI, machine learning, speech recognition, and deep learning.",
  },
  alternates: {
    canonical: "https://anandmoghan.me/posts"
  }
};

export default function PostsPage() {
  // Get all posts including unpublished ones
  // The client component will handle filtering based on URL params
  const allPosts = getAllPosts(true);

  return (
    <Suspense fallback={<div>Loading posts...</div>}>
      <PostsClient posts={allPosts} />
    </Suspense>
  );
}
