// Le Chemin du Temps (js/pathCore.js) : composition des niveaux, étoiles, déblocage. Pur, sans navigateur.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../js/pathCore.js');
const L = require('../js/pathLessons.js');

const root = path.resolve(__dirname, '..');
const fr = JSON.parse(fs.readFileSync(path.join(root, 'data', 'fr.json'), 'utf8'));
const uiFr = JSON.parse(fs.readFileSync(path.join(root, 'ui', 'fr.json'), 'utf8'));
const world = P.findWorld('grece');
const m0 = P.findWorld('monde0');
const W = require('../js/pathWorlds.js');
const events = P.flattenEvents(fr.categories);
const byId = new Map(events.map((e) => [e.id, e]));
const tiersOf = (w) => w.levels.filter((l) => l.from === w.levels[0].from).length;
const allPools = {};
P.WORLDS.forEach((w) => { allPools[w.id] = P.buildWorldPools(w, events); });
const pools = allPools[world.id];
const generated = P.WORLDS.filter((w) => w.id !== 'monde0');
const mains = P.mainWorlds();

// Un joueur arrivé au monde `worldId` : tous les niveaux des mondes précédents sont faits (une étoile), boss compris.
function reaching(worldId) {
    let p = P.normalizeProgress(null);
    for (const w of mains) {
        if (w.id === worldId) break;
        P.levelsOf(w).forEach((l) => { p = P.recordResult(p, l.id, 1, 100); });
    }
    return p;
}

// --- le contenu ----------------------------------------------------------------

test('le chemin principal : Monde 0, Préhistoire, Orient, Grèce, Rome ×2, puis la France de 481 à nos jours ; cinq îles', () => {
    assert.deepEqual(mains.map((w) => w.id), ['monde0', 'prehistoire', 'orient', 'grece', 'rome1', 'rome2', 'haut-moyen-age', 'feodalites',
        'capetiens', 'cent-ans', 'renaissances', 'religion', 'absolus', 'lumieres', 'revolution', 'revolution-inachevee', 'republique',
        'grande-guerre', 'entre-deux-guerres', 'trente-glorieuses', 'crises', 'depuis-1991']);
    assert.deepEqual(P.WORLDS.filter((w) => w.island).map((w) => w.id), ['ile-chine', 'ile-ameriques', 'ile-islam', 'ile-japon', 'ile-afrique']);
    assert.ok(!P.findWorld('antiquite'), "l'ancien monde unique de l'Antiquité est remplacé");
});

test('chaque niveau tiré a de 8 à 12 événements de sa tranche, dans ses thèmes, au plus 2 (3 en période dense) par année', () => {
    generated.forEach((w) => {
        const themes = w.themes ? new Set(w.themes) : null;
        const cap = w.maxPerDate || P.MAX_PER_DATE;
        w.levels.forEach((l) => {
            const ids = allPools[w.id][P.levelId(w, l.n)];
            assert.ok(ids.length >= 8 && ids.length <= P.LEVEL_POOL_SIZE, `${l.n === 0 ? '' : w.id + '-' + l.n} : ${ids.length} événements`);
            const perDate = {};
            ids.forEach((id) => {
                const e = byId.get(id);
                assert.ok(e.date >= l.from && e.date < l.to, `${id} (${e.date}) hors de ${l.from}…${l.to} (${w.id}-${l.n})`);
                if (themes) assert.ok(themes.has(e.theme), `${id} : thème ${e.theme} hors du monde ${w.id}`);
                perDate[e.date] = (perDate[e.date] || 0) + 1;
            });
            Object.entries(perDate).forEach(([d, n]) => assert.ok(n <= cap, `${w.id}-${l.n} : ${n} événements en ${d}`));
        });
    });
});

