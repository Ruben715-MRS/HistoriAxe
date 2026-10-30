// =========================================================================
// === HISTORIAXE — SÉRIE QUOTIDIENNE : JOURS JOUÉS ET CARTE DES 7 JOURS (logique pure) ===
// =========================================================================
// La série garde la liste des jours (dates locales YYYY-MM-DD) où le joueur a fini une partie. La carte qui s'affiche
// une fois par jour, juste après la première partie terminée, montre sept pastilles : les cinq jours d'avant, aujourd'hui
// (toujours la sixième) et demain (la septième, toujours vide).
//
// Module UMD testé hors navigateur (tests/streakCore.test.js) ; js/app/streak-card.js en fait la carte à l'écran.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.StreakCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Assez pour la carte (7 jours) et pour un futur calendrier du mois.
    var MAX_DAYS = 40;
    var DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

    function isDay(s) { return typeof s === 'string' && DAY_RE.test(s); }

    // 'YYYY-MM-DD' décalé de n jours (calcul en UTC pour qu'un changement d'heure ne décale jamais d'un jour).
    function shiftDay(dateStr, n) {
        var d = new Date(dateStr + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() + n);
        return d.toISOString().slice(0, 10);
    }

    // Jour de la semaine (0 = dimanche … 6 = samedi) d'une date 'YYYY-MM-DD'.
    function weekdayOf(dateStr) {
        return new Date(dateStr + 'T00:00:00Z').getUTCDay();
    }

    // Liste propre : dates valides, sans doublon, triées, les MAX_DAYS dernières.
    function normalizeDays(days) {
        var seen = {};
        var out = [];
        (Array.isArray(days) ? days : []).forEach(function (d) {
            if (isDay(d) && !seen[d]) { seen[d] = true; out.push(d); }
        });
        out.sort();
        return out.slice(-MAX_DAYS);
    }

    // Les séries enregistrées avant ce journal n'ont que { currentStreak, lastPlayedDate } : on en déduit les jours
    // (la série en cours se termine à lastPlayedDate).
    function backfillDays(data) {
        var last = data && data.lastPlayedDate;
        var n = data && data.currentStreak | 0;
        if (!isDay(last) || n < 1) return [];
        var out = [];
        for (var i = Math.min(n, MAX_DAYS) - 1; i >= 0; i--) out.push(shiftDay(last, -i));
        return out;
    }

    // Ajoute un jour au journal.
    function addDay(days, day) {
        return normalizeDays((Array.isArray(days) ? days : []).concat(isDay(day) ? [day] : []));
    }

    // Union de deux journaux (synchronisation entre appareils).
    function mergeDays(a, b) {
        return normalizeDays((Array.isArray(a) ? a : []).concat(Array.isArray(b) ? b : []));
    }

    // Les sept pastilles de la carte autour d'aujourd'hui. Chaque pastille : { date, weekday, state } avec state =
    //   'done'    un jour d'avant où une partie a été finie
    //   'missed'  un jour d'avant sans partie
    //   'today'   aujourd'hui, partie pas encore finie
    //   'todayDone' aujourd'hui, partie finie
    //   'future'  demain (toujours vide)
    function windowFor(today, days) {
        var played = {};
        normalizeDays(days).forEach(function (d) { played[d] = true; });
        var out = [];
        for (var offset = -5; offset <= 1; offset++) {
            var date = shiftDay(today, offset);
            var state;
            if (offset < 0) state = played[date] ? 'done' : 'missed';
            else if (offset === 0) state = played[date] ? 'todayDone' : 'today';
            else state = 'future';
            out.push({ date: date, weekday: weekdayOf(date), state: state });
        }
        return out;
    }

    return {
        MAX_DAYS: MAX_DAYS,
        isDay: isDay,
        shiftDay: shiftDay,
        weekdayOf: weekdayOf,
        normalizeDays: normalizeDays,
        backfillDays: backfillDays,
        addDay: addDay,
        mergeDays: mergeDays,
        windowFor: windowFor
    };
});
