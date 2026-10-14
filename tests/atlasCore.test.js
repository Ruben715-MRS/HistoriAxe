// Logique pure de l'Atlas (js/atlasCore.js) : un point par fait, la fiche choisie,
// les piles de points au même endroit, les filtres, l'échelle du temps.
//
// Même plan que tests/linkedEvents.test.js : des bases miniatures où chaque règle est
// mise en défaut isolément, puis la VRAIE base (data/fr.json + assets/geo/events-geo.json),
// parce que ce que l'Atlas affiche dépend de ces deux fichiers et que rien d'autre ne les
// confronte l'un à l'autre à l'exécution.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const A = require('../js/atlasCore.js');

function entry(themeId, evt, extra) {
    return Object.assign({
        event: evt,
        theme: { id: themeId, nom: 'Thème ' + themeId, events: [evt] },
        category: { nom: 'Culture générale' },
        categoryIndex: 0,
        subcategoryIndex: [],
        themeIndex: 0
    }, extra);
}
function ev(id, titre, date, wikipedia, description) {
    return { id, titre, date, wikipedia: wikipedia || '', description: description === undefined ? 'x'.repeat(350) : description };
}
const URL_A = 'https://fr.wikipedia.org/wiki/Bataille_de_Verdun';

// ---------------------------------------------------------------- fiche choisie

test('la description développée l\'emporte sur la courte et sur la trop longue', () => {
    const court = entry('t1', ev('a', 'Verdun', 1916, URL_A, 'x'.repeat(60)));
    const juste = entry('t2', ev('b', 'Verdun', 1916, URL_A, 'x'.repeat(350)));
    const longue = entry('t3', ev('c', 'Verdun', 1916, URL_A, 'x'.repeat(900)));
    assert.equal(A.pickRepresentative([court, longue, juste]), juste);
});

test('un titre qui porte un seul fait passe devant un titre qui en mêle plusieurs', () => {
    const simple = entry('t1', ev('a', 'Traité de Verdun', 843, URL_A));
    const double = entry('t2', ev('b', 'Traité de Verdun et naissance de la Francie occidentale', 843, URL_A));
    assert.equal(A.pickRepresentative([double, simple]), simple);
});

test('à descriptions égales, le thème généraliste passe devant la niche', () => {
    const general = entry('t1', ev('a', 'Verdun', 1916, URL_A), { category: { nom: 'Culture générale' } });
    const niche = entry('t2', ev('b', 'Verdun', 1916, URL_A), { category: { nom: 'Personnages illustres' } });
    assert.equal(A.pickRepresentative([niche, general]), general);
});

test('à égalité parfaite, l\'ordre de la base décide (le premier gagne)', () => {
    const a = entry('t1', ev('a', 'Verdun', 1916, URL_A));
    const b = entry('t2', ev('b', 'Verdun', 1916, URL_A));
    assert.equal(A.pickRepresentative([a, b]), a);
});

// ---------------------------------------------------------------- regroupement en faits

test('un fait présent dans deux thèmes n\'est qu\'un groupe ; deux événements d\'un même thème restent deux faits', () => {
    const a = entry('t1', ev('a', 'Verdun', 1916, URL_A));
    const b = entry('t2', ev('b', 'Verdun, bataille', 1916, URL_A));
    const c1 = entry('t3', ev('c1', 'X', 1900, 'https://fr.wikipedia.org/wiki/X'));
    const c2 = entry('t3', ev('c2', 'X bis', 1900, 'https://fr.wikipedia.org/wiki/X'));
    const facts = A.groupFacts([a, b, c1, c2]);
    assert.equal(facts.length, 3);
    assert.deepEqual(facts.map(f => f.length).sort(), [1, 1, 2]);
});

test('la catégorie personnelle du joueur n\'a pas de point sur la carte', () => {
    const custom = entry('perso', ev('p', 'Mon événement', 2000, ''), { category: { nom: 'Perso', isCustomCategory: true } });
    assert.equal(A.groupFacts([custom]).length, 0);
});

// ---------------------------------------------------------------- piles

