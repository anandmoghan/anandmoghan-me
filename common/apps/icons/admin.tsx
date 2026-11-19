import { Glyph, type GlyphProps } from './Glyph'

export function AdminGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M12 3.2 19 6v5.4c0 4.3-2.9 7.8-7 9.4-4.1-1.6-7-5.1-7-9.4V6Z" />
      <path d="m9 12.2 2.1 2.1 4-4.2" />
    </Glyph>
  )
}
