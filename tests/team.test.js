// Équipe de classe : la logique pure du coffre (api/_lib/team.js), puis l'endpoint (api/team.js) et le lien avec
// le Mode Classe sur un Postgres en mémoire (pg-mem).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const T = require('../api/_lib/team.js');

test('le coffre grossit avec la classe, avec un minimum', () => {
    assert.equal(T.chestTarget(0), 60);
    assert.equal(T.chestTarget(5), 60);
    assert.equal(T.chestTarget(30), 360);
});

test('les récompenses : pièces croissantes puis plafonnées, une carte rare tous les trois coffres', () => {
    assert.deepEqual([1, 2, 5, 6, 40].map(T.chestCoins), [40, 50, 80, 80, 80]);
    assert.deepEqual([1, 2, 3, 4, 6, 9].map(T.chestHasCard), [false, false, true, false, true, true]);
});

test('addToChest : l\'excédent est reporté, plusieurs coffres peuvent s\'ouvrir d\'un coup', () => {
    assert.deepEqual(T.addToChest({ progress: 50, chestIndex: 0 }, 5, 3), { progress: 55, chestIndex: 0, opened: 0 });
    assert.deepEqual(T.addToChest({ progress: 55, chestIndex: 0 }, 10, 3), { progress: 5, chestIndex: 1, opened: 1 });
    assert.deepEqual(T.addToChest({ progress: 0, chestIndex: 4 }, 130, 3), { progress: 10, chestIndex: 6, opened: 2 });
    assert.equal(T.addToChest({ progress: 0, chestIndex: 0 }, -20, 3).progress, 0, 'jamais de points négatifs');
    assert.equal(T.addToChest({ progress: 0, chestIndex: 0 }, 1e9, 3).opened, 10, 'borné');
});

test('unclaimedChests : seulement ce qui a été ouvert depuis la dernière réclamation', () => {
    assert.deepEqual(T.unclaimedChests(2, 2), []);
    assert.deepEqual(T.unclaimedChests(1, 3), [{ index: 2, coins: 50, card: false }, { index: 3, coins: 60, card: true }]);
    assert.deepEqual(T.unclaimedChests(0, 0), []);
});

test('les étoiles du Chemin sont plafonnées par appel et par jour', () => {
    assert.equal(T.acceptPathPoints(3, 0), 3);
    assert.equal(T.acceptPathPoints(50, 0), T.MAX_PER_CONTRIBUTION);
    assert.equal(T.acceptPathPoints(3, T.DAILY_PATH_CAP - 1), 1);
    assert.equal(T.acceptPathPoints(3, T.DAILY_PATH_CAP), 0);
    assert.equal(T.acceptPathPoints(-4, 0), 0);
    assert.equal(T.acceptPathPoints('beaucoup', 0), 0);
});

test('le nom d\'équipe : nettoyé, borné, jamais vide', () => {
    assert.equal(T.sanitizeTeamName('  2de   B <3 '), '2de B 3');
    assert.equal(T.sanitizeTeamName('x'.repeat(100)).length, T.MAX_TEAM_NAME);
    assert.equal(T.sanitizeTeamName('   '), null);
    assert.equal(T.sanitizeTeamName(7), null);
});

let pgMem = null;
try { pgMem = require('pg-mem'); } catch (e) { /* pg-mem est une dépendance de développement (npm ci) */ }
const maybe = pgMem ? test : test.skip;

function loadHandlers() {
    const db = pgMem.newDb();
    const { Pool } = db.adapters.createPg();
    const original = Module._load;
    Module._load = function (request, ...rest) { return request === 'pg' ? { Pool } : original.call(this, request, ...rest); };
    process.env.DATABASE_URL = 'postgres://test';
    for (const f of ['_lib/db.js', 'team.js', 'classroom.js', '_lib/players.js', '_lib/teamStore.js']) delete require.cache[require.resolve(path.join('..', 'api', f))];
    const team = require('../api/team.js');
    const classroom = require('../api/classroom.js');
    const dbModule = require('../api/_lib/db.js');
    Module._load = original;
    return { team, classroom, query: dbModule.query };
}

