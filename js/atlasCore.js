// =========================================================================
// === HISTORIAXE — ATLAS : LOGIQUE PURE (points, fiche choisie, filtres) ===
// =========================================================================
//
// L'Atlas pose sur une carte du monde tous les événements qui ont un lieu
// (assets/geo/events-geo.json, produit par scripts/geo/). Ce module ne touche ni
// au DOM ni à la carte : il transforme la base et les points en entités à
// dessiner, choisit quelle fiche ouvrir, filtre par époque et catégorie. C'est ce
// qui se teste (tests/atlas.test.js) ; l'écran lui-même est dans js/atlas.js.
//
// UN POINT PAR FAIT. Un même fait figure souvent dans plusieurs thèmes (voir
// js/linkedEvents.js : même lien Wikipédia ET même année). Sur la carte il n'a
// qu'un seul point ; au toucher, on ouvre la fiche la plus pertinente du groupe,
// et ses liens « Vu aussi dans… » mènent aux autres. Le critère (scoreEntry) est
// celui de scripts/geo/10_build_facts.py, pour que la carte et le pipeline
// désignent la même fiche : description développée sans excès, titre portant un
// seul fait, thème généraliste.
//
// UN POINT PAR LIEU. Paris porte à lui seul des centaines d'événements : posés
// tels quels, ils s'empileraient au pixel près et un seul serait touchable. Les
// événements de mêmes coordonnées sont donc regroupés en une « pile » (un point,
// un compteur) dont le toucher ouvre la liste.
//
// Format des points : { "thème:id": [lat, lon, "s|v|z", libellé, drapeau] } —
// s = site, v = ville, z = zone (repère de découverte, pas un lieu précis) ;
// drapeau 1 = lieu discutable (ambigu ou peu sûr), à signaler au lecteur.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory(require('./linkedEvents.js'));
    } else {
        root.AtlasCore = factory(root.LinkedEvents);
    }
})(typeof self !== 'undefined' ? self : this, function (LinkedEvents) {
    'use strict';

    // Rang de généralité d'une catégorie (0 = la plus générale) : à égalité de
    // description, la fiche d'un thème généraliste passe devant celle d'un thème
    // de niche. Même table que scripts/geo/10_build_facts.py (CAT_RANK).
    const CATEGORY_RANK = {
        'Culture générale': 0,
        'Histoires nationales': 1,
        'Programmes scolaires': 2,
        'CAPES & Agrégation': 3,
        'Personnages illustres': 4
    };

    // Thèmes absents de la carte. L'histoire juive en années hébraïques date en 5708, pas en 1948 :
    // sur une frise du monde ses événements ne se placent pas (l'histoire juive en années civiles,
    // elle, y figure). Même exclusion que js/dailyEngine.js.
    const EXCLUDED_THEME_IDS = ['thm_histoire_juive_hebraique'];

    function isExcludedTheme(themeId) {
        return EXCLUDED_THEME_IDS.indexOf(themeId) !== -1;
    }

    function entryKey(entry) {
        return entry.theme.id + ':' + entry.event.id;
    }

    // Plus le score est haut, plus la fiche est pertinente pour représenter le fait.
    function scoreEntry(entry) {
        const evt = entry.event;
        const titre = evt.titre || '';
        const len = (evt.description || '').length;
        let s = len ? 3.0 - Math.abs(len - 350) / 150 : -3;
        [' et ', ', ', ' puis '].forEach(function (w) { if (titre.indexOf(w) !== -1) s -= 0.8; });
        s -= titre.length / 80;
        const rank = Object.prototype.hasOwnProperty.call(CATEGORY_RANK, entry.category && entry.category.nom)
            ? CATEGORY_RANK[entry.category.nom] : 4;
        s += 2.0 * (4 - rank) / 4;
        s += Math.min((entry.theme.events || []).length, 400) / 400;
        return s;
    }

    // Fiches imposées : quand le score en désigne une qui ne représente pas bien le fait (le Débarquement
    // tombait sur « Supériorité aérienne alliée en Normandie », fiche du thème de l'aviation), on nomme
    // celle qui l'incarne. Clé « thème:id ».
    const PREFERRED_KEYS = ['thm_bat:b52'];

    // La fiche à ouvrir pour un groupe : la fiche imposée s'il y en a une, sinon le meilleur score ;
    // à égalité, l'ordre de la base.
    function pickRepresentative(members) {
        const imposed = members.find(function (m) { return PREFERRED_KEYS.indexOf(entryKey(m)) !== -1; });
        if (imposed) return imposed;
        let best = null;
        let bestScore = -Infinity;
        members.forEach(function (m) {
            const sc = scoreEntry(m);
            if (sc > bestScore) { best = m; bestScore = sc; }
        });
        return best;
    }

    // Regroupe les entrées en faits : un groupe multi-thèmes (même lien + même année)
    // devient un seul fait, tout autre événement est son propre fait.
    function groupFacts(entries) {
        const byKey = new Map();
        const singles = [];
        entries.forEach(function (entry) {
            if (entry.category && entry.category.isCustomCategory) return;
            if (isExcludedTheme(entry.theme.id)) return;
            const key = LinkedEvents.factKey(entry.event);
            if (!key) { singles.push([entry]); return; }
            if (!byKey.has(key)) byKey.set(key, []);
            byKey.get(key).push(entry);
        });
        const facts = singles.slice();
        byKey.forEach(function (members) {
            const themes = new Set(members.map(function (m) { return m.theme.id; }));
            if (themes.size >= 2) { facts.push(members); return; }
            members.forEach(function (m) { facts.push([m]); });
        });
        return facts;
    }

    // Construit les points de la carte.
    //   entries : getAllEventsWithLocation() ; points : le contenu de events-geo.json.
    // Retourne { features, zones, index } :
    //   - features : une entité GeoJSON par PILE (lieu précis, site ou ville) ;
    //   - zones    : une entité par pile de lieux « zone » (cercle diffus, hors jeu) ;
    //   - index    : Map<clé de pile → { coords, items: [{ key, entry, members, year, prec, flag, label }] }>.
    function buildAtlas(entries, points) {
        const piles = new Map();
        groupFacts(entries).forEach(function (members) {
            const rep = pickRepresentative(members);
            const pt = members.map(function (m) { return points[entryKey(m)]; }).find(Boolean);
            if (!pt || typeof rep.event.date !== 'number') return;
            const lat = pt[0];
            const lon = pt[1];
            const prec = pt[2];
            const pileKey = prec + '|' + lat + '|' + lon;
            if (!piles.has(pileKey)) piles.set(pileKey, { coords: [lon, lat], prec: prec, items: [] });
            piles.get(pileKey).items.push({
                key: entryKey(rep),
                entry: rep,
                members: members,
                year: rep.event.date,
                prec: prec,
                flag: pt[4] ? 1 : 0,
                label: pt[3] || ''
            });
        });
        const features = [];
        const zones = [];
        const index = new Map();
        piles.forEach(function (pile, pileKey) {
            pile.items.sort(function (a, b) { return a.year - b.year; });
            index.set(pileKey, pile);
            const properties = {
                pile: pileKey,
                n: pile.items.length,
                prec: pile.prec,
                flag: pile.items.every(function (i) { return i.flag; }) ? 1 : 0
            };
            const feature = { type: 'Feature', geometry: { type: 'Point', coordinates: pile.coords }, properties: properties };
            (pile.prec === 'z' ? zones : features).push(feature);
        });
        return { features: features, zones: zones, index: index };
    }

    // Numéro de catégorie borné à 0‥30 pour tenir dans un masque de bits.
    function categoryBit(entry) {
        return Math.min(Math.max(entry.categoryIndex || 0, 0), 30);
    }

    // Les éléments d'une pile qui passent les filtres (époque + catégories).
    function visibleItems(pile, filter) {
        return pile.items.filter(function (it) { return itemPasses(it, filter); });
    }

    function itemPasses(item, filter) {
        if (!filter) return true;
        if (typeof filter.from === 'number' && item.year < filter.from) return false;
        if (typeof filter.to === 'number' && item.year > filter.to) return false;
        if (filter.cats && !filter.cats.has(categoryBit(item.entry))) return false;
        return true;
    }

    // Les entités à dessiner après filtre. Une pile reste affichée tant qu'au moins
    // un de ses éléments passe ; `n` devient le nombre d'éléments visibles et `c` la
    // catégorie dominante parmi eux (elle donne sa couleur au point).
    function applyFilter(features, index, filter) {
        const out = [];
        features.forEach(function (f) {
            const pile = index.get(f.properties.pile);
            const items = visibleItems(pile, filter);
            if (items.length === 0) return;
            const counts = {};
            let c = categoryBit(items[0].entry);
            items.forEach(function (it) {
                const b = categoryBit(it.entry);
                counts[b] = (counts[b] || 0) + 1;
                if (counts[b] > (counts[c] || 0)) c = b;
            });
            out.push({
                type: 'Feature',
                geometry: f.geometry,
                properties: Object.assign({}, f.properties, { n: items.length, c: c })
            });
        });
        return out;
    }

    function countEvents(features) {
        return features.reduce(function (sum, f) { return sum + f.properties.n; }, 0);
    }

    // --- ÉCHELLE DU TEMPS -------------------------------------------------
    // L'histoire va de −450 000 à nos jours, mais presque tous les événements sont
    // après −3000 : un curseur linéaire laisserait 99 % du trajet à la préhistoire.
    // On le gradue par tronçons (chacun occupe la même largeur), comme une frise.
    const TIME_KNOTS = [-450000, -10000, -3000, -500, 0, 500, 1000, 1500, 1800, 1900, 2030];

    function positionToYear(position) {
        const steps = TIME_KNOTS.length - 1;
        const p = Math.min(Math.max(position, 0), 1) * steps;
        const i = Math.min(Math.floor(p), steps - 1);
        const frac = p - i;
        return Math.round(TIME_KNOTS[i] + (TIME_KNOTS[i + 1] - TIME_KNOTS[i]) * frac);
    }

    function yearToPosition(year) {
        const steps = TIME_KNOTS.length - 1;
        if (year <= TIME_KNOTS[0]) return 0;
        if (year >= TIME_KNOTS[steps]) return 1;
        let i = 0;
        while (i < steps - 1 && year > TIME_KNOTS[i + 1]) i++;
        return (i + (year - TIME_KNOTS[i]) / (TIME_KNOTS[i + 1] - TIME_KNOTS[i])) / steps;
    }

    // Les curseurs ne donnent pas des années « rondes » (1 387, −4 213) : on les arrondit
    // au pas qui convient à la zone du temps où l'on se trouve.
    function roundYear(year) {
        const a = Math.abs(year);
        const step = a >= 100000 ? 10000 : a >= 10000 ? 1000 : a >= 3000 ? 100 : a >= 1500 ? 10 : a >= 500 ? 5 : 1;
        return Math.round(year / step) * step;
    }

    // --- RECHERCHE ----------------------------------------------------------
    // On cherche dans le titre et dans le nom du lieu, sans tenir compte des accents, de la casse
    // ni de la ponctuation ; tous les mots tapés doivent s'y trouver (dans n'importe quel ordre).
    function normalizeText(text) {
        return String(text || '').toLowerCase()
            .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    }

    // Tire des mots d'une requête ; vide si elle est trop courte pour chercher.
    function queryWords(query) {
        const norm = normalizeText(query);
        if (norm.length < 2) return [];
        return norm.split(' ');
    }

    // Cherche dans une carte construite (buildAtlas().index).
    //   → { places: [{ label, pileKeys, n }], events: [{ item, pileKey }] }
    // Les lieux sont regroupés par nom ; les événements viennent après, triés par pertinence
    // (titre commençant par la requête, puis mot entier, puis le reste), puis par date.
    function searchAtlas(index, query, limits) {
        const words = queryWords(query);
        const maxPlaces = (limits && limits.places) || 5;
        const maxEvents = (limits && limits.events) || 30;
        const out = { places: [], events: [] };
        if (words.length === 0) return out;
        const joined = words.join(' ');
        const placeMap = new Map();
        const hits = [];
        index.forEach(function (pile, pileKey) {
            pile.items.forEach(function (item) {
                const label = item.label || '';
                const labelNorm = item._labelNorm || (item._labelNorm = normalizeText(label));
                const titleNorm = item._titleNorm || (item._titleNorm = normalizeText(item.entry.event.titre));
                if (label && words.every(function (w) { return labelNorm.indexOf(w) !== -1; })) {
                    if (!placeMap.has(label)) placeMap.set(label, { label: label, norm: labelNorm, pileKeys: new Set(), n: 0 });
                    const pl = placeMap.get(label);
                    pl.pileKeys.add(pileKey);
                    pl.n++;
                }
                const hay = titleNorm + ' ' + labelNorm;
                if (!words.every(function (w) { return hay.indexOf(w) !== -1; })) return;
                let rank = 2;
                if (titleNorm.indexOf(joined) === 0) rank = 0;
                else if ((' ' + titleNorm + ' ').indexOf(' ' + joined) !== -1) rank = 1;
                hits.push({ item: item, pileKey: pileKey, rank: rank });
            });
        });
        out.places = Array.from(placeMap.values()).sort(function (a, b) {
            const as = a.norm.indexOf(joined) === 0 ? 0 : 1;
            const bs = b.norm.indexOf(joined) === 0 ? 0 : 1;
            return as - bs || b.n - a.n || a.label.localeCompare(b.label);
        }).slice(0, maxPlaces).map(function (p) {
            return { label: p.label, pileKeys: Array.from(p.pileKeys), n: p.n };
        });
        hits.sort(function (a, b) { return a.rank - b.rank || a.item.year - b.item.year; });
        out.events = hits.slice(0, maxEvents).map(function (h) { return { item: h.item, pileKey: h.pileKey }; });
        return out;
    }

    return {
        PREFERRED_KEYS: PREFERRED_KEYS,
        isExcludedTheme: isExcludedTheme,
        EXCLUDED_THEME_IDS: EXCLUDED_THEME_IDS,
        normalizeText: normalizeText,
        searchAtlas: searchAtlas,
        scoreEntry: scoreEntry,
        pickRepresentative: pickRepresentative,
        groupFacts: groupFacts,
        buildAtlas: buildAtlas,
        applyFilter: applyFilter,
        visibleItems: visibleItems,
        itemPasses: itemPasses,
        countEvents: countEvents,
        entryKey: entryKey,
        categoryBit: categoryBit,
        positionToYear: positionToYear,
        yearToPosition: yearToPosition,
        roundYear: roundYear,
        TIME_KNOTS: TIME_KNOTS
    };
});
