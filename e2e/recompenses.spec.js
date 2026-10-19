// Les récompenses (js/app/rewards.js, js/rewardsCore.js) : pièces, série de victoires, cartes de personnages,
// boutique de Clio, album. Les règles sont testées dans tests/rewards.test.js ; ici, ce qu'on voit et ce qui s'enregistre.

const { test, expect, visibleScreen, openThemeModes } = require('./fixtures');

const KEY = 'historiaxe_rewards_v1';

test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
        markRecapShownThisWeek();
        localStorage.removeItem('historiaxe_rewards_v1');
        localStorage.setItem('historiaxe_path_v1', JSON.stringify({ levels: {}, skipped: ['monde0'] }));
        showScreen('screen-categories');
        initCategories();
    });
});

const etat = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY);

// Un joueur arrivé au monde `worldId` (tous les niveaux d'avant faits, une étoile) avec, en plus, `rewards`.
async function arrivee(page, worldId, rewards = null, extra = {}) {
    await page.evaluate(({ worldId, rewards, extra, KEY }) => {
        const levels = {};
        for (const w of PathCore.mainWorlds()) {
            if (w.id === worldId) break;
            PathCore.levelsOf(w).forEach(l => { levels[l.id] = { stars: 1, best: 1, plays: 1 }; });
        }
        Object.entries(extra).forEach(([id, stars]) => { levels[id] = { stars, best: 100, plays: 1 }; });
        localStorage.setItem('historiaxe_path_v1', JSON.stringify({ levels, skipped: [] }));
        if (rewards) localStorage.setItem(KEY, JSON.stringify(rewards));
        showScreen('screen-categories');
        initCategories();
    }, { worldId, rewards, extra, KEY });
}

async function finirEpreuve(page, { gagne = true, vies } = {}) {
    await page.evaluate(({ gagne, vies }) => { if (vies !== undefined) lives = vies; score = 100; endGame(gagne); }, { gagne, vies });
}

async function jouerNiveau(page, { gagne = true, vies = 3 } = {}) {
    const n = await page.evaluate(() => expedition.stages.length);
    for (let i = 0; i < n; i++) {
        if (await page.locator('#expedition-final').isVisible()) break;
        await page.locator('#expedition-go').click();
        await finirEpreuve(page, { gagne, vies });
    }
}

test('la barre des récompenses : pièces, série, boutique et album, sur les catégories comme sur la carte', async ({ page }) => {
    await expect(page.locator('#screen-categories .rewards-bar')).toBeVisible();
    await expect(page.locator('#screen-categories .rewards-coins-n')).toHaveText('0');
    await expect(page.locator('#screen-categories .rewards-streak-n')).toHaveText('0');
    await expect(page.locator('#screen-categories .rewards-album-btn small')).toHaveText(/^0\/\d+$/);
    await page.locator('#btn-path').click();
    await expect(page.locator('#path-rewards .rewards-bar')).toBeVisible();
});

test('réussir un niveau du premier coup à trois étoiles : 30 pièces, qui montent et s\'enregistrent', async ({ page }) => {
    await page.evaluate(() => pathStartLevel('prehistoire-1'));
    await jouerNiveau(page, { vies: 3 });
    await expect(page.locator('.rewards-summary')).toBeVisible();
    await expect(page.locator('#rewards-final-gain')).toHaveText('+30 🪙', { timeout: 8000 });
    await expect(page.locator('#rewards-final-wallet b')).toHaveText('30');
    await expect(page.locator('.rewards-parts')).toContainText('Niveau réussi +20');
    await expect(page.locator('.rewards-parts')).toContainText('Premier passage +10');
    const s = await etat(page);
    expect(s.coins).toBe(30);
    expect(s.streak.current).toBe(1);
    // Les trois étoiles sont des éléments animés.
    await expect(page.locator('.path-final-stars .path-star.is-earned')).toHaveCount(3);
    await expect(page.locator('.path-final-stars')).toHaveText('★★★');
});

test('la série de victoires : la deuxième victoire d\'affilée rapporte 5 pièces de plus, une défaite la brise', async ({ page }) => {
    await page.evaluate(() => pathStartLevel('prehistoire-1'));
    await jouerNiveau(page, { vies: 3 });
    await page.locator('#expedition-next-level').click();
    await jouerNiveau(page, { vies: 3 });
    await expect(page.locator('.rewards-parts')).toContainText('Série de 2 victoires +5');
    await expect(page.locator('.rewards-streak-line')).toContainText('Série de victoires : 2');
    expect((await etat(page)).coins).toBe(30 + 35);
    // Une défaite remet la série à zéro (le record reste), et paie une consolation.
    await page.locator('#expedition-next-level').click();
    await page.locator('#expedition-go').click();
    await finirEpreuve(page, { gagne: true, vies: 3 });
    await page.locator('#expedition-go').click();
    await finirEpreuve(page, { gagne: false, vies: 0 });
    await expect(page.locator('.rewards-streak-line')).toContainText('brisée');
    await expect(page.locator('.rewards-parts')).toContainText('Consolation +2');
    const s = await etat(page);
    expect(s.streak).toEqual({ current: 0, best: 2 });
    expect(s.coins).toBe(30 + 35 + 2);
});