async function call(handler, method, payload) {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(o) { this.body = o; return this; }, end() { return this; } };
    const req = method === 'GET' ? { method, query: payload } : { method, body: payload };
    await handler(req, res);
    return res;
}

const TEACHER = 'teacher-device-0001';
const dev = (n) => `student-device-${String(n).padStart(4, '0')}`;

maybe('une équipe de bout en bout : création, membres, coffre, réclamation unique, exclusion', async () => {
    const { team: h } = loadHandlers();
    assert.equal((await call(h, 'POST', { action: 'create', deviceId: 'x', name: 'A' })).code, 400);
    assert.equal((await call(h, 'POST', { action: 'create', deviceId: TEACHER, name: '  ' })).code, 400);
    const created = await call(h, 'POST', { action: 'create', deviceId: TEACHER, pseudo: 'Mme Durand', name: '2de B' });
    assert.equal(created.code, 200);
    const code = created.body.code;

    assert.equal((await call(h, 'POST', { action: 'join', code: 'ZZZZZZ', deviceId: dev(1), name: 'X' })).code, 404);
    assert.equal((await call(h, 'POST', { action: 'join', code, deviceId: dev(1), name: '   ' })).code, 400);
    assert.equal((await call(h, 'POST', { action: 'join', code: code.toLowerCase(), deviceId: dev(1), name: 'Léa' })).code, 200);
    assert.equal((await call(h, 'POST', { action: 'join', code, deviceId: dev(2), name: 'Hugo' })).code, 200);

    // Qui n'est pas membre ne verse rien.
    assert.equal((await call(h, 'POST', { action: 'contribute', code, deviceId: dev(9), stars: 3 })).code, 404);

    // Les étoiles remplissent le coffre (cible : 60 pour 2 membres), dans la limite du jour.
    let r = await call(h, 'POST', { action: 'contribute', code, deviceId: dev(1), stars: 3 });
    assert.equal(r.body.accepted, 3);
    assert.equal(r.body.account, false, 'pas de compte : pas de cumul personnel');
    assert.equal(r.body.progress, 3);
    r = await call(h, 'POST', { action: 'contribute', code, deviceId: dev(1), stars: 99 });
    assert.equal(r.body.accepted, T.MAX_PER_CONTRIBUTION);
    for (let i = 0; i < 6; i++) await call(h, 'POST', { action: 'contribute', code, deviceId: dev(1), stars: 6 });
    r = await call(h, 'POST', { action: 'contribute', code, deviceId: dev(1), stars: 6 });
    assert.equal(r.body.accepted, 0, `plafond journalier ${T.DAILY_PATH_CAP}`);
    let state = (await call(h, 'GET', { code, deviceId: dev(1) })).body;
    assert.equal(state.me.points, T.DAILY_PATH_CAP);
    assert.equal(state.me.dailyLeft, 0);
    assert.equal(state.progress, T.DAILY_PATH_CAP);

    // Hugo complète : 30 + 30 = 60 → le premier coffre s'ouvre.
    for (let i = 0; i < 5; i++) await call(h, 'POST', { action: 'contribute', code, deviceId: dev(2), stars: 6 });
    state = (await call(h, 'GET', { code, deviceId: dev(2) })).body;
    assert.equal(state.chestIndex, 1);
    assert.equal(state.progress, 0);
    assert.deepEqual(state.me.unclaimed, [{ index: 1, coins: 40, card: false }]);
    assert.equal(state.untilCard, 2);

    // Un nouvel arrivant ne touche pas le coffre déjà ouvert.
    await call(h, 'POST', { action: 'join', code, deviceId: dev(3), name: 'Zoé' });
    assert.deepEqual((await call(h, 'GET', { code, deviceId: dev(3) })).body.me.unclaimed, []);

    // La réclamation ne paie qu'une fois.
    const first = await call(h, 'POST', { action: 'claim', code, deviceId: dev(1) });
    assert.deepEqual(first.body.chests, [{ index: 1, coins: 40, card: false }]);
    assert.deepEqual((await call(h, 'POST', { action: 'claim', code, deviceId: dev(1) })).body.chests, []);
    assert.equal((await call(h, 'POST', { action: 'claim', code, deviceId: dev(9) })).code, 404);

    // L'enseignant voit les références de renvoi, pas les élèves.
    const forTeacher = (await call(h, 'GET', { code, deviceId: TEACHER })).body;
    assert.equal(forTeacher.isTeacher, true);
    assert.equal(forTeacher.isMember, false);
    assert.ok(forTeacher.members.every((m) => m.ref));
    const forStudent = (await call(h, 'GET', { code, deviceId: dev(1) })).body;
    assert.ok(forStudent.members.every((m) => !('ref' in m)));
    assert.deepEqual(forStudent.members.map((m) => m.name).sort(), ['Hugo', 'Léa', 'Zoé']);

    // Exclusion : réservée à l'enseignant.
    const zoe = forTeacher.members.find((m) => m.name === 'Zoé');
    assert.equal((await call(h, 'POST', { action: 'kick', code, deviceId: dev(1), ref: zoe.ref })).code, 403);
    assert.equal((await call(h, 'POST', { action: 'kick', code, deviceId: TEACHER, ref: 'pas-un-uuid' })).code, 400);
    assert.equal((await call(h, 'POST', { action: 'kick', code, deviceId: TEACHER, ref: zoe.ref })).code, 200);
    assert.equal((await call(h, 'GET', { code, deviceId: TEACHER })).body.memberCount, 2);

    // Quitter, puis suppression par l'enseignant.
    assert.equal((await call(h, 'POST', { action: 'leave', code, deviceId: dev(2) })).code, 200);
    assert.equal((await call(h, 'GET', { code, deviceId: dev(2) })).body.isMember, false);
    assert.equal((await call(h, 'POST', { action: 'delete', code, deviceId: dev(1) })).code, 403);
    assert.equal((await call(h, 'POST', { action: 'delete', code, deviceId: TEACHER })).code, 200);
    assert.equal((await call(h, 'GET', { code, deviceId: TEACHER })).code, 404);
});

