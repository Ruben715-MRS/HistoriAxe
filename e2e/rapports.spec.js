// Rapports du jury (js/app/rapports.js) : la carte dans la rangée de « CAPES & Agrégation », la liste, un rapport dans son cadre isolé.

const { test, expect, visibleScreen } = require('./fixtures');

test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
        markRecapShownThisWeek();
        showScreen('screen-categories');
        initCategories();
    });
});

test('CAPES & Agrégation : la carte « Rapports du jury » ouvre la liste, puis le rapport dans un cadre isolé', async ({ page }) => {
    await page.getByRole("button", { name: /CAPES/ }).first().click();
    const card = page.locator('.rapports-launcher');
    await expect(card).toBeVisible();
    await card.locator('.gallery-launcher-btn').click();
    expect(await visibleScreen(page)).toBe('screen-rapports');
    await expect(page.locator('#rapports-list .btn')).toHaveCount(2);
    await page.locator('#rapports-list .btn', { hasText: 'Agrégation de géographie 2027' }).click();
    expect(await visibleScreen(page)).toBe('screen-rapport');
    const frame = page.locator('#rapport-frame');
    await expect(frame).toHaveAttribute('src', 'assets/rapports/agregation-geographie-2026.html');
    await expect(frame).toHaveAttribute('sandbox', /allow-scripts/);
    await page.locator('#screen-rapport .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-rapports');
    await expect(page.locator('#rapport-frame')).not.toHaveAttribute('src', /.+/);
});
