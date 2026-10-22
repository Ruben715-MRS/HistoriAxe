// =========================================================================
// === LA BOÎTE À OUTILS — RÈGLES (convertisseurs, siècles, durées, périodes) ===
// =========================================================================
// Des outils, pas des jeux : on saisit une valeur, on lit le résultat et la règle qui l'explique. Tout est pur, sans DOM
// (les écrans sont dans js/app/tools.js). Testé dans tests/toolsCore.test.js. Contenu en français seulement ;
// **à relire par un enseignant**.
//
//  - CHIFFRES ROMAINS : nombre ↔ chiffres romains (de 1 à 3 999), forme canonique exigée (IIII n'est pas accepté, mais
//    on dit que c'est IV), décomposition (1994 = M + CM + XC + IV) et table des lettres pour la leçon.
//  - ÈRES : une année de notre calendrier dans les autres ères (js/eraConverter.js), avec les années où l'ère n'existe pas encore.
//  - SIÈCLES : année → siècle et siècle → années (le piège : l'an 1700 est du XVIIe siècle).
//  - DURÉES : combien d'années entre deux années, sans an 0 (de 44 av. J.-C. à 14 : 57 ans, pas 58) ; et année + durée.
//  - DATES : un jour précis dans les autres calendriers (julien, juif, musulman, persan, bouddhique, japonais, copte, républicain).
//  - PÉRIODES : les repères de l'Histoire scolaire, leurs bornes, ce qui est discuté, et la période d'une année.
//
// Les années sont des entiers signés : −44 = 44 av. J.-C. ; il n'y a pas d'année 0.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./eraConverter.js'));
    else root.ToolsCore = factory(root.EraConverter);
}(typeof self !== 'undefined' ? self : this, function (EraConverter) {
    'use strict';

    // =====================================================================================================
    // === CHIFFRES ROMAINS ===
    // =====================================================================================================
    var ROMAN_MAX = 3999;
    var ROMAN_TABLE = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    var ROMAN_VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    // Pour la leçon : la lettre, sa valeur, et un moyen de s'en souvenir.
    var ROMAN_LETTERS = [
        { letter: 'I', value: 1, hint: 'un doigt levé' },
        { letter: 'V', value: 5, hint: 'la main ouverte : le pouce d\'un côté, les quatre doigts de l\'autre' },
        { letter: 'X', value: 10, hint: 'deux V, l\'un à l\'envers' },
        { letter: 'L', value: 50, hint: 'la moitié d\'un C' },
        { letter: 'C', value: 100, hint: 'centum, « cent » en latin' },
        { letter: 'D', value: 500, hint: 'la moitié d\'un M' },
        { letter: 'M', value: 1000, hint: 'mille, en latin' }
    ];

    // 1994 → « MCMXCIV ». Hors de 1 à 3 999, on ne sait pas écrire (pas de zéro, pas de lettre au-delà de M) : null.
    function toRoman(n) {
        if (typeof n !== 'number' || n !== Math.floor(n) || n < 1 || n > ROMAN_MAX) return null;
        var out = '';
        ROMAN_TABLE.forEach(function (pair) { while (n >= pair[0]) { out += pair[1]; n -= pair[0]; } });
        return out;
    }

    // 1994 → [{ symbol: 'M', value: 1000 }, { 'CM', 900 }, { 'XC', 90 }, { 'IV', 4 }]
    function romanBreakdown(n) {
        var parts = [];
        if (toRoman(n) === null) return parts;
        ROMAN_TABLE.forEach(function (pair) {
            while (n >= pair[0]) { parts.push({ symbol: pair[1], value: pair[0] }); n -= pair[0]; }
        });
        return parts;
    }

    // « XIV » → { ok: true, value: 14 }. Une écriture qui n'est pas la forme usuelle (IIII, VX, IC) est refusée, avec la bonne forme :
    // { ok: false, reason: 'form', value: 4, canonical: 'IV' }. Autres raisons : 'empty', 'letters'.
    function fromRoman(text) {
        var s = String(text == null ? '' : text).replace(/\s+/g, '').toUpperCase();
        if (!s) return { ok: false, reason: 'empty' };
        if (/[^IVXLCDM]/.test(s)) return { ok: false, reason: 'letters' };
        var total = 0;
        for (var i = 0; i < s.length; i++) {
            var v = ROMAN_VALUES[s.charAt(i)];
            var next = ROMAN_VALUES[s.charAt(i + 1)];
            total += next && v < next ? -v : v;
        }
        var canonical = toRoman(total);
        if (canonical === s) return { ok: true, value: total, roman: s };
        return { ok: false, reason: 'form', value: total > 0 ? total : null, canonical: canonical };
    }

    // Ce que l'utilisateur a tapé : un nombre (« 1994 ») ou des chiffres romains (« mcmxciv »). Retour :
    //  { kind: 'empty' }, { kind: 'number', value, roman }, { kind: 'roman', value, roman },
    //  { kind: 'error', reason: 'letters' | 'form' | 'zero' | 'range' | 'decimal', canonical?, value? }
    function parseRomanInput(text) {
        var s = String(text == null ? '' : text).trim();
        if (!s) return { kind: 'empty' };
        if (/^[0-9]+$/.test(s.replace(/\s+/g, ''))) {
            var n = parseInt(s.replace(/\s+/g, ''), 10);
            if (n === 0) return { kind: 'error', reason: 'zero' };
            if (n > ROMAN_MAX) return { kind: 'error', reason: 'range', value: n };
            return { kind: 'number', value: n, roman: toRoman(n) };
        }
        if (/^[0-9]+[.,][0-9]+$/.test(s)) return { kind: 'error', reason: 'decimal' };
        var r = fromRoman(s);
        if (r.ok) return { kind: 'roman', value: r.value, roman: r.roman };
        return { kind: 'error', reason: r.reason, canonical: r.canonical, value: r.value };
    }

    // =====================================================================================================
    // === ANNÉES SIGNÉES, SIÈCLES, DURÉES ===
    // =====================================================================================================
    var YEAR_MIN = -9999;
    var YEAR_MAX = 9999;

    function yearText(y) { return y < 0 ? (-y) + ' av. J.-C.' : String(y); }

    // La saisie : un nombre positif et « avant J.-C. » ou non → l'année signée (null si 0 ou hors bornes).
    function signedYear(n, bc) {
        if (typeof n !== 'number' || n !== Math.floor(n) || n < 1 || n > YEAR_MAX) return null;
        return bc ? -n : n;
    }

    // L'année « astronomique », où l'an 1 av. J.-C. est l'an 0 : c'est elle qui se soustrait.
    function astro(y) { return y < 0 ? y + 1 : y; }
    function fromAstro(a) { return a <= 0 ? a - 1 : a; }

    // XVIIIe, Ier
    function ordinalRoman(n) { return toRoman(n) + (n === 1 ? 'er' : 'e'); }

    function centuryOfYear(y) {
        var n = Math.ceil(Math.abs(y) / 100);
        var bc = y < 0;
        return {
            n: n, bc: bc, roman: toRoman(n) || String(n),
            name: (toRoman(n) ? ordinalRoman(n) : n + 'e') + ' siècle' + (bc ? ' av. J.-C.' : ''),
            span: centurySpan(n, bc),
            round: Math.abs(y) % 100 === 0
        };
    }

    // Les années d'un siècle, dans l'ordre où on les lit : « 1701 à 1800 » ; avant J.-C., on compte à rebours : « 300 à 201 av. J.-C. ».
    function centurySpan(n, bc) {
        if (bc) return (n * 100) + ' à ' + ((n - 1) * 100 + 1) + ' av. J.-C.';
        return ((n - 1) * 100 + 1) + ' à ' + (n * 100);
    }

    // Un siècle donné par son numéro : { first, last } (les années signées, first étant la plus ancienne).
    function centuryYears(n, bc) {
        if (typeof n !== 'number' || n !== Math.floor(n) || n < 1 || n > 99) return null;
        return bc
            ? { first: -(n * 100), last: -((n - 1) * 100 + 1), name: ordinalRoman(n) + ' siècle av. J.-C.', span: centurySpan(n, true) }
            : { first: (n - 1) * 100 + 1, last: n * 100, name: ordinalRoman(n) + ' siècle', span: centurySpan(n, false) };
    }

    // L'explication d'un résultat « année → siècle », en une phrase.
    function centuryExplain(y) {
        var c = centuryOfYear(y);
        if (c.bc) {
            return c.round
                ? yearText(y) + ' est une année ronde : avant J.-C., elle OUVRE son siècle (on compte à rebours).'
                : 'Avant J.-C. on compte à rebours : ' + yearText(y) + ' est dans le ' + c.name + '.';
        }
        return c.round
            ? yearText(y) + ' est une année ronde : elle est la DERNIÈRE de son siècle, pas la première du suivant.'
            : 'On prend le nombre de centaines de l\'année et on ajoute un : ' + y + ' → ' + c.n + 'e siècle.';
    }

    // Années entre deux années signées, sans an 0. { years, earlier, later, crossesBc }
    function yearsBetween(a, b) {
        if (!a || !b) return null;
        var lo = Math.min(astro(a), astro(b)), hi = Math.max(astro(a), astro(b));
        return { years: hi - lo, earlier: fromAstro(lo), later: fromAstro(hi), crossesBc: fromAstro(lo) < 0 && fromAstro(hi) > 0 };
    }

    // 44 av. J.-C. + 57 ans = 14. `n` peut être négatif (reculer). Hors bornes : null.
    function addYears(y, n) {
        if (!y || typeof n !== 'number' || n !== Math.floor(n)) return null;
        var result = fromAstro(astro(y) + n);
        if (result < YEAR_MIN || result > YEAR_MAX) return null;
        return result;
    }

    // =====================================================================================================
    // === ÈRES (année → année) ===
    // =====================================================================================================
    // Les ères japonaises n'existent que pendant leur règne ; la république, de 1792 à 1805. Les années de changement d'ère
    // appartiennent aux deux ères voisines (le 30 juillet 1912, Meiji 45 devient Taishō 1).
    var ERA_RANGES = {
        republicaine: [1792, 1805], meiji: [1868, 1912], taisho: [1912, 1926], showa: [1926, 1989], heisei: [1989, 2019], reiwa: [2019, 9999]
    };
    var ERA_YEAR_MIN = -3800;
    var ERA_YEAR_MAX = 2100;
    var ERA_NOTES = {
        1868: 'L\'ère Meiji commence à l\'automne 1868 (elle est comptée comme ayant commencé au début de l\'année).',
        1912: 'Année de changement d\'ère : Meiji 45 jusqu\'au 29 juillet, puis Taishō 1.',
        1926: 'Année de changement d\'ère : Taishō 15 jusqu\'au 24 décembre, puis Shōwa 1.',
        1989: 'Année de changement d\'ère : Shōwa 64 jusqu\'au 7 janvier, puis Heisei 1.',
        2019: 'Année de changement d\'ère : Heisei 31 jusqu\'au 30 avril, puis Reiwa 1.'
    };

    // Pour une année signée `g`, une ligne par ère : { id, name, icon, rule, available, text, approx?, note? }.
    function convertYear(g) {
        if (typeof g !== 'number' || g !== Math.floor(g) || g === 0 || g < ERA_YEAR_MIN || g > ERA_YEAR_MAX) return null;
        return EraConverter.ERAS.map(function (era) {
            var row = { id: era.id, name: era.name, icon: era.icon, rule: era.rule, available: false, text: '' };
            var values = era.answers(g);
            var range = ERA_RANGES[era.id];
            if (range && (g < range[0] || g > range[1])) return row;
            if (era.id === 'hegire') {
                // Années lunaires : la règle est un calcul, à un an près ; le centre est la valeur la plus probable.
                var centre = values[1];
                if (centre < 1) return row;
                row.available = true; row.approx = true; row.values = [centre];
                row.text = 'vers ' + centre + ' (à un an près)';
                return row;
            }
            values = values.filter(function (v) { return v >= 1; });
            if (era.id === 'republicaine') values = values.filter(function (v) { return v <= 14; });
            if (!values.length) return row;
            row.available = true; row.values = values;
            row.text = values.length === 2 ? values[0] + ' ou ' + values[1] : String(values[0]);
            if (values.length === 2) row.note = 'Deux réponses : l\'ère change de numéro en cours d\'année (voir la règle).';
            if (ERA_NOTES[g] && range) row.note = ERA_NOTES[g];
            return row;
        });
    }

    // =====================================================================================================
    // === DATES (un jour dans les autres calendriers) ===
    // =====================================================================================================
    var DATE_YEAR_MIN = 1583;
    var DATE_YEAR_MAX = 2500;

    // Jour julien (nombre entier de jours) d'une date grégorienne, et date julienne d'un jour julien.
    function gregorianToJdn(y, m, d) {
        var a = Math.floor((14 - m) / 12);
        var yy = y + 4800 - a;
        var mm = m + 12 * a - 3;
        return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    }
    function jdnToJulian(j) {
        var c = j + 32082;
        var d = Math.floor((4 * c + 3) / 1461);
        var e = c - Math.floor(1461 * d / 4);
        var m = Math.floor((5 * e + 2) / 153);
        return {
            day: e - Math.floor((153 * m + 2) / 5) + 1,
            month: m + 3 - 12 * Math.floor(m / 10),
            year: d - 4800 + Math.floor(m / 10)
        };
    }

    var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    function dayText(d, m, y) { return (d === 1 ? '1er' : d) + ' ' + MONTHS[m - 1] + ' ' + y; }

    // Calendrier républicain : l'an I commence le 22 septembre 1792 ; les années commencent aux dates ci-dessous (l'équinoxe d'automne,
    // à Paris). Les années III, VII et XI ont six jours complémentaires (« sextiles »). Supprimé le 1er janvier 1806.
    var REPUBLICAN_STARTS = [
        [1792, 9, 22], [1793, 9, 22], [1794, 9, 22], [1795, 9, 23], [1796, 9, 22], [1797, 9, 22], [1798, 9, 22],
        [1799, 9, 23], [1800, 9, 23], [1801, 9, 23], [1802, 9, 23], [1803, 9, 24], [1804, 9, 23], [1805, 9, 23]
    ];
    var REPUBLICAN_MONTHS = ['vendémiaire', 'brumaire', 'frimaire', 'nivôse', 'pluviôse', 'ventôse', 'germinal', 'floréal', 'prairial', 'messidor', 'thermidor', 'fructidor'];
    var REPUBLICAN_EXTRA = ['jour de la Vertu', 'jour du Génie', 'jour du Travail', 'jour de l\'Opinion', 'jour des Récompenses', 'jour de la Révolution'];

    function republicanDate(y, m, d) {
        var jdn = gregorianToJdn(y, m, d);
        var start = REPUBLICAN_STARTS.map(function (s) { return gregorianToJdn(s[0], s[1], s[2]); });
        var last = gregorianToJdn(1805, 12, 31);
        if (jdn < start[0] || jdn > last) return null;
        var year = 0;
        for (var i = 0; i < start.length; i++) if (jdn >= start[i]) year = i;
        var offset = jdn - start[year];
        var roman = toRoman(year + 1);
        if (offset >= 360) {
            return { year: year + 1, text: 'le ' + REPUBLICAN_EXTRA[offset - 360] + ', an ' + roman };
        }
        var day = offset % 30 + 1;
        return { year: year + 1, text: (day === 1 ? '1er' : day) + ' ' + REPUBLICAN_MONTHS[Math.floor(offset / 30)] + ' an ' + roman };
    }

    // Le même jour, mis en forme par le calendrier du navigateur (ICU) : `calendar` est un identifiant d'Intl (« hebrew »…).
    function intlParts(calendar, date) {
        try {
            var fmt = new Intl.DateTimeFormat('fr-FR-u-ca-' + calendar, { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric', era: 'long' });
            var out = {};
            fmt.formatToParts(date).forEach(function (p) { out[p.type] = p.value; });
            return out;
        } catch (e) {
            return null;
        }
    }

    var DATE_CALENDARS = [
        { id: 'julien', name: 'Calendrier julien', note: 'Celui de la Rome antique, resté en usage en Russie jusqu\'en 1918 et dans l\'Église orthodoxe. En 2026, 13 jours de retard.' },
        { id: 'hebrew', name: 'Calendrier juif', note: 'Le jour commence la veille au coucher du soleil. L\'année change à Roch Hachana (septembre ou octobre).' },
        { id: 'islamic-civil', name: 'Calendrier musulman (Hégire)', note: 'Calcul arithmétique : le calendrier religieux réel dépend de l\'observation de la lune et peut différer d\'un ou deux jours. Le jour commence au coucher du soleil.' },
        { id: 'persian', name: 'Calendrier persan', note: 'Calendrier solaire de l\'Iran et de l\'Afghanistan : l\'année commence à Norouz, au printemps.' },
        { id: 'buddhist', name: 'Calendrier bouddhique (Thaïlande)', note: 'Mêmes mois que le nôtre, année décalée de 543.' },
        { id: 'japanese', name: 'Calendrier japonais', note: 'Les années comptent depuis le début du règne de l\'empereur en cours.' },
        { id: 'coptic', name: 'Calendrier copte (Égypte)', note: 'Celui de l\'Église copte, hérité de l\'Égypte ancienne : douze mois de 30 jours et un petit mois de 5 ou 6 jours.' },
        { id: 'republicain', name: 'Calendrier républicain (France)', note: 'Utilisé du 22 septembre 1792 au 31 décembre 1805 seulement.' }
    ];

    // Une ligne par calendrier : { id, name, note, available, text }. `available` est faux hors période (républicain) ou si le navigateur
    // ne connaît pas le calendrier.
    function convertDate(y, m, d) {
        if (!(y >= DATE_YEAR_MIN && y <= DATE_YEAR_MAX) || !(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) return null;
        var date = new Date(Date.UTC(y, m - 1, d, 12));
        if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
        var rows = [{ id: 'gregorien', name: 'Calendrier grégorien', note: 'Notre calendrier, depuis la réforme de 1582.', available: true, text: dayText(d, m, y) }];
        DATE_CALENDARS.forEach(function (cal) {
            var row = { id: cal.id, name: cal.name, note: cal.note, available: false, text: '' };
            if (cal.id === 'julien') {
                var j = jdnToJulian(gregorianToJdn(y, m, d));
                row.available = true;
                row.text = dayText(j.day, j.month, j.year);
            } else if (cal.id === 'republicain') {
                var r = republicanDate(y, m, d);
                if (r) { row.available = true; row.text = r.text; }
            } else {
                var p = intlParts(cal.id, date);
                if (p && p.day && p.month && p.year) {
                    row.available = true;
                    if (cal.id === 'japanese') row.text = p.day + ' ' + p.month + ' — ère ' + (p.era || '') + ', an ' + p.year;
                    else row.text = p.day + ' ' + p.month + ' ' + p.year;
                }
            }
            rows.push(row);
        });
        return rows;
    }

    // =====================================================================================================
    // === PÉRIODES ===
    // =====================================================================================================
    // Les bornes sont celles du programme (comme le Tetris des siècles : js/arcadeCore.js). `start`/`end` : années signées
    // (end = null pour « jusqu'à aujourd'hui »). Les bornes qui font débat sont dites.
    var PERIODS = [
        {
            id: 'prehistoire', name: 'Préhistoire', start: null, end: -3300,
            bounds: 'Des premiers humains jusqu\'à l\'invention de l\'écriture, vers 3300 av. J.-C. (Sumer, en Mésopotamie).',
            debated: 'La date de fin dépend des régions : l\'écriture apparaît vers 3300 av. J.-C. au Proche-Orient, bien plus tard ailleurs. On distingue le Paléolithique, le Néolithique (premiers agriculteurs) et l\'âge des métaux.'
        },
        {
            id: 'antiquite', name: 'Antiquité', start: -3300, end: 476,
            bounds: 'De l\'invention de l\'écriture (vers 3300 av. J.-C.) à la chute de l\'Empire romain d\'Occident (476).',
            debated: '476, c\'est la déposition du dernier empereur d\'Occident, Romulus Augustule. Certains historiens préfèrent 395 (partage de l\'Empire), d\'autres la fin du VIIe siècle ; l\'Empire romain d\'Orient dure jusqu\'en 1453.'
        },
        {
            id: 'moyenage', name: 'Moyen Âge', start: 476, end: 1492,
            bounds: 'De 476 à 1492, la découverte de l\'Amérique par Christophe Colomb.',
            debated: 'La fin est très discutée : 1453 (prise de Constantinople, fin de la guerre de Cent Ans) ou 1492 (Amérique) ou encore 1517 (début de la Réforme). On le divise en haut Moyen Âge (jusqu\'à l\'an mil), Moyen Âge central et bas Moyen Âge.'
        },
        {
            id: 'modernes', name: 'Temps modernes', start: 1492, end: 1789,
            bounds: 'De 1492 à 1789, le début de la Révolution française.',
            debated: 'Dans les pays anglophones, « Modern history » commence souvent vers 1500 et continue jusqu\'à nos jours. En France, on arrête à 1789 (ou 1815, fin des guerres napoléoniennes).'
        },
        {
            id: 'xix', name: 'De 1789 à 1914', start: 1789, end: 1914,
            bounds: 'De la Révolution française au début de la Première Guerre mondiale. C\'est le début de l\'époque contemporaine.',
            debated: 'On parle du « long XIXe siècle » : il commence en 1789 et se termine en 1914, pas en 1801 ni en 1900.'
        },
        {
            id: 'contemporain', name: 'Depuis 1914', start: 1914, end: null,
            bounds: 'De 1914 à aujourd\'hui, la seconde partie de l\'époque contemporaine.',
            debated: 'Le « court XXe siècle » va de 1914 à 1991 (fin de l\'URSS). Où s\'arrête l\'époque contemporaine, les historiens en débattent encore : on parle parfois de « temps présent » après 1945 ou 1989.'
        }
    ];
    // Les années proches d'une borne discutée : on le dit, au lieu de trancher.
    var PERIOD_DOUBT = [
        { from: 470, to: 480, text: 'proche de 476, borne discutée entre l\'Antiquité et le Moyen Âge' },
        { from: 1450, to: 1495, text: 'entre 1453 et 1492, bornes discutées de la fin du Moyen Âge' }
    ];

    function periodOfYear(y) {
        if (typeof y !== 'number' || y !== Math.floor(y) || y === 0) return null;
        var found = null;
        PERIODS.forEach(function (p) {
            var after = p.start === null || y >= p.start;
            var before = p.end === null || y < p.end;
            if (after && before) found = p;
        });
        var doubt = null;
        PERIOD_DOUBT.forEach(function (d) { if (y >= d.from && y <= d.to) doubt = d.text; });
        return found ? { period: found, doubt: doubt } : null;
    }

    return {
        ROMAN_MAX: ROMAN_MAX, ROMAN_LETTERS: ROMAN_LETTERS, toRoman: toRoman, fromRoman: fromRoman, romanBreakdown: romanBreakdown, parseRomanInput: parseRomanInput,
        YEAR_MIN: YEAR_MIN, YEAR_MAX: YEAR_MAX, yearText: yearText, signedYear: signedYear, centuryOfYear: centuryOfYear, centuryYears: centuryYears,
        centuryExplain: centuryExplain, yearsBetween: yearsBetween, addYears: addYears,
        ERA_YEAR_MIN: ERA_YEAR_MIN, ERA_YEAR_MAX: ERA_YEAR_MAX, convertYear: convertYear,
        DATE_YEAR_MIN: DATE_YEAR_MIN, DATE_YEAR_MAX: DATE_YEAR_MAX, gregorianToJdn: gregorianToJdn, jdnToJulian: jdnToJulian, republicanDate: republicanDate, convertDate: convertDate,
        PERIODS: PERIODS, periodOfYear: periodOfYear
    };
}));
