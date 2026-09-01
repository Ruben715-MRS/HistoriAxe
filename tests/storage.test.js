// Tests unitaires sur les fonctions pures de js/storage.js (dates/semaines
// ISO) — le reste du fichier touche localStorage et n'est pas testé ici (voir
// le bloc `module.exports` en bas de storage.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const { getIsoWeekString, getLocalDateString, getDaysDifference, getTodayStringUTC } = require('../js/storage.js');

// --- getIsoWeekString ---
// Référence croisée avec les semaines ISO 8601 connues (ex: iso8601-weeknum.appspot.com).

test('getIsoWeekString reconnaît des dates de référence connues', () => {
    assert.equal(getIsoWeekString(new Date('2026-01-01T12:00:00')), '2026-W01'); // jeudi
    assert.equal(getIsoWeekString(new Date('2025-12-29T12:00:00')), '2026-W01'); // lundi de la même semaine ISO
    assert.equal(getIsoWeekString(new Date('2025-12-28T12:00:00')), '2025-W52'); // dimanche, semaine précédente
    assert.equal(getIsoWeekString(new Date('2026-09-01T12:00:00')), '2026-W36');
});

test('getIsoWeekString couvre la semaine 53 quand elle existe (ex: 2020)', () => {
    assert.equal(getIsoWeekString(new Date('2020-12-31T12:00:00')), '2020-W53');
});

test('getIsoWeekString est stable du lundi au dimanche d\'une même semaine', () => {
    const monday = getIsoWeekString(new Date('2026-09-07T08:00:00'));
    for (let i = 0; i < 7; i++) {
        const d = new Date('2026-09-07T08:00:00');
        d.setDate(d.getDate() + i);
        assert.equal(getIsoWeekString(d), monday, `jour +${i} devrait être dans la même semaine ISO`);
    }
});

// --- getLocalDateString ---

test('getLocalDateString formate en YYYY-MM-DD avec zero-padding', () => {
    assert.equal(getLocalDateString(new Date(2026, 0, 5)), '2026-01-05'); // 5 janvier (mois 0-indexé)
    assert.equal(getLocalDateString(new Date(2026, 11, 25)), '2026-12-25');
});

// --- getDaysDifference / getTodayStringUTC (déjà en place, non testées ailleurs) ---

test('getDaysDifference calcule un écart de jours simple', () => {
    assert.equal(getDaysDifference('2026-01-01', '2026-01-02'), 1);
    assert.equal(getDaysDifference('2026-01-01', '2026-01-01'), 0);
    assert.equal(getDaysDifference('2026-01-05', '2026-01-01'), -4);
});

test('getTodayStringUTC renvoie une date au format YYYY-MM-DD', () => {
    assert.match(getTodayStringUTC(), /^\d{4}-\d{2}-\d{2}$/);
});
