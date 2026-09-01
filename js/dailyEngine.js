// =========================================================================
// === HISTORIAXE — MOTEUR PARTAGÉ DU DÉFI DU JOUR (CLIENT + SERVEUR) ===
// =========================================================================
//
// Ce module est volontairement dépourvu de toute dépendance au DOM ou à
// `window` : il tourne aussi bien dans le navigateur (chargé via <script>,
// voir index.html) que dans une fonction serverless Node (voir api/scores.js).
// C'est la SEULE source de vérité pour :
//   1) le tirage déterministe des 10 événements du Défi du jour (même graine
//      pour tout le monde, cf. getDailySeedString) ;
//   2) le calcul du score de ce défi (cf. replayDailyGame).
//
// Le serveur ne fait jamais confiance à un score envoyé par le client : il
// reçoit uniquement les actions brutes du joueur (dans quel intervalle il a
// déposé chaque carte, en combien de temps) et rejoue la partie lui-même
// avec ces mêmes fonctions, à partir des vraies dates de la base — ce qui
// rend un score falsifié impossible à envoyer sans littéralement deviner
// les bonnes réponses. Toute évolution de la formule de points côté client
// (js/app.js: awardPoints/checkPlacement) DOIT être répercutée ici pour que
// client et serveur restent parfaitement synchronisés.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else {
        root.DailyEngine = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Frontière du "jour" du Défi : 05h00 UTC (comme getDailySeedString côté
    // client historique) — décalage choisi pour que le nouveau défi tombe la
    // nuit pour la majorité des joueurs plutôt qu'en pleine journée.
    var DAY_BOUNDARY_OFFSET_MS = 5 * 3600 * 1000;

    function getDailySeedString(refDate) {
        var now = refDate || new Date();
        var adjusted = new Date(now.getTime() - DAY_BOUNDARY_OFFSET_MS);
        var year = adjusted.getUTCFullYear();
        var month = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
        var day = String(adjusted.getUTCDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    function mulberry32(seed) {
        return function () {
            var t = (seed += 0x6D2B79F5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hashStringToSeed(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return Math.abs(hash) || 123456789;
    }

    // Siècle numérique signé (ex : 1789 → 18, -450 → -5), pour regrouper les
    // événements du tirage quotidien et éviter une frise concentrée sur une
    // seule période.
    function getCenturyKey(year) {
        if (year == null) return 0;
        if (year < 0) return -Math.ceil(Math.abs(year) / 100);
        return Math.ceil((year === 0 ? 1 : year) / 100);
    }

    // Tire `count` items parmi `items` : mélange déterministe (graine =
    // dateStr, identique pour tout le monde) puis sélection gloutonne qui
    // refuse tout item dépassant 2 représentants du même siècle. Filet de
    // sécurité si le lissage laisse moins de `count` items.
    //
    // `items` peut être n'importe quel tableau d'objets porteurs d'une date
    // (accédée via `getDate`, par défaut `item.date`) — le client y passe des
    // événements complets avec leur emplacement dans l'arbre, le serveur de
    // simples paires {id, date}. Les DEUX doivent recevoir exactement les
    // mêmes items, dans le même ordre, pour tirer le même défi (voir
    // js/daily.js: generateDailyEvents, qui exclut les événements/thèmes
    // personnalisés avant d'appeler cette fonction, précisément pour cette
    // raison — le serveur ne connaît que le contenu officiel).
    function pickDailyItems(items, dateStr, count, getDate) {
        count = count || 10;
        getDate = getDate || function (it) { return it.date; };
        if (!items || items.length === 0) return [];

        var seed = hashStringToSeed('historiaxe_daily_' + dateStr);
        var rng = mulberry32(seed);

        var shuffled = items.slice();
        for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
        }

        var MAX_PER_CENTURY = 2;
        var picked = [];
        var centuryCounts = {};

        shuffled.forEach(function (item) {
            if (picked.length >= count) return;
            var century = getCenturyKey(getDate(item));
            var c = centuryCounts[century] || 0;
            if (c >= MAX_PER_CENTURY) return;
            picked.push(item);
            centuryCounts[century] = c + 1;
        });

        if (picked.length < count) {
            for (var k = 0; k < shuffled.length; k++) {
                if (picked.length >= count) break;
                if (picked.indexOf(shuffled[k]) === -1) picked.push(shuffled[k]);
            }
        }

        return picked;
    }

    // --- Rejeu du score du Défi du jour ---
    //
    // orderedDates : les dates des N événements tirés par pickDailyItems,
    // DANS LE MÊME ORDRE que le tirage (c'est cet ordre qui fixe l'ordre de
    // jeu : voir startActualGame('daily') dans js/app.js — la première carte
    // du tirage, orderedDates[N-1], est posée gratuitement comme ancre ; les
    // suivantes sont ensuite piochées en partant de la fin, une par manche).
    //
    // rounds : tableau { slotIndex, elapsedMs } dans l'ordre de jeu, une
    // entrée par manche réellement jouée (peut être plus court que le nombre
    // de manches si la partie s'est arrêtée avant la fin — vies épuisées, ou
    // partie abandonnée). slotIndex est l'intervalle (0..n) où le joueur a
    // déposé la carte de cette manche ; elapsedMs le temps de réponse.
    //
    // Reproduit fidèlement checkPlacement()/awardPoints() de js/app.js.
    function replayDailyGame(orderedDates, rounds) {
        orderedDates = (orderedDates || []).map(Number).filter(function (d) { return isFinite(d); });
        rounds = Array.isArray(rounds) ? rounds : [];

        var result = {
            score: 0,
            roundsPlayed: 0,
            roundsTotal: 0,
            won: false,
            timeSeconds: 0,
            suspicious: false
        };

        if (orderedDates.length < 2) return result;

        // Mirroir de : placedEvents = [eventsCopy.pop()]; currentPool = eventsCopy;
        var deck = orderedDates.slice();
        var placed = [deck.pop()];
        var pool = deck; // pool.pop() pioche la carte suivante, comme côté client

        // Mirroir de : currentGameSpan calculé sur `eventsCopy` APRÈS le premier
        // pop (donc sur les 9 dates restantes du pool, pas les 10 du tirage).
        var span = Math.max(1, Math.max.apply(null, pool) - Math.min.apply(null, pool));

        var roundsTotal = pool.length;
        result.roundsTotal = roundsTotal;

        var score = 0;
        var combo = 1.0;
        var lives = 3;
        var timeSeconds = 0;
        var roundsPlayed = 0;
        var suspiciousRounds = 0;

        // NB: `pool` se vide au fil de la boucle (pool.pop() ci-dessous) — la
        // borne doit donc être figée dans `roundsTotal` et non relue sur
        // `pool.length` à chaque itération.
        for (var r = 0; r < roundsTotal; r++) {
            if (lives <= 0) break;
            var round = rounds[r];
            if (!round || typeof round !== 'object') break;

            var dateToPlace = pool.pop();

            var slotIndex = Number(round.slotIndex);
            if (!isFinite(slotIndex)) slotIndex = -1;
            slotIndex = Math.max(0, Math.min(placed.length, Math.round(slotIndex)));

            var elapsedMs = Number(round.elapsedMs);
            if (!isFinite(elapsedMs) || elapsedMs < 0) elapsedMs = 0;
            if (elapsedMs < 120) suspiciousRounds++; // temps de réaction humain implausible
            elapsedMs = Math.min(Math.max(elapsedMs, 0), 120000); // borne : 0 à 120s/manche
            timeSeconds += elapsedMs / 1000;
            roundsPlayed++;

            var isCorrect = true;
            var gap = 0;
            if (slotIndex > 0) {
                var prevDate = placed[slotIndex - 1];
                if (dateToPlace < prevDate) { isCorrect = false; gap = prevDate - dateToPlace; }
            }
            if (slotIndex < placed.length) {
                var nextDate = placed[slotIndex];
                if (dateToPlace > nextDate) { isCorrect = false; gap = Math.max(gap, dateToPlace - nextDate); }
            }

            if (isCorrect) {
                var elapsedSec = elapsedMs / 1000;
                var speedBonus = Math.round(50 * Math.max(0, 1 - elapsedSec / 15));
                var pts = Math.round(100 * combo) + speedBonus;
                score += pts;
                combo = Math.round((combo + 0.1) * 10) / 10;
                placed.splice(slotIndex, 0, dateToPlace);
            } else {
                var ratio = Math.max(0, 1 - gap / span);
                var wrongPts = Math.round(100 * ratio);
                score += wrongPts;
                combo = 1.0;
                lives -= 1;

                var correctIndex = placed.length;
                for (var jx = 0; jx < placed.length; jx++) {
                    if (dateToPlace <= placed[jx]) { correctIndex = jx; break; }
                }
                placed.splice(correctIndex, 0, dateToPlace);
            }
        }

        result.score = score;
        result.roundsPlayed = roundsPlayed;
        result.timeSeconds = Math.round(timeSeconds * 10) / 10;
        result.won = lives > 0 && roundsPlayed === result.roundsTotal;
        result.suspicious = suspiciousRounds >= 3;
        return result;
    }

    return {
        getDailySeedString: getDailySeedString,
        mulberry32: mulberry32,
        hashStringToSeed: hashStringToSeed,
        getCenturyKey: getCenturyKey,
        pickDailyItems: pickDailyItems,
        replayDailyGame: replayDailyGame
    };
});
