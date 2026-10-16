// Extrait de l'ancien js/app.js — Synchronisation cloud et démarrage de l'app (window.onload).
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// =========================================================================
// === SYNCHRONISATION CLOUD DE LA PROGRESSION (best-effort) ===
// =========================================================================
// Modèle volontairement simple pour cette première version (voir
// api/sync.js) : si l'appareil n'a localement AUCUNE progression (premier
// lancement après réinstallation, ou nouvel appareil), on restaure celle
// sauvegardée dans le cloud sous ce device_id. Sinon, la progression
// locale reste la source de vérité et on se contente de la pousser vers
// le cloud (sauvegarde de secours). Ni l'un ni l'autre ne bloque le
// lancement de l'app : en cas d'échec réseau, tout continue localement.
function hasAnyLocalProgress() {
    return SYNC_KEYS.some(key => {
        try { return localStorage.getItem(key) != null; } catch (e) { return false; }
    });
}

function syncPushProgress() {
    if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) return;
    try {
        const deviceId = getOrCreateDeviceId();
        const pseudo = (typeof pseudoLoad === 'function' ? pseudoLoad() : '') || null;
        HistoriAxeAPI.pushProgress(deviceId, pseudo, exportSyncableState());
    } catch (e) { }
}

function syncOnAppStart() {
    if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) return;
    const deviceId = getOrCreateDeviceId();
    const localAlreadyHasProgress = hasAnyLocalProgress();

    HistoriAxeAPI.pullProgress(deviceId).then(res => {
        if (!res.ok || !res.data) return;
        if (!localAlreadyHasProgress && res.data.data) {
            importSyncableState(res.data.data);
            if (res.data.pseudo) pseudoSave(res.data.pseudo);
        } else {
            // La progression locale prime : on (re)pousse pour que le
            // cloud reflète le dernier état connu de cet appareil.
            syncPushProgress();
        }
    });
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

    syncOnAppStart();

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
