'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import PostCard from '@/common/components/PostCard';
import TagFilter from '@/common/components/TagFilter';
import Pagination from '@/common/components/Pagination';
import { ContinueReading } from '@/common/visitors/reads/ContinueReading';
import type { Post } from '@/common/types/post';

interface PostsClientProps {
  posts: Post[];
}

const POSTS_PER_PAGE = 9; // 3x3 grid

export default function PostsClient({ posts }: PostsClientProps) {
  const searchParams = useSearchParams();
  const showUnpublished = searchParams.get('unpublished') === 'true';
  
  // Filter posts based on published status
  const visiblePosts = useMemo(() => {
    return showUnpublished ? posts : posts.filter(post => post.published);
  }, [posts, showUnpublished]);

  const [filteredPosts, setFilteredPosts] = useState<Post[]>(visiblePosts);
  const [currentPage, setCurrentPage] = useState(1);

  // Update filtered posts when visibility changes
  useEffect(() => {
    setFilteredPosts(visiblePosts);
    setCurrentPage(1);
  }, [visiblePosts]);

  // Reset to page 1 when filtered posts change
  const handleFilteredPostsChange = (newFilteredPosts: Post[]) => {
    setFilteredPosts(newFilteredPosts);
    setCurrentPage(1);
  };

  // Calculate pagination
  const { paginatedPosts, totalPages } = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    
    return {
      paginatedPosts: filteredPosts.slice(startIndex, endIndex),
      totalPages: Math.ceil(filteredPosts.length / POSTS_PER_PAGE)
    };
  }, [filteredPosts, currentPage]);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-8">
        <div className="site-container">
          <h1 className="page-title mb-4">
            Posts
          </h1>
          <div className="accent-rule mb-4"></div>
          <p className="text-sm sm:text-base text-muted">
            Thoughts on AI, technology, and life
          </p>
          {showUnpublished && (
            <div className="badge badge--warn mt-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Showing unpublished posts
            </div>
          )}
        </div>
      </section>

      {/* Continue reading: renders only for visitors with consent and unfinished reads */}
      <div className="">
        <div className="site-container">
          <ContinueReading />
        </div>
      </div>

      {/* Tag Filter Section */}
      {visiblePosts.length > 0 && (
        <section className="pb-6">
          <div className="site-container">
            <TagFilter 
              posts={visiblePosts}
              onFilteredPostsChange={handleFilteredPostsChange}
            />
          </div>
        </section>
      )}

      {/* Posts Section */}
      <section className="pb-8">
        <div className="site-container">
          {filteredPosts.length === 0 && visiblePosts.length > 0 ? (
            <div className="card p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center bg-subtle text-accent">
                <svg 
                  width="28" 
                  height="28" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-extrabold mb-2 text-foreground">
                No posts found
              </h2>
              <p className="text-sm max-w-2xl mx-auto leading-relaxed text-muted">
                No posts match the selected tags. Try adjusting your filter or clearing all tags.
              </p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center bg-subtle text-accent">
                <svg 
                  width="28" 
                  height="28" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-xl font-extrabold mb-2 text-foreground">
                Coming Soon
              </h2>
              <p className="text-sm max-w-2xl mx-auto leading-relaxed text-muted">
                Posts will appear here. Stay tuned for insights on AI research,
                technology trends, and life experiences.
              </p>
            </div>
          ) : (
            <>
              {/* Posts grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                {paginatedPosts.map(post => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />

              {/* Results summary */}
              {filteredPosts.length > POSTS_PER_PAGE && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted">
                    Showing {((currentPage - 1) * POSTS_PER_PAGE) + 1} to {Math.min(currentPage * POSTS_PER_PAGE, filteredPosts.length)} of {filteredPosts.length} posts
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}