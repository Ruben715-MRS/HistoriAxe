// La boîte à outils (js/toolsCore.js) : conversions et calculs, sans DOM.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../js/toolsCore.js');

test('toRoman : valeurs connues et bornes', () => {
    assert.equal(T.toRoman(1), 'I');
    assert.equal(T.toRoman(4), 'IV');
    assert.equal(T.toRoman(9), 'IX');
    assert.equal(T.toRoman(14), 'XIV');
    assert.equal(T.toRoman(1994), 'MCMXCIV');
    assert.equal(T.toRoman(2026), 'MMXXVI');
    assert.equal(T.toRoman(3999), 'MMMCMXCIX');
    assert.equal(T.toRoman(0), null);
    assert.equal(T.toRoman(4000), null);
    assert.equal(T.toRoman(-5), null);
    assert.equal(T.toRoman(2.5), null);
});

test('toRoman / fromRoman : aller-retour sur tout l\'intervalle', () => {
    for (let n = 1; n <= 3999; n++) {
        const r = T.fromRoman(T.toRoman(n));
        assert.equal(r.ok, true, 'n=' + n);
        assert.equal(r.value, n);
    }
});

test('fromRoman : refuse les écritures non usuelles et donne la bonne forme', () => {
    assert.deepEqual(T.fromRoman('iv'), { ok: true, value: 4, roman: 'IV' });
    const iiii = T.fromRoman('IIII');
    assert.equal(iiii.ok, false); assert.equal(iiii.reason, 'form'); assert.equal(iiii.canonical, 'IV');
    assert.equal(T.fromRoman('VX').ok, false);
    assert.equal(T.fromRoman('IC').ok, false);
    assert.equal(T.fromRoman('MMMM').ok, false);
    assert.equal(T.fromRoman('ABC').reason, 'letters');
    assert.equal(T.fromRoman('  ').reason, 'empty');
    assert.equal(T.fromRoman('X I').value, 11);
});

test('romanBreakdown : 1994 = M + CM + XC + IV', () => {
    assert.deepEqual(T.romanBreakdown(1994).map(p => p.symbol), ['M', 'CM', 'XC', 'IV']);
    assert.equal(T.romanBreakdown(1994).reduce((s, p) => s + p.value, 0), 1994);
    assert.deepEqual(T.romanBreakdown(0), []);
});

test('parseRomanInput : nombre, romain, erreurs', () => {
    assert.equal(T.parseRomanInput('').kind, 'empty');
    assert.deepEqual(T.parseRomanInput('1994'), { kind: 'number', value: 1994, roman: 'MCMXCIV' });
    assert.deepEqual(T.parseRomanInput('mcmxciv'), { kind: 'roman', value: 1994, roman: 'MCMXCIV' });
    assert.equal(T.parseRomanInput('0').reason, 'zero');
    assert.equal(T.parseRomanInput('4000').reason, 'range');
    assert.equal(T.parseRomanInput('12,5').reason, 'decimal');
    assert.equal(T.parseRomanInput('hello').reason, 'letters');
    const bad = T.parseRomanInput('IIII');
    assert.equal(bad.kind, 'error'); assert.equal(bad.canonical, 'IV');
});

test('les lettres de la leçon couvrent les sept lettres romaines', () => {
    assert.deepEqual(T.ROMAN_LETTERS.map(l => l.letter).join(''), 'IVXLCDM');
    assert.deepEqual(T.ROMAN_LETTERS.map(l => l.value), [1, 5, 10, 50, 100, 500, 1000]);
});

test('siècle d\'une année : les années rondes sont les dernières du siècle', () => {
    assert.equal(T.centuryOfYear(1789).name, 'XVIIIe siècle');
    assert.equal(T.centuryOfYear(1700).name, 'XVIIe siècle');
    assert.equal(T.centuryOfYear(1701).name, 'XVIIIe siècle');
    assert.equal(T.centuryOfYear(2000).name, 'XXe siècle');
    assert.equal(T.centuryOfYear(100).name, 'Ier siècle');
    assert.equal(T.centuryOfYear(1).name, 'Ier siècle');
    assert.equal(T.centuryOfYear(-44).name, 'Ier siècle av. J.-C.');
    assert.equal(T.centuryOfYear(-100).name, 'Ier siècle av. J.-C.');
    assert.equal(T.centuryOfYear(-101).name, 'IIe siècle av. J.-C.');
    assert.equal(T.centuryOfYear(-100).span, '100 à 1 av. J.-C.');
    assert.match(T.centuryExplain(1700), /DERNIÈRE/);
    assert.match(T.centuryExplain(-200), /OUVRE/);
});

