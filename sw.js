const CACHE_NAME = 'soundpulse-beatles-v1';

// Precaché de todos los archivos y las 5 imágenes de la carpeta Icon/
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './Icon/blue-album-the-beatles.jpg',
    './Icon/images.jpg',
    './Icon/The_Beatles_-_Let_It_Be.png',
    './Icon/The_Beatles_Abbey_Road_album_cover.jpg',
    './Icon/With-The-Beatles-60-aniversario-1.jpg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Guardando las 5 portadas e interfaz en caché...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request))
    );
});

// Listener Push para el servidor Express de Node.js
self.addEventListener('push', (event) => {
    let data = { title: '🎧 SoundPulse - The Beatles', body: '¡Nueva notificación recibida!' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: 'Icon/The_Beatles_Abbey_Road_album_cover.jpg',
        badge: 'Icon/The_Beatles_Abbey_Road_album_cover.jpg',
        vibrate: [100, 50, 100]
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});