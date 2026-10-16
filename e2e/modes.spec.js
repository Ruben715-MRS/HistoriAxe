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
        // Verrouillée, la carte s'annonce indisponible (aria-disabled) tout en
        // restant activable : son clic explique ce qui la débloquera.
        // Playwright tient un élément aria-disabled pour « non actionnable » et
        // attendrait en vain, d'où `force` — c'est précisément ce comportement,
        // un clic qui répond malgré l'état annoncé, qui est testé ici.
        await expect(page.locator(id)).toHaveAttribute('aria-disabled', 'true');
        await page.locator(id).click({ force: true });
        await expect(page.locator('#modal-confirm')).toBeVisible();
        await expect(page.locator('#confirm-message')).not.toBeEmpty();
        await page.locator('#confirm-ok-btn').click();
        await expect(page.locator('#modal-confirm')).toBeHidden();
        expect(await visibleScreen(page)).toBe('screen-modes');
    }
});

// --- Écran des modes : « Jouer » d'abord, puis des groupes ----------------

test('« Jouer » est visible sans défiler et lance une partie classique', async ({ page }) => {
    const bouton = page.locator('#btn-modes-play');
    await expect(bouton).toBeInViewport();
    // Le geste principal précède les groupes de modes.
    const haut = await bouton.evaluate(el => el.getBoundingClientRect().top);
    const classique = await page.locator('#mode-card-classic').evaluate(el => el.getBoundingClientRect().top);
    expect(haut).toBeLessThan(classique);
    await bouton.click();
    await expect(page.locator('#screen-game')).toBeVisible();
    await expect(page.locator('#timeline button.slot').first()).toBeVisible();
});

test('les groupes de modes se replient et le choix est retenu', async ({ page }) => {
    const groupe = page.locator('#modes-group-express');
    const tete = groupe.locator('.modes-group-head');
    await expect(tete).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#mode-card-blitz')).toBeVisible();

    await tete.click();
    await expect(tete).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#mode-card-blitz')).toBeHidden();
    // Les autres groupes ne bougent pas.
    await expect(page.locator('#mode-card-discovery')).toBeVisible();

    // Retenu d'une visite à l'autre.
    await page.evaluate(() => { initModesGroups(); });
    await expect(tete).toHaveAttribute('aria-expanded', 'false');

    await tete.click();
    await expect(page.locator('#mode-card-blitz')).toBeVisible();
});

test('« Reprendre » ramène au dernier thème ouvert', async ({ page }) => {
    await page.evaluate(() => { showScreen('screen-categories'); initCategories(); });
    const reprendre = page.locator('#btn-resume');
    await expect(reprendre).toBeVisible();
    await expect(reprendre).toContainText('Rome : République et Empire');
    await reprendre.click();
    // Rome a des axes : on arrive sur le choix des axes de CE thème.
    expect(await visibleScreen(page)).toBe('screen-axes');
    expect(await page.evaluate(() => getCurrentTheme().id)).toBe('thm_rome');
});

// --- « La frise » : mêmes cases que les autres groupes ---------------------

test('les cases de « La frise » ont la largeur de celles des autres groupes (grand écran)', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    const largeur = id => page.locator(id).evaluate(el => Math.round(el.getBoundingClientRect().width));
    const quiz = await largeur('#mode-card-blitz');
    for (const id of ['#mode-card-training', '#mode-card-classic', '#mode-card-chrono', '#mode-card-expert']) {
        expect(Math.abs(await largeur(id) - quiz), id).toBeLessThanOrEqual(2);
    }
});

// --- Mode favori du bouton « Jouer » ---------------------------------------

async function choisirModeJouer(page, id) {
    await page.evaluate(() => openSettings());
    await page.locator('#settings-play-mode').selectOption(id);
    await page.evaluate(() => closeSettings());
}

test('« Jouer » lance Classique tant que le joueur n’a rien choisi', async ({ page }) => {
    await expect(page.locator('#modes-play-mode')).toHaveText('Mode : Classique');
    expect(await page.evaluate(() => appSettings.playMode)).toBe('classic');
});

test('le mode choisi dans les Réglages est celui du bouton « Jouer », et il est retenu', async ({ page }) => {
    await choisirModeJouer(page, 'quiz');
    // Le libellé suit dès le retour sur l'écran des modes.
    await page.evaluate(() => showScreen('screen-categories'));
    await openThemeModes(page, THEME);
    await expect(page.locator('#modes-play-mode')).toHaveText('Mode : Quiz');

    // Retenu d'une session à l'autre.
    await page.reload();
    await page.waitForFunction(() => window.bdd && window.bdd.some(c => !c.isCustomCategory));
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_settings')).playMode)).toBe('quiz');

    await page.locator('#screen-home').click();
    await openThemeModes(page, THEME);
    await page.locator('#btn-modes-play').click();
    await expect(page.locator('#screen-quiz')).toBeVisible();
});

test('un mode favori verrouillé sur le thème retombe sur Classique, et le bouton le dit', async ({ page }) => {
    await choisirModeJouer(page, 'chrono');
    await page.evaluate(() => { showScreen('screen-categories'); });
    await openThemeModes(page, THEME);
    await expect(page.locator('#modes-play-mode')).toHaveText('Mode : Classique');
    await page.locator('#btn-modes-play').click();
    await expect(page.locator('#screen-game')).toBeVisible();
    expect(await page.evaluate(() => currentMode)).toBe('classic');
    // Le choix du joueur, lui, n'a pas été touché.
    expect(await page.evaluate(() => appSettings.playMode)).toBe('chrono');
});

// --- Annonces aux lecteurs d'écran ------------------------------------------

test('la frise annonce la carte à placer, puis le résultat de chaque placement', async ({ page }) => {
    await page.locator('#mode-card-classic').click();
    const zone = page.locator('#a11y-live');
    // Une zone d'état polie et atomique, hors écran mais pas masquée (display:none ne serait pas lu).
    await expect(zone).toHaveAttribute('role', 'status');
    await expect(zone).toHaveAttribute('aria-live', 'polite');
    await expect(zone).toContainText('Carte à placer :');
    const premiere = await page.evaluate(() => eventToPlace.titre);
    await expect(zone).toContainText(premiere);

    // Un placement juste : on pose la carte dans le créneau où elle va.
    const bon = await page.evaluate(() => {
        let i = 0;
        while (i < placedEvents.length && placedEvents[i].date < eventToPlace.date) i++;
        return i;
    });
    await page.locator('#timeline button.slot').nth(bon).click();
    await expect(zone).toContainText('Correct.');
    await expect(zone).toContainText('Placé');
    // …et, dans le même message, la carte suivante.
    await expect(zone).toContainText('Carte à placer :');

    // Un placement raté : le résultat, la direction et les vies restantes, tout de suite.
    const faux = await page.evaluate(() => {
        // Un créneau où la carte NE va PAS.
        let ok = 0;
        while (ok < placedEvents.length && placedEvents[ok].date < eventToPlace.date) ok++;
        return ok === 0 ? placedEvents.length : 0;
    });
    await page.locator('#timeline button.slot').nth(faux).click();
    await expect(zone).toContainText('Raté.');
    await expect(zone).toContainText(/plus (haut|bas) dans la frise/);
    await expect(zone).toContainText(/Il vous reste (2 vies|une vie)/);
});
