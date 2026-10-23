// L'atlas des pays (js/countriesCore.js) et ses données (assets/geo/countries*.json).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../js/countriesCore.js');

const root = path.join(__dirname, '..');
const geo = JSON.parse(fs.readFileSync(path.join(root, 'assets/geo/countries.json'), 'utf8'));
const facts = JSON.parse(fs.readFileSync(path.join(root, 'assets/geo/countries-facts.json'), 'utf8'));
const byId = new Map(facts.countries.map(c => [c.id, c]));
const featureOf = id => geo.features.find(f => f.properties.id === id);

test('drapeaux : deux lettres donnent un emoji', () => {
    assert.equal(C.flagEmoji('FR'), '🇫🇷');
    assert.equal(C.flagEmoji('jp'), '🇯🇵');
    assert.equal(C.flagEmoji('XK'), '🇽🇰');
    assert.equal(C.flagEmoji(''), '');
    assert.equal(C.flagEmoji('FRA'), '');
    assert.equal(C.flagEmoji(null), '');
});

test('population : lisible en français', () => {
    assert.equal(C.formatPopulation(68400000), '68,4 millions');
    assert.equal(C.formatPopulation(1409000000), '1,41 milliard');
    assert.equal(C.formatPopulation(10300000), '10,3 millions');
    assert.equal(C.formatPopulation(5150000), '5,15 millions');
    assert.equal(C.formatPopulation(212000000), '212 millions');
    assert.equal(C.formatPopulation(1000000), '1 million');
    assert.equal(C.formatPopulation(56000), '56 000');
    assert.equal(C.formatPopulation(800), '800');
    assert.equal(C.formatPopulation(0), '');
    assert.equal(C.formatPopulation(null), '');
});

test('recherche : sans accent ni majuscule, par nom ou capitale', () => {
    const names = q => C.searchCountries(facts.countries, q).map(c => c.id);
    assert.equal(names('allemagne')[0], 'DEU');
    assert.equal(names('egypte')[0], 'EGY');
    assert.equal(names('ÉGYPTE')[0], 'EGY');
    assert.equal(names('tokyo')[0], 'JPN');
    assert.equal(names('cote')[0], 'CIV');
    assert.ok(names('rep').includes('COD') || names('rep').includes('CAF'));
    assert.deepEqual(names(''), []);
    assert.deepEqual(names('zzzz'), []);
    assert.equal(names('f').length <= 8, true);
});

test('géométrie : un point dans un pays, et pas dans son voisin', () => {
    const paris = [2.35, 48.85], berlin = [13.4, 52.52], lyon = [4.83, 45.76];
    const fr = C.prepare(featureOf('FRA').geometry);
    assert.equal(C.contains(fr, ...paris), true);
    assert.equal(C.contains(fr, ...lyon), true);
    assert.equal(C.contains(fr, ...berlin), false);
    const de = C.prepare(featureOf('DEU').geometry);
    assert.equal(C.contains(de, ...berlin), true);
    assert.equal(C.contains(de, ...paris), false);
    // l'océan n'est à personne
    assert.equal(C.contains(fr, -30, 30), false);
    // un pays d'outre-mer : la Guyane est dans le contour de la France
    assert.equal(C.contains(fr, -53.1, 3.9), true);
});

test('géométrie : villes connues dans le bon pays', () => {
    const where = (lon, lat) => facts.countries.filter(c => C.contains(C.prepare(featureOf(c.id).geometry), lon, lat)).map(c => c.id);
    assert.deepEqual(where(-0.1278, 51.5074), ['GBR']);      // Londres
    assert.deepEqual(where(12.4964, 41.9028), ['ITA']);      // Rome (le Vatican est trop petit pour la précision du contour)
    assert.deepEqual(where(139.69, 35.69), ['JPN']);
    assert.deepEqual(where(-77.04, 38.9), ['USA']);   // Washington (le contour est simplifié : une ville côtière peut tomber à l'eau)
    assert.deepEqual(where(31.23, 30.04), ['EGY']);          // Le Caire
});

test('géométrie : un port simplifié reste rattaché à son pays', () => {
    const it = C.prepare(featureOf('ITA').geometry);
    // Naples et Gênes, sur la côte : le contour simplifié peut les laisser à l'eau, la tolérance les rattache à l'Italie.
    assert.equal(C.containsNear(it, 14.27, 40.84), true);
    assert.equal(C.containsNear(it, 8.93, 44.41), true);
    assert.equal(C.containsNear(it, -30, 30), false);
});

test('les pays minuscules ont un point, les grands non', () => {
    assert.equal(C.isTiny(C.prepare(featureOf('MCO').geometry)), true);
    assert.equal(C.isTiny(C.prepare(featureOf('MLT').geometry)), true);
    assert.equal(C.isTiny(C.prepare(featureOf('FRA').geometry)), false);
    assert.equal(C.isTiny(C.prepare(featureOf('RUS').geometry)), false);
});

