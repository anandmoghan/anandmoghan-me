'use client';

import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { InfoIcon } from "@/common/apps/family/components/Icons";
import { hasTable, markdownPoints, pointsCoverBody, splitSections } from "@/common/apps/family/lib/text";

/** Characters after which a single point is clamped. */
const LONG_POINT = 170;

const unwrap = { p: ({ children }: { children?: ReactNode }) => <>{children}</> };

/** Full markdown in the long-form style. */
export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`prose-feed min-w-0 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

/** Text as a few short points, with an info button that opens the full original text in place. A body that is a single
 * short sentence reads as a plain line; one the points already cover gets no button. */
export function Points({
  text, max = 3, muted = false, clamp = false, small = false, className = "",
}: {
  text: string | undefined;
  max?: number;
  /** Secondary text (a "why" under a title). */
  muted?: boolean;
  /** Two lines per point while collapsed, for cards. */
  clamp?: boolean;
  small?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const body = text?.trim();
  if (!body) return null;
  const points = markdownPoints(body, max);
  if (points.length === 0) return <Markdown text={body} className={className} />;
  // A point longer than about four lines is cut to three and read in full behind the button.
  const longPoint = points.some((x) => x.length > LONG_POINT);
  const more = !pointsCoverBody(body) || markdownPoints(body, max + 1).length > max || longPoint;
  const cut = clamp ? "line-clamp-2" : "line-clamp-3";
  const size = small ? "text-[0.94rem] leading-relaxed" : "text-base leading-relaxed";
  const tone = muted ? "text-muted" : "text-foreground/90";
  const line = (p: string) => <ReactMarkdown remarkPlugins={[remarkGfm]} components={unwrap}>{p}</ReactMarkdown>;

  return (
    <div className={`min-w-0 max-w-[65ch] ${className}`} data-testid="points">
      {open ? (
        <Markdown text={body} className={small ? "text-[0.94rem]" : ""} />
      ) : points.length === 1 ? (
        <p className={`${size} ${tone} ${cut} [&_a]:font-semibold [&_a]:text-domain [&_strong]:font-bold [&_strong]:text-foreground`}>{line(points[0])}</p>
      ) : (
        <ul className="space-y-1.5">
          {points.map((p, i) => (
            <li key={i} className={`flex items-start gap-2.5 ${size} ${tone}`}>
              <span className="mt-[0.62em] h-1.5 w-1.5 shrink-0 rounded-full bg-domain/70" aria-hidden />
              <span className={`min-w-0 flex-1 [&_a]:font-semibold [&_a]:text-domain [&_strong]:font-bold [&_strong]:text-foreground ${cut}`}>{line(p)}</span>
            </li>
          ))}
        </ul>
      )}
      {more && (
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Show less" : "Read more"}
          onClick={() => setOpen(!open)}
          className="relative z-10 -ml-2 mt-0.5 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-domain hover:bg-domain/10"
        >
          <InfoIcon />
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

/** Markdown split on its `#`/`##` headings: each section shows its points, the full section behind the info button.
 * Sections with a table are shown whole. */
export function SectionedMarkdown({ text, max = 4, cards = false }: { text: string; max?: number; cards?: boolean }) {
  const sections = splitSections(text);
  return (
    <div className={cards ? "space-y-3" : "space-y-6"}>
      {sections.map((s, i) => (
        <section key={`${s.heading}-${i}`} className={cards ? "card !p-4 sm:!p-5" : ""}>
          {s.heading && !(cards && hasTable(s.body)) && <h2 className={`text-lg font-extrabold ${cards ? "text-domain" : ""}`}>{s.heading}</h2>}
          {s.body && cards && hasTable(s.body) ? (
            <details>
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-lg font-extrabold text-domain"><span className="min-w-0">{s.heading}</span><span className="shrink-0 text-sm font-semibold text-muted">Show table</span></summary>
              <div className="mt-2 overflow-x-auto"><Markdown text={s.body} className="[&_td]:min-w-28 [&_th]:min-w-28" /></div>
            </details>
          ) : s.body && (
            <div className={s.heading ? "mt-2" : ""}>
              {hasTable(s.body) ? <Markdown text={s.body} /> : <Points text={s.body} max={max} />}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
