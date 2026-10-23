// Mode Classe : l'enseignant ouvre une séance sur un thème, les élèves la rejoignent avec un code de 6 caractères
// et placent les MÊMES cartes dans le même ordre.
//
// POST /api/classroom { action: 'create', deviceId, pseudo?, lang, themeName, eventIds }   → { code }
// POST /api/classroom { action: 'join',   code, deviceId, name }                           → { status, lang, themeName, eventIds }
// POST /api/classroom { action: 'start',  code, deviceId }     (enseignant)                → { status }
// POST /api/classroom { action: 'end',    code, deviceId }     (enseignant)                → { status }
// POST /api/classroom { action: 'submit', code, deviceId, rounds: [{ slotIndex, elapsedMs }] } → { score, answered, finished, rank }
// GET  /api/classroom?code=&deviceId=                          → l'état de la séance, à interroger toutes les 2-3 s
//
// Pas de temps réel (websocket) : une classe, c'est ~30 élèves qui interrogent toutes les 2-3 secondes — de
// simples requêtes sur ces fonctions suffisent. Le score n'est jamais déclaré par l'élève : comme pour le Défi du
// jour, il envoie le JOURNAL de ses placements (cumulatif, renvoyé à chaque carte) et le serveur le rejoue avec
// js/dailyEngine.js — mêmes règles que la frise, mais sans élimination (3 vies feraient sortir les élèves en cours
// de séance) ; c'est aussi ce qui donne, carte par carte, qui a juste et qui a faux.
//
// Aucun compte : l'enseignant est reconnu à l'identifiant de son appareil (celui qui a créé la séance). Les noms
// sont des prénoms ou surnoms libres, jamais renvoyés avec un identifiant ; tout est purgé après deux jours.

const { ensureSchema, query } = require('./_lib/db');
const { upsertPlayer, isValidDeviceId } = require('./_lib/players');
const { SUPPORTED_LANGS, loadLangEvents } = require('./_lib/dataset');
const DailyEngine = require('../js/dailyEngine.js');
const { handlePreflight, readJsonBody, sendError } = require('./_lib/http');
const C = require('./_lib/classroom');
const { creditTeam } = require('./_lib/teamStore');

const MAX_CREATE_RETRIES = 6;
const RETENTION_SQL = "now() - interval '2 days'";

const dateIndexes = new Map(); // lang → Map(id → date), construit une fois par instance chaude
function eventIndex(lang) {
    if (!dateIndexes.has(lang)) dateIndexes.set(lang, new Map(loadLangEvents(lang).map((e) => [e.id, e.date])));
    return dateIndexes.get(lang);
}

function httpError(status, message) {
    const err = new Error(message);
    err.statusCode = status;
    return err;
}

async function loadSession(code) {
    const { rows } = await query(
        'select code, teacher_id, lang, theme_name, event_ids, status, team_code from class_sessions where code = $1', [code]
    );
    if (!rows[0]) throw httpError(404, 'Séance introuvable : vérifiez le code.');
    return rows[0];
}

async function playerOf(deviceId) {
    const { rows } = await query('select id from players where device_id = $1', [deviceId]);
    return rows[0] || null;
}

async function createSession(body) {
    const { deviceId, pseudo, lang, themeName, eventIds } = body;
    if (!isValidDeviceId(deviceId)) throw httpError(400, 'deviceId invalide.');
    if (typeof lang !== 'string' || !SUPPORTED_LANGS.includes(lang)) throw httpError(400, 'lang invalide.');
    const name = typeof themeName === 'string' ? themeName.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
    if (!name) throw httpError(400, 'themeName manquant.');
    const problem = C.validateDeck(eventIds, eventIndex(lang));
    if (problem) throw httpError(400, problem);

    const teacher = await upsertPlayer(deviceId, pseudo);
    // Séance liée à une équipe de classe de cet enseignant : les bonnes réponses nourriront son coffre.
    let teamCode = null;
    if (body.teamCode) {
        teamCode = C.normalizeCode(body.teamCode);
        const owned = teamCode && await query('select 1 from class_teams where code = $1 and teacher_id = $2', [teamCode, teacher.id]);
        if (!owned || !owned.rows[0]) throw httpError(400, 'Équipe introuvable : vérifiez le code.');
    }
    // Ménage opportuniste : pas de tâche planifiée, les séances de plus de deux jours disparaissent ici.
    await query(`delete from class_sessions where created_at < ${RETENTION_SQL}`);
    for (let i = 0; i < MAX_CREATE_RETRIES; i++) {
        const code = C.generateCode();
        try {
            await query(
                `insert into class_sessions (code, teacher_id, lang, theme_name, event_ids, status, created_at, team_code)
                 values ($1, $2, $3, $4, $5::jsonb, 'lobby', now(), $6)`,
                [code, teacher.id, lang, name, JSON.stringify(eventIds), teamCode]
            );
            return { code };
        } catch (err) {
            if (err && err.code === '23505') continue; // code déjà pris : on en tire un autre
            throw err;
        }
    }
    throw httpError(500, 'Impossible de créer la séance, réessayez.');
}

