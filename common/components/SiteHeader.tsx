'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/common/firebase/AuthProvider';
import { ThemeToggle } from './ThemeToggle';
import { ProfileMenu } from '@/common/apps/components/ProfileMenu';
import { apps } from '@/common/apps/registry';
import { NotificationBell } from '@/common/notifications/NotificationBell';
import { APP_GLYPH, isGlyphId, type GlyphId } from '@/common/apps/icons';
import type { Domain } from '@/common/apps/shell/DomainScope';
import { HEADER_SLOT_ID } from './HeaderSlot';

const SHARE_PATH = '/apps/share';

const SECTION_LABEL: Record<string, string> = {
  posts: 'Posts',
  profile: 'Profile',
  privacy: 'Privacy',
  media: 'Media',
  apps: 'Apps',
  login: 'Sign in',
  account: 'Account',
  settings: 'Settings',
  notifications: 'Notifications',
};

const NAV_LINKS = [
  { href: '/posts', label: 'Posts' },
  { href: '/apps', label: 'Apps' },
  { href: '/profile', label: 'Profile' },
];

interface Section {
  href: string;
  label: string;
  /** The app's icon, shown before its name in the app's colour. */
  glyph?: { id: GlyphId; domain: Domain };
}

// One label after the AM brand: the app when inside one, else the top-level section.
function sectionFor(pathname: string): Section | null {
  if (pathname.startsWith(SHARE_PATH)) {
    return { href: pathname, label: 'Shared deck', glyph: { id: 'share', domain: 'share' } };
  }
  const app = apps.find((a) => pathname.startsWith(a.path));
  if (app) {
    return {
      href: app.path,
      label: app.name,
      glyph: isGlyphId(app.id) ? { id: app.id, domain: app.domain } : undefined,
    };
  }
  const [section] = pathname.split('/').filter(Boolean);
  return section && SECTION_LABEL[section] ? { href: `/${section}`, label: SECTION_LABEL[section] } : null;
}

function SectionGlyph({ id, domain }: { id: GlyphId; domain: Domain }) {
  const AppGlyph = APP_GLYPH[id];
  return (
    <span className={`app-header__glyph domain-${domain}`} aria-hidden>
      <AppGlyph size={18} />
    </span>
  );
}

function AccountAction({ pathname }: { pathname: string }) {
  const { user, isAnonymous, displayName } = useAuth();

  if (user && !isAnonymous) return <ProfileMenu />;
  if (pathname === '/login') return null;
  return (
    <>
      {pathname.startsWith(SHARE_PATH) && displayName && (
        <span className="hidden text-sm text-muted sm:inline">Viewing as {displayName}</span>
      )}
      <Link href={`/login?return=${encodeURIComponent(pathname)}`} className="btn btn--sm">
        Sign in
      </Link>
    </>
  );
}

// The one header for the whole site: "AM › Materials" on the left, section links, theme
// and account on the right. The links hide on phones once a section label is showing.
export function SiteHeader() {
  const pathname = usePathname();
  const section = sectionFor(pathname);
  const inApp = apps.some((a) => pathname.startsWith(a.path));

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
              <Link href={section.href} className="app-header__title tap" aria-current="page">
                {section.glyph && <SectionGlyph {...section.glyph} />}
                <span className="truncate">{section.label}</span>
              </Link>
            </>
          )}
        </nav>
        <div className="app-header__actions">
          <div id={HEADER_SLOT_ID} className="flex items-center gap-1" />
          {!inApp && (
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
          )}
          <ThemeToggle />
          <NotificationBell />
          <AccountAction pathname={pathname} />
        </div>
      </div>
    </header>
  );
}
