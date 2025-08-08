// Simple but robust service worker for GitHub Pages
// - Caches core assets and media files (mp4/mp3)
// - Supports Range requests for cached media
// - Versioned caches; bump CACHE_VERSION when replacing media with same filenames

const CACHE_VERSION = 'v11-20250808';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const MEDIA_CACHE = `media-${CACHE_VERSION}`;

// Core assets to pre-cache (extend as needed)
const CORE_ASSETS = [
  './',
  './index.html',
  './main.css',
  './main.js',
  './window.html',
  './window.css',
  './window.js',
  './doctor.html',
  './doctor.css',
  './doctor.js',
  './monitor.html',
  './monitor.css',
  './monitor.js',
  './kobeya.html',
  './kobeya.js',
  './style.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== MEDIA_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Utility: parse Range header like "bytes=start-end"
function parseRange(rangeHeader, totalLength) {
  try {
    const matches = /bytes=(\d+)-(\d+)?/.exec(rangeHeader || '');
    if (!matches) return null;
    const start = parseInt(matches[1], 10);
    const end = matches[2] ? parseInt(matches[2], 10) : totalLength - 1;
    if (isNaN(start) || isNaN(end) || start > end || end >= totalLength) return null;
    return { start, end };
  } catch (_) {
    return null;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isHTML = request.destination === 'document' || url.pathname.endsWith('.html');
  const isStyle = request.destination === 'style' || url.pathname.endsWith('.css');
  const isScript = request.destination === 'script' || url.pathname.endsWith('.js');
  const isImage = ['image', 'font'].includes(request.destination) || /\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf)$/i.test(url.pathname);
  const isMedia = request.destination === 'video' || request.destination === 'audio' || /\.(mp4|mp3|wav|ogg)$/i.test(url.pathname);

  // Handle Range requests for media
  if (isMedia && request.headers.has('range')) {
    event.respondWith(handleRangeRequest(request));
    return;
  }

  // Strategies
  if (isHTML) {
    // Network-first for HTML to get latest
    event.respondWith(networkFirst(request));
    return;
  }

  if (isScript || isStyle || isImage) {
    // Stale-while-revalidate for static assets
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  if (isMedia) {
    // Cache-first for media (non-range)
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }

  // Default: try cache, then network
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request, { ignoreVary: true, ignoreSearch: false });
    return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreVary: true, ignoreSearch: false });
  const networkPromise = fetch(request)
    .then((resp) => {
      if (resp && resp.ok) cache.put(request, resp.clone());
      return resp;
    })
    .catch(() => undefined);
  return cached || networkPromise || fetch(request);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreVary: true, ignoreSearch: false });
  if (cached) return cached;
  const resp = await fetch(request);
  if (resp && resp.ok) await cache.put(request, resp.clone());
  return resp;
}

async function handleRangeRequest(request) {
  const url = new URL(request.url);
  const rangeHeader = request.headers.get('range');
  const cache = await caches.open(MEDIA_CACHE);

  // Use a non-range request as cache key for full object
  const fullRequest = new Request(url.toString(), { method: 'GET' });
  let response = await cache.match(fullRequest);

  if (!response) {
    // Fetch full media and cache it
    const networkResp = await fetch(fullRequest);
    if (!networkResp || !networkResp.ok) return networkResp;
    await cache.put(fullRequest, networkResp.clone());
    response = networkResp;
  }

  const buf = await response.arrayBuffer();
  const total = buf.byteLength;
  const range = parseRange(rangeHeader, total);
  if (!range) {
    // Invalid range; return full response
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Length': String(total),
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Accept-Ranges': 'bytes'
      }
    });
  }

  const { start, end } = range;
  const chunk = buf.slice(start, end + 1);
  const headers = new Headers(response.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  return new Response(chunk, { status: 206, statusText: 'Partial Content', headers });
}


