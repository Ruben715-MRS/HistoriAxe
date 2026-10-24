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

    // Les valeurs qu'un pays présente pour un indice : une seule, sauf pour les langues (« néerlandais, papiamento »).
    function clueValues(country, key) {
        if (key === 'lang') {
            return String(country.lang || '').split(',').map(function (l) { return l.trim(); }).filter(known);
        }
        var value = key === 'name' ? country.n : key === 'fete' ? nationalDay(country) : known(country[key]);
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

    function settings(opts) {
        var src = opts || {};
        var o = { rng: src.rng || Math.random, ask: src.ask, asks: src.asks };
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
        var keys = shuffle(CLUE_KEYS.filter(function (k) { return k !== o.ask; }), o.rng);
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
        var targets = shuffle(pool, o.rng);
        for (var i = 0; i < targets.length && questions.length < o.count; i++) {
            var order = shuffle(asks, o.rng);
            for (var j = 0; j < order.length; j++) {
                var question = buildQuestion(targets[i], pool, { ask: order[j], options: o.options, maxClues: o.maxClues, difficulty: o.difficulty, rng: o.rng });
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

    return {
        CLUE_KEYS: CLUE_KEYS, ASK_KEYS: ASK_KEYS, MIN_RATIO: MIN_RATIO,
        normalize: normalize, namesCountry: namesCountry, nationalDay: nationalDay, clueValues: clueValues, answerOf: answerOf,
        playablePool: playablePool, matching: matching, isUnambiguous: isUnambiguous,
        buildQuestion: buildQuestion, generateQuestions: generateQuestions, isValid: isValid
    };
});
