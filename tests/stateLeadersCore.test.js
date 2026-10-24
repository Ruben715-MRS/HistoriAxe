const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/stateLeadersCore.js');

const rows = S.rowsOf('france');

test('chefs d’État : la France part de Clovis et finit à Emmanuel Macron, en fonction', () => {
    assert.strictEqual(rows[0].row.name, 'Clovis Ier');
    assert.strictEqual(rows[0].row.from, 481);
    const last = rows[rows.length - 1].row;
    assert.strictEqual(last.name, 'Emmanuel Macron');
    assert.strictEqual(last.to, null);
});

test('chefs d’État : dates cohérentes, dans l’ordre du début du règne', () => {
    rows.forEach((it, i) => {
        const r = it.row;
        if (r.to !== null) assert.ok(r.to >= r.from, r.name + ' : fin avant début');
        if (i > 0) assert.ok(r.from >= rows[i - 1].row.from, r.name + ' : hors ordre chronologique');
    });
});

test('chefs d’État : chaque ligne a un nom, une fonction et un groupe connu', () => {
    rows.forEach(it => {
        const r = it.row;
        assert.ok(r.name && r.title, 'champ manquant');
        assert.ok(S.GROUPS[r.group], r.name + ' : groupe inconnu');
    });
});

test('chefs d’État : un trait s’affiche à chaque changement de régime ou de dynastie, et seulement là', () => {
    const dividers = rows.filter(it => it.divider);
    assert.strictEqual(dividers[0].divider, S.GROUPS.carolingiens.label);
    const changes = rows.filter((it, i) => i > 0 && it.row.group !== rows[i - 1].row.group).length;
    assert.strictEqual(dividers.length, changes);
    assert.strictEqual(rows[0].divider, null);
});

test('chefs d’État : la recherche ignore les accents et les apostrophes, et cherche aussi la fonction', () => {
    assert.strictEqual(S.search(rows, 'petain').length, 1);
    assert.strictEqual(S.search(rows, 'Pétain')[0].row.name, 'Philippe Pétain');
    assert.strictEqual(S.search(rows, 'd’outremer')[0].row.name, 'Louis IV d’Outremer');
    assert.strictEqual(S.search(rows, 'premier consul')[0].row.name, 'Napoléon Bonaparte');
    assert.strictEqual(S.search(rows, '').length, rows.length);
    assert.strictEqual(S.search(rows, 'zzzz').length, 0);
});