test('dans un monde, un événement ne sert qu\'une fois, et un même fait raconté par deux thèmes non plus', () => {
    generated.forEach((w) => {
        const seen = new Set();
        w.levels.forEach((l) => {
            allPools[w.id][P.levelId(w, l.n)].forEach((id) => {
                const key = byId.get(id).cluster;
                assert.ok(!seen.has(key), `${w.id}-${l.n} : ${id} répète un fait déjà vu dans le monde`);
                seen.add(key);
            });
        });
    });
});

test('les tranches de temps d\'un monde se suivent sans trou ni recouvrement ; un monde dense en répète une sur plusieurs niveaux', () => {
    W.WORLDS.forEach((d) => {
        for (let i = 1; i < d.windows.length; i++) assert.equal(d.windows[i][0], d.windows[i - 1][1], `${d.id} : trou ou recouvrement`);
        d.windows.forEach((win, i) => {
            assert.ok(win[1] > win[0], `${d.id} : tranche vide`);
            // Les années du jeu : une tranche d'au moins 6 ans (sauf la Préhistoire, aux dates arrondies).
            if (win[0] > -3300) assert.ok(win[1] - win[0] >= P.MIN_LEVEL_YEARS, `${d.id} : tranche ${i + 1} de moins de ${P.MIN_LEVEL_YEARS} ans`);
        });
        const world = P.findWorld(d.id);
        assert.equal(world.levels.length, d.windows.length * (d.tiers || 1), `${d.id} : nombre de niveaux`);
    });
});

test('chaque identifiant de thème des groupes existe dans le pack', () => {
    const known = new Set(events.map((e) => e.theme));
    Object.entries(W.GROUPS).forEach(([group, ids]) => {
        assert.ok(ids.length > 0, `groupe ${group} vide`);
        ids.forEach((id) => assert.ok(known.has(id), `groupe ${group} : thème ${id} introuvable`));
    });
});

test('le contenu est déterministe : même pack, mêmes niveaux', () => {
    assert.deepEqual(P.buildWorldPools(world, P.flattenEvents(fr.categories)), pools);
});

test('le boss est la révision du monde : 20 repères pris dans ses niveaux, et rien d\'ailleurs', () => {
    generated.forEach((w) => {
        const all = new Set();
        w.levels.forEach((l) => allPools[w.id][P.levelId(w, l.n)].forEach((id) => all.add(id)));
        const boss = allPools[w.id][P.bossId(w)];
        assert.ok(boss.length >= 12 && boss.length <= P.BOSS_POOL_SIZE, `${w.id} : boss de ${boss.length}`);
        boss.forEach((id) => assert.ok(all.has(id), `${w.id} : le boss tire ${id} hors des niveaux`));
    });
    assert.equal(allPools['grece'][P.bossId(world)].length, P.BOSS_POOL_SIZE);
});

test('les niveaux d\'une période dense creusent : le 2e niveau d\'une tranche est moins célèbre que le 1er', () => {
    const w = P.findWorld('revolution');
    const fameOf = (id) => byId.get(id).fame + (byId.get(id).essential ? 10 : 0);
    const avg = (n) => allPools[w.id][P.levelId(w, n)].reduce((s, id) => s + fameOf(id), 0) / allPools[w.id][P.levelId(w, n)].length;
    assert.equal(w.levels.length, 6);
    assert.equal(tiersOf(w), 2);
    assert.ok(avg(1) > avg(2));
    assert.equal(w.levels[0].from, w.levels[1].from);
    assert.notEqual(w.levels[1].stages, w.levels[0].stages, 'la difficulté monte');
});

