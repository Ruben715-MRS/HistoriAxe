// Les modes du Mode Classe (js/classModes.js) : questions déterministes, rejeu, notation sur 100 par manche.

const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/classModes.js');

// Un paquet de 8 cartes, dates distinctes, dans l'ordre de jeu (la première est l'ancre).
const deck = [1500, 1600, 1700, 1800, 1900, 1950, 1980, 2000].map((date, i) => ({ id: 'e' + i, date }));

test('les modes choisis : sans doublon ni inconnu, la frise à défaut', () => {
    assert.deepEqual(M.sanitizeModes(['ecart', 'frise', 'ecart', 'zzz']), ['ecart', 'frise']);
    assert.deepEqual(M.sanitizeModes([]), ['frise']);
    assert.deepEqual(M.sanitizeModes(undefined), ['frise']);
    assert.deepEqual(M.sanitizeModes(['nope']), ['frise']);
});

test('le nombre de manches : n - 1, sauf « écart » qui prend les cartes deux à deux', () => {
    assert.equal(M.roundsFor('frise', 8), 7);
    assert.equal(M.roundsFor('fil', 8), 7);
    assert.equal(M.roundsFor('avap', 8), 7);
    assert.equal(M.roundsFor('ecart', 8), 4);
    assert.equal(M.totalRounds(['frise', 'ecart'], 8), 11);
});

test('Avant / Après : l\'adversaire n\'est jamais la carte elle-même, et les côtés alternent', () => {
    for (let n = 6; n <= 40; n++) {
        const d = Array.from({ length: n }, (_, i) => ({ id: 'c' + i, date: i * 10 }));
        for (let r = 0; r < n - 1; r++) {
            const q = M.avapPair(d, r);
            assert.notEqual(q.left.id, q.right.id, `n=${n} r=${r}`);
            assert.ok([q.left.id, q.right.id].includes('c' + (r + 1)));
        }
    }
    assert.equal(M.avapPair(deck, 0).left.id, 'e1');
    assert.equal(M.avapPair(deck, 1).right.id, 'e2');
});

test('Avant / Après : 100 points pour le plus ancien, 0 sinon', () => {
    const q0 = M.avapPair(deck, 0);
    const olderIsLeft = q0.left.date < q0.right.date;
    const bon = M.replayMode('avap', deck, [{ choice: olderIsLeft ? 0 : 1 }]);
    const faux = M.replayMode('avap', deck, [{ choice: olderIsLeft ? 1 : 0 }]);
    assert.deepEqual([bon.points, bon.results], [100, [true]]);
    assert.deepEqual([faux.points, faux.results], [0, [false]]);
    // Un choix invalide n'est pas une réponse : la manche n'est pas comptée.
    assert.deepEqual(M.replayMode('avap', deck, [{ choice: 2 }]).results, []);
});

test('Le fil du temps : l\'année exacte vaut 100, l\'écart retire des points', () => {
    const exact = M.replayMode('fil', deck, [{ year: 1600 }]);
    assert.deepEqual([exact.points, exact.results], [100, [true]]);
    const proche = M.replayMode('fil', deck, [{ year: 1610 }, { year: -5000 }]);
    assert.deepEqual(proche.results, [false, false]);
    assert.ok(proche.points > 0 && proche.points < 100, 'un écart de 10 ans sur 500 : presque tout, pas tout');
    assert.equal(M.replayMode('fil', deck, [{ year: 'abc' }]).results.length, 0);
});

test('Trouve l\'écart : 100, 80, 60… selon l\'essai, 0 après cinq essais ratés ; manche non terminée = non comptée', () => {
    const gap = 100; // cartes 0 et 1 : 1500 et 1600
    assert.equal(M.replayMode('ecart', deck, [{ guesses: [100] }]).points, 100);
    assert.equal(M.replayMode('ecart', deck, [{ guesses: [50, 100] }]).points, 80);
    assert.equal(M.replayMode('ecart', deck, [{ guesses: [1, 2, 3, 4, gap] }]).points, 20);
    const rate = M.replayMode('ecart', deck, [{ guesses: [1, 2, 3, 4, 5] }]);
    assert.deepEqual([rate.points, rate.results], [0, [false]]);
    assert.deepEqual(M.replayMode('ecart', deck, [{ guesses: [1, 2] }]).results, [], 'encore en cours');
    // Les propositions après la bonne ou au-delà de cinq ne comptent pas.
    assert.equal(M.replayMode('ecart', deck, [{ guesses: [100, 5, 5] }]).points, 100);
});

test('la frise : une partie parfaite vaut 100 par manche, comme les autres modes', () => {
    // Placer chaque carte au bon endroit : la carte piochée suit l'ordre du paquet (dates croissantes ici),
    // donc toujours à la fin de la frise déjà posée.
    const parfait = deck.slice(1).map((_, r) => ({ slotIndex: r + 1, elapsedMs: 100 }));
    const res = M.replayMode('frise', deck, parfait);
    assert.equal(res.results.every(Boolean), true);
    assert.equal(res.points, 100 * 7, 'normalisé : le bonus de vitesse et le combo ne dépassent pas 100 par manche');
    const lent = M.replayMode('frise', deck, deck.slice(1).map((_, r) => ({ slotIndex: r + 1, elapsedMs: 60000 })));
    assert.ok(lent.points < res.points && lent.points > 0);
});

test('la séance : les points s\'additionnent d\'un mode à l\'autre ; terminée quand tous les modes le sont', () => {
    const modes = ['fil', 'avap'];
    const filComplet = deck.slice(1).map((c) => ({ year: c.date }));
    let s = M.replaySession(modes, deck, { fil: filComplet });
    assert.equal(s.points, 700);
    assert.equal(s.finished, false);
    assert.equal(s.answered, 7);
    const avapLog = deck.slice(1).map((_, r) => { const q = M.avapPair(deck, r); return { choice: q.left.date < q.right.date ? 0 : 1 }; });
    s = M.replaySession(modes, deck, { fil: filComplet, avap: avapLog });
    assert.equal(s.points, 1400);
    assert.equal(s.finished, true);
    assert.equal(s.correct, 14);
    assert.deepEqual(Object.keys(s.results), modes);
});
