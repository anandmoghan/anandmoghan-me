'use client';

import { ThemeToggle } from './ThemeToggle';

export function Navigation() {
  return (
    <nav className="site-nav" aria-label="Main">
      <div className="px-4 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="site-nav__brand tap">
              AM
            </a>
            <div className="flex items-center gap-1 sm:gap-2">
              <a href="/profile" className="site-nav__link">
                Profile
              </a>
              <a href="/posts" className="site-nav__link">
                Posts
              </a>
              <a href="/apps" className="site-nav__link">
                Apps
              </a>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
