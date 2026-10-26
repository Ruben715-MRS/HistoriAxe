// Rapports du jury (assets/rapports/) : le catalogue pointe vers des fichiers présents, et chaque document est autonome.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const catalog = require('../assets/rapports/index.json').rapports;
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com(\/|$)/;

test('chaque rapport du catalogue a un titre, un concours, une année et un fichier présent', () => {
    const ids = new Set();
    catalog.forEach(r => {
        assert.ok(r.id && r.titre && r.concours && Number.isInteger(r.annee), r.id + ' : champs incomplets');
        assert.ok(!ids.has(r.id), r.id + ' : identifiant en double');
        ids.add(r.id);
        assert.ok(r.fichier.startsWith('assets/rapports/'), r.id + ' : fichier hors de assets/rapports/');
        assert.ok(fs.existsSync(path.join(root, r.fichier)), r.fichier + ' : absent');
    });
});

test('un rapport est un document autonome : son script ne fait que des filtres, et il ne charge que des polices externes', () => {
    catalog.forEach(r => {
        const html = fs.readFileSync(path.join(root, r.fichier), 'utf8');
        // Pas de script externe, et aucun accès réseau ni injection depuis le script.
        assert.ok(!/<script[^>]+src=/i.test(html), r.id + ' : script externe');
        const scripts = html.match(/<script>[\s\S]*?<\/script>/g) || [];
        scripts.forEach(s => assert.ok(!/fetch\(|XMLHttpRequest|eval\(|Function\(|document\.write|localStorage|window\.open/.test(s), r.id + ' : script suspect'));
        // Les ressources chargées : feuilles de style, images, cadres. Les liens <a> ouvrent un nouvel onglet, sans rien charger.
        const loaded = [...html.matchAll(/<(link|img|iframe|source|video|audio)\b[^>]*>/gi)].map(m => m[0]);
        loaded.forEach(tag => {
            const urls = tag.match(/https?:\/\/[^\s"']+/g) || [];
            urls.forEach(u => assert.ok(FONTS.test(u), r.id + ' : ressource externe ' + u));
        });
    });
});
