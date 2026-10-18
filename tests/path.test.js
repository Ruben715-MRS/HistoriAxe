// Le Chemin du Temps (js/pathCore.js) : composition des niveaux, étoiles, déblocage. Pur, sans navigateur.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../js/pathCore.js');

const root = path.resolve(__dirname, '..');
const fr = JSON.parse(fs.readFileSync(path.join(root, 'data', 'fr.json'), 'utf8'));
const uiFr = JSON.parse(fs.readFileSync(path.join(root, 'ui', 'fr.json'), 'utf8'));
const world = P.WORLDS[0];
const events = P.flattenEvents(fr.categories);
const pools = P.buildWorldPools(world, events);
const byId = new Map(events.map((e) => [e.id, e]));

// --- le contenu ----------------------------------------------------------------

test('chaque niveau compte 12 événements incontournables de sa tranche de temps, à des années toutes différentes', () => {
    world.levels.forEach((l) => {
        const ids = pools[P.levelId(world, l.n)];
        assert.equal(ids.length, P.LEVEL_POOL_SIZE, `niveau ${l.n}`);
        ids.forEach((id) => {
            const e = byId.get(id);
            assert.ok(e.essential, `${id} n'est pas incontournable`);
            assert.ok(e.date >= l.from && e.date < l.to, `${id} (${e.date}) hors de ${l.from}…${l.to}`);
        });
        assert.equal(new Set(ids.map((id) => byId.get(id).date)).size, ids.length, `niveau ${l.n} : deux événements d'une même année`);
    });
});

test('les tranches se suivent sans trou ni recouvrement et couvrent tout le monde', () => {
    assert.equal(world.levels[0].from, world.from);
    assert.equal(world.levels[world.levels.length - 1].to, world.to);
    for (let i = 1; i < world.levels.length; i++) assert.equal(world.levels[i].from, world.levels[i - 1].to);
});

test('le contenu est déterministe : même pack, mêmes niveaux', () => {
    assert.deepEqual(P.buildWorldPools(world, P.flattenEvents(fr.categories)), pools);
});

test('le boss reprend deux repères de chaque niveau, et rien d\'ailleurs', () => {
    const boss = pools[P.bossId(world)];
    assert.equal(boss.length, P.BOSS_PER_LEVEL * world.levels.length);
    world.levels.forEach((l) => {
        const own = new Set(pools[P.levelId(world, l.n)]);
        assert.equal(boss.filter((id) => own.has(id)).length, P.BOSS_PER_LEVEL, `niveau ${l.n}`);
    });
    assert.equal(new Set(boss.map((id) => byId.get(id).date)).size, boss.length);
});

test('un événement de plus d\'un thème n\'entre pas deux fois, et le contenu du joueur est ignoré', () => {
    const cats = [
        { nom: 'a', themes: [{ id: 't1', events: [{ id: 'x', date: 10, titre: 'X' }], essentiel: ['x'] }] },
        { nom: 'b', themes: [{ id: 't2', events: [{ id: 'x', date: 10, titre: 'X' }, { id: 'y', date: 'nc', titre: 'Y' }] }] },
        { nom: 'perso', isCustomCategory: true, themes: [{ id: 't3', events: [{ id: 'z', date: 11, titre: 'Z' }] }] },
        { nom: 'c', themes: [{ id: 'thm_histoire_juive_hebraique', events: [{ id: 'w', date: 12, titre: 'W' }] }] }
    ];
    assert.deepEqual(P.flattenEvents(cats).map((e) => e.id), ['x']);
});

test('la notoriété compte les autres thèmes qui racontent le même fait', () => {
    const cats = [
        { themes: [{ id: 'a', events: [{ id: 'a1', date: -399, titre: 'Procès et mort de Socrate' }] }] },
        { themes: [{ id: 'b', events: [{ id: 'b1', date: -399, titre: 'Condamnation de Socrate' }] }] },
        { themes: [{ id: 'c', events: [{ id: 'c1', date: -399, titre: 'Naissance de Zhuangzi' }] }] }
    ];
    const f = Object.fromEntries(P.flattenEvents(cats).map((e) => [e.id, e.fame]));
    assert.deepEqual(f, { a1: 1, b1: 1, c1: 0 });
});

test('pickSpread répartit les événements sur la fenêtre et préfère les plus connus', () => {
    const cands = [];
    for (let d = 0; d < 100; d++) cands.push({ id: 'e' + d, date: d, fame: d === 50 ? 3 : 0 });
    const picked = P.pickSpread(cands, 10, 'graine');
    assert.equal(picked.length, 10);
    assert.ok(picked.some((e) => e.id === 'e50'), 'le plus connu est retenu');
    const slices = new Set(picked.map((e) => Math.floor(e.date / 10)));
    assert.equal(slices.size, 10, 'un événement par dixième de la fenêtre');
    assert.deepEqual(P.pickSpread(cands, 10, 'graine'), picked);
    assert.equal(P.pickSpread([], 5, 's').length, 0);
});

test('les épreuves d\'un niveau sont des modes de l\'Expédition adaptés à un vivier multi-thèmes (pas d\'Intrus)', () => {
    const src = fs.readFileSync(path.join(root, 'js', 'app', 'expedition.js'), 'utf8');
    const starters = [...src.matchAll(/^\s{4}(\w+): \(\) => start/gm)].map((m) => m[1]);
    assert.equal(starters.length, 9);
    P.levelsOf(world).forEach((l) => {
        l.stages.forEach((mode) => assert.ok(starters.includes(mode), `${l.id} : mode ${mode} inconnu`));
        assert.ok(!l.stages.includes('intrus'), `${l.id} : Intrus n'a pas de sens sur plusieurs thèmes`);
        assert.equal(new Set(l.stages).size, l.stages.length, `${l.id} : un mode revient`);
    });
    assert.equal(P.levelsOf(world).filter((l) => l.boss).length, 1);
    assert.ok(P.levelsOf(world)[P.levelsOf(world).length - 1].boss, 'le boss est le dernier');
});

