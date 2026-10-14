import { getAllPosts } from '@/common/utils/post';
import PostCard from '@/common/components/PostCard';
import TerminalAnimation from '@/common/components/TerminalAnimation';
import { ContinueReading } from '@/common/visitors/reads/ContinueReading';
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
        <div className="max-w-7xl mx-auto">
          <h1 className="page-title mb-4" itemProp="name">
            Anand Mohan
          </h1>
          <div className="accent-rule mb-4"></div>
          <p className="text-base sm:text-lg font-bold mb-2 text-accent" itemProp="jobTitle">
            Applied Scientist, <span itemProp="worksFor" itemScope itemType="https://schema.org/Organization"><span itemProp="name">Amazon AGI</span></span>
          </p>
          <p className="text-sm sm:text-base leading-relaxed text-muted" itemProp="description">
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

      {/* Continue reading: renders only for visitors with consent and unfinished reads */}
      <div className="px-6 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <ContinueReading />
        </div>
      </div>

      {/* Recent Posts Section */}
      <section className="py-8 px-6 sm:px-8 lg:px-12 border-t border-border bg-subtle">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">
              Recent Posts
            </h2>
            {allPosts.length > 3 && (
              <Link 
                href="/posts"
                className="btn btn--ghost text-accent"
              >
                View all posts →
              </Link>
            )}
          </div>
          
          {recentPosts.length === 0 ? (
            <div className="card">
              <p className="text-sm text-muted">
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
