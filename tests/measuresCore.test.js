// Poids et mesures bibliques (js/measuresCore.js) : les tableaux des livres servent de référence, le calcul doit les retrouver.

const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/measuresCore.js');

const size = (cat, id) => M.findUnit(cat, id).size;
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);

test('monnaies : chaque case du tableau « Vaut / Cette monnaie » se retrouve par le calcul, et les cases vides sont les rapports d\'au plus 1 (la case de la monnaie elle-même est vide)', () => {
    const { columns, rows } = M.MONEY_TABLE;
    rows.forEach(row => {
        row.cells.forEach((cell, i) => {
            const ratio = size('money', columns[i]) / size('money', row.id);
            if (cell === null) assert.ok(ratio <= 1, `${columns[i]} / ${row.id} devrait être vide (${ratio})`);
            else assert.equal(ratio, cell, `${columns[i]} en ${row.id}`);
        });
    });
});

test('monnaies : le chékel pèse 11,4 g d\'argent ; le talent du sanctuaire ≈ 34 kg, le talent ≈ 17 kg, la mine du sanctuaire ≈ 570 g', () => {
    const g = id => M.factor('money', id);
    close(g('shekel'), 11.4);
    close(g('maah'), 0.57);                  // la guéra
    close(g('beka'), 5.7);                   // le demi-chékel
    close(g('mane_sacre'), 570);             // 50 chékels
    close(g('mane'), 285);                   // 25 chékels
    close(g('talent'), 17100);               // 1 500 chékels
    close(g('talent_sacre'), 34200);         // 3 000 chékels
    close(g('proutah'), 11.4 / 640);
});

test('monnaies : convertir un talent en kilos, et des kilos en talents', () => {
    const talent = M.convert('money', 1, 'talent_sacre').find(r => r.id === 'kg');
    close(talent.value, 34.2);
    assert.equal(talent.approx, true);
    const retour = M.convert('money', 34.2, 'kg').find(r => r.id === 'talent_sacre');
    close(retour.value, 1);
    // Entre deux monnaies bibliques, le rapport est exact.
    const chekels = M.convert('money', 1, 'talent').find(r => r.id === 'shekel');
    assert.equal(chekels.value, 1500);
    assert.equal(chekels.approx, false);
});

test('volumes : les relations du livre (en œufs, log, kav, omer, séa) se retrouvent par le calcul', () => {
    M.VOLUME_TABLE.forEach(row => {
        row.rels.forEach(([unit, n]) => close(size('volumes', row.id) / size('volumes', unit), n, 1e-9));
    });
});

test('volumes : les valeurs modernes — épha 22 L, omer 2,2 L, séa ≈ 7,3 L, kav ≈ 1,2 L, hin ≈ 3,6 à 4 L, log ≈ 0,3 à 0,35 L, homer 220 L', () => {
    const L = id => M.factor('volumes', id);
    close(L('epha'), 22);
    close(L('bath'), 22);
    close(L('omer'), 2.2);
    close(L('homer'), 220);
    close(L('lethech'), 110);
    assert.ok(Math.abs(L('sea') - 7.3) < 0.05);
    assert.ok(Math.abs(L('kav') - 1.2) < 0.05);
    assert.ok(L('hin') >= 3.6 && L('hin') <= 4);
    assert.ok(L('log') >= 0.3 && L('log') <= 0.35);
    // Le log vaut 6 œufs de ≈ 51 mL.
    assert.ok(Math.abs(L('betsa') - 0.0509) < 0.0005);
});

