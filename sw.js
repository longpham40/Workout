// Service worker: lets the app open offline once you've visited it.
// It tries the network first (so your edits show up straight away)
// and falls back to the saved copy when there's no signal.

// Exercise photos aren't listed: each one is saved the first time you open its exercise.
// That includes the library's extra photos, which come from the jsDelivr CDN.
const CACHE = 'train-eat-v15';
const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './data/workouts.js',
  './data/exercises.js',
  './data/exercise-photos.js',
  './data/exercise-tags.js',
  './data/exercise-db.json',
  './data/programs.js',
  './data/body-areas.js',
  './data/recipes.js',
  './data/meal-plans.js',
  './js/store.js',
  './js/ui.js',
  './js/nutrition.js',
  './js/timer.js',
  './js/train.js',
  './js/exercise-db.js',
  './js/session.js',
  './js/eat.js',
  './js/charts.js',
  './js/progress.js',
  './js/chat.js',
  './js/screens.js',
  './js/app.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromNetwork(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(reject, NETWORK_TIMEOUT_MS);
    fetch(request).then(response => {
      clearTimeout(timer);
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
      }
      resolve(response);
    }, error => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

const PHOTO_CDN = 'https://cdn.jsdelivr.net';

// CDN photos never change, so use the saved copy when there is one.
function fromCacheFirst(request) {
  return caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok || response.type === 'opaque') {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
    }
    return response;
  }));
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const origin = new URL(request.url).origin;
  if (origin === PHOTO_CDN) {
    event.respondWith(fromCacheFirst(request));
    return;
  }
  if (origin !== self.location.origin) return;

  event.respondWith(
    fromNetwork(request).catch(() =>
      caches.match(request, { ignoreSearch: true })
        .then(cached => cached || caches.match('./index.html')))
  );
});
