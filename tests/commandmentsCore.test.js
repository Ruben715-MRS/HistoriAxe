// Commandements bibliques (js/commandmentsCore.js) : les effectifs de la tradition, et un texte pour chaque élément dans ui/fr.json.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../js/commandmentsCore.js');

const fr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ui', 'fr.json'), 'utf8'));
const text = key => fr.tools[key.replace(/^tools\./, '')];

test('les listes sont dans l\'ordre : lois de Noé, dix commandements, travaux du Chabbat', () => {
    assert.deepEqual(C.SETS.map(s => s.id), ['noah', 'decalogue', 'shabbat']);
});

test('effectifs de la tradition : 7 lois de Noé, 10 commandements, 39 travaux (11 + 13 + 9 + 6)', () => {
    assert.equal(C.itemsOf('noah').length, 7);
    assert.equal(C.itemsOf('decalogue').length, 10);
    assert.equal(C.itemsOf('shabbat').length, 39);
    assert.deepEqual(C.getSet('shabbat').groups.map(g => g.items.length), [11, 13, 9, 6]);
    assert.deepEqual(C.getSet('decalogue').groups.map(g => g.items.length), [5, 5]);
    C.SETS.forEach(s => assert.equal(C.itemsOf(s.id).length, s.count, s.id));
});

test('les éléments sont numérotés de 1 à N sans trou ni doublon', () => {
    C.SETS.forEach(s => {
        const items = C.itemsOf(s.id);
        assert.deepEqual(items.map(i => i.n), items.map((_, i) => i + 1), s.id);
        assert.equal(new Set(items.map(i => i.id)).size, items.length, 'identifiants uniques : ' + s.id);
    });
});

test('chaque élément a son nom, son explication et sa source dans ui/fr.json (la source est facultative pour les travaux du Chabbat)', () => {
    C.SETS.forEach(s => {
        C.itemsOf(s.id).forEach(item => {
            C.fieldsOf(s.id).forEach(field => {
                const value = text(C.itemKey(s.id, item.id, field));
                assert.equal(typeof value, 'string', `${s.id}/${item.id}/${field} manque`);
                if (field !== 'ref' || s.id !== 'shabbat') assert.ok(value.trim().length > 0, `${s.id}/${item.id}/${field} est vide`);
            });
        });
    });
});

test('les sources des lois de Noé et des dix commandements sont toutes renseignées', () => {
    ['noah', 'decalogue'].forEach(id => C.itemsOf(id).forEach(item => assert.ok(text(C.itemKey(id, item.id, 'ref')), `${id}/${item.id}`)));
});

test('chaque liste a son titre, son chapeau et ses « à savoir » ; chaque groupe affiché a son titre', () => {
    C.SETS.forEach(s => {
        ['title', 'subtitle', 'lead', 'know_1'].forEach(f => assert.ok(text('cmd_' + s.id + '_' + f), `${s.id} : ${f}`));
        assert.ok(text('commandments_tab_' + s.id), 'onglet ' + s.id);
        if (s.groups.length > 1) s.groups.forEach(g => assert.ok(text('cmd_' + s.id + '_group_' + g.id), `${s.id} : groupe ${g.id}`));
    });
});

test('on passe d\'une liste à la suivante, et il n\'y a rien avant la première ni après la dernière', () => {
    assert.equal(C.neighbor('noah', 1).id, 'decalogue');
    assert.equal(C.neighbor('decalogue', 1).id, 'shabbat');
    assert.equal(C.neighbor('shabbat', -1).id, 'decalogue');
    assert.equal(C.neighbor('noah', -1), null);
    assert.equal(C.neighbor('shabbat', 1), null);
});

test('les travaux du Chabbat suivent l\'ordre de la Michna : le premier est « semer », le dernier « transporter »', () => {
    assert.equal(text('cmd_shabbat_m01_name'), 'Semer');
    assert.equal(text('cmd_shabbat_m11_name'), 'Cuire');
    assert.equal(text('cmd_shabbat_m37_name'), 'Allumer');
    assert.equal(text('cmd_shabbat_m39_name'), 'Transporter');
});
