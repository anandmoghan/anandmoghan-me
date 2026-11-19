import { Glyph, type GlyphProps } from './Glyph'

export function LadderGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M6.5 21 8.8 3M17.5 21 15.2 3M7.1 16.5h9.8M7.65 12h8.7M8.25 7.5h7.5" />
    </Glyph>
  )
}
