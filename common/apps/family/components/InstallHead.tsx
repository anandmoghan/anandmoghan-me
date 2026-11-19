'use client';

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Family and Nila install as separate home-screen apps, each from its layout's metadata. After a
// client-side navigation from a Family page into Nila (or back), the head can still hold the other
// app's manifest and Apple tags, so "Add to Home Screen" saved the wrong app until a reload. This sets
// those tags from the current path on every navigation.

const APPS = {
  family: { title: "Family", manifest: "/apps/manifest-family.json", icon: "/apps/icons/family-180.png" },
  nila: { title: "Nila", manifest: "/apps/manifest-nila.json", icon: "/apps/icons/nila-180.png" },
};

function setAttr(selector: string, tag: "link" | "meta", attrs: Record<string, string>, key: string, value: string) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(tag);
    for (const [name, v] of Object.entries(attrs)) el.setAttribute(name, v);
    document.head.appendChild(el);
  }
  el.setAttribute(key, value);
}

export function InstallHead() {
  const pathname = usePathname();
  useEffect(() => {
    const app = pathname.startsWith("/apps/family/nila") ? APPS.nila : APPS.family;
    setAttr('link[rel="manifest"]', "link", { rel: "manifest" }, "href", app.manifest);
    setAttr('link[rel="apple-touch-icon"]', "link", { rel: "apple-touch-icon" }, "href", app.icon);
    setAttr('meta[name="apple-mobile-web-app-title"]', "meta", { name: "apple-mobile-web-app-title" }, "content", app.title);
  }, [pathname]);
  return null;
}
