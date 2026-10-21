// =========================================================================
// === HISTORIAXE — LE PAYSAGE DE CHAQUE MONDE (voir js/pathSprites.js pour les dessins) ===
// =========================================================================
// Chaque monde du Chemin du Temps a son décor : un sol, une route, des arbres et des objets de l'époque de part et
// d'autre du chemin, et au bout du chemin le monument que garde le boss (le « château » du niveau final).
//
// Ce module ne dessine rien : il choisit (themeFor) et il place (layout), de façon déterministe — un monde a toujours
// le même paysage — et sans jamais poser un décor sur la route. Module UMD, testé sans navigateur (tests/path.test.js) ;
// js/app/path.js en fait des éléments HTML.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.PathScenery = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Les sols : [haut du pré, bas du pré], et la couleur de la route.
    var GROUNDS = {
        green: { ground: ['#c9e8a6', '#9fd47c'], road: '#f0d9a0' },
        dry: { ground: ['#e9d9a4', '#d9bd7c'], road: '#f4e4b8' },
        sand: { ground: ['#f2e0ae', '#e6c887'], road: '#fbefc9' },
        rock: { ground: ['#cfd3c0', '#aeb59a'], road: '#e6dcc0' },
        war: { ground: ['#bdb59f', '#9a9179'], road: '#d6cbb0' },
        city: { ground: ['#d3d8da', '#b5bdc2'], road: '#ece7da' },
        snow: { ground: ['#e6eef3', '#cddde8'], road: '#f4efe2' },
        spring: { ground: ['#d8ecb8', '#b4dc8c'], road: '#f2dfae' }
    };

    // Un thème : le sol, les décors (nom du sprite, poids de tirage) et le monument de fin de monde.
    var THEMES = {
        monde0: { ground: 'spring', landmark: 'clockTower', decor: [['clock', 2], ['scroll', 2], ['oak', 3], ['bush', 2], ['flowers', 2], ['book', 1]] },
        prehistoire: { ground: 'rock', landmark: 'cave', decor: [['pine', 3], ['rock', 3], ['skinhut', 2], ['campfire', 1], ['mammoth', 1], ['bush', 2], ['stump', 1]] },
        orient: { ground: 'sand', landmark: 'ziggurat', decor: [['palm', 3], ['dune', 3], ['reed', 2], ['pyramidSmall', 2], ['obelisk', 1], ['camel', 1], ['wheat', 1]] },
        grece: { ground: 'dry', landmark: 'parthenon', decor: [['olive', 3], ['cypress', 3], ['column', 2], ['ruin', 1], ['amphora', 2], ['sailboat', 1], ['flowers', 1]] },
        rome1: { ground: 'dry', landmark: 'temple', decor: [['cypress', 3], ['olive', 2], ['column', 2], ['arch', 2], ['amphora', 1], ['banner', 1]] },
        rome2: { ground: 'dry', landmark: 'colosseum', decor: [['cypress', 3], ['arch', 3], ['column', 2], ['flag', 1], ['statue', 1], ['olive', 1]] },
        'haut-moyen-age': { ground: 'green', landmark: 'abbey', decor: [['oak', 4], ['hut', 2], ['cross', 2], ['bush', 2], ['wheat', 1], ['stump', 1]] },
        feodalites: { ground: 'green', landmark: 'castle', decor: [['oak', 3], ['tower', 2], ['banner', 2], ['wheat', 2], ['house', 1], ['pine', 1]] },
        capetiens: { ground: 'spring', landmark: 'cathedral', decor: [['house', 3], ['windmill', 2], ['wheat', 2], ['oak', 2], ['cross', 1], ['flowers', 1]] },
        'cent-ans': { ground: 'war', landmark: 'fortress', decor: [['tent', 3], ['banner', 3], ['deadtree', 2], ['oak', 1], ['cannon', 1], ['rock', 1]] },
        renaissances: { ground: 'spring', landmark: 'chateauLoire', decor: [['cypress', 3], ['fountain', 2], ['topiary', 2], ['sailboat', 1], ['flowers', 2], ['tulip', 1]] },
        religion: { ground: 'rock', landmark: 'kirk', decor: [['house', 3], ['cross', 2], ['torch', 2], ['pine', 2], ['deadtree', 1], ['bush', 1]] },
        absolus: { ground: 'spring', landmark: 'versailles', decor: [['topiary', 4], ['fountain', 3], ['tulip', 2], ['poplar', 1], ['banner', 1]] },
        lumieres: { ground: 'spring', landmark: 'pantheon', decor: [['balloon', 2], ['book', 2], ['fountain', 1], ['oak', 2], ['lamp', 2], ['topiary', 1], ['flowers', 1]] },
        revolution: { ground: 'city', landmark: 'bastille', decor: [['barricade', 3], ['flag', 3], ['cannon', 2], ['house', 2], ['lamp', 1]] },
        'revolution-inachevee': { ground: 'city', landmark: 'arc', decor: [['barricade', 2], ['chimney', 2], ['lamp', 2], ['house', 2], ['flag', 1], ['poplar', 1]] },
        republique: { ground: 'green', landmark: 'eiffel', decor: [['poplar', 3], ['lamp', 2], ['house', 2], ['flag', 2], ['flowers', 1], ['chimney', 1]] },
        'grande-guerre': { ground: 'war', landmark: 'warfort', decor: [['crater', 3], ['barbed', 3], ['sandbags', 3], ['deadtree', 3], ['stump', 1]] },
        'entre-deux-guerres': { ground: 'city', landmark: 'artdeco', decor: [['car', 2], ['lamp', 3], ['poplar', 2], ['antenna', 1], ['house', 1], ['flag', 1]] },
        'trente-glorieuses': { ground: 'city', landmark: 'blocks', decor: [['hlm', 3], ['car', 3], ['lamp', 2], ['antenna', 1], ['poplar', 1], ['crane', 2]] },
        crises: { ground: 'city', landmark: 'factory', decor: [['chimney', 3], ['crane', 1], ['car', 1], ['rock', 1], ['lamp', 2], ['antenna', 1]] },
        'depuis-1991': { ground: 'green', landmark: 'skyscraper', decor: [['turbine', 3], ['solar', 2], ['antenna', 2], ['car', 1], ['oak', 1], ['lamp', 1]] },
        'ile-chine': { ground: 'spring', landmark: 'pagoda', decor: [['bamboo', 3], ['cherry', 1], ['pagodaSmall', 2], ['rock', 1], ['banner', 1], ['flowers', 1]] },
        'ile-ameriques': { ground: 'dry', landmark: 'mayan', decor: [['palm', 2], ['cactus', 2], ['tent', 1], ['rock', 2], ['obelisk', 1], ['bush', 2]] },
        'ile-islam': { ground: 'sand', landmark: 'mosque', decor: [['palm', 3], ['dune', 2], ['camel', 2], ['arch', 1], ['fountain', 1], ['cypress', 1]] },
        'ile-japon': { ground: 'spring', landmark: 'japcastle', decor: [['cherry', 3], ['torii', 2], ['bamboo', 2], ['pagodaSmall', 1], ['rock', 1], ['pine', 1]] },
        'ile-afrique': { ground: 'dry', landmark: 'mudmosque', decor: [['acacia', 3], ['baobab', 2], ['hut', 2], ['dune', 1], ['rock', 1], ['wheat', 1]] }
    };
    var FALLBACK = { ground: 'green', landmark: 'castle', decor: [['oak', 3], ['bush', 2], ['rock', 2], ['flowers', 1]] };

    // Les dessins petits ou imposants : leur taille d'affichage suit (le reste vaut 1).
    var SIZES = {
        flowers: 0.7, bush: 0.75, rock: 0.75, sandbags: 0.8, crater: 0.85, campfire: 0.7, amphora: 0.65, book: 0.65, scroll: 0.7, clock: 0.8,
        dune: 0.9, reed: 0.8, tulip: 0.7, stump: 0.7, torch: 0.75, cross: 0.8, barbed: 0.85, lamp: 0.95, banner: 0.95, flag: 0.95,
        tower: 1.05, windmill: 1.15, turbine: 1.2, hlm: 1.15, chimney: 1.1, pine: 1.1, palm: 1.15, cypress: 1.1, poplar: 1.15,
        baobab: 1.15, crane: 1.2, antenna: 1.1, balloon: 1.1, pyramidSmall: 1.0
    };
    var BASE_SIZE = 66;
    var MIN_GAP = 68; // unités du viewBox (300 de large) entre l'axe de la route et le centre d'un décor
    var LANDMARK_SIZE = 188;

    function themeFor(worldId) {
        var theme = THEMES[worldId] || FALLBACK;
        var g = GROUNDS[theme.ground] || GROUNDS.green;
        return { id: worldId, ground: g.ground, road: g.road, landmark: theme.landmark, decor: theme.decor };
    }

    function hash(str) {
        var h = 2166136261;
        for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
        return h >>> 0;
    }

    function rng(seed) {
        var a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function pick(random, entries) {
        var total = 0;
        entries.forEach(function (e) { total += e[1]; });
        var n = random() * total;
        for (var i = 0; i < entries.length; i++) { n -= entries[i][1]; if (n < 0) return entries[i][0]; }
        return entries[0][0];
    }

    // L'abscisse de la route à la hauteur y, d'après les pastilles (centres, de haut en bas ou l'inverse).
    function roadX(positions, y) {
        var best = positions[0];
        for (var i = 0; i < positions.length; i++) {
            if (Math.abs(positions[i].y - y) < Math.abs(best.y - y)) best = positions[i];
        }
        // Entre deux pastilles la route serpente : on prend l'interpolation de part et d'autre de y.
        var below = null, above = null;
        positions.forEach(function (p) {
            if (p.y >= y && (!below || p.y < below.y)) below = p;
            if (p.y <= y && (!above || p.y > above.y)) above = p;
        });
        if (below && above && below.y !== above.y) {
            var k = (y - above.y) / (below.y - above.y);
            return above.x + (below.x - above.x) * k;
        }
        return best.x;
    }

    // Les décors d'un monde : { sprite, x (unités du viewBox), y (px, pied du dessin), size (px), flip }, triés du fond au
    // premier plan. `positions` : les pastilles { x, y } dans les mêmes unités ; `height` : hauteur de la piste en px.
    function layout(worldId, opts) {
        var theme = themeFor(worldId);
        var width = opts.width || 300;
        var height = opts.height;
        var padTop = opts.padTop;
        var positions = opts.positions;
        var random = rng(hash('scenery|' + worldId));
        var items = [];
        var y = 46 + random() * 20;
        var side = random() < 0.5 ? -1 : 1;
        while (y < height - 24) {
            side = random() < 0.7 ? -side : side;
            var sprite = pick(random, theme.decor);
            var size = Math.round(BASE_SIZE * (SIZES[sprite] || 1) * (0.9 + random() * 0.25));
            var cx = roadX(positions, y);
            // Moitié de la largeur du dessin, en unités : il ne doit déborder ni sur la route ni hors de l'écran.
            var half = size / 2 * (width / (opts.pixelWidth || 340));
            var lo, hi;
            if (side < 0) { lo = half + 4; hi = cx - MIN_GAP - half * 0.3; } else { lo = cx + MIN_GAP + half * 0.3; hi = width - half - 4; }
            // Autour du monument, la place est réservée.
            var nearLandmark = y < padTop + 6;
            if (nearLandmark) {
                if (side < 0) hi = Math.min(hi, width / 2 - LANDMARK_SIZE / 2 * (width / (opts.pixelWidth || 340)) - half * 0.4);
                else lo = Math.max(lo, width / 2 + LANDMARK_SIZE / 2 * (width / (opts.pixelWidth || 340)) + half * 0.4);
            }
            if (hi - lo >= 6) {
                items.push({ sprite: sprite, x: Math.round((lo + random() * (hi - lo)) * 10) / 10, y: Math.round(y), size: size, flip: random() < 0.5 });
            }
            y += 20 + random() * 24;
        }
        items.sort(function (a, b) { return a.y - b.y; });
        return {
            theme: theme,
            decor: items,
            // Le monument se tient au bout du chemin, derrière la pastille du boss.
            landmark: { sprite: theme.landmark, x: width / 2, y: Math.max(40, padTop - 46), size: LANDMARK_SIZE }
        };
    }

    return { THEMES: THEMES, GROUNDS: GROUNDS, SIZES: SIZES, MIN_GAP: MIN_GAP, themeFor: themeFor, layout: layout, roadX: roadX };
});
