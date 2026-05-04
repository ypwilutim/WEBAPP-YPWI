// sw.js - Service Worker for YPWI Absensi PWA
const CACHE_NAME = 'ypwi-absensi-v1';
const urlsToCache = [
  '/',
  '/styles.css',
  '/login.html',
  '/dashboard.html',
  '/admin-dashboard.html',
  '/complete-profile.html',
  '/search-teacher.html',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Caching failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/login.html');
        }
      })
  );
});

// Background sync for offline attendance (if supported)
self.addEventListener('sync', event => {
  if (event.tag === 'attendance-sync') {
    event.waitUntil(syncAttendanceData());
  }
});

// Function to sync offline attendance data
async function syncAttendanceData() {
  try {
    // Get stored offline attendance data
    const offlineData = await getOfflineAttendanceData();

    for (const data of offlineData) {
      try {
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.token}`
          },
          body: JSON.stringify({
            jenis: data.jenis,
            metode: data.metode,
            latitude: data.latitude,
            longitude: data.longitude
          })
        });

        if (response.ok) {
          // Remove from offline storage
          await removeOfflineAttendanceData(data.id);
          console.log('Synced offline attendance:', data.id);
        }
      } catch (error) {
        console.error('Failed to sync attendance:', data.id, error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Helper functions for offline storage (simplified)
async function getOfflineAttendanceData() {
  // In a real app, use IndexedDB
  return JSON.parse(localStorage.getItem('offlineAttendance') || '[]');
}

async function removeOfflineAttendanceData(id) {
  const data = await getOfflineAttendanceData();
  const filtered = data.filter(item => item.id !== id);
  localStorage.setItem('offlineAttendance', JSON.stringify(filtered));
}