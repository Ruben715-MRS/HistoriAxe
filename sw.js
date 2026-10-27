// =========================================================================
// === HISTORIAXE — SERVICE WORKER OFF-LINE & PACKS DE DONNÉES (SW.JS) ===
// =========================================================================

// Bumped alongside any change to ui/*.json, data/*.json, or the files listed
// in APP_SHELL_FILES below : ces deux caches suivent une stratégie
// cache-first (voir le handler 'fetch' plus bas), donc leur contenu n'est
// JAMAIS revalidé contre le réseau une fois mis en cache — la seule façon de
// pousser une mise à jour de ces fichiers vers un client qui a déjà l'app en
// cache est de changer ces identifiants de version, pour que le nettoyage
// dans 'activate' purge les anciens caches (devenus orphelins) et que
// 'install' recharge tout depuis le réseau. Un pack de langue ou un texte
// d'UI modifié qui ne s'affiche pas malgré un déploiement réussi est
// généralement le signe que l'un de ces deux numéros n'a pas été incrémenté.
const CACHE_VERSION = '1.4.284';
const APP_SHELL_CACHE = `historiaxe-shell-v${CACHE_VERSION}`;
const DATA_CACHE = 'historiaxe-data-v1.0.122';

// Portraits des personnages (assets/portraits/*.jpg, champ `image` des
// événements). Un cache À PART, et c'est tout l'objet : 'activate' purge tout
// cache dont le nom n'est pas dans sa liste blanche, si bien que des portraits
// rangés avec le reste seraient jetés à CHAQUE mise à jour de l'app — et
// retéléchargés un par un (quelques dizaines de Ko pièce, des centaines de
// portraits à terme). Ce nom-ci ne change pas avec CACHE_VERSION : il survit
// aux mises à jour. Le revers est une règle de nommage : un portrait n'est
// jamais remplacé sous le même nom de fichier (cache-first, donc l'ancien
// resterait servi indéfiniment) ; un portrait remplacé reçoit un nouveau nom,
// ou ce numéro monte. v1 → v2 : le portrait de Louis XIV a été recadré (corps entier au lieu du buste).
const PORTRAIT_CACHE = 'historiaxe-portraits-v2';

