// GET /api/weeklyLeaderboard?scope=weekly|allTime&lang=fr&isoWeek=YYYY-Www&deviceId=&limit=10
//
// Miroir de api/leaderboard.js (Défi du jour) pour le Défi hebdomadaire.
// scope=weekly (défaut) : classement du Défi hebdomadaire pour `isoWeek`
//                          (défaut : semaine en cours, calculée côté
//                          serveur) et `lang`.
// scope=allTime           : classement cumulé (somme des scores hebdo)
//                          toutes semaines confondues, pour `lang`.
//
// Si `deviceId` est fourni, la réponse inclut aussi `me` (le rang du joueur,
// même s'il est hors du top affiché).

const { ensureSchema, query } = require('./_lib/db');
const { SUPPORTED_LANGS } = require('./_lib/dataset');
const DailyEngine = require('../js/dailyEngine.js');
const { handlePreflight, sendError } = require('./_lib/http');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

module.exports = async (req, res) => {
    if (handlePreflight(req, res)) return;

    if (req.method !== 'GET') {
        return sendError(res, 405, 'Méthode non autorisée.');
    }

    try {
        const q = req.query || {};
        const scope = q.scope === 'allTime' ? 'allTime' : 'weekly';
        const lang = typeof q.lang === 'string' && SUPPORTED_LANGS.includes(q.lang) ? q.lang : 'fr';
        const limit = Math.max(1, Math.min(MAX_LIMIT, parseInt(q.limit, 10) || DEFAULT_LIMIT));
        const deviceId = typeof q.deviceId === 'string' && q.deviceId ? q.deviceId : null;

        await ensureSchema();

        if (scope === 'weekly') {
            const isoWeek = typeof q.isoWeek === 'string' && /^\d{4}-W\d{2}$/.test(q.isoWeek)
                ? q.isoWeek
                : DailyEngine.getWeeklySeedString(new Date());

            const { rows } = await query(
                `select p.pseudo, s.score, s.time_seconds, s.won,
                        rank() over (order by s.score desc, s.time_seconds asc) as rank
                 from weekly_challenge_scores s
                 join players p on p.id = s.player_id
                 where s.challenge_week = $1 and s.lang = $2
                 order by s.score desc, s.time_seconds asc
                 limit $3`,
                [isoWeek, lang, limit]
            );

            const entries = rows.map((r) => ({
                rank: Number(r.rank),
                pseudo: r.pseudo,
                score: r.score,
                timeSeconds: Number(r.time_seconds),
                won: r.won,
            }));

            let me = null;
            if (deviceId) {
                const mine = await query(
                    `select p.pseudo, s.score, s.time_seconds, s.won
                     from weekly_challenge_scores s
                     join players p on p.id = s.player_id
                     where s.challenge_week = $1 and s.lang = $2 and p.device_id = $3`,
                    [isoWeek, lang, deviceId]
                );
                if (mine.rows[0]) {
                    const r = mine.rows[0];
                    const rankResult = await query(
                        `select count(*)::int + 1 as rank from weekly_challenge_scores
                         where challenge_week = $1 and lang = $2
                           and (score > $3 or (score = $3 and time_seconds < $4))`,
                        [isoWeek, lang, r.score, r.time_seconds]
                    );
                    me = { rank: rankResult.rows[0].rank, pseudo: r.pseudo, score: r.score, timeSeconds: Number(r.time_seconds), won: r.won };
                }
            }

            const totalResult = await query(
                'select count(*)::int as total from weekly_challenge_scores where challenge_week = $1 and lang = $2',
                [isoWeek, lang]
            );

            return res.status(200).json({ scope, isoWeek, lang, entries, me, totalPlayers: totalResult.rows[0].total });
        }

        // scope === 'allTime'
        const { rows } = await query(
            `select p.pseudo, sum(s.score)::int as total_score, count(*)::int as weeks_played,
                    count(*) filter (where s.won)::int as wins,
                    rank() over (order by sum(s.score) desc) as rank
             from weekly_challenge_scores s
             join players p on p.id = s.player_id
             where s.lang = $1
             group by p.id, p.pseudo
             order by total_score desc
             limit $2`,
            [lang, limit]
        );
        const entries = rows.map((r) => ({
            rank: Number(r.rank),
            pseudo: r.pseudo,
            totalScore: r.total_score,
            weeksPlayed: r.weeks_played,
            wins: r.wins,
        }));

        let me = null;
        if (deviceId) {
            const mine = await query(
                `select p.pseudo, coalesce(sum(s.score), 0)::int as total_score,
                        count(s.player_id)::int as weeks_played,
                        count(*) filter (where s.won)::int as wins
                 from players p
                 left join weekly_challenge_scores s on s.player_id = p.id and s.lang = $1
                 where p.device_id = $2
                 group by p.id, p.pseudo`,
                [lang, deviceId]
            );
            if (mine.rows[0]) {
                const r = mine.rows[0];
                const rankResult = await query(
                    `select count(*)::int + 1 as rank from (
                        select s.player_id, sum(s.score)::int as total_score
                        from weekly_challenge_scores s
                        where s.lang = $1
                        group by s.player_id
                     ) totals
                     where totals.total_score > $2`,
                    [lang, r.total_score]
                );
                me = { rank: rankResult.rows[0].rank, pseudo: r.pseudo, totalScore: r.total_score, weeksPlayed: r.weeks_played, wins: r.wins };
            }
        }

        return res.status(200).json({ scope, lang, entries, me });
    } catch (err) {
        console.error('[api/weeklyLeaderboard]', err);
        return sendError(res, err.statusCode || 500, err.message || 'Erreur serveur.');
    }
};
