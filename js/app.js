// Extrait de l'ancien js/app.js — Synchronisation cloud et démarrage de l'app (window.onload).
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// =========================================================================
// === SYNCHRONISATION CLOUD DE LA PROGRESSION (best-effort) ===
// =========================================================================
// La progression locale reste la source de vérité immédiate ; le cloud
// (api/sync.js) sert de sauvegarde et de lien entre les appareils d'un même
// compte (voir js/auth.js). À chaque synchronisation : on lit le cloud ; si
// un autre appareil l'a modifié depuis notre dernier passage, on fusionne
// (storage.js: mergeSyncableStates — rien ne se perd, la série la plus
// récente gagne), puis on renvoie le résultat. Rien ne bloque le jeu : en
// cas d'échec réseau, tout continue localement.
function hasAnyLocalProgress() {
    return SYNC_KEYS.some(key => {
        try { return localStorage.getItem(key) != null; } catch (e) { return false; }
    });
}

let syncInFlight = null;

// Renvoie une promesse résolue en true si la progression locale a changé
// (fusion ou restauration depuis le cloud), false sinon.
function syncProgress() {
    if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) return Promise.resolve(false);
    // Une seule synchronisation à la fois : la suivante repart de l'état fusionné.
    if (syncInFlight) return syncInFlight.then(() => syncProgress());
    const deviceId = getOrCreateDeviceId();
    syncInFlight = HistoriAxeAPI.pullProgress(deviceId).then(res => {
        if (!res.ok || !res.data) return false;
        const cloud = res.data.data;
        let changed = false;
        if (cloud && res.data.updatedAt !== syncMetaLoad()) {
            const merged = hasAnyLocalProgress() ? mergeSyncableStates(exportSyncableState(), cloud) : cloud;
            importSyncableState(merged);
            if (res.data.pseudo && !pseudoLoad()) pseudoSave(res.data.pseudo);
            changed = true;
        }
        const pseudo = pseudoLoad() || null;
        return HistoriAxeAPI.pushProgress(deviceId, pseudo, exportSyncableState()).then(r => {
            if (r.ok && r.data) syncMetaSave(r.data.updatedAt);
            return changed;
        });
    }).catch(() => false).finally(() => { syncInFlight = null; });
    return syncInFlight;
}

// Appelée après chaque partie et après une réinitialisation.
function syncPushProgress() {
    try { syncProgress(); } catch (e) { }
}

function syncOnAppStart() {
    syncProgress();
}

window.onload = async () => {
    applyAppearance();
    applyOrientationLayout();
    initSettingsControls();
    initModesGroups();
    if (typeof initRecapControls === 'function') initRecapControls();

    // Initialisation i18n et chargement de la langue active
    if (typeof i18n !== 'undefined') {
        await i18n.init();
    }

    if (typeof initCategories === 'function') {
        initCategories();
    }

    // Retour d'une connexion (Google, lien reçu par e-mail) : Auth s'occupe de la synchronisation.
    const authRedirect = typeof Auth !== 'undefined' && Auth.init();
    if (!authRedirect) syncOnAppStart();

    // Duels asynchrones entre amis (voir js/duels.js) : lien entrant
    // (?duel=xxx) et vérification best-effort des duels perdus depuis la
    // dernière ouverture de l'app.
    if (typeof checkIncomingDuelLink === 'function') checkIncomingDuelLink();
    if (typeof checkMyDuels === 'function') checkMyDuels();

    // Notifications locales (voir js/notifications.js) : reprogrammées à
    // chaque retour au premier plan (le plugin @capacitor/app est déjà
    // une dépendance native, jusqu'ici inutilisée). N'a d'effet que si la
    // permission a déjà été accordée — jamais demandée au démarrage.
    if (typeof HistoriAxeNotifications !== 'undefined' && HistoriAxeNotifications.isSupported()) {
        HistoriAxeNotifications.refreshAll();
        try {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
                window.Capacitor.Plugins.App.addListener('appStateChange', (state) => {
                    if (state && state.isActive) HistoriAxeNotifications.refreshAll();
                });
            }
        } catch (e) { }
    }

    showScreen('screen-home');

    // Hors-ligne : les fiches d'un pack découpé (js/pack.js) arrivent à la demande ; on réchauffe
    // le cache en arrière-plan pour qu'elles restent lisibles sans réseau. Jamais sur données
    // limitées ou connexion lente, et pas sous automatisation (tests).
    if (typeof Pack !== 'undefined' && Pack.isSplit() && !navigator.webdriver) {
        setTimeout(() => {
            const c = navigator.connection;
            const metered = c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''));
            if (navigator.onLine && !metered) Pack.prefetchAll({ concurrency: 2 });
        }, 20000);
    }

    // Récap hebdo/mensuel (voir js/recap.js) : proposé au plus une fois par
    // semaine ISO, jamais tant que l'onboarding n'est pas terminé. Léger
    // différé pour ne jamais concurrencer la bulle de bienvenue de
    // l'onboarding sur ce même écran.
    if (typeof maybeShowAutoRecap === 'function') {
        setTimeout(maybeShowAutoRecap, 1200);
    }
};
