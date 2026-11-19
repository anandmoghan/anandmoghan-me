'use client';

// One live subscription per collection under family/household, shared by every screen, so route
// changes never wait on the network. Also owns the access check and Mac reachability.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { collection, doc, onSnapshot, type DocumentData } from "firebase/firestore";
import { getDb } from "@/common/firebase/client";
import { useAuth } from "@/common/firebase/AuthProvider";
import { newRequestId, pingMac, postRequest, type LiveJob } from "@/common/apps/family/lib/mac";
import { createRequestDoc } from "@/common/apps/family/lib/writes";
import { toMillis } from "@/common/apps/family/lib/format";
import { readKey, writeKey } from "@/common/apps/family/lib/offlineStore";
import { useOnline } from "@/common/apps/family/lib/useOnline";
import type {
  Brief, FeedItem, Job, MacStatus, Order, PersonDoc, RequestDoc, Suggestion, Tryon, WardrobeItem,
} from "@/common/apps/family/types";

export type Access = "loading" | "allowed" | "denied";
export type MacState = { live: boolean | null; lastSeen: MacStatus["last_seen"] };

interface DataValue {
  access: Access;
  briefs: Brief[];
  suggestions: Suggestion[];
  orders: Order[];
  wardrobe: WardrobeItem[];
  feed: FeedItem[];
  jobs: Job[];
  requests: RequestDoc[];
  people: PersonDoc[];
  tryons: Tryon[];
  /** True until the first snapshot (cache or server) of the main collections has arrived. */
  loaded: boolean;
  mac: MacState;
  macDoc: MacStatus | null;
  /** True when this doc's change is newer than the Mac's synced_through. */
  isUnsynced: (d: { pending_sync?: boolean; client_updated_at?: unknown }) => boolean;
  liveJobs: LiveJob[];
  submitRequest: (r: SubmitInput) => Promise<SubmitResult>;
}
export interface SubmitInput { type: string; person?: string; brief_id?: string; input?: Record<string, unknown>; suggestion_ids?: string[] }
export type SubmitResult = { mode: "live"; request_id: string; job: LiveJob } | { mode: "queued"; request_id: string };

const Ctx = createContext<DataValue | undefined>(undefined);
const COLLECTIONS = ["briefs", "suggestions", "orders", "wardrobe", "feed", "jobs", "requests", "people", "tryons"] as const;
type ColName = (typeof COLLECTIONS)[number];

