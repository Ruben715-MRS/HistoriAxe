// Tests unitaires sur js/dailyEngine.js — le moteur partagé client/serveur
// du Défi du jour (tirage déterministe + rejeu anti-triche du score,
// utilisé aussi par api/scores.js). Ce module expose déjà un
// `module.exports` (UMD), il est donc directement testable ici.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
    getDailySeedString,
    getCenturyKey,
    pickDailyItems,
    replayDailyGame
} = require('../js/dailyEngine.js');

test('getDailySeedString est stable avant/après la frontière 05h00 UTC', () => {
    // Un instant juste avant 5h UTC appartient encore au jour précédent.
    const before = getDailySeedString(new Date('2026-03-10T04:59:00Z'));
    const after = getDailySeedString(new Date('2026-03-10T05:00:00Z'));
    assert.equal(before, '2026-03-09');
    assert.equal(after, '2026-03-10');
});

test('getCenturyKey regroupe correctement années positives/négatives/limites', () => {
    assert.equal(getCenturyKey(1789), 18);
    assert.equal(getCenturyKey(1801), 19);
    assert.equal(getCenturyKey(1800), 18);
    assert.equal(getCenturyKey(-450), -5);
    assert.equal(getCenturyKey(0), 1);
    assert.equal(getCenturyKey(null), 0);
});

test('pickDailyItems est déterministe pour une même date (même tirage pour tout le monde)', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ date: 1000 + i * 17 }));
    const a = pickDailyItems(items, '2026-03-10', 10);
    const b = pickDailyItems(items, '2026-03-10', 10);
    assert.deepEqual(a, b);
    assert.equal(a.length, 10);
});

test('pickDailyItems change de tirage d\'un jour à l\'autre', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ date: 1000 + i * 17 }));
    const day1 = pickDailyItems(items, '2026-03-10', 10);
    const day2 = pickDailyItems(items, '2026-03-11', 10);
    assert.notDeepEqual(day1, day2);
});

test('pickDailyItems complète avec le filet de sécurité si le lissage par siècle est trop strict', () => {
    // Tous les items sur le même siècle : la limite MAX_PER_CENTURY=2 ne
    // devrait pas empêcher de renvoyer `count` items au total.
    const items = Array.from({ length: 20 }, (_, i) => ({ date: 1800 + i }));
    const picked = pickDailyItems(items, '2026-03-10', 10);
    assert.equal(picked.length, 10);
});

test('replayDailyGame : partie parfaite (tout correct) rapporte un score positif et gagnée', () => {
    const orderedDates = [1900, 1950, 1850, 1975, 1800, 2000, 1700, 1990, 1600, 1500];
    // Reproduit exactement l'ordre de dépôt attendu par le moteur : ancre =
    // dernier élément, puis pioche depuis la fin du pool restant, toujours
    // déposée au bon endroit (slotIndex croissant avec la taille de `placed`).
    const deck = orderedDates.slice();
    const placed = [deck.pop()];
    const pool = deck.slice();
    const rounds = [];
    for (let i = 0; i < pool.length; i++) {
        const dateToPlace = pool[pool.length - 1 - i];
        let slotIndex = placed.length;
        for (let j = 0; j < placed.length; j++) {
            if (dateToPlace <= placed[j]) { slotIndex = j; break; }
        }
        rounds.push({ slotIndex, elapsedMs: 2000 });
        placed.splice(slotIndex, 0, dateToPlace);
    }

    const result = replayDailyGame(orderedDates, rounds);
    assert.equal(result.roundsTotal, 9);
    assert.equal(result.roundsPlayed, 9);
    assert.equal(result.won, true);
    assert.ok(result.score > 0, 'une partie parfaite doit rapporter un score positif');
    assert.equal(result.suspicious, false);
});

test('replayDailyGame : trois erreurs épuisent les vies et empêchent de gagner', () => {
    const orderedDates = [1000, 1100, 1200, 1300, 1400];
    // slotIndex volontairement toujours faux (hors-borne haute) pour forcer
    // une erreur à chaque manche jouée.
    const rounds = [
        { slotIndex: 999, elapsedMs: 3000 },
        { slotIndex: 999, elapsedMs: 3000 },
        { slotIndex: 999, elapsedMs: 3000 },
        { slotIndex: 999, elapsedMs: 3000 }
    ];
    const result = replayDailyGame(orderedDates, rounds);
    assert.equal(result.won, false);
    assert.ok(result.roundsPlayed < result.roundsTotal, 'la partie doit s\'arrêter avant la fin, vies épuisées');
});

test('replayDailyGame renvoie un résultat neutre si moins de 2 dates', () => {
    const result = replayDailyGame([1900], []);
    assert.equal(result.score, 0);
    assert.equal(result.roundsTotal, 0);
    assert.equal(result.won, false);
});

test('replayDailyGame détecte des temps de réponse suspects (triche probable)', () => {
    const orderedDates = [1000, 1100, 1200, 1300, 1400];
    const rounds = [
        { slotIndex: 0, elapsedMs: 5 },
        { slotIndex: 0, elapsedMs: 5 },
        { slotIndex: 0, elapsedMs: 5 },
        { slotIndex: 0, elapsedMs: 5 }
    ];
    const result = replayDailyGame(orderedDates, rounds);
    assert.equal(result.suspicious, true);
});
