// Panthéons (Personnages illustres) et portraits : ce que les tests de schéma
// (data-schema.test.js) ne couvrent pas — les liens entre les fichiers, et entre
// les thèmes.
//
// Chaque test garde une décision de conception dont la rupture serait
// silencieuse :
//  - le Mode Carte n'a jamais le droit d'ouvrir un panthéon (il affiche la
//    description pendant la question) ;
//  - un personnage ne figure que dans UN panthéon : c'est la raison d'être des
//    thèmes de région (« Amérique hispanique », « Maghreb »), et une règle que
//    seule la lecture de tous les thèmes ensemble peut vérifier ;
//  - les portraits vivent dans un cache du service worker que le ménage des
//    mises à jour ne doit pas vider ;
//  - data/fr.json reflète scripts/pantheon/<pays>.json : retoucher le thème à
//    la main est la façon la plus sûre de le faire diverger de sa source ;
//  - le dossier des portraits ne garde aucune image qu'aucun événement ne cite.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function readJson(...parts) {
    return JSON.parse(fs.readFileSync(path.join(root, ...parts), 'utf8'));
}

function walkThemes(nodes, visit) {
    for (const node of nodes) {
        for (const theme of node.themes || []) visit(theme);
        if (node.subcategories) walkThemes(node.subcategories, visit);
    }
}

test('aucun panthéon n’est dans la carte des pays du Mode Carte', () => {
    // js/geoMap.js: collectGeoPool ne retient QUE les thèmes listés dans
    // theme-country-map.json. Y ajouter pan_fr ferait apparaître des questions
    // « où est née cette personne ? » dont la description donne la réponse
    // (« … (1802-1885) est un poète français ») — et dont le pays n'est de
    // toute façon pas toujours celui de la naissance (Marie Curie).
    const geoMap = readJson('assets', 'geo', 'theme-country-map.json');
    const pantheons = Object.keys(geoMap).filter((id) => /^pan_/.test(id));
    assert.deepEqual(pantheons, []);
});

function pantheonThemes() {
    const doc = readJson('data', 'fr.json');
    const category = doc.categories.find((c) => c.nom === 'Personnages illustres');
    assert.ok(category, 'catégorie « Personnages illustres » absente');
    const section = category.subcategories.find((c) => c.nom === 'Panthéons');
    assert.ok(section, 'sous-catégorie « Panthéons » absente');
    const all = [];
    walkThemes(doc.categories, (theme) => { if (/^pan_/.test(theme.id)) all.push(theme); });
    return { section, all };
}

test('les panthéons vivent tous dans « Personnages illustres > Panthéons », et seuls', () => {
    const { section, all } = pantheonThemes();
    assert.deepEqual(section.themes.map((t) => t.id).sort(), all.map((t) => t.id).sort(),
        'un thème pan_… hors de sa sous-catégorie, ou un intrus dans la sous-catégorie');
    assert.ok(section.themes.length >= 1, 'aucun panthéon dans la sous-catégorie');
});

test('un personnage ne figure que dans un seul panthéon', () => {
    // La règle de départ : « un personnage ne doit pas se retrouver dans deux
    // thèmes différents ». Trois clés pour la tenir, car la même personne peut
    // être écrite de deux façons : son article Wikipédia, sa biographie, et le
    // titre de sa fiche (« Naissance de Simón Bolívar »).
    const { all } = pantheonThemes();
    const seen = { wikipedia: new Map(), biographie: new Map(), titre: new Map() };
    const dupes = [];
    for (const theme of all) {
        for (const evt of theme.events) {
            for (const [key, value] of [['wikipedia', evt.wikipedia], ['biographie', evt.biographie], ['titre', evt.titre]]) {
                if (!value) continue;
                const previous = seen[key].get(value);
                if (previous) dupes.push(`${evt.id} et ${previous} (même ${key} : ${value})`);
                else seen[key].set(value, evt.id);
            }
        }
    }
    assert.deepEqual(dupes, []);
});

