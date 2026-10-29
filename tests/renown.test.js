// La renommée des personnages (js/renown.js) : le niveau lu dans les données, les libellés, et le réglage afficher / cacher.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Renown = require('../js/renown.js');

const root = path.resolve(__dirname, '..');

test('le niveau de renommée : 1, 2 ou 3 ; tout le reste, 0', () => {
    assert.equal(Renown.levelOf({ etoiles: 1 }), 1);
    assert.equal(Renown.levelOf({ etoiles: 2 }), 2);
    assert.equal(Renown.levelOf({ etoiles: 3 }), 3);
    [undefined, null, {}, { etoiles: 0 }, { etoiles: 4 }, { etoiles: '3' }, { etoiles: 2.5 }, { etoiles: null }].forEach((evt) => {
        assert.equal(Renown.levelOf(evt), 0, JSON.stringify(evt));
    });
});

test('la clé de texte : locale, régionale, mondiale ; rien sans niveau', () => {
    assert.deepEqual([1, 2, 3].map((n) => Renown.keyOf({ etoiles: n })), ['local', 'regional', 'world']);
    assert.equal(Renown.keyOf({}), '');
    assert.deepEqual(Renown.LEVELS, [1, 2, 3]);
});

test('le contour s\'affiche par défaut ; le réglage se retient, et sans stockage il vaut pour la session', () => {
    const data = {};
    global.localStorage = { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
    try {
        Renown.reset();
        assert.equal(Renown.shown(), true, 'affiché par défaut');
        assert.equal(Renown.setShown(false), false);
        assert.equal(data[Renown.STORAGE_KEY], '0');
        Renown.reset();
        assert.equal(Renown.shown(), false, 'relu dans le stockage');
        Renown.setShown(true);
        Renown.reset();
        assert.equal(Renown.shown(), true);
        // Stockage qui refuse d'écrire (navigation privée) : le réglage tient quand même jusqu'à la fin de la session.
        global.localStorage = { getItem() { throw new Error('bloqué'); }, setItem() { throw new Error('bloqué'); } };
        Renown.reset();
        assert.equal(Renown.shown(), true);
        Renown.setShown(false);
        assert.equal(Renown.shown(), false);
    } finally {
        delete global.localStorage;
        Renown.reset();
    }
    assert.equal(Renown.shown(), true, 'sans stockage du tout : affiché');
});

test('les textes de la renommée existent dans les six langues, et ne disent jamais « peu connu » : ils décrivent, ils ne classent pas', () => {
    ['fr', 'en', 'de', 'es', 'it', 'ja'].forEach((lang) => {
        const ui = JSON.parse(fs.readFileSync(path.join(root, 'ui', lang + '.json'), 'utf8'));
        ['title', 'local', 'regional', 'world', 'local_short', 'regional_short', 'world_short'].forEach((k) => {
            assert.ok(ui.renown && typeof ui.renown[k] === 'string' && ui.renown[k], `${lang}: renown.${k}`);
        });
        assert.ok(ui.gallery.renown_show && ui.gallery.renown_help, `${lang}: textes de la galerie`);
        assert.equal(new Set([ui.renown.local, ui.renown.regional, ui.renown.world]).size, 3, `${lang}: trois libellés différents`);
    });
    const fr = JSON.parse(fs.readFileSync(path.join(root, 'ui', 'fr.json'), 'utf8'));
    assert.deepEqual([fr.renown.local, fr.renown.regional, fr.renown.world], ['Renommée locale', 'Renommée régionale', 'Renommée mondiale']);
});

test('l\'écran et le style : les fichiers sont chargés, le contour a trois niveaux, il est doublé d\'une étiquette', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    ['js/renown.js', 'js/app/renown.js'].forEach((f) => {
        assert.ok(html.includes(`src="${f}"`), `${f} absent d'index.html`);
        assert.ok(sw.includes(`'./${f}'`), `${f} absent du service worker`);
    });
    // Renown avant la galerie, qui s'en sert au chargement des figures.
    assert.ok(html.indexOf('src="js/renown.js"') < html.indexOf('src="js/gallery.js"'));
    const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
    [1, 2, 3].forEach((n) => {
        assert.ok(css.includes(`.renown-img.renown-${n}`), `contour d'image, niveau ${n}`);
        assert.ok(css.includes(`.renown-frame.renown-${n}::after`), `contour de vignette, niveau ${n}`);
    });
    ['modal-portrait-renown', 'who-feedback-renown', 'gallery-renown-show', 'gallery-renown-filter'].forEach((id) => assert.ok(html.includes(`id="${id}"`), id));
});
