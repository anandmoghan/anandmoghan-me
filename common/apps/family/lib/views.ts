// Firestore read copies of the finished display content of the Parenting, Fitness and Health pages
// (family/household/{parenting|fitness|health}/<person>/views/<view>, written whole by the Mac's
// publisher, bridge/publish.mjs, and readable by the household only). The pages render from these
// documents at once (live onSnapshot) and still call the Mac for everything else: working details
// (notes, question and answer threads, uploads, report text, raw logs) and every action.
//
// useReadCopy combines the two sources: the copy shows immediately; when the Mac answers its full
// overview replaces it (same fields, plus the working details); when the Mac is offline the copy stays.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, type DocumentData } from "firebase/firestore";
import { getDb } from "@/common/firebase/client";
import { useData } from "@/common/apps/family/hooks/useData";

export type ViewArea = "parenting" | "fitness" | "health";
/** View id to document, for one area and person. */
export type ViewDocs = Record<string, DocumentData>;
export type ViewStatus = "loading" | "ready" | "offline" | "error";

/** The documents of `<area>/<person>/views`, live. Null until the first server answer (an empty cache
 * snapshot does not count), `{}` when nothing is published or the read is refused. */
export function useViews(area: ViewArea, person: string): ViewDocs | null {
  const { access } = useData();
  const key = `${area}/${person}`;
  // Tagged with its key, so the previous person's documents are never shown for the new one.
  const [state, setState] = useState<{ key: string; docs: ViewDocs } | null>(null);
  useEffect(() => {
    if (access !== "allowed") return;
    let loaded = false;
    return onSnapshot(
      collection(getDb(), "family", "household", area, person, "views"),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.empty && snap.metadata.fromCache) return;
        // Metadata-only snapshots (cache to server) carry no change: keep the same object.
        if (loaded && snap.docChanges().length === 0) return;
        loaded = true;
        setState({ key, docs: Object.fromEntries(snap.docs.map((d) => [d.id, d.data()])) });
      },
      () => setState({ key, docs: {} }),
    );
  }, [access, area, person, key]);
  return state?.key === key ? state.docs : null;
}

/** All documents whose id starts with `prefix`, keyed by the rest of the id. */
export function withPrefix<T = DocumentData>(docs: ViewDocs, prefix: string): Record<string, T> {
  return Object.fromEntries(Object.entries(docs).filter(([id]) => id.startsWith(prefix)).map(([id, d]) => [id.slice(prefix.length), d as T]));
}

interface Options<T> {
  area: ViewArea;
  person: string;
  /** Builds the page data from the copy, or null when the copy is not published (no `meta` document). */
  compose: (docs: ViewDocs, person: string) => T | null;
  /** The Mac's full overview. Must be stable between renders (useCallback). */
  load: () => Promise<T>;
  isOffline: (e: unknown) => boolean;
  /** True while a research job runs on the Mac: the full overview is re-fetched every `pollMs`. */
  polling?: (full: T) => boolean;
  pollMs?: number;
  /** Adds what only the copy holds (per-week documents) to the Mac's answer. */
  merge?: (full: T, published: T | null) => T;
}

export interface ReadCopy<T> {
  data: T | null;
  status: ViewStatus;
  refresh: () => Promise<void>;
  /** Whether the Mac answered: true yes, false no (the working details are missing), null not yet. */
  live: boolean | null;
}

export function useReadCopy<T>({ area, person, compose, load, isOffline, polling, pollMs = 10_000, merge }: Options<T>): ReadCopy<T> {
  const docs = useViews(area, person);
  const published = useMemo(() => (docs ? compose(docs, person) : null), [docs, compose, person]);
  const [full, setFull] = useState<T | null>(null);
  const [macStatus, setMacStatus] = useState<ViewStatus>("loading");
  const current = useRef(person);
  current.current = person;

  const refresh = useCallback(async () => {
    const asked = person;
    try {
      const next = await load();
      if (current.current !== asked) return;
      setFull(next);
      setMacStatus("ready");
    } catch (e) {
      if (current.current !== asked) return;
      setFull(null);
      setMacStatus(isOffline(e) ? "offline" : "error");
    }
  }, [load, person, isOffline]);

  useEffect(() => {
    setFull(null);
    setMacStatus("loading");
    void refresh();
  }, [refresh]);

  // The Mac published something new (a finished job, an edit on another phone): ask it again.
  const seen = useRef<ViewDocs | null>(null);
  useEffect(() => {
    if (seen.current && docs && seen.current !== docs) void refresh();
    seen.current = docs;
  }, [docs, refresh]);

  const active = full !== null && !!polling?.(full);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(t);
  }, [active, refresh, pollMs]);

  const data = full ? (merge ? merge(full, published) : full) : published;
  return { data, status: data ? "ready" : macStatus, refresh, live: macStatus === "ready" ? true : macStatus === "loading" ? null : false };
}
