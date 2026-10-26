// =========================================================================
// === HISTORIAXE — VILLES DU MONDE : « Quelle est cette ville ? » (photo → QCM), LOGIQUE PURE ===
// =========================================================================
//
// Une photo libre d'une ville (assets/geo/city-photos.json, avec ses crédits), quatre villes à choisir. Les mauvaises réponses sont
// des villes de la zone choisie, et de la même région (continent) en difficulté « difficile ». Une seule bonne réponse, des noms
// distincts. Ce module ne touche ni au DOM ni au réseau : il se teste (tests/cityPhotoCore.test.js). L'écran est dans js/modes/cities.js.
//
// Une photo n'est posée que si la ville existe dans la zone (`cities`) et s'il reste trois villes à proposer. Une zone sans photo
// donne une partie vide : l'écran le dit.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else {
        root.CityPhotoCore = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var OPTIONS = 4;

    function shuffle(list, random) {
        var a = list.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    // Les questions d'une partie. `photos` : les entrées de city-photos.json ; `cities` : les villes de la zone ; `continent(cc)` : le
    // continent d'un pays (pour les distracteurs de la même région en mode « hard »). `count` : le nombre maximal de questions.
    function photoQuestions(photos, cities, opts) {
        var o = opts || {};
        var random = o.rng || Math.random;
        var count = o.count || photos.length;
        var byId = new Map(cities.map(function (c) { return [c.id, c]; }));
        var out = [];
        shuffle(photos, random).forEach(function (p) {
            if (out.length >= count) return;
            var target = byId.get(p.city);
            if (!target) return;
            var others = cities.filter(function (c) { return c.id !== target.id && c.n !== target.n; });
            if (o.difficulty === 'hard' && o.continent) {
                var cont = o.continent(target.cc);
                var same = others.filter(function (c) { return o.continent(c.cc) === cont; });
                if (same.length >= OPTIONS - 1) others = same;
            }
            var picks = [];
            var names = new Set([target.n]);
            shuffle(others, random).forEach(function (c) {
                if (picks.length < OPTIONS - 1 && !names.has(c.n)) { names.add(c.n); picks.push(c); }
            });
            if (picks.length < OPTIONS - 1) return;
            out.push({
                form: 'photo', ask: 'photo', target: target.id, country: target.cc,
                photo: { src: p.src, legende: p.legende, auteur: p.auteur, licence: p.licence, source: p.source },
                options: shuffle([target].concat(picks), random).map(function (c) { return { id: c.id, value: c.n }; })
            });
        });
        return out;
    }

    // Contrôle a posteriori : la ville est dans les options, une seule fois, et aucune autre option ne porte son nom.
    function isValid(question, cities) {
        if (question.options.length !== OPTIONS) return false;
        var target = cities.filter(function (c) { return c.id === question.target; })[0];
        if (!target) return false;
        var values = question.options.map(function (o) { return o.value; });
        return new Set(values).size === OPTIONS && question.options.filter(function (o) { return o.id === target.id; }).length === 1;
    }

    return { OPTIONS: OPTIONS, photoQuestions: photoQuestions, isValid: isValid };
});
