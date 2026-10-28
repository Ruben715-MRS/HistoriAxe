// Les amis : l'identifiant d'ami (api/_lib/friends.js), puis l'endpoint (api/friends.js) sur un Postgres en mémoire
// (pg-mem) — demandes acceptées, blocage, réponses qui ne trahissent rien.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const Module = require('node:module');

const F = require('../api/_lib/friends.js');

test('l\'identifiant d\'ami : huit caractères sans ambiguïté, toléré en minuscules, avec # ou tiret', () => {
    for (let i = 0; i < 50; i++) assert.match(F.generateFriendCode(), /^[A-HJ-NP-Z2-9]{8}$/);
    assert.equal(F.normalizeFriendCode('k7qx-92hm'), 'K7QX92HM');
    assert.equal(F.normalizeFriendCode('#K7QX 92HM'), 'K7QX92HM');
    for (const bad of ['', 'K7QX92H', 'K7QX92HMM', 'K7QX-92H0', 'IIII-OOOO', null, 12, undefined]) assert.equal(F.normalizeFriendCode(bad), null, String(bad));
    assert.equal(F.formatFriendCode('K7QX92HM'), 'K7QX-92HM');
});

test('l\'identifiant est tiré au hasard : rien ne le relie à une adresse e-mail', () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(F.generateFriendCode());
    assert.ok(seen.size > 195, 'pas de répétition visible');
    // Le module ne reçoit ni e-mail ni identifiant de compte : il ne peut donc pas en dériver.
    assert.equal(F.generateFriendCode.length, 0);
});

let pgMem = null;
try { pgMem = require('pg-mem'); } catch (e) { /* dépendance de développement */ }
const maybe = pgMem ? test : test.skip;

function loadHandlers() {
    const db = pgMem.newDb();
    const { Pool } = db.adapters.createPg();
    const original = Module._load;
    Module._load = function (request, ...rest) { return request === 'pg' ? { Pool } : original.call(this, request, ...rest); };
    process.env.DATABASE_URL = 'postgres://test';
    for (const f of ['_lib/db.js', 'friends.js', '_lib/players.js']) delete require.cache[require.resolve(path.join('..', 'api', f))];
    const friends = require('../api/friends.js');
    const dbModule = require('../api/_lib/db.js');
    Module._load = original;
    deviceTokens.clear();
    return { friends, query: dbModule.query, ensureSchema: dbModule.ensureSchema };
}

// Jeton de chaque appareil, tel que le client le garde : renvoyé par le serveur, présenté ensuite.
const deviceTokens = new Map();
async function call(handler, payload, method = 'POST') {
    const id = payload && payload.deviceId;
    const headers = id && deviceTokens.has(id) ? { 'x-device-token': deviceTokens.get(id) } : {};
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(o) { this.body = o; return this; }, end() { return this; } };
    await handler({ method, headers, body: payload }, res);
    if (id && res.headers['X-Device-Token']) deviceTokens.set(id, res.headers['X-Device-Token']);
    return res;
}

// Un joueur, avec ou sans compte.
async function player(ctx, device, { account = true, pseudo = 'Anonyme' } = {}) {
    await ctx.ensureSchema();
    const id = crypto.randomUUID();
    await ctx.query('insert into players (id, device_id, pseudo, created_at, last_seen_at) values ($1, $2, $3, now(), now())', [id, device, pseudo]);
    if (account) await ctx.query('update players set auth_user_id = $2 where id = $1', [id, crypto.randomUUID()]);
    return id;
}
const dev = (n) => `friend-device-${String(n).padStart(4, '0')}`;

maybe('un joueur sans compte n\'a pas d\'amis ; avec un compte il reçoit un identifiant stable', async () => {
    const ctx = loadHandlers();
    await player(ctx, dev(1), { account: false });
    await player(ctx, dev(2), { pseudo: 'Léa' });
    assert.equal((await call(ctx.friends, { action: 'list', deviceId: dev(1) })).code, 403);
    assert.equal((await call(ctx.friends, { action: 'list', deviceId: dev(9) })).code, 404, 'joueur inconnu');
    assert.equal((await call(ctx.friends, { action: 'list', deviceId: 'x' })).code, 400);
    assert.equal((await call(ctx.friends, { action: 'list', deviceId: dev(2) }, 'GET')).code, 405);
    const a = (await call(ctx.friends, { action: 'list', deviceId: dev(2) })).body;
    assert.match(a.code, /^[A-HJ-NP-Z2-9]{8}$/);
    assert.equal((await call(ctx.friends, { action: 'list', deviceId: dev(2) })).body.code, a.code, 'le même à chaque fois');
    assert.deepEqual([a.friends, a.incoming, a.outgoing, a.blocked, a.requests], [[], [], [], [], true]);
    // Un joueur sans compte ne peut pas non plus demander quelqu'un en ami.
    assert.equal((await call(ctx.friends, { action: 'request', deviceId: dev(1), code: a.code })).code, 403);
});

