'use client';

import { img } from "@/common/apps/family/lib/shop";
import { firstImage } from "@/common/apps/family/lib/feed";
import type { Suggestion } from "@/common/apps/family/types";

/** Strip of small product thumbnails with a +N overflow count. */
export default function Thumbs({ items, max = 5 }: { items: Suggestion[]; max?: number }) {
  if (items.length === 0) return null;
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  return (
    <div className="flex items-center gap-1.5" data-testid="feed-thumbs">
      {shown.map((s) => {
        const src = img(firstImage(s), 160);
        return src ? (
          <img key={s.id} src={src} alt="" loading="lazy" decoding="async" width={44} height={56} className="h-14 w-11 shrink-0 rounded-lg object-cover" />
        ) : (
          <span key={s.id} className="h-14 w-11 shrink-0 rounded-lg bg-subtle" aria-hidden />
        );
      })}
      {extra > 0 && <span className="text-sm text-muted">+{extra}</span>}
    </div>
  );
}
