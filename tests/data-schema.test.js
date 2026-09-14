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

        // Carte mentale (champ facultatif "carteMentale" d'un thème, rendu par
        // js/mindMap.js) : fiche de synthèse en branches dépliables. Les deux
        // références qu'elle porte vers le reste du thème — un axe à réviser,
        // un événement dont on ouvre la fiche — sont validées ici, parce
        // qu'une référence morte ne se voit qu'en dépliant la bonne branche
        // au bon endroit de l'app.
        function checkMindMap(theme, knownEventIds) {
            const carte = theme.carteMentale;
            const where = `carte mentale de "${theme.id}"`;
            const knownAxes = new Set(theme.events.map((evt) => evt.axe).filter(Boolean));

            assert.ok(Array.isArray(carte.branches) && carte.branches.length > 0, `${file}: ${where} sans "branches"`);

            function checkAxis(axe, at) {
                if (axe === undefined) return;
                assert.ok(knownAxes.has(axe), `${file}: ${where} renvoie à l'axe inconnu "${axe}" (${at})`);
            }

            for (const branch of carte.branches) {
                assert.ok(typeof branch.titre === 'string' && branch.titre.length > 0, `${file}: ${where} a une branche sans "titre"`);
                const at = `branche "${branch.titre}"`;
                checkAxis(branch.axe, at);
                assert.ok(
                    Array.isArray(branch.sousBranches) || Array.isArray(branch.reperes),
                    `${file}: ${where} — ${at} n'a ni "sousBranches" ni "reperes"`
                );

                for (const sub of branch.sousBranches || []) {
                    assert.ok(typeof sub.titre === 'string' && sub.titre.length > 0, `${file}: ${where} — ${at} a une sous-branche sans "titre"`);
                    checkAxis(sub.axe, `${at} > "${sub.titre}"`);
                    // Une sous-branche porte des items rédigés, ou une simple
                    // série de mots (tags) — au moins l'un des deux.
                    const hasItems = Array.isArray(sub.items) && sub.items.length > 0;
                    const hasTags = Array.isArray(sub.tags) && sub.tags.length > 0;
                    assert.ok(hasItems || hasTags, `${file}: ${where} — sous-branche "${sub.titre}" sans "items" ni "tags"`);
                    for (const entry of [...(sub.items || []), ...(sub.tags || [])]) {
                        assert.ok(typeof entry === 'string' && entry.length > 0, `${file}: ${where} — sous-branche "${sub.titre}" a une entrée vide`);
                    }
                }

                for (const repere of branch.reperes || []) {
                    assert.ok(typeof repere.date === 'string' && repere.date.length > 0, `${file}: ${where} — ${at} a un repère sans "date"`);
                    assert.ok(typeof repere.texte === 'string' && repere.texte.length > 0, `${file}: ${where} — repère "${repere.date}" sans "texte"`);
                    if (repere.eventId !== undefined) {
                        assert.ok(
                            knownEventIds.has(repere.eventId),
                            `${file}: ${where} — repère "${repere.date}" renvoie à l'événement inconnu "${repere.eventId}"`
                        );
                    }
                }
            }
        }

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

                    if (theme.carteMentale) checkMindMap(theme, seenEventIds);
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
