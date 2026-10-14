import type { FeedItem, ImageSet, PersonDoc, Suggestion } from "@/common/apps/family/types";

export function domainLabel(d: string): string {
  return d.charAt(0).toUpperCase() + d.slice(1).replace(/[-_]/g, " ");
}

/** Linked suggestions of a feed item that exist in the shop data, in link order. */
export function linkedSuggestions(item: FeedItem, suggestions: Suggestion[]): Suggestion[] {
  const out: Suggestion[] = [];
  for (const l of item.links ?? []) {
    if (l.kind !== "suggestion") continue;
    const s = suggestions.find((x) => x.id === l.id);
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

export function firstImage(s: Suggestion): ImageSet | undefined {
  return s.images?.[0];
}

export const FEED_PEOPLE = ["anand", "kavya", "nila"] as const;

/** Which family member a signed-in viewer is: people docs with `emails` first, else a name found in the email or display name. */
export function viewerPerson(email: string, displayName: string | null | undefined, people: PersonDoc[]): string | null {
  const e = email.toLowerCase();
  const byEmail = people.find((p) => (p.emails ?? []).some((x) => x.toLowerCase() === e));
  if (byEmail) return byEmail.person ?? byEmail.id;
  const hay = `${e.split("@")[0]} ${(displayName ?? "").toLowerCase()}`;
  return FEED_PEOPLE.find((n) => hay.includes(n)) ?? null;
}

/** Person view: that person's items plus family items. Both parents also see Nila's items. "all" shows everything. Filtering and sorting stay in memory,
 * the feed is a few dozen docs, so no Firestore query needs a composite index. */
export function filterFeed(items: FeedItem[], person: string, domain: string, sortKey: (i: FeedItem) => number): FeedItem[] {
  return items
    .filter((f) => (person === "all" || f.person === person || f.person === "family" || (f.person === "nila" && (person === "anand" || person === "kavya"))) && (domain === "all" || f.domain === domain))
    .sort((a, b) => sortKey(b) - sortKey(a));
}

const LONDON = "Europe/London";

/** Whole days between the London calendar dates of `ms` and `now` (0 = same day). */
function londonDayDiff(ms: number, now: number): number {
  const key = (t: number) => {
    const [y, m, d] = new Date(t).toLocaleDateString("en-CA", { timeZone: LONDON }).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((key(now) - key(ms)) / 86400000);
}

/** "Today", "Yesterday", a weekday name within the last week, else "Earlier" (Europe/London days). */
export function dayLabel(ms: number, now: number): string {
  const diff = londonDayDiff(ms, now);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return new Date(ms).toLocaleDateString("en-GB", { weekday: "long", timeZone: LONDON });
  return "Earlier";
}

/** Unread items that are a to-do: severity action or urgent. */
export function isTodo(i: FeedItem): boolean {
  return i.status === "unread" && (i.severity === "action" || i.severity === "urgent");
}

export const NEEDS_MAX = 3;
const NEEDS_DAYS = 3;

export type FeedGroup = { label: string; items: FeedItem[] };

/** Splits a newest-first list into the "Needs you" cards (unread to-dos from the last 3 London days, at most 3) and day
 * groups of everything else. Qualifying to-dos beyond the first 3 stay in their day group; `more` counts them and
 * `moreFirstId` is the newest of them, for the "and N more" link. With `withNeeds` false everything goes into day groups. */
export function groupFeed(items: FeedItem[], sortKey: (i: FeedItem) => number, now: number, withNeeds = true): { needs: FeedItem[]; more: number; moreFirstId: string | null; groups: FeedGroup[] } {
  const recent = withNeeds ? items.filter((i) => isTodo(i) && londonDayDiff(sortKey(i), now) < NEEDS_DAYS) : [];
  const needs = recent.slice(0, NEEDS_MAX);
  const rest = recent.slice(NEEDS_MAX);
  const groups: FeedGroup[] = [];
  for (const i of items) {
    if (needs.includes(i)) continue;
    const label = dayLabel(sortKey(i), now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(i);
    else groups.push({ label, items: [i] });
  }
  return { needs, more: rest.length, moreFirstId: rest[0]?.id ?? null, groups };
}

export function isHealthUpdate(i: FeedItem): boolean {
  return i.domain === "health" && i.title.trim() === "Health update";
}

/** The generic "Update for Nila" card every parenting run files; it says nothing on its own. */
export function isParentingUpdate(i: FeedItem): boolean {
  return i.domain === "parenting" && i.title.trim() === "Update for Nila";
}

/** A generic card that collapses with its neighbours: a health or parenting update. */
export function isGenericUpdate(i: FeedItem): boolean {
  return isHealthUpdate(i) || isParentingUpdate(i);
}

/** Where a collapsed update row goes, and what it says, for a generic health or parenting update. */
export function updateLink(i: FeedItem): { to: string; title: string } | null {
  if (isHealthUpdate(i)) return { to: `/health?p=${i.person}`, title: "Health: new updates" };
  if (isParentingUpdate(i)) return { to: "/nila/today", title: "Nila: new updates" };
  return null;
}

/** Collapses runs of consecutive generic health or parenting update items for the same person and domain into the
 * newest one. The kept item is unread if any in the run is; `counts` holds the run length per kept item id. */
export function collapseHealth(items: FeedItem[]): { items: FeedItem[]; counts: Map<string, number> } {
  const out: FeedItem[] = [];
  const counts = new Map<string, number>();
  let run: FeedItem[] = [];
  const flush = () => {
    if (run.length === 0) return;
    const unread = run.some((r) => r.status === "unread");
    out.push(unread && run[0].status !== "unread" ? { ...run[0], status: "unread" } : run[0]);
    counts.set(run[0].id, run.length);
    run = [];
  };
  for (const i of items) {
    if (isGenericUpdate(i) && run.length > 0 && run[0].person === i.person && run[0].domain === i.domain) run.push(i);
    else {
      flush();
      if (isGenericUpdate(i)) run = [i];
      else out.push(i);
    }
  }
  flush();
  return { items: out, counts };
}
