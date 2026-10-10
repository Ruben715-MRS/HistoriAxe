// Parcours — « Personnages illustres » : la catégorie à deux étages, et les
// portraits.
//
// « Biographies » n'est plus une catégorie mais la première des deux
// sous-catégories de « Personnages illustres », l'autre étant « Panthéons »
// (un thème par pays ou par région, une naissance par personnage, un portrait
// par naissance). Ce parcours vérifie ce que les tests unitaires ne voient pas :
//  - la navigation à trois étages, et la note de CHAQUE étage — elle ne
//    s'affichait qu'au sommet, ce qui aurait fait disparaître celle de
//    « Biographies » ;
//  - l'image de chaque tuile : « Panthéons » contient « panth », que la règle
//    des mythologies lui aurait volée ;
//  - le portrait, sa légende et son crédit dans la fiche, la pastille dans la
//    frise, la vignette sur la carte « À placer » ;
//  - le bouton « Voir sa biographie », présent en consultation, absent en
//    pleine partie (il ferait quitter la partie d'un tap).
//
// Une image qui ne charge pas laisse une erreur dans la console du navigateur :
// l'assertion « console vierge » du socle (e2e/fixtures.js) attrape donc d'elle
// seule un portrait manquant ou un chemin faux.

const { test, expect, visibleScreen, openThemeCard } = require('./fixtures');

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
    await expect(page.locator('#subcategory-note-text')).toContainText('« Panthéons » fait l\'inverse');
    await expect(page.locator('#subcategories-container h4')).toHaveText(['Biographies', 'Panthéons']);
    await expect(fondDeTuile(page, 'Biographies')).toHaveAttribute('style', /cat_biographies\.jpg/);
    // Et non l'image des mythologies, que « panth » aurait attirée.
    await expect(fondDeTuile(page, 'Panthéons')).toHaveAttribute('style', /sub_themes_generaux\.jpg/);
    await expect(fondDeTuile(page, 'Panthéons')).not.toHaveAttribute('style', /sub_mythologies\.jpg/);

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

    // Panthéons : un thème par pays ou par région, avec sa note.
    await page.locator('#subcategories-container h4', { hasText: 'Panthéons' }).click();
    expect(await visibleScreen(page)).toBe('screen-themes');
    await expect(page.locator('#theme-screen-title')).toHaveText('Panthéons');
    await expect(page.locator('#theme-screen-note-text')).toContainText('né dans les frontières actuelles');
    // Panthéons de pays et de blocs se rangent par leur nom de source — « Allemagne, Autriche et Suisse »,
    // « Amérique hispanique », « Égypte », « États-Unis », « France », « Italie », « Maghreb », « Royaume-Uni » — et non par
    // « Grandes figures d'… » / « … de » / « … des » / « … du ».
    await expect(page.locator('#themes-container .data-card-title'))
        .toHaveText(["Grandes figures d'Allemagne, d'Autriche et de Suisse", "Grandes figures d'Amérique hispanique",
            "Grandes figures d'Égypte", 'Grandes figures des États-Unis',
            'Grandes figures de France', "Grandes figures d'Italie", 'Grandes figures du Maghreb',
            'Grandes figures du Royaume-Uni']);
});

