// L'écusson d'équipe (js/teamBadge.js) : validation, déblocage des bordures, dessin. Pur, sans navigateur.
const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../js/teamBadge.js');

test('parse : un écusson valide, rien d\'autre', () => {
    assert.deepEqual(B.parse('3.5.2.1'), { bg: 3, pattern: 5, color: 2, border: 1 });
    for (const bad of ['', '3.5.2', '3.5.2.1.0', 'a.b.c.d', '12.0.0.0', '0.12.0.0', '0.0.12.0', '0.0.0.8', '-1.0.0.0', '1.5.2.1<script>', null, 12, undefined]) {
        assert.equal(B.parse(bad), null, String(bad));
    }
    assert.equal(B.normalize('nimporte quoi'), B.DEFAULT);
    assert.equal(B.normalize('4.1.0.2'), '4.1.0.2');
});

test('les bordures se débloquent avec les coffres ouverts', () => {
    assert.equal(B.unlockedBorders(0), 1);
    assert.equal(B.unlockedBorders(1), 2);
    assert.equal(B.unlockedBorders(5), 4);
    assert.equal(B.unlockedBorders(18), B.BORDERS.length);
    assert.equal(B.unlockedBorders(500), B.BORDERS.length);
    assert.equal(B.canUseBorder(0, 0), true);
    assert.equal(B.canUseBorder(3, 3), false);
    assert.equal(B.canUseBorder(3, 4), true);
    assert.equal(B.levelOf(0), 1);
    assert.equal(B.levelOf(7), 8);
    assert.equal(B.levelOf(1000), 99);
});

test('render : du SVG bien formé, un médaillon seulement avec un niveau, des identifiants uniques', () => {
    const a = B.render('0.2.1.0', { level: 3, uid: 'a', label: 'Écusson' });
    assert.match(a, /^<svg /);
    assert.match(a, /<\/svg>$/);
    assert.match(a, /<text[^>]*>3<\/text>/);
    assert.match(a, /id="tbga"/);
    assert.doesNotMatch(B.render('0.2.1.0', { uid: 'b' }), /<text/);
    assert.match(B.render('0.2.1.0', { uid: 'b' }), /aria-hidden="true"/);
    assert.equal(B.render('invalide', { uid: 'x' }), B.render(B.DEFAULT, { uid: 'x' }));
    // Chaque combinaison se dessine sans exception.
    for (let p = 0; p < B.PATTERNS_COUNT; p++) for (let d = 0; d < B.BORDERS.length; d++) assert.ok(B.render(`1.${p}.3.${d}`, { level: 12 }).length > 100);
});

test('render : un libellé ne peut pas injecter de balise', () => {
    assert.doesNotMatch(B.render('0.0.0.0', { label: '<img onerror=x>' }), /<img/);
});