test('années d\'un siècle', () => {
    assert.deepEqual(T.centuryYears(18, false), { first: 1701, last: 1800, name: 'XVIIIe siècle', span: '1701 à 1800' });
    assert.deepEqual(T.centuryYears(5, true).first, -500);
    assert.equal(T.centuryYears(5, true).last, -401);
    assert.equal(T.centuryYears(5, true).span, '500 à 401 av. J.-C.');
    assert.equal(T.centuryYears(0, false), null);
    assert.equal(T.centuryYears(100, false), null);
    // cohérence : toute année d'un siècle redonne ce siècle
    [[20, false], [3, true], [1, true], [1, false]].forEach(([n, bc]) => {
        const c = T.centuryYears(n, bc);
        for (const y of [c.first, c.last]) assert.equal(T.centuryOfYear(y).n, n);
    });
});

test('durées : pas d\'an 0', () => {
    assert.equal(T.yearsBetween(-44, 14).years, 57);
    assert.equal(T.yearsBetween(-1, 1).years, 1);
    assert.equal(T.yearsBetween(1, -1).years, 1);
    assert.equal(T.yearsBetween(-44, 14).crossesBc, true);
    assert.equal(T.yearsBetween(1789, 1799).years, 10);
    assert.equal(T.yearsBetween(1789, 1789).years, 0);
    assert.equal(T.yearsBetween(-753, 476).years, 1228);
    assert.equal(T.yearsBetween(1900, 1800).earlier, 1800);
    assert.equal(T.yearsBetween(0, 5), null);
});

test('année + durée : traverse l\'an 1 av. J.-C. → an 1', () => {
    assert.equal(T.addYears(-44, 57), 14);
    assert.equal(T.addYears(14, -57), -44);
    assert.equal(T.addYears(-1, 1), 1);
    assert.equal(T.addYears(1, -1), -1);
    assert.equal(T.addYears(1789, 10), 1799);
    assert.equal(T.addYears(9999, 1), null);
    assert.equal(T.addYears(1789, 1.5), null);
    for (const [y, n] of [[-44, 100], [50, -120], [-300, 299], [1, -1]]) {
        assert.equal(T.addYears(T.addYears(y, n), -n), y);
        assert.equal(T.yearsBetween(y, T.addYears(y, n)).years, Math.abs(n));
    }
});

test('signedYear', () => {
    assert.equal(T.signedYear(44, true), -44);
    assert.equal(T.signedYear(44, false), 44);
    assert.equal(T.signedYear(0, false), null);
    assert.equal(T.signedYear(10000, false), null);
    assert.equal(T.yearText(-44), '44 av. J.-C.');
});

function era(rows, id) { return rows.find(r => r.id === id); }

test('ères : 2026 et 1789', () => {
    const r = T.convertYear(2026);
    assert.equal(era(r, 'juive').text, '5786 ou 5787');
    assert.equal(era(r, 'bouddhique').text, '2569');
    assert.equal(era(r, 'reiwa').text, '8');
    assert.equal(era(r, 'heisei').available, false);
    assert.equal(era(r, 'rome').text, '2779');
    assert.equal(era(r, 'persane').text, '1404 ou 1405');
    assert.equal(era(r, 'republicaine').available, false);
    assert.match(era(r, 'hegire').text, /^vers 14(4\d|5\d) \(à un an près\)$/);
    const f = T.convertYear(1789);
    assert.equal(era(f, 'republicaine').available, false);
    assert.equal(era(f, 'hegire').values[0], 1203);
    assert.equal(era(f, 'juive').text, '5549 ou 5550');
});

