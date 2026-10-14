'use client';

// Scrollspy and mobile drawer for the materials pane, ported from global/scripts/shell.js.
// The theme toggle is the site's own (apps header), so shell.js itself is not loaded.
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function useScrollspy(pathname: string) {
  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.pane a[href^="#"]'));
    if (!links.length) return;

    const byId = new Map<string, HTMLAnchorElement>();
    for (const link of links) byId.set(decodeURIComponent(link.getAttribute('href')!.slice(1)), link);

    // Section ids often sit on <section>; track that section's first heading instead.
    const targets: { id: string; el: Element }[] = [];
    for (const id of byId.keys()) {
      const el = document.getElementById(id);
      if (!el) continue;
      const heading = /^H[1-6]$/.test(el.tagName) ? el : el.querySelector('h1, h2, h3');
      if (heading) targets.push({ id, el: heading });
    }
    if (!targets.length) return;

    const header = document.querySelector('.app-header');
    const sidebar = document.querySelector('.sidebar');
    let activeId: string | null = null;

    const update = () => {
      // Current = last heading whose top has passed the line 30% down the viewport.
      const offset = header instanceof HTMLElement ? header.offsetHeight : 0;
      const line = offset + window.innerHeight * 0.3;
      let current = targets[0].id;
      for (const target of targets) {
        if (target.el.getBoundingClientRect().top <= line) current = target.id;
        else break;
      }
      // At the page bottom the last short sections can never reach the line: pick the last.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = targets[targets.length - 1].id;
      }
      if (current === activeId) return;
      activeId = current;
      for (const link of links) link.classList.remove('is-active');
      const link = byId.get(current)!;
      link.classList.add('is-active');
      if (sidebar && sidebar.scrollHeight > sidebar.clientHeight) {
        const top = link.offsetTop;
        if (top < sidebar.scrollTop || top > sidebar.scrollTop + sidebar.clientHeight - 60) {
          sidebar.scrollTop = Math.max(0, top - sidebar.clientHeight / 3);
        }
      }
    };

    // Recompute once per frame while scrolling; a scroll listener (not an
    // IntersectionObserver) so reaching the page bottom also updates.
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);
}

// Mobile (under 900px): the pane slides in as a drawer. shell.css keys it on body.drawer-open.
export function MaterialsBehaviour() {
  const pathname = usePathname();
  // The drawer is open for the route it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);
  useScrollspy(pathname);

  useEffect(() => {
    document.body.classList.toggle('drawer-open', open);
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenOn(null);
    };
    // Any link in the pane (section anchor or another chapter) closes the drawer.
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('.drawer-backdrop') || target?.closest('.sidebar a')) setOpenOn(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.body.classList.remove('drawer-open');
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [open]);

  return (
    <button
      type="button"
      className="toc-fab materials-menu no-print"
      aria-controls="sidebar"
      aria-expanded={open}
      aria-label={open ? 'Close navigation' : 'Open navigation'}
      onClick={() => setOpen(!open)}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        {open ? (
          <path d="M18 6 6 18M6 6l12 12" />
        ) : (
          <path d="M3 6h18M3 12h18M3 18h18" />
        )}
      </svg>
    </button>
  );
}
