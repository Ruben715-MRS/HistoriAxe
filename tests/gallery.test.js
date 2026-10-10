// Galerie des portraits (js/gallery.js) : ce que la galerie lit dans les données.
//
//  - chaque figure d'un panthéon y entre sous son nom, sans le « Naissance de »
//    du titre : un titre écrit autrement afficherait « Naissance de… » sous un
//    visage ;
//  - chaque figure a un pays, donc un drapeau sur sa carte : par le code du
//    thème (pan_fr) ou, dans un panthéon de région, par son champ `pays` ;
//  - chaque figure a un nom de classement, dont l'initiale est une vraie lettre :
//    sans quoi un intertitre « # » apparaîtrait dans le tri par nom de famille ;
//  - la recherche trouve « victor hugo » comme « hugo victor », sans accent.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
    galleryNameOf, galleryCountryOf, findPantheonNode, galleryNormalize, galleryInitial,
    filterGalleryEntries, compareGalleryEntries
} = require('../js/gallery.js');

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

// Les entrées de la galerie, construites comme collectGalleryEntries les construit
// (sans les fonctions de l'application, qu'un test Node n'a pas).
const entries = [];
pantheon.themes.forEach(theme => theme.events.forEach(evt => {
    const names = galleryNameOf(evt);
    entries.push(Object.assign({
        evt, iso: galleryCountryOf(evt, theme), classement: evt.classement || names.sortName,
        haystack: galleryNormalize(`${evt.titre} ${evt.classement || ''}`)
    }, names));
}));
const byTitle = titre => entries.find(e => e.evt.titre === titre);

test('chaque figure a un nom de classement qui commence par une lettre', () => {
    assert.equal(entries.length, 838);
    entries.forEach(e => {
        assert.ok(e.evt.classement, `${e.evt.id} : pas de nom de classement`);
        assert.notEqual(galleryInitial(e.classement), '#', `${e.evt.id} : « ${e.classement} » ne commence pas par une lettre`);
    });
});

test('le tri par nom de famille range Hugo à H, de Gaulle à G, Louis XIV à L et le Caravage à C', () => {
    const initiale = titre => galleryInitial(byTitle(titre).classement);
    assert.equal(initiale('Naissance de Victor Hugo'), 'H');
    assert.equal(initiale('Naissance de Charles de Gaulle'), 'G');
    assert.equal(initiale('Naissance de Louis XIV'), 'L');
    assert.equal(initiale('Naissance du Caravage'), 'C');
    assert.equal(initiale('Naissance de Ludwig van Beethoven'), 'B');
    assert.equal(initiale('Naissance de Gabriel García Márquez'), 'G');
    // Le tri alphabétique, lui, suit le nom tel qu'on l'écrit : Hugo à V.
    assert.equal(galleryInitial(byTitle('Naissance de Victor Hugo').sortName), 'V');
    // Une initiale accentuée se range sous sa lettre.
    assert.equal(galleryInitial('Édith Piaf'), 'E');
});

test('à nom égal, la date de naissance départage', () => {
    const compare = compareGalleryEntries('famille');
    const grimm = entries.filter(e => /Grimm/.test(e.classement)).sort(compare);
    assert.equal(grimm.length, 2);
    assert.ok(grimm[0].evt.date <= grimm[1].evt.date);
    const hugo = byTitle('Naissance de Victor Hugo');
    const tasse = byTitle('Naissance du Tasse');
    assert.ok(compare(hugo, tasse) < 0, 'Hugo (H) se range avant Tasse (T)');
});

test('la recherche ignore l’ordre des mots, les accents et la casse', () => {
    const trouve = query => filterGalleryEntries(entries, { query }).map(e => e.evt.titre);
    assert.deepEqual(trouve('victor hugo'), ['Naissance de Victor Hugo']);
    assert.deepEqual(trouve('Hugo  Victor'), ['Naissance de Victor Hugo']);
    assert.ok(trouve('edith').includes('Naissance d\'Édith Piaf'));
    assert.ok(trouve('ibn').length >= 3, 'Ibn Khaldun, Ibn Battûta, Ibn Tûmart…');
    assert.deepEqual(trouve('zzzzz'), []);
    assert.equal(filterGalleryEntries(entries, {}).length, entries.length);
});

test('les filtres par pays et par domaine se combinent avec la recherche', () => {
    const fr = filterGalleryEntries(entries, { country: 'FR' });
    assert.ok(fr.length >= 60 && fr.every(e => e.iso === 'FR'));
    const sciences = filterGalleryEntries(entries, { axis: 'Sciences, techniques et innovation' });
    assert.ok(sciences.length > 50 && sciences.every(e => e.evt.axe === 'Sciences, techniques et innovation'));
    const both = filterGalleryEntries(entries, { country: 'FR', axis: 'Sciences, techniques et innovation', query: 'curie' });
    assert.deepEqual(both.map(e => e.evt.titre), ['Naissance de Marie Curie']);
    // Un pays de bloc passe par le champ `pays` de l'événement.
    assert.ok(filterGalleryEntries(entries, { country: 'VE' }).some(e => e.evt.titre === 'Naissance de Simón Bolívar'));
});