// Tailwind (css/tailwind.generated.css) et les polices Inter / Material
// Symbols (css/fonts.css + assets/fonts/*) sont désormais compilées et
// auto-hébergées (voir scripts/build.js et index.html) au lieu d'être
// chargées depuis cdn.tailwindcss.com / fonts.googleapis.com : elles sont
// donc des ressources same-origin normales, précachées ici comme le reste
// de l'App Shell. Avant ce changement, le premier lancement hors-ligne
// perdait tout le style Tailwind et la police Inter, ces ressources
// cross-origin n'étant jamais interceptées ni mises en cache (cf. le test
// `url.origin !== self.location.origin` plus bas).
const APP_SHELL_FILES = [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/style.css',
    './css/tailwind.generated.css',
    './css/fonts.css',
    './assets/fonts/inter-latin.woff2',
    './assets/fonts/material-symbols-outlined.woff2',
    './js/escape.js',
    './js/srs.js',
    './js/storage.js',
    './js/a11y.js',
    './js/audio.js',
    './js/onboarding.js',
    './js/notifications.js',
    './js/recap.js',
    './js/league.js',
    './js/duels.js',
    './js/gamification.js',
    './js/dailyEngine.js',
    './js/pathWorlds.js',
    './js/pathCore.js',
    './js/pathSprites.js',
    './js/pathScenery.js',
    './js/pathLessons.js',
    './js/calendarWheel.js',
    './js/eraConverter.js',
    './js/arcadeCore.js',
    './js/adventContent.js',
    './js/minigamesCore.js',
    './js/arcadeExtraCore.js',
    './js/reflexionContent.js',
    './js/reflexionCore.js',
    './js/rewardsCore.js',
    './js/clioCore.js',
    './js/clioArt.js',
    './js/apiClient.js',
    './js/auth.js',
    './js/daily.js',
    './js/weekly.js',
    './js/pack.js',
    './js/i18n.js',
    './js/geoMap.js',
    './js/mindMap.js',
    './js/simultaneity.js',
    './js/linkedEvents.js',
    './js/atlasCore.js',
    './js/geoPlace.js',
    './js/atlas.js',
    './js/gameModes.js',
    './js/classModes.js',
    './js/gallery.js',
    './js/app/settings.js',
    './js/app/dates.js',
    './js/app/custom-content.js',
    './js/app/selection-revision.js',
    './js/app/state.js',
    './js/app/navigation.js',
    './js/app/axes-rounds.js',
    './js/app/categories.js',
    './js/app/themes-screens.js',
    './js/app/rapports.js',
    './js/app/game-start.js',
    './js/modes/quiz.js',
    './js/modes/simultaneity.js',
    './js/modes/ordre.js',
    './js/modes/blitz.js',
    './js/modes/curseur.js',
    './js/modes/intrus.js',
    './js/modes/whois.js',
    './js/modes/avap.js',
    './js/modes/periodes.js',
    './js/modes/fil.js',
    './js/modes/ecart.js',
    './js/app/frise.js',
    './js/app/motion.js',
    './js/app/session-end.js',
    './js/app/modal.js',
    './js/app/play-mode.js',
    './js/app/expedition.js',
    './js/app/lesson.js',
    './js/app/path.js',
    './js/app/wheel.js',
    './js/app/eras.js',
    './js/app/arcade.js',
    './js/app/reflexion.js',
    './js/app/minigames.js',
    './js/app/flappy-backdrop.js',
    './js/app/arcade-extra.js',
    './js/periodSystems.js',
    './js/toolsCore.js',
    './js/dictionnaireCore.js',
    './js/citationsCore.js',
    './js/countriesCore.js',
    './js/geoQuizCore.js',
    './js/geoQuizSessionCore.js',
    './js/calendarYearCore.js',
    './js/app/tools.js',
    './js/app/dictionnaire.js',
    './js/app/citations.js',
    './js/app/countries.js',
    './js/cityGameCore.js',
    './js/cityHistoryCore.js',
    './js/cityPhotoCore.js',
    './js/modes/geoquiz.js',
    './js/modes/cities.js',
    './js/app/calendar.js',
    './js/genealogyCore.js',
    './js/app/genealogy.js',
    './js/stateLeadersData.js',
    './js/stateLeadersGouvernements.js',
    './js/stateLeadersVices.js',
    './js/stateLeadersParti.js',
    './js/stateLeadersCore.js',
    './js/app/state-leaders.js',
    './js/historyMapsCore.js',
    './js/app/history-maps.js',
    './js/measuresCore.js',
    './js/app/biblical-measures.js',
    './js/biblicalMapsCore.js',
    './js/app/biblical-maps.js',
    './js/app/rewards.js',
    './js/app/clio.js',
    './js/teamBadge.js',
    './js/teamProfile.js',
    './js/app/team.js',
    './js/app/team-social.js',
    './js/app/friends.js',
    './js/app/ranks.js',
    './js/classroom.js',
    './js/app.js',
    './ui/fr.json',
    './apple_icon.jpg',
    './accueil.jpg',
    // Variantes d'écran d'accueil selon le format d'écran (voir index.html
    // et #screen-home picture en CSS) : accueil.jpg reste le repli par
    // défaut, ces trois-là ne sont choisies que sur un format d'écran
    // correspondant.
    './splash_iphone_portrait.jpg',
    './splash_iphone_landscape.jpg',
    './splash_ipad_portrait.jpg',
    './assets/geo/theme-country-map.json',
    './assets/dictionnaire/termes.json',
    './assets/citations/index.json',
    './assets/citations/01.json',
    './assets/citations/02.json',
    './assets/citations/03.json',
    './assets/citations/04.json',
    './assets/citations/05.json',
    './assets/citations/06.json',
    './assets/citations/07.json',
    './assets/citations/08.json',
    './assets/citations/09.json',
    './assets/citations/10.json'
];

