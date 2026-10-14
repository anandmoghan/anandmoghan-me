'use client';

import { useRef, useState } from "react";
import { img, srcSet } from "@/common/apps/family/lib/shop";
import type { ImageSet } from "@/common/apps/family/types";

/** Swipeable product images (scroll-snap) with a counter and thumbnails. */
export default function Carousel({ images, alt, fullPageFirst }: { images: ImageSet[]; alt: string; fullPageFirst: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return <div className="flex aspect-[3/4] w-full items-center justify-center bg-subtle text-sm text-muted">No image</div>;
  }
  const goTo = (i: number) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      <div className="relative">
        <div
          ref={scroller}
          tabIndex={0}
          role="region"
          aria-label={`${alt}, images`}
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="scroll-hide flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        >
          {images.map((set, i) => (
            <div key={i} className="aspect-[3/4] max-h-[52vh] w-full shrink-0 snap-center bg-subtle md:max-h-[calc(100dvh-7rem)]">
              <img
                src={img(set, 640) ?? undefined}
                srcSet={srcSet(set, [640, 1280])}
                sizes="(max-width: 768px) 100vw, 480px"
                width={640}
                height={853}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                alt={`${alt} (${i + 1} of ${images.length})`}
                className={["h-full w-full object-cover", i === 0 && fullPageFirst ? "object-top" : ""].join(" ")}
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <p aria-hidden className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-0.5 text-xs text-white">
              {index + 1} / {images.length}
            </p>
            <div aria-hidden className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <span key={i} className={["h-1.5 w-1.5 rounded-full", i === index ? "bg-black/70" : "bg-black/25"].join(" ")} />
              ))}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <ul className="scroll-hide mt-2 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Image thumbnails">
          {images.map((set, i) => (
            <li key={i} className="shrink-0">
              <button
                type="button"
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === index}
                onClick={() => goTo(i)}
                className={["h-14 w-11 min-h-0 overflow-hidden rounded-lg border-2 p-0", i === index ? "border-domain" : "border-transparent opacity-70"].join(" ")}
              >
                <img src={img(set, 160) ?? undefined} alt="" width={44} height={56} loading="lazy" className="h-full w-full object-cover object-top" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
