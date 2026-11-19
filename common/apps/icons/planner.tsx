import { Glyph, type GlyphProps } from './Glyph'

export function PlannerGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <rect x="13" y="13.5" width="4" height="4" rx="1" fill="currentColor" stroke="none" />
    </Glyph>
  )
}
