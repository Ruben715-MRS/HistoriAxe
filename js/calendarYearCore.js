// =========================================================================
// === LE CALENDRIER ANNUEL — RÈGLES (outil de la boîte à outils) ===
// =========================================================================
// Les 366 jours d'un calendrier civil (le 29 février compris), chacun avec les fêtes qui tombent à cette date : les fêtes nationales des
// pays (données de assets/geo/countries-facts.json, champ `fete_jour` [mois, jour]) et les fêtes chrétiennes à date fixe du calendrier
// civil. Les fêtes mobiles (Pâques, l'Ascension, la Pentecôte…) et les fêtes juives (calendrier hébraïque, lunisolaire) changent d'une
// année à l'autre : elles ne sont ajoutées que pour une année donnée (`yearDays(facts, année)`). Pâques est calculée par l'algorithme de
// Meeus (calendrier grégorien) ; les fêtes juives par le calendrier hébraïque arithmétique (Reingold et Dershowitz, Calendrical
// Calculations). Sans année, le calendrier reste intemporel et ne les montre pas.
//
// Chaque fête porte son signe : ✝️ pour les fêtes chrétiennes, ✡️ (étoile de David) pour les fêtes juives, 🕎 (ménorah) pour Hanouka,
// ☪️ (croissant islamique) pour les fêtes musulmanes.
// Pur, sans DOM : testé dans tests/calendarYearCore.test.js. Contenu en français seulement ; **à relire par un enseignant**.
//
// Un jour : { month, day, religious: [libellé], countries: [{ n, iso2 | flag }] } (un pays porte son code ; une nation du Royaume-Uni, son emoji). Le drapeau d'un pays s'affiche avec son nom (l'interface le
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

    var CROSS = '\u271D\uFE0F';        // ✝️ croix chrétienne
    var STAR = '\u2721\uFE0F';         // ✡️ étoile de David
    var MENORAH = '\u{1F54E}';          // 🕎 ménorah (Hanouka)
    var CRESCENT = '\u262A\uFE0F';      // ☪️ croissant islamique

    // Les fêtes juives à date fixe dans le calendrier hébraïque : mois (nom du calendrier hébraïque), jour, libellé, signe.
    // Pourim tombe en Adar, ou en Adar II les années à deux Adar (voir hebrewLeap).
    var JEWISH = [
        { month: 'Tishri', day: 1, label: 'Roch Hachana', sign: STAR },
        { month: 'Tishri', day: 10, label: 'Yom Kippour', sign: STAR },
        { month: 'Tishri', day: 15, label: 'Souccot', sign: STAR },
        { month: 'Kislev', day: 25, label: 'Hanouka', sign: MENORAH },
        { month: 'Adar', day: 14, label: 'Pourim', sign: STAR },
        { month: 'Nisan', day: 15, label: 'Pessa\u2019h', sign: STAR },
        { month: 'Sivan', day: 6, label: 'Chavouot', sign: STAR },
        { month: 'Av', day: 9, label: 'Tisha B\u2019Av', sign: STAR }
    ];

    // Les fêtes musulmanes à date fixe dans le calendrier hégirien (lunaire) : mois, jour, libellé. Le calendrier arithmétique (civil) peut
    // différer d'un jour de l'observation locale de la lune ; c'est le cas de tous les calendriers calculés.
    var ISLAMIC = [
        { month: 1, day: 1, label: 'Nouvel an hégirien' },
        { month: 1, day: 10, label: 'Achoura' },
        { month: 3, day: 12, label: 'Mawlid' },
        { month: 7, day: 27, label: 'Isra et Miraj' },
        { month: 9, day: 1, label: 'Début du ramadan' },
        { month: 9, day: 27, label: 'Laylat al-Qadr' },
        { month: 10, day: 1, label: 'Aïd al-Fitr' },
        { month: 12, day: 10, label: 'Aïd al-Adha' }
    ];
    var ISLAMIC_EPOCH = 227015;      // 1er Muharram de l'an 1 de l'hégire (16 juillet 622, calendrier julien)

    // Le jour fixe d'une date hégirienne (calendrier arithmétique).
    function islamicToFixed(y, m, d) {
        return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + ISLAMIC_EPOCH - 1;
    }

    // Les fêtes musulmanes de l'année grégorienne `year` : une même fête revient chaque année hégirienne, ~11 jours plus tôt. On cherche
    // les années hégiriennes voisines et on garde les dates qui tombent dans `year`.
    function islamicFeasts(year) {
        var out = [];
        var start = Math.floor((year - 622) * 33 / 32) - 2;
        for (var h = start; h <= start + 4; h++) {
            ISLAMIC.forEach(function (f) {
                var g = fixedToGregorian(islamicToFixed(h, f.month, f.day));
                if (g.year === year) out.push({ month: g.month, day: g.day, label: f.label });
            });
        }
        return out;
    }

    // Le calendrier hébraïque (arithmétique) : le 1er Tishri d'une année, la durée des mois, et la conversion en jour grégorien.
    var HEBREW_EPOCH = -1373427;     // jour fixe du 1er Tishri de l'an 1
    var FIXED_UNIX_EPOCH = 719163;   // jour fixe du 1er janvier 1970

    function hebrewLeap(y) {
        return ((7 * y + 1) % 19) < 7;
    }

    function hebrewDelay1(y) {
        var months = Math.floor((235 * y - 234) / 19);
        var parts = 12084 + 13753 * months;
        var day = 29 * months + Math.floor(parts / 25920);
        if ((3 * (day + 1)) % 7 < 3) day += 1;
        return day;
    }

    function hebrewDelay2(y) {
        var last = hebrewDelay1(y - 1), present = hebrewDelay1(y), next = hebrewDelay1(y + 1);
        if (next - present === 356) return 2;
        if (present - last === 382) return 1;
        return 0;
    }

    // Le jour fixe du 1er Tishri de l'année hébraïque y.
    function hebrewNewYear(y) {
        return HEBREW_EPOCH + hebrewDelay1(y) + hebrewDelay2(y);
    }

    // Les mois d'une année hébraïque, dans l'ordre à partir de Tishri : [nom, longueur].
    function hebrewMonths(y) {
        var length = hebrewNewYear(y + 1) - hebrewNewYear(y);
        var heshvan = length % 10 === 5 ? 30 : 29;
        var kislev = length % 10 === 3 ? 29 : 30;
        var adar = hebrewLeap(y) ? [['Adar', 30], ['AdarII', 29]] : [['Adar', 29]];
        return [['Tishri', 30], ['Heshvan', heshvan], ['Kislev', kislev], ['Tevet', 29], ['Shevat', 30]]
            .concat(adar, [['Nisan', 30], ['Iyar', 29], ['Sivan', 30], ['Tamuz', 29], ['Av', 30], ['Elul', 29]]);
    }

    // Le jour fixe d'une date hébraïque.
    function hebrewToFixed(y, month, day) {
        var f = hebrewNewYear(y);
        var months = hebrewMonths(y);
        for (var i = 0; i < months.length; i++) {
            if (months[i][0] === month) return f + day - 1;
            f += months[i][1];
        }
        return null;
    }

    // Un jour fixe, en date grégorienne { month, day } (et l'année, pour contrôle).
    function fixedToGregorian(f) {
        var d = new Date((f - FIXED_UNIX_EPOCH) * 86400000);
        return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
    }

    // Les fêtes juives qui tombent dans l'année grégorienne `year`. Tishri, Kislev : dans l'année hébraïque year + 3761 ; Adar, Nisan,
    // Sivan, Av : dans year + 3760.
    function jewishFeasts(year) {
        return JEWISH.map(function (f) {
            var hy = (f.month === 'Tishri' || f.month === 'Kislev') ? year + 3761 : year + 3760;
            var month = f.month === 'Adar' && hebrewLeap(hy) ? 'AdarII' : f.month;
            var g = fixedToGregorian(hebrewToFixed(hy, month, f.day));
            return { month: g.month, day: g.day, year: g.year, label: f.label, sign: f.sign };
        }).filter(function (f) { return f.year === year; });
    }

    // Yom Haatzmaut, fête nationale d'Israël : le 5 iyar, célébrée depuis 1949. Règle de la célébration : quand le 5 iyar tombe un vendredi
    // ou un samedi (jour de shabbat), la fête est avancée au jeudi précédent (2025 : le 5 iyar était un samedi, 3 mai ; la fête a été
    // célébrée le jeudi 1er mai). Les autres jours ne sont pas déplacés. `israelIndependenceDay` renvoie le 5 iyar ;
    // `israelCelebrationDay` la date de la célébration.
    var ISRAEL_FIRST_YEAR = 1949;
    function israelIndependenceDay(year) {
        if (year < ISRAEL_FIRST_YEAR) return null;
        var g = fixedToGregorian(hebrewToFixed(year + 3760, 'Iyar', 5));
        return g.year === year ? g : null;
    }
    function israelCelebrationDay(year) {
        var g = israelIndependenceDay(year);
        if (!g) return null;
        var weekday = new Date(Date.UTC(g.year, g.month - 1, g.day)).getUTCDay();   // 0 = dimanche, 5 = vendredi, 6 = samedi
        if (weekday === 5) return addDays(g, -1);   // vendredi -> jeudi
        if (weekday === 6) return addDays(g, -2);   // samedi -> jeudi
        return g;
    }
    function addDays(g, n) {
        var d = new Date(Date.UTC(g.year, g.month - 1, g.day) + n * 86400000);
        return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
    }

    // Les journées des saints patrons des nations du Royaume-Uni (pas des fêtes nationales communes). Le drapeau est un emoji « sous-drapeau »
    // (séquence de balises) pour l'Angleterre, l'Écosse et le pays de Galles ; l'Irlande du Nord n'en a pas : son nom seul s'affiche.
    function regionFlag(code) {
        return String.fromCodePoint(0x1F3F4).concat([...code].map(function (c) { return String.fromCodePoint(0xE0000 + c.charCodeAt(0)); }).join(''), String.fromCodePoint(0xE007F));
    }
    var NATIONS = [
        { m: 3, d: 1, n: 'Pays de Galles', flag: regionFlag('gbwls') },
        { m: 3, d: 17, n: 'Irlande du Nord', flag: '' },
        { m: 4, d: 23, n: 'Angleterre', flag: regionFlag('gbeng') },
        { m: 11, d: 30, n: 'Écosse', flag: regionFlag('gbsct') }
    ];

    // Les fêtes mobiles, par rapport à Pâques (en jours). Le libellé porte le nom de la fête ; la date se calcule pour chaque année.
    var MOBILE = [
        { offset: -47, label: 'Mardi gras' },
        { offset: -46, label: 'Mercredi des Cendres' },
        { offset: 0, label: 'Pâques' },
        { offset: 39, label: 'Ascension' },
        { offset: 49, label: 'Pentecôte' },
        { offset: 60, label: 'Fête-Dieu' }
    ];

    // Le dimanche de Pâques d'une année (calendrier grégorien, algorithme de Meeus/Jones/Butcher). Renvoie { month, day }.
    function easterSunday(year) {
        var a = year % 19, b = Math.floor(year / 100), c = year % 100;
        var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
        var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
        var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
        var month = Math.floor((h + l - 7 * m + 114) / 31);
        var day = ((h + l - 7 * m + 114) % 31) + 1;
        return { month: month, day: day };
    }

    // Les fêtes mobiles d'une année : [{ month, day, label }], calculées à partir de Pâques (UTC : pas de décalage d'heure).
    function mobileFeasts(year) {
        var easter = easterSunday(year);
        var base = Date.UTC(year, easter.month - 1, easter.day);
        return MOBILE.map(function (f) {
            var d = new Date(base + f.offset * 86400000);
            return { month: d.getUTCMonth() + 1, day: d.getUTCDate(), label: f.label };
        });
    }

    function monthName(month) {
        return MONTHS[month - 1];
    }

    // Les 366 jours, dans l'ordre. `facts` : les fiches des pays (countries-facts.json) ; une fête « null » n'est pas comptée.
    // `year` (facultatif) : ajoute les fêtes mobiles de cette année, libellées « Pâques (2026) ».
    function yearDays(facts, year) {
        var days = [];
        var mobile = year ? mobileFeasts(year) : [];
        var jewish = year ? jewishFeasts(year) : [];
        var islamic = year ? islamicFeasts(year) : [];
        for (var m = 1; m <= 12; m++) {
            for (var d = 1; d <= DAYS_IN_MONTH[m - 1]; d++) {
                var religious = RELIGIOUS.filter(function (r) { return r.m === m && r.d === d; }).map(function (r) { return CROSS + ' ' + r.label; });
                mobile.forEach(function (f) {
                    if (f.month === m && f.day === d) religious.push(CROSS + ' ' + f.label + ' (' + year + ')');
                });
                jewish.forEach(function (f) {
                    if (f.month === m && f.day === d) religious.push(f.sign + ' ' + f.label + ' (' + year + ')');
                });
                islamic.forEach(function (f) {
                    if (f.month === m && f.day === d) religious.push(CRESCENT + ' ' + f.label + ' (' + year + ')');
                });
                var countries = (facts || []).filter(function (c) {
                    return c.fete_jour && c.fete_jour[0] === m && c.fete_jour[1] === d;
                }).map(function (c) { return { n: c.n, iso2: c.iso2 }; });
                if (year) {
                    var israel = israelCelebrationDay(year);
                    if (israel && israel.month === m && israel.day === d) countries.push({ n: 'Israël', iso2: 'IL', year: year });
                }
                NATIONS.forEach(function (x) {
                    if (x.m === m && x.d === d) countries.push({ n: x.n, iso2: null, flag: x.flag });
                });
                countries.sort(function (a, b) { return a.n.localeCompare(b.n, 'fr'); });
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
        MONTHS: MONTHS, RELIGIOUS: RELIGIOUS, MOBILE: MOBILE, JEWISH: JEWISH, easterSunday: easterSunday, mobileFeasts: mobileFeasts,
        hebrewLeap: hebrewLeap, hebrewNewYear: hebrewNewYear, hebrewToFixed: hebrewToFixed, fixedToGregorian: fixedToGregorian,
        jewishFeasts: jewishFeasts, islamicFeasts: islamicFeasts, israelCelebrationDay: israelCelebrationDay, islamicToFixed: islamicToFixed, CRESCENT: CRESCENT, israelIndependenceDay: israelIndependenceDay, CROSS: CROSS, STAR: STAR, MENORAH: MENORAH,
        yearDays: yearDays, dateLabel: dateLabel, monthName: monthName
    };
}));
