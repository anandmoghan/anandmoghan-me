'use client';

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/common/firebase/AuthProvider";
import { useData } from "@/common/apps/family/hooks/useData";
import { useToast } from "@/common/apps/family/hooks/useToast";
import ProductImage from "@/common/apps/family/components/ProductImage";
import Spinner from "@/common/apps/family/components/Spinner";
import { CloseIcon } from "@/common/apps/family/components/Icons";
import { Badge, SectionTitle, Segmented, outlineBtn, primaryBtn, softBtn, type Tone } from "@/common/apps/family/components/ui";
import { personLabel, timeAgo } from "@/common/apps/family/lib/format";
import { fullName, shortTitle } from "@/common/apps/family/lib/shop";
import { DISCLAIMER, MAX_GARMENTS, TRYON_LABEL, TRYON_PEOPLE, itemPerson, tryonRows, type TryonProgress, type TryonRow } from "@/common/apps/family/lib/tryon";
import type { Person, Suggestion, Tryon } from "@/common/apps/family/types";

const TONE: Record<TryonProgress, Tone> = { waiting: "gold", queued: "muted", running: "accent", done: "success", failed: "destructive" };

export function TryonBadge({ progress }: { progress: TryonProgress }) {
  return <Badge tone={TONE[progress]} pulse={progress === "running"} testId="tryon-status">{TRYON_LABEL[progress]}</Badge>;
}

function useDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return ref;
}

/** Full-screen view of a result; the close button, tapping anywhere or Escape closes it. */
export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  const ref = useDialog(!!src);
  return (
    <dialog
      ref={ref}
      aria-label="Try-on result"
      onClose={onClose}
      onClick={() => ref.current?.close()}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-black/90 p-0 backdrop:bg-black/90"
    >
      {src && (
        <div className="relative flex h-full flex-col items-center justify-center gap-3 p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => ref.current?.close()}
            className="tap absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <CloseIcon />
          </button>
          <img src={src} alt="Try-on result" className="max-h-[85dvh] max-w-full object-contain" />
          <p className="max-w-sm text-center text-sm text-white/80">{DISCLAIMER}</p>
        </div>
      )}
    </dialog>
  );
}