test('données : chaque fiche a sa géométrie, son nom et son drapeau', () => {
    assert.equal(facts.countries.length, geo.features.length);
    const ids = new Set();
    facts.countries.forEach(c => {
        assert.ok(!ids.has(c.id), 'doublon ' + c.id); ids.add(c.id);
        assert.ok(featureOf(c.id), 'pas de contour pour ' + c.id);
        assert.ok(c.n && c.n.length > 1, 'nom ' + c.id);
        assert.match(c.iso2, /^[A-Z]{2}$/, 'iso2 ' + c.id);
        assert.ok(C.flagEmoji(c.iso2), 'drapeau ' + c.id);
        assert.ok(c.cont, 'continent ' + c.id);
        assert.ok(c.cap && c.lang && c.cur, 'capitale, langues, monnaie ' + c.id);
        assert.ok(Array.isArray(c.c) && c.c.length === 2, 'point de nom ' + c.id);
        assert.ok(c.c[0] >= -180 && c.c[0] <= 180 && c.c[1] >= -90 && c.c[1] <= 90);
        if (c.pop) { assert.ok(c.pop > 0 && c.pop < 2e9); assert.equal(c.year, facts.popYear); }
        if (c.st === 'territoire') assert.ok(c.sov, 'État de rattachement ' + c.id);
    });
});

test('données : couverture — les 193 États membres de l\'ONU sont tous là', () => {
    const states = facts.countries.filter(c => !c.st || c.st === 'contesté');
    // 193 États membres + Vatican (observateur) + Palestine, Kosovo, Taïwan, Sahara occidental (statut contesté, notés comme tels)
    const un = facts.countries.filter(c => !c.st);
    assert.equal(un.length, 194, 'États sans statut particulier (193 membres de l\'ONU + Vatican) : ' + un.length);
    ['FRA', 'DEU', 'USA', 'CHN', 'IND', 'BRA', 'NGA', 'EGY', 'JPN', 'RUS', 'ZAF', 'AUS', 'CAN', 'MEX', 'ARG', 'TUR', 'ITA', 'ESP', 'GBR', 'VAT', 'MCO'].forEach(id => {
        assert.ok(byId.has(id), 'manque ' + id);
    });
    ['TWN', 'KOS', 'PSX', 'SAH'].forEach(id => assert.equal(byId.get(id).st, 'contesté'));
    states.forEach(c => assert.ok(c.pop, 'population ' + c.id));
});

test('données : quelques valeurs de repère', () => {
    assert.equal(byId.get('FRA').cap, 'Paris');
    assert.equal(byId.get('JPN').cap, 'Tokyo');
    assert.match(byId.get('ZAF').cap, /Pretoria/);
    assert.match(byId.get('BOL').cap, /Sucre/);
    assert.match(byId.get('CHE').lang, /romanche/);
    assert.equal(byId.get('USA').cur, 'dollar américain (USD)');
    assert.ok(byId.get('IND').pop > byId.get('USA').pop);
    assert.ok(byId.get('CHN').pop > 1.3e9 && byId.get('IND').pop > 1.3e9);
    assert.ok(byId.get('VAT').pop < 2000);
    assert.equal(byId.get('GRL').sov, 'Danemark');
    assert.ok(byId.get('TWN').note.includes('disputé'));
});

test('données : les populations sont du bon ordre de grandeur', () => {
    // somme mondiale : environ 8,1 milliards en 2024
    const total = facts.countries.reduce((s, c) => s + (c.pop || 0), 0);
    assert.ok(total > 7.8e9 && total < 8.4e9, 'total ' + total);
});

test('données : poids raisonnable', () => {
    assert.ok(fs.statSync(path.join(root, 'assets/geo/countries.json')).size < 900 * 1024);
    assert.ok(fs.statSync(path.join(root, 'assets/geo/countries-facts.json')).size < 120 * 1024);
});

test('fiche : les lignes affichées', () => {
    const rows = C.factRows(byId.get('FRA'));
    assert.deepEqual(rows.map(r => r.key), ['capital', 'languages', 'currency', 'population', 'continent']);
    assert.equal(rows[3].value, '68,4 millions d\'habitants');
    assert.equal(rows[3].year, 2024);
    // l'Antarctique n'a ni capitale, ni langue, ni population
    assert.deepEqual(C.factRows(byId.get('ATA')).map(r => r.key), ['continent']);
});

test('régions : le Zimbabwe, la Zambie, le Malawi, le Mozambique et l\'Angola sont en Afrique australe ; l\'Iran est en Asie de l\'Ouest', () => {
    const sub = name => facts.countries.find(c => c.n === name).sub;
    ['Zimbabwe', 'Zambie', 'Malawi', 'Mozambique', 'Afrique du Sud', 'Namibie', 'Angola'].forEach(n => assert.equal(sub(n), 'Afrique australe', n));
    assert.equal(sub('Tanzanie'), "Afrique de l'Est");
    assert.equal(sub('Iran'), "Asie de l'Ouest");
    assert.equal(sub('Afghanistan'), 'Asie du Sud');
});
