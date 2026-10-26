// Ville de l'histoire (js/cityHistoryCore.js) : le rattachement d'un lieu à une ville, les titres qui nomment la ville, le tirage.
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../js/cityHistoryCore.js');
const AtlasCore = require('../js/atlasCore.js');

const cities = require('../assets/geo/cities.json').cities;
const points = require('../assets/geo/events-geo.json').points;

function seeded(seed) {
    let s = seed;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; };
}
const city = name => cities.find(c => c.n === name);

test('titre : le nom de la ville, en mots entiers et sans accents, est une fuite', () => {
    assert.equal(H.titleNames('Siège de Kaifeng', ['Kaifeng']), true);
    assert.equal(H.titleNames('Prise de Constantinople par les Ottomans', ['Istanbul']), false, 'le nom historique n’est pas le nom du jeu');
    assert.equal(H.titleNames('Naissance de Mariama Bâ', ['Dakar']), false);
    assert.equal(H.titleNames('Sac de ROME', ['Rome']), true);
    assert.equal(H.titleNames('Romeo et Juliette', ['Rome']), false, 'mots entiers : « Romeo » n’est pas « Rome »');
    assert.equal(H.titleNames('Grand incendie de Londres', ['Londres']), true);
});

test('libellé : le nom principal d’un lieu de l’Atlas', () => {
    assert.equal(H.mainName('Ogidi, Anambra'), 'Ogidi');
    assert.equal(H.mainName('Paris'), 'Paris');
    assert.equal(H.mainName('Damas (Syrie)'), 'Damas');
});

test('lieu : une ville à moins de 5 km est celle du jeu ; un village voisin, non', () => {
    const paris = city('Paris');
    assert.equal(H.matchCity(cities, paris.lat + 0.02, paris.lon + 0.02, 'Paris').city.id, paris.id);
    // Röcken (Nietzsche) est à une vingtaine de kilomètres de Leipzig : ce n'est pas Leipzig.
    assert.equal(H.matchCity(cities, 51.2375, 12.1044, 'Röcken, Lützen, Saxe-Anhalt'), null);
    // Entre 5 et 12 km, seul un lieu qui porte le nom de la ville est retenu.
    const spb = city('Saint-Pétersbourg');
    assert.equal(H.matchCity(cities, spb.lat + 0.07, spb.lon, 'Saint-Pétersbourg').city.id, spb.id);
    assert.equal(H.matchCity(cities, spb.lat + 0.07, spb.lon, 'Pouchkine'), null);
});

test('vivier : un fait dont le titre nomme la ville est écarté ; un autre est gardé avec le nom français', () => {
    const rome = city('Rome');
    const facts = [
        { id: 'a:1', title: 'Sac de Rome par les Wisigoths', year: 410, lat: rome.lat, lon: rome.lon, label: 'Rome' },
        { id: 'a:2', title: 'Couronnement de Charlemagne', year: 800, lat: rome.lat, lon: rome.lon, label: 'Rome' },
        { id: 'a:3', title: 'Sans année', year: null, lat: rome.lat, lon: rome.lon, label: 'Rome' }
    ];
    const pool = H.buildHistoryPool(facts, cities);
    assert.equal(pool.length, 1);
    assert.equal(pool[0].fact.id, 'a:2');
    assert.equal(pool[0].city.n, 'Rome');
});

test('tirage : une ville par question, au plus, et reproductible', () => {
    const facts = [];
    ['Paris', 'Rome', 'Londres', 'Vienne', 'Berlin'].forEach((n, i) => {
        const c = city(n);
        facts.push({ id: n + ':1', title: 'Fait ' + i + ' A', year: 1000 + i, lat: c.lat, lon: c.lon, label: n });
        facts.push({ id: n + ':2', title: 'Fait ' + i + ' B', year: 1500 + i, lat: c.lat, lon: c.lon, label: n });
    });
    const pool = H.buildHistoryPool(facts, cities);
    assert.equal(pool.length, 10);
    const a = H.generateHistoryGame(pool, { count: 4, rng: seeded(5) });
    const b = H.generateHistoryGame(pool, { count: 4, rng: seeded(5) });
    assert.deepEqual(a, b);
    assert.equal(a.length, 4);
    assert.equal(new Set(a.map(q => q.target)).size, 4, 'une ville par question');
    a.forEach(q => assert.equal(H.isValid(q, cities), true));
});

