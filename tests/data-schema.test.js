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

const repoRoot = path.resolve(__dirname, '..');
const dataDir = path.resolve(repoRoot, 'data');
const localeFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));

assert.ok(localeFiles.length > 0, 'aucun fichier data/*.json trouvé');

// --- Portraits (champ facultatif `image` d'un événement) et panthéons nationaux ----
// Voir README, « Portraits » et « Panthéons nationaux ». Les règles vivent ici
// parce qu'une erreur y est silencieuse : un crédit faux, une année de
// naissance qui n'est pas celle de l'événement, un portrait qui n'existe pas
// ne se voient qu'en ouvrant la bonne fiche.
const PANTHEON_ID = /^pan_[a-z]{2}$/;
// Même motif que js/app.js: PORTRAIT_SRC_PATTERN : ce que le jeu accepte d'afficher.
const PORTRAIT_SRC = /^assets\/portraits\/[A-Za-z0-9_.-]+\.jpg$/;
// Licences libres seulement (voir scripts/fetch_portraits.py) : jamais « NC »
// (l'app est distribuée sur l'App Store), jamais « ND » (les images sont recadrées).
const ALLOWED_LICENCE = /^(Domaine public|CC0 \(domaine public\)|CC BY(-SA)? \d\.\d( [A-Z]{2,3})?)$/;
const PORTRAIT_WIDTH = 320;
const PORTRAIT_HEIGHT = 400;
const PORTRAIT_MAX_BYTES = 70 * 1024;

// Dimensions d'un JPEG, lues dans son en-tête (marqueurs SOFn) : pas de dépendance.
function jpegSize(buffer) {
    if (buffer.readUInt16BE(0) !== 0xFFD8) return null;
    let offset = 2;
    while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xFF) return null;
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        if (marker >= 0xC0 && marker <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(marker)) {
            return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        }
        offset += 2 + length;
    }
    return null;
}