test('ères : république, Japon et changements d\'ère', () => {
    assert.equal(era(T.convertYear(1794), 'republicaine').text, '2 ou 3');
    assert.equal(era(T.convertYear(1792), 'republicaine').text, '1');
    assert.equal(era(T.convertYear(1805), 'republicaine').text, '13 ou 14');
    assert.equal(era(T.convertYear(1806), 'republicaine').available, false);
    assert.equal(era(T.convertYear(1904), 'meiji').text, '37');
    const y1912 = T.convertYear(1912);
    assert.equal(era(y1912, 'meiji').text, '45');
    assert.equal(era(y1912, 'taisho').text, '1');
    assert.match(era(y1912, 'meiji').note, /changement d'ère/);
    assert.equal(era(T.convertYear(1989), 'showa').text, '64');
    assert.equal(era(T.convertYear(1989), 'heisei').text, '1');
    assert.equal(era(T.convertYear(1867), 'meiji').available, false);
});

test('ères : avant J.-C. et avant le début d\'une ère', () => {
    const c = T.convertYear(-44);
    assert.equal(era(c, 'rome').text, '710');
    assert.equal(era(c, 'hegire').available, false);
    assert.equal(era(c, 'persane').available, false);
    assert.equal(era(c, 'juive').text, '3716 ou 3717');
    assert.equal(era(T.convertYear(-753), 'rome').text, '1');
    assert.equal(era(T.convertYear(-754), 'rome').available, false);
    assert.equal(era(T.convertYear(622), 'persane').text, '1');
    assert.equal(T.convertYear(0), null);
    assert.equal(T.convertYear(5000), null);
    assert.equal(T.convertYear(1.5), null);
});

function row(rows, id) { return rows.find(r => r.id === id); }

test('dates : le jour julien est exact (Révolution d\'Octobre, Noël russe)', () => {
    // 7 novembre 1917 grégorien = 25 octobre 1917 julien
    assert.equal(row(T.convertDate(1917, 11, 7), 'julien').text, '25 octobre 1917');
    // 7 janvier 2026 grégorien = 25 décembre 2025 julien
    assert.equal(row(T.convertDate(2026, 1, 7), 'julien').text, '25 décembre 2025');
    assert.equal(row(T.convertDate(1700, 3, 1), 'julien').text, '19 février 1700');
    assert.deepEqual(T.jdnToJulian(T.gregorianToJdn(1582, 10, 15)), { day: 5, month: 10, year: 1582 });
});

test('dates : calendrier républicain', () => {
    assert.equal(row(T.convertDate(1794, 7, 27), 'republicain').text, '9 thermidor an II');
    assert.equal(row(T.convertDate(1799, 11, 9), 'republicain').text, '18 brumaire an VIII');
    assert.equal(row(T.convertDate(1792, 9, 22), 'republicain').text, '1er vendémiaire an I');
    // l'an I a cinq jours complémentaires ; l'an III, sextile, en a six
    assert.equal(row(T.convertDate(1793, 9, 21), 'republicain').text, 'le jour des Récompenses, an I');
    assert.equal(row(T.convertDate(1795, 9, 22), 'republicain').text, 'le jour de la Révolution, an III');
    assert.equal(row(T.convertDate(1805, 12, 31), 'republicain').text, '10 nivôse an XIV');
    assert.equal(row(T.convertDate(1789, 7, 14), 'republicain').available, false);
    assert.equal(row(T.convertDate(1806, 1, 1), 'republicain').available, false);
    assert.equal(row(T.convertDate(1793, 1, 21), 'republicain').text, '2 pluviôse an I');
});

test('dates : calendriers calculés par le navigateur', () => {
    const rows = T.convertDate(2026, 1, 1);
    assert.equal(row(rows, 'gregorien').text, '1er janvier 2026');
    assert.equal(row(rows, 'hebrew').text, '12 téveth 5786');
    assert.equal(row(rows, 'persian').text, '11 dey 1404');
    assert.match(row(rows, 'buddhist').text, /^1 janvier 2569$/);
    assert.match(row(rows, 'japanese').text, /1 janvier — ère Reiwa, an 8/);
    assert.match(row(rows, 'islamic-civil').text, /rajab 1447$/);
    assert.ok(rows.every(r => r.name && r.note));
});

test('dates : entrées invalides', () => {
    assert.equal(T.convertDate(2026, 2, 30), null);
    assert.equal(T.convertDate(2026, 13, 1), null);
    assert.equal(T.convertDate(1500, 1, 1), null);
    assert.equal(T.convertDate(2026, 2, 29), null);
    assert.ok(T.convertDate(2024, 2, 29));
});

test('périodes : bornes et doutes', () => {
    assert.equal(T.periodOfYear(-44).period.id, 'antiquite');
    assert.equal(T.periodOfYear(-5000).period.id, 'prehistoire');
    assert.equal(T.periodOfYear(476).period.id, 'moyenage');
    assert.equal(T.periodOfYear(475).period.id, 'antiquite');
    assert.equal(T.periodOfYear(1000).period.id, 'moyenage');
    assert.equal(T.periodOfYear(1492).period.id, 'modernes');
    assert.equal(T.periodOfYear(1789).period.id, 'xix');
    assert.equal(T.periodOfYear(1914).period.id, 'contemporain');
    assert.equal(T.periodOfYear(2026).period.id, 'contemporain');
    assert.ok(T.periodOfYear(476).doubt);
    assert.ok(T.periodOfYear(1453).doubt);
    assert.equal(T.periodOfYear(1000).doubt, null);
    assert.equal(T.periodOfYear(0), null);
    // les périodes se suivent sans trou
    for (let i = 1; i < T.PERIODS.length; i++) assert.equal(T.PERIODS[i].start, T.PERIODS[i - 1].end);
});
