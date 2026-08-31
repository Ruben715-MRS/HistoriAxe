// =========================================================================
// === HISTORIAXE — SERVICE WORKER OFF-LINE & PACKS DE DONNÉES (SW.JS) ===
// =========================================================================

const CACHE_VERSION = '1.0.0';
const APP_SHELL_CACHE = `historiaxe-shell-v${CACHE_VERSION}`;
const DATA_CACHE = 'historiaxe-data-v1.0.0';

const APP_SHELL_FILES = [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/style.css',
    './js/storage.js',
    './js/audio.js',
    './js/gamification.js',
    './js/daily.js',
    './js/i18n.js',
    './js/app.js',
    './ui/fr.json',
    './data/fr.json',
    './apple_icon.jpg',
    './accueil.jpg'
];

// --- INSTALLATION : Mise en cache de l'App Shell & Pack Français ---
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE).then((cache) => {
            console.log('[SW] Pre-caching App Shell & French Pack');
            return cache.addAll(APP_SHELL_FILES);
        }).then(() => self.skipWaiting())
    );
});

// --- ACTIVATION : Nettoyage des anciens caches obsolètes ---
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== APP_SHELL_CACHE && key !== DATA_CACHE) {
                        console.log('[SW] Removing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// --- FETCH HANDLER : Stratégie Cache-First pour App Shell et Packs Téléchargés ---
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ne pas intercepter les requêtes externes (Wikipédia, polices Google CDN si en ligne)
    if (url.origin !== self.location.origin) {
        return;
    }

    // Requêtes de données et d'UI (data/*.json et ui/*.json)
    if (url.pathname.includes('/data/') || url.pathname.includes('/ui/')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(DATA_CACHE).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    // Fallback hors-ligne : retourner le pack français par défaut si un autre pack échoue
                    if (url.pathname.includes('/data/')) {
                        return caches.match('./data/fr.json');
                    } else if (url.pathname.includes('/ui/')) {
                        return caches.match('./ui/fr.json');
                    }
                });
            })
        );
        return;
    }

    // Requêtes standards App Shell (HTML, CSS, JS, Images locales)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(APP_SHELL_CACHE).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            });
        }).catch(() => {
            // Mode hors-ligne : retour à la racine si navigation
            if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        })
    );
});
