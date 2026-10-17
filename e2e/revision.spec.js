// Réviser : la session du jour suit les échéances de la répétition espacée
// (js/srs.js), pas seulement la liste des points faibles.

const { test, expect, visibleScreen, openThemeModes } = require('./fixtures');

const JOUR = 24 * 3600 * 1000;

test('« Réviser (n) » compte ce qui est dû aujourd’hui, et la session du jour le propose', async ({ page }) => {
    await openThemeModes(page, 'thm_be');
    // 12 événements à échéance (boîte 2, dernière révision il y a 10 jours), 5 pas encore.
    await page.evaluate(({ JOUR }) => {
        const ids = getCurrentTheme().events.map(e => e.id);
        const data = {};
        ids.slice(0, 12).forEach(id => { data[id] = { box: 2, lastReviewed: Date.now() - 10 * JOUR, failCount: 0, successCount: 2 }; });
        ids.slice(12, 17).forEach(id => { data[id] = { box: 4, lastReviewed: Date.now(), failCount: 0, successCount: 4 }; });
        srsSave(data);
        showScreen('screen-categories');
        initCategories();
    }, { JOUR });

    await expect(page.locator('#btn-reviser')).toContainText('(12)');
    await page.locator('#btn-reviser').click();
    expect(await visibleScreen(page)).toBe('screen-revision-hub');
    // L'onglet « À réviser » s'ouvre en premier.
    await expect(page.locator('#revision-hub-due-container')).toBeVisible();
    await expect(page.locator('#revision-due-subtitle')).toContainText('12');
    await expect(page.locator('#revision-hub-weak-container')).toBeHidden();

    await page.locator('#revision-due-content .quantity-btn', { hasText: '10' }).click();
    expect(await visibleScreen(page)).toBe('screen-modes');
    expect(await page.evaluate(() => ({ kind: revisionKind, n: revisionEvents.length }))).toEqual({ kind: 'due', n: 10 });
    await page.locator('#btn-modes-play').click();
    await expect(page.locator('#screen-game')).toBeVisible();
});

test('sans échéance, l’onglet dit quand reviendront les premiers événements', async ({ page }) => {
    await openThemeModes(page, 'thm_be');
    await page.evaluate(() => {
        const id = getCurrentTheme().events[0].id;
        // Révisé hier en boîte 2 (3 jours) : dû dans deux jours ; un autre, boîte 1 révisé aujourd’hui : demain.
        const id2 = getCurrentTheme().events[1].id;
        srsSave({
            [id]: { box: 2, lastReviewed: Date.now() - 1 * 24 * 3600 * 1000, failCount: 0, successCount: 1 },
            [id2]: { box: 1, lastReviewed: Date.now(), failCount: 1, successCount: 0 }
        });
        showScreen('screen-categories'); initCategories();
        showScreen('screen-revision-hub'); initRevisionHub();
    });
    await expect(page.locator('#revision-due-empty')).toBeVisible();
    await expect(page.locator('#revision-due-empty')).toContainText('demain');
    await expect(page.locator('#revision-due-content')).toBeHidden();
});