async function joinSession(body) {
    const code = C.normalizeCode(body.code);
    if (!code) throw httpError(400, 'Code invalide : 6 caractères.');
    if (!isValidDeviceId(body.deviceId)) throw httpError(400, 'deviceId invalide.');
    const name = C.sanitizeName(body.name);
    if (!name) throw httpError(400, 'Indiquez votre prénom.');
    const session = await loadSession(code);
    if (session.status === 'ended') throw httpError(409, 'Cette séance est terminée.');

    const player = await upsertPlayer(body.deviceId, null);
    const count = await query('select count(*)::int as n from class_players where code = $1', [code]);
    const already = await query('select 1 from class_players where code = $1 and player_id = $2', [code, player.id]);
    if (!already.rows[0] && count.rows[0].n >= C.MAX_PLAYERS) throw httpError(409, 'La classe est complète.');
    await query(
        `insert into class_players (code, player_id, name, joined_at, updated_at)
         values ($1, $2, $3, now(), now())
         on conflict (code, player_id) do update set name = excluded.name, updated_at = now()`,
        [code, player.id, name]
    );
    return { status: session.status, lang: session.lang, themeName: session.theme_name, eventIds: session.event_ids };
}

async function control(body, status) {
    const code = C.normalizeCode(body.code);
    if (!code || !isValidDeviceId(body.deviceId)) throw httpError(400, 'Requête invalide.');
    const session = await loadSession(code);
    const me = await playerOf(body.deviceId);
    if (!me || me.id !== session.teacher_id) throw httpError(403, 'Seul l\'enseignant peut faire cela.');
    if (status === 'running' && session.status === 'ended') throw httpError(409, 'Cette séance est terminée.');
    // Idempotent : relancer « start » sur une séance en cours ne la remet pas à zéro.
    if (status === 'running' && session.status === 'lobby') {
        await query("update class_sessions set status = 'running', started_at = now() where code = $1", [code]);
    } else if (status === 'ended' && session.status !== 'ended') {
        await query("update class_sessions set status = 'ended', ended_at = now() where code = $1", [code]);
    }
    return { status: status === 'ended' ? 'ended' : (session.status === 'ended' ? 'ended' : 'running') };
}

async function submitProgress(body) {
    const code = C.normalizeCode(body.code);
    if (!code || !isValidDeviceId(body.deviceId)) throw httpError(400, 'Requête invalide.');
    const session = await loadSession(code);
    if (session.status !== 'running') throw httpError(409, session.status === 'ended' ? 'Cette séance est terminée.' : 'La séance n\'a pas encore commencé.');
    const me = await playerOf(body.deviceId);
    if (!me) throw httpError(404, 'Rejoignez d\'abord la séance.');
    const joined = await query('select answered, credited from class_players where code = $1 and player_id = $2', [code, me.id]);
    if (!joined.rows[0]) throw httpError(404, 'Rejoignez d\'abord la séance.');

    const previouslyCredited = joined.rows[0].credited;
    const total = session.event_ids.length - 1; // manches : l'ancre n'est pas jouée
    const rounds = (Array.isArray(body.rounds) ? body.rounds : []).slice(0, total).map((r) => ({
        slotIndex: r && typeof r === 'object' ? r.slotIndex : undefined,
        elapsedMs: r && typeof r === 'object' ? r.elapsedMs : undefined
    }));
    const replay = DailyEngine.replayDailyGame(C.orderedDatesFor(session.event_ids, eventIndex(session.lang)), rounds, { lives: Infinity });
    const results = replay.details.map((d) => d.correct);
    const correct = results.filter(Boolean).length;
    const finished = replay.roundsPlayed === replay.roundsTotal;
    // Une requête arrivée en retard (moins de manches que déjà reçues) ne fait pas reculer l'élève.
    await query(
        `update class_players
            set score = $3, answered = $4, correct = $5, finished = $6, results = $7::jsonb, updated_at = now()
          where code = $1 and player_id = $2 and answered <= $4`,
        [code, me.id, replay.score, replay.roundsPlayed, correct, finished, JSON.stringify(results)]
    );
    // Séance liée à une équipe : chaque bonne réponse verse un point au coffre, une seule fois (on ne verse que
    // ce qui dépasse les points déjà crédités — le journal est cumulatif et renvoyé à chaque carte).
    let team = null;
    if (session.team_code && correct > previouslyCredited) {
        const claimed = await query(
            'update class_players set credited = $3 where code = $1 and player_id = $2 and credited = $4 returning 1',
            [code, me.id, correct, previouslyCredited]
        );
        // Deux envois simultanés : un seul gagne la mise à jour, l'autre ne verse rien.
        if (claimed.rows[0]) team = await creditTeam(session.team_code, me.id, correct - previouslyCredited, 'class');
    }
    const state = await buildState(code, body.deviceId);
    return { score: replay.score, answered: replay.roundsPlayed, finished, rank: state.me ? state.me.rank : null, team };
}

