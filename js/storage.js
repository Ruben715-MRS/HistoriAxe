// =========================================================================
// === HISTORIAXE — MODULE DE STOCKAGE PERSISTANT (STORAGE & SRS) ===
// =========================================================================

const SETTINGS_KEY = 'historiaxe_settings';
const SRS_KEY = 'historiaxe_srs_v1';
const PROGRESS_KEY = 'historiaxe_progress_v1';
const FAVORITES_KEY = 'historiaxe_favorites';
const CUSTOM_THEMES_KEY = 'historiaxe_custom_themes';
const CUSTOM_EVENTS_KEY = 'historiaxe_custom_events';
const LEADERBOARD_KEY = 'historiaxe_daily_leaderboard_v1';
const STREAK_KEY = 'historiaxe_streak_v1';
const GAMIFICATION_KEY = 'historiaxe_gamification_v1';
const LANG_KEY = 'historiaxe_language_v1';
const INSTALLED_LANGS_KEY = 'historiaxe_installed_languages_v1';
const DEVICE_ID_KEY = 'historiaxe_device_id_v1';
const PSEUDO_KEY = 'historiaxe_pseudo_v1';
const ONBOARDING_KEY = 'historiaxe_onboarding_v1';
const RECAP_LOG_KEY = 'historiaxe_recap_log_v1';
const WEEKLY_XP_KEY = 'historiaxe_weekly_xp_v1';

// Clés dont le contenu est envoyé/reçu par la synchronisation cloud
// (api/sync.js) — progression de jeu uniquement, jamais les préférences
// d'affichage (SETTINGS_KEY), qui restent propres à chaque appareil.
const SYNC_KEYS = [SRS_KEY, PROGRESS_KEY, FAVORITES_KEY, CUSTOM_THEMES_KEY, CUSTOM_EVENTS_KEY, STREAK_KEY, GAMIFICATION_KEY];

const DEFAULT_SETTINGS = {
    orientation: 'auto',
    appearance: 'auto',
    axesLegendPinned: true,
    sound: true,
    haptics: true,
    notifications: true,
    lang: 'fr'
};

// --- RÉGLAGES ---
function settingsLoad() {
    try {
        return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {});
    } catch (e) {
        return Object.assign({}, DEFAULT_SETTINGS);
    }
}

function settingsSave(data) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
    } catch (e) {}
}

// --- SRS (RÉPÉTITION ESPACÉE / POINTS FAIBLES) ---
function srsLoad() {
    try { return JSON.parse(localStorage.getItem(SRS_KEY)) || {}; }
    catch (e) { return {}; }
}

function srsSave(data) {
    try { localStorage.setItem(SRS_KEY, JSON.stringify(data)); } catch (e) {}
}

function srsRecord(eventId, isSuccess) {
    if (!eventId) return;
    const data = srsLoad();
    const current = data[eventId] || { box: 1, lastReviewed: 0, failCount: 0, successCount: 0 };
    if (isSuccess) {
        current.box = Math.min(5, (current.box || 1) + 1);
        current.successCount = (current.successCount || 0) + 1;
    } else {
        current.box = 1;
        current.failCount = (current.failCount || 0) + 1;
    }
    current.lastReviewed = Date.now();
    data[eventId] = current;
    srsSave(data);
}

// Note : getWeakEvents() (liste des événements « points faibles » du SRS,
// utilisée pour les modes de révision) vit dans js/app.js — elle a besoin de
// getAllEventsWithLocation() pour retrouver le thème d'origine de chaque
// événement, une info que ce module (sans dépendance au reste de l'app) n'a
// pas.

// --- PROGRESSION & HISTORIQUE DES THEMES ---
function progressLoad() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
    catch (e) { return {}; }
}

function progressSave(data) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(data)); } catch (e) {}
}

