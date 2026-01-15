import { getAllPosts } from '@/common/utils/post';
import PostCard from '@/common/components/PostCard';

export default function PostsPage() {
  const posts = getAllPosts();

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-8 px-6 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10" style={{
          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
        }}></div>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl sm:text-6xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Posts
          </h1>
          <div className="w-20 h-1 rounded-full mb-4" style={{ backgroundColor: 'var(--accent)' }}></div>
          <p className="text-sm sm:text-base" style={{ color: 'var(--muted)' }}>
            Thoughts on AI, technology, and life
          </p>
        </div>
      </section>

      {/* Posts Section */}
      <section className="pb-8 px-6 sm:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          {posts.length === 0 ? (
            <div className="p-10 rounded-lg shadow-sm text-center" style={{ 
              backgroundColor: 'white',
              border: '1px solid var(--border)'
            }}>
              <div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg)' }}>
                <svg 
                  width="28" 
                  height="28" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor"
                  style={{ color: 'var(--accent)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                Coming Soon
              </h2>
              <p className="text-sm max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--muted)' }}>
                Posts will appear here. Stay tuned for insights on AI research,
                technology trends, and life experiences.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map(post => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
