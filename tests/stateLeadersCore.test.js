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

test('chefs d’État : aux États-Unis, la couleur suit le parti (bleu démocrate, rouge républicain, jaune sinon)', () => {
    const us = S.rowsOf('etats_unis');
    us.forEach(it => {
        const want = { democrate: '#bfdbfe', republicain: '#fecaca', autre: '#fef08a', aucun: '#fef08a' }[it.row.party];
        assert.ok(want, it.row.name + ' : parti inconnu');
        assert.strictEqual(it.color, want, it.row.name);
    });
    assert.strictEqual(us.find(it => it.row.name === 'Abraham Lincoln').color, '#fecaca');
    assert.strictEqual(us.find(it => it.row.name === 'Joe Biden').color, '#bfdbfe');
    assert.strictEqual(us.find(it => it.row.name === 'George Washington').color, '#fef08a');
    assert.strictEqual(us.filter(it => it.divider).length, 1, 'un seul groupe : pas de barre intermédiaire');
});

test('chefs d’État : les régimes parlementaires ont aussi la liste des chefs du gouvernement, dates cohérentes', () => {
    ['royaume_uni', 'israel', 'canada', 'australie'].forEach(k => {
        assert.ok(S.hasGovernment(k), k);
        const items = S.rowsOf(k, 'gouvernement');
        assert.strictEqual(items[items.length - 1].row.to, null, k + ' : pas de chef du gouvernement en fonction');
        items.forEach((it, i) => {
            const r = it.row;
            if (r.to !== null) assert.ok(r.to >= r.from, k + ' / ' + r.name);
            if (i > 0) assert.ok(r.from >= items[i - 1].row.from, k + ' / ' + r.name + ' : hors ordre');
        });
    });
    assert.strictEqual(S.rowsOf('royaume_uni', 'gouvernement')[0].row.name, 'Robert Walpole');
    assert.ok(S.hasGovernment('france'), 'la France a le mode « Premier ministre »');
    // Par défaut, on obtient les chefs d’État.
    assert.strictEqual(S.rowsOf('royaume_uni')[0].row.name, 'Jacques Ier (Jacques VI d’Écosse)');
    assert.ok(S.noteOf('royaume_uni', 'gouvernement').startsWith('Premiers ministres'));
});

test('chefs d’État : les vice-présidents des États-Unis, dates cohérentes et couleurs selon le parti', () => {
    const items = S.rowsOf('etats_unis', 'vice');
    assert.ok(S.hasVice('etats_unis'));
    assert.strictEqual(items[items.length - 1].row.name, 'JD Vance');
    assert.strictEqual(items[items.length - 1].row.to, null);
    items.forEach((it, i) => {
        const r = it.row;
        if (r.to !== null) assert.ok(r.to >= r.from, r.name);
        if (i > 0) assert.ok(r.from >= items[i - 1].row.from, r.name + ' : hors ordre');
        const want = { democrate: '#bfdbfe', republicain: '#fecaca', autre: '#fef08a' }[r.party];
        assert.strictEqual(it.color, want, r.name);
    });
    assert.strictEqual(items.find(it => it.row.name === 'Kamala Harris').color, '#bfdbfe');
    assert.strictEqual(items.find(it => it.row.name === 'Mike Pence').color, '#fecaca');
    assert.ok(!S.hasVice('france'));
});

test('premiers ministres français : chaque ligne donne le chef de l\'État en fonction, et le bouton dit « Premier ministre »', () => {
    const gov = S.COUNTRIES.france.gouvernement;
    assert.equal(S.govModeKey('france'), 'leaders_mode_pm');
    assert.equal(S.govModeKey('royaume_uni'), 'leaders_mode_gouv');
    const heads = new Set(S.COUNTRIES.france.rows.map(r => r[2]));
    assert.ok(gov.rows.length > 100, 'de la IIIe République à aujourd\'hui');
    for (const r of gov.rows) {
        assert.ok(r[6], `${r[2]} : seconde ligne absente`);
        const m = r[6].match(/^Président de la République : (.+)$/);
        if (m) assert.ok(heads.has(m[1]), `${r[2]} : « ${m[1]} » n'est pas un chef de l'État de la liste`);
    }
});

test('premiers ministres français : la seconde ligne s\'affiche à la place de la fonction', () => {
    const rows = S.rowsOf('france', 'gouvernement').map(it => it.row);
    assert.equal(rows[0].sub, 'Président de la République : Jules Grévy');
    assert.equal(rows[0].name, 'William Waddington');
});
