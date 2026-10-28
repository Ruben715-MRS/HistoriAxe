// Jeton secret de l'appareil (api/_lib/players.js) : émis une fois, requis ensuite, un deviceId seul ne suffit plus.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

let pgMem = null;
try { pgMem = require('pg-mem'); } catch (e) { /* pg-mem est une dépendance de développement (npm ci) */ }
const maybe = pgMem ? test : test.skip;

function loadHandlers() {
    const db = pgMem.newDb();
    const { Pool } = db.adapters.createPg();
    const original = Module._load;
    Module._load = function (request, ...rest) { return request === 'pg' ? { Pool } : original.call(this, request, ...rest); };
    process.env.DATABASE_URL = 'postgres://test';
    for (const f of ['_lib/db.js', 'register.js', 'sync.js', '_lib/players.js']) delete require.cache[require.resolve(path.join('..', 'api', f))];
    const register = require('../api/register.js');
    const sync = require('../api/sync.js');
    const dbModule = require('../api/_lib/db.js');
    Module._load = original;
    return { register, sync, query: dbModule.query, ensureSchema: dbModule.ensureSchema };
}

async function call(handler, method, payload, token) {
    const headers = token ? { 'x-device-token': token } : {};
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(o) { this.body = o; return this; }, end() { return this; } };
    const req = method === 'GET' ? { method, query: payload, headers } : { method, body: payload, headers };
    await handler(req, res);
    return res;
}

const DEV = 'device-token-test-0001';
const OLD = 'device-token-legacy-0001';

maybe('le jeton est émis une fois ; ensuite le deviceId seul ne donne plus accès à la progression', async () => {
    const { register, sync } = loadHandlers();
    const first = await call(register, 'POST', { deviceId: DEV, pseudo: 'Léa' });
    assert.equal(first.code, 200);
    const token = first.headers['X-Device-Token'];
    assert.ok(token && token.length >= 32, 'un jeton est renvoyé à la création');

    // Sans jeton, le deviceId ne suffit plus, ni pour lire, ni pour écrire, ni pour se réenregistrer.
    assert.equal((await call(sync, 'GET', { deviceId: DEV })).code, 401);
    assert.equal((await call(sync, 'POST', { deviceId: DEV, data: { xp: 999 } })).code, 401);
    assert.equal((await call(register, 'POST', { deviceId: DEV })).code, 401);

    // Un jeton inventé est refusé ; le bon jeton donne accès.
    assert.equal((await call(sync, 'GET', { deviceId: DEV }, 'x'.repeat(40))).code, 401);
    const wrote = await call(sync, 'POST', { deviceId: DEV, data: { xp: 5 } }, token);
    assert.equal(wrote.code, 200);
    const read = await call(sync, 'GET', { deviceId: DEV }, token);
    assert.equal(read.code, 200);
    assert.deepEqual(read.body.data, { xp: 5 });
});

maybe('migration : un joueur sans jeton (ancien client) en reçoit un ; ensuite il en faut un', async () => {
    const { sync, query, ensureSchema } = loadHandlers();
    await ensureSchema();
    await query("insert into players (id, device_id, pseudo) values ('11111111-1111-4111-8111-111111111111', $1, 'Ancien')", [OLD]);
    const first = await call(sync, 'GET', { deviceId: OLD });
    assert.equal(first.code, 200);
    assert.equal(first.body.pseudo, 'Ancien');
    const token = first.headers['X-Device-Token'];
    assert.ok(token, 'le premier appel sans jeton reçoit le jeton');
    assert.equal((await call(sync, 'GET', { deviceId: OLD })).code, 401, 'le deviceId seul est refusé après la migration');
    assert.equal((await call(sync, 'GET', { deviceId: OLD }, token)).code, 200);
});
