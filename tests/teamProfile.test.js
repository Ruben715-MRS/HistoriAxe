// Le profil d'une équipe (js/teamProfile.js) : description, pays, langue, niveau. Pur, sans navigateur.
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../js/teamProfile.js');

test('la description est nettoyée et bornée', () => {
    assert.equal(P.sanitizeDescription('  Bonjour <b>à tous</b>\n\nbienvenue  '), 'Bonjour b à tous /b bienvenue');
    assert.equal(P.sanitizeDescription('x'.repeat(500)).length, P.MAX_DESCRIPTION);
    assert.equal(P.sanitizeDescription(42), '');
    assert.equal(P.sanitizeDescription(undefined), '');
});

test('pays et langue : liste fermée, vide accepté, le reste refusé', () => {
    assert.equal(P.sanitizeCountry('fr'), 'FR');
    assert.equal(P.sanitizeCountry(''), '');
    assert.equal(P.sanitizeCountry('ZZ'), null);
    assert.equal(P.sanitizeCountry('FRA'), null);
    assert.equal(P.sanitizeCountry(7), null);
    assert.equal(P.sanitizeLanguage('EN'), 'en');
    assert.equal(P.sanitizeLanguage(null), '');
    assert.equal(P.sanitizeLanguage('xx'), null);
    assert.equal(new Set(P.COUNTRIES).size, P.COUNTRIES.length, 'pas de doublon');
    assert.ok(P.COUNTRIES.length > 240);
});

test('niveau : un entier de 1 au plafond', () => {
    assert.equal(P.sanitizeLevel(3), 3);
    assert.equal(P.sanitizeLevel('7'), 7);
    for (const bad of [0, -1, 301, 2.5, 'a', null, undefined, NaN]) assert.equal(P.sanitizeLevel(bad), null, String(bad));
});
