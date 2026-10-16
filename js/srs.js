// =========================================================================
// === HISTORIAXE — RÉPÉTITION ESPACÉE (boîtes de Leitner à échéances) ===
// =========================================================================
// Cinq boîtes, chacune avec son intervalle : un événement réussi monte d'une
// boîte et ne revient qu'à l'échéance ; un événement raté retombe en boîte 1
// et revient le lendemain. L'entrée stockée garde sa forme historique
// { box, lastReviewed, failCount, successCount } — l'échéance se CALCULE, rien
// de plus n'est écrit, et les données déjà enregistrées restent valides.
//
// Ce que ce module corrige : « maîtriser » un événement demandait quatre bonnes
// réponses… qui pouvaient tomber en cinq minutes (chaque réussite montait d'une
// boîte, `lastReviewed` n'était jamais lu). Une réussite AVANT l'échéance ne fait
// maintenant rien : le temps entre deux révisions est ce qui fait la mémoire.
//
// Pas de DOM, pas de localStorage : testable sous `npm test`.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.SRS = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Jours avant la prochaine révision, par boîte (1 à 5).
    var INTERVAL_DAYS = [1, 3, 7, 14, 30];
    var MAX_BOX = INTERVAL_DAYS.length;

    function intervalDays(box) {
        var b = Math.min(MAX_BOX, Math.max(1, Math.round(box) || 1));
        return INTERVAL_DAYS[b - 1];
    }

    function startOfLocalDay(ms) {
        var d = new Date(ms);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    // Échéance : minuit (heure locale) du jour de la dernière révision + l'intervalle de la boîte.
    // Une révision faite à 23 h hier est due dès ce matin — pas à 23 h aujourd'hui, ce qui ferait
    // dépendre le compte du jour de l'heure à laquelle on ouvre l'app.
    function dueAt(entry) {
        if (!entry || !entry.lastReviewed) return 0;
        var d = startOfLocalDay(entry.lastReviewed);
        d.setDate(d.getDate() + intervalDays(entry.box));
        return d.getTime();
    }

    function isDue(entry, now) {
        return dueAt(entry) <= now;
    }

    // Nouvelle entrée après une réponse. N'écrit rien : renvoie l'entrée à stocker.
    function applyResult(entry, success, now) {
        var next = {
            box: (entry && entry.box) || 1,
            lastReviewed: (entry && entry.lastReviewed) || 0,
            failCount: (entry && entry.failCount) || 0,
            successCount: (entry && entry.successCount) || 0
        };
        if (entry && entry.incorrect) next.incorrect = entry.incorrect; // champ hérité, conservé tel quel
        if (success) {
            next.successCount += 1;
            // Avant l'échéance, une réussite ne fait ni monter ni repousser l'événement.
            if (isDue(next, now)) {
                next.box = Math.min(MAX_BOX, next.box + 1);
                next.lastReviewed = now;
            }
        } else {
            next.box = 1;
            next.failCount += 1;
            next.lastReviewed = now;
        }
        return next;
    }

    // Les plus urgents d'abord : boîte basse (fragile) puis retard le plus long.
    function compareUrgency(a, b) {
        if (a.entry.box !== b.entry.box) return a.entry.box - b.entry.box;
        return dueAt(a.entry) - dueAt(b.entry);
    }

    // Résumé du calendrier : { due, overdue, tomorrow, nextDay } à partir d'une table
    // { id: entry } restreinte aux événements qui existent encore.
    function summarize(entries, now) {
        var tomorrowStart = startOfLocalDay(now);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        var out = { due: 0, overdue: 0, tomorrow: 0 };
        entries.forEach(function (entry) {
            var at = dueAt(entry);
            if (at <= now) {
                out.due += 1;
                // « En retard » : l'échéance est antérieure à ce matin.
                if (at < startOfLocalDay(now).getTime()) out.overdue += 1;
            } else if (at <= tomorrowStart.getTime()) {
                out.tomorrow += 1;
            }
        });
        return out;
    }

    return {
        INTERVAL_DAYS: INTERVAL_DAYS, MAX_BOX: MAX_BOX,
        intervalDays: intervalDays, dueAt: dueAt, isDue: isDue,
        applyResult: applyResult, compareUrgency: compareUrgency, summarize: summarize
    };
}));
