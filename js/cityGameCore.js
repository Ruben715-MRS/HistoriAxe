// =========================================================================
// === HISTORIAXE — VILLES DU MONDE : LOGIQUE PURE (questions, distracteurs) ===
// =========================================================================
//
// Les villes viennent de assets/geo/cities.json (scripts/cities/build_cities.js : Wikidata, CC0) : les villes d'au moins
// 500 000 habitants et toutes les capitales. Les pays sont ceux de l'Atlas (assets/geo/countries-facts.json).
// Ce module ne touche ni au DOM ni à la carte : il se teste (tests/cityGameCore.test.js). L'écran est dans js/modes/cities.js.
//
// TROIS FORMES DE QUESTION, en QCM à quatre réponses :
//   - « capital » : quelle est la capitale de ce pays ? Le piège : la plus grande ville du pays, qui n'est pas la capitale
//     (Sydney pour l'Australie, Istanbul pour la Turquie, Toronto pour le Canada).
//   - « largest » : quelle est la plus grande ville de ce pays ? Le piège : la capitale, quand elle n'est pas la plus grande.
//     Une question n'est posée que si la plus grande ville est nettement plus peuplée que la suivante (MIN_RATIO) :
//     les populations sont des estimations d'années différentes, un écart faible ne se décide pas.
//   - « country » : quel pays a pour ville ce nom ? Seulement pour un nom qui ne désigne qu'une ville de la liste.
// Les mauvaises réponses viennent de la même région (continent) en mode difficile, et au hasard sinon.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else {
        root.CityGameCore = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var MIN_RATIO = 1.3;
    var OPTIONS = 4;
    var FORMS = ['capital', 'largest', 'country'];

    function shuffle(list, random) {
        var a = list.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    // Les pays de l'Atlas : code ISO → { n (nom français), cont (continent) }.
    function countryIndex(facts) {
        var m = new Map();
        facts.forEach(function (c) { m.set(c.iso2, { n: c.n, cont: c.cont }); });
        return m;
    }

    // Les villes par pays, les plus peuplées d'abord ; une ville sans population vient après.
    function byCountry(cities) {
        var m = new Map();
        cities.forEach(function (c) {
            if (!m.has(c.cc)) m.set(c.cc, []);
            m.get(c.cc).push(c);
        });
        m.forEach(function (list) {
            list.sort(function (a, b) { return (b.pop || 0) - (a.pop || 0) || (a.n < b.n ? -1 : 1); });
        });
        return m;
    }

    // Un seul choix possible pour la capitale : un pays qui en a deux (Afrique du Sud, Bolivie…) n'est pas posé.
    function capitalOf(list) {
        var caps = list.filter(function (c) { return c.cap; });
        return caps.length === 1 ? caps[0] : null;
    }

    // `wanted` réponses prises parmi `pool`, sans libellé déjà pris (`taken`, et le libellé de la cible). De la même région d'abord
    // en mode difficile. Null si la liste ne suffit pas.
    function distractors(target, pool, countries, wanted, difficulty, random, nameOf, taken) {
        var targetCont = countries.get(target.cc) && countries.get(target.cc).cont;
        var rest = shuffle(pool, random);
        if (difficulty === 'hard') {
            var rank = function (c) { var k = countries.get(c.cc); return k && k.cont === targetCont ? 0 : 1; };
            rest.sort(function (a, b) { return rank(a) - rank(b); });
        }
        var seen = new Set((taken || []).concat([nameOf(target)]));
        var chosen = [];
        for (var i = 0; i < rest.length && chosen.length < wanted; i++) {
            if (seen.has(nameOf(rest[i]))) continue;
            seen.add(nameOf(rest[i]));
            chosen.push(rest[i]);
        }
        return chosen.length === wanted ? chosen : null;
    }

    function optionsFrom(target, others, nameOf, random) {
        return shuffle([target].concat(others), random).map(function (c) {
            return { id: c.id, value: nameOf(c) };
        });
    }

    // « Quelle est la capitale de ce pays ? » : la capitale, avec la plus grande ville du pays en piège si ce n'est pas elle.
    function capitalQuestion(cities, countries, cc, opts) {
        var o = opts || {};
        var random = o.rng || Math.random;
        var list = byCountry(cities).get(cc) || [];
        var cap = capitalOf(list);
        if (!cap) return null;
        var nameOf = function (c) { return c.n; };
        var trap = list.filter(function (c) { return c !== cap && c.pop; })[0];
        var others = cities.filter(function (c) { return c.cc !== cc && (c.cap || c.pop); });
        var more = distractors(cap, others, countries, OPTIONS - 1 - (trap ? 1 : 0), o.difficulty, random, nameOf, trap ? [trap.n] : []);
        if (!more) return null;
        var picks = (trap ? [trap] : []).concat(more);
        return { form: 'capital', target: cap.id, country: cc, ask: 'capital', options: optionsFrom(cap, picks, nameOf, random) };
    }

    // « Quelle est la plus grande ville de ce pays ? » : la plus grande, nettement devant la suivante.
    function largestQuestion(cities, countries, cc, opts) {
        var o = opts || {};
        var random = o.rng || Math.random;
        var list = (byCountry(cities).get(cc) || []).filter(function (c) { return c.pop; });
        if (list.length < 2) return null;
        var big = list[0];
        if (list[1].pop * MIN_RATIO > big.pop) return null;
        var nameOf = function (c) { return c.n; };
        var cap = capitalOf(list);
        var trap = cap && cap.id !== big.id ? cap : null;
        var others = cities.filter(function (c) { return c.cc !== cc && c.pop; });
        var more = distractors(big, others, countries, OPTIONS - 1 - (trap ? 1 : 0), o.difficulty, random, nameOf, trap ? [trap.n] : []);
        if (!more) return null;
        var picks = (trap ? [trap] : []).concat(more);
        return { form: 'largest', target: big.id, country: cc, ask: 'largest', options: optionsFrom(big, picks, nameOf, random) };
    }

    // « Quel pays a pour ville ce nom ? » : seulement pour un nom unique dans la liste.
    function countryQuestion(cities, countries, city, opts) {
        var o = opts || {};
        var random = o.rng || Math.random;
        if (cities.filter(function (c) { return c.n === city.n; }).length !== 1) return null;
        var countryName = function (c) { return countries.get(c.cc).n; };
        var others = cities.filter(function (c) { return c.cc !== city.cc; });
        var more = distractors(city, others, countries, OPTIONS - 1, o.difficulty, random, countryName, []);
        if (!more) return null;
        return { form: 'country', target: city.id, country: city.cc, ask: 'country', options: optionsFrom(city, more, countryName, random) };
    }

    // Une partie : `count` questions d'une forme (ou d'un mélange), chacune sur une cible différente.
    function generateCityGame(cities, facts, form, opts) {
        var o = opts || {};
        var random = o.rng || Math.random;
        var count = o.count || 10;
        var countries = countryIndex(facts);
        var out = [];
        var seen = new Set();
        var list = cities.slice();
        var attempts = 0;
        if (form === 'capital' || form === 'largest') {
            var codes = shuffle(Array.from(byCountry(list).keys()), random);
            var make = form === 'capital' ? capitalQuestion : largestQuestion;
            for (var i = 0; i < codes.length && out.length < count; i++) {
                var q = make(list, countries, codes[i], { rng: random, difficulty: o.difficulty });
                if (q && !seen.has(q.target)) { seen.add(q.target); out.push(q); }
            }
        } else {
            list = shuffle(list, random);
            for (var j = 0; j < list.length && out.length < count && attempts < list.length; j++, attempts++) {
                var c = countryQuestion(cities, countries, list[j], { rng: random, difficulty: o.difficulty });
                if (c && !seen.has(c.target)) { seen.add(c.target); out.push(c); }
            }
        }
        return out;
    }

    // Contrôle a posteriori : la bonne réponse est proposée une fois, et aucune autre proposition n'a le même libellé.
    function isValid(question, cities) {
        var target = cities.filter(function (c) { return c.id === question.target; })[0];
        if (!target || question.options.length !== OPTIONS) return false;
        var values = question.options.map(function (o) { return o.value; });
        if (new Set(values).size !== OPTIONS) return false;
        var right = question.options.filter(function (o) { return o.id === target.id; });
        return right.length === 1;
    }

    return {
        FORMS: FORMS, MIN_RATIO: MIN_RATIO, OPTIONS: OPTIONS,
        countryIndex: countryIndex, byCountry: byCountry, capitalQuestion: capitalQuestion, largestQuestion: largestQuestion,
        countryQuestion: countryQuestion, generateCityGame: generateCityGame, isValid: isValid
    };
});