test('vraie base : un vivier large, des villes variées, aucune fuite, et une partie de dix villes différentes', () => {
    const data = require('../data/fr.json');
    const entries = [];
    (function walk(n) {
        if (n.subcategories) n.subcategories.forEach(walk);
        else if (n.themes) n.themes.forEach((theme, ti) => (theme.events || []).forEach(event => entries.push({ event, theme, themeIndex: ti, categoryIndex: 0, subcategoryIndex: [] })));
    })({ subcategories: data.categories || [] });
    const facts = H.factsFromAtlas(AtlasCore.buildAtlas(entries, points).index);
    assert.ok(facts.length >= 4000, facts.length + ' faits au lieu de ville sûr');
    const pool = H.buildHistoryPool(facts, cities);
    assert.ok(pool.length >= 1500, pool.length + ' faits');
    assert.ok(new Set(pool.map(p => p.city.id)).size >= 300, 'au moins 300 villes');
    pool.forEach(p => assert.equal(H.titleNames(p.fact.title, [p.city.n, H.mainName(p.fact.label)]), false, p.fact.title));
    for (const seed of [1, 2, 3]) {
        const game = H.generateHistoryGame(pool, { count: 10, rng: seeded(seed) });
        assert.equal(game.length, 10);
        assert.equal(new Set(game.map(q => q.target)).size, 10);
        game.forEach(q => assert.equal(H.isValid(q, cities), true, q.title));
        assert.ok(game.filter(q => H.PERSON_TITLE.test(q.title)).length <= H.MAX_PEOPLE, 'au plus ' + H.MAX_PEOPLE + ' naissances ou décès');
    }
});

test('naissances et décès : « Naissance de Wang Yangming » compte, pas un événement qui naît', () => {
    assert.equal(H.PERSON_TITLE.test('Naissance de Wang Yangming'), true);
    assert.equal(H.PERSON_TITLE.test("Naissance d'Albrecht Dürer"), true);
    assert.equal(H.PERSON_TITLE.test('Décès de Mao'), true);
    assert.equal(H.PERSON_TITLE.test('Naissance du théâtre kabuki'), false, 'un événement');
    assert.equal(H.PERSON_TITLE.test('Naissance de la République'), false);
    assert.equal(H.PERSON_TITLE.test("Naissance de l'Empire ottoman"), false);
    assert.equal(H.PERSON_TITLE.test("Naissance d'un nouvel État"), false);
    assert.equal(H.PERSON_TITLE.test("Assassinat de Murtala Mohammed"), false);
    assert.equal(H.PERSON_TITLE.test('Coup d’État contre Mohamed Bazoum'), false);
});

test('périodes : une partie ne tire que des faits de la période demandée', () => {
    assert.equal(H.inPeriod(-300, 'antiquity'), true);
    assert.equal(H.inPeriod(499, 'antiquity'), true);
    assert.equal(H.inPeriod(500, 'antiquity'), false);
    assert.equal(H.inPeriod(1491, 'middle'), true);
    assert.equal(H.inPeriod(1492, 'middle'), false);
    assert.equal(H.inPeriod(1789, 'contemporary'), true);
    assert.equal(H.inPeriod(1788, 'contemporary'), false);
    assert.equal(H.inPeriod(1900, 'all'), true);
    // Trois faits à Rome, un par période : le tirage « Moyen Âge » ne garde que celui de 800.
    const rome = cities.find(c => c.n === 'Rome');
    const facts = [
        { id: 'p:1', title: 'Sac de Rome par les Wisigoths', year: 410, lat: rome.lat, lon: rome.lon, label: 'Rome' },
        { id: 'p:2', title: 'Couronnement de Charlemagne', year: 800, lat: rome.lat, lon: rome.lon, label: 'Rome' },
        { id: 'p:3', title: 'Proclamation de la République romaine', year: 1849, lat: rome.lat, lon: rome.lon, label: 'Rome' }
    ];
    const pool = H.buildHistoryPool(facts, cities);
    const game = H.generateHistoryGame(pool, { count: 10, rng: seeded(9), period: 'middle' });
    assert.equal(game.length, 1);
    assert.equal(game[0].year, 800);
    assert.equal(H.generateHistoryGame(pool, { count: 10, rng: seeded(9), period: 'contemporary' })[0].year, 1849);
});
