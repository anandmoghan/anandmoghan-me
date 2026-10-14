'use client';

import { useState } from "react";
import { Link, useParams } from "@/common/apps/family/router";
import { useAuth } from "@/common/firebase/AuthProvider";
import { useData } from "@/common/apps/family/hooks/useData";
import LookPhotos, { NoTryonPhoto } from "@/common/apps/family/components/LookPhotos";
import Price from "@/common/apps/family/components/Price";
import ProductImage from "@/common/apps/family/components/ProductImage";
import { ListSkeleton } from "@/common/apps/family/components/Skeleton";
import { BackLink } from "@/common/apps/family/pages/Product";
import { softBtn } from "@/common/apps/family/components/ui";
import { formatMoney } from "@/common/apps/family/lib/format";
import TryOnSection, { GeneratingNote, Lightbox, TryonHero, useTryonRequest } from "@/common/apps/family/components/TryOn";
import { DISCLAIMER, itemPerson, latestLookTryon } from "@/common/apps/family/lib/tryon";
import { buildLooks, buyLabel, fullName, lookItems, lookName, lookTotal, retailerLabel, shortTitle } from "@/common/apps/family/lib/shop";

export default function LookDetail() {
  const { bottomId = "", topId = "" } = useParams();
  const { user } = useAuth();
  const { suggestions, tryons, loaded } = useData();
  const bottomPerson = suggestions.find((s) => s.id === bottomId)?.person;
  const person = itemPerson(bottomPerson, user?.email);
  const req = useTryonRequest(person);
  const [big, setBig] = useState<string | null>(null);
  if (!loaded) return <ListSkeleton rows={4} />;
  const bottom = suggestions.find((s) => s.id === bottomId);
  const look = bottom && buildLooks(suggestions.filter((s) => s.brief_id === bottom.brief_id)).find((l) => l.bottom.id === bottomId && l.top.id === topId);
  if (!look) return <div className="px-4 pt-8 text-center text-muted">This look is not here any more. <Link to="/shop" className="font-semibold text-domain underline">Back to shop</Link></div>;
  const items = lookItems(look);
  const total = lookTotal(items);
  const tryon = latestLookTryon(tryons, person, look);
  return (
    <div className="px-4 pt-2 pb-6">
      <BackLink fallback={`/shop?brief=${look.bottom.brief_id}&view=looks`} label="Back to looks" />
      <div className="mt-2 md:max-w-xl">
        <div className="overflow-hidden rounded-2xl shadow-card">
          <LookPhotos look={look}>{tryon ? <TryonHero tryon={tryon} onOpen={setBig} /> : <NoTryonPhoto />}</LookPhotos>
        </div>
        {tryon && <p className="mt-2 text-sm text-muted">{DISCLAIMER}</p>}
      </div>
      <h1 className="mt-4 text-[1.5rem] font-extrabold leading-snug">{lookName(look)}</h1>
      {total && (
        <p className="mt-1 text-muted">
          <span className="text-lg font-extrabold text-foreground">{formatMoney(total.amount, total.currency)}</span>, {items.length} pieces
        </p>
      )}
      <ul className="card mt-5 divide-y divide-border !px-3.5">
        {items.map((item) => {
          const name = fullName(item.title, item.brand);
          return (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <Link to={`/shop/p/${item.id}`} aria-label={name} className="tap flex min-w-0 flex-1 items-center gap-3">
                <div className="w-16 shrink-0 overflow-hidden rounded-xl"><ProductImage set={item.images?.[0]} fullPage={item.full_page} /></div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">{item.brand ?? retailerLabel(item.retailer)}</p>
                  <p className="truncate text-sm text-muted">{shortTitle(item.title, item.brand)}</p>
                  <Price price={item.price} mrp={item.mrp} />
                </div>
              </Link>
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${buyLabel(item.retailer)}: ${name}`}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-domain px-5 text-sm font-bold text-domain-foreground">
                  Buy
                </a>
              )}
            </li>
          );
        })}
      </ul>
      {!tryon && (
        <section aria-label="Try this look on me" className="mt-5 space-y-2">
          <GeneratingNote progress={req.progress} error={req.error} />
          {(!req.progress || req.progress === "failed") && (
            <button
              type="button"
              onClick={() => void req.start(items.map((i) => i.id))}
              className={`${softBtn} tap w-full`}
            >
              Try this look on me
            </button>
          )}
        </section>
      )}
      <div className="mt-4">
        <TryOnSection matchId={look.bottom.id} candidates={items.filter((i) => i.images?.length)} defaultIds={[look.bottom.id, look.top.id]} fallbackPerson={look.bottom.person} />
      </div>
      <Lightbox src={big} onClose={() => setBig(null)} />
    </div>
  );
}
