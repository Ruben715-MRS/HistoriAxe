// Parcours 3 — le sommaire d'un thème.
//
// Un sommaire est une fiche de synthèse en branches dépliables, rendue à
// partir du champ `carteMentale` du pack de données (voir js/mindMap.js et
// la section « Sommaires » du README). Deux thèmes en proposent un
// aujourd'hui ; les autres n'ont rien, et « Découverte » doit alors se
// comporter comme avant.
//
// Ce qui est vérifié ici, c'est le lien entre la donnée et l'écran : autant
// de branches affichées que la donnée en déclare, un repère daté qui ouvre
// la fiche du bon événement, une pastille qui prépare la révision du bon
// axe. Le contenu lui-même (les textes de la fiche) est validé ailleurs,
// par tests/data-schema.test.js.

const { test, expect, visibleScreen, openThemeModes } = require('./fixtures');

const THEME_AVEC = 'thm_camp';  // Vivre à la campagne en France — 7 branches
const THEME_SANS = 'thm_rome';  // Rome : République et Empire — aucun sommaire

// Nombre de branches déclarées par la donnée du thème courant : l'écran
// doit en afficher exactement autant. Lire la donnée plutôt que coder un
// nombre en dur évite de casser ce test à chaque enrichissement de fiche,
// tout en vérifiant réellement le rendu.
const branchesDeclarees = page => page.evaluate(() => getCurrentTheme().carteMentale.branches.length);

test('un thème sans sommaire garde « Découverte » telle quelle', async ({ page }) => {
    await openThemeModes(page, THEME_SANS);

    await expect(page.locator('#discovery-picker')).toBeHidden();
    await expect(page.locator('#discovery-picker')).toHaveAttribute('data-available', 'no');

    await page.locator('#mode-card-discovery').click();
    await expect(page.locator('#screen-game')).toBeVisible();
});

test('« Découverte » déplie le choix Frise / Sommaire, et le sommaire s’ouvre', async ({ page }) => {
    await openThemeModes(page, THEME_AVEC);

    await expect(page.locator('#discovery-picker')).toBeHidden();
    await page.locator('#mode-card-discovery').click();
    await expect(page.locator('#discovery-picker')).toBeVisible();

    const boutons = page.locator('#discovery-picker .mode-picker-btn');
    await expect(boutons).toHaveCount(2);
    await expect(boutons.nth(0)).toContainText('Frise');
    await expect(boutons.nth(1)).toContainText('Sommaire');

    await boutons.nth(1).click();
    expect(await visibleScreen(page)).toBe('screen-mindmap');

    // Le titre de l'écran est le nom du thème, pas un libellé générique.
    const nomDuTheme = await page.evaluate(() => getCurrentTheme().nom);
    await expect(page.locator('#mindmap-title')).toHaveText(nomDuTheme);
    await expect(page.locator('.mindmap-branch')).toHaveCount(await branchesDeclarees(page));

    // Rien n'est déplié à l'arrivée : le sommaire s'annonce comme un plan,
    // et c'est au lecteur de choisir par où entrer (voir js/mindMap.js:
    // buildMindMapBranch).
    await expect(page.locator('#screen-mindmap details[open]')).toHaveCount(0);

    // Retour : le choix est replié, comme à chaque arrivée sur l'écran.
    await page.locator('#screen-mindmap .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-modes');
    await expect(page.locator('#discovery-picker')).toBeHidden();
});

test('« Tout déplier » et « Tout replier » agissent sur toutes les branches', async ({ page }) => {
    await openThemeModes(page, THEME_AVEC);
    await page.locator('#mode-card-discovery').click();
    await page.locator('#discovery-picker .mode-picker-btn').nth(1).click();

    const total = await page.locator('#screen-mindmap details').count();
    expect(total).toBeGreaterThan(await branchesDeclarees(page)); // branches + sous-branches

    await page.locator('.mindmap-toolbar-btn').first().click();
    await expect(page.locator('#screen-mindmap details[open]')).toHaveCount(total);

    await page.locator('.mindmap-toolbar-btn').nth(1).click();
    await expect(page.locator('#screen-mindmap details[open]')).toHaveCount(0);
});

