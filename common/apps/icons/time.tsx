import { Glyph, type GlyphProps } from './Glyph'

export function TimeGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M10 3h4M12 3v3M18 7.5l1.3-1.3M12 13.5 15 10.5" />
    </Glyph>
  )
}
