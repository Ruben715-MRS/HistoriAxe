// Les scripts de l'app sont des fichiers classiques qui se partagent l'espace global : leur ORDRE dans
// index.html est leur seule liste de dépendances (voir js/app/*.js, extraits de l'ancien js/app.js), et
// le service worker doit tous les précacher, sans quoi le premier lancement hors ligne casse.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map((m) => m[1]);
const precached = [...sw.matchAll(/'\.\/(js\/[^']+)'/g)].map((m) => m[1]);

test('chaque script d\'index.html existe, une seule fois', () => {
    assert.ok(scripts.length > 20);
    assert.equal(new Set(scripts).size, scripts.length, 'script chargé deux fois');
    for (const s of scripts) assert.ok(fs.existsSync(path.join(root, s)), `${s} introuvable`);
});

test('le service worker précache exactement les mêmes scripts, dans le même ordre', () => {
    assert.deepEqual(precached, scripts);
});

test('tout fichier de js/ est chargé par index.html (sauf les modules réservés au serveur)', () => {
    const all = [];
    (function walk(dir) {
        for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, f.name);
            if (f.isDirectory()) walk(p);
            else if (f.name.endsWith('.js')) all.push(path.relative(root, p).split(path.sep).join('/'));
        }
    })(path.join(root, 'js'));
    const orphans = all.filter((f) => !scripts.includes(f));
    assert.deepEqual(orphans, [], 'fichiers js non chargés par index.html');
});

test('js/app.js reste le DERNIER script : il pose window.onload, qui appelle tous les autres', () => {
    assert.equal(scripts[scripts.length - 1], 'js/app.js');
    assert.match(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), /window\.onload\s*=/);
});

test('un fichier extrait n\'appelle à son chargement aucune fonction définie plus loin', () => {
    // Dans un fichier unique, les déclarations `function` sont remontées : un appel au niveau racine
    // pouvait viser une fonction écrite plus bas. Entre fichiers séparés, cet appel échouerait.
    const declared = new Map(); // nom → indice du script
    scripts.forEach((s, i) => {
        const src = fs.readFileSync(path.join(root, s), 'utf8');
        for (const m of src.matchAll(/^(?:async )?function\s+([A-Za-z0-9_$]+)/gm)) if (!declared.has(m[1])) declared.set(m[1], i);
    });
    scripts.forEach((s, i) => {
        const src = fs.readFileSync(path.join(root, s), 'utf8');
        for (const m of src.matchAll(/^([A-Za-z0-9_$]+)\(\);?$/gm)) {
            const at = declared.get(m[1]);
            if (at !== undefined) assert.ok(at <= i, `${s} appelle ${m[1]}() à son chargement, défini dans ${scripts[at]} (chargé après)`);
        }
    });
});
