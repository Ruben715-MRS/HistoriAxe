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
        renaissances: 'leonard', religion: 'fraise', absolus: 'roisoleil', lumieres: 'philosophe' };

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
            body: function () {
                var ruff = '';
                for (var i = 0; i <= 12; i++) {
                    var a = Math.PI * i / 12, x = 100 + 54 * Math.cos(a), y = 151 + 17 * Math.sin(a);
                    ruff += el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 8, fill: '#FFFFFF', stroke: '#B8BEC6', 'stroke-width': 1.5 });
                }
                var buttons = [166, 178, 190, 202].map(function (y) { return el('circle', { cx: 100, cy: y, r: 2.4, fill: '#C9CDD2', stroke: '#5F656C', 'stroke-width': 1 }); }).join('');
                return shape(TUNIC, '#25272E', '#0E1015') +
                    line('M70 160 Q66 180 70 202 M130 160 Q134 180 130 202', 2, '#3A3D46') + buttons +
                    line('M54 186 Q100 194 146 186', 4, '#0E1015') +
                    ruff + line('M50 151 Q100 174 150 151', 1.5, '#D8DCE1');
            }
        },
        // Rois absolus — perruque du Roi-Soleil : grande perruque bouclée, habit doré, cravate de dentelle, cordon bleu.
        roisoleil: {
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
        // Lumières — habit de philosophe : redingote, gilet crème, jabot, perruque poudrée à rouleaux, plume d'oie.
        philosophe: {
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
                    line('M60 56 Q100 40 140 56', 2, '#D5D8DC') + rolls +
                    // la plume d'oie, glissée dans la perruque
                    el('path', { d: 'M128 58 C140 36 160 22 182 14 C174 30 156 46 134 60 Z', fill: '#FFFFFF', stroke: '#9EA3A8', 'stroke-width': 1.8, 'stroke-linejoin': 'round' }) +
                    line('M124 64 L178 18', 1.6, '#9EA3A8');
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
        var headG = '<g class="ca-head">' + ears + head + blush + eyes(mood) + mouth(mood) + whiskers + tear + costume(cos, 'hat', id) + '</g>';

        var arm = '';
        if (mood === 'salue') arm = '<g class="ca-wave">' + limb('M134 166 C156 160 168 142 167 124', 12) + pad(167, 119, 10, 9) + '</g>';
        if (mood === 'reflechit') arm = limb('M132 176 Q136 152 118 142', 12) + pad(116, 140, 10, 8.5);

        var fx = '';
        if (mood === 'ravi' || mood === 'fier') fx = star(30, 46, 9) + star(172, 36, 11) + (mood === 'ravi' ? star(182, 82, 6) : '');
        if (mood === 'dort') fx = '<g class="ca-zz">' + text(148, 46, 18, P.mark, 'z') + text(162, 28, 26, P.mark, 'Z') + '</g>';
        if (mood === 'reflechit') fx = text(160, 44, 32, P.mark, '?');
        if (mood === 'surpris') fx = text(164, 42, 32, P.alert, '!');

        var a11y = opts.label ? ' role="img" aria-label="' + String(opts.label).replace(/[&<>"]/g, '') + '"' : ' aria-hidden="true"';
        return '<svg xmlns="http://www.w3.org/2000/svg" class="clio-art ca-m-' + mood + '"' + (cos ? ' data-costume="' + cos + '"' : '') + ' viewBox="0 0 200 232"' + a11y + ' focusable="false">' + defs +
            '<g class="ca-whole">' + tail + body + costume(cos, 'body', id) + paws + headG + arm + fx + '</g></svg>';
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
