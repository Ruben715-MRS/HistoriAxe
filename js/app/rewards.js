// =========================================================================
// === RÉCOMPENSES — PIÈCES, SÉRIE DE VICTOIRES, CARTES, BOUTIQUE (écrans et effets) ===
// =========================================================================
// Les règles (combien de pièces, quelle carte tombe, ce qu'on peut acheter) sont dans js/rewardsCore.js, testé hors
// navigateur ; ici : l'état stocké, les écrans (boutique de Clio, album des personnages, révélation d'une carte), la
// barre « pièces · série · boutique · album » et les effets de fin de niveau (étoiles qui jaillissent, pièces qui
// volent jusqu'au porte-monnaie, compteur qui monte). Tous les effets respectent « réduire les animations » : on
// montre alors directement les valeurs finales.
//
// Trois portes d'entrée, appelées par le reste du jeu :
//  - rewardsOnLevelFinish : fin d'un niveau du Chemin (js/app/path.js) ;
//  - rewardsOnExpeditionFinish : fin d'une Expédition libre (js/app/expedition.js) ;
//  - rewardsOnGameEnd : fin d'une partie libre (endGame, js/app/session-end.js).

let rewardsCache = null; // { bdd, size, albums, items }
let rewardsReturn = 'screen-categories';
let rewardsReveal = null; // { cards, index } pendant la révélation

function rewardsReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// Les albums du pack chargé, et un index id → fiche (pour afficher un portrait et ouvrir sa fiche).
function rewardsData() {
    const current = window.bdd || bdd || [];
    const size = current.length;
    if (rewardsCache && rewardsCache.bdd === current && rewardsCache.size === size) return rewardsCache;
    const albums = RewardsCore.buildAlbums(PathCore.WORLDS, RewardsCore.flattenPortraits(current));
    const items = new Map();
    getAllEventsWithLocation().forEach(item => { if (portraitOf(item.event)) items.set(item.event.id, item); });
    rewardsCache = { bdd: current, size, albums, items };
    return rewardsCache;
}

function rewardsState() { return RewardsCore.normalizeState(typeof rewardsLoad === 'function' ? rewardsLoad() : null); }
function rewardsCommit(state) { if (typeof rewardsSave === 'function') rewardsSave(state); }

function rewardsAlbumTotals(state) {
    const data = rewardsData();
    let have = 0, total = 0;
    Object.keys(data.albums).forEach(id => {
        const p = RewardsCore.albumProgress(state, data.albums[id]);
        have += p.have; total += p.total;
    });
    return { have, total };
}

function rewardsWorldReached(worldId) {
    const world = PathCore.findWorld(worldId);
    return !!world && PathCore.isWorldUnlocked(world, pathProgress());
}

// --- La barre pièces · série · boutique · album ----------------------------------------------------------

function renderRewardsBar(container, returnScreen) {
    if (!container) return;
    const old = container.querySelector(':scope > .rewards-bar');
    if (old) old.remove();
    const state = rewardsState();
    const totals = rewardsAlbumTotals(state);
    const bar = document.createElement('div');
    bar.className = 'rewards-bar';
    bar.innerHTML = `
        <span class="rewards-chip rewards-coins" role="img"><span aria-hidden="true">🪙</span> <b class="rewards-coins-n"></b></span>
        <span class="rewards-chip rewards-streak" role="img"><span aria-hidden="true">⚡</span> <b class="rewards-streak-n"></b></span>
        <button type="button" class="rewards-btn rewards-shop-btn"><span aria-hidden="true">🛍️</span> <span class="rewards-btn-label"></span></button>
        <button type="button" class="rewards-btn rewards-album-btn"><span aria-hidden="true">🎴</span> <span class="rewards-btn-label"></span> <small></small></button>
        <button type="button" class="rewards-btn rewards-team-btn"><span aria-hidden="true">👥</span> <span class="rewards-btn-label"></span> <small></small></button>`;
    bar.querySelector('.rewards-coins-n').innerText = state.coins;
    bar.querySelector('.rewards-coins').setAttribute('aria-label', t('rewards.coins_aria', { count: state.coins }));
    bar.querySelector('.rewards-streak-n').innerText = state.streak.current;
    bar.querySelector('.rewards-streak').setAttribute('aria-label', t('rewards.streak_aria', { count: state.streak.current }));
    bar.querySelector('.rewards-streak').classList.toggle('is-hot', state.streak.current >= 2);
    bar.querySelector('.rewards-shop-btn .rewards-btn-label').innerText = t('rewards.shop');
    bar.querySelector('.rewards-album-btn .rewards-btn-label').innerText = t('rewards.album');
    bar.querySelector('.rewards-album-btn small').innerText = totals.have + '/' + totals.total;
    bar.querySelector('.rewards-team-btn .rewards-btn-label').innerText = t('team.short');
    bar.querySelector('.rewards-team-btn small').innerText = typeof teamChipText === 'function' ? teamChipText() : '';
    bar.querySelector('.rewards-team-btn').onclick = () => openTeam(returnScreen);
    bar.querySelector('.rewards-shop-btn').onclick = () => openShop(returnScreen);
    bar.querySelector('.rewards-album-btn').onclick = () => openAlbum(returnScreen);
    container.insertBefore(bar, container.firstChild);
}

