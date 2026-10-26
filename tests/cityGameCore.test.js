// Villes du monde (js/cityGameCore.js) : pièges de la capitale et de la plus grande ville, unicité, validité.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/cityGameCore.js');

const cities = require('../assets/geo/cities.json').cities;
const facts = require('../assets/geo/countries-facts.json').countries;
const countries = C.countryIndex(facts);
function seeded(seed) {
    let s = seed;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; };
}

test('données : chaque ville a un pays de l’Atlas, un nom et des coordonnées ; pas de doublon dans un pays', () => {
    const iso = new Set(facts.map(c => c.iso2));
    const keys = new Set();
    cities.forEach(c => {
        assert.ok(iso.has(c.cc), c.n + ' : pays inconnu');
        assert.ok(c.n && !/^Q\d+$/.test(c.n), c.n + ' : nom absent');
        assert.ok(Number.isFinite(c.lon) && Number.isFinite(c.lat), c.n);
        assert.ok(!keys.has(c.cc + '|' + c.n), c.n + ' : doublon');
        keys.add(c.cc + '|' + c.n);
    });
    assert.ok(cities.some(c => c.n === 'Canberra' && c.cap), 'Canberra est une capitale, même petite');
});

test('capitale : le piège est la plus grande ville du pays, quand ce n’est pas la capitale', () => {
    const q = C.capitalQuestion(cities, countries, 'AU', { rng: seeded(1), difficulty: 'hard' });
    assert.ok(q);
    const values = q.options.map(o => o.value);
    assert.ok(values.includes('Canberra') && values.includes('Sydney'));
    assert.equal(q.options.find(o => o.id === q.target).value, 'Canberra');
    assert.equal(C.isValid(q, cities), true);
});

test('plus grande ville : posée seulement si elle devance nettement la suivante ; le piège est la capitale', () => {
    const q = C.largestQuestion(cities, countries, 'TR', { rng: seeded(2), difficulty: 'hard' });
    assert.ok(q, 'la Turquie a une plus grande ville nette');
    assert.equal(q.options.find(o => o.id === q.target).value, 'Istanbul');
    assert.ok(q.options.map(o => o.value).includes('Ankara'), 'la capitale est le piège');
    assert.equal(C.isValid(q, cities), true);
    // L'Australie : Sydney et Melbourne sont trop proches pour qu'on pose la question.
    assert.equal(C.largestQuestion(cities, countries, 'AU', { rng: seeded(2) }), null);
});

test('plus au nord : une ville la plus extrême, nettement devant la suivante ; la question du sud la prend dans l’autre sens', () => {
    const north = C.latitudeQuestion(cities, countries, { rng: seeded(3) });
    assert.ok(north);
    assert.equal(north.ask === 'north' || north.ask === 'south', true);
    assert.equal(C.isValid(north, cities), true);
    // Le sens est tiré au sort : on en prend un de chaque en plusieurs essais, chacun valable.
    const asks = new Set();
    for (let s = 0; s < 40; s++) {
        const q = C.latitudeQuestion(cities, countries, { rng: seeded(100 + s), difficulty: 'hard' });
        if (!q) continue;
        asks.add(q.ask);
        assert.equal(C.isValid(q, cities), true, 'seed ' + s);
        const lat = id => cities.find(c => c.id === id).lat;
        const values = q.options.map(o => lat(o.id));
        const extreme = q.ask === 'north' ? Math.max(...values) : Math.min(...values);
        assert.equal(lat(q.target), extreme, 'la bonne réponse est la plus extrême');
    }
    assert.deepEqual([...asks].sort(), ['north', 'south']);
});

