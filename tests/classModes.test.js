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
    assert.equal(M.roundsFor('frise', deck), 7);
    assert.equal(M.roundsFor('fil', deck), 7);
    assert.equal(M.roundsFor('avap', deck), 7);
    assert.equal(M.roundsFor('quiz', deck), 7);
    assert.equal(M.roundsFor('ecart', deck), 4);
    assert.equal(M.totalRounds(['frise', 'ecart'], deck), 11);
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

// --- Les modes de la deuxième étape : quiz, remise en ordre, curseur, blitz, intrus ---------------------------

// Un paquet plus large, avec axes, pour que les cinq modes aient de quoi construire leurs manches.
const big = Array.from({ length: 20 }, (_, i) => ({ id: 'b' + i, date: 1000 + i * 37, axe: ['A', 'B', 'C'][i % 3] }));

test('les questions sont les mêmes à chaque appel : le paquet seul les détermine', () => {
    for (const mode of M.MODE_IDS) {
        assert.deepEqual(M.plan(mode, big), M.plan(mode, big), mode);
        // La donnée « axe » ou « titre » en plus ne change rien : seuls identifiants et dates comptent.
        const avecTitres = big.map((c) => ({ ...c, titre: 'X' + c.id }));
        assert.deepEqual(M.plan(mode, avecTitres), M.plan(mode, big), mode);
    }
    // Un autre paquet, d'autres questions.
    assert.notDeepEqual(M.plan('quiz', big), M.plan('quiz', big.slice().reverse()));
});

test('Quiz : une bonne réponse et trois distracteurs de dates différentes ; 100 pour la bonne carte', () => {
    const rounds = M.plan('quiz', big);
    assert.equal(rounds.length, 19);
    rounds.forEach((q, r) => {
        assert.equal(q.correctId, big[r + 1].id);
        assert.equal(q.distractorIds.length, 3);
        assert.ok(!q.distractorIds.includes(q.correctId));
    });
    const bon = M.replayMode('quiz', big, [{ choice: rounds[0].correctId }, { choice: rounds[1].distractorIds[0] }]);
    assert.deepEqual([bon.points, bon.results], [100, [true, false]]);
});

test('Remise en ordre : cinq cartes par manche, le rang juste de chacune compte', () => {
    const rounds = M.plan('ordre', big);
    assert.equal(rounds.length, 4);
    assert.equal(rounds[0].cardIds.length, 5);
    assert.deepEqual([...rounds[0].cardIds].sort(), [...rounds[0].solution].sort());
    const parfait = M.replayMode('ordre', big, [{ order: rounds[0].solution }]);
    assert.deepEqual([parfait.points, parfait.results], [100, [true]]);
    const inverse = rounds[1].solution.slice().reverse();
    const rate = M.replayMode('ordre', big, [{ order: rounds[0].solution }, { order: inverse }]);
    assert.equal(rate.results[1], false);
    assert.ok(rate.points >= 100 && rate.points < 200, 'une manche ratée vaut moins de 100');
    assert.deepEqual(M.replayMode('ordre', big, [{ order: rounds[0].solution.slice(0, 3) }]).results, [], 'classement incomplet : pas une réponse');
});

test('Curseur : proche de la bonne année, beaucoup de points ; loin, zéro', () => {
    const rounds = M.plan('curseur', big);
    assert.ok(rounds.length >= 10);
    const r0 = rounds[0];
    const pile = M.replayMode('curseur', big, [{ guess: r0.date }]);
    assert.deepEqual([pile.points, pile.results], [100, [true]]);
    const loin = M.replayMode('curseur', big, [{ guess: r0.date + r0.tolerance * 10 }]);
    assert.deepEqual([loin.points, loin.results], [0, [false]]);
    const pres = M.replayMode('curseur', big, [{ guess: r0.date + r0.tolerance }]);
    assert.deepEqual(pres.results, [true]);
    assert.ok(pres.points > 0 && pres.points < 100);
});

test('Blitz : vrai ou faux, la moitié des énoncés sont vrais ; 100 si on a juste', () => {
    const rounds = M.plan('blitz', big);
    assert.ok(rounds.length >= 10);
    assert.ok(Math.abs(rounds.filter((q) => q.answer).length - rounds.length / 2) <= 1);
    const log = rounds.map((q, i) => ({ answer: i < 3 ? q.answer : !q.answer }));
    const res = M.replayMode('blitz', big, log);
    assert.equal(res.points, 300);
    assert.deepEqual(res.results.slice(0, 4), [true, true, true, false]);
});

test('L\'intrus : quatre cartes, un intrus ; 100 pour le trouver', () => {
    const rounds = M.plan('intrus', big);
    assert.ok(rounds.length >= 1);
    rounds.forEach((q) => {
        assert.equal(q.optionIds.length, 4);
        assert.ok(q.optionIds.includes(q.intruderId));
    });
    const res = M.replayMode('intrus', big, [{ choice: rounds[0].intruderId }, { choice: 'inconnu' }]);
    assert.deepEqual([res.points, res.results], [100, [true, false]]);
});

test('un mode sans manche possible (paquet trop pauvre) vaut zéro manche, et la séance reste terminable', () => {
    const pauvre = [100, 200, 300, 400, 500, 600].map((date, i) => ({ id: 'p' + i, date }));
    const modes = ['frise', 'intrus'];
    const rounds = M.roundsFor('intrus', pauvre);
    assert.ok(rounds >= 0);
    const logs = { frise: pauvre.slice(1).map((_, r) => ({ slotIndex: r + 1, elapsedMs: 100 })) };
    const s = M.replaySession(modes, pauvre, logs);
    assert.equal(s.finished, true, 'les manches de la frise suffisent quand l\'intrus n\'en a aucune');
});
