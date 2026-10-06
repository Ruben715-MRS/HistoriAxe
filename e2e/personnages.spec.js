// Parcours — « Personnages illustres » : la catégorie à deux étages, et les
// portraits.
//
// « Biographies » n'est plus une catégorie mais la première des deux
// sous-catégories de « Personnages illustres », l'autre étant « Panthéons
// nationaux » (un thème par pays, une naissance par personnage, un portrait
// par naissance). Ce parcours vérifie ce que les tests unitaires ne voient pas :
//  - la navigation à trois étages, et la note de CHAQUE étage — elle ne
//    s'affichait qu'au sommet, ce qui aurait fait disparaître celle de
//    « Biographies » ;
//  - l'image de chaque tuile : « Panthéons nationaux » contient « panth », que
//    la règle des mythologies lui aurait volée ;
//  - le portrait, sa légende et son crédit dans la fiche, la pastille dans la
//    frise, la vignette sur la carte « À placer » ;
//  - le bouton « Voir sa biographie », présent en consultation, absent en
//    pleine partie (il ferait quitter la partie d'un tap).
//
// Une image qui ne charge pas laisse une erreur dans la console du navigateur :
// l'assertion « console vierge » du socle (e2e/fixtures.js) attrape donc d'elle
// seule un portrait manquant ou un chemin faux.

const { test, expect, visibleScreen } = require('./fixtures');

const PANTHEON = 'pan_fr';

// Le saut jusqu'au thème est programmé, comme dans fixtures.js: openThemeCard
// (ici le thème est à trois étages, ce que cette fonction ne sait pas
// viser) ; tout ce qui suit se fait en cliquant comme un joueur.
async function openThemeById(page, themeId) {
    await page.waitForFunction(
        id => window.bdd && getAllThemesWithPath().some(x => x.theme.id === id),
        themeId,
        { timeout: 45_000 }
    );
    await page.evaluate(id => {
        const t = getAllThemesWithPath().find(x => x.theme.id === id);
        openThemeAt(t.ci, t.si, t.ti);
    }, themeId);
    await page.waitForSelector('#screen-axes:not(.hidden), #screen-modes:not(.hidden)');
    if (await visibleScreen(page) === 'screen-axes') {
        await page.locator('#axes-continue-btn').click();
    }
    await expect(page.locator('#screen-modes')).toBeVisible();
}

// L'image de fond d'une tuile de catégorie ou de sous-catégorie.
const fondDeTuile = (page, titre) =>
    page.locator('#subcategories-container > div > div', { has: page.locator('h4', { hasText: titre }) })
        .first().locator('div[style*="background-image"]').first();

test('Personnages illustres : deux sous-catégories, chacune avec sa note et son image', async ({ page }) => {
    await page.locator('#screen-home').click();
    const index = await page.evaluate(() => bdd.findIndex(c => c.nom === 'Personnages illustres'));
    expect(index, 'la catégorie « Personnages illustres » doit exister').toBeGreaterThanOrEqual(0);

    // La tuile de la catégorie reprend l'image des anciennes Biographies.
    await expect(page.locator('#cat-grid > div').nth(index).locator('div[style*="background-image"]').first())
        .toHaveAttribute('style', /cat_biographies\.jpg/);

    await page.locator('#cat-grid > div').nth(index).click();
    expect(await visibleScreen(page)).toBe('screen-subcategories');
    await expect(page.locator('#subcategory-screen-title')).toHaveText('Personnages illustres');
    await expect(page.locator('#subcategory-note-text')).toContainText('Panthéons nationaux');
    await expect(page.locator('#subcategories-container h4')).toHaveText(['Biographies', 'Panthéons nationaux']);
    await expect(fondDeTuile(page, 'Biographies')).toHaveAttribute('style', /cat_biographies\.jpg/);
    // Et non l'image des mythologies, que « panth » aurait attirée.
    await expect(fondDeTuile(page, 'Panthéons nationaux')).toHaveAttribute('style', /sub_themes_generaux\.jpg/);
    await expect(fondDeTuile(page, 'Panthéons nationaux')).not.toHaveAttribute('style', /sub_mythologies\.jpg/);

    // Biographies : toujours ses douze domaines, et sa propre note.
    await page.locator('#subcategories-container h4', { hasText: 'Biographies' }).click();
    expect(await visibleScreen(page)).toBe('screen-subcategories');
    await expect(page.locator('#subcategory-screen-title')).toHaveText('Biographies');
    await expect(page.locator('#subcategories-container h4')).toHaveCount(12);
    // La BOÎTE doit être visible, pas seulement son texte présent : avant, la note
    // n'apparaissait qu'au sommet, et le texte du sommet restait en place sous
    // la classe `hidden` — un toContainText seul n'y aurait vu aucune différence.
    await expect(page.locator('#subcategory-note')).toBeVisible();
    await expect(page.locator('#subcategory-note-text')).toContainText('dimension dominante');

    // Le retour remonte d'un cran, et la note du sommet revient avec lui.
    await page.locator('#screen-subcategories .back-btn').click();
    await expect(page.locator('#subcategory-screen-title')).toHaveText('Personnages illustres');
    await expect(page.locator('#subcategory-note')).toBeVisible();
    await expect(page.locator('#subcategory-note-text')).toContainText('Deux façons');

    // Panthéons nationaux : un thème par pays, avec sa note.
    await page.locator('#subcategories-container h4', { hasText: 'Panthéons nationaux' }).click();
    expect(await visibleScreen(page)).toBe('screen-themes');
    await expect(page.locator('#theme-screen-title')).toHaveText('Panthéons nationaux');
    await expect(page.locator('#theme-screen-note-text')).toContainText('né dans les frontières actuelles');
    await expect(page.locator('#themes-container .data-card-title')).toHaveText(['Grandes figures de France']);
});

