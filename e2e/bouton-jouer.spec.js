// Le bouton « Jouer » des jeux d'arcade : `.btn:active` pose `transform: scale(.96) !important`, qui écrasait le translate de centrage et faisait sauter
// le bouton sous le doigt (le clic n'avait alors pas lieu).
const { test, expect } = require('./fixtures');
test('le bouton « Jouer » reste centré quand on l\'appuie (pas de saut vers le bas-droite) et lance la partie au premier clic', async ({ page }) => {
    await page.evaluate(() => { markRecapShownThisWeek(); showScreen('screen-categories'); initCategories(); });
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Snake' }).click();
    const btn = page.locator('#snake-start'); await page.waitForTimeout(1000);
    const before = await btn.boundingBox();
    const board = await page.locator('#snake-start').evaluate(b => b.parentElement.getBoundingClientRect().toJSON());
    expect(Math.abs(before.x + before.width / 2 - (board.x + board.width / 2))).toBeLessThan(2);
    expect(Math.abs(before.y + before.height / 2 - (board.y + board.height / 2))).toBeLessThan(2);
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    const during = await btn.boundingBox();
    expect(Math.abs(during.x + during.width / 2 - (before.x + before.width / 2))).toBeLessThan(2);
    expect(Math.abs(during.y + during.height / 2 - (before.y + before.height / 2))).toBeLessThan(2);
    await page.mouse.up();
    await expect(btn).toBeHidden();
});
