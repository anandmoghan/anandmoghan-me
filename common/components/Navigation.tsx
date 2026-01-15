'use client';

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md" style={{ 
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderBottom: '1px solid var(--border)',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
    }}>
      <div className="px-6 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between h-16">
            <a 
              href="/" 
              className="text-xl font-bold tracking-tight hover:opacity-80"
              style={{ color: 'var(--foreground)' }}
            >
              AM
            </a>
            <div className="flex items-center gap-8">
              <a 
                href="/profile" 
                className="text-sm font-medium hover:opacity-70 relative group"
                style={{ color: 'var(--accent)' }}
              >
                Profile
                <span className="absolute bottom-0 left-0 w-0 h-0.5 group-hover:w-full transition-all duration-300" style={{ backgroundColor: 'var(--primary)' }}></span>
              </a>
              <a 
                href="/posts" 
                className="text-sm font-medium hover:opacity-70 relative group"
                style={{ color: 'var(--accent)' }}
              >
                Posts
                <span className="absolute bottom-0 left-0 w-0 h-0.5 group-hover:w-full transition-all duration-300" style={{ backgroundColor: 'var(--primary)' }}></span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
