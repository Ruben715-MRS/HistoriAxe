// =========================================================================
// === HISTORIAXE API — TIRAGE DU JOUR (recalculé côté serveur) ===
// =========================================================================

const DailyEngine = require('../../js/dailyEngine.js');
const { loadLangEvents } = require('./dataset');

const MAX_CLOCK_SKEW_DAYS = 1; // tolère un décalage d'horloge client raisonnable

// Renvoie les dates (dans l'ordre de jeu) des 10 événements du Défi du jour
// pour `lang`, à la date `dateStr` (format YYYY-MM-DD, cf. getDailySeedString).
function getDailyOrderedDates(lang, dateStr) {
    const events = loadLangEvents(lang);
    if (events.length === 0) return [];
    const picked = DailyEngine.pickDailyItems(events, dateStr, 10, (it) => it.date);
    return picked.map((it) => it.date);
}

// Le client envoie la date qu'il croit être "aujourd'hui" (son horloge locale,
// même frontière 05h UTC que getDailySeedString) : on ne lui fait pas
// confiance aveuglément, mais on tolère un léger écart d'horloge en
// n'acceptant que la date du jour côté serveur, celle de la veille ou celle
// du lendemain (utile en fin/début de fenêtre de bascule).
function resolveChallengeDate(clientDateStr, refDate) {
    const today = DailyEngine.getDailySeedString(refDate);
    if (clientDateStr === today) return today;

    const candidates = [];
    for (let d = -MAX_CLOCK_SKEW_DAYS; d <= MAX_CLOCK_SKEW_DAYS; d++) {
        const shifted = new Date((refDate || new Date()).getTime() + d * 24 * 3600 * 1000);
        candidates.push(DailyEngine.getDailySeedString(shifted));
    }
    if (candidates.includes(clientDateStr)) return clientDateStr;
    return today; // date farfelue : on retombe sur "aujourd'hui" côté serveur
}

module.exports = { getDailyOrderedDates, resolveChallengeDate };
