// =========================================================================
// === HISTORIAXE — CLIO, LA MASCOTTE : LE DESSIN (SVG, logique pure) ===
// =========================================================================
// Clio dessinée en SVG (docs/direction-artistique.md §7) : jeune chatte rousse et ronde, poitrail et museau crème,
// yeux verts. Ce module ne fait que des chaînes SVG : js/app/clio.js les pose dans la page, Flappy Clio en fait une
// image pour son canevas. Les animations (queue, respiration, clignement, patte qui salue…) sont dans css/style.css,
// sur les classes `ca-*` ; sans CSS, le dessin reste juste et immobile.
//
// Repère du dessin de face : viewBox 0 0 200 232, Clio assise, tête centrée en (100, 96). Les costumes sont des calques
// posés sur le corps (`body`) et sur la tête (`hat`), le visage reste toujours libre.
//
// Module UMD testé hors navigateur (tests/clioArt.test.js).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.ClioArt = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Palette figée (docs/direction-artistique.md §7).
    var P = {
        fur: '#EE8A3C', stripes: '#C65E1C', line: '#9C4A17', belly: '#FFF0DA', inner: '#F7B3A6',
        eye: '#5FB46A', nose: '#E26F80', pupil: '#17171F', blush: '#FF7E95', mouth: '#7A2734', tongue: '#F07F8E',
        star: '#F5C542', mark: '#7088B8', alert: '#D9534F', tear: '#8FD0F5', tearLine: '#4A90C0'
    };

    // Humeurs dessinées : celles de ClioCore.MOODS, plus « fier » et « surpris » (planche d'expressions).
    var MOODS = ['repos', 'salue', 'content', 'ravi', 'fier', 'surpris', 'reflechit', 'triste', 'dort'];

    // Costumes déjà dessinés, par monde (les autres restent des aperçus en emoji).
    var COSTUMES = { rome2: 'toge' };

    var uid = 0;

    function el(tag, attrs, inner) {
        var s = '<' + tag;
        for (var k in attrs) s += ' ' + k + '="' + attrs[k] + '"';
        return s + (inner === undefined ? '/>' : '>' + inner + '</' + tag + '>');
    }
    function line(d, w, color, extra) {
        var a = { d: d, stroke: color, 'stroke-width': w, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
        for (var k in extra || {}) a[k] = extra[k];
        return el('path', a);
    }
    function limb(d, w) { return line(d, w + 6, P.line) + line(d, w, P.fur); }
    function pad(cx, cy, rx, ry) { return el('ellipse', { cx: cx, cy: cy, rx: rx, ry: ry, fill: P.belly, stroke: P.line, 'stroke-width': 2.5 }); }
    function star(x, y, r) {
        var pts = [];
        for (var i = 0; i < 8; i++) {
            var rr = i % 2 ? r * 0.4 : r, a = Math.PI / 4 * i - Math.PI / 2;
            pts.push((x + rr * Math.cos(a)).toFixed(1) + ',' + (y + rr * Math.sin(a)).toFixed(1));
        }
        return el('polygon', { points: pts.join(' '), fill: P.star });
    }
    function text(x, y, size, color, s) {
        return el('text', { x: x, y: y, 'font-size': size, 'font-weight': 800, fill: color, 'font-family': 'Nunito, Arial, sans-serif' }, s);
    }

    // --- De face ----------------------------------------------------------------------------------------------
    var BODY = 'M100 128 C140 128 152 170 148 200 C146 214 130 218 100 218 C70 218 54 214 52 200 C48 170 60 128 100 128 Z';
    var TAIL = 'M136 204 C178 200 186 156 170 128 C162 112 172 98 186 104';

    function openEye(cx, cy, dx, dy, big) {
        var pupil = big
            ? el('circle', { cx: cx + dx, cy: cy + dy, r: 4.5, fill: P.pupil })
            : el('ellipse', { cx: cx + dx, cy: cy + dy, rx: 6.5, ry: 10, fill: P.pupil });
        return el('ellipse', { cx: cx, cy: cy, rx: big ? 13.5 : 12, ry: big ? 16.5 : 15, fill: P.eye, stroke: P.line, 'stroke-width': 2 }) + pupil +
            el('circle', { cx: cx - 4 + dx * 0.3, cy: cy - 6, r: 3.6, fill: '#fff' }) + el('circle', { cx: cx + 4, cy: cy + 6, r: 1.7, fill: '#fff' });
    }

    function eyes(mood) {
        var L = P.line, out;
        if (mood === 'content' || mood === 'ravi') {
            out = line('M64 100 Q76 84 88 100', 4, L) + line('M112 100 Q124 84 136 100', 4, L);
        } else if (mood === 'dort') {
            out = line('M64 97 Q76 106 88 97', 4, L) + line('M112 97 Q124 106 136 97', 4, L);
        } else if (mood === 'fier') {
            out = [76, 124].map(function (cx) {
                return openEye(cx, 96, 1, 3, false) +
                    el('path', { d: 'M' + (cx - 14) + ' 79 L' + (cx + 14) + ' 79 L' + (cx + 14) + ' 95 Q' + cx + ' 89 ' + (cx - 14) + ' 95 Z', fill: P.fur }) +
                    line('M' + (cx - 12.5) + ' 95 Q' + cx + ' 89 ' + (cx + 12.5) + ' 95', 3.5, L);
            }).join('');
        } else {
            var dx = 1, dy = 1;
            if (mood === 'triste') { dx = 0; dy = 4; }
            if (mood === 'reflechit') { dx = 4; dy = -4; }
            out = '<g class="ca-blink">' + openEye(76, 96, dx, dy, mood === 'surpris') + openEye(124, 96, dx, dy, mood === 'surpris') + '</g>';
        }
        if (mood === 'triste') out += line('M64 79 L86 72', 3.5, L) + line('M136 79 L114 72', 3.5, L);
        if (mood === 'reflechit') out += line('M65 77 L86 77', 3.5, L) + line('M114 74 Q125 66 136 72', 3.5, L);
        return out;
    }

    function mouth(mood) {
        var L = P.line, m;
        var nose = el('path', { d: 'M94 111 Q100 108.5 106 111 Q103 117 100 118 Q97 117 94 111 Z', fill: P.nose, stroke: L, 'stroke-width': 1.5, 'stroke-linejoin': 'round' });
        switch (mood) {
            case 'ravi':
                m = el('path', { d: 'M89 121 Q100 142 111 121 Q100 125 89 121 Z', fill: P.mouth, stroke: L, 'stroke-width': 2, 'stroke-linejoin': 'round' }) +
                    el('ellipse', { cx: 100, cy: 131.5, rx: 5, ry: 3.2, fill: P.tongue });
                break;
            case 'triste': m = line('M92 128 Q100 121 108 128', 2.5, L); break;
            case 'surpris': m = el('ellipse', { cx: 100, cy: 127, rx: 4.5, ry: 5.5, fill: P.mouth, stroke: L, 'stroke-width': 2 }); break;
            case 'dort': m = line('M96 123 Q100 126 104 123', 2.5, L); break;
            case 'reflechit': m = line('M93 124 Q100 123 107 120', 2.5, L); break;
            case 'fier': m = line('M100 117 L100 121 M89 121 Q94.5 127 100 121 Q106.5 128 114 118', 2.5, L); break;
            case 'content': case 'salue': m = line('M100 117 L100 121 M87 120 Q93.5 129 100 121 Q106.5 129 113 120', 2.5, L); break;
            default: m = line('M100 117 L100 121 M89 121 Q94.5 127 100 121 Q105.5 127 111 121', 2.5, L);
        }
        return nose + m;
    }

    function costume(kind, layer) {
        if (kind !== 'toge') return '';
        if (layer === 'body') {
            return el('path', { d: 'M56 152 C70 136 132 134 146 150 C150 172 151 192 148 204 C138 214 62 214 52 204 C49 188 50 168 56 152 Z', fill: '#7A2E8C', stroke: '#3E1448', 'stroke-width': 3, 'stroke-linejoin': 'round' }) +
                el('path', { d: 'M58 152 C82 160 118 186 146 204 L148 194 C122 176 92 156 66 146 Z', fill: '#F3EEE4', stroke: '#B8AE9A', 'stroke-width': 2, 'stroke-linejoin': 'round' }) +
                line('M58 152 C82 160 118 186 146 204', 3, '#E9C349') +
                line('M84 176 Q78 192 82 206 M108 190 Q104 200 106 208', 2.5, '#5A1F69') +
                el('circle', { cx: 64, cy: 150, r: 6.5, fill: '#E9C349', stroke: '#8A6A10', 'stroke-width': 2 });
        }
        var leaves = [[58, 66, -60], [64, 56, -45], [72, 48, -30], [82, 43, -15], [118, 43, 15], [128, 48, 30], [136, 56, 45], [142, 66, 60]].map(function (l) {
            return el('ellipse', { cx: l[0], cy: l[1], rx: 8, ry: 4, fill: '#E9C349', stroke: '#8A6A10', 'stroke-width': 1.5, transform: 'rotate(' + l[2] + ' ' + l[0] + ' ' + l[1] + ')' });
        }).join('');
        return line('M56 70 Q100 30 144 70', 3, '#8A6A10') + leaves + el('circle', { cx: 100, cy: 40, r: 4, fill: '#C8322F', stroke: '#7D1A17', 'stroke-width': 1.5 });
    }

    function costumeKind(world) { return world && Object.prototype.hasOwnProperty.call(COSTUMES, world) ? COSTUMES[world] : ''; }

    // Clio assise, de face. `opts.costume` : identifiant de monde (« rome2 ») ; `opts.label` : texte alternatif.
    function front(mood, opts) {
        opts = opts || {};
        if (MOODS.indexOf(mood) === -1) mood = 'repos';
        var id = 'clio-art-' + (++uid), L = P.line, cos = costumeKind(opts.costume);
        var defs = '<defs>' + el('clipPath', { id: id + 'h' }, el('ellipse', { cx: 100, cy: 96, rx: 64, ry: 52 })) +
            el('clipPath', { id: id + 'b' }, el('path', { d: BODY })) + '</defs>';
        var tail = '<g class="ca-tail">' + line(TAIL, 19, L) + line(TAIL, 13, P.fur) + line('M170 128 l9 -4 M178 150 l9 1 M168 176 l7 6', 4, P.stripes) + '</g>';
        var body = '<g class="ca-breath">' + el('path', { d: BODY, fill: P.fur }) +
            '<g clip-path="url(#' + id + 'b)">' + el('ellipse', { cx: 100, cy: 186, rx: 24, ry: 34, fill: P.belly }) +
            line('M54 170 l14 3 M52 186 l14 1 M146 170 l-14 3 M148 186 l-14 1', 4, P.stripes) + '</g>' +
            el('path', { d: BODY, fill: 'none', stroke: L, 'stroke-width': 3 }) + '</g>';
        var paws = pad(82, 213, 15, 9) + pad(118, 213, 15, 9);
        var ears = '<g class="ca-earL">' + el('path', { d: 'M50 80 L55 24 Q59 18 66 22 L98 50 Z', fill: P.fur, stroke: L, 'stroke-width': 3, 'stroke-linejoin': 'round' }) + el('path', { d: 'M61 66 L62 35 L87 52 Z', fill: P.inner }) + '</g>' +
            '<g class="ca-earR">' + el('path', { d: 'M150 80 L145 24 Q141 18 134 22 L102 50 Z', fill: P.fur, stroke: L, 'stroke-width': 3, 'stroke-linejoin': 'round' }) + el('path', { d: 'M139 66 L138 35 L113 52 Z', fill: P.inner }) + '</g>';
        var head = el('ellipse', { cx: 100, cy: 96, rx: 64, ry: 52, fill: P.fur }) +
            '<g clip-path="url(#' + id + 'h)">' + line('M100 46 L100 62 M87 49 L90 61 M113 49 L110 61 M38 90 L52 93 M38 101 L51 101 M162 90 L148 93 M162 101 L149 101', 4, P.stripes) + '</g>' +
            el('ellipse', { cx: 100, cy: 96, rx: 64, ry: 52, fill: 'none', stroke: L, 'stroke-width': 3 }) +
            el('path', { d: 'M100 108 C84 104 70 112 72 124 C74 135 90 137 100 131 C110 137 126 135 128 124 C130 112 116 104 100 108 Z', fill: P.belly });
        var happy = mood === 'content' || mood === 'ravi' || mood === 'salue' || mood === 'fier';
        var blush = happy ? el('ellipse', { cx: 57, cy: 115, rx: 9, ry: 5, fill: P.blush, opacity: 0.4 }) + el('ellipse', { cx: 143, cy: 115, rx: 9, ry: 5, fill: P.blush, opacity: 0.4 }) : '';
        var whiskers = line('M68 118 L36 111 M68 123 L36 126 M132 118 L164 111 M132 123 L164 126', 1.6, L, { opacity: 0.6 });
        var tear = mood === 'triste' ? el('path', { d: 'M66 112 Q61 121 66 124 Q71 121 66 112 Z', fill: P.tear, stroke: P.tearLine, 'stroke-width': 1 }) : '';
        var headG = '<g class="ca-head">' + ears + head + blush + eyes(mood) + mouth(mood) + whiskers + tear + costume(cos, 'hat') + '</g>';

        var arm = '';
        if (mood === 'salue') arm = '<g class="ca-wave">' + limb('M134 166 C156 160 168 142 167 124', 12) + pad(167, 119, 10, 9) + '</g>';
        if (mood === 'reflechit') arm = limb('M132 176 Q136 152 118 142', 12) + pad(116, 140, 10, 8.5);

        var fx = '';
        if (mood === 'ravi' || mood === 'fier') fx = star(30, 46, 9) + star(172, 36, 11) + (mood === 'ravi' ? star(182, 82, 6) : '');
        if (mood === 'dort') fx = '<g class="ca-zz">' + text(148, 46, 18, P.mark, 'z') + text(162, 28, 26, P.mark, 'Z') + '</g>';
        if (mood === 'reflechit') fx = text(160, 44, 32, P.mark, '?');
        if (mood === 'surpris') fx = text(164, 42, 32, P.alert, '!');

        var a11y = opts.label ? ' role="img" aria-label="' + String(opts.label).replace(/[&<>"]/g, '') + '"' : ' aria-hidden="true"';
        return '<svg xmlns="http://www.w3.org/2000/svg" class="clio-art ca-m-' + mood + '" viewBox="0 0 200 232"' + a11y + ' focusable="false">' + defs +
            '<g class="ca-whole">' + tail + body + costume(cos, 'body') + paws + headG + arm + fx + '</g></svg>';
    }

    // --- En vol, de profil vers la droite (Flappy Clio) -------------------------------------------------------
    // viewBox 0 0 250 170 ; le corps est centré en (106, 96). `opts.hurt` : yeux en croix (juste après un choc).
    var FLY = { W: 250, H: 170, CX: 106, CY: 96 };

    function sideHead(id, hurt) {
        var L = P.line;
        // Oreilles couchées par le vent : leur base reste bien dans la tête, seule la pointe file vers l'arrière.
        var ears = el('path', { d: 'M94 60 L70 34 Q66 29 73 29 L118 50 Z', fill: P.fur, stroke: L, 'stroke-width': 3, 'stroke-linejoin': 'round' }) +
            el('path', { d: 'M112 54 L92 24 Q89 18 96 20 L148 56 Z', fill: P.fur, stroke: L, 'stroke-width': 3, 'stroke-linejoin': 'round' }) +
            el('path', { d: 'M119 50 L100 29 L138 53 Z', fill: P.inner });
        var head = el('ellipse', { cx: 118, cy: 92, rx: 54, ry: 48, fill: P.fur }) +
            '<g clip-path="url(#' + id + 'sh)">' + line('M96 48 L100 62 M110 45 L112 58 M124 45 L124 58 M66 88 L80 91 M66 99 L79 99', 4, P.stripes) + '</g>' +
            el('ellipse', { cx: 118, cy: 92, rx: 54, ry: 48, fill: 'none', stroke: L, 'stroke-width': 3 });
        var muzzle = el('path', { d: 'M140 104 C150 96 170 98 176 106 C180 116 172 126 160 128 C148 129 138 120 140 104 Z', fill: P.belly });
        var nose = el('path', { d: 'M168 100 Q176 98 178 103 Q175 108 170 107 Z', fill: P.nose, stroke: L, 'stroke-width': 1.5, 'stroke-linejoin': 'round' });
        var eye, mouthS;
        if (hurt) {
            eye = line('M135 83 L149 97 M149 83 L135 97', 4, L);
            mouthS = line('M171 114 Q166 112 162 117 Q158 114 155 117', 2.5, L);
        } else {
            eye = el('ellipse', { cx: 142, cy: 90, rx: 9, ry: 13.5, fill: P.eye, stroke: L, 'stroke-width': 2 }) +
                el('ellipse', { cx: 145.5, cy: 91, rx: 4.5, ry: 9, fill: P.pupil }) + el('circle', { cx: 140, cy: 84.5, r: 3, fill: '#fff' }) + el('circle', { cx: 146, cy: 97, r: 1.4, fill: '#fff' });
            mouthS = el('path', { d: 'M170 113 Q166 124 156 119 Q164 117 170 113 Z', fill: P.mouth, stroke: L, 'stroke-width': 2, 'stroke-linejoin': 'round' });
        }
        var blush = el('ellipse', { cx: 144, cy: 110, rx: 7, ry: 4, fill: P.blush, opacity: 0.4 });
        var whiskers = line('M164 114 L196 107 M164 119 L196 123', 1.6, L, { opacity: 0.6 });
        return ears + head + muzzle + blush + eye + nose + mouthS + whiskers;
    }

    function fly(opts) {
        opts = opts || {};
        var id = 'clio-art-' + (++uid), L = P.line;
        var defs = '<defs>' + el('clipPath', { id: id + 'sh' }, el('ellipse', { cx: 118, cy: 92, rx: 54, ry: 48 })) +
            el('clipPath', { id: id + 'fb' }, el('ellipse', { cx: 106, cy: 96, rx: 56, ry: 28 })) + '</defs>';
        var TAIL_F = 'M58 96 C40 94 34 74 18 78 C8 80 6 92 14 95';
        var tail = '<g class="ca-tail-fly">' + line(TAIL_F, 19, L) + line(TAIL_F, 13, P.fur) + line('M44 88 l-2 -9 M26 76 l2 -8', 4, P.stripes) + '</g>';
        var hind = '<g class="ca-hind">' + limb('M74 106 L34 120', 11) + pad(30, 121, 10, 6.5) + limb('M80 112 L44 132', 11) + pad(40, 134, 10, 6.5) + '</g>';
        var body = el('ellipse', { cx: 106, cy: 96, rx: 56, ry: 28, fill: P.fur }) +
            '<g clip-path="url(#' + id + 'fb)">' + el('ellipse', { cx: 112, cy: 122, rx: 42, ry: 14, fill: P.belly }) +
            line('M86 68 L88 80 M102 66 L103 79 M118 67 L117 80 M70 74 L74 84', 4, P.stripes) + '</g>' +
            el('ellipse', { cx: 106, cy: 96, rx: 56, ry: 28, fill: 'none', stroke: L, 'stroke-width': 3 });
        var farPaw = limb('M138 108 L188 104', 11) + pad(193, 104, 10, 7);
        var nearPaw = limb('M134 116 L184 124', 11) + pad(189, 125, 10, 7);
        var head = '<g transform="translate(76 -6) scale(.86)">' + sideHead(id, !!opts.hurt) + '</g>';
        return '<svg xmlns="http://www.w3.org/2000/svg" class="clio-art clio-fly" viewBox="0 0 ' + FLY.W + ' ' + FLY.H + '" aria-hidden="true" focusable="false">' + defs +
            '<g class="ca-fly-body">' + tail + hind + farPaw + body + head + nearPaw + '</g></svg>';
    }

    return { PALETTE: P, MOODS: MOODS, COSTUMES: COSTUMES, FLY: FLY, front: front, fly: fly, hasCostume: function (world) { return costumeKind(world) !== ''; } };
});
