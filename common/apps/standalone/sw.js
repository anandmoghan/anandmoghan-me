// The service worker of every standalone app (common/apps/standalone/apps.ts). Not served from here:
// `npm run build` writes one stamped copy per app to out/apps/<id>-sw.js (scripts/stamp-app-sw.ts),
// registered by StandaloneRuntime.tsx with the app's scope. The three marked lines get the app id and scope,
// the build id (which names the cache, so a deploy replaces the old one) and the files to save at install:
// the app's pages, their page data and the static files those name.
//
// It caches only the static export: pages, Next's page data (.txt) and files. Personal data never passes
// through it: Firebase, the Mac API and the same-origin /api functions go straight to the network, and the
// apps keep their own offline copies (Family and Nila's offline store) themselves.
const APP = { id: "dev", scope: "/apps" }; // stamp:app
const BUILD = "dev"; // stamp:build
const PRECACHE = []; // stamp:precache

const CACHE = `${APP.id}-${BUILD}`;
const PAGE_WAIT_MS = 6000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

// Drops this app's caches from earlier builds, including the ones its one-off worker kept (<id>-v1).
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(`${APP.id}-`) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function keep(key, response) {
  if (response.ok) (await caches.open(CACHE)).put(key, response.clone());
  return response;
}

// Matches ignore Vary: Firebase Hosting sends "Vary: accept-encoding", and a browser that puts that header
// on its own requests (Safari) would otherwise miss every file saved at install.
const MATCH = { ignoreVary: true, ignoreSearch: true };

async function saved(key) {
  return (await caches.open(CACHE)).match(key, MATCH);
}

// A page, its page data, or a file whose name stays the same: the network first, so a deploy shows at once;
// the saved copy of that path when there is no network (or it hangs). A page with no saved copy falls back to
// the app's start page, which shows the app's own offline state. Saved by path: the id in the query picks
// what the page shows.
async function fresh(request, url, fallback) {
  try {
    return await keep(url.pathname, await fetch(request, { signal: AbortSignal.timeout(PAGE_WAIT_MS) }));
  } catch {
    return (await saved(url.pathname)) ?? (fallback && (await saved(fallback))) ?? Response.error();
  }
}

// Files named by a hash never change: the saved copy first.
async function immutable(request, url) {
  return (await saved(url.pathname)) ?? keep(url.pathname, await fetch(request));
}

const inScope = (pathname) => pathname === APP.scope || pathname.startsWith(`${APP.scope}/`);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Same-origin GETs only: Firebase, the Mac API and every write go straight to the network.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    if (inScope(url.pathname)) event.respondWith(fresh(request, url, APP.scope));
  } else if (inScope(url.pathname) && url.pathname.endsWith(".txt")) event.respondWith(fresh(request, url));
  else if (url.pathname.startsWith("/_next/static/")) event.respondWith(immutable(request, url));
  // The shared stylesheets (/global/styles), manifest and icons keep their names across deploys.
  else if (PRECACHE.includes(url.pathname)) event.respondWith(fresh(request, url));
});
