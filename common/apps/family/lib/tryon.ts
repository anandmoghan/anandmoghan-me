import { toMillis } from "@/common/apps/family/lib/format";
import { lookItems, type Look } from "@/common/apps/family/lib/shop";
import type { Person, RequestDoc, Suggestion, Tryon } from "@/common/apps/family/types";

export const MAX_GARMENTS = 4;
export const TRYON_PEOPLE: Person[] = ["anand", "kavya"];
export const DISCLAIMER = "AI preview. Colours and style are close; fit and size aren't exact.";

const TOPS = new Set(["top", "knitwear", "outerwear"]);
const usable = (s: Suggestion | undefined): s is Suggestion => !!s && s.status !== "dismissed" && !!s.images?.length;

/** Suggestions worth offering next to `s`: its own pairings plus pieces that list `s` as a pairing. */
export function tryonCandidates(s: Suggestion, all: Suggestion[]): Suggestion[] {
  const byId = new Map(all.map((x) => [x.id, x]));
  const forward = (s.pairs_with_suggestions ?? []).map((id) => byId.get(id));
  const backward = all.filter((x) => x.id !== s.id && (x.pairs_with_suggestions ?? []).includes(s.id));
  const seen = new Set<string>();
  return [s, ...forward, ...backward].filter((x): x is Suggestion => {
    if (!x || seen.has(x.id) || !(x.id === s.id || usable(x))) return false;
    seen.add(x.id);
    return true;
  });
}

/** The item itself, plus the best paired bottom when it is a top (or the best paired top when it is a bottom). */
export function defaultSelection(s: Suggestion, candidates: Suggestion[]): string[] {
  const others = candidates.filter((c) => c.id !== s.id);
  const partner = TOPS.has(s.category) ? others.find((c) => c.category === "bottom") : s.category === "bottom" ? others.find((c) => TOPS.has(c.category)) : undefined;
  return partner ? [s.id, partner.id] : [s.id];
}

/** Person to preselect: the signed-in email names them, else the item's person, else Anand. */
export function defaultPerson(email: string | null | undefined, fallback?: string): Person {
  const e = (email ?? "").toLowerCase();
  for (const p of TRYON_PEOPLE) if (e.includes(p)) return p;
  return TRYON_PEOPLE.find((p) => p === fallback) ?? "anand";
}

/** Whose try-on belongs on a product or look: the person the item was picked for, so Anand sees
 * Kavya on Kavya's looks (and vice versa). Falls back to the signed-in person. */
export function itemPerson(itemOwner: string | null | undefined, email: string | null | undefined): Person {
  return TRYON_PEOPLE.find((p) => p === itemOwner) ?? defaultPerson(email);
}

export type TryonProgress = "waiting" | "queued" | "running" | "done" | "failed";
export const TRYON_LABEL: Record<TryonProgress, string> = {
  waiting: "Waiting for Mac",
  queued: "Queued",
  running: "Generating, 30 to 60 seconds",
  done: "Done",
  failed: "Failed",
};

/** One row on screen: the Mac's tryons doc when it exists, otherwise what the request alone tells us. */
export interface TryonRow {
  id: string;
  person: string;
  suggestion_ids: string[];
  progress: TryonProgress;
  error?: string;
  image?: { w640?: string; w1280?: string };
  when: number;
}

export function tryonRow(id: string, t: Tryon | undefined, r: RequestDoc | undefined, macLive: boolean | null): TryonRow | null {
  if (t) {
    return { id, person: t.person, suggestion_ids: t.suggestion_ids, progress: t.status, error: t.error, image: t.images, when: toMillis(t.created_at) ?? 0 };
  }
  if (!r) return null;
  const progress: TryonProgress = r.status === "failed" ? "failed" : r.status === "queued" || r.status === "running" ? "queued" : macLive ? "queued" : "waiting";
  return {
    id, person: r.person ?? "", suggestion_ids: r.suggestion_ids ?? [], progress,
    error: r.status === "failed" ? "The Mac could not accept this request" : undefined,
    when: toMillis(r.created_at ?? r.client_updated_at) ?? Date.now(),
  };
}

/** Rows for the given request ids and/or any tryons that match, newest first. */
export function tryonRows(opts: { tryons: Tryon[]; requests: RequestDoc[]; macLive: boolean | null; match: (suggestionIds: string[], person: string) => boolean; extraIds?: string[] }): TryonRow[] {
  const ids = new Set<string>([...opts.tryons.map((t) => t.id), ...(opts.extraIds ?? [])]);
  const rows: TryonRow[] = [];
  for (const id of ids) {
    const row = tryonRow(id, opts.tryons.find((t) => t.id === id), opts.requests.find((r) => r.id === id), opts.macLive);
    if (row && (opts.extraIds?.includes(id) || opts.match(row.suggestion_ids, row.person))) rows.push(row);
  }
  return rows.sort((a, b) => b.when - a.when);
}

/** Newest finished styled try-on for `person`: the look's bottom and top plus at least one of its styling pieces,
 * and nothing outside the look. Plain top-and-bottom try-ons stay in My try-ons but are not shown on looks
 * (Anand, 2026-10-06). */
export function latestLookTryon(tryons: Tryon[], person: string, look: Look): Tryon | undefined {
  const allowed = new Set(lookItems(look).map((s) => s.id));
  return tryons
    .filter((t) => t.status === "done" && !!t.images?.w640 && t.person === person && t.suggestion_ids.length > 2 && t.suggestion_ids.includes(look.bottom.id) && t.suggestion_ids.includes(look.top.id) && t.suggestion_ids.every((id) => allowed.has(id)))
    .sort((a, b) => (toMillis(b.created_at) ?? 0) - (toMillis(a.created_at) ?? 0))[0];
}

/** Newest finished try-on for `person` on an outfit set from the shortlist: the set's bottom and top, nothing outside
 * the set. Plain two-piece ones count here, since these are the person's own picks. */
export function latestSetTryon(tryons: Tryon[], person: string, set: Look): Tryon | undefined {
  const allowed = new Set(lookItems(set).map((s) => s.id));
  return tryons
    .filter((t) => t.status === "done" && !!t.images?.w640 && t.person === person && t.suggestion_ids.includes(set.bottom.id) && t.suggestion_ids.includes(set.top.id) && t.suggestion_ids.every((id) => allowed.has(id)))
    .sort((a, b) => (toMillis(b.created_at) ?? 0) - (toMillis(a.created_at) ?? 0))[0];
}
