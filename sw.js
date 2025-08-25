const CACHE_NAME = 'retreat-itinerary-v1';

// Install event - cache the basic shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service worker installed');
        // Cache the basic shell files
        return cache.addAll([
          '/itinerary/',
          '/itinerary/manifest.json'
        ]).catch((error) => {
          console.log('Cache addAll failed:', error);
        });
      })
  );
  self.skipWaiting();
});

// Fetch event - cache everything as it's requested
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Fetch from network and cache the response
        return fetch(event.request)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response since it can only be consumed once
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('Caching:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If fetch fails (offline), try to return cached version
            if (event.request.mode === 'navigate') {
              return caches.match('/itinerary/');
            }
            // For other requests, return undefined (will result in network error)
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Push event for notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Upcoming event reminder',
    icon: '/itinerary/icon-192x192.png',
    badge: '/itinerary/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'retreat-reminder',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Schedule',
        icon: '/itinerary/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Team Retreat Reminder', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/itinerary/')
    );
  }
});
