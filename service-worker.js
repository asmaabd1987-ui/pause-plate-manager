/* Pause & Plate Manager — PWA service worker
   The cache contains only application files and public library assets.
   Firebase/Firestore data and Scanner Bridge requests are never cached. */

const PP_PWA_VERSION = '20260804-native-print-v1';
const PP_SHELL_CACHE = `pause-plate-shell-${PP_PWA_VERSION}`;
const PP_RUNTIME_CACHE = `pause-plate-runtime-${PP_PWA_VERSION}`;

const PP_APP_SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/reports.js',
  './js/cash-exports.js',
  './js/shift-closing.js',
  './js/pagination.js',
  './js/fiches-techniques-data.js',
  './js/pwa.js',
  './icons/pause-plate-icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];

const PP_PUBLIC_ASSET_HOSTS = new Set([
  'www.gstatic.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'cdn.sheetjs.com'
]);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PP_SHELL_CACHE)
      .then(cache => cache.addAll(PP_APP_SHELL))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('pause-plate-') && ![PP_SHELL_CACHE, PP_RUNTIME_CACHE].includes(key))
          .map(key => caches.delete(key))
      )),
      self.clients.claim()
    ])
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'PP_SKIP_WAITING') self.skipWaiting();
});

function ppIsSafeRuntimeAsset(url, request) {
  if (request.method !== 'GET') return false;
  if (url.origin === self.location.origin) return true;
  return PP_PUBLIC_ASSET_HOSTS.has(url.hostname);
}

async function ppNetworkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response?.ok) {
      const cache = await caches.open(PP_RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return (await caches.match(request)) ||
      (await caches.match('./index.html')) ||
      caches.match('./offline.html');
  }
}

async function ppStaleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async response => {
      if (response && (response.ok || response.type === 'opaque')) {
        const cache = await caches.open(PP_RUNTIME_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept Firebase business data, authentication or the local scanner.
  if (
    url.hostname === '127.0.0.1' ||
    url.hostname === 'localhost' ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken')
  ) return;

  if (request.mode === 'navigate') {
    event.respondWith(ppNetworkFirstNavigation(request));
    return;
  }

  if (ppIsSafeRuntimeAsset(url, request)) {
    event.respondWith(ppStaleWhileRevalidate(request));
  }
});
