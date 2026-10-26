// Clio : le dessin (js/clioArt.js) — chaque humeur se dessine, le SVG est bien formé, les costumes dessinés existent.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../js/clioArt.js');
const ClioCore = require('../js/clioCore.js');
const RewardsCore = require('../js/rewardsCore.js');

// Vérifie que les balises s'ouvrent et se ferment dans l'ordre (le SVG sert tel quel en innerHTML et en image).
function assertWellFormed(svg) {
    const stack = [];
    for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
        const [, closing, name, , selfClosing] = m;
        if (selfClosing) continue;
        if (closing) assert.equal(stack.pop(), name, `balise </${name}> inattendue`);
        else stack.push(name);
    }
    assert.deepEqual(stack, [], 'balises non fermées');
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
}

test('chaque humeur du jeu a son dessin', () => {
    for (const mood of ClioCore.MOODS) assert.ok(A.MOODS.includes(mood), `${mood} n'est pas dessinée`);
});

test('chaque humeur donne un SVG bien formé, marqué de son humeur', () => {
    for (const mood of A.MOODS) {
        const svg = A.front(mood);
        assertWellFormed(svg);
        assert.ok(svg.includes('ca-m-' + mood));
    }
});

test('une humeur inconnue retombe sur le repos', () => {
    assert.ok(A.front('inconnue').includes('ca-m-repos'));
});

test('deux dessins n\'ont jamais les mêmes identifiants (clipPath)', () => {
    const ids = (svg) => [...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    const a = ids(A.front('repos')), b = ids(A.front('repos'));
    assert.ok(a.length > 0);
    assert.equal(a.filter((id) => b.includes(id)).length, 0);
});

test('les costumes dessinés correspondent à des costumes de la boutique, et s\'affichent', () => {
    const worlds = RewardsCore.costumes().map((c) => c.world);
    for (const world of Object.keys(A.COSTUMES)) {
        assert.ok(worlds.includes(world), `costume ${world} absent de la boutique`);
        assert.ok(A.hasCostume(world));
        assert.ok(A.front('repos', { costume: world }).length > A.front('repos').length, `costume ${world} invisible`);
        assertWellFormed(A.front('content', { costume: world }));
    }
    assert.equal(A.hasCostume('prehistoire'), false);
    assert.equal(A.hasCostume('toString'), false);
});

test('le vol : SVG bien formé, variante « choc » distincte', () => {
    const ok = A.fly(), hurt = A.fly({ hurt: true });
    assertWellFormed(ok);
    assertWellFormed(hurt);
    assert.ok(ok.includes('viewBox="0 0 ' + A.FLY.W + ' ' + A.FLY.H + '"'));
    assert.notEqual(ok.replace(/clio-art-\d+/g, ''), hurt.replace(/clio-art-\d+/g, ''));
});

test('le texte alternatif est échappé, et le dessin est muet sans lui', () => {
    assert.ok(A.front('repos').includes('aria-hidden="true"'));
    const svg = A.front('repos', { label: 'Clio <"x">' });
    assert.ok(svg.includes('aria-label="Clio x"'));
});
