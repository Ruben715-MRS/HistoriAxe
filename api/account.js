// POST   /api/account { deviceId, pseudo? }  (+ Authorization: Bearer <jeton Supabase>)
//        → { deviceId, pseudo, email }
// DELETE /api/account                        (+ Authorization: Bearer <jeton Supabase>)
//        → { deleted: true }
//
// Rattache un compte à un joueur. Tout le reste de l'API identifie le joueur
// par son device_id : plutôt que de réécrire chaque route, un compte possède
// UN joueur, dont le device_id sert de clé commune à tous les appareils où
// l'on est connecté. À la connexion, le client remplace son device_id local
// par celui renvoyé ici (voir js/auth.js).
//
// - Première connexion à ce compte : le joueur de cet appareil (avec tout son
//   historique) devient celui du compte.
// - Compte déjà utilisé ailleurs : les scores du joueur anonyme de cet
//   appareil sont fusionnés dans ceux du compte (meilleur score gardé quand
//   les deux ont joué le même défi), puis ce joueur anonyme est supprimé.

const crypto = require('crypto');
const { ensureSchema, getPool } = require('./_lib/db');
const { isValidDeviceId, sanitizePseudo } = require('./_lib/players');
const { getAuthUser, deleteAuthUser } = require('./_lib/auth');
const { handlePreflight, readJsonBody, sendError } = require('./_lib/http');

// Tables de scores « un par défi » : en cas de doublon, la meilleure ligne gagne.
const SCORE_TABLES = [
    { table: 'daily_scores', key: 'challenge_date' },
    { table: 'weekly_challenge_scores', key: 'challenge_week' },
];

async function mergePlayerInto(client, fromId, toId) {
    for (const { table, key } of SCORE_TABLES) {
        // Le compte garde sa ligne si elle est au moins aussi bonne, sinon elle cède la place.
        await client.query(
            `delete from ${table} a using ${table} b
             where a.player_id = $1 and b.player_id = $2
               and a.${key} = b.${key} and a.lang = b.lang
               and (b.score > a.score or (b.score = a.score and b.time_seconds < a.time_seconds))`,
            [toId, fromId]
        );
        await client.query(
            `delete from ${table} b using ${table} a
             where b.player_id = $2 and a.player_id = $1
               and a.${key} = b.${key} and a.lang = b.lang`,
            [toId, fromId]
        );
        await client.query(`update ${table} set player_id = $1 where player_id = $2`, [toId, fromId]);
    }
    await client.query(
        `insert into weekly_xp (player_id, iso_week, xp, updated_at)
         select $1, iso_week, xp, updated_at from weekly_xp where player_id = $2
         on conflict (player_id, iso_week) do update
           set xp = greatest(weekly_xp.xp, excluded.xp), updated_at = now()`,
        [toId, fromId]
    );
    await client.query('update duels set creator_player_id = $1 where creator_player_id = $2', [toId, fromId]);
    await client.query('update duels set opponent_player_id = $1 where opponent_player_id = $2', [toId, fromId]);
    await client.query('update class_sessions set teacher_id = $1 where teacher_id = $2', [toId, fromId]);
    await client.query(
        `update class_players set player_id = $1 where player_id = $2
           and not exists (select 1 from class_players c where c.code = class_players.code and c.player_id = $1)`,
        [toId, fromId]
    );
    // Équipe de classe : ses équipes, ses places de membre (une seule par équipe) et ses points cumulés suivent le compte.
    await client.query('update class_teams set teacher_id = $1 where teacher_id = $2', [toId, fromId]);
    await client.query(
        `update team_members set player_id = $1 where player_id = $2
           and not exists (select 1 from team_members m where m.code = team_members.code and m.player_id = $1)`,
        [toId, fromId]
    );
    await client.query(
        'update players set team_points = team_points + (select team_points from players where id = $2) where id = $1',
        [toId, fromId]
    );
    // La progression (player_progress) n'est pas fusionnée ici : le client
    // fusionne la sienne avec celle du compte juste après (js/app.js: syncProgress).
    await client.query('delete from players where id = $1', [fromId]);
}

async function linkAccount(user, deviceId, pseudo) {
    const client = await getPool().connect();
    try {
        await client.query('begin');
        const acct = (await client.query(
            'select id, device_id, pseudo from players where auth_user_id = $1 for update', [user.id]
        )).rows[0];
        const dev = (await client.query(
            'select id, auth_user_id from players where device_id = $1 for update', [deviceId]
        )).rows[0];
        let result;

        if (!acct) {
            if (dev && !dev.auth_user_id) {
                const { rows } = await client.query(
                    `update players set auth_user_id = $1, pseudo = coalesce($2, pseudo), last_seen_at = now()
                     where id = $3 returning device_id, pseudo`,
                    [user.id, pseudo, dev.id]
                );
                result = rows[0];
            } else {
                // Appareil inconnu du serveur (ou rattaché à un autre compte) : nouveau joueur.
                const newDeviceId = dev ? crypto.randomUUID() : deviceId;
                const { rows } = await client.query(
                    `insert into players (id, device_id, pseudo, auth_user_id, created_at, last_seen_at)
                     values ($1, $2, coalesce($3, 'Anonyme'), $4, now(), now())
                     returning device_id, pseudo`,
                    [crypto.randomUUID(), newDeviceId, pseudo, user.id]
                );
                result = rows[0];
            }
        } else {
            if (dev && dev.id !== acct.id && !dev.auth_user_id) {
                await mergePlayerInto(client, dev.id, acct.id);
            }
            // Le pseudo du compte prime : c'est celui que le joueur retrouve partout.
            await client.query('update players set last_seen_at = now() where id = $1', [acct.id]);
            result = { device_id: acct.device_id, pseudo: acct.pseudo };
        }

        await client.query('commit');
        return { deviceId: result.device_id, pseudo: result.pseudo, email: user.email };
    } catch (err) {
        await client.query('rollback').catch(() => {});
        throw err;
    } finally {
        client.release();
    }
}

module.exports = async (req, res) => {
    if (handlePreflight(req, res)) return;

    try {
        if (req.method !== 'POST' && req.method !== 'DELETE') {
            return sendError(res, 405, 'Méthode non autorisée.');
        }
        const user = await getAuthUser(req);
        if (!user) return sendError(res, 401, 'Session expirée : reconnectez-vous.');
        await ensureSchema();

        if (req.method === 'POST') {
            const body = (await readJsonBody(req)) || {};
            if (!isValidDeviceId(body.deviceId)) return sendError(res, 400, 'deviceId invalide.');
            const linked = await linkAccount(user, body.deviceId, sanitizePseudo(body.pseudo));
            return res.status(200).json(linked);
        }

        // DELETE : le compte Supabase d'abord (s'il échoue, rien n'est perdu),
        // puis le joueur et, en cascade, tous ses scores et sa progression.
        await deleteAuthUser(user.id);
        await getPool().query('delete from players where auth_user_id = $1', [user.id]);
        return res.status(200).json({ deleted: true });
    } catch (err) {
        console.error('[api/account]', err);
        return sendError(res, err.statusCode || 500, err.message || 'Erreur serveur.');
    }
};
