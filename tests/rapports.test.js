// Rapports du jury (assets/rapports/) : le catalogue pointe vers des fichiers présents, et chaque document est autonome.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const catalog = require('../assets/rapports/index.json').rapports;

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

test('un rapport est un document autonome : pas de script externe, seules les polices viennent du réseau', () => {
    catalog.forEach(r => {
        const html = fs.readFileSync(path.join(root, r.fichier), 'utf8');
        assert.ok(!/<script[^>]+src=/i.test(html), r.id + ' : script externe');
        const urls = html.match(/https?:\/\/[^\s"')]+/g) || [];
        urls.forEach(u => assert.ok(/fonts\.(googleapis|gstatic)\.com/.test(u) || /devenirenseignant\.gouv\.fr/.test(u), r.id + ' : ressource externe ' + u));
    });
});
