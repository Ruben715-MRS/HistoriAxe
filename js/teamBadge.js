// =========================================================================
// === ÉCUSSON D'ÉQUIPE — MOTEUR PUR (dessin SVG, validation, déblocages) ===
// =========================================================================
// L'enseignant dessine l'écusson de son équipe : un FOND (couleur du bouclier), un MOTIF posé dessus (avec sa
// propre couleur) et une BORDURE. Les bordures se gagnent avec la classe : chaque coffre ouvert en débloque de
// plus riches (bronze, argent, or… jusqu'à la bordure royale). Un médaillon indique le niveau de l'équipe
// (1 + nombre de coffres ouverts).
//
// Un écusson tient en quatre petits entiers, « fond.motif.couleurDuMotif.bordure » (par exemple « 0.2.1.0 ») :
// c'est ce que stocke et valide le serveur (api/team.js), et ce que dessine `render`. Aucun texte libre : rien à
// échapper, rien d'inapproprié possible. Tous les dessins sont originaux, faits de formes simples.
//
// Pur : ni DOM ni stockage — testé dans tests/teamBadge.test.js. L'éditeur et l'affichage sont dans js/app/team.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.TeamBadge = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Le bouclier, dans un cadre de 100 × 120.
    var OUTER = 'M50 4 L92 16 V58 C92 88 72 108 50 116 C28 108 8 88 8 58 V16 Z';
    var INNER = 'M50 13 L83 22.5 V57 C83 80 67 97 50 104 C33 97 17 80 17 57 V22.5 Z';

    // Douze couleurs, pour le fond comme pour le motif.
    var COLORS = ['#B23A48', '#E8DEDA', '#3A3560', '#D4BE48', '#B06CB4', '#262B2E',
        '#6B3F86', '#3C78B8', '#D86045', '#3F9A52', '#5A94C8', '#2F4F8F'];

    // Les motifs : chacun reçoit la couleur et rend des formes dans le cadre 100 × 120 (rognées au bouclier).
    var PATTERNS = [
        function () { return ''; },
        function (c) { return '<rect x="50" y="0" width="60" height="130" fill="' + c + '"/>'; },
        function (c) { return '<rect x="50" y="0" width="60" height="62" fill="' + c + '"/><rect x="0" y="62" width="50" height="70" fill="' + c + '"/>'; },
        function (c) { return '<rect x="0" y="36" width="100" height="16" fill="' + c + '"/><rect x="0" y="64" width="100" height="16" fill="' + c + '"/>'; },
        function (c) { return '<rect x="30" y="0" width="12" height="130" fill="' + c + '"/><rect x="58" y="0" width="12" height="130" fill="' + c + '"/>'; },
        function (c) {
            var s = '';
            for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) if ((x + y) % 2 === 0) s += '<rect x="' + (x * 12.5) + '" y="' + (y * 15) + '" width="12.5" height="15" fill="' + c + '"/>';
            return s;
        },
        function (c) { return '<path d="M8 52 L50 78 L92 52 V70 L50 96 L8 70 Z" fill="' + c + '"/>'; },
        function (c) { return '<rect x="43" y="14" width="14" height="100" fill="' + c + '"/><rect x="14" y="46" width="72" height="14" fill="' + c + '"/>'; },
        function (c) { return '<path d="M0 30 L100 80 V104 L0 54 Z" fill="' + c + '"/>'; },
        function (c) { return '<path d="M50 30 L56 47 L74 47 L60 58 L65 75 L50 65 L35 75 L40 58 L26 47 L44 47 Z" fill="' + c + '"/>'; },
        function (c) { return '<path d="M20 120 V76 H30 V84 H40 V76 H46 V84 H54 V76 H60 V84 H70 V76 H80 V120 Z" fill="' + c + '"/>'; },
        function (c) { return '<circle cx="50" cy="58" r="22" fill="none" stroke="' + c + '" stroke-width="10"/>'; }
    ];

    // Les bordures, de la plus simple à la plus riche. `chests` : coffres à avoir ouverts pour la débloquer.
    var BORDERS = [
        { chests: 0, from: '#8A6A34', to: '#D2AE5A', deco: '' },
        { chests: 1, from: '#7F8FA3', to: '#E0E7EF', deco: '' },
        { chests: 2, from: '#C99A1C', to: '#F7DA70', deco: '' },
        { chests: 4, from: '#7A2A8C', to: '#D878E8', deco: 'wings' },
        { chests: 6, from: '#3E4650', to: '#A5B0BC', deco: 'studs' },
        { chests: 9, from: '#8E2414', to: '#E8644A', deco: 'horns' },
        { chests: 13, from: '#B07A14', to: '#FFDD60', deco: 'crown' },
        { chests: 18, from: '#4B1D8A', to: '#9B5BE0', deco: 'royal' }
    ];

    var LIMITS = [COLORS.length, PATTERNS.length, COLORS.length, BORDERS.length];
    var DEFAULT = '0.2.1.0';

    // Formes qui dépassent du bouclier, derrière lui (ailes, cornes, couronne).
    function decoBehind(kind, fill) {
        if (kind === 'wings') return '<path d="M8 30 L-12 18 L-8 48 L6 56 Z M92 30 L112 18 L108 48 L94 56 Z" fill="' + fill + '"/>';
        if (kind === 'horns') return '<path d="M12 18 L-4 -2 L26 12 Z M88 18 L104 -2 L74 12 Z" fill="' + fill + '"/>';
        if (kind === 'crown') return '<path d="M16 20 L22 0 L36 14 L50 -4 L64 14 L78 0 L84 20 Z" fill="' + fill + '"/>';
        if (kind === 'royal') return '<path d="M6 40 L-10 22 L0 56 L8 64 Z M94 40 L110 22 L100 56 L92 64 Z M30 14 L50 -6 L70 14 Z" fill="' + fill + '"/>';
        return '';
    }
    function decoFront(kind, fill) {
        if (kind === 'studs') return '<circle cx="24" cy="21" r="3.5" fill="' + fill + '"/><circle cx="76" cy="21" r="3.5" fill="' + fill + '"/><circle cx="50" cy="111" r="3.5" fill="' + fill + '"/>';
        if (kind === 'royal') return '<path d="' + INNER + '" fill="none" stroke="#FFD95A" stroke-width="2.2"/>';
        return '';
    }

    function toInt(v) { var n = Number(v); return n === Math.floor(n) && isFinite(n) ? n : NaN; }

    // « 3.5.2.1 » → { bg, pattern, color, border }, ou null si ce n'est pas un écusson valide.
    function parse(str) {
        if (typeof str !== 'string' || !/^\d{1,2}\.\d{1,2}\.\d{1,2}\.\d{1,2}$/.test(str)) return null;
        var parts = str.split('.').map(toInt);
        for (var i = 0; i < 4; i++) if (!(parts[i] >= 0 && parts[i] < LIMITS[i])) return null;
        return { bg: parts[0], pattern: parts[1], color: parts[2], border: parts[3] };
    }
    function stringify(b) { return [b.bg, b.pattern, b.color, b.border].join('.'); }
    // Un écusson valide, sinon l'écusson par défaut.
    function normalize(str) { var b = parse(str); return stringify(b || parse(DEFAULT)); }

    // Combien de bordures sont ouvertes quand `chestsOpened` coffres l'ont été.
    function unlockedBorders(chestsOpened) {
        var n = 0;
        for (var i = 0; i < BORDERS.length; i++) if (BORDERS[i].chests <= Math.max(0, chestsOpened | 0)) n = i + 1;
        return n;
    }
    function canUseBorder(border, chestsOpened) { return border >= 0 && border < unlockedBorders(chestsOpened); }
    // Niveau affiché dans le médaillon : 1 + coffres ouverts, plafonné.
    function levelOf(chestsOpened) { return Math.min(99, 1 + Math.max(0, chestsOpened | 0)); }

    // Le dessin. `opts` : level (médaillon, absent = pas de médaillon), uid (identifiants SVG uniques, si plusieurs
    // écussons sont dans la page), label (texte alternatif).
    function render(str, opts) {
        opts = opts || {};
        var b = parse(str) || parse(DEFAULT);
        var uid = String(opts.uid || '0').replace(/[^A-Za-z0-9_-]/g, '');
        var border = BORDERS[b.border];
        var bg = COLORS[b.bg];
        var pc = COLORS[b.color];
        var hex = '';
        if (opts.level) {
            var lv = Math.max(1, Math.min(99, opts.level | 0));
            hex = '<polygon points="50,-10 62,-3 62,11 50,18 38,11 38,-3" fill="#2A1D10" stroke="#E7C259" stroke-width="2.5"/>' +
                '<text x="50" y="9" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="' + (lv > 9 ? 12 : 15) + '" fill="#FFFFFF">' + lv + '</text>';
        }
        var title = opts.label ? '<title>' + String(opts.label).replace(/[<>&]/g, '') + '</title>' : '';
        return '<svg class="team-badge-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-14 -14 128 140" role="img"' +
            (opts.label ? '' : ' aria-hidden="true"') + ' focusable="false">' + title +
            '<defs><linearGradient id="tbg' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + border.to + '"/><stop offset="1" stop-color="' + border.from + '"/></linearGradient>' +
            '<clipPath id="tbc' + uid + '"><path d="' + INNER + '"/></clipPath></defs>' +
            decoBehind(border.deco, 'url(#tbg' + uid + ')') +
            '<path d="' + OUTER + '" fill="url(#tbg' + uid + ')"/>' +
            '<path d="' + INNER + '" fill="' + bg + '"/>' +
            '<g clip-path="url(#tbc' + uid + ')">' + PATTERNS[b.pattern](pc) + '</g>' +
            '<path d="' + INNER + '" fill="none" stroke="rgba(0,0,0,0.28)" stroke-width="1.5"/>' +
            decoFront(border.deco, border.to) + hex + '</svg>';
    }

    return {
        COLORS: COLORS, PATTERNS_COUNT: PATTERNS.length, BORDERS: BORDERS, DEFAULT: DEFAULT,
        parse: parse, stringify: stringify, normalize: normalize,
        unlockedBorders: unlockedBorders, canUseBorder: canUseBorder, levelOf: levelOf, render: render
    };
}));
