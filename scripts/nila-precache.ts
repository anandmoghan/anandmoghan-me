import { PARENTING_ROUTE_TABS } from "../common/apps/family/lib/tabs";

export const NILA_BASE = "/apps/family/nila";

/** Public files the installed app needs besides its pages. */
export const NILA_FILES = [
  "/apps/manifest-nila.json",
  "/apps/icon-nila.svg",
  "/apps/icon-nila-180.png",
  "/apps/icon-nila-192.png",
  "/apps/icon-nila-512.png",
];

/** Every Nila page the service worker saves at install: the entry route and each route tab. */
export const nilaPages = (): string[] => [NILA_BASE, ...PARENTING_ROUTE_TABS.map((tab) => `${NILA_BASE}/${tab}`)];

const FILE = String.raw`static\/(?:chunks|css|media)\/[\w./~%-]+\.(?:js|css|woff2)`;
const STATIC_FILE = new RegExp(String.raw`\/_next\/(${FILE})|(?<![/\w])(${FILE})`, "g");

/** The build's /_next/static files a page's HTML refers to: src and href attributes, and the chunk paths in the
 * inlined page data (written there without the /_next/ prefix). A path the HTML cuts in two is not a file name
 * and is skipped, because only names ending in a file extension match. */
export function staticFilesIn(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(STATIC_FILE)) found.add(`/_next/${m[1] ?? m[2]}`);
  return [...found];
}