// --- Fin d'un niveau du Chemin --------------------------------------------------------------------------

// info : { worldId, won, stars, prevStars, boss, stagesDone }. Verse pièces, série et cartes ; renvoie le résumé affiché
// sur l'écran de fin (et rejoué par rewardsPlayFinal).
function rewardsOnLevelFinish(info) {
    let state = rewardsState();
    const before = state.coins;
    const streak = RewardsCore.recordStreak(state, info.won);
    state = streak.state;
    const coins = RewardsCore.levelCoins({
        won: info.won, stars: info.stars, prevStars: info.prevStars, boss: info.boss,
        stagesDone: info.stagesDone, streakAfter: streak.current
    });
    state = RewardsCore.addCoins(state, coins.total + streak.milestone);

    const world = PathCore.findWorld(info.worldId);
    const data = rewardsData();
    const album = world ? RewardsCore.albumOfWorld(data.albums, world) : [];
    const count = RewardsCore.cardCount({ won: info.won, stars: info.stars, prevStars: info.prevStars, boss: info.boss });
    let drawn = [], duplicateCoins = 0, albumBonus = 0;
    if (count > 0 && album.length) {
        const draw = RewardsCore.drawCards(state, album, count, null, !!info.boss && info.prevStars === 0);
        state = draw.state;
        drawn = draw.drawn;
        duplicateCoins = draw.coins;
        const claim = RewardsCore.claimAlbum(state, world.island ? world.parent : world.id, album);
        state = claim.state;
        albumBonus = claim.bonus;
    }
    rewardsCommit(state);
    return {
        coins: coins.total, parts: coins.parts, milestone: streak.milestone, duplicateCoins, albumBonus,
        total: coins.total + streak.milestone + duplicateCoins + albumBonus,
        streak: { current: streak.current, best: streak.best, broken: !info.won },
        cards: drawn, before, balance: state.coins, played: false
    };
}

// Expédition libre : quelques pièces, dans le plafond des parties libres.
function rewardsOnExpeditionFinish(won, stagesDone) {
    const wanted = stagesDone * 4 + (won ? 20 : 0);
    const before = rewardsState().coins;
    const res = RewardsCore.awardStandalone(rewardsState(), wanted);
    rewardsCommit(res.state);
    return { coins: res.paid, parts: {}, milestone: 0, duplicateCoins: 0, albumBonus: 0, total: res.paid, capped: res.capped,
        streak: null, cards: [], before, balance: res.state.coins, played: false };
}

// Partie libre (endGame) : renvoie { paid, capped, balance } ou null (mode sans enjeu, ou rien gagné).
function rewardsOnGameEnd(info) {
    const wanted = RewardsCore.gameCoins({
        mode: info.mode, won: info.isWin, score: info.score, perfect: info.perfect,
        daily: info.mode === 'daily' || info.mode === 'weekly'
    });
    if (wanted <= 0) return null;
    const res = RewardsCore.awardStandalone(rewardsState(), wanted);
    rewardsCommit(res.state);
    return { paid: res.paid, capped: res.capped, balance: res.state.coins };
}

// Écran de fin d'une partie libre : « +12 🪙 » qui monte, quelques pièces qui s'envolent.
let rewardsEndToken = 0; // une animation plus ancienne ne doit pas écraser la dernière partie

