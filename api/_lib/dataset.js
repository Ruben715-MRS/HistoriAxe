// =========================================================================
// === HISTORIAXE API — CHARGEMENT DES BASES D'ÉVÉNEMENTS (data/*.json) ===
// =========================================================================
// Charge les mêmes fichiers que le client (data/<lang>.json) et les aplatit
// exactement comme getAllEventsWithLocation() dans js/app.js (parcours
// catégories → sous-catégories → thèmes → événements, dans l'ordre du
// fichier), pour que le tirage du Défi du jour calculé ici retombe
// bit-à-bit sur le même tirage que celui vu par le joueur.
//
// Les `require(...)` ci-dessous utilisent des chemins littéraux (et non une
// variable) : c'est nécessaire pour que le bundler de Vercel (@vercel/nft)
// détecte statiquement ces fichiers JSON et les embarque dans le paquet de
// la fonction serverless — un require dynamique risquerait de ne PAS être
// inclus au déploiement.

const DATASETS = {
    fr: require('../../data/fr.json'),
    en: require('../../data/en.json'),
    es: require('../../data/es.json'),
    de: require('../../data/de.json'),
    it: require('../../data/it.json'),
    ja: require('../../data/ja.json'),
};

const SUPPORTED_LANGS = Object.keys(DATASETS);

function flattenCategories(categories) {
    const out = [];
    function walk(node) {
        if (!node) return;
        if (node.subcategories) {
            node.subcategories.forEach(walk);
        } else if (node.themes) {
            node.themes.forEach((thm) => {
                if (!thm || !thm.events || thm.isCustom) return;
                thm.events.forEach((evt) => {
                    if (evt && evt.id != null && typeof evt.date === 'number' && !evt.isCustom) {
                        out.push({ id: String(evt.id), date: evt.date });
                    }
                });
            });
        }
    }
    (categories || []).forEach(walk);
    return out;
}

const eventsCache = new Map();

// Retourne [{id, date}] pour toute la base d'une langue (contenu officiel
// uniquement — les thèmes/événements personnalisés n'existent que dans le
// localStorage du joueur, jamais côté serveur, donc ne peuvent de toute
// façon pas faire partie du tirage officiel).
function loadLangEvents(lang) {
    if (!Object.prototype.hasOwnProperty.call(DATASETS, lang)) {
        const err = new Error('Langue non supportée : ' + lang);
        err.statusCode = 400;
        throw err;
    }
    if (eventsCache.has(lang)) return eventsCache.get(lang);
    const events = flattenCategories(DATASETS[lang].categories);
    eventsCache.set(lang, events);
    return events;
}

module.exports = { SUPPORTED_LANGS, loadLangEvents, flattenCategories };
