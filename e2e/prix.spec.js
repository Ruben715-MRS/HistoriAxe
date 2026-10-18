// Parcours — « Culture générale > Prix et récompenses > Prix Nobel ».
//
// Ce que les tests unitaires ne voient pas : la sous-catégorie s'ouvre depuis « Culture générale »
// avec sa note (la règle de datation, sans laquelle « 1993 » pour la PCR passerait pour une
// erreur), le thème propose ses six domaines comme axes, et une partie se joue jusqu'au bout.
// L'assertion « console vierge » du socle (e2e/fixtures.js) attrape d'elle seule un lien ou un
// identifiant cassé.

const { test, expect, visibleScreen, openThemeCard } = require('./fixtures');

test('Prix et récompenses : la note explique la règle de datation et le thème propose six axes', async ({ page }) => {
    await page.locator('#screen-home').click();
    const index = await page.evaluate(() => bdd.findIndex(c => c.nom === 'Culture générale'));
    expect(index, 'la catégorie « Culture générale » doit exister').toBeGreaterThanOrEqual(0);
    await page.locator('#cat-grid > div').nth(index).click();
    expect(await visibleScreen(page)).toBe('screen-subcategories');
    await expect(page.locator('#subcategories-container h4', { hasText: 'Prix et récompenses' })).toBeVisible();
    // Sa propre image, et non celle par défaut de « Culture générale ».
    await expect(page.locator('#subcategories-container > div > div', { has: page.locator('h4', { hasText: 'Prix et récompenses' }) })
        .first().locator('div[style*="background-image"]').first()).toHaveAttribute('style', /sub_prix_recompenses\.webp/);

    await page.locator('#subcategories-container h4', { hasText: 'Prix et récompenses' }).click();
    expect(await visibleScreen(page)).toBe('screen-themes');
    await expect(page.locator('#theme-screen-title')).toHaveText('Prix et récompenses');
    await expect(page.locator('#theme-screen-note-text')).toContainText('année du prix');
    // Les thèmes de prix, le Prix Nobel d'abord.
    await expect(page.locator('#themes-container .data-card-title').first()).toHaveText('Prix Nobel');
    expect(await page.locator('#themes-container .data-card-title').count()).toBeGreaterThanOrEqual(3);

    await openThemeCard(page, 'thm_nobel');
    await expect(page.locator('#screen-axes')).toBeVisible();
    await expect(page.locator('#axes-container .axis-card')).toHaveText([
        /Paix/, /Littérature/, /Physiologie ou médecine/, /Physique/, /Chimie/, /Économie/,
    ]);
});

test('Prix Nobel : une partie de Découverte se joue sur tous les prix', async ({ page }) => {
    await openThemeCard(page, 'thm_nobel');
    await page.locator('#axes-continue-btn').click();
    await page.locator('#mode-card-discovery').click();
    await expect(page.locator('#screen-game')).toBeVisible();
    // La frise complète : tous les repères du thème, rangés par année de prix.
    await expect(page.locator('#timeline .entry')).toHaveCount(284);
    await expect(page.locator('#timeline .entry').first()).toContainText('1901');
});