test('la Grande Guerre court jusqu\'en 1919 (traité de Versailles) : une tranche, trois niveaux', () => {
    const gg = P.findWorld('grande-guerre');
    assert.equal(gg.levels.length, 3);
    assert.equal(gg.levels[0].from, 1914);
    assert.equal(gg.levels[0].to, 1920);
    assert.equal(gg.levels[0].shownTo, 1919);
    const dates = allPools['grande-guerre'][P.bossId(gg)].map((id) => byId.get(id).date);
    assert.ok(dates.some((d) => d === 1919), 'Versailles et 1919 font partie de la guerre');
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
    P.WORLDS.forEach((w) => {
        P.levelsOf(w).forEach((l) => {
            l.stages.forEach((stage) => {
                const mode = P.stageMode(stage);
                if (mode === 'lecon') {
                    const sets = Array.isArray(stage.set) ? stage.set : [stage.set];
                    sets.forEach((id) => assert.ok(L.getSet(id), `${l.id} : série de leçon ${id} inconnue`));
                } else {
                    assert.ok(starters.includes(mode), `${l.id} : mode ${mode} inconnu`);
                }
            });
            const modes = l.stages.filter((s) => typeof s === 'string');
            assert.ok(!modes.includes('intrus'), `${l.id} : Intrus n'a pas de sens sur plusieurs thèmes`);
            assert.equal(new Set(modes).size, modes.length, `${l.id} : un mode revient`);
        });
        assert.equal(P.levelsOf(w).filter((l) => l.boss).length, 1);
        assert.ok(P.levelsOf(w)[P.levelsOf(w).length - 1].boss, 'le boss est le dernier');
    });
});

test('chaque monde et chaque île ont leur titre, celui de leur boss, de leurs niveaux et leur phrase de fin dans ui/fr.json', () => {
    P.WORLDS.forEach((wd) => {
        const w = uiFr.path.worlds[wd.id];
        assert.ok(w && w.title && w.boss && w.done, `${wd.id} : titres`);
        wd.levels.forEach((l) => assert.ok(w.levels[String(l.n)], `${wd.id} : titre du niveau ${l.n}`));
        assert.equal(Object.keys(w.levels).length, wd.levels.length, `${wd.id} : titres en trop`);
        [w.title, w.boss, ...Object.values(w.levels)].forEach((t) => assert.ok(t.length <= 46, `${wd.id} : titre trop long pour la carte « ${t} »`));
    });
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
    assert.deepEqual(P.normalizeProgress(null), { levels: {}, skipped: [] });
    assert.deepEqual(P.normalizeProgress('x'), { levels: {}, skipped: [] });
    const p = P.normalizeProgress({ levels: { a: { stars: 9, best: -4, plays: 'x' }, b: 7, c: { stars: 2, best: 150.7, plays: 3 } } });
    assert.deepEqual(p.levels, { a: { stars: 3, best: 0, plays: 0 }, c: { stars: 2, best: 150, plays: 3 } });
    assert.deepEqual(P.normalizeProgress({ levels: {}, skipped: ['monde0', 3, 'monde0'] }).skipped, ['monde0']);
});

test('les étoiles et le meilleur score ne redescendent jamais ; l\'ancienne progression n\'est pas modifiée', () => {
    const p0 = P.normalizeProgress(null);
    const p1 = P.recordResult(p0, 'grece-1', 3, 500);
    const p2 = P.recordResult(p1, 'grece-1', 1, 200);
    assert.deepEqual(p2.levels['grece-1'], { stars: 3, best: 500, plays: 2 });
    assert.deepEqual(p0, { levels: {}, skipped: [] });
    assert.equal(P.recordResult(p0, 'grece-1', 0, 80).levels['grece-1'].stars, 0);
});

test('déblocage : le premier niveau d\'un monde ouvert est libre, chacun s\'ouvre en réussissant le précédent', () => {
    let p = reaching('grece');
    assert.ok(P.isUnlocked(world, 'grece-1', p));
    assert.ok(!P.isUnlocked(world, 'grece-2', p));
    p = P.recordResult(p, 'grece-1', 0, 50); // perdu : rien ne s'ouvre
    assert.ok(!P.isUnlocked(world, 'grece-2', p));
    p = P.recordResult(p, 'grece-1', 1, 300);
    assert.ok(P.isUnlocked(world, 'grece-2', p));
    assert.ok(!P.isUnlocked(world, 'grece-3', p));
    assert.ok(!P.isUnlocked(world, 'inconnu', p));
});

