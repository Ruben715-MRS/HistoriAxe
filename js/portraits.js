// =========================================================================
// === PORTRAITS HORS LIGNE — téléchargement en bloc (réglages) ===
// =========================================================================
// Les portraits (assets/portraits/, ~113 Mo) ne sont pas dans le paquet de l'app native : ils viennent
// du site. Le joueur peut les télécharger d'un coup ; ils sont alors rangés dans PORTRAIT_CACHE, que le
// service worker sert en priorité (voir sw.js). Le téléchargement reprend là où il s'est arrêté : les
// portraits déjà reçus ne sont pas relus.

// IDENTIQUE à sw.js: PORTRAIT_CACHE (tests/portraits.test.js le vérifie). Sous un autre nom, le service
// worker purgerait ces portraits à chaque mise à jour.
const PORTRAIT_CACHE_NAME = 'historiaxe-portraits-v2';
const PORTRAIT_MANIFEST_URL = 'assets/portraits.json';
const PORTRAIT_DOWNLOAD_CONCURRENCY = 6;

let portraitManifest = null;

// Liste des portraits (chemins relatifs, ex. assets/portraits/x.jpg), ou null si elle est indisponible.
async function portraitManifestLoad() {
    if (portraitManifest) return portraitManifest;
    try {
        const res = await fetch(PORTRAIT_MANIFEST_URL);
        if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list)) portraitManifest = list;
        }
    } catch (e) { /* hors ligne : pas de liste, pas de téléchargement */ }
    return portraitManifest;
}

// Adresse absolue d'un portrait, telle que le cache la range (et telle que l'image la demande).
function portraitHref(path) {
    return new URL(HistoriAxeAPI.assetUrl(path), document.baseURI).href;
}

// { total, cached } : combien de portraits sont déjà téléchargés, sur le total.
async function portraitPackStatus() {
    const list = await portraitManifestLoad();
    const total = list ? list.length : 0;
    if (!list || !('caches' in window)) return { total: total, cached: 0 };
    const cache = await caches.open(PORTRAIT_CACHE_NAME);
    const have = new Set((await cache.keys()).map(req => req.url));
    return { total: total, cached: list.filter(p => have.has(portraitHref(p))).length };
}

// Télécharge les portraits manquants. onProgress(done, total) à chaque portrait traité.
// Renvoie le nombre de portraits qui n'ont pas pu être téléchargés (0 = tout est là).
async function portraitPackDownload(onProgress) {
    const list = await portraitManifestLoad();
    if (!list || !('caches' in window)) return list ? list.length : 0;
    const cache = await caches.open(PORTRAIT_CACHE_NAME);
    const queue = list.slice();
    let done = 0;
    let failed = 0;
    async function worker() {
        while (queue.length) {
            const path = queue.shift();
            const href = portraitHref(path);
            try {
                if (!(await cache.match(href))) {
                    const res = await fetch(href, { mode: 'cors' });
                    if (res.ok) await cache.put(href, res);
                    else failed++;
                }
            } catch (e) {
                failed++;
            }
            done++;
            if (typeof onProgress === 'function') onProgress(done, list.length);
        }
    }
    await Promise.all(Array.from({ length: PORTRAIT_DOWNLOAD_CONCURRENCY }, worker));
    return failed;
}

// Supprime les portraits téléchargés ; ils restent visibles en ligne.
async function portraitPackDelete() {
    if ('caches' in window) await caches.delete(PORTRAIT_CACHE_NAME);
}

// --- Réglages ---
function renderPortraitPackSettings() {
    const status = document.getElementById('settings-portraits-status');
    if (!status) return;
    if (!navigator.onLine) {
        status.textContent = t('settings.portraits_offline_need_internet');
        return;
    }
    portraitPackStatus().then(s => {
        if (!s.total) { status.textContent = ''; return; }
        status.textContent = t('settings.portraits_status', { cached: s.cached, total: s.total });
        document.getElementById('settings-portraits-delete').classList.toggle('hidden', s.cached === 0);
        document.getElementById('settings-portraits-download').classList.toggle('hidden', s.cached === s.total);
    });
}

function portraitPackDownloadAsk() {
    showConfirm(t('settings.portraits_download_confirm'), () => {
        const button = document.getElementById('settings-portraits-download');
        if (button) button.disabled = true;
        portraitPackDownload((done, total) => {
            const status = document.getElementById('settings-portraits-status');
            if (status) status.textContent = t('settings.portraits_progress', { done: done, total: total });
        }).then(failed => {
            if (button) button.disabled = false;
            if (failed) showToast(t('settings.portraits_failed', { failed: failed }), 4000);
            else showToast(t('settings.portraits_done'), 3000);
            renderPortraitPackSettings();
        });
    }, { okLabel: t('settings.portraits_download_btn') });
}

function portraitPackDeleteAsk() {
    showConfirm(t('settings.portraits_delete_confirm'), () => {
        portraitPackDelete().then(() => {
            showToast(t('settings.portraits_deleted'), 3000);
            renderPortraitPackSettings();
        });
    }, { okLabel: t('settings.portraits_delete_btn') });
}
