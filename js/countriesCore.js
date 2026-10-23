// =========================================================================
// === L'ATLAS DES PAYS — RÈGLES (outil de la boîte à outils) ===
// =========================================================================
// Pur, sans DOM : testé dans tests/countriesCore.test.js. Les données sont dans assets/geo/countries.json (contours simplifiés,
// Natural Earth, domaine public) et assets/geo/countries-facts.json (une fiche par pays : capitale, langues, monnaie, population).
// L'écran et la carte (MapLibre) sont dans js/app/countries.js. Contenu en français seulement ; **à relire par un enseignant**.
//
// Une fiche : { id (code à trois lettres), iso2, n (nom), cap, lang, cur, pop (habitants, estimation de `year`), year, cont, sub?,
//               c: [lon, lat] (où poser le nom), z (zoom à partir duquel le nom s'affiche), st?: 'contesté' | 'territoire' | 'aucun',
//               sov? (État dont dépend un territoire), note? }.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.CountriesCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Le drapeau est un emoji : deux lettres « indicateur régional » (FR → 🇫🇷). Pas d'image à télécharger.
    function flagEmoji(iso2) {
        if (!/^[A-Za-z]{2}$/.test(iso2 || '')) return '';
        var base = 0x1F1E6;
        var a = iso2.toUpperCase().charCodeAt(0) - 65;
        var b = iso2.toUpperCase().charCodeAt(1) - 65;
        return String.fromCodePoint(base + a, base + b);
    }

    // 68 400 000 → « 68,4 millions » ; 56 000 → « 56 000 » ; 800 → « 800 ».
    function formatPopulation(n) {
        if (typeof n !== 'number' || !isFinite(n) || n <= 0) return '';
        if (n >= 1e9) return trim((n / 1e9).toFixed(2)) + ' milliard' + (n >= 2e9 ? 's' : '');
        if (n >= 1e6) {
            var m = n / 1e6;
            return trim(m.toFixed(m >= 100 ? 0 : m >= 10 ? 1 : 2)) + ' million' + (m >= 2 ? 's' : '');
        }
        return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
    function trim(s) { if (s.indexOf('.') !== -1) s = s.replace(/0+$/, '').replace(/\.$/, ''); return s.replace('.', ','); }

    function normalize(text) {
        return String(text == null ? '' : text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
            .replace(/[’']/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Recherche par nom ou par capitale, sans accent ni majuscule : les noms qui commencent par la saisie d'abord, puis ceux qui la contiennent.
    function searchCountries(list, query, limit) {
        var q = normalize(query);
        if (!q) return [];
        var starts = [], contains = [];
        list.forEach(function (c) {
            var name = normalize(c.n);
            var cap = normalize(c.cap);
            if (name.indexOf(q) === 0 || name.split(' ').some(function (w) { return w.indexOf(q) === 0 && q.length > 2; })) starts.push(c);
            else if (name.indexOf(q) !== -1 || cap.indexOf(q) !== -1) contains.push(c);
        });
        var byName = function (a, b) { return a.n.localeCompare(b.n, 'fr'); };
        starts.sort(byName); contains.sort(byName);
        return starts.concat(contains).slice(0, limit || 8);
    }

    // --- Géométrie (MultiPolygon GeoJSON, plan lon/lat) --------------------------------------------------
    function ringArea(ring) {
        var s = 0;
        for (var i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
        return Math.abs(s) / 2;
    }

    function ringBox(ring) {
        var box = [Infinity, Infinity, -Infinity, -Infinity];
        ring.forEach(function (p) {
            if (p[0] < box[0]) box[0] = p[0];
            if (p[1] < box[1]) box[1] = p[1];
            if (p[0] > box[2]) box[2] = p[0];
            if (p[1] > box[3]) box[3] = p[1];
        });
        return box;
    }

    // Les polygones d'un pays, chacun avec sa boîte : { rings, box, area }.
    function prepare(geometry) {
        var polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
        var parts = polygons.map(function (rings) { return { rings: rings, box: ringBox(rings[0]), area: ringArea(rings[0]) }; });
        var box = parts.reduce(function (acc, p) {
            return [Math.min(acc[0], p.box[0]), Math.min(acc[1], p.box[1]), Math.max(acc[2], p.box[2]), Math.max(acc[3], p.box[3])];
        }, [Infinity, Infinity, -Infinity, -Infinity]);
        var largest = parts.reduce(function (a, b) { return b.area > a.area ? b : a; }, parts[0]);
        return { parts: parts, box: box, largest: largest.box };
    }

    function inRing(ring, x, y) {
        var inside = false;
        for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
    }

    // Le point (lon, lat) est-il dans le pays ? (les trous comptent : un lac intérieur n'est pas le pays)
    function contains(prepared, lon, lat) {
        if (lon < prepared.box[0] || lon > prepared.box[2] || lat < prepared.box[1] || lat > prepared.box[3]) return false;
        return prepared.parts.some(function (part) {
            if (lon < part.box[0] || lon > part.box[2] || lat < part.box[1] || lat > part.box[3]) return false;
            if (!inRing(part.rings[0], lon, lat)) return false;
            for (var h = 1; h < part.rings.length; h++) if (inRing(part.rings[h], lon, lat)) return false;
            return true;
        });
    }

    // Le contour est simplifié (quelques kilomètres) : un port peut tomber à l'eau. On accepte un point à moins de `margin` degrés du pays.
    function containsNear(prepared, lon, lat, margin) {
        var m = margin == null ? 0.07 : margin;
        return contains(prepared, lon, lat) || contains(prepared, lon + m, lat) || contains(prepared, lon - m, lat)
            || contains(prepared, lon, lat + m) || contains(prepared, lon, lat - m);
    }

    // Les pays trop petits pour qu'on les touche à l'échelle du monde : on leur met un point.
    function isTiny(prepared) {
        return Math.max(prepared.largest[2] - prepared.largest[0], prepared.largest[3] - prepared.largest[1]) < 1.6
            && prepared.parts.reduce(function (s, p) { return s + p.area; }, 0) < 2;
    }

    // Les lignes de la fiche, dans l'ordre d'affichage : [{ key, value }]. `key` est une clé de libellé (tools.countries_<key>).
    function factRows(country) {
        var rows = [];
        if (country.cap && country.cap !== 'aucune') rows.push({ key: 'capital', value: country.cap });
        if (country.lang && country.lang !== 'aucune') rows.push({ key: 'languages', value: country.lang });
        if (country.cur && country.cur !== 'aucune') rows.push({ key: 'currency', value: country.cur });
        if (country.pop) rows.push({ key: 'population', value: formatPopulation(country.pop) + ' d\'habitants', year: country.year });
        rows.push({ key: 'continent', value: country.sub && country.sub !== country.cont ? country.sub + ' (' + country.cont + ')' : country.cont });
        // La fête nationale vient en dernier : elle ne déplace pas les lignes qui la précèdent.
        rows.push({ key: 'national_day', value: country.fete || 'aucune fête nationale officielle' });
        return rows;
    }

    return {
        flagEmoji: flagEmoji, formatPopulation: formatPopulation, normalize: normalize, searchCountries: searchCountries,
        prepare: prepare, contains: contains, containsNear: containsNear, isTiny: isTiny, factRows: factRows
    };
}));
