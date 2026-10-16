const test = require('node:test');
const assert = require('node:assert/strict');
const SRS = require('../js/srs.js');

const DAY = 24 * 3600 * 1000;
// 12 h locales : loin de minuit, donc insensible aux changements d'heure.
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0).getTime();

test('les intervalles croissent : 1, 3, 7, 14, 30 jours', () => {
    assert.deepEqual(SRS.INTERVAL_DAYS, [1, 3, 7, 14, 30]);
    assert.equal(SRS.intervalDays(0), 1);
    assert.equal(SRS.intervalDays(9), 30);
});

test('l\'échéance tombe à minuit locale : révisé hier à 23 h, dû dès ce matin', () => {
    const entry = { box: 1, lastReviewed: at(2026, 3, 9, 23) };
    assert.ok(SRS.isDue(entry, at(2026, 3, 10, 7)));
    assert.ok(!SRS.isDue(entry, at(2026, 3, 9, 23.9 - 0)));
});

test('une réussite avant l\'échéance ne change rien (plus de maîtrise en cinq minutes)', () => {
    let e = SRS.applyResult(null, true, at(2026, 3, 10)); // première réussite : boîte 2
    assert.equal(e.box, 2);
    const first = e.lastReviewed;
    for (let i = 1; i <= 5; i++) e = SRS.applyResult(e, true, at(2026, 3, 10) + i * 60000);
    assert.equal(e.box, 2, 'toujours en boîte 2');
    assert.equal(e.lastReviewed, first, 'l\'échéance n\'est pas repoussée');
    assert.equal(e.successCount, 6);
});

test('une réussite à l\'échéance monte d\'une boîte, jusqu\'à la boîte 5', () => {
    let e = { box: 1, lastReviewed: at(2026, 1, 1), failCount: 0, successCount: 0 };
    let now = at(2026, 1, 1);
    for (const attendu of [2, 3, 4, 5, 5]) {
        now = SRS.dueAt(e) + 12 * 3600 * 1000;
        e = SRS.applyResult(e, true, now);
        assert.equal(e.box, attendu);
    }
});

test('un échec ramène en boîte 1, même avant l\'échéance, et revient le lendemain', () => {
    const e = { box: 4, lastReviewed: at(2026, 3, 1), failCount: 0, successCount: 3 };
    const after = SRS.applyResult(e, false, at(2026, 3, 10));
    assert.equal(after.box, 1);
    assert.equal(after.failCount, 1);
    assert.ok(!SRS.isDue(after, at(2026, 3, 10, 18)));
    assert.ok(SRS.isDue(after, at(2026, 3, 11, 7)));
});

test('les entrées déjà enregistrées (sans échéance stockée) restent valides', () => {
    const legacy = { box: 5, lastReviewed: at(2026, 1, 1), failCount: 2, successCount: 9, incorrect: 1 };
    assert.ok(SRS.isDue(legacy, at(2026, 2, 5)));
    assert.ok(!SRS.isDue(legacy, at(2026, 1, 20)));
    assert.equal(SRS.applyResult(legacy, true, at(2026, 2, 5)).incorrect, 1);
    // Jamais révisé : dû tout de suite.
    assert.ok(SRS.isDue({ box: 1, lastReviewed: 0 }, at(2026, 1, 1)));
});

test('le plus fragile d\'abord, puis la plus ancienne échéance', () => {
    const a = { entry: { box: 3, lastReviewed: at(2026, 1, 1) } };
    const b = { entry: { box: 1, lastReviewed: at(2026, 2, 1) } };
    const c = { entry: { box: 1, lastReviewed: at(2026, 1, 15) } };
    assert.deepEqual([a, b, c].sort(SRS.compareUrgency), [c, b, a]);
});

test('summarize : dû, en retard (avant ce matin), et ce qui arrive demain', () => {
    const now = at(2026, 3, 10, 12);
    const entries = [
        { box: 1, lastReviewed: at(2026, 3, 9) },   // dû ce matin, pas en retard
        { box: 1, lastReviewed: at(2026, 3, 1) },   // en retard
        { box: 2, lastReviewed: at(2026, 3, 8) },   // dû le 11 : demain
        { box: 5, lastReviewed: at(2026, 3, 8) }    // dû dans un mois
    ];
    assert.deepEqual(SRS.summarize(entries, now), { due: 2, overdue: 1, tomorrow: 1 });
});

test('planReminders : un rappel par jour à venir, avec le nombre dû CE jour-là, au-dessus du seuil', () => {
    const now = at(2026, 3, 10, 9); // 9 h : le rappel de 18 h 30 d'aujourd'hui est encore à venir
    // 6 événements dus ce matin (révisés le 9, boîte 1) ; 4 de plus dus le 11 (révisés le 10, boîte 1).
    const entries = [
        ...Array.from({ length: 6 }, () => ({ box: 1, lastReviewed: at(2026, 3, 9) })),
        ...Array.from({ length: 4 }, () => ({ box: 1, lastReviewed: at(2026, 3, 10, 8) }))
    ];
    const plan = SRS.planReminders(entries, now);
    assert.deepEqual(plan.map((p) => p.count), [6, 10, 10]);
    assert.deepEqual(plan.map((p) => [p.at.getDate(), p.at.getHours(), p.at.getMinutes()]), [[10, 18, 30], [11, 18, 30], [12, 18, 30]]);
});

test('planReminders : rien sous le seuil, pas de rappel dans le passé, horizon de trois jours', () => {
    const now = at(2026, 3, 10, 20); // 20 h : l'heure d'aujourd'hui est passée
    const few = Array.from({ length: 4 }, () => ({ box: 1, lastReviewed: at(2026, 3, 1) }));
    assert.deepEqual(SRS.planReminders(few, now), []);
    const many = Array.from({ length: 12 }, () => ({ box: 1, lastReviewed: at(2026, 3, 1) }));
    const plan = SRS.planReminders(many, now);
    assert.equal(plan.length, 2, 'demain et après-demain seulement');
    assert.ok(plan.every((p) => p.at.getTime() > now));
    assert.equal(SRS.planReminders(many, now, { days: 7 }).length, 6);
});
