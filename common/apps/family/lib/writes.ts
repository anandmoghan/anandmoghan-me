// Every family action is exactly one Firestore write (or one batch for "mark all read") that sets
// only family-owned fields plus pending_sync, updated_by and client_updated_at. No counters, no
// global "needs sync" doc: the Mac finds work with a pending_sync == true query.
import { doc, serverTimestamp, setDoc, updateDoc, writeBatch, type DocumentData } from "firebase/firestore";
import { getDb } from "@/common/firebase/client";
import type { Brief, FeedItem, Order, OrderStatus, Person, Suggestion } from "@/common/apps/family/types";

const col = (name: string, id: string) => doc(getDb(), "family", "household", name, id);

function sync(email: string) {
  return { pending_sync: true, updated_by: email, client_updated_at: serverTimestamp() };
}

export function shortlist(email: string, id: string) {
  return updateDoc(col("suggestions", id), {
    status: "shortlisted",
    shortlisted_at: serverTimestamp(),
    dismiss_reason: null,
    dismissed_at: null,
    ...sync(email),
  });
}

/** Back to "new": used for unshortlist, restore and undo of a dismissal. */
export function resetSuggestion(email: string, id: string) {
  return updateDoc(col("suggestions", id), {
    status: "new",
    shortlisted_at: null,
    dismiss_reason: null,
    dismissed_at: null,
    ...sync(email),
  });
}

export function dismiss(email: string, id: string, reason: string | null) {
  return updateDoc(col("suggestions", id), {
    status: "dismissed",
    dismiss_reason: reason,
    dismissed_at: serverTimestamp(),
    shortlisted_at: null,
    ...sync(email),
  });
}

/** One orders doc per suggestion (doc id = suggestion id). The suggestion's own status is derived
 * from it in the UI, and the Mac sets the suggestion to ordered when it applies the order. */
export function markOrdered(email: string, s: Suggestion, size: string | undefined) {
  const data: DocumentData = {
    id: s.id,
    suggestion_id: s.id,
    person: s.person,
    retailer: s.retailer,
    title: s.title,
    status: "ordered" satisfies OrderStatus,
    ordered_at: new Date().toISOString(),
    ...sync(email),
  };
  if (size) data.size = size;
  if (s.price) data.price = s.price;
  return setDoc(col("orders", s.id), data);
}

export function setOrderStatus(email: string, o: Order, status: OrderStatus) {
  const data: DocumentData = { status, ...sync(email) };
  if (status === "delivered") data.delivered_at = new Date().toISOString();
  return updateDoc(col("orders", o.id), data);
}

export function setOrderNotes(email: string, o: Order, fit_notes: string | null, rating: number | null) {
  return updateDoc(col("orders", o.id), { fit_notes, rating, ...sync(email) });
}

/** Keep or return with fit notes and a rating: one update, status plus notes. */
export function setOrderStatusWithNotes(email: string, o: Order, status: OrderStatus, fit_notes: string | null, rating: number | null) {
  return updateDoc(col("orders", o.id), { status, fit_notes, rating, ...sync(email) });
}

export function setFeedStatus(email: string, id: string, status: "read" | "done") {
  return updateDoc(col("feed", id), { status, ...sync(email) });
}

/** One atomic commit; the only action that touches more than one document. */
export function markAllRead(email: string, items: FeedItem[]) {
  const batch = writeBatch(getDb());
  for (const item of items) if (item.status === "unread") batch.update(col("feed", item.id), { status: "read", ...sync(email) });
  return batch.commit();
}

export interface NewBrief {
  person: Person;
  title: string;
  budget?: number;
  needs: string[];
  constraints?: string;
  deadline?: string;
}
export function briefId(b: NewBrief, now = new Date()): string {
  const slug = b.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `${now.toISOString().slice(0, 10)}-${b.person}-${slug || "brief"}`;
}
export function createBrief(email: string, b: NewBrief) {
  const id = briefId(b);
  const data: Omit<Brief, "client_updated_at"> & Record<string, unknown> = {
    id,
    person: b.person,
    title: b.title,
    needs: b.needs,
    status: "open",
    created_at: new Date().toISOString(),
    created_by: email,
    ...sync(email),
  };
  if (b.budget) data.budget = { amount: b.budget, currency: "INR" };
  if (b.constraints) data.constraints = b.constraints;
  if (b.deadline) data.deadline = b.deadline;
  // Not awaited by callers: offline, the promise only settles once the server acknowledges.
  return { id, done: setDoc(col("briefs", id), data) };
}

export function createRequestDoc(
  email: string,
  r: { request_id: string; type: string; person?: string; brief_id?: string; input?: Record<string, unknown>; suggestion_ids?: string[] },
) {
  const data: DocumentData = {
    id: r.request_id,
    request_id: r.request_id,
    type: r.type,
    created_at: serverTimestamp(),
    created_by: email,
    ...sync(email),
  };
  if (r.person) data.person = r.person;
  if (r.brief_id) data.brief_id = r.brief_id;
  if (r.input) data.input = r.input;
  if (r.suggestion_ids) data.suggestion_ids = r.suggestion_ids;
  return setDoc(col("requests", r.request_id), data);
}

