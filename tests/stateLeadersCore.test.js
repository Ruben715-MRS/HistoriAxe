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

test('chefs d’État : il y a une vingtaine de pays en plus de la France, et la liste des pays est triée', () => {
    const list = S.countryList();
    assert.ok(list.length >= 21, 'au moins 21 pays');
    assert.ok(list.some(c => c.key === 'france'));
    const names = list.map(c => c.name);
    assert.deepStrictEqual(names, names.slice().sort((a, b) => a.localeCompare(b, 'fr')));
});

test('chefs d’État : pour chaque pays, dates cohérentes, dans l’ordre du début du règne', () => {
    S.countryList().forEach(c => {
        const items = S.rowsOf(c.key);
        assert.ok(items.length > 0, c.name + ' : liste vide');
        items.forEach((it, i) => {
            const r = it.row;
            if (r.to !== null) assert.ok(r.to >= r.from, c.name + ' / ' + r.name + ' : fin avant début');
            if (i > 0) assert.ok(r.from >= items[i - 1].row.from, c.name + ' / ' + r.name + ' : hors ordre chronologique');
        });
    });
});

test('chefs d’État : pour chaque pays, la dernière ligne est en fonction et chaque ligne a un nom, une fonction et un groupe connu', () => {
    S.countryList().forEach(c => {
        const items = S.rowsOf(c.key);
        assert.strictEqual(items[items.length - 1].row.to, null, c.name + ' : pas de chef en fonction');
        items.forEach(it => {
            const r = it.row;
            assert.ok(r.name && r.title, c.name + ' : champ manquant');
            assert.ok(S.COUNTRIES[c.key].groups[r.group], c.name + ' / ' + r.name + ' : groupe inconnu');
            assert.ok(it.color, c.name + ' : couleur manquante');
        });
        assert.ok(S.noteOf(c.key).endsWith('Liste indicative.'), c.name + ' : note sans mention « liste indicative »');
    });
});

test('chefs d’État : une barre de dynastie ou de régime s’affiche au début et à chaque changement, et seulement là', () => {
    S.countryList().forEach(c => {
        const items = S.rowsOf(c.key);
        const changes = items.filter((it, i) => i > 0 && it.row.group !== items[i - 1].row.group).length;
        assert.strictEqual(items.filter(it => it.divider).length, changes + 1, c.name);
        assert.strictEqual(items[0].divider, S.COUNTRIES[c.key].groups[items[0].row.group].label, c.name);
    });
    assert.strictEqual(S.rowsOf('france')[0].divider, S.COUNTRIES.france.groups.merovingiens.label);
});

test('chefs d’État : la recherche ignore les accents et les apostrophes, et cherche aussi la fonction', () => {
    assert.strictEqual(S.search(rows, 'petain').length, 1);
    assert.strictEqual(S.search(rows, 'Pétain')[0].row.name, 'Philippe Pétain');
    assert.strictEqual(S.search(rows, 'd’outremer')[0].row.name, 'Louis IV d’Outremer');
    assert.strictEqual(S.search(rows, 'premier consul')[0].row.name, 'Napoléon Bonaparte');
    assert.strictEqual(S.search(rows, '').length, rows.length);
    assert.strictEqual(S.search(rows, 'zzzz').length, 0);
});
