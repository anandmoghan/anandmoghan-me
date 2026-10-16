// Which data the Nila pages show when the network or the Mac is not there. Kept free of React and IndexedDB so
// the choice can be tested on its own (tests/pwa/offline.test.ts).
import type { ViewDocs } from "@/common/apps/family/lib/views";

/** What was last received and saved on this device: the Firestore read copy and the Mac's full overview. */
export interface Saved<T> {
  /** When the newest part was saved, ms. */
  savedAt: number;
  docs: ViewDocs | null;
  full: T | null;
}

/** Set while the page shows saved content because a live source did not answer. */
export interface Stale {
  savedAt: number;
  /** The saved Mac overview (logs, notes, questions) is part of what is shown. */
  withMac: boolean;
}

export interface LiveSources<T> {
  docs: ViewDocs | null;
  full: T | null;
  /** The Mac answered with an error or not at all. */
  macDown: boolean;
  online: boolean;
}

/** Live sources win. Saved ones fill in at once (before the first answer) and stay when a source fails; the
 * result is stale only when a saved part is shown because its live source is down. */
export function chooseSources<T>(live: LiveSources<T>, saved: Saved<T> | null): { docs: ViewDocs | null; full: T | null; stale: Stale | null } {
  const docs = live.docs ?? saved?.docs ?? null;
  const full = live.full ?? saved?.full ?? null;
  const down = live.macDown || !live.online;
  const savedDocsShown = live.docs === null && saved?.docs != null && down;
  const savedFullShown = live.full === null && saved?.full != null && down;
  return { docs, full, stale: saved && (savedDocsShown || savedFullShown) ? { savedAt: saved.savedAt, withMac: full !== null } : null };
}
