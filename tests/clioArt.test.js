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
        for (const mood of A.MOODS) assertWellFormed(A.front(mood, { costume: world }));
        assert.ok(A.front('repos', { costume: world }).includes('data-costume="' + A.COSTUMES[world] + '"'));
    }
    const notDrawn = worlds.find((w) => !Object.keys(A.COSTUMES).includes(w));
    if (notDrawn) assert.equal(A.hasCostume(notDrawn), false);
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

test('la marche : SVG bien formé, quatre pattes animées deux par deux', () => {
    const svg = A.walk();
    assertWellFormed(svg);
    assert.ok(svg.includes('viewBox="0 0 ' + A.WALK.W + ' ' + A.WALK.H + '"'));
    for (const leg of ['ca-leg-nf', 'ca-leg-nb', 'ca-leg-ff', 'ca-leg-fb']) assert.ok(svg.includes(leg), leg);
});

test('les poses de la boutique et de l\'album : essayage et danse, aussi en costume', () => {
    for (const pose of ['essaie', 'danse']) {
        assert.ok(A.MOODS.includes(pose) && ClioCore.MOODS.includes(pose), pose);
        assert.ok(A.front(pose).includes('ca-m-' + pose));
    }
    const danse = A.front('danse', { costume: 'religion' });
    assert.ok(danse.includes('ca-danceL') && danse.includes('ca-danceR'), 'deux pattes levées');
    assert.equal((danse.match(/#25272E/g) || []).length >= 3, true, 'les deux bras portent la manche du pourpoint');
});

test('chaque costume existe de profil, en marche comme en vol', () => {
    for (const [world, kind] of Object.entries(A.COSTUMES)) {
        for (const svg of [A.walk({ costume: world }), A.fly({ costume: world }), A.fly({ costume: world, hurt: true })]) {
            assertWellFormed(svg);
            assert.ok(svg.includes('data-costume="' + kind + '"'), world);
            assert.ok(svg.length > A.walk().length * 0.9, world + ' : dessin de profil vide');
        }
        assert.ok(A.walk({ costume: world }) !== A.walk().replace(/clio-art-\d+/g, ''), world);
    }
    assert.ok(!A.walk().includes('data-costume'));
});
