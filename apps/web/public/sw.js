const SHELL = "/";
const SHELL_CACHE = "zenote-shell-v2";
const ASSET_CACHE = "zenote-assets-v2";
const KEEP = [SHELL_CACHE, ASSET_CACHE];

const ASSET_PREFIXES = ["/_next/static/", "/icon", "/apple-touch-icon"];
const ASSET_PATHS = ["/favicon.ico"];

const FRESH_PATHS = ["/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(SHELL))
      .catch(() => {}),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => !KEEP.includes(name))
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function handleFresh(request) {
  const cache = await caches.open(ASSET_CACHE);
  try {
    const response = await fetch(request, { cache: "no-cache" });
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const held = await cache.match(request);
    if (held) return held;
    throw error;
  }
}

async function handleNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) {
      cache.put(SHELL, response.clone());
    }
    return response;
  } catch (error) {
    const shell = await cache.match(SHELL);
    if (shell) return shell;
    throw error;
  }
}

async function handleAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const held = await cache.match(request);
  if (held) return held;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (request.mode === "navigate") {
    if (url.pathname === "/login" || url.pathname.startsWith("/api/")) return;
    event.respondWith(handleNavigation(request));
    return;
  }

  if (FRESH_PATHS.includes(url.pathname)) {
    event.respondWith(handleFresh(request));
    return;
  }

  const isAsset =
    ASSET_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) ||
    ASSET_PATHS.includes(url.pathname);
  if (isAsset) event.respondWith(handleAsset(request));
});
