// Fusion de la progression de deux appareils d'un même compte (js/storage.js:
// mergeSyncableStates, appelée par js/app.js: syncProgress). Règle : rien ne
// se perd, et la série en cours est celle de l'appareil qui a joué en dernier.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
    mergeSyncableStates, mergeValues, STREAK_KEY, WEEKLY_CHALLENGE_STREAK_KEY, GEOQUIZ_KEY, mergeGeoQuiz
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

test('quiz des pays : le meilleur score de chaque réglage, l\'historique réuni sans doublon', () => {
    const game = (at, form, score) => ({ at, form, zone: 'world', level: 'easy', length: 10, timer: 0, score, correct: 5, total: 10 });
    const a = { v: 1, best: { 'qcm|world|easy|10|0': { score: 700, correct: 7, total: 10, at: 3 }, 'flag|world|easy|10|0': { score: 300, correct: 3, total: 10, at: 2 } },
        history: [game(3, 'qcm', 700), game(2, 'flag', 300)] };
    const b = { v: 1, best: { 'qcm|world|easy|10|0': { score: 900, correct: 9, total: 10, at: 5 }, 'map|world|easy|10|0': { score: 500, correct: 5, total: 10, at: 4 } },
        history: [game(5, 'qcm', 900), game(4, 'map', 500), game(3, 'qcm', 700)] };
    const merged = mergeSyncableStates({ [GEOQUIZ_KEY]: a }, { [GEOQUIZ_KEY]: b })[GEOQUIZ_KEY];
    assert.equal(merged.best['qcm|world|easy|10|0'].score, 900, 'le meilleur des deux');
    assert.equal(merged.best['flag|world|easy|10|0'].score, 300, 'un réglage d\'un seul côté est conservé');
    assert.equal(merged.best['map|world|easy|10|0'].score, 500);
    assert.deepEqual(merged.history.map(g => g.at), [5, 4, 3, 2], 'sans doublon, le plus récent d\'abord');
    // Dans les deux sens.
    assert.deepEqual(mergeGeoQuiz(b, a).best, merged.best);
});

test('quiz des pays : un seul côté, ou un côté abîmé, ne perd rien', () => {
    const a = { v: 1, best: { 'qcm|world|easy|10|0': { score: 100, correct: 1, total: 10, at: 1 } }, history: [] };
    assert.deepEqual(mergeGeoQuiz(a, undefined), a);
    assert.deepEqual(mergeGeoQuiz(null, a), a);
    const merged = mergeGeoQuiz(a, { best: 'x', history: 'y' });
    assert.equal(merged.best['qcm|world|easy|10|0'].score, 100);
    assert.deepEqual(merged.history, []);
});

test('quiz des pays : l\'historique est limité à 50 parties', () => {
    const history = n => Array.from({ length: n }, (_, i) => ({ at: i + 1, form: 'qcm', score: 10 }));
    const merged = mergeGeoQuiz({ v: 1, best: {}, history: history(40) }, { v: 1, best: {}, history: history(60).map(g => Object.assign({}, g, { at: g.at + 1000 })) });
    assert.equal(merged.history.length, 50);
    assert.equal(merged.history[0].at, 1060);
});

test('quiz des pays : la maîtrise garde le plus grand compte, sans double comptage ; le défi du jour garde le meilleur score du jour', () => {
    const a = { v: 1, best: {}, history: [], countries: { FRA: { n: 5, ok: 4, last: 10, run: '11101' }, DEU: { n: 1, ok: 0, last: 3, run: '0' } }, daily: { '2026-05-01': { score: 700, correct: 7, total: 10 } } };
    const b = { v: 1, best: {}, history: [], countries: { FRA: { n: 6, ok: 4, last: 20, run: '11010' }, ITA: { n: 2, ok: 2, last: 4, run: '11' } }, daily: { '2026-05-01': { score: 900, correct: 9, total: 10 }, '2026-05-02': { score: 100, correct: 1, total: 10 } } };
    const merged = mergeGeoQuiz(a, b);
    assert.deepEqual(merged.countries.FRA, { n: 6, ok: 4, last: 20, run: '11010' }, 'les dernières réponses de l\'appareil le plus récent');
    assert.equal(merged.countries.DEU.n, 1);
    assert.equal(merged.countries.ITA.n, 2);
    assert.equal(merged.daily['2026-05-01'].score, 900);
    assert.equal(merged.daily['2026-05-02'].score, 100);
    assert.deepEqual(mergeGeoQuiz(b, a).countries, merged.countries, 'dans les deux sens');
    assert.deepEqual(mergeGeoQuiz(merged, a).countries, merged.countries, 'fusionner deux fois ne change rien');
});

test('quiz des pays : les statistiques par forme prennent le maximum de chaque champ, sans double comptage', () => {
    const a = { v: 1, best: {}, history: [], forms: { qcm: { games: 5, correct: 30, total: 50, best: 800, streak: 4 } } };
    const b = { v: 1, best: {}, history: [], forms: { qcm: { games: 3, correct: 25, total: 30, best: 900, streak: 2 }, flag: { games: 1, correct: 2, total: 10, best: 200, streak: 1 } } };
    const merged = mergeGeoQuiz(a, b);
    assert.deepEqual(merged.forms.qcm, { games: 5, correct: 30, total: 50, best: 900, streak: 4 });
    assert.deepEqual(merged.forms.flag, { games: 1, correct: 2, total: 10, best: 200, streak: 1 });
    assert.deepEqual(mergeGeoQuiz(merged, a).forms, merged.forms, 'fusionner deux fois ne change rien');
});