test('le boss demande le dernier niveau ET la moitié des étoiles possibles', () => {
    const n = world.levels.length;
    assert.equal(world.bossStarsRequired, Math.ceil(n * 3 / 2));
    let p = reaching('grece');
    for (let i = 1; i <= n; i++) p = P.recordResult(p, P.levelId(world, i), 1, 100);
    assert.equal(P.regularStars(world, p), n);
    assert.ok(!P.isUnlocked(world, P.bossId(world), p), `${n} étoiles ne suffisent pas`);
    for (let i = 1; i <= world.bossStarsRequired - n; i++) p = P.recordResult(p, P.levelId(world, i), 2, 100);
    assert.equal(P.regularStars(world, p), world.bossStarsRequired);
    assert.ok(P.isUnlocked(world, P.bossId(world), p));
    // Assez d'étoiles mais dernier niveau jamais réussi : fermé.
    let q = reaching('grece');
    for (let i = 1; i < n; i++) q = P.recordResult(q, P.levelId(world, i), 3, 0);
    assert.ok(!P.isUnlocked(world, P.bossId(world), q));
});

test('le niveau courant avance, puis revient aux niveaux incomplets', () => {
    let p = reaching('grece');
    assert.equal(P.nextTarget(p).levelId, 'grece-1');
    p = P.recordResult(p, 'grece-1', 2, 100);
    assert.equal(P.nextTarget(p).levelId, 'grece-2');
    assert.equal(P.nextLevelId(world, 'grece-1', p), 'grece-2');
    assert.equal(P.nextLevelId(world, 'grece-2', p), null, 'le suivant est fermé');
    // Tout fait à fond, partout : plus rien à proposer.
    let all = P.normalizeProgress(null);
    P.WORLDS.forEach((w) => P.levelsOf(w).forEach((l) => { all = P.recordResult(all, l.id, 3, 1); }));
    assert.equal(P.nextTarget(all), null);
    assert.equal(P.worldStars(world, all), P.worldMaxStars(world));
});

test('XP : rien à gagner d\'un niveau perdu sauf une fraction des points ; prime au premier passage ; le boss pèse plus', () => {
    assert.equal(P.levelXp(false, false, 0, 400, false), 100);
    const first = P.levelXp(false, true, 3, 400, true);
    const again = P.levelXp(false, true, 3, 400, false);
    assert.equal(first - again, 50);
    assert.ok(P.levelXp(true, true, 3, 400, true) > first * 2);
    assert.ok(P.levelXp(false, true, 3, 400, false) > P.levelXp(false, true, 1, 400, false));
});

// --- plusieurs mondes ----------------------------------------------------------------

test('le Monde 0 vient en premier ; la Préhistoire s\'ouvre en battant son boss, ou en le passant', () => {
    const pre = P.findWorld('prehistoire');
    assert.equal(P.WORLDS[0].id, 'monde0');
    let p = P.normalizeProgress(null);
    assert.ok(P.isWorldUnlocked(m0, p));
    assert.ok(!P.isWorldUnlocked(pre, p));
    assert.ok(!P.isUnlocked(pre, 'prehistoire-1', p), 'monde fermé : son premier niveau aussi');
    assert.equal(P.nextTarget(p).levelId, 'monde0-1');
    // Passer le Monde 0 ouvre la suite, et le joueur y est conduit.
    const skipped = P.skipWorld(p, 'monde0');
    assert.ok(P.isWorldUnlocked(pre, skipped));
    assert.equal(P.nextTarget(skipped).levelId, 'prehistoire-1');
    assert.ok(P.isUnlocked(m0, 'monde0-1', skipped), 'un monde passé reste jouable');
    // Ou battre son boss.
    assert.ok(P.isWorldUnlocked(pre, P.recordResult(p, P.bossId(m0), 1, 100)));
    // Une progression qui a déjà commencé un monde ne le reverrouille pas.
    const started = P.normalizeProgress({ levels: { 'grece-1': { stars: 2, best: 1, plays: 1 } } });
    assert.ok(P.isWorldUnlocked(world, started));
    assert.ok(P.isUnlocked(world, 'grece-2', started));
    // Seul un monde « passable » se passe.
    assert.deepEqual(P.skipWorld(p, 'grece').skipped, []);
});

