// =========================================================================
// === HISTORIAXE — LES DÉCORS DU CHEMIN DU TEMPS (sprites SVG) ===
// =========================================================================
// De petits dessins à plat (deux tons, pas de dégradé : ils s'affichent identiques partout et restent légers) qui
// peuplent le paysage de chaque monde (voir js/pathScenery.js pour leur choix et leur placement).
//
//   decor     : arbres, rochers, objets de l'époque — viewBox 0 0 48 48, posés au pied de la boîte.
//   landmarks : le monument qui garde la fin du monde (le « château » du boss) — viewBox 0 0 120 100.
//
// Chaque entrée est le contenu d'un <symbol> ; path.js les injecte une fois dans la page (id `sp-<nom>`).
// Module UMD : testable sans navigateur (tests/path.test.js vérifie que tout sprite cité par un thème existe).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.PathSprites = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Teintes communes : un même vert, une même pierre d'un dessin à l'autre.
    var C = {
        leaf: '#3f9d5b', leafDark: '#2c7a45', leafLight: '#6cc16f', trunk: '#8a5a33', stone: '#9aa0a6', stoneDark: '#737a82',
        stoneLight: '#c4c9ce', sand: '#e6c98a', sandDark: '#cfa965', wood: '#a8743f', woodDark: '#7a4f28', roof: '#c0563c',
        roofDark: '#963f2b', white: '#f4efe4', cream: '#ecdcb8', gold: '#e3b23c', blue: '#3b7dc4', red: '#cf3f3a',
        dark: '#4a4038', water: '#6fb4e8', brick: '#b4623f', slate: '#5b6b7c', grey: '#8d9296'
    };

    function r(x, y, w, h, fill) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"/>'; }
    function p(points, fill) { return '<polygon points="' + points + '" fill="' + fill + '"/>'; }
    function c(cx, cy, rad, fill) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + rad + '" fill="' + fill + '"/>'; }
    function e(cx, cy, rx, ry, fill) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"/>'; }
    function d(path, fill) { return '<path d="' + path + '" fill="' + fill + '"/>'; }
    function line(x1, y1, x2, y2, stroke, w) {
        return '<path d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '" stroke="' + stroke + '" stroke-width="' + (w || 2) + '" stroke-linecap="round" fill="none"/>';
    }
    // Une rangée de créneaux le long d'un mur : x0 → x1, au sommet y.
    function battlements(x0, x1, y, fill) {
        var out = '';
        for (var x = x0; x + 4 <= x1; x += 8) out += r(x, y - 4, 4, 4, fill);
        return out;
    }
    // Colonnes régulières d'un portique.
    function columns(x0, count, gap, y, h, w, fill) {
        var out = '';
        for (var i = 0; i < count; i++) out += r(x0 + i * gap, y, w, h, fill);
        return out;
    }
    // Des fenêtres sur une grille.
    function windows(x0, y0, cols, rows, gx, gy, w, h, fill) {
        var out = '';
        for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) out += r(x0 + i * gx, y0 + j * gy, w, h, fill);
        return out;
    }

    var decor = {
        pine: p('24,3 38,24 10,24', C.leafDark) + p('24,12 41,36 7,36', C.leaf) + p('24,22 44,44 4,44', C.leafDark) + r(21, 43, 6, 5, C.trunk),
        oak: r(21, 28, 6, 20, C.trunk) + c(24, 20, 15, C.leaf) + c(16, 25, 9, C.leafDark) + c(31, 14, 8, C.leafLight),
        palm: d('M23 48 Q26 30 22 12', 'none') + '<path d="M23 48 Q27 30 22 14" stroke="' + C.trunk + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
            d('M22 14 Q10 6 3 14 Q13 10 22 16Z', C.leaf) + d('M22 14 Q34 4 45 12 Q33 9 22 16Z', C.leafDark) + d('M22 14 Q20 2 28 0 Q24 8 23 15Z', C.leafLight) + c(22, 16, 3, C.woodDark),
        cypress: r(22, 40, 4, 8, C.trunk) + e(24, 22, 9, 22, C.leafDark) + e(22, 24, 5, 17, C.leaf),
        olive: r(22, 30, 4, 18, C.trunk) + e(24, 22, 17, 11, '#8fa76a') + e(17, 25, 9, 6, '#6f8b52') + e(31, 18, 8, 5, '#a9bd86'),
        deadtree: '<path d="M24 48 L24 22 M24 32 L12 18 M24 26 L36 12 M24 38 L34 30" stroke="' + C.dark + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
        rock: p('4,44 10,24 22,16 34,22 44,44', C.stone) + p('22,16 34,22 44,44 26,44', C.stoneDark) + p('10,24 22,16 20,30', C.stoneLight),
        bush: c(14, 36, 10, C.leafDark) + c(32, 34, 12, C.leaf) + c(23, 30, 11, C.leafLight) + r(6, 42, 36, 4, C.leafDark),
        flowers: r(8, 40, 32, 4, C.leafDark) + c(12, 36, 4, '#f4b8d4') + c(24, 32, 4, '#fff3a3') + c(36, 37, 4, '#f4b8d4') + c(18, 41, 3, '#fff') + c(30, 42, 3, '#fff3a3'),
        dune: d('M0 46 Q14 20 28 34 Q38 24 48 46Z', C.sand) + d('M0 46 Q14 28 22 40 Q30 34 48 46Z', C.sandDark),
        reed: '<path d="M10 46 L10 14 M18 46 L18 8 M26 46 L26 16 M34 46 L34 10 M42 46 L42 20" stroke="#7d9b4d" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
            e(10, 13, 2.4, 5, C.woodDark) + e(18, 7, 2.4, 5, C.woodDark) + e(34, 9, 2.4, 5, C.woodDark),
        wheat: r(2, 28, 44, 18, '#e0b84a') + r(2, 28, 44, 5, '#f2d36b') + r(2, 38, 44, 3, '#c79a30') + '<path d="M8 28 L8 20 M16 28 L16 18 M24 28 L24 20 M32 28 L32 18 M40 28 L40 20" stroke="#e0b84a" stroke-width="2" fill="none"/>',
        crater: e(24, 38, 21, 8, '#6b5a47') + e(24, 36, 16, 5, '#3f3328') + e(24, 40, 10, 2.5, '#5a4a38'),
        tent: p('24,6 44,44 4,44', C.cream) + p('24,6 44,44 30,44', '#d9c496') + p('24,22 31,44 17,44', C.woodDark) + '<path d="M24 6 L24 1" stroke="' + C.woodDark + '" stroke-width="2"/>' + p('24,1 32,3 24,5', C.red),
        hut: p('24,6 46,30 2,30', '#d9b25a') + p('24,6 46,30 34,30', '#c29a3f') + r(8, 30, 32, 16, C.wood) + r(20, 34, 9, 12, C.woodDark),
        skinhut: p('24,4 42,46 6,46', '#a6794a') + p('24,4 42,46 30,46', '#85603a') + p('24,26 30,46 18,46', C.dark) + '<path d="M24 4 L19 -1 M24 4 L29 -1" stroke="' + C.woodDark + '" stroke-width="2"/>',
        campfire: '<path d="M10 44 L38 38 M12 38 L36 44" stroke="' + C.woodDark + '" stroke-width="4" stroke-linecap="round"/>' + d('M24 38 Q14 28 24 10 Q26 22 34 28 Q38 36 24 38Z', '#f08a24') + d('M24 38 Q18 31 24 20 Q28 28 30 33 Q30 37 24 38Z', '#ffd45a'),
        mammoth: e(22, 28, 17, 13, '#7a5538') + e(36, 24, 9, 9, '#7a5538') + r(10, 36, 5, 10, '#5e3f28') + r(24, 38, 5, 8, '#5e3f28') +
            '<path d="M42 28 Q48 36 40 42" stroke="' + C.cream + '" stroke-width="3" fill="none" stroke-linecap="round"/>' + c(39, 22, 1.4, C.dark),
        column: r(14, 40, 20, 6, C.stoneLight) + r(17, 12, 14, 28, C.white) + r(17, 12, 4, 28, '#fff') + r(13, 8, 22, 5, C.stoneLight) + r(17, 20, 3, 0, C.stone) + p('30,12 36,12 33,20', 'none'),
        ruin: r(6, 38, 36, 8, C.stoneLight) + r(10, 22, 9, 16, C.white) + r(10, 22, 3, 16, '#fff') + r(28, 30, 9, 8, C.white) + p('10,22 19,22 17,18 12,19', C.white),
        amphora: d('M16 8 L32 8 L30 14 Q40 22 34 38 Q28 46 24 46 Q20 46 14 38 Q8 22 18 14Z', C.brick) + r(15, 6, 18, 4, C.roofDark) + '<path d="M16 24 L34 24" stroke="' + C.dark + '" stroke-width="2"/>' + '<path d="M12 18 Q4 24 12 30 M36 18 Q44 24 36 30" stroke="' + C.roofDark + '" stroke-width="2.4" fill="none"/>',
        arch: r(0, 34, 48, 12, C.cream) + r(0, 6, 48, 6, C.cream) + r(0, 6, 48, 2, '#fff') + d('M4 46 L4 22 Q12 10 20 22 L20 46Z', C.sandDark) + d('M28 46 L28 22 Q36 10 44 22 L44 46Z', C.sandDark) + r(0, 12, 48, 10, C.cream),
        fountain: e(24, 40, 20, 6, C.stone) + e(24, 38, 17, 4, C.water) + r(21, 20, 6, 18, C.stoneLight) + e(24, 20, 9, 3, C.stoneLight) + d('M24 20 Q16 12 12 22 M24 20 Q32 12 36 22 M24 20 L24 8', 'none') + '<path d="M24 20 Q18 8 12 22 M24 20 Q30 8 36 22 M24 20 L24 6" stroke="' + C.water + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
        topiary: c(24, 18, 12, C.leafDark) + c(24, 18, 8, C.leaf) + r(22, 28, 4, 8, C.trunk) + r(15, 36, 18, 10, C.brick) + r(13, 35, 22, 3, C.roofDark),
        house: r(6, 22, 36, 24, C.cream) + p('2,24 24,4 46,24', C.roof) + p('24,4 46,24 30,24', C.roofDark) + r(10, 28, 7, 7, C.slate) + r(31, 28, 7, 7, C.slate) + r(20, 34, 8, 12, C.woodDark) +
            '<path d="M6 22 L42 46 M42 22 L6 46" stroke="' + C.woodDark + '" stroke-width="1.4"/>',
        windmill: p('14,46 34,46 30,18 18,18', C.cream) + p('12,18 36,18 24,6', C.roof) + '<path d="M24 14 L6 -2 M24 14 L42 30 M24 14 L40 -2 M24 14 L8 30" stroke="' + C.woodDark + '" stroke-width="3" stroke-linecap="round"/>' + r(21, 36, 6, 10, C.woodDark),
        tower: r(14, 14, 20, 32, C.stone) + r(14, 14, 6, 32, C.stoneLight) + battlements(12, 36, 14, C.stoneDark) + r(12, 12, 24, 3, C.stoneDark) + r(21, 20, 6, 8, C.dark) + r(19, 38, 10, 8, C.woodDark),
        banner: r(10, 2, 3, 44, C.woodDark) + d('M13 4 L40 4 L34 12 L40 20 L13 20Z', C.red) + c(24, 12, 3, C.gold),
        flag: r(10, 2, 3, 44, C.woodDark) + r(13, 4, 9, 14, C.blue) + r(22, 4, 9, 14, C.white) + r(31, 4, 9, 14, C.red),
        cannon: e(14, 40, 9, 8, C.woodDark) + c(14, 40, 4, C.wood) + '<path d="M16 32 L40 22 L43 28 L20 38Z" fill="' + C.dark + '"/>' + c(41, 25, 4, C.dark) + r(4, 44, 22, 3, C.dark),
        barricade: e(12, 38, 9, 8, C.wood) + e(36, 38, 9, 8, C.wood) + r(3, 31, 18, 3, C.woodDark) + r(27, 31, 18, 3, C.woodDark) + r(2, 14, 44, 5, C.woodDark) + r(8, 22, 5, 22, C.wood) + r(28, 18, 5, 26, C.wood) + p('34,4 46,8 34,12', C.red),
        chimney: r(16, 14, 14, 32, C.brick) + r(14, 10, 18, 5, C.roofDark) + r(16, 22, 14, 3, C.cream) + c(26, 6, 5, '#d8d8d8') + c(34, 2, 4, '#e8e8e8') + c(20, 4, 3, '#cfcfcf'),
        hlm: r(8, 6, 32, 40, C.stoneLight) + windows(12, 10, 4, 6, 7, 6, 4, 4, C.slate) + r(8, 44, 32, 2, C.stoneDark),
        lamp: r(22, 12, 3, 34, C.dark) + r(18, 44, 11, 3, C.dark) + d('M16 12 L30 12 L27 4 L19 4Z', C.dark) + r(19, 6, 9, 6, '#ffe07a'),
        poplar: r(22, 40, 4, 8, C.trunk) + e(24, 22, 7, 20, '#7ab648') + e(22, 24, 4, 15, '#98cf63'),
        sandbags: e(10, 40, 9, 5, '#c2a76b') + e(28, 40, 9, 5, '#b89c60') + e(19, 33, 9, 5, '#cdb277') + e(37, 33, 8, 5, '#c2a76b') + e(28, 26, 9, 5, '#cdb277'),
        barbed: '<path d="M4 8 L4 44 M24 8 L24 44 M44 8 L44 44" stroke="' + C.dark + '" stroke-width="3"/><path d="M0 18 Q6 12 12 18 T24 18 T36 18 T48 18 M0 30 Q6 24 12 30 T24 30 T36 30 T48 30" stroke="#5a5a5a" stroke-width="1.6" fill="none"/>',
        stump: r(14, 28, 20, 16, '#5a4636') + e(24, 28, 10, 4, '#7a6045') + '<path d="M14 28 L10 18 M34 28 L38 16 M24 28 L26 14" stroke="#5a4636" stroke-width="3" stroke-linecap="round"/>',
        antenna: '<path d="M24 46 L24 4 M24 46 L14 46 M24 46 L34 46 M24 14 L14 20 M24 14 L34 20 M24 26 L16 32 M24 26 L32 32" stroke="' + C.grey + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' + c(24, 4, 3, C.red),
        car: d('M4 34 L10 22 L34 22 L42 34 L46 36 L46 42 L4 42Z', '#d6453d') + p('12,24 20,24 20,33 8,33', '#bfe3f5') + p('23,24 32,24 38,33 23,33', '#bfe3f5') + c(14, 42, 5, C.dark) + c(36, 42, 5, C.dark) + c(14, 42, 2, C.stoneLight) + c(36, 42, 2, C.stoneLight),
        turbine: r(22, 22, 4, 26, C.white) + c(24, 20, 4, C.stoneLight) + '<path d="M24 20 L24 0 M24 20 L41 30 M24 20 L7 30" stroke="' + C.white + '" stroke-width="3.4" stroke-linecap="round"/>',
        solar: p('4,40 12,16 44,16 40,40', '#2c4a7c') + '<path d="M10 28 L43 28 M20 16 L16 40 M32 16 L29 40" stroke="#6f94c8" stroke-width="1.4"/>' + r(21, 40, 4, 7, C.grey),
        torch: r(22, 20, 4, 26, C.woodDark) + d('M24 4 Q14 14 24 22 Q34 14 24 4Z', '#f08a24') + d('M24 10 Q19 15 24 20 Q29 15 24 10Z', '#ffd45a'),
        cross: r(21, 6, 6, 40, C.stone) + r(10, 16, 28, 6, C.stone) + r(21, 6, 2, 40, C.stoneLight) + r(14, 44, 20, 4, C.stoneDark),
        scroll: r(10, 12, 28, 24, C.cream) + e(10, 24, 4, 12, C.sandDark) + e(38, 24, 4, 12, C.sandDark) + '<path d="M16 18 L32 18 M16 24 L32 24 M16 30 L26 30" stroke="' + C.woodDark + '" stroke-width="1.8"/>',
        clock: c(24, 26, 18, C.cream) + c(24, 26, 14, C.white) + '<path d="M24 26 L24 15 M24 26 L32 30" stroke="' + C.dark + '" stroke-width="2.6" stroke-linecap="round"/>' + r(20, 4, 8, 5, C.gold),
        sailboat: d('M4 38 L44 38 L38 46 L10 46Z', C.woodDark) + r(23, 6, 2.4, 32, C.dark) + d('M26 8 L44 34 L26 34Z', C.white) + d('M22 12 L8 34 L22 34Z', C.cream),
        balloon: e(24, 18, 14, 16, C.red) + d('M10 18 Q24 40 38 18 Q24 12 10 18Z', C.gold) + r(20, 36, 8, 6, C.woodDark) + '<path d="M14 30 L20 36 M34 30 L28 36" stroke="' + C.dark + '" stroke-width="1.4"/>',
        book: r(6, 26, 36, 8, C.blue) + r(8, 34, 32, 8, C.red) + r(10, 18, 28, 8, C.gold),
        pagodaSmall: r(14, 36, 20, 10, C.red) + p('6,36 24,28 42,36', C.roofDark) + r(18, 22, 12, 6, C.red) + p('10,22 24,14 38,22', C.roofDark) + p('16,14 24,6 32,14', C.roofDark),
        torii: r(8, 12, 4, 34, C.red) + r(36, 12, 4, 34, C.red) + r(2, 8, 44, 5, C.red) + r(6, 17, 36, 3, C.red),
        cherry: r(22, 28, 4, 18, '#6b4a3a') + c(24, 20, 14, '#f4b8d4') + c(15, 24, 8, '#ee9cc0') + c(32, 14, 7, '#f9cde0'),
        bamboo: '<path d="M10 46 L10 6 M20 46 L20 2 M30 46 L30 8 M40 46 L40 14" stroke="#74b05a" stroke-width="3.4" stroke-linecap="round"/><path d="M10 20 L14 20 M20 14 L24 14 M30 24 L34 24" stroke="#4d8a3a" stroke-width="2"/>',
        acacia: r(22, 26, 4, 22, C.trunk) + e(24, 18, 22, 7, '#7ea04a') + e(18, 21, 10, 4, '#5f8238'),
        baobab: d('M16 46 Q12 24 18 14 L30 14 Q36 24 32 46Z', '#9c7a58') + e(24, 12, 20, 8, '#6f9444') + e(14, 14, 8, 5, '#5a7d36'),
        camel: e(24, 28, 14, 8, '#c79a5e') + c(22, 20, 5, '#c79a5e') + c(30, 20, 5, '#b98a50') + r(10, 34, 3, 12, '#a87c46') + r(32, 34, 3, 12, '#a87c46') + d('M34 24 Q42 14 44 8 L46 10 Q44 20 38 28Z', '#c79a5e'),
        pyramidSmall: p('2,46 24,8 46,46', C.sand) + p('24,8 46,46 28,46', C.sandDark),
        obelisk: p('18,46 20,10 28,10 30,46', C.sand) + p('20,10 24,2 28,10', C.gold) + r(14, 44, 20, 3, C.sandDark),
        ziggurat: r(2, 36, 44, 10, C.sandDark) + r(8, 26, 32, 10, C.sand) + r(14, 16, 20, 10, C.sandDark) + r(19, 8, 10, 8, C.sand),
        cactus: r(19, 10, 10, 36, '#5fa04e') + r(8, 22, 5, 14, '#5fa04e') + r(8, 32, 14, 5, '#5fa04e') + r(35, 16, 5, 12, '#5fa04e') + r(28, 24, 12, 5, '#5fa04e'),
        statue: r(14, 40, 20, 6, C.stone) + r(18, 20, 12, 20, '#7fb6a0') + c(24, 14, 6, '#7fb6a0') + '<path d="M30 20 L36 4" stroke="#7fb6a0" stroke-width="3" stroke-linecap="round"/>' + c(36, 3, 3, C.gold),
        tulip: r(8, 40, 32, 4, C.leafDark) + '<path d="M14 40 L14 30 M24 40 L24 26 M34 40 L34 31" stroke="#4d8a3a" stroke-width="2"/>' + e(14, 28, 4, 5, '#e84a6a') + e(24, 24, 4, 5, '#f2c34a') + e(34, 29, 4, 5, '#e84a6a'),
        crane: r(6, 44, 36, 3, C.dark) + r(12, 6, 3, 40, '#e0a132') + '<path d="M12 8 L44 8 M12 8 L4 14 M30 8 L30 20" stroke="#e0a132" stroke-width="3"/>' + r(27, 20, 6, 5, C.dark)
    };

    // --- Monuments : viewBox 0 0 120 100 -------------------------------------------------------------------
    var landmarks = {
        cave: d('M4 98 Q4 40 30 24 Q60 4 92 24 Q116 42 116 98Z', C.stone) + d('M4 98 Q10 50 36 34 Q50 52 40 98Z', C.stoneLight) + d('M92 24 Q116 42 116 98 L90 98 Q96 52 78 28Z', C.stoneDark) +
            d('M38 98 Q36 62 60 56 Q84 62 82 98Z', '#2e2620') + e(60, 90, 16, 4, '#ffb347') + c(52, 74, 3, '#c0563c') + c(62, 70, 3, '#c0563c') + c(70, 78, 3, '#d9a441') + p('10,36 18,20 24,38', C.leafDark),
        ziggurat: r(6, 80, 108, 18, C.sandDark) + r(18, 62, 84, 18, C.sand) + r(30, 44, 60, 18, C.sandDark) + r(42, 28, 36, 16, C.sand) + r(50, 14, 20, 14, C.blue) + r(56, 80, 8, 18, '#6b4a2a') +
            p('48,98 72,98 70,62 50,62', 'none') + r(58, 62, 4, 18, '#8a6a42') + r(58, 44, 4, 18, '#8a6a42'),
        mayan: r(10, 82, 100, 16, C.stone) + r(20, 68, 80, 14, C.stoneLight) + r(30, 54, 60, 14, C.stone) + r(40, 40, 40, 14, C.stoneLight) + r(48, 22, 24, 18, C.stone) + r(54, 26, 12, 14, '#3b3128') + r(52, 18, 16, 5, C.stoneDark) +
            r(54, 56, 12, 42, C.stoneDark) + '<path d="M60 98 L60 56" stroke="#2f2a24" stroke-width="2" stroke-dasharray="3 3"/>',
        parthenon: r(6, 84, 108, 8, C.stoneLight) + r(10, 76, 100, 8, C.white) + columns(14, 9, 11, 36, 40, 7, '#fbf7ec') + columns(14, 9, 11, 36, 40, 2.4, '#e0d8c2') + r(10, 30, 100, 7, C.stoneLight) + p('6,30 60,6 114,30', C.white) + p('18,28 60,12 102,28', '#e9e2cd') + r(10, 92, 100, 6, C.stone) + c(60, 22, 4, C.blue),
        temple: r(8, 84, 104, 14, C.stone) + r(14, 76, 92, 8, C.stoneLight) + columns(20, 6, 16, 34, 42, 9, C.white) + columns(20, 6, 16, 34, 42, 3, '#ddd4bd') + r(14, 28, 92, 7, C.stoneLight) + p('10,28 60,4 110,28', C.roof) + p('22,26 60,10 98,26', C.roofDark) + r(54, 14, 12, 8, C.gold),
        colosseum: d('M4 98 L4 50 Q60 20 116 50 L116 98Z', C.sand) + d('M60 20 Q116 50 116 98 L84 98 L84 50Z', C.sandDark) +
            windows(10, 56, 8, 1, 12, 0, 8, 14, C.dark) + windows(10, 78, 8, 1, 12, 0, 8, 14, C.dark) + windows(14, 36, 7, 1, 13, 0, 7, 10, '#5a4a3a') + r(4, 50, 112, 3, C.sandDark) + r(4, 74, 112, 3, C.sandDark) +
            d('M92 30 L116 50 L116 56 L92 40Z', C.sandDark) + p('4,50 4,40 14,38 20,44', C.sandDark),
        abbey: r(10, 56, 70, 42, C.stoneLight) + r(10, 56, 70, 4, C.stone) + p('6,58 45,34 84,58', '#9a6a4a') + r(80, 30, 24, 68, C.stone) + p('78,32 92,6 106,32', '#7d5a42') + r(88, 40, 8, 12, C.dark) + r(32, 74, 16, 24, C.woodDark) + windows(18, 64, 3, 1, 22, 0, 6, 12, C.dark) +
            r(91, 0, 2, 8, C.dark) + r(87, 3, 10, 2, C.dark),
        castle: r(8, 54, 104, 44, C.stone) + battlements(8, 112, 54, C.stone) + r(8, 54, 104, 4, C.stoneDark) + r(4, 24, 24, 74, C.stoneLight) + r(92, 24, 24, 74, C.stoneLight) + battlements(2, 30, 24, C.stoneLight) + battlements(90, 118, 24, C.stoneLight) +
            r(46, 30, 28, 68, C.stone) + p('42,30 60,8 78,30', C.roof) + r(56, 40, 8, 14, C.dark) + d('M44 98 L44 76 Q60 62 76 76 L76 98Z', C.woodDark) + r(12, 38, 6, 12, C.dark) + r(102, 38, 6, 12, C.dark) + r(58, 2, 2, 8, C.dark) + p('60,2 72,5 60,8', C.red),
        cathedral: r(14, 40, 92, 58, C.stoneLight) + r(14, 40, 92, 4, C.stone) + r(10, 8, 26, 90, C.stone) + r(84, 8, 26, 90, C.stone) + r(10, 8, 26, 4, C.stoneDark) + r(84, 8, 26, 4, C.stoneDark) +
            d('M16 40 L22 28 L28 40Z', C.stoneDark) + d('M92 40 L98 28 L104 40Z', C.stoneDark) + c(60, 56, 15, C.stoneDark) + c(60, 56, 11, '#6fa6d8') + c(60, 56, 4, '#f0c24a') +
            d('M42 98 L42 74 Q60 54 78 74 L78 98Z', C.woodDark) + d('M16 98 L16 80 Q23 70 30 80 L30 98Z', C.dark) + d('M90 98 L90 80 Q97 70 104 80 L104 98Z', C.dark) + d('M14 12 L18 0 L22 12Z', C.stoneDark) + d('M98 12 L102 0 L106 12Z', C.stoneDark),
        fortress: r(4, 50, 112, 48, C.stoneDark) + r(4, 50, 112, 4, C.stone) + battlements(4, 116, 50, C.stoneDark) + r(8, 22, 26, 76, C.stone) + r(86, 22, 26, 76, C.stone) + battlements(6, 36, 22, C.stone) + battlements(84, 114, 22, C.stone) +
            r(44, 36, 32, 62, C.stone) + battlements(42, 78, 36, C.stone) + d('M50 98 L50 76 Q60 64 70 76 L70 98Z', C.dark) + r(56, 44, 8, 12, C.dark) + r(16, 34, 6, 10, C.dark) + r(98, 34, 6, 10, C.dark) +
            p('2,98 2,86 12,92', C.red) + r(20, 8, 2, 14, C.dark) + p('22,8 34,11 22,14', C.red) + r(98, 8, 2, 14, C.dark) + p('100,8 112,11 100,14', C.red),
        chateauLoire: r(8, 52, 104, 46, '#efe3c6') + r(8, 52, 104, 4, '#d9c79a') + windows(14, 62, 8, 2, 12, 16, 6, 10, C.slate) + r(14, 20, 24, 78, '#efe3c6') + r(82, 20, 24, 78, '#efe3c6') + p('10,22 26,0 42,22', C.slate) + p('78,22 94,0 110,22', C.slate) +
            r(48, 32, 24, 66, '#e6d7b4') + p('44,34 60,10 76,34', C.slate) + windows(52, 42, 2, 4, 12, 12, 6, 8, C.slate) + r(20, 36, 8, 12, C.slate) + r(92, 36, 8, 12, C.slate) + d('M52 98 L52 82 Q60 74 68 82 L68 98Z', C.woodDark) + c(60, 8, 3, C.gold),
        kirk: r(18, 50, 84, 48, C.stoneLight) + p('12,52 60,18 108,52', '#6b4a3a') + p('60,18 108,52 76,52', '#563b2e') + r(52, 6, 16, 34, C.stone) + p('50,8 60,-4 70,8', C.dark) + r(56, 12, 8, 12, C.dark) + d('M48 98 L48 74 Q60 60 72 74 L72 98Z', C.woodDark) + windows(24, 62, 3, 1, 14, 0, 7, 14, C.dark) + windows(74, 62, 3, 1, 8, 0, 7, 14, C.dark) + r(58, -2, 4, 6, C.gold),
        versailles: r(4, 62, 112, 36, '#efe3c6') + r(4, 62, 112, 4, C.gold) + windows(10, 70, 12, 1, 9, 0, 5, 20, C.slate) + r(4, 46, 28, 16, '#efe3c6') + r(88, 46, 28, 16, '#efe3c6') + r(34, 38, 52, 24, '#e6d7b4') + p('4,46 18,34 32,46', C.slate) + p('88,46 102,34 116,46', C.slate) +
            r(34, 38, 52, 4, C.gold) + p('34,38 60,22 86,38', C.slate) + columns(40, 6, 8, 44, 18, 3, C.white) + windows(10, 50, 3, 1, 8, 0, 4, 8, C.slate) + windows(94, 50, 3, 1, 8, 0, 4, 8, C.slate) + r(56, 12, 8, 12, C.gold) + p('56,12 60,4 64,12', C.gold) +
            r(52, 80, 16, 18, C.gold),
        pantheon: r(10, 82, 100, 16, C.stoneLight) + r(14, 74, 92, 8, C.white) + columns(20, 6, 16, 44, 30, 9, C.white) + columns(20, 6, 16, 44, 30, 3, '#ddd4bd') + p('14,44 60,26 106,44', C.white) + r(34, 34, 52, 10, '#e6dfca') +
            d('M34 34 Q34 0 60 0 Q86 0 86 34Z', '#9ab0c4') + d('M60 0 Q86 0 86 34 L68 34 Q70 10 60 0Z', '#7e95aa') + r(58, -6, 4, 8, C.gold) + c(60, -7, 3, C.gold),
        bastille: r(8, 30, 28, 68, C.stone) + r(84, 30, 28, 68, C.stone) + r(36, 40, 48, 58, C.stoneDark) + r(8, 30, 28, 4, C.stoneDark) + r(84, 30, 28, 4, C.stoneDark) + battlements(6, 38, 30, C.stone) + battlements(82, 114, 30, C.stone) + battlements(34, 86, 40, C.stoneDark) +
            r(18, 44, 5, 12, C.dark) + r(97, 44, 5, 12, C.dark) + r(18, 66, 5, 12, C.dark) + r(97, 66, 5, 12, C.dark) + r(48, 52, 6, 10, C.dark) + r(66, 52, 6, 10, C.dark) + d('M50 98 L50 78 Q60 68 70 78 L70 98Z', C.dark) +
            r(58, 10, 2, 22, C.dark) + r(60, 10, 8, 6, C.blue) + r(68, 10, 8, 6, C.white) + r(76, 10, 8, 6, C.red),
        arc: r(14, 90, 92, 8, C.stoneDark) + r(18, 20, 84, 70, C.stoneLight) + r(18, 20, 84, 8, C.stone) + r(18, 28, 84, 3, C.stoneDark) + d('M40 90 L40 52 Q60 28 80 52 L80 90Z', '#6b86a0') + r(18, 36, 84, 4, C.stone) + r(26, 44, 10, 18, C.stone) + r(84, 44, 10, 18, C.stone) + r(46, 12, 28, 8, C.stone),
        eiffel: d('M60 2 L66 30 L72 56 L90 98 L78 98 L66 74 L54 74 L42 98 L30 98 L48 56 L54 30Z', '#7a6a5e') + d('M50 56 L70 56 L74 66 L46 66Z', '#8e7d70') + d('M54 30 L66 30 L68 40 L52 40Z', '#8e7d70') + d('M48 74 Q60 56 72 74Z', C.sky || '#cfe3f2') +
            r(40, 54, 40, 4, '#5e5046') + r(52, 28, 16, 3, '#5e5046') + '<path d="M56 56 L64 74 M64 56 L56 74" stroke="#5e5046" stroke-width="1.4"/>' + r(59, -6, 2, 10, C.dark) + p('61,-6 70,-4 61,-2', C.red),
        warfort: d('M6 98 L6 56 L30 46 L30 62 L48 52 L48 98Z', '#6e6a62') + d('M52 98 L52 40 L72 30 L72 50 L90 38 L112 52 L112 98Z', '#7d786e') + r(8, 62, 6, 10, '#2f2c28') + r(62, 56, 8, 12, '#2f2c28') + r(92, 62, 8, 12, '#2f2c28') + p('20,58 26,52 32,58', '#2f2c28') +
            '<path d="M2 98 L118 98" stroke="#4a4038" stroke-width="6"/>' + e(20, 94, 14, 4, '#5a4a3a') + e(96, 95, 16, 4, '#5a4a3a') + '<path d="M72 30 L74 14 M82 40 L90 26" stroke="#4a4038" stroke-width="3"/>' + c(74, 12, 5, '#9a9a9a') + c(82, 6, 4, '#b0b0b0'),
        artdeco: r(30, 20, 60, 78, '#e8dcc0') + r(20, 44, 80, 54, '#d8c9a4') + r(40, 8, 40, 14, '#e8dcc0') + r(50, 0, 20, 10, '#e8dcc0') + p('54,0 60,-8 66,0', C.gold) +
            windows(26, 50, 8, 1, 9, 0, 4, 40, '#3b4d5f') + windows(36, 28, 5, 1, 10, 0, 4, 12, '#3b4d5f') + r(30, 20, 60, 3, C.gold) + r(20, 44, 80, 3, C.gold) + r(50, 78, 20, 20, C.gold),
        blocks: r(6, 34, 34, 64, C.stoneLight) + r(46, 14, 30, 84, '#d9d2c4') + r(82, 44, 32, 54, '#c8c2b6') + windows(10, 40, 4, 7, 8, 8, 5, 5, C.slate) + windows(50, 20, 4, 9, 7, 8, 4, 5, C.slate) + windows(86, 50, 4, 5, 7, 8, 5, 5, C.slate) + r(6, 94, 108, 4, C.stoneDark),
        factory: r(8, 54, 74, 44, C.brick) + p('8,54 30,36 30,54', C.brick) + p('30,54 52,36 52,54', C.roofDark) + p('52,54 74,36 74,54', C.brick) + r(86, 14, 12, 84, '#9a5a40') + r(84, 10, 16, 6, '#7a4530') + windows(14, 64, 7, 1, 10, 0, 6, 10, C.dark) + r(36, 76, 18, 22, C.dark) +
            c(92, 6, 6, '#bdbdbd') + c(102, 0, 5, '#cfcfcf'),
        skyscraper: r(34, 14, 28, 84, '#9fc0d8') + r(34, 14, 10, 84, '#bcd6e8') + r(66, 34, 22, 64, '#86a9c4') + r(10, 58, 22, 40, '#a9c9de') + windows(38, 20, 3, 12, 8, 6, 4, 3, '#e6f2fa') + windows(70, 40, 3, 9, 6, 6, 3, 3, '#e6f2fa') + windows(14, 64, 3, 6, 6, 6, 3, 3, '#e6f2fa') +
            r(46, 2, 3, 14, C.dark) + r(88, 90, 28, 8, C.stone) + c(103, 82, 8, '#6fb4e8') + '<path d="M95 82 L111 82 M103 74 L103 90" stroke="#3b7dc4" stroke-width="1.2"/>',
        clockTower: r(34, 40, 52, 58, C.stoneLight) + r(34, 40, 52, 4, C.stone) + c(60, 62, 20, C.white) + c(60, 62, 17, C.cream) + '<path d="M60 62 L60 48 M60 62 L72 68" stroke="' + C.dark + '" stroke-width="3" stroke-linecap="round"/>' + p('30,40 60,10 90,40', C.blue) +
            r(56, 0, 8, 12, C.gold) + r(8, 70, 22, 28, C.stoneLight) + r(90, 70, 22, 28, C.stoneLight) + d('M50 98 L50 82 Q60 72 70 82 L70 98Z', C.woodDark),
        pagoda: r(30, 86, 60, 12, C.red) + p('14,86 60,70 106,86', '#4a6a8c') + r(38, 60, 44, 12, C.red) + p('22,60 60,46 98,60', '#4a6a8c') + r(46, 36, 28, 12, C.red) + p('30,36 60,24 90,36', '#4a6a8c') + r(52, 12, 16, 12, C.red) + p('42,12 60,2 78,12', '#4a6a8c') + r(58, -4, 4, 8, C.gold) +
            r(54, 88, 12, 10, C.dark) + windows(40, 64, 4, 1, 10, 0, 6, 6, C.gold),
        mosque: r(14, 62, 74, 36, C.cream) + d('M24 62 Q24 22 51 22 Q78 22 78 62Z', '#4f8fa8') + d('M51 22 Q78 22 78 62 L64 62 Q66 36 51 22Z', '#3d7388') + r(50, 10, 3, 14, C.gold) + c(51.5, 8, 3, C.gold) +
            r(92, 22, 10, 76, C.cream) + p('90,22 97,2 104,22', '#4f8fa8') + r(94, 36, 6, 8, C.dark) + r(90, 50, 14, 3, C.sandDark) + d('M40 98 L40 80 Q51 68 62 80 L62 98Z', '#6b4a2a') + r(14, 54, 10, 8, C.cream) + c(19, 50, 5, '#4f8fa8'),
        japcastle: r(10, 82, 100, 16, C.stone) + r(26, 62, 68, 22, C.white) + p('16,64 60,50 104,64', C.slate) + r(36, 40, 48, 22, C.white) + p('26,42 60,28 94,42', C.slate) + r(46, 20, 28, 20, C.white) + p('38,22 60,8 82,22', C.slate) + c(40, 26, 0, C.gold) + p('52,8 60,-2 68,8', C.gold) +
            windows(34, 68, 5, 1, 12, 0, 6, 8, C.dark) + windows(42, 46, 3, 1, 12, 0, 6, 8, C.dark) + r(54, 26, 12, 9, C.dark),
        mudmosque: d('M10 98 L16 40 L28 40 L32 98Z', '#b98652') + d('M44 98 L46 30 L58 30 L60 98Z', '#c4915a') + d('M74 98 L80 36 L92 36 L98 98Z', '#b98652') + r(8, 56, 106, 42, '#c4915a') + r(10, 56, 102, 5, '#a8763f') +
            '<path d="M16 40 L16 28 M28 40 L28 28 M46 30 L46 18 M58 30 L58 18 M80 36 L80 24 M92 36 L92 24" stroke="#8a5e34" stroke-width="3"/>' + c(16, 26, 3, '#8a5e34') + c(28, 26, 3, '#8a5e34') + c(46, 16, 3, '#8a5e34') + c(58, 16, 3, '#8a5e34') + c(80, 22, 3, '#8a5e34') + c(92, 22, 3, '#8a5e34') +
            d('M48 98 L48 78 Q60 66 72 78 L72 98Z', '#5a3e22') + windows(18, 66, 3, 1, 28, 0, 5, 8, '#5a3e22')
    };

    return { decor: decor, landmarks: landmarks, DECOR_VIEWBOX: '0 0 48 48', LANDMARK_VIEWBOX: '-4 -12 128 114' };
});
