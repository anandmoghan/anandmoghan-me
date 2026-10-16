// Service worker of the Nila app (scope /apps/family/nila), registered by NilaPwa.tsx.
// `npm run build` stamps the two marked lines below into out/apps/nila-sw.js (scripts/stamp-nila-sw.ts):
// the build id, which names the cache so a deploy replaces the old one, and the pages and files to cache at install.
const BUILD = "dev"; // stamp:build
const PRECACHE = []; // stamp:precache

const CACHE = `nila-${BUILD}`;
const FALLBACK = "/apps/family/nila/today";
const PAGE_WAIT_MS = 6000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("nila-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function keep(key, response) {
  if (response.ok) (await caches.open(CACHE)).put(key, response.clone());
  return response;
}

// A page: the network first, so a deploy shows at once; the saved copy of that path when there is no
// network (or it hangs), else the Today page. Saved by path: the id in the query picks what the page shows.
async function page(request, url) {
  try {
    return await keep(url.pathname, await fetch(request, { signal: AbortSignal.timeout(PAGE_WAIT_MS) }));
  } catch {
    const cache = await caches.open(CACHE);
    return (await cache.match(url.pathname)) ?? (await cache.match(FALLBACK)) ?? Response.error();
  }
}

// Files named by a hash never change: the saved copy first.
async function immutable(request) {
  const cache = await caches.open(CACHE);
  return (await cache.match(request)) ?? keep(request, await fetch(request));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Never anything but same-origin GETs: Firebase, the Mac and every write go straight to the network.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") event.respondWith(page(request, url));
  else if (url.pathname.startsWith("/_next/static/") || PRECACHE.includes(url.pathname)) event.respondWith(immutable(request));
});
