// GET  /api/league?isoWeek=&deviceId=&limit=&scope=group|country|world  → classement de la semaine
// POST /api/league { deviceId, pseudo?, isoWeek, country? }  → enregistre le joueur et son pays ('' = retiré) ; l'XP déclaré est ignoré
//
// Trois périmètres, un même classement (l'XP vérifié de la semaine) :
//   - group   (défaut) : la ligue hebdomadaire, un groupe d'une trentaine de joueurs ;
//   - country          : tous les joueurs qui ont déclaré le même pays que le demandeur ;
//   - world            : tous les joueurs.
// Le classement national et mondial n'est affiché qu'à partir de MIN_RANKED_PLAYERS
// joueurs ayant marqué cette semaine : « 1er sur 2 » ne dit rien. En deçà, la réponse
// garde l'XP du demandeur, mais sans entrées ni rang.
//
// L'XP de la ligue n'est PAS déclaré par l'appareil : il est CALCULÉ ICI, à
// partir des seules parties que le serveur a rejouées lui-même — le Défi du
// jour et le Défi hebdomadaire de la semaine (voir api/scores.js,
// api/weeklyScores.js). L'XP local (tous modes confondus) n'est pas
// vérifiable : le laisser compter revenait à classer qui envoyait le plus
// grand nombre, plafonné à un million. Le principe affiché pour les défis —
// « le serveur ne fait jamais confiance à un score, seulement aux actions » —
// vaut désormais aussi pour la ligue.
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
const { upsertPlayer, findPlayerByDeviceId, setPlayerCountry, isValidDeviceId } = require('./_lib/players');
const { getIsoWeekString } = require('../js/storage.js');
const { handlePreflight, readJsonBody, sendError } = require('./_lib/http');
const TeamProfile = require('../js/teamProfile.js');

const LEAGUE_GROUPS = 300;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;
const MIN_RANKED_PLAYERS = 5;
const SCOPES = ['group', 'country', 'world'];
const ISO_WEEK_RE = /^\d{4}-W\d{2}$/;

// Fragment SQL réutilisé pour le calcul du groupe : "w" doit être l'alias de
// la ligne weekly_xp courante dans la requête où ce fragment est inséré.
const GROUP_MATCH_SQL =
    'abs(hashtext(w.player_id::text || \':\' || $1)) % $2 = abs(hashtext($3::uuid::text || \':\' || $1)) % $2';

// Périmètre du classement demandé. Le pays du demandeur ($7) n'est passé que pour scope=country.
// Postgres refuse un paramètre transmis mais jamais utilisé : les périmètres pays et monde
// réfèrent donc $2 et $3 dans une condition toujours vraie (même astuce que `$4::int > 0` plus bas).
const BOUND_SQL = '$2::int > 0 and $3::uuid is not null';
function poolFilter(scope) {
    if (scope === 'country') return `p.country = $7 and ${BOUND_SQL}`;
    if (scope === 'world') return BOUND_SQL;
    return GROUP_MATCH_SQL;
}

// XP d'une partie de défi vérifiée : même barème que la fin de partie du
// client (js/app.js: endGame) SANS les éléments invérifiables côté serveur
// (multiplicateur de série, bonus « sans faute »). Les parties jugées
// suspectes (temps de réaction impossibles) ne comptent pas.
const CHALLENGE_XP_SQL = 'round(score * 0.5)::int + case when won then 50 else 0 end + 100';

// Table virtuelle `w` (player_id, xp) : XP vérifié de la semaine ISO $1 ;
// $5 et $6 sont le lundi et le dimanche de cette semaine.
const VERIFIED_XP_CTE = `
    with w as (
        select player_id, sum(x)::int as xp from (
            select player_id, ${CHALLENGE_XP_SQL} as x
              from daily_scores
             where challenge_date between $5::date and $6::date and not suspicious
            union all
            select player_id, ${CHALLENGE_XP_SQL} as x
              from weekly_challenge_scores
             where challenge_week = $1 and not suspicious
        ) u group by player_id
    )`;

