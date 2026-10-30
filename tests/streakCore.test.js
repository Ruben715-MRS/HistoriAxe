// La série quotidienne : le journal des jours joués et les sept pastilles de la carte (js/streakCore.js),
// plus l'enregistrement en date locale et la fusion entre appareils (js/storage.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/streakCore.js');

const store = {};
global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
};
const St = require('../js/storage.js');

function reset(data) {
    Object.keys(store).forEach((k) => delete store[k]);
    if (data) store[St.STREAK_KEY] = JSON.stringify(data);
}
const today = () => St.getStreakDayString();
const ago = (n) => S.shiftDay(today(), -n);

test('windowFor : cinq jours d\'avant, aujourd\'hui sixième, demain septième et toujours vide', () => {
    const w = S.windowFor('2026-10-30', ['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29']);
    assert.deepEqual(w.map((s) => s.date), ['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']);
    assert.deepEqual(w.map((s) => s.state), ['done', 'done', 'done', 'done', 'done', 'today', 'future']);
});

test('windowFor : aujourd\'hui coché une fois la partie finie, un jour manqué reste vide, demain jamais coché', () => {
    const w = S.windowFor('2026-10-30', ['2026-10-25', '2026-10-27', '2026-10-29', '2026-10-30', '2026-10-31']);
    assert.deepEqual(w.map((s) => s.state), ['done', 'missed', 'done', 'missed', 'done', 'todayDone', 'future']);
});

test('windowFor : passe un changement de mois et d\'année, avec le bon jour de la semaine', () => {
    const w = S.windowFor('2027-01-02', []);
    assert.equal(w[0].date, '2026-12-28');
    assert.equal(w[6].date, '2027-01-03');
    assert.equal(w[5].weekday, 6); // samedi 2 janvier 2027
});

test('normalizeDays / addDay : sans doublon, trié, borné, dates invalides écartées', () => {
    assert.deepEqual(S.normalizeDays(['2026-01-02', 'x', '2026-01-01', '2026-01-02', 5]), ['2026-01-01', '2026-01-02']);
    let days = [];
    for (let i = 0; i < 60; i++) days = S.addDay(days, S.shiftDay('2026-01-01', i));
    assert.equal(days.length, S.MAX_DAYS);
    assert.equal(days[days.length - 1], S.shiftDay('2026-01-01', 59));
});

test('backfillDays : une ancienne série sans journal en déduit ses jours', () => {
    assert.deepEqual(S.backfillDays({ currentStreak: 3, lastPlayedDate: '2026-10-30' }), ['2026-10-28', '2026-10-29', '2026-10-30']);
    assert.deepEqual(S.backfillDays({ currentStreak: 0, lastPlayedDate: null }), []);
    assert.equal(S.backfillDays({ currentStreak: 500, lastPlayedDate: '2026-10-30' }).length, S.MAX_DAYS);
});

test('streakRecordToday : première partie du jour = nouveau jour, la deuxième non', () => {
    reset();
    const first = St.streakRecordToday();
    assert.equal(first.isNewDay, true);
    assert.equal(first.currentStreak, 1);
    assert.deepEqual(first.days, [today()]);
    const second = St.streakRecordToday();
    assert.equal(second.isNewDay, false);
    assert.equal(second.currentStreak, 1);
    assert.equal(JSON.parse(store[St.STREAK_KEY]).isNewDay, undefined, 'isNewDay ne s\'enregistre pas');
});

test('streakRecordToday : la veille prolonge la série, un trou la remet à 1 mais garde les jours', () => {
    reset({ currentStreak: 4, maxStreak: 9, lastPlayedDate: ago(1), days: [ago(4), ago(3), ago(2), ago(1)] });
    const next = St.streakRecordToday();
    assert.equal(next.currentStreak, 5);
    assert.equal(next.maxStreak, 9);
    assert.equal(next.days.length, 5);

    reset({ currentStreak: 4, maxStreak: 9, lastPlayedDate: ago(3), days: [ago(6), ago(5), ago(4), ago(3)] });
    const broken = St.streakRecordToday();
    assert.equal(broken.currentStreak, 1);
    assert.deepEqual(broken.days, [ago(6), ago(5), ago(4), ago(3), today()]);
});

test('streakRecordToday : une série d\'avant le journal est migrée sans rien perdre', () => {
    reset({ currentStreak: 79, maxStreak: 79, lastPlayedDate: ago(1) });
    const next = St.streakRecordToday();
    assert.equal(next.currentStreak, 80);
    assert.equal(next.isNewDay, true);
    const w = S.windowFor(today(), next.days);
    assert.deepEqual(w.map((s) => s.state), ['done', 'done', 'done', 'done', 'done', 'todayDone', 'future']);
});

test('streakRecordToday : horloge revenue en arrière (voyage vers l\'ouest) = rien ne change', () => {
    reset({ currentStreak: 6, maxStreak: 6, lastPlayedDate: S.shiftDay(today(), 1), days: [today()] });
    const r = St.streakRecordToday();
    assert.equal(r.isNewDay, false);
    assert.equal(r.currentStreak, 6);
    assert.equal(JSON.parse(store[St.STREAK_KEY]).lastPlayedDate, S.shiftDay(today(), 1));
});

test('getStreakCount : la série vit jusqu\'à la fin de demain-de-la-dernière-partie, puis retombe à 0', () => {
    reset({ currentStreak: 7, maxStreak: 7, lastPlayedDate: ago(1) });
    assert.equal(St.getStreakCount(), 7);
    reset({ currentStreak: 7, maxStreak: 7, lastPlayedDate: ago(2) });
    assert.equal(St.getStreakCount(), 0);
});

test('mergeStreaks : les jours joués sur les deux appareils sont réunis', () => {
    const a = { currentStreak: 2, maxStreak: 2, lastPlayedDate: '2026-10-30', days: ['2026-10-29', '2026-10-30'] };
    const b = { currentStreak: 1, maxStreak: 5, lastPlayedDate: '2026-10-28', days: ['2026-10-26', '2026-10-28'] };
    const m = St.mergeStreaks(a, b, 'lastPlayedDate');
    assert.deepEqual(m.days, ['2026-10-26', '2026-10-28', '2026-10-29', '2026-10-30']);
    assert.equal(m.currentStreak, 2);
    assert.equal(m.maxStreak, 5);
    assert.equal(St.mergeStreaks({ currentStreak: 1, lastPlayedWeek: '2026-W44' }, { currentStreak: 2, lastPlayedWeek: '2026-W43' }, 'lastPlayedWeek').days, undefined);
});
