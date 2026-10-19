// Les récompenses (js/rewardsCore.js) : pièces, série de victoires, cartes, boutique. Pur, sans navigateur.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../js/rewardsCore.js');
const P = require('../js/pathCore.js');

const fr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'fr.json'), 'utf8'));
const uiFr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ui', 'fr.json'), 'utf8'));
const portraits = R.flattenPortraits(fr.categories);
const albums = R.buildAlbums(P.WORLDS, portraits);

const seeded = (seed) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; };

// --- pièces d'un niveau ---------------------------------------------------------------------------

test('un niveau réussi paie 10, 15 ou 20 pièces selon les étoiles, plus une prime au premier passage', () => {
    const c = (stars, extra) => R.levelCoins({ won: true, stars, prevStars: 0, boss: false, streakAfter: 1, ...extra }).total;
    assert.equal(c(1), 10 + R.FIRST_CLEAR_BONUS);
    assert.equal(c(2), 15 + R.FIRST_CLEAR_BONUS);
    assert.equal(c(3), 20 + R.FIRST_CLEAR_BONUS);
});

test('un boss paie quatre fois plus et une plus grosse prime', () => {
    const r = R.levelCoins({ won: true, stars: 3, prevStars: 0, boss: true, streakAfter: 1 });
    assert.equal(r.parts.base, 20 * R.BOSS_FACTOR);
    assert.equal(r.parts.firstClear, R.BOSS_FIRST_CLEAR_BONUS);
    assert.ok(r.total > 3 * R.levelCoins({ won: true, stars: 3, prevStars: 0, boss: false, streakAfter: 1 }).total / 2);
});

test('rejouer sans faire mieux paie 40 % et sans prime ; faire mieux paie plein tarif', () => {
    const replay = R.levelCoins({ won: true, stars: 2, prevStars: 3, boss: false, streakAfter: 1 });
    assert.equal(replay.parts.base, Math.round(15 * R.REPLAY_RATE));
    assert.equal(replay.parts.firstClear, 0);
    const better = R.levelCoins({ won: true, stars: 3, prevStars: 2, boss: false, streakAfter: 1 });
    assert.equal(better.parts.base, 20);
    assert.equal(better.parts.firstClear, 0, 'la prime n\'est que pour le premier passage');
});

test('un niveau perdu paie une consolation proportionnelle aux épreuves réussies, plafonnée', () => {
    const lost = (done) => R.levelCoins({ won: false, stagesDone: done }).total;
    assert.equal(lost(0), 0);
    assert.equal(lost(1), 2);
    assert.equal(lost(2), 4);
    assert.equal(lost(10), 6);
    assert.equal(R.levelCoins({ won: false, stagesDone: 2 }).parts.base, 0);
});

test('la série de victoires ajoute 5 pièces par victoire d\'affilée au-delà de la première, plafonné à 25', () => {
    const s = (n) => R.levelCoins({ won: true, stars: 1, prevStars: 1, boss: false, streakAfter: n }).parts.streak;
    assert.deepEqual([s(1), s(2), s(3), s(6), s(7), s(50)], [0, 5, 10, 25, 25, 25]);
});

// --- série ---------------------------------------------------------------------------------------------

test('la série : une victoire la prolonge, une défaite la remet à zéro, le record reste', () => {
    let st = R.normalizeState(null);
    for (let i = 1; i <= 4; i++) st = R.recordStreak(st, true).state;
    assert.equal(st.streak.current, 4);
    const lost = R.recordStreak(st, false);
    assert.equal(lost.current, 0);
    assert.equal(lost.best, 4);
    assert.equal(R.recordStreak(lost.state, true).current, 1);
    assert.equal(R.recordStreak(lost.state, true).best, 4);
});

