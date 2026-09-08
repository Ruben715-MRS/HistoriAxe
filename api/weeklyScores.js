// POST /api/weeklyScores — soumission du score du Défi hebdomadaire.
//
// Miroir de api/scores.js (Défi du jour) pour le Défi hebdomadaire : le
// corps ne contient JAMAIS de score, uniquement les actions brutes du
// joueur. Le serveur rejoue la partie lui-même avec js/dailyEngine.js et les
// vraies dates de la base (api/_lib/dataset.js) pour calculer le score
// authentique — impossible à falsifier en modifiant le JS du navigateur.
//
// Body : { deviceId, pseudo?, lang, isoWeek, rounds: [{ slotIndex, elapsedMs }] }
// Réponse : { score, timeSeconds, won, roundsPlayed, roundsTotal, rank,
//             totalPlayers, isNewBest, suspicious }

const { ensureSchema, query } = require('./_lib/db');
const { upsertPlayer, isValidDeviceId } = require('./_lib/players');
const { SUPPORTED_LANGS } = require('./_lib/dataset');
const { getWeeklyChallengeOrderedDates, resolveChallengeWeek, WEEKLY_CHALLENGE_EVENT_COUNT } = require('./_lib/weeklyChallenge');
const DailyEngine = require('../js/dailyEngine.js');
const { handlePreflight, readJsonBody, sendError } = require('./_lib/http');

const MAX_ROUNDS = WEEKLY_CHALLENGE_EVENT_COUNT - 1; // 30 événements tirés = 1 ancre gratuite + 29 manches

module.exports = async (req, res) => {
    if (handlePreflight(req, res)) return;

    if (req.method !== 'POST') {
        return sendError(res, 405, 'Méthode non autorisée.');
    }

    try {
        const body = await readJsonBody(req);
        const { deviceId, pseudo, lang, isoWeek } = body || {};
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

        const player = await upsertPlayer(deviceId, pseudo);
        const challengeWeek = resolveChallengeWeek(typeof isoWeek === 'string' ? isoWeek : '', new Date());

        const orderedDates = getWeeklyChallengeOrderedDates(lang, challengeWeek);
        if (orderedDates.length < 2) {
            return sendError(res, 500, "Base d'événements indisponible pour cette langue.");
        }

        const replay = DailyEngine.replayDailyGame(orderedDates, rounds);

        const existing = await query(
            'select score, time_seconds from weekly_challenge_scores where player_id = $1 and challenge_week = $2 and lang = $3',
            [player.id, challengeWeek, lang]
        );
        const previousBest = existing.rows[0] || null;
        const isNewBest = !previousBest
            || replay.score > previousBest.score
            || (replay.score === previousBest.score && replay.timeSeconds < Number(previousBest.time_seconds));

        await query(
            `insert into weekly_challenge_scores
                (player_id, challenge_week, lang, score, time_seconds, rounds_played, rounds_total, won, suspicious, created_at, updated_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9, now(), now())
             on conflict (player_id, challenge_week, lang) do update
               set score = excluded.score,
                   time_seconds = excluded.time_seconds,
                   rounds_played = excluded.rounds_played,
                   rounds_total = excluded.rounds_total,
                   won = excluded.won,
                   suspicious = excluded.suspicious,
                   updated_at = now()
               where excluded.score > weekly_challenge_scores.score
                  or (excluded.score = weekly_challenge_scores.score and excluded.time_seconds < weekly_challenge_scores.time_seconds)`,
            [player.id, challengeWeek, lang, replay.score, replay.timeSeconds, replay.roundsPlayed, replay.roundsTotal, replay.won, replay.suspicious]
        );

        // Score effectivement conservé en base (le meilleur des deux), pour un
        // rang toujours cohérent avec ce qui sera affiché dans le classement.
        const bestScore = isNewBest ? replay.score : previousBest.score;
        const bestTime = isNewBest ? replay.timeSeconds : Number(previousBest.time_seconds);

        const rankResult = await query(
            `select count(*)::int + 1 as rank
             from weekly_challenge_scores
             where challenge_week = $1 and lang = $2
               and (score > $3 or (score = $3 and time_seconds < $4))`,
            [challengeWeek, lang, bestScore, bestTime]
        );
        const totalResult = await query(
            'select count(*)::int as total from weekly_challenge_scores where challenge_week = $1 and lang = $2',
            [challengeWeek, lang]
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
            rank: rankResult.rows[0].rank,
            totalPlayers: totalResult.rows[0].total,
            suspicious: replay.suspicious,
            challengeWeek,
            pseudo: player.pseudo,
        });
    } catch (err) {
        console.error('[api/weeklyScores]', err);
        return sendError(res, err.statusCode || 500, err.message || 'Erreur serveur.');
    }
};
