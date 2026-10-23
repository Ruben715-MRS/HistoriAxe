// =========================================================================
// === HISTORIAXE — MODES DU MODE CLASSE : MOTEUR PARTAGÉ (CLIENT + SERVEUR) ===
// =========================================================================
// Une séance de classe peut enchaîner plusieurs modes sur le MÊME paquet de cartes. Comme pour la frise
// (js/dailyEngine.js), l'élève n'envoie jamais de score : il envoie le journal de ses réponses, et le serveur le
// rejoue ici, à partir des vraies dates. Ce module n'a aucune dépendance au DOM : il tourne dans le navigateur
// (pour construire les questions de chaque mode) comme dans la fonction serverless (api/classroom.js).
//
// Le paquet : [{ id, date, axe? }, …] dans l'ordre de jeu ; la première carte est l'ancre de la frise.
//
// Chaque mode a ses manches, bâties SANS HASARD à partir du paquet (un générateur pseudo-aléatoire initialisé par le
// paquet : tous les élèves, et le serveur, obtiennent exactement les mêmes questions) — voir plan(). Journal de
// chaque manche :
//   frise   : n - 1 manches, { slotIndex, elapsedMs }                       — rejeu : DailyEngine
//   fil     : n - 1 manches, { year }
//   ecart   : ⌊n / 2⌋ manches (deux cartes), { guesses: [nombre, …] }, 5 essais
//   avap    : n - 1 manches, { choice: 0 | 1 } (0 = à gauche)
//   quiz    : n - 1 manches, { choice: identifiant de la carte choisie }
//   ordre   : cinq cartes par manche, { order: [identifiants, du plus ancien au plus récent] }
//   curseur : n - 1 manches, { guess: année }
//   blitz   : n - 1 énoncés « vrai ou faux », { answer: true | false }       — sans chronomètre en classe
//   intrus  : quelques manches de quatre cartes, { choice: identifiant de l'intrus }
//
// Notation : chaque mode vaut au plus 100 points par manche, quel que soit le mode, pour qu'un score se compare
// d'un mode à l'autre. La frise garde son barème (combo, bonus de vitesse), ramené à la même échelle.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory(require('./dailyEngine.js'), require('./gameModes.js'));
    } else {
        root.ClassModes = factory(root.DailyEngine, root.GameModes);
    }
})(typeof self !== 'undefined' ? self : this, function (DailyEngine, GameModes) {
    'use strict';

    // Dans l'ordre de la liste affichée à l'enseignant (la frise d'abord).
    var MODE_IDS = ['frise', 'fil', 'ecart', 'avap', 'quiz', 'ordre', 'curseur', 'blitz', 'intrus'];
    var ECART_ATTEMPTS = 5;
    var POINTS_PER_ROUND = 100;
    var ORDER_PARTIAL_POINTS = 60; // une remise en ordre ratée de peu vaut quand même un peu (comme en partie libre)

    function isMode(id) { return MODE_IDS.indexOf(id) !== -1; }

    // Les modes choisis, sans doublon ni inconnu, dans l'ordre reçu ; ['frise'] à défaut.
    function sanitizeModes(raw) {
        if (!Array.isArray(raw)) return ['frise'];
        var out = [];
        raw.forEach(function (id) { if (isMode(id) && out.indexOf(id) === -1) out.push(id); });
        return out.length ? out : ['frise'];
    }

    function num(v) {
        var x = Number(v);
        return isFinite(x) ? x : null;
    }

    function span(deck) {
        var dates = deck.map(function (c) { return Number(c.date); });
        return Math.max(1, Math.max.apply(null, dates) - Math.min.apply(null, dates));
    }

    // Un générateur propre à (mode, paquet) : même graine partout, donc mêmes questions partout.
    function rngFor(mode, deck) {
        var key = mode + '|' + deck.map(function (c) { return c.id; }).join(',');
        return DailyEngine.mulberry32(DailyEngine.hashStringToSeed(key));
    }

    function shuffled(list, rng) {
        var out = list.slice();
        for (var i = out.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
        }
        return out;
    }

    // Avant / Après : la carte r + 1 contre une autre carte, toujours différente, choisie sans hasard ; la
    // position gauche / droite alterne d'une manche à l'autre.
    function avapPair(deck, r) {
        var n = deck.length;
        var evt = deck[r + 1];
        var opponent = deck[(r + 1 + 1 + ((2 * r + 1) % (n - 1))) % n];
        return r % 2 === 0 ? { left: evt, right: opponent } : { left: opponent, right: evt };
    }

    function ecartPair(deck, r) {
        return { a: deck[2 * r], b: deck[2 * r + 1] };
    }

    function ids(list) { return list.map(function (c) { return c.id; }); }

    // Les manches d'un mode, en identifiants de cartes : un tableau d'objets, un par manche. `ids` = les cartes en
    // jeu dans la manche (pour le bilan « manches les plus ratées »).
    function plan(mode, deck) {
        deck = (deck || []).map(function (c) { return { id: c.id, date: Number(c.date), axe: c.axe }; });
        var n = deck.length;
        var out = [];
        var r;
        if (n < 2) return out;
        if (mode === 'frise' || mode === 'fil') {
            for (r = 0; r < n - 1; r++) out.push({ ids: [deck[r + 1].id] });
        } else if (mode === 'ecart') {
            for (r = 0; r < Math.floor(n / 2); r++) { var p = ecartPair(deck, r); out.push({ ids: [p.a.id, p.b.id] }); }
        } else if (mode === 'avap') {
            for (r = 0; r < n - 1; r++) {
                var q = avapPair(deck, r);
                out.push({ ids: [deck[r + 1].id], leftId: q.left.id, rightId: q.right.id });
            }
        } else if (mode === 'quiz') {
            var rngQ = rngFor(mode, deck);
            for (r = 0; r < n - 1; r++) {
                var correct = deck[r + 1];
                var others = shuffled(deck.filter(function (c) { return c.id !== correct.id && c.date !== correct.date; }), rngQ);
                if (others.length < 3) others = shuffled(deck.filter(function (c) { return c.id !== correct.id; }), rngQ);
                out.push({
                    ids: [correct.id], type: r % 2 === 0 ? 'event-to-year' : 'year-to-event',
                    correctId: correct.id, distractorIds: ids(others.slice(0, 3))
                });
            }
        } else if (mode === 'ordre') {
            GameModes.buildOrderRounds(deck, { rng: rngFor(mode, deck) }).forEach(function (round) {
                out.push({ ids: round.solution.slice(), cardIds: ids(round.cards), solution: round.solution.slice() });
            });
        } else if (mode === 'curseur') {
            GameModes.buildSliderRounds(deck, { rng: rngFor(mode, deck), count: n - 1 }).forEach(function (round) {
                out.push({ ids: [round.event.id], eventId: round.event.id, date: round.event.date, min: round.min, max: round.max, tolerance: round.tolerance });
            });
        } else if (mode === 'blitz') {
            GameModes.buildBlitzQuestions(deck, { rng: rngFor(mode, deck), count: n - 1 }).forEach(function (bq) {
                out.push({ ids: [bq.left.id, bq.right.id], leftId: bq.left.id, rightId: bq.right.id, answer: bq.answer });
            });
        } else if (mode === 'intrus') {
            GameModes.buildIntrusQuestions(deck, { rng: rngFor(mode, deck), count: Math.max(3, Math.floor(n / 3)) }).forEach(function (iq) {
                out.push({ ids: [iq.intruderId], kind: iq.kind, axis: iq.axis, optionIds: ids(iq.options), intruderId: iq.intruderId });
            });
        }
        return out;
    }

    function roundsFor(mode, deck) { return plan(mode, deck).length; }

    function totalRounds(modes, deck) {
        return modes.reduce(function (sum, mode) { return sum + roundsFor(mode, deck); }, 0);
    }

    // Rejeu d'un mode. Renvoie { points, results, total } : `results` = un booléen par manche TERMINÉE (juste ou
    // non), dans l'ordre ; `points` déjà ramenés à POINTS_PER_ROUND par manche au plus.
    function replayMode(mode, deck, log) {
        deck = (deck || []).map(function (c) { return { id: c.id, date: Number(c.date), axe: c.axe }; });
        if (mode === 'frise') return replayFrise(deck, Array.isArray(log) ? log : []);
        var rounds = plan(mode, deck);
        var total = rounds.length;
        log = Array.isArray(log) ? log.slice(0, total) : [];
        var res = { points: 0, results: [], total: total };
        var sp = span(deck);

        for (var r = 0; r < log.length; r++) {
            var entry = log[r] && typeof log[r] === 'object' ? log[r] : {};
            var round = rounds[r];
            var pts = 0;
            var ok = false;
            if (mode === 'fil') {
                var year = num(entry.year);
                if (year === null) break;
                var gap = Math.abs(year - deck[r + 1].date);
                ok = gap === 0;
                pts = Math.round(POINTS_PER_ROUND * Math.max(0, 1 - gap / Math.max(sp, 10)));
            } else if (mode === 'ecart') {
                var pair = ecartPair(deck, r);
                var target = Math.abs(pair.a.date - pair.b.date);
                var guesses = Array.isArray(entry.guesses) ? entry.guesses.slice(0, ECART_ATTEMPTS) : [];
                var used = 0;
                var solved = false;
                for (var g = 0; g < guesses.length; g++) {
                    used++;
                    if (num(guesses[g]) === target) { solved = true; break; }
                }
                // Une manche n'est terminée que trouvée, ou une fois les cinq essais épuisés.
                if (!solved && used < ECART_ATTEMPTS) break;
                ok = solved;
                pts = solved ? Math.max(0, POINTS_PER_ROUND - 20 * (used - 1)) : 0;
            } else if (mode === 'avap') {
                if (entry.choice !== 0 && entry.choice !== 1) break;
                var av = avapPair(deck, r);
                var chosen = entry.choice === 0 ? av.left : av.right;
                var other = entry.choice === 0 ? av.right : av.left;
                ok = chosen.date <= other.date;
                pts = ok ? POINTS_PER_ROUND : 0;
            } else if (mode === 'quiz') {
                if (typeof entry.choice !== 'string') break;
                ok = entry.choice === round.correctId;
                pts = ok ? POINTS_PER_ROUND : 0;
            } else if (mode === 'ordre') {
                var order = Array.isArray(entry.order) ? entry.order.map(String) : [];
                if (order.length !== round.solution.length) break;
                var verdict = GameModes.scoreOrderAttempt(order, round.solution);
                ok = verdict.perfect;
                pts = ok ? POINTS_PER_ROUND : Math.round(ORDER_PARTIAL_POINTS * verdict.correct / verdict.total);
            } else if (mode === 'curseur') {
                var guess = num(entry.guess);
                if (guess === null) break;
                var sv = GameModes.scoreSliderGuess(guess, { event: { date: round.date }, tolerance: round.tolerance });
                ok = sv.within;
                pts = Math.round(POINTS_PER_ROUND * sv.ratio);
            } else if (mode === 'blitz') {
                if (typeof entry.answer !== 'boolean') break;
                ok = entry.answer === round.answer;
                pts = ok ? POINTS_PER_ROUND : 0;
            } else if (mode === 'intrus') {
                if (typeof entry.choice !== 'string') break;
                ok = entry.choice === round.intruderId;
                pts = ok ? POINTS_PER_ROUND : 0;
            }
            res.results.push(ok);
            res.points += pts;
        }
        return res;
    }

    // La frise : rejeu de DailyEngine (sans élimination), score ramené à 100 points par manche pour une partie
    // parfaite (combo croissant et bonus de vitesse maximal à chaque manche).
    function replayFrise(deck, log) {
        var total = Math.max(0, deck.length - 1);
        var res = { points: 0, results: [], total: total };
        if (!total) return res;
        var orderedDates = deck.map(function (c) { return c.date; }).reverse();
        var replay = DailyEngine.replayDailyGame(orderedDates, log.slice(0, total), { lives: Infinity });
        res.results = replay.details.map(function (d) { return d.correct; });
        var best = 0;
        var combo = 1;
        for (var r = 0; r < total; r++) {
            best += Math.round(100 * combo) + 50;
            combo = Math.round((combo + 0.1) * 10) / 10;
        }
        res.points = Math.round(replay.score / best * total * POINTS_PER_ROUND);
        return res;
    }

    // La séance entière : les journaux de tous les modes (logs = { mode: [...] }). results garde un tableau par mode.
    function replaySession(modes, deck, logs) {
        logs = logs && typeof logs === 'object' ? logs : {};
        var out = { points: 0, results: {}, correct: 0, answered: 0, finished: true };
        modes.forEach(function (mode) {
            var r = replayMode(mode, deck, logs[mode]);
            out.points += r.points;
            out.results[mode] = r.results;
            out.correct += r.results.filter(Boolean).length;
            out.answered += r.results.length;
            if (r.results.length < r.total) out.finished = false;
        });
        return out;
    }

    return {
        MODE_IDS: MODE_IDS,
        ECART_ATTEMPTS: ECART_ATTEMPTS,
        POINTS_PER_ROUND: POINTS_PER_ROUND,
        isMode: isMode,
        sanitizeModes: sanitizeModes,
        plan: plan,
        roundsFor: roundsFor,
        totalRounds: totalRounds,
        ecartPair: ecartPair,
        avapPair: avapPair,
        replayMode: replayMode,
        replaySession: replaySession
    };
});
