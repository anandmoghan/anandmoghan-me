import { Navigation } from "@/common/components/Navigation";

export default function StaticPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="static-pages flex flex-col min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation />
      <main className="flex-1">
        {children}
      </main>
      <footer className="py-12 px-6 sm:px-8 lg:px-12" style={{ 
        backgroundColor: 'var(--foreground)',
        color: 'white'
      }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center gap-6">
            <div className="flex gap-6">
              <a 
                href="https://linkedin.com/in/anandmoghan" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:opacity-70 transition-opacity flex items-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                LinkedIn
              </a>
              <a 
                href="https://scholar.google.com/citations?user=D1KIt3cAAAAJ&hl=en" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:opacity-70 transition-opacity flex items-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 24a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-24L0 9.5l4.838 3.94A8 8 0 0 1 12 9a8 8 0 0 1 7.162 4.44L24 9.5z"/>
                </svg>
                Google Scholar
              </a>
            </div>
            <div className="text-center">
              <p className="text-sm opacity-70">
                © {new Date().getFullYear()} Anand Mohan. All rights reserved.
              </p>
              <p className="text-xs opacity-60 mt-2">
                Made with{' '}
                <a 
                  href="https://kiro.dev" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity underline"
                >
                  Kiro
                </a>
                {' '}❤️
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