test('après le boss d\'un monde, le niveau suivant est le premier du monde suivant ; après le dernier, rien', () => {
    let p = P.normalizeProgress(null);
    p = P.recordResult(p, P.bossId(m0), 2, 100);
    assert.equal(P.nextLevelId(m0, P.bossId(m0), p), 'prehistoire-1');
    const last = mains[mains.length - 1];
    assert.equal(P.nextLevelId(last, P.bossId(last), reaching(last.id)), null);
});

test('les îles : facultatives, ouvertes à la moitié de leur monde d\'attache, jamais proposées d\'office', () => {
    const chine = P.findWorld('ile-chine');
    assert.equal(chine.parent, 'grece');
    assert.equal(chine.opensAfter, Math.floor(world.levels.length / 2));
    assert.deepEqual(P.islandsOf(world).map((w) => w.id), ['ile-chine']);
    let p = reaching('grece');
    assert.ok(!P.isWorldUnlocked(chine, p));
    assert.ok(!P.isUnlocked(chine, 'ile-chine-1', p));
    // À la moitié du monde (le niveau `opensAfter` réussi), l'île s'ouvre.
    for (let i = 1; i < chine.opensAfter; i++) p = P.recordResult(p, P.levelId(world, i), 1, 100);
    assert.ok(!P.isWorldUnlocked(chine, p), 'une marche avant la moitié : fermée');
    p = P.recordResult(p, P.levelId(world, chine.opensAfter), 1, 100);
    assert.ok(P.isWorldUnlocked(chine, p));
    assert.ok(P.isUnlocked(chine, 'ile-chine-1', p));
    assert.ok(!P.isUnlocked(chine, 'ile-chine-2', p), 'dans une île aussi, on avance niveau après niveau');
    // Le chemin principal ne conduit jamais dans une île.
    assert.ok(!P.nextTarget(p).levelId.startsWith('ile-'));
    // Une île commencée reste ouverte ; son boss ne mène nulle part.
    assert.ok(P.isWorldUnlocked(chine, P.normalizeProgress({ levels: { 'ile-chine-1': { stars: 1, best: 1, plays: 1 } } })));
    assert.equal(P.nextLevelId(chine, P.bossId(chine), p), null);
    // Les îles n'entrent pas dans l'ordre des mondes : le monde qui suit la Grèce est Rome.
    assert.equal(P.nextLevelId(world, P.bossId(world), P.recordResult(reaching('grece'), P.bossId(world), 1, 1)), 'rome1-1');
});

test('le Monde 0 : ses niveaux à contenu fixé existent dans le pack, à des années toutes différentes', () => {
    const pools = P.buildWorldPools(m0, events);
    P.levelsOf(m0).forEach((l) => {
        if (!l.ids) {
            assert.ok(!P.levelNeedsEvents(l), `${l.id} : un niveau sans liste ne fait que des leçons`);
            return;
        }
        assert.deepEqual(pools[l.id], l.ids, `${l.id} : un identifiant manque dans data/fr.json`);
        assert.ok(l.ids.length >= 8, `${l.id} : au moins 8 événements`);
        const dates = l.ids.map((id) => byId.get(id).date);
        assert.equal(new Set(dates).size, dates.length, `${l.id} : deux événements d'une même année`);
    });
    // Le premier niveau se joue sans leçon : on apprend en jouant.
    assert.ok(P.levelsOf(m0)[0].stages.every((s) => typeof s === 'string'));
});

