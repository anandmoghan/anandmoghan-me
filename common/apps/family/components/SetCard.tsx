'use client';

import { useState } from "react";
import { Link } from "@/common/apps/family/router";
import { useAuth } from "@/common/firebase/AuthProvider";
import { useData } from "@/common/apps/family/hooks/useData";
import LookPhotos from "@/common/apps/family/components/LookPhotos";
import ProductImage from "@/common/apps/family/components/ProductImage";
import { GeneratingNote, Lightbox, TryonHero, useTryonRequest } from "@/common/apps/family/components/TryOn";
import { formatMoney } from "@/common/apps/family/lib/format";
import { softBtn } from "@/common/apps/family/components/ui";
import { fullName, lookItems, lookName, lookTotal, type Look } from "@/common/apps/family/lib/shop";
import { DISCLAIMER, MAX_GARMENTS, itemPerson, latestSetTryon } from "@/common/apps/family/lib/tryon";
import type { Suggestion } from "@/common/apps/family/types";

function Piece({ s }: { s: Suggestion }) {
  return (
    <Link to={`/shop/p/${s.id}`} aria-label={fullName(s.title, s.brand)} className="tap block overflow-hidden bg-subtle">
      <ProductImage set={s.images?.[0]} fullPage={s.full_page} />
    </Link>
  );
}

/** One outfit set from the shortlist: the try-on photo with the pieces beside it, or a flat-lay of the pieces. */
export default function SetCard({ set }: { set: Look }) {
  const { user } = useAuth();
  const { tryons } = useData();
  const person = itemPerson(set.bottom.person, user?.email);
  const items = lookItems(set).slice(0, MAX_GARMENTS);
  const total = lookTotal(items);
  const tryon = latestSetTryon(tryons, person, set);
  const req = useTryonRequest(person);
  const [big, setBig] = useState<string | null>(null);

  return (
    <li className="card card--flush overflow-hidden" data-testid="set-card">
      {tryon ? (
        <LookPhotos look={set}><TryonHero tryon={tryon} onOpen={setBig} /></LookPhotos>
      ) : (
        <div className="space-y-1" data-testid="set-flatlay">
          <div className="grid grid-cols-2 gap-1">
            <Piece s={set.top} />
            <Piece s={set.bottom} />
          </div>
          {set.extras.length > 0 && (
            <div className="grid grid-cols-4 gap-1">
              {set.extras.map((e) => <Piece key={e.id} s={e} />)}
            </div>
          )}
        </div>
      )}
      <div className="px-4 pt-3.5 pb-3">
        <p className="truncate text-[1.05rem] font-extrabold">{lookName(set)}</p>
        <p className="text-[0.95rem] text-muted">
          {total && <span className="font-bold text-foreground">{formatMoney(total.amount, total.currency)}</span>}
          {total ? ", " : ""}
          {items.length} pieces
        </p>
      </div>
      {tryon ? (
        <p className="px-4 pb-4 text-sm text-muted">{DISCLAIMER}</p>
      ) : (
        <div className="space-y-2 px-4 pb-4">
          <GeneratingNote progress={req.progress} error={req.error} />
          {(!req.progress || req.progress === "failed") && (
            <button
              type="button"
              onClick={() => void req.start(items.map((i) => i.id))}
              className={`${softBtn} tap w-full`}
            >
              Try this set on me
            </button>
          )}
        </div>
      )}
      <Lightbox src={big} onClose={() => setBig(null)} />
    </li>
  );
}
