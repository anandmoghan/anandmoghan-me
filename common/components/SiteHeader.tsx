'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/common/firebase/AuthProvider';
import { ThemeToggle } from './ThemeToggle';
import { ProfileMenu } from '@/common/apps/components/ProfileMenu';
import { apps } from '@/common/apps/registry';

const SHARE_PATH = '/apps/share';

const SECTION_LABEL: Record<string, string> = {
  posts: 'Posts',
  profile: 'Profile',
  privacy: 'Privacy',
  media: 'Media',
  apps: 'Apps',
  login: 'Sign in',
  account: 'Account',
};

const NAV_LINKS = [
  { href: '/posts', label: 'Posts' },
  { href: '/apps', label: 'Apps' },
  { href: '/profile', label: 'Profile' },
];

// One label after the AM brand: the app when inside one, else the top-level section.
function sectionFor(pathname: string): { href: string; label: string } | null {
  if (pathname.startsWith(SHARE_PATH)) return { href: pathname, label: 'Shared deck' };
  const app = apps.find((a) => pathname.startsWith(a.path));
  if (app) return { href: app.path, label: app.name };
  const [section] = pathname.split('/').filter(Boolean);
  return section && SECTION_LABEL[section] ? { href: `/${section}`, label: SECTION_LABEL[section] } : null;
}

function AccountAction({ pathname }: { pathname: string }) {
  const { user, isAnonymous, displayName, signOut } = useAuth();
  const isShareRoute = pathname.startsWith(SHARE_PATH);

  if (isAnonymous && isShareRoute && displayName) {
    return (
      <>
        <span className="hidden text-sm text-muted sm:inline">Viewing as {displayName}</span>
        <button type="button" onClick={() => signOut()} className="btn btn--sm">
          Log out
        </button>
      </>
    );
  }
  if (user && !isAnonymous) return <ProfileMenu />;
  if (pathname === '/login' || isShareRoute) return null;
  return (
    <Link href={`/login?return=${encodeURIComponent(pathname)}`} className="btn btn--sm">
      Sign in
    </Link>
  );
}

// The one header for the whole site: "AM › Materials" on the left, section links, theme
// and account on the right. The links hide on phones once a section label is showing.
export function SiteHeader() {
  const pathname = usePathname();
  const section = sectionFor(pathname);

  return (
    <header className="app-header site-header print:hidden">
      <div className="app-header__inner">
        <nav className="app-header__start" aria-label="Breadcrumb">
          <Link href="/" className="app-header__title tap">
            AM
          </Link>
          {section && (
            <>
              <span className="app-header__sep" aria-hidden>
                ›
              </span>
              <Link href={section.href} className="app-header__title truncate tap" aria-current="page">
                {section.label}
              </Link>
            </>
          )}
        </nav>
        <div className="app-header__actions">
          <nav
            className={`${section ? 'hidden md:flex' : 'flex'} items-center gap-1`}
            aria-label="Main"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="site-nav__link"
                aria-current={pathname.startsWith(link.href) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
          <AccountAction pathname={pathname} />
        </div>
      </div>
    </header>
  );
}
