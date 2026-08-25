// Service worker: offline app shell + controlled updates (spec sections 5, 8, 9).
//
// Strategy
//   navigation requests -> cache-first on index.html, so launching with no
//                          network is instant and never shows a browser error
//   same-origin assets  -> cache-first, network fallback (the shell is small
//                          and versioned, so staleness is bounded by a release)
//   everything else     -> network only
//
// A release bumps CACHE_VERSION. The new worker installs in the background,
// waits, and only takes over when the user accepts the in-app "Update Now"
// prompt. User data lives in IndexedDB / localStorage and is never touched
// here, so an update can never discard unsynchronised field records.

const CACHE_VERSION = '2026.08.25.1';
const CACHE_NAME = `site-reporter-${CACHE_VERSION}`;

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/auth.js',
  'js/csv.js',
  'js/db.js',
  'js/images.js',
  'js/logic.js',
  'js/report.js',
  'js/safety.js',
  'js/safetyPrint.js',
  'js/seeder.js',
  'js/settings.js',
  'js/state.js',
  'js/theme.js',
  'js/ui.js',
  'js/version.js',
  'js/voice.js',
  'js/components/logo.js',
  'js/components/questionCard.js',
  'js/components/signature.js',
  'js/views/checklist.js',
  'js/views/diagnostics.js',
  'js/views/login.js',
  'js/views/report.js',
  'js/views/settings.js',
  'js/views/shell.js',
  'js/views/surveys.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-64.png',
  // Brand marks, extracted from the official EPS artwork.
  'icons/at-symbol.svg',
  'icons/at-logo.svg',
  // Brand typefaces. Self-hosted so the app renders in brand type offline -
  // a webfont CDN would fall back to a system face with no signal.
  'fonts/montserrat-400.woff2',
  'fonts/montserrat-600.woff2',
  'fonts/montserrat-700.woff2',
  'fonts/barlow-condensed-600-italic.woff2',
  'fonts/barlow-condensed-700-italic.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // addAll() is all-or-nothing; cache individually so one missing optional
    // asset cannot block the whole install.
    await Promise.all(SHELL.map(async (url) => {
      try {
        await cache.add(new Request(url, { cache: 'reload' }));
      } catch (e) {
        console.warn('[sw] could not precache', url, e);
      }
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((n) => n.startsWith('site-reporter-') && n !== CACHE_NAME)
      .map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // App-shell navigation: always answer from cache when we have it.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await caches.match('index.html', { ignoreSearch: true });
      if (cached) return cached;
      try {
        return await fetch(request);
      } catch (_) {
        return new Response(
          '<h1>Site Reporter is offline</h1><p>Reopen the app once you have a connection so it can finish installing.</p>',
          { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        );
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: false });
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (e) {
      // Nothing cached and no network: let the caller surface a real error
      // rather than pretending the request succeeded.
      return new Response('Offline and not cached', { status: 504, statusText: 'Offline' });
    }
  })());
});
