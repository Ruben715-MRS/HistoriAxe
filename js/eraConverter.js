// =========================================================================
// === LE CONVERTISSEUR D'ÈRES — DONNÉES ET RÈGLES (mini-jeu du Monde 0, niveau 3 « Compter les années ») ===
// =========================================================================
// On donne une année de notre calendrier (« 1789, prise de la Bastille ») ; le joueur fait coulisser la règle
// d'une autre ère jusqu'à la bonne année (« an 1203 de l'Hégire »). Chaque ère a sa règle de conversion, expliquée
// après la réponse : un décalage fixe (juive, bouddhique, japonaises), un décalage qui dépend du jour dans l'année
// (républicaine, persane : deux réponses valent), ou un calcul lunaire (l'Hégire : une année de 354 jours, une marge
// d'un an est acceptée).
//
// Format d'une ère : { id, name, icon, rule, start, min, max, answers(g), items: [{ g, label }] }
//  - `answers(g)` : les années de l'ère acceptées pour l'année grégorienne `g` ;
//  - `start` : la valeur affichée au départ sur la règle ; `min`/`max` : ses bornes ;
//  - `items` : des années à demander, avec l'événement qui les rend concrètes. Les années de changement d'ère
//    japonaises (1912, 1926, 1989, 2019) en sont écartées exprès : elles appartiennent à deux ères.
//
// Pur, sans DOM : testé dans tests/eraConverter.test.js. Contenu en français seulement ; **à relire par un enseignant**.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.EraConverter = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Le décalage fixe : l'année de l'ère = année grégorienne + `shift`.
    function fixed(shift) { return function (g) { return [g + shift]; }; }
    // Deux réponses : l'ère change de numéro en cours d'année grégorienne.
    function either(shift) { return function (g) { return [g + shift, g + shift + 1]; }; }

    var ERAS = [
        {
            id: 'juive', name: 'Calendrier juif (année du monde)', icon: '✡️', start: 5500, min: 3800, max: 6000,
            rule: "On ajoute 3760 à l'année grégorienne (3761 à partir de Roch Hachana, en septembre ou octobre), car la tradition place la création du monde vers 3761 av. J.-C.",
            answers: either(3760),
            items: [
                { g: 1492, label: "Expulsion des Juifs d'Espagne" },
                { g: 1948, label: "Proclamation de l'État d'Israël" },
                { g: 2000, label: "Le passage à l'an 2000" }
            ]
        },
        {
            id: 'hegire', name: "Hégire (calendrier musulman)", icon: '☪️', start: 800, min: 1, max: 1500,
            rule: "L'an 1 est celui du départ du Prophète pour Médine, en 622. Les années sont lunaires (354 jours) et plus courtes que les nôtres : il y en a 33 pour 32 des nôtres. On calcule (année − 622) × 1,03, à un an près.",
            answers: function (g) { var x = Math.round((g - 622) * 1.030684); return [x - 1, x, x + 1]; },
            items: [
                { g: 1099, label: 'Prise de Jérusalem par les croisés' },
                { g: 1492, label: 'Chute de Grenade, dernier royaume musulman d\'Espagne' },
                { g: 1789, label: 'La Révolution française' },
                { g: 1948, label: "Création de l'État d'Israël" }
            ]
        },
        {
            id: 'republicaine', name: 'Calendrier républicain (France)', icon: '🇫🇷', start: 5, min: 1, max: 14,
            rule: "L'an I commence le 22 septembre 1792, jour de la proclamation de la République. Chaque année commence en septembre : selon que l'événement a lieu avant ou après le 22 septembre, on retire 1792 ou 1791. Le calendrier est supprimé le 1er janvier 1806.",
            answers: either(-1792),
            items: [
                { g: 1793, label: 'Mort de Louis XVI (21 janvier)' },
                { g: 1794, label: 'Chute de Robespierre, le 9 thermidor (27 juillet)' },
                { g: 1799, label: 'Coup d\'État de Bonaparte, le 18 brumaire (9 novembre)' }
            ]
        },
        {
            id: 'rome', name: 'Ère romaine (depuis la fondation de Rome)', icon: '🏛️', start: 800, min: 1, max: 2800,
            rule: "Les Romains comptent depuis la fondation de Rome, en 753 av. J.-C. : c'est l'an 1. Après J.-C., on ajoute 753 ; avant J.-C., on retire l'année à 754 (il n'y a pas d'an 0).",
            answers: function (g) { return [g > 0 ? g + 753 : 754 + g]; },
            // Pour une année avant J.-C., `g` est négatif (−44 = 44 av. J.-C.).
            items: [
                { g: -44, label: "Assassinat de Jules César (44 av. J.-C.)" },
                { g: -27, label: "Octave devient Auguste (27 av. J.-C.)" },
                { g: 79, label: "Éruption du Vésuve" },
                { g: 476, label: "Chute de l'Empire romain d'Occident" }
            ]
        },
        {
            id: 'bouddhique', name: 'Ère bouddhique (Thaïlande)', icon: '☸️', start: 2400, min: 2300, max: 2700,
            rule: "On ajoute 543 : l'ère compte depuis la mort du Bouddha, que la tradition place en 543 av. J.-C. La Thaïlande l'emploie dans la vie civile, avec une année qui commence le 1er janvier.",
            answers: fixed(543),
            items: [
                { g: 1932, label: 'Fin de la monarchie absolue au Siam' },
                { g: 2000, label: "Le passage à l'an 2000" },
                { g: 2026, label: "Aujourd'hui" }
            ]
        },
        {
            id: 'persane', name: 'Calendrier persan (Iran)', icon: '🇮🇷', start: 1300, min: 1000, max: 1500,
            rule: "L'an 1 est celui de l'Hégire, en 622, mais avec des années solaires. L'année commence au printemps (Norouz, le 20 ou 21 mars) : avant, on retire 622 ; après, 621.",
            answers: either(-622),
            items: [
                { g: 1979, label: 'Révolution islamique (février)' },
                { g: 2026, label: "Aujourd'hui" }
            ]
        },
        {
            id: 'meiji', name: 'Ère Meiji (Japon, 1868-1912)', icon: '🇯🇵', start: 20, min: 1, max: 45,
            rule: "L'ère Meiji commence en 1868 : l'an 1 est 1868, donc on retire 1867. Au Japon, chaque règne d'empereur donne son nom à une ère.",
            answers: fixed(-1867),
            items: [{ g: 1904, label: 'Début de la guerre russo-japonaise' }, { g: 1894, label: 'Guerre sino-japonaise' }]
        },
        {
            id: 'taisho', name: 'Ère Taishō (Japon, 1912-1926)', icon: '🇯🇵', start: 8, min: 1, max: 15,
            rule: "L'ère Taishō commence en 1912 : l'an 1 est 1912, donc on retire 1911.",
            answers: fixed(-1911),
            items: [{ g: 1923, label: 'Grand tremblement de terre du Kantō' }]
        },
        {
            id: 'showa', name: 'Ère Shōwa (Japon, 1926-1989)', icon: '🇯🇵', start: 30, min: 1, max: 64,
            rule: "L'ère Shōwa, celle de l'empereur Hirohito, commence en 1926 : l'an 1 est 1926, donc on retire 1925.",
            answers: fixed(-1925),
            items: [
                { g: 1945, label: 'Bombes atomiques et capitulation du Japon' },
                { g: 1964, label: 'Jeux olympiques de Tokyo' }
            ]
        },
        {
            id: 'heisei', name: 'Ère Heisei (Japon, 1989-2019)', icon: '🇯🇵', start: 15, min: 1, max: 31,
            rule: "L'ère Heisei commence en 1989 : l'an 1 est 1989, donc on retire 1988.",
            answers: fixed(-1988),
            items: [{ g: 1995, label: 'Séisme de Kobe' }, { g: 2011, label: 'Séisme et tsunami du Tōhoku' }]
        },
        {
            id: 'reiwa', name: 'Ère Reiwa (Japon, depuis 2019)', icon: '🇯🇵', start: 3, min: 1, max: 20,
            rule: "L'ère Reiwa commence le 1er mai 2019 avec l'empereur Naruhito : l'an 1 est 2019, donc on retire 2018.",
            answers: fixed(-2018),
            items: [{ g: 2021, label: 'Jeux olympiques de Tokyo (reportés)' }, { g: 2024, label: 'Jeux olympiques de Paris' }]
        }
    ];

    var QUESTIONS_PER_GAME = 8;
    var MAX_PER_ERA = 2;
    var MAX_STARS = 3;
    var STAR_ERRORS = [1, 3];

    function find(id) {
        for (var i = 0; i < ERAS.length; i++) if (ERAS[i].id === id) return ERAS[i];
        return null;
    }

    // Texte d'une année grégorienne, avant J.-C. comprise (−44 → « 44 av. J.-C. »).
    function gregorianText(g) { return g < 0 ? (-g) + ' av. J.-C.' : String(g); }

    function accepts(era, g, value) {
        return era.answers(g).indexOf(value) !== -1;
    }

    // La réponse à montrer : « 1203 », « 1 ou 2 » (selon le jour) ou « de 1202 à 1204 » (marge de l'Hégire).
    function answerText(era, g) {
        var a = era.answers(g);
        if (a.length === 1) return String(a[0]);
        if (a.length === 2) return a[0] + ' ou ' + a[1];
        return 'de ' + a[0] + ' à ' + a[a.length - 1];
    }

    function shuffle(list, rng) {
        var random = rng || Math.random;
        var out = list.slice();
        for (var i = out.length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
        }
        return out;
    }

    // Les questions d'une partie : mêlées, au plus MAX_PER_ERA par ère pour varier les règles.
    function deal(rng) {
        var all = [];
        ERAS.forEach(function (era) {
            era.items.forEach(function (item) { all.push({ era: era.id, g: item.g, label: item.label }); });
        });
        var count = {};
        return shuffle(all, rng).filter(function (q) {
            count[q.era] = (count[q.era] || 0) + 1;
            return count[q.era] <= MAX_PER_ERA;
        }).slice(0, QUESTIONS_PER_GAME);
    }

    function starsFor(errors) {
        return errors <= STAR_ERRORS[0] ? 3 : errors <= STAR_ERRORS[1] ? 2 : 1;
    }

    // Progression : { stars, errors } du meilleur résultat, ou null.
    function normalizeProgress(raw) {
        if (raw && typeof raw === 'object' && raw.stars >= 1) {
            return { stars: Math.min(MAX_STARS, Math.floor(raw.stars)), errors: Math.max(0, Math.floor(raw.errors) || 0) };
        }
        return null;
    }

    function recordResult(progress, errors) {
        var old = normalizeProgress(progress);
        var stars = starsFor(errors);
        if (!old || stars > old.stars || (stars === old.stars && errors < old.errors)) return { stars: stars, errors: errors };
        return old;
    }

    return {
        ERAS: ERAS, QUESTIONS_PER_GAME: QUESTIONS_PER_GAME, MAX_STARS: MAX_STARS,
        find: find, gregorianText: gregorianText, accepts: accepts, answerText: answerText, shuffle: shuffle,
        deal: deal, starsFor: starsFor, normalizeProgress: normalizeProgress, recordResult: recordResult
    };
}));
