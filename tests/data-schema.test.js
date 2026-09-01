// Validation de structure des packs de données (data/*.json), une par
// langue. Objectif : attraper tôt (avant un build/une review) les
// régressions de schéma qui, jusqu'ici, ne se révélaient qu'en jouant —
// voir l'historique de commits ("fix: restore functions dropped during the
// PWA/i18n refactor that broke game launch").
//
// L'arbre "categories" est récursif et de profondeur variable : un nœud a
// soit "themes" (feuille — ex. "CAPES & Agrégation" est un thème direct
// sous la catégorie), soit "subcategories" (nœud interne, ex.
// "Histoires nationales" > "Europe" > pays), à n'importe quelle
// profondeur. Voir data/fr.json pour l'exemple le plus profond.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.resolve(__dirname, '..', 'data');
const localeFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));

assert.ok(localeFiles.length > 0, 'aucun fichier data/*.json trouvé');

for (const file of localeFiles) {
    test(`data/${file} respecte le schéma attendu`, () => {
        const raw = fs.readFileSync(path.join(dataDir, file), 'utf8');
        let doc;
        assert.doesNotThrow(() => { doc = JSON.parse(raw); }, `${file} n'est pas un JSON valide`);

        for (const field of ['version', 'lang', 'name', 'totalThemes', 'totalEvents', 'categories']) {
            assert.ok(field in doc, `${file}: champ "${field}" manquant`);
        }
        assert.ok(Array.isArray(doc.categories) && doc.categories.length > 0, `${file}: "categories" doit être un tableau non vide`);

        const seenThemeIds = new Set();
        let themeCount = 0;
        let eventCount = 0;

        function walk(node, label) {
            assert.ok(typeof node.nom === 'string' && node.nom.length > 0, `${file}: un nœud sans "nom" (sous ${label})`);
            const here = `${label} > ${node.nom}`;

            if (Array.isArray(node.themes)) {
                for (const theme of node.themes) {
                    themeCount++;
                    assert.ok(typeof theme.id === 'string' && theme.id.length > 0, `${file}: un thème sans "id" (${here})`);
                    assert.ok(!seenThemeIds.has(theme.id), `${file}: id de thème dupliqué "${theme.id}"`);
                    seenThemeIds.add(theme.id);
                    assert.ok(Array.isArray(theme.events) && theme.events.length > 0, `${file}: thème "${theme.id}" sans événements (${here})`);

                    const seenEventIds = new Set();
                    for (const evt of theme.events) {
                        eventCount++;
                        assert.ok(typeof evt.id === 'string' && evt.id.length > 0, `${file}: thème "${theme.id}" a un événement sans "id"`);
                        assert.ok(!seenEventIds.has(evt.id), `${file}: id d'événement dupliqué "${evt.id}" dans le thème "${theme.id}" (les points faibles/SRS sont indexés par cet id)`);
                        seenEventIds.add(evt.id);
                        assert.ok(typeof evt.date === 'number' && Number.isFinite(evt.date), `${file}: événement "${evt.id}" a une "date" invalide`);
                        assert.ok(typeof evt.titre === 'string' && evt.titre.length > 0, `${file}: événement "${evt.id}" sans "titre"`);
                    }
                }
            } else if (Array.isArray(node.subcategories)) {
                for (const child of node.subcategories) walk(child, here);
            } else {
                assert.fail(`${file}: nœud "${here}" n'a ni "themes" ni "subcategories"`);
            }
        }

        for (const category of doc.categories) walk(category, file);

        assert.equal(themeCount, doc.totalThemes, `${file}: totalThemes (${doc.totalThemes}) ne correspond pas au nombre réel de thèmes (${themeCount})`);
        assert.equal(eventCount, doc.totalEvents, `${file}: totalEvents (${doc.totalEvents}) ne correspond pas au nombre réel d'événements (${eventCount})`);
    });
}
