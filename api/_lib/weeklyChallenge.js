// =========================================================================
// === HISTORIAXE API — TIRAGE DE LA SEMAINE (recalculé côté serveur) ===
// =========================================================================
// Miroir de api/_lib/dailyChallenge.js pour le Défi hebdomadaire : 30
// événements (au lieu de 10) tirés une fois par semaine ISO (au lieu d'une
// fois par jour).

const DailyEngine = require('../../js/dailyEngine.js');
const { loadLangEvents } = require('./dataset');

const WEEKLY_CHALLENGE_EVENT_COUNT = 30;
const MAX_CLOCK_SKEW_WEEKS = 1; // tolère un décalage d'horloge client raisonnable

// Renvoie les dates (dans l'ordre de jeu) des 30 événements du Défi
// hebdomadaire pour `lang`, à la semaine ISO `isoWeek` (format 'YYYY-Www',
// cf. DailyEngine.getWeeklySeedString).
function getWeeklyChallengeOrderedDates(lang, isoWeek) {
    const events = loadLangEvents(lang);
    if (events.length === 0) return [];
    const picked = DailyEngine.pickDailyItems(events, isoWeek, WEEKLY_CHALLENGE_EVENT_COUNT, (it) => it.date, 'historiaxe_weekly_');
    return picked.map((it) => it.date);
}

// Le client envoie la semaine ISO qu'il croit être « la semaine en cours »
// (son horloge locale, même frontière que DailyEngine.getWeeklySeedString) :
// on ne lui fait pas confiance aveuglément, mais on tolère un léger écart
// d'horloge en n'acceptant que la semaine courante côté serveur, celle
// d'avant ou celle d'après (utile en fin/début de fenêtre de bascule).
function resolveChallengeWeek(clientWeekStr, refDate) {
    const thisWeek = DailyEngine.getWeeklySeedString(refDate);
    if (clientWeekStr === thisWeek) return thisWeek;

    const candidates = [];
    for (let w = -MAX_CLOCK_SKEW_WEEKS; w <= MAX_CLOCK_SKEW_WEEKS; w++) {
        const shifted = new Date((refDate || new Date()).getTime() + w * 7 * 24 * 3600 * 1000);
        candidates.push(DailyEngine.getWeeklySeedString(shifted));
    }
    if (candidates.includes(clientWeekStr)) return clientWeekStr;
    return thisWeek; // semaine farfelue : on retombe sur « la semaine en cours » côté serveur
}

module.exports = { WEEKLY_CHALLENGE_EVENT_COUNT, getWeeklyChallengeOrderedDates, resolveChallengeWeek };
