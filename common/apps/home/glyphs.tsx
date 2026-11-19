import { Glyph, type GlyphProps } from '../icons/Glyph'
import type { DeviceDomain } from './lib'

// Device glyphs in the app-icon set's frame (24-unit grid, 1.8 stroke, currentColor).

export function LightGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M12 3.5a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V17h5.2v-.7c0-.8.4-1.5 1-2A6 6 0 0 0 12 3.5Z" />
      <path d="M10 20.5h4" />
    </Glyph>
  )
}

export function SwitchGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M12 3.5v7.5" />
      <path d="M7.4 6.4a7 7 0 1 0 9.2 0" />
    </Glyph>
  )
}

export function FanGlyph({ size }: GlyphProps) {
  const blade = 'M12 10.2c-.7-3.2.4-6.2 3-6.2 2.7 0 2.8 3.9-1.5 6.9'
  return (
    <Glyph size={size}>
      <path d={blade} />
      <path d={blade} transform="rotate(120 12 12)" />
      <path d={blade} transform="rotate(240 12 12)" />
      <circle cx="12" cy="12" r="1.8" />
    </Glyph>
  )
}

export function ToggleGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <rect x="3" y="7.5" width="18" height="9" rx="4.5" />
      <circle cx="16.5" cy="12" r="2.2" fill="currentColor" stroke="none" />
    </Glyph>
  )
}

export function ClimateGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M10 13.8V5.5a2 2 0 0 1 4 0v8.3a4 4 0 1 1-4 0Z" />
      <circle cx="12" cy="16.9" r="1.4" fill="currentColor" stroke="none" />
    </Glyph>
  )
}

export function SceneGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M11 3.5l1.7 4.8 4.8 1.7-4.8 1.7L11 16.5l-1.7-4.8L4.5 10l4.8-1.7Z" />
      <path d="M18 15v5M15.5 17.5h5" />
    </Glyph>
  )
}

export function AutomationGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12Z" />
    </Glyph>
  )
}

export function AdjustGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M4.5 8h8M17.5 8h2M4.5 16h2M11.5 16h8" />
      <circle cx="15" cy="8" r="2.2" />
      <circle cx="9" cy="16" r="2.2" />
    </Glyph>
  )
}

const DOMAIN_GLYPH: Record<string, (props: GlyphProps) => React.JSX.Element> = {
  light: LightGlyph,
  switch: SwitchGlyph,
  fan: FanGlyph,
  input_boolean: ToggleGlyph,
  climate: ClimateGlyph,
}

export function DeviceGlyph({ domain, size }: GlyphProps & { domain: DeviceDomain }) {
  const Domain = DOMAIN_GLYPH[domain] ?? SwitchGlyph
  return <Domain size={size} />
}
