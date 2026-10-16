// Deux constantes écrites à la main à deux endroits, et qui doivent rester
// d'accord — sinon la panne est silencieuse :
//
//  - le cache des packs de langue (js/i18n.js) et celui que le service worker
//    conserve à l'activation (sw.js) : sous deux noms, chaque mise à jour
//    effaçait les packs téléchargés tout en les affichant « installés » ;
//  - les compteurs annoncés par AVAILABLE_LANGUAGES et le contenu réel de
//    data/<lang>.json.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('i18n.js et sw.js partagent le même nom de cache de données', () => {
    const i18n = read('js/i18n.js').match(/const I18N_DATA_CACHE = '([^']+)'/);
    const sw = read('sw.js').match(/const DATA_CACHE = '([^']+)'/);
    assert.ok(i18n && sw, 'constantes introuvables');
    assert.equal(i18n[1], sw[1], 'I18N_DATA_CACHE (js/i18n.js) et DATA_CACHE (sw.js) doivent être identiques');
});

test('AVAILABLE_LANGUAGES annonce les vrais compteurs et la vraie taille des packs', () => {
    const src = read('js/i18n.js');
    const rows = [...src.matchAll(/\{ code: '(\w+)'[^}]*?sizeVal: '([\d.]+)', sizeUnit: '(kb|mb)'[^}]*?themeCount: (\d+), eventCount: (\d+) \}/g)];
    assert.ok(rows.length >= 6, 'langues non détectées');
    for (const [, code, sizeVal, unit, themes, events] of rows) {
        const file = path.join(root, 'data', code + '.json');
        const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
        assert.equal(Number(themes), doc.totalThemes, `${code}: themeCount`);
        assert.equal(Number(events), doc.totalEvents, `${code}: eventCount`);
        const bytes = fs.statSync(file).size;
        const real = unit === 'mb' ? bytes / 1e6 : bytes / 1e3;
        // Tolérance large : la taille change à chaque ajout de contenu, les compteurs non.
        assert.ok(Math.abs(real - Number(sizeVal)) / real < 0.25, `${code}: taille annoncée ${sizeVal} ${unit}, réelle ${real.toFixed(1)}`);
    }
});
