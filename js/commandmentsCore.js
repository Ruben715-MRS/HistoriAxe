// =========================================================================
// === HISTORIAXE — COMMANDEMENTS BIBLIQUES (données, sans DOM) ===
// =========================================================================
// Trois listes, présentées selon la tradition juive et rabbinique, dans cet ordre : les sept lois de Noé (pour toute l'humanité), les dix
// commandements (le Décalogue), les trente-neuf travaux interdits le Chabbat. Une quatrième viendra : les 613 commandements, selon le décompte
// du Rambam (Maïmonide), classés en positifs et négatifs.
//
// Ce fichier ne contient que la structure (les identifiants, l'ordre, les regroupements). Les textes (nom, verset ou source, explication) sont
// dans ui/fr.json, sous `tools.cmd_*` ; tests/commandmentsCore.test.js vérifie que chaque élément a les siens et que les effectifs sont ceux
// de la tradition : 7, 10 et 39 (11 + 13 + 9 + 6 pour les travaux). Voir js/app/commandments.js pour l'écran.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') module.exports = factory();
    else root.CommandmentsCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

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
        }
    ];

    function getSet(id) {
        for (var i = 0; i < SETS.length; i++) if (SETS[i].id === id) return SETS[i];
        return null;
    }

    // Tous les éléments d'une liste, dans l'ordre, avec leur numéro (1, 2, 3…).
    function itemsOf(setId) {
        var set = getSet(setId);
        if (!set) return [];
        var out = [];
        set.groups.forEach(function (g) {
            g.items.forEach(function (id) { out.push({ id: id, group: g.id, n: out.length + 1 }); });
        });
        return out;
    }

    // Les clés de texte dans ui/fr.json : tools.cmd_<liste>_<élément>_<champ>.
    function itemKey(setId, itemId, field) { return 'tools.cmd_' + setId + '_' + itemId + '_' + field; }

    // Les champs de texte d'un élément : son nom, sa source (verset ou traité), son explication ; les travaux du Chabbat ont aussi leur nom hébreu.
    function fieldsOf(setId) { return setId === 'shabbat' ? ['name', 'heb', 'ref', 'text'] : ['name', 'ref', 'text']; }

    // La liste qui suit (ou précède) celle-ci, pour les boutons « suivant » ; null aux deux bouts.
    function neighbor(setId, step) {
        for (var i = 0; i < SETS.length; i++) {
            if (SETS[i].id === setId) return SETS[i + step] || null;
        }
        return null;
    }

    return { SETS: SETS, getSet: getSet, itemsOf: itemsOf, itemKey: itemKey, fieldsOf: fieldsOf, neighbor: neighbor };
});
