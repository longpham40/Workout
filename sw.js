// Service worker: lets the app open offline once you've visited it.
// It tries the network first (so your edits show up straight away)
// and falls back to the saved copy when there's no signal.

// Exercise photos aren't listed: each one is saved the first time you open its exercise.
const CACHE = 'train-eat-v9';
const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './data/workouts.js',
  './data/exercises.js',
  './data/exercise-photos.js',
  './data/programs.js',
  './data/body-areas.js',
  './data/recipes.js',
  './data/meal-plans.js',
  './js/store.js',
  './js/ui.js',
  './js/nutrition.js',
  './js/timer.js',
  './js/train.js',
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

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fromNetwork(request).catch(() =>
      caches.match(request, { ignoreSearch: true })
        .then(cached => cached || caches.match('./index.html')))
  );
});