test('bonus de vitesse : le barème du Quiz des pays, proportionnel à la justesse ; sans chrono, rien', () => {
    assert.equal(C.withSpeed(100, 100, null, 0), 100, 'sans chrono');
    assert.equal(C.withSpeed(100, 100, 1, 3), 200, 'sur place, en 3 secondes : 100 de bonus');
    assert.equal(C.withSpeed(100, 100, 0, 3), 100, 'temps écoulé de justesse : pas de bonus');
    assert.equal(C.withSpeed(100, 100, 1, 15), 120, 'en 15 secondes : 20 de bonus');
    assert.equal(C.withSpeed(0, 100, 1, 3), 0, 'une erreur ne rapporte rien');
    assert.equal(C.withSpeed(37, 100, 1, 3), 37 + 37, 'un point loin de la ville prend une part du bonus');
});

test('parties : chaque forme donne des questions valables, sur des cibles différentes', () => {
    C.FORMS.forEach(form => {
        const g = C.generateCityGame(cities, facts, form, { count: 10, rng: seeded(5), difficulty: 'hard' });
        assert.equal(g.length, 10, form);
        if (form !== 'order') assert.equal(new Set(g.map(q => q.target)).size, 10, form + ' : cibles uniques');
        g.forEach(q => assert.equal(C.isValid(q, cities), true, form + ' ' + q.target));
    });
});

test('toucher la ville : 100 points sur place, moins avec la distance (échelle du monde, tolérance de 10 km)', () => {
    assert.equal(C.touchPoints(0), 100);
    assert.equal(C.touchPoints(10), 100);
    assert.equal(C.touchPoints(1310), 37, 'à environ 1 300 km, on garde 37 %');
    assert.ok(C.touchPoints(50) > C.touchPoints(300) && C.touchPoints(300) > C.touchPoints(3000));
    assert.equal(C.touchPoints(20000), 0);
});

test('toucher la ville : une question par ville, sans options, la ville à trouver est dans les données', () => {
    const g = C.generateCityGame(cities, facts, 'touch', { count: 10, rng: seeded(21), difficulty: 'hard' });
    assert.equal(g.length, 10);
    assert.equal(new Set(g.map(q => q.target)).size, 10);
    g.forEach(q => { assert.deepEqual(q.options, []); assert.equal(C.isValid(q, cities), true); });
});

test('classer : quatre villes de pays différents, d’au moins 100 000 habitants, nettement séparées', () => {
    const g = C.generateCityGame(cities, facts, 'order', { count: 10, rng: seeded(22), difficulty: 'hard' });
    assert.equal(g.length, 10);
    g.forEach(q => {
        assert.equal(q.ids.length, C.ORDER_SIZE);
        const picked = q.ids.map(id => cities.find(c => c.id === id));
        assert.equal(new Set(picked.map(c => c.cc)).size, C.ORDER_SIZE, 'pays différents');
        picked.forEach(c => assert.ok(c.pop >= 100000, c.n));
        for (let i = 1; i < picked.length; i++) assert.ok(picked[i - 1].pop >= picked[i].pop * C.MIN_RATIO, 'écart suffisant');
        assert.equal(C.isValid(q, cities), true);
    });
});

test('classer : 25 points par ville à sa place', () => {
    assert.equal(C.orderPoints(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd']), 100);
    assert.equal(C.orderPoints(['a', 'c', 'b', 'd'], ['a', 'b', 'c', 'd']), 50);
    assert.equal(C.orderPoints(['d', 'c', 'b', 'a'], ['a', 'b', 'c', 'd']), 0);
});

test('données : aucun nom administratif (ville de, métropole de, préfecture, district…), ni les libellés corrigés à la main', () => {
    const admin = /^(Ville de |ville de |Ville-préfecture de |préfecture de |Municipalité de |Métropole de |Zone métropolitaine |Région métropolitaine |Région urbaine |Nouveau district |district de |Grand )| Métropole$/;
    cities.forEach(c => assert.equal(admin.test(c.n), false, c.n));
    ['Bujumbura-Mairie', 'Dublin City', 'Juárezville', 'Buffalo City'].forEach(n => assert.equal(cities.some(c => c.n === n), false, n));
    const keys = cities.map(c => c.cc + '|' + c.n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
    assert.equal(new Set(keys).size, keys.length, 'un seul nom par pays, accents mis à part');
});
