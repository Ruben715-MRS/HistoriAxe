// Les liens « Vu aussi dans… » entre thèmes (js/linkedEvents.js).
//
// Deux familles de tests, comme pour la simultanéité : une base miniature où
// chaque règle est mise en défaut isolément, et le VRAI pack français, parce
// que la règle (même lien Wikipédia ET même année) a été déduite de ses
// données et qu'une régression de contenu n'y serait sinon visible nulle part.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const L = require('../js/linkedEvents.js');

function entry(themeId, evt, extra) {
    return Object.assign({ event: evt, theme: { id: themeId, nom: 'Thème ' + themeId }, category: {} }, extra);
}
function ev(id, titre, date, wikipedia) {
    return { id, titre, date, wikipedia, description: '' };
}

test('même lien et même année dans deux thèmes : les fiches se renvoient l\'une à l\'autre', () => {
    const a = ev('a1', 'Invasion des Malouines', 1982, 'https://fr.wikipedia.org/wiki/Guerre_des_Malouines');
    const b = ev('b1', 'L\'hélicoptère aux Malouines', 1982, 'https://fr.wikipedia.org/wiki/Guerre_des_Malouines');
    const idx = L.buildLinkIndex([entry('t1', a), entry('t2', b)]);
    assert.deepEqual(idx.linksFor(a).map(m => m.event), [b]);
    assert.deepEqual(idx.linksFor(b).map(m => m.event), [a]);
});

test('même lien mais autre année : ce n\'est pas le même fait (Gagarine, naissance et vol)', () => {
    const url = 'https://fr.wikipedia.org/wiki/Youri_Gagarine';
    const vol = ev('g1', 'Premier homme dans l\'espace', 1961, url);
    const naissance = ev('g2', 'Naissance de Gagarine', 1934, url);
    const idx = L.buildLinkIndex([entry('t1', vol), entry('t2', naissance)]);
    assert.deepEqual(idx.linksFor(vol), []);
    assert.deepEqual(idx.linksFor(naissance), []);
});

test('le même fait dans le même thème ne se relie pas à lui-même', () => {
    const url = 'https://fr.wikipedia.org/wiki/X';
    const a = ev('a', 'X', 1900, url);
    const b = ev('b', 'X bis', 1900, url);
    const idx = L.buildLinkIndex([entry('t1', a), entry('t1', b)]);
    assert.deepEqual(idx.linksFor(a), []);
    assert.equal(idx.size, 0);
});

test('une entrée par thème lié, et jamais le thème de la fiche', () => {
    const url = 'https://fr.wikipedia.org/wiki/Y';
    const own = ev('o', 'Y', 1950, url);
    const twin = ev('o2', 'Y encore', 1950, url);
    const other = ev('p', 'Y vu d\'ailleurs', 1950, url);
    const idx = L.buildLinkIndex([entry('t1', own), entry('t1', twin), entry('t2', other), entry('t2', ev('p2', 'Y 2', 1950, url))]);
    const links = idx.linksFor(own);
    assert.equal(links.length, 1);
    assert.equal(links[0].theme.id, 't2');
    assert.equal(links[0].event, other);
});

test('les identifiants ne sont pas uniques entre thèmes : le lien se fait sur l\'objet, pas sur l\'id', () => {
    const url = 'https://fr.wikipedia.org/wiki/Z';
    const a = ev('arc_10', 'Z', 1800, url);
    const b = ev('arc_10', 'Z autrement', 1800, url);
    const idx = L.buildLinkIndex([entry('t1', a), entry('t2', b)]);
    assert.deepEqual(idx.linksFor(a).map(m => m.event), [b]);
    assert.deepEqual(idx.linksFor(b).map(m => m.event), [a]);
});

test('un lien encodé et son équivalent décodé désignent la même page', () => {
    const a = ev('a', 'Leonov', 1965, 'https://fr.wikipedia.org/wiki/Alexe%C3%AF_Leonov');
    const b = ev('b', 'Leonov', 1965, 'https://fr.wikipedia.org/wiki/Alexeï_Leonov');
    const idx = L.buildLinkIndex([entry('t1', a), entry('t2', b)]);
    assert.equal(idx.linksFor(a).length, 1);
});

test('catégorie personnelle, événement sans lien ou sans année, événement inconnu : aucun lien', () => {
    const url = 'https://fr.wikipedia.org/wiki/W';
    const a = ev('a', 'W', 1900, url);
    const perso = ev('c', 'W perso', 1900, url);
    const idx = L.buildLinkIndex([
        entry('t1', a),
        entry('custom', perso, { category: { isCustomCategory: true } }),
        entry('t3', ev('n', 'sans lien', 1900, undefined)),
        entry('t4', ev('d', 'sans année', undefined, url))
    ]);
    assert.deepEqual(idx.linksFor(a), []);
    assert.deepEqual(idx.linksFor(ev('z', 'hors base', 1900, url)), []);
    assert.deepEqual(idx.linksFor(null), []);
});

// --- Le vrai pack français -------------------------------------------------

function realEntries() {
    const fr = require(path.join('..', 'data', 'fr.json'));
    const out = [];
    (function walk(node, cat) {
        if (node.subcategories) node.subcategories.forEach(s => walk(s, cat));
        else if (node.themes) node.themes.forEach(theme => (theme.events || []).forEach(event => out.push({ event, theme, category: cat })));
    })({ subcategories: fr.categories }, {});
    return out;
}

test('pack français : les carrefours sont nombreux, symétriques, et jamais dans le même thème', () => {
    const entries = realEntries();
    const idx = L.buildLinkIndex(entries);
    let linked = 0;
    entries.forEach(e => {
        const links = idx.linksFor(e.event);
        if (links.length === 0) return;
        linked++;
        const themes = links.map(m => m.theme.id);
        assert.equal(new Set(themes).size, themes.length, `${e.event.id}: un thème lié apparaît deux fois`);
        assert.ok(!themes.includes(e.theme.id), `${e.event.id}: lié à son propre thème`);
        links.forEach(m => assert.equal(L.factKey(m.event), L.factKey(e.event), `${e.event.id}: lien vers un autre fait`));
        // Symétrie : le thème d'arrivée renvoie vers celui de départ.
        assert.ok(idx.linksFor(links[0].event).some(m => m.theme.id === e.theme.id), `${e.event.id}: lien à sens unique`);
    });
    // 1 599 relevés à l'écriture ; ce seuil laisse la base évoluer sans qu'un
    // effondrement (règle cassée, champ renommé) passe inaperçu.
    assert.ok(linked > 1400, `seulement ${linked} événements reliés`);
});

test('pack français : pas deux événements de même titre, année et axe dans un thème', () => {
    const seen = new Map();
    realEntries().forEach(e => {
        const key = [e.theme.id, e.event.date, (e.event.titre || '').trim(), e.event.axe || ''].join('|');
        assert.ok(!seen.has(key), `doublon exact dans ${e.theme.id}: « ${e.event.titre} » (${e.event.id} et ${seen.get(key)})`);
        seen.set(key, e.event.id);
    });
});