test('filtre par thèmes : un monde chrono-thématique ne tire que dans ses thèmes, incontournables ou non', () => {
    const level = { from: -800, to: -300, themes: ['thm_grc', 'thm_grccl'] };
    const cands = P.candidatesFor(level, events);
    assert.ok(cands.length > 20);
    cands.forEach((e) => assert.ok(level.themes.includes(e.theme) && e.date >= -800 && e.date < -300));
    assert.ok(cands.some((e) => !e.essential), 'avec des thèmes, les non-incontournables entrent aussi');
    // Sans thèmes : les seuls incontournables.
    P.candidatesFor({ from: -800, to: -300 }, events).forEach((e) => assert.ok(e.essential));
    // Le tirage préfère les incontournables.
    const picked = P.pickSpread(cands, 12, 'grece');
    assert.ok(picked.filter((e) => e.essential).length >= picked.length / 2);
});

test('sliceWindows : tranches d\'effectifs voisins, sans trou, et jamais plus étroites que la largeur minimale', () => {
    const cands = [];
    for (let d = 1800; d < 1900; d++) cands.push({ date: d });
    for (let d = 1900; d < 1910; d++) for (let k = 0; k < 10; k++) cands.push({ date: d });
    const w = P.sliceWindows(cands, 1800, 1910, 6);
    assert.equal(w[0].from, 1800);
    assert.equal(w[w.length - 1].to, 1910);
    for (let i = 1; i < w.length; i++) assert.equal(w[i].from, w[i - 1].to);
    w.forEach((x) => assert.ok(x.to - x.from >= P.MIN_LEVEL_YEARS, `tranche ${x.from}-${x.to} trop étroite`));
    // Une fenêtre dense (100 événements par année) reste en tranches larges : les années ne se coupent pas.
    const dense = [];
    for (let d = 1914; d < 1920; d++) for (let k = 0; k < 40; k++) dense.push({ date: d });
    assert.equal(P.sliceWindows(dense, 1914, 1920, 6).length, 1);
});

test('deux événements de la même année qui racontent le même fait forment un « cluster » ; des faits différents non', () => {
    const cats = [{ themes: [
        { id: 'a', events: [{ id: 'a1', date: 1792, titre: 'Proclamation de la Première République' }, { id: 'a2', date: 1792, titre: 'Bataille de Valmy' }] },
        { id: 'b', events: [{ id: 'b1', date: 1792, titre: 'Victoire de Valmy et proclamation de Première République' }, { id: 'b2', date: 1792, titre: 'Prise des Tuileries' }] },
        { id: 'c', events: [{ id: 'c1', date: 1914, titre: 'Début de la Première Guerre mondiale' }, { id: 'c2', date: 1914, titre: 'Bataille de la Marne' }] }
    ] }];
    const c = Object.fromEntries(P.flattenEvents(cats).map((e) => [e.id, e.cluster]));
    assert.equal(c.a1, c.b1, 'la proclamation de la République, deux fois');
    assert.equal(c.a2, c.b1, 'Valmy est cité dans le même titre');
    assert.notEqual(c.b2, c.a1, 'les Tuileries sont un autre fait');
    assert.notEqual(c.c1, c.c2, 'deux événements de 1914 qui ne partagent que « Guerre » et « Première »');
});

// --- leçons --------------------------------------------------------------------------

test('chaque question de leçon a une bonne réponse, des réponses distinctes et une explication', () => {
    Object.entries(L.SETS).forEach(([id, set]) => {
        assert.ok(set.title, `${id} : titre`);
        assert.ok(set.questions.length >= L.DEFAULT_TAKE, `${id} : au moins ${L.DEFAULT_TAKE} questions`);
        set.questions.forEach((q, i) => {
            assert.ok(q.q && q.explain, `${id}[${i}] : question et explication`);
            assert.ok(q.choices.length >= 2 && q.choices.length <= 4, `${id}[${i}] : 2 à 4 réponses`);
            assert.equal(new Set(q.choices).size, q.choices.length, `${id}[${i}] : réponses en double`);
        });
    });
});

