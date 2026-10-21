// Équipe de classe : l'enseignant crée une équipe (code de 6 caractères, comme le Mode Classe), les élèves la
// rejoignent avec leur prénom ou un surnom, et tout ce qu'ils gagnent — étoiles du Chemin du Temps, bonnes
// réponses des séances de Mode Classe liées à l'équipe — remplit un coffre commun. Le coffre plein verse des
// pièces à chacun, et un coffre sur trois une carte rare à chaque membre (et un trophée à la classe).
//
// POST /api/team { action: 'create',     deviceId, pseudo?, name }                    → { code }
// POST /api/team { action: 'join',       code, deviceId, name }                       → { code }
// POST /api/team { action: 'contribute', code, deviceId, stars }                      → { accepted, account, progress, chestIndex }
// POST /api/team { action: 'claim',      code, deviceId }                             → { chests: [{ index, coins, card }] }
// POST /api/team { action: 'kick',       code, deviceId, ref }   (enseignant)         → { ok }
// POST /api/team { action: 'leave',      code, deviceId }                             → { ok }
// POST /api/team { action: 'delete',     code, deviceId }        (enseignant)         → { ok }
// GET  /api/team?code=&deviceId=                                                      → l'état de l'équipe
//
// Ni texte libre ni nom complet : le prénom est celui que l'élève saisit (comme au Mode Classe), l'équipe n'a qu'un
// nom, choisi par l'enseignant. Les élèves ne se voient entre eux qu'à l'intérieur de l'équipe ; aucun classement
// public. Les étoiles du Chemin sont déclarées par l'appareil (les niveaux se jouent hors ligne) : le serveur
// plafonne par jour et par appel — le coffre ne donne que du plaisir de jeu, jamais d'avantage durable ou payant.
//
// Un élève connecté à un compte personnel (e-mail ou Google) voit ses points d'équipe lui rester acquis : le
// serveur les cumule sur son joueur (players.team_points) et le client lui verse autant de pièces, en plus de la
// part du coffre.

const { ensureSchema, query } = require('./_lib/db');
const { upsertPlayer, isValidDeviceId } = require('./_lib/players');
const { handlePreflight, readJsonBody, sendError } = require('./_lib/http');
const T = require('./_lib/team');
const { creditTeam } = require('./_lib/teamStore');

const MAX_CREATE_RETRIES = 6;
const RETENTION_SQL = "now() - interval '1 year'";

function httpError(status, message) {
    const err = new Error(message);
    err.statusCode = status;
    return err;
}

async function playerOf(deviceId) {
    const { rows } = await query('select id, auth_user_id is not null as account, team_points from players where device_id = $1', [deviceId]);
    return rows[0] || null;
}

async function loadTeam(code) {
    const { rows } = await query(
        'select code, teacher_id, name, progress, chest_index, cards from class_teams where code = $1', [code]
    );
    if (!rows[0]) throw httpError(404, 'Équipe introuvable : vérifiez le code.');
    return rows[0];
}

function readCode(body) {
    const code = T.normalizeCode(body.code);
    if (!code) throw httpError(400, 'Code invalide : 6 caractères.');
    if (!isValidDeviceId(body.deviceId)) throw httpError(400, 'deviceId invalide.');
    return code;
}

async function createTeam(body) {
    const { deviceId, pseudo } = body;
    if (!isValidDeviceId(deviceId)) throw httpError(400, 'deviceId invalide.');
    const name = T.sanitizeTeamName(body.name);
    if (!name) throw httpError(400, 'Donnez un nom à l\'équipe.');
    const teacher = await upsertPlayer(deviceId, pseudo);
    await query(`delete from class_teams where last_activity_at < ${RETENTION_SQL}`);
    for (let i = 0; i < MAX_CREATE_RETRIES; i++) {
        const code = T.generateCode();
        try {
            await query('insert into class_teams (code, teacher_id, name) values ($1, $2, $3)', [code, teacher.id, name]);
            return { code };
        } catch (err) {
            if (err && err.code === '23505') continue;
            throw err;
        }
    }
    throw httpError(500, 'Impossible de créer l\'équipe, réessayez.');
}

async function joinTeam(body) {
    const code = readCode(body);
    const name = T.sanitizeName(body.name);
    if (!name) throw httpError(400, 'Indiquez votre prénom.');
    const team = await loadTeam(code);
    const player = await upsertPlayer(body.deviceId, null);
    const already = await query('select 1 from team_members where code = $1 and player_id = $2', [code, player.id]);
    if (!already.rows[0]) {
        const count = await query('select count(*)::int as n from team_members where code = $1', [code]);
        if (count.rows[0].n >= T.MAX_MEMBERS) throw httpError(409, 'L\'équipe est complète.');
    }
    // Un nouvel arrivant ne touche pas les coffres déjà ouverts : il démarre au coffre courant.
    await query(
        `insert into team_members (code, player_id, name, claimed) values ($1, $2, $3, $4)
         on conflict (code, player_id) do update set name = excluded.name`,
        [code, player.id, name, team.chest_index]
    );
    return { code };
}

