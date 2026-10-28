// POST /api/scores — soumission du score du Défi du jour.
//
// Le corps ne contient JAMAIS de score : uniquement les actions brutes du
// joueur (dans quel intervalle il a déposé chaque carte, en combien de
// temps). Le serveur rejoue la partie lui-même avec js/dailyEngine.js et les
// vraies dates de la base (api/_lib/dataset.js) pour calculer le score
// authentique — impossible à falsifier en modifiant le JS du navigateur.
//
// Body : { deviceId, pseudo?, lang, date, rounds: [{ slotIndex, elapsedMs }] }
// Réponse : { score, timeSeconds, won, roundsPlayed, roundsTotal, rank,
//             totalPlayers, isNewBest, suspicious }

const { ensureSchema, query } = require('./_lib/db');
const { identifyDevice, isValidDeviceId } = require('./_lib/players');
const { SUPPORTED_LANGS } = require('./_lib/dataset');
const { getDailyOrderedItems, resolveChallengeDate } = require('./_lib/dailyChallenge');
const { drawMatches, STALE_DRAW_MESSAGE } = require('./_lib/drawCheck');
const DailyEngine = require('../js/dailyEngine.js');
const { handlePreflight, readJsonBody, sendError } = require('./_lib/http');

const MAX_ROUNDS = 9; // 10 événements tirés = 1 ancre gratuite + 9 manches

module.exports = async (req, res) => {
    if (handlePreflight(req, res)) return;

    if (req.method !== 'POST') {
        return sendError(res, 405, 'Méthode non autorisée.');
    }

    try {
        const body = await readJsonBody(req);
        const { deviceId, pseudo, lang, date } = body || {};
        let rounds = Array.isArray(body && body.rounds) ? body.rounds : [];

        if (!isValidDeviceId(deviceId)) {
            return sendError(res, 400, 'deviceId invalide.');
        }
        if (typeof lang !== 'string' || !SUPPORTED_LANGS.includes(lang)) {
            return sendError(res, 400, 'lang invalide (attendu : ' + SUPPORTED_LANGS.join(', ') + ').');
        }

        rounds = rounds.slice(0, MAX_ROUNDS).map((r) => ({
            slotIndex: r && typeof r === 'object' ? r.slotIndex : undefined,
            elapsedMs: r && typeof r === 'object' ? r.elapsedMs : undefined,
        }));

        await ensureSchema();

        const player = await identifyDevice(req, res, deviceId, { create: true, pseudo });
        const challengeDate = resolveChallengeDate(typeof date === 'string' ? date : '', new Date());

        const orderedItems = getDailyOrderedItems(lang, challengeDate);
        const orderedDates = orderedItems.map((it) => it.date);
        if (orderedDates.length < 2) {
            return sendError(res, 500, "Base d'événements indisponible pour cette langue.");
        }
        if (!drawMatches(body.eventIds, orderedItems)) {
            return sendError(res, 409, STALE_DRAW_MESSAGE);
        }

        const replay = DailyEngine.replayDailyGame(orderedDates, rounds);

        // Seul le PREMIER essai du jour est classé : sinon on rejoue le défi en
        // connaissant déjà les dix dates, et le classement récompense la
        // mémoire. `do nothing` rend l'envoi idempotent ; la réponse porte le
        // score réellement conservé, qui peut être celui d'un essai antérieur.
        const inserted = await query(
            `insert into daily_scores
                (player_id, challenge_date, lang, score, time_seconds, rounds_played, rounds_total, won, suspicious, created_at, updated_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9, now(), now())
             on conflict (player_id, challenge_date, lang) do nothing
             returning score`,
            [player.id, challengeDate, lang, replay.score, replay.timeSeconds, replay.roundsPlayed, replay.roundsTotal, replay.won, replay.suspicious]
        );
        const alreadyRanked = inserted.rows.length === 0;
        let bestScore = replay.score;
        let bestTime = replay.timeSeconds;
        if (alreadyRanked) {
            const kept = await query(
                'select score, time_seconds from daily_scores where player_id = $1 and challenge_date = $2 and lang = $3',
                [player.id, challengeDate, lang]
            );
            bestScore = kept.rows[0].score;
            bestTime = Number(kept.rows[0].time_seconds);
        }
        const isNewBest = !alreadyRanked;

        const rankResult = await query(
            `select count(*)::int + 1 as rank
             from daily_scores
             where challenge_date = $1 and lang = $2 and not suspicious
               and (score > $3 or (score = $3 and time_seconds < $4))`,
            [challengeDate, lang, bestScore, bestTime]
        );
        const totalResult = await query(
            'select count(*)::int as total from daily_scores where challenge_date = $1 and lang = $2 and not suspicious',
            [challengeDate, lang]
        );

        return res.status(200).json({
            score: replay.score,
            timeSeconds: replay.timeSeconds,
            won: replay.won,
            roundsPlayed: replay.roundsPlayed,
            roundsTotal: replay.roundsTotal,
            bestScore,
            bestTimeSeconds: bestTime,
            isNewBest,
            alreadyRanked,
            rank: rankResult.rows[0].rank,
            totalPlayers: totalResult.rows[0].total,
            suspicious: replay.suspicious,
            challengeDate,
            pseudo: player.pseudo,
        });
    } catch (err) {
        console.error('[api/scores]', err);
        return sendError(res, err.statusCode || 500, err.message || 'Erreur serveur.');
    }
};