test('la fiche d’un personnage montre son portrait, sa légende, son crédit et sa biographie', async ({ page }) => {
    await openThemeById(page, PANTHEON);
    await page.locator('#mode-card-discovery').click();
    await expect(page.locator('#screen-game')).toBeVisible();

    // Soixante repères, chacun avec sa pastille : « un portrait pour chaque événement ».
    await expect(page.locator('#timeline .entry')).toHaveCount(60);
    await expect(page.locator('#timeline .entry .entry-portrait')).toHaveCount(60);

    await page.locator('#timeline .entry', { hasText: 'Naissance de Victor Hugo' }).click();
    await expect(page.locator('#modal-details')).toBeVisible();

    // L'image a réellement chargé, et au bon format.
    const portrait = page.locator('#modal-portrait-img');
    await expect(portrait).toBeVisible();
    await expect.poll(() => portrait.evaluate(img => img.complete ? img.naturalWidth : 0)).toBe(320);
    await expect(page.locator('#modal-portrait-caption')).toContainText('Victor Hugo');

    // Le crédit est complet : auteur, licence, lien vers la page de l'œuvre.
    const credit = page.locator('#modal-portrait-credit');
    await expect(credit).toContainText('Wikimedia Commons');
    await expect(credit.locator('a')).toHaveAttribute('href', /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    await expect(credit.locator('a')).toHaveAttribute('rel', /noopener/);

    // En consultation, le bouton mène à la biographie.
    const bouton = page.locator('#modal-bio-btn');
    await expect(bouton).toBeVisible();
    await bouton.click();
    await expect(page.locator('#modal-details')).toBeHidden();
    // Une biographie a des axes (« Enfance et formation »…) : elle s'ouvre sur leur écran.
    await expect(page.locator('#screen-axes')).toBeVisible();
    await expect(page.locator('#axes-subtitle')).toContainText('Victor Hugo');
});

test('un personnage sans biographie n’a pas de bouton « Voir sa biographie »', async ({ page }) => {
    await openThemeById(page, PANTHEON);
    await page.locator('#mode-card-discovery').click();
    await page.locator('#timeline .entry', { hasText: 'Naissance de Jules Ferry' }).click();
    await expect(page.locator('#modal-details')).toBeVisible();
    await expect(page.locator('#modal-portrait-img')).toBeVisible();
    await expect(page.locator('#modal-bio-row')).toBeHidden();
});

test('en partie, la carte « À placer » porte le portrait, et la fiche n’offre pas de quitter la partie', async ({ page }) => {
    await openThemeById(page, PANTHEON);
    await page.locator('#mode-card-training').click();
    await expect(page.locator('#screen-game')).toBeVisible();
    await expect(page.locator('#hand-title')).not.toHaveText('Chargement…');

    const vignette = page.locator('#hand-portrait');
    await expect(vignette).toBeVisible();
    await expect.poll(() => vignette.evaluate(img => img.complete ? img.naturalWidth : 0)).toBe(320);

    // Pendant la partie, ouvrir la fiche d'un personnage qui a une biographie
    // ne doit pas proposer d'y aller : le bouton ferait quitter la partie.
    await page.evaluate(() => openModal(getCurrentTheme().events.find(e => e.biographie)));
    await expect(page.locator('#modal-details')).toBeVisible();
    await expect(page.locator('#modal-bio-row')).toBeHidden();
});

test('un thème sans portrait n’affiche ni vignette ni figure', async ({ page }) => {
    await page.waitForFunction(() => window.bdd && getAllThemesWithPath().some(x => x.theme.id === 'thm_rome'), null, { timeout: 45_000 });
    await page.evaluate(() => { const t = getAllThemesWithPath().find(x => x.theme.id === 'thm_rome'); openThemeAt(t.ci, t.si, t.ti); });
    await page.waitForSelector('#screen-axes:not(.hidden), #screen-modes:not(.hidden)');
    if (await visibleScreen(page) === 'screen-axes') await page.locator('#axes-continue-btn').click();
    await page.locator('#mode-card-discovery').click();
    await expect(page.locator('#timeline .entry')).toHaveCount(50);
    await expect(page.locator('#timeline .entry-portrait')).toHaveCount(0);
    await page.locator('#timeline .entry').first().click();
    await expect(page.locator('#modal-details')).toBeVisible();
    await expect(page.locator('#modal-portrait')).toBeHidden();
    await expect(page.locator('#modal-bio-row')).toBeHidden();
});
