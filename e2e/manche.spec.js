// La longueur de la manche : combien d'événements du thème une partie retient.
//
// Jusqu'ici une partie valait le thème entier. Médiane de 18 événements, donc
// sans conséquence la plupart du temps — mais « Histoire de France » en compte
// 217 et « Inventions et découvertes » 400, que 3 vies rendent impossibles à
// terminer : les thèmes les plus riches de la base étaient les moins jouables.
//
// Le calcul de la longueur est déjà couvert sans navigateur
// (tests/storage.test.js) ; ce parcours vérifie ce qu'un module pur ne peut
// pas dire — que le sélecteur agit réellement sur la partie lancée, qu'il se
// souvient du choix, et qu'il s'efface là où il n'a rien à régler.

const { test, expect, openThemeCard, openThemeModes } = require('./fixtures');

// 72 événements : assez pour que les trois longueurs aient un sens.
const THEME_FOURNI = 'thm_aut';

const picker = '#round-length';
const boutons = '#round-length .round-length-btn';

async function choisir(page, libelle) {
    await page.locator(boutons, { hasText: libelle }).first().click();
}

test('le sélecteur propose les longueurs utiles et marque celle en cours', async ({ page }) => {
    await openThemeModes(page, THEME_FOURNI);
    await expect(page.locator(picker)).toBeVisible();

    // 10, 20 et « Tout (72) » : les trois changent quelque chose sur ce thème.
    await expect(page.locator(boutons)).toHaveCount(3);
    await expect(page.locator(boutons).last()).toContainText('72');
    // 20 par défaut : c'est ce qui borne les gros thèmes sans toucher aux petits.
    await expect(page.locator(`${boutons}.active`)).toHaveText('20');
    await expect(page.locator(picker)).toContainText('20');
});

test('choisir 10 lance bien une partie de 10, pas de 72', async ({ page }) => {
    await openThemeModes(page, THEME_FOURNI);
    await choisir(page, '10');
    await page.locator('#mode-card-classic').click();
    await page.waitForSelector('#screen-game:not(.hidden)');

    // Le compteur de la barre de jeu est la preuve visible pour le joueur.
    await expect(page.locator('#hud-count')).toHaveText('1 / 10');
    // `totalEvents` est le compte de la partie : la carte en main
    // (`eventToPlace`) n'est ni dans le pool restant ni dans les posées.
    expect(await page.evaluate(() => totalEvents)).toBe(10);
});

test('« Tout » rend le thème entier', async ({ page }) => {
    await openThemeModes(page, THEME_FOURNI);
    await choisir(page, 'Tout');
    await page.locator('#mode-card-classic').click();
    await page.waitForSelector('#screen-game:not(.hidden)');

    await expect(page.locator('#hud-count')).toHaveText('1 / 72');
    expect(await page.evaluate(() => totalEvents)).toBe(72);
});

test('le choix est retenu d’un thème à l’autre', async ({ page }) => {
    await openThemeModes(page, THEME_FOURNI);
    await choisir(page, '10');

    // Ressortir du thème et y revenir : le réglage est celui du joueur, pas
    // celui du thème.
    await page.evaluate(() => showScreen('screen-categories'));
    await openThemeModes(page, THEME_FOURNI);
    await expect(page.locator(`${boutons}.active`)).toHaveText('10');
});

test('la Découverte garde le thème entier malgré la manche', async ({ page }) => {
    // Une frise amputée n'a pas de sens : ce mode est une consultation, pas
    // une partie.
    await openThemeModes(page, THEME_FOURNI);
    await choisir(page, '10');
    await page.locator('#mode-card-discovery').click();
    await page.waitForSelector('#screen-game:not(.hidden)');

    const affiches = await page.evaluate(() => placedEvents.length);
    expect(affiches).toBe(72);
});

test('un vivier trop court n’affiche pas de sélecteur', async ({ page }) => {
    // Sous 11 événements, les trois longueurs jouent la même partie : trois
    // boutons équivalents ne seraient qu'un choix en trompe-l'œil.
    //
    // On y arrive par le filtre d'axes plutôt que par un thème court, parce
    // que c'est le cas réel — aucun thème de moins de 11 événements n'est
    // rattaché directement à une catégorie dans le pack français, alors qu'un
    // axe étroit, lui, est à deux taps. Ce parcours vérifie du même coup que
    // le sélecteur suit le vivier filtré et non la taille du thème.
    await openThemeCard(page, THEME_FOURNI);
    await expect(page.locator('#screen-axes')).toBeVisible();

    // Ne garder que l'axe le plus étroit (10 événements) : on décoche tout,
    // puis on recoche celui-là.
    const cartes = page.locator('#axes-container .axis-card');
    const total = await cartes.count();
    for (let i = 0; i < total; i++) {
        if (await cartes.nth(i).evaluate(el => el.classList.contains('selected'))) {
            await cartes.nth(i).click();
        }
    }
    const etroit = await page.evaluate(() => {
        const compte = {};
        getCurrentTheme().events.forEach(e => { if (e.axe) compte[e.axe] = (compte[e.axe] || 0) + 1; });
        return Object.entries(compte).sort((a, b) => a[1] - b[1])[0];
    });
    expect(etroit[1]).toBeLessThanOrEqual(10);
    await cartes.filter({ hasText: etroit[0] }).first().click();
    await page.locator('#axes-continue-btn').click();

    await expect(page.locator('#screen-modes')).toBeVisible();
    await expect(page.locator(picker)).toBeHidden();
});
