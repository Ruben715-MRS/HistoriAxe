// Mode Classe : la logique pure (api/_lib/classroom.js), puis les endpoints (api/classroom.js) sur un Postgres
// en mémoire (pg-mem) — le vrai SQL, la vraie purge, le vrai rejeu de la partie.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const C = require('../api/_lib/classroom.js');

test('le code : 6 caractères sans ambiguïté, tolérant à la saisie', () => {
    for (let i = 0; i < 200; i++) assert.match(C.generateCode(), /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    assert.equal(C.normalizeCode('abcd2ef'), null, '7 caractères');
    assert.equal(C.normalizeCode('abc-d2e'), 'ABCD2E', 'le tiret est toléré');
    assert.equal(C.normalizeCode(' ab c d2 3 '), 'ABCD23');
    assert.equal(C.normalizeCode('ABCDEO'), null, 'le O est exclu');
    assert.equal(C.normalizeCode('ABC1EF'), null, 'le 1 est exclu');
    assert.equal(C.normalizeCode(42), null);
});

test('le prénom : nettoyé, borné, jamais vide', () => {
    assert.equal(C.sanitizeName('  Léa   Martin '), 'Léa Martin');
    assert.equal(C.sanitizeName('<b>Léa</b>'), 'b Léa /b', 'le balisage est neutralisé, jamais conservé');
    assert.equal(C.sanitizeName('x'.repeat(50)).length, C.MAX_NAME);
    assert.equal(C.sanitizeName('   '), null);
    assert.equal(C.sanitizeName(null), null);
});

test('le paquet : taille, ids connus, pas de doublon', () => {
    const known = new Set(Array.from({ length: 50 }, (_, i) => 'e' + i));
    const ids = (n) => Array.from({ length: n }, (_, i) => 'e' + i);
    assert.equal(C.validateDeck(ids(10), known), null);
    assert.ok(C.validateDeck(ids(5), known));
    assert.ok(C.validateDeck(ids(41), new Set(ids(41))));
    assert.ok(C.validateDeck([...ids(7), 'zzz'], known));
    assert.ok(C.validateDeck([...ids(7), 'e1'], known));
    assert.ok(C.validateDeck('e1', known));
});

test('le rappel : la manche r est la carte r + 1, et seules les cartes jouées comptent', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const players = [
        { results: { frise: [true, false, false] } },
        { results: { frise: [false, false] } },   // n'a pas joué la 3e
        { results: {} }
    ];
    assert.deepEqual(C.buildRecap(ids, players), [
        { mode: 'frise', round: 0, eventId: 'b', answered: 2, wrong: 1 },
        { mode: 'frise', round: 1, eventId: 'c', answered: 2, wrong: 2 },
        { mode: 'frise', round: 2, eventId: 'd', answered: 1, wrong: 1 }
    ]);
});

test('le rappel indique le mode ; en « écart », une manche est une paire de cartes', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const players = [{ results: { frise: [false], ecart: [false, true] } }, { results: { frise: [true], ecart: [false] } }];
    assert.deepEqual(C.buildRecap(ids, players, ['ecart', 'frise']), [
        { mode: 'ecart', round: 0, eventId: 'a', eventId2: 'b', answered: 2, wrong: 2 },
        { mode: 'ecart', round: 1, eventId: 'c', eventId2: 'd', answered: 1, wrong: 0 },
        { mode: 'frise', round: 0, eventId: 'b', answered: 2, wrong: 1 }
    ]);
});

test('le classement : score décroissant, à égalité le premier arrivé', () => {
    const r = C.rankPlayers([{ name: 'b', score: 10, joinedAt: 2 }, { name: 'a', score: 10, joinedAt: 1 }, { name: 'c', score: 30, joinedAt: 3 }]);
    assert.deepEqual(r.map((p) => p.name), ['c', 'a', 'b']);
});

// --- Les endpoints, sur pg-mem ------------------------------------------------

let pgMem = null;
try { pgMem = require('pg-mem'); } catch (e) { /* pg-mem est une dépendance de développement (npm ci) */ }
const maybe = pgMem ? test : test.skip;

