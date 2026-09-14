// Parcours 2 — l'écran de filtre par axe thématique.
//
// Ce parcours existe pour une régression précise, corrigée en septembre :
// la sélection d'axes d'un thème survivait au passage à un autre thème.
// Le second thème s'ouvrait alors avec tous ses axes décochés et
// « 0 événement sélectionné », le bouton Continuer restant actif, et
// lancer un mode se soldait par « Ce thème ne contient aucun événement »
// sur un thème qui en a cinquante (voir selectedAxesThemeId dans
// js/app.js: initAxes).
//
// Les deux moitiés de la règle comptent autant l'une que l'autre, et se
// contredisent assez pour qu'un correctif trop large casse la seconde :
// changer de thème REPART de tous les axes, revenir au même thème CONSERVE
// la sélection en cours.

const { test, expect, visibleScreen, openThemeCard } = require('./fixtures');

const THEME_A = 'thm_am';    // Les Amériques (1550-1660) — 5 axes
const THEME_B = 'thm_camp';  // Vivre à la campagne en France — 5 axes

// Les deux thèmes ont le même nombre d'axes, et c'est délibéré : la
// comparaison fautive portait sur la liste d'axes, si bien qu'un thème de
// taille différente aurait pu masquer le bug.

async function clickThemeCard(page, themeId) {
    await openThemeCard(page, themeId);
    await expect(page.locator('#screen-axes')).toBeVisible();
}

const axesCoches = page => page.locator('#axes-container .axis-card.selected');
const axes = page => page.locator('#axes-container .axis-card');

test('changer de thème repart de tous les axes sélectionnés', async ({ page }) => {
    await clickThemeCard(page, THEME_A);
    await expect(axesCoches(page)).toHaveCount(5);

    // Retour à la liste, puis un autre thème.
    await page.locator('#screen-axes .back-btn').click();
    await clickThemeCard(page, THEME_B);

    await expect(axes(page)).toHaveCount(5);
    await expect(axesCoches(page)).toHaveCount(5);
    await expect(page.locator('#axes-subtitle')).toContainText('50');

    // Et le thème est réellement jouable : c'est le symptôme qui rendait
    // le bug visible pour un joueur.
    await page.locator('#axes-continue-btn').click();
    await page.locator('#mode-card-discovery').click();
    // Ce thème propose un sommaire : « Découverte » déplie alors le choix.
    await page.locator('#discovery-picker .mode-picker-btn').first().click();
    await expect(page.locator('#screen-game')).toBeVisible();
    await expect(page.locator('#timeline .entry')).toHaveCount(50);
});

test('revenir sur le même thème conserve la sélection en cours', async ({ page }) => {
    await clickThemeCard(page, THEME_B);
    await expect(axesCoches(page)).toHaveCount(5);

    // Deux axes décochés. Les cartes sont reconstruites à chaque clic
    // (voir renderAxesScreen), d'où une sélection reprise à chaque fois.
    await axes(page).nth(0).click();
    await axes(page).nth(1).click();
    await expect(axesCoches(page)).toHaveCount(3);
    const sousTitre = await page.locator('#axes-subtitle').innerText();

    // Une partie, puis retour : la sélection doit être intacte.
    await page.locator('#axes-continue-btn').click();
    await page.locator('#mode-card-discovery').click();
    await page.locator('#discovery-picker .mode-picker-btn').first().click();
    await expect(page.locator('#screen-game')).toBeVisible();

    await page.locator('#screen-game .quit-btn').click();
    expect(await visibleScreen(page)).toBe('screen-axes');
    await expect(axesCoches(page)).toHaveCount(3);
    await expect(page.locator('#axes-subtitle')).toHaveText(sousTitre);
});

test('tout décocher désactive le bouton Continuer', async ({ page }) => {
    await clickThemeCard(page, THEME_A);

    const total = await axes(page).count();
    for (let i = 0; i < total; i++) {
        await axes(page).nth(i).click();
    }

    await expect(axesCoches(page)).toHaveCount(0);
    await expect(page.locator('#axes-continue-btn')).toBeDisabled();
});
