// =========================================================================
// === LES CITATIONS (règles de recherche, de tri et de validation) ===
// =========================================================================
// Un recueil de phrases qui ont marqué l'histoire, chacune avec son contexte, sa source et son degré de fiabilité. Tout est pur, sans
// DOM (l'écran est dans js/app/citations.js). Testé dans tests/citationsCore.test.js. Données : assets/citations/index.json (la liste
// des lots) et assets/citations/NN.json (un lot de citations). Contenu en français seulement ; **à relire par un enseignant**.
// La règle d'ajout est dans docs/citations.md.
//
//  - FIABILITÉ : chaque citation est « attestée » (une source précise la rapporte), « attribuée » (la tradition la prête à son auteur,
//    sans preuve ou longtemps après) ou « apocryphe » (l'auteur ne l'a pas dite). Hors « attestée », une note l'explique.
//  - ÉPOQUE : quatre bornes neutres (jusqu'en 500, 500-1500, 1500-1800, depuis 1800), comme les cartes historiques.
//  - LIENS : `naissance` est l'identifiant de la carte « Naissance de… » de l'auteur, `biographie` celui de son thème de biographie
//    (à défaut, c'est celui que porte la carte de naissance). Une citation sans auteur illustre n'en a pas, et c'est normal.
//  - ANNÉE : celle de la parole ou de la publication ; pour une phrase apocryphe, celle de sa première trace connue (`anneeNote` le dit).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.CitationsCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var RELIABILITY = [
        { id: 'attestee', label: 'Attestée', hint: 'Une source précise rapporte cette phrase.' },
        { id: 'attribuee', label: 'Attribuée', hint: "La tradition la prête à son auteur, sans preuve ou longtemps après." },
        { id: 'apocryphe', label: 'Apocryphe', hint: "Son auteur supposé ne l'a pas dite." }
    ];

    var THEMES = [
        { id: 'liberte', label: 'Liberté et droits' },
        { id: 'pouvoir', label: 'Pouvoir et politique' },
        { id: 'guerre', label: 'Guerre et résistance' },
        { id: 'savoir', label: 'Savoir et pensée' },
        { id: 'humain', label: 'Sagesse et condition humaine' }
    ];

    // Bornes incluses à droite : 500 est dans la première, 1500 dans la deuxième ; 1800 ouvre la dernière.
    var ERAS = [
        { id: 'avant500', label: "Jusqu'en 500", max: 500 },
        { id: '500-1500', label: 'Entre 500 et 1500', max: 1500 },
        { id: '1500-1800', label: 'Entre 1500 et 1800', max: 1799 },
        { id: 'depuis1800', label: 'Depuis 1800', max: Infinity }
    ];

    // « Édith » → « edith » ; « d’Alsace » → « d'alsace ».
    function normalize(text) {
        return String(text == null ? '' : text)
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[’`]/g, "'")
            .replace(/œ/g, 'oe')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function eraOf(year) {
        for (var i = 0; i < ERAS.length; i++) if (year <= ERAS[i].max) return ERAS[i].id;
        return ERAS[ERAS.length - 1].id;
    }

    // −479 → « 479 av. J.-C. » ; avec `vers` : « vers 480 av. J.-C. ». L'espace avant « av. » est insécable.
    function formatYear(c) {
        var n = Math.abs(c.annee);
        var text = (c.vers ? 'vers ' : '') + n + (c.annee < 0 ? ' av. J.-C.' : '');
        return c.anneeNote ? text + ' (' + c.anneeNote + ')' : text;
    }

    function labelOf(list, id) {
        var found = list.filter(function (x) { return x.id === id; })[0];
        return found ? found.label : '';
    }

    function haystackOf(c) {
        return normalize([c.texte, c.original, c.auteur, c.contexte, c.source && c.source.oeuvre].filter(Boolean).join(' '));
    }

    // Les critères sont combinés (et). Tous les mots de la recherche doivent se trouver, dans n'importe quel ordre, dans le texte, la
    // version originale, l'auteur, le contexte ou l'œuvre. Un critère vide ou « all » ne filtre pas. `repere` ne garde que les
    // citations marquées comme incontournables.
    function search(list, criteria) {
        var c = criteria || {};
        var words = normalize(c.query).split(' ').filter(Boolean);
        return list.filter(function (item) {
            if (c.era && c.era !== 'all' && eraOf(item.annee) !== c.era) return false;
            if (c.theme && c.theme !== 'all' && item.theme !== c.theme) return false;
            if (c.fiabilite && c.fiabilite !== 'all' && item.fiabilite !== c.fiabilite) return false;
            if (c.repere && !item.repere) return false;
            if (!words.length) return true;
            var hay = haystackOf(item);
            return words.every(function (w) { return hay.indexOf(w) !== -1; });
        });
    }

    function byDate(a, b) { return a.annee - b.annee || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); }

    // 'chrono' : de la plus ancienne à la plus récente ; 'alpha' : par nom de classement de l'auteur (Gaulle pour de Gaulle), puis par date.
    function sorted(list, order) {
        var copy = list.slice();
        if (order === 'alpha') {
            copy.sort(function (a, b) {
                var x = normalize(a.classement || a.auteur), y = normalize(b.classement || b.auteur);
                return x < y ? -1 : x > y ? 1 : byDate(a, b);
            });
        } else {
            copy.sort(byDate);
        }
        return copy;
    }

    // L'affichage par tranches : les `count` premières citations et ce qu'il en reste.
    function page(list, count) {
        return { items: list.slice(0, count), rest: Math.max(0, list.length - count) };
    }

    function indexById(list) {
        var map = new Map();
        list.forEach(function (c) { map.set(c.id, c); });
        return map;
    }

    // Rassemble les lots dans l'ordre de l'index. Les doublons d'identifiant sont gardés (le test d'intégrité les signale).
    function mergeLots(lots) {
        return lots.reduce(function (all, lot) { return all.concat((lot && lot.citations) || []); }, []);
    }

    function duplicateIds(list) {
        var seen = {}, dups = [];
        list.forEach(function (c) {
            if (seen[c.id] && dups.indexOf(c.id) === -1) dups.push(c.id);
            seen[c.id] = true;
        });
        return dups;
    }

    var ID_PATTERN = /^cit_[a-z0-9_]+$/;
    function isText(x) { return typeof x === 'string' && x.trim().length > 0; }

    // Les défauts d'une entrée, en clair ; un tableau vide veut dire qu'elle est valable. Ne regarde pas les liens (naissance, biographie) :
    // le test d'intégrité les compare à la base des thèmes.
    function validate(c) {
        var problems = [];
        if (!c || typeof c !== 'object') return ['entrée absente'];
        if (!ID_PATTERN.test(c.id || '')) problems.push('identifiant invalide (attendu : cit_ puis minuscules, chiffres et _)');
        if (!isText(c.texte)) problems.push('texte manquant');
        if (!isText(c.auteur)) problems.push('auteur manquant');
        if (!isText(c.contexte)) problems.push('contexte manquant');
        if (!Number.isInteger(c.annee) || c.annee === 0) problems.push("année invalide (entier signé, pas d'an 0)");
        if (!c.source || !isText(c.source.oeuvre)) problems.push('source manquante (source.oeuvre)');
        if (!RELIABILITY.some(function (r) { return r.id === c.fiabilite; })) problems.push('fiabilité inconnue');
        if (!THEMES.some(function (t) { return t.id === c.theme; })) problems.push('thème inconnu');
        if (c.fiabilite && c.fiabilite !== 'attestee' && !isText(c.note)) problems.push("une citation non attestée doit avoir une note qui l'explique");
        if (c.original !== undefined && !isText(c.langue)) problems.push("une version originale demande sa langue (`langue`)");
        if (c.vers !== undefined && typeof c.vers !== 'boolean') problems.push('vers doit être vrai ou faux');
        if (c.repere !== undefined && typeof c.repere !== 'boolean') problems.push('repere doit être vrai ou faux');
        return problems;
    }

    return {
        RELIABILITY: RELIABILITY, THEMES: THEMES, ERAS: ERAS,
        normalize: normalize, eraOf: eraOf, formatYear: formatYear, labelOf: labelOf,
        search: search, sorted: sorted, page: page, indexById: indexById, mergeLots: mergeLots,
        duplicateIds: duplicateIds, validate: validate
    };
}));
