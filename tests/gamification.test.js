// Tests unitaires sur le calcul de rang/progression XP (js/gamification.js).
// N'exerce que getRankInfo(), seule fonction pure exportée pour les tests
// (voir le bloc `module.exports` en bas de gamification.js) — le reste du
// fichier touche le DOM/localStorage et n'est pas testé ici.
const test = require('node:test');
const assert = require('node:assert/strict');
const { RANKS, getRankInfo } = require('../js/gamification.js');

test('getRankInfo renvoie le premier rang pour 0 XP', () => {
    const info = getRankInfo(0);
    assert.equal(info.currentRank.level, 1);
    assert.equal(info.progressPct, 0);
});

test('getRankInfo progresse correctement au milieu d\'un palier', () => {
    // Rang 1 : 0-500 XP. À 250 XP, on doit être à mi-chemin du rang 2.
    const info = getRankInfo(250);
    assert.equal(info.currentRank.level, 1);
    assert.equal(info.nextRank.level, 2);
    assert.equal(info.progressPct, 50);
    assert.equal(info.xpToNext, 250);
});

test('getRankInfo bascule au rang suivant pile au seuil minXP', () => {
    const secondRank = RANKS[1];
    const info = getRankInfo(secondRank.minXP);
    assert.equal(info.currentRank.level, secondRank.level);
});

test('getRankInfo plafonne au dernier rang (pas de nextRank)', () => {
    const lastRank = RANKS[RANKS.length - 1];
    const info = getRankInfo(lastRank.minXP + 100000);
    assert.equal(info.currentRank.level, lastRank.level);
    assert.equal(info.nextRank, null);
    assert.equal(info.progressPct, 100);
    assert.equal(info.xpToNext, 0);
});

test('getRankInfo tolère un XP négatif ou invalide', () => {
    assert.equal(getRankInfo(-50).currentRank.level, 1);
    assert.equal(getRankInfo(NaN).currentRank.level, 1);
});