test('les panthéons se rangent par le nom de leur source (« France », « Amérique hispanique »)', () => {
    // Pas par le nom du thème : « Grandes figures des États-Unis » viendrait
    // après « …de France » (« de » < « des » < « du »), alors que États-Unis
    // se range avec les E. Le script de construction trie sur la source ;
    // ceci garde le résultat.
    const dir = path.join(root, 'scripts', 'pantheon');
    const names = {};
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
        const source = readJson('scripts', 'pantheon', file);
        assert.equal(source.code, path.basename(file, '.json'), `${file}: « code » doit être le nom du fichier`);
        names[`pan_${source.code}`] = source.nom;
    }
    const { section } = pantheonThemes();
    const key = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const expected = section.themes.map((t) => t.id)
        .sort((a, b) => (key(names[a]) < key(names[b]) ? -1 : key(names[a]) > key(names[b]) ? 1 : 0));
    assert.deepEqual(section.themes.map((t) => t.id), expected);
    assert.deepEqual(section.themes.map((t) => t.id).filter((id) => !names[id]), [],
        'un panthéon sans source dans scripts/pantheon/');
});

test('chaque portrait du dossier est cité par un événement, et inversement', () => {
    const dir = path.join(root, 'assets', 'portraits');
    const onDisk = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')) : [];
    const cited = new Set();
    for (const file of fs.readdirSync(path.join(root, 'data')).filter((f) => f.endsWith('.json'))) {
        const doc = readJson('data', file);
        walkThemes(doc.categories, (theme) => {
            for (const evt of theme.events) {
                if (evt.image) cited.add(path.basename(evt.image.src));
            }
        });
    }
    const orphelins = onDisk.filter((f) => !cited.has(f));
    assert.deepEqual(orphelins, [], 'des portraits que plus aucun événement ne cite alourdissent l’app pour rien');
    const manquants = [...cited].filter((f) => !onDisk.includes(f));
    assert.deepEqual(manquants, [], 'des événements citent un portrait absent du dossier');
});

test('le service worker garde les portraits dans un cache à part, épargné par le ménage', () => {
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    const nom = /const PORTRAIT_CACHE = '([^']+)'/.exec(sw);
    assert.ok(nom, 'PORTRAIT_CACHE absent de sw.js');
    // Un nom qui change à chaque version ferait jeter les portraits à chaque
    // mise à jour : le nom ne doit dépendre ni de CACHE_VERSION ni de DATA_CACHE.
    assert.ok(!/\$\{CACHE_VERSION\}/.test(sw.split('const PORTRAIT_CACHE')[1].split('\n')[0]),
        'le nom du cache des portraits ne doit pas porter la version de l’app');
    assert.match(sw, /key !== PORTRAIT_CACHE/, 'activate purgerait le cache des portraits avec les anciens');
    assert.match(sw, /url\.pathname\.includes\('\/assets\/portraits\/'\)/, 'aucune route dédiée aux portraits dans fetch');
    // La route des portraits doit passer AVANT la règle générale (réseau d'abord),
    // sans quoi elle ne serait jamais atteinte.
    assert.ok(sw.indexOf("'/assets/portraits/'") < sw.indexOf('Requêtes standards App Shell'),
        'la route des portraits doit précéder la règle générale');
});

test('data/fr.json est à jour avec chaque source de panthéon (scripts/pantheon/*.json)', (t) => {
    const probe = spawnSync('python3', ['--version']);
    if (probe.error) {
        t.skip('python3 indisponible : vérification de la source ignorée');
        return;
    }
    const dir = path.join(root, 'scripts', 'pantheon');
    const sources = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
    assert.ok(sources.length > 0, 'aucune source de panthéon : scripts/pantheon/ est vide');
    for (const source of sources) {
        const pays = path.basename(source, '.json');
        const run = spawnSync('python3', ['-I', path.join('scripts', 'build_pantheon.py'), pays, '--verify'],
            { cwd: root, encoding: 'utf8' });
        assert.equal(run.status, 0, `${source} : ${run.stdout}${run.stderr}`);
    }
});
