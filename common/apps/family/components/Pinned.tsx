"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@/common/apps/family/router";
import { PinIcon } from "@/common/apps/family/components/Icons";
import { usePins } from "@/common/apps/family/hooks/usePins";
import { DOMAIN_LABEL, domainOf } from "@/common/apps/family/lib/domain";

/** Pin toggle for the page on screen, shown next to its title. Stores the path and an "Area · Title" label. */
export function PinButton({ title }: { title: string }) {
  const { pathname, search } = useLocation();
  const { pins, ready, toggle } = usePins();
  const path = pathname + search;
  const pinned = pins.some((p) => p.path === path);
  const domain = domainOf(pathname);
  const label = domain === "home" ? title : `${DOMAIN_LABEL[domain]} · ${title}`;
  return (
    <button
      type="button"
      title={pinned ? "Unpin this page" : "Pin this page"}
      disabled={!ready}
      onClick={() => toggle(path, label)}
      className={`tap inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors hover:bg-subtle disabled:opacity-50 ${pinned ? "text-domain" : "text-muted"}`}
    >
      <PinIcon size={18} filled={pinned} />
      {pinned ? "Unpin" : "Pin"}
    </button>
  );
}

/** Last tab of the bottom bar: opens a menu above it listing the pinned pages. Pinning happens from the page itself. */
export function PinnedTab() {
  const { pins } = usePins();
  const { pathname, search } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  // Close on a route change.
  useEffect(() => setOpen(false), [pathname, search]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <li ref={ref} className="tab-bar__item popover">
      <button type="button" className="tab-bar__link" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="tab-bar__icon"><PinIcon /></span>
        <span className="tab-bar__label">Pinned</span>
      </button>
      {open && (
        <div className="popover__panel popover__panel--up popover__panel--end" role="menu" aria-label="Pinned pages">
          {pins.length === 0 && <p className="px-2.5 py-2 text-sm text-muted">Nothing pinned yet. Use the pin next to a page title.</p>}
          {pins.map((p) => (
            <Link key={p.path} to={p.path} role="menuitem" className={`popover__item domain-${domainOf(p.path.split("?")[0])}`} onClick={() => setOpen(false)}>
              <span className="min-w-0 truncate"><span className="text-domain" aria-hidden>● </span>{p.title}</span>
            </Link>
          ))}
        </div>
      )}
    </li>
  );
}