test('un fait lié placé sous un seul de ses thèmes a quand même son point', () => {
    const a = entry('t1', ev('a', 'Verdun', 1916, URL_A));
    const b = entry('t2', ev('b', 'Verdun (guerre)', 1916, URL_A));
    const atlas = A.buildAtlas([a, b], { 't2:b': [49.16, 5.39, 'v', 'Verdun', 0] });
    assert.equal(atlas.features.length, 1);
    assert.equal(atlas.features[0].properties.n, 1);
});

test('les événements aux mêmes coordonnées forment une pile, triée par date', () => {
    const e1 = entry('t1', ev('1', 'B', 1800, ''));
    const e2 = entry('t1', ev('2', 'A', 1200, ''));
    const e3 = entry('t1', ev('3', 'C', 1900, ''));
    const pts = {
        't1:1': [48.85, 2.35, 'v', 'Paris', 0],
        't1:2': [48.85, 2.35, 'v', 'Paris', 0],
        't1:3': [45.76, 4.83, 'v', 'Lyon', 0]
    };
    const atlas = A.buildAtlas([e1, e2, e3], pts);
    assert.equal(atlas.features.length, 2);
    const paris = [...atlas.index.values()].find(p => p.items.length === 2);
    assert.deepEqual(paris.items.map(i => i.year), [1200, 1800]);
});

test('les lieux « zone » vont dans leur propre liste, pas dans celle des points précis', () => {
    const e1 = entry('t1', ev('1', 'A', 1500, ''));
    const e2 = entry('t1', ev('2', 'B', 1500, ''));
    const atlas = A.buildAtlas([e1, e2], { 't1:1': [42.2, 9.1, 'z', 'Corse', 0], 't1:2': [48.85, 2.35, 'v', 'Paris', 0] });
    assert.equal(atlas.zones.length, 1);
    assert.equal(atlas.features.length, 1);
});

test('un événement sans point, ou sans année, n\'apparaît pas', () => {
    const sansPoint = entry('t1', ev('1', 'A', 1500, ''));
    const sansAnnee = entry('t1', ev('2', 'B', undefined, ''));
    const atlas = A.buildAtlas([sansPoint, sansAnnee], { 't1:2': [48.85, 2.35, 'v', 'Paris', 0] });
    assert.equal(atlas.features.length + atlas.zones.length, 0);
});

test('le drapeau « lieu discutable » est repris sur l\'élément et sur la pile quand tous le sont', () => {
    const e1 = entry('t1', ev('1', 'A', 1500, ''));
    const atlas = A.buildAtlas([e1], { 't1:1': [48.85, 2.35, 'v', 'Paris', 1] });
    assert.equal(atlas.features[0].properties.flag, 1);
    assert.equal([...atlas.index.values()][0].items[0].flag, 1);
});

// ---------------------------------------------------------------- filtres

function paris() {
    const e1 = entry('t1', ev('1', 'Ancien', -200, ''), { categoryIndex: 0 });
    const e2 = entry('t1', ev('2', 'Moyen', 1200, ''), { categoryIndex: 1 });
    const e3 = entry('t1', ev('3', 'Récent', 1900, ''), { categoryIndex: 1 });
    const pts = {};
    ['1', '2', '3'].forEach(k => { pts['t1:' + k] = [48.85, 2.35, 'v', 'Paris', 0]; });
    return A.buildAtlas([e1, e2, e3], pts);
}

test('le filtre d\'époque ne garde que les éléments de la période, et le compteur de la pile suit', () => {
    const atlas = paris();
    const out = A.applyFilter(atlas.features, atlas.index, { from: 1000, to: 1500 });
    assert.equal(out.length, 1);
    assert.equal(out[0].properties.n, 1);
    assert.equal(A.applyFilter(atlas.features, atlas.index, { from: 1950, to: null }).length, 0);
});

test('le filtre de catégorie garde la pile si un de ses éléments en relève, et le point prend la catégorie dominante visible', () => {
    const atlas = paris();
    const all = A.applyFilter(atlas.features, atlas.index, null);
    assert.equal(all[0].properties.n, 3);
    assert.equal(all[0].properties.c, 1);   // deux sur trois sont de la catégorie 1
    const only0 = A.applyFilter(atlas.features, atlas.index, { cats: new Set([0]) });
    assert.equal(only0[0].properties.n, 1);
    assert.equal(only0[0].properties.c, 0);
    assert.equal(A.countEvents(only0), 1);
});