function recordThemeCompletion(themeId, score, isWin) {
    if (!themeId) return;
    const p = progressLoad();
    const prev = p[themeId] || { plays: 0, wins: 0, bestScore: 0, lastPlayed: 0 };
    prev.plays += 1;
    if (isWin) prev.wins += 1;
    prev.bestScore = Math.max(prev.bestScore, score || 0);
    prev.lastPlayed = Date.now();
    p[themeId] = prev;
    progressSave(p);
}

// --- DÉVERROUILLAGE DES MODES CHRONO / EXPERT (par thème) ---
// Découverte, Entraînement et Classique sont toujours libres d'accès.
// Réussir Classique sur un thème déverrouille Chrono sur ce même thème ;
// réussir Chrono déverrouille ensuite Expert, toujours sur ce thème.
function progressRecordWin(themeId, mode) {
    if (!themeId || (mode !== 'classic' && mode !== 'chrono')) return;
    const data = progressLoad();
    const entry = data[themeId] || { classicWon: false, chronoWon: false };
    if (mode === 'classic') entry.classicWon = true;
    if (mode === 'chrono') entry.chronoWon = true;
    data[themeId] = entry;
    progressSave(data);
}

function isChronoUnlocked(themeId) {
    const data = progressLoad();
    return !!(data[themeId] && data[themeId].classicWon);
}

function isExpertUnlocked(themeId) {
    const data = progressLoad();
    return !!(data[themeId] && data[themeId].chronoWon);
}

// --- FAVORIS ---
function favoritesLoad() {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; }
    catch (e) { return []; }
}

function favoritesSave(list) {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(list)); } catch (e) {}
}

function isFavorite(themeId) {
    return favoritesLoad().includes(themeId);
}

function toggleFavoriteStorage(themeId) {
    const list = favoritesLoad();
    const idx = list.indexOf(themeId);
    if (idx === -1) list.push(themeId);
    else list.splice(idx, 1);
    favoritesSave(list);
    return idx === -1;
}

// --- CONTENU PERSONNALISÉ (THÈMES & ÉVÉNEMENTS) ---
function customThemesLoad() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_THEMES_KEY)) || []; }
    catch (e) { return []; }
}

function customThemesSave(list) {
    try { localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(list)); } catch (e) {}
}

function customEventsLoad() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_EVENTS_KEY)) || {}; }
    catch (e) { return {}; }
}

function customEventsSave(data) {
    try { localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(data)); } catch (e) {}
}

// --- SÉRIES QUOTIDIENNES (STREAKS) ---
function streakLoad() {
    try {
        return JSON.parse(localStorage.getItem(STREAK_KEY)) || { currentStreak: 0, maxStreak: 0, lastPlayedDate: null };
    } catch (e) {
        return { currentStreak: 0, maxStreak: 0, lastPlayedDate: null };
    }
}

function streakSave(data) {
    try {
        localStorage.setItem(STREAK_KEY, JSON.stringify(data));
    } catch (e) {}
}

