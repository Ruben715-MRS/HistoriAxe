// La colonne des grades (js/app/ranks.js) : tous les niveaux sur une colonne, une ligne qui monte avec l'XP.

const { test, expect } = require('./fixtures');

async function ouvrir(page, xp) {
    await page.evaluate(xp => {
        markRecapShownThisWeek();
        localStorage.setItem('historiaxe_path_v1', JSON.stringify({ levels: {}, skipped: ['monde0'] }));
        const d = gamificationLoad();
        d.xp = xp;
        gamificationSave(d);
        showScreen('screen-categories');
        initCategories();
        openProfileModal();
    }, xp);
    await page.locator('.profile-ranks-btn').click();
    await expect(page.locator('#screen-ranks')).toBeVisible();
}

const remplissage = page => page.locator('.ranks-fill').evaluate(el => el.offsetHeight);

test('ouvre la colonne depuis le profil : 10 grades, le grade actuel signalé, la ligne à bonne hauteur', async ({ page }) => {
    await ouvrir(page, 2332);
    await expect(page.locator('.ranks-row')).toHaveCount(10);
    await expect(page.locator('.ranks-row.is-reached')).toHaveCount(3);
    await expect(page.locator('.ranks-row.is-current')).toHaveCount(1);
    await expect(page.locator('.ranks-row.is-current .ranks-here')).toBeVisible();
    const h = await remplissage(page);
    expect(h).toBeGreaterThan(250);
    expect(h).toBeLessThan(350);
});

test('au début la ligne est basse ; au sommet elle remplit toute la colonne', async ({ page }) => {
    await ouvrir(page, 0);
    await expect(page.locator('.ranks-row.is-reached')).toHaveCount(1);
    expect(await remplissage(page)).toBeLessThan(100);
    await page.locator('#screen-ranks .back-btn').click();
    await ouvrir(page, 50000);
    await expect(page.locator('.ranks-row.is-reached')).toHaveCount(10);
    expect(await remplissage(page)).toBe(1000);
});

test('le bouton retour ramène à l\'accueil', async ({ page }) => {
    await ouvrir(page, 600);
    await page.locator('#screen-ranks .back-btn').click();
    await expect(page.locator('#screen-ranks')).toBeHidden();
    await expect(page.locator('#screen-categories')).toBeVisible();
});