test('un tirage de leçon : le bon nombre de questions, une seule bonne réponse chacune, et toutes les séries représentées', () => {
    let seed = 7;
    const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    const one = L.draw('siecles', 5, rng);
    assert.equal(one.length, 5);
    one.forEach((q) => assert.equal(q.choices.filter((c) => c.correct).length, 1));
    assert.equal(new Set(one.map((q) => q.prompt)).size, 5, 'pas deux fois la même question');
    const mix = L.draw(['ere', 'bornes', 'cycles'], 6, rng);
    assert.deepEqual([...new Set(mix.map((q) => q.set))].sort(), ['bornes', 'cycles', 'ere']);
    // La bonne réponse n'est pas toujours à la même place.
    const places = new Set();
    for (let i = 0; i < 20; i++) L.draw('siecles', 5, rng).forEach((q) => places.add(q.choices.findIndex((c) => c.correct)));
    assert.ok(places.size >= 3);
    assert.equal(L.draw('inconnue', 5).length, 0);
});

// --- Le paysage des mondes (js/pathSprites.js, js/pathScenery.js) ------------------------------------------

test('chaque monde a son thème, et chaque dessin cité existe', () => {
    const Sprites = require('../js/pathSprites.js');
    const Scenery = require('../js/pathScenery.js');
    const PathCore = require('../js/pathCore.js');
    for (const world of PathCore.WORLDS) {
        assert.ok(Scenery.THEMES[world.id], `${world.id} a un thème explicite`);
        const theme = Scenery.themeFor(world.id);
        assert.ok(Sprites.landmarks[theme.landmark], `${world.id} : monument « ${theme.landmark} » inconnu`);
        assert.ok(Scenery.GROUNDS[Scenery.THEMES[world.id].ground], `${world.id} : sol inconnu`);
        for (const [name] of theme.decor) assert.ok(Sprites.decor[name], `${world.id} : décor « ${name} » inconnu`);
    }
    // Les monuments sont tous distincts d'un monde à l'autre : un château n'est pas deux fois le « boss final ».
    const used = PathCore.WORLDS.map(w => Scenery.themeFor(w.id).landmark);
    assert.equal(new Set(used).size, used.length);
});

test('le paysage est stable et ne pose jamais un décor sur la route', () => {
    const Scenery = require('../js/pathScenery.js');
    const count = 9, step = 100, padTop = 250, amplitude = 78;
    const positions = [];
    for (let i = 0; i < count; i++) {
        positions.push({ x: i === count - 1 ? 150 : 150 + amplitude * Math.sin(i * 0.95 + 0.4), y: padTop + (count - 1 - i) * step });
    }
    const height = padTop + 70 + (count - 1) * step;
    const opts = { height, padTop, positions, width: 300, pixelWidth: 340 };
    for (const id of ['grece', 'grande-guerre', 'depuis-1991', 'ile-japon']) {
        const a = Scenery.layout(id, opts);
        assert.deepEqual(a, Scenery.layout(id, opts), 'déterministe');
        assert.ok(a.decor.length >= 15, `${id} est peuplé`);
        for (const item of a.decor) {
            assert.ok(Math.abs(item.x - Scenery.roadX(positions, item.y)) >= Scenery.MIN_GAP - 1, `${id} : décor sur la route à y=${item.y}`);
            assert.ok(item.x > 0 && item.x < 300 && item.y > 0 && item.y < height);
        }
        assert.equal(a.landmark.sprite, Scenery.themeFor(id).landmark);
        assert.ok(a.landmark.y < padTop, 'le monument est au-dessus de la pastille du boss');
    }
    assert.notDeepEqual(Scenery.layout('grece', opts).decor, Scenery.layout('rome1', opts).decor, 'chaque monde a son paysage');
});
