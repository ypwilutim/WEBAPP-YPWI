/**
 * Scanner Service Worker
 * Provides offline functionality and background sync for scanner PWA
 */

const CACHE_VERSION = '1.0.3';
const CACHE_NAME = `ypwi-scanner-v${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/scanner.html?v=' + CACHE_VERSION,
  '/scanner-manifest.json?v=' + CACHE_VERSION,
  '/js/scanner-app.js?v=' + CACHE_VERSION,
  '/assets/images/YPWI LOGO HITAM.png?v=' + CACHE_VERSION
  // Note: External CDN resources (Tailwind, FontAwesome, jsQR)
  // are NOT cached due to CORS. They load directly from CDN in browser.
];

// Store name for IndexedDB sync (must match scanner-app.js)
const QUEUE_STORE = 'attendance-queue';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing scanner service worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches and force refresh
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v' + CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => {
      // Force refresh all clients to get latest version
      return self.clients.claim().then(() => {
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'CACHE_BUST', version: CACHE_VERSION });
          });
        });
      });
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip external CDN requests (CORS issue) - let browser handle directly
  if (url.hostname !== location.hostname) {
    // External resource - don't interfere
    return;
  }

  // API requests: network-first (don't cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        // Return cached version, but also update in background
        fetch(request).then(networkResp => {
          if (networkResp.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, networkResp));
          }
        });
        return response;
      }
      return fetch(request).then(networkResp => {
        if (networkResp.ok) {
          // IMPORTANT: Clone immediately before returning to avoid body-used errors
          const respClone = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, respClone));
        }
        return networkResp;
      }).catch(() => {
        // Offline fallback
        if (request.destination === 'document') {
          return caches.match('/scanner.html');
        }
        return new Response('Offline - No cache', { status: 503 });
      });
    })
  );
});

// Network-first strategy for API
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
  }

  // Fallback to cache (for GET requests only)
  if (request.method === 'GET') {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
  }

  // Return offline response
  return new Response(JSON.stringify({
    success: false,
    message: 'Offline - No internet connection',
    offline: true
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Background Sync for offline queue
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'attendance-sync') {
    event.waitUntil(syncAttendanceQueue());
  }
});

async function syncAttendanceQueue() {
  console.log('[SYNC] Starting background sync');
  
  try {
    // Open IndexedDB (same as scanner-app.js)
    const db = await openIndexedDB();
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const allItems = await store.getAll();

    const pending = allItems.filter(item => item.syncStatus === 'pending');
    console.log(`[SYNC] Found ${pending.length} pending items`);

    for (const item of pending) {
      try {
        const response = await fetch('/api/scanner/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scan_id: item.scan_id,
            timestamp: item.timestamp,
            type: item.type,
            device_id: item.device_id,
            signature: item.signature,
            offline_validated: item.offline_validated
          })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Remove from queue
          await store.delete(item.id);
          console.log(`[SYNC] Synced item ${item.id}: ${item.scan_id}`);
          
          // Notify client
          notifyClients('sync-success', { scan_id: item.scan_id });
        } else {
          console.error(`[SYNC] Failed: ${item.scan_id}`, result.message);
          // Mark as failed after retries?
          item.syncStatus = 'failed';
          item.errorMessage = result.message || 'Sync failed';
          await store.put(item);
          
          notifyClients('sync-failed', { scan_id: item.scan_id, error: result.message });
        }
      } catch (error) {
        console.error(`[SYNC] Error: ${item.scan_id} -`, error.message);
        // Keep in queue for retry
      }
    }

    console.log('[SYNC] Background sync completed');
  } catch (error) {
    console.error('[SYNC] Fatal error:', error);
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('scanner-attendance-db', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Notify all clients about sync status
function notifyClients(type, data) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type, data });
    });
  });
}

// Push event (optional - for future push notifications)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  // TODO: Implement push notifications if needed
});

// Message event (from client)
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    self.registration.sync.register('attendance-sync')
      .then(() => console.log('[SW] Background sync registered'))
      .catch(err => console.error('[SW] Sync registration failed:', err));
  }

  if (event.data && event.data.type === 'GET_QUEUE_COUNT') {
    // Return pending count
    getQueueCount().then(count => {
      event.ports[0].postMessage({ count });
    });
  }

  if (event.data && event.data.type === 'FORCE_REFRESH') {
    console.log('[SW] Force refresh requested');
    // Clear all caches
    caches.keys().then(names => {
      return Promise.all(
        names.map(name => caches.delete(name))
      );
    }).then(() => {
      // Notify all clients to refresh
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_BUST', force: true });
        });
      });
    });
  }
});

async function getQueueCount() {
  const db = await openIndexedDB();
  const tx = db.transaction(QUEUE_STORE, 'readonly');
  const store = tx.objectStore(QUEUE_STORE);
  const all = await store.getAll();
  return all.filter(item => item.syncStatus === 'pending').length;
}

console.log('[SW] Scanner service worker loaded');
