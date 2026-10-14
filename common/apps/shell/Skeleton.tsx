// Loading placeholders and the busy-button spinner (global app.css).

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`.trim()} aria-hidden />
}

// A stack of card-shaped placeholders. Inline: the caller supplies the container and gutters.
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <Skeleton className="h-6 w-32" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="card card--compact space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  )
}

// The placeholder for a whole page body, in the same container as the loaded admin and ladder pages.
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="site-container py-6">
      <ListSkeleton rows={rows} />
    </div>
  )
}

// Goes before the present-tense label of a disabled, busy button ("Saving...").
export function ButtonSpinner() {
  return <span className="btn-spinner" aria-hidden />
}
