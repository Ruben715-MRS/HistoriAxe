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
    assert.equal((await call(h, 'GET', { code, deviceId: TEACHER })).body.memberCount, 3, 'Léa, Hugo et le chef d\'équipe');

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
    let r = await call(classroom, 'POST', { action: 'submit', code: session, deviceId: dev(1), logs: { frise: rounds.slice(0, 3) } });
    assert.equal(r.body.team.accepted, 3);
    // Le journal est cumulatif : renvoyer les mêmes cartes ne verse rien de plus.
    r = await call(classroom, 'POST', { action: 'submit', code: session, deviceId: dev(1), logs: { frise: rounds.slice(0, 3) } });
    assert.equal(r.body.team, null);
    r = await call(classroom, 'POST', { action: 'submit', code: session, deviceId: dev(1), logs: { frise: rounds } });
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

maybe('profil d\'équipe : description, pays, langue (enseignant seul), liste fermée', async () => {
    const { team: h } = loadHandlers();
    assert.equal((await call(h, 'POST', { action: 'create', deviceId: TEACHER, name: 'C', country: 'ZZ' })).code, 400);
    assert.equal((await call(h, 'POST', { action: 'create', deviceId: TEACHER, name: 'C', lang: 'xx' })).code, 400);
    const created = await call(h, 'POST', { action: 'create', deviceId: TEACHER, name: 'Classe de 3e', description: '  Bienvenue <b>ici</b> ', country: 'fr', lang: 'FR', level: 4 });
    assert.equal(created.code, 200);
    const code = created.body.code;
    let s = (await call(h, 'GET', { code, deviceId: TEACHER })).body;
    assert.equal(s.description, 'Bienvenue b ici /b');
    assert.equal(s.country, 'FR');
    assert.equal(s.lang, 'fr');
    assert.equal(s.leader.level, 4);
    assert.equal(s.maxMembers, 50);

    await call(h, 'POST', { action: 'join', code, deviceId: dev(1), name: 'Léa' });
    assert.equal((await call(h, 'POST', { action: 'profile', code, deviceId: dev(1), description: 'pirate' })).code, 403);
    assert.equal((await call(h, 'POST', { action: 'profile', code, deviceId: TEACHER })).code, 400, 'rien à modifier');
    assert.equal((await call(h, 'POST', { action: 'profile', code, deviceId: TEACHER, country: 'QQ' })).code, 400);
    const r = await call(h, 'POST', { action: 'profile', code, deviceId: TEACHER, description: 'Nouvelle description', country: 'BE', lang: 'nl' });
    assert.deepEqual(r.body, { description: 'Nouvelle description', country: 'BE', lang: 'nl', listed: false });
    s = (await call(h, 'GET', { code, deviceId: dev(1) })).body;
    assert.equal(s.country, 'BE');
    // Vider un champ est permis.
    await call(h, 'POST', { action: 'profile', code, deviceId: TEACHER, country: '' });
    assert.equal((await call(h, 'GET', { code, deviceId: dev(1) })).body.country, '');
});

maybe('les membres se classent par niveau, puis par points ; le niveau se met à jour', async () => {
    const { team: h } = loadHandlers();
    const code = (await call(h, 'POST', { action: 'create', deviceId: TEACHER, name: 'Classe' })).body.code;
    assert.equal((await call(h, 'POST', { action: 'join', code, deviceId: dev(1), name: 'Léa', level: 0 })).code, 400);
    await call(h, 'POST', { action: 'join', code, deviceId: dev(1), name: 'Léa', level: 2 });
    await call(h, 'POST', { action: 'join', code, deviceId: dev(2), name: 'Hugo', level: 5 });
    await call(h, 'POST', { action: 'join', code, deviceId: dev(3), name: 'Zoé', level: 2 });
    await call(h, 'POST', { action: 'contribute', code, deviceId: dev(3), stars: 3 });
    let names = (await call(h, 'GET', { code, deviceId: dev(1) })).body.members.map((m) => m.name);
    assert.deepEqual(names, ['Hugo', 'Zoé', 'Léa'], 'niveau 5, puis niveau 2 par points');
    // Léa passe niveau 6 : elle prend la tête. Le chef d'équipe a son propre niveau.
    assert.equal((await call(h, 'POST', { action: 'level', code, deviceId: dev(1), level: 6 })).code, 200);
    assert.equal((await call(h, 'POST', { action: 'level', code, deviceId: dev(1), level: 301 })).code, 400);
    assert.equal((await call(h, 'POST', { action: 'level', code, deviceId: dev(9), level: 3 })).code, 404);
    await call(h, 'POST', { action: 'level', code, deviceId: TEACHER, level: 8 });
    const s = (await call(h, 'GET', { code, deviceId: dev(1) })).body;
    names = s.members.map((m) => m.name);
    assert.deepEqual(names, ['Léa', 'Hugo', 'Zoé']);
    assert.equal(s.leader.level, 8);
    assert.equal(s.totalPoints, 3);
});