export function TryonCard({ row, suggestions, onOpen, showPerson = false }: { row: TryonRow; suggestions: Suggestion[]; onOpen: (src: string) => void; showPerson?: boolean }) {
  const names = row.suggestion_ids.map((id) => suggestions.find((s) => s.id === id)).map((s) => (s ? shortTitle(s.title, s.brand).split(",")[0] : "Product"));
  const full = row.image?.w1280 ?? row.image?.w640;
  return (
    <li className="card !p-3" data-testid="tryon-row">
      <div className="flex items-start gap-3">
        {row.progress === "done" && row.image?.w640 && full ? (
          <button type="button" onClick={() => onOpen(full)} aria-label="Enlarge try-on" className="tap block w-28 shrink-0">
            <img src={row.image.w640} alt="Try-on result" loading="lazy" decoding="async" className="aspect-[3/4] w-full rounded-xl object-cover" />
          </button>
        ) : (
          <div className="flex aspect-[3/4] w-28 shrink-0 items-center justify-center rounded-xl bg-subtle text-sm text-muted">
            {row.progress === "failed" ? "No image" : "In progress"}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <TryonBadge progress={row.progress} />
          <p className="font-bold leading-snug">{names.join(" + ")}</p>
          <p className="text-sm text-muted">{[showPerson && row.person && personLabel(row.person), row.when ? timeAgo(row.when) : ""].filter(Boolean).join(" • ")}</p>
          {row.progress === "failed" && row.error && <p className="text-[0.95rem] text-destructive">{row.error}</p>}
          {row.progress === "done" && <p className="text-sm text-muted">{DISCLAIMER}</p>}
        </div>
      </div>
    </li>
  );
}

/** "Try it on" button, its picker sheet, the status of the latest request and the gallery for `matchId`. */
export default function TryOnSection({ matchId, candidates, defaultIds, fallbackPerson }: { matchId: string; candidates: Suggestion[]; defaultIds: string[]; fallbackPerson?: string }) {
  const { user } = useAuth();
  const { submitRequest, requests, tryons, mac, suggestions } = useData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>(defaultIds);
  const [person, setPerson] = useState<Person>(() => itemPerson(fallbackPerson, user?.email));
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<string[]>([]);
  const [big, setBig] = useState<string | null>(null);
  const dialog = useDialog(open);

  // Past plain (one or two piece) try-ons stay in My try-ons only; here we list styled ones plus this visit's own requests.
  const rows = tryonRows({ tryons, requests, macLive: mac.live, extraIds: mine, match: (ids) => ids.includes(matchId) && ids.length > 2 });

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < MAX_GARMENTS ? [...p, id] : p));
  }

  async function go() {
    setBusy(true);
    try {
      const r = await submitRequest({ type: "tryon", person, suggestion_ids: picked });
      setMine((m) => [r.request_id, ...m]);
      setOpen(false);
      toast.show({ message: r.mode === "live" ? "Building your try-on" : "Waiting for Mac, request saved" });
    } catch {
      toast.show({ message: "Could not send the request", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Try-ons" className="space-y-2">
      <button
        type="button"
        onClick={() => { setPicked(defaultIds); setOpen(true); }}
        className={`${softBtn} tap w-full`}
      >
        Try it on
      </button>
      {rows.length > 0 && (
        <div className="pt-2">
          <SectionTitle title="Try-ons" count={`${rows.length} so far`} />
          <ul className="mt-2 space-y-2">
            {rows.map((r) => <TryonCard key={r.id} row={r} suggestions={suggestions} onOpen={setBig} showPerson />)}
          </ul>
        </div>
      )}

      <dialog
        ref={dialog}
        aria-label="Try it on"
        onClose={() => setOpen(false)}
        onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-surface p-0 text-foreground shadow-float backdrop:bg-black/40 sm:left-1/2 sm:right-auto sm:mb-6 sm:max-w-md sm:-translate-x-1/2 sm:rounded-3xl"
      >
        {open && (
          <div className="p-4 pb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">Try it on</h2>
              <button type="button" onClick={() => dialog.current?.close()} className={outlineBtn}>Close</button>
            </div>
            <div className="mt-3">
              <Segmented label="Who is trying it on" value={person} onChange={setPerson} options={TRYON_PEOPLE.map((p) => [p, personLabel(p)] as const)} />
            </div>
            <p className="mt-4 text-[0.95rem] text-muted">Pick up to {MAX_GARMENTS} pieces ({picked.length} chosen).</p>
            <ul className="mt-2 space-y-2">
              {candidates.map((c) => {
                const on = picked.includes(c.id);
                const locked = !on && picked.length >= MAX_GARMENTS;
                return (
                  <li key={c.id}>
                    <label className={`tap flex min-h-11 items-center gap-3 rounded-2xl border-2 p-2 ${on ? "border-domain bg-domain/[0.06]" : "border-border"} ${locked ? "opacity-50" : ""}`}>
                      <input type="checkbox" checked={on} disabled={locked} onChange={() => toggle(c.id)} className="h-5 w-5 shrink-0 accent-[var(--domain)]" aria-label={fullName(c.title, c.brand)} />
                      <div className="w-12 shrink-0 overflow-hidden rounded-lg"><ProductImage set={c.images?.[0]} fullPage={c.full_page} /></div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{c.brand ?? ""}</span>
                        <span className="block truncate text-sm">{shortTitle(c.title, c.brand)}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              disabled={busy || picked.length === 0}
              aria-busy={busy}
              onClick={() => void go()}
              className={`${primaryBtn} tap mt-4 w-full`}
            >
              {busy ? <><Spinner />Sending...</> : "Build the photo"}
            </button>
            <p className="mt-3 text-sm text-muted">Your photo and these pieces are sent to Google Gemini to make the picture. {DISCLAIMER}</p>
          </div>
        )}
      </dialog>
      <Lightbox src={big} onClose={() => setBig(null)} />
    </section>
  );
}

/** Sends a try-on request and follows it until the Mac's tryons doc turns done (the caller then finds it by lookup). */
export function useTryonRequest(person: Person) {
  const { submitRequest, requests, tryons, mac } = useData();
  const toast = useToast();
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const row = tryonRows({ tryons, requests, macLive: mac.live, extraIds: ids, match: () => false })[0];
  const progress: TryonProgress | null = busy ? "queued" : row && row.progress !== "done" ? row.progress : null;

  async function start(suggestionIds: string[]) {
    setBusy(true);
    try {
      const r = await submitRequest({ type: "tryon", person, suggestion_ids: suggestionIds });
      setIds([r.request_id]);
    } catch {
      toast.show({ message: "Could not send the request", error: true });
    } finally {
      setBusy(false);
    }
  }
  return { start, progress, error: progress === "failed" ? row?.error : undefined };
}

export function GeneratingNote({ progress, error }: { progress: TryonProgress | null; error?: string }) {
  if (!progress) return null;
  if (progress === "failed") return <p className="text-[0.95rem] text-destructive" role="alert">{error ?? "Could not build the photo"}</p>;
  return (
    <p className="flex items-center gap-2 text-[0.95rem] text-muted" role="status" data-testid="tryon-generating">
      {progress === "waiting" ? "Waiting for Mac" : <><Spinner />Generating...</>}
    </p>
  );
}

/** Try-on result as a full-width 3:4 image with an "On you" badge; tapping calls `onOpen` when given. */
export function TryonHero({ tryon, onOpen }: { tryon: Tryon; onOpen?: (src: string) => void }) {
  const full = tryon.images?.w1280 ?? tryon.images?.w640;
  const picture = (
    <>
      <img src={tryon.images?.w640} alt="Try-on result" loading="lazy" decoding="async" className="aspect-[3/4] w-full object-cover" />
      <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2.5 py-0.5 text-[0.75rem] font-bold text-domain shadow-card">On you</span>
    </>
  );
  return onOpen && full ? (
    <button type="button" onClick={() => onOpen(full)} aria-label="Enlarge try-on" className="tap relative block w-full">{picture}</button>
  ) : (
    <div className="relative">{picture}</div>
  );
}
