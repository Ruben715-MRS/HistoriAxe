// =========================================================================
// === HISTORIAXE — COMMANDEMENTS BIBLIQUES (données, sans DOM) ===
// =========================================================================
// Quatre listes, présentées selon la tradition juive et rabbinique, dans cet ordre : les sept lois de Noé (pour toute l'humanité), les dix
// commandements (le Décalogue), les trente-neuf travaux interdits le Chabbat, et les 613 commandements selon le décompte du Rambam (Maïmonide),
// classés en positifs (248) et négatifs (365).
//
// Pour les trois premières, ce fichier ne contient que la structure (les identifiants, l'ordre, les regroupements) : les textes (nom, verset ou
// source, explication) sont dans ui/fr.json, sous `tools.cmd_*`. Pour les 613, les énoncés et les versets sont dans js/commandments613Data.js ;
// ce fichier y ajoute les regroupements par thème, et la recherche. tests/commandmentsCore.test.js vérifie les effectifs de la tradition :
// 7, 10 et 39 (11 + 13 + 9 + 6 pour les travaux), 248 et 365. Voir js/app/commandments.js pour l'écran.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') module.exports = factory();
    else root.CommandmentsCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var DATA = typeof module === 'object' && typeof module.exports === 'object' ? require('./commandments613Data.js') : Commandments613Data;

    // Treize éléments, identifiants préfixés : f1…f13, i1…i13, m1…m13.
    function range13(prefix) {
        var out = [];
        for (var n = 1; n <= 13; n++) out.push(prefix + n);
        return out;
    }

    // Les travaux du Chabbat sont numérotés dans l'ordre de la Michna (Chabbat 7:2), de 1 à 39.
    function range(from, to) {
        var out = [];
        for (var n = from; n <= to; n++) out.push('m' + (n < 10 ? '0' : '') + n);
        return out;
    }

    var SETS = [
        {
            id: 'noah',
            icon: '🌈',
            count: 7,
            groups: [{ id: 'all', items: ['idolatry', 'blasphemy', 'bloodshed', 'relations', 'theft', 'limb', 'courts'] }]
        },
        {
            id: 'decalogue',
            icon: '🪨',
            count: 10,
            groups: [
                { id: 'god', items: ['d1', 'd2', 'd3', 'd4', 'd5'] },       // la première table : entre l'homme et Dieu
                { id: 'neighbor', items: ['d6', 'd7', 'd8', 'd9', 'd10'] }  // la seconde : entre l'homme et son prochain
            ]
        },
        {
            id: 'shabbat',
            icon: '🕯️',
            count: 39,
            groups: [
                { id: 'bread', items: range(1, 11) },    // du semis à la cuisson du pain
                { id: 'cloth', items: range(12, 24) },   // de la tonte du mouton au vêtement cousu
                { id: 'skin', items: range(25, 33) },    // de la chasse à l'écriture sur parchemin
                { id: 'build', items: range(34, 39) }    // construire, feu, transport
            ]
        },
        // Les 613 : pas d'éléments ici, ils viennent de js/commandments613Data.js (voir LISTS613).
        { id: 'mitzvot', icon: '📜', count: 613, kind: 'list613', groups: [] },
        // Mitsvot pratiques : trois petites listes, chacune un thème (d'où le menu déroulant par thème).
        {
            id: 'pratiques',
            icon: '🌿',
            count: 10,
            themeMenu: true,
            restartPerGroup: true,
            groups: [
                { id: 'women', items: ['hallah', 'nidda', 'ner'] },
                { id: 'pesah', items: ['pesah', 'matsa', 'maror'] },
                { id: 'soukkot', items: ['etrog', 'lulav', 'hadass', 'arava'] }
            ]
        },
        // Principes et textes : ce ne sont pas des mitsvot. Chaque thème recommence à 1, comme les mitsvot pratiques.
        {
            id: 'principes',
            icon: '📖',
            count: 58,
            themeMenu: true,
            restartPerGroup: true,
            groups: [
                { id: 'faith', items: range13('f') },
                { id: 'hillel', items: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7'] },
                { id: 'ishmael', items: range13('i') },
                { id: 'mercy', items: range13('m') },
                { id: 'psoukim', items: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12'] }
            ]
        }
    ];

    // Les 613 commandements : deux listes, les positifs (de 1 à 248) et les négatifs (de 1 à 365), regroupées par thème. Chaque regroupement
    // couvre une plage de numéros ; les plages se suivent sans trou. Le titre de chaque regroupement est dans ui/fr.json :
    // tools.cmd_mitzvot_<pos|neg>_group_<id>.
    var LISTS613 = {
        pos: {
            id: 'pos',
            data: DATA.POSITIVE,
            groups: [
                { id: 'god', from: 1, to: 10 },
                { id: 'torah', from: 11, to: 19 },
                { id: 'temple', from: 20, to: 38 },
                { id: 'offerings', from: 39, to: 62 },
                { id: 'sacrifices', from: 63, to: 91 },
                { id: 'vows', from: 92, to: 95 },
                { id: 'purity', from: 96, to: 113 },
                { id: 'consecrations', from: 114, to: 118 },
                { id: 'land', from: 119, to: 145 },
                { id: 'food', from: 146, to: 152 },
                { id: 'calendar', from: 153, to: 171 },
                { id: 'authority', from: 172, to: 193 },
                { id: 'neighbor', from: 194, to: 211 },
                { id: 'family', from: 212, to: 223 },
                { id: 'justice', from: 224, to: 248 }
            ]
        },
        neg: {
            id: 'neg',
            data: DATA.NEGATIVE,
            groups: [
                { id: 'idolatry', from: 1, to: 38 },
                { id: 'ways', from: 39, to: 47 },
                { id: 'nations', from: 48, to: 59 },
                { id: 'name', from: 60, to: 66 },
                { id: 'temple', from: 67, to: 88 },
                { id: 'offerings', from: 89, to: 128 },
                { id: 'holyfood', from: 129, to: 154 },
                { id: 'vows', from: 155, to: 157 },
                { id: 'priests', from: 158, to: 171 },
                { id: 'food', from: 172, to: 201 },
                { id: 'nazir', from: 202, to: 209 },
                { id: 'land', from: 210, to: 229 },
                { id: 'money', from: 230, to: 242 },
                { id: 'theft', from: 243, to: 270 },
                { id: 'justice', from: 271, to: 296 },
                { id: 'neighbor', from: 297, to: 311 },
                { id: 'authority', from: 312, to: 319 },
                { id: 'shabbat', from: 320, to: 329 },
                { id: 'arayot', from: 330, to: 360 },
                { id: 'king', from: 361, to: 365 }
            ]
        }
    };

    function getSet(id) {
        for (var i = 0; i < SETS.length; i++) if (SETS[i].id === id) return SETS[i];
        return null;
    }

    // Tous les éléments d'une liste, dans l'ordre, avec leur numéro (1, 2, 3…). Par défaut, les numéros se suivent d'un thème à l'autre (c'est le
    // cas des travaux du Chabbat, numérotés selon la Michna) ; avec `restartPerGroup`, chaque thème recommence à 1.
    function itemsOf(setId) {
        var set = getSet(setId);
        if (!set) return [];
        var out = [];
        set.groups.forEach(function (g) {
            var start = set.restartPerGroup ? 0 : out.length;
            g.items.forEach(function (id, i) { out.push({ id: id, group: g.id, n: start + i + 1 }); });
        });
        return out;
    }

    // Les clés de texte dans ui/fr.json : tools.cmd_<liste>_<élément>_<champ>.
    function itemKey(setId, itemId, field) { return 'tools.cmd_' + setId + '_' + itemId + '_' + field; }

    // Les champs de texte d'un élément : son nom, son nom en lettres hébraïques (`he`, pour le bouton « א »), sa source (verset ou traité), son
    // explication ; les travaux du Chabbat ont aussi leur nom hébreu en transcription (`heb`).
    function fieldsOf(setId) { return setId === 'shabbat' ? ['name', 'heb', 'he', 'ref', 'text'] : ['name', 'he', 'ref', 'text']; }

    // La liste qui suit (ou précède) celle-ci, pour les boutons « suivant » ; null aux deux bouts.
    function neighbor(setId, step) {
        for (var i = 0; i < SETS.length; i++) {
            if (SETS[i].id === setId) return SETS[i + step] || null;
        }
        return null;
    }

    // --- Les 613 ---------------------------------------------------------------------------------------------------------------------------

    // Les listes que recouvre un choix : 'pos', 'neg', ou 'all' (les positifs, puis les négatifs).
    function kindsOf(kind) { return kind === 'all' ? ['pos', 'neg'] : LISTS613[kind] ? [kind] : []; }

    // Les commandements d'un choix ('pos', 'neg' ou 'all'), dans l'ordre : { kind, n, text, ref, group }. Le numéro est celui de la liste d'origine :
    // dans « tous », il y a donc deux commandements n° 1 (le premier positif, le premier négatif).
    function list613(kind) {
        var out = [];
        kindsOf(kind).forEach(function (k) {
            LISTS613[k].data.forEach(function (entry, i) {
                out.push({ kind: k, n: i + 1, text: entry[0], ref: entry[1], group: groupOf(k, i + 1) });
            });
        });
        return out;
    }

    // Le regroupement (identifiant) du commandement numéro n ; null hors de la liste.
    function groupOf(kind, n) {
        var list = LISTS613[kind];
        if (!list) return null;
        for (var i = 0; i < list.groups.length; i++) {
            if (n >= list.groups[i].from && n <= list.groups[i].to) return list.groups[i].id;
        }
        return null;
    }

    // Pour chercher sans se soucier des accents, des majuscules, des apostrophes ni des tirets : « pessa'h », « Pessah » et « PESSA’H » se valent.
    function normalize(s) {
        return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['’`\-]/g, '');
    }

    // Les commandements d'une liste qui répondent à une recherche : par mots (tous doivent s'y trouver), dans l'énoncé, le verset ou le numéro.
    function search613(kind, query) {
        var all = list613(kind);
        var words = normalize(query).split(/\s+/).filter(Boolean);
        if (!words.length) return all;
        return all.filter(function (c) {
            var hay = normalize(c.text + ' ' + c.ref + ' ' + c.n);
            return words.every(function (w) { return hay.indexOf(w) >= 0; });
        });
    }

    return {
        SETS: SETS, LISTS613: LISTS613,
        getSet: getSet, itemsOf: itemsOf, itemKey: itemKey, fieldsOf: fieldsOf, neighbor: neighbor,
        kindsOf: kindsOf, list613: list613, groupOf: groupOf, search613: search613, normalize: normalize
    };
});
