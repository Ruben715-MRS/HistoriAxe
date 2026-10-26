// =========================================================================
// === HISTORIAXE API — HISTORIQUE DES PARTIES (comptes uniquement) ===
// =========================================================================
// Normalisation des parties envoyées par le client (api/account.js). Les
// valeurs viennent de l'appareil : elles ne sont PAS rejouées par le serveur
// (contrairement au Défi du jour, api/scores.js). Ce journal sert à relire
// son propre historique ; il ne nourrit aucun classement.
//
// Une partie invalide est écartée sans faire échouer l'envoi du lot : le
// client ne pourrait rien y changer, il la renverrait indéfiniment.

const MAX_GAMES_PER_REQUEST = 50;
const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;
const CLOCK_SKEW_MS = 24 * 3600 * 1000; // tolérance pour une horloge d'appareil en retard ou en avance

function isInteger(v) {
    return typeof v === 'number' && Number.isInteger(v);
}

// Renvoie la partie nettoyée, ou null si un champ obligatoire est absent ou hors bornes.
// Langue invalide ou absente : null, la partie reste enregistrée (la langue n'est qu'indicative).
function normalizeGame(raw, now = Date.now()) {
    if (!raw || typeof raw !== 'object') return null;

    const clientId = typeof raw.clientId === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(raw.clientId) ? raw.clientId : null;
    const mode = typeof raw.mode === 'string' && /^[a-z][a-z0-9_-]{1,29}$/.test(raw.mode) ? raw.mode : null;
    const score = typeof raw.score === 'number' && Number.isFinite(raw.score) ? Math.round(raw.score) : null;
    const rounds = typeof raw.rounds === 'number' && Number.isFinite(raw.rounds) ? Math.round(raw.rounds) : null;
    const mistakes = typeof raw.mistakes === 'number' && Number.isFinite(raw.mistakes) ? Math.round(raw.mistakes) : null;
    const durationSeconds = typeof raw.durationSeconds === 'number' && Number.isFinite(raw.durationSeconds)
        ? Math.round(raw.durationSeconds * 10) / 10
        : 0;
    const playedAtMs = typeof raw.playedAt === 'string' ? Date.parse(raw.playedAt) : NaN;

    if (!clientId || !mode) return null;
    if (score === null || score < 0 || score > 1000000) return null;
    if (rounds === null || rounds < 0 || rounds > 1000) return null;
    if (mistakes === null || mistakes < 0 || mistakes > rounds) return null;
    if (durationSeconds < 0 || durationSeconds > 86400) return null;
    if (!Number.isFinite(playedAtMs) || playedAtMs > now + CLOCK_SKEW_MS) return null;

    return {
        clientId,
        mode,
        themeId: typeof raw.themeId === 'string' && raw.themeId.length <= 120 ? raw.themeId : null,
        themeName: typeof raw.themeName === 'string' ? raw.themeName.slice(0, 200) : null,
        lang: typeof raw.lang === 'string' && /^[a-z]{2,3}(-[a-z]{2,4})?$/.test(raw.lang) ? raw.lang : null,
        score,
        won: raw.won === true,
        rounds,
        mistakes,
        durationSeconds,
        playedAt: new Date(playedAtMs).toISOString(),
    };
}

// Lot envoyé par le client : { games: [...] }. Renvoie les parties valides et le nombre écarté.
function normalizeBatch(body, now = Date.now()) {
    const list = body && Array.isArray(body.games) ? body.games.slice(0, MAX_GAMES_PER_REQUEST) : [];
    const games = [];
    for (const raw of list) {
        const game = normalizeGame(raw, now);
        if (game) games.push(game);
    }
    return { games, skipped: list.length - games.length };
}

// Pagination de la lecture : offset et limit bornés, jamais négatifs.
function pageParams(query) {
    const limit = isInteger(Number(query.limit)) && Number(query.limit) > 0
        ? Math.min(Number(query.limit), MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;
    const offset = isInteger(Number(query.offset)) && Number(query.offset) > 0 ? Number(query.offset) : 0;
    return { limit, offset };
}

module.exports = { normalizeGame, normalizeBatch, pageParams, MAX_GAMES_PER_REQUEST, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE };
