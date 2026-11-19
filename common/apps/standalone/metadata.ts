import type { Metadata, Viewport } from 'next'
import { iconBase, manifestUrl, standaloneApp } from './apps'
import { accentColors } from './manifest'

/** The head tags that make the app at `id` installable on its own: its manifest, icons and the Apple tags. */
export function standaloneMetadata(id: string): Metadata {
  const app = standaloneApp(id)
  const icons = iconBase(app)
  return {
    title: app.name,
    manifest: manifestUrl(app),
    icons: {
      icon: { url: `${icons}.svg`, type: 'image/svg+xml' },
      apple: `${icons}-180.png`,
    },
    appleWebApp: { capable: true, title: app.name, statusBarStyle: 'default' },
    // Next writes only mobile-web-app-capable for `capable`; iOS before 17 reads the Apple name.
    other: { 'apple-mobile-web-app-capable': 'yes' },
  }
}

/** The app's accent as the browser and status bar colour, per colour scheme. */
export function standaloneViewport(id: string): Viewport {
  const { light, dark } = accentColors(standaloneApp(id))
  return {
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: light },
      { media: '(prefers-color-scheme: dark)', color: dark },
    ],
  }
}