test('la fiche d’un personnage montre son portrait, sa légende, son crédit et sa biographie', async ({ page }) => {
    await openThemeById(page, PANTHEON);
    await page.locator('#mode-card-discovery').click();
    await expect(page.locator('#screen-game')).toBeVisible();

    // Soixante-huit repères, chacun avec sa pastille : « un portrait pour chaque événement ».
    await expect(page.locator('#timeline .entry')).toHaveCount(68);
    await expect(page.locator('#timeline .entry .entry-portrait')).toHaveCount(68);

    await page.locator('#timeline .entry', { hasText: 'Naissance de Victor Hugo' }).click();
    await expect(page.locator('#modal-details')).toBeVisible();
    // Le panthéon d'un pays n'affiche pas de pays : son thème le dit déjà.
    await expect(page.locator('#modal-pays')).toBeHidden();

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

test('Joséphine Baker, née aux États-Unis et devenue française, est au panthéon de la France avec son portrait et sa biographie', async ({ page }) => {
    // Le pays d'un panthéon est celui qui honore, pas celui de l'état civil : Baker est au Panthéon
    // de Paris depuis 2021. Elle n'est donc pas dans « Grandes figures des États-Unis ».
    await openThemeById(page, PANTHEON);
    await page.locator('#mode-card-discovery').click();
    await page.locator('#timeline .entry', { hasText: 'Naissance de Joséphine Baker' }).click();
    await expect(page.locator('#modal-details')).toBeVisible();
    await expect(page.locator('#modal-pays')).toBeHidden();
    const portrait = page.locator('#modal-portrait-img');
    await expect.poll(() => portrait.evaluate(img => img.complete ? img.naturalWidth : 0)).toBe(320);
    await expect(page.locator('#modal-portrait-caption')).toContainText('Joséphine Baker');
    await expect(page.locator('#modal-bio-btn')).toBeVisible();
});

test('un personnage sans biographie n’a pas de bouton « Voir sa biographie »', async ({ page }) => {
    await openThemeById(page, PANTHEON);
    await page.locator('#mode-card-discovery').click();
    await page.locator('#timeline .entry', { hasText: 'Naissance de Jules Ferry' }).click();
    await expect(page.locator('#modal-details')).toBeVisible();
    await expect(page.locator('#modal-portrait-img')).toBeVisible();
    await expect(page.locator('#modal-bio-row')).toBeHidden();
});

test('la fiche d’une figure d’Amérique hispanique indique son pays, drapeau compris', async ({ page }) => {
    await openThemeById(page, 'pan_hispam');
    await page.locator('#mode-card-discovery').click();
    await expect(page.locator('#screen-game')).toBeVisible();
    const nombre = await page.evaluate(() => getCurrentTheme().events.length);
    expect(nombre).toBeGreaterThanOrEqual(80);
    expect(nombre).toBeLessThanOrEqual(100);
    await expect(page.locator('#timeline .entry')).toHaveCount(nombre);
    await expect(page.locator('#timeline .entry .entry-portrait')).toHaveCount(nombre);

    await page.locator('#timeline .entry', { hasText: 'Naissance de Simón Bolívar' }).click();
    await expect(page.locator('#modal-details')).toBeVisible();
    await expect(page.locator('#modal-pays')).toBeVisible();
    await expect(page.locator('#modal-pays')).toContainText('🇻🇪');
    await expect(page.locator('#modal-pays')).toContainText('Venezuela');
    // Sa biographie existe : le bouton y mène, comme pour la France.
    await expect(page.locator('#modal-bio-btn')).toBeVisible();

    // Une autre figure, d'un autre pays du bloc : le libellé suit l'événement.
    await page.locator('#modal-details .close-btn').click();
    await expect(page.locator('#modal-details')).toBeHidden();
    await page.locator('#timeline .entry', { hasText: "Naissance d'Emiliano Zapata" }).click();
    await expect(page.locator('#modal-pays')).toContainText('🇲🇽');
    await expect(page.locator('#modal-pays')).toContainText('Mexique');
});

test('la recherche par nom de pays — sans accent — mène au panthéon de la région', async ({ page }) => {
    await page.locator('#screen-home').click();
    // « Équateur » n'est pas dans le nom du thème : il est dans ses mots-clés.
    await page.locator('#theme-search-input').fill('equateur');
    const resultat = page.locator('#theme-search-results .search-result-item', { hasText: "Grandes figures d'Amérique hispanique" });
    await expect(resultat).toHaveCount(1);
    await expect(resultat.locator('.search-result-path')).toContainText('Personnages illustres › Panthéons');

    await resultat.click();
    // Un thème à axes s'ouvre sur l'écran de filtre.
    await page.waitForSelector('#screen-axes:not(.hidden), #screen-modes:not(.hidden)');
    if (await visibleScreen(page) === 'screen-axes') {
        await expect(page.locator('#axes-subtitle')).toContainText("Amérique hispanique");
    }
});

test('le Maghreb : chacune de ses figures a son portrait et son pays, de l’Algérie à la Mauritanie', async ({ page }) => {
    await openThemeById(page, 'pan_maghreb');
    await page.locator('#mode-card-discovery').click();
    await expect(page.locator('#screen-game')).toBeVisible();
    const nombre = await page.evaluate(() => getCurrentTheme().events.length);
    expect(nombre).toBeGreaterThanOrEqual(50);
    expect(nombre).toBeLessThanOrEqual(70);
    // « Que chaque personnage ait un portrait » : une pastille par repère, pas une de moins.
    await expect(page.locator('#timeline .entry')).toHaveCount(nombre);
    await expect(page.locator('#timeline .entry .entry-portrait')).toHaveCount(nombre);

    // Les cinq pays du bloc, chacun par une de ses figures — la Libye et la Mauritanie,
    // les moins fournies, comprises.
    const figures = [
        ["Naissance d'Ibn Khaldun", '🇹🇳', 'Tunisie'],
        ["Naissance d'Abd el-Kader", '🇩🇿', 'Algérie'],
        ['Naissance de Mohammed V', '🇲🇦', 'Maroc'],
        ['Naissance de Septime Sévère', '🇱🇾', 'Libye'],
        ['Naissance de Moktar Ould Daddah', '🇲🇷', 'Mauritanie'],
    ];
    for (const [titre, drapeau, pays] of figures) {
        await page.locator('#timeline .entry', { hasText: titre }).click();
        await expect(page.locator('#modal-details')).toBeVisible();
        await expect(page.locator('#modal-pays')).toContainText(drapeau);
        await expect(page.locator('#modal-pays')).toContainText(pays);
        // Le portrait a réellement chargé, au bon format.
        const portrait = page.locator('#modal-portrait-img');
        await expect.poll(() => portrait.evaluate(img => img.complete ? img.naturalWidth : 0)).toBe(320);
        await page.locator('#modal-details .close-btn').click();
        await expect(page.locator('#modal-details')).toBeHidden();
    }

    // Ibn Khaldun a aussi sa biographie (comme Hannibal et Ibn Battûta) : le bouton y mène.
    await page.locator('#timeline .entry', { hasText: "Naissance d'Ibn Khaldun" }).click();
    await expect(page.locator('#modal-bio-btn')).toBeVisible();
});

test('l’Égypte : chacune de ses figures a son portrait, et la fiche n’affiche aucun pays', async ({ page }) => {
    await openThemeById(page, 'pan_eg');
    await page.locator('#mode-card-discovery').click();
    await expect(page.locator('#screen-game')).toBeVisible();
    const nombre = await page.evaluate(() => getCurrentTheme().events.length);
    expect(nombre).toBeGreaterThanOrEqual(45);
    expect(nombre).toBeLessThanOrEqual(60);
    // « Que chaque personnage ait un portrait » : une pastille par repère, pas une de moins.
    await expect(page.locator('#timeline .entry')).toHaveCount(nombre);
    await expect(page.locator('#timeline .entry .entry-portrait')).toHaveCount(nombre);

    // Trois époques : un pharaon, un vice-roi du XIXe siècle, un président du XXe. Le panthéon
    // d'un pays n'affiche pas de pays (son thème le dit déjà), et le portrait charge au bon format.
    for (const titre of ['Naissance de Ramsès II', 'Naissance de Méhémet Ali', 'Naissance de Gamal Abdel Nasser']) {
        await page.locator('#timeline .entry', { hasText: titre }).click();
        await expect(page.locator('#modal-details')).toBeVisible();
        await expect(page.locator('#modal-pays')).toBeHidden();
        const portrait = page.locator('#modal-portrait-img');
        await expect.poll(() => portrait.evaluate(img => img.complete ? img.naturalWidth : 0)).toBe(320);
        await expect(page.locator('#modal-portrait-caption')).not.toBeEmpty();
        await page.locator('#modal-details .close-btn').click();
        await expect(page.locator('#modal-details')).toBeHidden();
    }

    // Cinq figures ont aussi leur biographie dans l'appli : le bouton y mène.
    const avecBiographie = await page.evaluate(() => getCurrentTheme().events.filter(e => e.biographie).length);
    expect(avecBiographie).toBe(5);
    await page.locator('#timeline .entry', { hasText: 'Naissance de Naguib Mahfouz' }).click();
    await expect(page.locator('#modal-bio-btn')).toBeVisible();
});

test('les États-Unis : chacune de ses figures a son portrait, et la fiche n’affiche aucun pays', async ({ page }) => {
    await openThemeById(page, 'pan_us');
    await page.locator('#mode-card-discovery').click();
    await expect(page.locator('#screen-game')).toBeVisible();
    const nombre = await page.evaluate(() => getCurrentTheme().events.length);
    expect(nombre).toBeGreaterThanOrEqual(115);
    expect(nombre).toBeLessThanOrEqual(135);
    // « Que chaque personnage ait un portrait » : une pastille par repère, pas une de moins.
    await expect(page.locator('#timeline .entry')).toHaveCount(nombre);
    await expect(page.locator('#timeline .entry .entry-portrait')).toHaveCount(nombre);

    // Trois époques : un Père fondateur, une star d'Hollywood, un pionnier de l'informatique. Le
    // panthéon d'un pays n'affiche pas de pays (son thème le dit déjà), et le portrait charge au bon format.
    for (const titre of ['Naissance de Thomas Jefferson', 'Naissance de Marilyn Monroe', 'Naissance de Steve Jobs']) {
        await page.locator('#timeline .entry', { hasText: titre }).click();
        await expect(page.locator('#modal-details')).toBeVisible();
        await expect(page.locator('#modal-pays')).toBeHidden();
        const portrait = page.locator('#modal-portrait-img');
        await expect.poll(() => portrait.evaluate(img => img.complete ? img.naturalWidth : 0)).toBe(320);
        await expect(page.locator('#modal-portrait-caption')).not.toBeEmpty();
        await page.locator('#modal-details .close-btn').click();
        await expect(page.locator('#modal-details')).toBeHidden();
    }

    // Trente et une figures ont aussi leur biographie dans l'appli (Jesse Owens et Mohamed Ali
    // compris) : le bouton y mène.
    const avecBiographie = await page.evaluate(() => getCurrentTheme().events.filter(e => e.biographie).length);
    expect(avecBiographie).toBe(31);
    await page.locator('#timeline .entry', { hasText: 'Naissance de Louis Armstrong' }).click();
    await expect(page.locator('#modal-bio-btn')).toBeVisible();
});

test('l’Italie : chacune de ses figures a son portrait, de Jules César à Federico Fellini, et la fiche n’affiche aucun pays', async ({ page }) => {
    await openThemeById(page, 'pan_it');
    await page.locator('#mode-card-discovery').click();
    await expect(page.locator('#screen-game')).toBeVisible();
    const nombre = await page.evaluate(() => getCurrentTheme().events.length);
    expect(nombre).toBeGreaterThanOrEqual(115);
    expect(nombre).toBeLessThanOrEqual(135);
    // « Que chaque personnage ait un portrait » : une pastille par repère, pas une de moins.
    await expect(page.locator('#timeline .entry')).toHaveCount(nombre);
    await expect(page.locator('#timeline .entry .entry-portrait')).toHaveCount(nombre);

    // Trois époques : un dictateur romain né avant J.-C., un maître de la Renaissance, un cinéaste du XXe
    // siècle. Le panthéon d'un pays n'affiche pas de pays (son thème le dit déjà), et le portrait charge
    // au bon format.
    for (const titre of ['Naissance de Jules César', 'Naissance de Léonard de Vinci', 'Naissance de Federico Fellini']) {
        await page.locator('#timeline .entry', { hasText: titre }).click();
        await expect(page.locator('#modal-details')).toBeVisible();
        await expect(page.locator('#modal-pays')).toBeHidden();
        const portrait = page.locator('#modal-portrait-img');
        await expect.poll(() => portrait.evaluate(img => img.complete ? img.naturalWidth : 0)).toBe(320);
        await expect(page.locator('#modal-portrait-caption')).not.toBeEmpty();
        await page.locator('#modal-details .close-btn').click();
        await expect(page.locator('#modal-details')).toBeHidden();
    }

    // Auguste est né avant J.-C. et mort après : sa phrase d'ouverture le dit des deux côtés de l'ère.
    await page.locator('#timeline .entry', { hasText: "Naissance d'Auguste" }).click();
    await expect(page.locator('#modal-desc')).toContainText('(63 av. J.-C.-14 ap. J.-C.)');
    await page.locator('#modal-details .close-btn').click();
    await expect(page.locator('#modal-details')).toBeHidden();

    // Treize figures ont aussi leur biographie dans l'appli : le bouton y mène.
    const avecBiographie = await page.evaluate(() => getCurrentTheme().events.filter(e => e.biographie).length);
    expect(avecBiographie).toBe(13);
    await page.locator('#timeline .entry', { hasText: 'Naissance de Galilée' }).click();
    await expect(page.locator('#modal-bio-btn')).toBeVisible();
});

test('la recherche — « italie », « renaissance », « vatican » — mène au panthéon de l’Italie', async ({ page }) => {
    await page.locator('#screen-home').click();
    for (const mot of ['italie', 'renaissance', 'vatican']) {
        await page.locator('#theme-search-input').fill(mot);
        const resultat = page.locator('#theme-search-results .search-result-item', { hasText: "Grandes figures d'Italie" });
        await expect(resultat, `« ${mot} » doit mener à l'Italie`).toHaveCount(1);
        await expect(resultat.locator('.search-result-path')).toContainText('Personnages illustres › Panthéons');
    }
});

test('la recherche — « etats-unis », « usa », « hollywood » — mène au panthéon des États-Unis', async ({ page }) => {
    await page.locator('#screen-home').click();
    for (const mot of ['etats-unis', 'usa', 'hollywood']) {
        await page.locator('#theme-search-input').fill(mot);
        const resultat = page.locator('#theme-search-results .search-result-item', { hasText: 'Grandes figures des États-Unis' });
        await expect(resultat, `« ${mot} » doit mener aux États-Unis`).toHaveCount(1);
        await expect(resultat.locator('.search-result-path')).toContainText('Personnages illustres › Panthéons');
    }
});

test('la recherche — « egypte », « pharaon », « nil » — mène au panthéon de l’Égypte', async ({ page }) => {
    await page.locator('#screen-home').click();
    for (const mot of ['egypte', 'pharaon', 'nil']) {
        await page.locator('#theme-search-input').fill(mot);
        const resultat = page.locator('#theme-search-results .search-result-item', { hasText: "Grandes figures d'Égypte" });
        await expect(resultat, `« ${mot} » doit mener à l'Égypte`).toHaveCount(1);
        await expect(resultat.locator('.search-result-path')).toContainText('Personnages illustres › Panthéons');
    }
});

test('le Royaume-Uni : chacune de ses figures a son portrait, de Boudicca à Amy Winehouse, et la fiche n’affiche aucun pays', async ({ page }) => {
    await openThemeById(page, 'pan_gb');
    await page.locator('#mode-card-discovery').click();
    await expect(page.locator('#screen-game')).toBeVisible();
    const nombre = await page.evaluate(() => getCurrentTheme().events.length);
    expect(nombre).toBeGreaterThanOrEqual(140);
    expect(nombre).toBeLessThanOrEqual(160);
    // Une pastille par repère, pas une de moins.
    await expect(page.locator('#timeline .entry')).toHaveCount(nombre);
    await expect(page.locator('#timeline .entry .entry-portrait')).toHaveCount(nombre);

    // Trois époques : un dramaturge de la Renaissance, un Premier ministre du XXe siècle, un mathématicien.
    // Le panthéon d'un pays n'affiche pas de pays, et le portrait charge au bon format.
    for (const titre of ['Naissance de William Shakespeare', 'Naissance de Winston Churchill', "Naissance d'Alan Turing"]) {
        await page.locator('#timeline .entry', { hasText: titre }).click();
        await expect(page.locator('#modal-details')).toBeVisible();
        await expect(page.locator('#modal-pays')).toBeHidden();
        const portrait = page.locator('#modal-portrait-img');
        await expect.poll(() => portrait.evaluate(img => img.complete ? img.naturalWidth : 0)).toBe(320);
        await expect(page.locator('#modal-portrait-caption')).not.toBeEmpty();
        await page.locator('#modal-details .close-btn').click();
        await expect(page.locator('#modal-details')).toBeHidden();
    }

    // Trente-trois figures ont aussi leur biographie dans l'appli : le bouton y mène.
    const avecBiographie = await page.evaluate(() => getCurrentTheme().events.filter(e => e.biographie).length);
    expect(avecBiographie).toBe(33);
    await page.locator('#timeline .entry', { hasText: 'Naissance de Charles Darwin' }).click();
    await expect(page.locator('#modal-bio-btn')).toBeVisible();
});

test('la recherche — « royaume-uni », « ecosse », « angleterre », « londres » — mène au panthéon du Royaume-Uni', async ({ page }) => {
    await page.locator('#screen-home').click();
    for (const mot of ['royaume-uni', 'ecosse', 'angleterre', 'londres']) {
        await page.locator('#theme-search-input').fill(mot);
        const resultat = page.locator('#theme-search-results .search-result-item', { hasText: 'Grandes figures du Royaume-Uni' });
        await expect(resultat, `« ${mot} » doit mener au Royaume-Uni`).toHaveCount(1);
        await expect(resultat.locator('.search-result-path')).toContainText('Personnages illustres › Panthéons');
    }
});

test('l’Allemagne, l’Autriche et la Suisse : chacune de ses figures a son portrait et son pays', async ({ page }) => {
    await openThemeById(page, 'pan_dach');
    await page.locator('#mode-card-discovery').click();
    await expect(page.locator('#screen-game')).toBeVisible();
    const nombre = await page.evaluate(() => getCurrentTheme().events.length);
    expect(nombre).toBeGreaterThanOrEqual(140);
    expect(nombre).toBeLessThanOrEqual(160);
    // Une pastille par repère, pas une de moins.
    await expect(page.locator('#timeline .entry')).toHaveCount(nombre);
    await expect(page.locator('#timeline .entry .entry-portrait')).toHaveCount(nombre);

    // Les trois pays du bloc, chacun par une de ses figures. Mozart est né à Salzbourg (Autriche),
    // Kafka à Prague (alors Autriche-Hongrie) : la fiche dit le pays que le bloc lui donne.
    const figures = [
        ['Naissance de Johann Wolfgang von Goethe', '🇩🇪', 'Allemagne'],
        ['Naissance de Wolfgang Amadeus Mozart', '🇦🇹', 'Autriche'],
        ['Naissance de Paul Klee', '🇨🇭', 'Suisse'],
    ];
    for (const [titre, drapeau, pays] of figures) {
        await page.locator('#timeline .entry', { hasText: titre }).click();
        await expect(page.locator('#modal-details')).toBeVisible();
        await expect(page.locator('#modal-pays')).toContainText(drapeau);
        await expect(page.locator('#modal-pays')).toContainText(pays);
        const portrait = page.locator('#modal-portrait-img');
        await expect.poll(() => portrait.evaluate(img => img.complete ? img.naturalWidth : 0)).toBe(320);
        await page.locator('#modal-details .close-btn').click();
        await expect(page.locator('#modal-details')).toBeHidden();
    }

    // Goethe a aussi sa biographie : le bouton y mène.
    await page.locator('#timeline .entry', { hasText: 'Naissance de Johann Wolfgang von Goethe' }).click();
    await expect(page.locator('#modal-bio-btn')).toBeVisible();
});

test('la recherche — « allemagne », « autriche », « suisse » — mène au panthéon de la sphère germanophone', async ({ page }) => {
    await page.locator('#screen-home').click();
    for (const mot of ['allemagne', 'autriche', 'suisse', 'habsbourg']) {
        await page.locator('#theme-search-input').fill(mot);
        const resultat = page.locator('#theme-search-results .search-result-item', { hasText: "Grandes figures d'Allemagne, d'Autriche et de Suisse" });
        await expect(resultat, `« ${mot} » doit mener au panthéon d'Allemagne, d'Autriche et de Suisse`).toHaveCount(1);
        await expect(resultat.locator('.search-result-path')).toContainText('Personnages illustres › Panthéons');
    }
});

test('la recherche — « tunisie », « libye », « mauritanie » — mène au panthéon du Maghreb', async ({ page }) => {
    await page.locator('#screen-home').click();
    for (const mot of ['tunisie', 'libye', 'mauritanie']) {
        await page.locator('#theme-search-input').fill(mot);
        // Aucun de ces pays n'est dans le nom du thème : ils sont dans ses mots-clés.
        const resultat = page.locator('#theme-search-results .search-result-item', { hasText: 'Grandes figures du Maghreb' });
        await expect(resultat, `« ${mot} » doit mener au Maghreb`).toHaveCount(1);
        await expect(resultat.locator('.search-result-path')).toContainText('Personnages illustres › Panthéons');
    }
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

// Galerie des portraits (js/gallery.js) : un bouton sous les deux tuiles, qui
// déplie le choix de l'ordre ; un trombinoscope de toutes les figures à
// portrait ; une fiche qui mène à la biographie et au panthéon du pays.
test('la galerie des portraits : deux ordres, une fiche, et ses deux accès au jeu', async ({ page }) => {
    await page.locator('#screen-home').click();
    const index = await page.evaluate(() => bdd.findIndex(c => c.nom === 'Personnages illustres'));
    await page.locator('#cat-grid > div').nth(index).click();
    expect(await visibleScreen(page)).toBe('screen-subcategories');

    // Le bouton se déplie sur les deux ordres, sans quitter l'écran.
    const lanceur = page.locator('#btn-gallery');
    await expect(lanceur).toContainText('Galerie des portraits');
    await expect(page.locator('#gallery-order-picker')).toBeHidden();
    await lanceur.click();
    await expect(lanceur).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#gallery-order-picker')).toBeVisible();
    await page.locator('#gallery-order-picker button', { hasText: 'Ordre alphabétique' }).click();
    expect(await visibleScreen(page)).toBe('screen-gallery');

    // Toutes les figures à portrait des panthéons, une carte chacune.
    const attendu = await page.evaluate(() => {
        const pantheon = bdd.find(c => c.nom === 'Personnages illustres').subcategories.find(s => s.nom === 'Panthéons');
        return pantheon.themes.reduce((n, theme) => n + theme.events.filter(e => e.image).length, 0);
    });
    expect(attendu).toBeGreaterThan(800);
    await expect(page.locator('#gallery-container .gallery-card')).toHaveCount(attendu);
    await expect(page.locator('#gallery-subtitle')).toHaveText(`${attendu} portraits`);
    await expect(page.locator('.gallery-section-title').first()).toHaveText('A');

    // Ordre chronologique : des siècles, du plus ancien au plus récent.
    await page.locator('#gallery-order-toggle [data-order="chrono"]').click();
    await expect(page.locator('#gallery-order-toggle [data-order="chrono"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.gallery-section-title').first()).toContainText('av. J.-C.');
    const dates = await page.evaluate(() => {
        const parDate = new Map();
        bdd.forEach(c => (function walk(n) { (n.themes || []).forEach(t => t.events.forEach(e => parDate.set(e.id, e.date))); (n.subcategories || []).forEach(walk); })(c));
        return [...document.querySelectorAll('#gallery-container .gallery-card')].map(c => parDate.get(c.dataset.eventId));
    });
    expect(dates).toEqual([...dates].sort((a, b) => a - b));

    // Un visage ouvre la fiche de sa naissance, avec ses deux boutons de jeu.
    await page.locator('.gallery-card', { hasText: 'Victor Hugo' }).click();
    await expect(page.locator('#modal-details')).toBeVisible();
    await expect(page.locator('#modal-titre')).toHaveText('Naissance de Victor Hugo');
    await expect(page.locator('#modal-bio-btn')).toHaveText('Jouer sur sa biographie');
    await expect(page.locator('#modal-theme-btn')).toContainText('Grandes figures de France');
    await expect(page.locator('#modal-redraw-btn')).toBeHidden();

    // Sans biographie, il ne reste que le panthéon.
    await page.locator('#modal-details .close-btn').click();
    await page.locator('.gallery-card', { hasText: 'Jules Ferry' }).click();
    await expect(page.locator('#modal-bio-row')).toBeHidden();
    await expect(page.locator('#modal-theme-btn')).toBeVisible();

    // Le panthéon du pays s'ouvre comme un thème.
    await page.locator('#modal-theme-btn').click();
    await expect(page.locator('#modal-details')).toBeHidden();
    await page.waitForSelector('#screen-axes:not(.hidden), #screen-modes:not(.hidden)');
    expect(await page.evaluate(() => getCurrentTheme().id)).toBe(PANTHEON);
});

test('le retour de la galerie ramène à « Personnages illustres », et la fiche ordinaire garde « Voir sa biographie »', async ({ page }) => {
    await page.locator('#screen-home').click();
    const index = await page.evaluate(() => bdd.findIndex(c => c.nom === 'Personnages illustres'));
    await page.locator('#cat-grid > div').nth(index).click();
    await page.locator('#btn-gallery').click();
    await page.locator('#gallery-order-picker button', { hasText: 'Ordre chronologique' }).click();
    await expect(page.locator('#gallery-order-toggle [data-order="chrono"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#screen-gallery .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-subcategories');
    await expect(page.locator('#subcategory-screen-title')).toHaveText('Personnages illustres');

    // Le libellé propre à la galerie ne déborde pas sur la fiche de la frise.
    await openThemeById(page, PANTHEON);
    await page.locator('#mode-card-discovery').click();
    await page.locator('#timeline .entry', { hasText: 'Naissance de Victor Hugo' }).click();
    await expect(page.locator('#modal-bio-btn')).toHaveText('Voir sa biographie');
});

// Remonte avec le « ‹ » de l'écran affiché jusqu'à la galerie. Le chemin ordinaire repasse
// par l'écran des axes quand on l'a traversé (le retour des modes y ramène d'abord) : un
// ou deux appuis, jamais davantage.
async function remonterJusqueALaGalerie(page) {
    for (let i = 0; i < 3 && await visibleScreen(page) !== 'screen-gallery'; i++) {
        await page.locator(`#${await visibleScreen(page)} .back-btn`).click();
    }
    await expect(page.locator('#screen-gallery')).toBeVisible();
}

// L'accueil se quitte d'un appui ; déjà quitté, on ne clique pas dans le vide.
async function quitterLAccueil(page) {
    if (await page.locator('#screen-home').isVisible()) await page.locator('#screen-home').click();
}

// Galerie : ouverture directe, pour les tests qui ne portent pas sur le bouton.
async function ouvrirLaGalerie(page, ordre = 'alpha') {
    await quitterLAccueil(page);
    const index = await page.evaluate(() => bdd.findIndex(c => c.nom === 'Personnages illustres'));
    await page.locator('#cat-grid > div').nth(index).click();
    await page.locator('#btn-gallery').click();
    await page.locator(`#gallery-order-picker [data-order="${ordre}"]`).click();
    await expect(page.locator('#screen-gallery')).toBeVisible();
    await expect(page.locator('#gallery-container .gallery-card').first()).toBeVisible();
}

test('« Par nom de famille » range Hugo à H, de Gaulle à G, et départage les rois par leur prénom', async ({ page }) => {
    await ouvrirLaGalerie(page, 'famille');
    await expect(page.locator('#gallery-order-toggle [data-order="famille"]')).toHaveAttribute('aria-pressed', 'true');
    const initiales = await page.locator('.gallery-section-title').allTextContents();
    expect(initiales[0]).toBe('A');
    expect(initiales).toEqual([...initiales].sort((a, b) => a.localeCompare(b, 'fr')));
    expect(initiales).not.toContain('#');
    const sousInitiale = (lettre, nom) =>
        page.locator('.gallery-section', { has: page.locator('.gallery-section-title', { hasText: new RegExp(`^${lettre}$`) }) })
            .locator('.gallery-card', { hasText: nom });
    await expect(sousInitiale('H', 'Victor Hugo')).toHaveCount(1);
    await expect(sousInitiale('G', 'Charles de Gaulle')).toHaveCount(1);
    await expect(sousInitiale('L', 'Louis XIV')).toHaveCount(1);
    // Le tri alphabétique, lui, suit le nom tel qu'il est écrit : Hugo à V.
    await page.locator('#gallery-order-toggle [data-order="alpha"]').click();
    await expect(sousInitiale('V', 'Victor Hugo')).toHaveCount(1);
});

test('la recherche trouve un personnage sans accent ni ordre, et « Tout effacer » rend la galerie entière', async ({ page }) => {
    await ouvrirLaGalerie(page);
    const total = await page.locator('#gallery-container .gallery-card').count();
    await expect(page.locator('#gallery-reset')).toBeHidden();

    await page.locator('#gallery-search').fill('hugo victor');
    await expect(page.locator('#gallery-container .gallery-card')).toHaveCount(1);
    await expect(page.locator('#gallery-subtitle')).toHaveText(`1 portrait sur ${total}`);
    await expect(page.locator('#gallery-reset')).toBeVisible();

    await page.locator('#gallery-search').fill('edith');
    await expect(page.locator('.gallery-card', { hasText: 'Édith Piaf' })).toHaveCount(1);

    await page.locator('#gallery-search').fill('zzzzz');
    await expect(page.locator('#gallery-container .gallery-card')).toHaveCount(0);
    await expect(page.locator('#gallery-container .empty-msg')).toContainText('Aucun portrait ne correspond');

    await page.locator('#gallery-reset').click();
    await expect(page.locator('#gallery-search')).toHaveValue('');
    await expect(page.locator('#gallery-container .gallery-card')).toHaveCount(total);
    await expect(page.locator('#gallery-reset')).toBeHidden();
});

test('les filtres pays et domaine se combinent, et chaque option annonce son effectif', async ({ page }) => {
    await ouvrirLaGalerie(page);
    const total = await page.locator('#gallery-container .gallery-card').count();
    const pays = page.locator('#gallery-filter-country');
    const domaine = page.locator('#gallery-filter-axis');
    await expect(pays.locator('option').first()).toHaveText('Tous les pays');
    await expect(domaine.locator('option').first()).toHaveText('Tous les domaines');
    // Sept domaines communs à tous les panthéons ; chaque pays d'un bloc a son entrée.
    await expect(domaine.locator('option')).toHaveCount(8);
    await expect(pays.locator('option', { hasText: 'France' })).toHaveText(/🇫🇷 France \(68\)/);
    await expect(pays.locator('option', { hasText: 'Venezuela' })).toHaveCount(1);

    await pays.selectOption({ label: '🇫🇷 France (68)' });
    await expect(page.locator('#gallery-container .gallery-card')).toHaveCount(68);
    await expect(page.locator('#gallery-subtitle')).toHaveText(`68 portraits sur ${total}`);

    await domaine.selectOption({ label: 'Sciences, techniques et innovation (109)' });
    const sciencesFrance = await page.locator('#gallery-container .gallery-card').count();
    expect(sciencesFrance).toBeGreaterThan(3);
    expect(sciencesFrance).toBeLessThan(30);
    await page.locator('#gallery-search').fill('curie');
    await expect(page.locator('#gallery-container .gallery-card')).toHaveCount(1);

    await page.locator('#gallery-reset').click();
    await expect(pays).toHaveValue('');
    await expect(domaine).toHaveValue('');
    await expect(page.locator('#gallery-container .gallery-card')).toHaveCount(total);
});

test('la fiche passe au portrait voisin : boutons, flèches du clavier, et rien au-delà des extrémités', async ({ page }) => {
    await ouvrirLaGalerie(page, 'chrono');
    const cartes = page.locator('#gallery-container .gallery-card');
    const total = await cartes.count();
    await cartes.first().click();
    await expect(page.locator('#modal-details')).toBeVisible();
    const premier = await page.locator('#modal-titre').textContent();
    await expect(page.locator('#modal-gallery-pos')).toHaveText(`1 sur ${total}`);
    // Au début de la liste, pas de portrait précédent.
    await expect(page.locator('#modal-gallery-prev')).toBeDisabled();
    await expect(page.locator('#modal-gallery-next')).toBeEnabled();

    await page.locator('#modal-gallery-next').click();
    await expect(page.locator('#modal-gallery-pos')).toHaveText(`2 sur ${total}`);
    const second = await page.locator('#modal-titre').textContent();
    expect(second).not.toBe(premier);
    // Le portrait de la fiche a bien changé, et chargé.
    const portrait = page.locator('#modal-portrait-img');
    await expect.poll(() => portrait.evaluate(img => img.complete ? img.naturalWidth : 0)).toBe(320);

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#modal-gallery-pos')).toHaveText(`3 sur ${total}`);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#modal-titre')).toHaveText(premier);
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#modal-gallery-pos')).toHaveText(`1 sur ${total}`);

    // La fiche suit l'ordre et les filtres affichés, pas la base entière.
    await page.locator('#modal-details .close-btn').click();
    await page.locator('#gallery-search').fill('curie');
    await expect(cartes).toHaveCount(1);
    await cartes.first().click();
    await expect(page.locator('#modal-gallery-pos')).toHaveText('1 sur 1');
    await expect(page.locator('#modal-gallery-prev')).toBeDisabled();
    await expect(page.locator('#modal-gallery-next')).toBeDisabled();
});

test('la barre de passage entre portraits n’apparaît que sur une fiche ouverte depuis la galerie', async ({ page }) => {
    await openThemeById(page, PANTHEON);
    await page.locator('#mode-card-discovery').click();
    await page.locator('#timeline .entry', { hasText: 'Naissance de Victor Hugo' }).click();
    await expect(page.locator('#modal-details')).toBeVisible();
    await expect(page.locator('#modal-gallery-nav')).toBeHidden();
});

test('après une partie lancée depuis la galerie, on y revient, au même endroit, avec la même recherche', async ({ page }) => {
    await ouvrirLaGalerie(page, 'famille');
    await page.locator('#gallery-search').fill('victor');
    await expect(page.locator('#gallery-container .gallery-card', { hasText: 'Victor Hugo' })).toHaveCount(1);
    await page.locator('#gallery-container .gallery-card', { hasText: 'Victor Hugo' }).click();
    await expect(page.locator('#modal-bio-btn')).toHaveText('Jouer sur sa biographie');

    // Biographie : écran des axes, puis retour.
    await page.locator('#modal-bio-btn').click();
    await expect(page.locator('#screen-axes')).toBeVisible();
    await page.locator('#screen-axes .back-btn').click();
    await expect(page.locator('#screen-gallery')).toBeVisible();
    await expect(page.locator('#gallery-search')).toHaveValue('victor');
    await expect(page.locator('#gallery-order-toggle [data-order="famille"]')).toHaveAttribute('aria-pressed', 'true');

    // Panthéon : axes, modes, puis retour depuis l'écran des modes.
    await page.locator('#gallery-container .gallery-card', { hasText: 'Victor Hugo' }).click();
    await page.locator('#modal-theme-btn').click();
    await page.waitForSelector('#screen-axes:not(.hidden), #screen-modes:not(.hidden)');
    if (await visibleScreen(page) === 'screen-axes') await page.locator('#axes-continue-btn').click();
    await expect(page.locator('#screen-modes')).toBeVisible();
    await remonterJusqueALaGalerie(page);
    // La partie a écrasé la sélection de catégorie : la galerie est pourtant pleine,
    // et son « ‹ » ramène à « Personnages illustres ».
    await expect(page.locator('#gallery-container .gallery-card', { hasText: 'Victor Hugo' })).toHaveCount(1);
    await page.locator('#screen-gallery .back-btn').click();
    await expect(page.locator('#subcategory-screen-title')).toHaveText('Personnages illustres');
});

test('le retour de la galerie ne survit pas à un détour par les catégories', async ({ page }) => {
    await ouvrirLaGalerie(page);
    await page.locator('#gallery-container .gallery-card', { hasText: 'Victor Hugo' }).click();
    await page.locator('#modal-theme-btn').click();
    await page.waitForSelector('#screen-axes:not(.hidden), #screen-modes:not(.hidden)');
    // On repart par l'arbre des catégories : le retour à la galerie est oublié.
    await page.evaluate(() => showScreen('screen-categories'));
    await page.evaluate(() => { openThemeAt(...(() => { const t = getAllThemesWithPath().find(x => x.theme.id === 'pan_fr'); return [t.ci, t.si, t.ti]; })()); });
    await page.waitForSelector('#screen-axes:not(.hidden), #screen-modes:not(.hidden)');
    if (await visibleScreen(page) === 'screen-axes') await page.locator('#axes-continue-btn').click();
    await page.locator('#screen-modes .back-btn').click();
    // Là où le parcours ordinaire ramène (les axes, ou les thèmes) — mais pas la galerie.
    expect(['screen-axes', 'screen-themes']).toContain(await visibleScreen(page));
});

test('revenir d’une partie remet la galerie à la hauteur où on l’avait laissée', async ({ page }) => {
    await ouvrirLaGalerie(page);
    await page.evaluate(() => { document.getElementById('screen-gallery').scrollTop = 4000; });
    const avant = await page.evaluate(() => document.getElementById('screen-gallery').scrollTop);
    expect(avant).toBeGreaterThan(2000);
    // Une carte visible à cette hauteur.
    const carte = await page.evaluateHandle(() =>
        [...document.querySelectorAll('#gallery-container .gallery-card')]
            .find(c => { const r = c.getBoundingClientRect(); return r.top > 150 && r.bottom < innerHeight; }));
    await carte.asElement().click();
    const bouton = page.locator('#modal-theme-btn');
    await bouton.click();
    await page.waitForSelector('#screen-axes:not(.hidden), #screen-modes:not(.hidden)');
    if (await visibleScreen(page) === 'screen-axes') await page.locator('#axes-continue-btn').click();
    await remonterJusqueALaGalerie(page);
    await expect.poll(() => page.evaluate(() => document.getElementById('screen-gallery').scrollTop)).toBeGreaterThan(avant - 200);
});


// ---- Collection de portraits : noir et blanc jusqu'à la rencontre en jeu --------------------------

// La première visite : la question n'a pas encore été posée (les tests partent d'un choix déjà fait,
// voir e2e/fixtures.js).
async function premiereVisite(page) {
    await page.evaluate(() => { appSettings.portraitCollection = null; settingsSave(appSettings); });
}

async function ouvrirPersonnagesIllustres(page) {
    await quitterLAccueil(page);
    const index = await page.evaluate(() => bdd.findIndex(c => c.nom === 'Personnages illustres'));
    await page.locator('#cat-grid > div').nth(index).click();
}

const reglage = page => page.evaluate(() => appSettings.portraitCollection);

test('à la première ouverture de « Personnages illustres », on demande si les portraits se collectionnent — une seule fois', async ({ page }) => {
    await quitterLAccueil(page);
    await premiereVisite(page);
    await ouvrirPersonnagesIllustres(page);
    const fenetre = page.locator('#modal-collection');
    await expect(fenetre).toBeVisible();
    await expect(fenetre.locator('h2')).toHaveText('Collectionner les portraits ?');
    await expect(fenetre.locator('.collection-choice')).toHaveText([/Débloquer mes portraits/, /Tout voir en couleur/]);
    // Le texte dit que l'on peut s'instruire sans progression, et que le choix se change.
    await expect(fenetre).toContainText('sans progression ni compétition');
    await expect(fenetre).toContainText('se change à tout moment');

    await fenetre.locator('[data-choice="bw"]').click();
    await expect(fenetre).toBeHidden();
    expect(await reglage(page)).toBe('bw');
    // Le bouton de la galerie annonce l'avancement, dès le premier instant.
    await expect(page.locator('#btn-gallery .gallery-launcher-sub')).toHaveText('0 / 838 portraits débloqués');

    // On ne repose pas la question.
    await page.locator('#screen-subcategories .back-btn').click();
    await ouvrirPersonnagesIllustres(page);
    await expect(page.locator('#screen-subcategories')).toBeVisible();
    await expect(fenetre).toBeHidden();
});

test('la croix et Échap répondent « tout en couleur », sans que la question revienne', async ({ page }) => {
    await quitterLAccueil(page);
    await premiereVisite(page);
    await ouvrirPersonnagesIllustres(page);
    await expect(page.locator('#modal-collection')).toBeVisible();
    await page.locator('#modal-collection .close-btn').click();
    await expect(page.locator('#modal-collection')).toBeHidden();
    expect(await reglage(page)).toBe('color');

    await page.evaluate(() => { appSettings.portraitCollection = null; settingsSave(appSettings); });
    await page.locator('#screen-subcategories .back-btn').click();
    await ouvrirPersonnagesIllustres(page);
    await expect(page.locator('#modal-collection')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-collection')).toBeHidden();
    expect(await reglage(page)).toBe('color');
});

test('la question n’est pas posée ailleurs que dans « Personnages illustres »', async ({ page }) => {
    await page.locator('#screen-home').click();
    await premiereVisite(page);
    const autre = await page.evaluate(() => bdd.findIndex(c => c.subcategories && !c.subcategories.some(s => s.nom === 'Panthéons')));
    expect(autre).toBeGreaterThanOrEqual(0);
    await page.locator('#cat-grid > div').nth(autre).click();
    await expect(page.locator('#modal-collection')).toBeHidden();
    expect(await reglage(page)).toBeNull();
});

test('en mode collection, les portraits sont en noir et blanc jusqu’à la rencontre, et le compteur avance', async ({ page }) => {
    await quitterLAccueil(page);
    await page.evaluate(() => { appSettings.portraitCollection = 'bw'; settingsSave(appSettings); localStorage.removeItem('historiaxe_srs_v1'); });
    await ouvrirLaGalerie(page);
    const cartes = page.locator('#gallery-container .gallery-card');
    const total = await cartes.count();
    await expect(page.locator('#gallery-collection-count')).toHaveText(`0 / ${total} portraits débloqués`);
    await expect(page.locator('#gallery-collection-bar')).toHaveAttribute('aria-valuenow', '0');
    await expect(page.locator('#gallery-container .gallery-card.is-locked')).toHaveCount(total);
    // Le noir et blanc est réel, pas seulement une classe.
    const filtre = await cartes.first().locator('img').evaluate(img => getComputedStyle(img).filter);
    expect(filtre).toContain('grayscale(1)');
    await expect(cartes.first()).toHaveAttribute('aria-label', /pas encore rencontré en jeu/);

    // Rencontrer Victor Hugo en jeu le débloque ; on revient à la galerie, qui se redessine.
    await page.evaluate(() => {
        const hugo = getAllThemesWithPath().flatMap(i => i.theme.events || []).find(e => e.titre === 'Naissance de Victor Hugo');
        srsRecord(hugo.id, false); // une réponse ratée est aussi une rencontre
        showScreen('screen-gallery');
    });
    await expect(page.locator('#gallery-collection-count')).toHaveText(`1 / ${total} portraits débloqués`);
    await expect(page.locator('#gallery-container .gallery-card.is-locked')).toHaveCount(total - 1);
    await expect(page.locator('.gallery-card', { hasText: 'Victor Hugo' })).not.toHaveClass(/is-locked/);
    await expect(page.locator('.gallery-card', { hasText: 'Victor Hugo' })).not.toHaveAttribute('aria-label', /pas encore rencontré/);
});

test('la fiche d’un personnage pas encore rencontré garde son portrait en noir et blanc et dit comment le débloquer', async ({ page }) => {
    await quitterLAccueil(page);
    await page.evaluate(() => { appSettings.portraitCollection = 'bw'; settingsSave(appSettings); localStorage.removeItem('historiaxe_srs_v1'); });
    await ouvrirLaGalerie(page);
    await page.locator('.gallery-card', { hasText: 'Victor Hugo' }).click();
    await expect(page.locator('#modal-gallery-lock')).toBeVisible();
    await expect(page.locator('#modal-gallery-lock')).toContainText('Pas encore rencontré en jeu');
    expect(await page.locator('#modal-portrait-img').evaluate(img => getComputedStyle(img).filter)).toContain('grayscale(1)');
    // Les boutons de jeu restent : c'est ainsi qu'on le débloque.
    await expect(page.locator('#modal-theme-btn')).toBeVisible();

    // Une fois rencontré, la fiche est en couleur et la mention disparaît.
    await page.locator('#modal-details .close-btn').click();
    await page.evaluate(() => {
        const hugo = getAllThemesWithPath().flatMap(i => i.theme.events || []).find(e => e.titre === 'Naissance de Victor Hugo');
        srsRecord(hugo.id, true);
    });
    await page.locator('.gallery-card', { hasText: 'Victor Hugo' }).click();
    await expect(page.locator('#modal-gallery-lock')).toBeHidden();
    expect(await page.locator('#modal-portrait-img').evaluate(img => getComputedStyle(img).filter)).toBe('none');
});

test('hors mode collection, tout est en couleur et aucun compteur ne s’affiche', async ({ page }) => {
    await ouvrirLaGalerie(page);
    await expect(page.locator('#gallery-collection-meter')).toBeHidden();
    await expect(page.locator('#gallery-container .gallery-card.is-locked')).toHaveCount(0);
    await expect(page.locator('#gallery-collection-toggle')).toHaveText('🎞️ Collectionner les portraits');
    await page.locator('.gallery-card').first().click();
    await expect(page.locator('#modal-gallery-lock')).toBeHidden();
});

test('le réglage se change depuis la galerie et depuis les Réglages, et chacun suit l’autre', async ({ page }) => {
    await ouvrirLaGalerie(page);
    const total = await page.locator('#gallery-container .gallery-card').count();
    await page.locator('#gallery-collection-toggle').click();
    expect(await reglage(page)).toBe('bw');
    await expect(page.locator('#gallery-collection-meter')).toBeVisible();
    await expect(page.locator('#gallery-container .gallery-card.is-locked')).toHaveCount(total);
    await expect(page.locator('#gallery-collection-toggle')).toHaveText('Tout voir en couleur');

    await page.evaluate(() => openSettings());
    await expect(page.locator('#settings-portraits button[data-value="bw"]')).toHaveClass(/active/);
    await page.locator('#settings-portraits button[data-value="color"]').click();
    expect(await reglage(page)).toBe('color');
    await expect(page.locator('#settings-portraits button[data-value="color"]')).toHaveClass(/active/);
    // La galerie, derrière la fenêtre, a suivi.
    await expect(page.locator('#gallery-container .gallery-card.is-locked')).toHaveCount(0);
    await expect(page.locator('#gallery-collection-meter')).toBeHidden();
});

test('une vraie partie débloque les portraits des personnages rencontrés', async ({ page }) => {
    await quitterLAccueil(page);
    await page.evaluate(() => { appSettings.portraitCollection = 'bw'; settingsSave(appSettings); localStorage.removeItem('historiaxe_srs_v1'); });
    await openThemeById(page, PANTHEON);
    await page.locator('.quiz-card').click();
    await expect(page.locator('#screen-quiz')).toBeVisible();
    await page.locator('#quiz-options .quiz-option').first().click();
    const rencontres = await page.evaluate(() => Object.keys(srsLoad()).length);
    expect(rencontres).toBeGreaterThanOrEqual(1);

    // De retour à la galerie par le chemin de l'arbre, le compteur a avancé.
    await page.evaluate(() => {
        selectedCategoryIndex = bdd.findIndex(c => c.nom === 'Personnages illustres');
        selectedSubcategoryIndex = [];
        openGallery('alpha');
    });
    await expect(page.locator('#gallery-collection-count')).toHaveText(new RegExp(`^${rencontres} / \\d+ portraits débloqués$`));
});

// ---- Mode « Qui est-ce ? » : un portrait, quatre noms ----------------------------------------------

async function lancerQuiEstCe(page, theme = PANTHEON) {
    await openThemeById(page, theme);
    await expect(page.locator('#mode-card-whois')).toBeVisible();
    await page.locator('#mode-card-whois').click();
    await expect(page.locator('#screen-whois')).toBeVisible();
}

// La bonne réponse de la question affichée, lue dans l'état du jeu : le test ne la devine pas.
const bonneReponse = page => page.evaluate(() => whoQuestions[whoIndex].correctId);

async function repondre(page, juste) {
    const bonne = await bonneReponse(page);
    const selecteur = juste ? `[data-event-id="${bonne}"]` : `:not([data-event-id="${bonne}"])`;
    await page.locator(`#whois-options .whois-option${selecteur}`).first().click();
}

test('« Qui est-ce ? » n’est proposé que pour un thème dont les figures ont un portrait', async ({ page }) => {
    await openThemeById(page, PANTHEON);
    await expect(page.locator('#mode-card-whois')).toBeVisible();
    await expect(page.locator('#mode-card-whois h3')).toHaveText('Qui est-ce ?');
    // Un thème d'histoire n'a aucun portrait : la carte ne s'y propose pas.
    await page.evaluate(() => showScreen('screen-categories'));
    await openThemeCard(page, 'thm_aut');
    await page.waitForSelector('#screen-axes:not(.hidden), #screen-modes:not(.hidden)');
    if (await visibleScreen(page) === 'screen-axes') await page.locator('#axes-continue-btn').click();
    await expect(page.locator('#screen-modes')).toBeVisible();
    await expect(page.locator('#mode-card-whois')).toBeHidden();
});

test('« Qui est-ce ? » montre un portrait et son crédit, sans dire qui avant la réponse', async ({ page }) => {
    await lancerQuiEstCe(page);
    const portrait = page.locator('#whois-portrait-img');
    await expect(portrait).toBeVisible();
    await expect.poll(() => portrait.evaluate(img => img.complete ? img.naturalWidth : 0)).toBe(320);
    await expect(portrait).toHaveAttribute('alt', /à identifier/);
    // Quatre noms distincts, une barre de progression à 1 sur 10, trois vies.
    const noms = await page.locator('#whois-options .whois-option').allTextContents();
    expect(noms).toHaveLength(4);
    expect(new Set(noms).size).toBe(4);
    await expect(page.locator('#whois-hud-count')).toHaveText('1 / 10');
    await expect(page.locator('#whois-hud-lives .pip')).toHaveCount(3);
    await expect(page.locator('#whois-hud-lives .pip.spent')).toHaveCount(0);
    // Le crédit est là (condition des licences CC), la légende — qui nomme la personne — n'y est pas encore.
    await expect(page.locator('#whois-portrait-credit')).toContainText('Wikimedia Commons');
    await expect(page.locator('#whois-portrait-credit a').first()).toHaveAttribute('rel', /noopener/);
    await expect(page.locator('#whois-reveal')).toBeHidden();
    const legende = await page.evaluate(() => portraitOf(whoQuestions[whoIndex].correct).legende);
    await expect(page.locator('#screen-whois')).not.toContainText(legende);
});

test('« Qui est-ce ? » : une bonne réponse révèle la fiche et se poursuit au bouton « Continuer »', async ({ page }) => {
    await lancerQuiEstCe(page);
    const q = await page.evaluate(() => ({ nom: whoQuestions[whoIndex].name, id: whoQuestions[whoIndex].correctId,
        legende: portraitOf(whoQuestions[whoIndex].correct).legende }));
    await repondre(page, true);
    await expect(page.locator(`#whois-options .whois-option[data-event-id="${q.id}"]`)).toHaveClass(/correct/);
    await expect(page.locator('#whois-options .whois-option.wrong')).toHaveCount(0);
    const reveal = page.locator('#whois-reveal');
    await expect(reveal).toBeVisible();
    await expect(reveal.locator('.whois-reveal-verdict')).toHaveText('Bien vu !');
    await expect(reveal.locator('.whois-reveal-name')).toContainText(q.nom);
    await expect(reveal.locator('.whois-reveal-caption')).toHaveText(q.legende);
    await expect(reveal.locator('.whois-reveal-desc')).not.toBeEmpty();
    await expect(page.locator('#whois-hud-lives .pip.spent')).toHaveCount(0);
    // Ne se referme pas tout seul : le bouton a le focus, Entrée enchaîne.
    await expect(page.locator('#whois-continue')).toBeFocused();
    await page.waitForTimeout(3000);
    await expect(reveal).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('#whois-hud-count')).toHaveText('2 / 10');
    await expect(reveal).toBeHidden();
    // Les réponses ne se cliquent pas deux fois pendant le révélé.
    expect(await page.evaluate(() => whoIndex)).toBe(1);
});

test('« Qui est-ce ? » : une mauvaise réponse coûte une vie, et trois mènent à la fin de partie', async ({ page }) => {
    await lancerQuiEstCe(page);
    await repondre(page, false);
    await expect(page.locator('#whois-options .whois-option.wrong')).toHaveCount(1);
    await expect(page.locator('#whois-options .whois-option.correct')).toHaveCount(1);
    await expect(page.locator('#whois-reveal .whois-reveal-verdict')).toContainText('Raté');
    await expect(page.locator('#whois-hud-lives .pip.spent')).toHaveCount(1);
    await page.locator('#whois-continue').click();
    await repondre(page, false);
    await page.locator('#whois-continue').click();
    await repondre(page, false);
    await expect(page.locator('#whois-hud-lives .pip.spent')).toHaveCount(3);
    await page.locator('#whois-continue').click();
    await expect(page.locator('#screen-end')).toBeVisible();
    await expect(page.locator('#end-title')).toContainText('Game Over');
    // « Rejouer » relance bien CE mode, et non la frise.
    await page.locator('#screen-end button', { hasText: 'Rejouer' }).click();
    await expect(page.locator('#screen-whois')).toBeVisible();
    await expect(page.locator('#whois-hud-count')).toHaveText('1 / 10');
});

test('« Qui est-ce ? » : dix bonnes réponses gagnent la partie, et débloquent ces dix portraits', async ({ page }) => {
    await quitterLAccueil(page);
    await page.evaluate(() => { appSettings.portraitCollection = 'bw'; settingsSave(appSettings); localStorage.removeItem('historiaxe_srs_v1'); });
    await lancerQuiEstCe(page);
    const rencontres = [];
    for (let i = 0; i < 10; i++) {
        rencontres.push(await bonneReponse(page));
        await repondre(page, true);
        await page.locator('#whois-continue').click();
    }
    await expect(page.locator('#screen-end')).toBeVisible();
    await expect(page.locator('#end-title')).toContainText('Pas un visage ne vous a échappé');
    const debloques = await page.evaluate(ids => ids.filter(id => srsLoad()[id]).length, rencontres);
    expect(debloques).toBe(10);
    expect(new Set(rencontres).size).toBe(10);
});

test('« Qui est-ce ? » : quitter la partie ramène à l’écran d’où elle est partie', async ({ page }) => {
    await lancerQuiEstCe(page);
    await page.locator('#screen-whois .quit-btn').click();
    await page.locator('#confirm-ok-btn').click();
    // Là où le parcours ordinaire ramène après une partie (les axes, ou les thèmes).
    expect(['screen-themes', 'screen-axes']).toContain(await visibleScreen(page));
});

test('« Qui est-ce ? » lancé depuis la galerie y ramène à la fin de la partie', async ({ page }) => {
    await ouvrirLaGalerie(page);
    await page.locator('#gallery-container .gallery-card', { hasText: 'Victor Hugo' }).click();
    await page.locator('#modal-theme-btn').click();
    await page.waitForSelector('#screen-axes:not(.hidden), #screen-modes:not(.hidden)');
    if (await visibleScreen(page) === 'screen-axes') await page.locator('#axes-continue-btn').click();
    await page.locator('#mode-card-whois').click();
    await expect(page.locator('#screen-whois')).toBeVisible();
    await page.locator('#screen-whois .quit-btn').click();
    await page.locator('#confirm-ok-btn').click();
    await remonterJusqueALaGalerie(page);
    await expect(page.locator('#gallery-container .gallery-card', { hasText: 'Victor Hugo' })).toHaveCount(1);
});

// ---- Portrait du jour, et repère « biographie disponible » -----------------------------------------

async function ouvrirLesDefis(page) {
    await quitterLAccueil(page);
    await page.locator('#btn-daily').click();
    await expect(page.locator('#challenge-picker')).toBeVisible();
}

test('le portrait du jour s’ajoute aux défis, avec son état du jour', async ({ page }) => {
    await ouvrirLesDefis(page);
    const bouton = page.locator('#btn-challenge-portrait');
    await expect(bouton).toBeVisible();
    await expect(bouton.locator('.portrait-day-title')).toHaveText('Portrait du jour');
    await expect(page.locator('#portrait-day-status')).toHaveText('Un visage à trouver chaque jour');
    // Les trois défis existants sont intacts.
    await expect(page.locator('#btn-challenge-daily')).toBeVisible();
    await expect(page.locator('#btn-challenge-weekly')).toBeVisible();
    await expect(page.locator('#btn-challenge-simul')).toBeVisible();
});

test('le portrait du jour est le même pour tous : même portrait, mêmes options, même ordre', async ({ page }) => {
    await ouvrirLesDefis(page);
    await page.locator('#btn-challenge-portrait').click();
    await expect(page.locator('#screen-whois')).toBeVisible();
    const premiere = await page.evaluate(() => ({ id: whoQuestions[0].correctId, options: whoQuestions[0].options.map(o => o.id) }));
    expect(premiere.options).toHaveLength(4);

    // Un autre appareil, le même jour : on recharge tout.
    await page.reload();
    await page.waitForFunction(() => window.bdd && bdd.length > 0, null, { timeout: 45_000 });
    await ouvrirLesDefis(page);
    await page.locator('#btn-challenge-portrait').click();
    const seconde = await page.evaluate(() => ({ id: whoQuestions[0].correctId, options: whoQuestions[0].options.map(o => o.id) }));
    expect(seconde).toEqual(premiere);
});

test('le portrait du jour : une question, sans points ni vies ni écran de fin', async ({ page }) => {
    await ouvrirLesDefis(page);
    await page.locator('#btn-challenge-portrait').click();
    await expect(page.locator('#whois-kicker')).toHaveText('Portrait du jour · Qui est-ce ?');
    await expect(page.locator('#whois-portrait-img')).toBeVisible();
    // Pas de vies ni de progression dans la barre du haut : le portrait du jour n'est pas classé.
    await expect(page.locator('#whois-hud-lives')).toBeHidden();
    await expect(page.locator('#whois-hud-count')).toBeHidden();
    await expect(page.locator('#screen-whois .quit-btn')).toBeVisible();

    await repondre(page, false);
    await expect(page.locator('#whois-reveal .whois-reveal-verdict')).toContainText('Raté');
    // Une mauvaise réponse ne coûte rien : ni vie, ni point.
    expect(await page.evaluate(() => ({ lives, score }))).toEqual({ lives: 3, score: 0 });
    await expect(page.locator('#whois-continue')).toHaveText('Retour aux défis');
    // La figure est tout de même rencontrée : elle se débloque dans la collection.
    expect(await page.evaluate(() => !!srsLoad()[whoQuestions[0].correctId])).toBe(true);

    // La fiche complète, avec ses accès au jeu.
    await page.locator('#whois-daily-card').click();
    await expect(page.locator('#modal-details')).toBeVisible();
    await expect(page.locator('#modal-titre')).toHaveText(/^Naissance /);
    await expect(page.locator('#modal-theme-btn')).toBeVisible();
    await page.locator('#modal-details .close-btn').click();

    await page.locator('#whois-continue').click();
    await expect(page.locator('#screen-categories')).toBeVisible();
    expect(await page.evaluate(() => whoDailyMode)).toBe(false);
});

test('le portrait du jour, une fois répondu, se rouvre tel qu’on l’a laissé et ne se rejoue pas', async ({ page }) => {
    await ouvrirLesDefis(page);
    await page.locator('#btn-challenge-portrait').click();
    await repondre(page, true);
    const bonne = await bonneReponse(page);
    await page.locator('#whois-continue').click();

    await page.locator('#btn-daily').click();
    await expect(page.locator('#portrait-day-status')).toHaveText('✔ Trouvé aujourd\'hui');
    await page.locator('#btn-challenge-portrait').click();
    // Déjà répondu : la fiche est là d'emblée, la bonne réponse marquée, plus rien à cliquer.
    await expect(page.locator('#whois-reveal')).toBeVisible();
    await expect(page.locator('#whois-reveal .whois-reveal-verdict')).toHaveText('Bien vu !');
    await expect(page.locator(`#whois-options .whois-option[data-event-id="${bonne}"]`)).toHaveClass(/correct/);
    await expect(page.locator('#whois-options .whois-option.wrong')).toHaveCount(0);
    expect(await page.locator('#whois-options .whois-option').first().evaluate(b => getComputedStyle(b).pointerEvents)).toBe('none');
});

test('le portrait du jour raté propose de revoir la fiche, et son état ne vaut que pour le jour', async ({ page }) => {
    await ouvrirLesDefis(page);
    await page.locator('#btn-challenge-portrait').click();
    await repondre(page, false);
    await page.locator('#whois-continue').click();
    await page.locator('#btn-daily').click();
    await expect(page.locator('#portrait-day-status')).toHaveText('Revoir la fiche du jour');
    // Hier : la réponse enregistrée ne compte plus.
    await page.evaluate(() => { const s = portraitDayLoad(); s.date = '2020-01-01'; portraitDaySave(s); initCategories(); });
    await page.locator('#btn-daily').click();
    await expect(page.locator('#portrait-day-status')).toHaveText('Un visage à trouver chaque jour');
});

test('quitter le portrait du jour ne demande rien et ne l’enregistre pas', async ({ page }) => {
    await ouvrirLesDefis(page);
    await page.locator('#btn-challenge-portrait').click();
    await page.locator('#screen-whois .quit-btn').click();
    await expect(page.locator('#screen-categories')).toBeVisible();
    await expect(page.locator('#modal-confirm')).toBeHidden();
    expect(await page.evaluate(() => portraitDayLoad())).toBeNull();
    // Une partie ordinaire de « Qui est-ce ? » ensuite n'hérite pas du mode du jour.
    await openThemeById(page, PANTHEON);
    await page.locator('#mode-card-whois').click();
    await expect(page.locator('#whois-hud-lives')).toBeVisible();
    await expect(page.locator('#whois-kicker')).toHaveText('Qui est-ce ?');
});

test('le Défi du jour classé ne change pas : le portrait du jour a sa propre graine', async ({ page }) => {
    await quitterLAccueil(page);
    const avant = await page.evaluate(() => generateDailyEvents().map(i => i.event.id));
    await page.evaluate(() => { getPortraitDayQuestion(); });
    const apres = await page.evaluate(() => generateDailyEvents().map(i => i.event.id));
    expect(apres).toEqual(avant);
    expect(avant).toHaveLength(10);
});

test('la pastille « biographie disponible » n’apparaît que sur les figures qui en ont une', async ({ page }) => {
    await ouvrirLaGalerie(page);
    // Calculé depuis les données brutes, pas depuis la galerie : il faut un thème de biographie qui existe.
    const attendu = await page.evaluate(() => {
        const ids = new Set(getAllThemesWithPath().map(i => i.theme.id));
        const panth = bdd.find(c => c.nom === 'Personnages illustres').subcategories.find(s => s.nom === 'Panthéons');
        return panth.themes.flatMap(t => t.events).filter(e => e.image && e.biographie && ids.has(e.biographie)).length;
    });
    expect(attendu).toBeGreaterThan(100);
    await expect(page.locator('.gallery-card-bio')).toHaveCount(attendu);
    // Victor Hugo en a une, Jules Ferry non — et leurs cartes ont la même taille.
    const hugo = page.locator('.gallery-card', { hasText: 'Victor Hugo' });
    const ferry = page.locator('.gallery-card', { hasText: 'Jules Ferry' });
    await expect(hugo.locator('.gallery-card-bio')).toHaveCount(1);
    await expect(ferry.locator('.gallery-card-bio')).toHaveCount(0);
    await expect(hugo).toHaveAttribute('aria-label', /biographie disponible/);
    await expect(ferry).not.toHaveAttribute('aria-label', /biographie/);
    const [a, b] = await Promise.all([hugo.boundingBox(), ferry.boundingBox()]);
    expect(Math.abs(a.width - b.width)).toBeLessThan(1);
});

// ---- « Découvrir » : un événement ou un personnage -----------------------------------------------------

test('« Découvrir » propose deux boutons, « Événement » et « Personnage », et un seul volet à la fois', async ({ page }) => {
    await quitterLAccueil(page);
    const picker = page.locator('#discover-picker');
    await expect(picker).toBeHidden();
    await page.locator('#btn-discover').click();
    await expect(picker).toBeVisible();
    await expect(page.locator('#btn-discover')).toHaveAttribute('aria-expanded', 'true');
    await expect(picker.locator('button > span:last-child')).toHaveText(['Événement', 'Personnage']);
    // Ouvrir « Défis » referme « Découvrir », et inversement.
    await page.locator('#btn-daily').click();
    await expect(page.locator('#challenge-picker')).toBeVisible();
    await expect(picker).toBeHidden();
    await expect(page.locator('#btn-discover')).toHaveAttribute('aria-expanded', 'false');
    await page.locator('#btn-discover').click();
    await expect(picker).toBeVisible();
    await expect(page.locator('#challenge-picker')).toBeHidden();
    // Un second appui replie.
    await page.locator('#btn-discover').click();
    await expect(picker).toBeHidden();
});

test('« Découvrir » › « Personnage » ouvre la fiche d’une figure de la galerie, avec sa biographie et son panthéon', async ({ page }) => {
    await quitterLAccueil(page);
    await page.locator('#btn-discover').click();
    await page.locator('#btn-discover-person').click();
    await expect(page.locator('#modal-details')).toBeVisible();

    // Une figure de la galerie : un portrait chargé, un titre « Naissance de… ».
    const titre = await page.locator('#modal-titre').textContent();
    expect(titre).toMatch(/^Naissance /);
    const portrait = page.locator('#modal-portrait-img');
    await expect(portrait).toBeVisible();
    await expect.poll(() => portrait.evaluate(img => img.complete ? img.naturalWidth : 0)).toBe(320);
    // Ce n'est pas la fiche de la galerie : ni barre de passage, ni noir et blanc.
    await expect(page.locator('#modal-gallery-nav')).toBeHidden();
    await expect(page.locator('#modal-gallery-lock')).toBeHidden();

    // Le panthéon, toujours ; la biographie, quand elle existe — comme dans la galerie.
    await expect(page.locator('#modal-theme-btn')).toContainText('Grandes figures');
    const aBio = await page.evaluate(t => {
        const panth = bdd.find(c => c.nom === 'Personnages illustres').subcategories.find(s => s.nom === 'Panthéons');
        return !!panth.themes.flatMap(x => x.events).find(e => e.titre === t).biographie;
    }, titre);
    if (aBio) await expect(page.locator('#modal-bio-btn')).toBeVisible();
    else await expect(page.locator('#modal-bio-row')).toBeHidden();

    // « Un autre personnage » repioche, jamais le même, et reste dans les personnages.
    await expect(page.locator('#modal-redraw-btn')).toHaveText('🔀 Un autre personnage');
    for (let i = 0; i < 4; i++) {
        const avant = await page.locator('#modal-titre').textContent();
        await page.locator('#modal-redraw-btn').click();
        const apres = await page.locator('#modal-titre').textContent();
        expect(apres).not.toBe(avant);
        expect(apres).toMatch(/^Naissance /);
        await expect(page.locator('#modal-portrait-img')).toBeVisible();
    }

    // Le panthéon s'ouvre comme un thème.
    await page.locator('#modal-theme-btn').click();
    await expect(page.locator('#modal-details')).toBeHidden();
    await page.waitForSelector('#screen-axes:not(.hidden), #screen-modes:not(.hidden)');
    expect(await page.evaluate(() => getCurrentTheme().id)).toMatch(/^pan_/);
});

test('« Découvrir » › « Personnage » : la biographie mène au jeu, quand le personnage en a une', async ({ page }) => {
    await quitterLAccueil(page);
    // On tire jusqu'à une figure qui a sa biographie (152 sur 838).
    await page.locator('#btn-discover').click();
    await page.locator('#btn-discover-person').click();
    for (let i = 0; i < 40 && !(await page.locator('#modal-bio-btn').isVisible()); i++) {
        await page.locator('#modal-redraw-btn').click();
    }
    await expect(page.locator('#modal-bio-btn')).toBeVisible();
    await expect(page.locator('#modal-bio-btn')).toHaveText('Voir sa biographie');
    await page.locator('#modal-bio-btn').click();
    await expect(page.locator('#modal-details')).toBeHidden();
    await page.waitForSelector('#screen-axes:not(.hidden), #screen-modes:not(.hidden)');
    expect(await page.evaluate(() => getCurrentTheme().id)).toMatch(/^bio_/);
});

test('« Découvrir » › « Événement » garde son comportement, et son bouton repioche un événement', async ({ page }) => {
    await quitterLAccueil(page);
    await page.locator('#btn-discover').click();
    await page.locator('#btn-discover-event').click();
    await expect(page.locator('#modal-details')).toBeVisible();
    await expect(page.locator('#modal-redraw-btn')).toHaveText('🔀 Un autre événement');
    // Revenir ensuite à un personnage ne laisse pas le libellé d'un événement.
    await page.locator('#modal-details .close-btn').click();
    await page.locator('#btn-discover-person').click();
    await expect(page.locator('#modal-redraw-btn')).toHaveText('🔀 Un autre personnage');
});

test('sans aucun portrait dans la base, « Découvrir » pioche un événement directement', async ({ page }) => {
    await quitterLAccueil(page);
    await page.evaluate(() => { getDiscoverablePortraits = () => []; });
    await page.locator('#btn-discover').click();
    await expect(page.locator('#discover-picker')).toBeHidden();
    await expect(page.locator('#modal-details')).toBeVisible();
});
