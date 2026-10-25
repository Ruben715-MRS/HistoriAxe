// =========================================================================
// === HISTORIAXE — QUIZ DES PAYS : PARTIES (réglages, tirage, mélange, points, records) ===
// =========================================================================
//
// Ce module décide ce qu'est UNE PARTIE du quiz des pays ; js/geoQuizCore.js fabrique chaque question, js/modes/geoquiz.js l'affiche.
// Pur, sans DOM : il se teste (tests/geoQuizSessionCore.test.js).
//
//   - LES RÉGLAGES (prefs) : la zone (monde ou un continent), la difficulté, le nombre de questions et le chrono. Le chrono vaut 0
//     (« sans chrono ») par défaut : c'est d'abord un entraînement.
//   - LA DIFFICULTÉ ne change pas le genre de question mais le jeu de pays : facile = les 40 pays les plus peuplés de la zone, moyen = 80,
//     difficile = tous, avec des fausses réponses de la même région. La population sert de mesure de notoriété.
//   - LE JEU DE PAYS comprend les territoires et les entités contestées (Taïwan, Kosovo, Hong Kong…), sauf la Palestine, que le quiz exclut.
//   - LA PARTIE : une forme (QCM, drapeau, carte) ou « panaché », qui les mélange. Chaque question porte sa forme (`kind`). En panaché,
//     un pays n'est demandé qu'une fois et la même forme ne revient pas plus de deux fois de suite.
//   - LES POINTS : 100 par bonne réponse, + 10 par bonne réponse de suite déjà obtenue (jusqu'à + 50), + jusqu'à 50 pour la vitesse
//     avec un chrono. Une mauvaise réponse ou un temps écoulé vaut 0 et coupe la série.
//   - LES RECORDS : le meilleur score de chaque réglage, et les 50 dernières parties. L'état se fusionne entre deux appareils d'un même
//     compte (js/storage.js : mergeGeoQuiz).

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory(require('./geoQuizCore.js'));
    } else {
        root.GeoQuizSessionCore = factory(root.GeoQuizCore);
    }
})(typeof self !== 'undefined' ? self : this, function (Q) {
    'use strict';

    // Les pays que le quiz n'interroge jamais, même avec les territoires et les entités contestées : la Palestine.
    var EXCLUDED_IDS = ['PSX'];

    var ZONES = [
        { key: 'world', continent: null },
        { key: 'africa', continent: 'Afrique' },
        { key: 'north_america', continent: 'Amérique du Nord' },
        { key: 'south_america', continent: 'Amérique du Sud' },
        { key: 'asia', continent: 'Asie' },
        { key: 'europe', continent: 'Europe' },
        { key: 'oceania', continent: 'Océanie' }
    ];

    // size : combien de pays (les plus peuplés de la zone) ; distractors : les fausses réponses de la même région ('hard') ou au hasard ('easy').
    var LEVELS = {
        easy: { size: 40, distractors: 'easy' },
        medium: { size: 80, distractors: 'easy' },
        hard: { size: Infinity, distractors: 'hard' }
    };

    var LENGTHS = [5, 10, 20, 50];
    var TIMERS = [0, 30, 15];          // secondes par question ; 0 = sans chrono
    var FORMS = ['qcm', 'flag', 'map', 'mix'];
    var QUESTION_KINDS = ['qcm', 'flag', 'map'];
    var DEFAULT_PREFS = { zone: 'world', level: 'easy', length: 10, timer: 0 };

    var BASE_POINTS = 100;
    var STREAK_STEP = 10;
    var STREAK_MAX = 5;
    var SPEED_MAX = 50;
    var HISTORY_MAX = 50;
    // La même forme ne revient pas plus de deux fois de suite dans un panaché.
    var MAX_SAME_IN_A_ROW = 2;

    function zoneOf(key) {
        for (var i = 0; i < ZONES.length; i++) if (ZONES[i].key === key) return ZONES[i];
        return ZONES[0];
    }

    // Les réglages tels qu'on peut les lire dans le stockage : toute valeur inconnue revient à la valeur par défaut.
    function normalizePrefs(raw) {
        var src = raw && typeof raw === 'object' ? raw : {};
        return {
            zone: ZONES.some(function (z) { return z.key === src.zone; }) ? src.zone : DEFAULT_PREFS.zone,
            level: LEVELS[src.level] ? src.level : DEFAULT_PREFS.level,
            length: LENGTHS.indexOf(src.length) !== -1 ? src.length : DEFAULT_PREFS.length,
            timer: TIMERS.indexOf(src.timer) !== -1 ? src.timer : DEFAULT_PREFS.timer
        };
    }

    // Le jeu de pays d'une partie : les pays jouables de la zone, les plus peuplés d'abord, limités selon la difficulté.
    function quizPool(facts, prefs) {
        var p = normalizePrefs(prefs);
        var zone = zoneOf(p.zone);
        var all = Q.playablePool(facts, { includeSpecial: true }).filter(function (c) {
            return EXCLUDED_IDS.indexOf(c.id) === -1 && (!zone.continent || c.cont === zone.continent);
        });
        all.sort(function (a, b) { return b.pop - a.pop || (a.id < b.id ? -1 : 1); });
        var size = LEVELS[p.level].size;
        return size >= all.length ? all : all.slice(0, size);
    }

    function shuffle(list, rng) {
        var a = list.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    // `count` questions d'une forme, sur des pays que `taken` ne contient pas encore.
    function questionsOfKind(kind, pool, prefs, count, taken, rng) {
        if (count <= 0) return [];
        var level = LEVELS[prefs.level];
        // On en tire plus qu'il n'en faut : certaines tombent sur un pays déjà pris par une autre forme.
        var wanted = count + taken.size + 4;
        var made;
        if (kind === 'map') {
            made = Q.generateLocateQuestions(pool, { count: wanted, rng: rng });
        } else if (kind === 'flag') {
            made = Q.generateQuestions(pool, { count: wanted, asks: ['name'], clues: ['flag'], difficulty: level.distractors, rng: rng });
        } else {
            made = Q.generateQuestions(pool, { count: wanted, difficulty: level.distractors, rng: rng });
        }
        var out = [];
        made.forEach(function (q) {
            if (out.length >= count || taken.has(q.target)) return;
            taken.add(q.target);
            q.kind = kind;
            out.push(q);
        });
        return out;
    }

    // Répartit `n` questions entre les formes, le plus également possible, le reste étant tiré au hasard.
    function splitCounts(n, kinds, rng) {
        var base = Math.floor(n / kinds.length);
        var counts = kinds.map(function () { return base; });
        shuffle(kinds.map(function (_, i) { return i; }), rng).slice(0, n - base * kinds.length).forEach(function (i) { counts[i]++; });
        return counts;
    }

    // Le nombre d'endroits où la même forme revient plus de MAX_SAME_IN_A_ROW fois de suite.
    function runViolations(list) {
        var n = 0;
        for (var i = MAX_SAME_IN_A_ROW; i < list.length; i++) {
            var same = true;
            for (var k = 1; k <= MAX_SAME_IN_A_ROW && same; k++) same = list[i - k].kind === list[i].kind;
            if (same) n++;
        }
        return n;
    }

    // Mélange les questions, puis répare l'ordre par échanges tant qu'une même forme revient trop de fois de suite (si c'est possible :
    // une seule forme restante ne peut pas être répartie).
    function interleave(questions, rng) {
        var list = shuffle(questions, rng);
        var violations = runViolations(list);
        for (var pass = 0; pass < list.length * 4 && violations > 0; pass++) {
            var improved = false;
            for (var i = 0; i < list.length && !improved; i++) {
                for (var j = 0; j < list.length && !improved; j++) {
                    if (i === j || list[i].kind === list[j].kind) continue;
                    var swapped = list.slice();
                    swapped[i] = list[j];
                    swapped[j] = list[i];
                    var after = runViolations(swapped);
                    if (after < violations) { list = swapped; violations = after; improved = true; }
                }
            }
            if (!improved) break;
        }
        return list;
    }

    // Une partie : { questions, poolSize }. `form` : 'qcm' | 'flag' | 'map' | 'mix'. `opts.kinds` : les formes permises en panaché
    // (par défaut toutes ; la carte peut manquer si WebGL est indisponible). `opts.rng` : générateur aléatoire (les tests le fixent).
    function generateGame(facts, form, prefs, opts) {
        var p = normalizePrefs(prefs);
        var rng = (opts && opts.rng) || Math.random;
        var pool = quizPool(facts, p);
        var count = Math.min(p.length, pool.length);
        var taken = new Set();
        var questions;
        if (form === 'mix') {
            var allowed = (opts && opts.kinds ? opts.kinds : QUESTION_KINDS).filter(function (k) { return QUESTION_KINDS.indexOf(k) !== -1; });
            if (!allowed.length) allowed = ['qcm'];
            var counts = splitCounts(count, allowed, rng);
            questions = [];
            allowed.forEach(function (kind, i) { questions = questions.concat(questionsOfKind(kind, pool, p, counts[i], taken, rng)); });
            // Si une forme n'a pas pu fournir ses questions, le QCM comble le manque.
            if (questions.length < count) questions = questions.concat(questionsOfKind('qcm', pool, p, count - questions.length, taken, rng));
            questions = interleave(questions, rng);
        } else {
            questions = questionsOfKind(QUESTION_KINDS.indexOf(form) === -1 ? 'qcm' : form, pool, p, count, taken, rng);
        }
        return { questions: questions, poolSize: pool.length };
    }

    // --- Les points ---------------------------------------------------------------------------------

    // Les points d'une réponse. `streak` : les bonnes réponses de suite avant celle-ci. `remaining` : la part du temps restante (0 à 1),
    // ou null sans chrono.
    function pointsFor(correct, streak, remaining) {
        if (!correct) return 0;
        var bonus = Math.min(Math.max(streak || 0, 0), STREAK_MAX) * STREAK_STEP;
        var speed = remaining == null ? 0 : Math.round(SPEED_MAX * Math.min(Math.max(remaining, 0), 1));
        return BASE_POINTS + bonus + speed;
    }

    // Le bilan d'une partie à partir de ses réponses : [{ ok, points }].
    function summarize(answers) {
        var s = { score: 0, correct: 0, total: answers.length, bestStreak: 0 };
        var run = 0;
        answers.forEach(function (a) {
            s.score += a.points || 0;
            if (a.ok) { s.correct++; run++; s.bestStreak = Math.max(s.bestStreak, run); } else { run = 0; }
        });
        return s;
    }

    // --- Les records et l'historique ---------------------------------------------------------------

    // La clé d'un réglage dans les records : la forme et les réglages qui changent la difficulté.
    function configKey(form, prefs) {
        var p = normalizePrefs(prefs);
        return [form, p.zone, p.level, p.length, p.timer].join('|');
    }

    function emptyState() { return { v: 1, best: {}, history: [] }; }

    // L'état des records tel qu'on peut le lire dans le stockage (ou après une fusion) : jamais d'erreur, jamais de valeur absurde.
    function normalizeState(raw) {
        var out = emptyState();
        if (!raw || typeof raw !== 'object') return out;
        if (raw.best && typeof raw.best === 'object' && !Array.isArray(raw.best)) {
            Object.keys(raw.best).forEach(function (k) {
                var b = raw.best[k];
                if (b && typeof b.score === 'number' && isFinite(b.score) && b.score >= 0) {
                    out.best[k] = { score: Math.round(b.score), correct: Math.max(0, b.correct | 0), total: Math.max(0, b.total | 0), at: typeof b.at === 'number' ? b.at : 0 };
                }
            });
        }
        if (Array.isArray(raw.history)) {
            out.history = raw.history.filter(function (g) {
                return g && typeof g.at === 'number' && typeof g.score === 'number' && typeof g.form === 'string';
            }).slice(0, HISTORY_MAX);
        }
        return out;
    }

    // Enregistre une partie terminée. `game` : { at, form, zone, level, length, timer, score, correct, total, bestStreak }.
    // Renvoie { state, isRecord, previous } : le nouvel état, si ce score bat le record du réglage, et l'ancien meilleur (ou null).
    function recordGame(state, game) {
        var next = normalizeState(state);
        var key = configKey(game.form, game);
        var previous = next.best[key] || null;
        var isRecord = game.score > 0 && (!previous || game.score > previous.score);
        if (isRecord) next.best[key] = { score: game.score, correct: game.correct, total: game.total, at: game.at };
        next.history.unshift({
            at: game.at, form: game.form, zone: game.zone, level: game.level, length: game.length, timer: game.timer,
            score: game.score, correct: game.correct, total: game.total
        });
        next.history = next.history.slice(0, HISTORY_MAX);
        return { state: next, isRecord: isRecord, previous: previous };
    }

    // Les records à afficher : du plus haut au plus bas score.
    function bestList(state) {
        var s = normalizeState(state);
        return Object.keys(s.best).map(function (k) {
            var parts = k.split('|');
            return { key: k, form: parts[0], zone: parts[1], level: parts[2], length: Number(parts[3]), timer: Number(parts[4]), score: s.best[k].score, correct: s.best[k].correct, total: s.best[k].total, at: s.best[k].at };
        }).sort(function (a, b) { return b.score - a.score || b.at - a.at; });
    }

    return {
        EXCLUDED_IDS: EXCLUDED_IDS, ZONES: ZONES, LEVELS: LEVELS, LENGTHS: LENGTHS, TIMERS: TIMERS, FORMS: FORMS, QUESTION_KINDS: QUESTION_KINDS,
        DEFAULT_PREFS: DEFAULT_PREFS, BASE_POINTS: BASE_POINTS, SPEED_MAX: SPEED_MAX, HISTORY_MAX: HISTORY_MAX,
        normalizePrefs: normalizePrefs, quizPool: quizPool, generateGame: generateGame, pointsFor: pointsFor, summarize: summarize,
        configKey: configKey, emptyState: emptyState, normalizeState: normalizeState, recordGame: recordGame, bestList: bestList
    };
});
