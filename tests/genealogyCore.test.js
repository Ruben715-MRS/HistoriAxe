const test = require('node:test');
const assert = require('node:assert');
const G = require('../js/genealogyCore.js');

test('généalogie : identifiants uniques, parents et conjointes existants', () => {
    const ids = G.PEOPLE.map(p => p.id);
    assert.strictEqual(new Set(ids).size, ids.length);
    G.PEOPLE.forEach(p => {
        if (p.father) assert.ok(G.byId(p.father), p.id + ' : père inconnu');
        if (p.mother) assert.ok(G.byId(p.mother), p.id + ' : mère inconnue');
        p.unions.forEach(u => assert.ok(G.byId(u[0]), p.id + ' : conjointe inconnue'));
    });
});

test('généalogie : les soixante-dix nations de Genèse 10, numérotées de 1 à 70 sans trou', () => {
    const nums = G.PEOPLE.filter(p => p.nation).map(p => p.nation).sort((a, b) => a - b);
    assert.deepStrictEqual(nums, Array.from({ length: 70 }, (_, i) => i + 1));
});

test('généalogie : un seul arbre, et chaque nom a une forme hébraïque', () => {
    const L = G.layout({}, () => 40);
    G.PEOPLE.forEach(p => {
        assert.ok(p.he && /[א-ת]/.test(p.he), p.id);
        assert.ok(p.sex === 'm' || p.sex === 'f');
        if (!L.nodes[p.id]) assert.ok(!p.father && G.PEOPLE.some(q => q.unions.some(u => u[0] === p.id)), p.id + ' hors arbre');
    });
    assert.deepStrictEqual(G.ancestorsOf('moise').slice(-1), ['adam']);
});

test('généalogie : de Noé à Moïse, la chaîne attendue', () => {
    assert.ok(G.ancestorsOf('moise').includes('noe'));
    assert.ok(G.ancestorsOf('moise').includes('abraham'));
    assert.deepStrictEqual(G.childrenOf('noe').slice(0, 3), ['sem', 'cham', 'japhet']);
});

test('généalogie : la mise en page ne fait jamais se chevaucher deux cartes d\'une même colonne', () => {
    const L = G.layout({}, () => 40, { gap: 10 });
    const byDepth = {};
    Object.keys(L.nodes).forEach(id => { (byDepth[L.nodes[id].depth] = byDepth[L.nodes[id].depth] || []).push(L.nodes[id]); });
    Object.keys(byDepth).forEach(d => {
        const col = byDepth[d].sort((a, b) => a.top - b.top);
        for (let i = 1; i < col.length; i++) assert.ok(col[i].top >= col[i - 1].top + col[i - 1].h - 0.001);
    });
});

test('généalogie : replier une personne cache ses descendants', () => {
    const all = Object.keys(G.layout({}, () => 40).nodes).length;
    const folded = G.layout({ noe: true }, () => 40);
    assert.ok(!folded.nodes.sem);
    assert.strictEqual(Object.keys(folded.nodes).length, all - G.descendantsCount('noe'));
});

test('généalogie : la recherche trouve en français (sans accent) et en hébreu', () => {
    assert.strictEqual(G.search('esau')[0].id, 'esau');
    assert.strictEqual(G.search('אברהם')[0].id, 'abraham');
    assert.deepStrictEqual(G.search('zzzz'), []);
});
