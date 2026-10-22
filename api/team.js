// Équipe de classe : l'enseignant crée une équipe (code de 6 caractères, comme le Mode Classe), les élèves la
// rejoignent avec leur prénom ou un surnom, et tout ce qu'ils gagnent — étoiles du Chemin du Temps, bonnes
// réponses des séances de Mode Classe liées à l'équipe — remplit un coffre commun. Le coffre plein verse des
// pièces à chacun, et un coffre sur trois une carte rare à chaque membre (et un trophée à la classe).
//
// POST /api/team { action: 'create',     deviceId, pseudo?, name, badge?, description?, country?, lang?, level? } → { code }
// POST /api/team { action: 'badge',      code, deviceId, badge }  (enseignant)        → { badge }
// POST /api/team { action: 'profile',    code, deviceId, description?, country?, lang? } (enseignant) → { description, country, lang }
// POST /api/team { action: 'level',      code, deviceId, level }                      → { ok }   (niveau du joueur, pour le classement des membres)
// POST /api/team { action: 'search',     q }                                          → { teams: [{ code, name, badge, country, lang, memberCount }] }
// POST /api/team { action: 'challenge',  code, deviceId, target }  (enseignant)       → { id }   (défier l'équipe `target`)
// POST /api/team { action: 'challenge_reply',  code, deviceId, id, accept } (enseignant de l'équipe défiée) → { ok }
// POST /api/team { action: 'challenge_cancel', code, deviceId }  (enseignant qui a défié, tant que pas accepté) → { ok }
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
const TeamBadge = require('../js/teamBadge.js');
const Profile = require('../js/teamProfile.js');

const MAX_CREATE_RETRIES = 6;
const RETENTION_SQL = "now() - interval '1 year'";
// Un défi dure sept jours une fois accepté ; une invitation sans réponse expire au bout de trois jours.
const CHALLENGE_DAYS = 7;
const INVITE_DAYS = 3;

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
        'select code, teacher_id, name, progress, chest_index, cards, badge, description, country, lang, leader_level, points_total from class_teams where code = $1', [code]
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

// Description, pays, langue : seuls les champs présents sont lus ; un pays ou une langue hors liste est refusé.
function readProfile(body) {
    const out = {};
    if (body.description !== undefined) out.description = Profile.sanitizeDescription(body.description);
    if (body.country !== undefined) {
        out.country = Profile.sanitizeCountry(body.country);
        if (out.country === null) throw httpError(400, 'Pays invalide.');
    }
    if (body.lang !== undefined) {
        out.lang = Profile.sanitizeLanguage(body.lang);
        if (out.lang === null) throw httpError(400, 'Langue invalide.');
    }
    return out;
}

