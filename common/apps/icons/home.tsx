import { Glyph, type GlyphProps } from './Glyph'

// A house with overhanging eaves and a pendant lamp lit inside (Family is a house with a heart).
export function HomeGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M5.5 9.4V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.4" />
      <path d="M12 8v2.6M9 14.6l1.4-4h3.2l1.4 4Z" />
      <circle cx="12" cy="17.2" r="1.3" fill="currentColor" stroke="none" />
    </Glyph>
  )
}