maybe('demande, acceptation, liste avec les niveaux, retrait', async () => {
    const ctx = loadHandlers();
    await player(ctx, dev(1), { pseudo: 'Léa' });
    await player(ctx, dev(2), { pseudo: 'Hugo' });
    const codeHugo = (await call(ctx.friends, { action: 'list', deviceId: dev(2), level: 5 })).body.code;
    await call(ctx.friends, { action: 'list', deviceId: dev(1), level: 2 });

    assert.equal((await call(ctx.friends, { action: 'request', deviceId: dev(1), code: 'nimporte' })).code, 400);
    assert.equal((await call(ctx.friends, { action: 'request', deviceId: dev(1), code: 'ZZZZ-ZZZZ' })).code, 404);
    assert.equal((await call(ctx.friends, { action: 'request', deviceId: dev(2), code: '#' + codeHugo.toLowerCase() })).code, 400, 'pas soi-même');
    const sent = await call(ctx.friends, { action: 'request', deviceId: dev(1), code: F.formatFriendCode(codeHugo).toLowerCase() });
    assert.deepEqual(sent.body, { status: 'pending' });
    assert.equal((await call(ctx.friends, { action: 'request', deviceId: dev(1), code: codeHugo })).code, 409, 'déjà envoyée');

    let l1 = (await call(ctx.friends, { action: 'list', deviceId: dev(1) })).body;
    let l2 = (await call(ctx.friends, { action: 'list', deviceId: dev(2) })).body;
    assert.deepEqual(l1.outgoing.map((r) => r.name), ['Hugo']);
    assert.deepEqual(l2.incoming.map((r) => [r.name, r.level]), [['Léa', 2]]);
    // Seul le destinataire répond.
    const id = l2.incoming[0].id;
    assert.equal((await call(ctx.friends, { action: 'respond', deviceId: dev(1), id, accept: true })).code, 404);
    assert.equal((await call(ctx.friends, { action: 'respond', deviceId: dev(2), id, accept: true })).code, 200);
    l1 = (await call(ctx.friends, { action: 'list', deviceId: dev(1) })).body;
    l2 = (await call(ctx.friends, { action: 'list', deviceId: dev(2) })).body;
    assert.deepEqual(l1.friends.map((f) => [f.name, f.level]), [['Hugo', 5]]);
    assert.deepEqual(l2.friends.map((f) => [f.name, f.level]), [['Léa', 2]]);
    assert.deepEqual([l1.outgoing, l2.incoming], [[], []]);
    assert.equal((await call(ctx.friends, { action: 'request', deviceId: dev(1), code: codeHugo })).code, 409, 'déjà amis');
    // Retirer un ami : des deux côtés.
    assert.equal((await call(ctx.friends, { action: 'remove', deviceId: dev(1), id: l1.friends[0].id })).code, 200);
    assert.deepEqual((await call(ctx.friends, { action: 'list', deviceId: dev(2) })).body.friends, []);
});

maybe('refuser efface la demande ; annuler une demande envoyée ; demandes croisées = amis tout de suite', async () => {
    const ctx = loadHandlers();
    await player(ctx, dev(1), { pseudo: 'A' });
    await player(ctx, dev(2), { pseudo: 'B' });
    await player(ctx, dev(3), { pseudo: 'C' });
    const code = async (d) => (await call(ctx.friends, { action: 'list', deviceId: d })).body.code;
    const k1 = await code(dev(1)); const k2 = await code(dev(2)); const k3 = await code(dev(3));
    await call(ctx.friends, { action: 'request', deviceId: dev(1), code: k2 });
    let id = (await call(ctx.friends, { action: 'list', deviceId: dev(2) })).body.incoming[0].id;
    await call(ctx.friends, { action: 'respond', deviceId: dev(2), id, accept: false });
    assert.deepEqual((await call(ctx.friends, { action: 'list', deviceId: dev(1) })).body.outgoing, []);
    // Annuler.
    await call(ctx.friends, { action: 'request', deviceId: dev(1), code: k3 });
    id = (await call(ctx.friends, { action: 'list', deviceId: dev(1) })).body.outgoing[0].id;
    assert.equal((await call(ctx.friends, { action: 'cancel', deviceId: dev(3), id })).code, 404, 'pas celui qui reçoit');
    assert.equal((await call(ctx.friends, { action: 'cancel', deviceId: dev(1), id })).code, 200);
    assert.deepEqual((await call(ctx.friends, { action: 'list', deviceId: dev(3) })).body.incoming, []);
    // Demandes croisées : la seconde vaut acceptation.
    await call(ctx.friends, { action: 'request', deviceId: dev(1), code: k2 });
    assert.deepEqual((await call(ctx.friends, { action: 'request', deviceId: dev(2), code: k1 })).body, { status: 'accepted' });
    assert.equal((await call(ctx.friends, { action: 'list', deviceId: dev(1) })).body.friends.length, 1);
});

