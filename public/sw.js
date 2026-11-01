/* The build dependency changes with every deployment. Never clear localStorage. */
importScripts("/build-version.js");
const CACHE_PREFIX = "bloom-budget-";
const CACHE_NAME = CACHE_PREFIX + self.BLOOM_BUILD;
const CORE_ASSETS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS);
      const page = await cache.match("/");
      const html = page ? await page.text() : "";
      const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
        .map((match) => new URL(match[1], self.location.origin))
        .filter(
          (url) =>
            url.origin === self.location.origin &&
            url.pathname.startsWith("/_next/static/"),
        )
        .map((url) => url.href);
      await cache.addAll([...new Set(assets)]);
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname === "/sw.js" ||
    url.pathname === "/build-version.js"
  )
    return;
  const navigation = request.mode === "navigate";
  const asset = ["script", "style", "image", "font", "manifest"].includes(
    request.destination,
  );
  // Next.js flight requests are not complete documents and must never replace
  // cached HTML. Only cache navigations and ordinary static assets.
  if (!navigation && !asset) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      if (!navigation) {
        const cached = await cache.match(request);
        if (cached) return cached;
      }
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        const cached =
          (await cache.match(request)) ||
          (navigation ? await cache.match("/") : undefined);
        if (cached) return cached;
        throw error;
      }
    })(),
  );
});