maybe('un compte personnel garde ses points d\'équipe', async () => {
    const { team: h, query } = loadHandlers();
    const code = (await call(h, 'POST', { action: 'create', deviceId: TEACHER, name: 'Classe' })).body.code;
    await call(h, 'POST', { action: 'join', code, deviceId: dev(1), name: 'Léa' });
    await call(h, 'POST', { action: 'join', code, deviceId: dev(2), name: 'Hugo' });
    // Léa a un compte : on rattache son joueur à un identifiant d'authentification.
    await query("update players set auth_user_id = '11111111-1111-4111-8111-111111111111' where device_id = $1", [dev(1)]);

    const lea = await call(h, 'POST', { action: 'contribute', code, deviceId: dev(1), stars: 3 });
    const hugo = await call(h, 'POST', { action: 'contribute', code, deviceId: dev(2), stars: 3 });
    assert.equal(lea.body.account, true);
    assert.equal(hugo.body.account, false);
    const state = (await call(h, 'GET', { code, deviceId: dev(1) })).body;
    assert.equal(state.me.account, true);
    assert.equal(state.me.teamPoints, 3);
    assert.equal((await call(h, 'GET', { code, deviceId: dev(2) })).body.me.teamPoints, 0);
});

maybe('une séance de Mode Classe liée à l\'équipe verse les bonnes réponses, une fois chacune', async () => {
    const { team, classroom } = loadHandlers();
    const { loadLangEvents } = require('../api/_lib/dataset.js');
    const seen = new Set();
    const deck = [];
    for (const e of loadLangEvents('fr')) { if (!seen.has(e.date)) { seen.add(e.date); deck.push(e); } if (deck.length === 8) break; }
    const ids = deck.map((e) => e.id);

    const code = (await call(team, 'POST', { action: 'create', deviceId: TEACHER, name: 'Classe' })).body.code;
    await call(team, 'POST', { action: 'join', code, deviceId: dev(1), name: 'Léa' });

    // Une équipe qui n'est pas la sienne est refusée.
    const other = (await call(team, 'POST', { action: 'create', deviceId: 'other-teacher-0001', name: 'Autre' })).body.code;
    assert.equal((await call(classroom, 'POST', { action: 'create', deviceId: TEACHER, lang: 'fr', themeName: 'T', eventIds: ids, teamCode: other })).code, 400);

    const session = (await call(classroom, 'POST', { action: 'create', deviceId: TEACHER, lang: 'fr', themeName: 'T', eventIds: ids, teamCode: code })).body.code;
    await call(classroom, 'POST', { action: 'join', code: session, deviceId: dev(1), name: 'Léa' });
    await call(classroom, 'POST', { action: 'start', code: session, deviceId: TEACHER });

    const placed = [deck[0].date];
    const rounds = [];
    for (let r = 1; r < deck.length; r++) {
        rounds.push({ slotIndex: placed.filter((d) => d < deck[r].date).length, elapsedMs: 4000 });
        placed.push(deck[r].date);
    }
    let r = await call(classroom, 'POST', { action: 'submit', code: session, deviceId: dev(1), rounds: rounds.slice(0, 3) });
    assert.equal(r.body.team.accepted, 3);
    // Le journal est cumulatif : renvoyer les mêmes cartes ne verse rien de plus.
    r = await call(classroom, 'POST', { action: 'submit', code: session, deviceId: dev(1), rounds: rounds.slice(0, 3) });
    assert.equal(r.body.team, null);
    r = await call(classroom, 'POST', { action: 'submit', code: session, deviceId: dev(1), rounds });
    assert.equal(r.body.team.accepted, 4);
    assert.equal((await call(team, 'GET', { code, deviceId: dev(1) })).body.me.points, 7);
});