function rewardsShowEndCoins(info) {
    const el = document.getElementById('end-coins');
    if (!el) return;
    const token = ++rewardsEndToken;
    if (!info) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.classList.toggle('is-capped', info.paid === 0);
    if (info.paid === 0) {
        el.innerText = t('rewards.cap_reached');
        return;
    }
    replayAnimClass(el, 'xp-rise');
    animateCountUp(0, info.paid, 700, (val) => {
        if (token === rewardsEndToken) el.innerText = t('rewards.end_coins', { n: val, balance: info.balance });
    });
    if (!rewardsReducedMotion()) rewardsBurst(el, el, '🪙', Math.min(6, Math.ceil(info.paid / 4)), true);
}

// --- L'écran de fin d'un niveau : le résumé, puis les effets ---------------------------------------------------------

function rewardsPartLine(key, n, params) {
    const li = document.createElement('li');
    li.innerText = t(key, params || {}) + ' +' + n;
    return li;
}

function rewardsRenderFinal(extra, r) {
    if (!extra || !r) return;
    const box = document.createElement('div');
    box.className = 'rewards-summary';
    const head = document.createElement('div');
    head.className = 'rewards-final-head';
    head.innerHTML = '<span class="rewards-final-gain" id="rewards-final-gain"></span><span class="rewards-chip" id="rewards-final-wallet"><span aria-hidden="true">🪙</span> <b></b></span>';
    head.querySelector('#rewards-final-gain').innerText = r.played ? '+' + r.total + ' 🪙' : '+0 🪙';
    head.querySelector('b').innerText = r.played ? r.balance : r.before;
    box.appendChild(head);

    const list = document.createElement('ul');
    list.className = 'rewards-parts';
    const p = r.parts || {};
    if (p.base) list.appendChild(rewardsPartLine('rewards.part_level', p.base));
    if (p.consolation) list.appendChild(rewardsPartLine('rewards.part_consolation', p.consolation));
    if (p.firstClear) list.appendChild(rewardsPartLine('rewards.part_first', p.firstClear));
    if (p.streak) list.appendChild(rewardsPartLine('rewards.part_streak', p.streak, { n: r.streak.current }));
    if (r.milestone) list.appendChild(rewardsPartLine('rewards.part_milestone', r.milestone, { n: r.streak.current }));
    if (r.duplicateCoins) list.appendChild(rewardsPartLine('rewards.part_duplicate', r.duplicateCoins));
    if (r.albumBonus) list.appendChild(rewardsPartLine('rewards.part_album', r.albumBonus));
    if (list.children.length) box.appendChild(list);
    if (r.capped) {
        const cap = document.createElement('p');
        cap.className = 'rewards-cap';
        cap.innerText = t('rewards.cap_reached');
        box.appendChild(cap);
    }

    if (r.cards && r.cards.length) {
        const cards = document.createElement('div');
        cards.className = 'rewards-card-chips';
        r.cards.forEach(c => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'rewards-card-chip rarity-' + c.rarity;
            chip.innerText = '🎴';
            chip.setAttribute('aria-label', t('rewards.card_chip_aria', { rarity: t('rewards.rarity.' + c.rarity) }));
            chip.onclick = () => rewardsRevealCards(r.cards);
            cards.appendChild(chip);
        });
        box.appendChild(cards);
    }
    if (r.streak) {
        const s = document.createElement('p');
        s.className = 'rewards-streak-line' + (r.streak.current >= 2 ? ' is-hot' : '');
        s.innerText = r.streak.broken ? t('rewards.streak_broken', { best: r.streak.best }) : t('rewards.streak_line', { n: r.streak.current });
        box.appendChild(s);
    }
    extra.appendChild(box);
}

