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
//   - LA MAÎTRISE : chaque réponse alimente le suivi du pays interrogé (combien de fois vu, réussi, et les cinq dernières réponses). Un pays
//     est « maîtrisé » quand ses dernières réponses sont presque toutes justes, « à revoir » quand la dernière est fausse ou que moins de la
//     moitié sont justes, « en cours » entre les deux, « nouveau » tant qu'on ne l'a jamais rencontré. « Réviser mes pays faibles » tire
//     d'abord les pays à revoir, puis les pays en cours (les plus anciens d'abord), puis les nouveaux.
//   - LE DÉFI DU JOUR : les mêmes dix questions pour tous (tirage fixé par la date), une seule partie compte par jour ; la série compte
//     les jours de suite.

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

    // Les zones : le monde, ou un ou plusieurs continents (les Amériques sont une seule zone, assez peuplée pour une partie).
    var ZONES = [
        { key: 'world', continents: null },
        { key: 'africa', continents: ['Afrique'] },
        { key: 'americas', continents: ['Amérique du Nord', 'Amérique du Sud'] },
        { key: 'asia', continents: ['Asie'] },
        { key: 'europe', continents: ['Europe'] },
        { key: 'oceania', continents: ['Océanie'] }
    ];
    // Les anciennes zones séparées (Amérique du Nord, Amérique du Sud) rejoignent les Amériques dans les réglages enregistrés.
    var ZONE_ALIASES = { north_america: 'americas', south_america: 'americas' };

    // share : la part des pays de la zone (les plus peuplés d'abord) ; distractors : les fausses réponses de la même région ('hard')
    // ou au hasard ('easy'). Une zone très petite garde au moins MIN_POOL pays, sans quoi quatre propositions ne se départagent plus.
    var LEVELS = {
        easy: { share: 0.2, distractors: 'easy' },
        medium: { share: 0.35, distractors: 'easy' },
        hard: { share: 0.5, distractors: 'hard' }
    };
    var MIN_POOL = 6;

    var LENGTHS = [5, 10, 20, 50];
    var TIMERS = [0, 30, 15];          // secondes par question ; 0 = sans chrono
    // Les formes de jeu. Chaque question porte sa forme (`kind`) ; le panaché les mélange, « Rafale » et « Survie » changent la règle
    // de la partie (60 secondes pour tout, ou trois vies) et piochent dans les formes rapides.
    var FORMS = ['qcm', 'flag', 'map', 'mapname', 'typed', 'fete', 'who', 'mystery', 'burst', 'survival', 'mix', 'weak', 'daily', 'neighbor', 'more', 'leader', 'duel'];
    var QUESTION_KINDS = ['qcm', 'flag', 'map', 'mapname', 'typed', 'fete', 'who', 'mystery', 'neighbor', 'more', 'leader'];
    var MIX_KINDS = ['qcm', 'flag', 'map', 'mapname', 'typed', 'fete', 'who', 'neighbor', 'more'];
    // Ce que le suivi par pays retient : les formes qui demandent de connaître le pays lui-même (pas « plus ou moins », ni les chefs d'État).
    var TRACKED_KINDS = ['qcm', 'flag', 'map', 'mapname', 'typed', 'fete', 'who', 'mystery', 'neighbor'];
    var BURST_KINDS = ['qcm', 'flag'];
    var SURVIVAL_KINDS = ['qcm', 'flag', 'map', 'mapname', 'fete', 'who', 'neighbor'];
    var MAP_KINDS = ['map', 'mapname'];  // les formes qui ont besoin de la carte (WebGL)
    var BURST_SECONDS = 60;
    var LIVES = 3;
    var BURST_MAX_QUESTIONS = 80;
    var SURVIVAL_MAX_QUESTIONS = 120;
    var DEFAULT_PREFS = { zone: 'world', level: 'easy', length: 10, timer: 0 };
    // Le défi du jour ne se règle pas : le même pour tout le monde.
    var DAILY_PREFS = { zone: 'world', level: 'medium', length: 10, timer: 0 };
    var RUN_MAX = 5;                  // les dernières réponses gardées par pays
    var DAILY_MAX = 60;               // les jours gardés dans l'état

    var BASE_POINTS = 100;
    var WHO_CLUE_BONUS = 20;          // par indice resté caché dans « Qui suis-je ? »
    var MYSTERY_TRY_BONUS = 20;       // par essai resté dans « Pays mystère »
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

    // Tous les pays jouables d'une zone, les plus peuplés d'abord (sans limite de difficulté).
    function zoneCountries(facts, key) {
        var zone = zoneOf(key);
        var all = Q.playablePool(facts, { includeSpecial: true }).filter(function (c) {
            return EXCLUDED_IDS.indexOf(c.id) === -1 && (!zone.continents || zone.continents.indexOf(c.cont) !== -1);
        });
        all.sort(function (a, b) { return b.pop - a.pop || (a.id < b.id ? -1 : 1); });
        return all;
    }

    // Combien de pays une difficulté garde dans une zone de `total` pays : sa part, avec au moins MIN_POOL (ou tous, si la zone est plus petite).
    function poolSize(level, total) {
        return Math.min(total, Math.max(MIN_POOL, Math.round(LEVELS[level].share * total)));
    }

    // Pour l'écran : la taille du jeu, la part demandée et si le minimum s'applique.
    function levelInfo(facts, prefs) {
        var p = normalizePrefs(prefs);
        var total = zoneCountries(facts, p.zone).length;
        var size = poolSize(p.level, total);
        return { size: size, total: total, share: LEVELS[p.level].share, floored: size > Math.round(LEVELS[p.level].share * total) };
    }

    // Les réglages tels qu'on peut les lire dans le stockage : toute valeur inconnue revient à la valeur par défaut.
    function normalizePrefs(raw) {
        var src = raw && typeof raw === 'object' ? raw : {};
        return {
            zone: ZONES.some(function (z) { return z.key === (ZONE_ALIASES[src.zone] || src.zone); }) ? (ZONE_ALIASES[src.zone] || src.zone) : DEFAULT_PREFS.zone,
            level: LEVELS[src.level] ? src.level : DEFAULT_PREFS.level,
            length: LENGTHS.indexOf(src.length) !== -1 ? src.length : DEFAULT_PREFS.length,
            timer: TIMERS.indexOf(src.timer) !== -1 ? src.timer : DEFAULT_PREFS.timer
        };
    }

    // Le jeu de pays d'une partie : les pays jouables de la zone, les plus peuplés d'abord, limités selon la difficulté.
    function quizPool(facts, prefs) {
        var p = normalizePrefs(prefs);
        var all = zoneCountries(facts, p.zone);
        return all.slice(0, poolSize(p.level, all.length));
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
    function questionsOfKind(kind, pool, prefs, count, taken, rng, targets, leaders) {
        if (count <= 0) return [];
        var level = LEVELS[prefs.level];
        // On en tire plus qu'il n'en faut : certaines tombent sur un pays déjà pris par une autre forme.
        var wanted = count + taken.size + 4;
        var made;
        var o = { count: wanted, difficulty: level.distractors, rng: rng, targets: targets, leaders: leaders };
        if (kind === 'map') {
            made = Q.generateLocateQuestions(pool, o);
        } else if (kind === 'flag') {
            made = Q.generateQuestions(pool, { count: wanted, asks: ['name'], clues: ['flag'], difficulty: level.distractors, rng: rng, targets: targets });
        } else if (kind === 'mapname') {
            made = Q.generateMapNameQuestions(pool, o);
        } else if (kind === 'typed') {
            made = Q.generateTypedQuestions(pool, o);
        } else if (kind === 'fete') {
            made = Q.generateFeteQuestions(pool, o);
        } else if (kind === 'who') {
            made = Q.generateWhoQuestions(pool, o);
        } else if (kind === 'mystery') {
            made = Q.generateMysteryQuestions(pool, o);
        } else if (kind === 'neighbor') {
            made = Q.generateNeighborQuestions(pool, o);
        } else if (kind === 'more') {
            made = Q.generateMoreQuestions(pool, o);
        } else if (kind === 'leader') {
            made = Q.generateLeaderQuestions(pool, o);
        } else {
            made = Q.generateQuestions(pool, o);
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

    // La règle d'une partie : 'burst' (60 secondes pour tout), 'survival' (trois vies) ou 'standard' (un nombre de questions).
    function rulesOf(form) {
        return form === 'burst' ? 'burst' : form === 'survival' ? 'survival' : 'standard';
    }

    // Le chrono par question d'une partie, en secondes (0 = aucun). Il ne s'applique ni à la Rafale (60 secondes pour tout), ni à la Survie,
    // ni au Pays mystère (six essais), ni à une partie de révision.
    function questionTimer(form, prefs, review) {
        if (review || form === 'mystery' || form === 'weak' || form === 'daily' || rulesOf(form) !== 'standard') return 0;
        return normalizePrefs(prefs).timer;
    }

    // Les formes de question d'une partie : toutes celles permises par `allowed` (par défaut toutes) dans ce que la forme comprend.
    function kindsOf(form, allowed) {
        var base = form === 'weak' ? MIX_KINDS.filter(function (k) { return k !== 'more'; }) : form === 'mix' || form === 'daily' || form === 'duel' ? MIX_KINDS : form === 'burst' ? BURST_KINDS : form === 'survival' ? SURVIVAL_KINDS : [form];
        var kinds = allowed ? base.filter(function (k) { return allowed.indexOf(k) !== -1; }) : base.slice();
        return kinds.length ? kinds : ['qcm'];
    }

    // Une partie : { questions, poolSize }. `form` : une des FORMS. `opts.kinds` : les formes de question permises en panaché, Rafale et
    // Survie (sans carte, on retire `map` et `mapname`). `opts.rng` : générateur aléatoire (les tests le fixent).
    function generateGame(facts, form, prefs, opts) {
        var p = form === 'daily' ? normalizePrefs(DAILY_PREFS) : normalizePrefs(prefs);
        var rng = (opts && opts.rng) || Math.random;
        // Les pays à revoir se cherchent dans toute la zone, quelle que soit la difficulté réglée.
        var pool = form === 'weak' ? zoneCountries(facts, p.zone) : quizPool(facts, p);
        var rules = rulesOf(form);
        var wanted = rules === 'burst' ? BURST_MAX_QUESTIONS : rules === 'survival' ? SURVIVAL_MAX_QUESTIONS : p.length;
        var count = Math.min(form === 'duel' ? 2 * wanted : wanted, pool.length);
        var leaders = opts && opts.leaders;
        var targets = form === 'weak' ? weakTargets(opts && opts.state, pool, count) : null;
        var taken = new Set();
        var kinds = kindsOf(form, opts && opts.kinds);
        var counts = splitCounts(count, kinds, rng);
        var questions = [];
        kinds.forEach(function (kind, i) { questions = questions.concat(questionsOfKind(kind, pool, p, counts[i], taken, rng, targets, leaders)); });
        // Si une forme n'a pas pu fournir ses questions, le QCM comble le manque.
        if (questions.length < count && !(kinds.length === 1 && kinds[0] === 'qcm')) {
            questions = questions.concat(questionsOfKind('qcm', pool, p, count - questions.length, taken, rng, targets));
        }
        if (kinds.length > 1) questions = interleave(questions, rng);
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

    // « Qui suis-je ? » : les points d'une bonne réponse, plus un bonus pour chaque indice resté caché (`shown` indices montrés sur `total`).
    function whoPoints(correct, shown, total, streak, remaining) {
        if (!correct) return 0;
        return pointsFor(true, streak, remaining) + Math.max(0, total - shown) * WHO_CLUE_BONUS;
    }

    // « Pays mystère » : les points d'une bonne réponse trouvée à l'essai `tryNo` sur `maxTries`, plus un bonus pour chaque essai resté.
    function mysteryPoints(correct, tryNo, maxTries, streak) {
        if (!correct) return 0;
        return pointsFor(true, streak, null) + Math.max(0, maxTries - tryNo) * MYSTERY_TRY_BONUS;
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
    // Rafale et Survie n'ont ni longueur ni chrono réglables, le Pays mystère n'a pas de chrono : ces réglages ne changent pas leur clé.
    function configKey(form, prefs) {
        var p = normalizePrefs(prefs);
        var rules = rulesOf(form);
        var length = rules === 'standard' ? p.length : 0;
        var timer = questionTimer(form, p, false);
        return [form, p.zone, p.level, length, timer].join('|');
    }

    function emptyState() { return { v: 1, best: {}, history: [], countries: {}, daily: {}, forms: {} }; }

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
        if (raw.countries && typeof raw.countries === 'object' && !Array.isArray(raw.countries)) {
            Object.keys(raw.countries).forEach(function (id) {
                var c = raw.countries[id];
                if (!c || typeof c !== 'object') return;
                var n = Math.max(0, c.n | 0);
                var run = typeof c.run === 'string' ? c.run.replace(/[^01]/g, '').slice(-RUN_MAX) : '';
                if (n > 0 && run) out.countries[id] = { n: n, ok: Math.min(n, Math.max(0, c.ok | 0)), last: typeof c.last === 'number' ? c.last : 0, run: run };
            });
        }
        if (raw.forms && typeof raw.forms === 'object' && !Array.isArray(raw.forms)) {
            Object.keys(raw.forms).forEach(function (f) {
                out.forms[f] = normalizeFormStats(raw.forms[f]);
            });
        }
        if (raw.daily && typeof raw.daily === 'object' && !Array.isArray(raw.daily)) {
            Object.keys(raw.daily).filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); }).sort().slice(-DAILY_MAX).forEach(function (d) {
                var g = raw.daily[d];
                if (g && typeof g.score === 'number' && isFinite(g.score) && g.score >= 0) {
                    out.daily[d] = { score: Math.round(g.score), correct: Math.max(0, g.correct | 0), total: Math.max(0, g.total | 0) };
                }
            });
        }
        return out;
    }

    // Les compteurs d'une forme : parties, bonnes réponses sur le total, meilleur score, plus longue série. Jamais tronqués.
    function normalizeFormStats(f) {
        var n = function (v) { return typeof v === 'number' && isFinite(v) && v > 0 ? Math.floor(v) : 0; };
        var src = f && typeof f === 'object' ? f : {};
        return { games: n(src.games), correct: n(src.correct), total: n(src.total), best: n(src.best), streak: n(src.streak) };
    }

    // Ajoute une partie aux compteurs de sa forme.
    function addFormStats(forms, form, game) {
        var f = normalizeFormStats(forms[form]);
        forms[form] = {
            games: f.games + 1,
            correct: f.correct + (game.correct | 0),
            total: f.total + (game.total | 0),
            best: Math.max(f.best, Math.round(game.score) || 0),
            streak: Math.max(f.streak, game.bestStreak | 0)
        };
    }

    // Les statistiques à montrer : totaux, pourcentage de réussite, et une ligne par forme (les plus jouées d'abord).
    function statsOf(state) {
        var s = normalizeState(state);
        var pct = function (c, t) { return t > 0 ? Math.round(100 * c / t) : null; };
        var totals = { games: 0, correct: 0, total: 0, streak: 0 };
        var forms = Object.keys(s.forms).map(function (form) {
            var f = s.forms[form];
            totals.games += f.games; totals.correct += f.correct; totals.total += f.total; totals.streak = Math.max(totals.streak, f.streak);
            return { form: form, games: f.games, pct: pct(f.correct, f.total), best: f.best, streak: f.streak };
        }).filter(function (f) { return f.games > 0; }).sort(function (a, b) { return b.games - a.games || (a.form < b.form ? -1 : 1); });
        return { games: totals.games, pct: pct(totals.correct, totals.total), streak: totals.streak, forms: forms };
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
        addFormStats(next.forms, game.form, game);
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


    // --- La maîtrise des pays ----------------------------------------------------------------------

    // Note la réponse donnée sur un pays : une fois de plus vu, réussi ou non, et ses RUN_MAX dernières réponses.
    function trackAnswer(state, id, ok, now) {
        var next = normalizeState(state);
        var c = next.countries[id] || { n: 0, ok: 0, last: 0, run: '' };
        next.countries[id] = {
            n: c.n + 1, ok: c.ok + (ok ? 1 : 0), last: typeof now === 'number' ? now : Date.now(),
            run: (c.run + (ok ? '1' : '0')).slice(-RUN_MAX)
        };
        return next;
    }

    // 'new' (jamais interrogé), 'weak' (à revoir), 'learning' (en cours) ou 'mastered' (maîtrisé).
    function masteryOf(entry) {
        if (!entry || !entry.run) return 'new';
        var right = entry.run.split('').filter(function (r) { return r === '1'; }).length;
        var share = right / entry.run.length;
        var lastOk = entry.run.charAt(entry.run.length - 1) === '1';
        if (!lastOk || share < 0.5) return 'weak';
        if (entry.run.length >= 3 && share >= 0.8) return 'mastered';
        return 'learning';
    }

    // Le nombre de pays de `pool` par niveau de maîtrise.
    function masteryCounts(state, pool) {
        var s = normalizeState(state);
        var out = { mastered: 0, learning: 0, weak: 0, new: 0, total: pool.length };
        pool.forEach(function (c) { out[masteryOf(s.countries[c.id])]++; });
        return out;
    }

    // Les `count` pays à réviser en premier : à revoir (les plus ratés, puis les plus anciens), en cours (les plus anciens), nouveaux,
    // puis maîtrisés (les plus anciens) pour compléter. Renvoie des identifiants de `pool`.
    function weakTargets(state, pool, count) {
        var s = normalizeState(state);
        var order = { weak: 0, learning: 1, new: 2, mastered: 3 };
        var share = function (e) { return e ? e.ok / e.n : 0; };
        var ranked = pool.map(function (c) {
            var e = s.countries[c.id];
            return { id: c.id, level: order[masteryOf(e)], share: share(e), last: e ? e.last : 0 };
        });
        ranked.sort(function (a, b) {
            return a.level - b.level || (a.level === 0 ? a.share - b.share : 0) || a.last - b.last || (a.id < b.id ? -1 : 1);
        });
        return ranked.slice(0, count).map(function (r) { return r.id; });
    }

    // --- Le défi du jour ---------------------------------------------------------------------------

    function previousDay(date) {
        var d = new Date(date + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() - 1);
        return d.toISOString().slice(0, 10);
    }

    // Les jours de suite où le défi a été fait, jusqu'à `today` (ou jusqu'à la veille si aujourd'hui n'est pas encore fait).
    function dailyStreak(state, today) {
        var s = normalizeState(state);
        var day = s.daily[today] ? today : previousDay(today);
        var n = 0;
        while (s.daily[day]) { n++; day = previousDay(day); }
        return n;
    }

    // Enregistre la partie du jour. Seule la première compte. Renvoie { state, first }.
    function recordDaily(state, date, game) {
        var next = normalizeState(state);
        if (next.daily[date]) return { state: next, first: false };
        next.daily[date] = { score: Math.round(game.score), correct: game.correct, total: game.total };
        addFormStats(next.forms, 'daily', game);
        var keep = Object.keys(next.daily).sort().slice(-DAILY_MAX);
        var daily = {};
        keep.forEach(function (d) { daily[d] = next.daily[d]; });
        next.daily = daily;
        return { state: next, first: true };
    }

    // Les badges du quiz que cette partie fait gagner : { id }. `info` : { form, level, correct, total, rules, mysteryTries, mastered, zoneComplete, streak }.
    function badgesEarned(info) {
        var out = [];
        if (info.mastered >= 50) out.push('globe_trotter');
        if (info.zoneComplete) out.push('cartographe');
        if (info.rules === 'standard' && info.level === 'hard' && info.total >= 10 && info.correct === info.total && info.form !== 'weak' && info.form !== 'daily') out.push('sans_faute_geo');
        if (info.streak >= 7) out.push('assidu_geo');
        if (info.form === 'mystery' && info.correct >= 1 && info.mysteryTries > 0 && info.mysteryTries <= 2) out.push('flair_detective');
        if (info.form === 'burst' && info.correct >= 20) out.push('rafale_savant');
        return out;
    }

    // L'XP d'une partie : un cinquième des points (300 au plus), moitié moins pour une révision ; + 10 par pays devenu maîtrisé,
    // + 100 pour la première partie du défi du jour.
    function xpFor(score, opts) {
        var o = opts || {};
        var base = Math.min(300, Math.round(score / 5));
        if (o.review) base = Math.round(base / 2);
        return base + (o.newlyMastered || 0) * 10 + (o.dailyFirst ? 100 : 0);
    }

    // Les pays classés par réussite : `ids` (une liste d'identifiants) → les `limit` moins bien réussis (au moins MIN_SEEN fois vus), et les
    // mieux réussis (`best`). Renvoie { worst: [{ id, n, ok, pct }], best: [...] }.
    var RANK_MIN_SEEN = 2;
    function countryRanking(state, ids, limit) {
        var s = normalizeState(state);
        var rows = ids.filter(function (id) { return s.countries[id] && s.countries[id].n >= RANK_MIN_SEEN; }).map(function (id) {
            var c = s.countries[id];
            return { id: id, n: c.n, ok: c.ok, pct: Math.round(100 * c.ok / c.n) };
        });
        var byWorst = rows.slice().sort(function (a, b) { return a.pct - b.pct || b.n - a.n || (a.id < b.id ? -1 : 1); });
        var byBest = rows.slice().sort(function (a, b) { return b.pct - a.pct || b.n - a.n || (a.id < b.id ? -1 : 1); });
        return {
            worst: byWorst.slice(0, limit).filter(function (r) { return r.pct < 100; }),
            best: byBest.slice(0, limit).filter(function (r) { return r.pct >= 80; })
        };
    }

    // La progression : le pourcentage de bonnes réponses de chaque partie, de la plus ancienne à la plus récente (l'historique).
    function progressionOf(state) {
        var s = normalizeState(state);
        return s.history.slice().reverse().filter(function (g) { return g.total > 0; }).map(function (g) {
            return { at: g.at, form: g.form, pct: Math.round(100 * g.correct / g.total) };
        });
    }

    return {
        zoneCountries: zoneCountries, levelInfo: levelInfo, MIN_POOL: MIN_POOL,
        EXCLUDED_IDS: EXCLUDED_IDS, ZONES: ZONES, LEVELS: LEVELS, LENGTHS: LENGTHS, TIMERS: TIMERS, FORMS: FORMS, QUESTION_KINDS: QUESTION_KINDS,
        MIX_KINDS: MIX_KINDS, TRACKED_KINDS: TRACKED_KINDS, MAP_KINDS: MAP_KINDS, BURST_SECONDS: BURST_SECONDS, LIVES: LIVES, rulesOf: rulesOf, questionTimer: questionTimer, kindsOf: kindsOf,
        whoPoints: whoPoints, mysteryPoints: mysteryPoints,
        DEFAULT_PREFS: DEFAULT_PREFS, BASE_POINTS: BASE_POINTS, SPEED_MAX: SPEED_MAX, HISTORY_MAX: HISTORY_MAX,
        normalizePrefs: normalizePrefs, quizPool: quizPool, generateGame: generateGame, pointsFor: pointsFor, summarize: summarize,
        configKey: configKey, statsOf: statsOf, countryRanking: countryRanking, progressionOf: progressionOf, DAILY_PREFS: DAILY_PREFS, RUN_MAX: RUN_MAX, trackAnswer: trackAnswer, masteryOf: masteryOf, masteryCounts: masteryCounts,
        weakTargets: weakTargets, dailyStreak: dailyStreak, recordDaily: recordDaily, badgesEarned: badgesEarned, xpFor: xpFor, emptyState: emptyState, normalizeState: normalizeState, recordGame: recordGame, bestList: bestList
    };
});
