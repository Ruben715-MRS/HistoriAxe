// Découpe un pack de données volumineux (data/<lang>.json) en fichiers
// servis à la demande — `npm run build:pack`. Les fichiers produits sont
// COMMITÉS (le site est servi tel quel, sans étape de build côté serveur, et
// les tests de bout en bout le lisent depuis le dépôt) ; tests/pack.test.js
// échoue si l'on a modifié data/<lang>.json sans relancer cette commande.
//
// Pourquoi : `fr.json` pèse 14 Mo minifié (4 Mo compressé) et rien ne
// s'affichait avant de l'avoir téléchargé et lu en entier. 62 % de ce poids
// est le texte des fiches (`description`), qu'on ne lit qu'à l'ouverture d'une
// fiche. Le pack est donc coupé en deux niveaux :
//
//   data/pack/<lang>/skeleton.json   l'arbre complet, tous les événements,
//                                    SANS `description` (remplacée par `dl`,
//                                    sa longueur : l'Atlas s'en sert pour
//                                    classer les fiches sans la charger) — ~5 Mo,
//                                    ~0,9 Mo compressé
//   data/pack/<lang>/desc/<thème>.json   { idÉvénement: description } d'UN thème
//   data/pack/<lang>/manifest.json   empreintes du squelette et de chaque thème
//
// Tout le code qui lit titres, dates, axes, portraits, liens Wikipédia reste
// donc synchrone et inchangé ; seul le texte des fiches arrive plus tard
// (js/pack.js). Les URL portent l'empreinte (`?v=`) : le service worker peut
// les garder indéfiniment sans jamais servir une version périmée.
//
// Seuls les packs de plus de 1 Mo sont découpés ; les packs de démonstration
// (en, es, de, it, ja) restent des fichiers uniques.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PACK_DIR = path.join(DATA_DIR, 'pack');
const MIN_BYTES = 1024 * 1024;

const hash = (text) => crypto.createHash('sha1').update(text).digest('hex').slice(0, 10);
const json = (value) => JSON.stringify(value);

function* themesOf(node) {
    for (const theme of node.themes || []) yield theme;
    for (const child of node.subcategories || []) yield* themesOf(child);
}

// Renvoie Map<chemin relatif à data/pack, contenu> — sans rien écrire.
function buildPack(doc) {
    const files = new Map();
    const themes = {};
    const skeleton = JSON.parse(json(doc)); // copie profonde
    for (const category of skeleton.categories) {
        for (const theme of themesOf(category)) {
            if (!/^[A-Za-z0-9_-]+$/.test(theme.id)) throw new Error(`id de thème inutilisable comme nom de fichier : ${theme.id}`);
            const descriptions = {};
            for (const evt of theme.events) {
                if (typeof evt.description === 'string' && evt.description) {
                    descriptions[evt.id] = evt.description;
                    evt.dl = evt.description.length;
                }
                delete evt.description;
            }
            const text = json(descriptions);
            files.set(`desc/${theme.id}.json`, text);
            themes[theme.id] = hash(text);
        }
    }
    const skeletonText = json(skeleton);
    files.set('skeleton.json', skeletonText);
    files.set('manifest.json', json({
        v: 1,
        lang: doc.lang,
        skeleton: hash(skeletonText),
        themes
    }));
    return files;
}

function packableLangs() {
    return fs.readdirSync(DATA_DIR)
        .filter((f) => f.endsWith('.json') && fs.statSync(path.join(DATA_DIR, f)).size > MIN_BYTES)
        .map((f) => f.replace(/\.json$/, ''));
}

function writePack(lang) {
    const doc = JSON.parse(fs.readFileSync(path.join(DATA_DIR, lang + '.json'), 'utf8'));
    const files = buildPack(doc);
    const dir = path.join(PACK_DIR, lang);
    fs.rmSync(dir, { recursive: true, force: true });
    for (const [rel, content] of files) {
        const target = path.join(dir, rel);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
    }
    return files.size;
}

module.exports = { buildPack, packableLangs, PACK_DIR };

if (require.main === module) {
    for (const lang of packableLangs()) {
        console.log(`✓ data/pack/${lang}/ : ${writePack(lang)} fichiers`);
    }
}