test('des primes tombent aux paliers de la série (3, 5, 10, 20, puis toutes les dizaines)', () => {
    let st = R.normalizeState(null);
    const got = {};
    for (let i = 1; i <= 30; i++) {
        const r = R.recordStreak(st, true);
        st = r.state;
        if (r.milestone) got[i] = r.milestone;
    }
    assert.deepEqual(got, { 3: 20, 5: 40, 10: 100, 20: 200, 30: 200 });
});

// --- parties libres -----------------------------------------------------------------------------------

test('une partie libre paie peu, et rien dans les modes sans enjeu', () => {
    R.NO_COIN_MODES.forEach((mode) => assert.equal(R.gameCoins({ mode, won: true, score: 900 }), 0, mode));
    assert.equal(R.gameCoins({ mode: 'quiz', won: true, score: 0 }), 8);
    assert.equal(R.gameCoins({ mode: 'quiz', won: true, score: 500 }), 13);
    assert.equal(R.gameCoins({ mode: 'quiz', won: true, score: 99999 }), 28, 'les points plafonnent à 20 pièces');
    assert.equal(R.gameCoins({ mode: 'quiz', won: true, score: 0, perfect: true }), 18);
    assert.equal(R.gameCoins({ mode: 'daily', won: true, score: 0, daily: true }), 23);
    assert.equal(R.gameCoins({ mode: 'chrono', won: true, score: 0 }), 13);
    assert.equal(R.gameCoins({ mode: 'quiz', won: false, score: 900 }), 2);
});

test('les parties libres plafonnent à 200 pièces par jour, puis le plafond repart le lendemain', () => {
    const day1 = new Date(2026, 9, 19, 10);
    let st = R.normalizeState(null);
    let paidTotal = 0;
    for (let i = 0; i < 20; i++) {
        const r = R.awardStandalone(st, 28, day1);
        st = r.state; paidTotal += r.paid;
    }
    assert.equal(paidTotal, R.STANDALONE_DAILY_CAP);
    assert.equal(st.coins, 200);
    const capped = R.awardStandalone(st, 10, day1);
    assert.equal(capped.paid, 0);
    assert.ok(capped.capped);
    const next = R.awardStandalone(st, 10, new Date(2026, 9, 20, 8));
    assert.equal(next.paid, 10);
    assert.equal(next.state.coins, 210);
});

test('un stockage altéré est ramené à des valeurs saines', () => {
    const s = R.normalizeState({ coins: -5, earned: 'x', streak: { current: 3, best: 1 }, cards: { a: 2, b: -1, c: 'z' }, owned: ['x', 'x', 7], equipped: { costume: 5 } });
    assert.equal(s.coins, 0);
    assert.equal(s.streak.best, 3, 'le record ne peut pas être sous la série en cours');
    assert.deepEqual(s.cards, { a: 2 });
    assert.deepEqual(s.owned, ['x']);
    assert.equal(s.equipped.costume, null);
    assert.deepEqual(R.normalizeState('nimporte quoi').cards, {});
});

// --- cartes ---------------------------------------------------------------------------------------------

test('les albums : 20 mondes en ont un (pas la Préhistoire), de 6 à 12 figures, une figure dans un seul album', () => {
    assert.ok(!albums.prehistoire);
    assert.ok(!albums.monde0);
    assert.equal(Object.keys(albums).length, 20);
    const seen = new Set();
    Object.entries(albums).forEach(([id, album]) => {
        assert.ok(album.length >= 6 && album.length <= R.ALBUM_SIZE, `${id} : ${album.length} cartes`);
        album.forEach((c) => {
            assert.ok(!seen.has(c.id), `${c.id} dans deux albums`);
            seen.add(c.id);
            assert.ok(['commune', 'rare', 'legendaire'].includes(c.rarity));
        });
    });
    assert.equal(albums.grece.length, 12);
    assert.deepEqual(R.buildAlbums(P.WORLDS, R.flattenPortraits(fr.categories)), albums, 'déterministe');
});

