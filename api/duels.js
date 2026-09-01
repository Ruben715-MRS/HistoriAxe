// POST  /api/duels { deviceId, pseudo?, lang, date? }   → { id, challengeDate, lang }
// GET   /api/duels?id=&deviceId=                        → détails d'un duel (scores créateur/ouvreur)
// GET   /api/duels?mine=1&deviceId=                     → mes duels où l'adversaire m'a dépassé, pas encore vus
// PATCH /api/duels { id, deviceId }                      → marque un duel « vu » (notified=true)
//
// Duel asynchrone « léger » : pas de liste d'amis ni de graphe social, juste
// un code/lien court à partager (voir js/duels.js côté client). Le score de
// chacun est lu directement dans daily_scores (même joueur/date/lang que le
// Défi du jour, voir api/scores.js) — rien n'est dupliqué ici. Choix acté
// avec l'utilisateur : pas d'infrastructure de push serveur (APNs), donc pas
// de notification temps réel quand l'adversaire joue — seulement une
// vérification au mieux, à l'ouverture de l'app côté créateur (scope
// mine=1), complétée par un rappel local approximatif (voir
// js/notifications.js: scheduleDuelNudge).

const crypto = require('crypto');
const { ensureSchema, query } = require('./_lib/db');
const { upsertPlayer, findPlayerByDeviceId, isValidDeviceId } = require('./_lib/players');
const { SUPPORTED_LANGS } = require('./_lib/dataset');
const DailyEngine = require('../js/dailyEngine.js');
const { handlePreflight, readJsonBody, sendError } = require('./_lib/http');

const DUEL_ID_RE = /^[a-f0-9]{8}$/;
const MAX_CREATE_RETRIES = 5;

function generateDuelId() {
    return crypto.randomBytes(4).toString('hex'); // 8 caractères hex, ~32 bits — retry sur collision ci-dessous.
}

async function createDuel(creatorId, challengeDate, lang) {
    for (let i = 0; i < MAX_CREATE_RETRIES; i++) {
        const id = generateDuelId();
        try {
            await query(
                `insert into duels (id, creator_player_id, challenge_date, lang, created_at)
                 values ($1, $2, $3, $4, now())`,
                [id, creatorId, challengeDate, lang]
            );
            return id;
        } catch (err) {
            if (err && err.code === '23505') continue; // Collision d'id (très rare) : on retente avec un nouveau code.
            throw err;
        }
    }
    const err = new Error('Impossible de créer le duel, réessayez.');
    err.statusCode = 500;
    throw err;
}

async function fetchScore(playerId, challengeDate, lang) {
    const { rows } = await query(
        'select score, time_seconds, won from daily_scores where player_id = $1 and challenge_date = $2 and lang = $3',
        [playerId, challengeDate, lang]
    );
    return rows[0] ? { score: rows[0].score, timeSeconds: Number(rows[0].time_seconds), won: rows[0].won } : null;
}

