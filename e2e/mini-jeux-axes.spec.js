// Les mini-jeux sur des axes choisis : depuis l'écran des axes d'un thème, « Mini-jeux » ouvre la salle sur les seuls événements
// des axes cochés (tous, incontournables ou non). Un jeu qui manque d'événements est grisé avec sa raison.
const { test, expect, openThemeCard } = require('./fixtures');

const THEME = 'thm_am';   // Les Amériques (1550-1660), 5 axes, 98 événements

const card = (page, game) => page.locator('.arcade-card', { has: page.locator('#arcade-best-' + game) });

test('Mini-jeux sur les axes : le vivier, la bannière, les jeux grisés, le retour à la salle entière', async ({ page }) => {
    await openThemeCard(page, THEME);
    await expect(page.locator('#screen-axes')).toBeVisible();
    await expect(page.locator('#axes-minigames-btn')).toBeEnabled();

    await page.locator('#axes-minigames-btn').click();
    await expect(page.locator('#screen-arcade')).toBeVisible();
    await expect(page.locator('#arcade-scope')).toContainText('Les Amériques');
    await expect(page.locator('#arcade-scope')).toContainText('98 événement(s) jouables');

    // Tous les événements des axes entrent, y compris ceux qui ne sont pas incontournables.
    const vivier = await page.evaluate(() => {
        const essentiels = new Set(getCurrentTheme().essentiel || []);
        const pool = arcadePool();
        return { total: pool.length, horsIncontournables: pool.filter(e => !essentiels.has(e.id)).length };
    });
    expect(vivier.total).toBe(98);
    expect(vivier.horsIncontournables).toBeGreaterThan(0);

    // Seuls les jeux à vivier restent sur la page : les autres (roue, ères, Avent…) sont cachés.
    await expect(card(page, 'wheel')).toBeHidden();
    await expect(card(page, 'who')).toBeHidden();
    await expect(page.locator('.arcade-card', { hasText: 'Quiz des pays' })).toBeHidden();
    await expect(card(page, 'snake')).toBeVisible();

    // Tetris et Space Invaders exigent des événements dans chaque période : ce thème n'en couvre pas assez, ils sont grisés.
    await expect(card(page, 'tetris')).toBeDisabled();
    await expect(card(page, 'tetris').locator('.arcade-why')).toContainText('grande période');
    await expect(card(page, 'invaders')).toBeDisabled();
    await expect(card(page, 'snake')).toBeEnabled();

    // Un jeu accessible s'ouvre avec le vivier du thème.
    await card(page, 'snake').click();
    await expect(page.locator('#screen-snake')).toBeVisible();
    expect(await page.evaluate(() => arcadePool().length)).toBe(98);

    // Retour à la salle : toujours sur les axes choisis ; retour aux axes : la sélection est conservée.
    await page.locator('#screen-snake .back-btn').click();
    await expect(page.locator('#arcade-scope')).toBeVisible();
    await page.locator('#screen-arcade .back-btn').click();
    await expect(page.locator('#screen-axes')).toBeVisible();
    expect(await page.evaluate(() => arcadeScope)).toBeNull();
    await expect(page.locator('#axes-container .axis-card.selected')).toHaveCount(5);
});

test('Mini-jeux : bouton inactif sans axe coché ; la salle entière revient sans portée', async ({ page }) => {
    await openThemeCard(page, THEME);
    await page.locator('#axes-select-none').click();
    await expect(page.locator('#axes-minigames-btn')).toBeDisabled();
    await page.locator('#axes-select-all').click();
    await expect(page.locator('#axes-minigames-btn')).toBeEnabled();
    await page.locator('#axes-minigames-btn').click();
    await expect(page.locator('#screen-arcade')).toBeVisible();

    // Depuis la salle entière (le bouton de l'accueil), rien n'est filtré.
    await page.evaluate(() => { showScreen('screen-categories'); openArcade(); });
    await expect(page.locator('#arcade-scope')).toBeHidden();
    await expect(card(page, 'wheel')).toBeVisible();
    await expect(card(page, 'tetris')).toBeEnabled();
    expect(await page.evaluate(() => arcadeScope)).toBeNull();
});
