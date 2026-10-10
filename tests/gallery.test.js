// Galerie des portraits (js/gallery.js) : ce que la galerie lit dans les données.
//
//  - chaque figure d'un panthéon y entre sous son nom, sans le « Naissance de »
//    du titre : un titre écrit autrement afficherait « Naissance de… » sous un
//    visage ;
//  - chaque figure a un pays, donc un drapeau sur sa carte : par le code du
//    thème (pan_fr) ou, dans un panthéon de région, par son champ `pays`.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { galleryNameOf, galleryCountryOf, findPantheonNode } = require('../js/gallery.js');

const fr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'fr.json'), 'utf8'));
const illustres = fr.categories.find(c => c.nom === 'Personnages illustres');
const pantheon = findPantheonNode(illustres);

test('la galerie trouve les Panthéons sous « Personnages illustres », et nulle part ailleurs', () => {
    assert.ok(pantheon, 'sous-catégorie « Panthéons » introuvable');
    assert.equal(pantheon.nom, 'Panthéons');
    fr.categories.filter(c => c !== illustres).forEach(c => {
        (function walk(node) {
            assert.equal(findPantheonNode(node), null, `${node.nom} ne doit pas ouvrir de galerie`);
            (node.subcategories || []).forEach(walk);
        })(c);
    });
});

test('le nom affiché sous chaque portrait est celui de la figure', () => {
    assert.deepEqual(galleryNameOf({ titre: 'Naissance de Victor Hugo' }), { name: 'Victor Hugo', sortName: 'Victor Hugo' });
    assert.deepEqual(galleryNameOf({ titre: "Naissance d'Ada Lovelace" }), { name: 'Ada Lovelace', sortName: 'Ada Lovelace' });
    assert.deepEqual(galleryNameOf({ titre: 'Naissance du Caravage' }), { name: 'le Caravage', sortName: 'Caravage' });
    pantheon.themes.forEach(theme => theme.events.forEach(evt => {
        const { name } = galleryNameOf(evt);
        assert.ok(name && !/^Naissance\b/.test(name), `${theme.id} : « ${evt.titre} » ne donne pas de nom`);
    }));
});

test('chaque figure des panthéons a un pays, donc un drapeau', () => {
    pantheon.themes.forEach(theme => theme.events.forEach(evt => {
        assert.match(galleryCountryOf(evt, theme), /^[A-Z]{2}$/, `${theme.id} : ${evt.titre} sans pays`);
    }));
});