async function createTeam(body) {
    const { deviceId, pseudo } = body;
    if (!isValidDeviceId(deviceId)) throw httpError(400, 'deviceId invalide.');
    const name = T.sanitizeTeamName(body.name);
    if (!name) throw httpError(400, 'Donnez un nom à l\'équipe.');
    // L'écusson est facultatif à la création (un client plus ancien n'en envoie pas) ; une équipe neuve n'a
    // débloqué que la première bordure.
    let badge = TeamBadge.DEFAULT;
    if (body.badge !== undefined && body.badge !== null) {
        badge = T.sanitizeBadge(body.badge, 0);
        if (!badge) throw httpError(400, 'Écusson invalide.');
    }
    const profile = readProfile(body);
    const leaderLevel = body.level === undefined ? 1 : Profile.sanitizeLevel(body.level);
    if (!leaderLevel) throw httpError(400, 'Niveau invalide.');
    const teacher = await upsertPlayer(deviceId, pseudo);
    await query(`delete from class_teams where last_activity_at < ${RETENTION_SQL}`);
    for (let i = 0; i < MAX_CREATE_RETRIES; i++) {
        const code = T.generateCode();
        try {
            await query(
                'insert into class_teams (code, teacher_id, name, badge, description, country, lang, leader_level) values ($1, $2, $3, $4, $5, $6, $7, $8)',
                [code, teacher.id, name, badge, profile.description || '', profile.country || '', profile.lang || '', leaderLevel]
            );
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
    const level = body.level === undefined ? 1 : Profile.sanitizeLevel(body.level);
    if (!level) throw httpError(400, 'Niveau invalide.');
    const player = await upsertPlayer(body.deviceId, null);
    const already = await query('select 1 from team_members where code = $1 and player_id = $2', [code, player.id]);
    if (!already.rows[0]) {
        const count = await query('select count(*)::int as n from team_members where code = $1', [code]);
        if (count.rows[0].n >= T.MAX_MEMBERS) throw httpError(409, 'L\'équipe est complète.');
    }
    // Un nouvel arrivant ne touche pas les coffres déjà ouverts : il démarre au coffre courant.
    await query(
        `insert into team_members (code, player_id, name, claimed, level) values ($1, $2, $3, $4, $5)
         on conflict (code, player_id) do update set name = excluded.name, level = excluded.level`,
        [code, player.id, name, team.chest_index, level]
    );
    return { code };
}

async function contribute(body) {
    const code = readCode(body);
    const me = await playerOf(body.deviceId);
    if (!me) throw httpError(404, 'Rejoignez d\'abord l\'équipe.');
    const level = Profile.sanitizeLevel(body.level);
    if (level) await query('update team_members set level = $3 where code = $1 and player_id = $2', [code, me.id, level]);
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

async function setBadge(body) {
    const code = await teacherOnly(body);
    const team = await loadTeam(code);
    const badge = T.sanitizeBadge(body.badge, team.chest_index);
    if (!badge) throw httpError(400, 'Écusson invalide, ou bordure pas encore débloquée.');
    await query('update class_teams set badge = $2 where code = $1', [code, badge]);
    return { badge };
}

// Le niveau du joueur (celui de son grade) : membre → sa ligne ; enseignant → le niveau du chef d'équipe.
async function setLevel(body) {
    const code = readCode(body);
    const level = Profile.sanitizeLevel(body.level);
    if (!level) throw httpError(400, 'Niveau invalide.');
    const me = await playerOf(body.deviceId);
    if (!me) throw httpError(404, 'Rejoignez d\'abord l\'équipe.');
    const team = await loadTeam(code);
    if (me.id === team.teacher_id) await query('update class_teams set leader_level = $2 where code = $1', [code, level]);
    else await query('update team_members set level = $3 where code = $1 and player_id = $2', [code, me.id, level]);
    return { ok: true };
}

async function setProfile(body) {
    const code = await teacherOnly(body);
    const profile = readProfile(body);
    const keys = Object.keys(profile);
    if (!keys.length) throw httpError(400, 'Rien à modifier.');
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    await query(`update class_teams set ${sets} where code = $1`, [code, ...keys.map((k) => profile[k])]);
    return (await loadTeamProfile(code));
}

async function loadTeamProfile(code) {
    const team = await loadTeam(code);
    return { description: team.description, country: team.country, lang: team.lang };
}

// Une fiche d'équipe pour les résultats de recherche et l'adversaire d'un défi : rien de personnel.
function teamCard(team, memberCount) {
    return {
        code: team.code, name: team.name, badge: TeamBadge.normalize(team.badge),
        country: team.country, lang: team.lang, memberCount
    };
}

async function memberCounts(codes) {
    const counts = {};
    codes.forEach((c) => { counts[c] = 0; });
    if (!codes.length) return counts;
    const marks = codes.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await query(`select code, count(*)::int as n from team_members where code in (${marks}) group by code`, codes);
    rows.forEach((r) => { counts[r.code] = r.n; });
    return counts;
}

// Chercher une équipe par son nom (morceau de nom) ou par son identifiant (#ABC234 ou ABC234).
async function searchTeams(body) {
    const q = String(body.q === undefined ? '' : body.q).replace(/[%_\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (q.length < 2) throw httpError(400, 'Tapez au moins deux caractères.');
    const asCode = T.normalizeCode(q.replace(/^#/, '')) || '';
    const { rows } = await query(
        `select code, name, badge, country, lang, description, leader_level, points_total, teacher_id, progress, chest_index, cards
           from class_teams where code = $1 or lower(name) like $2 order by name asc limit 8`,
        [asCode, '%' + q.toLowerCase() + '%']
    );
    const counts = await memberCounts(rows.map((r) => r.code));
    const teams = rows.map((r) => teamCard(r, counts[r.code]));
    // L'identifiant exact d'abord, puis les équipes les plus peuplées.
    teams.sort((a, b) => (b.code === asCode) - (a.code === asCode) || b.memberCount - a.memberCount);
    return { teams };
}

// --- Défis entre équipes ----------------------------------------------------------------------------
// Une équipe en défie une autre (identifiant trouvé par la recherche) ; l'enseignant de l'autre accepte ou refuse.
// Accepté, le défi dure sept jours : on compare les points que chaque équipe a gagnés pendant cette période
// (les points cumulés de l'équipe, relevés au départ). Une équipe n'a qu'un défi ouvert à la fois.

async function settleChallenges() {
    await query(`delete from team_challenges where status = 'pending' and created_at < now() - interval '${INVITE_DAYS} days'`);
    await query("delete from team_challenges where status = 'done' and ends_at < now() - interval '30 days'");
    const due = (await query(
        `select c.id, c.from_base, c.to_base, f.points_total as fp, t.points_total as tp
           from team_challenges c
           join class_teams f on f.code = c.from_code
           join class_teams t on t.code = c.to_code
          where c.status = 'active' and c.ends_at < now()`
    )).rows;
    for (const c of due) {
        await query("update team_challenges set status = 'done', from_score = $2, to_score = $3 where id = $1 and status = 'active'",
            [c.id, Math.max(0, c.fp - c.from_base), Math.max(0, c.tp - c.to_base)]);
    }
}

async function openChallengeOf(code) {
    const { rows } = await query(
        "select id from team_challenges where status in ('pending', 'active') and (from_code = $1 or to_code = $1) limit 1", [code]
    );
    return rows[0] || null;
}

async function startChallenge(body) {
    const code = await teacherOnly(body);
    const target = T.normalizeCode(typeof body.target === 'string' ? body.target.replace(/^#/, '') : '');
    if (!target) throw httpError(400, 'Identifiant d\'équipe invalide.');
    if (target === code) throw httpError(400, 'Une équipe ne peut pas se défier elle-même.');
    await settleChallenges();
    await loadTeam(target);
    if (await openChallengeOf(code)) throw httpError(409, 'Votre équipe a déjà un défi en cours.');
    if (await openChallengeOf(target)) throw httpError(409, 'Cette équipe a déjà un défi en cours.');
    const { rows } = await query('insert into team_challenges (from_code, to_code) values ($1, $2) returning id', [code, target]);
    return { id: Number(rows[0].id) };
}

async function replyChallenge(body) {
    const code = await teacherOnly(body);
    await settleChallenges();
    const id = Number(body.id);
    const c = Number.isInteger(id) ? (await query('select id, from_code, to_code, status from team_challenges where id = $1', [id])).rows[0] : null;
    if (!c || c.to_code !== code || c.status !== 'pending') throw httpError(404, 'Invitation introuvable ou expirée.');
    if (body.accept === true) {
        const from = await loadTeam(c.from_code);
        const to = await loadTeam(c.to_code);
        await query(
            `update team_challenges set status = 'active', ends_at = now() + interval '${CHALLENGE_DAYS} days', from_base = $2, to_base = $3 where id = $1`,
            [id, from.points_total, to.points_total]
        );
    } else {
        await query('delete from team_challenges where id = $1', [id]);
    }
    return { ok: true };
}

async function cancelChallenge(body) {
    const code = await teacherOnly(body);
    await query("delete from team_challenges where from_code = $1 and status = 'pending'", [code]);
    return { ok: true };
}

// Le défi à montrer à l'équipe : celui qui est ouvert, sinon le dernier terminé.
async function challengeOf(code, team) {
    await settleChallenges();
    const { rows } = await query(
        `select id, from_code, to_code, status, ends_at, from_base, to_base, from_score, to_score
           from team_challenges where from_code = $1 or to_code = $1 order by id desc limit 5`, [code]
    );
    const c = rows.find((r) => r.status === 'pending' || r.status === 'active') || rows.find((r) => r.status === 'done');
    if (!c) return null;
    const sent = c.from_code === code;
    const otherCode = sent ? c.to_code : c.from_code;
    const other = await loadTeam(otherCode);
    const counts = await memberCounts([otherCode]);
    let mine = null; let theirs = null;
    if (c.status === 'active') {
        mine = Math.max(0, team.points_total - (sent ? c.from_base : c.to_base));
        theirs = Math.max(0, other.points_total - (sent ? c.to_base : c.from_base));
    } else if (c.status === 'done') {
        mine = sent ? c.from_score : c.to_score;
        theirs = sent ? c.to_score : c.from_score;
    }
    return {
        id: Number(c.id), status: c.status, direction: sent ? 'sent' : 'received',
        opponent: teamCard(other, counts[otherCode]),
        myScore: mine, theirScore: theirs, endsAt: c.ends_at ? new Date(c.ends_at).toISOString() : null
    };
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
    // Les membres se classent par niveau de joueur, puis par points apportés.
    const { rows } = await query(
        'select player_id, name, points, claimed, level from team_members where code = $1 order by level desc, points desc, joined_at asc', [code]
    );
    const leader = (await query('select pseudo from players where id = $1', [team.teacher_id])).rows[0];
    const me = deviceId && isValidDeviceId(deviceId) ? await playerOf(deviceId) : null;
    const isTeacher = !!me && me.id === team.teacher_id;
    const mine = me ? rows.find((r) => r.player_id === me.id) : null;
    const target = T.chestTarget(rows.length);
    const state = {
        code,
        name: team.name,
        badge: TeamBadge.normalize(team.badge),
        description: team.description,
        country: team.country,
        lang: team.lang,
        maxMembers: T.MAX_MEMBERS,
        totalPoints: team.points_total,
        leader: { name: leader ? leader.pseudo : '', level: team.leader_level },
        challenge: await challengeOf(code, team),
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
            name: r.name, points: r.points, level: r.level, me: !!mine && r.player_id === mine.player_id,
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
            case 'badge': return res.status(200).json(await setBadge(body));
            case 'profile': return res.status(200).json(await setProfile(body));
            case 'level': return res.status(200).json(await setLevel(body));
            case 'search': return res.status(200).json(await searchTeams(body));
            case 'challenge': return res.status(200).json(await startChallenge(body));
            case 'challenge_reply': return res.status(200).json(await replyChallenge(body));
            case 'challenge_cancel': return res.status(200).json(await cancelChallenge(body));
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
