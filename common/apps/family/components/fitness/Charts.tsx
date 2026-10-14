'use client';

// Small inline SVG charts, no chart library. Each chart draws in a fixed 340 by 170 box that scales to its column, so
// the text stays readable on a phone and in the two-column desktop grid.
import { fmtNum, type Point } from "@/common/apps/family/lib/fitness";

const DAY_MS = 86400000;

const W = 340;
const H = 170;
const PAD = { l: 38, r: 10, t: 12, b: 24 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

export interface Series { points: Point[]; kind: "dots" | "line" | "line-dots"; tone: "domain" | "muted" | "gold" | "health"; label?: string; r?: number }
export interface Band { from?: number; to?: number; label?: string }
/** The time axis shared by a chart's points and labels: from the start of the first day to the end of the last. */
export interface XAxis { t0: number; t1: number; ticks: { t: number; label: string; anchor?: "start" | "end" }[] }
/** The last reading before the window, drawn as a faint hollow marker at the left edge so an empty window is not blank. */
export interface Ghost { v: number }

const COLOR: Record<Series["tone"], string> = { domain: "var(--domain)", muted: "var(--muted)", gold: "var(--gold)", health: "var(--health)" };

function scale(vals: number[], x: XAxis, band?: Band, zero = false) {
  const vs = vals.concat(band?.from ?? [], band?.to ?? []);
  let v0 = zero ? 0 : Math.min(...vs);
  let v1 = Math.max(...vs);
  const pad = (v1 - v0) * 0.08 || Math.abs(v1) * 0.05 || 1;
  if (!zero) v0 -= pad;
  v1 += pad;
  const span = x.t1 - x.t0;
  return {
    x: (t: number) => PAD.l + (span <= 0 ? IW / 2 : Math.min(1, Math.max(0, (t - x.t0) / span)) * IW),
    y: (v: number) => PAD.t + IH - ((v - v0) / (v1 - v0)) * IH,
    v0, v1,
  };
}

/** Round tick values (1, 2 or 5 times a power of ten) inside the range, about three of them. */
function niceTicks(v0: number, v1: number): number[] {
  const raw = (v1 - v0) / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((x) => x >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(v0 / step) * step; v <= v1 + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

function Axes({ s, digits, x }: { s: ReturnType<typeof scale>; digits: number; x: XAxis }) {
  const ticks = niceTicks(s.v0, s.v1);
  return (
    <g fontSize="11" fill="var(--muted)">
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={W - PAD.r} y1={s.y(v)} y2={s.y(v)} stroke="var(--border)" strokeWidth="1" />
          <text x={PAD.l - 5} y={s.y(v) + 4} textAnchor="end">{fmtNum(v, digits)}</text>
        </g>
      ))}
      {x.ticks.map((t) => {
        const px = s.x(t.t);
        const anchor = px < PAD.l + 14 ? "start" : px > W - PAD.r - 14 ? "end" : "middle";
        return <text key={t.t} x={px} y={H - 6} textAnchor={anchor} data-x-tick>{t.label}</text>;
      })}
    </g>
  );
}

function GhostMark({ s, v }: { s: ReturnType<typeof scale>; v: number }) {
  return <circle cx={PAD.l + 6} cy={s.y(v)} r={4.5} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.8" data-ghost><title>Last reading before this window</title></circle>;
}

/** Lines and dots over time, with an optional shaded target band. */
export function LineChart({ series, band, label, digits = 1, x, ghost }: { series: Series[]; band?: Band; label: string; digits?: number; x: XAxis; ghost?: Ghost }) {
  const all = series.flatMap((p) => p.points);
  if (!all.length && !ghost) return null;
  const s = scale(all.map((p) => p.v).concat(ghost?.v ?? []), x, band);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block h-auto w-full">
      {band && (band.from !== undefined || band.to !== undefined) && (
        <rect
          x={PAD.l} width={IW}
          y={s.y(Math.min(band.to ?? s.v1, s.v1))}
          height={Math.max(0, s.y(Math.max(band.from ?? s.v0, s.v0)) - s.y(Math.min(band.to ?? s.v1, s.v1)))}
          fill="var(--success)" opacity="0.1"
        />
      )}
      <Axes s={s} digits={digits} x={x} />
      {ghost && <GhostMark s={s} v={ghost.v} />}
      {series.map((p, i) => {
        const pts = p.points.map((q) => `${s.x(q.t).toFixed(1)},${s.y(q.v).toFixed(1)}`);
        const c = COLOR[p.tone];
        return (
          <g key={i}>
            {p.kind !== "dots" && pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke={c} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />}
            {p.kind !== "line" && p.points.map((q, j) => <circle key={j} data-point cx={s.x(q.t)} cy={s.y(q.v)} r={p.r ?? 2.6} fill={c} opacity={p.kind === "dots" && p.tone === "muted" ? 0.55 : p.kind === "dots" ? 0.85 : 1} />)}
            {p.kind === "line" && pts.length === 1 && <circle cx={s.x(p.points[0].t)} cy={s.y(p.points[0].v)} r={3} fill={c} />}
          </g>
        );
      })}
    </svg>
  );
}

/** Bars, one per slot start day (a day, or a week starting Monday) that has a value, with an optional target line. */
export function BarChart({ points, slotDays, x, target, label, digits = 0, ghost }: { points: Point[]; slotDays: number; x: XAxis; target?: number; label: string; digits?: number; ghost?: Ghost }) {
  if (!points.length && !ghost) return null;
  const s = scale(points.map((p) => p.v).concat(ghost?.v ?? []), x, target !== undefined ? { to: target } : undefined, true);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block h-auto w-full">
      <Axes s={s} digits={digits} x={x} />
      {ghost && <GhostMark s={s} v={ghost.v} />}
      {points.map((p) => {
        const left = s.x(p.t - DAY_MS / 2);
        const right = s.x(Math.min(p.t - DAY_MS / 2 + slotDays * DAY_MS, x.t1));
        const bw = Math.max(1.5, Math.min(22, (right - left) * 0.72));
        const met = target !== undefined && p.v >= target;
        return <rect key={p.day} data-bar x={(left + right - bw) / 2} y={s.y(p.v)} width={bw} height={Math.max(1, s.y(0) - s.y(p.v))} rx={bw > 5 ? 3 : 1} fill="var(--domain)" opacity={target === undefined || met ? 0.9 : 0.45} />;
      })}
      {target !== undefined && <line x1={PAD.l} x2={W - PAD.r} y1={s.y(target)} y2={s.y(target)} stroke="var(--foreground)" strokeDasharray="4 4" strokeWidth="1.2" opacity="0.6" />}
    </svg>
  );
}

export function Legend({ items }: { items: { tone: Series["tone"]; label: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR[i.tone] }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
