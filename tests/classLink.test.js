// Mode Classe : le lien et le QR code pour rejoindre une séance (js/classLink.js).
const test = require('node:test');
const assert = require('node:assert/strict');

const ClassLink = require('../js/classLink.js');

test('le lien : origine, sans slash en trop, code encodé', () => {
    assert.equal(ClassLink.joinLink('https://histori-axe.vercel.app', 'ABCD23'), 'https://histori-axe.vercel.app/?classe=ABCD23');
    assert.equal(ClassLink.joinLink('https://histori-axe.vercel.app/', 'ABCD23'), 'https://histori-axe.vercel.app/?classe=ABCD23');
    assert.equal(ClassLink.joinLink('http://localhost:8080//', 'ABCD23'), 'http://localhost:8080/?classe=ABCD23');
});

test('le code relu dans l\'adresse : casse, espaces et tirets tolérés, comme à la saisie', () => {
    assert.equal(ClassLink.codeFromSearch('?classe=abcd23'), 'ABCD23');
    assert.equal(ClassLink.codeFromSearch('?classe=abc-d 23'), 'ABCD23');
    assert.equal(ClassLink.codeFromSearch('?foo=1&classe=ABCD23'), 'ABCD23');
});

test('le code relu dans l\'adresse : invalide ou absent, rien n\'est ouvert', () => {
    assert.equal(ClassLink.codeFromSearch(''), null);
    assert.equal(ClassLink.codeFromSearch('?classe='), null);
    assert.equal(ClassLink.codeFromSearch('?classe=ABCDE'), null, '5 caractères');
    assert.equal(ClassLink.codeFromSearch('?classe=ABCDEO'), null, 'le O est exclu');
    assert.equal(ClassLink.codeFromSearch('?classe=<script>'), null);
    assert.equal(ClassLink.codeFromSearch(undefined), null);
});

test('un lien construit se relit : aller-retour', () => {
    const link = new URL(ClassLink.joinLink('https://histori-axe.vercel.app', 'K7M2QX'));
    assert.equal(ClassLink.codeFromSearch(link.search), 'K7M2QX');
});
