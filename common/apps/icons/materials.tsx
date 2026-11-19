import { Glyph, type GlyphProps } from './Glyph'

export function MaterialsGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M12 6.5C10 5 7 4.5 3.5 5v13.5c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5ZM12 6.5V20" />
      <path fill="currentColor" stroke="none" d="M15.2 5.3h2.6v5.4l-1.3-1-1.3 1Z" />
    </Glyph>
  )
}