test('volumes : l\'épha et le bath sont la même capacité, le homer et le cor aussi ; le hin vaut 12 log', () => {
    assert.equal(size('volumes', 'epha'), size('volumes', 'bath'));
    assert.equal(size('volumes', 'hin'), 12 * size('volumes', 'log'));
    assert.equal(size('volumes', 'homer'), 10 * size('volumes', 'epha'));
    assert.equal(size('volumes', 'lethech'), 5 * size('volumes', 'epha'));
    // Le mnémotechnique : épha = 3 séa, séa = 6 kav, kav = 4 log, log = 6 œufs.
    assert.equal(size('volumes', 'epha') / size('volumes', 'sea'), 3);
    assert.equal(size('volumes', 'sea') / size('volumes', 'kav'), 6);
    assert.equal(size('volumes', 'kav') / size('volumes', 'log'), 4);
    assert.equal(size('volumes', 'log') / size('volumes', 'betsa'), 6);
});

test('distances : la chaîne doigt, palme, empan, coudée, mil, parsa, journée de marche', () => {
    M.DISTANCE_CHAIN.forEach(link => assert.equal(size('distances', link.id) / size('distances', link.per), link.n, link.id));
    assert.equal(size('distances', 'amah'), 2 * size('distances', 'zeret'), 'une coudée = 2 empans');
});

test('distances : deux opinions — coudée de 48 cm (Rav Naé) ou de 57,6 cm (\'Hazon Ich), et tout le reste suit', () => {
    const m = (id, op) => M.factor('distances', id, op);
    close(m('amah', 'nae'), 0.48);
    close(m('amah', 'hazon'), 0.576);
    close(m('etzba', 'nae'), 0.02);
    close(m('etzba', 'hazon'), 0.024);
    close(m('tefach', 'nae'), 0.08);
    close(m('mil', 'nae'), 960);
    close(m('mil', 'hazon'), 1152);
    close(m('parsa', 'nae'), 3840);
    close(m('parsa', 'hazon'), 4608);
    close(m('yom', 'nae'), 38400);
    close(m('yom', 'hazon'), 46080);
    // Sans opinion précisée : Rav Naé.
    close(m('amah'), 0.48);
});

test('distances : le temps de marche — un mil en 18 minutes, une parsa en 72 minutes', () => {
    close(M.walkMinutes(M.factor('distances', 'mil', 'nae'), 'nae'), 18);
    close(M.walkMinutes(M.factor('distances', 'parsa', 'nae'), 'nae'), 72);
    close(M.walkMinutes(M.factor('distances', 'parsa', 'hazon'), 'hazon'), 72, 1e-9);
    // Un kilomètre, à l'opinion courte : un peu plus d'un mil.
    assert.ok(M.walkMinutes(1000, 'nae') > 18 && M.walkMinutes(1000, 'nae') < 20);
});

test('convert : tolère une saisie invalide, marque les lignes approchées, garde l\'unité d\'origine', () => {
    assert.equal(M.convert('volumes', 'abc', 'epha'), null);
    assert.equal(M.convert('volumes', 1, 'inconnue'), null);
    const rows = M.convert('volumes', 1, 'epha');
    assert.equal(rows.length, M.unitsOf('volumes').length);
    assert.equal(rows.find(r => r.id === 'epha').isSource, true);
    assert.equal(rows.find(r => r.id === 'l').value, 22);
    assert.equal(rows.find(r => r.id === 'l').approx, true);
    assert.equal(rows.find(r => r.id === 'sea').value, 3);
    assert.equal(rows.find(r => r.id === 'sea').approx, false);
    // Des litres vers les éphas.
    close(M.convert('volumes', 44, 'l').find(r => r.id === 'epha').value, 2);
});

test('formatNumber et formatDuration : lisibles', () => {
    assert.equal(M.formatNumber(0, 'fr'), '0');
    assert.equal(M.formatNumber(1500, 'en'), '1,500');
    assert.equal(M.formatNumber(0.01781253, 'en'), '0.01781');
    assert.equal(M.formatNumber(34.2, 'en'), '34.2');
    assert.equal(M.formatNumber(NaN), '—');
    assert.equal(M.formatDuration(18), '18 min');
    assert.equal(M.formatDuration(72), '1 h 12');
    assert.equal(M.formatDuration(120), '2 h');
    assert.equal(M.formatDuration(125), '2 h 05');
    assert.equal(M.formatDuration(0.2), '< 1 min');
});
