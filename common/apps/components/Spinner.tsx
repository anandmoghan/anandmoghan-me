interface SpinnerProps {
  text?: string
}

// Full-area centered spinner — used for auth/bundle loading where there's no page structure yet
export function Spinner({ text }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-[calc(100vh-3.5rem-env(safe-area-inset-top))]">
      <svg className="w-6 h-6 animate-spin text-muted" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      {text && <p className="text-sm text-muted">{text}</p>}
    </div>
  )
}

// Small inline spinner — used inside pages where the chrome is already visible
export function InlineSpinner({ text = 'Populating data' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 py-3">
      <svg className="w-3 h-3 animate-spin text-muted shrink-0" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <span className="text-xs text-muted">{text}</span>
    </div>
  )
}
