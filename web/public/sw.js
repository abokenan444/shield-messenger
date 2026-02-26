/**
 * Shield Messenger — Service Worker
 *
 * Handles:
 *  - Push notification events (wake-up signals)
 *  - Notification click routing
 *  - Offline caching for PWA shell
 *  - Background sync for pending messages
 *
 * Privacy: This SW never receives message content from push servers.
 * Push payloads contain only an opaque "wake" signal. The actual message
 * is fetched and decrypted by the main thread after wake-up.
 */

const CACHE_NAME = 'sl-cache-v2';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
  '/icon-maskable.svg',
];

// ─────────────────── Install ───────────────────

self.addEventListener('install', (event) => {
  console.log('[SL:SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn('[SL:SW] Some shell assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// ─────────────────── Activate ───────────────────

self.addEventListener('activate', (event) => {
  console.log('[SL:SW] Activating...');
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ─────────────────── Fetch (Offline Support) ───────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only cache same-origin GET requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Network-first for API calls, cache-first for shell assets
  if (url.pathname.startsWith('/api/')) {
    return; // Don't cache API calls
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          // Cache successful responses for shell assets
          if (response.ok && SHELL_ASSETS.includes(url.pathname)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return cached;
        });

      return cached || fetchPromise;
    })
  );
});

// ─────────────────── Push Notifications ───────────────────

self.addEventListener('push', (event) => {
  console.log('[SL:SW] Push received');

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Opaque push — just a wake-up signal
    data = { type: 'wake' };
  }

  // If this is a wake-up signal, notify the main thread to check for new messages
  if (data.type === 'wake' || !data.title) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'PUSH_WAKE', timestamp: Date.now() });
        });

        // If no clients are open, show a generic notification
        if (clients.length === 0) {
          return self.registration.showNotification('Shield Messenger', {
            body: 'You have new encrypted messages',
            icon: '/icon-192.svg',
            badge: '/icon-192.svg',
            tag: 'sl-wake',
            data: { type: 'message', targetId: '' },
          });
        }
      })
    );
    return;
  }

  // Notification with content (generated locally by the main thread)
  const options = {
    body: data.body ?? '',
    icon: data.icon ?? '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: data.tag ?? `sl-push-${Date.now()}`,
    renotify: !!data.tag,
    data: data.data ?? {},
    silent: data.silent ?? false,
  };

  if (data.image) options.image = data.image;
  if (data.vibrate) options.vibrate = data.vibrate;

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─────────────────── Notification Click ───────────────────

self.addEventListener('notificationclick', (event) => {
  console.log('[SL:SW] Notification clicked:', event.notification.tag);
  event.notification.close();

  const data = event.notification.data ?? {};
  const type = data.type ?? 'message';
  const targetId = data.targetId ?? '';

  // Build the target URL based on notification type
  let targetUrl = '/';
  switch (type) {
    case 'message':
      targetUrl = targetId ? `/chat?id=${targetId}` : '/chat';
      break;
    case 'call':
      targetUrl = targetId ? `/calls?id=${targetId}` : '/calls';
      break;
    case 'friend_request':
      targetUrl = '/contacts?tab=requests';
      break;
    case 'group_invite':
      targetUrl = '/contacts?tab=groups';
      break;
    case 'security_alert':
    case 'identity_key_change':
      targetUrl = targetId ? `/contacts?verify=${targetId}` : '/contacts';
      break;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an existing window if one is open
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: { type, targetId },
          });
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ─────────────────── Notification Close ───────────────────

self.addEventListener('notificationclose', (event) => {
  console.log('[SL:SW] Notification dismissed:', event.notification.tag);
});
