// Tests unitaires sur les fonctions pures de js/storage.js (dates/semaines
// ISO) — le reste du fichier touche localStorage et n'est pas testé ici (voir
// le bloc `module.exports` en bas de storage.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const {
    getIsoWeekString, getLocalDateString, getDaysDifference, getTodayStringUTC,
    DEFAULT_SETTINGS, ROUND_LENGTH_CHOICES, resolveRoundLength, roundLengthChoicesFor
} = require('../js/storage.js');

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

// --- LONGUEUR DE LA MANCHE ---
// Jusqu'ici une partie valait le thème entier. Médiane de 18 événements, donc
// sans conséquence la plupart du temps — mais « Histoire de France » en compte
// 217 et « Inventions et découvertes » 400, que 3 vies rendent impossibles à
// terminer. Ces tests tiennent les deux bords : borner les gros thèmes sans
// toucher aux petits.

test('par défaut, une manche borne les gros thèmes et laisse les petits intacts', () => {
    assert.equal(DEFAULT_SETTINGS.roundLength, 20);
    // Le thème médian (18 événements) ne bouge pas.
    assert.equal(resolveRoundLength(undefined, 18), 18);
    // « Histoire de France » cesse d'être une partie de 217 placements.
    assert.equal(resolveRoundLength(undefined, 217), 20);
});

test('« Tout » rend bien le thème entier', () => {
    assert.equal(resolveRoundLength(0, 217), 217);
    assert.equal(resolveRoundLength(0, 6), 6);
});

test('une manche ne dépasse jamais le vivier disponible', () => {
    // Sinon le décompte affiché en cours de partie (« 1 / 20 ») mentirait.
    assert.equal(resolveRoundLength(20, 12), 12);
    assert.equal(resolveRoundLength(10, 4), 4);
    assert.equal(resolveRoundLength(20, 0), 0);
    // « 50 » sur un thème plus petit joue le thème entier, pas 50 cartes
    // fantômes.
    assert.equal(resolveRoundLength(50, 30), 30);
});

test('« 50 » joue bien 50 événements sur un thème assez grand', () => {
    assert.equal(resolveRoundLength(50, 217), 50);
    assert.equal(resolveRoundLength(50, 400), 50);
});

test('un réglage aberrant retombe sur la valeur par défaut', () => {
    [null, 'beaucoup', -5, NaN].forEach(mauvais => {
        assert.equal(resolveRoundLength(mauvais, 217), DEFAULT_SETTINGS.roundLength,
            `réglage ${String(mauvais)} : devrait retomber sur la valeur par défaut`);
    });
});

test('le sélecteur ne propose que des longueurs qui changent quelque chose', () => {
    // Un thème de 8 événements : les quatre choix y joueraient les 8, le
    // sélecteur se cache donc entièrement.
    assert.deepEqual(roundLengthChoicesFor(8), []);
    // 18 événements : « 20 » et « 50 » n'apporteraient rien de plus que « Tout ».
    assert.deepEqual(roundLengthChoicesFor(18), [10, 0]);
    // 40 événements : « 20 » a un sens, mais « 50 » dépasse le thème entier —
    // même règle que « 20 » sur un thème de 18.
    assert.deepEqual(roundLengthChoicesFor(40), [10, 20, 0]);
    // 217 : les quatre ont un sens, dans l'ordre 10 < 20 < 50 < Tout.
    assert.deepEqual(roundLengthChoicesFor(217), [10, 20, 50, 0]);
});

test('« 50 » n’apparaît jamais à 50 événements pile, seulement au-delà', () => {
    // À 50 événements exactement, choisir « 50 » jouerait très exactement la
    // même partie que « Tout » : la règle qui écarte déjà 10 et 20 dans ce
    // cas s'applique pareil à 50, pour ne jamais présenter deux boutons
    // strictement équivalents.
    assert.deepEqual(roundLengthChoicesFor(50), [10, 20, 0]);
    assert.deepEqual(roundLengthChoicesFor(51), [10, 20, 50, 0]);
});

test('« Tout » ferme toujours la liste des choix', () => {
    ROUND_LENGTH_CHOICES.filter(n => n > 0).forEach(n => {
        const choix = roundLengthChoicesFor(n * 100);
        assert.equal(choix[choix.length - 1], 0);
    });
});
