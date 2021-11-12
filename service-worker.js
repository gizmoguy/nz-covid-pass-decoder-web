// Change this number to force a new service worker install
// and app update
const SERVICE_WORKER_VERSION = 116

// Delete the old app cached files
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (cacheName) {
            // Return true if you want to remove this cache,
            // but remember that caches are shared across
            // the whole origin
            return true;
          })
          .map(function (cacheName) {
            return caches.delete(cacheName);
          }),
      );
    }),
  );
});


// Cache the app main files
const filesToCache = [
    'style.css',
    'bundle.js',
    'index.html',
    "assets/nzcp_public_keys.json",
    "assets/icons/icon-128x128.png",
    "assets/icons/icon-152x152.png",
    "assets/icons/icon-384x384.png",
    "assets/icons/icon-512x512.png",
    "assets/icons/icon-96x96.png",
    "assets/icons/icon-144x144.png",
    "assets/icons/icon-192x192.png",
    "assets/icons/icon-48x48.png",
    "assets/icons/icon-72x72.png",
    "qr-scanner-worker.min.js",
    "qr-scanner-worker.min.js.map",
  ];
  
const staticCacheName = 'pages-cache-v1';

self.addEventListener('install', event => {
    console.log('Attempting to install service worker and cache static assets');
    event.waitUntil(
        caches.open(staticCacheName)
        .then(cache => {
        return cache.addAll(filesToCache);
        })
    );
});


// Cache the valueset .json files
self.addEventListener('fetch', event => {
    //console.log('Fetch event for ', event.request.url);
    event.respondWith(
        caches.match(event.request)
        .then(response => {
        if (response) {
            //console.log('Found ', event.request.url, ' in cache');
            return response;
        }

        //console.log('Network request for ', event.request.url);
        return fetch(event.request)
          .then(response => {
              return caches.open(staticCacheName).then(cache => {
                cache.put(event.request.url, response.clone());
                return response;
              });
            });

          }).catch(error => {

          // TODO 6 - Respond with custom offline page

          })
    );
});