// Les effets d'un résumé, une seule fois : les étoiles jaillissent (CSS), le gain monte et les pièces volent vers
// le porte-monnaie, puis les cartes se retournent.
function rewardsPlayFinal(r) {
    if (!r || r.played) return;
    r.played = true;
    const gain = document.getElementById('rewards-final-gain');
    const wallet = document.getElementById('rewards-final-wallet');
    const stars = document.querySelector('.path-final-stars');
    const settle = () => {
        if (gain) gain.innerText = '+' + r.total + ' 🪙';
        if (wallet) wallet.querySelector('b').innerText = r.balance;
    };
    const reveal = () => {
        const final = document.getElementById('expedition-final');
        const onFinalScreen = !document.getElementById('screen-expedition').classList.contains('hidden') && final && !final.classList.contains('hidden');
        if (onFinalScreen && r.cards && r.cards.length) rewardsRevealCards(r.cards);
    };
    if (rewardsReducedMotion()) { settle(); reveal(); return; }
    // Les étoiles arrivent (animation CSS, 0,25 s d'écart), puis les pièces.
    setTimeout(() => {
        if (typeof playCorrectSound === 'function') playCorrectSound(1.2);
        if (r.total > 0 && wallet) rewardsBurst(stars || gain, wallet, '🪙', Math.min(12, Math.ceil(r.total / 4)));
        animateCountUp(0, r.total, 900, (val) => { if (gain) gain.innerText = '+' + val + ' 🪙'; });
        animateCountUp(r.before, r.balance, 900, (val) => { if (wallet) wallet.querySelector('b').innerText = val; });
        if (r.streak && r.streak.current >= 3 && typeof triggerConfetti === 'function') triggerConfetti(1200);
    }, stars ? 900 : 200);
    setTimeout(reveal, stars ? 2400 : 1500);
}

// Des particules (🪙, ★) qui partent d'un élément et filent vers un autre. `local` : elles restent sur place et s'élèvent.
function rewardsBurst(fromEl, toEl, glyph, count, local) {
    if (!fromEl || rewardsReducedMotion()) return;
    const a = fromEl.getBoundingClientRect();
    const b = (toEl || fromEl).getBoundingClientRect();
    for (let i = 0; i < count; i++) {
        const p = document.createElement('span');
        p.className = 'rewards-particle';
        p.setAttribute('aria-hidden', 'true');
        p.innerText = glyph;
        const x0 = a.left + a.width / 2 + (Math.random() - 0.5) * Math.min(80, a.width);
        const y0 = a.top + a.height / 2;
        p.style.left = x0 + 'px';
        p.style.top = y0 + 'px';
        document.body.appendChild(p);
        const dx = local ? (Math.random() - 0.5) * 60 : b.left + b.width / 2 - x0;
        const dy = local ? -40 - Math.random() * 30 : b.top + b.height / 2 - y0;
        const delay = i * 70;
        setTimeout(() => {
            p.style.transform = `translate(${dx}px, ${dy}px) scale(${local ? 0.8 : 0.6})`;
            p.style.opacity = local ? '0' : '0.9';
        }, 30 + delay);
        setTimeout(() => p.remove(), 1000 + delay);
    }
}

// --- La révélation d'une carte --------------------------------------------------------------------------------

function rewardsCardItem(id) { return rewardsData().items.get(id) || null; }

function rewardsCardName(item) { return item ? galleryNameOf(item.event).name : '?'; }

// Remplit une face de carte (portrait, nom, naissance, rareté) — pour la révélation comme pour l'album.
function rewardsFillCardFace(el, card, item) {
    el.innerHTML = '<div class="card-portrait"></div><div class="card-name"></div><div class="card-date"></div><div class="card-rarity"></div>';
    const img = document.createElement('img');
    img.alt = '';
    img.width = 120; img.height = 150;
    img.decoding = 'async';
    const image = item ? portraitOf(item.event) : null;
    if (image) { img.src = image.src; img.onerror = () => img.classList.add('hidden'); el.querySelector('.card-portrait').appendChild(img); }
    el.querySelector('.card-name').innerText = rewardsCardName(item);
    el.querySelector('.card-date').innerText = item ? formatYear(item.event.date) : '';
    el.querySelector('.card-rarity').innerText = '★'.repeat({ commune: 1, rare: 2, legendaire: 3 }[card.rarity] || 1) + ' ' + t('rewards.rarity.' + card.rarity);
    el.className = el.className.replace(/\brarity-\w+/g, '').trim() + ' rarity-' + card.rarity;
}

function rewardsRevealCards(cards) {
    if (!cards || !cards.length) return;
    rewardsReveal = { cards, index: 0 };
    document.getElementById('modal-card-reveal').classList.remove('hidden');
    rewardsRevealShow();
}