function loadHandler() {
    const db = pgMem.newDb();
    const { Pool } = db.adapters.createPg();
    const original = Module._load;
    Module._load = function (request, ...rest) { return request === 'pg' ? { Pool } : original.call(this, request, ...rest); };
    process.env.DATABASE_URL = 'postgres://test';
    for (const f of ['_lib/db.js', 'classroom.js', '_lib/players.js']) delete require.cache[require.resolve(path.join('..', 'api', f))];
    const handler = require('../api/classroom.js');
    const dbModule = require('../api/_lib/db.js');
    Module._load = original;
    return { handler, query: dbModule.query };
}

async function call(handler, method, payload) {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(o) { this.body = o; return this; }, end() { return this; } };
    const req = method === 'GET' ? { method, query: payload } : { method, body: payload };
    await handler(req, res);
    return res;
}

const TEACHER = 'teacher-device-0001';
const dev = (n) => `student-device-${String(n).padStart(4, '0')}`;

maybe('une séance qui enchaîne plusieurs modes : rejeu de chacun, total sur 100 par manche, bilan avec le mode', async () => {
    const { handler } = loadHandler();
    const { loadLangEvents } = require('../api/_lib/dataset.js');
    const seen = new Set();
    const deck = [];
    for (const e of loadLangEvents('fr')) { if (!seen.has(e.date)) { seen.add(e.date); deck.push(e); } if (deck.length === 8) break; }
    const ids = deck.map((e) => e.id);
    const created = await call(handler, 'POST', { action: 'create', deviceId: TEACHER, lang: 'fr', themeName: 'T', eventIds: ids, modes: ['fil', 'bidon', 'ecart', 'fil'] });
    assert.equal(created.code, 200);
    const code = created.body.code;
    const join = await call(handler, 'POST', { action: 'join', code, deviceId: dev(1), name: 'Léa' });
    assert.deepEqual(join.body.modes, ['fil', 'ecart'], 'modes inconnus et doublons écartés, ordre conservé');
    await call(handler, 'POST', { action: 'start', code, deviceId: TEACHER });
    const lobby = await call(handler, 'GET', { code, deviceId: TEACHER });
    assert.equal(lobby.body.total, 7 + 4, 'manches du fil (7) + paires de l\'écart (4)');
    assert.deepEqual(lobby.body.modes, ['fil', 'ecart']);

    // Le fil réussi, l'écart commencé : la séance n'est pas terminée.
    const dates = deck.map((e) => e.date);
    const fil = dates.slice(1).map((year) => ({ year }));
    const r1 = await call(handler, 'POST', { action: 'submit', code, deviceId: dev(1), logs: { fil } });
    assert.equal(r1.body.score, 700);
    assert.equal(r1.body.finished, false);
    const ecart = [0, 1, 2, 3].map((r) => ({ guesses: [Math.abs(dates[2 * r] - dates[2 * r + 1])] }));
    const r2 = await call(handler, 'POST', { action: 'submit', code, deviceId: dev(1), logs: { fil, ecart } });
    assert.equal(r2.body.score, 1100);
    assert.equal(r2.body.finished, true);
    assert.equal(r2.body.answered, 11);
    const live = await call(handler, 'GET', { code, deviceId: TEACHER });
    assert.deepEqual(live.body.totals, { correct: 11, wrong: 0 });
    assert.ok(live.body.recap.some((r) => r.mode === 'ecart' && r.eventId2));
});

