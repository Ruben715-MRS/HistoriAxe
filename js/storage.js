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

const DEFAULT_SETTINGS = {
    orientation: 'auto',
    appearance: 'auto',
    axesLegendPinned: true,
    sound: true,
    haptics: true,
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

function getWeakEvents(customPool = null) {
    const data = srsLoad();
    const pool = customPool || (typeof getAllEventsFlat === 'function' ? getAllEventsFlat() : []);
    return pool.filter(e => {
        const info = data[e.id];
        return info && info.box < 5 && (info.failCount || 0) > 0;
    });
}

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