function rewardsRevealShow() {
    const r = rewardsReveal;
    if (!r) return;
    const card = r.cards[r.index];
    const item = rewardsCardItem(card.id);
    const flip = document.getElementById('card-flip');
    flip.classList.remove('is-flipped');
    rewardsFillCardFace(document.getElementById('card-front'), card, item);
    const world = rewardsWorldOfCard(card.id);
    const state = rewardsState();
    const prog = world ? RewardsCore.albumProgress(state, rewardsData().albums[world]) : null;
    document.getElementById('card-reveal-kicker').innerText = card.isNew ? t('rewards.card_new') : t('rewards.card_duplicate', { coins: card.coins });
    document.getElementById('card-reveal-note').innerText = prog ? t('rewards.card_progress', { have: prog.have, total: prog.total, world: pathWorldTitle(PathCore.findWorld(world)) }) : '';
    const last = r.index >= r.cards.length - 1;
    document.getElementById('card-reveal-next').innerText = t(last ? 'rewards.card_done' : 'rewards.card_next');
    // On retourne la carte tout de suite si l'on a demandé moins d'animations, sinon après un battement.
    if (rewardsReducedMotion()) flip.classList.add('is-flipped');
    else setTimeout(() => flip.classList.add('is-flipped'), 350);
    document.getElementById('card-reveal-next').focus();
}

function rewardsWorldOfCard(cardId) {
    const albums = rewardsData().albums;
    return Object.keys(albums).find(id => albums[id].some(c => c.id === cardId)) || null;
}

function rewardsRevealNext() {
    const r = rewardsReveal;
    if (!r) return;
    if (r.index < r.cards.length - 1) { r.index += 1; rewardsRevealShow(); return; }
    rewardsRevealClose();
}

function rewardsRevealClose() {
    rewardsReveal = null;
    document.getElementById('modal-card-reveal').classList.add('hidden');
}

function rewardsRevealToAlbum() {
    rewardsRevealClose();
    openAlbum('screen-path');
}

// --- L'album des personnages -------------------------------------------------------------------------------------

function openAlbum(from) {
    rewardsReturn = from || 'screen-categories';
    showScreen('screen-album', 'forward');
    renderAlbum();
}

// La flèche des écrans de boutique et d'album : retour d'où l'on vient, redessiné (les pièces ont pu changer).
function rewardsBack() {
    showScreen(rewardsReturn, 'back');
    if (rewardsReturn === 'screen-path' && typeof renderPath === 'function') renderPath();
    else if (typeof initCategories === 'function') initCategories();
}

function renderAlbum() {
    const list = document.getElementById('album-list');
    if (!list) return;
    list.innerHTML = '';
    const data = rewardsData();
    const state = rewardsState();
    const totals = rewardsAlbumTotals(state);
    document.getElementById('album-subtitle').innerText = t('rewards.album_subtitle', { have: totals.have, total: totals.total });
    const progress = pathProgress();
    PathCore.mainWorlds().forEach(world => {
        const album = data.albums[world.id];
        if (!album) return;
        const open = PathCore.isWorldUnlocked(world, progress);
        const prog = RewardsCore.albumProgress(state, album);
        const section = document.createElement('section');
        section.className = 'album-world' + (open ? '' : ' is-locked');
        section.dataset.world = world.id;
        const head = document.createElement('h3');
        head.className = 'album-world-head';
        head.innerHTML = '<span class="album-world-icon" aria-hidden="true"></span><span class="album-world-title"></span><span class="album-world-count"></span>';
        head.querySelector('.album-world-icon').innerText = open ? world.icon : '🔒';
        head.querySelector('.album-world-title').innerText = pathWorldTitle(world);
        head.querySelector('.album-world-count').innerText = prog.complete ? '✓ ' + prog.have + '/' + prog.total : prog.have + '/' + prog.total;
        section.appendChild(head);
        if (open) {
            const grid = document.createElement('div');
            grid.className = 'album-grid';
            album.forEach(card => grid.appendChild(rewardsAlbumCard(card, !!state.cards[card.id])));
            section.appendChild(grid);
        }
        list.appendChild(section);
    });
}

