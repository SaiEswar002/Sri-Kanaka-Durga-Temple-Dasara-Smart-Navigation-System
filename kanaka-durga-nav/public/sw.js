// Service Worker for Sri Kanaka Durga Temple Navigation PWA
// Caching strategy:
// - App shell (layout, fonts, critical CSS): Cache-First
// - API / Supabase requests: Network-First with fallback
// - Map tiles: Cache-First with expiry
// - Static facility data: Stale-While-Revalidate

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `kanaka-nav-shell-${CACHE_VERSION}`;
const API_CACHE = `kanaka-nav-api-${CACHE_VERSION}`;
const TILE_CACHE = `kanaka-nav-tiles-${CACHE_VERSION}`;

const SHELL_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

const OFFLINE_PAGE = '/offline';

// ============================================================
// Install — cache app shell
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(SHELL_URLS).catch((err) => {
        console.warn('[SW] Shell caching failed:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ============================================================
// Activate — clean old caches
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== API_CACHE && key !== TILE_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ============================================================
// Fetch — routing strategy
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip Supabase API — always network, no caching of live data
  if (url.hostname.includes('supabase.co')) return;

  // Map tiles — Cache-First
  if (url.pathname.includes('/tiles/') || url.hostname.includes('tile.openstreetmap.org') || url.hostname.includes('api.maptiler.com')) {
    event.respondWith(cacheFirst(request, TILE_CACHE));
    return;
  }

  // Next.js static assets — Cache-First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Navigation (pages) — Network-First with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(OFFLINE_PAGE) || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // Everything else — Network-First
  event.respondWith(networkFirst(request, API_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