test('sanitizeBadge : un écusson valide, avec une bordure déjà débloquée', () => {
    assert.equal(T.sanitizeBadge('3.5.2.0', 0), '3.5.2.0');
    assert.equal(T.sanitizeBadge('3.5.2.3', 0), null, 'bordure verrouillée à zéro coffre');
    assert.equal(T.sanitizeBadge('3.5.2.3', 4), '3.5.2.3');
    assert.equal(T.sanitizeBadge('<b>', 99), null);
    assert.equal(T.sanitizeBadge(undefined, 99), null);
});

maybe('l\'écusson : choisi à la création, modifiable par l\'enseignant seul, bordures limitées par les coffres', async () => {
    const { team: h, query } = loadHandlers();
    // Un client plus ancien n'envoie pas d'écusson : celui par défaut.
    const plain = await call(h, 'POST', { action: 'create', deviceId: 'old-teacher-device-1', name: 'Ancienne' });
    assert.equal((await call(h, 'GET', { code: plain.body.code })).body.badge, '0.2.1.0');

    assert.equal((await call(h, 'POST', { action: 'create', deviceId: TEACHER, name: 'Classe', badge: 'nimporte quoi' })).code, 400);
    assert.equal((await call(h, 'POST', { action: 'create', deviceId: TEACHER, name: 'Classe', badge: '1.1.1.4' })).code, 400, 'bordure verrouillée dès la création');
    const created = await call(h, 'POST', { action: 'create', deviceId: TEACHER, name: 'Classe', badge: '7.5.3.0' });
    assert.equal(created.code, 200);
    const code = created.body.code;
    await call(h, 'POST', { action: 'join', code, deviceId: dev(1), name: 'Léa' });
    assert.equal((await call(h, 'GET', { code, deviceId: dev(1) })).body.badge, '7.5.3.0');

    // Seul l'enseignant change l'écusson.
    assert.equal((await call(h, 'POST', { action: 'badge', code, deviceId: dev(1), badge: '1.1.1.0' })).code, 403);
    assert.equal((await call(h, 'POST', { action: 'badge', code, deviceId: TEACHER, badge: '1.1.1.0' })).body.badge, '1.1.1.0');
    assert.equal((await call(h, 'POST', { action: 'badge', code, deviceId: TEACHER, badge: 'zzz' })).code, 400);
    // Une bordure se débloque avec les coffres ouverts.
    assert.equal((await call(h, 'POST', { action: 'badge', code, deviceId: TEACHER, badge: '1.1.1.2' })).code, 400);
    await query('update class_teams set chest_index = 2 where code = $1', [code]);
    assert.equal((await call(h, 'POST', { action: 'badge', code, deviceId: TEACHER, badge: '1.1.1.2' })).body.badge, '1.1.1.2');
    assert.equal((await call(h, 'GET', { code, deviceId: dev(1) })).body.badge, '1.1.1.2');
});
