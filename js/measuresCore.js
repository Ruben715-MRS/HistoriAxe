// =========================================================================
// === HISTORIAXE — POIDS ET MESURES BIBLIQUES (calculs purs, sans DOM) ===
// =========================================================================
// Trois familles d'unités de la Bible et du Talmud — distances, volumes, monnaies — avec leur équivalent moderne. Chaque unité est
// une taille exprimée dans l'unité de base de sa famille (le doigt, l'œuf, la proutah) ; les rapports entre unités bibliques sont donc
// exacts, et seule la conversion vers nos mesures (mètres, litres, grammes) porte une approximation.
//
// Références : les tableaux des livres (monnaies : le tableau « Vaut / Cette monnaie » ; solides : les œufs, ou bétsim) ; les valeurs
// modernes sont celles de l'opinion la plus répandue (Rav Naé) ; pour les distances, l'opinion du 'Hazon Ich (coudée de 57,6 cm) est
// proposée à côté. Voir js/app/biblical-measures.js pour l'écran.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') module.exports = factory();
    else root.MeasuresCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // --- Distances : l'unité de base est le doigt (etzba). 1 coudée = 24 doigts. ------------------------------------------------
    // Deux opinions sur la longueur de la coudée : 48 cm (Rav Naé) ou 57,6 cm ('Hazon Ich) ; toutes les autres unités suivent.
    var DISTANCE_OPINIONS = { nae: { id: 'nae', fingerMetres: 0.02 }, hazon: { id: 'hazon', fingerMetres: 0.024 } };
    var MIL_WALK_MINUTES = 18; // un mil se marche en 18 minutes (avis de la majorité des décisionnaires)

    var DISTANCE_UNITS = [
        { id: 'etzba', group: 'biblical', size: 1 },        // doigt
        { id: 'tefach', group: 'biblical', size: 4 },       // palme
        { id: 'zeret', group: 'biblical', size: 12 },       // empan
        { id: 'amah', group: 'biblical', size: 24 },        // coudée
        { id: 'mil', group: 'biblical', size: 48000 },      // 2 000 coudées
        { id: 'parsa', group: 'biblical', size: 192000 },   // 4 mil
        { id: 'yom', group: 'biblical', size: 1920000 },    // journée de marche : 10 parsa
        { id: 'cm', group: 'modern', metres: 0.01 },
        { id: 'm', group: 'modern', metres: 1 },
        { id: 'km', group: 'modern', metres: 1000 }
    ];

    // --- Volumes : l'unité de base est l'œuf (bétsa). 1 épha = 432 œufs. ----------------------------------------------------------
    // Deux avis, chacun avec la valeur exacte de son œuf :
    //  - Rav Naé : œuf = 57,6 mL, donc épha = 432 × 0,0576 L = 24,8832 L (log 0,3456 L, hin 4,1472 L, homer 248,832 L) ;
    //  - 'Hazon Ich : épha = 43,0 L (œuf ≈ 99,5 mL, log ≈ 0,597 L, hin 7,2 L, homer 430 L).
    // Les rapports entre unités bibliques restent exacts dans les deux cas ; seul le passage aux litres dépend de l'avis.
    var EGGS_PER_EPHA = 432;
    var EPHA_LITRES = 24.8832;
    var VOLUME_OPINIONS = { nae: { id: 'nae', eppaLitres: EPHA_LITRES }, hazon: { id: 'hazon', eppaLitres: 43.0 } };
    var VOLUME_UNITS = [
        { id: 'betsa', group: 'biblical', size: 1 },
        { id: 'log', group: 'biblical', size: 6 },
        { id: 'hin', group: 'biblical', size: 72, liquid: true },    // 12 log
        { id: 'kav', group: 'biblical', size: 24 },                  // 4 log
        { id: 'omer', group: 'biblical', size: 43.2 },               // 1/10 d'épha
        { id: 'sea', group: 'biblical', size: 144 },                 // 6 kav
        { id: 'epha', group: 'biblical', size: 432 },                // 3 séa
        { id: 'bath', group: 'biblical', size: 432, liquid: true },  // l'épha des liquides
        { id: 'lethech', group: 'biblical', size: 2160 },            // 5 épha
        { id: 'homer', group: 'biblical', size: 4320 },              // 10 épha (cor)
        { id: 'ml', group: 'modern', litres: 0.001 },
        { id: 'l', group: 'modern', litres: 1 }
    ];

    // --- Monnaies : l'unité de base est la proutah. Ce sont des POIDS d'argent : le chékel pèse ≈ 11,4 g. ---------------------------
    var SHEKEL_GRAMS = 11.4;
    var PROUTOT_PER_SHEKEL = 640;
    var MONEY_UNITS = [
        { id: 'proutah', group: 'biblical', size: 1 },
        { id: 'maah', group: 'biblical', size: 32 },             // ma'a / guéra / agoura : 20 par chékel
        { id: 'dinar', group: 'biblical', size: 160 },           // dinar / zouz / zahouv : 4 par chékel
        { id: 'beka', group: 'biblical', size: 320 },            // béka / demi-chékel
        { id: 'shekel', group: 'biblical', size: 640 },          // chékel / séla
        { id: 'mane', group: 'biblical', size: 16000 },          // 25 chékels
        { id: 'mane_sacre', group: 'biblical', size: 32000 },    // 50 chékels
        { id: 'talent', group: 'biblical', size: 960000 },       // 1 500 chékels
        { id: 'talent_sacre', group: 'biblical', size: 1920000 },// 3 000 chékels
        { id: 'kg', group: 'modern', grams: 1000 },
        { id: 'g', group: 'modern', grams: 1 }
    ];

    var CATEGORIES = {
        distances: { units: DISTANCE_UNITS, opinions: ['nae', 'hazon'], defaultUnit: 'amah' },
        volumes: { units: VOLUME_UNITS, opinions: ['nae', 'hazon'], defaultUnit: 'epha' },
        money: { units: MONEY_UNITS, opinions: [], defaultUnit: 'shekel' }
    };

    function unitsOf(category) { return CATEGORIES[category].units; }

    function findUnit(category, id) {
        var list = unitsOf(category);
        for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
        return null;
    }

    // Combien vaut une unité dans l'unité du système international de sa famille (mètres, litres, grammes).
    function factor(category, id, opinion) {
        var u = findUnit(category, id);
        if (!u) return null;
        if (category === 'distances') {
            if (u.group === 'modern') return u.metres;
            var op = DISTANCE_OPINIONS[opinion] || DISTANCE_OPINIONS.nae;
            return u.size * op.fingerMetres;
        }
        if (category === 'volumes') {
            if (u.group === 'modern') return u.litres;
            var vop = VOLUME_OPINIONS[opinion] || VOLUME_OPINIONS.nae;
            return u.size * vop.eppaLitres / EGGS_PER_EPHA;
        }
        if (u.group === 'modern') return u.grams;
        return u.size * SHEKEL_GRAMS / PROUTOT_PER_SHEKEL;
    }

    // Convertit `value` (dans l'unité `fromId`) vers toutes les unités de la famille. `approx` : la ligne mêle une unité biblique et
    // une unité moderne, donc la valeur est approchée ; entre deux unités bibliques, le rapport est exact.
    function convert(category, value, fromId, opinion) {
        var from = findUnit(category, fromId);
        var n = Number(value);
        if (!from || !isFinite(n)) return null;
        var base = n * factor(category, fromId, opinion);
        return unitsOf(category).map(function (u) {
            return { id: u.id, group: u.group, value: base / factor(category, u.id, opinion), approx: u.group !== from.group, isSource: u.id === fromId };
        });
    }

    // Le temps de marche d'une distance (en minutes) : un mil, soit 2 000 coudées, se marche en 18 minutes.
    function walkMinutes(metres, opinion) {
        var mil = factor('distances', 'mil', opinion);
        return metres / mil * MIL_WALK_MINUTES;
    }

    // Un nombre lisible : entier tel quel, sinon quatre chiffres significatifs, sans zéros inutiles.
    function formatNumber(value, lang) {
        if (!isFinite(value)) return '—';
        var loc = lang || 'fr';
        var abs = Math.abs(value);
        if (abs === 0) return '0';
        if (Number.isInteger(value) && abs < 1e12) return value.toLocaleString(loc);
        return Number(value.toPrecision(4)).toLocaleString(loc, { maximumSignificantDigits: 4 });
    }

    // « 2 h 12 », « 36 min », « 4 min 30 » : une durée en minutes.
    function formatDuration(minutes) {
        if (!isFinite(minutes) || minutes <= 0) return '';
        var total = Math.round(minutes);
        if (total < 1) return '< 1 min';
        var h = Math.floor(total / 60);
        var m = total % 60;
        if (h === 0) return m + ' min';
        return m ? h + ' h ' + (m < 10 ? '0' : '') + m : h + ' h';
    }

    // --- Les tableaux de référence des livres, tels quels, pour la leçon (et pour vérifier le calcul dans les tests). -------------

    // « Vaut / Cette monnaie » : combien de chaque monnaie (en ligne) vaut chaque monnaie en colonne. null = case vide du tableau.
    var MONEY_TABLE = {
        columns: ['talent_sacre', 'talent', 'mane_sacre', 'mane', 'shekel', 'beka', 'dinar', 'maah'],
        rows: [
            { id: 'talent', cells: [2, null, null, null, null, null, null, null] },
            { id: 'mane_sacre', cells: [60, 30, null, null, null, null, null, null] },
            { id: 'mane', cells: [120, 60, 2, null, null, null, null, null] },
            { id: 'shekel', cells: [3000, 1500, 50, 25, null, null, null, null] },
            { id: 'beka', cells: [6000, 3000, 100, 50, 2, null, null, null] },
            { id: 'dinar', cells: [12000, 6000, 200, 100, 4, 2, null, null] },
            { id: 'maah', cells: [60000, 30000, 1000, 500, 20, 10, 5, null] },
            { id: 'proutah', cells: [1920000, 960000, 32000, 16000, 640, 320, 160, 32] }
        ]
    };

    // Les solides, en œufs (bétsim) : pour chaque unité, ce qu'elle vaut dans les plus petites, tel que le donne le livre.
    // Chaque relation : [unité, nombre, texte affiché] (les fractions s'écrivent comme dans le livre).
    var VOLUME_TABLE = [
        { id: 'betsa', rels: [] },
        { id: 'log', rels: [['betsa', 6, '6']] },
        { id: 'kav', rels: [['betsa', 24, '24'], ['log', 4, '4']] },
        { id: 'omer', rels: [['betsa', 43.2, '43⅕'], ['log', 7.2, '7⅕'], ['kav', 1.8, '1⅘']] },
        { id: 'sea', rels: [['betsa', 144, '144'], ['log', 24, '24'], ['kav', 6, '6'], ['omer', 10 / 3, '3⅓']] },
        { id: 'epha', rels: [['betsa', 432, '432'], ['log', 72, '72'], ['kav', 18, '18'], ['omer', 10, '10'], ['sea', 3, '3']] }
    ];

    // Les distances : ce que chaque unité vaut dans la précédente.
    var DISTANCE_CHAIN = [
        { id: 'tefach', per: 'etzba', n: 4 },
        { id: 'zeret', per: 'tefach', n: 3 },
        { id: 'amah', per: 'tefach', n: 6 },
        { id: 'mil', per: 'amah', n: 2000 },
        { id: 'parsa', per: 'mil', n: 4 },
        { id: 'yom', per: 'parsa', n: 10 }
    ];

    return {
        DISTANCE_OPINIONS: DISTANCE_OPINIONS,
        MIL_WALK_MINUTES: MIL_WALK_MINUTES,
        EPHA_LITRES: EPHA_LITRES,
        SHEKEL_GRAMS: SHEKEL_GRAMS,
        CATEGORIES: CATEGORIES,
        MONEY_TABLE: MONEY_TABLE,
        VOLUME_TABLE: VOLUME_TABLE,
        DISTANCE_CHAIN: DISTANCE_CHAIN,
        unitsOf: unitsOf,
        findUnit: findUnit,
        factor: factor,
        convert: convert,
        walkMinutes: walkMinutes,
        formatNumber: formatNumber,
        formatDuration: formatDuration
    };
});
