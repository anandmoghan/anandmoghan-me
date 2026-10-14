'use client';

import { img, srcSet } from "@/common/apps/family/lib/shop";
import type { ImageSet } from "@/common/apps/family/types";

/** A 3:4 product image from the resized variants. */
export default function ProductImage({ set, fullPage = false, priority = false }: { set?: ImageSet; fullPage?: boolean; priority?: boolean }) {
  const src = img(set, 320);
  if (!src) {
    return <div className="flex aspect-[3/4] w-full items-center justify-center bg-subtle text-sm text-muted">No image</div>;
  }
  return (
    <div className="aspect-[3/4] w-full overflow-hidden bg-subtle">
      <img
        src={src}
        srcSet={srcSet(set, [320, 640])}
        sizes="(max-width: 640px) 50vw, 320px"
        width={320}
        height={427}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        alt=""
        className={fullPage ? "h-full w-full object-cover object-top" : "h-full w-full object-cover"}
      />
    </div>
  );
}
