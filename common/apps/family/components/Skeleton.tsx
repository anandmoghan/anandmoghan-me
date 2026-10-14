'use client';

// Shell placeholders (global app.css .skeleton), plus the grid and product page shapes the family app needs.
import { ListSkeleton as ShellListSkeleton, Skeleton as Sk } from "@/common/apps/shell/Skeleton";

// The shell list placeholder with the family pages' 1rem gutters.
export function ListSkeleton({ rows }: { rows?: number }) {
  return (
    <div className="px-4 pt-4">
      <ShellListSkeleton rows={rows} />
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="px-4 pt-3">
      <Sk className="h-4 w-40" />
      <Sk className="mt-3 h-11 w-full rounded-full" />
      <div className="mt-3 flex gap-2">
        {[0, 1, 2, 3].map((i) => <Sk key={i} className="h-11 w-24 rounded-full" />)}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="card overflow-hidden !pb-2">
            <Sk className="aspect-[3/4] w-full rounded-none" />
            <Sk className="mx-2 mt-2 h-3 w-16" />
            <Sk className="mx-2 mt-1.5 h-3 w-24" />
            <Sk className="mx-2 mt-1.5 h-3 w-20" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="pt-3">
      <Sk className="mx-4 h-4 w-28" />
      <Sk className="mt-2 aspect-[3/4] max-h-[60vh] w-full rounded-none" />
      <div className="space-y-3 px-4 pt-4">
        <Sk className="h-4 w-20" />
        <Sk className="h-6 w-64" />
        <Sk className="h-6 w-32" />
        <Sk className="h-12 w-full" />
      </div>
    </div>
  );
}

