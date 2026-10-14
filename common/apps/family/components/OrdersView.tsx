'use client';

import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@/common/apps/family/router";
import { useData } from "@/common/apps/family/hooks/useData";
import { useAuth } from "@/common/firebase/AuthProvider";
import { useToast } from "@/common/apps/family/hooks/useToast";
import SyncBadge from "@/common/apps/family/components/SyncBadge";
import { Badge, Meta, SectionTitle, outlineBtn, primaryBtn, type Tone } from "@/common/apps/family/components/ui";
import { formatMoney, personLabel } from "@/common/apps/family/lib/format";
import { img, retailerLabel } from "@/common/apps/family/lib/shop";
import { setOrderStatus, setOrderStatusWithNotes } from "@/common/apps/family/lib/writes";
import type { Order, OrderStatus } from "@/common/apps/family/types";

export const ORDER_LABEL: Record<OrderStatus, string> = {
  ordered: "Ordered",
  delivered: "Delivered",
  return_requested: "Return requested",
  returned: "Returned",
  kept: "Kept",
};
const GROUPS: OrderStatus[] = ["ordered", "delivered", "return_requested", "returned", "kept"];
const TONE: Record<OrderStatus, Tone> = { ordered: "accent", delivered: "gold", return_requested: "destructive", returned: "muted", kept: "success" };
const NEXT: Record<OrderStatus, { to: OrderStatus; label: string; notes: boolean }[]> = {
  ordered: [{ to: "delivered", label: "Delivered", notes: false }],
  delivered: [{ to: "kept", label: "Keep", notes: true }, { to: "return_requested", label: "Return requested", notes: true }],
  return_requested: [{ to: "returned", label: "Returned", notes: false }],
  returned: [],
  kept: [],
};

function shortDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Fit notes and a 1 to 5 rating, written together with the status change. */
function NotesSheet({ order, to, label, onClose, onSave }: { order: Order | null; to: OrderStatus; label: string; onClose: () => void; onSave: (notes: string | null, rating: number | null) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (order && !d.open) {
      setNotes(order.fit_notes ?? "");
      setRating(order.rating ?? null);
      d.showModal();
    }
    if (!order && d.open) d.close();
  }, [order]);
  return (
    <dialog
      ref={ref}
      aria-label={`${label} details`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-surface p-0 text-foreground shadow-float backdrop:bg-black/40 sm:left-1/2 sm:right-auto sm:mb-6 sm:max-w-md sm:-translate-x-1/2 sm:rounded-3xl"
    >
      {order && (
        <form
          className="p-4 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(notes.trim() || null, rating);
          }}
        >
          <h2 className="text-xl font-extrabold">{to === "kept" ? "Keeping this" : "Returning this"}</h2>
          <p className="mt-0.5 line-clamp-1 text-muted">{order.title ?? order.id}</p>
          <p className="mt-4 font-bold">How was the fit?</p>
          <div className="mt-1.5 flex gap-1.5" role="group" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={rating === n}
                aria-label={`${n} out of 5`}
                onClick={() => setRating(rating === n ? null : n)}
                className={["w-11 rounded-full text-sm font-bold", rating === n ? "bg-domain text-domain-foreground" : "bg-subtle text-muted"].join(" ")}
              >
                {n}
              </button>
            ))}
          </div>
          <label className="mt-4 block font-bold" htmlFor="fit-notes">Fit notes</label>
          <textarea
            id="fit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Sleeves long, runs small"
            className="field mt-1.5"
          />
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => ref.current?.close()} className={`${outlineBtn} flex-1`}>Cancel</button>
            <button type="submit" className={`${primaryBtn} min-h-11 flex-1 px-3 text-sm`}>{label}</button>
          </div>
        </form>
      )}
    </dialog>
  );
}

export default function OrdersView() {
  const { orders, suggestions } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const email = user?.email ?? "";
  const [sheet, setSheet] = useState<{ order: Order; to: OrderStatus; label: string } | null>(null);
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: "center" });
  }, [hash, orders.length]);
  const fail = () => toast.show({ message: "Could not save", error: true });

  if (orders.length === 0) return <p className="py-8 text-center text-muted">No orders yet. Mark a pick as ordered after you buy it.</p>;

  return (
    <div className="space-y-7">
      {GROUPS.map((g) => {
        const list = orders.filter((o) => o.status === g).sort((a, b) => (b.ordered_at ?? "").localeCompare(a.ordered_at ?? ""));
        if (list.length === 0) return null;
        return (
          <section key={g} aria-label={ORDER_LABEL[g]}>
            <SectionTitle title={ORDER_LABEL[g]} count={`${list.length} ${list.length === 1 ? "order" : "orders"}`} />
            <ul className="mt-2.5 space-y-2.5">
              {list.map((o) => {
                const s = suggestions.find((x) => x.id === o.suggestion_id);
                const src = img(s?.images?.[0], 160);
                const name = o.title ?? s?.title ?? o.suggestion_id;
                const price = o.price ?? s?.price;
                return (
                  <li key={o.id} id={`order-${o.id}`} className="card !p-3.5">
                    <div className="flex gap-3">
                      <Link to={`/shop/p/${o.suggestion_id}`} aria-label={name} className="shrink-0">
                        {src ? <img src={src} alt="" width={56} height={75} className="h-[4.7rem] w-14 rounded-xl object-cover" /> : <span className="block h-[4.7rem] w-14 rounded-xl bg-subtle" aria-hidden />}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link to={`/shop/p/${o.suggestion_id}`} className="line-clamp-2 min-h-11 py-1.5 font-bold leading-snug">{name}</Link>
                          <Badge tone={TONE[o.status]} testId="order-badge">{ORDER_LABEL[o.status]}</Badge>
                        </div>
                        <Meta className="mt-1" parts={[o.size && `Size ${o.size}`, price && formatMoney(price.amount, price.currency), retailerLabel(o.retailer)]} />
                        <Meta parts={[o.person && personLabel(o.person), shortDate(o.ordered_at) && `Ordered ${shortDate(o.ordered_at)}`]} />
                        {(o.rating || o.fit_notes) && <p className="mt-1 text-sm text-muted">{o.rating ? `Fit ${o.rating}/5` : ""}{o.rating && o.fit_notes ? ", " : ""}{o.fit_notes}</p>}
                        <SyncBadge doc={o} />
                      </div>
                    </div>
                    {NEXT[o.status].length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {NEXT[o.status].map((n) => (
                          <button
                            key={n.to}
                            type="button"
                            aria-label={`${n.label}: ${name}`}
                            onClick={() => (n.notes ? setSheet({ order: o, to: n.to, label: n.label }) : setOrderStatus(email, o, n.to).catch(fail))}
                            className={`${outlineBtn} flex-1`}
                          >
                            {n.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <NotesSheet
        order={sheet?.order ?? null}
        to={sheet?.to ?? "kept"}
        label={sheet?.label ?? ""}
        onClose={() => setSheet(null)}
        onSave={(notes, rating) => {
          if (!sheet) return;
          void setOrderStatusWithNotes(email, sheet.order, sheet.to, notes, rating).catch(fail);
          setSheet(null);
        }}
      />
    </div>
  );
}
