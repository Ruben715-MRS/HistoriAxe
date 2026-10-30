// Profil d'accueil (js/viewProfileCore.js) : la disposition ne change que l'affichage, jamais l'accès aux fonctions.
const test = require('node:test');
const assert = require('node:assert/strict');

const ViewProfile = require('../js/viewProfileCore.js');

test('un profil inconnu ou absent tombe sur « culture » : les joueurs existants ne voient aucun changement', () => {
    assert.equal(ViewProfile.normalize(undefined), 'culture');
    assert.equal(ViewProfile.normalize('n-importe-quoi'), 'culture');
    assert.equal(ViewProfile.normalize('concours'), 'concours');
    assert.deepEqual(ViewProfile.layout(undefined), ViewProfile.layout('culture'));
});

test('« culture » : l\'accueil complet, rien de masqué', () => {
    const l = ViewProfile.layout('culture');
    assert.deepEqual(l.row1, ['favoris', 'daily', 'discover', 'resume']);
    assert.deepEqual(l.row2, ['revision', 'arcade', 'tools', 'atlas']);
    assert.equal(l.rewardsBar && l.pathCard && l.league && l.greeting, true);
    assert.deepEqual(l.moreInProfile, []);
});

test('« concours » : quatre boutons dans l\'ordre demandé, et aucun élément de jeu sur l\'accueil', () => {
    const l = ViewProfile.layout('concours');
    assert.deepEqual(l.row1, ['favoris', 'revision', 'tools', 'resume']);
    assert.deepEqual(l.row2, []);
    assert.equal(l.rewardsBar, false);
    assert.equal(l.pathCard, false);
    assert.equal(l.league, false);
    assert.equal(l.greeting, false);
});

test('« concours » : rien ne disparaît, chaque élément masqué a une porte d\'entrée (profil ou Atelier)', () => {
    const accueil = ViewProfile.layout('concours');
    const toutes = ['favoris', 'daily', 'discover', 'resume', 'revision', 'arcade', 'tools', 'atlas'];
    const visibles = accueil.row1.concat(accueil.row2);
    // Défis et Hasard : retour au profil « culture » ; Salle de jeux et Atlas : Atelier (voir js/app/tools.js).
    const retires = toutes.filter((k) => visibles.indexOf(k) === -1);
    assert.deepEqual(retires.sort(), ['arcade', 'atlas', 'daily', 'discover']);
    for (const item of ['path', 'shop', 'album', 'friends', 'team', 'league']) {
        assert.ok(accueil.moreInProfile.indexOf(item) !== -1, item + ' doit être dans Profil et Trophées');
    }
});

test('ordre des catégories : « concours » met les concours en tête, le reste garde l\'ordre du pack', () => {
    const pack = ['Culture générale', 'Personnages illustres', 'Histoires nationales', 'Programmes scolaires', 'CAPES & Agrégation', 'Mes thèmes'];
    const ordre = ViewProfile.categoryOrder('concours', pack).map((i) => pack[i]);
    assert.deepEqual(ordre, ['CAPES & Agrégation', 'Programmes scolaires', 'Culture générale', 'Histoires nationales', 'Personnages illustres', 'Mes thèmes']);
});

test('ordre des catégories : « scolaire » met seulement les programmes en tête ; « culture » ne change rien', () => {
    const pack = ['Culture générale', 'Personnages illustres', 'Histoires nationales', 'Programmes scolaires', 'CAPES & Agrégation'];
    assert.deepEqual(ViewProfile.categoryOrder('scolaire', pack).map((i) => pack[i]),
        ['Programmes scolaires', 'Culture générale', 'Personnages illustres', 'Histoires nationales', 'CAPES & Agrégation']);
    assert.deepEqual(ViewProfile.categoryOrder('culture', pack), [0, 1, 2, 3, 4]);
});
