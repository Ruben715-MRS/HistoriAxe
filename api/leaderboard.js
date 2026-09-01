// GET /api/leaderboard?scope=daily|allTime&lang=fr&date=YYYY-MM-DD&deviceId=&limit=10
//
// scope=daily (défaut)  : classement du Défi du jour pour `date` (défaut :
//                          aujourd'hui, calculé côté serveur) et `lang`.
// scope=allTime          : classement cumulé (somme des scores quotidiens)
//                          toutes dates confondues, pour `lang`.
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
        const scope = q.scope === 'allTime' ? 'allTime' : 'daily';
        const lang = typeof q.lang === 'string' && SUPPORTED_LANGS.includes(q.lang) ? q.lang : 'fr';
        const limit = Math.max(1, Math.min(MAX_LIMIT, parseInt(q.limit, 10) || DEFAULT_LIMIT));
        const deviceId = typeof q.deviceId === 'string' && q.deviceId ? q.deviceId : null;

        await ensureSchema();

        if (scope === 'daily') {
            const date = typeof q.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.date)
                ? q.date
                : DailyEngine.getDailySeedString(new Date());

            // NB: rank() over (...) est une fonction fenêtre standard (Postgres ≥
            // 8.4) — le classement (le "rang" de chaque ligne) ne peut pas se
            // calculer avec une simple sous-requête corrélée par paramètres liés
            // ($n) comme pour /me ci-dessous, faute de pouvoir y référencer les
            // colonnes s.score/s.time_seconds de la ligne courante.
            const { rows } = await query(
                `select p.pseudo, s.score, s.time_seconds, s.won,
                        rank() over (order by s.score desc, s.time_seconds asc) as rank
                 from daily_scores s
                 join players p on p.id = s.player_id
                 where s.challenge_date = $1 and s.lang = $2
                 order by s.score desc, s.time_seconds asc
                 limit $3`,
                [date, lang, limit]
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
                     from daily_scores s
                     join players p on p.id = s.player_id
                     where s.challenge_date = $1 and s.lang = $2 and p.device_id = $3`,
                    [date, lang, deviceId]
                );
                if (mine.rows[0]) {
                    const r = mine.rows[0];
                    const rankResult = await query(
                        `select count(*)::int + 1 as rank from daily_scores
                         where challenge_date = $1 and lang = $2
                           and (score > $3 or (score = $3 and time_seconds < $4))`,
                        [date, lang, r.score, r.time_seconds]
                    );
                    me = { rank: rankResult.rows[0].rank, pseudo: r.pseudo, score: r.score, timeSeconds: Number(r.time_seconds), won: r.won };
                }
            }

            const totalResult = await query(
                'select count(*)::int as total from daily_scores where challenge_date = $1 and lang = $2',
                [date, lang]
            );

            return res.status(200).json({ scope, date, lang, entries, me, totalPlayers: totalResult.rows[0].total });
        }

        // scope === 'allTime' — même remarque : rank() over () pour le top, une
        // sous-requête à paramètres liés pour /me (voir plus bas).
        const { rows } = await query(
            `select p.pseudo, sum(s.score)::int as total_score, count(*)::int as days_played,
                    count(*) filter (where s.won)::int as wins,
                    rank() over (order by sum(s.score) desc) as rank
             from daily_scores s
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
            daysPlayed: r.days_played,
            wins: r.wins,
        }));

        let me = null;
        if (deviceId) {
            const mine = await query(
                `select p.pseudo, coalesce(sum(s.score), 0)::int as total_score,
                        count(s.player_id)::int as days_played,
                        count(*) filter (where s.won)::int as wins
                 from players p
                 left join daily_scores s on s.player_id = p.id and s.lang = $1
                 where p.device_id = $2
                 group by p.id, p.pseudo`,
                [lang, deviceId]
            );
            if (mine.rows[0]) {
                const r = mine.rows[0];
                const rankResult = await query(
                    `select count(*)::int + 1 as rank from (
                        select s.player_id, sum(s.score)::int as total_score
                        from daily_scores s
                        where s.lang = $1
                        group by s.player_id
                     ) totals
                     where totals.total_score > $2`,
                    [lang, r.total_score]
                );
                me = { rank: rankResult.rows[0].rank, pseudo: r.pseudo, totalScore: r.total_score, daysPlayed: r.days_played, wins: r.wins };
            }
        }

        return res.status(200).json({ scope, lang, entries, me });
    } catch (err) {
        console.error('[api/leaderboard]', err);
        return sendError(res, err.statusCode || 500, err.message || 'Erreur serveur.');
    }
};
