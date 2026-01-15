export default function AboutPage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-8 px-6 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10" style={{
          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
        }}></div>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl sm:text-6xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            About Me
          </h1>
          <div className="w-20 h-1 rounded-full mb-4" style={{ backgroundColor: 'var(--accent)' }}></div>
          <p className="text-sm sm:text-base" style={{ color: 'var(--muted)' }}>
            AI Scientist, researcher, and technology enthusiast
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="pb-8 px-6 sm:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
            <div className="p-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-300" style={{ 
              backgroundColor: 'white',
              border: '1px solid var(--border)'
            }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: 'var(--primary)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                  Professional
                </h2>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                I'm Anand Mohan, an AI Scientist at Amazon working on cutting-edge
                machine learning and artificial intelligence research. My work focuses on
                developing innovative solutions that push the boundaries of what's possible
                with AI technology.
              </p>
            </div>

            <div className="p-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-300" style={{ 
              backgroundColor: 'white',
              border: '1px solid var(--border)'
            }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: 'var(--primary)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                  Personal
                </h2>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                Based in the UK with my family - Kavya and Nila - I balance my
                professional work in AI with personal interests in technology,
                science, and family life. This platform serves as a bridge between
                my professional pursuits and personal journey.
              </p>
            </div>

            <div className="p-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-300" style={{ 
              backgroundColor: 'white',
              border: '1px solid var(--border)'
            }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: 'var(--primary)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                  This Platform
                </h2>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                This digital space serves as both my professional portfolio and a personal
                space to share thoughts, research, and experiences. Here you'll find insights
                on AI research, technology trends, and glimpses into life as a scientist
                and family person in the UK.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
