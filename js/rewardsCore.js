// =========================================================================
// === RÉCOMPENSES — MOTEUR PUR (pièces, série de victoires, cartes, boutique) ===
// =========================================================================
// La boucle de récompense du jeu : on gagne des PIÈCES en réussissant un niveau du Chemin du Temps (ou, plus
// modestement, une partie libre), on les dépense à la BOUTIQUE (costumes de la future mascotte Clio, décors plus
// tard), on collectionne des CARTES de personnages (un album par monde) et une SÉRIE DE VICTOIRES relance l'envie
// de jouer « encore un niveau ». Ce module ne touche ni au DOM ni au stockage : il décide combien on gagne, ce que
// contient un album, quelle carte tombe, ce qu'on peut acheter. L'écran est dans js/app/rewards.js.
//
// Règles d'équilibre, en une ligne chacune :
//  - un niveau réussi paie 10/15/20 pièces selon ses étoiles (×4 pour un boss), plus une prime au premier
//    passage et une prime de série ; un niveau PERDU paie quand même une consolation (« plus ou moins » réussi) ;
//  - rejouer un niveau sans le battre paie 40 % : on peut rejouer pour le plaisir, pas pour farmer ;
//  - une partie libre paie peu et plafonne par jour (200 pièces) : le Chemin reste la source principale ;
//  - il n'y a AUCUN achat de pièces ni de cartes contre de l'argent réel : tout se gagne en jouant (voir README).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.RewardsCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var LEVEL_COINS = [0, 10, 15, 20];       // selon les étoiles
    var BOSS_FACTOR = 4;
    var FIRST_CLEAR_BONUS = 10;
    var BOSS_FIRST_CLEAR_BONUS = 30;
    var REPLAY_RATE = 0.4;
    var STREAK_STEP = 5;                     // pièces de plus par victoire d'affilée au-delà de la première
    var STREAK_CAP = 25;
    var CONSOLATION_PER_STAGE = 2;
    var CONSOLATION_CAP = 6;
    // Paliers de série : atteindre le palier verse la prime.
    var STREAK_MILESTONES = { 3: 20, 5: 40, 10: 100, 20: 200 };
    var STANDALONE_DAILY_CAP = 200;
    var ALBUM_SIZE = 12;
    var ALBUM_MIN_PORTRAITS = 6;             // en dessous, un monde n'a pas d'album
    var ALBUM_COMPLETE_BONUS = 150;
    var DUPLICATE_COINS = { commune: 10, rare: 20, legendaire: 40 };
    var CARDS_PER_STAR_GAIN = 1;
    var BOSS_CARDS = 3;
    var SHOP_COSTUME_BASE = 100;

    function toInt(value) {
        var n = Math.floor(Number(value));
        return isFinite(n) && n > 0 ? n : 0;
    }

    function today(date) {
        var d = date || new Date();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + m + '-' + day;
    }

    // --- État ---------------------------------------------------------------------------------------

    // { coins, earned, spent, streak: { current, best }, cards: { <id>: nombre }, albumsClaimed: [<monde>],
    //   owned: [<costume>], equipped: { costume, decor }, standalone: { date, coins } } — tolère un stockage altéré.
    function normalizeState(raw) {
        var src = raw && typeof raw === 'object' ? raw : {};
        var streak = src.streak && typeof src.streak === 'object' ? src.streak : {};
        var cards = {};
        if (src.cards && typeof src.cards === 'object') {
            Object.keys(src.cards).forEach(function (id) {
                var n = toInt(src.cards[id]);
                if (n > 0) cards[id] = n;
            });
        }
        var list = function (v) {
            return Array.isArray(v) ? v.filter(function (x, i, all) { return typeof x === 'string' && all.indexOf(x) === i; }) : [];
        };
        var equipped = src.equipped && typeof src.equipped === 'object' ? src.equipped : {};
        var standalone = src.standalone && typeof src.standalone === 'object' ? src.standalone : {};
        return {
            coins: toInt(src.coins),
            earned: toInt(src.earned),
            spent: toInt(src.spent),
            streak: { current: toInt(streak.current), best: Math.max(toInt(streak.best), toInt(streak.current)) },
            cards: cards,
            albumsClaimed: list(src.albumsClaimed),
            owned: list(src.owned),
            equipped: {
                costume: typeof equipped.costume === 'string' ? equipped.costume : null,
                decor: typeof equipped.decor === 'string' ? equipped.decor : null
            },
            standalone: { date: typeof standalone.date === 'string' ? standalone.date : '', coins: toInt(standalone.coins) }
        };
    }

    function clone(state) { return normalizeState(JSON.parse(JSON.stringify(normalizeState(state)))); }

    // Verse des pièces (jamais négatif) : renvoie un nouvel état.
    function addCoins(state, amount) {
        var s = clone(state);
        var n = toInt(amount);
        s.coins += n;
        s.earned += n;
        return s;
    }

    // --- Pièces d'un niveau ---------------------------------------------------------------------------

    // Une partie du Chemin : { won, stars, prevStars, boss, stagesDone, streakAfter }.
    // Renvoie { total, parts: { base, firstClear, streak, consolation } }. `prevStars` = étoiles avant la partie.
    function levelCoins(r) {
        var parts = { base: 0, firstClear: 0, streak: 0, consolation: 0 };
        if (!r.won) {
            parts.consolation = Math.min(CONSOLATION_CAP, toInt(r.stagesDone) * CONSOLATION_PER_STAGE);
            return { total: parts.consolation, parts: parts };
        }
        var stars = Math.max(1, Math.min(3, toInt(r.stars)));
        var prev = toInt(r.prevStars);
        var firstClear = prev === 0;
        var base = LEVEL_COINS[stars] * (r.boss ? BOSS_FACTOR : 1);
        // Rejouer sans faire mieux : 40 %. Faire mieux (plus d'étoiles) ou réussir pour la première fois : plein tarif.
        var replay = !firstClear && stars <= prev;
        parts.base = replay ? Math.round(base * REPLAY_RATE) : base;
        if (firstClear) parts.firstClear = r.boss ? BOSS_FIRST_CLEAR_BONUS : FIRST_CLEAR_BONUS;
        var streakAfter = toInt(r.streakAfter);
        if (streakAfter >= 2) parts.streak = Math.min(STREAK_CAP, STREAK_STEP * (streakAfter - 1));
        return { total: parts.base + parts.firstClear + parts.streak, parts: parts };
    }

    // La série de victoires : un niveau réussi la prolonge, un niveau perdu la remet à zéro. Un abandon ne la touche
    // pas (on ne punit pas qui quitte). Renvoie { state, current, best, milestone } — `milestone` : prime de palier.
    function recordStreak(state, won) {
        var s = clone(state);
        var milestone = 0;
        if (won) {
            s.streak.current += 1;
            s.streak.best = Math.max(s.streak.best, s.streak.current);
            milestone = STREAK_MILESTONES[s.streak.current] || 0;
            if (!milestone && s.streak.current > 20 && s.streak.current % 10 === 0) milestone = STREAK_MILESTONES[20];
        } else {
            s.streak.current = 0;
        }
        return { state: s, current: s.streak.current, best: s.streak.best, milestone: milestone };
    }

    // --- Pièces d'une partie libre ----------------------------------------------------------------------

    // Modes sans enjeu : aucun gain (on y apprend, on n'y farme pas).
    var NO_COIN_MODES = ['training', 'discovery', 'class', 'carte', 'multi'];

    // { mode, won, score, perfect, daily } → pièces avant plafond.
    function gameCoins(r) {
        if (NO_COIN_MODES.indexOf(r.mode) !== -1) return 0;
        var coins = 0;
        if (r.won) {
            coins = 8 + Math.min(20, Math.floor(Math.max(0, r.score || 0) / 100));
            if (r.perfect) coins += 10;
            if (r.daily) coins += 15;
            if (r.mode === 'chrono' || r.mode === 'expert') coins += 5;
        } else {
            coins = 2;
        }
        return coins;
    }

    // Verse les pièces d'une partie libre dans la limite du plafond du jour. Renvoie { state, paid, capped }.
    function awardStandalone(state, coins, date) {
        var s = clone(state);
        var day = today(date);
        if (s.standalone.date !== day) s.standalone = { date: day, coins: 0 };
        var room = Math.max(0, STANDALONE_DAILY_CAP - s.standalone.coins);
        var paid = Math.min(toInt(coins), room);
        s.standalone.coins += paid;
        s.coins += paid;
        s.earned += paid;
        return { state: s, paid: paid, capped: paid < toInt(coins) };
    }

    // --- Cartes de personnages -----------------------------------------------------------------------------

    // Les figures à portrait du pack : { id, date, essential, bio } — la date est celle de la naissance.
    function flattenPortraits(categories) {
        var out = [];
        var seen = Object.create(null);
        function walk(node) {
            (node.themes || []).forEach(function (theme) {
                var essential = Object.create(null);
                (theme.essentiel || []).forEach(function (id) { essential[id] = true; });
                (theme.events || []).forEach(function (evt) {
                    if (!evt || !evt.image || typeof evt.date !== 'number' || seen[evt.id]) return;
                    seen[evt.id] = true;
                    out.push({ id: evt.id, date: evt.date, essential: !!essential[evt.id], bio: !!evt.biographie, titre: evt.titre });
                });
            });
            (node.subcategories || []).forEach(walk);
        }
        (categories || []).forEach(function (c) { if (c && !c.isCustomCategory) walk(c); });
        return out;
    }

    // Légendaire : la figure a une biographie dans le jeu ; rare : incontournable de son panthéon ; sinon commune.
    function rarityOf(p) { return p.bio ? 'legendaire' : (p.essential ? 'rare' : 'commune'); }

    function rank(str) {
        var h = 2166136261;
        for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
        return ((h >>> 0) % 1000003) / 1000003;
    }

    // L'âge où l'on « compte » une figure : à 40 ans elle est dans la force de l'âge, c'est l'époque qu'elle marque.
    // La date des portraits est celle de la NAISSANCE : on classe donc une figure dans le monde où elle a 40 ans
    // (Napoléon, né en 1769, est de la Révolution et de l'Empire ; Einstein, né en 1879, de la Grande Guerre). Chaque
    // figure n'appartient ainsi qu'à un album.
    var PRIME_AGE = 40;

    // L'album d'un monde : ALBUM_SIZE figures qui ont 40 ans pendant son époque, réparties sur la période, les plus
    // célèbres d'abord (légendaires, puis rares). Un monde sans portraits (Préhistoire) n'a pas d'album.
    // Déterministe : même pack, même album.
    function buildAlbum(world, portraits, taken) {
        var from = world.from, to = world.to;
        var cands = portraits.filter(function (p) {
            return p.date + PRIME_AGE >= from && p.date + PRIME_AGE < to && !(taken && taken[p.id]);
        });
        if (cands.length < ALBUM_MIN_PORTRAITS) return [];
        var ranked = cands.map(function (p) { return { p: p, w: (p.bio ? 4 : 0) + (p.essential ? 2 : 0), r: rank(world.id + '|' + p.id) }; })
            .sort(function (a, b) { return b.w - a.w || a.r - b.r; });
        // Une figure par tranche de la période (ALBUM_SIZE tranches), la plus célèbre de chacune ; puis on complète.
        var min = Infinity, max = -Infinity;
        cands.forEach(function (p) { min = Math.min(min, p.date); max = Math.max(max, p.date); });
        // (on découpe sur la date de naissance : même ordre que la date de force de l'âge)
        var width = Math.max(1, (max - min + 1) / ALBUM_SIZE);
        var chosen = [], used = Object.create(null);
        for (var s = 0; s < ALBUM_SIZE; s++) {
            var lo = min + s * width, hi = min + (s + 1) * width;
            for (var i = 0; i < ranked.length; i++) {
                var c = ranked[i].p;
                if (used[c.id] || c.date < lo || (c.date >= hi && s < ALBUM_SIZE - 1)) continue;
                used[c.id] = true; chosen.push(c); break;
            }
        }
        for (var j = 0; j < ranked.length && chosen.length < ALBUM_SIZE; j++) {
            if (!used[ranked[j].p.id]) { used[ranked[j].p.id] = true; chosen.push(ranked[j].p); }
        }
        return chosen.sort(function (a, b) { return a.date - b.date || (a.id < b.id ? -1 : 1); })
            .map(function (p) { return { id: p.id, date: p.date, rarity: rarityOf(p) }; });
    }

    // Les albums de tous les mondes qui en ont un : { <monde>: [{ id, date, rarity }] }. Deux mondes se chevauchent
    // (la Grèce et Rome) : une figure ne figure que dans le premier album qui la prend. Une île pioche dans l'album
    // de son monde d'attache (elle n'a pas de portraits à elle).
    function buildAlbums(worlds, portraits) {
        var out = {};
        var taken = Object.create(null);
        worlds.forEach(function (w) {
            if (w.island) return;
            var a = buildAlbum(w, portraits, taken);
            if (!a.length) return;
            a.forEach(function (c) { taken[c.id] = true; });
            out[w.id] = a;
        });
        return out;
    }

    function albumOfWorld(albums, world) {
        return albums[world.island ? world.parent : world.id] || [];
    }

    // Où en est l'album : { have, total, complete }.
    function albumProgress(state, album) {
        var cards = normalizeState(state).cards;
        var have = album.filter(function (c) { return cards[c.id]; }).length;
        return { have: have, total: album.length, complete: album.length > 0 && have === album.length };
    }

    // Combien de cartes pour une partie : une à la première réussite, une de plus par étoile gagnée sur le meilleur
    // résultat, trois (dont une rare) pour un boss battu pour la première fois. Rien en cas de défaite ni de rejeu.
    function cardCount(r) {
        if (!r.won) return 0;
        var stars = toInt(r.stars), prev = toInt(r.prevStars);
        if (prev === 0) return r.boss ? BOSS_CARDS : CARDS_PER_STAR_GAIN;
        return stars > prev ? (stars - prev) * CARDS_PER_STAR_GAIN : 0;
    }

    // Tire `count` cartes d'un album : d'abord des cartes qu'on n'a pas, la plus rare en tête pour un boss
    // (`wantRare`) ; album complet : le doublon se change en pièces. Renvoie { state, drawn: [{ id, rarity, isNew,
    // coins }], coins } — `coins` : pièces de doublons déjà versées.
    function drawCards(state, album, count, rng, wantRare) {
        var random = rng || Math.random;
        var s = clone(state);
        var drawn = [];
        var coins = 0;
        for (var n = 0; n < count && album.length; n++) {
            var missing = album.filter(function (c) { return !s.cards[c.id]; });
            var pool = missing;
            if (wantRare && n === 0) {
                var rare = missing.filter(function (c) { return c.rarity !== 'commune'; });
                if (rare.length) pool = rare;
            }
            var card;
            if (pool.length) {
                card = pool[Math.floor(random() * pool.length)];
                s.cards[card.id] = 1;
                drawn.push({ id: card.id, rarity: card.rarity, isNew: true, coins: 0 });
            } else {
                card = album[Math.floor(random() * album.length)];
                s.cards[card.id] = (s.cards[card.id] || 0) + 1;
                var dup = DUPLICATE_COINS[card.rarity] || DUPLICATE_COINS.commune;
                s.coins += dup; s.earned += dup; coins += dup;
                drawn.push({ id: card.id, rarity: card.rarity, isNew: false, coins: dup });
            }
        }
        return { state: s, drawn: drawn, coins: coins };
    }

    // Un album fini verse une prime, une seule fois. Renvoie { state, bonus }.
    function claimAlbum(state, worldId, album) {
        var s = clone(state);
        var p = albumProgress(s, album);
        if (!p.complete || s.albumsClaimed.indexOf(worldId) !== -1) return { state: s, bonus: 0 };
        s.albumsClaimed.push(worldId);
        s.coins += ALBUM_COMPLETE_BONUS;
        s.earned += ALBUM_COMPLETE_BONUS;
        return { state: s, bonus: ALBUM_COMPLETE_BONUS };
    }

    // --- Boutique ---------------------------------------------------------------------------------------------

    // Un costume par monde du Chemin, que la mascotte (Clio) portera. Le prix monte avec le monde : le premier
    // s'obtient après quelques niveaux, le dernier au bout du Chemin. `emoji` n'est qu'un aperçu en attendant les
    // dessins. Un costume ne s'achète qu'une fois son monde atteint.
    var COSTUME_WORLDS = ['prehistoire', 'orient', 'grece', 'rome1', 'rome2', 'haut-moyen-age', 'feodalites', 'capetiens',
        'cent-ans', 'renaissances', 'religion', 'absolus', 'lumieres', 'revolution', 'revolution-inachevee', 'republique',
        'grande-guerre', 'entre-deux-guerres', 'trente-glorieuses', 'crises', 'depuis-1991'];
    var COSTUME_EMOJI = ['🦴', '🏺', '🌿', '🛡️', '🦅', '👑', '🏰', '⚜️', '⚔️', '🎨', '🕯️', '☀️', '💡', '🔔', '🎩', '🗼', '🪖', '📻', '🚀', '🧱', '🌐'];

    function costumes() {
        return COSTUME_WORLDS.map(function (world, i) {
            return { id: 'costume-' + world, world: world, slot: 'costume', price: SHOP_COSTUME_BASE + 25 * i, emoji: COSTUME_EMOJI[i] };
        });
    }

    // Les décors d'arrière-plan viendront avec les dessins : le catalogue est prêt à les recevoir.
    function decors() { return []; }

    function catalog() { return costumes().concat(decors()); }

    function findItem(id) {
        var all = catalog();
        for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
        return null;
    }

    // Peut-on acheter ? `worldReached` : le monde de l'objet est-il atteint ? Renvoie { ok, reason }.
    function canBuy(state, itemId, worldReached) {
        var s = normalizeState(state);
        var item = findItem(itemId);
        if (!item) return { ok: false, reason: 'unknown' };
        if (s.owned.indexOf(itemId) !== -1) return { ok: false, reason: 'owned' };
        if (!worldReached) return { ok: false, reason: 'world' };
        if (s.coins < item.price) return { ok: false, reason: 'coins' };
        return { ok: true, reason: '' };
    }

    function buy(state, itemId, worldReached) {
        var check = canBuy(state, itemId, worldReached);
        var s = clone(state);
        if (!check.ok) return { state: s, ok: false, reason: check.reason };
        var item = findItem(itemId);
        s.coins -= item.price;
        s.spent += item.price;
        s.owned.push(itemId);
        // Un achat s'enfile tout de suite : on le voit porté.
        s.equipped[item.slot] = itemId;
        return { state: s, ok: true, reason: '' };
    }

    // Porter un objet acheté (ou retirer celui du slot avec `null`).
    function equip(state, slot, itemId) {
        var s = clone(state);
        if (itemId === null) { s.equipped[slot] = null; return s; }
        var item = findItem(itemId);
        if (item && item.slot === slot && s.owned.indexOf(itemId) !== -1) s.equipped[slot] = itemId;
        return s;
    }

    return {
        LEVEL_COINS: LEVEL_COINS, BOSS_FACTOR: BOSS_FACTOR, FIRST_CLEAR_BONUS: FIRST_CLEAR_BONUS, BOSS_FIRST_CLEAR_BONUS: BOSS_FIRST_CLEAR_BONUS,
        REPLAY_RATE: REPLAY_RATE, STREAK_STEP: STREAK_STEP, STREAK_CAP: STREAK_CAP, STREAK_MILESTONES: STREAK_MILESTONES,
        STANDALONE_DAILY_CAP: STANDALONE_DAILY_CAP, ALBUM_SIZE: ALBUM_SIZE, ALBUM_COMPLETE_BONUS: ALBUM_COMPLETE_BONUS,
        DUPLICATE_COINS: DUPLICATE_COINS, BOSS_CARDS: BOSS_CARDS, NO_COIN_MODES: NO_COIN_MODES,
        normalizeState: normalizeState, addCoins: addCoins, levelCoins: levelCoins, recordStreak: recordStreak,
        gameCoins: gameCoins, awardStandalone: awardStandalone, today: today,
        flattenPortraits: flattenPortraits, rarityOf: rarityOf, buildAlbum: buildAlbum, buildAlbums: buildAlbums, albumOfWorld: albumOfWorld,
        albumProgress: albumProgress, cardCount: cardCount, drawCards: drawCards, claimAlbum: claimAlbum,
        costumes: costumes, decors: decors, catalog: catalog, findItem: findItem, canBuy: canBuy, buy: buy, equip: equip
    };
}));
