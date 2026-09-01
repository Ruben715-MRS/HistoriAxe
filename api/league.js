// GET  /api/league?isoWeek=&deviceId=&limit=  → classement du groupe hebdo du joueur
// POST /api/league { deviceId, pseudo?, isoWeek, xp }         → enregistre l'XP hebdo du joueur
//
// Ligue hebdomadaire "légère" : pas de table de cohortes, pas de tâche
// planifiée, pas d'échelle de paliers (Bronze/Argent/...) persistée d'une
// semaine à l'autre — choix acté avec l'utilisateur lors du cadrage, pour
// rester livrable sans infrastructure de job planifié. Pour une semaine ISO
// donnée, le groupe d'un joueur est calculé À LA VOLÉE par hash déterministe :
//
//   group_id = abs(hashtext(player_id || ':' || iso_week)) % LEAGUE_GROUPS
//
// identique pour tout le monde tout au long de la semaine, sans jamais
// écrire nulle part quel joueur appartient à quel groupe (même esprit que le
// tirage déterministe du Défi du jour, voir js/dailyEngine.js). Limite
// connue et acceptée pour ce premier jet : avec peu de joueurs actifs,
// certains groupes seront petits ou vides en début de vie du produit (voir
// api/_lib/schema.sql).

const { ensureSchema, query } = require('./_lib/db');
const { upsertPlayer, findPlayerByDeviceId, isValidDeviceId } = require('./_lib/players');
const { getIsoWeekString } = require('../js/storage.js');
const { handlePreflight, readJsonBody, sendError } = require('./_lib/http');

const LEAGUE_GROUPS = 300;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;
const MAX_WEEKLY_XP = 1000000; // Garde-fou large : pas de rejeu anti-triche ici (contrairement à /api/scores), juste une borne de sécurité.
const ISO_WEEK_RE = /^\d{4}-W\d{2}$/;

// Fragment SQL réutilisé pour le calcul du groupe : "w" doit être l'alias de
// la ligne weekly_xp courante dans la requête où ce fragment est inséré.
const GROUP_MATCH_SQL =
    'abs(hashtext(w.player_id::text || \':\' || $1)) % $2 = abs(hashtext($3::text || \':\' || $1)) % $2';

function resolveIsoWeek(raw) {
    return typeof raw === 'string' && ISO_WEEK_RE.test(raw) ? raw : getIsoWeekString(new Date());
}

module.exports = async (req, res) => {
    if (handlePreflight(req, res)) return;

    try {
        await ensureSchema();

        if (req.method === 'POST') {
            const body = await readJsonBody(req);
            const { deviceId, pseudo } = body || {};
            const isoWeek = resolveIsoWeek(body && body.isoWeek);
            const xp = Math.max(0, Math.min(MAX_WEEKLY_XP, Math.round(Number(body && body.xp)) || 0));

            if (!isValidDeviceId(deviceId)) {
                return sendError(res, 400, 'deviceId invalide.');
            }

            const player = await upsertPlayer(deviceId, pseudo);
            // Le client envoie son total hebdo LOCAL (pas un delta) : GREATEST
            // protège contre un appareil qui pousserait une valeur périmée après
            // qu'un autre appareil du même joueur ait déjà synchronisé plus haut
            // (même logique défensive que api/scores.js: on conflict ... where).
            await query(
                `insert into weekly_xp (player_id, iso_week, xp, updated_at)
                 values ($1, $2, $3, now())
                 on conflict (player_id, iso_week) do update
                   set xp = greatest(weekly_xp.xp, excluded.xp), updated_at = now()`,
                [player.id, isoWeek, xp]
            );

            return res.status(200).json({ isoWeek, xp });
        }

        if (req.method === 'GET') {
            const q = req.query || {};
            const isoWeek = resolveIsoWeek(q.isoWeek);
            const limit = Math.max(1, Math.min(MAX_LIMIT, parseInt(q.limit, 10) || DEFAULT_LIMIT));
            const deviceId = typeof q.deviceId === 'string' ? q.deviceId : '';

            if (!isValidDeviceId(deviceId)) {
                return sendError(res, 400, 'deviceId invalide.');
            }

            const me = await findPlayerByDeviceId(deviceId);
            if (!me) {
                return res.status(200).json({ isoWeek, groupSize: 0, entries: [], me: null });
            }

            // rank() over (...) : fonction fenêtre standard (comme dans
            // api/leaderboard.js), nécessaire pour classer les lignes du groupe.
            const { rows } = await query(
                `select p.pseudo, w.xp,
                        rank() over (order by w.xp desc) as rank
                 from weekly_xp w
                 join players p on p.id = w.player_id
                 where w.iso_week = $1 and ${GROUP_MATCH_SQL}
                 order by w.xp desc
                 limit $4`,
                [isoWeek, LEAGUE_GROUPS, me.id, limit]
            );
            const entries = rows.map((r) => ({ rank: Number(r.rank), pseudo: r.pseudo, xp: r.xp }));

            const mineResult = await query(
                `select w.xp,
                        (select count(*)::int + 1 from weekly_xp w
                          where w.iso_week = $1 and ${GROUP_MATCH_SQL} and w.xp > mine.xp) as rank
                 from weekly_xp mine
                 where mine.player_id = $3 and mine.iso_week = $1`,
                [isoWeek, LEAGUE_GROUPS, me.id]
            );
            const meEntry = mineResult.rows[0]
                ? { rank: mineResult.rows[0].rank, pseudo: me.pseudo, xp: mineResult.rows[0].xp }
                : null;

            const groupSizeResult = await query(
                `select count(*)::int as total from weekly_xp w where w.iso_week = $1 and ${GROUP_MATCH_SQL}`,
                [isoWeek, LEAGUE_GROUPS, me.id]
            );

            return res.status(200).json({
                isoWeek,
                groupSize: groupSizeResult.rows[0].total,
                entries,
                me: meEntry,
            });
        }

        return sendError(res, 405, 'Méthode non autorisée.');
    } catch (err) {
        console.error('[api/league]', err);
        return sendError(res, err.statusCode || 500, err.message || 'Erreur serveur.');
    }
};
