// Tests unitaires sur js/dailyEngine.js — le moteur partagé client/serveur
// du Défi du jour (tirage déterministe + rejeu anti-triche du score,
// utilisé aussi par api/scores.js). Ce module expose déjà un
// `module.exports` (UMD), il est donc directement testable ici.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
    getDailySeedString,
    getWeeklySeedString,
    getCenturyKey,
    pickDailyItems,
    replayDailyGame,
    EXCLUDED_THEME_IDS
} = require('../js/dailyEngine.js');

test('getDailySeedString est stable avant/après la frontière 05h00 UTC', () => {
    // Un instant juste avant 5h UTC appartient encore au jour précédent.
    const before = getDailySeedString(new Date('2026-03-10T04:59:00Z'));
    const after = getDailySeedString(new Date('2026-03-10T05:00:00Z'));
    assert.equal(before, '2026-03-09');
    assert.equal(after, '2026-03-10');
});

test('getWeeklySeedString renvoie une semaine ISO stable sur toute la semaine', () => {
    // Lundi 9 mars 2026 (juste après la frontière 05h00 UTC) à dimanche 15
    // mars 2026 (juste avant la frontière suivante) appartiennent tous à la
    // même semaine ISO 2026-W11.
    const monday = getWeeklySeedString(new Date('2026-03-09T05:00:00Z'));
    const wednesday = getWeeklySeedString(new Date('2026-03-11T12:00:00Z'));
    const sundayNight = getWeeklySeedString(new Date('2026-03-16T04:59:00Z'));
    assert.equal(monday, '2026-W11');
    assert.equal(wednesday, '2026-W11');
    assert.equal(sundayNight, '2026-W11');
});

test('getWeeklySeedString bascule à la frontière 05h00 UTC du lundi suivant', () => {
    const before = getWeeklySeedString(new Date('2026-03-16T04:59:00Z'));
    const after = getWeeklySeedString(new Date('2026-03-16T05:00:00Z'));
    assert.equal(before, '2026-W11');
    assert.equal(after, '2026-W12');
});

test('EXCLUDED_THEME_IDS exclut le thème du calendrier hébraïque', () => {
    assert.ok(EXCLUDED_THEME_IDS.includes('thm_histoire_juive_hebraique'));
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

test('pickDailyItems : Défi hebdomadaire (count=30, seedPrefix dédié) est déterministe et distinct du quotidien', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ date: 1000 + i * 13 }));
    const week = '2026-W11';

    const a = pickDailyItems(items, week, 30, undefined, 'historiaxe_weekly_');
    const b = pickDailyItems(items, week, 30, undefined, 'historiaxe_weekly_');
    assert.deepEqual(a, b, 'même semaine ISO => même tirage pour tout le monde');
    assert.equal(a.length, 30);

    // Même chaîne-graine (par coïncidence dans ce test), préfixe différent
    // (quotidien vs hebdomadaire) : les deux tirages ne doivent pas
    // coïncider, pour bien isoler les deux défis l'un de l'autre.
    const daily = pickDailyItems(items, week, 10); // seedPrefix par défaut = 'historiaxe_daily_'
    assert.notDeepEqual(a.slice(0, 10), daily);
});

test('pickDailyItems (hebdomadaire) change de tirage d\'une semaine ISO à l\'autre', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ date: 1000 + i * 13 }));
    const week1 = pickDailyItems(items, '2026-W11', 30, undefined, 'historiaxe_weekly_');
    const week2 = pickDailyItems(items, '2026-W12', 30, undefined, 'historiaxe_weekly_');
    assert.notDeepEqual(week1, week2);
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

test('replayDailyGame : gère aussi un tirage de 30 dates (Défi hebdomadaire), pas seulement 10', () => {
    // roundsTotal doit rester dérivé de la longueur de orderedDates (aucune
    // valeur "10" codée en dur dans le moteur) : ici 30 dates => 29 manches.
    const orderedDates = Array.from({ length: 30 }, (_, i) => 1500 + i * 10);
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
    assert.equal(result.roundsTotal, 29);
    assert.equal(result.roundsPlayed, 29);
    assert.equal(result.won, true);
    assert.ok(result.score > 0);
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
