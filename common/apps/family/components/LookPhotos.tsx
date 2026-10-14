'use client';

import type { ReactNode } from "react";
import { Link } from "@/common/apps/family/router";
import { img, srcSet, fullName, type Look } from "@/common/apps/family/lib/shop";
import type { Suggestion } from "@/common/apps/family/types";

function SideThumb({ s, className = "" }: { s: Suggestion; className?: string }) {
  return (
    <Link to={`/shop/p/${s.id}`} aria-label={fullName(s.title, s.brand)} className={["tap relative block min-h-0 overflow-hidden bg-subtle", className].join(" ")}>
      <img
        src={img(s.images?.[0], 160) ?? undefined}
        srcSet={srcSet(s.images?.[0], [160, 320])}
        sizes="33vw"
        loading="lazy"
        alt=""
        className={["absolute inset-0 h-full w-full object-cover", s.full_page ? "object-top" : ""].join(" ")}
      />
    </Link>
  );
}

/** The look's main photo (about 2/3 width) with the top and the bottom stacked beside it, then a row of small squares for the styling pieces, each linking to its product. */
export default function LookPhotos({ look, children }: { look: Look; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[2fr_1fr] gap-1">
      <div className="min-w-0">{children}</div>
      <div className="grid min-w-0 grid-rows-[1fr_1fr_auto] gap-1">
        <SideThumb s={look.top} />
        <SideThumb s={look.bottom} />
        {look.extras.length > 0 && (
          <div className="grid grid-cols-2 gap-1" data-testid="look-extras">
            {look.extras.map((e) => <SideThumb key={e.id} s={e} className="aspect-square" />)}
          </div>
        )}
      </div>
    </div>
  );
}

export function NoTryonPhoto() {
  return <div className="flex aspect-[3/4] w-full items-center justify-center bg-subtle px-3 text-center text-sm text-muted">No try-on photo yet</div>;
}
