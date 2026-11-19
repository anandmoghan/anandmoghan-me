import { Glyph, type GlyphProps } from './Glyph'

export function NilaGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M11.25 5A8 8 0 1 0 19.25 15 6.6 6.6 0 0 1 11.25 5Z" />
      <circle cx="17.5" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
    </Glyph>
  )
}
