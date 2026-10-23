// Parcours — le tutoriel guidé (js/onboarding.js).
//
// Le socle (e2e/fixtures.js) marque le tutoriel comme terminé pour que ses bulles ne masquent pas
// les clics des autres parcours. Ici, on le rejoue : « Revoir le tutoriel » (restartOnboarding) remet
// l'état à zéro et ramène au menu principal, comme le fait le bouton des Réglages.

const { test, expect, openThemeModes } = require('./fixtures');

const bulle = page => page.locator('.onboarding-bubble');
const titre = page => page.locator('.onboarding-bubble-title');
const suivant = page => page.locator('.onboarding-next');

const etat = page => page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_onboarding_v1')));

// Marque des pas comme déjà vus, sans rejouer le tour du menu.
const marquerVus = (page, ids) => page.evaluate(ids => {
    localStorage.setItem('historiaxe_onboarding_v1', JSON.stringify({ completed: false, shownSteps: ids }));
}, ids);

const TOUR_MENU = ['welcome', 'path', 'rewards', 'daily_or_categories', 'revise', 'more', 'profile'];

test('le tour du menu enchaîne sept bulles, chacune sur son bouton, puis s’arrête', async ({ page }) => {
    await page.evaluate(() => restartOnboarding());

    const attendus = [
        { titre: /Bienvenue/, cible: null },
        { titre: /Chemin du Temps/, cible: '#btn-path' },
        { titre: /Pièces, album/, cible: '.rewards-bar' },
        { titre: /Défis/, cible: '#btn-daily' },
        { titre: /Réviser/, cible: '#btn-reviser' },
        { titre: /Et aussi/, cible: '#quick-actions-2' },
        { titre: /profil/, cible: '.profile-btn' }
    ];

    for (const attendu of attendus) {
        await expect(titre(page)).toHaveText(attendu.titre);
        if (attendu.cible) {
            // La bulle éclaire bien le bouton qu'elle décrit : le « trou » du projecteur recouvre la cible.
            const [spot, cible] = await Promise.all([
                page.locator('.onboarding-spotlight').boundingBox(),
                page.locator(attendu.cible).first().boundingBox()
            ]);
            expect(spot, `un projecteur doit éclairer ${attendu.cible}`).not.toBeNull();
            expect(spot.x).toBeLessThanOrEqual(cible.x + 1);
            expect(spot.y).toBeLessThanOrEqual(cible.y + 1);
            expect(spot.x + spot.width).toBeGreaterThanOrEqual(cible.x + cible.width - 1);
            expect(spot.y + spot.height).toBeGreaterThanOrEqual(cible.y + cible.height - 1);
        }
        await suivant(page).click();
    }

    await expect(bulle(page)).toHaveCount(0);
    expect((await etat(page)).shownSteps).toEqual(expect.arrayContaining(TOUR_MENU));
});

test('« Passer le tutoriel » arrête tout, et rien ne revient', async ({ page }) => {
    await page.evaluate(() => restartOnboarding());
    await expect(titre(page)).toHaveText(/Bienvenue/);

    await page.locator('.onboarding-skip').click();
    await expect(bulle(page)).toHaveCount(0);
    expect((await etat(page)).completed).toBe(true);

    // Revenir au menu ne rappelle aucune bulle.
    await page.evaluate(() => showScreen('screen-categories'));
    await page.waitForTimeout(900);
    await expect(bulle(page)).toHaveCount(0);
});

test('un tour interrompu reprend à la bulle suivante', async ({ page }) => {
    await marquerVus(page, ['welcome', 'path']);
    await page.evaluate(() => showScreen('screen-categories'));
    await expect(titre(page)).toHaveText(/Pièces, album/);
});

test('la carte des mondes explique ses niveaux à la première visite seulement', async ({ page }) => {
    await marquerVus(page, TOUR_MENU);
    await page.evaluate(() => openPath());
    await expect(titre(page)).toHaveText(/carte des mondes/);
    await suivant(page).click();
    await expect(bulle(page)).toHaveCount(0);

    await page.evaluate(() => { showScreen('screen-categories'); openPath(); });
    await page.waitForTimeout(900);
    await expect(bulle(page)).toHaveCount(0);
});

test('l’écran des modes présente « Jouer », puis les autres modes', async ({ page }) => {
    await marquerVus(page, [...TOUR_MENU, 'path_screen']);
    await openThemeModes(page, 'thm_be');

    await expect(titre(page)).toHaveText(/Jouer/);
    await expect(page.locator('.onboarding-spotlight')).toBeVisible();
    await suivant(page).click();

    await expect(titre(page)).toHaveText(/Tous les modes/);
    await suivant(page).click();
    await expect(bulle(page)).toHaveCount(0);
});

test('la dernière étape du tutoriel le déclare terminé', async ({ page }) => {
    await marquerVus(page, [...TOUR_MENU,
        'path_screen', 'modes_play', 'first_xp']);
    await openThemeModes(page, 'thm_be');
    await expect(titre(page)).toHaveText(/Tous les modes/);
    await suivant(page).click();
    expect((await etat(page)).completed).toBe(true);
});
