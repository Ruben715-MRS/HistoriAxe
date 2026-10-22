// =========================================================================
// === LES MINI-JEUX DU COURS — RÈGLES : SIÈCLES EN CHIFFRES ROMAINS, CALENDRIER DE L'AVENT HISTORIQUE ===
// =========================================================================
// Deux mini-jeux, états purs sans DOM (les écrans sont dans js/app/minigames.js). Testé dans tests/minigamesCore.test.js.
//
//  - SIÈCLES EN CHIFFRES ROMAINS : dix questions de quatre sortes. Lire un chiffre romain (XIX = 19), dire les années d'un siècle
//    (XVIIIe siècle = 1701 à 1800, pas 1700 à 1799), dire le siècle d'une année (1900 est du XIXe, 2000 du XXe, 44 av. J.-C. du
//    Ier siècle av. J.-C.), et ranger quatre siècles dans l'ordre chronologique (avant J.-C., on compte à rebours).
//  - CALENDRIER DE L'AVENT HISTORIQUE : une case par jour de décembre (js/adventContent.js), un événement arrivé ce jour-là,
//    une question d'année à quatre choix. En décembre, la case du jour s'ouvre ; les autres mois, toutes sont ouvertes.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./arcadeCore.js'), require('./adventContent.js'));
    else root.MiniGamesCore = factory(root.ArcadeCore, root.AdventContent);
}(typeof self !== 'undefined' ? self : this, function (Arcade, Advent) {
    'use strict';

    var shuffle = Arcade.shuffle;

    // --- Chiffres romains et siècles ---------------------------------------------------------------------
    var ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    var ROMAN_VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

    function toRoman(n) {
        var out = '';
        ROMAN.forEach(function (pair) { while (n >= pair[0]) { out += pair[1]; n -= pair[0]; } });
        return out;
    }

    // XIV → 14 ; un plus petit devant un plus grand se retranche.
    function fromRoman(text) {
        var total = 0;
        for (var i = 0; i < text.length; i++) {
            var v = ROMAN_VALUES[text.charAt(i)];
            var next = ROMAN_VALUES[text.charAt(i + 1)];
            total += next && v < next ? -v : v;
        }
        return total;
    }

    // Le siècle d'une année : 1789 → { n: 18, bc: false }, 1900 → 19, 2000 → 20, −44 → { n: 1, bc: true }. Pas d'an 0.
    function centuryOf(year) {
        return { n: Math.ceil(Math.abs(year) / 100), bc: year < 0 };
    }

    // « XVIIIe siècle », « Ier siècle av. J.-C. »
    function centuryName(c) {
        return toRoman(c.n) + (c.n === 1 ? 'er' : 'e') + ' siècle' + (c.bc ? ' av. J.-C.' : '');
    }

    // Les années d'un siècle, dans l'ordre où on les lit : « 1701 à 1800 » ; avant J.-C., on compte à rebours : « 300 à 201 av. J.-C. ».
    function centurySpan(c) {
        if (c.bc) return (c.n * 100) + ' à ' + ((c.n - 1) * 100 + 1) + ' av. J.-C.';
        return ((c.n - 1) * 100 + 1) + ' à ' + (c.n * 100);
    }

    // Place d'un siècle dans le temps (négative avant J.-C. : le Ve siècle av. J.-C. précède le IVe).
    function centuryRank(c) {
        return c.bc ? -c.n : c.n;
    }

    function pickOptions(correct, wrongs, rng) {
        var seen = {};
        seen[correct] = 1;
        var out = [correct];
        wrongs.forEach(function (w) { if (!seen[w] && out.length < 4) { seen[w] = 1; out.push(w); } });
        return out.length === 4 ? shuffle(out, rng) : null;
    }

    function pick(list, rng) { return list[Math.floor((rng || Math.random)() * list.length)]; }

    // 1. Lire un chiffre romain : le nombre, parmi des confusions classiques (IX / XI, XIV / XVI, ± 1, ± 10).
    var NUMERALS = [4, 6, 9, 11, 14, 16, 19, 21, 24, 29, 34, 39, 44];
    function numeralQuestion(rng) {
        var n = pick(NUMERALS, rng);
        var roman = toRoman(n);
        // L'écriture « à l'envers » : IX lu comme XI, XIV comme XVI…
        var mirrored = fromRoman(roman.split('').reverse().join(''));
        var options = pickOptions(String(n), [String(mirrored), String(n + 1), String(n - 1), String(n + 10), String(n - 10), String(n + 2)], rng);
        return { type: 'numeral', roman: roman, options: options, answer: options.indexOf(String(n)), explain: roman + ' = ' + n + '. Un chiffre plus petit placé devant un plus grand se retranche (IX = 10 − 1) ; placé après, il s\'ajoute (XI = 10 + 1).' };
    }

    // 2. Les années d'un siècle. Le piège : XVIIIe siècle = 1701 à 1800, et non 1700 à 1799.
    var SPAN_CENTURIES = [{ n: 5 }, { n: 9 }, { n: 12 }, { n: 15 }, { n: 16 }, { n: 17 }, { n: 18 }, { n: 19 }, { n: 20 }, { n: 21 }, { n: 3, bc: true }, { n: 5, bc: true }, { n: 2, bc: true }];
    function spanQuestion(rng) {
        var c = pick(SPAN_CENTURIES, rng);
        c = { n: c.n, bc: !!c.bc };
        var off = c.bc ? ((c.n) * 100) + ' à ' + ((c.n - 1) * 100) + ' av. J.-C.' : ((c.n - 1) * 100) + ' à ' + (c.n * 100 - 1);
        var mirrored = c.bc ? (((c.n - 1) * 100 + 1) + ' à ' + (c.n * 100)) : (c.n * 100 + ' à ' + ((c.n - 1) * 100 + 1) + ' av. J.-C.');
        var options = pickOptions(centurySpan(c), [off, centurySpan({ n: c.n + 1, bc: c.bc }), centurySpan({ n: c.n - 1 || 1, bc: c.bc }), mirrored], rng);
        var explain = c.bc
            ? centuryName(c) + ' : de ' + centurySpan(c) + '. Avant J.-C., on compte à rebours : ce siècle va de l\'année ' + (c.n * 100) + ' jusqu\'à l\'année ' + ((c.n - 1) * 100 + 1) + ' avant J.-C.'
            : centuryName(c) + ' : de ' + centurySpan(c) + '. Le Ier siècle va de l\'an 1 à l\'an 100 : un siècle commence donc à l\'année ' + ((c.n - 1) * 100 + 1) + ', et non à ' + ((c.n - 1) * 100) + '.';
        return { type: 'span', label: centuryName(c), options: options, answer: options.indexOf(centurySpan(c)), explain: explain };
    }

    // 3. Le siècle d'une année, dont les années rondes (1900, 2000, 100) qui sont les dernières d'un siècle.
    var YEARS = [
        { year: 1789, label: 'La Révolution française' }, { year: 1900, label: "L'Exposition universelle de Paris" },
        { year: 2000, label: 'Le passage à l\'an 2000' }, { year: 1000, label: "L'an mil" }, { year: 800, label: 'Le couronnement de Charlemagne' },
        { year: 476, label: "La chute de l'Empire romain d'Occident" }, { year: 1492, label: "La découverte de l'Amérique" },
        { year: 1815, label: 'Waterloo' }, { year: 1914, label: 'Le début de la Grande Guerre' }, { year: 1945, label: 'La fin de la Seconde Guerre mondiale' },
        { year: 1700, label: 'Une année ronde' }, { year: 1801, label: 'Le Concordat' }, { year: 2001, label: 'Les attentats du 11 septembre' },
        { year: 100, label: 'Une année ronde, tout au début de notre ère' }, { year: 101, label: 'Le lendemain d\'une année ronde' },
        { year: -44, label: "L'assassinat de César" }, { year: -753, label: 'La fondation légendaire de Rome' }, { year: -480, label: 'La bataille de Salamine' },
        { year: -27, label: 'Octave devient Auguste' }, { year: -100, label: 'Une année ronde avant J.-C.' }
    ];
    function whichQuestion(rng) {
        var item = pick(YEARS, rng);
        var c = centuryOf(item.year);
        var wrongs = [centuryName({ n: c.n + 1, bc: c.bc }), centuryName({ n: c.n - 1 || 1, bc: c.bc })];
        // Le piège du décalage : 1900 est du XIXe, pas du XXe. Et, tout près de l'an 1, le même numéro avant ou après J.-C.
        if (c.n <= 6) wrongs.push(centuryName({ n: c.n, bc: !c.bc }));
        var options = pickOptions(centuryName(c), wrongs.concat([centuryName({ n: c.n + 2, bc: c.bc })]), rng);
        var yearText = item.year < 0 ? (-item.year) + ' av. J.-C.' : String(item.year);
        var explain = yearText + ' est du ' + centuryName(c) + ' : on prend le nombre de centaines de l\'année, ' + (Math.abs(item.year) % 100 === 0
            ? (c.bc ? 'mais une année ronde avant J.-C. OUVRE son siècle, puisqu\'on compte à rebours (' + yearText + ' ouvre le ' + centuryName(c) + ')' : 'mais une année ronde est la DERNIÈRE de son siècle (' + yearText + ' ferme le ' + centuryName(c) + ')')
            : 'et on ajoute un') + '.';
        return { type: 'which', year: item.year, yearText: yearText, label: item.label, options: options, answer: options.indexOf(centuryName(c)), explain: explain };
    }

    // 4. Ranger quatre siècles dans l'ordre chronologique : `items` dans l'ordre d'affichage, `order` l'ordre attendu (indices).
    function orderQuestion(rng) {
        // Un mélange d'avant et d'après J.-C. : c'est là que l'on se trompe.
        var pool = [{ n: 5, bc: true }, { n: 3, bc: true }, { n: 1, bc: true }, { n: 1 }, { n: 4 }, { n: 8 }, { n: 12 }, { n: 16 }, { n: 19 }, { n: 2, bc: true }];
        var picks = shuffle(pool, rng).slice(0, 4).map(function (c) { return { n: c.n, bc: !!c.bc }; });
        var hasBc = picks.some(function (c) { return c.bc; });
        // Au moins un avant J.-C. une fois sur deux : le piège de l'ordre inversé.
        if (!hasBc) picks[0] = { n: 3, bc: true };
        var items = picks.map(function (c) { return { name: centuryName(c), rank: centuryRank(c) }; });
        var order = items.map(function (it, i) { return i; }).sort(function (a, b) { return items[a].rank - items[b].rank; });
        var chronological = order.map(function (i) { return items[i].name; }).join(' → ');
        return { type: 'order', items: items, order: order, explain: 'Dans l\'ordre : ' + chronological + '. Avant J.-C., les siècles se comptent à rebours : le Ve siècle av. J.-C. vient avant le IVe.' };
    }

    var ROMAN_PLAN = ['numeral', 'which', 'numeral', 'span', 'which', 'order', 'span', 'which', 'order', 'span'];
    var BUILDERS = { numeral: numeralQuestion, span: spanQuestion, which: whichQuestion, order: orderQuestion };
    var ROMAN_POINTS = 100;
    var ORDER_ERROR_COST = 25;

    function createRoman(rng) {
        var random = rng || Math.random;
        var questions = [];
        var seen = {};
        ROMAN_PLAN.forEach(function (type) {
            // Jamais deux fois la même question dans une partie.
            for (var tries = 0; tries < 20; tries++) {
                var q = BUILDERS[type](random);
                var key = type + ':' + (q.roman || q.label || q.yearText || q.items.map(function (i) { return i.name; }).join(','));
                if (!seen[key]) { seen[key] = 1; questions.push(q); return; }
            }
        });
        return { questions: questions, index: 0, score: 0, found: 0, results: [], resolved: null, progress: 0, errors: 0, over: false };
    }

    function romanQuestion(state) { return state.questions[state.index] || null; }

    // Choix multiple : `choice` est l'indice de l'option. Renvoie 'right' ou 'wrong'.
    function romanAnswer(state, choice) {
        var q = romanQuestion(state);
        if (state.over || !q || state.resolved || q.type === 'order' || !(choice >= 0 && choice < q.options.length)) return [];
        var right = choice === q.answer;
        state.resolved = right ? 'right' : 'wrong';
        if (right) { state.score += ROMAN_POINTS; state.found += 1; }
        state.results.push({ type: q.type, right: right, points: right ? ROMAN_POINTS : 0 });
        return [state.resolved];
    }

    // Ordre : on désigne les siècles un à un, du plus ancien au plus récent ; `item` est l'indice dans q.items. Renvoie 'ok', 'miss'
    // (la mauvaise carte : une erreur de plus, la bonne reste attendue) ou 'done' (le dernier siècle placé).
    function romanTap(state, item) {
        var q = romanQuestion(state);
        if (state.over || !q || state.resolved || q.type !== 'order' || !q.items[item]) return [];
        if (q.order.slice(0, state.progress).indexOf(item) !== -1) return [];
        if (q.order[state.progress] !== item) { state.errors += 1; return ['miss']; }
        state.progress += 1;
        if (state.progress < q.order.length) return ['ok'];
        var points = Math.max(0, ROMAN_POINTS - ORDER_ERROR_COST * state.errors);
        state.resolved = state.errors === 0 ? 'right' : 'wrong';
        if (state.errors === 0) state.found += 1;
        state.score += points;
        state.results.push({ type: 'order', right: state.errors === 0, points: points });
        return ['ok', 'done'];
    }

    function romanNext(state) {
        if (state.over || !state.resolved) return [];
        state.index += 1;
        state.resolved = null;
        state.progress = 0;
        state.errors = 0;
        if (state.index >= state.questions.length) { state.over = true; return ['done']; }
        return ['next'];
    }

    // --- Calendrier de l'Avent historique ---------------------------------------------------------------
    var ADVENT_DAYS = 31;
    var ADVENT_MONTH = 11; // décembre pour Date#getMonth

    // Le jour de décembre d'une date (1 à 31), ou null un autre mois.
    function adventToday(now) {
        return now.getMonth() === ADVENT_MONTH ? now.getDate() : null;
    }

    // Une case est ouverte si on n'est pas en décembre (entraînement), ou si son jour est venu.
    function adventOpen(day, now) {
        var today = adventToday(now);
        return today === null || day <= today;
    }

    function adventContent(day) {
        return Advent.DAYS[day - 1] || null;
    }

    // Un petit générateur déterministe : une case propose toujours les mêmes quatre années, et leur ordre ne bouge pas d'une
    // ouverture à l'autre.
    function seeded(seed) {
        var s = seed % 2147483647;
        if (s <= 0) s += 2147483646;
        return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    }

    // La question d'une case : `year`, quatre propositions dont la bonne. Les fausses sont proches (de quelques années à quelques
    // décennies, plus larges pour les époques anciennes), jamais après `maxYear` ni égales à zéro.
    function adventQuestion(day, maxYear) {
        var item = adventContent(day);
        var limit = maxYear || 2026;
        var scale = item.year >= 1900 ? 1 : item.year >= 1500 ? 2 : 4;
        var offsets = [-30, -12, -5, 5, 12, 30].map(function (o) { return o * scale; });
        var rng = seeded(day * 7919 + 13);
        var wrongs = shuffle(offsets, rng).map(function (o) { return item.year + o; })
            .filter(function (y) { return y <= limit && y !== 0; });
        var options = [item.year].concat(wrongs.slice(0, 3));
        return { day: day, item: item, options: shuffle(options, rng), answer: item.year };
    }

    // Progression : { <année civile>: { <jour>: true (trouvé) | false (raté) } }.
    function normalizeAdvent(raw) {
        var out = {};
        if (raw && typeof raw === 'object') {
            Object.keys(raw).forEach(function (year) {
                if (!/^\d{4}$/.test(year) || !raw[year] || typeof raw[year] !== 'object') return;
                out[year] = {};
                Object.keys(raw[year]).forEach(function (d) {
                    var n = Number(d);
                    if (n >= 1 && n <= ADVENT_DAYS && typeof raw[year][d] === 'boolean') out[year][n] = raw[year][d];
                });
            });
        }
        return out;
    }

    // Enregistre la réponse à une case. Une case déjà ouverte ne change pas (on ne rejoue pas pour corriger).
    function adventRecord(progress, calendarYear, day, right) {
        var next = normalizeAdvent(progress);
        var key = String(calendarYear);
        next[key] = next[key] || {};
        if (next[key][day] === undefined) next[key][day] = !!right;
        return next;
    }

    function adventCounts(progress, calendarYear) {
        var days = normalizeAdvent(progress)[String(calendarYear)] || {};
        var opened = Object.keys(days).length;
        var right = Object.keys(days).filter(function (d) { return days[d]; }).length;
        return { opened: opened, right: right };
    }

    return {
        toRoman: toRoman, fromRoman: fromRoman, centuryOf: centuryOf, centuryName: centuryName, centurySpan: centurySpan, centuryRank: centuryRank,
        ROMAN_PLAN: ROMAN_PLAN, createRoman: createRoman, romanQuestion: romanQuestion, romanAnswer: romanAnswer, romanTap: romanTap, romanNext: romanNext,
        ADVENT_DAYS: ADVENT_DAYS, adventToday: adventToday, adventOpen: adventOpen, adventContent: adventContent, adventQuestion: adventQuestion,
        normalizeAdvent: normalizeAdvent, adventRecord: adventRecord, adventCounts: adventCounts
    };
}));
