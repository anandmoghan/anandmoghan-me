import { Glyph, type GlyphProps } from './Glyph'

export function WealthGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M4 20.5h16M4 17C10 17 11.5 7.5 19 7" />
      <circle cx="19" cy="7" r="2" fill="currentColor" stroke="none" />
    </Glyph>
  )
}
