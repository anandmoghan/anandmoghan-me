import { readFileSync } from 'node:fs'
import path from 'node:path'
import { iconBase, type StandaloneApp } from './apps'

// Build-time only (Node): the layouts' metadata and scripts/build-app-manifests.ts read the colours from disk.

export interface AccentColors {
  light: string
  dark: string
}

const TOKENS = path.join(process.cwd(), 'public', 'global', 'styles', 'tokens.css')
const DARK_ROOT = ':root[data-theme="dark"]'

function tokenColor(css: string, name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6});`).exec(css)
  if (!match) throw new Error(`tokens.css has no --${name} colour`)
  return match[1]
}

/** The app's accent in the light and dark themes: its area token in tokens.css, or for a private app the
 * colours in common/apps/<id>/standalone.json (gitignored with the rest of its code). */
export function accentColors(app: StandaloneApp): AccentColors {
  if (app.domain) {
    const css = readFileSync(TOKENS, 'utf8')
    const darkAt = css.indexOf(DARK_ROOT)
    if (darkAt < 0) throw new Error(`tokens.css has no ${DARK_ROOT} block`)
    return { light: tokenColor(css.slice(0, darkAt), app.domain), dark: tokenColor(css.slice(darkAt), app.domain) }
  }
  const file = path.join(process.cwd(), 'common', 'apps', app.id, 'standalone.json')
  const { colors } = JSON.parse(readFileSync(file, 'utf8')) as { colors?: Partial<AccentColors> }
  if (typeof colors?.light !== 'string' || typeof colors.dark !== 'string') {
    throw new Error(`${file}: needs {"colors": {"light": "#rrggbb", "dark": "#rrggbb"}}`)
  }
  return { light: colors.light, dark: colors.dark }
}

/** The page background of the light theme (tokens.css --bg): the splash screen behind the icon. */
export function pageBackground(): string {
  return tokenColor(readFileSync(TOKENS, 'utf8'), 'bg')
}

/** The web app manifest of `app`, written to public/<manifestUrl> by scripts/build-app-manifests.ts. */
export function webManifest(app: StandaloneApp) {
  const icons = iconBase(app)
  return {
    id: app.scope,
    name: app.name,
    short_name: app.name,
    description: app.description,
    start_url: app.scope,
    scope: app.scope,
    display: 'standalone',
    background_color: pageBackground(),
    theme_color: accentColors(app).light,
    icons: [
      { src: `${icons}-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${icons}-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${icons}-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: `${icons}.svg`, sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
