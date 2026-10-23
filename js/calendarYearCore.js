// =========================================================================
// === LE CALENDRIER ANNUEL — RÈGLES (outil de la boîte à outils) ===
// =========================================================================
// Les 366 jours d'un calendrier civil (le 29 février compris), chacun avec les fêtes qui tombent à cette date : les fêtes nationales des
// pays (données de assets/geo/countries-facts.json, champ `fete_jour` [mois, jour]) et les fêtes chrétiennes à date fixe du calendrier
// civil. Les fêtes mobiles (Pâques, l'Ascension, la Pentecôte, le mardi gras…) n'ont pas de jour fixe : elles ne sont pas listées.
// Pur, sans DOM : testé dans tests/calendarYearCore.test.js. Contenu en français seulement ; **à relire par un enseignant**.
//
// Un jour : { month, day, religious: [libellé], countries: [{ n, iso2 }] }. Le drapeau d'un pays s'affiche avec son nom (l'interface le
// fait avec la fonction `flagEmoji` de countriesCore.js, passée en paramètre pour que ce fichier reste sans dépendance).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.CalendarYearCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    var DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Les fêtes chrétiennes à date fixe (calendrier civil, rite latin ; le « saint » est celui du jour). { m, d, label }.
    var RELIGIOUS = [
        { m: 1, d: 1, label: 'Sainte Marie, Mère de Dieu' },
        { m: 1, d: 6, label: 'Épiphanie' },
        { m: 2, d: 2, label: 'Présentation du Seigneur (Chandeleur)' },
        { m: 3, d: 17, label: 'Saint Patrick' },
        { m: 3, d: 19, label: 'Saint Joseph' },
        { m: 3, d: 25, label: 'Annonciation' },
        { m: 4, d: 23, label: 'Saint Georges' },
        { m: 6, d: 24, label: 'Nativité de saint Jean-Baptiste' },
        { m: 6, d: 29, label: 'Saints Pierre et Paul' },
        { m: 8, d: 15, label: 'Assomption' },
        { m: 9, d: 29, label: 'Saint Michel Archange' },
        { m: 11, d: 1, label: 'Toussaint' },
        { m: 11, d: 2, label: 'Commémoration des fidèles défunts' },
        { m: 12, d: 6, label: 'Saint Nicolas' },
        { m: 12, d: 8, label: 'Immaculée Conception' },
        { m: 12, d: 25, label: 'Noël' },
        { m: 12, d: 26, label: 'Saint Étienne' }
    ];

    function monthName(month) {
        return MONTHS[month - 1];
    }

    // Les 366 jours, dans l'ordre. `facts` : les fiches des pays (countries-facts.json) ; une fête « null » n'est pas comptée.
    function yearDays(facts) {
        var days = [];
        for (var m = 1; m <= 12; m++) {
            for (var d = 1; d <= DAYS_IN_MONTH[m - 1]; d++) {
                var religious = RELIGIOUS.filter(function (r) { return r.m === m && r.d === d; }).map(function (r) { return r.label; });
                var countries = (facts || []).filter(function (c) {
                    return c.fete_jour && c.fete_jour[0] === m && c.fete_jour[1] === d;
                }).map(function (c) { return { n: c.n, iso2: c.iso2 }; })
                    .sort(function (a, b) { return a.n.localeCompare(b.n, 'fr'); });
                days.push({ month: m, day: d, religious: religious, countries: countries });
            }
        }
        return days;
    }

    // Le libellé d'une date : « 1er janvier », « 14 juillet ».
    function dateLabel(month, day) {
        return (day === 1 ? '1er' : String(day)) + ' ' + monthName(month);
    }

    return {
        MONTHS: MONTHS, RELIGIOUS: RELIGIOUS, yearDays: yearDays, dateLabel: dateLabel, monthName: monthName
    };
}));
