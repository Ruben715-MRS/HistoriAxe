// Fusion de la progression de deux appareils d'un même compte (js/storage.js:
// mergeSyncableStates, appelée par js/app.js: syncProgress). Règle : rien ne
// se perd, et la série en cours est celle de l'appareil qui a joué en dernier.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
    mergeSyncableStates, mergeValues, STREAK_KEY, WEEKLY_CHALLENGE_STREAK_KEY
} = require('../js/storage.js');

test('série quotidienne : la plus récente gagne, le record est le meilleur des deux', () => {
    const local = { [STREAK_KEY]: { currentStreak: 3, maxStreak: 3, lastPlayedDate: '2026-10-20' } };
    const cloud = { [STREAK_KEY]: { currentStreak: 12, maxStreak: 15, lastPlayedDate: '2026-10-21' } };
    assert.deepEqual(mergeSyncableStates(local, cloud)[STREAK_KEY],
        { currentStreak: 12, maxStreak: 15, lastPlayedDate: '2026-10-21' });
    assert.deepEqual(mergeSyncableStates(cloud, local)[STREAK_KEY],
        { currentStreak: 12, maxStreak: 15, lastPlayedDate: '2026-10-21' });
});

test('série quotidienne : même jour sur les deux appareils → la plus longue', () => {
    const a = { [STREAK_KEY]: { currentStreak: 2, maxStreak: 9, lastPlayedDate: '2026-10-21' } };
    const b = { [STREAK_KEY]: { currentStreak: 7, maxStreak: 7, lastPlayedDate: '2026-10-21' } };
    assert.deepEqual(mergeSyncableStates(a, b)[STREAK_KEY],
        { currentStreak: 7, maxStreak: 9, lastPlayedDate: '2026-10-21' });
});

test('série hebdomadaire : comparée sur lastPlayedWeek', () => {
    const a = { [WEEKLY_CHALLENGE_STREAK_KEY]: { currentStreak: 4, maxStreak: 4, lastPlayedWeek: '2026-W43' } };
    const b = { [WEEKLY_CHALLENGE_STREAK_KEY]: { currentStreak: 9, maxStreak: 9, lastPlayedWeek: '2026-W40' } };
    assert.deepEqual(mergeSyncableStates(a, b)[WEEKLY_CHALLENGE_STREAK_KEY],
        { currentStreak: 4, maxStreak: 9, lastPlayedWeek: '2026-W43' });
});

test('une clé présente d\'un seul côté est conservée', () => {
    const merged = mergeSyncableStates({ a: { x: 1 } }, { b: [1, 2] });
    assert.deepEqual(merged, { a: { x: 1 }, b: [1, 2] });
});

test('nombres → maximum, listes → union, booléens → ou', () => {
    assert.deepEqual(
        mergeValues({ xp: 120, coins: 5, badges: ['a', 'b'], done: false }, { xp: 90, coins: 40, badges: ['b', 'c'], done: true }),
        { xp: 120, coins: 40, badges: ['a', 'b', 'c'], done: true }
    );
});

test('SRS : l\'entrée révisée le plus récemment est gardée entière', () => {
    const local = { ev1: { box: 4, lastReviewed: 1000, failCount: 0, successCount: 5 } };
    const cloud = { ev1: { box: 1, lastReviewed: 2000, failCount: 3, successCount: 2 } };
    assert.deepEqual(mergeValues(local, cloud), cloud);
});

test('null ou absent d\'un côté → l\'autre valeur', () => {
    assert.deepEqual(mergeSyncableStates(null, { k: 1 }), { k: 1 });
    assert.equal(mergeValues(null, 3), 3);
    assert.equal(mergeValues(3, undefined), 3);
});
