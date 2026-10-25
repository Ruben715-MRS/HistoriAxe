// =========================================================================
// === HISTORIAXE — QUIZ DES PAYS : LOGIQUE PURE (questions, indices, distracteurs) ===
// =========================================================================
//
// Le quiz géographique tire ses questions de l'Atlas des pays (assets/geo/countries-facts.json).
// Ce module ne touche ni au DOM ni à la carte : il se teste (tests/geoQuizCore.test.js).
//
// UNE QUESTION = des INDICES qui décrivent un pays, et une RÉPONSE demandée sur ce pays.
//   ex. indice : capitale « Oranjestad » → réponse : le nom du pays.
//
// LA RÈGLE D'UNICITÉ. Une question n'est valable que si les indices ne désignent que des pays qui ont la même réponse.
// Un seul indice suffit souvent (la capitale). Quand il ne suffit pas (l'euro vaut pour 24 pays), on en ajoute un second,
// puis un troisième, jusqu'à l'unicité. Elle se vérifie sur tout le jeu de données, pas seulement sur les propositions :
// un distracteur qui satisferait les indices rendrait la question fausse.
//
// LES DISTRACTEURS n'ont jamais la bonne réponse ; en mode difficile, ils viennent de la même sous-région.
// Deux populations ne sont proposées ensemble que si l'une est au moins MIN_RATIO fois l'autre.
//
// Une fête nationale qui cite le pays (« Fête du Canada ») n'est jamais un indice ni une réponse : elle donnerait la réponse.
// L'Antarctique, les territoires dépendants et les entités contestées sont exclus par défaut.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else {
        root.GeoQuizCore = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Une entité contestée (Taïwan, Kosovo…) ou un territoire dépendant (Guernesey…) ne se pose pas en question d'examen.
    var EXCLUDED_STATUS = ['territoire', 'contesté'];
    var NO_CONTINENT = 'Antarctique';
    // Indices possibles. « name » (le nom du pays) sert aux questions « pays → capitale », « pays → monnaie »…
    var CLUE_KEYS = ['name', 'cap', 'cur', 'lang', 'sub', 'cont', 'fete'];
    // Le drapeau (emoji) n'est pas un indice du quiz général : seul le mode « drapeau → pays » le demande (opts.clues).
    var FLAG_CLUE = 'flag';
    // Réponses possibles. La population n'est pas un indice : elle ne désigne rien par égalité.
    var ASK_KEYS = ['name', 'cap', 'cur', 'sub', 'cont', 'pop', 'fete'];
    var DEFAULTS = { count: 10, options: 4, maxClues: 3, difficulty: 'easy' };
    var MIN_RATIO = 1.5;
    // Mots du nom qui ne désignent pas le pays (« République », « Îles »…) : on ne les cherche pas dans les fêtes.
    var NAME_STOPWORDS = ['republique', 'royaume', 'democratique', 'federale', 'populaire', 'iles', 'ile', 'unis', 'etats', 'etat',
        'emirats', 'arabes', 'saint', 'sainte', 'nouvelle', 'union', 'principaute', 'federation'];

    function normalize(text) {
        return String(text == null ? '' : text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
            .replace(/[’']/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function known(value) { return value && value !== 'aucune' ? value : null; }

    // Les mots significatifs d'un nom (au moins quatre lettres, hors mots génériques).
    function words(text) {
        return normalize(text).split(' ').filter(function (w) { return w.length >= 4 && NAME_STOPWORDS.indexOf(w) === -1; });
    }

    // Le texte nomme-t-il le pays ou sa capitale ? Les mots longs se reconnaissent à leur radical (« fran » dans « française ») ;
    // les mots courts doivent être entiers, sinon « inde » ferait écarter « indépendance ».
    function namesCountry(text, country) {
        var said = normalize(text).split(' ');
        return words(country.n).concat(words(country.cap)).some(function (w) {
            if (w.length < 6) return said.indexOf(w) !== -1;
            var stem = w.slice(0, w.length - 2);
            return said.some(function (s) { return s.indexOf(stem) === 0; });
        });
    }

    // La fête nationale, si elle existe et ne révèle pas le pays ; sinon null.
    function nationalDay(country) {
        var text = known(country.fete);
        return text && !namesCountry(text, country) ? text : null;
    }

    // Le drapeau est un emoji : deux lettres « indicateur régional » (FR → 🇫🇷). Null si le code manque.
    function flagOf(country) {
        var code = String(country.iso2 || '').toUpperCase();
        if (!/^[A-Z]{2}$/.test(code)) return null;
        return String.fromCodePoint(0x1F1E6 + code.charCodeAt(0) - 65, 0x1F1E6 + code.charCodeAt(1) - 65);
    }

    // Les valeurs qu'un pays présente pour un indice : une seule, sauf pour les langues (« néerlandais, papiamento »).
    function clueValues(country, key) {
        if (key === 'lang') {
            return String(country.lang || '').split(',').map(function (l) { return l.trim(); }).filter(known);
        }
        var value = key === 'name' ? country.n : key === 'fete' ? nationalDay(country) : key === FLAG_CLUE ? flagOf(country) : known(country[key]);
        return value ? [value] : [];
    }

    // La réponse d'un pays à une question `ask` : son nom, sa capitale, sa population, sa fête…; null si elle manque.
    function answerOf(country, ask) {
        if (ask === 'pop') return country.pop || null;
        if (ask === 'name') return country.n;
        var values = clueValues(country, ask);
        return values.length ? values[0] : null;
    }

    // Les pays jouables : ceux qui ont tous les champs utiles, hors Antarctique et (sauf option) hors territoires et entités contestées.
    function playablePool(countries, opts) {
        var keepSpecial = !!(opts && opts.includeSpecial);
        return countries.filter(function (c) {
            if (c.cont === NO_CONTINENT || !c.pop) return false;
            if (!keepSpecial && EXCLUDED_STATUS.indexOf(c.st) !== -1) return false;
            return Boolean(known(c.cap) && known(c.cur) && known(c.lang) && known(c.sub));
        });
    }

    // Les pays que décrivent tous ces indices.
    function matching(pool, clues) {
        return pool.filter(function (c) {
            return clues.every(function (clue) { return clueValues(c, clue.key).indexOf(clue.value) !== -1; });
        });
    }

    // Vrai si les indices désignent au moins un pays, et que tous ces pays ont la même réponse.
    function isUnambiguous(pool, clues, ask, answer) {
        var found = matching(pool, clues);
        return found.length > 0 && found.every(function (c) { return answerOf(c, ask) === answer; });
    }

    function shuffle(list, random) {
        var a = list.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function pick(list, random) { return list[Math.floor(random() * list.length)]; }

    // Les pays qu'on peut interroger, mélangés : tout le jeu de pays, ou seulement ceux de `o.targets` (une liste d'identifiants).
    // Le jeu entier sert toujours aux fausses réponses et à lever les ambiguïtés.
    function targetList(pool, o) {
        var keep = o.targets ? new Set(o.targets) : null;
        return shuffle(keep ? pool.filter(function (c) { return keep.has(c.id); }) : pool, o.rng);
    }

    function settings(opts) {
        var src = opts || {};
        var o = { rng: src.rng || Math.random, ask: src.ask, asks: src.asks, clues: src.clues, first: src.first, targets: src.targets, leaders: src.leaders, year: src.year };
        Object.keys(DEFAULTS).forEach(function (k) { o[k] = src[k] != null ? src[k] : DEFAULTS[k]; });
        return o;
    }

    // Deux populations sont assez éloignées si l'une est au moins MIN_RATIO fois l'autre.
    function farEnough(value, others) {
        return others.every(function (other) {
            return Math.max(value, other) / Math.min(value, other) >= MIN_RATIO;
        });
    }

    // Les propositions : la bonne réponse et des distracteurs à réponse différente. En mode difficile, la même sous-région d'abord.
    function chooseOptions(target, pool, o) {
        var answer = answerOf(target, o.ask);
        var candidates = shuffle(pool.filter(function (c) {
            var v = answerOf(c, o.ask);
            return c.id !== target.id && v != null && v !== answer;
        }), o.rng);
        if (o.difficulty === 'hard') {
            var rank = function (c) { return c.sub === target.sub ? 0 : c.cont === target.cont ? 1 : 2; };
            candidates.sort(function (a, b) { return rank(a) - rank(b); });
        }
        var values = [answer];
        var wanted = o.options - 1;
        var chosen = [];
        for (var i = 0; i < candidates.length && chosen.length < wanted; i++) {
            var v = answerOf(candidates[i], o.ask);
            if (values.indexOf(v) !== -1) continue;
            if (o.ask === 'pop' && !farEnough(v, values)) continue;
            values.push(v);
            chosen.push(candidates[i]);
        }
        if (chosen.length < wanted) return null;
        return shuffle([target].concat(chosen), o.rng).map(function (c) {
            return { id: c.id, value: answerOf(c, o.ask) };
        });
    }

    // Une question sur `target` : la réponse `o.ask`, décrite par des indices pris dans le pays. Null si aucune combinaison
    // d'au plus `o.maxClues` indices ne la rend sans ambiguïté, ou si les propositions manquent.
    // Un ordre d'indices tiré au hasard peut mener dans une impasse (la monnaie, la sous-région et la langue d'abord, la capitale
    // ensuite trop tard) : on retente avec un autre ordre, un nombre limité de fois.
    var CLUE_ATTEMPTS = 8;

    function buildQuestion(target, pool, opts) {
        var o = settings(opts);
        var answer = answerOf(target, o.ask);
        if (answer == null) return null;
        for (var attempt = 0; attempt < CLUE_ATTEMPTS; attempt++) {
            var clues = cluesFor(target, pool, o, answer);
            if (clues) {
                var options = chooseOptions(target, pool, o);
                return options ? { target: target.id, ask: o.ask, clues: clues, options: options } : null;
            }
        }
        return null;
    }

    // Les indices qui désignent `target` seul, parmi les réponses possibles ; null si le tirage n'y arrive pas.
    function cluesFor(target, pool, o, answer) {
        var clues = [];
        var allowed = o.clues || CLUE_KEYS;
        // `o.first` : des indices essayés en premier, dans l'ordre (« la fête d'abord » pour une question sur les fêtes nationales).
        var first = (o.first || []).filter(function (k) { return k !== o.ask && allowed.indexOf(k) !== -1; });
        var keys = first.concat(shuffle(allowed.filter(function (k) { return k !== o.ask && first.indexOf(k) === -1; }), o.rng));
        for (var i = 0; i < keys.length && clues.length < o.maxClues; i++) {
            var values = clueValues(target, keys[i]);
            if (!values.length) continue;
            var candidate = clues.concat([{ key: keys[i], value: pick(values, o.rng) }]);
            // Un indice qui ne resserre pas la liste ne sert à rien : on ne l'ajoute pas.
            if (matching(pool, candidate).length === matching(pool, clues).length) continue;
            clues = candidate;
            if (isUnambiguous(pool, clues, o.ask, answer)) return clues;
        }
        return null;
    }

    // `count` questions sur des pays différents. Pour chaque pays, une réponse tirée parmi `asks` (ou toutes), la première
    // qui donne une question valable.
    function generateQuestions(pool, opts) {
        var o = settings(opts);
        var asks = o.asks || ASK_KEYS;
        var questions = [];
        var targets = targetList(pool, o);
        for (var i = 0; i < targets.length && questions.length < o.count; i++) {
            var order = shuffle(asks, o.rng);
            for (var j = 0; j < order.length; j++) {
                var question = buildQuestion(targets[i], pool, { ask: order[j], options: o.options, maxClues: o.maxClues, difficulty: o.difficulty, clues: o.clues, first: o.first, rng: o.rng });
                if (question) { questions.push(question); break; }
            }
        }
        return questions;
    }

    // Contrôle a posteriori d'une question : la cible est proposée, une seule proposition a sa réponse, et les indices
    // désignent uniquement cette réponse dans tout le jeu de données.
    function isValid(question, pool) {
        var byId = function (id) { return pool.filter(function (c) { return c.id === id; })[0]; };
        var target = byId(question.target);
        if (!target || question.options.length < 2) return false;
        var answer = answerOf(target, question.ask);
        var values = question.options.map(function (o) { return o.value; });
        var ids = question.options.map(function (o) { return o.id; });
        if (ids.indexOf(target.id) === -1 || new Set(values).size !== values.length) return false;
        if (!question.options.every(function (o) { var c = byId(o.id); return c && answerOf(c, question.ask) === o.value; })) return false;
        return values.filter(function (v) { return v === answer; }).length === 1
            && isUnambiguous(pool, question.clues, question.ask, answer);
    }

    // --- « Touche le pays » (carte) ------------------------------------------------------------
    // Pas d'options : le joueur touche le pays nommé. Un pays trop petit pour être touché à l'échelle du monde compte comme réussi
    // dans LOCATE_TINY_KM ; les autres exigent un point à l'intérieur du contour (voir CountriesCore.containsNear).
    var LOCATE_TINY_KM = 100;

    // Distance orthodromique en kilomètres entre deux points [lon, lat].
    function distanceKm(a, b) {
        var rad = Math.PI / 180;
        var dLat = (b[1] - a[1]) * rad;
        var dLon = (b[0] - a[0]) * rad;
        var h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
    }

    // Le clic est-il une bonne réponse ? `tap` : { inside (le point est dans le contour), tiny (pays trop petit), distanceKm (au centre du pays) }.
    function locateCorrect(tap) {
        return tap.tiny ? tap.distanceKm <= LOCATE_TINY_KM : tap.inside;
    }

    // `count` questions « touche le pays », sur des pays différents, sans options.
    function generateLocateQuestions(pool, opts) {
        var o = settings(opts);
        return targetList(pool, o).slice(0, o.count).map(function (c) {
            return { target: c.id, ask: 'locate', clues: [{ key: 'name', value: c.n }], options: [] };
        });
    }


    // --- « Carte → nom » ----------------------------------------------------------------------
    // Un pays montré sur la carte (sans aucun nom écrit dessus), quatre noms à choisir. Pas d'indices : la carte est l'indice.
    function generateMapNameQuestions(pool, opts) {
        var o = settings(opts);
        var out = [];
        targetList(pool, o).forEach(function (target) {
            if (out.length >= o.count) return;
            var options = chooseOptions(target, pool, { ask: 'name', options: o.options, difficulty: o.difficulty, rng: o.rng });
            if (options) out.push({ target: target.id, ask: 'name', clues: [], options: options });
        });
        return out;
    }

    // --- « Fêtes nationales » -----------------------------------------------------------------
    // Soit la fête (« 14 juillet : Fête de la Fédération ») désigne le pays, soit le pays désigne sa fête. Un pays n'est interrogé que
    // s'il a une fête qui ne le nomme pas. Si une même fête vaut pour plusieurs pays, un indice de plus les départage.
    function generateFeteQuestions(pool, opts) {
        var o = settings(opts);
        var out = [];
        targetList(pool, o).filter(function (c) { return nationalDay(c); }).forEach(function (target) {
            if (out.length >= o.count) return;
            shuffle(['name', 'fete'], o.rng).some(function (ask) {
                var q = buildQuestion(target, pool, {
                    ask: ask, options: o.options, maxClues: o.maxClues, difficulty: o.difficulty, rng: o.rng,
                    clues: ask === 'name' ? ['fete', 'cont', 'sub', 'lang', 'cur'] : ['name'],
                    first: ask === 'name' ? ['fete'] : ['name']
                });
                if (q) out.push(q);
                return !!q;
            });
        });
        return out;
    }

    // --- « Qui suis-je ? » --------------------------------------------------------------------
    // Des indices du moins évident au plus évident ; le joueur choisit parmi quatre pays et chaque indice demandé coûte des points.
    // Les indices qui restent forment, tous ensemble, une description sans ambiguïté.
    var WHO_KEYS = ['cont', 'sub', 'lang', 'cur', 'pop', 'fete', 'cap'];

    function generateWhoQuestions(pool, opts) {
        var o = settings(opts);
        var out = [];
        targetList(pool, o).forEach(function (target) {
            if (out.length >= o.count) return;
            var clues = [];
            WHO_KEYS.forEach(function (key) {
                var values = clueValues(target, key);
                if (values.length) clues.push({ key: key, value: pick(values, o.rng) });
            });
            if (clues.length < 4 || !isUnambiguous(pool, clues, 'name', target.n)) return;
            var options = chooseOptions(target, pool, { ask: 'name', options: o.options, difficulty: o.difficulty, rng: o.rng });
            if (!options) return;
            // Le premier indice (la région) doit départager quelque chose : si les quatre propositions sont toutes dans la région
            // du pays, une fausse réponse vient d'une autre région (sinon ce premier indice ne sert à rien).
            var first = clues[0];
            var choices = options.map(function (op) { return pool.filter(function (c) { return c.id === op.id; })[0]; });
            if (!choices.some(function (c) { return clueValues(c, first.key).indexOf(first.value) === -1; })) {
                var taken = options.map(function (op) { return op.id; });
                var outsiders = shuffle(pool.filter(function (c) {
                    return c.cont !== target.cont && taken.indexOf(c.id) === -1 && answerOf(c, 'name') !== target.n;
                }), o.rng);
                if (!outsiders.length) return;
                var swap = options.findIndex(function (op) { return op.id !== target.id; });
                options[swap] = { id: outsiders[0].id, value: outsiders[0].n };
            }
            out.push({ target: target.id, ask: 'name', clues: clues, options: options });
        });
        return out;
    }

    // --- « Saisie libre » ---------------------------------------------------------------------
    // Le joueur tape la réponse : la capitale d'un pays, ou le pays décrit par des indices.
    // Ce qu'on accepte pour une réponse de l'Atlas : chaque capitale citée (« Pretoria (exécutive) ; Le Cap (législative) » en a deux),
    // sans les précisions entre parenthèses ; et pour un nom de pays, le nom entre parenthèses (« Birmanie (Myanmar) » → Myanmar).
    function acceptedAnswers(text, ask) {
        var out = [];
        String(text == null ? '' : text).split(';').forEach(function (part) {
            var m = part.match(/^\s*([^()]*?)\s*(?:\((.*)\))?\s*$/);
            var base = (m ? m[1] : part).trim();
            if (base) out.push(base);
            if (ask === 'name' && m && m[2]) out.push(m[2].trim());
        });
        return out;
    }

    // Pour comparer : sans accents, sans majuscules, sans espaces ni tirets ni apostrophes, sans article au début (« la Gambie »).
    function compact(text) {
        return normalize(text).replace(/^(le|la|les|l) /, '').replace(/ /g, '');
    }

    function editDistance(a, b) {
        var prev = [];
        var i, j;
        for (j = 0; j <= b.length; j++) prev[j] = j;
        for (i = 1; i <= a.length; i++) {
            var row = [i];
            for (j = 1; j <= b.length; j++) {
                row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            }
            prev = row;
        }
        return prev[b.length];
    }

    // La saisie est-elle une des réponses acceptées ? Une faute de frappe est tolérée sur les mots d'au moins 5 lettres (une lettre), et
    // 9 lettres (deux). Mais jamais au point de désigner un autre pays : `others` donne les réponses des autres pays, et une saisie
    // identique à l'une d'elles est refusée, une saisie proche des deux n'est acceptée que si elle est strictement plus proche de la
    // bonne réponse (Gambie / Zambie, Irlande / Islande, Kingston / Kingstown, Manama / Panama restent distincts).
    function isTypedCorrect(input, answers, others) {
        var x = compact(input);
        if (!x) return false;
        var ours = answers.map(compact).filter(Boolean);
        if (ours.indexOf(x) !== -1) return true;
        var best = Infinity;
        ours.forEach(function (y) {
            var tolerance = y.length >= 9 ? 2 : y.length >= 5 ? 1 : 0;
            if (tolerance === 0 || Math.abs(x.length - y.length) > tolerance) return;
            var d = editDistance(x, y);
            if (d <= tolerance && d < best) best = d;
        });
        if (best === Infinity) return false;
        var closest = Infinity;
        (others || []).forEach(function (other) {
            var z = compact(other);
            if (!z || Math.abs(x.length - z.length) > best) return;
            var d = editDistance(x, z);
            if (d < closest) closest = d;
        });
        return best < closest;
    }

    // Les réponses acceptées pour tous les autres pays : `isTypedCorrect` s'en sert pour ne jamais prendre un pays pour un autre.
    function otherAnswers(pool, targetId, ask) {
        var out = [];
        pool.forEach(function (c) {
            if (c.id !== targetId) out = out.concat(acceptedAnswers(answerOf(c, ask), ask));
        });
        return out;
    }

    function generateTypedQuestions(pool, opts) {
        var o = settings(opts);
        var out = [];
        targetList(pool, o).forEach(function (target) {
            if (out.length >= o.count) return;
            shuffle(['cap', 'name'], o.rng).some(function (ask) {
                var q = buildQuestion(target, pool, {
                    ask: ask, options: 2, maxClues: o.maxClues, difficulty: o.difficulty, rng: o.rng,
                    clues: ask === 'cap' ? ['name'] : CLUE_KEYS.filter(function (k) { return k !== 'name'; })
                });
                if (!q) return false;
                q.options = [];
                q.answer = answerOf(target, ask);
                q.answers = acceptedAnswers(q.answer, ask);
                out.push(q);
                return true;
            });
        });
        return out;
    }

    // --- « Pays mystère » ---------------------------------------------------------------------
    // Le joueur propose des pays ; chaque proposition donne la distance et la direction vers le pays mystère (centre à centre).
    var MYSTERY_TRIES = 6;
    var HALF_EARTH_KM = 20000;
    var ARROWS = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'];

    // Le cap, en degrés (0 = nord, 90 = est), de a vers b (points [lon, lat]).
    function bearingDeg(a, b) {
        var rad = Math.PI / 180;
        var dLon = (b[0] - a[0]) * rad;
        var y = Math.sin(dLon) * Math.cos(b[1] * rad);
        var x = Math.cos(a[1] * rad) * Math.sin(b[1] * rad) - Math.sin(a[1] * rad) * Math.cos(b[1] * rad) * Math.cos(dLon);
        return (Math.atan2(y, x) / rad + 360) % 360;
    }

    function arrowOf(deg) { return ARROWS[Math.round(deg / 45) % 8]; }

    // 100 % sur place, 0 % à l'opposé de la planète.
    function proximity(km) { return Math.max(0, Math.round(100 * (1 - km / HALF_EARTH_KM))); }

    // Le résultat d'une proposition : { correct, km, arrow, percent }. `guess` et `target` : des pays de l'Atlas (champs id et c).
    function mysteryGuess(target, guess) {
        if (guess.id === target.id) return { correct: true, km: 0, arrow: '🎯', percent: 100 };
        var km = distanceKm(guess.c, target.c);
        return { correct: false, km: Math.round(km), arrow: arrowOf(bearingDeg(guess.c, target.c)), percent: proximity(km) };
    }

    function generateMysteryQuestions(pool, opts) {
        var o = settings(opts);
        return targetList(pool, o).slice(0, o.count).map(function (c) {
            return { target: c.id, ask: 'mystery', clues: [], options: [] };
        });
    }

    // --- Voisins ---------------------------------------------------------------------------------
    // « Lequel de ces pays a une frontière terrestre avec X ? » : un voisin, et trois pays qui n'en sont ni voisins ni proches (à moins
    // de NEAR_DEGREES de ses contours, ce que les données appellent `nr`) : une frontière que le tracé simplifié aurait manquée
    // ne peut pas fausser la question. Les voisins viennent de assets/geo/countries-facts.json (`nb`), calculés sur les contours.
    // L'identifiant de la bonne réponse est dans `right` ; `target` est le pays dont on demande les voisins.
    function generateNeighborQuestions(pool, opts) {
        var o = settings(opts);
        var byId = {};
        pool.forEach(function (c) { byId[c.id] = c; });
        var out = [];
        targetList(pool, o).forEach(function (target) {
            if (out.length >= o.count) return;
            var friends = (target.nb || []).filter(function (id) { return byId[id]; });
            if (!friends.length) return;
            // Un vrai pays plutôt qu'un territoire ou une entité contestée, quand il y en a un.
            var plain = friends.filter(function (id) { return !byId[id].st; });
            var answer = byId[pick(plain.length ? plain : friends, o.rng)];
            var avoid = new Set((target.nb || []).concat(target.nr || []));
            avoid.add(target.id);
            var others = shuffle(pool.filter(function (c) { return !avoid.has(c.id); }), o.rng);
            if (o.difficulty === 'hard') {
                var rank = function (c) { return c.sub === target.sub ? 0 : c.cont === target.cont ? 1 : 2; };
                others.sort(function (a, b) { return rank(a) - rank(b); });
            }
            if (others.length < o.options - 1) return;
            var options = shuffle([answer].concat(others.slice(0, o.options - 1)), o.rng).map(function (c) { return { id: c.id, value: c.n }; });
            out.push({ target: target.id, right: answer.id, ask: 'neighbor', clues: [{ key: 'name', value: target.n }], options: options });
        });
        return out;
    }

    // --- Plus ou moins ---------------------------------------------------------------------------
    // Deux pays, lequel est le plus peuplé (au moins MIN_RATIO fois), ou le plus au nord (au moins NORTH_GAP degrés de latitude de
    // plus). `right` : l'identifiant du bon pays.
    var NORTH_GAP = 8;
    var MORE_ASKS = ['more_pop', 'more_north'];

    function moreWins(ask, a, b) {
        if (ask === 'more_pop') {
            if (!(a.pop > 0 && b.pop > 0) || Math.max(a.pop, b.pop) / Math.min(a.pop, b.pop) < MIN_RATIO) return null;
            return a.pop > b.pop ? a : b;
        }
        if (!a.c || !b.c || Math.abs(a.c[1] - b.c[1]) < NORTH_GAP) return null;
        return a.c[1] > b.c[1] ? a : b;
    }

    function generateMoreQuestions(pool, opts) {
        var o = settings(opts);
        var out = [];
        targetList(pool, o).forEach(function (target) {
            if (out.length >= o.count) return;
            var rivals = shuffle(pool.filter(function (c) { return c.id !== target.id; }), o.rng);
            // Plus dur : un rival de la même région.
            if (o.difficulty === 'hard') {
                var rank = function (c) { return c.sub === target.sub ? 0 : c.cont === target.cont ? 1 : 2; };
                rivals.sort(function (a, b) { return rank(a) - rank(b); });
            }
            var asks = shuffle(MORE_ASKS, o.rng);
            for (var i = 0; i < asks.length; i++) {
                var rival = null, winner = null;
                for (var k = 0; k < rivals.length && !winner; k++) {
                    winner = moreWins(asks[i], target, rivals[k]);
                    if (winner) rival = rivals[k];
                }
                if (!winner) continue;
                out.push({
                    target: target.id, right: winner.id, ask: asks[i], clues: [],
                    options: shuffle([target, rival], o.rng).map(function (c) { return { id: c.id, value: c.n }; })
                });
                break;
            }
        });
        return out;
    }

    // --- Chefs d'État ----------------------------------------------------------------------------
    // « Qui était chef de l'État de X en 1962 ? » Les listes viennent de js/stateLeadersCore.js (33 pays) : `leadersFrom` les
    // range par identifiant de pays. Une année n'est posée que si UN SEUL mandat la couvre (pas d'année de passation, pas de
    // deux chefs à la fois) ; les fausses réponses sont d'autres chefs du même pays, qui ne la couvrent pas.
    var LEADER_IDS = {
        france: 'FRA', etats_unis: 'USA', royaume_uni: 'GBR', allemagne: 'DEU', italie: 'ITA', espagne: 'ESP', belgique: 'BEL', pays_bas: 'NLD',
        suede: 'SWE', danemark: 'DNK', norvege: 'NOR', japon: 'JPN', inde: 'IND', bresil: 'BRA', mexique: 'MEX', argentine: 'ARG', canada: 'CAN',
        australie: 'AUS', turquie: 'TUR', egypte: 'EGY', israel: 'ISR', russie: 'RUS', chine: 'CHN', iran: 'IRN', ukraine: 'UKR', pologne: 'POL',
        coree_du_sud: 'KOR', afrique_du_sud: 'ZAF', nigeria: 'NGA', arabie_saoudite: 'SAU', indonesie: 'IDN', pakistan: 'PAK', algerie: 'DZA'
    };
    var LEADER_FROM_YEAR = 1900;

    // Les mandats de chaque pays : { FRA: [{ from, to, name }], ... }, sans les mandats sans fin ni nom exploitables.
    function leadersFrom(stateLeaders) {
        var out = {};
        Object.keys(LEADER_IDS).forEach(function (key) {
            var rows = stateLeaders.rowsOf(key, 'state').map(function (r) { return { from: r.row.from, to: r.row.to, name: r.row.name }; });
            if (rows.length) out[LEADER_IDS[key]] = rows;
        });
        return out;
    }

    function leaderQuestion(country, rows, year, nowYear, o) {
        var covers = function (r, y) { return r.from <= y && y <= (r.to == null ? nowYear : r.to); };
        var holders = rows.filter(function (r) { return covers(r, year); });
        if (holders.length !== 1) return null;
        var answer = holders[0].name;
        var names = [];
        rows.forEach(function (r) { if (r.name !== answer && !covers(r, year) && names.indexOf(r.name) === -1) names.push(r.name); });
        // Plus dur : des chefs d'une époque proche.
        if (o.difficulty === 'hard') names.sort(function (a, b) { return gap(rows, a, year) - gap(rows, b, year); });
        else names = shuffle(names, o.rng);
        if (names.length < o.options - 1) return null;
        var options = shuffle([answer].concat(names.slice(0, o.options - 1)), o.rng).map(function (n) { return { id: n, value: n }; });
        return { target: 'LDR:' + country.id + ':' + year, country: country.id, right: answer, ask: 'leader',
            clues: [{ key: 'name', value: country.n }, { key: 'year', value: String(year) }], options: options };
    }

    // L'écart en années entre `year` et le mandat de `name` (le plus proche s'il en a plusieurs).
    function gap(rows, name, year) {
        return Math.min.apply(null, rows.filter(function (r) { return r.name === name; }).map(function (r) {
            return year < r.from ? r.from - year : r.to != null && year > r.to ? year - r.to : 0;
        }));
    }

    function generateLeaderQuestions(pool, opts) {
        var o = settings(opts);
        var leaders = o.leaders || {};
        var nowYear = o.year || new Date().getFullYear();
        var out = [];
        var seen = new Set();
        var targets = targetList(pool, o).filter(function (c) { return leaders[c.id]; });
        // Plusieurs tours : un pays peut être interrogé plusieurs fois, sur des années différentes.
        for (var round = 0; round < 4 && out.length < o.count && targets.length; round++) {
            targets.forEach(function (country) {
                if (out.length >= o.count) return;
                var rows = leaders[country.id];
                var first = Math.max(LEADER_FROM_YEAR, Math.min.apply(null, rows.map(function (r) { return r.from; })));
                for (var attempt = 0; attempt < 14; attempt++) {
                    var year = first + Math.floor(o.rng() * (nowYear - first + 1));
                    var q = leaderQuestion(country, rows, year, nowYear, o);
                    if (q && !seen.has(q.target)) { seen.add(q.target); out.push(q); break; }
                }
            });
        }
        return out;
    }

    return {
        LOCATE_TINY_KM: LOCATE_TINY_KM, distanceKm: distanceKm, locateCorrect: locateCorrect, generateLocateQuestions: generateLocateQuestions,
        CLUE_KEYS: CLUE_KEYS, ASK_KEYS: ASK_KEYS, MIN_RATIO: MIN_RATIO,
        normalize: normalize, namesCountry: namesCountry, nationalDay: nationalDay, clueValues: clueValues, answerOf: answerOf,
        playablePool: playablePool, matching: matching, isUnambiguous: isUnambiguous,
        buildQuestion: buildQuestion, generateQuestions: generateQuestions, isValid: isValid,
        generateMapNameQuestions: generateMapNameQuestions, generateFeteQuestions: generateFeteQuestions, generateWhoQuestions: generateWhoQuestions,
        generateTypedQuestions: generateTypedQuestions, generateMysteryQuestions: generateMysteryQuestions, WHO_KEYS: WHO_KEYS,
        acceptedAnswers: acceptedAnswers, isTypedCorrect: isTypedCorrect, otherAnswers: otherAnswers, compact: compact, editDistance: editDistance,
        generateNeighborQuestions: generateNeighborQuestions, generateMoreQuestions: generateMoreQuestions, generateLeaderQuestions: generateLeaderQuestions,
        leadersFrom: leadersFrom, LEADER_IDS: LEADER_IDS, NORTH_GAP: NORTH_GAP, MORE_ASKS: MORE_ASKS,
        MYSTERY_TRIES: MYSTERY_TRIES, bearingDeg: bearingDeg, arrowOf: arrowOf, proximity: proximity, mysteryGuess: mysteryGuess
    };
});
