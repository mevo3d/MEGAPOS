// Service Worker para PWA de Captura Móvil
const CACHE_NAME = 'megamayoreo-capture-v1';
const STATIC_ASSETS = [
    '/mobile/capture',
    '/index.html',
    '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Cache abierto');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Estrategia de caché: Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
    // Solo cachear requests GET
    if (event.request.method !== 'GET') return;

    // Ignorar chrome-extension y otros esquemas no soportados
    const url = new URL(event.request.url);
    if (!url.protocol.startsWith('http')) return;

    // No cachear requests de API
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clonar la respuesta para guardar en cache
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Si falla la red, buscar en cache
                return caches.match(event.request);
            })
    );
});

// Sincronización en segundo plano
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-products') {
        event.waitUntil(syncPendingProducts());
    }
});

// Función para sincronizar productos pendientes
async function syncPendingProducts() {
    const pending = await getFromIndexedDB('pendingProducts');

    for (const product of pending) {
        try {
            await fetch('/api/productos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${product.token}`
                },
                body: JSON.stringify(product.data)
            });

            await removeFromIndexedDB('pendingProducts', product.id);
        } catch (error) {
            console.error('Error sincronizando producto:', error);
        }
    }
}

// Helpers para IndexedDB (simplificados)
function getFromIndexedDB(store) {
    return new Promise((resolve) => {
        const data = localStorage.getItem(store);
        resolve(data ? JSON.parse(data) : []);
    });
}

function removeFromIndexedDB(store, id) {
    return new Promise((resolve) => {
        const data = JSON.parse(localStorage.getItem(store) || '[]');
        const filtered = data.filter(item => item.id !== id);
        localStorage.setItem(store, JSON.stringify(filtered));
        resolve();
    });
}