// --- INSTALLATION : Mise en cache de l'App Shell & Pack Français ---
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE).then((cache) => {
            console.log('[SW] Pre-caching App Shell');
            return cache.addAll(APP_SHELL_FILES);
        }).then(precachePackSkeleton).then(() => self.skipWaiting())
    );
});

// Le squelette du pack français (voir js/pack.js) est précaché pour que le
// premier lancement hors ligne fonctionne, comme l'était data/fr.json. Ses
// URL portent l'empreinte du contenu : on lit donc le manifeste d'abord.
// Best-effort : un échec ne doit pas empêcher d'installer l'app.
function precachePackSkeleton() {
    const manifestUrl = './data/pack/fr/manifest.json';
    return fetch(manifestUrl, { cache: 'no-store' })
        .then((res) => res.ok ? res.json() : null)
        .then((manifest) => {
            if (!manifest) return null;
            const skeletonUrl = './data/pack/fr/skeleton.json?v=' + manifest.skeleton;
            return caches.open(DATA_CACHE).then((cache) => cache.addAll([manifestUrl, skeletonUrl]));
        })
        .catch(() => { /* pack indisponible : l'app le demandera au réseau */ });
}

// --- ACTIVATION : Nettoyage des anciens caches obsolètes ---
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== APP_SHELL_CACHE && key !== DATA_CACHE && key !== PORTRAIT_CACHE) {
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

    // Portraits : cache-first dans leur cache dédié (voir PORTRAIT_CACHE). Ils
    // ne sont pas préchargés à l'installation — des centaines de fichiers
    // alourdiraient le premier lancement de ce que la plupart des joueurs ne
    // verront jamais — mais se mettent en cache à la première vue. Hors-ligne
    // et jamais vu, la requête échoue et l'app retire l'image (voir
    // js/app.js: setPortraitImg) : la fiche reste complète, sans portrait.
    if (url.pathname.includes('/assets/portraits/')) {
        event.respondWith(
            caches.open(PORTRAIT_CACHE).then((cache) =>
                cache.match(event.request).then((cached) => {
                    if (cached) return cached;
                    return fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                })
            )
        );
        return;
    }

    // Packs découpés (data/pack/<lang>/…, voir js/pack.js) :
    //  - manifest.json : RÉSEAU d'abord (il porte les empreintes de la version en
    //    cours), cache en secours hors ligne ;
    //  - squelette et fiches : leur URL contient l'empreinte (?v=…), donc
    //    immuables — cache d'abord, sans jamais servir un contenu périmé, et sans
    //    avoir à incrémenter DATA_CACHE à chaque ajout de contenu.
    if (url.pathname.includes('/data/pack/')) {
        const isManifest = url.pathname.endsWith('/manifest.json');
        event.respondWith(
            caches.open(DATA_CACHE).then((cache) => {
                const fromNetwork = () => fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });
                if (isManifest) {
                    return fromNetwork().catch(() => cache.match(event.request, { ignoreSearch: true }).then((cached) => cached || Response.error()));
                }
                return cache.match(event.request).then((cached) => cached || fromNetwork());
            })
        );
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

    // Requêtes standards App Shell (HTML, CSS, JS, Images locales) : réseau
    // d'abord, avec repli sur le cache si hors-ligne (ou requête échouée).
    // Un vrai correctif de bug ne doit jamais rester invisible pour un joueur
    // qui a déjà l'app en cache : contrairement aux packs de données/langue
    // (cache-first ci-dessus, téléchargés explicitement pour rester dispo
    // hors-ligne), le code de l'app doit toujours être la version la plus
    // fraîche disponible dès qu'il y a du réseau.
    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(APP_SHELL_CACHE).then((cache) => {
                    cache.put(event.request, responseClone);
                });
            }
            return networkResponse;
        }).catch(() => {
            return caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                // Mode hors-ligne, rien en cache pour cette requête précise :
                // retour à la racine si c'est une navigation.
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
