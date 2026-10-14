// =========================================================================
// === HISTORIAXE — MODE CARTE : LOGIQUE PURE (distance, échelle, points, tirage) ===
// =========================================================================
//
// Le Mode Carte demande de POSER un repère sur une carte sans noms, à l'endroit
// où l'événement s'est passé ; les points dépendent de la distance. Ce module ne
// touche ni au DOM ni à la carte : il se teste (tests/geoPlace.test.js). L'écran et
// la carte sont dans js/geoMap.js.
//
// LA DISTANCE se compte sur la sphère (haversine), en kilomètres.
//
// L'ÉCHELLE s'adapte à la zone jouée. 40 km d'écart sont excellents sur la carte du
// monde et médiocres sur la France : l'échelle D est donc tirée de l'étendue des
// lieux du thème joué (diagonale du cadre qui en contient 90 %, divisée par 12), de
// 25 km (un thème très local) à 2 500 km (le monde : environ 1 300 km, la France : environ 120 km). La part de points est
// exp(−d/D) : D est la distance où l'on garde 37 %.
//
// LA TOLÉRANCE suit la précision du lieu : on ne reproche pas 6 km à qui vise
// « Verdun » (une ville) alors que le point est son centre ; on en reproche 6 à
// qui vise la Sainte-Chapelle (un site). 1,5 km pour un site, 10 km pour une ville.
//
// LE VIVIER : seuls les faits au lieu SÛR (site ou ville, sans drapeau « lieu
// discutable ») deviennent des questions. Ce sont ceux de js/atlasCore.js, dont on
// reprend le regroupement en faits : un fait lié entre thèmes n'est posé qu'une fois.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory(require('./atlasCore.js'));
    } else {
        root.GeoPlace = factory(root.AtlasCore);
    }
})(typeof self !== 'undefined' ? self : this, function (AtlasCore) {
    'use strict';

    const EARTH_RADIUS_KM = 6371;
    const SCALE_MIN_KM = 25;
    const SCALE_MAX_KM = 2500;
    const TOLERANCE_KM = { s: 1.5, v: 10 };
    // Parts de points à partir desquelles un placement compte comme « très bon » (le combo monte)
    // ou « raté » (le combo retombe et une vie est perdue) ; entre les deux, il ne se passe rien.
    const GREAT_FROM = 0.6;
    const MISS_BELOW = 0.25;
    // Deux questions au même endroit au plus par partie : Paris porte à lui seul des centaines
    // d'événements, et douze Paris de suite ne feraient pas un jeu.
    const MAX_PER_PLACE = 2;

    function toRad(deg) { return deg * Math.PI / 180; }

    // Distance en km entre deux points [lat, lon].
    function haversineKm(a, b) {
        const dLat = toRad(b[0] - a[0]);
        const dLon = toRad(b[1] - a[1]);
        const h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
    }

    function percentile(sorted, p) {
        if (sorted.length === 0) return 0;
        const i = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
        return sorted[i];
    }

    // Le cadre qui contient l'essentiel (5ᵉ‥95ᵉ centile) des points [lat, lon] : quelques lieux
    // lointains (Rome, Alger dans l'histoire de France) ne doivent pas dilater toute la carte.
    function robustFrame(points) {
        const lats = points.map(p => p[0]).sort((a, b) => a - b);
        const lons = points.map(p => p[1]).sort((a, b) => a - b);
        const trim = points.length >= 20;
        return {
            minLat: percentile(lats, trim ? 0.05 : 0), maxLat: percentile(lats, trim ? 0.95 : 1),
            minLon: percentile(lons, trim ? 0.05 : 0), maxLon: percentile(lons, trim ? 0.95 : 1)
        };
    }

    // Échelle D (km) de la zone jouée.
    function scaleKm(points) {
        if (!points || points.length === 0) return SCALE_MAX_KM;
        const f = robustFrame(points);
        const diag = haversineKm([f.minLat, f.minLon], [f.maxLat, f.maxLon]);
        return Math.round(Math.min(SCALE_MAX_KM, Math.max(SCALE_MIN_KM, diag / 12)));
    }

    function toleranceKm(prec) {
        return Object.prototype.hasOwnProperty.call(TOLERANCE_KM, prec) ? TOLERANCE_KM[prec] : TOLERANCE_KM.v;
    }

    // Part de points (0‥1) pour une distance donnée, une échelle et une précision de lieu.
    function scoreFraction(distKm, scale, prec) {
        const effective = Math.max(0, distKm - toleranceKm(prec));
        return Math.round(Math.exp(-effective / scale) * 1000) / 1000;
    }

    function verdict(fraction) {
        if (fraction >= GREAT_FROM) return 'great';
        if (fraction < MISS_BELOW) return 'miss';
        return 'ok';
    }

    // Les limites [[ouest, sud], [est, nord]] où cadrer la carte au début d'une question :
    // le cadre robuste du vivier, élargi d'une marge, et jamais plus étroit qu'une ville.
    function boundsOf(points) {
        const f = robustFrame(points);
        const padLat = Math.max(1.5, (f.maxLat - f.minLat) * 0.15);
        const padLon = Math.max(2, (f.maxLon - f.minLon) * 0.15);
        return [
            [Math.max(-180, f.minLon - padLon), Math.max(-85, f.minLat - padLat)],
            [Math.min(180, f.maxLon + padLon), Math.min(85, f.maxLat + padLat)]
        ];
    }

    // Les questions possibles d'un ensemble d'entrées (un nœud de l'arbre) : faits au lieu sûr.
    //   entries : [{ event, theme, category?, categoryIndex?, … }] ; points : events-geo.json.points
    function buildPool(entries, points) {
        const atlas = AtlasCore.buildAtlas(entries, points);
        const pool = [];
        atlas.index.forEach(function (pile, pileKey) {
            const [lon, lat] = pile.coords;
            pile.items.forEach(function (item) {
                if (item.prec !== 's' && item.prec !== 'v') return;
                if (item.flag) return;
                pool.push({
                    event: item.entry.event,
                    entry: item.entry,
                    themeName: item.entry.theme.nom,
                    lat: lat,
                    lon: lon,
                    prec: item.prec,
                    label: item.label,
                    place: pileKey
                });
            });
        });
        return pool;
    }

    // Nombre de questions possibles, sans construire le vivier (pour savoir si le mode est proposé) :
    // les événements du nœud dont le lieu est sûr. Sort dès `atLeast` atteint.
    function countReliable(themes, points, atLeast) {
        let n = 0;
        for (let i = 0; i < themes.length; i++) {
            const theme = themes[i];
            if (AtlasCore.isExcludedTheme(theme.id)) continue;
            const events = theme.events || [];
            for (let j = 0; j < events.length; j++) {
                const pt = points[theme.id + ':' + events[j].id];
                if (pt && (pt[2] === 's' || pt[2] === 'v') && !pt[4] && typeof events[j].date === 'number') {
                    if (++n >= atLeast) return n;
                }
            }
        }
        return n;
    }

    function shuffled(list, rng) {
        const a = list.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            const t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    // Les questions d'une partie : au hasard, au plus MAX_PER_PLACE par lieu ; si le vivier est
    // trop étroit pour cela (un thème qui ne se passe qu'à Paris), on complète sans cette limite.
    function pickSession(pool, count, rng) {
        const random = rng || Math.random;
        const mixed = shuffled(pool, random);
        const perPlace = new Map();
        const picked = [];
        const rest = [];
        mixed.forEach(function (item) {
            const used = perPlace.get(item.place) || 0;
            if (picked.length < count && used < MAX_PER_PLACE) {
                picked.push(item);
                perPlace.set(item.place, used + 1);
            } else {
                rest.push(item);
            }
        });
        while (picked.length < count && rest.length > 0) picked.push(rest.shift());
        return picked;
    }

    return {
        haversineKm: haversineKm,
        robustFrame: robustFrame,
        scaleKm: scaleKm,
        toleranceKm: toleranceKm,
        scoreFraction: scoreFraction,
        verdict: verdict,
        boundsOf: boundsOf,
        buildPool: buildPool,
        countReliable: countReliable,
        pickSession: pickSession,
        MAX_PER_PLACE: MAX_PER_PLACE,
        GREAT_FROM: GREAT_FROM,
        MISS_BELOW: MISS_BELOW,
        SCALE_MIN_KM: SCALE_MIN_KM,
        SCALE_MAX_KM: SCALE_MAX_KM
    };
});
