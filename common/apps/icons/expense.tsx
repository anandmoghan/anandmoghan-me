import { Glyph, type GlyphProps } from './Glyph'

export function ExpenseGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4Z" />
      <path d="M9 8h6M9 11.5h6M9 15.5h4" />
    </Glyph>
  )
}
