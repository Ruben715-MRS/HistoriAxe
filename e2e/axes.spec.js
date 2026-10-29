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
    const taille = await page.evaluate(() => getCurrentTheme().events.length);
    await expect(page.locator('#axes-subtitle')).toContainText(String(taille));

    // Et le thème est réellement jouable : c'est le symptôme qui rendait
    // le bug visible pour un joueur.
    await page.locator('#axes-continue-btn').click();
    await page.locator('#mode-card-discovery').click();
    // Ce thème propose un sommaire : « Découverte » déplie alors le choix.
    await page.locator('#discovery-picker .mode-picker-btn').first().click();
    await expect(page.locator('#screen-game')).toBeVisible();
    await expect(page.locator('#timeline .entry')).toHaveCount(taille);
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

async function ouvrirFrise(page, mode) {
    await page.setViewportSize({ width: 390, height: 800 });
    await clickThemeCard(page, THEME_B);
    await page.locator('#axes-continue-btn').click();
    if (mode === 'discovery') {
        await page.locator('#mode-card-discovery').click();
        await page.locator('#discovery-picker .mode-picker-btn').first().click();
    } else {
        await page.locator('#mode-card-classic').click();
    }
    await expect(page.locator('#screen-game')).toBeVisible();
    await page.waitForTimeout(600);
}

// Toute la carte est à l'écran : ni débordement à droite, ni défilement horizontal en portrait.
async function carteEntiereALEcran(page) {
    const mesures = await page.evaluate(() => {
        const board = document.querySelector('#screen-game .board');
        const cartes = [...document.querySelectorAll('#timeline .entry-title')].map(el => Math.round(el.getBoundingClientRect().right));
        return { cartes, largeur: window.innerWidth, scroll: board.scrollWidth, client: board.clientWidth };
    });
    expect(mesures.cartes.length).toBeGreaterThan(0);
    for (const droite of mesures.cartes) expect(droite).toBeLessThanOrEqual(mesures.largeur);
    expect(mesures.scroll).toBeLessThanOrEqual(mesures.client);
}

test('en partie, l’axe se lit au liseré de la carte : pas de nom d’axe dessous, la carte tient à l’écran, défilement vertical seul', async ({ page }) => {
    await ouvrirFrise(page, 'classic');
    const premiere = page.locator('#timeline .entry[data-axis]').first();
    await expect(premiere).toBeVisible();
    // Le liseré de la couleur de l'axe (ombre intérieure en haut de la carte)…
    const ombre = await premiere.locator('.entry-title').evaluate(el => getComputedStyle(el).boxShadow);
    expect(ombre).toContain('inset');
    // … et plus d'étiquette sous le titre.
    await expect(premiere.locator('.entry-axe-badge')).toBeHidden();
    await carteEntiereALEcran(page);
    expect(await page.locator('#screen-game .board').evaluate(el => getComputedStyle(el).touchAction)).toBe('pan-y');
});

test('le réglage « nom de l’axe sous les événements » le rend visible en partie, sans faire déborder la carte', async ({ page }) => {
    await page.evaluate(() => { appSettings.axisUnderEvents = true; settingsSave(appSettings); });
    await ouvrirFrise(page, 'classic');
    const badge = page.locator('#timeline .entry[data-axis] .entry-axe-badge').first();
    await expect(badge).toBeVisible();
    await carteEntiereALEcran(page);
});

test('en Découverte, le nom de l’axe reste affiché sous l’événement, et la carte tient à l’écran', async ({ page }) => {
    await ouvrirFrise(page, 'discovery');
    await expect(page.locator('#timeline .entry[data-axis] .entry-axe-badge').first()).toBeVisible();
    await carteEntiereALEcran(page);
});

test('en paysage sur téléphone, le seul défilement possible est horizontal', async ({ page }) => {
    await ouvrirFrise(page, 'classic');
    await page.setViewportSize({ width: 800, height: 390 });
    await page.waitForTimeout(600);
    expect(await page.locator('#screen-game .board').evaluate(el => getComputedStyle(el).touchAction)).toBe('pan-x');
});

test('en Découverte, sur grand écran : un bouton « disposition » à gauche de A-/A+ ouvre le réglage de disposition ; il est absent sur téléphone et en partie', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await clickThemeCard(page, THEME_B);
    await page.locator('#axes-continue-btn').click();
    await page.locator('#mode-card-discovery').click();
    await page.locator('#discovery-picker .mode-picker-btn').first().click();
    await expect(page.locator('#screen-game')).toBeVisible();
    const btn = page.locator('#hud-layout-btn');
    await expect(btn).toBeVisible();
    // Placé juste avant le bouton de taille de texte, sur la même ligne.
    const ordre = await page.evaluate(() => {
        const b = document.getElementById('hud-layout-btn');
        return b.nextElementSibling && b.nextElementSibling.classList.contains('type-size');
    });
    expect(ordre).toBe(true);
    await btn.click();
    await expect(page.locator('#modal-settings')).toBeVisible();
    await expect(page.locator('#settings-landscape-flow')).toBeVisible();
    await expect(page.locator('#settings-landscape-flow button.active')).toHaveCount(1);
    // Seulement les trois réglages d'affichage : le reste (langue, son, notifications…) n'est pas proposé ici.
    await expect(page.locator('#settings-orientation')).toBeVisible();
    await expect(page.locator('#settings-appearance')).toBeVisible();
    await expect(page.locator('#settings-play-mode')).toBeHidden();
    await expect(page.locator('#settings-account')).toBeHidden();
    await expect(page.locator('#settings-axis-under-events')).toBeHidden();
    // Le réglage se change ici, et le menu principal garde le sien.
    await page.locator('#settings-landscape-flow button', { hasText: /^Ligne$/ }).click();
    await expect(page.locator('#settings-landscape-flow button', { hasText: /^Ligne$/ })).toHaveClass(/active/);
    await page.locator('#modal-settings .close-btn').click();
    await expect(page.locator('#modal-settings')).toBeHidden();
    await expect(page.locator('#screen-game')).toBeVisible();
    // Depuis le menu principal, les Réglages restent complets.
    await page.evaluate(() => openSettings());
    await expect(page.locator('#settings-play-mode')).toBeVisible();
    await expect(page.locator('#settings-account')).toBeVisible();
    await page.locator('#modal-settings .close-btn').click();
});

test('le bouton « disposition » n\'apparaît ni sur téléphone, ni en partie', async ({ page }) => {
    await clickThemeCard(page, THEME_B);
    await page.locator('#axes-continue-btn').click();
    await page.locator('#mode-card-discovery').click();
    await page.locator('#discovery-picker .mode-picker-btn').first().click();
    await expect(page.locator('#screen-game')).toBeVisible();
    await expect(page.locator('#hud-layout-btn')).toBeHidden(); // téléphone (390 px)
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.locator('#hud-layout-btn')).toBeVisible();
    // En partie (Classique), le bouton n'est pas proposé.
    await page.evaluate(() => startActualGame('classic'));
    await expect(page.locator('#screen-game')).toBeVisible();
    await expect(page.locator('#hud-layout-btn')).toBeHidden();
});
