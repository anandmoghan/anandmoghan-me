import { getAllPosts } from '@/common/utils/post';
import PostCard from '@/common/components/PostCard';
import TerminalAnimation from '@/common/components/TerminalAnimation';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Anand Mohan is an Applied Scientist at Amazon AGI specializing in Speech-to-Speech LLMs, incremental learning, and multilingual speech recognition. M.Tech from IISc Bangalore, B.Tech from NIT Calicut. Based in United Kingdom with expertise in AI research and machine learning.',
  keywords: 'Anand Mohan, Anand Mohan Amazon, Anand Mohan AI, Anand Mohan IISc, Anand Mohan NITC, Anand Mohan UK, Amazon AGI, Applied Scientist, AI Scientist, Speech Recognition, Machine Learning, Speech-to-Speech LLM, ASR Systems, Federated Learning, AI Research, Indian Institute of Science, NIT Calicut',
  openGraph: {
    title: 'Anand Mohan - Applied Scientist at Amazon AGI',
    description: 'Applied Scientist specializing in Speech-to-Speech LLMs and AI research at Amazon AGI. IISc & NIT Calicut alumnus based in UK.',
    type: 'website',
    url: 'https://anandmoghan.me',
    siteName: 'Anand Mohan',
  },
  alternates: {
    canonical: 'https://anandmoghan.me'
  }
};

export default function Home() {
  const allPosts = getAllPosts();
  const recentPosts = allPosts.slice(0, 3); // Show 3 most recent posts

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-8 px-6 sm:px-8 lg:px-12" itemScope itemType="https://schema.org/Person">
        <div className="absolute inset-0 -z-10" style={{
          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
        }}></div>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 leading-tight" style={{ color: 'var(--foreground)' }} itemProp="name">
            Anand Mohan
          </h1>
          <div className="w-20 h-1 rounded-full mb-4" style={{ backgroundColor: 'var(--accent)' }}></div>
          <p className="text-base sm:text-lg font-semibold mb-2" style={{ color: 'var(--accent)' }} itemProp="jobTitle">
            Applied Scientist, <span itemProp="worksFor" itemScope itemType="https://schema.org/Organization"><span itemProp="name">Amazon AGI</span></span>
          </p>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--muted)' }} itemProp="description">
            Advancing Speech-to-Speech LLMs and continual learning for next-generation AI systems.
          </p>
          <meta itemProp="url" content="https://anandmoghan.me" />
          <meta itemProp="knowsAbout" content="Artificial Intelligence" />
          <meta itemProp="knowsAbout" content="Machine Learning" />
          <meta itemProp="knowsAbout" content="Speech Recognition" />
        </div>
      </section>

      {/* Terminal Section */}
      <section className="pb-8 px-6 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <TerminalAnimation className="w-full" />
          <noscript>
            <div className="p-6 rounded-lg" style={{ backgroundColor: '#1a1a1a', color: '#e2e8f0' }}>
              <p className="mb-4">Applied Scientist at Amazon AGI specializing in Speech-to-Speech LLMs and incremental learning.</p>
              <p className="mb-4">With 5+ years at Amazon and M.Tech in AI from Indian Institute of Science, I've published 6+ papers in top conferences like ICASSP and INTERSPEECH.</p>
              <p>Based in United Kingdom, working on the future of AI communication.</p>
            </div>
          </noscript>
        </div>
      </section>

      {/* Recent Posts Section */}
      <section className="py-8 px-6 sm:px-8 lg:px-12" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Recent Posts
            </h2>
            {allPosts.length > 3 && (
              <Link 
                href="/posts"
                className="text-sm font-medium hover:opacity-70 transition-opacity"
                style={{ color: 'var(--accent)' }}
              >
                View all posts →
              </Link>
            )}
          </div>
          
          {recentPosts.length === 0 ? (
            <div className="p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300" style={{ 
              backgroundColor: 'white',
              border: '1px solid var(--border)'
            }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Posts coming soon. Stay tuned for insights on AI research, technology, and life experiences.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentPosts.map(post => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
