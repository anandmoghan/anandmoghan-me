import type { ReactNode } from 'react'

export interface GlyphProps {
  /** Rendered size in px. */
  size?: number
}

// The app-icon set's shared frame: a 24-unit grid with the live area in 3 to 21, a 1.8 stroke
// with round caps and joins, and currentColor for both strokes and solid details. The tiles in
// public/apps/icons/<id>.svg draw the same paths at 12x in the app's colours.
export function Glyph({ size = 22, children }: GlyphProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}
