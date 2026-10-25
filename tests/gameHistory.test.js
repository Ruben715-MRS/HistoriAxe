// L'historique des parties d'un compte : validation des parties (api/_lib/history.js), file d'attente
// côté client (js/storage.js), puis endpoint GET/PUT /api/account sur un Postgres en mémoire (pg-mem).
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const Module = require('node:module');

const H = require('../api/_lib/history.js');
const S = require('../js/storage.js');

const NOW = Date.parse('2026-10-25T12:00:00Z');
const valid = (over = {}) => Object.assign({
    clientId: 'partie-000001', mode: 'classic', themeId: 'hf-revolution', themeName: 'Révolution',
    lang: 'fr', score: 420, won: true, rounds: 10, mistakes: 2, durationSeconds: 61.25,
    playedAt: '2026-10-25T11:59:00.000Z',
}, over);

test('une partie valide est acceptée, nettoyée et arrondie', () => {
    const g = H.normalizeGame(valid({ score: 419.6, durationSeconds: 61.26 }), NOW);
    assert.equal(g.score, 420);
    assert.equal(g.durationSeconds, 61.3);
    assert.equal(g.playedAt, '2026-10-25T11:59:00.000Z');
    assert.equal(g.won, true);
});

test('une partie sans identifiant client ou sans mode est refusée', () => {
    assert.equal(H.normalizeGame(valid({ clientId: 'trop court' }), NOW), null);
    assert.equal(H.normalizeGame(valid({ clientId: 'avec un point.ici' }), NOW), null);
    assert.equal(H.normalizeGame(valid({ mode: 'Classic!' }), NOW), null);
    assert.equal(H.normalizeGame(null, NOW), null);
});

test('les bornes sont tenues : score, nombre de manches, erreurs, durée, date', () => {
    assert.equal(H.normalizeGame(valid({ score: -1 }), NOW), null);
    assert.equal(H.normalizeGame(valid({ score: 'beaucoup' }), NOW), null);
    assert.equal(H.normalizeGame(valid({ rounds: 1001 }), NOW), null);
    assert.equal(H.normalizeGame(valid({ rounds: 3, mistakes: 4 }), NOW), null, 'plus d\'erreurs que de manches');
    assert.equal(H.normalizeGame(valid({ durationSeconds: 90000 }), NOW), null);
    assert.equal(H.normalizeGame(valid({ playedAt: 'pas une date' }), NOW), null);
    assert.equal(H.normalizeGame(valid({ playedAt: '2026-11-30T00:00:00Z' }), NOW), null, 'daté dans le futur');
});

test('une horloge d\'appareil légèrement en avance est tolérée ; une langue invalide ne rejette pas la partie', () => {
    assert.ok(H.normalizeGame(valid({ playedAt: '2026-10-26T06:00:00Z' }), NOW));
    const g = H.normalizeGame(valid({ lang: 'klingon-xx-long' }), NOW);
    assert.ok(g);
    assert.equal(g.lang, null);
});

test('un lot : les parties valides passent, les autres sont comptées sans faire échouer le lot', () => {
    const { games, skipped } = H.normalizeBatch({ games: [valid(), valid({ clientId: 'x' }), valid({ clientId: 'partie-000002' })] }, NOW);
    assert.deepEqual(games.map(g => g.clientId), ['partie-000001', 'partie-000002']);
    assert.equal(skipped, 1);
    assert.deepEqual(H.normalizeBatch({}, NOW), { games: [], skipped: 0 });
});

test('un lot est plafonné à 50 parties', () => {
    const many = Array.from({ length: 80 }, (_, i) => valid({ clientId: 'partie-' + String(i).padStart(6, '0') }));
    const { games, skipped } = H.normalizeBatch({ games: many }, NOW);
    assert.equal(games.length, 50);
    assert.equal(skipped, 0, 'les parties au-delà du plafond sont ignorées, pas comptées');
});

test('la pagination de la lecture reste bornée', () => {
    assert.deepEqual(H.pageParams({}), { limit: 50, offset: 0 });
    assert.deepEqual(H.pageParams({ limit: '5', offset: '10' }), { limit: 5, offset: 10 });
    assert.deepEqual(H.pageParams({ limit: '100000', offset: '-3' }), { limit: 200, offset: 0 });
    assert.deepEqual(H.pageParams({ limit: 'abc' }), { limit: 50, offset: 0 });
});

test('la file d\'attente : ajout borné, retrait par identifiant, liste d\'origine intacte', () => {
    const list = [{ owner: 'a@x.fr', game: { clientId: 'un' } }];
    const bigger = S.historyOutboxWith(list, { owner: 'a@x.fr', game: { clientId: 'deux' } }, S.HISTORY_OUTBOX_MAX);
    assert.equal(bigger.length, 2);
    assert.equal(list.length, 1, 'pas de modification sur place');
    const capped = S.historyOutboxWith([{ owner: 'a', game: { clientId: '1' } }, { owner: 'a', game: { clientId: '2' } }], { owner: 'a', game: { clientId: '3' } }, 2);
    assert.deepEqual(capped.map(e => e.game.clientId), ['2', '3'], 'la plus ancienne sort en premier');
    assert.deepEqual(S.historyOutboxWithout(bigger, ['un']).map(e => e.game.clientId), ['deux']);
});

