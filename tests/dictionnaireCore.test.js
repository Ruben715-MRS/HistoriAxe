// Tests de js/dictionnaireCore.js (règles pures) et de la donnée extraite du .docx (assets/dictionnaire/termes.json).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const D = require('../js/dictionnaireCore.js');

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'dictionnaire', 'termes.json'), 'utf8'));
const termes = data.termes;
const names = list => list.map(t => t.nom);

test('normalize : accents, casse et apostrophes typographiques', () => {
    assert.equal(D.normalize('Élève'), 'eleve');
    assert.equal(D.normalize('  Plaine   d’Alsace '), "plaine d'alsace");
});

test('letterOf : lettre sans accent, « # » hors alphabet', () => {
    assert.equal(D.letterOf('Équidistance'), 'E');
    assert.equal(D.letterOf('« Commerce triangulaire »'), 'C');
    assert.equal(D.letterOf('1 000'), '#');
});

test('search : requête vide = liste complète classée', () => {
    const all = D.search(termes, '');
    assert.equal(all.length, termes.length);
    // Une lettre = un seul groupe : le classement ne doit pas éparpiller une même lettre.
    const groups = D.groupByLetter(all);
    assert.equal(new Set(groups.map(g => g.letter)).size, groups.length);
});

test('search : préfixe avant contenu, contenu dans le nom avant la définition', () => {
    const list = [
        { id: 'a', nom: 'Bassin versant', definition: 'x', fiche: 1, domaine: 1 },
        { id: 'b', nom: 'Versant', definition: 'x', fiche: 2, domaine: 1 },
        { id: 'c', nom: 'Pente', definition: 'Un versant abrupt.', fiche: 3, domaine: 1 }
    ];
    assert.deepEqual(names(D.search(list, 'versant')), ['Versant', 'Bassin versant', 'Pente']);
});

test('search : insensible aux accents et à la casse', () => {
    assert.ok(names(D.search(termes, 'ECHELLE')).includes('Échelle numérique'));
});

test('search : filtre par domaine', () => {
    const found = D.search(termes, '', 19);
    assert.ok(found.length > 0);
    assert.ok(found.every(t => t.domaine === 19));
});

test('groupByLetter : groupes dans l’ordre et termes rangés sous leur lettre', () => {
    const groups = D.groupByLetter(D.search(termes, ''));
    const letters = groups.map(g => g.letter);
    const lettersOnly = letters.filter(l => l !== '#');
    assert.deepEqual(lettersOnly, [...lettersOnly].sort());
    if (letters.includes('#')) assert.equal(letters[letters.length - 1], '#');
    groups.forEach(g => g.termes.forEach(t => assert.equal(D.letterOf(t.nom), g.letter)));
});

test('neighbours : les autres termes de la même fiche, jamais le terme lui-même', () => {
    const plaine = termes.find(t => t.nom === 'Plaine');
    assert.deepEqual(names(D.neighbours(termes, plaine)), ['Plateau']);
    const idx = D.indexById(termes);
    assert.equal(idx.get(plaine.id).nom, 'Plaine');
});

test('données : 19 domaines, 211 fiches, 24 signalées « Rapport 2026 »', () => {
    assert.equal(data.domaines.length, 19);
    assert.equal(data.fiches.length, 211);
    assert.equal(data.fiches.filter(f => f.rapport2026).length, 24);
});

test('données : identifiants uniques, chaque terme rattaché à une fiche de son domaine', () => {
    const ids = new Set(termes.map(t => t.id));
    assert.equal(ids.size, termes.length);
    const fiches = new Map(data.fiches.map(f => [f.id, f]));
    termes.forEach(t => {
        assert.ok(fiches.has(t.fiche), 'fiche inconnue pour ' + t.nom);
        assert.equal(fiches.get(t.fiche).domaine, t.domaine);
        assert.ok(t.nom && t.definition, 'terme incomplet : ' + t.id);
    });
});

test('données : chaque fiche a un critère décisif et au moins deux termes qu’on peut confondre (sauf fiches à terme unique)', () => {
    data.fiches.forEach(f => {
        assert.ok(f.critere, 'critère manquant, fiche ' + f.id);
        assert.ok(f.termes.length >= 1);
    });
});
