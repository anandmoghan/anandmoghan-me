'use client';

import { useState } from "react";
import { Link } from "@/common/apps/family/router";
import { useAuth } from "@/common/firebase/AuthProvider";
import { useData } from "@/common/apps/family/hooks/useData";
import LookPhotos, { NoTryonPhoto } from "@/common/apps/family/components/LookPhotos";
import { GeneratingNote, Lightbox, TryonHero, useTryonRequest } from "@/common/apps/family/components/TryOn";
import { formatMoney } from "@/common/apps/family/lib/format";
import { softBtn } from "@/common/apps/family/components/ui";
import { lookItems, lookName, lookPath, lookTotal, type Look } from "@/common/apps/family/lib/shop";
import { DISCLAIMER, itemPerson, latestLookTryon } from "@/common/apps/family/lib/tryon";

/** One look (a bottom, a top and styling pieces) in the grid: the try-on photo with the two products beside it, or a one-tap try-on. */
export default function LookCard({ look }: { look: Look }) {
  const { user } = useAuth();
  const { tryons } = useData();
  const person = itemPerson(look.bottom.person, user?.email);
  const items = lookItems(look);
  const total = lookTotal(items);
  const tryon = latestLookTryon(tryons, person, look);
  const req = useTryonRequest(person);
  const [big, setBig] = useState<string | null>(null);

  return (
    <li className="card card--flush overflow-hidden" data-testid="look-card">
      <LookPhotos look={look}>
        {tryon ? (
          <TryonHero tryon={tryon} onOpen={setBig} />
        ) : (
          <Link to={lookPath(look)} aria-label={`Look: ${lookName(look)}`} className="tap block">
            <NoTryonPhoto />
          </Link>
        )}
      </LookPhotos>
      <Link to={lookPath(look)} className="tap block px-4 pt-3.5 pb-3">
        <p className="truncate text-[1.05rem] font-extrabold">{lookName(look)}</p>
        <p className="text-[0.95rem] text-muted">
          {total && <span className="font-bold text-foreground">{formatMoney(total.amount, total.currency)}</span>}
          {total ? ", " : ""}
          {items.length} pieces
        </p>
      </Link>
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
              Try this look on me
            </button>
          )}
        </div>
      )}
      <Lightbox src={big} onClose={() => setBig(null)} />
    </li>
  );
}
