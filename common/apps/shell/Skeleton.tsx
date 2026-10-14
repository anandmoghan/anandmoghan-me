// Loading placeholders and the busy-button spinner (global app.css).

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`.trim()} aria-hidden />
}

// A stack of card-shaped placeholders for a list page.
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-4 px-4 pt-4">
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

// Goes before the present-tense label of a disabled, busy button ("Saving...").
export function ButtonSpinner() {
  return <span className="btn-spinner" aria-hidden />
}
