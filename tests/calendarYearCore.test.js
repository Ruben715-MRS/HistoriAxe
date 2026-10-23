// Le calendrier annuel (js/calendarYearCore.js) : 366 jours, les fêtes nationales et les fêtes chrétiennes à date fixe.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const K = require('../js/calendarYearCore.js');

const root = path.join(__dirname, '..');
const facts = JSON.parse(fs.readFileSync(path.join(root, 'assets/geo/countries-facts.json'), 'utf8')).countries;
const days = K.yearDays(facts);
const at = (m, d) => days.find(x => x.month === m && x.day === d);

test('un calendrier civil : 366 jours, dans l\'ordre, le 29 février compris', () => {
    assert.equal(days.length, 366);
    assert.equal(days[0].month, 1); assert.equal(days[0].day, 1);
    assert.equal(days[365].month, 12); assert.equal(days[365].day, 31);
    assert.ok(at(2, 29), '29 février');
    assert.equal(new Set(days.map(x => x.month + '-' + x.day)).size, 366);
});

test('la fête nationale d\'un pays tombe le jour indiqué, avec son nom ; une date sans fête est vide', () => {
    const france = at(7, 14);
    assert.deepEqual(france.countries.map(c => c.n), ['France']);
    assert.equal(france.countries[0].iso2, 'FR');
    assert.deepEqual(france.religious, []);
    // plusieurs fêtes le même jour : triées par nom
    const oct = at(10, 1).countries.map(c => c.n);
    assert.ok(oct.length > 2 && oct.includes('Chine'));
    assert.deepEqual(oct, oct.slice().sort((a, b) => a.localeCompare(b, 'fr')));
    assert.deepEqual(at(3, 3).countries.map(c => c.n), ['Bulgarie']);
});

test('les fêtes chrétiennes à date fixe, et aucune fête mobile (Pâques, Ascension, Pentecôte, mardi gras)', () => {
    assert.deepEqual(at(12, 25).religious, ['Noël']);
    assert.deepEqual(at(1, 6).religious, ['Épiphanie']);
    assert.deepEqual(at(8, 15).religious, ['Assomption']);
    assert.deepEqual(at(11, 1).religious, ['Toussaint']);
    assert.deepEqual(at(12, 8).religious, ['Immaculée Conception']);
    const labels = days.flatMap(x => x.religious).join(' | ');
    ['Pâques', 'Ascension', 'Pentecôte', 'mardi gras', 'Mardi'].forEach(mot => assert.ok(!labels.includes(mot), mot));
    assert.equal(days.filter(x => x.religious.length).length, K.RELIGIOUS.length);
});

test('libellés : « 1er janvier », « 14 juillet », et les noms de mois', () => {
    assert.equal(K.dateLabel(1, 1), '1er janvier');
    assert.equal(K.dateLabel(7, 14), '14 juillet');
    assert.equal(K.monthName(2), 'février');
    assert.equal(K.MONTHS.length, 12);
});

test('la liste des fêtes religieuses : chaque date existe dans l\'année', () => {
    K.RELIGIOUS.forEach(r => assert.ok(at(r.m, r.d), r.label));
});

test('Pâques : le calcul grégorien, sur des années connues et aux bornes de la plage possible', () => {
    assert.deepEqual(K.easterSunday(2026), { month: 4, day: 5 });
    assert.deepEqual(K.easterSunday(2025), { month: 4, day: 20 });
    assert.deepEqual(K.easterSunday(2000), { month: 4, day: 23 });
    assert.deepEqual(K.easterSunday(2024), { month: 3, day: 31 });
    assert.deepEqual(K.easterSunday(2038), { month: 4, day: 25 });   // le plus tard possible
    assert.deepEqual(K.easterSunday(2285), { month: 3, day: 22 });   // le plus tôt possible
});

test('fêtes mobiles d\'une année : décalages par rapport à Pâques (2026 : Pâques le 5 avril)', () => {
    const f = K.mobileFeasts(2026);
    const at2026 = label => { const x = f.find(y => y.label === label); return [x.day, x.month]; };
    assert.deepEqual(at2026('Pâques'), [5, 4]);
    assert.deepEqual(at2026('Mardi gras'), [17, 2]);
    assert.deepEqual(at2026('Mercredi des Cendres'), [18, 2]);
    assert.deepEqual(at2026('Ascension'), [14, 5]);
    assert.deepEqual(at2026('Pentecôte'), [24, 5]);
    assert.deepEqual(at2026('Fête-Dieu'), [4, 6]);
});

test('avec une année, le calendrier porte les fêtes mobiles datées ; sans année, il reste intemporel', () => {
    const avec = K.yearDays(facts, 2026);
    assert.equal(avec.length, 366);
    const paques = avec.find(x => x.month === 4 && x.day === 5);
    assert.ok(paques.religious.includes('Pâques (2026)'));
    assert.ok(avec.find(x => x.month === 5 && x.day === 14).religious.includes('Ascension (2026)'));
    // sans année : aucune fête mobile, le calendrier ne dépend pas d'une année
    const sans = K.yearDays(facts);
    assert.ok(!sans.flatMap(x => x.religious).some(l => /Pâques|Ascension|Pentecôte|Mardi gras|Fête-Dieu/.test(l)));
    // les fêtes fixes restent présentes dans les deux cas
    assert.deepEqual(avec.find(x => x.month === 12 && x.day === 25).religious, ['Noël']);
});