maybe('bloquer : plus de demande possible, et le bloqué ne sait pas qu\'il l\'est', async () => {
    const ctx = loadHandlers();
    await player(ctx, dev(1), { pseudo: 'A' });
    await player(ctx, dev(2), { pseudo: 'B' });
    const k1 = (await call(ctx.friends, { action: 'list', deviceId: dev(1) })).body.code;
    const k2 = (await call(ctx.friends, { action: 'list', deviceId: dev(2) })).body.code;
    // B demande A ; A refuse en bloquant.
    await call(ctx.friends, { action: 'request', deviceId: dev(2), code: k1 });
    const id = (await call(ctx.friends, { action: 'list', deviceId: dev(1) })).body.incoming[0].id;
    assert.equal((await call(ctx.friends, { action: 'respond', deviceId: dev(1), id, block: true })).code, 200);
    const a = (await call(ctx.friends, { action: 'list', deviceId: dev(1) })).body;
    const b = (await call(ctx.friends, { action: 'list', deviceId: dev(2) })).body;
    assert.deepEqual(a.blocked.map((x) => x.name), ['B']);
    assert.deepEqual([a.incoming, a.friends], [[], []]);
    assert.deepEqual([b.blocked, b.outgoing, b.friends, b.incoming], [[], [], [], []], 'B ne voit rien');
    // B ne peut plus demander : même réponse qu'un identifiant inconnu.
    const retry = await call(ctx.friends, { action: 'request', deviceId: dev(2), code: k1 });
    const unknown = await call(ctx.friends, { action: 'request', deviceId: dev(2), code: 'ZZZZZZZZ' });
    assert.equal(retry.code, 404);
    assert.equal(retry.body.error || retry.body.message, unknown.body.error || unknown.body.message, 'même message');
    // A ne peut pas non plus demander B sans débloquer ; débloquer rend tout possible.
    assert.equal((await call(ctx.friends, { action: 'request', deviceId: dev(1), code: k2 })).code, 409);
    assert.equal((await call(ctx.friends, { action: 'unblock', deviceId: dev(2), id: a.blocked[0].id })).code, 404, 'seul celui qui a bloqué débloque');
    assert.equal((await call(ctx.friends, { action: 'unblock', deviceId: dev(1), id: a.blocked[0].id })).code, 200);
    assert.deepEqual((await call(ctx.friends, { action: 'request', deviceId: dev(2), code: k1 })).body, { status: 'pending' });
    // Bloquer un ami le retire de la liste.
    const id2 = (await call(ctx.friends, { action: 'list', deviceId: dev(1) })).body.incoming[0].id;
    await call(ctx.friends, { action: 'respond', deviceId: dev(1), id: id2, accept: true });
    const friendId = (await call(ctx.friends, { action: 'list', deviceId: dev(1) })).body.friends[0].id;
    assert.equal((await call(ctx.friends, { action: 'block', deviceId: dev(1), id: friendId })).code, 200);
    assert.deepEqual((await call(ctx.friends, { action: 'list', deviceId: dev(2) })).body.friends, []);
});

maybe('refuser les demandes : l\'identifiant ne trouve plus personne', async () => {
    const ctx = loadHandlers();
    await player(ctx, dev(1), { pseudo: 'A' });
    await player(ctx, dev(2), { pseudo: 'B' });
    const k2 = (await call(ctx.friends, { action: 'list', deviceId: dev(2) })).body.code;
    assert.equal((await call(ctx.friends, { action: 'settings', deviceId: dev(2), requests: 'oui' })).code, 400);
    assert.deepEqual((await call(ctx.friends, { action: 'settings', deviceId: dev(2), requests: false })).body, { requests: false });
    assert.equal((await call(ctx.friends, { action: 'list', deviceId: dev(2) })).body.requests, false);
    assert.equal((await call(ctx.friends, { action: 'request', deviceId: dev(1), code: k2 })).code, 404);
    await call(ctx.friends, { action: 'settings', deviceId: dev(2), requests: true });
    assert.equal((await call(ctx.friends, { action: 'request', deviceId: dev(1), code: k2 })).code, 200);
});

maybe('limites : trop de demandes en attente, et le niveau envoyé est borné', async () => {
    const ctx = loadHandlers();
    await player(ctx, dev(1), { pseudo: 'A' });
    await call(ctx.friends, { action: 'list', deviceId: dev(1), level: 999 });
    assert.equal((await ctx.query('select level from players where device_id = $1', [dev(1)])).rows[0].level, 1, 'niveau invalide ignoré');
    for (let i = 2; i <= F.MAX_PENDING_SENT + 2; i++) await player(ctx, dev(i), { pseudo: 'P' + i });
    let last;
    for (let i = 2; i <= F.MAX_PENDING_SENT + 2; i++) {
        const code = (await call(ctx.friends, { action: 'list', deviceId: dev(i) })).body.code;
        last = await call(ctx.friends, { action: 'request', deviceId: dev(1), code });
    }
    assert.equal(last.code, 409, 'au-delà de la limite');
    assert.equal((await call(ctx.friends, { action: 'list', deviceId: dev(1) })).body.outgoing.length, F.MAX_PENDING_SENT);
});