maybe('une séance de bout en bout : création, élèves, départ, rejeu, classement, bilan', async (t) => {
    const { handler } = loadHandler();
    const { loadLangEvents } = require('../api/_lib/dataset.js');
    const all = loadLangEvents('fr');
    // Un paquet de 8 cartes de dates distinctes, dans l'ordre de jeu : la 1re est l'ancre.
    const seen = new Set();
    const deck = [];
    for (const e of all) { if (!seen.has(e.date)) { seen.add(e.date); deck.push(e); } if (deck.length === 8) break; }
    const ids = deck.map((e) => e.id);

    // Création : erreurs, puis succès.
    assert.equal((await call(handler, 'POST', { action: 'create', deviceId: 'x', lang: 'fr', themeName: 'T', eventIds: ids })).code, 400);
    assert.equal((await call(handler, 'POST', { action: 'create', deviceId: TEACHER, lang: 'fr', themeName: 'T', eventIds: ids.slice(0, 3) })).code, 400);
    assert.equal((await call(handler, 'POST', { action: 'create', deviceId: TEACHER, lang: 'fr', themeName: 'T', eventIds: [...ids.slice(0, 7), 'inconnu'] })).code, 400);
    const created = await call(handler, 'POST', { action: 'create', deviceId: TEACHER, pseudo: 'Mme Durand', lang: 'fr', themeName: 'La Révolution', eventIds: ids });
    assert.equal(created.code, 200);
    const code = created.body.code;
    assert.match(code, /^[A-Z2-9]{6}$/);

    // Les élèves rejoignent (code saisi en minuscules avec tiret).
    const lower = code.slice(0, 3).toLowerCase() + '-' + code.slice(3).toLowerCase();
    const joinA = await call(handler, 'POST', { action: 'join', code: lower, deviceId: dev(1), name: ' Léa ' });
    assert.equal(joinA.code, 200);
    assert.deepEqual(joinA.body.eventIds, ids, 'le paquet est celui de l\'enseignant, dans son ordre');
    assert.equal(joinA.body.status, 'lobby');
    assert.equal((await call(handler, 'POST', { action: 'join', code, deviceId: dev(2), name: 'Hugo' })).code, 200);
    assert.equal((await call(handler, 'POST', { action: 'join', code, deviceId: dev(3), name: '   ' })).code, 400);
    assert.equal((await call(handler, 'POST', { action: 'join', code: 'ZZZZZZ', deviceId: dev(3), name: 'X' })).code, 404);

    // Avant le départ : on ne soumet rien, et seul l'enseignant démarre.
    assert.equal((await call(handler, 'POST', { action: 'submit', code, deviceId: dev(1), logs: {} })).code, 409);
    assert.equal((await call(handler, 'POST', { action: 'start', code, deviceId: dev(1) })).code, 403);
    const lobby = await call(handler, 'GET', { code, deviceId: TEACHER });
    assert.equal(lobby.body.isTeacher, true);
    assert.deepEqual(lobby.body.players.map((p) => p.name).sort(), ['Hugo', 'Léa']);
    assert.equal(lobby.body.total, 7);
    assert.equal((await call(handler, 'POST', { action: 'start', code, deviceId: TEACHER })).body.status, 'running');
    assert.equal((await call(handler, 'POST', { action: 'start', code, deviceId: TEACHER })).body.status, 'running', 'idempotent');

    // Léa place tout juste ; Hugo met tout en tête de frise.
    const sorted = (placed, date) => placed.filter((d) => d < date).length;
    const placed = [deck[0].date];
    const lea = [];
    for (let r = 1; r < deck.length; r++) {
        lea.push({ slotIndex: sorted(placed, deck[r].date), elapsedMs: 4000 });
        placed.push(deck[r].date);
    }
    const hugo = deck.slice(1).map(() => ({ slotIndex: 0, elapsedMs: 4000 }));
    const partial = await call(handler, 'POST', { action: 'submit', code, deviceId: dev(1), logs: { frise: lea.slice(0, 3) } });
    assert.equal(partial.body.answered, 3);
    assert.equal(partial.body.finished, false);
    const full = await call(handler, 'POST', { action: 'submit', code, deviceId: dev(1), logs: { frise: lea } });
    assert.equal(full.body.finished, true);
    assert.ok(full.body.score > 0);
    // Une requête en retard (3 manches) ne fait pas reculer Léa.
    await call(handler, 'POST', { action: 'submit', code, deviceId: dev(1), logs: { frise: lea.slice(0, 3) } });
    const hugoRes = await call(handler, 'POST', { action: 'submit', code, deviceId: dev(2), logs: { frise: hugo } });
    assert.ok(hugoRes.body.finished, 'sans élimination : Hugo joue jusqu\'au bout malgré ses erreurs');
    assert.ok(hugoRes.body.score < full.body.score);

    const live = await call(handler, 'GET', { code, deviceId: TEACHER });
    assert.deepEqual(live.body.players.map((p) => [p.rank, p.name, p.finished]), [[1, 'Léa', true], [2, 'Hugo', true]]);
    assert.equal(live.body.players[0].correct, 7);
    assert.ok(live.body.players[1].correct < 7);
    // Le bilan de toute la classe (pour la barre vert / rouge) : bonnes réponses et fautes de tous les élèves.
    const [p0, p1] = live.body.players;
    assert.deepEqual(live.body.totals, { correct: p0.correct + p1.correct, wrong: (p0.answered - p0.correct) + (p1.answered - p1.correct) });
    assert.ok(live.body.totals.wrong >= 1);
    assert.ok(live.body.recap.length === 7, 'le bilan est à l\'enseignant dès que ça se joue');
    const hardest = live.body.recap.slice().sort((a, b) => b.wrong - a.wrong)[0];
    assert.ok(hardest.wrong >= 1);

    // L'élève voit son rang, mais pas le bilan tant que la séance n'est pas terminée.
    const meLea = await call(handler, 'GET', { code, deviceId: dev(1) });
    assert.equal(meLea.body.me.rank, 1);
    assert.equal(meLea.body.isTeacher, false);
    assert.equal(meLea.body.recap, undefined);

    // Fin : seul l'enseignant, plus de soumission, bilan pour tous.
    assert.equal((await call(handler, 'POST', { action: 'end', code, deviceId: dev(2) })).code, 403);
    assert.equal((await call(handler, 'POST', { action: 'end', code, deviceId: TEACHER })).body.status, 'ended');
    assert.equal((await call(handler, 'POST', { action: 'submit', code, deviceId: dev(2), logs: { frise: hugo } })).code, 409);
    assert.equal((await call(handler, 'POST', { action: 'join', code, deviceId: dev(4), name: 'Tard' })).code, 409);
    const after = await call(handler, 'GET', { code, deviceId: dev(2) });
    assert.equal(after.body.status, 'ended');
    assert.equal(after.body.recap.length, 7);
    // Aucun identifiant d'appareil n'est jamais renvoyé.
    assert.ok(!JSON.stringify(after.body).includes('device'));
    assert.ok(!JSON.stringify(after.body).includes(dev(1)));
});