const POLL_MS = 30000;

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, apps } = useAuth();
  const email = (user?.email ?? "").toLowerCase();
  const uid = user?.uid;
  const online = useOnline();
  // Site admins with the family app pass the rules too (firebase/rules/family.rules).
  const adminAccess = isAdmin && apps.includes("family");
  const [access, setAccess] = useState<Access>("loading");
  const [rows, setRows] = useState<Record<ColName, DocumentData[]>>({
    briefs: [], suggestions: [], orders: [], wardrobe: [], feed: [], jobs: [], requests: [], people: [], tryons: [],
  });
  const [loadedCols, setLoadedCols] = useState<Set<ColName>>(new Set());
  const [macDoc, setMacDoc] = useState<MacStatus | null>(null);
  const [live, setLive] = useState<boolean | null>(null);
  const [liveJobs, setLiveJobs] = useState<LiveJob[]>([]);

  // Access: the household doc is readable only by members, so a denial means "not the family". Only the server
  // decides that: an empty offline cache, a network error, or a permission error right after sign-in (before the
  // ID token reaches Firestore) keep us on "loading" and retry, so a real member never sees "not on the list".
  const [accessAttempt, setAccessAttempt] = useState(0);
  useEffect(() => {
    let retry: ReturnType<typeof setTimeout> | undefined;
    const again = (ms: number) => { retry = setTimeout(() => setAccessAttempt((n) => n + 1), ms); };
    const unsub = onSnapshot(
      doc(getDb(), "family", "household"),
      { includeMetadataChanges: true },
      (snap) => {
        const members = ((snap.data()?.members as string[] | undefined) ?? []).map((m) => m.toLowerCase());
        const member = members.includes(email) || adminAccess;
        if (member) setAccess("allowed");
        else if (!snap.metadata.fromCache) setAccess("denied");
        // What the server decided is remembered for the next time the phone has no network (below).
        if (uid && (!snap.metadata.fromCache || member)) writeKey(`member:${uid}`, member).catch(() => undefined);
      },
      (err) => {
        if (err.code === "permission-denied" && accessAttempt >= 2) setAccess("denied");
        else again(err.code === "permission-denied" ? 1500 : 5000);
      },
    );
    return () => { unsub(); if (retry) clearTimeout(retry); };
  }, [email, uid, adminAccess, accessAttempt]);

  // No network: the household doc cannot be read, so a member the server let in before stays in (Nila opens
  // offline). Online, the server decides again as soon as it answers.
  useEffect(() => {
    if (!uid || online || access !== "loading") return;
    readKey<boolean>(`member:${uid}`).then((member) => member && setAccess("allowed"), () => undefined);
  }, [uid, online, access]);

  useEffect(() => {
    if (access !== "allowed") return;
    const unsubs = COLLECTIONS.map((name) =>
      onSnapshot(
        collection(getDb(), "family", "household", name),
        (snap) => {
          setRows((r) => ({ ...r, [name]: snap.docs.map((d) => ({ ...d.data(), id: d.id })) }));
          setLoadedCols((s) => (s.has(name) ? s : new Set(s).add(name)));
        },
        () => setLoadedCols((s) => new Set(s).add(name)),
      ),
    );
    unsubs.push(onSnapshot(doc(getDb(), "family", "household", "system", "mac"), (s) => setMacDoc((s.data() as MacStatus) ?? null)));
    return () => unsubs.forEach((u) => u());
  }, [access]);

  // Poll GET /family/status every 30s while the tab is visible; pause while hidden.
  useEffect(() => {
    if (access !== "allowed") return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    const tick = async () => {
      const ok = await pingMac();
      if (!cancelled) setLive(ok);
    };
    const start = () => {
      void tick();
      timer = setInterval(() => void tick(), POLL_MS);
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const onVis = () => {
      stop();
      if (document.visibilityState === "visible") start();
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [access]);

  const liveRef = useRef(live);
  liveRef.current = live;
  const submitRequest = useCallback(
    async (r: SubmitInput): Promise<SubmitResult> => {
      const request_id = newRequestId();
      if (liveRef.current && user) {
        const token = await user.getIdToken();
        const job = await postRequest(token, { request_id, ...r });
        if (job) {
          setLiveJobs((j) => [job, ...j]);
          return { mode: "live", request_id, job };
        }
      }
      // Offline, or the call failed or timed out: leave it for the bridge. Same request_id, so a call
      // that actually succeeded is deduped by the Mac. Not awaited: offline it settles only on reconnect.
      void createRequestDoc(email, { request_id, ...r }).catch(() => undefined);
      return { mode: "queued", request_id };
    },
    [user, email],
  );

  const syncedThrough = toMillis(macDoc?.synced_through);
  const isUnsynced = useCallback(
    (d: { pending_sync?: boolean; client_updated_at?: unknown }) => {
      if (!d.pending_sync) return false;
      const cu = toMillis(d.client_updated_at as never);
      if (cu === null) return true; // local write not yet stamped by the server
      return syncedThrough === null || cu > syncedThrough;
    },
    [syncedThrough],
  );

  const value = useMemo<DataValue>(
    () => ({
      access,
      briefs: rows.briefs as Brief[],
      suggestions: rows.suggestions as Suggestion[],
      orders: rows.orders as Order[],
      wardrobe: rows.wardrobe as WardrobeItem[],
      // A card without a title or date (a stray doc) would break every list that renders the feed.
      feed: (rows.feed as FeedItem[]).filter((f) => typeof f.title === "string" && typeof f.created_at === "string"),
      jobs: rows.jobs as Job[],
      requests: rows.requests as RequestDoc[],
      people: rows.people as PersonDoc[],
      tryons: rows.tryons as Tryon[],
      loaded: ["briefs", "suggestions", "feed"].every((c) => loadedCols.has(c as ColName)),
      mac: { live, lastSeen: macDoc?.last_seen },
      macDoc,
      isUnsynced,
      liveJobs,
      submitRequest,
    }),
    [access, rows, loadedCols, live, macDoc, isUnsynced, liveJobs, submitRequest],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData must be used within DataProvider");
  return v;
}
