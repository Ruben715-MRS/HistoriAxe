// Photos des villes (assets/geo/city-photos.json) : licence libre, auteur et source, composantes des montages, fichiers présents.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const data = require('../assets/geo/city-photos.json');
const cities = require('../assets/geo/cities.json').cities;
const ALLOWED = Object.keys(data.licences);
const SOURCES = ['https://commons.wikimedia.org/', 'https://fr.wikipedia.org/'];

test('chaque photo a une ville connue, un fichier présent et une licence libre', () => {
    const ids = new Set();
    data.photos.forEach(p => {
        const city = cities.find(c => c.id === p.city);
        assert.ok(city, p.city + ' : ville inconnue');
        assert.ok(!ids.has(p.city), p.city + ' : une seule photo par ville');
        ids.add(p.city);
        assert.ok(fs.existsSync(path.join(root, p.src)), p.src + ' : fichier absent');
        assert.ok(ALLOWED.includes(p.licence), p.city + ' : licence « ' + p.licence + ' » non autorisée');
    });
});

test('chaque photo porte son auteur, sa légende et sa source ; les montages listent les auteurs de leurs vignettes', () => {
    data.photos.forEach(p => {
        assert.ok(p.auteur && p.legende && p.modifie, p.city + ' : crédits incomplets');
        assert.ok(SOURCES.some(s => p.source.startsWith(s)), p.city + ' : source hors Commons ou Wikipédia');
        if (p.montage) {
            assert.ok(Array.isArray(p.composantes) && p.composantes.length > 0, p.city + ' : montage sans vignettes');
            // Un auteur par vignette, ou la liste des auteurs du montage quand la page ne donne pas la correspondance.
            p.composantes.forEach(c => assert.ok(c.fichier && (c.auteur || (Array.isArray(p.auteurs) && p.auteurs.length)), p.city + ' : vignette sans auteur ni fichier'));
            p.composantes.forEach(c => { if (c.licence) assert.ok(ALLOWED.includes(c.licence), p.city + ' : licence de vignette non autorisée'); });
        }
    });
});

test('les photos ne sont pas dans le cache d’installation : elles se chargent à la première vue', () => {
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    data.photos.forEach(p => assert.ok(!sw.includes(p.src), p.src + ' : ne doit pas être précachée'));
});
