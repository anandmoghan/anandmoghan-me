'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/** Chrome's install prompt event (not in the DOM typings). */
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const InstallPrompt = createContext<InstallPromptEvent | null>(null);

/** The install prompt Chrome offered, if any (Android and desktop Chrome; iOS Safari has none). */
export const useInstallPrompt = () => useContext(InstallPrompt);

/** Registers the Nila service worker (public/apps/nila-sw.js) and holds Chrome's install prompt for the install
 * card. Mounted by app/apps/family/nila/layout.tsx, so the worker is registered on Nila routes only. Only in
 * production builds: the worker file is stamped with the build id by scripts/stamp-nila-sw.ts. */
export function NilaPwa({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const sw = navigator.serviceWorker;
    // A new worker takes over at once (skipWaiting); the page reloads so it runs the chunks that worker cached.
    let controlled = !!sw.controller;
    const onChange = () => {
      if (controlled) window.location.reload();
      controlled = true;
    };
    sw.addEventListener("controllerchange", onChange);
    sw.register("/apps/nila-sw.js", { scope: "/apps/family/nila" }).catch((err) => console.error("Nila service worker failed", err));
    return () => sw.removeEventListener("controllerchange", onChange);
  }, []);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return <InstallPrompt.Provider value={prompt}>{children}</InstallPrompt.Provider>;
}
