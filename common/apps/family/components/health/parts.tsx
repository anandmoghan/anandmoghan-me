'use client';

import { useState } from "react";
import Spinner from "@/common/apps/family/components/Spinner";
import { Badge, outlineBtn, type Tone } from "@/common/apps/family/components/ui";
import { COUNTRY_LABEL, KIND_LABEL, SEVERITY_LABEL, safeUrl, type Flag, type Severity, type Source } from "@/common/apps/family/lib/health";

export function HealthNotice() {
  return (
    <div className="space-y-1 rounded-2xl bg-subtle px-4 py-3 text-sm leading-relaxed text-muted" data-testid="health-notice">
      <p>Not medical advice. In an emergency call 112 in India, or 999 in the UK (111 for urgent advice).</p>
      <p>Health records stay on the home Mac and are only sent to your phone while you look at them.</p>
    </div>
  );
}

/** Small "India" / "UK" badge from a report's country. */
export function CountryBadge({ country }: { country: string | undefined }) {
  const label = country ? COUNTRY_LABEL[country] : undefined;
  return label ? <Badge tone="muted">{label}</Badge> : null;
}

const SEVERITY_TONE: Record<Severity, Tone> = { urgent: "destructive", action: "gold", watch: "accent", info: "muted" };
export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge tone={SEVERITY_TONE[severity] ?? "muted"}>{SEVERITY_LABEL[severity] ?? severity}</Badge>;
}

const FLAG_TONE: Record<Flag, Tone> = { critical: "destructive", high: "gold", low: "gold", abnormal: "gold", normal: "success" };
export function FlagBadge({ flag, needsRepeat, note }: { flag: Flag | undefined; needsRepeat?: boolean; note?: string }) {
  // A result from a delayed or compromised sample is shown as unconfirmed, not as abnormal.
  if (needsRepeat) return <span title={note || undefined}><Badge tone="muted">Needs repeat</Badge></span>;
  if (!flag) return null;
  return <Badge tone={FLAG_TONE[flag] ?? "muted"}>{flag.charAt(0).toUpperCase() + flag.slice(1)}</Badge>;
}

export function OfflineCard({ offline, onRetry }: { offline: boolean; onRetry: () => void | Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="card space-y-2 !p-4" role="alert" data-testid="health-offline">
      <p className="text-lg font-extrabold">{offline ? "The home Mac is offline" : "Health records could not be loaded"}</p>
      <p className="text-muted">
        Health records live only on the Mac, nothing is kept in the cloud or on this phone.
        {offline ? " Once the Mac is back on, try again." : " The Mac answered with an error, try again in a moment."}
      </p>
      <button type="button" disabled={busy} aria-busy={busy} onClick={() => { setBusy(true); void Promise.resolve(onRetry()).finally(() => setBusy(false)); }} className={outlineBtn}>
        {busy ? <><Spinner />Retrying...</> : "Retry"}
      </button>
    </div>
  );
}

/** List of sources (title, kind badge, link) behind a "Sources (n)" toggle; `bare` lists them openly (inside a section that is already collapsible). */
/** A small muted line when the Mac reports records it could not read (`broken` on an overview response). */
export function BrokenNote({ broken }: { broken: string[] | undefined }) {
  if (!broken?.length) return null;
  return (
    <p className="mb-3 text-sm text-muted" data-testid="broken-note">
      {broken.length === 1 ? "One item couldn't be read. It will be fixed on the next update." : `${broken.length} items couldn't be read. They will be fixed on the next update.`}
    </p>
  );
}

export function SourceList({ sources, bare = false }: { sources: Source[] | undefined; bare?: boolean }) {
  if (!sources?.length) return null;
  const list = (
    <ul className="space-y-2 pb-1">
      {sources.map((s, i) => {
        const href = safeUrl(s.url);
        // Kind above the title, so the link keeps the full width and wraps naturally.
        return (
          <li key={`${s.url}-${i}`} className="min-w-0">
            {s.kind && <Badge tone="muted">{KIND_LABEL[s.kind] ?? s.kind}</Badge>}
            {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center break-words font-semibold text-domain underline underline-offset-2">{s.title}</a> : <p className="break-words py-1">{s.title}</p>}
          </li>
        );
      })}
    </ul>
  );
  if (bare) return <div className="text-[0.95rem]">{list}</div>;
  return (
    <details className="text-[0.95rem]">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-muted">Sources ({sources.length})</summary>
      {list}
    </details>
  );
}

/** Tiny trend line, no chart library. */
export function Sparkline({ values }: { values: number[] }) {
  const w = 72;
  const h = 24;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (w - 4) + 2},${h - 3 - ((v - min) / span) * (h - 6)}`);
  const [lx, ly] = pts[pts.length - 1].split(",");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Trend over time" className="shrink-0 text-domain">
      <polyline points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="2.5" fill="currentColor" />
    </svg>
  );
}
