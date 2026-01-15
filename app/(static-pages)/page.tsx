export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-8 px-6 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10" style={{
          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
        }}></div>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 leading-tight" style={{ color: 'var(--foreground)' }}>
            Anand Mohan
          </h1>
          <div className="w-20 h-1 rounded-full mb-4" style={{ backgroundColor: 'var(--accent)' }}></div>
          <p className="text-base sm:text-lg font-semibold mb-2" style={{ color: 'var(--accent)' }}>
            AI Scientist at Amazon
          </p>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            Exploring the frontiers of artificial intelligence and machine learning.
            Building innovative solutions that shape the future of technology.
          </p>
        </div>
      </section>

      {/* About Section */}
      <section className="pb-8 px-6 sm:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            About
          </h2>
          <div className="p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300" style={{ 
            backgroundColor: 'white',
            border: '1px solid var(--border)'
          }}>
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--foreground)' }}>
              Welcome to my digital home. This is where I share my work in AI research,
              thoughts on technology, and glimpses of life in the UK with Kavya and Nila.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              I'm passionate about pushing the boundaries of what's possible with artificial
              intelligence and making complex technology accessible and impactful.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Posts Section */}
      <section className="pb-8 px-6 sm:px-8 lg:px-12" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Recent Posts
          </h2>
          <div className="p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300" style={{ 
            backgroundColor: 'white',
            border: '1px solid var(--border)'
          }}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Posts coming soon. Stay tuned for insights on AI research, technology, and life experiences.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