// Nombre de phrases : « av. J.-C. » ne termine pas la sienne.
function sentenceCount(text) {
    const protectedText = text.replace(/av\. J\.-C\./g, 'av J-C');
    return protectedText.trim().split(/(?<=[.!?])\s+(?=[A-ZÉÈÀÂÎ«])/).filter(Boolean).length;
}


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
        const themesById = new Map();
        const biographyRefs = [];
        let themeCount = 0;
        let eventCount = 0;

        function checkImage(evt) {
            const where = `${file}: événement "${evt.id}"`;
            const image = evt.image;
            assert.ok(image && typeof image === 'object', `${where}: "image" doit être un objet`);
            for (const field of ['src', 'legende', 'auteur', 'licence', 'source']) {
                assert.ok(typeof image[field] === 'string' && image[field].length > 0, `${where}: image.${field} manquant`);
            }
            assert.match(image.src, PORTRAIT_SRC, `${where}: image.src hors de assets/portraits/ (le jeu ne l'afficherait pas)`);
            assert.match(image.licence, ALLOWED_LICENCE, `${where}: licence « ${image.licence} » non autorisée`);
            assert.match(image.source, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, `${where}: image.source doit être la page du fichier sur Commons`);
            const absolute = path.join(repoRoot, image.src);
            assert.ok(fs.existsSync(absolute), `${where}: ${image.src} introuvable`);
            const buffer = fs.readFileSync(absolute);
            assert.ok(buffer.length <= PORTRAIT_MAX_BYTES, `${where}: ${image.src} pèse ${buffer.length} octets (max ${PORTRAIT_MAX_BYTES})`);
            const size = jpegSize(buffer);
            assert.deepEqual(size, { width: PORTRAIT_WIDTH, height: PORTRAIT_HEIGHT }, `${where}: ${image.src} doit faire ${PORTRAIT_WIDTH}×${PORTRAIT_HEIGHT}`);
        }

        // Un panthéon national : une naissance par personnage. Chaque règle ici
        // est une erreur déjà possible à la main (voir scripts/build_pantheon.py,
        // qui les applique avant d'écrire, et dont data/fr.json doit rester le reflet).
        function checkPantheon(theme) {
            const where = `${file}: panthéon "${theme.id}"`;
            assert.ok(Array.isArray(theme.axeOrder) && theme.axeOrder.length >= 2, `${where}: axeOrder manquant`);
            const used = new Set();
            for (const evt of theme.events) {
                assert.ok(evt.id.startsWith(theme.id + '_'), `${where}: l'id "${evt.id}" doit commencer par ${theme.id}_`);
                assert.match(evt.titre, /^Naissance d/, `${where}: "${evt.id}" — le titre dit une naissance`);
                assert.ok(theme.axeOrder.includes(evt.axe), `${where}: "${evt.id}" a un axe inconnu « ${evt.axe} »`);
                used.add(evt.axe);
                const opening = /^(.+?) \(([^()]+)\) (?:est|était) /.exec(evt.description);
                assert.ok(opening, `${where}: "${evt.id}" — la description doit commencer par « Nom (naissance-décès) est… »`);
                const years = /^(?:vers )?(\d{1,4})-(?:vers )?(\d{1,4})( av\. J\.-C\.)?$/.exec(opening[2]);
                assert.ok(years, `${where}: "${evt.id}" — dates illisibles « ${opening[2]} »`);
                const born = years[3] ? -Number(years[1]) : Number(years[1]);
                assert.equal(born, evt.date, `${where}: "${evt.id}" — la phrase d'ouverture dit ${born}, la date de l'événement ${evt.date}`);
                assert.equal(sentenceCount(evt.description), 3, `${where}: "${evt.id}" — trois phrases attendues`);
                assert.ok(evt.image, `${where}: "${evt.id}" sans portrait — chaque personnage a le sien`);
                assert.equal(evt.image.src, `assets/portraits/${evt.id}.jpg`, `${where}: "${evt.id}" — le portrait porte l'id de l'événement`);
            }
            for (const axe of theme.axeOrder) assert.ok(used.has(axe), `${where}: l'axe « ${axe} » n'a aucun personnage`);
            for (const id of theme.essentiel || []) {
                assert.ok(theme.events.some((evt) => evt.id === id), `${where}: incontournable "${id}" inconnu`);
            }
        }

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
                    themesById.set(theme.id, theme);
                    assert.ok(Array.isArray(theme.events) && theme.events.length > 0, `${file}: thème "${theme.id}" sans événements (${here})`);

                    const seenEventIds = new Set();
                    for (const evt of theme.events) {
                        eventCount++;
                        assert.ok(typeof evt.id === 'string' && evt.id.length > 0, `${file}: thème "${theme.id}" a un événement sans "id"`);
                        assert.ok(!seenEventIds.has(evt.id), `${file}: id d'événement dupliqué "${evt.id}" dans le thème "${theme.id}" (les points faibles/SRS sont indexés par cet id)`);
                        seenEventIds.add(evt.id);
                        assert.ok(typeof evt.date === 'number' && Number.isFinite(evt.date), `${file}: événement "${evt.id}" a une "date" invalide`);
                        assert.ok(typeof evt.titre === 'string' && evt.titre.length > 0, `${file}: événement "${evt.id}" sans "titre"`);
                        if (evt.image !== undefined) checkImage(evt);
                        if (evt.biographie !== undefined) biographyRefs.push({ theme, evt });
                    }

                    if (PANTHEON_ID.test(theme.id)) checkPantheon(theme);

                    if (theme.carteMentale) checkMindMap(theme, seenEventIds);
                }
            } else if (Array.isArray(node.subcategories)) {
                for (const child of node.subcategories) walk(child, here);
            } else {
                assert.fail(`${file}: nœud "${here}" n'a ni "themes" ni "subcategories"`);
            }
        }

        for (const category of doc.categories) walk(category, file);

        // Un renvoi vers une biographie doit viser un thème qui existe — et, pour
        // un panthéon, dont la date de naissance est la même : une même personne
        // ne peut pas naître deux fois.
        for (const { theme, evt } of biographyRefs) {
            const bio = themesById.get(evt.biographie);
            assert.ok(bio, `${file}: "${evt.id}" renvoie à une biographie inconnue « ${evt.biographie} »`);
            if (PANTHEON_ID.test(theme.id)) {
                const born = Math.min(...bio.events.map((e) => e.date));
                assert.equal(born, evt.date, `${file}: "${evt.id}" naît en ${evt.date}, sa biographie « ${evt.biographie} » en ${born}`);
            }
        }

        assert.equal(themeCount, doc.totalThemes, `${file}: totalThemes (${doc.totalThemes}) ne correspond pas au nombre réel de thèmes (${themeCount})`);
        assert.equal(eventCount, doc.totalEvents, `${file}: totalEvents (${doc.totalEvents}) ne correspond pas au nombre réel d'événements (${eventCount})`);
    });
}
