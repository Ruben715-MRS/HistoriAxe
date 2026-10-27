// Clio, la mascotte (js/app/clio.js, js/clioCore.js) : où elle apparaît et ce qu'elle dit. Les règles de réaction sont
// testées dans tests/clio.test.js ; ici, ce qu'on voit.

const { test, expect } = require('./fixtures');

test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
        markRecapShownThisWeek();
        ['historiaxe_rewards_v1', 'historiaxe_clio_v1', 'historiaxe_streak_v1'].forEach(k => localStorage.removeItem(k));
        localStorage.setItem('historiaxe_path_v1', JSON.stringify({ levels: {}, skipped: ['monde0'] }));
        rewardsRevealCards = () => {};
        showScreen('screen-categories');
        initCategories();
    });
});

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

const clioState = page => page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_clio_v1') || '{}'));

test('à l\'accueil, Clio salue une fois par jour', async ({ page }) => {
    await page.evaluate(() => { localStorage.removeItem('historiaxe_clio_v1'); initCategories(); });
    await expect(page.locator('#screen-categories .clio-home')).toBeVisible();
    await expect(page.locator('#screen-categories .clio-home')).toHaveAttribute('data-event', 'greet');
    await expect(page.locator('#screen-categories .clio-home .clio')).toHaveAttribute('data-mood', 'salue');
    expect((await clioState(page)).greetedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Elle se ferme d'un tap, et ne revient pas le même jour.
    await page.locator('.clio-home .clio-close').click();
    await expect(page.locator('.clio-home')).toHaveCount(0);
    await page.evaluate(() => initCategories());
    await expect(page.locator('.clio-home')).toHaveCount(0);
});

test('à l\'accueil, une série quotidienne en danger la fait dormir', async ({ page }) => {
    await page.evaluate(() => {
        const hier = new Date(Date.now() - 86400000);
        const s = `${hier.getUTCFullYear()}-${String(hier.getUTCMonth() + 1).padStart(2, '0')}-${String(hier.getUTCDate()).padStart(2, '0')}`;
        localStorage.setItem('historiaxe_streak_v1', JSON.stringify({ currentStreak: 6, maxStreak: 6, lastPlayedDate: s }));
        localStorage.removeItem('historiaxe_clio_v1');
        initCategories();
    });
    await expect(page.locator('.clio-home')).toHaveAttribute('data-event', 'streakRisk');
    await expect(page.locator('.clio-home .clio')).toHaveAttribute('data-mood', 'dort');
    await expect(page.locator('.clio-home .clio-bubble')).toContainText('6 jours');
});

test('sur le Chemin, Clio se tient près du niveau à jouer et se présente la première fois', async ({ page }) => {
    await page.evaluate(() => { showScreen('screen-path'); renderPath(); });
    const marker = page.locator('.clio-marker');
    await expect(marker).toHaveCount(1);
    const box = await marker.boundingBox();
    const node = await page.locator('.path-node.is-next').boundingBox();
    expect(Math.abs(box.y + box.height / 2 - (node.y + node.height / 2))).toBeLessThan(40);
    // Première visite : Clio se présente en cinq bulles, puis la carte disparaît.
    const intro = page.locator('#clio-intro');
    await expect(intro).toBeVisible();
    await expect(intro.locator('.clio-intro-bubble')).toContainText('Clio');
    await expect(intro.locator('.clio-intro-count')).toHaveText('1 / 5');
    for (let i = 1; i <= 4; i++) await intro.locator('.clio-intro-next').click();
    await expect(intro.locator('.clio-intro-count')).toHaveText('5 / 5');
    await expect(intro.locator('.clio-intro-next')).toHaveText("C'est parti !");
    await intro.locator('.clio-intro-next').click();
    await expect(intro).toHaveCount(0);
    expect((await clioState(page)).introSeen).toBe(true);
    // Elle ne se présente qu'une fois ; en la touchant, elle encourage.
    await page.evaluate(() => renderPath());
    await expect(page.locator('#clio-intro')).toHaveCount(0);
    await expect(page.locator('.clio-marker-bubble')).toHaveCount(0);
    await page.locator('.clio-marker').click();
    await expect(page.locator('.clio-marker-bubble')).toBeVisible();
});

test('Clio porte le costume du moment', async ({ page }) => {
    await page.evaluate(() => {
        localStorage.setItem('historiaxe_rewards_v1', JSON.stringify({ coins: 0, owned: ['costume-prehistoire'], equipped: { costume: 'costume-prehistoire', decor: null } }));
        showScreen('screen-path'); renderPath();
    });
    await expect(page.locator('.clio-marker svg.clio-art')).toHaveAttribute('data-costume', 'mammouth');
});

test('à la fin d\'un niveau : joyeuse à trois étoiles, douce après une défaite', async ({ page }) => {
    await page.evaluate(() => pathStartLevel('prehistoire-1'));
    await jouerNiveau(page, { vies: 3 });
    const bravo = page.locator('#expedition-final .clio-final').first();
    await expect(bravo).toHaveAttribute('data-event', 'win3');
    await expect(bravo.locator('.clio')).toHaveAttribute('data-mood', 'ravi');
    await expect(bravo.locator('.clio-bubble')).not.toBeEmpty();

    await page.evaluate(() => { expeditionAbort(); showScreen('screen-categories'); initCategories(); pathStartLevel('prehistoire-2'); });
    await jouerNiveau(page, { gagne: false, vies: 0 });
    const triste = page.locator('#expedition-final .clio-final').first();
    await expect(triste).toHaveAttribute('data-event', 'lose');
    await expect(triste.locator('.clio')).toHaveAttribute('data-mood', 'triste');
});

test('le boss d\'un monde vaincu : Clio fête et propose le costume du monde', async ({ page }) => {
    await page.evaluate(() => {
        const levels = {};
        const w = PathCore.findWorld('prehistoire');
        PathCore.levelsOf(w).filter(l => !l.boss).forEach(l => { levels[l.id] = { stars: 3, best: 1, plays: 1 }; });
        localStorage.setItem('historiaxe_path_v1', JSON.stringify({ levels, skipped: ['monde0'] }));
        localStorage.setItem('historiaxe_rewards_v1', JSON.stringify({ coins: 500 }));
        pathStartLevel('prehistoire-boss');
    });
    await jouerNiveau(page, { vies: 3 });
    const boss = page.locator('#expedition-final .clio-final').first();
    await expect(boss).toHaveAttribute('data-event', 'boss');
    const hint = page.locator('#expedition-final .clio-costume-hint');
    await expect(hint).toContainText('Peau de mammouth');
    await expect(hint.locator('.clio')).toHaveAttribute('data-mood', 'reflechit');
    await hint.locator('.clio-shop-btn').click();
    await expect(page.locator('#screen-shop')).toBeVisible();
});

test('le boss vaincu avec trop peu de pièces : il dit ce qu\'il manque', async ({ page }) => {
    // Le boss rapporte ~110 pièces ; le costume d'Orient en coûte 125.
    await page.evaluate(() => {
        const levels = {};
        PathCore.levelsOf(PathCore.findWorld('prehistoire')).forEach(l => { levels[l.id] = { stars: 3, best: 1, plays: 1 }; });
        PathCore.levelsOf(PathCore.findWorld('orient')).filter(l => !l.boss).forEach(l => { levels[l.id] = { stars: 3, best: 1, plays: 1 }; });
        localStorage.setItem('historiaxe_path_v1', JSON.stringify({ levels, skipped: ['monde0'] }));
        pathStartLevel('orient-boss');
    });
    await jouerNiveau(page, { vies: 3 });
    await expect(page.locator('#expedition-final .clio-costume-hint')).toHaveAttribute('data-event', 'costumeShort');
    await expect(page.locator('#expedition-final .clio-costume-hint .clio-bubble')).toContainText('Il te manque');
});

test('après une première victoire, Clio marche jusqu\'au niveau suivant', async ({ page }) => {
    await page.evaluate(() => pathStartLevel('prehistoire-1'));
    await jouerNiveau(page, { vies: 3 });
    await page.evaluate(() => { expeditionAbort(); showScreen('screen-path'); renderPath(); });
    const marker = page.locator('.clio-marker');
    await expect(marker.locator('.clio')).toHaveClass(/is-walking/);
    await expect(marker.locator('.clio-walk svg.clio-walk-art')).toHaveCount(1); // de profil, sans costume
    await expect(marker.locator('.clio')).not.toHaveClass(/is-walking/, { timeout: 4000 });
    const nodeId = await page.evaluate(() => document.querySelector('.path-node.is-next').dataset.level);
    expect(nodeId).toBe('prehistoire-2');
});

test('costumée, Clio marche aussi de profil avec son costume', async ({ page }) => {
    await page.evaluate(() => {
        localStorage.setItem('historiaxe_rewards_v1', JSON.stringify({ coins: 0, owned: ['costume-prehistoire'], equipped: { costume: 'costume-prehistoire', decor: null } }));
        pathStartLevel('prehistoire-1');
    });
    await jouerNiveau(page, { vies: 3 });
    await page.evaluate(() => { expeditionAbort(); showScreen('screen-path'); renderPath(); });
    await expect(page.locator('.clio-marker .clio-walk svg.clio-walk-art')).toHaveAttribute('data-costume', 'mammouth');
});

test('avec « réduire les animations », Clio ne marche pas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => pathStartLevel('prehistoire-1'));
    await jouerNiveau(page, { vies: 3 });
    await page.evaluate(() => { expeditionAbort(); showScreen('screen-path'); renderPath(); });
    await expect(page.locator('.clio-marker .clio')).not.toHaveClass(/is-walking/);
});