maybe('une séance de plus de deux jours est purgée à la création suivante, et la classe est plafonnée', async () => {
    const { handler, query } = loadHandler();
    const { loadLangEvents } = require('../api/_lib/dataset.js');
    const seen = new Set();
    const ids = [];
    for (const e of loadLangEvents('fr')) { if (!seen.has(e.date)) { seen.add(e.date); ids.push(e.id); } if (ids.length === 6) break; }
    const first = await call(handler, 'POST', { action: 'create', deviceId: TEACHER, lang: 'fr', themeName: 'Ancienne', eventIds: ids });
    await query("update class_sessions set created_at = now() - interval '3 days' where code = $1", [first.body.code]);
    const second = await call(handler, 'POST', { action: 'create', deviceId: TEACHER, lang: 'fr', themeName: 'Récente', eventIds: ids });
    assert.equal((await call(handler, 'GET', { code: first.body.code, deviceId: TEACHER })).code, 404);
    assert.equal((await call(handler, 'GET', { code: second.body.code, deviceId: TEACHER })).code, 200);

    for (let i = 1; i <= C.MAX_PLAYERS; i++) {
        assert.equal((await call(handler, 'POST', { action: 'join', code: second.body.code, deviceId: dev(100 + i), name: 'E' + i })).code, 200);
    }
    assert.equal((await call(handler, 'POST', { action: 'join', code: second.body.code, deviceId: dev(999), name: 'Trop' })).code, 409);
    // Un élève déjà inscrit peut se reconnecter (même appareil) malgré la classe pleine.
    assert.equal((await call(handler, 'POST', { action: 'join', code: second.body.code, deviceId: dev(101), name: 'E1 bis' })).code, 200);
});

test('le rejeu sans élimination : toutes les manches se jouent, avec le détail carte par carte', () => {
    const DailyEngine = require('../js/dailyEngine.js');
    // Ancre 1000 ; cartes 1900, 1500, 1200 jouées en tête de frise (toutes fausses).
    const dates = [1200, 1500, 1900, 1000];
    const rounds = [{ slotIndex: 0, elapsedMs: 5000 }, { slotIndex: 0, elapsedMs: 5000 }, { slotIndex: 0, elapsedMs: 5000 }];
    const classe = DailyEngine.replayDailyGame(dates, rounds, { lives: Infinity });
    assert.equal(classe.roundsPlayed, 3);
    assert.deepEqual(classe.details.map((d) => d.correct), [false, false, false]);
    const defi = DailyEngine.replayDailyGame(dates, rounds);
    assert.equal(defi.roundsPlayed, 3, 'trois erreurs = trois vies : la 3e manche est la dernière');
});