test('chaque niveau et le monde ont leur titre dans ui/fr.json', () => {
    const w = uiFr.path.worlds[world.id];
    assert.ok(w.title && w.boss);
    world.levels.forEach((l) => assert.ok(w.levels[String(l.n)], `titre du niveau ${l.n}`));
});

// --- étoiles et progression ----------------------------------------------------------

test('étoiles : une pour finir, une de plus par vie gardée, aucune si le niveau est perdu', () => {
    assert.equal(P.starsFor(true, 3), 3);
    assert.equal(P.starsFor(true, 2), 2);
    assert.equal(P.starsFor(true, 1), 1);
    assert.equal(P.starsFor(true, 0), 0);
    assert.equal(P.starsFor(false, 3), 0);
});

test('une progression altérée est ramenée à des valeurs saines', () => {
    assert.deepEqual(P.normalizeProgress(null), { levels: {} });
    assert.deepEqual(P.normalizeProgress('x'), { levels: {} });
    const p = P.normalizeProgress({ levels: { a: { stars: 9, best: -4, plays: 'x' }, b: 7, c: { stars: 2, best: 150.7, plays: 3 } } });
    assert.deepEqual(p.levels, { a: { stars: 3, best: 0, plays: 0 }, c: { stars: 2, best: 150, plays: 3 } });
});

test('les étoiles et le meilleur score ne redescendent jamais ; l\'ancienne progression n\'est pas modifiée', () => {
    const p0 = P.normalizeProgress(null);
    const p1 = P.recordResult(p0, 'antiquite-1', 3, 500);
    const p2 = P.recordResult(p1, 'antiquite-1', 1, 200);
    assert.deepEqual(p2.levels['antiquite-1'], { stars: 3, best: 500, plays: 2 });
    assert.deepEqual(p0, { levels: {} });
    assert.equal(P.recordResult(p0, 'antiquite-1', 0, 80).levels['antiquite-1'].stars, 0);
});

test('déblocage : le premier niveau est ouvert, chacun s\'ouvre en réussissant le précédent', () => {
    let p = P.normalizeProgress(null);
    assert.ok(P.isUnlocked(world, 'antiquite-1', p));
    assert.ok(!P.isUnlocked(world, 'antiquite-2', p));
    p = P.recordResult(p, 'antiquite-1', 0, 50); // perdu : rien ne s'ouvre
    assert.ok(!P.isUnlocked(world, 'antiquite-2', p));
    p = P.recordResult(p, 'antiquite-1', 1, 300);
    assert.ok(P.isUnlocked(world, 'antiquite-2', p));
    assert.ok(!P.isUnlocked(world, 'antiquite-3', p));
    assert.ok(!P.isUnlocked(world, 'inconnu', p));
});

test('le boss demande le dixième niveau ET assez d\'étoiles', () => {
    let p = P.normalizeProgress(null);
    for (let n = 1; n <= 10; n++) p = P.recordResult(p, P.levelId(world, n), 1, 100);
    assert.equal(P.regularStars(world, p), 10);
    assert.ok(!P.isUnlocked(world, P.bossId(world), p), '10 étoiles ne suffisent pas');
    for (let n = 1; n <= 5; n++) p = P.recordResult(p, P.levelId(world, n), 2, 100);
    assert.equal(P.regularStars(world, p), 15);
    assert.ok(P.isUnlocked(world, P.bossId(world), p));
    // Assez d'étoiles mais dixième niveau jamais réussi : fermé.
    const q = { levels: {} };
    for (let n = 1; n <= 9; n++) q.levels[P.levelId(world, n)] = { stars: 3, best: 0, plays: 1 };
    assert.ok(!P.isUnlocked(world, P.bossId(world), P.normalizeProgress(q)));
});

test('le niveau courant avance, puis revient aux niveaux incomplets', () => {
    let p = P.normalizeProgress(null);
    assert.equal(P.currentLevelId(world, p), 'antiquite-1');
    p = P.recordResult(p, 'antiquite-1', 2, 100);
    assert.equal(P.currentLevelId(world, p), 'antiquite-2');
    assert.equal(P.nextLevelId(world, 'antiquite-1', p), 'antiquite-2');
    assert.equal(P.nextLevelId(world, 'antiquite-2', p), null, 'le suivant est fermé');
    // Tout fait à fond : plus de niveau courant.
    const all = { levels: {} };
    P.levelsOf(world).forEach((l) => { all.levels[l.id] = { stars: 3, best: 1, plays: 1 }; });
    assert.equal(P.currentLevelId(world, P.normalizeProgress(all)), null);
    assert.equal(P.worldStars(world, P.normalizeProgress(all)), P.worldMaxStars(world));
});

test('XP : rien à gagner d\'un niveau perdu sauf une fraction des points ; prime au premier passage ; le boss pèse plus', () => {
    assert.equal(P.levelXp(false, false, 0, 400, false), 100);
    const first = P.levelXp(false, true, 3, 400, true);
    const again = P.levelXp(false, true, 3, 400, false);
    assert.equal(first - again, 50);
    assert.ok(P.levelXp(true, true, 3, 400, true) > first * 2);
    assert.ok(P.levelXp(false, true, 3, 400, false) > P.levelXp(false, true, 1, 400, false));
});
