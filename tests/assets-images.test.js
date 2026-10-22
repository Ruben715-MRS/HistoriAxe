// Images de tuiles (catégories, sous-catégories) : WebP, redimensionnées, et sans fichier orphelin.
// Elles pesaient 32 Mo en JPEG (1 à 2,8 Mo chacune, dont cinq doublons jamais référencés) pour des
// tuiles affichées sur ~400 px.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'assets', 'images');
const files = fs.readdirSync(dir);
const referenced = new Set();
(function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, f.name);
        if (f.isDirectory()) walk(p);
        else if (f.name.endsWith('.js')) {
            const src = fs.readFileSync(p, 'utf8');
            for (const m of src.matchAll(/assets\/images\/([A-Za-z0-9_]+\.[a-z]+)/g)) referenced.add(m[1]);
            // Certaines tables (js/app/categories.js) ne citent que le nom du fichier, le préfixe étant ajouté à l'usage.
            for (const m of src.matchAll(/['"]((?:cat|nat|prog)_[A-Za-z0-9_]+\.webp)['"]/g)) referenced.add(m[1]);
        }
    }
})(path.join(root, 'js'));

test('chaque image référencée par le code existe, et en WebP', () => {
    assert.ok(referenced.size > 20);
    for (const f of referenced) {
        assert.ok(f.endsWith('.webp'), `${f} : les tuiles sont en WebP`);
        assert.ok(files.includes(f), `${f} référencée mais absente de assets/images`);
    }
});

test('aucune image orpheline dans assets/images', () => {
    assert.deepEqual(files.filter((f) => !referenced.has(f)), []);
});

test('budget : assets/images reste sous 7 Mo', () => {
    const total = files.reduce((sum, f) => sum + fs.statSync(path.join(dir, f)).size, 0);
    assert.ok(total < 7 * 1024 * 1024, `${(total / 1048576).toFixed(1)} Mo`);
});