async function contribute(body) {
    const code = readCode(body);
    const me = await playerOf(body.deviceId);
    if (!me) throw httpError(404, 'Rejoignez d\'abord l\'équipe.');
    const result = await creditTeam(code, me.id, body.stars, 'path');
    if (!result) throw httpError(404, 'Rejoignez d\'abord l\'équipe.');
    return result;
}

async function claim(body) {
    const code = readCode(body);
    const me = await playerOf(body.deviceId);
    const team = await loadTeam(code);
    const row = me && (await query('select claimed from team_members where code = $1 and player_id = $2', [code, me.id])).rows[0];
    if (!row) throw httpError(404, 'Rejoignez d\'abord l\'équipe.');
    const chests = T.unclaimedChests(row.claimed, team.chest_index);
    // La condition sur `claimed` rend le versement unique même si deux appareils réclament en même temps.
    const done = await query(
        'update team_members set claimed = $3 where code = $1 and player_id = $2 and claimed = $4 returning 1',
        [code, me.id, team.chest_index, row.claimed]
    );
    return { chests: done.rows[0] ? chests : [] };
}

async function teacherOnly(body) {
    const code = readCode(body);
    const team = await loadTeam(code);
    const me = await playerOf(body.deviceId);
    if (!me || me.id !== team.teacher_id) throw httpError(403, 'Seul l\'enseignant peut faire cela.');
    return code;
}

async function kick(body) {
    const code = await teacherOnly(body);
    if (typeof body.ref !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.ref)) throw httpError(400, 'Membre invalide.');
    await query('delete from team_members where code = $1 and player_id = $2', [code, body.ref]);
    return { ok: true };
}

async function leave(body) {
    const code = readCode(body);
    const me = await playerOf(body.deviceId);
    if (me) await query('delete from team_members where code = $1 and player_id = $2', [code, me.id]);
    return { ok: true };
}

async function deleteTeam(body) {
    const code = await teacherOnly(body);
    await query('delete from class_teams where code = $1', [code]);
    return { ok: true };
}

async function buildState(code, deviceId) {
    const team = await loadTeam(code);
    const { rows } = await query(
        'select player_id, name, points, claimed from team_members where code = $1 order by points desc, joined_at asc', [code]
    );
    const me = deviceId && isValidDeviceId(deviceId) ? await playerOf(deviceId) : null;
    const isTeacher = !!me && me.id === team.teacher_id;
    const mine = me ? rows.find((r) => r.player_id === me.id) : null;
    const target = T.chestTarget(rows.length);
    const state = {
        code,
        name: team.name,
        isTeacher,
        isMember: !!mine,
        memberCount: rows.length,
        progress: team.progress,
        target,
        chestIndex: team.chest_index,
        cards: team.cards,
        // Combien de coffres avant le prochain qui contient une carte rare.
        untilCard: T.CARD_EVERY - (team.chest_index % T.CARD_EVERY),
        members: rows.map((r) => ({
            name: r.name, points: r.points, me: !!mine && r.player_id === mine.player_id,
            // La référence de renvoi n'est donnée qu'à l'enseignant.
            ...(isTeacher ? { ref: r.player_id } : {})
        })),
        me: null
    };
    if (mine) {
        const used = (await query(
            'select case when day = $3 then day_points else 0 end as used from team_members where code = $1 and player_id = $2',
            [code, mine.player_id, new Date().toISOString().slice(0, 10)]
        )).rows[0].used;
        state.me = {
            points: mine.points,
            account: !!me.account,
            teamPoints: me.team_points,
            dailyLeft: Math.max(0, T.DAILY_PATH_CAP - used),
            unclaimed: T.unclaimedChests(mine.claimed, team.chest_index)
        };
    }
    return state;
}

module.exports = async (req, res) => {
    if (handlePreflight(req, res)) return;
    try {
        await ensureSchema();
        if (req.method === 'GET') {
            const q = req.query || {};
            const code = T.normalizeCode(q.code);
            if (!code) return sendError(res, 400, 'Code invalide : 6 caractères.');
            return res.status(200).json(await buildState(code, typeof q.deviceId === 'string' ? q.deviceId : ''));
        }
        if (req.method !== 'POST') return sendError(res, 405, 'Méthode non autorisée.');
        const body = (await readJsonBody(req)) || {};
        switch (body.action) {
            case 'create': return res.status(200).json(await createTeam(body));
            case 'join': return res.status(200).json(await joinTeam(body));
            case 'contribute': return res.status(200).json(await contribute(body));
            case 'claim': return res.status(200).json(await claim(body));
            case 'kick': return res.status(200).json(await kick(body));
            case 'leave': return res.status(200).json(await leave(body));
            case 'delete': return res.status(200).json(await deleteTeam(body));
            default: return sendError(res, 400, 'action inconnue.');
        }
    } catch (err) {
        if (!err.statusCode) console.error('[api/team]', err);
        return sendError(res, err.statusCode || 500, err.statusCode ? err.message : 'Erreur serveur.');
    }
};

module.exports.buildState = buildState;
