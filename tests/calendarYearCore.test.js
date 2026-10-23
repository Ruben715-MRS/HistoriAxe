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
    assert.deepEqual(at(12, 25).religious, ['\u271D\uFE0F Noël']);
    assert.deepEqual(at(1, 6).religious, ['\u271D\uFE0F Épiphanie']);
    assert.deepEqual(at(8, 15).religious, ['\u271D\uFE0F Assomption']);
    assert.deepEqual(at(11, 1).religious, ['\u271D\uFE0F Toussaint']);
    assert.deepEqual(at(12, 8).religious, ['\u271D\uFE0F Immaculée Conception']);
    const labels = days.flatMap(x => x.religious).join(' | ');
    ['Pâques', 'Ascension', 'Pentecôte', 'mardi gras', 'Mardi'].forEach(mot => assert.ok(!labels.includes(mot), mot));
    assert.equal(days.filter(x => x.religious.length).length, K.RELIGIOUS.length);
    // chaque fête chrétienne porte la croix
    days.forEach(x => x.religious.forEach(l => assert.ok(l.startsWith('\u271D\uFE0F ') || l.startsWith('\u2721\uFE0F ') || l.startsWith('\u{1F54E} '), l)));
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
    assert.ok(paques.religious.includes('\u271D\uFE0F Pâques (2026)'));
    assert.ok(avec.find(x => x.month === 5 && x.day === 14).religious.includes('\u271D\uFE0F Ascension (2026)'));
    // sans année : aucune fête mobile, le calendrier ne dépend pas d'une année
    const sans = K.yearDays(facts);
    assert.ok(!sans.flatMap(x => x.religious).some(l => /Pâques|Ascension|Pentecôte|Mardi gras|Fête-Dieu/.test(l)));
    // les fêtes fixes restent présentes dans les deux cas
    assert.deepEqual(avec.find(x => x.month === 12 && x.day === 25).religious, ['\u271D\uFE0F Noël']);
});

test('les saints patrons des nations du Royaume-Uni : à leur date, avec leur drapeau emoji quand il existe', () => {
    const nations = (m, d) => days.find(x => x.month === m && x.day === d).countries;
    const eng = nations(4, 23).find(c => c.n === 'Angleterre');
    assert.equal(eng.flag, '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}');
    assert.equal(nations(11, 30).find(c => c.n === 'Écosse').flag, '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}');
    assert.equal(nations(3, 1).find(c => c.n === 'Pays de Galles').flag, '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}');
    // l'Irlande du Nord n'a pas d'emoji : son nom seul
    const nir = nations(3, 17).find(c => c.n === 'Irlande du Nord');
    assert.equal(nir.flag, '');
    assert.equal(nir.iso2, null);
});

test('le Royaume-Uni : pas de fête nationale commune, mais la note donne les quatre journées', () => {
    const gb = facts.find(c => c.iso2 === 'GB');
    assert.equal(gb.fete, null);
    ['23 avril', '30 novembre', '1er mars', '17 mars'].forEach(j => assert.ok(gb.note.includes(j), j));
});

test('fêtes juives : le calendrier hébraïque, à la date grégorienne de l\'année (contrôles sur des années connues)', () => {
    const at = (year, label) => K.jewishFeasts(year).find(f => f.label === label);
    const date = f => [f.day, f.month];
    // 2025 : Roch Hachana 23 sept, Yom Kippour 2 oct, Souccot 7 oct, Hanouka 15 déc, Pourim 14 mars, Pessa'h 13 avril,
    // Chavouot 2 juin, Tisha B'Av 3 août
    assert.deepEqual(date(at(2025, 'Roch Hachana')), [23, 9]);
    assert.deepEqual(date(at(2025, 'Yom Kippour')), [2, 10]);
    assert.deepEqual(date(at(2025, 'Souccot')), [7, 10]);
    assert.deepEqual(date(at(2025, 'Hanouka')), [15, 12]);
    assert.deepEqual(date(at(2025, 'Pourim')), [14, 3]);
    assert.deepEqual(date(at(2025, 'Pessa\u2019h')), [13, 4]);
    assert.deepEqual(date(at(2025, 'Chavouot')), [2, 6]);
    assert.deepEqual(date(at(2025, 'Tisha B\u2019Av')), [3, 8]);
    // Pourim en année à deux Adar (5784 : 2024), le 24 mars
    assert.deepEqual(date(at(2024, 'Pourim')), [24, 3]);
    assert.deepEqual(date(at(2024, 'Pessa\u2019h')), [23, 4]);
    // 2026 : Pessa'h le 2 avril
    assert.deepEqual(date(at(2026, 'Pessa\u2019h')), [2, 4]);
    // chaque année donne les huit fêtes, toutes dans l'année grégorienne
    for (let y = 1900; y < 2100; y += 7) assert.equal(K.jewishFeasts(y).length, 8, String(y));
});

test('les fêtes juives portent l\'étoile de David, sauf Hanouka qui a la ménorah', () => {
    const days2025 = K.yearDays(facts, 2025);
    const pourim = days2025.find(x => x.month === 3 && x.day === 14).religious.join(' | ');
    assert.ok(pourim.includes('\u2721\uFE0F Pourim (2025)'), pourim);
    assert.ok(days2025.find(x => x.month === 12 && x.day === 15).religious.includes('\u{1F54E} Hanouka (2025)'));
    assert.ok(days2025.find(x => x.month === 9 && x.day === 23).religious.includes('\u2721\uFE0F Roch Hachana (2025)'));
});

test('sans année, aucune fête juive ni mobile : le calendrier reste intemporel', () => {
    const sans = K.yearDays(facts);
    const labels = sans.flatMap(x => x.religious).join(' | ');
    ['Pourim', 'Hanouka', 'Roch Hachana', 'Pessa', 'Pâques'].forEach(mot => assert.ok(!labels.includes(mot), mot));
});

test('Yom Haatzmaut, fête nationale d\'Israël : le 5 iyar de l\'année, à partir de 1949, avec le drapeau', () => {
    assert.deepEqual([K.israelIndependenceDay(2026).day, K.israelIndependenceDay(2026).month], [22, 4]);
    // 5 iyar 2025 : samedi 3 mai (la célébration officielle avait été avancée au jeudi 1er mai)
    assert.deepEqual([K.israelIndependenceDay(2025).day, K.israelIndependenceDay(2025).month], [3, 5]);
    assert.equal(K.israelIndependenceDay(1948), null);
    const d2026 = K.yearDays(facts, 2026).find(x => x.month === 4 && x.day === 22);
    const il = d2026.countries.find(c => c.iso2 === 'IL');
    assert.equal(il.n, 'Israël');
    assert.equal(il.year, 2026);
    // timeless : pas d'Israël sans année
    assert.ok(!K.yearDays(facts).some(x => x.countries.some(c => c.iso2 === 'IL')));
});