test('rejouer un niveau déjà réussi à trois étoiles ne paie que 40 % et ne donne ni prime ni carte', async ({ page }) => {
    await arrivee(page, 'prehistoire', null, { 'prehistoire-1': 3 });
    await page.evaluate(() => pathStartLevel('prehistoire-1'));
    await jouerNiveau(page, { vies: 3 });
    await expect(page.locator('.rewards-parts')).toContainText('Niveau réussi +8');
    await expect(page.locator('.rewards-parts')).not.toContainText('Premier passage');
    expect((await etat(page)).coins).toBe(8);
});

test('une carte de personnage tombe à la première réussite : elle se retourne, se range dans l\'album', async ({ page }) => {
    await arrivee(page, 'grece');
    await page.evaluate(() => pathStartLevel('grece-1'));
    await jouerNiveau(page, { vies: 3 });
    await expect(page.locator('.rewards-card-chip')).toHaveCount(1);
    // La carte se révèle d'elle-même après les étoiles et les pièces.
    await expect(page.locator('#modal-card-reveal')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#card-reveal-kicker')).toHaveText('Nouvelle carte !');
    await expect(page.locator('#card-reveal-note')).toContainText('1/12');
    await expect(page.locator('#card-flip')).toHaveClass(/is-flipped/);
    await expect(page.locator('#card-front .card-name')).not.toBeEmpty();
    await expect(page.locator('#card-front img')).toBeVisible();
    const s = await etat(page);
    expect(Object.keys(s.cards)).toHaveLength(1);
    await page.locator('#card-reveal-next').click();
    await expect(page.locator('#modal-card-reveal')).toBeHidden();
    // La carte est dans l'album.
    await page.locator('#expedition-leave').click();
    await page.locator('#path-rewards .rewards-album-btn').click();
    expect(await visibleScreen(page)).toBe('screen-album');
    await expect(page.locator('.album-world[data-world="grece"] .album-world-count')).toHaveText('1/12');
    await expect(page.locator('.album-world[data-world="grece"] .album-card.is-owned')).toHaveCount(1);
    await expect(page.locator('.album-world[data-world="grece"] .album-card.is-missing')).toHaveCount(11);
    // Les mondes pas encore atteints restent fermés.
    await expect(page.locator('.album-world[data-world="rome1"]')).toHaveClass(/is-locked/);
    // Toucher la carte ouvre la fiche de la figure.
    await page.locator('.album-card.is-owned').click();
    await expect(page.locator('#modal-details')).toBeVisible();
});

test('un boss battu pour la première fois donne trois cartes, dont une rare au moins', async ({ page }) => {
    await arrivee(page, 'grece', null, Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map(n => ['grece-' + n, 2])));
    await page.evaluate(() => pathStartLevel('grece-boss'));
    await jouerNiveau(page, { vies: 3 });
    await expect(page.locator('.rewards-card-chip')).toHaveCount(3);
    const cartes = Object.keys((await etat(page)).cards);
    expect(cartes).toHaveLength(3);
    await expect(page.locator('#modal-card-reveal')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#card-reveal-next')).toHaveText('Carte suivante');
    await page.locator('#card-reveal-next').click();
    await page.locator('#card-reveal-next').click();
    await expect(page.locator('#card-reveal-next')).toHaveText('Continuer');
    await page.locator('#card-reveal-next').click();
    await expect(page.locator('#modal-card-reveal')).toBeHidden();
});

test('« réduire les animations » : les valeurs finales et la carte apparaissent aussitôt', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await arrivee(page, 'grece');
    await page.evaluate(() => pathStartLevel('grece-1'));
    await jouerNiveau(page, { vies: 3 });
    await expect(page.locator('#rewards-final-gain')).toHaveText('+30 🪙', { timeout: 1500 });
    await expect(page.locator('#modal-card-reveal')).toBeVisible({ timeout: 1500 });
});

