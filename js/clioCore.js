// =========================================================================
// === HISTORIAXE — CLIO, LA MASCOTTE : RÉACTIONS (logique pure) ===
// =========================================================================
// Clio réagit à ce que fait le joueur : une réaction = une humeur (qui commande l'animation du personnage) + une phrase
// tirée d'une banque fixe, traduite (ui/fr.json, clés `clio.line.<événement>.<n>`). Jamais de texte libre ni généré, jamais
// de moquerie : même une défaite se dit avec douceur.
//
// Module UMD testé hors navigateur (tests/clio.test.js) ; js/app/clio.js en fait des éléments à l'écran.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.ClioCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Humeurs = poses d'animation (voir docs/direction-artistique.md §7.2 ; le chat provisoire en joue une version simplifiée).
    var MOODS = ['repos', 'content', 'ravi', 'triste', 'reflechit', 'salue', 'dort'];

    // Événements : humeur et nombre de variantes de phrase.
    var EVENTS = {
        win1: { mood: 'content', lines: 4 },
        win2: { mood: 'content', lines: 4 },
        win3: { mood: 'ravi', lines: 4 },
        lose: { mood: 'triste', lines: 4 },
        boss: { mood: 'ravi', lines: 4 },
        greet: { mood: 'salue', lines: 4 },
        greetStreak: { mood: 'content', lines: 3 },
        streakRisk: { mood: 'dort', lines: 3 },
        tap: { mood: 'content', lines: 4 },
        first: { mood: 'salue', lines: 1 },
        costume: { mood: 'reflechit', lines: 2 },
        costumeShort: { mood: 'reflechit', lines: 1 }
    };

    // L'événement qui suit la fin d'un niveau du Chemin.
    function eventForLevel(r) {
        if (!r.won) return 'lose';
        if (r.boss) return 'boss';
        if (r.stars >= 3) return 'win3';
        return r.stars === 2 ? 'win2' : 'win1';
    }

    // Une variante de phrase différente de la précédente (`last`, ou -1), tirée avec `rng` (0 ≤ rng() < 1).
    function pickLine(event, last, rng) {
        var cfg = EVENTS[event];
        if (!cfg) return 0;
        if (cfg.lines <= 1) return 0;
        var random = rng || Math.random;
        var n = Math.floor(random() * (cfg.lines - 1));
        // On saute la variante précédente : `n` parcourt les autres.
        return n >= last && last >= 0 ? n + 1 : n;
    }

    // La clé de traduction d'une phrase.
    function lineKey(event, index) { return 'clio.line.' + event + '.' + index; }

    // État de la série quotidienne : 'risk' si elle vit encore mais s'éteint ce soir (jouée hier, pas aujourd'hui, au moins
    // 2 jours), 'ok' si elle est en cours et déjà jouée aujourd'hui, 'none' sinon. `daysSince` : jours depuis la dernière partie.
    function streakState(current, daysSince) {
        if (!(current >= 2) || daysSince === null || daysSince === undefined) return 'none';
        if (daysSince === 0) return 'ok';
        if (daysSince === 1) return 'risk';
        return 'none';
    }

    // Le costume du monde qu'on vient de finir : proposé à la boutique, avec ce qu'il manque en pièces.
    // item : { price } ; renvoie 'none' (déjà possédé / inconnu), 'costume' (assez de pièces) ou 'costumeShort'.
    function costumeHint(item, owned, coins) {
        if (!item || owned) return 'none';
        return coins >= item.price ? 'costume' : 'costumeShort';
    }

    return { MOODS: MOODS, EVENTS: EVENTS, eventForLevel: eventForLevel, pickLine: pickLine, lineKey: lineKey, streakState: streakState, costumeHint: costumeHint };
});
