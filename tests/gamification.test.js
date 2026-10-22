// Tests unitaires sur le calcul de rang/progression XP (js/gamification.js).
// N'exerce que getRankInfo(), seule fonction pure exportée pour les tests
// (voir le bloc `module.exports` en bas de gamification.js) — le reste du
// fichier touche le DOM/localStorage et n'est pas testé ici.
const test = require('node:test');
const assert = require('node:assert/strict');
const { RANKS, MAX_LEVEL, levelMinXP, getRankInfo, getStreakXpMultiplier, getNextStreakXpTier } = require('../js/gamification.js');

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

test('getRankInfo : au dernier grade, le niveau suivant est le niveau 11 (les niveaux continuent)', () => {
    const lastRank = RANKS[RANKS.length - 1];
    const info = getRankInfo(lastRank.minXP);
    assert.equal(info.currentRank.level, lastRank.level);
    assert.equal(info.nextRank.level, lastRank.level + 1);
    assert.equal(info.xpToNext, 12400);
});

test('getRankInfo tolère un XP négatif ou invalide', () => {
    assert.equal(getRankInfo(-50).currentRank.level, 1);
    assert.equal(getRankInfo(NaN).currentRank.level, 1);
});

// --- getStreakXpMultiplier / getNextStreakXpTier ---
// Multiplicateur d'XP lié à la série quotidienne (voir §3 de la demande de
// rétention : un vrai risque de perte plutôt qu'un "gel de série").

test('getStreakXpMultiplier vaut ×1.0 tant que la série est courte (0-2 jours)', () => {
    assert.equal(getStreakXpMultiplier(0), 1.0);
    assert.equal(getStreakXpMultiplier(1), 1.0);
    assert.equal(getStreakXpMultiplier(2), 1.0);
});

test('getStreakXpMultiplier franchit chaque palier pile au seuil', () => {
    assert.equal(getStreakXpMultiplier(3), 1.1);
    assert.equal(getStreakXpMultiplier(6), 1.1);
    assert.equal(getStreakXpMultiplier(7), 1.25);
    assert.equal(getStreakXpMultiplier(13), 1.25);
    assert.equal(getStreakXpMultiplier(14), 1.5);
    assert.equal(getStreakXpMultiplier(29), 1.5);
    assert.equal(getStreakXpMultiplier(30), 2.0);
    assert.equal(getStreakXpMultiplier(365), 2.0);
});

test('getStreakXpMultiplier tolère une série négative ou invalide (retombe à ×1.0)', () => {
    assert.equal(getStreakXpMultiplier(-5), 1.0);
    assert.equal(getStreakXpMultiplier(NaN), 1.0);
});

test('getNextStreakXpTier pointe vers le palier suivant, et null au maximum', () => {
    assert.equal(getNextStreakXpTier(0).multiplier, 1.1);
    assert.equal(getNextStreakXpTier(5).multiplier, 1.25);
    assert.equal(getNextStreakXpTier(29).multiplier, 2.0);
    assert.equal(getNextStreakXpTier(30), null);
    assert.equal(getNextStreakXpTier(1000), null);
});

test('au-delà du grade 10, les niveaux continuent jusqu\'à 300 avec un écart qui grandit', () => {
    assert.equal(MAX_LEVEL, 300);
    assert.equal(levelMinXP(10), 42000);
    assert.equal(levelMinXP(11), 42000 + 12400);
    let prevGap = 0;
    for (let n = 2; n <= MAX_LEVEL; n++) {
        const gap = levelMinXP(n) - levelMinXP(n - 1);
        assert.ok(gap > prevGap, 'niveau ' + n);
        prevGap = gap;
    }
    const info = getRankInfo(levelMinXP(57) + 10);
    assert.equal(info.currentRank.level, 57);
    assert.equal(info.currentRank.icon, RANKS[9].icon);
    assert.equal(info.currentRank.titleLevel, 10);
    assert.equal(info.nextRank.level, 58);
    assert.equal(info.xpToNext, levelMinXP(58) - levelMinXP(57) - 10);
    assert.equal(getRankInfo(levelMinXP(57) - 1).currentRank.level, 56);
});

test('le niveau 300 est le dernier : plus de palier suivant', () => {
    const info = getRankInfo(levelMinXP(300) + 5000000);
    assert.equal(info.currentRank.level, 300);
    assert.equal(info.nextRank, null);
    assert.equal(info.progressPct, 100);
});