test('la boutique de Clio : un costume s\'achète avec les pièces, s\'enfile, et un monde pas atteint reste fermé', async ({ page }) => {
    await arrivee(page, 'orient', { coins: 130, earned: 130 });
    await page.locator('#screen-categories .rewards-shop-btn').click();
    expect(await visibleScreen(page)).toBe('screen-shop');
    await expect(page.locator('#shop-coins')).toHaveText('130');
    await expect(page.locator('.shop-item')).toHaveCount(21);
    // Le monde de l'Orient est atteint (la Préhistoire est faite) : on peut acheter le costume de la Préhistoire.
    const mammouth = page.locator('.shop-item[data-item="costume-prehistoire"]');
    await expect(mammouth.locator('.shop-item-btn')).toHaveText('🪙 100');
    await expect(mammouth.locator('.shop-item-btn')).toBeEnabled();
    // Un monde pas atteint : fermé, avec la raison.
    const rome = page.locator('.shop-item[data-item="costume-rome1"]');
    await expect(rome).toHaveClass(/is-locked/);
    await expect(rome.locator('.shop-item-btn')).toBeDisabled();
    await expect(rome.locator('small')).toContainText('Atteignez');
    // L'Orient coûte 125 : avec 30 pièces restantes, il est trop cher.
    await mammouth.locator('.shop-item-btn').click();
    await expect(page.locator('#shop-coins')).toHaveText('30');
    await expect(mammouth).toHaveClass(/is-owned/);
    await expect(mammouth.locator('.shop-item-btn')).toHaveText('Porté');
    await expect(page.locator('#shop-clio-costume')).toHaveText('🦴');
    await expect(page.locator('#shop-clio-caption')).toContainText('Peau de mammouth');
    await expect(page.locator('.shop-item[data-item="costume-orient"] .shop-item-btn')).toBeDisabled();
    const s = await etat(page);
    expect(s).toMatchObject({ coins: 30, spent: 100, owned: ['costume-prehistoire'] });
    expect(s.equipped.costume).toBe('costume-prehistoire');
    // Retour : la barre affiche le nouveau solde.
    await page.locator('#screen-shop .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-categories');
    await expect(page.locator('#screen-categories .rewards-coins-n')).toHaveText('30');
});

test('un costume acheté se change à volonté', async ({ page }) => {
    await arrivee(page, 'grece', { coins: 500, earned: 500, owned: ['costume-prehistoire', 'costume-orient'], equipped: { costume: 'costume-orient' } });
    await page.evaluate(() => openShop('screen-categories'));
    await page.locator('.shop-item[data-item="costume-prehistoire"] .shop-item-btn').click();
    await expect(page.locator('#shop-clio-costume')).toHaveText('🦴');
    expect((await etat(page)).equipped.costume).toBe('costume-prehistoire');
    await expect(page.locator('.shop-item[data-item="costume-orient"] .shop-item-btn')).toHaveText('Porter');
});

test('une partie libre rapporte quelques pièces ; le plafond du jour les arrête', async ({ page }) => {
    await openThemeModes(page, 'thm_be');
    await page.evaluate(() => { startActualGame('classic'); score = 300; endGame(true); });
    await expect(page.locator('#end-coins')).toBeVisible();
    await expect(page.locator('#end-coins')).toContainText('+', { timeout: 5000 });
    const s = await etat(page);
    // 8 pièces de victoire, 3 pour 300 points, 10 pour une partie parfaite (aucune erreur).
    expect(s.coins).toBe(21);
    // Plafond : 199 déjà gagnées aujourd'hui, une seule pièce passe.
    await page.evaluate(() => {
        const st = JSON.parse(localStorage.getItem('historiaxe_rewards_v1'));
        st.standalone = { date: RewardsCore.today(), coins: 199 };
        localStorage.setItem('historiaxe_rewards_v1', JSON.stringify(st));
        startActualGame('classic'); score = 300; endGame(true);
    });
    await expect(page.locator('#end-coins')).toContainText('+1', { timeout: 5000 });
    await page.evaluate(() => { startActualGame('classic'); score = 300; endGame(true); });
    await expect(page.locator('#end-coins')).toContainText('Plafond');
});

test('l\'entraînement et la découverte ne rapportent rien', async ({ page }) => {
    await openThemeModes(page, 'thm_be');
    await page.evaluate(() => { startActualGame('training'); endGame(true); });
    await expect(page.locator('#end-coins')).toBeHidden();
    expect((await etat(page)).coins || 0).toBe(0);
});

test('une expédition libre rapporte aussi des pièces', async ({ page }) => {
    await openThemeModes(page, 'thm_be');
    await page.locator('#mode-card-expedition').click();
    for (let i = 0; i < 8; i++) {
        if (await page.locator('#expedition-final').isVisible()) break;
        await page.locator('#expedition-go').click();
        await finirEpreuve(page, { gagne: true, vies: 3 });
    }
    await expect(page.locator('.rewards-summary')).toBeVisible();
    await expect(page.locator('#rewards-final-gain')).toHaveText('+52 🪙', { timeout: 8000 });
});