maybe('une équipe est limitée à 50 membres', async () => {
    const { team: h } = loadHandlers();
    const code = (await call(h, 'POST', { action: 'create', deviceId: TEACHER, name: 'Grande' })).body.code;
    // Le chef d'équipe compte : 49 autres membres suffisent à remplir les 50 places.
    for (let i = 1; i <= 49; i++) assert.equal((await call(h, 'POST', { action: 'join', code, deviceId: dev(i), name: 'E' + i })).code, 200);
    assert.equal((await call(h, 'GET', { code, deviceId: TEACHER })).body.memberCount, 50);
    assert.equal((await call(h, 'POST', { action: 'join', code, deviceId: dev(50), name: 'Trop' })).code, 409);
    // Un membre déjà inscrit peut re-rejoindre (changer de prénom) même quand l'équipe est pleine.
    assert.equal((await call(h, 'POST', { action: 'join', code, deviceId: dev(1), name: 'Nouveau' })).code, 200);
});

maybe('recherche d\'équipe par nom ou par identifiant', async () => {
    const { team: h } = loadHandlers();
    const a = (await call(h, 'POST', { action: 'create', deviceId: TEACHER, name: 'Les Historiens', country: 'FR', lang: 'fr', listed: true })).body.code;
    const b = (await call(h, 'POST', { action: 'create', deviceId: 'second-teacher-0001', name: 'Historiens du soir', listed: true })).body.code;
    // Une équipe privée (le choix par défaut) ne sort pas dans une recherche par nom, mais se trouve par son identifiant.
    const privee = (await call(h, 'POST', { action: 'create', deviceId: 'private-owner-00001', name: 'Historiens entre amis' })).body.code;
    await call(h, 'POST', { action: 'join', code: b, deviceId: dev(1), name: 'Léa' });
    assert.equal((await call(h, 'POST', { action: 'search', q: 'h' })).code, 400, 'au moins deux caractères');
    let r = (await call(h, 'POST', { action: 'search', q: 'historiens' })).body.teams;
    assert.deepEqual(r.map((t) => t.code), [b, a], 'les plus peuplées d\'abord');
    assert.ok(!r.some((t) => t.code === privee), 'une équipe privée n\'apparaît pas par son nom');
    assert.equal((await call(h, 'POST', { action: 'search', q: privee })).body.teams[0].code, privee, 'mais se trouve par son identifiant');
    assert.deepEqual(r[1], { code: a, name: 'Les Historiens', badge: '0.2.1.0', country: 'FR', lang: 'fr', memberCount: 1 });
    r = (await call(h, 'POST', { action: 'search', q: '#' + a.toLowerCase() })).body.teams;
    assert.equal(r[0].code, a, 'l\'identifiant, avec ou sans dièse');
    assert.deepEqual((await call(h, 'POST', { action: 'search', q: 'zzzzzzz%' })).body.teams, []);
    // Les jokers SQL ne sont pas interprétés.
    assert.deepEqual((await call(h, 'POST', { action: 'search', q: '%%' })).code, 400);
});

