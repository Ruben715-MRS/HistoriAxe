// Quelle est cette ville ? (js/cityPhotoCore.js) : une photo, quatre villes, la bonne une seule fois, des noms distincts.
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../js/cityPhotoCore.js');

const cities = require('../assets/geo/cities.json').cities;
const facts = require('../assets/geo/countries-facts.json').countries;
const photos = require('../assets/geo/city-photos.json').photos;
const contOf = new Map(facts.map(f => [f.iso2, f.cont]));
const continent = cc => contOf.get(cc);

function seeded(seed) {
    let s = seed;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; };
}

test('chaque photo donne une question valable : quatre villes, la bonne une fois, des noms distincts', () => {
    const qs = P.photoQuestions(photos, cities, { rng: seeded(1), difficulty: 'hard', continent });
    assert.equal(qs.length, photos.length, 'une question par photo de la zone');
    qs.forEach(q => {
        assert.equal(q.form, 'photo');
        assert.equal(P.isValid(q, cities), true, q.target);
        assert.ok(q.photo.src && q.photo.auteur && q.photo.licence && q.photo.source, 'les crédits suivent la photo');
    });
});

test('des villes distinctes d’une partie à l’autre, et le mode « hard » reste dans la région quand la région a assez de villes', () => {
    const qs = P.photoQuestions(photos, cities, { rng: seeded(7), difficulty: 'hard', continent });
    const targets = new Set(qs.map(q => q.target));
    assert.equal(targets.size, qs.length);
    qs.forEach(q => {
        const cont = continent(cities.find(c => c.id === q.target).cc);
        const sameRegion = q.options.filter(o => continent(cities.find(c => c.id === o.id).cc) === cont).length;
        assert.ok(sameRegion >= 1, 'la bonne réponse est dans sa région');
    });
});

test('une zone sans la ville d’une photo n’en pose pas la question ; la partie peut être vide', () => {
    assert.deepEqual(P.photoQuestions(photos, [], { rng: seeded(2) }), []);
    const one = cities.filter(c => c.id === photos[0].city);
    assert.deepEqual(P.photoQuestions(photos, one, { rng: seeded(2) }), [], 'il faut trois autres villes pour les propositions');
});