test('un repère chronologique ouvre la fiche de son événement', async ({ page }) => {
    await openThemeModes(page, THEME_AVEC);
    await page.locator('#mode-card-discovery').click();
    await page.locator('#discovery-picker .mode-picker-btn').nth(1).click();
    // Les repères vivent dans une branche fermée à l'ouverture de l'écran.
    await page.locator('.mindmap-toolbar-btn').first().click();

    // Titre attendu : celui de l'événement visé par le premier repère lié.
    const titreAttendu = await page.evaluate(() => {
        const theme = getCurrentTheme();
        for (const branche of theme.carteMentale.branches) {
            for (const repere of branche.reperes || []) {
                if (repere.eventId) {
                    const evt = theme.events.find(e => e.id === repere.eventId);
                    return evt ? evt.titre : null;
                }
            }
        }
        return null;
    });
    expect(titreAttendu, 'la fiche doit déclarer au moins un repère lié à un événement').not.toBeNull();

    await page.locator('.mindmap-repere-link').first().click();
    await expect(page.locator('#modal-details')).toBeVisible();
    await expect(page.locator('#modal-titre')).toHaveText(titreAttendu);

    await page.locator('#modal-details .close-btn').click();
    await expect(page.locator('#modal-details')).toBeHidden();
    expect(await visibleScreen(page)).toBe('screen-mindmap');
});

test('une pastille « Réviser cet axe » prépare la révision de ce seul axe', async ({ page }) => {
    await openThemeModes(page, THEME_AVEC);
    await page.locator('#mode-card-discovery').click();
    await page.locator('#discovery-picker .mode-picker-btn').nth(1).click();
    // Les pastilles sont en bas des branches et sous-branches, toutes
    // repliées à l'arrivée.
    await page.locator('.mindmap-toolbar-btn').first().click();

    const pastille = page.locator('.mindmap-axis-chip').first();
    const libelle = await pastille.innerText();
    await pastille.click();

    expect(await visibleScreen(page)).toBe('screen-modes');
    const etat = await page.evaluate(() => ({
        axisFilterActive,
        essentialFilterActive,
        selection: [...selectedAxes]
    }));
    expect(etat.axisFilterActive).toBe(true);
    expect(etat.essentialFilterActive).toBe(false);
    expect(etat.selection).toHaveLength(1);
    // La pastille annonce l'axe qu'elle sélectionne.
    expect(libelle).toContain(etat.selection[0]);

    // Et le thème reste jouable sur ce seul axe : la partie ne porte que
    // les événements de cet axe, ni plus ni moins. On compare au compteur
    // de l'app (totalEvents) plutôt qu'aux tableaux — une carte est « en
    // main », donc ni dans placedEvents ni dans currentPool.
    await page.locator('#mode-card-training').click();
    await expect(page.locator('#screen-game')).toBeVisible();
    const attendus = await page.evaluate(sel => getCurrentTheme().events.filter(e => e.axe === sel).length,
        etat.selection[0]);
    expect(await page.evaluate(() => totalEvents)).toBe(attendus);
});

test('les mots-étiquettes d’une sous-branche sont rendus en pastilles', async ({ page }) => {
    await openThemeModes(page, THEME_AVEC);
    await page.locator('#mode-card-discovery').click();
    await page.locator('#discovery-picker .mode-picker-btn').nth(1).click();
    await page.locator('.mindmap-toolbar-btn').first().click(); // tout déplier

    // « Les verbes de l'existence rurale » : une liste que rien ne
    // hiérarchise, rendue en pastilles plutôt qu'en liste à puces.
    const attendus = await page.evaluate(() => {
        for (const branche of getCurrentTheme().carteMentale.branches) {
            for (const sous of branche.sousBranches || []) {
                if (sous.tags) return sous.tags.length;
            }
        }
        return 0;
    });
    expect(attendus).toBeGreaterThan(0);
    await expect(page.locator('.mindmap-tags li')).toHaveCount(attendus);
});
