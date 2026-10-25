// =========================================================================
// === HISTORIAXE — PACKS DE DONNÉES DÉCOUPÉS (squelette + fiches à la demande) ===
// =========================================================================
// Voir scripts/build_pack.js pour le format et ses raisons. Ce module charge le
// squelette d'un pack (tout l'arbre et tous les événements, sans le texte des
// fiches), puis apporte les `description` thème par thème, à l'ouverture d'une
// fiche. Il ne touche ni au DOM ni à `window` : testable sous `npm test`.
//
// Contrat pour le reste du code : un événement d'un pack découpé n'a PAS de
// `description` tant que `Pack.needsDescription(evt)` est vrai ; il porte `dl`
// (longueur du texte) pour qui n'a besoin que de la mesurer. Tout écran qui
// affiche ce texte appelle d'abord (ou après, en mettant à jour)
// `Pack.ensureDescriptions([...événements])`.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Pack = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var state = null;

    function* themesOf(node) {
        var themes = node.themes || [];
        for (var i = 0; i < themes.length; i++) yield themes[i];
        var subs = node.subcategories || [];
        for (var j = 0; j < subs.length; j++) yield* themesOf(subs[j]);
    }

    function indexCategories(categories) {
        var themeOfEvent = new Map();
        var themes = new Map();
        categories.forEach(function (category) {
            for (var theme of themesOf(category)) {
                themes.set(theme.id, theme);
                (theme.events || []).forEach(function (evt) { themeOfEvent.set(evt.id, theme); });
            }
        });
        return { themeOfEvent: themeOfEvent, themes: themes };
    }

    // Langues qui ont un pack découpé (data/pack/<lang>/, voir scripts/build_pack.js). Pour les autres, on ne
    // demande pas de manifeste : le navigateur journaliserait un 404 à chaque bascule vers cette langue.
    // tests/pack.test.js vérifie que la liste reste celle des dossiers de data/pack/.
    var SPLIT_PACK_LANGS = ['fr'];

    function url(lang, rel, h) {
        return 'data/pack/' + lang + '/' + rel + (h ? '?v=' + h : '');
    }

    // Charge le squelette de `lang`. Renvoie { categories, doc } ou null si cette
    // langue n'a pas de pack découpé (le chargeur retombe alors sur data/<lang>.json).
    async function load(lang, fetchFn) {
        fetchFn = fetchFn || (typeof fetch === 'function' ? fetch.bind(null) : null);
        if (!fetchFn) return null;
        var manifestRes;
        if (SPLIT_PACK_LANGS.indexOf(lang) === -1) return null;
        try { manifestRes = await fetchFn(url(lang, 'manifest.json')); } catch (e) { return null; }
        if (!manifestRes || !manifestRes.ok) return null;
        var manifest = await manifestRes.json();
        var skeletonRes = await fetchFn(url(lang, 'skeleton.json', manifest.skeleton));
        if (!skeletonRes.ok) throw new Error('skeleton ' + lang + ' : HTTP ' + skeletonRes.status);
        var doc = await skeletonRes.json();
        var index = indexCategories(doc.categories || []);
        state = {
            lang: lang, manifest: manifest, fetch: fetchFn,
            themeOfEvent: index.themeOfEvent, themes: index.themes,
            loaded: new Set(), inflight: new Map()
        };
        return { categories: doc.categories, doc: doc };
    }

    function isSplit() { return !!state; }

    function needsDescription(evt) {
        return !!(state && evt && evt.description === undefined && evt.dl > 0 && state.themeOfEvent.has(evt.id));
    }

    function loadTheme(theme) {
        if (state.loaded.has(theme.id)) return Promise.resolve();
        if (state.inflight.has(theme.id)) return state.inflight.get(theme.id);
        var current = state;
        var h = current.manifest.themes[theme.id];
        var p = current.fetch(url(current.lang, 'desc/' + theme.id + '.json', h))
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (texts) {
                if (state !== current) return; // la langue a changé entre-temps
                theme.events.forEach(function (evt) {
                    if (evt.description === undefined) evt.description = texts[evt.id] || '';
                });
                current.loaded.add(theme.id);
            })
            .catch(function () { /* hors ligne et jamais vu : la fiche reste sans texte, un nouvel essai est possible */ })
            .then(function () { current.inflight.delete(theme.id); });
        current.inflight.set(theme.id, p);
        return p;
    }

    // Garantit (autant que le réseau le permet) que les événements donnés ont
    // leur `description`. Ne rejette jamais : au pire le texte reste absent.
    function ensureDescriptions(events) {
        if (!state) return Promise.resolve();
        var wanted = new Map();
        (events || []).forEach(function (evt) {
            if (needsDescription(evt)) wanted.set(state.themeOfEvent.get(evt.id).id, state.themeOfEvent.get(evt.id));
        });
        return Promise.all(Array.from(wanted.values()).map(loadTheme)).then(function () { });
    }

    // Réchauffe le cache (service worker / HTTP) avec les fiches de tous les
    // thèmes pour le hors-ligne, SANS les garder en mémoire : 9 Mo de texte
    // ramenés dans le tas annuleraient le gain du découpage.
    async function prefetchAll(options) {
        if (!state) return 0;
        var concurrency = (options && options.concurrency) || 3;
        var current = state;
        var queue = Object.keys(current.manifest.themes);
        var done = 0;
        async function worker() {
            while (queue.length && state === current) {
                var id = queue.shift();
                try {
                    var res = await current.fetch(url(current.lang, 'desc/' + id + '.json', current.manifest.themes[id]));
                    if (res.ok) { await res.arrayBuffer(); done++; }
                } catch (e) { return; } // hors ligne : on s'arrête, on reprendra au prochain lancement
            }
        }
        await Promise.all(Array.from({ length: concurrency }, worker));
        return done;
    }

    function reset() { state = null; }

    return {
        load: load, isSplit: isSplit, needsDescription: needsDescription,
        ensureDescriptions: ensureDescriptions, prefetchAll: prefetchAll,
        indexCategories: indexCategories, reset: reset, splitPackLangs: SPLIT_PACK_LANGS
    };
}));
