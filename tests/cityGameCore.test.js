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

test('ville → pays : seulement pour un nom unique dans la liste', () => {
    const tokyo = cities.filter(c => c.n === 'Tokyo');
    assert.equal(tokyo.length, 1);
    const q = C.countryQuestion(cities, countries, tokyo[0], { rng: seeded(3) });
    assert.ok(q);
    assert.equal(q.options.find(o => o.id === q.target).value, 'Japon');
    assert.equal(C.isValid(q, cities), true);
});

test('parties : chaque forme donne des questions valables, sur des cibles différentes', () => {
    C.FORMS.forEach(form => {
        const g = C.generateCityGame(cities, facts, form, { count: 10, rng: seeded(5), difficulty: 'hard' });
        assert.equal(g.length, 10, form);
        assert.equal(new Set(g.map(q => q.target)).size, 10, form + ' : cibles uniques');
        g.forEach(q => assert.equal(C.isValid(q, cities), true, form + ' ' + q.target));
    });
});
