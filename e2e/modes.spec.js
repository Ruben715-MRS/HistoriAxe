// Parcours 1 — chaque mode de jeu se lance et répond à une première
// interaction.
//
// C'est la famille de régressions que le projet a déjà connue : une
// fonction supprimée par erreur lors d'un refactor, et un mode qui ne
// démarre plus (voir README.md, section « Points volontairement laissés »).
// Rien ici ne vérifie les règles du jeu — les points, les vies et le tirage
// du Défi du jour ont déjà leurs tests unitaires (tests/dailyEngine.test.js,
// tests/gamification.test.js). Ce qui est vérifié, c'est qu'on arrive à
// jouer : l'écran s'ouvre, il est peuplé, et le premier geste du joueur
// produit un effet.
//
// Chaque test hérite aussi de l'assertion « console vierge » du socle
// (voir e2e/fixtures.js) : un mode qui s'ouvre en lançant une exception
// échoue ici même si l'écran a l'air correct.

const { test, expect, visibleScreen, openThemeModes } = require('./fixtures');

// Thème de référence : « Rome : République et Empire », dans CAPES &
// Agrégation. Choisi parce qu'il est stable (50 événements, des axes, pas
// de sommaire — donc « Découverte » lance la frise directement) et qu'il
// ne dépend pas des ajouts de contenu en cours dans les autres catégories.
const THEME = 'thm_rome';

test.beforeEach(async ({ page }) => {
    await openThemeModes(page, THEME);
});

test('Découverte ouvre la frise complète, sans rien à placer', async ({ page }) => {
    await page.locator('#mode-card-discovery').click();

    await expect(page.locator('#screen-game')).toBeVisible();
    // Tous les événements sont déjà en place : c'est un mode de lecture.
    await expect(page.locator('#timeline .entry')).toHaveCount(50);
    await expect(page.locator('#timeline button.slot')).toHaveCount(0);
});

for (const mode of [
    { nom: 'Entraînement', carte: '#mode-card-training' },
    { nom: 'Classique', carte: '#mode-card-classic' }
]) {
    test(`${mode.nom} : une carte en main, un clic sur un intervalle la place`, async ({ page }) => {
        await page.locator(mode.carte).click();

        await expect(page.locator('#screen-game')).toBeVisible();
        await expect(page.locator('#hand-title')).not.toHaveText('Chargement…');
        await expect(page.locator('#timeline button.slot').first()).toBeVisible();

        // Pendant une animation de placement, l'app ignore délibérément les
        // clics (voir js/app.js: checkPlacement, garde `isAnimating`). Sans
        // cette attente, le test cliquerait parfois dans le vide et
        // échouerait une fois sur dix, ce qui est pire qu'un test absent.
        await page.waitForFunction(() => isAnimating === false);

        const compteur = page.locator('#hud-count');
        const avant = await compteur.innerText();
        await page.locator('#timeline button.slot').first().click();
        // Le placement est animé : la manche suivante n'arrive pas dans la
        // même image. Bonne ou mauvaise, la réponse fait avancer la partie.
        await expect(compteur).not.toHaveText(avant);
    });
}

test('Quiz : une réponse cliquée fait avancer la manche', async ({ page }) => {
    await page.locator('.quiz-card').click();

    await expect(page.locator('#screen-quiz')).toBeVisible();
    await expect(page.locator('#quiz-prompt')).not.toHaveText('Chargement…');
    await expect(page.locator('#quiz-options button')).toHaveCount(4);

    const compteur = page.locator('#quiz-hud-count');
    const avant = await compteur.innerText();
    await page.locator('#quiz-options button').first().click();
    await expect(compteur).not.toHaveText(avant);
});

test('Avant / Après : les deux événements sont proposés et cliquables', async ({ page }) => {
    await page.locator('.avap-card').click();

    await expect(page.locator('#screen-avant-apres')).toBeVisible();
    await expect(page.locator('#avap-option-a-title')).not.toBeEmpty();
    await expect(page.locator('#avap-option-b-title')).not.toBeEmpty();

    const compteur = page.locator('#avap-hud-count');
    const avant = await compteur.innerText();
    await page.locator('#avap-option-a').click();
    await expect(compteur).not.toHaveText(avant);
});

test('Périodes & Ères : un choix cliqué fait avancer la manche', async ({ page }) => {
    await page.locator('.periodes-card').click();

    await expect(page.locator('#screen-periodes')).toBeVisible();
    await expect(page.locator('#periodes-prompt')).not.toHaveText('Chargement…');
    await expect(page.locator('#periodes-options button').first()).toBeVisible();

    const compteur = page.locator('#periodes-hud-count');
    const avant = await compteur.innerText();
    await page.locator('#periodes-options button').first().click();
    await expect(compteur).not.toHaveText(avant);
});

test('Le fil du temps : le pavé numérique alimente l’année saisie', async ({ page }) => {
    await page.locator('.fil-card').click();

    await expect(page.locator('#screen-fil')).toBeVisible();
    await expect(page.locator('#fil-prompt')).not.toHaveText('Chargement…');

    await page.locator('#screen-fil .fil-key', { hasText: '4' }).click();
    await page.locator('#screen-fil .fil-key', { hasText: '7' }).click();
    await expect(page.locator('#fil-display-value')).toHaveText('47');
    await expect(page.locator('#fil-validate-btn')).toBeEnabled();
});

test('Trouve l’écart : le pavé numérique alimente l’écart proposé', async ({ page }) => {
    await page.locator('.ecart-card').click();

    await expect(page.locator('#screen-ecart')).toBeVisible();
    await expect(page.locator('#ecart-event-a')).not.toBeEmpty();
    await expect(page.locator('#ecart-event-b')).not.toBeEmpty();

    await page.locator('#screen-ecart .fil-key', { hasText: '2' }).click();
    await expect(page.locator('#ecart-display-value')).toHaveText('2');
    await expect(page.locator('#ecart-validate-btn')).toBeEnabled();
});

test('Chrono et Expert restent verrouillés tant que le thème n’est pas entamé', async ({ page }) => {
    // Profil neuf : ces deux modes demandent une progression sur le thème
    // (voir js/app.js: updateModeLocks). Les ouvrir doit expliquer pourquoi
    // plutôt que de lancer une partie.
    for (const id of ['#mode-card-chrono', '#mode-card-expert']) {
        await expect(page.locator(id)).toHaveClass(/locked/);
        await page.locator(id).click();
        await expect(page.locator('#modal-confirm')).toBeVisible();
        await expect(page.locator('#confirm-message')).not.toBeEmpty();
        await page.locator('#confirm-ok-btn').click();
        await expect(page.locator('#modal-confirm')).toBeHidden();
        expect(await visibleScreen(page)).toBe('screen-modes');
    }
});