async function buildState(code, deviceId) {
    const session = await loadSession(code);
    const { rows } = await query(
        `select p.player_id, p.name, p.score, p.answered, p.correct, p.finished, p.results, p.joined_at
           from class_players p where p.code = $1 order by p.score desc, p.joined_at asc`,
        [code]
    );
    const me = deviceId && isValidDeviceId(deviceId) ? await playerOf(deviceId) : null;
    const isTeacher = !!me && me.id === session.teacher_id;
    const players = rows.map((r) => ({
        id: r.player_id, name: r.name, score: r.score, answered: r.answered, correct: r.correct,
        finished: r.finished, results: r.results, joinedAt: new Date(r.joined_at).getTime()
    }));
    const ranked = C.rankPlayers(players);
    const mine = me ? ranked.findIndex((p) => p.id === me.id) : -1;
    const state = {
        code,
        status: session.status,
        lang: session.lang,
        themeName: session.theme_name,
        total: session.event_ids.length - 1,
        isTeacher,
        playerCount: ranked.length,
        // Le bilan de toute la classe (la liste ci-dessous est plafonnée) : de quoi remplir la barre « vert / rouge ».
        totals: ranked.reduce((t, p) => ({ correct: t.correct + p.correct, wrong: t.wrong + Math.max(0, p.answered - p.correct) }), { correct: 0, wrong: 0 }),
        players: ranked.slice(0, C.MAX_PLAYERS).map((p, i) => ({
            rank: i + 1, name: p.name, score: p.score, answered: p.answered, correct: p.correct, finished: p.finished
        })),
        me: mine >= 0 ? { rank: mine + 1, score: ranked[mine].score, answered: ranked[mine].answered, correct: ranked[mine].correct, finished: ranked[mine].finished } : null
    };
    // Les cartes les plus ratées : à l'enseignant dès que ça se joue, à tous une fois la séance terminée.
    if (isTeacher || session.status === 'ended') state.recap = C.buildRecap(session.event_ids, players);
    return state;
}

module.exports = async (req, res) => {
    if (handlePreflight(req, res)) return;
    try {
        await ensureSchema();
        if (req.method === 'GET') {
            const q = req.query || {};
            const code = C.normalizeCode(q.code);
            if (!code) return sendError(res, 400, 'Code invalide : 6 caractères.');
            return res.status(200).json(await buildState(code, typeof q.deviceId === 'string' ? q.deviceId : ''));
        }
        if (req.method !== 'POST') return sendError(res, 405, 'Méthode non autorisée.');
        const body = (await readJsonBody(req)) || {};
        switch (body.action) {
            case 'create': return res.status(200).json(await createSession(body));
            case 'join': return res.status(200).json(await joinSession(body));
            case 'start': return res.status(200).json(await control(body, 'running'));
            case 'end': return res.status(200).json(await control(body, 'ended'));
            case 'submit': return res.status(200).json(await submitProgress(body));
            default: return sendError(res, 400, 'action inconnue.');
        }
    } catch (err) {
        if (!err.statusCode) console.error('[api/classroom]', err);
        return sendError(res, err.statusCode || 500, err.statusCode ? err.message : 'Erreur serveur.');
    }
};

module.exports.buildState = buildState;
