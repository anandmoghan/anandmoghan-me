'use client';

import type { ReactNode } from "react";
import { Link } from "@/common/apps/family/router";
import { BackIcon, ChevronRightIcon } from "@/common/apps/family/components/Icons";

export type Tone = "success" | "destructive" | "accent" | "gold" | "muted";

/** Soft tinted status pill (global .badge and tones, as the shell Badge), with a test id. */
export function Badge({ tone, pulse = false, children, testId }: { tone: Tone; pulse?: boolean; children: ReactNode; testId?: string }) {
  return (
    <span className={`badge badge--${tone}`} data-testid={testId}>
      {pulse && <span className="badge__dot" aria-hidden />}
      {children}
    </span>
  );
}

/** Pill filter button, 44px tall; the active one is filled in the domain colour. */
export function FilterChip({ active, onClick, children, role }: { active: boolean; onClick: () => void; children: ReactNode; role?: "tab" }) {
  return (
    <button
      type="button"
      role={role}
      aria-pressed={role ? undefined : active}
      aria-selected={role ? active : undefined}
      onClick={onClick}
      className={[
        "tap shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
        active ? "bg-domain text-domain-foreground shadow-card" : "border border-border bg-surface text-foreground/80 hover:bg-subtle hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** Segmented control: a soft track with the chosen option raised. Options are pressed-state buttons. */
export function Segmented<T extends string>({ options, value, onChange, label, scroll = false }: { options: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void; label: string; scroll?: boolean }) {
  const track = scroll ? "flex w-full gap-1 overflow-x-auto rounded-full bg-subtle p-1 sm:w-auto" : "flex w-full gap-1 rounded-full bg-subtle p-1 sm:w-auto";
  return (
    <div role="group" aria-label={label} className={track}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={[
            scroll ? "min-h-11 shrink-0 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors" : "min-h-11 min-w-0 flex-auto whitespace-nowrap rounded-full px-2.5 text-sm font-semibold transition-colors sm:flex-none sm:px-4",
            value === v ? "bg-raised text-foreground shadow-card" : "text-muted hover:text-foreground",
          ].join(" ")}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** Meta line: parts joined by a dot. */
export function Meta({ parts, className = "" }: { parts: (string | false | undefined | null)[]; className?: string }) {
  const shown = parts.filter(Boolean) as string[];
  return (
    <p className={`flex flex-wrap gap-x-1.5 text-sm text-muted ${className}`}>
      {shown.map((p, i) => (
        <span key={i} className="whitespace-nowrap">
          {p}
          {i < shown.length - 1 && <span aria-hidden className="ml-1.5">·</span>}
        </span>
      ))}
    </p>
  );
}

export function SectionTitle({ title, count }: { title: string; count?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {count && <span className="text-sm text-muted">{count}</span>}
    </div>
  );
}

/** Page heading with an optional one-line subtitle and an action on the right. */
export function PageTitle({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[1.65rem] font-extrabold leading-tight">{title}</h1>
        {sub && <div className="mt-1 text-[0.95rem] text-muted">{sub}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Secondary pill button: surface fill, gentle border. */
export const outlineBtn = "tap inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface px-4 text-sm font-semibold transition-colors hover:bg-subtle disabled:opacity-60";
/** Main action: filled in the domain colour. */
export const primaryBtn = "tap inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-domain px-5 font-bold text-domain-foreground shadow-card transition-opacity hover:opacity-90 disabled:opacity-50";
/** Quiet action: tinted in the domain colour. */
export const softBtn = "tap inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-domain/[0.12] px-4 text-sm font-bold text-domain transition-colors hover:bg-domain/20 disabled:opacity-60";

/** A condensed hub card: the whole card is a link to its own page. A title with an optional icon and badge, one or two
 * lines of summary (the key number, today's item, a count, what is next) and a chevron. */
export function HubCard({ to, title, icon, badge, lines = [], testId }: { to: string; title: string; icon?: ReactNode; badge?: ReactNode; lines?: (string | false | undefined | null)[]; testId?: string }) {
  const shown = lines.filter(Boolean) as string[];
  return (
    <Link to={to} data-testid={testId} className="tap card flex min-h-16 items-center gap-3 !px-3.5 !py-3 hover:bg-subtle">
      {icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-domain/[0.14] text-domain" aria-hidden>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-bold leading-snug">{title}</span>
          {badge}
        </span>
        {shown.slice(0, 2).map((l, i) => <span key={i} className="line-clamp-2 block text-sm text-muted">{l}</span>)}
      </span>
      <span className="shrink-0 text-muted" aria-hidden><ChevronRightIcon /></span>
    </Link>
  );
}

/** The box form of HubCard for grids: a tinted icon, the title, a short secondary line and at most one clamped detail
 * line. The whole card is the link. `urgent` tints the card with the domain colour. */
export function BoxCard({ to, title, icon, sub, detail, urgent = false, testId }: { to: string; title: string; icon: ReactNode; sub?: string | false | null; detail?: string | false | null; urgent?: boolean; testId?: string }) {
  return (
    <Link to={to} data-testid={testId} className={`tap card flex h-full min-w-0 flex-col gap-1.5 !p-3 hover:bg-subtle ${urgent ? "!border-domain/40 !bg-domain/[0.1]" : ""}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-domain/[0.14] text-domain" aria-hidden>{icon}</span>
      <span className="line-clamp-2 break-words font-bold leading-snug">{title}</span>
      {sub && <span className={`line-clamp-1 break-words text-sm ${urgent ? "font-semibold text-domain" : "text-muted"}`}>{sub}</span>}
      {detail && <span className="line-clamp-2 break-words text-xs text-muted">{detail}</span>}
    </Link>
  );
}

/** Back link at the top of a hub card's page, to the tab it came from. */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} data-testid="back-link" className="tap -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-muted hover:text-foreground">
      <BackIcon />{label}
    </Link>
  );
}