function rewardsAlbumCard(card, owned) {
    const item = rewardsCardItem(card.id);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'album-card rarity-' + card.rarity + (owned && item ? ' is-owned' : ' is-missing');
    el.dataset.card = card.id;
    if (owned && item) {
        rewardsFillCardFace(el, card, item);
        el.classList.add('is-owned');
        el.setAttribute('aria-label', rewardsCardName(item) + ', ' + t('rewards.rarity.' + card.rarity));
        el.onclick = () => openModal(item.event, item);
    } else {
        el.innerHTML = '<div class="card-portrait card-unknown" aria-hidden="true">?</div><div class="card-rarity"></div>';
        el.querySelector('.card-rarity').innerText = '★'.repeat({ commune: 1, rare: 2, legendaire: 3 }[card.rarity] || 1);
        el.setAttribute('aria-label', t('rewards.card_missing_aria', { rarity: t('rewards.rarity.' + card.rarity) }));
        el.disabled = true;
    }
    return el;
}

// --- La boutique de Clio ---------------------------------------------------------------------------------------------

function openShop(from) {
    rewardsReturn = from || 'screen-categories';
    showScreen('screen-shop', 'forward');
    renderShop();
}

function rewardsCostumeName(item) { return t('rewards.costumes.' + item.world); }

function renderShop() {
    const state = rewardsState();
    document.getElementById('shop-coins').innerText = state.coins;
    // Clio : un chat de remplacement (emoji) portant le costume du moment, en attendant les dessins.
    const worn = state.equipped.costume ? RewardsCore.findItem(state.equipped.costume) : null;
    document.getElementById('shop-clio-costume').innerText = worn ? worn.emoji : '';
    document.getElementById('shop-clio-caption').innerText = worn
        ? t('rewards.clio_wears', { name: rewardsCostumeName(worn) })
        : t('rewards.clio_bare');
    const list = document.getElementById('shop-list');
    list.innerHTML = '';
    RewardsCore.costumes().forEach(item => {
        const owned = state.owned.indexOf(item.id) !== -1;
        const worldOpen = rewardsWorldReached(item.world);
        const li = document.createElement('li');
        li.className = 'shop-item' + (owned ? ' is-owned' : '') + (!worldOpen && !owned ? ' is-locked' : '');
        li.dataset.item = item.id;
        li.innerHTML = '<span class="shop-item-emoji" aria-hidden="true"></span><span class="shop-item-text"><strong></strong><small></small></span><button type="button" class="btn shop-item-btn"></button>';
        li.querySelector('.shop-item-emoji').innerText = worldOpen || owned ? item.emoji : '🔒';
        li.querySelector('strong').innerText = rewardsCostumeName(item);
        const world = PathCore.findWorld(item.world);
        li.querySelector('small').innerText = worldOpen || owned ? pathWorldTitle(world) : t('rewards.shop_locked', { world: pathWorldTitle(world) });
        const btn = li.querySelector('.shop-item-btn');
        if (owned) {
            const wearing = state.equipped.costume === item.id;
            btn.innerText = t(wearing ? 'rewards.shop_worn' : 'rewards.shop_wear');
            btn.disabled = wearing;
            btn.onclick = () => shopEquip(item.id);
        } else {
            btn.innerText = '🪙 ' + item.price;
            btn.disabled = !worldOpen || state.coins < item.price;
            btn.classList.toggle('is-short', worldOpen && state.coins < item.price);
            btn.onclick = () => shopBuy(item.id);
        }
        list.appendChild(li);
    });
}

function shopBuy(id) {
    const res = RewardsCore.buy(rewardsState(), id, rewardsWorldReached(RewardsCore.findItem(id).world));
    if (!res.ok) {
        showToast(t(res.reason === 'coins' ? 'rewards.shop_short' : 'rewards.shop_cannot'), 2200);
        return;
    }
    rewardsCommit(res.state);
    if (typeof playVictorySound === 'function') playVictorySound();
    if (typeof triggerConfetti === 'function') triggerConfetti(1500);
    showToast(t('rewards.shop_bought', { name: rewardsCostumeName(RewardsCore.findItem(id)) }), 2600);
    renderShop();
}

function shopEquip(id) {
    const item = RewardsCore.findItem(id);
    if (!item) return;
    rewardsCommit(RewardsCore.equip(rewardsState(), item.slot, id));
    renderShop();
}