test('une figure est classée dans le monde où elle a 40 ans', () => {
    const byId = new Map(portraits.map((p) => [p.id, p]));
    Object.entries(albums).forEach(([id, album]) => {
        const w = P.findWorld(id);
        album.forEach((c) => {
            const prime = byId.get(c.id).date + 40;
            assert.ok(prime >= w.from && prime < w.to, `${c.id} (né en ${byId.get(c.id).date}) hors de ${id}`);
        });
    });
});

test('la rareté suit la célébrité : légendaire si la figure a une biographie, rare si incontournable', () => {
    assert.equal(R.rarityOf({ bio: true, essential: false }), 'legendaire');
    assert.equal(R.rarityOf({ bio: false, essential: true }), 'rare');
    assert.equal(R.rarityOf({ bio: false, essential: false }), 'commune');
    const all = Object.values(albums).flat();
    assert.ok(all.some((c) => c.rarity === 'legendaire') && all.some((c) => c.rarity === 'rare'));
});

test('une île pioche dans l\'album de son monde d\'attache', () => {
    assert.equal(R.albumOfWorld(albums, P.findWorld('ile-chine')), albums.grece);
    assert.equal(R.albumOfWorld(albums, P.findWorld('prehistoire')).length, 0);
});

test('cartes par partie : 1 au premier passage, 1 par étoile gagnée en plus, 3 pour un premier boss, 0 sinon', () => {
    const n = (r) => R.cardCount(r);
    assert.equal(n({ won: true, stars: 2, prevStars: 0, boss: false }), 1);
    assert.equal(n({ won: true, stars: 3, prevStars: 0, boss: false }), 1);
    assert.equal(n({ won: true, stars: 3, prevStars: 1, boss: false }), 2);
    assert.equal(n({ won: true, stars: 2, prevStars: 2, boss: false }), 0, 'rejouer pour rien : pas de carte');
    assert.equal(n({ won: true, stars: 1, prevStars: 3, boss: false }), 0);
    assert.equal(n({ won: true, stars: 1, prevStars: 0, boss: true }), R.BOSS_CARDS);
    assert.equal(n({ won: false, stars: 0, prevStars: 0, boss: false }), 0);
});

test('tirage : des cartes qu\'on n\'a pas d\'abord, jamais deux fois la même dans un tirage, état d\'origine intact', () => {
    const album = albums.grece;
    const st0 = R.normalizeState(null);
    const r = R.drawCards(st0, album, 3, seeded(5));
    assert.equal(r.drawn.length, 3);
    assert.equal(new Set(r.drawn.map((c) => c.id)).size, 3);
    r.drawn.forEach((c) => { assert.ok(c.isNew); assert.equal(r.state.cards[c.id], 1); });
    assert.deepEqual(st0.cards, {});
    assert.equal(r.coins, 0);
});

test('un boss garantit une carte rare ou légendaire quand il en reste', () => {
    for (let seed = 1; seed <= 30; seed++) {
        const r = R.drawCards(R.normalizeState(null), albums.grece, 3, seeded(seed), true);
        assert.notEqual(r.drawn[0].rarity, 'commune', `graine ${seed}`);
    }
});

test('album complet : le doublon se change en pièces, selon la rareté', () => {
    const album = albums.grece;
    const full = { cards: Object.fromEntries(album.map((c) => [c.id, 1])) };
    const r = R.drawCards(full, album, 2, seeded(3));
    assert.equal(r.drawn.length, 2);
    r.drawn.forEach((c) => { assert.ok(!c.isNew); assert.equal(c.coins, R.DUPLICATE_COINS[c.rarity]); });
    assert.equal(r.state.coins, r.coins);
    assert.equal(r.coins, r.drawn.reduce((s, c) => s + c.coins, 0));
});

test('un album fini verse sa prime une seule fois', () => {
    const album = albums.grece;
    const part = { cards: Object.fromEntries(album.slice(1).map((c) => [c.id, 1])) };
    assert.equal(R.claimAlbum(part, 'grece', album).bonus, 0, 'incomplet');
    const full = { cards: Object.fromEntries(album.map((c) => [c.id, 1])) };
    const first = R.claimAlbum(full, 'grece', album);
    assert.equal(first.bonus, R.ALBUM_COMPLETE_BONUS);
    assert.equal(first.state.coins, R.ALBUM_COMPLETE_BONUS);
    assert.equal(R.claimAlbum(first.state, 'grece', album).bonus, 0, 'déjà versée');
    assert.deepEqual(R.albumProgress(full, album), { have: album.length, total: album.length, complete: true });
});

// --- boutique -------------------------------------------------------------------------------------------------

test('un costume par monde du Chemin, de plus en plus cher, et un titre pour chacun dans ui/fr.json', () => {
    const list = R.costumes();
    const mains = P.mainWorlds().filter((w) => w.id !== 'monde0').map((w) => w.id);
    assert.deepEqual(list.map((c) => c.world), mains);
    for (let i = 1; i < list.length; i++) assert.ok(list[i].price > list[i - 1].price);
    list.forEach((c) => assert.ok(uiFr.rewards.costumes[c.world], `nom du costume ${c.world}`));
    assert.equal(new Set(list.map((c) => c.id)).size, list.length);
    assert.deepEqual(R.decors(), [], 'les décors viendront avec les dessins');
});

test('acheter : il faut le monde atteint et assez de pièces ; l\'achat débite, enfile le costume, et ne se refait pas', () => {
    const item = R.costumes()[0];
    let st = { coins: item.price - 1 };
    assert.deepEqual(R.canBuy(st, item.id, true), { ok: false, reason: 'coins' });
    assert.deepEqual(R.canBuy({ coins: 9999 }, item.id, false), { ok: false, reason: 'world' });
    assert.deepEqual(R.canBuy({ coins: 9999 }, 'inconnu', true), { ok: false, reason: 'unknown' });
    st = { coins: item.price + 5 };
    const bought = R.buy(st, item.id, true);
    assert.ok(bought.ok);
    assert.equal(bought.state.coins, 5);
    assert.equal(bought.state.spent, item.price);
    assert.deepEqual(bought.state.owned, [item.id]);
    assert.equal(bought.state.equipped.costume, item.id);
    assert.deepEqual(R.canBuy(bought.state, item.id, true), { ok: false, reason: 'owned' });
    const refused = R.buy({ coins: 3 }, item.id, true);
    assert.ok(!refused.ok);
    assert.equal(refused.state.coins, 3, 'un achat refusé ne coûte rien');
});

test('porter : seulement un objet qu\'on possède, dans son emplacement ; on peut le retirer', () => {
    const [a, b] = R.costumes();
    let st = R.buy({ coins: 9999 }, a.id, true).state;
    assert.equal(R.equip(st, 'costume', b.id).equipped.costume, a.id, 'pas acheté : on ne le porte pas');
    st = R.buy(st, b.id, true).state;
    assert.equal(st.equipped.costume, b.id);
    assert.equal(R.equip(st, 'costume', a.id).equipped.costume, a.id);
    assert.equal(R.equip(st, 'decor', a.id).equipped.decor, null, 'mauvais emplacement');
    assert.equal(R.equip(st, 'costume', null).equipped.costume, null);
});

test('l\'économie : un Chemin entièrement fait à 3 étoiles permet d\'acheter tous les costumes', () => {
    let total = 0;
    P.WORLDS.filter((w) => w.id !== 'monde0').forEach((w) => {
        P.levelsOf(w).forEach((l) => { total += R.levelCoins({ won: true, stars: 3, prevStars: 0, boss: l.boss, streakAfter: 1 }).total; });
    });
    const price = R.costumes().reduce((s, c) => s + c.price, 0);
    assert.ok(total > price, `${total} pièces gagnées pour ${price} de costumes`);
    // …mais pas trop facilement : il faut une bonne part du Chemin pour tout acheter.
    assert.ok(total < price * 2.5, `${total} pièces : trop généreux pour ${price}`);
});