function getDaysDifference(dateStr1, dateStr2) {
    if (!dateStr1 || !dateStr2) return null;
    const d1 = new Date(dateStr1 + 'T00:00:00Z');
    const d2 = new Date(dateStr2 + 'T00:00:00Z');
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function getTodayStringUTC() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function streakRecordToday() {
    const data = streakLoad();
    const today = getTodayStringUTC();

    if (data.lastPlayedDate === today) {
        return data;
    }

    if (!data.lastPlayedDate) {
        data.currentStreak = 1;
    } else {
        const diff = getDaysDifference(data.lastPlayedDate, today);
        if (diff === 1) {
            data.currentStreak += 1;
        } else if (diff > 1) {
            data.currentStreak = 1;
        }
    }

    data.maxStreak = Math.max(data.maxStreak || 0, data.currentStreak);
    data.lastPlayedDate = today;
    streakSave(data);
    return data;
}

// Date locale (fuseau de l'appareil) au format YYYY-MM-DD — contrairement à
// getTodayStringUTC() ci-dessus (frontière UTC 05h00, choisie pour l'équité du
// Défi du jour entre fuseaux), le récap hebdo/mensuel (js/recap.js) et le
// regroupement en ligues hebdomadaires (js/apiClient.js) sont des vues
// personnelles sans enjeu d'équité entre joueurs : la date ressentie par le
// joueur (son propre fuseau) est plus juste ici.
function getLocalDateString(refDate) {
    const d = refDate || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Semaine ISO 8601 (ex: '2026-W36') de la date locale donnée (par défaut :
// aujourd'hui). Algorithme standard (jeudi de la semaine ISO courante).
function getIsoWeekString(refDate) {
    const d = refDate ? new Date(refDate.getTime()) : new Date();
    d.setHours(0, 0, 0, 0);
    const dayNum = (d.getDay() + 6) % 7; // Lundi=0 ... Dimanche=6
    d.setDate(d.getDate() - dayNum + 3); // Jeudi de cette semaine ISO
    const firstThursday = new Date(d.getFullYear(), 0, 4);
    const diffDays = Math.round((d.getTime() - firstThursday.getTime()) / 86400000);
    const week = 1 + Math.round(diffDays / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getStreakCount() {
    const data = streakLoad();
    const today = getTodayStringUTC();
    if (!data.lastPlayedDate) return 0;
    const diff = getDaysDifference(data.lastPlayedDate, today);
    if (diff === 0 || diff === 1) {
        return data.currentStreak;
    }
    return 0;
}

// --- JOURNAL DU RÉCAP HEBDO/MENSUEL (voir js/recap.js) ---
// Journal compact, un point par jour joué : [{date:'YYYY-MM-DD', xp, themesWon}].
// Alimenté par gamification.js: awardXP() (xp) et recordThemeCompletion()
// ci-dessous (themesWon). Purgé au-delà de 35 jours glissants — largement
// suffisant pour comparer une semaine/un mois au précédent (voir
// computeWeeklyRecap/computeMonthlyRecap dans js/recap.js), inutile de
// conserver un historique illimité en localStorage.
const RECAP_LOG_MAX_DAYS = 35;

function recapLogLoad() {
    try {
        const data = JSON.parse(localStorage.getItem(RECAP_LOG_KEY));
        return Array.isArray(data) ? data : [];
    } catch (e) {
        return [];
    }
}

function recapLogSave(list) {
    try { localStorage.setItem(RECAP_LOG_KEY, JSON.stringify(list)); } catch (e) {}
}

function addRecapLogEntry(xpDelta, themesWonDelta) {
    const today = getLocalDateString();
    const list = recapLogLoad();
    let entry = list.find(e => e.date === today);
    if (!entry) {
        entry = { date: today, xp: 0, themesWon: 0 };
        list.push(entry);
    }
    entry.xp += Math.max(0, Math.round(xpDelta) || 0);
    entry.themesWon += Math.max(0, Math.round(themesWonDelta) || 0);

    const cutoff = Date.now() - RECAP_LOG_MAX_DAYS * 24 * 3600 * 1000;
    const pruned = list.filter(e => {
        const t = new Date(e.date + 'T00:00:00').getTime();
        return isFinite(t) && t >= cutoff;
    });
    recapLogSave(pruned);
}

// --- XP HEBDOMADAIRE (ligues, voir js/league.js + api/league.js) ---
// Accumulateur local, remis à zéro automatiquement au changement de semaine
// ISO (voir getIsoWeekString ci-dessus) — c'est le total envoyé tel quel au
// backend (pas un delta, voir api/league.js pour la raison).
function weeklyXpLoad() {
    const currentWeek = getIsoWeekString();
    try {
        const data = JSON.parse(localStorage.getItem(WEEKLY_XP_KEY));
        if (data && data.isoWeek === currentWeek && typeof data.xp === 'number') return data;
    } catch (e) {}
    return { isoWeek: currentWeek, xp: 0 };
}

function weeklyXpAdd(delta) {
    const data = weeklyXpLoad(); // Remis à zéro ci-dessus si la semaine a changé.
    data.xp += Math.max(0, Math.round(delta) || 0);
    try { localStorage.setItem(WEEKLY_XP_KEY, JSON.stringify(data)); } catch (e) {}
    return data;
}

// --- ONBOARDING (coach-marks des 3 premières minutes, voir js/onboarding.js) ---
// Volontairement non synchronisé (SYNC_KEYS) : c'est une préférence d'affichage
// propre à cet appareil, comme SETTINGS_KEY, pas une donnée de progression.
function onboardingLoad() {
    try {
        return Object.assign({ completed: false, shownSteps: [] }, JSON.parse(localStorage.getItem(ONBOARDING_KEY)) || {});
    } catch (e) {
        return { completed: false, shownSteps: [] };
    }
}

function onboardingSave(data) {
    try { localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data)); } catch (e) {}
}

// --- IDENTITÉ JOUEUR (classement mondial & sync cloud) ---
// Identifiant d'appareil généré une seule fois, au tout premier lancement :
// c'est l'identité utilisée par le backend (voir api/_lib/players.js) pour
// retrouver/mettre à jour un joueur, sans compte ni mot de passe.
function getOrCreateDeviceId() {
    try {
        var existing = localStorage.getItem(DEVICE_ID_KEY);
        if (existing) return existing;
        var id = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0;
                var v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        localStorage.setItem(DEVICE_ID_KEY, id);
        return id;
    } catch (e) {
        // localStorage indisponible (navigation privée stricte...) : on
        // retombe sur un identifiant de session, non persistant.
        return 'anon-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
    }
}

function pseudoLoad() {
    try { return localStorage.getItem(PSEUDO_KEY) || ''; } catch (e) { return ''; }
}

function pseudoSave(pseudo) {
    try { localStorage.setItem(PSEUDO_KEY, (pseudo || '').trim().slice(0, 20)); } catch (e) {}
}

// --- SYNCHRONISATION CLOUD DE LA PROGRESSION ---
// Sérialise/restaure le sous-ensemble "progression de jeu" du localStorage
// (voir SYNC_KEYS) pour l'envoyer à / recevoir de api/sync.js. Best-effort :
// la progression locale reste toujours la source de vérité immédiate, le
// cloud n'est qu'une sauvegarde de secours (changement d'appareil,
// réinstallation) — voir syncPushProgress/syncPullProgress dans daily.js.
function exportSyncableState() {
    var out = {};
    SYNC_KEYS.forEach(function (key) {
        try {
            var raw = localStorage.getItem(key);
            if (raw != null) out[key] = JSON.parse(raw);
        } catch (e) {}
    });
    return out;
}

function importSyncableState(data) {
    if (!data || typeof data !== 'object') return;
    SYNC_KEYS.forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            try { localStorage.setItem(key, JSON.stringify(data[key])); } catch (e) {}
        }
    });
}

// --- RÉINITIALISATION GLOBALE ---
function resetAllGameData() {
    try { localStorage.removeItem(FAVORITES_KEY); } catch (e) {}
    try { localStorage.removeItem(SRS_KEY); } catch (e) {}
    try { localStorage.removeItem(PROGRESS_KEY); } catch (e) {}
    try { localStorage.removeItem(CUSTOM_THEMES_KEY); } catch (e) {}
    try { localStorage.removeItem(CUSTOM_EVENTS_KEY); } catch (e) {}
    try { localStorage.removeItem(LEADERBOARD_KEY); } catch (e) {}
    try { localStorage.removeItem(STREAK_KEY); } catch (e) {}
    try { localStorage.removeItem(GAMIFICATION_KEY); } catch (e) {}
}

// Export CommonJS pour les tests unitaires (node --test tests/), même
// principe que js/gamification.js et js/dailyEngine.js : no-op dans le
// navigateur. Seules les fonctions pures (sans DOM/localStorage) sont
// exposées ici.
if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = { getIsoWeekString, getLocalDateString, getDaysDifference, getTodayStringUTC };
}