module.exports = async (req, res) => {
    if (handlePreflight(req, res)) return;

    try {
        await ensureSchema();

        if (req.method === 'POST') {
            const body = await readJsonBody(req);
            const { deviceId, pseudo, lang } = body || {};

            if (!isValidDeviceId(deviceId)) return sendError(res, 400, 'deviceId invalide.');
            if (typeof lang !== 'string' || !SUPPORTED_LANGS.includes(lang)) {
                return sendError(res, 400, 'lang invalide (attendu : ' + SUPPORTED_LANGS.join(', ') + ').');
            }

            const challengeDate = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
                ? body.date
                : DailyEngine.getDailySeedString(new Date());

            const player = await upsertPlayer(deviceId, pseudo);
            const id = await createDuel(player.id, challengeDate, lang);

            return res.status(200).json({ id, challengeDate, lang });
        }

        if (req.method === 'PATCH') {
            const body = await readJsonBody(req);
            const { id, deviceId } = body || {};
            if (!DUEL_ID_RE.test(id || '') || !isValidDeviceId(deviceId)) {
                return sendError(res, 400, 'Requête invalide.');
            }
            const me = await findPlayerByDeviceId(deviceId);
            if (!me) return sendError(res, 404, 'Joueur inconnu.');

            await query('update duels set notified = true where id = $1 and creator_player_id = $2', [id, me.id]);
            return res.status(200).json({ ok: true });
        }

        if (req.method === 'GET') {
            const q = req.query || {};

            // --- Mes duels perdus, pas encore vus ---
            if (q.mine === '1') {
                const deviceId = typeof q.deviceId === 'string' ? q.deviceId : '';
                if (!isValidDeviceId(deviceId)) return sendError(res, 400, 'deviceId invalide.');
                const me = await findPlayerByDeviceId(deviceId);
                if (!me) return res.status(200).json({ duels: [] });

                // Suppose que le créateur a déjà joué au moment de la création du
                // duel (voir js/duels.js: le bouton « Défier un ami » n'apparaît
                // que dans la modale de résultats, après une partie jouée) — d'où
                // la jointure interne sur son propre score.
                const { rows } = await query(
                    `select d.id, d.challenge_date, d.lang,
                            po.pseudo as opponent_pseudo, so.score as opponent_score,
                            sc.score as creator_score
                     from duels d
                     join daily_scores so on so.player_id = d.opponent_player_id
                         and so.challenge_date = d.challenge_date and so.lang = d.lang
                     join players po on po.id = d.opponent_player_id
                     join daily_scores sc on sc.player_id = d.creator_player_id
                         and sc.challenge_date = d.challenge_date and sc.lang = d.lang
                     where d.creator_player_id = $1
                       and d.notified = false
                       and so.score > sc.score
                     order by d.created_at desc
                     limit 10`,
                    [me.id]
                );
                const duels = rows.map((r) => ({
                    id: r.id,
                    challengeDate: r.challenge_date,
                    lang: r.lang,
                    opponentPseudo: r.opponent_pseudo,
                    opponentScore: r.opponent_score,
                    myScore: r.creator_score,
                }));
                return res.status(200).json({ duels });
            }

            // --- Détail d'un duel (ouverture d'un lien de partage) ---
            const id = typeof q.id === 'string' ? q.id : '';
            if (!DUEL_ID_RE.test(id)) return sendError(res, 400, 'Code de duel invalide.');

            const duelResult = await query('select * from duels where id = $1', [id]);
            const duel = duelResult.rows[0];
            if (!duel) return sendError(res, 404, 'Duel introuvable ou expiré.');

            const creatorResult = await query('select pseudo from players where id = $1', [duel.creator_player_id]);
            const creatorPseudo = creatorResult.rows[0] ? creatorResult.rows[0].pseudo : 'Anonyme';
            const creatorScore = await fetchScore(duel.creator_player_id, duel.challenge_date, duel.lang);

            let myScore = null;
            const deviceId = typeof q.deviceId === 'string' ? q.deviceId : '';
            if (deviceId && isValidDeviceId(deviceId)) {
                const me = await upsertPlayer(deviceId, null);
                if (me.id !== duel.creator_player_id) {
                    // Premier ouvreur du lien qui n'est pas le créateur : enregistré
                    // comme adversaire, au plus une fois (un duel n'a qu'un adversaire).
                    if (!duel.opponent_player_id) {
                        await query(
                            'update duels set opponent_player_id = $1, opened_at = now() where id = $2 and opponent_player_id is null',
                            [me.id, id]
                        );
                    }
                    myScore = await fetchScore(me.id, duel.challenge_date, duel.lang);
                }
            }

            return res.status(200).json({
                id,
                challengeDate: duel.challenge_date,
                lang: duel.lang,
                creatorPseudo,
                creatorScore,
                myScore,
            });
        }

        return sendError(res, 405, 'Méthode non autorisée.');
    } catch (err) {
        console.error('[api/duels]', err);
        return sendError(res, err.statusCode || 500, err.message || 'Erreur serveur.');
    }
};
