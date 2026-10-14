'use client';

import { Link, useNavigate, useParams } from "@/common/apps/family/router";
import { useData } from "@/common/apps/family/hooks/useData";
import { useShopActions } from "@/common/apps/family/hooks/useShopActions";
import Carousel from "@/common/apps/family/components/Carousel";
import Price from "@/common/apps/family/components/Price";
import ProductImage from "@/common/apps/family/components/ProductImage";
import SyncBadge from "@/common/apps/family/components/SyncBadge";
import OrderStatusActions from "@/common/apps/family/components/OrderCard";
import { BackIcon } from "@/common/apps/family/components/Icons";
import { Points } from "@/common/apps/family/components/Points";
import { outlineBtn, primaryBtn, softBtn } from "@/common/apps/family/components/ui";
import { ProductSkeleton } from "@/common/apps/family/components/Skeleton";
import { formatMoney, timeAgo } from "@/common/apps/family/lib/format";
import { useAuth } from "@/common/firebase/AuthProvider";
import TryOnSection, { Lightbox, TryonHero } from "@/common/apps/family/components/TryOn";
import { DISCLAIMER, itemPerson, defaultSelection, latestLookTryon, tryonCandidates } from "@/common/apps/family/lib/tryon";
import { buildLooks, buyLabel, effectiveStatus, fullName, lookItems, lookPath, lookTotal } from "@/common/apps/family/lib/shop";
import { useState } from "react";

export function BackLink({ fallback, label }: { fallback: string; label: string }) {
  const nav = useNavigate();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? nav(-1) : nav(fallback))}
      className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[0.95rem] font-semibold text-muted hover:bg-subtle hover:text-foreground"
    >
      <BackIcon />
      {label}
    </button>
  );
}

const secondary = `${outlineBtn} flex-1 px-3`;

export default function Product() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const { suggestions, orders, wardrobe, tryons, loaded } = useData();
  const actions = useShopActions(suggestions);
  const [big, setBig] = useState<string | null>(null);

  if (!loaded) return <ProductSkeleton />;
  const s = suggestions.find((x) => x.id === id);
  if (!s) return <div className="px-4 pt-8 text-center text-muted">This product is not here any more. <Link to="/shop" className="font-semibold text-domain underline">Back to shop</Link></div>;

  const status = effectiveStatus(s, orders);
  const order = orders.find((o) => o.suggestion_id === s.id);
  const sameBrief = suggestions.filter((x) => x.brief_id === s.brief_id);
  const paired = (s.pairs_with_suggestions ?? []).map((pid) => sameBrief.find((x) => x.id === pid)).filter((x): x is NonNullable<typeof x> => !!x);
  const owned = (s.pairs_with ?? []).map((wid) => wardrobe.find((w) => w.id === wid)).filter((w): w is NonNullable<typeof w> => !!w);
  const tryPerson = itemPerson(s.person, user?.email);
  const myLooks = buildLooks(sameBrief).filter((l) => lookItems(l).some((i) => i.id === s.id));
  const look = myLooks.find((l) => latestLookTryon(tryons, tryPerson, l)) ?? myLooks[0];
  const lookTryon = look && latestLookTryon(tryons, tryPerson, look);
  const bundle = lookTotal([s, ...paired]);
  const checked = s.verified_at ? timeAgo(s.verified_at) : "";
  const name = fullName(s.title, s.brand);
  const tryCandidates = tryonCandidates(s, sameBrief);

  return (
    <div className="mx-auto max-w-5xl pb-6">
      <div className="px-4 pt-2"><BackLink fallback={`/shop?brief=${s.brief_id}`} label="Back to shop" /></div>
      {/* Phones: full-width gallery above the details. Wider screens: a gallery column capped at 28rem that
          stays in view while the details scroll beside it, so photos never stretch across a wide monitor. */}
      <div className="md:grid md:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] md:items-start md:gap-8 md:px-4">
      <div className="mt-2 md:sticky md:top-16 md:overflow-hidden md:rounded-2xl md:shadow-card">
        <Carousel images={s.images ?? []} alt={s.title} fullPageFirst={!!s.full_page} />
      </div>
      <div className="mx-auto max-w-2xl space-y-5 px-4 pt-5 md:mx-0 md:px-0 md:pt-2">
        <div>
          <p className="text-[0.95rem] font-bold text-domain">{s.brand ?? ""}</p>
          <h1 className="mt-0.5 text-[1.5rem] font-extrabold leading-snug">{s.title}</h1>
          <div className="mt-1.5"><Price price={s.price} mrp={s.mrp} large /></div>
        </div>

        {(s.recommended_size || s.delivery_estimate) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {s.recommended_size && (
              <span className="inline-flex min-h-11 items-center rounded-full bg-domain/[0.12] px-5 text-base font-extrabold text-domain">Size {s.recommended_size}</span>
            )}
            {s.delivery_estimate && <span className="text-[0.95rem] text-muted">Delivery {s.delivery_estimate}</span>}
          </div>
        )}

        <div className="space-y-2.5">
          {s.url && (
            <a href={s.url} target="_blank" rel="noopener noreferrer" className={`${primaryBtn} w-full`}>
              {buyLabel(s.retailer)}
            </a>
          )}
          <div className="flex gap-2">
            {(status === "new" || status === "shortlisted") && (
              <>
                <button type="button" aria-pressed={status === "shortlisted"} aria-label={status === "shortlisted" ? `Remove ${name} from shortlist` : `Shortlist ${name}`}
                  onClick={() => (status === "shortlisted" ? actions.unshortlist(s.id) : actions.shortlist(s.id))}
                  className={status === "shortlisted" ? `${softBtn} flex-1 px-3` : secondary}>
                  {status === "shortlisted" ? "Shortlisted" : "Shortlist"}
                </button>
                <button type="button" aria-label={`Dismiss ${name}`} onClick={() => actions.dismiss(s.id)} className={secondary}>Dismiss</button>
                <button type="button" aria-label={`Mark ${name} ordered`} onClick={() => actions.markOrdered(s)} className={secondary}>Mark ordered</button>
              </>
            )}
            {status === "dismissed" && <button type="button" aria-label={`Restore ${name}`} onClick={() => actions.restore(s.id)} className={secondary}>Restore</button>}
            {status === "ordered" && <p className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-subtle font-semibold">Ordered</p>}
          </div>
          {status === "dismissed" && s.dismiss_reason && <p className="text-[0.95rem] text-muted">Dismissed: {s.dismiss_reason}</p>}
          <SyncBadge doc={s} />
        </div>

        {s.why && (
          <section className="card !p-4" aria-label="Why it suits you">
            <h2 className="text-lg font-extrabold">Why it suits you</h2>
            <Points text={s.why} max={3} className="mt-2" />
          </section>
        )}

        {(s.images?.length ?? 0) > 0 && (
          <TryOnSection matchId={s.id} candidates={tryCandidates} defaultIds={defaultSelection(s, tryCandidates)} fallbackPerson={s.person} />
        )}

        {order && (
          <>
            <OrderStatusActions order={order} />
            <Link to={`/shop?view=orders#order-${order.id}`} className="tap inline-flex min-h-11 items-center font-semibold text-domain underline">View in orders</Link>
          </>
        )}
        {checked && <p className="text-sm text-muted">Price checked {checked}</p>}

        {(paired.length > 0 || owned.length > 0) && (
          <section aria-label="Best paired with" className="card !p-4">
            <h2 className="text-lg font-extrabold">Best paired with</h2>
            <ul className="scroll-hide -mx-4 mt-2.5 flex gap-3 overflow-x-auto px-4 pb-1">
              {paired.map((p) => (
                <li key={p.id} className="w-32 shrink-0 overflow-hidden rounded-xl bg-subtle">
                  <Link to={`/shop/p/${p.id}`} aria-label={fullName(p.title, p.brand)} className="tap block pb-2">
                    <ProductImage set={p.images?.[0]} fullPage={p.full_page} />
                    <div className="px-2 pt-1">
                      <p className="truncate text-sm font-bold">{p.brand ?? p.title}</p>
                      <Price price={p.price} mrp={p.mrp} />
                    </div>
                  </Link>
                </li>
              ))}
              {owned.map((w) => (
                <li key={w.id} className="w-32 shrink-0 overflow-hidden rounded-xl bg-subtle ring-2 ring-gold/50">
                  <div className="pb-2">
                    <ProductImage set={w.images?.[0]} />
                    <div className="px-2 pt-1">
                      <p className="truncate text-sm font-bold">{w.brand ?? w.name}</p>
                      <p className="text-sm font-bold text-gold">You own this</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {lookTryon && (
              <div className="mt-3">
                <h3 className="font-bold">How it looks on you</h3>
                <div className="mt-1.5 w-48 max-w-full overflow-hidden rounded-xl"><TryonHero tryon={lookTryon} onOpen={setBig} /></div>
                <p className="mt-1.5 text-sm text-muted">{DISCLAIMER}</p>
              </div>
            )}
            {(bundle || look) && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {bundle && <p>Complete the look <span className="font-extrabold">{formatMoney(bundle.amount, bundle.currency)}</span></p>}
                {look && (
                  <Link to={lookPath(look)} className={softBtn}>
                    See the look
                  </Link>
                )}
              </div>
            )}
          </section>
        )}

      </div>
      </div>
      {actions.sheet}
      <Lightbox src={big} onClose={() => setBig(null)} />
    </div>
  );
}
