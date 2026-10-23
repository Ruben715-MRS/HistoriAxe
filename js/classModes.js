// =========================================================================
// === HISTORIAXE — MODES DU MODE CLASSE : MOTEUR PARTAGÉ (CLIENT + SERVEUR) ===
// =========================================================================
// Une séance de classe peut enchaîner plusieurs modes sur le MÊME paquet de cartes. Comme pour la frise
// (js/dailyEngine.js), l'élève n'envoie jamais de score : il envoie le journal de ses réponses, et le serveur le
// rejoue ici, à partir des vraies dates. Ce module n'a aucune dépendance au DOM : il tourne dans le navigateur
// (pour construire les questions de chaque mode) comme dans la fonction serverless (api/classroom.js).
//
// Le paquet : [{ id, date }, …] dans l'ordre de jeu ; la première carte est l'ancre de la frise.
//
// Chaque mode a ses manches, bâties de façon déterministe à partir du paquet (tous les élèves ont les mêmes
// questions) :
//   frise : n - 1 manches (une carte à placer), journal { slotIndex, elapsedMs }       — rejeu : DailyEngine
//   fil   : n - 1 manches (l'année d'une carte), journal { year }
//   ecart : ⌊n / 2⌋ manches (l'écart entre deux cartes), journal { guesses: [nombre, …] }, 5 essais
//   avap  : n - 1 manches (laquelle des deux est la plus ancienne), journal { choice: 0 | 1 } (0 = à gauche)
//
// Notation : chaque mode vaut au plus 100 points par manche, quel que soit le mode, pour qu'un score se compare
// d'un mode à l'autre. La frise garde son barème (combo, bonus de vitesse), ramené à la même échelle.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory(require('./dailyEngine.js'));
    } else {
        root.ClassModes = factory(root.DailyEngine);
    }
})(typeof self !== 'undefined' ? self : this, function (DailyEngine) {
    'use strict';

    // Dans l'ordre de la liste affichée à l'enseignant (la frise d'abord).
    var MODE_IDS = ['frise', 'fil', 'ecart', 'avap'];
    var ECART_ATTEMPTS = 5;
    var POINTS_PER_ROUND = 100;

    function isMode(id) { return MODE_IDS.indexOf(id) !== -1; }

    // Les modes choisis, sans doublon ni inconnu, dans l'ordre reçu ; ['frise'] à défaut.
    function sanitizeModes(raw) {
        if (!Array.isArray(raw)) return ['frise'];
        var out = [];
        raw.forEach(function (id) { if (isMode(id) && out.indexOf(id) === -1) out.push(id); });
        return out.length ? out : ['frise'];
    }

    function roundsFor(mode, n) {
        if (n < 2) return 0;
        return mode === 'ecart' ? Math.floor(n / 2) : n - 1;
    }

    function totalRounds(modes, n) {
        return modes.reduce(function (sum, mode) { return sum + roundsFor(mode, n); }, 0);
    }

    // Les deux cartes d'une manche d'« écart » (A, B) : les cartes 2r et 2r + 1 du paquet.
    function ecartPair(deck, r) {
        return { a: deck[2 * r], b: deck[2 * r + 1] };
    }

    // Avant / Après : la carte r + 1 contre une autre carte, toujours différente, choisie sans hasard ; la
    // position gauche / droite alterne d'une manche à l'autre.
    function avapPair(deck, r) {
        var n = deck.length;
        var evt = deck[r + 1];
        var opponent = deck[(r + 1 + 1 + ((2 * r + 1) % (n - 1))) % n];
        return r % 2 === 0 ? { left: evt, right: opponent } : { left: opponent, right: evt };
    }

    function span(deck) {
        var dates = deck.map(function (c) { return Number(c.date); });
        return Math.max(1, Math.max.apply(null, dates) - Math.min.apply(null, dates));
    }

    function num(v) {
        var x = Number(v);
        return isFinite(x) ? x : null;
    }

    // Rejeu d'un mode. Renvoie { points, results, total } : `results` = un booléen par manche TERMINÉE (juste ou
    // non), dans l'ordre ; `points` déjà ramenés à POINTS_PER_ROUND par manche au plus.
    function replayMode(mode, deck, log) {
        deck = (deck || []).map(function (c) { return { id: c.id, date: Number(c.date) }; });
        var total = roundsFor(mode, deck.length);
        log = Array.isArray(log) ? log.slice(0, total) : [];
        var res = { points: 0, results: [], total: total };
        if (!total) return res;

        if (mode === 'frise') return replayFrise(deck, log, res);

        for (var r = 0; r < log.length; r++) {
            var entry = log[r] && typeof log[r] === 'object' ? log[r] : {};
            var pts = 0;
            var ok = false;
            if (mode === 'fil') {
                var year = num(entry.year);
                if (year === null) break;
                var gap = Math.abs(year - deck[r + 1].date);
                ok = gap === 0;
                pts = Math.round(POINTS_PER_ROUND * Math.max(0, 1 - gap / Math.max(span(deck), 10)));
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
                var q = avapPair(deck, r);
                var chosen = entry.choice === 0 ? q.left : q.right;
                var other = entry.choice === 0 ? q.right : q.left;
                ok = chosen.date <= other.date;
                pts = ok ? POINTS_PER_ROUND : 0;
            }
            res.results.push(ok);
            res.points += pts;
        }
        return res;
    }

    // La frise : rejeu de DailyEngine (sans élimination), score ramené à 100 points par manche pour une partie
    // parfaite (combo croissant et bonus de vitesse maximal à chaque manche).
    function replayFrise(deck, log, res) {
        var orderedDates = deck.map(function (c) { return c.date; }).reverse();
        var replay = DailyEngine.replayDailyGame(orderedDates, log, { lives: Infinity });
        res.results = replay.details.map(function (d) { return d.correct; });
        var best = 0;
        var combo = 1;
        for (var r = 0; r < res.total; r++) {
            best += Math.round(100 * combo) + 50;
            combo = Math.round((combo + 0.1) * 10) / 10;
        }
        res.points = Math.round(replay.score / best * res.total * POINTS_PER_ROUND);
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
        roundsFor: roundsFor,
        totalRounds: totalRounds,
        ecartPair: ecartPair,
        avapPair: avapPair,
        replayMode: replayMode,
        replaySession: replaySession
    };
});