test('dans la boutique, Clio fait une pirouette pour essayer le costume qu\'on enfile', async ({ page }) => {
    await page.evaluate(() => {
        localStorage.setItem('historiaxe_rewards_v1', JSON.stringify({ coins: 0, owned: ['costume-prehistoire'], equipped: { costume: null, decor: null } }));
        openShop('screen-categories');
    });
    await expect(page.locator('#shop-clio-avatar .clio')).not.toHaveClass(/is-essaie/);
    await page.locator('.shop-item[data-item="costume-prehistoire"] .shop-item-btn').click();
    await expect(page.locator('#shop-clio-avatar .clio')).toHaveClass(/is-essaie/);
    await expect(page.locator('#shop-clio-avatar svg.clio-art')).toHaveAttribute('data-costume', 'mammouth');
});

test('la carte qui complète un album fait danser Clio', async ({ page }) => {
    await page.evaluate(() => {
        const albums = rewardsData().albums;
        const world = Object.keys(albums).find(k => albums[k].length > 1);
        const album = albums[world], last = album[album.length - 1];
        const cards = {};
        album.forEach(c => { cards[c.id] = 1; });
        localStorage.setItem('historiaxe_rewards_v1', JSON.stringify({ coins: 0, cards, owned: [], equipped: { costume: null, decor: null } }));
        rewardsReveal = { cards: [{ id: last.id, rarity: last.rarity, isNew: true, coins: 0 }], index: 0 };
        document.getElementById('modal-card-reveal').classList.remove('hidden');
        rewardsRevealShow();
    });
    const clio = page.locator('#card-reveal-clio .clio-react');
    await expect(clio).toHaveAttribute('data-event', 'album');
    await expect(clio.locator('.clio')).toHaveAttribute('data-mood', 'danse');
    await expect(clio.locator('.clio-bubble')).not.toBeEmpty();
});

test('dans la boutique, toucher un costume l\'agrandit sans l\'acheter ; Échap referme', async ({ page }) => {
    await page.evaluate(() => {
        localStorage.setItem('historiaxe_rewards_v1', JSON.stringify({ coins: 500, owned: [], equipped: { costume: null, decor: null } }));
        openShop('screen-categories');
    });
    const item = page.locator('.shop-item[data-item="costume-prehistoire"]');
    await item.locator('.shop-item-view').click();
    await expect(page.locator('#shop-zoom')).toBeVisible();
    await expect(page.locator('#shop-zoom .shop-zoom-name')).toHaveText('Peau de mammouth');
    await expect(page.locator('#shop-zoom svg.clio-art')).toHaveAttribute('data-costume', 'mammouth');
    expect((await clioState(page)).equipped).toBeUndefined();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_rewards_v1')).coins)).toBe(500);
    await page.keyboard.press('Escape');
    await expect(page.locator('#shop-zoom')).toHaveCount(0);
});
