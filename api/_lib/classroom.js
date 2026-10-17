// =========================================================================
// === HISTORIAXE API — MODE CLASSE : LOGIQUE PURE (sans base ni HTTP) ===
// =========================================================================
// Voir api/classroom.js pour le déroulé. Tout ce qui se teste sans Postgres vit ici.

const crypto = require('crypto');

// Sans I, O, 0 et 1 : un code dicté à voix haute ou lu au tableau ne se confond pas.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MIN_CARDS = 6;
const MAX_CARDS = 40;
const MAX_PLAYERS = 60;
const MAX_NAME = 20;

function generateCode() {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
    return code;
}

// Les élèves tapent le code : on tolère minuscules, espaces et tirets.
function normalizeCode(raw) {
    if (typeof raw !== 'string') return null;
    const code = raw.toUpperCase().replace(/[\s-]+/g, '');
    return new RegExp('^[' + CODE_ALPHABET + ']{' + CODE_LENGTH + '}$').test(code) ? code : null;
}

// Un prénom, ou un surnom : jamais un identifiant d'appareil, jamais de balisage conservé.
function sanitizeName(raw) {
    if (typeof raw !== 'string') return null;
    const cleaned = raw.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.slice(0, MAX_NAME) || null;
}

// Le paquet : les ids dans l'ordre de jeu (le premier est l'ancre posée d'office), tous connus du serveur.
function validateDeck(eventIds, knownIds) {
    if (!Array.isArray(eventIds)) return 'eventIds invalide.';
    if (eventIds.length < MIN_CARDS || eventIds.length > MAX_CARDS) return `Le paquet doit compter de ${MIN_CARDS} à ${MAX_CARDS} cartes.`;
    const seen = new Set();
    for (const id of eventIds) {
        if (typeof id !== 'string' || !knownIds.has(id)) return 'Le paquet contient un événement inconnu : mettez l\'app à jour.';
        if (seen.has(id)) return 'Le paquet contient deux fois le même événement.';
        seen.add(id);
    }
    return null;
}

// Les dates, dans l'ordre attendu par DailyEngine.replayDailyGame : la dernière est l'ancre, les cartes se
// piochent ensuite en partant de la fin. Le paquet de la séance est dans l'ordre de JEU, donc inversé ici.
function orderedDatesFor(eventIds, dateById) {
    return eventIds.map((id) => dateById.get(id)).reverse();
}

// Classement : score décroissant, à égalité le premier arrivé.
function rankPlayers(players) {
    return players.slice().sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
}

// Les cartes les plus ratées : { eventId, answered, wrong }. La manche r (0, 1, …) est la carte eventIds[r + 1]
// — la carte 0 est l'ancre, jamais jouée.
function buildRecap(eventIds, players) {
    const recap = [];
    for (let r = 0; r + 1 < eventIds.length; r++) {
        let answered = 0;
        let wrong = 0;
        for (const p of players) {
            const result = Array.isArray(p.results) ? p.results[r] : undefined;
            if (result === undefined || result === null) continue;
            answered++;
            if (result === false) wrong++;
        }
        if (answered > 0) recap.push({ eventId: eventIds[r + 1], answered, wrong });
    }
    return recap;
}

module.exports = {
    CODE_ALPHABET, CODE_LENGTH, MIN_CARDS, MAX_CARDS, MAX_PLAYERS, MAX_NAME,
    generateCode, normalizeCode, sanitizeName, validateDeck, orderedDatesFor, rankPlayers, buildRecap
};
