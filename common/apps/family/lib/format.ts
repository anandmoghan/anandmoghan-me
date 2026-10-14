import type { Timestamp } from "firebase/firestore";

export function formatMoney(amount: number, currency: string): string {
  return currency === "INR" ? `₹${amount.toLocaleString("en-IN")}` : `${amount.toLocaleString("en-GB")} ${currency}`;
}

/** Epoch millis from a Firestore Timestamp, an ISO string, a number, or a pending serverTimestamp (null). */
export function toMillis(v: Timestamp | string | number | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  return typeof v.toMillis === "function" ? v.toMillis() : null;
}

/** "2h ago" style age; empty string when the stamp is unusable. */
export function timeAgo(v: Timestamp | string | number | null | undefined, now: number = Date.now()): string {
  const then = toMillis(v);
  if (then === null) return "";
  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function personLabel(p: string): string {
  return p === "family" ? "Family" : p.charAt(0).toUpperCase() + p.slice(1);
}