// --- Endpoint GET/PUT /api/account sur pg-mem ---
let pgMem = null;
try { pgMem = require('pg-mem'); } catch (e) { /* dépendance de développement */ }
const maybe = pgMem ? test : test.skip;

// Jeton « tok-<userId> » accepté par un faux Supabase ; tout autre jeton est refusé.
const realFetch = globalThis.fetch;
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
globalThis.fetch = async (url, opts) => {
    if (opts && opts.method === 'DELETE') return { ok: true, status: 200, json: async () => ({}) }; // suppression admin
    const auth = (opts && opts.headers && opts.headers.Authorization) || '';
    const m = /^Bearer tok-(.+)$/.exec(auth);
    if (!m) return { ok: false, status: 401, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ id: m[1], email: m[1] + '@test.fr' }) };
};

function loadAccount() {
    const db = pgMem.newDb();
    const { Pool } = db.adapters.createPg();
    const original = Module._load;
    Module._load = function (request, ...rest) { return request === 'pg' ? { Pool } : original.call(this, request, ...rest); };
    process.env.DATABASE_URL = 'postgres://test';
    for (const f of ['_lib/db.js', 'account.js', '_lib/players.js', '_lib/auth.js']) delete require.cache[require.resolve(path.join('..', 'api', f))];
    const account = require('../api/account.js');
    const dbModule = require('../api/_lib/db.js');
    Module._load = original;
    return { account, query: dbModule.query, ensureSchema: dbModule.ensureSchema };
}

async function call(handler, { method = 'PUT', body, query = {}, user = null } = {}) {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(o) { this.body = o; return this; }, end() { return this; } };
    const headers = user ? { authorization: 'Bearer tok-' + user } : {};
    await handler({ method, body, query, headers }, res);
    return res;
}

// Un compte avec son joueur ; renvoie l'identifiant Supabase.
async function account(ctx, n) {
    await ctx.ensureSchema();
    const userId = crypto.randomUUID();
    await ctx.query(
        'insert into players (id, device_id, pseudo, auth_user_id, created_at, last_seen_at) values ($1, $2, $3, $4, now(), now())',
        [crypto.randomUUID(), 'history-device-' + n, 'Joueur' + n, userId]
    );
    return userId;
}

maybe('sans jeton, l\'historique reste fermé ; un compte sans joueur ne peut rien écrire', async () => {
    const ctx = loadAccount();
    await ctx.ensureSchema();
    assert.equal((await call(ctx.account, { method: 'GET' })).code, 401);
    assert.equal((await call(ctx.account, { method: 'PUT', body: { games: [] } })).code, 401);
    const orphan = crypto.randomUUID();
    assert.equal((await call(ctx.account, { method: 'PUT', body: { games: [valid()] }, user: orphan })).code, 404);
});

maybe('les parties sont enregistrées, relues de la plus récente à la plus ancienne, et l\'envoi est idempotent', async () => {
    const ctx = loadAccount();
    const user = await account(ctx, 1);
    const first = await call(ctx.account, { body: { games: [valid(), valid({ clientId: 'partie-000002', playedAt: '2026-10-25T11:00:00.000Z', score: 10 })] }, user });
    assert.deepEqual(first.body, { saved: 2, skipped: 0 });

    // Le même lot renvoyé (réseau coupé avant la réponse) : rien de doublonné.
    await call(ctx.account, { body: { games: [valid()] }, user });
    const page = (await call(ctx.account, { method: 'GET', user })).body;
    assert.equal(page.total, 2);
    assert.deepEqual(page.games.map(g => g.clientId), ['partie-000001', 'partie-000002']);
    assert.equal(page.games[0].themeName, 'Révolution');
    assert.equal(page.games[0].durationSeconds, 61.3);

    const second = (await call(ctx.account, { method: 'GET', query: { limit: '1', offset: '1' }, user })).body;
    assert.equal(second.games.length, 1);
    assert.equal(second.games[0].clientId, 'partie-000002');
});

maybe('l\'historique d\'un compte n\'est jamais visible d\'un autre', async () => {
    const ctx = loadAccount();
    const alice = await account(ctx, 2);
    const bob = await account(ctx, 3);
    await call(ctx.account, { body: { games: [valid()] }, user: alice });
    assert.equal((await call(ctx.account, { method: 'GET', user: bob })).body.total, 0);
});

maybe('la suppression du compte emporte son historique', async () => {
    const ctx = loadAccount();
    const user = await account(ctx, 4);
    await call(ctx.account, { body: { games: [valid()] }, user });
    const gone = await call(ctx.account, { method: 'DELETE', user });
    assert.equal(gone.code, 200);
    const { rows } = await ctx.query('select count(*)::int as n from game_history');
    assert.equal(rows[0].n, 0);
});

test.after(() => { globalThis.fetch = realFetch; });
