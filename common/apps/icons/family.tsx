import { Glyph, type GlyphProps } from './Glyph'

export function FamilyGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M4 10.6 12 4l8 6.6v8.4a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19Z" />
      <path
        fill="currentColor"
        stroke="none"
        transform="translate(8.16 10.9) scale(.32)"
        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
      />
    </Glyph>
  )
}
