import type { Domain } from '../shell/DomainScope'
import { apps } from '../registry'

// Every app under /apps installs as its own standalone web app. This list drives the build-time
// manifests (scripts/build-app-manifests.ts), the per-app service workers (scripts/stamp-app-sw.ts),
// the layout metadata (./metadata.ts) and the runtime that registers the worker (./StandaloneRuntime.tsx).
// Hub apps come from the registry, private apps included; share and Nila are not on the hub.

export interface StandaloneApp {
  id: string
  name: string
  description: string
  /** The app's path, also its manifest scope, start_url and service worker scope. The site serves no
   * trailing slashes (firebase.json trailingSlash: false), so the scope has none either. */
  scope: string
  /** Area colour token in tokens.css; undefined for private apps, whose colours live in their own folder. */
  domain?: Domain
  /** Private apps keep their icons and manifest data in their gitignored folders. */
  private: boolean
}

const NOT_ON_HUB: StandaloneApp[] = [
  {
    id: 'share',
    name: 'Share',
    description: 'Decks shared by link.',
    scope: '/apps/share',
    domain: 'share',
    private: false,
  },
  {
    id: 'nila',
    name: 'Nila',
    description: 'Nila: today, milestones, food, sleep and help.',
    scope: '/apps/family/nila',
    domain: 'parenting',
    private: false,
  },
]

export const standaloneApps: StandaloneApp[] = [
  ...apps.map((app) => ({
    id: app.id,
    name: app.name,
    description: app.description,
    scope: app.path,
    domain: app.private ? undefined : app.domain,
    private: app.private === true,
  })),
  ...NOT_ON_HUB,
]

/** The URL prefix of the icon build outputs (scripts/build-app-icons.mjs): <prefix>.svg, -180.png and so on. */
export const iconBase = (app: StandaloneApp) =>
  app.private ? `/apps/${app.id}/icons/${app.id}` : `/apps/icons/${app.id}`

export const manifestUrl = (app: StandaloneApp) => `/apps/${app.id}.webmanifest`

export const serviceWorkerUrl = (app: StandaloneApp) => `/apps/${app.id}-sw.js`

export const inScope = (pathname: string, scope: string) => pathname === scope || pathname.startsWith(`${scope}/`)

/** The app whose scope holds `pathname`; the narrowest one, so Nila wins over Family. */
export function standaloneAppFor(pathname: string): StandaloneApp | undefined {
  return standaloneApps
    .filter((app) => inScope(pathname, app.scope))
    .sort((a, b) => b.scope.length - a.scope.length)[0]
}

export function standaloneApp(id: string): StandaloneApp {
  const app = standaloneApps.find((a) => a.id === id)
  if (!app) throw new Error(`No standalone app ${id}`)
  return app
}
