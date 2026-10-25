// Pack de données découpé (scripts/build_pack.js, js/pack.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildPack, PACK_DIR } = require('../scripts/build_pack.js');
const Pack = require('../js/pack.js');

const fr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'fr.json'), 'utf8'));
const files = buildPack(fr);

function* themesOf(node) {
    for (const t of node.themes || []) yield t;
    for (const s of node.subcategories || []) yield* themesOf(s);
}

function diskFetch(counter) {
    return async (url) => {
        if (counter) counter.n++;
        const rel = url.replace(/^data\/pack\/fr\//, '').replace(/\?.*$/, '');
        const file = path.join(PACK_DIR, 'fr', rel);
        if (!fs.existsSync(file)) return { ok: false, status: 404 };
        const text = fs.readFileSync(file, 'utf8');
        return { ok: true, status: 200, json: async () => JSON.parse(text), arrayBuffer: async () => Buffer.from(text) };
    };
}

test('data/pack/fr est à jour avec data/fr.json (sinon : npm run build:pack)', () => {
    for (const [rel, content] of files) {
        const file = path.join(PACK_DIR, 'fr', rel);
        assert.ok(fs.existsSync(file), `${rel} manquant : npm run build:pack`);
        assert.equal(fs.readFileSync(file, 'utf8'), content, `${rel} périmé : npm run build:pack`);
    }
    const onDisk = fs.readdirSync(path.join(PACK_DIR, 'fr', 'desc')).length;
    assert.equal(onDisk, files.size - 2, 'fiches orphelines dans data/pack/fr/desc : npm run build:pack');
});

test('le squelette ne contient plus aucune description mais en garde la longueur', () => {
    const sk = JSON.parse(files.get('skeleton.json'));
    let events = 0;
    for (const cat of sk.categories) for (const t of themesOf(cat)) for (const e of t.events) {
        events++;
        assert.equal(e.description, undefined, e.id);
        assert.ok(e.dl > 0, `${e.id} sans dl`);
    }
    assert.equal(events, fr.totalEvents);
});

test('budget : le squelette reste sous 7 Mo (il se télécharge avant tout affichage)', () => {
    assert.ok(Buffer.byteLength(files.get('skeleton.json')) < 7 * 1024 * 1024);
});

test('squelette + fiches reconstituent exactement data/fr.json', async () => {
    Pack.reset();
    const loaded = await Pack.load('fr', diskFetch());
    assert.ok(loaded && Pack.isSplit());
    const all = [];
    for (const cat of loaded.categories) for (const t of themesOf(cat)) all.push(...t.events);
    await Pack.ensureDescriptions(all);
    const rebuilt = { ...loaded.doc, categories: loaded.categories };
    for (const cat of rebuilt.categories) for (const t of themesOf(cat)) for (const e of t.events) delete e.dl;
    assert.deepEqual(rebuilt, fr);
});

test('les fiches se chargent par thème, une seule fois, et sans toucher aux autres thèmes', async () => {
    Pack.reset();
    const counter = { n: 0 };
    const loaded = await Pack.load('fr', diskFetch(counter));
    const afterLoad = counter.n; // manifeste + squelette
    const [t1, t2] = [...themesOf(loaded.categories[0])];
    const e1 = t1.events[0];
    assert.ok(Pack.needsDescription(e1));
    await Pack.ensureDescriptions([e1, t1.events[1]]);
    assert.equal(counter.n, afterLoad + 1, 'un seul fichier pour tout un thème');
    assert.ok(!Pack.needsDescription(e1));
    assert.ok(e1.description.length > 0);
    assert.equal(e1.description.length, e1.dl);
    assert.equal(t2.events[0].description, undefined, 'un autre thème reste non chargé');
    await Pack.ensureDescriptions([e1]);
    assert.equal(counter.n, afterLoad + 1, 'pas de second chargement');
});

test('hors ligne : ensureDescriptions ne rejette pas et laisse un nouvel essai possible', async () => {
    Pack.reset();
    let offline = false;
    const base = diskFetch();
    const loaded = await Pack.load('fr', async (url) => { if (offline && url.includes('/desc/')) throw new Error('réseau'); return base(url); });
    const evt = [...themesOf(loaded.categories[0])][0].events[0];
    offline = true;
    await Pack.ensureDescriptions([evt]);
    assert.equal(evt.description, undefined);
    assert.ok(Pack.needsDescription(evt));
    offline = false;
    await Pack.ensureDescriptions([evt]);
    assert.ok(evt.description.length > 0);
});

test('une langue sans pack découpé renvoie null (retour au fichier unique)', async () => {
    Pack.reset();
    assert.equal(await Pack.load('en', diskFetch()), null);
    assert.equal(Pack.isSplit(), false);
    assert.equal(Pack.needsDescription({ id: 'x', dl: 10 }), false);
});

test('prefetchAll réchauffe le cache sans garder les fiches en mémoire', async () => {
    Pack.reset();
    const counter = { n: 0 };
    const loaded = await Pack.load('fr', diskFetch(counter));
    const before = counter.n;
    const done = await Pack.prefetchAll({ concurrency: 4 });
    assert.equal(done, Object.keys(JSON.parse(files.get('manifest.json')).themes).length);
    assert.equal(counter.n - before, done);
    assert.equal([...themesOf(loaded.categories[0])][0].events[0].description, undefined);
});

test('Pack.splitPackLangs : les langues à pack découpé sont exactement les dossiers de data/pack/', () => {
    const dirs = fs.readdirSync(path.join(__dirname, '..', 'data', 'pack'))
        .filter((d) => fs.statSync(path.join(__dirname, '..', 'data', 'pack', d)).isDirectory())
        .sort();
    assert.deepEqual([...Pack.splitPackLangs].sort(), dirs);
});
