// Le mode « Pendant ce temps, ailleurs… » pris par l'écran des modes, comme
// un joueur.
//
// Le moteur de génération est déjà couvert sans navigateur
// (tests/simultaneity.test.js) : ce parcours-ci vérifie ce qu'un module pur
// ne peut pas dire — que la carte lance bien le mode, que l'ancre et les
// quatre options s'affichent, qu'un clic tranche, et surtout que le révélé
// apparaît, puisque c'est lui la raison d'être du mode.

const { test, expect, openThemeModes } = require('./fixtures');

// Un thème rattaché directement à sa catégorie (contrainte de openThemeCard)
// et assez fourni pour remplir une session de 12 questions.
const THEME = 'thm_aut';

async function lancerLeMode(page) {
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-simultaneity').click();
    await expect(page.locator('#screen-simultaneity')).toBeVisible();
}

test('la carte du mode lance une session avec une ancre et quatre options', async ({ page }) => {
    await lancerLeMode(page);

    await expect(page.locator('#simul-anchor-title')).not.toHaveText('Chargement…');
    // L'année de l'ancre porte la question : elle doit être lisible d'emblée.
    await expect(page.locator('#simul-anchor-year')).toHaveText(/\d/);
    await expect(page.locator('#simul-options .simul-option')).toHaveCount(4);
    // Le thème d'origine de l'ancre est rappelé sous le titre.
    await expect(page.locator('#simul-anchor-theme')).not.toBeEmpty();
});

test('répondre marque l’option juste et déplie le révélé', async ({ page }) => {
    await lancerLeMode(page);

    // Le révélé ne doit rien montrer avant que le joueur ait tranché : il
    // contient la bonne réponse.
    await expect(page.locator('#simul-reveal')).toBeHidden();

    await page.locator('#simul-options .simul-option').first().click();

    await expect(page.locator('#simul-options .simul-option.correct')).toHaveCount(1);
    const reveal = page.locator('#simul-reveal');
    await expect(reveal).toBeVisible();
    // La bonne réponse, plus au moins un autre contemporain : un révélé qui
    // n'en montrerait qu'un seul n'apprendrait rien de plus que la question.
    await expect(reveal.locator('.simul-reveal-row')).not.toHaveCount(0);
    await expect(reveal.locator('.simul-reveal-year').first()).toHaveText(/\d/);
});

test('l’ancre vient du thème, jamais les réponses', async ({ page }) => {
    // C'est l'asymétrie qui définit le mode : si une option pouvait sortir du
    // thème en cours, « ailleurs » serait un mensonge.
    await lancerLeMode(page);

    const fuites = await page.evaluate(() => {
        const duTheme = new Set((getCurrentTheme().events || []).map(e => e.id));
        return simulQuestions
            .filter(q => q.options.some(o => duTheme.has(o.id)))
            .map(q => q.anchor.titre);
    });
    expect(fuites, 'aucune option ne doit appartenir au thème dont vient l’ancre').toEqual([]);
});

test('la session enchaîne les questions et le compteur suit', async ({ page }) => {
    await lancerLeMode(page);

    await expect(page.locator('#simul-hud-count')).toHaveText('1 / 12');
    await page.locator('#simul-options .simul-option').first().click();
    // Le révélé reste affiché un moment avant la question suivante (voir
    // answerSimultaneity) : c'est un temps de lecture, pas une latence.
    await expect(page.locator('#simul-hud-count')).toHaveText('2 / 12', { timeout: 6000 });
    await expect(page.locator('#simul-reveal')).toBeHidden();
    await expect(page.locator('#simul-options .simul-option')).toHaveCount(4);
});
