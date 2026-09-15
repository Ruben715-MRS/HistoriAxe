// Parcours 4 — la navigation générale, hors parties.
//
// Tout le reste de la suite entre dans un thème par un raccourci assumé
// (voir e2e/fixtures.js: openThemeCard). Ce parcours-ci est le seul à
// prendre l'app par la porte : accueil, catégories, sous-catégories
// imbriquées, retours arrière, et les quatre actions rapides de l'écran
// des catégories.
//
// L'arbre des catégories est de profondeur variable (une catégorie porte
// soit des thèmes, soit des sous-catégories, à n'importe quel niveau), et
// c'est justement là que les indices de navigation — catégorie,
// sous-catégorie, thème — peuvent se désaccorder du contenu affiché.

const { test, expect, visibleScreen } = require('./fixtures');

// Les catégories sont des tuiles à image de fond, filles directes de
// #cat-grid — leur rang correspond donc à celui de bdd. Les sous-catégories
// emploient les mêmes tuiles, mais dans une grille intermédiaire : on les
// vise par leur titre, plus stable qu'un chemin de descendance.
const categories = page => page.locator('#cat-grid > div');
const sousCategories = page => page.locator('#subcategories-container h4');
const cartesTheme = page => page.locator('#themes-container .data-card');

// Index de la première catégorie qui mène à des sous-catégories, et non
// directement à des thèmes.
const indexCategorieImbriquee = page => page.evaluate(() =>
    bdd.findIndex(c => !c.isCustomCategory && Array.isArray(c.subcategories) && c.subcategories.length > 0));

test('accueil → catégories → sous-catégories → thèmes, et retour', async ({ page }) => {
    expect(await visibleScreen(page)).toBe('screen-home');
    await page.locator('#screen-home').click();
    expect(await visibleScreen(page)).toBe('screen-categories');

    const index = await indexCategorieImbriquee(page);
    expect(index, 'au moins une catégorie doit porter des sous-catégories').toBeGreaterThanOrEqual(0);
    const nomCategorie = await page.evaluate(i => bdd[i].nom, index);

    await categories(page).nth(index).click();
    expect(await visibleScreen(page)).toBe('screen-subcategories');
    await expect(page.locator('#subcategory-screen-title')).toHaveText(nomCategorie);

    // Descente d'un cran : selon la catégorie, on tombe sur un nouvel étage
    // de sous-catégories ou déjà sur une liste de thèmes.
    await expect(sousCategories(page).first()).toBeVisible();
    await sousCategories(page).first().click();
    const ecranAtteint = await visibleScreen(page);
    expect(['screen-subcategories', 'screen-themes']).toContain(ecranAtteint);

    // Le retour remonte étage par étage, jusqu'aux catégories.
    await page.locator(`#${ecranAtteint} .back-btn`).click();
    expect(await visibleScreen(page)).toBe('screen-subcategories');
    await expect(page.locator('#subcategory-screen-title')).toHaveText(nomCategorie);

    await page.locator('#screen-subcategories .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-categories');
});

test('la recherche mène droit au thème, quelle que soit sa profondeur', async ({ page }) => {
    await page.locator('#screen-home').click();

    await page.locator('#theme-search-input').fill('Vivre à la campagne');
    const resultats = page.locator('#theme-search-results .search-result-item');
    await expect(resultats.first()).toBeVisible();
    await expect(resultats.first().locator('.search-result-title')).toContainText('Vivre à la campagne');

    await resultats.first().click();
    // Un thème à axes s'ouvre sur son écran de filtre.
    expect(await visibleScreen(page)).toBe('screen-axes');
    await expect(page.locator('#axes-subtitle')).toContainText('Vivre à la campagne');
});

test('une recherche sans résultat le dit, sans vider l’écran', async ({ page }) => {
    await page.locator('#screen-home').click();
    await page.locator('#theme-search-input').fill('zzzzzzz');

    await expect(page.locator('#theme-search-results .search-empty')).toBeVisible();
    await page.locator('#theme-search-clear').click();
    await expect(page.locator('#theme-search-results')).toBeHidden();
    expect(await visibleScreen(page)).toBe('screen-categories');
});

test('un thème mis en favori apparaît dans Favoris, et en sort', async ({ page }) => {
    await page.locator('#screen-home').click();

    // Une catégorie qui porte directement des thèmes, pour rester en deux clics.
    const index = await page.evaluate(() =>
        bdd.findIndex(c => !c.isCustomCategory && Array.isArray(c.themes) && c.themes.length > 0));
    expect(index).toBeGreaterThanOrEqual(0);
    await categories(page).nth(index).click();
    expect(await visibleScreen(page)).toBe('screen-themes');

    const premiere = cartesTheme(page).first();
    const nomTheme = await premiere.locator('.data-card-title').innerText();
    const etoile = premiere.locator('.data-card-fav');
    await expect(etoile).not.toHaveClass(/is-fav/);
    await etoile.click();
    await expect(etoile).toHaveClass(/is-fav/);

    // L'étoile ne doit pas avoir ouvert le thème au passage.
    expect(await visibleScreen(page)).toBe('screen-themes');

    await page.locator('#screen-themes .back-btn').click();
    await page.locator('#btn-favoris').click();
    expect(await visibleScreen(page)).toBe('screen-themes');
    await expect(cartesTheme(page)).toHaveCount(1);
    await expect(cartesTheme(page).first().locator('.data-card-title')).toHaveText(nomTheme);

    // Retiré des favoris, le thème quitte la liste immédiatement.
    await cartesTheme(page).first().locator('.data-card-fav').click();
    await expect(cartesTheme(page)).toHaveCount(0);
});

test('« Hasard » ouvre la fiche d’un événement et propose son thème', async ({ page }) => {
    await page.locator('#screen-home').click();
    await page.locator('#btn-discover').click();

    await expect(page.locator('#modal-details')).toBeVisible();
    await expect(page.locator('#modal-titre')).not.toBeEmpty();
    await expect(page.locator('#modal-desc')).not.toBeEmpty();

    // La fiche piochée au hasard ramène vers son thème d'origine.
    const boutonTheme = page.locator('#modal-theme-btn');
    await expect(boutonTheme).toBeVisible();
    await boutonTheme.click();
    await expect(page.locator('#modal-details')).toBeHidden();
    expect(['screen-axes', 'screen-modes']).toContain(await visibleScreen(page));
});

test('« Réviser » explique qu’il n’y a rien à réviser sur un profil neuf', async ({ page }) => {
    await page.locator('#screen-home').click();
    await page.locator('#btn-reviser').click();

    expect(await visibleScreen(page)).toBe('screen-revision-hub');
    await expect(page.locator('#revision-hub-empty')).toBeVisible();
    await expect(page.locator('#revision-hub-content')).toBeHidden();
});

test('« Défis » déplie le choix entre les deux défis', async ({ page }) => {
    await page.locator('#screen-home').click();

    await expect(page.locator('#challenge-picker')).toBeHidden();
    await page.locator('#btn-daily').click();
    await expect(page.locator('#challenge-picker')).toBeVisible();
    await expect(page.locator('#btn-challenge-daily')).toBeVisible();
    await expect(page.locator('#btn-challenge-weekly')).toBeVisible();

    // Replié par un second appui : c'est un dépliant, pas un aller simple.
    await page.locator('#btn-daily').click();
    await expect(page.locator('#challenge-picker')).toBeHidden();
});
