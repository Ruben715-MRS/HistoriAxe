// Mode Carte, logique pure (js/geoPlace.js) : la distance, l'échelle qui s'adapte à la zone jouée,
// les points, le vivier de questions et leur tirage.
//
// Même plan que tests/atlasCore.test.js : des cas isolés, puis la VRAIE base — parce que la
// sévérité du barème dépend de la répartition réelle des lieux, et qu'un barème qui paraît juste sur
// deux villes peut être injouable sur un thème entier.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const G = require('../js/geoPlace.js');

function entry(themeId, evt) {
    return { event: evt, theme: { id: themeId, nom: 'Thème ' + themeId, events: [evt] }, category: { nom: 'Culture générale' }, categoryIndex: 0 };
}
function ev(id, titre, date, wikipedia) {
    return { id, titre, date, wikipedia: wikipedia || '', description: 'x'.repeat(350) };
}
// Générateur pseudo-aléatoire déterministe (un test ne doit pas dépendre du hasard).
function seeded(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// ---------------------------------------------------------------- distance

test('la distance entre deux points est celle de la sphère terrestre', () => {
    assert.equal(G.haversineKm([48.85, 2.35], [48.85, 2.35]), 0);
    const parisLondres = G.haversineKm([48.8566, 2.3522], [51.5074, -0.1278]);
    assert.ok(parisLondres > 340 && parisLondres < 348, `Paris–Londres : ${parisLondres}`);
    const parisNewYork = G.haversineKm([48.8566, 2.3522], [40.7128, -74.006]);
    assert.ok(parisNewYork > 5800 && parisNewYork < 5880, `Paris–New York : ${parisNewYork}`);
    // Elle ne dépend pas du sens, ni du côté du méridien de 180°.
    assert.equal(G.haversineKm([10, 20], [30, 40]), G.haversineKm([30, 40], [10, 20]));
    assert.ok(G.haversineKm([0, 179], [0, -179]) < 250);
});

// ---------------------------------------------------------------- échelle

test('l\'échelle suit l\'étendue : un thème local est sévère, le monde est large', () => {
    const france = [];
    for (let i = 0; i < 40; i++) france.push([42 + (i % 8), -3 + (i % 10)]);
    const monde = [];
    for (let i = 0; i < 40; i++) monde.push([-50 + (i * 7) % 110, -170 + (i * 37) % 340]);
    const dFrance = G.scaleKm(france);
    const dMonde = G.scaleKm(monde);
    assert.ok(dFrance >= 80 && dFrance <= 200, `France : ${dFrance}`);
    assert.ok(dMonde >= 1000, `monde : ${dMonde}`);
    assert.ok(dFrance < dMonde);
});

test('l\'échelle reste bornée : un seul lieu ne rend pas le barème infiniment sévère', () => {
    assert.equal(G.scaleKm([[48.85, 2.35]]), G.SCALE_MIN_KM);
    assert.equal(G.scaleKm([]), G.SCALE_MAX_KM);
    // Même des points aux antipodes ne dépassent pas ce que la diagonale du monde permet (~20 000 km / 12).
    const antipodes = [[-80, -170], [80, 170], [-80, 170], [80, -170]];
    const D = G.scaleKm(antipodes);
    assert.ok(D > 1200 && D <= G.SCALE_MAX_KM, `antipodes : ${D}`);
});

test('quelques lieux lointains ne dilatent pas l\'échelle d\'un thème (cadre 5ᵉ‥95ᵉ centile)', () => {
    const pts = [];
    for (let i = 0; i < 50; i++) pts.push([47 + (i % 5) * 0.5, 2 + (i % 7) * 0.5]);
    const sans = G.scaleKm(pts);
    const avec = G.scaleKm(pts.concat([[41.9, 12.5], [36.7, 3.1]]));   // Rome, Alger
    assert.ok(avec <= sans * 1.5, `${sans} → ${avec}`);
});

// ---------------------------------------------------------------- points

test('la part de points vaut 1 dans la tolérance, puis décroît ; un site est plus exigeant qu\'une ville', () => {
    assert.equal(G.scoreFraction(0, 100, 'v'), 1);
    assert.equal(G.scoreFraction(9, 100, 'v'), 1);       // dans les 10 km d'une ville
    assert.ok(G.scoreFraction(9, 100, 's') < 1);          // mais pas à côté d'un monument
    assert.equal(G.scoreFraction(1.4, 100, 's'), 1);
    let prev = 1;
    [20, 50, 100, 200, 400, 1000].forEach(d => {
        const f = G.scoreFraction(d, 100, 'v');
        assert.ok(f < prev, `${d} km : ${f} ≥ ${prev}`);
        prev = f;
    });
    // À D + tolérance de distance, il reste 1/e ≈ 37 %.
    assert.ok(Math.abs(G.scoreFraction(110, 100, 'v') - Math.exp(-1)) < 0.002);
});

test('à écart égal, on garde plus de points sur une grande échelle que sur une petite', () => {
    assert.ok(G.scoreFraction(80, 1300, 'v') > G.scoreFraction(80, 120, 'v'));
});

test('le verdict : très bon fait monter le combo, raté fait perdre une vie, entre les deux rien', () => {
    assert.equal(G.verdict(1), 'great');
    assert.equal(G.verdict(G.GREAT_FROM), 'great');
    assert.equal(G.verdict(G.GREAT_FROM - 0.01), 'ok');
    assert.equal(G.verdict(G.MISS_BELOW), 'ok');
    assert.equal(G.verdict(G.MISS_BELOW - 0.01), 'miss');
    assert.equal(G.verdict(0), 'miss');
});

// ---------------------------------------------------------------- cadrage

test('le cadrage a une marge, ne sort pas du monde et n\'est jamais plus étroit qu\'une ville', () => {
    const [[w, s], [e, n]] = G.boundsOf([[48.85, 2.35]]);
    assert.ok(e - w >= 3.99 && n - s >= 2.99, `${e - w} × ${n - s}`);
    const [[w2, s2], [e2, n2]] = G.boundsOf([[-84, -179], [84, 179], [0, 0]]);
    assert.ok(w2 >= -180 && s2 >= -85 && e2 <= 180 && n2 <= 85);
});

// ---------------------------------------------------------------- vivier

test('le vivier ne garde que les lieux sûrs : site ou ville, sans drapeau', () => {
    const e = ['a', 'b', 'c', 'd', 'e'].map((k, i) => entry('t', ev(k, 'Événement ' + k, 1500 + i)));
    const pts = {
        't:a': [48.85, 2.35, 'v', 'Paris', 0],
        't:b': [48.86, 2.29, 's', 'Tour Eiffel', 0],
        't:c': [42.2, 9.1, 'z', 'Corse', 0],        // zone : pas une question
        't:d': [45.76, 4.83, 'v', 'Lyon', 1]        // discutable : écarté
        // « e » n'a pas de point
    };
    const pool = G.buildPool(e, pts);
    assert.deepEqual(pool.map(p => p.event.id).sort(), ['a', 'b']);
    const eiffel = pool.find(p => p.event.id === 'b');
    assert.equal(eiffel.prec, 's');
    assert.equal(eiffel.label, 'Tour Eiffel');
    assert.ok(Math.abs(eiffel.lat - 48.86) < 1e-9 && Math.abs(eiffel.lon - 2.29) < 1e-9);
});

test('un fait présent dans deux thèmes n\'est posé qu\'une fois', () => {
    const url = 'https://fr.wikipedia.org/wiki/Bataille_de_Verdun';
    const a = entry('t1', ev('a', 'Verdun', 1916, url));
    const b = entry('t2', ev('b', 'Verdun, la bataille', 1916, url));
    const pool = G.buildPool([a, b], { 't1:a': [49.16, 5.39, 'v', 'Verdun', 0], 't2:b': [49.16, 5.39, 'v', 'Verdun', 0] });
    assert.equal(pool.length, 1);
});

test('compter les lieux sûrs sans construire le vivier donne le même nombre, et sort tôt', () => {
    const events = [];
    const pts = {};
    for (let i = 0; i < 30; i++) {
        events.push(ev('e' + i, 'E' + i, 1000 + i));
        pts['t:e' + i] = [10 + i * 0.01, 20, i % 3 === 0 ? 'z' : 'v', 'lieu' + i, i % 5 === 0 ? 1 : 0];
    }
    const theme = { id: 't', nom: 'T', events };
    const exact = G.buildPool(events.map(e => ({ event: e, theme })), pts).length;
    assert.equal(G.countReliable([theme], pts, 1000), exact);
    assert.equal(G.countReliable([theme], pts, 3), 3);
});

// ---------------------------------------------------------------- tirage

function poolOf(places, perPlace) {
    const pool = [];
    places.forEach(place => { for (let i = 0; i < perPlace; i++) pool.push({ place, id: place + i }); });
    return pool;
}

test('une partie ne pose pas plus de deux questions au même lieu quand le vivier le permet', () => {
    const pool = poolOf(['paris', 'rome', 'lyon', 'vienne', 'berlin', 'madrid', 'londres'], 30);
    for (let seed = 1; seed <= 20; seed++) {
        const session = G.pickSession(pool, 12, seeded(seed));
        assert.equal(session.length, 12);
        const parLieu = {};
        session.forEach(q => { parLieu[q.place] = (parLieu[q.place] || 0) + 1; });
        Object.values(parLieu).forEach(n => assert.ok(n <= G.MAX_PER_PLACE, JSON.stringify(parLieu)));
    }
});

test('quand le vivier est trop étroit pour la limite, on complète plutôt que de jouer court', () => {
    const pool = poolOf(['paris'], 40);
    const session = G.pickSession(pool, 12, seeded(3));
    assert.equal(session.length, 12);
    assert.equal(new Set(session.map(q => q.id)).size, 12);
});

test('un vivier plus petit que la partie donne ce qu\'il a, sans doublon', () => {
    const pool = poolOf(['paris', 'rome', 'lyon'], 2);
    const session = G.pickSession(pool, 12, seeded(5));
    assert.equal(session.length, 6);
    assert.equal(new Set(session.map(q => q.id)).size, 6);
});

test('le tirage varie d\'une graine à l\'autre', () => {
    const pool = poolOf(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 20);
    const premiers = new Set();
    for (let seed = 1; seed <= 10; seed++) premiers.add(G.pickSession(pool, 12, seeded(seed))[0].id);
    assert.ok(premiers.size > 3);
});

// ---------------------------------------------------------------- la vraie base

const GEO_PATH = path.join(__dirname, '..', 'assets', 'geo', 'events-geo.json');
const FR_PATH = path.join(__dirname, '..', 'data', 'fr.json');
const skip = fs.existsSync(GEO_PATH) ? false : 'assets/geo/events-geo.json absent';

function realScopes() {
    const bdd = JSON.parse(fs.readFileSync(FR_PATH, 'utf8'));
    const points = JSON.parse(fs.readFileSync(GEO_PATH, 'utf8')).points;
    const themes = {};
    (function walk(nodes) {
        nodes.forEach(n => { (n.themes || []).forEach(t => { themes[t.id] = t; }); if (n.subcategories) walk(n.subcategories); });
    })(bdd.categories);
    const entriesOf = list => list.flatMap(t => (t.events || []).map(event => ({ event, theme: t, categoryIndex: 0 })));
    return { points, themes, entriesOf, all: Object.values(themes) };
}

test('vraie base : le monde offre des milliers de questions, toutes de lieu sûr', { skip }, () => {
    const { points, entriesOf, all } = realScopes();
    const pool = G.buildPool(entriesOf(all), points);
    assert.ok(pool.length > 5000, `seulement ${pool.length} questions dans le monde`);
    pool.forEach(q => {
        assert.ok(q.prec === 's' || q.prec === 'v');
        assert.ok(q.lat >= -90 && q.lat <= 90 && q.lon >= -180 && q.lon <= 180);
    });
    const D = G.scaleKm(pool.map(q => [q.lat, q.lon]));
    assert.ok(D >= 1000 && D <= G.SCALE_MAX_KM, `échelle du monde : ${D}`);
});

test('vraie base : l\'Histoire de France est jouable, et son barème est bien plus sévère que celui du monde', { skip }, () => {
    const { points, themes, entriesOf, all } = realScopes();
    const france = G.buildPool(entriesOf([themes.thm_fr]), points);
    assert.ok(france.length >= 60, `${france.length} questions en France`);
    const dFrance = G.scaleKm(france.map(q => [q.lat, q.lon]));
    const dMonde = G.scaleKm(G.buildPool(entriesOf(all), points).map(q => [q.lat, q.lon]));
    assert.ok(dFrance >= 80 && dFrance <= 250, `échelle de la France : ${dFrance}`);
    assert.ok(dFrance * 4 < dMonde);
    // 50 km d'écart : bon en France, excellent dans le monde.
    assert.ok(G.scoreFraction(50, dFrance, 'v') < G.scoreFraction(50, dMonde, 'v'));
});

test('vraie base : une partie tirée dans Histoire de France a douze questions de douze lieux au plus deux fois', { skip }, () => {
    const { points, themes, entriesOf } = realScopes();
    const pool = G.buildPool(entriesOf([themes.thm_fr]), points);
    const session = G.pickSession(pool, 12, seeded(42));
    assert.equal(session.length, 12);
    const parLieu = {};
    session.forEach(q => { parLieu[q.place] = (parLieu[q.place] || 0) + 1; });
    Object.values(parLieu).forEach(n => assert.ok(n <= 2));
});

test('vraie base : le nombre de lieux sûrs compté d\'avance est celui du vivier construit (hors faits liés)', { skip }, () => {
    const { points, themes } = realScopes();
    const theme = themes.thm_art;
    const brut = G.countReliable([theme], points, 100000);
    const pool = G.buildPool((theme.events || []).map(event => ({ event, theme, categoryIndex: 0 })), points).length;
    // Le vivier regroupe les faits liés et ne compte qu'un événement par fait : jamais plus que le brut.
    assert.ok(pool <= brut && pool >= brut * 0.8, `${pool} faits pour ${brut} événements`);
});