// Lundi et dimanche (YYYY-MM-DD) d'une semaine ISO « YYYY-Www ».
function isoWeekBounds(isoWeek) {
    const [y, w] = isoWeek.split('-W').map(Number);
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const mondayOfWeek1 = new Date(jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 86400000);
    const monday = new Date(mondayOfWeek1.getTime() + (w - 1) * 7 * 86400000);
    const sunday = new Date(monday.getTime() + 6 * 86400000);
    const f = (d) => d.toISOString().slice(0, 10);
    return [f(monday), f(sunday)];
}

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
            if (!isValidDeviceId(deviceId)) {
                return sendError(res, 400, 'deviceId invalide.');
            }
            // Pays : liste fermée (ISO) ; absent = inchangé, '' ou null = retiré.
            let country;
            if (body && body.country !== undefined) {
                country = TeamProfile.sanitizeCountry(body.country);
                if (country === null) {
                    return sendError(res, 400, 'Pays invalide.');
                }
            }
            // Enregistre seulement le joueur (pseudo, pays) : l'XP déclaré est ignoré,
            // les anciens clients qui l'envoient encore reçoivent donc une réponse valide.
            await upsertPlayer(deviceId, pseudo);
            if (country !== undefined) {
                await setPlayerCountry(deviceId, country);
            }
            return res.status(200).json({ isoWeek, xp: null, verified: true });
        }

        if (req.method === 'GET') {
            const q = req.query || {};
            const isoWeek = resolveIsoWeek(q.isoWeek);
            const scope = SCOPES.includes(q.scope) ? q.scope : 'group';
            const limit = Math.max(1, Math.min(MAX_LIMIT, parseInt(q.limit, 10) || DEFAULT_LIMIT));
            const deviceId = typeof q.deviceId === 'string' ? q.deviceId : '';

            if (!isValidDeviceId(deviceId)) {
                return sendError(res, 400, 'deviceId invalide.');
            }

            const me = await findPlayerByDeviceId(deviceId);
            const empty = { isoWeek, scope, country: me ? me.country : '', groupSize: 0, minRanked: MIN_RANKED_PLAYERS, ranked: false, entries: [], me: null };
            if (!me) {
                return res.status(200).json(empty);
            }
            // Classement national sans pays déclaré : rien à classer, le client demande le pays.
            if (scope === 'country' && !me.country) {
                return res.status(200).json(empty);
            }

            const [monday, sunday] = isoWeekBounds(isoWeek);
            const params = [isoWeek, LEAGUE_GROUPS, me.id, limit, monday, sunday];
            if (scope === 'country') params.push(me.country);
            const filter = poolFilter(scope);
            const pool = 'from w join players p on p.id = w.player_id';

            // rank() over (...) : fonction fenêtre standard (comme dans
            // api/leaderboard.js), nécessaire pour classer les lignes du périmètre.
            const { rows } = await query(
                `${VERIFIED_XP_CTE}
                 select p.pseudo, w.xp, rank() over (order by w.xp desc) as rank
                 ${pool}
                 where ${filter}
                 order by w.xp desc
                 limit $4`,
                params
            );
            const entries = rows.map((r) => ({ rank: Number(r.rank), pseudo: r.pseudo, xp: r.xp }));

            const mineResult = await query(
                `${VERIFIED_XP_CTE}
                 select mine.xp,
                        (select count(*)::int + 1 ${pool} where ${filter} and w.xp > mine.xp) as rank
                 from w mine
                 where mine.player_id = $3 and $4::int > 0`,
                params
            );
            const meEntry = mineResult.rows[0]
                ? { rank: mineResult.rows[0].rank, pseudo: me.pseudo, xp: mineResult.rows[0].xp }
                : null;

            const groupSizeResult = await query(
                `${VERIFIED_XP_CTE}
                 select count(*)::int as total ${pool} where ${filter} and $4::int > 0`,
                params
            );
            const groupSize = groupSizeResult.rows[0].total;
            const ranked = scope === 'group' || groupSize >= MIN_RANKED_PLAYERS;

            // Sous le seuil : l'XP du demandeur reste visible, mais ni rang ni classement.
            const meOut = meEntry && (ranked ? meEntry : { ...meEntry, rank: null });
            return res.status(200).json({
                isoWeek,
                scope,
                country: me.country,
                groupSize,
                minRanked: MIN_RANKED_PLAYERS,
                ranked,
                entries: ranked ? entries : [],
                me: meOut,
            });
        }

        return sendError(res, 405, 'Méthode non autorisée.');
    } catch (err) {
        console.error('[api/league]', err);
        return sendError(res, err.statusCode || 500, err.message || 'Erreur serveur.');
    }
};
