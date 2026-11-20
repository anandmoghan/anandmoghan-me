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

export function HeaterGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M12 3.5c.4 3-3.8 4.6-3.8 8.6a3.8 3.8 0 0 0 7.6 0c0-1.5-.7-2.5-1.5-3.4-.2 1.2-.8 1.9-1.6 2.3.6-3-.1-5.5-.7-7.5Z" />
      <path d="M9 20.5h6" />
    </Glyph>
  )
}

export function SunGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <circle cx="12" cy="12" r="3.8" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" />
    </Glyph>
  )
}

export function MoonGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z" />
    </Glyph>
  )
}

export function AwayGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M14 4.5h4.5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H14" />
      <path d="M4.5 12H14M10.5 8.5 14 12l-3.5 3.5" />
    </Glyph>
  )
}

// The tab-bar icons: Apple's "house", an automation check-in-a-circle and a bolt, drawn as plain lines.
export function HomeTabGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M3.5 11.2 12 4l8.5 7.2" />
      <path d="M5.8 9.6V19a1 1 0 0 0 1 1h10.4a1 1 0 0 0 1-1V9.6" />
      <path d="M10 20v-5.2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20" />
    </Glyph>
  )
}

export function AutomationTabGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.2 12.4 2.7 2.7 5-5.6" />
    </Glyph>
  )
}

// A lightning bolt, Apple's "bolt" in the same line weight.
export function EnergyTabGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="M13.2 3.5 5.8 13.1a.5.5 0 0 0 .4.8h5.1l-1 6.6 7.4-9.6a.5.5 0 0 0-.4-.8h-5.1l1-6.6Z" />
    </Glyph>
  )
}

export function ChevronGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </Glyph>
  )
}

export function CloseGlyph({ size }: GlyphProps) {
  return (
    <Glyph size={size}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
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