test('les bornes d\'époque sont inclusives', () => {
    const atlas = paris();
    assert.equal(A.applyFilter(atlas.features, atlas.index, { from: 1200, to: 1200 })[0].properties.n, 1);
});

// ---------------------------------------------------------------- échelle du temps

test('l\'échelle du temps est monotone et revient à son point de départ', () => {
    let prev = -Infinity;
    for (let p = 0; p <= 1.0001; p += 0.01) {
        const y = A.positionToYear(Math.min(p, 1));
        assert.ok(y >= prev, `position ${p} : ${y} < ${prev}`);
        prev = y;
    }
    [-300000, -5000, -100, 0, 800, 1789, 1999].forEach(y => {
        assert.ok(Math.abs(A.positionToYear(A.yearToPosition(y)) - y) <= 1, `aller-retour ${y}`);
    });
    assert.equal(A.positionToYear(0), -450000);
});

test('la moitié du curseur tombe vers l\'an 500, pas à la préhistoire', () => {
    assert.equal(A.positionToYear(0.5), 500);
});

test('les années du curseur sont arrondies selon la période', () => {
    assert.equal(A.roundYear(1387), 1385);
    assert.equal(A.roundYear(-4213), -4200);
    assert.equal(A.roundYear(1987), 1990);
    assert.equal(A.roundYear(-123456), -120000);
});

// ---------------------------------------------------------------- la vraie base

const GEO_PATH = path.join(__dirname, '..', 'assets', 'geo', 'events-geo.json');
const FR_PATH = path.join(__dirname, '..', 'data', 'fr.json');
const skip = fs.existsSync(GEO_PATH) ? false : 'assets/geo/events-geo.json absent';

function loadRealAtlas() {
    const bdd = JSON.parse(fs.readFileSync(FR_PATH, 'utf8'));
    const entries = [];
    bdd.categories.forEach((category, categoryIndex) => {
        (function walk(node, subPath) {
            (node.subcategories || []).forEach((s, si) => walk(s, subPath.concat(si)));
            (node.themes || []).forEach((theme, themeIndex) => {
                (theme.events || []).forEach(event => entries.push({ event, theme, category, categoryIndex, subcategoryIndex: subPath, themeIndex }));
            });
        })(category, []);
    });
    return A.buildAtlas(entries, JSON.parse(fs.readFileSync(GEO_PATH, 'utf8')).points);
}

test('vraie base : un point par fait, aucun événement dans deux piles, coordonnées valides', { skip }, () => {
    const atlas = loadRealAtlas();
    const seen = new Set();
    let items = 0;
    atlas.index.forEach(pile => {
        const [lon, lat] = pile.coords;
        assert.ok(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180);
        pile.items.forEach(it => {
            items++;
            it.members.forEach(m => {
                const k = A.entryKey(m);
                assert.ok(!seen.has(k), `${k} figure dans deux faits`);
                seen.add(k);
            });
        });
    });
    // Beaucoup plus d'un millier de faits : un seuil bas qui ne casse pas à chaque ajout de thème,
    // mais qui attrape un fichier de points vide ou une clé qui ne correspond plus à la base.
    assert.ok(items > 8000, `seulement ${items} faits sur la carte`);
    assert.equal(atlas.features.length + atlas.zones.length, atlas.index.size);
});

test('vraie base : les faits liés entre thèmes n\'ont bien qu\'un point (Lascaux, Notre-Dame)', { skip }, () => {
    const atlas = loadRealAtlas();
    const multi = [];
    atlas.index.forEach(pile => pile.items.forEach(it => { if (it.members.length >= 2) multi.push(it); }));
    assert.ok(multi.length > 500, `seulement ${multi.length} faits liés placés`);
    // Un fait lié ouvre une seule fiche : son représentant est l'un de ses membres.
    multi.forEach(it => assert.ok(it.members.includes(it.entry)));
});