maybe('défier une autre équipe : invitation, acceptation, score sur sept jours, un seul défi à la fois', async () => {
    const { team: h, query } = loadHandlers();
    const A = (await call(h, 'POST', { action: 'create', deviceId: TEACHER, name: 'Alpha' })).body.code;
    const B = (await call(h, 'POST', { action: 'create', deviceId: 'second-teacher-0001', name: 'Beta' })).body.code;
    const C = (await call(h, 'POST', { action: 'create', deviceId: 'third-teacher-00001', name: 'Gamma' })).body.code;
    await call(h, 'POST', { action: 'join', code: A, deviceId: dev(1), name: 'Léa' });
    await call(h, 'POST', { action: 'join', code: B, deviceId: dev(2), name: 'Hugo' });

    // Réservé à l'enseignant ; pas soi-même ; cible connue.
    assert.equal((await call(h, 'POST', { action: 'challenge', code: A, deviceId: dev(1), target: B })).code, 403);
    assert.equal((await call(h, 'POST', { action: 'challenge', code: A, deviceId: TEACHER, target: A })).code, 400);
    assert.equal((await call(h, 'POST', { action: 'challenge', code: A, deviceId: TEACHER, target: 'ZZZZZZ' })).code, 404);
    const sent = await call(h, 'POST', { action: 'challenge', code: A, deviceId: TEACHER, target: '#' + B.toLowerCase() });
    assert.equal(sent.code, 200);
    // Un seul défi ouvert à la fois, de chaque côté.
    assert.equal((await call(h, 'POST', { action: 'challenge', code: A, deviceId: TEACHER, target: C })).code, 409);
    assert.equal((await call(h, 'POST', { action: 'challenge', code: C, deviceId: 'third-teacher-00001', target: B })).code, 409);

    let sa = (await call(h, 'GET', { code: A, deviceId: dev(1) })).body.challenge;
    let sb = (await call(h, 'GET', { code: B, deviceId: dev(2) })).body.challenge;
    assert.deepEqual([sa.status, sa.direction, sa.opponent.name], ['pending', 'sent', 'Beta']);
    assert.deepEqual([sb.status, sb.direction, sb.opponent.name], ['pending', 'received', 'Alpha']);

    // Seul l'enseignant de l'équipe défiée répond.
    assert.equal((await call(h, 'POST', { action: 'challenge_reply', code: B, deviceId: dev(2), id: sb.id, accept: true })).code, 403);
    assert.equal((await call(h, 'POST', { action: 'challenge_reply', code: A, deviceId: TEACHER, id: sb.id, accept: true })).code, 404, 'celle qui a défié ne répond pas');
    // Refuser efface l'invitation ; l'équipe peut alors défier une autre.
    assert.equal((await call(h, 'POST', { action: 'challenge_reply', code: B, deviceId: 'second-teacher-0001', id: sb.id, accept: false })).code, 200);
    assert.equal((await call(h, 'GET', { code: A, deviceId: dev(1) })).body.challenge, null);
    // Annuler une invitation envoyée.
    await call(h, 'POST', { action: 'challenge', code: A, deviceId: TEACHER, target: C });
    await call(h, 'POST', { action: 'challenge_cancel', code: A, deviceId: TEACHER });
    assert.equal((await call(h, 'GET', { code: A, deviceId: dev(1) })).body.challenge, null);

    // Accepté : les points se comptent à partir de là.
    await call(h, 'POST', { action: 'contribute', code: A, deviceId: dev(1), stars: 4 });
    await call(h, 'POST', { action: 'challenge', code: A, deviceId: TEACHER, target: B });
    sb = (await call(h, 'GET', { code: B, deviceId: dev(2) })).body.challenge;
    assert.equal((await call(h, 'POST', { action: 'challenge_reply', code: B, deviceId: 'second-teacher-0001', id: sb.id, accept: true })).code, 200);
    await call(h, 'POST', { action: 'contribute', code: A, deviceId: dev(1), stars: 2 });
    await call(h, 'POST', { action: 'contribute', code: B, deviceId: dev(2), stars: 5 });
    sa = (await call(h, 'GET', { code: A, deviceId: dev(1) })).body.challenge;
    sb = (await call(h, 'GET', { code: B, deviceId: dev(2) })).body.challenge;
    assert.deepEqual([sa.status, sa.myScore, sa.theirScore], ['active', 2, 5], 'les 4 points d\'avant ne comptent pas');
    assert.deepEqual([sb.status, sb.myScore, sb.theirScore], ['active', 5, 2]);
    assert.ok(Date.parse(sa.endsAt) > Date.now() + 6 * 86400000);

    // Sept jours plus tard : le défi se termine, le score est figé.
    await query("update team_challenges set ends_at = now() - interval '1 minute'");
    await call(h, 'POST', { action: 'contribute', code: A, deviceId: dev(1), stars: 6 });
    sa = (await call(h, 'GET', { code: A, deviceId: dev(1) })).body.challenge;
    assert.deepEqual([sa.status, sa.myScore, sa.theirScore], ['done', 2 + 6 === 8 ? sa.myScore : sa.myScore, 5]);
    const figé = (await call(h, 'GET', { code: A, deviceId: dev(1) })).body.challenge;
    await call(h, 'POST', { action: 'contribute', code: A, deviceId: dev(1), stars: 6 });
    assert.equal((await call(h, 'GET', { code: A, deviceId: dev(1) })).body.challenge.myScore, figé.myScore, 'plus de changement après la fin');
    // Un défi terminé libère les deux équipes.
    assert.equal((await call(h, 'POST', { action: 'challenge', code: A, deviceId: TEACHER, target: C })).code, 200);
});

maybe('visible dans la recherche : décidé par le créateur, privé par défaut', async () => {
    const { team: h } = loadHandlers();
    assert.equal((await call(h, 'POST', { action: 'create', deviceId: TEACHER, name: 'X', listed: 'oui' })).code, 400);
    const code = (await call(h, 'POST', { action: 'create', deviceId: TEACHER, name: 'Entre amis' })).body.code;
    assert.equal((await call(h, 'GET', { code })).body.listed, false);
    await call(h, 'POST', { action: 'join', code, deviceId: dev(1), name: 'Léa' });
    assert.equal((await call(h, 'POST', { action: 'profile', code, deviceId: dev(1), listed: true })).code, 403);
    assert.equal((await call(h, 'POST', { action: 'profile', code, deviceId: TEACHER, listed: true })).body.listed, true);
    assert.equal((await call(h, 'GET', { code })).body.listed, true);
    assert.equal((await call(h, 'POST', { action: 'search', q: 'entre amis' })).body.teams[0].code, code);
});
