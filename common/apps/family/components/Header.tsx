'use client';

import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { Link, familyHref, useLocation } from "@/common/apps/family/router";
import { useAuth } from "@/common/firebase/AuthProvider";
import { ThemeToggle } from "@/common/components/ThemeToggle";
import { AppHeader } from "@/common/apps/shell/AppHeader";
import { useData } from "@/common/apps/family/hooks/useData";
import { viewerPerson } from "@/common/apps/family/lib/feed";
import { personLabel } from "@/common/apps/family/lib/format";
import { DOMAIN_LABEL, DOMAIN_ROOT, domainOf } from "@/common/apps/family/lib/domain";
import Spinner from "@/common/apps/family/components/Spinner";
import MacPill from "@/common/apps/family/components/MacPill";
import { DOMAIN_ICON } from "@/common/apps/family/components/Icons";

function ProfileMenu() {
  const { user, signOut } = useAuth();
  const { people } = useData();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  if (!user) return null;
  const person = viewerPerson(user.email ?? "", user.displayName, people);
  const initial = (person ? personLabel(person) : user.displayName || user.email || "U")[0].toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Profile menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-domain text-sm font-bold text-domain-foreground">
            {initial}
          </span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 z-50 mt-2 w-64 overflow-hidden !p-1.5 shadow-float">
          <div className="px-3 py-2.5">
            <p className="truncate font-bold">{user.displayName || (person ? personLabel(person) : "Signed in")}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
          <Link to="/more" className="flex min-h-11 items-center rounded-xl px-3 text-[0.95rem] font-semibold hover:bg-subtle">Settings and more</Link>
          <NextLink href="/apps" className="flex min-h-11 items-center rounded-xl px-3 text-[0.95rem] font-semibold hover:bg-subtle">All apps</NextLink>
          <button type="button" disabled={signingOut} aria-busy={signingOut} onClick={() => { setSigningOut(true); void signOut().finally(() => setSigningOut(false)); }} className="tap flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-[0.95rem] font-semibold text-destructive hover:bg-subtle disabled:opacity-60">
            {signingOut ? <><Spinner />Signing out...</> : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Sticky top bar (shell AppHeader): the area on screen with its icon; Mac status, theme and profile. Signed in there
 * is no "Apps" parent link, as in the PWA, so the title fits next to the Mac pill at 390px; the profile menu links to
 * the hub instead. */
export default function Header({ signedIn, showMac }: { signedIn: boolean; showMac: boolean }) {
  const { pathname } = useLocation();
  const domain = signedIn ? domainOf(pathname) : "home";
  const Icon = DOMAIN_ICON[domain];
  return (
    <AppHeader
      parent={signedIn ? undefined : { href: "/apps", label: "Apps" }}
      title={DOMAIN_LABEL[domain]}
      href={familyHref(DOMAIN_ROOT[domain])}
      icon={<Icon size={20} />}
      actions={
        <>
          {showMac && <MacPill />}
          <ThemeToggle />
          {signedIn && <ProfileMenu />}
        </>
      }
    />
  );
}
