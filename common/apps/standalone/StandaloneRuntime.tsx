'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { iconBase, manifestUrl, serviceWorkerUrl, standaloneAppFor } from './apps'

/** Chrome's install prompt event (not in the DOM typings). */
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

const InstallPrompt = createContext<InstallPromptEvent | null>(null)

/** The install prompt Chrome offered, if any (Android and desktop Chrome; iOS Safari has none). */
export const useInstallPrompt = () => useContext(InstallPrompt)

function setAttr(selector: string, tag: 'link' | 'meta', attrs: Record<string, string>, key: string, value: string) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement(tag)
    for (const [name, v] of Object.entries(attrs)) el.setAttribute(name, v)
    document.head.appendChild(el)
  }
  el.setAttribute(key, value)
}

/** Mounted once by app/apps/layout.tsx. For the standalone app that holds the current path:
 * - points the head's manifest and Apple tags at it on every navigation. Each layout sets them, but after a
 *   client-side move between nested apps (Family and Nila) the head can still hold the other app's tags, and
 *   "Add to Home Screen" would save the wrong app;
 * - registers its service worker (out/apps/<id>-sw.js, stamped by scripts/stamp-app-sw.ts), in production
 *   builds only, because the worker lists the build's files;
 * - holds Chrome's install prompt for install cards (useInstallPrompt). */
export function StandaloneRuntime({ children }: { children: ReactNode }) {
  const app = standaloneAppFor(usePathname())
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    if (!app) return
    setAttr('link[rel="manifest"]', 'link', { rel: 'manifest' }, 'href', manifestUrl(app))
    setAttr('link[rel="apple-touch-icon"]', 'link', { rel: 'apple-touch-icon' }, 'href', `${iconBase(app)}-180.png`)
    setAttr('meta[name="apple-mobile-web-app-title"]', 'meta', { name: 'apple-mobile-web-app-title' }, 'content', app.name)
  }, [app])

  useEffect(() => {
    if (!app || process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    const sw = navigator.serviceWorker
    // A new worker takes over at once (skipWaiting); the page reloads so it runs the chunks that worker cached.
    let controlled = !!sw.controller
    const onChange = () => {
      if (controlled) window.location.reload()
      controlled = true
    }
    sw.addEventListener('controllerchange', onChange)
    sw.register(serviceWorkerUrl(app), { scope: app.scope }).catch((err) => console.error(`${app.name} service worker failed`, err))
    return () => sw.removeEventListener('controllerchange', onChange)
  }, [app])

  useEffect(() => {
    // Not prevented: apps without an install card keep the browser's own install offer.
    const onPrompt = (e: Event) => setPrompt(e as InstallPromptEvent)
    const onInstalled = () => setPrompt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  return <InstallPrompt.Provider value={prompt}>{children}</InstallPrompt.Provider>
}
