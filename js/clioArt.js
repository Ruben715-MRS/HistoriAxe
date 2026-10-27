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
    var COSTUMES = { prehistoire: 'mammouth', orient: 'egypte', grece: 'grece', rome1: 'legionnaire', rome2: 'toge',
        'haut-moyen-age': 'merovingien', feodalites: 'mailles', capetiens: 'lys', 'cent-ans': 'jeanne',
        renaissances: 'leonard', religion: 'fraise', absolus: 'roisoleil', lumieres: 'philosophe',
        revolution: 'phrygien', 'revolution-inachevee': 'hautdeforme', republique: 'belleepoque',
        'grande-guerre': 'adrian', 'entre-deux-guerres': 'anneesfolles', 'trente-glorieuses': 'spatiale', crises: 'perfecto', 'depuis-1991': 'connectee' };

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

    // --- Les costumes (de face) -------------------------------------------------------------------------------
    // Chaque costume habille tout le corps et laisse le visage libre. Calques : `body` (posé sur le corps, sous les
    // pattes) et `hat` (sur la tête). `id` sert aux découpes propres à un costume.
    function shape(d, fill, strokeColor, w) { return el('path', { d: d, fill: fill, stroke: strokeColor, 'stroke-width': w || 3, 'stroke-linejoin': 'round' }); }
    function clipped(id, d, inner) { return el('clipPath', { id: id }, el('path', { d: d })) + '<g clip-path="url(#' + id + ')">' + inner + '</g>'; }
    function laurel(leaf, edge) {
        return line('M56 70 Q100 30 144 70', 3, edge) + [[58, 66, -60], [64, 56, -45], [72, 48, -30], [82, 43, -15], [118, 43, 15], [128, 48, 30], [136, 56, 45], [142, 66, 60]].map(function (l) {
            return el('ellipse', { cx: l[0], cy: l[1], rx: 8, ry: 4, fill: leaf, stroke: edge, 'stroke-width': 1.5, transform: 'rotate(' + l[2] + ' ' + l[0] + ' ' + l[1] + ')' });
        }).join('');
    }
    // Un point de la courbe quadratique (x0,y0)→(x2,y2) de contrôle (x1,y1).
    function quad(t, x0, y0, x1, y1, x2, y2) {
        var u = 1 - t;
        return [u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2];
    }

    // Une fleur de lys centrée en (x, y), de taille `k` (1 ≈ 16 px de haut).
    function lis(x, y, k, fill, edge) {
        return el('path', {
            d: 'M0 -9 C3.5 -5 3.5 -1 0 3 C-3.5 -1 -3.5 -5 0 -9 Z M-1.5 2 C-6 -3 -10 1 -7 5 C-6 3 -4 3 -1.5 4.5 Z M1.5 2 C6 -3 10 1 7 5 C6 3 4 3 1.5 4.5 Z M-4.5 3.5 L4.5 3.5 L4.5 6 L-4.5 6 Z M-1.5 6 L1.5 6 L0 9 Z',
            fill: fill, stroke: edge, 'stroke-width': 0.8 / k, 'stroke-linejoin': 'round', transform: 'translate(' + x + ' ' + y + ') scale(' + k + ')'
        });
    }
    // Des mailles : rangées d'écailles en quinconce, découpées par `d` (règle pair-impair pour les capuches trouées).
    function mail(id, d, x0, y0, x1, y1) {
        var p = '';
        for (var y = y0, row = 0; y <= y1; y += 5, row++) {
            for (var x = x0 + (row % 2 ? 3 : 0); x <= x1; x += 6) p += 'M' + x + ' ' + y + ' q3 4 6 0 ';
        }
        return el('clipPath', { id: id }, el('path', { d: d, 'clip-rule': 'evenodd' })) +
            '<g clip-path="url(#' + id + ')">' + line(p, 1.3, '#6E757D') + '</g>';
    }
    var TUNIC = 'M58 150 C76 140 124 140 142 150 C148 168 150 188 148 206 Q100 212 52 206 C50 188 52 168 58 150 Z';
    var CAPE_L = 'M56 148 C64 140 80 138 92 140 L84 212 C70 214 58 212 52 206 C49 186 50 164 56 148 Z';
    var CAPE_R = 'M144 148 C136 140 120 138 108 140 L116 212 C130 214 142 212 148 206 C151 186 150 164 144 148 Z';

    var DRAW = {
        // Préhistoire — peau de mammouth : tunique de fourrure à une épaule, bas effrangé, collier de dents.
        mammouth: {
            body: function (id) {
                var TUNIC = 'M58 150 C80 144 120 158 146 168 C150 182 150 196 148 204 L140 210 L132 204 L124 212 L116 205 L108 213 L100 205 L92 213 L84 205 L76 212 L68 204 L58 210 L52 202 C50 184 52 166 58 150 Z';
                var shag = clipped(id + 'fur', TUNIC,
                    el('ellipse', { cx: 76, cy: 178, rx: 10, ry: 7, fill: '#A8743F' }) + el('ellipse', { cx: 124, cy: 192, rx: 12, ry: 7, fill: '#A8743F' }) + el('ellipse', { cx: 104, cy: 172, rx: 7, ry: 5, fill: '#A8743F' }) +
                    line('M62 164 q4 6 0 12 M88 160 q4 6 0 12 M118 170 q4 6 0 12 M140 178 q4 6 0 12 M70 190 q4 6 0 12 M96 186 q4 6 0 12 M132 196 q4 6 0 12', 2.5, '#5A3820'));
                var teeth = [0.18, 0.34, 0.5, 0.66, 0.82].map(function (t) {
                    var p = quad(t, 64, 144, 100, 168, 136, 144), big = t === 0.5 ? 1.5 : 1;
                    return el('path', { d: 'M' + (p[0] - 3.5 * big) + ' ' + p[1] + ' L' + (p[0] + 3.5 * big) + ' ' + p[1] + ' L' + p[0] + ' ' + (p[1] + 10 * big) + ' Z', fill: '#FFF8E8', stroke: '#8A7A60', 'stroke-width': 1.5, 'stroke-linejoin': 'round' });
                }).join('');
                return shape(TUNIC, '#8B5A33', '#4E2F17') + shag + line('M64 144 Q100 168 136 144', 3, '#5A3820') + teeth;
            }
        },
        // Égypte — collier du chat sacré : coiffe rayée (némès), large collier, œil d'Horus, pagne de lin plissé.
        egypte: {
            body: function () {
                var KILT = 'M53 182 Q100 192 147 182 L148 204 C138 214 62 214 52 204 Z';
                return shape(KILT, '#F5F0E1', '#B8AE9A', 2.5) +
                    line('M66 190 L64 208 M80 192 L79 211 M94 193 L94 212 M108 193 L108 212 M122 192 L123 211 M136 190 L138 208', 1.8, '#C9BFA8') +
                    line('M53 182 Q100 192 147 182', 5, '#E9C349') +
                    line('M60 142 Q100 198 140 142', 11, '#8A6A10') + line('M60 142 Q100 198 140 142', 7.5, '#E9C349') +
                    line('M64 142 Q100 186 136 142', 5, '#1F9A93', { 'stroke-linecap': 'butt' }) +
                    line('M68 142 Q100 176 132 142', 5, '#2E55A8', { 'stroke-linecap': 'butt' }) +
                    line('M72 142 Q100 166 128 142', 4, '#E9C349', { 'stroke-linecap': 'butt' }) +
                    // l'œil d'Horus, en pendentif
                    el('circle', { cx: 100, cy: 178, r: 9, fill: '#E9C349', stroke: '#8A6A10', 'stroke-width': 2 }) +
                    el('path', { d: 'M93 177 Q100 171 107 177 Q100 181 93 177 Z', fill: '#FFFFFF', stroke: '#1E2A55', 'stroke-width': 1.5 }) +
                    el('circle', { cx: 100, cy: 177, r: 2, fill: '#1E2A55' }) + line('M99 180 L97 185 M103 180 Q106 184 108 182', 1.5, '#1E2A55');
            },
            hat: function (id) {
                var NEMES = 'M42 84 C38 24 162 24 158 84 L166 138 L146 140 L138 94 Q100 72 62 94 L54 140 L34 138 Z'; // couvre tout le haut du crâne
                return shape(NEMES, '#E9C349', '#8A6A10') +
                    clipped(id + 'nm', NEMES, line('M44 52 Q100 16 156 52 M40 64 Q100 28 160 64 M38 76 Q100 42 162 76', 5, '#2E55A8') +
                        line('M30 100 L64 100 M30 112 L64 112 M30 124 L64 124 M136 100 L170 100 M136 112 L170 112 M136 124 L170 124', 5, '#2E55A8')) +
                    line('M62 94 Q100 72 138 94', 5, '#8A6A10') +
                    el('path', { d: 'M96 76 Q100 62 104 76 Z', fill: '#E9C349', stroke: '#8A6A10', 'stroke-width': 1.5 });
            }
        },
        // Grèce — couronne de lauriers et chiton blanc à bordure de méandres, ceinture dorée.
        grece: {
            body: function (id) {
                var CHITON = 'M58 150 C76 140 124 140 142 150 C148 168 150 188 148 206 Q100 212 52 206 C50 188 52 168 58 150 Z';
                var meander = 'M50 198';
                for (var x = 50; x < 150; x += 12) meander += ' h6 v-6 h6 v6';
                return shape(CHITON, '#FBF8F0', '#A89F8C') +
                    clipped(id + 'ch', CHITON, el('rect', { x: 40, y: 189, width: 120, height: 14, fill: '#2E55A8' }) + line(meander, 2, '#FBF8F0', { 'stroke-linecap': 'square', 'stroke-linejoin': 'miter' }) +
                        line('M72 152 Q70 168 74 184 M128 152 Q130 168 126 184 M86 184 Q84 194 86 200 M114 184 Q116 194 114 200', 2, '#D8D0BE')) +
                    line('M54 178 Q100 186 146 178', 4, '#C9A23A') +
                    el('circle', { cx: 64, cy: 150, r: 5, fill: '#C9A23A', stroke: '#7A5E14', 'stroke-width': 1.5 }) + el('circle', { cx: 136, cy: 150, r: 5, fill: '#C9A23A', stroke: '#7A5E14', 'stroke-width': 1.5 });
            },
            hat: function () { return laurel('#5E9E4A', '#2F5E25'); }
        },
        // Rome I — armure de légionnaire : casque à crête, cuirasse à lames, jupe rouge à lanières, bouclier ovale.
        legionnaire: {
            body: function () {
                var SKIRT = 'M52 186 Q100 194 148 186 L148 204 C138 214 62 214 52 204 Z';
                var LORICA = 'M56 148 C72 138 128 138 144 148 C148 164 149 178 148 188 Q100 196 52 188 C51 176 52 162 56 148 Z';
                var straps = '';
                for (var x = 66; x <= 134; x += 12) straps += el('rect', { x: x - 3, y: 189, width: 6, height: 16, rx: 2, fill: '#7A4E2D', stroke: '#4E2F17', 'stroke-width': 1 });
                return shape(SKIRT, '#B22A26', '#6E1512', 2.5) + straps +
                    shape(LORICA, '#B9BEC4', '#5F656C') +
                    line('M54 160 Q100 170 146 160 M53 173 Q100 183 147 173', 2.5, '#7D838B') +
                    el('circle', { cx: 100, cy: 156, r: 2.5, fill: '#C9A23A' }) + el('circle', { cx: 100, cy: 170, r: 2.5, fill: '#C9A23A' }) +
                    line('M52 188 Q100 196 148 188', 5, '#8A5A33') +
                    // le bouclier, posé contre le flanc
                    el('ellipse', { cx: 40, cy: 184, rx: 19, ry: 29, fill: '#B22A26', stroke: '#6E1512', 'stroke-width': 3 }) +
                    el('ellipse', { cx: 40, cy: 184, rx: 15, ry: 25, fill: 'none', stroke: '#E9C349', 'stroke-width': 2 }) +
                    line('M40 160 L40 178 M40 190 L40 208', 2.5, '#E9C349') + el('circle', { cx: 40, cy: 184, r: 6, fill: '#E9C349', stroke: '#8A6A10', 'stroke-width': 2 });
            },
            hat: function () {
                return el('ellipse', { cx: 100, cy: 24, rx: 9, ry: 20, fill: '#C8322F', stroke: '#7D1A17', 'stroke-width': 2.5 }) +
                    line('M100 8 L100 40 M95 14 L96 38 M105 14 L104 38', 1.5, '#E05A55') +
                    el('rect', { x: 95, y: 36, width: 10, height: 10, rx: 2, fill: '#C9A23A', stroke: '#7A5E14', 'stroke-width': 1.5 }) +
                    shape('M44 78 L40 118 Q48 126 58 116 L60 82 Z', '#C9CDD2', '#6B7178', 2.5) +
                    shape('M156 78 L160 118 Q152 126 142 116 L140 82 Z', '#C9CDD2', '#6B7178', 2.5) +
                    shape('M44 78 C44 32 156 32 156 78 Q100 66 44 78 Z', '#C9CDD2', '#6B7178') +
                    line('M48 76 Q100 64 152 76', 4, '#C9A23A') + line('M70 50 Q100 40 130 50', 3, '#E4E7EA');
            }
        },
        // Haut Moyen Âge — manteau mérovingien : manteau de laine bordé, tunique brodée, grande fibule ronde à grenats.
        merovingien: {
            sleeve: ['#4F7A3A', '#2C4A1F'],
            body: function (id) {
                return shape(TUNIC, '#4F7A3A', '#2C4A1F') +
                    clipped(id + 'tu', TUNIC, line('M48 200 Q100 208 152 200', 5, '#D4A43A') + line('M48 200 Q100 208 152 200', 1.5, '#8E3B2E', { 'stroke-dasharray': '3 3' })) +
                    line('M88 180 L112 180', 5, '#5A3820') + el('rect', { x: 96, y: 176, width: 8, height: 8, rx: 1.5, fill: '#D4A43A', stroke: '#7A5E14', 'stroke-width': 1.2 }) +
                    shape(CAPE_L, '#8E3B2E', '#4F1C14') + shape(CAPE_R, '#8E3B2E', '#4F1C14') +
                    line('M92 140 L84 212 M108 140 L116 212', 3.5, '#D4A43A') +
                    el('circle', { cx: 124, cy: 160, r: 10, fill: '#D4A43A', stroke: '#7A5E14', 'stroke-width': 2 }) +
                    el('circle', { cx: 124, cy: 160, r: 6, fill: '#B0262A', stroke: '#7A5E14', 'stroke-width': 1.2 }) +
                    line('M124 154 L124 166 M118 160 L130 160', 1.2, '#7A5E14') + el('circle', { cx: 124, cy: 160, r: 1.8, fill: '#D4A43A' });
            }
        },
        // Féodalités — cotte de mailles : haubert et camail de mailles, surcot bleu au chevron d'or, petit casque conique.
        mailles: {
            sleeve: ['#AEB4BB', '#5F656C'],
            body: function (id) {
                var SURCOT = 'M68 146 L132 146 L138 206 Q100 212 62 206 Z';
                return shape(TUNIC, '#AEB4BB', '#5F656C') + mail(id + 'm', TUNIC, 44, 140, 156, 214) +
                    shape(SURCOT, '#2E4F9E', '#1A2E66', 2.5) +
                    clipped(id + 'sc', SURCOT, el('path', { d: 'M56 194 L100 170 L144 194 L144 204 L100 180 L56 204 Z', fill: '#E9C349', stroke: '#8A6A10', 'stroke-width': 1.5 })) +
                    line('M66 178 L134 178', 4.5, '#5A3820') + el('rect', { x: 96, y: 174, width: 8, height: 8, rx: 1.5, fill: '#C9CDD2', stroke: '#5F656C', 'stroke-width': 1.2 });
            },
            hat: function (id) {
                // Le camail : une capuche de mailles percée pour le visage.
                var COIF = 'M28 152 C24 60 60 32 100 32 C140 32 176 60 172 152 Z M100 66 C134 66 148 92 146 112 C144 136 124 148 100 148 C76 148 56 136 54 112 C52 92 66 66 100 66 Z';
                return el('path', { d: COIF, fill: '#AEB4BB', stroke: '#5F656C', 'stroke-width': 3, 'fill-rule': 'evenodd', 'stroke-linejoin': 'round' }) +
                    mail(id + 'c', COIF, 24, 30, 176, 154) +
                    shape('M70 52 L100 12 L130 52 Q100 60 70 52 Z', '#C9CDD2', '#5F656C', 2.5) +
                    line('M84 32 L100 14', 2.5, '#E4E7EA') + line('M70 52 Q100 60 130 52', 4, '#8A6A10');
            }
        },
        // Capétiens — cape fleurdelisée : cape bleue semée de lys d'or, col d'hermine, tunique rouge, couronne fleuronnée.
        lys: {
            sleeve: ['#B22A26', '#6E1512'],
            body: function (id) {
                var tails = [[70, 154], [84, 160], [100, 163], [116, 160], [130, 154]].map(function (p) {
                    return el('path', { d: 'M' + p[0] + ' ' + (p[1] - 2) + ' q2 3 0 6 q-2 -3 0 -6 Z', fill: '#1B1B22' });
                }).join('');
                var lysL = [[66, 172], [74, 196], [62, 190]].map(function (p) { return lis(p[0], p[1], 0.75, '#E9C349', '#8A6A10'); }).join('');
                var lysR = [[134, 172], [126, 196], [138, 190]].map(function (p) { return lis(p[0], p[1], 0.75, '#E9C349', '#8A6A10'); }).join('');
                return shape(TUNIC, '#B22A26', '#6E1512') + line('M88 182 L112 182', 4.5, '#E9C349') +
                    shape(CAPE_L, '#2846A0', '#152A66') + clipped(id + 'cl', CAPE_L, lysL) +
                    shape(CAPE_R, '#2846A0', '#152A66') + clipped(id + 'cr', CAPE_R, lysR) +
                    shape('M56 148 Q100 170 144 148 L146 158 Q100 182 54 158 Z', '#FFFFFF', '#B8BEC6', 2.5) + tails;
            },
            hat: function () {
                return lis(76, 40, 0.8, '#E9C349', '#8A6A10') + lis(100, 34, 0.95, '#E9C349', '#8A6A10') + lis(124, 40, 0.8, '#E9C349', '#8A6A10') +
                    shape('M68 60 Q100 52 132 60 L132 48 Q100 40 68 48 Z', '#E9C349', '#8A6A10', 2.5) +
                    el('circle', { cx: 84, cy: 52, r: 3, fill: '#B22A26' }) + el('circle', { cx: 100, cy: 49, r: 3.4, fill: '#2846A0' }) + el('circle', { cx: 116, cy: 52, r: 3, fill: '#B22A26' });
            }
        },
        // Guerre de Cent Ans — armure de Jeanne : armure claire (plastron, épaulières, braconnière), étendard blanc fleurdelisé.
        jeanne: {
            sleeve: ['#C9CED4', '#7D848C'],
            body: function () {
                var lames = [184, 192, 200].map(function (y) {
                    return shape('M56 ' + y + ' Q100 ' + (y + 8) + ' 144 ' + y + ' L146 ' + (y + 9) + ' Q100 ' + (y + 17) + ' 54 ' + (y + 9) + ' Z', '#C9CED4', '#7D848C', 2);
                }).join('');
                return el('rect', { x: 153, y: 58, width: 5, height: 158, rx: 2, fill: '#8A5A33', stroke: '#4E2F17', 'stroke-width': 1.5 }) +
                    shape('M158 62 L198 66 L190 80 L198 94 L158 92 Z', '#FFFFFF', '#B8BEC6', 2) + lis(176, 78, 0.8, '#E9C349', '#8A6A10') +
                    el('circle', { cx: 155.5, cy: 56, r: 4, fill: '#E9C349', stroke: '#8A6A10', 'stroke-width': 1.5 }) +
                    lames +
                    shape('M64 146 C80 138 120 138 136 146 C142 160 142 176 138 186 Q100 194 62 186 C58 176 58 160 64 146 Z', '#DDE2E7', '#7D848C') +
                    line('M100 144 L100 188', 2, '#A9B0B8') + line('M78 152 Q74 166 78 178', 3, '#FFFFFF', { opacity: 0.8 }) +
                    el('ellipse', { cx: 58, cy: 152, rx: 14, ry: 10, fill: '#C9CED4', stroke: '#7D848C', 'stroke-width': 2.5 }) +
                    el('ellipse', { cx: 142, cy: 152, rx: 14, ry: 10, fill: '#C9CED4', stroke: '#7D848C', 'stroke-width': 2.5 }) +
                    line('M62 186 Q100 194 138 186', 4, '#8A5A33') + el('rect', { x: 96, y: 186, width: 8, height: 7, rx: 1.5, fill: '#E9C349', stroke: '#8A6A10', 'stroke-width': 1.2 });
            }
        },
        // Renaissances — pourpoint de Léonard : pourpoint à crevés, béret de velours, carnet de croquis sous le bras.
        leonard: {
            sleeve: ['#2F6B6B', '#173B3B'],
            body: function () {
                var buttons = [158, 170, 182, 194].map(function (y) { return el('circle', { cx: 100, cy: y, r: 2.6, fill: '#E9C349', stroke: '#8A6A10', 'stroke-width': 1 }); }).join('');
                return shape(TUNIC, '#2F6B6B', '#173B3B') +
                    line('M100 146 L100 208', 3, '#173B3B') + buttons + line('M54 186 Q100 194 146 186', 4.5, '#5A3820') +
                    // épaules bouffantes à crevés
                    el('ellipse', { cx: 60, cy: 154, rx: 13, ry: 11, fill: '#2F6B6B', stroke: '#173B3B', 'stroke-width': 2.5 }) +
                    el('ellipse', { cx: 140, cy: 154, rx: 13, ry: 11, fill: '#2F6B6B', stroke: '#173B3B', 'stroke-width': 2.5 }) +
                    line('M55 146 L53 162 M62 145 L62 163 M135 145 L133 163 M142 146 L144 162', 3, '#F1E6CC') +
                    // le carnet, avec un croquis d'homme dans un cercle
                    '<g transform="rotate(-12 42 186)">' +
                    el('rect', { x: 26, y: 166, width: 32, height: 40, rx: 3, fill: '#8A5A33', stroke: '#4E2F17', 'stroke-width': 2.5 }) +
                    el('rect', { x: 30, y: 170, width: 24, height: 32, rx: 1.5, fill: '#F6EBD2' }) +
                    el('circle', { cx: 42, cy: 186, r: 9, fill: 'none', stroke: '#8A6A50', 'stroke-width': 1.2 }) +
                    line('M42 179 L42 193 M35 184 L49 184 M42 193 L37 199 M42 193 L47 199', 1.2, '#8A6A50') + '</g>';
            },
            hat: function () {
                return shape('M48 66 C42 40 92 24 132 32 C160 38 164 58 152 68 Q100 78 48 66 Z', '#4A2E55', '#26162E') +
                    line('M50 66 Q100 77 152 67', 4, '#26162E') + line('M76 42 Q104 32 132 38', 3, '#6A4A78');
            }
        },
        // Guerres de Religion — fraise et pourpoint : pourpoint noir sobre, fraise blanche plissée, boutons d'argent.
        fraise: {
            sleeve: ['#25272E', '#0E1015'],
            body: function () {
                var buttons = [166, 178, 190, 202].map(function (y) { return el('circle', { cx: 100, cy: y, r: 2.4, fill: '#C9CDD2', stroke: '#5F656C', 'stroke-width': 1 }); }).join('');
                return shape(TUNIC, '#25272E', '#0E1015') +
                    line('M70 160 Q66 180 70 202 M130 160 Q134 180 130 202', 2, '#3A3D46') + buttons +
                    line('M54 186 Q100 194 146 186', 4, '#0E1015');
            },
            // La fraise, à la largeur des épaules, posée par-dessus la naissance du bras.
            collar: function () {
                var N = 12, cx = 100, cy = 148, rx = 42, ry = 17, d = 'M' + (cx + rx) + ' ' + cy, pleats = '';
                for (var i = 1; i <= N; i++) {
                    var a = Math.PI * i / N, m = Math.PI * (i - 0.5) / N;
                    d += ' Q' + (cx + rx * 1.1 * Math.cos(m)).toFixed(1) + ' ' + (cy + ry * 1.3 * Math.sin(m)).toFixed(1) +
                        ' ' + (cx + rx * Math.cos(a)).toFixed(1) + ' ' + (cy + ry * Math.sin(a)).toFixed(1);
                    if (i < N) pleats += 'M' + (cx + 29 * Math.cos(a)).toFixed(1) + ' ' + (cy + 7 * Math.sin(a)).toFixed(1) + ' L' + (cx + 39 * Math.cos(a)).toFixed(1) + ' ' + (cy + 15 * Math.sin(a)).toFixed(1) + ' ';
                }
                d += ' L72 148 A28 7 0 0 0 128 148 Z';
                return shape(d, '#FFFFFF', '#9EA6AF', 2) + line(pleats, 1.4, '#C3C9D0');
            }
        },
        // Rois absolus — perruque du Roi-Soleil : grande perruque bouclée, habit doré, cravate de dentelle, cordon bleu.
        roisoleil: {
            sleeve: ['#D9A93A', '#7A5E14'],
            body: function (id) {
                return shape(TUNIC, '#D9A93A', '#7A5E14') +
                    clipped(id + 'br', TUNIC, line('M60 170 q6 -6 12 0 q6 6 12 0 M118 170 q6 -6 12 0 q6 6 12 0 M56 196 q6 -6 12 0 q6 6 12 0 M124 196 q6 -6 12 0 q6 6 12 0', 2, '#A97E1C') +
                        line('M56 150 L150 206', 9, '#2846A0', { 'stroke-linecap': 'butt' })) +
                    el('path', { d: 'M86 146 Q100 154 114 146 L110 176 Q100 182 90 176 Z', fill: '#FFFFFF', stroke: '#B8BEC6', 'stroke-width': 2, 'stroke-linejoin': 'round' }) +
                    line('M90 158 Q100 163 110 158 M91 168 Q100 173 109 168', 1.5, '#C9CFD6');
            },
            hat: function () {
                var curls = [];
                [[38, 92], [46, 70], [60, 52], [78, 42], [100, 38], [122, 42], [140, 52], [154, 70], [162, 92]].forEach(function (p) { curls.push([p[0], p[1], 13]); });
                [100, 116, 132, 148].forEach(function (y) { curls.push([34, y, 12]); curls.push([166, y, 12]); });
                return curls.map(function (c) {
                    return el('circle', { cx: c[0], cy: c[1], r: c[2], fill: '#5A3A22', stroke: '#2E1C0E', 'stroke-width': 2 }) +
                        line('M' + (c[0] - 5) + ' ' + c[1] + ' q5 -6 8 1', 2, '#7A5236');
                }).join('');
            }
        },
        // Lumières — habit de philosophe : redingote, gilet crème, jabot, perruque poudrée à rouleaux.
        philosophe: {
            sleeve: ['#3D5E7A', '#1F3346'],
            body: function () {
                var buttons = [164, 176, 188, 200].map(function (y) { return el('circle', { cx: 100, cy: y, r: 2.4, fill: '#E9C349', stroke: '#8A6A10', 'stroke-width': 1 }); }).join('');
                return shape(TUNIC, '#F1E6CC', '#A89F8C') + buttons +
                    shape(CAPE_L, '#3D5E7A', '#1F3346') + shape(CAPE_R, '#3D5E7A', '#1F3346') +
                    line('M92 140 L78 166 M108 140 L122 166', 3, '#1F3346') +
                    el('circle', { cx: 80, cy: 186, r: 2.6, fill: '#E9C349' }) + el('circle', { cx: 120, cy: 186, r: 2.6, fill: '#E9C349' }) +
                    el('path', { d: 'M90 146 Q100 152 110 146 L106 166 Q100 170 94 166 Z', fill: '#FFFFFF', stroke: '#B8BEC6', 'stroke-width': 2, 'stroke-linejoin': 'round' });
            },
            hat: function () {
                var rolls = [[36, 96], [36, 114], [164, 96], [164, 114]].map(function (p) {
                    return el('ellipse', { cx: p[0], cy: p[1], rx: 11, ry: 7.5, fill: '#EFEFEA', stroke: '#9EA3A8', 'stroke-width': 2 }) +
                        line('M' + (p[0] - 5) + ' ' + p[1] + ' q5 -4 9 0', 1.5, '#B5BAC0');
                }).join('');
                return shape('M40 92 C34 22 166 22 160 92 Q150 70 100 64 Q50 70 40 92 Z', '#EFEFEA', '#9EA3A8') +
                    line('M60 56 Q100 40 140 56', 2, '#D5D8DC') + rolls;
            }
        },
        // Révolution — bonnet phrygien : bonnet rouge à cocarde, carmagnole bleue, chemise, pantalon rayé de sans-culotte.
        phrygien: {
            sleeve: ['#2B3F7A', '#16224A'],
            body: function (id) {
                var PANTS = 'M52 184 Q100 192 148 184 L148 204 C138 214 62 214 52 204 Z';
                return shape(TUNIC, '#F6F1E6', '#A89F8C') +
                    shape(PANTS, '#F6F1E6', '#A89F8C', 2.5) +
                    clipped(id + 'pa', PANTS, line('M60 184 L60 214 M72 184 L72 214 M84 184 L84 214 M96 184 L96 214 M108 184 L108 214 M120 184 L120 214 M132 184 L132 214 M144 184 L144 214', 4, '#2B3F7A') +
                        line('M66 184 L66 214 M90 184 L90 214 M114 184 L114 214 M138 184 L138 214', 3, '#C8322F')) +
                    shape(CAPE_L.replace('L84 212', 'L84 186').replace('C70 214 58 212 52 206 C49 186', 'C70 188 58 188 52 186 C49 176'), '#2B3F7A', '#16224A') +
                    shape(CAPE_R.replace('L116 212', 'L116 186').replace('C130 214 142 212 148 206 C151 186', 'C130 188 142 188 148 186 C151 176'), '#2B3F7A', '#16224A') +
                    el('path', { d: 'M88 146 Q100 156 112 146 L104 164 L100 160 L96 164 Z', fill: '#C8322F', stroke: '#7D1A17', 'stroke-width': 1.8, 'stroke-linejoin': 'round' }) +
                    el('circle', { cx: 76, cy: 166, r: 2.4, fill: '#E9C349' }) + el('circle', { cx: 124, cy: 166, r: 2.4, fill: '#E9C349' });
            },
            hat: function () {
                return shape('M56 66 C52 34 72 10 102 9 C124 9 134 22 122 32 C134 38 146 50 144 66 Q100 76 56 66 Z', '#C8322F', '#7D1A17') +
                    line('M80 22 Q96 14 112 18', 4, '#E05A55') + line('M56 66 Q100 76 144 66', 3, '#7D1A17') +
                    el('circle', { cx: 130, cy: 56, r: 10, fill: '#2B4AA0', stroke: '#1A2E66', 'stroke-width': 1.5 }) +
                    el('circle', { cx: 130, cy: 56, r: 6.5, fill: '#FFFFFF' }) + el('circle', { cx: 130, cy: 56, r: 3.2, fill: '#C8322F' });
            }
        },
        // Révolution inachevée (1830-1848) — haut-de-forme : chapeau haut, redingote brune, gilet bordeaux, cravate noire.
        hautdeforme: {
            sleeve: ['#4A3A30', '#241A14'],
            body: function () {
                var buttons = [168, 180, 192].map(function (y) { return el('circle', { cx: 100, cy: y, r: 2.4, fill: '#E9C349', stroke: '#8A6A10', 'stroke-width': 1 }); }).join('');
                return shape(TUNIC, '#7A2234', '#3E0F1A') + buttons +
                    shape(CAPE_L, '#4A3A30', '#241A14') + shape(CAPE_R, '#4A3A30', '#241A14') +
                    line('M92 140 L76 168 M108 140 L124 168', 3, '#241A14') +
                    el('path', { d: 'M86 144 L100 152 L114 144 L112 152 L100 158 L88 152 Z', fill: '#FFFFFF', stroke: '#B8BEC6', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }) +
                    el('path', { d: 'M92 152 Q100 158 108 152 L104 160 L100 158 L96 160 Z', fill: '#1B1B22' });
            },
            hat: function () {
                return el('ellipse', { cx: 100, cy: 58, rx: 48, ry: 8, fill: '#25262C', stroke: '#0E1015', 'stroke-width': 2.5 }) +
                    shape('M70 56 L66 12 Q100 6 134 12 L130 56 Q100 62 70 56 Z', '#25262C', '#0E1015') +
                    shape('M69 46 Q100 52 131 46 L130 56 Q100 62 70 56 Z', '#7A2234', '#3E0F1A', 1.5) +
                    line('M76 18 L78 44', 3, '#45474F');
            }
        },
        // République et empires (Belle Époque) — costume : canotier de paille, veston clair, nœud papillon, chaîne de montre.
        belleepoque: {
            sleeve: ['#D9C9A3', '#8F7E58'],
            body: function () {
                return shape(TUNIC, '#FFFFFF', '#B8BEC6') +
                    shape(CAPE_L, '#D9C9A3', '#8F7E58') + shape(CAPE_R, '#D9C9A3', '#8F7E58') +
                    line('M92 140 L80 166 M108 140 L120 166', 3, '#8F7E58') +
                    el('circle', { cx: 88, cy: 182, r: 2.6, fill: '#6B5E40' }) + el('circle', { cx: 88, cy: 196, r: 2.6, fill: '#6B5E40' }) +
                    line('M114 176 Q122 186 132 178', 2, '#E9C349') + el('circle', { cx: 114, cy: 176, r: 2.2, fill: '#E9C349' }) +
                    el('path', { d: 'M100 152 L86 144 L86 160 Z M100 152 L114 144 L114 160 Z', fill: '#C8322F', stroke: '#7D1A17', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }) +
                    el('circle', { cx: 100, cy: 152, r: 3.5, fill: '#A82623', stroke: '#7D1A17', 'stroke-width': 1.2 });
            },
            hat: function () {
                return el('ellipse', { cx: 100, cy: 56, rx: 52, ry: 9, fill: '#E8C77A', stroke: '#9A7A30', 'stroke-width': 2.5 }) +
                    shape('M66 54 L68 32 Q100 26 132 32 L134 54 Q100 60 66 54 Z', '#E8C77A', '#9A7A30') +
                    shape('M67 44 Q100 50 133 44 L134 54 Q100 60 66 54 Z', '#1B1B22', '#0E1015', 1.5) +
                    line('M70 36 Q100 30 130 36', 1.5, '#C9A55A') + line('M56 58 Q100 66 144 58', 1.5, '#C9A55A');
            }
        },
        // Grande Guerre — casque Adrian : casque et capote bleu horizon, boutons de laiton ; ni arme ni insigne.
        adrian: {
            sleeve: ['#7F98B5', '#3F5574'],
            body: function () {
                var buttons = '';
                [160, 172, 184].forEach(function (y) {
                    buttons += el('circle', { cx: 88, cy: y, r: 2.6, fill: '#C9A23A', stroke: '#7A5E14', 'stroke-width': 1 }) +
                        el('circle', { cx: 112, cy: y, r: 2.6, fill: '#C9A23A', stroke: '#7A5E14', 'stroke-width': 1 });
                });
                return shape(TUNIC, '#7F98B5', '#3F5574') +
                    line('M100 146 L100 208', 2, '#5E7896') + buttons +
                    line('M54 192 Q100 200 146 192', 5, '#6B4A2B') + el('rect', { x: 95, y: 190, width: 10, height: 8, rx: 1.5, fill: '#C9A23A', stroke: '#7A5E14', 'stroke-width': 1.2 }) +
                    el('path', { d: 'M76 146 L100 160 L124 146 L120 156 L100 168 L80 156 Z', fill: '#6E87A6', stroke: '#3F5574', 'stroke-width': 2, 'stroke-linejoin': 'round' });
            },
            hat: function () {
                return el('path', { d: 'M90 36 Q100 6 110 36 Z', fill: '#6E87A6', stroke: '#3F5574', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }) +
                    shape('M50 68 C50 20 150 20 150 68 Z', '#7F98B5', '#3F5574') +
                    line('M64 46 Q100 30 136 46', 4, '#A7BCD3') +
                    el('ellipse', { cx: 100, cy: 68, rx: 60, ry: 7, fill: '#6E87A6', stroke: '#3F5574', 'stroke-width': 3 });
            }
        },
        // Entre-deux-guerres — tenue des années folles : chapeau cloche à fleur, robe à taille basse et franges, sautoir de perles.
        anneesfolles: {
            body: function (id) {
                var fringe = '';
                for (var x = 54; x <= 146; x += 5) fringe += 'M' + x + ' 192 L' + x + ' 210 ';
                var pearls = '';
                for (var i = 0; i <= 14; i++) {
                    var p = quad(i / 14, 74, 146, 100, 222, 126, 146);
                    pearls += el('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 2.6, fill: '#FBF8F0', stroke: '#B8BEC6', 'stroke-width': 0.8 });
                }
                return shape(TUNIC, '#1F7A6B', '#0F4A40') +
                    clipped(id + 'fr', TUNIC, line(fringe, 2, '#E9C349') + el('rect', { x: 40, y: 184, width: 120, height: 8, fill: '#E9C349' }) +
                        line('M60 160 L70 178 M80 156 L88 176 M120 156 L112 176 M140 160 L130 178', 2, '#2E9C8A')) +
                    pearls;
            },
            hat: function () {
                return shape('M42 82 C40 34 160 34 158 82 Q150 70 100 66 Q50 70 42 82 Z', '#7A2E5A', '#40122E') +
                    line('M44 74 Q100 58 156 74', 6, '#2B1B30') +
                    el('circle', { cx: 136, cy: 64, r: 7, fill: '#F07F8E', stroke: '#A33A4E', 'stroke-width': 1.5 }) +
                    el('circle', { cx: 136, cy: 64, r: 2.5, fill: '#E9C349' }) + line('M70 46 Q100 36 130 46', 2.5, '#9A4A78');
            }
        },
        // Trente Glorieuses — combinaison spatiale intégrale : casque bulle, combinaison, queue gainée, bottes et gants ; écusson étoilé neutre.
        spatiale: {
            earScale: 0.85,
            sleeve: ['#F2F4F7', '#8C939B'],
            tail: ['#F2F4F7', '#8C939B', '#C3C9D0'],
            paws: ['#C3C9D0', '#5F656C'],
            // Combinaison intégrale : elle couvre toute la silhouette du corps, rien de roux ne dépasse sous la bulle.
            body: function () {
                return shape(BODY, '#F2F4F7', '#8C939B') +
                    line('M60 168 Q100 176 140 168 M58 196 Q100 204 142 196', 2, '#C3C9D0') +
                    el('rect', { x: 86, y: 166, width: 28, height: 18, rx: 3, fill: '#5F656C', stroke: '#2E3238', 'stroke-width': 2 }) +
                    el('circle', { cx: 93, cy: 175, r: 3, fill: '#E05A55' }) + el('circle', { cx: 103, cy: 175, r: 3, fill: '#5FB46A' }) + el('rect', { x: 108, y: 171, width: 3, height: 8, fill: '#E9C349' }) +
                    el('rect', { x: 120, y: 168, width: 16, height: 12, rx: 2, fill: '#2846A0', stroke: '#152A66', 'stroke-width': 1.5 }) +
                    el('polygon', { points: '128,170 129.6,173 133,173.4 130.5,175.6 131.2,179 128,177.3 124.8,179 125.5,175.6 123,173.4 126.4,173', fill: '#FFFFFF' }) +
                    el('ellipse', { cx: 100, cy: 157, rx: 46, ry: 9, fill: '#C3C9D0', stroke: '#6B7178', 'stroke-width': 2.5 });
            },
            hat: function () {
                // Une bulle assez grande pour toute la tête, oreilles comprises.
                return el('ellipse', { cx: 100, cy: 84, rx: 80, ry: 82, fill: '#BFE3F7', 'fill-opacity': 0.08, stroke: '#B8C4CF', 'stroke-width': 3 }) +
                    line('M40 52 Q54 24 82 12', 5, '#FFFFFF', { opacity: 0.85 }) + line('M158 132 Q170 116 174 98', 3, '#FFFFFF', { opacity: 0.6 });
            }
        },
        // Crises et fin de la guerre froide (années 80) — perfecto : blouson de cuir, tee-shirt blanc, baladeur et son casque, lunettes de soleil teintées.
        perfecto: {
            sleeve: ['#24252B', '#0E1015'],
            body: function () {
                return shape(TUNIC, '#FFFFFF', '#B8BEC6') +
                    shape('M56 148 C66 140 82 138 94 140 L110 206 Q80 212 52 206 C49 186 50 164 56 148 Z', '#24252B', '#0E1015') +
                    shape(CAPE_R, '#24252B', '#0E1015') +
                    line('M94 140 L110 206', 2.5, '#C9CDD2', { 'stroke-dasharray': '2 2' }) +
                    // les revers du col, larges et rabattus, puis une seule tirette sur la fermeture
                    el('path', { d: 'M94 140 L72 144 L64 156 L84 172 Z M108 140 L130 144 L138 156 L118 168 Z', fill: '#2E3036', stroke: '#0E1015', 'stroke-width': 1.8, 'stroke-linejoin': 'round' }) +
                    el('circle', { cx: 74, cy: 154, r: 1.8, fill: '#C9CDD2' }) + el('circle', { cx: 128, cy: 152, r: 1.8, fill: '#C9CDD2' }) +
                    el('rect', { x: 97, y: 162, width: 6, height: 9, rx: 1.5, fill: '#C9CDD2', stroke: '#5F656C', 'stroke-width': 1 }) +
                    line('M56 188 Q80 194 108 192', 4, '#3A3C44') +
                    // le baladeur à la ceinture, et son fil
                    el('rect', { x: 120, y: 182, width: 18, height: 22, rx: 3, fill: '#C8322F', stroke: '#7D1A17', 'stroke-width': 1.8 }) +
                    el('rect', { x: 123, y: 186, width: 12, height: 7, rx: 1, fill: '#2E3238' }) + line('M126 182 Q118 168 130 150', 1.6, '#2E3238');
            },
            hat: function () {
                return line('M35 100 A65 57 0 0 1 165 100', 6, '#2E3238') +
                    el('ellipse', { cx: 37, cy: 100, rx: 9, ry: 13, fill: '#C8322F', stroke: '#7D1A17', 'stroke-width': 2 }) +
                    el('ellipse', { cx: 163, cy: 100, rx: 9, ry: 13, fill: '#C8322F', stroke: '#7D1A17', 'stroke-width': 2 }) +
                    // lunettes de soleil sur les yeux, verres teintés : on devine le regard au travers
                    el('path', { d: 'M56 84 Q76 79 96 84 Q97 102 87 109 Q76 114 65 109 Q55 102 56 84 Z M104 84 Q124 79 144 84 Q145 102 135 109 Q124 114 113 109 Q103 102 104 84 Z', fill: '#1B1B22', 'fill-opacity': 0.5, stroke: '#0E1015', 'stroke-width': 3, 'stroke-linejoin': 'round' }) +
                    line('M96 88 Q100 85 104 88 M56 87 L40 92 M144 87 L160 92', 3, '#0E1015') +
                    line('M62 90 L70 86 M110 90 L118 86', 2.5, '#FFFFFF', { opacity: 0.7 });
            }
        },
        // Le monde depuis 1991 — tenue connectée : sweat à capuche, lunettes lumineuses (verres clairs), casque audio autour du cou.
        connectee: {
            sleeve: ['#5B4BC4', '#2E2470'],
            body: function () {
                return el('path', { d: 'M48 150 Q100 128 152 150 L150 164 Q100 146 50 164 Z', fill: '#4A3CA8', stroke: '#2E2470', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }) +
                    shape(TUNIC, '#5B4BC4', '#2E2470') +
                    shape('M72 182 L128 182 L134 204 Q100 208 66 204 Z', '#4A3CA8', '#2E2470', 2) +
                    line('M90 152 L88 172 M110 152 L112 172', 2, '#E8E6FF') + el('circle', { cx: 88, cy: 173, r: 2, fill: '#E8E6FF' }) + el('circle', { cx: 112, cy: 173, r: 2, fill: '#E8E6FF' });
            },
            hat: function () {
                var glow = { stroke: '#35D0E8', 'stroke-width': 7, fill: 'none', opacity: 0.25 };
                return el('ellipse', Object.assign({ cx: 76, cy: 96, rx: 19, ry: 17 }, glow)) + el('ellipse', Object.assign({ cx: 124, cy: 96, rx: 19, ry: 17 }, glow)) +
                    el('ellipse', { cx: 76, cy: 96, rx: 19, ry: 17, fill: '#BFF4FC', 'fill-opacity': 0.18, stroke: '#1BA9C4', 'stroke-width': 3 }) +
                    el('ellipse', { cx: 124, cy: 96, rx: 19, ry: 17, fill: '#BFF4FC', 'fill-opacity': 0.18, stroke: '#1BA9C4', 'stroke-width': 3 }) +
                    line('M95 94 Q100 90 105 94 M57 92 L42 88 M143 92 L158 88', 3, '#1BA9C4');
            },
            // Le casque audio, posé autour du cou par-dessus la naissance du bras.
            collar: function () {
                return line('M62 148 Q100 178 138 148', 6, '#2E3238') +
                    el('ellipse', { cx: 62, cy: 150, rx: 10, ry: 13, fill: '#F2F4F7', stroke: '#2E3238', 'stroke-width': 2.5 }) +
                    el('ellipse', { cx: 138, cy: 150, rx: 10, ry: 13, fill: '#F2F4F7', stroke: '#2E3238', 'stroke-width': 2.5 }) +
                    el('ellipse', { cx: 62, cy: 150, rx: 5, ry: 7, fill: 'none', stroke: '#35D0E8', 'stroke-width': 2 }) +
                    el('ellipse', { cx: 138, cy: 150, rx: 5, ry: 7, fill: 'none', stroke: '#35D0E8', 'stroke-width': 2 });
            }
        },
        // Rome II — toge d'empereur : toge pourpre drapée, pan blanc bordé d'or, fibule, couronne de laurier d'or.
        toge: {
            body: function () {
                return shape('M56 152 C70 136 132 134 146 150 C150 172 151 192 148 204 C138 214 62 214 52 204 C49 188 50 168 56 152 Z', '#7A2E8C', '#3E1448') +
                    shape('M58 152 C82 160 118 186 146 204 L148 194 C122 176 92 156 66 146 Z', '#F3EEE4', '#B8AE9A', 2) +
                    line('M58 152 C82 160 118 186 146 204', 3, '#E9C349') +
                    line('M84 176 Q78 192 82 206 M108 190 Q104 200 106 208', 2.5, '#5A1F69') +
                    el('circle', { cx: 64, cy: 150, r: 6.5, fill: '#E9C349', stroke: '#8A6A10', 'stroke-width': 2 });
            },
            hat: function () { return laurel('#E9C349', '#8A6A10') + el('circle', { cx: 100, cy: 40, r: 4, fill: '#C8322F', stroke: '#7D1A17', 'stroke-width': 1.5 }); }
        }
    };

    // La manche du bras qui bouge (salue, réfléchit) : [couleur, contour], ou rien pour un bras nu.
    // Queue gainée ([couleur, contour, coutures]) et pattes chaussées et gantées ([couleur, contour]) : costumes intégraux.
    function tailOf(kind) { return kind && DRAW[kind] && DRAW[kind].tail ? DRAW[kind].tail : null; }
    function pawsOf(kind) { return kind && DRAW[kind] && DRAW[kind].paws ? DRAW[kind].paws : null; }
    function padC(cx, cy, rx, ry, pc) { return pc ? el('ellipse', { cx: cx, cy: cy, rx: rx, ry: ry, fill: pc[0], stroke: pc[1], 'stroke-width': 2.5 }) : pad(cx, cy, rx, ry); }

    // Taille des oreilles sous un costume (1 = normale ; moins, sous un casque fermé).
    function earScaleOf(kind) { return kind && DRAW[kind] && DRAW[kind].earScale ? DRAW[kind].earScale : 1; }
    function sleeveOf(kind) { return kind && DRAW[kind] && DRAW[kind].sleeve ? DRAW[kind].sleeve : null; }
    function arm(d, w, sl) { return line(d, w + 6, sl ? sl[1] : P.line) + line(d, w, sl ? sl[0] : P.fur); }

    function costume(kind, layer, id) {
        var c = kind && DRAW[kind];
        return c && c[layer] ? c[layer](id + layer) : '';
    }

    function costumeKind(world) { return world && Object.prototype.hasOwnProperty.call(COSTUMES, world) ? COSTUMES[world] : ''; }

    // Clio assise, de face. `opts.costume` : identifiant de monde (« rome2 ») ; `opts.label` : texte alternatif.
    function front(mood, opts) {
        opts = opts || {};
        if (MOODS.indexOf(mood) === -1) mood = 'repos';
        var id = 'clio-art-' + (++uid), L = P.line, cos = costumeKind(opts.costume);
        var defs = '<defs>' + el('clipPath', { id: id + 'h' }, el('ellipse', { cx: 100, cy: 96, rx: 64, ry: 52 })) +
            el('clipPath', { id: id + 'b' }, el('path', { d: BODY })) + '</defs>';
        var tl = tailOf(cos), pc = pawsOf(cos);
        var tail = '<g class="ca-tail">' + line(TAIL, 19, tl ? tl[1] : L) + line(TAIL, 13, tl ? tl[0] : P.fur) +
            (tl ? line('M168 126 l12 -5 M176 150 l13 1 M166 178 l9 8', 2, tl[2]) : line('M170 128 l9 -4 M178 150 l9 1 M168 176 l7 6', 4, P.stripes)) + '</g>';
        var body = '<g class="ca-breath">' + el('path', { d: BODY, fill: P.fur }) +
            '<g clip-path="url(#' + id + 'b)">' + el('ellipse', { cx: 100, cy: 186, rx: 24, ry: 34, fill: P.belly }) +
            line('M54 170 l14 3 M52 186 l14 1 M146 170 l-14 3 M148 186 l-14 1', 4, P.stripes) + '</g>' +
            el('path', { d: BODY, fill: 'none', stroke: L, 'stroke-width': 3 }) + '</g>';
        var paws = pc ? padC(82, 213, 16, 10, pc) + padC(118, 213, 16, 10, pc) + line('M68 216 Q82 223 96 216 M104 216 Q118 223 132 216', 2.5, pc[1]) : pad(82, 213, 15, 9) + pad(118, 213, 15, 9);
        var es = earScaleOf(cos), earT = function (cx, cy) { return es === 1 ? '' : ' transform="translate(' + cx + ' ' + cy + ') scale(' + es + ') translate(' + (-cx) + ' ' + (-cy) + ')"'; };
        var ears = '<g class="ca-earL"><g' + earT(74, 66) + '>' + el('path', { d: 'M50 80 L55 24 Q59 18 66 22 L98 50 Z', fill: P.fur, stroke: L, 'stroke-width': 3, 'stroke-linejoin': 'round' }) + el('path', { d: 'M61 66 L62 35 L87 52 Z', fill: P.inner }) + '</g></g>' +
            '<g class="ca-earR"><g' + earT(126, 66) + '>' + el('path', { d: 'M150 80 L145 24 Q141 18 134 22 L102 50 Z', fill: P.fur, stroke: L, 'stroke-width': 3, 'stroke-linejoin': 'round' }) + el('path', { d: 'M139 66 L138 35 L113 52 Z', fill: P.inner }) + '</g></g>';
        var head = el('ellipse', { cx: 100, cy: 96, rx: 64, ry: 52, fill: P.fur }) +
            '<g clip-path="url(#' + id + 'h)">' + line('M100 46 L100 62 M87 49 L90 61 M113 49 L110 61 M38 90 L52 93 M38 101 L51 101 M162 90 L148 93 M162 101 L149 101', 4, P.stripes) + '</g>' +
            el('ellipse', { cx: 100, cy: 96, rx: 64, ry: 52, fill: 'none', stroke: L, 'stroke-width': 3 }) +
            el('path', { d: 'M100 108 C84 104 70 112 72 124 C74 135 90 137 100 131 C110 137 126 135 128 124 C130 112 116 104 100 108 Z', fill: P.belly });
        var happy = mood === 'content' || mood === 'ravi' || mood === 'salue' || mood === 'fier';
        var blush = happy ? el('ellipse', { cx: 57, cy: 115, rx: 9, ry: 5, fill: P.blush, opacity: 0.4 }) + el('ellipse', { cx: 143, cy: 115, rx: 9, ry: 5, fill: P.blush, opacity: 0.4 }) : '';
        var whiskers = line('M68 118 L36 111 M68 123 L36 126 M132 118 L164 111 M132 123 L164 126', 1.6, L, { opacity: 0.6 });
        var tear = mood === 'triste' ? el('path', { d: 'M66 112 Q61 121 66 124 Q71 121 66 112 Z', fill: P.tear, stroke: P.tearLine, 'stroke-width': 1 }) : '';
        var headG = '<g class="ca-head">' + ears + head + blush + eyes(mood) + mouth(mood) + whiskers + tear + costume(cos, 'hat', id) + '</g>';

        var armG = '';
        var sl = sleeveOf(cos);
        if (mood === 'salue') armG = '<g class="ca-wave">' + arm('M136 162 C158 157 168 142 167 124', 12, sl) + padC(167, 119, 10, 9, pc) + '</g>';
        if (mood === 'reflechit') armG = arm('M132 176 Q136 152 118 142', 12, sl) + padC(116, 140, 10, 8.5, pc);

        var fx = '';
        if (mood === 'ravi' || mood === 'fier') fx = star(30, 46, 9) + star(172, 36, 11) + (mood === 'ravi' ? star(182, 82, 6) : '');
        if (mood === 'dort') fx = '<g class="ca-zz">' + text(148, 46, 18, P.mark, 'z') + text(162, 28, 26, P.mark, 'Z') + '</g>';
        if (mood === 'reflechit') fx = text(160, 44, 32, P.mark, '?');
        if (mood === 'surpris') fx = text(164, 42, 32, P.alert, '!');

        var a11y = opts.label ? ' role="img" aria-label="' + String(opts.label).replace(/[&<>"]/g, '') + '"' : ' aria-hidden="true"';
        return '<svg xmlns="http://www.w3.org/2000/svg" class="clio-art ca-m-' + mood + '"' + (cos ? ' data-costume="' + cos + '"' : '') + ' viewBox="0 0 200 232"' + a11y + ' focusable="false">' + defs +
            '<g class="ca-whole">' + tail + body + costume(cos, 'body', id) + paws + headG + armG + costume(cos, 'collar', id) + fx + '</g></svg>';
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
