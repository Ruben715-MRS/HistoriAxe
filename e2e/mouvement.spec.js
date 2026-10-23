// Parcours — les changements ne sont pas instantanés : poser une carte, ouvrir un écran ou une modale,
// afficher une nouvelle question se font par un court mouvement (voir js/app/motion.js et la section
// « MOUVEMENT » de css/style.css).
//
// Le test ne mesure pas le rendu, seulement qu'il y a bien une animation en cours là où il faut — et
// qu'avec « réduire les animations », il n'y en a aucune. C'est la régression typique de ce domaine :
// une classe renommée, un appel déplacé avant la reconstruction de la frise, et le mouvement disparaît
// sans qu'aucune erreur ne se déclenche.

const { test, expect, openThemeModes } = require('./fixtures');

const THEME = 'thm_be';

// Noms des animations en cours sur les éléments qui correspondent au sélecteur.
async function animationsDe(page, selecteur) {
    return page.evaluate(sel => document.querySelectorAll(sel).length
        ? Array.from(document.querySelectorAll(sel)).flatMap(el => el.getAnimations().map(a => a.animationName || 'web-animation'))
        : [], selecteur);
}

// Index du créneau où la carte en main va réellement.
const bonCreneau = () => {
    let i = 0;
    while (i < placedEvents.length && placedEvents[i].date < eventToPlace.date) i++;
    return i;
};

test('la carte posée atterrit sur la frise, les autres glissent à leur place', async ({ page }) => {
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-training').click();
    await expect(page.locator('#timeline button.slot').first()).toBeVisible();
    await page.waitForFunction(() => isAnimating === false);
    // Quelques cartes déjà posées : il faut des repères qui se décalent quand la suivante s'insère.
    for (let n = 0; n < 3; n++) {
        const bon = await page.evaluate(bonCreneau);
        await page.locator('#timeline button.slot').nth(bon).click();
        await page.waitForFunction(() => isAnimating === false);
    }

    // On pose la prochaine carte tout en haut de la frise si elle y va, sinon on la pose où elle va :
    // dans les deux cas, au moins un repère se décale (la frise a au moins 4 repères).
    // Le clic et la lecture se font dans la même image : sur une machine chargée, 600 ms de mouvement
    // peuvent sinon être écoulées avant que le test ne regarde.
    const vu = await page.evaluate(() => {
        const bon = (() => { let i = 0; while (i < placedEvents.length && placedEvents[i].date < eventToPlace.date) i++; return i; })();
        const avant = placedEvents.length;
        document.querySelectorAll('#timeline button.slot')[bon].click();
        return new Promise(resolve => requestAnimationFrame(() => {
            const noms = sel => Array.from(document.querySelectorAll(sel)).flatMap(el => el.getAnimations().map(a => a.animationName || 'web'));
            resolve({
                bon, avant,
                posee: noms('#timeline .entry.entry-correct-pulse'),
                glissements: Array.from(document.querySelectorAll('#timeline .entry'))
                    .filter(el => !el.classList.contains('entry-correct-pulse')).flatMap(el => el.getAnimations()).length,
                main: noms('#hand .hand-card')
            });
        }));
    });
    // La carte posée a son animation d'arrivée…
    expect(vu.posee).toContain('entryLand');
    // …et, si elle n'est pas la dernière, les repères qui la suivent glissent (animation Web, pas CSS).
    if (vu.bon < vu.avant) expect(vu.glissements).toBeGreaterThan(0);
    // La nouvelle carte « en main » arrive aussi par un mouvement.
    expect(vu.main).toContain('handCardIn');
});

test('la dernière carte atterrit avant l’écran de fin, et la partie ne se bloque pas', async ({ page }) => {
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-training').click();
    await expect(page.locator('#timeline button.slot').first()).toBeVisible();
    await page.waitForFunction(() => isAnimating === false);
    // Il ne reste que la carte en main : la prochaine pose est la dernière.
    await page.evaluate(() => { currentPool.length = 0; });

    const bon = await page.evaluate(bonCreneau);
    await page.locator('#timeline button.slot').nth(bon).click();

    // Le jeu est encore à l’écran, la carte arrive, et les clics sont ignorés le temps de l’arrivée…
    await expect(page.locator('#timeline .entry.entry-correct-pulse')).toHaveCount(1);
    await expect(page.locator('#screen-end')).toBeHidden();
    expect(await page.evaluate(() => isAnimating)).toBe(true);
    // …puis l’écran de fin s’ouvre.
    await expect(page.locator('#screen-end')).toBeVisible({ timeout: 5_000 });
    expect(await page.evaluate(() => isAnimating)).toBe(false);
});

test('les écrans et les modales s’ouvrent par un mouvement', async ({ page }) => {
    await openThemeModes(page, THEME);
    // Ouverture et lecture dans la même image (voir plus haut).
    const ecran = await page.evaluate(() => { showScreen('screen-categories'); return Array.from(document.querySelectorAll('#screen-categories')).flatMap(el => el.getAnimations().map(a => a.animationName)); });
    expect(ecran).toContain('motionScreenIn');

    const modale = await page.evaluate(() => {
        openSettings();
        return Array.from(document.querySelectorAll('#modal-settings, #modal-settings .modal-content')).flatMap(el => el.getAnimations().map(a => a.animationName));
    });
    expect(modale).toContain('motionOverlayIn');
    expect(modale).toContain('motionModalIn');
});

test('une nouvelle question du Quiz arrive en cascade', async ({ page }) => {
    await openThemeModes(page, THEME);
    await page.locator('.quiz-card').click();
    await expect(page.locator('#quiz-options .quiz-option').first()).toBeVisible();
    await page.waitForFunction(() => isAnimating === false);
    // Les réponses ont leur arrivée décalée (une par bouton, la première sans retard).
    const decalages = await page.evaluate(() => Array.from(document.querySelectorAll('#quiz-options .quiz-option'))
        .map(el => getComputedStyle(el).animationDelay));
    expect(decalages.length).toBeGreaterThan(1);
    expect(new Set(decalages).size).toBe(decalages.length);
});

test('le score rebondit quand il monte', async ({ page }) => {
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-classic').click();
    await expect(page.locator('#timeline button.slot').first()).toBeVisible();
    await page.waitForFunction(() => isAnimating === false);
    const bon = await page.evaluate(bonCreneau);
    await page.locator('#timeline button.slot').nth(bon).click();
    await expect(page.locator('#hud-score')).toHaveClass(/score-bump/);
});

test('« réduire les animations » : rien ne bouge, et la partie va jusqu’au bout aussitôt', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-training').click();
    await expect(page.locator('#timeline button.slot').first()).toBeVisible();
    await page.waitForFunction(() => isAnimating === false);

    const bon = await page.evaluate(bonCreneau);
    await page.locator('#timeline button.slot').nth(bon).click();
    await expect(page.locator('#timeline .entry')).toHaveCount(2);
    expect(await animationsDe(page, '#timeline .entry, #hand .hand-card, #screen-game')).toEqual([]);

    // Dernière carte : pas de délai, l’écran de fin suit aussitôt.
    await page.evaluate(() => { currentPool.length = 0; });
    const dernier = await page.evaluate(bonCreneau);
    await page.locator('#timeline button.slot').nth(dernier).click();
    await expect(page.locator('#screen-end')).toBeVisible({ timeout: 1_500 });
});
