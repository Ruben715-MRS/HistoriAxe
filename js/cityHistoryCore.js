// =========================================================================
// === HISTORIAXE — VILLE DE L'HISTOIRE : LOGIQUE PURE (le pool, les fuites, les questions) ===
// =========================================================================
//
// « Où se déroule ce fait ? » : un événement de l'histoire, une carte du monde sans aucun nom, et la ville à toucher. Les lieux
// viennent de l'Atlas des événements (assets/geo/events-geo.json), les villes de assets/geo/cities.json. Ce module ne touche ni au
// DOM ni à la carte : il se teste (tests/cityHistoryCore.test.js). L'écran est dans js/modes/cities.js.
//
// UN FAIT N'EST POSÉ QUE S'IL SE RATTACHE À UNE VILLE CONNUE. Le lieu de l'Atlas est le point où l'événement a été géocodé (parfois
// un village, un monument) ; il devient une ville du jeu seulement s'il est à moins de MATCH_KM de son centre, ou à moins de
// NEAR_KM avec le même nom. « Naissance de Nietzsche » est à Röcken, à 20 km de Leipzig : ce n'est pas Leipzig, le fait est écarté.
// On gagne aussi le nom français de la ville (le libellé de l'Atlas est parfois en anglais ou dans la langue du lieu : « Köln »).
//
// LE TITRE NE DOIT PAS NOMMER LA VILLE. « Siège de Kaifeng » situé à Kaifeng ne demande qu'à savoir où est Kaifeng : ce n'est plus
// de l'histoire. Un fait dont le titre contient le nom de la ville (celui du jeu ou le libellé de l'Atlas) est écarté, comme une fête
// nationale qui cite le pays n'est pas un indice du quiz des pays.
//
// LE TIRAGE favorise les grandes villes (poids = racine du nombre de faits) sans en répéter une : une ville au plus par partie,
// puisque Paris porte à elle seule des centaines de faits.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory(require('./geoQuizCore.js'));
    } else {
        root.CityHistoryCore = factory(root.GeoQuizCore);
    }
})(typeof self !== 'undefined' ? self : this, function (GeoQuizCore) {
    'use strict';

    var MATCH_KM = 5;
    var NEAR_KM = 12;
    // Une boîte en degrés pour écarter vite les villes lointaines avant de calculer une distance (1° = 111 km).
    var BOX_DEG = 0.2;

    function normalize(text) {
        return String(text == null ? '' : text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
            .replace(/[’']/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Le nom principal d'un libellé de l'Atlas : « Ogidi, Anambra » → « Ogidi ».
    function mainName(label) {
        return String(label || '').split(',')[0].replace(/\(.*\)/g, '').trim();
    }

    // Le titre nomme-t-il l'un de ces noms, en mots entiers ?
    function titleNames(title, names) {
        var haystack = ' ' + normalize(title) + ' ';
        return names.some(function (n) {
            var k = normalize(n);
            return k !== '' && haystack.indexOf(' ' + k + ' ') !== -1;
        });
    }

    // La ville du jeu qui est ce lieu, ou null : la plus proche à moins de MATCH_KM, ou à moins de NEAR_KM avec le même nom.
    function matchCity(cities, lat, lon, label) {
        var wanted = normalize(mainName(label));
        var best = null;
        var bestKm = Infinity;
        for (var i = 0; i < cities.length; i++) {
            var c = cities[i];
            if (Math.abs(c.lat - lat) > BOX_DEG || Math.abs(c.lon - lon) > BOX_DEG * 1.6) continue;
            var km = GeoQuizCore.distanceKm([lon, lat], [c.lon, c.lat]);
            var ok = km <= MATCH_KM || (km <= NEAR_KM && wanted !== '' && normalize(c.n) === wanted);
            if (ok && km < bestKm) { best = c; bestKm = km; }
        }
        return best ? { city: best, km: bestKm } : null;
    }

    // Les faits de l'Atlas des événements (le modèle de AtlasCore.buildAtlas, `index`) dont le lieu est une ville sûre : ni zone, ni site,
    // ni lieu « discutable ». Un fait lié entre plusieurs thèmes n'y figure qu'une fois (le regroupement de l'Atlas).
    function factsFromAtlas(index) {
        var facts = [];
        index.forEach(function (pile) {
            pile.items.forEach(function (item) {
                if (item.prec !== 'v' || item.flag) return;
                var event = item.entry.event;
                var theme = item.entry.theme;
                facts.push({
                    id: theme.id + ':' + event.id, title: event.titre, year: item.year, lat: pile.coords[1], lon: pile.coords[0],
                    label: item.label, description: event.description || '', theme: theme.nom || '',
                    // L'événement lui-même : dans un pack découpé, sa description n'arrive qu'à la demande (Pack.ensureDescriptions).
                    event: event
                });
            });
        });
        return facts;
    }

    // Le vivier : les faits (au lieu de ville sûr, déjà choisis par l'appelant) qui se rattachent à une ville du jeu, sans que leur
    // titre la nomme. `facts` : [{ id, title, year, lat, lon, label, description?, theme? }].
    function buildHistoryPool(facts, cities) {
        var pool = [];
        facts.forEach(function (fact) {
            if (typeof fact.year !== 'number' || !fact.title) return;
            var m = matchCity(cities, fact.lat, fact.lon, fact.label);
            if (!m) return;
            if (titleNames(fact.title, [m.city.n, mainName(fact.label)])) return;
            pool.push({ fact: fact, city: m.city, km: m.km });
        });
        return pool;
    }

    // Tirage pondéré sans remise (Efraimidis–Spirakis) : la clé u^(1/poids), les plus grandes d'abord.
    function weightedOrder(items, weightOf, random) {
        return items.map(function (item) {
            return { item: item, key: Math.pow(random(), 1 / weightOf(item)) };
        }).sort(function (a, b) { return b.key - a.key; }).map(function (x) { return x.item; });
    }

    // Une naissance ou un décès (« Naissance de Wang Yangming ») : près de la moitié du vivier, et le plus souvent obscure. Une partie n'en
    // compte que MAX_PEOPLE, pour garder des événements.
    // « de X » ou « d'X » : un nom propre. Ni « de la République », « de l'Empire », « du théâtre kabuki », ni « d'un » : des événements.
    var PERSON_TITLE = /^(Naissance|D[ée]c[èe]s|Mort)\s+(de (?!la |le |les |l['’])|d['’](?!un |une ))/i;
    var MAX_PEOPLE = 2;

    // Les périodes du jeu, par année (négatif : avant notre ère). « all » ne filtre rien.
    var PERIODS = [
        { key: 'all', from: -Infinity, to: Infinity },
        { key: 'antiquity', from: -Infinity, to: 499 },
        { key: 'middle', from: 500, to: 1491 },
        { key: 'modern', from: 1492, to: 1788 },
        { key: 'contemporary', from: 1789, to: Infinity }
    ];

    function inPeriod(year, key) {
        var p = PERIODS.filter(function (x) { return x.key === key; })[0];
        if (!p) return true;
        return year >= p.from && year <= p.to;
    }

    // `count` questions, chacune sur une ville différente ; dans une ville, un fait au hasard. `period` : une période de PERIODS.
    function generateHistoryGame(pool, opts) {
        var o = opts || {};
        var random = o.rng || Math.random;
        var count = o.count || 10;
        var byCity = new Map();
        pool.filter(function (p) { return inPeriod(p.fact.year, o.period || 'all'); }).forEach(function (p) {
            if (!byCity.has(p.city.id)) byCity.set(p.city.id, []);
            byCity.get(p.city.id).push(p);
        });
        var cityIds = weightedOrder(Array.from(byCity.keys()), function (id) { return Math.sqrt(byCity.get(id).length); }, random);
        var out = [];
        var people = 0;
        for (var i = 0; i < cityIds.length && out.length < count; i++) {
            var items = byCity.get(cityIds[i]);
            var p = items[Math.floor(random() * items.length)];
            if (PERSON_TITLE.test(p.fact.title)) {
                // Une autre sorte de fait de cette ville si elle en a ; sinon, on passe à la ville suivante une fois le quota atteint.
                var events = items.filter(function (x) { return !PERSON_TITLE.test(x.fact.title); });
                if (events.length) p = events[Math.floor(random() * events.length)];
                else if (people >= MAX_PEOPLE) continue;
            }
            if (PERSON_TITLE.test(p.fact.title)) people++;
            out.push({
                form: 'history', ask: 'history', target: p.city.id, country: p.city.cc,
                factId: p.fact.id, title: p.fact.title, year: p.fact.year, description: p.fact.description || '',
                theme: p.fact.theme || '', place: p.city.n, event: p.fact.event || null, options: []
            });
        }
        return out;
    }

    // Contrôle a posteriori : la ville existe et son nom n'est pas dans le titre.
    function isValid(question, cities) {
        var city = cities.filter(function (c) { return c.id === question.target; })[0];
        return !!city && question.options.length === 0 && !titleNames(question.title, [city.n]);
    }

    return {
        MATCH_KM: MATCH_KM, NEAR_KM: NEAR_KM, MAX_PEOPLE: MAX_PEOPLE, PERSON_TITLE: PERSON_TITLE, PERIODS: PERIODS, inPeriod: inPeriod,
        normalize: normalize, mainName: mainName, titleNames: titleNames, matchCity: matchCity,
        factsFromAtlas: factsFromAtlas, buildHistoryPool: buildHistoryPool, generateHistoryGame: generateHistoryGame, isValid: isValid
    };
});
