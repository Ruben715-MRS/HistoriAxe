// L'Atlas (js/atlas.js, js/atlasCore.js) : l'écran, ses commandes, la feuille du bas et le passage
// à la fiche.
//
// La carte elle-même (MapLibre, WebGL, tuiles du fond) n'est PAS exercée ici : elle exige du
// réseau pour son fond et un GPU, et ce parcours doit passer partout. On vérifie donc tout ce qui
// l'entoure — les données prêtes, les commandes, le contenu de la feuille, la fiche — en
// appelant les fonctions de l'écran sur le modèle construit.

const { test, expect, visibleScreen } = require('./fixtures');

async function ouvrirAtlas(page) {
    await page.waitForFunction(() => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === 'thm_aut')), null, { timeout: 45_000 });
    await page.evaluate(() => showScreen('screen-categories'));
    await page.locator('#btn-atlas').click();
    await page.waitForFunction(() => typeof atlasModel !== 'undefined' && atlasModel !== null, null, { timeout: 30_000 });
}

test('l\'action « Atlas » ouvre l\'écran, avec ses catégories et ses époques', async ({ page }) => {
    await page.goto('/');
    await ouvrirAtlas(page);
    expect(await visibleScreen(page)).toBe('screen-atlas');
    await expect(page.locator('#atlas-cats .atlas-chip').first()).toBeVisible();
    expect(await page.locator('#atlas-cats .atlas-chip').count()).toBeGreaterThanOrEqual(4);
    expect(await page.locator('#atlas-presets .atlas-chip').count()).toBe(5);
    // « Tout » est actif au départ.
    await expect(page.locator('#atlas-presets [data-preset="all"]')).toHaveAttribute('aria-pressed', 'true');
});

test('un préréglage d\'époque met à jour le libellé, les curseurs et le filtre ; « Tout » les remet', async ({ page }) => {
    await page.goto('/');
    await ouvrirAtlas(page);
    await page.locator('#atlas-presets [data-preset="medieval"]').click();
    await expect(page.locator('#atlas-years')).toContainText('500');
    await expect(page.locator('#atlas-years')).toContainText('1500');
    expect(await page.evaluate(() => [atlasFilter.from, atlasFilter.to])).toEqual([500, 1500]);
    // Les poignées sont à la bonne place sur l'échelle graduée, et ne se croisent pas.
    const [a, b] = await page.evaluate(() => [Number(document.getElementById('atlas-from').value), Number(document.getElementById('atlas-to').value)]);
    expect(a).toBeLessThan(b);
    await page.locator('#atlas-presets [data-preset="all"]').click();
    expect(await page.evaluate(() => [atlasFilter.from, atlasFilter.to])).toEqual([null, null]);
});

test('une puce de catégorie se bascule, et la feuille ne montre que les événements qui passent le filtre', async ({ page }) => {
    await page.goto('/');
    await ouvrirAtlas(page);
    const cible = await page.evaluate(() => {
        // La plus grosse pile de lieu précis : des centaines d'événements, plusieurs catégories.
        let best = null;
        atlasModel.index.forEach((pile, key) => { if (pile.prec !== 'z' && (!best || pile.items.length > best.pile.items.length)) best = { key, pile }; });
        return { key: best.key, n: best.pile.items.length };
    });
    expect(cible.n).toBeGreaterThan(50);

    await page.evaluate(k => atlasShowPiles([k]), cible.key);
    await expect(page.locator('#atlas-sheet')).toBeVisible();
    await expect(page.locator('.atlas-sheet-title')).toContainText(String(cible.n).slice(0, 1));
    // Plafonnée : 300 lignes au plus, et une note qui le dit.
    expect(await page.locator('.atlas-row').count()).toBeLessThanOrEqual(300);
    await expect(page.locator('.atlas-list-note')).toBeVisible();

    // Une époque étroite réduit la pile, sans plafond cette fois.
    await page.locator('#atlas-presets [data-preset="ancient"]').click();
    await page.evaluate(k => atlasShowPiles([k]), cible.key);
    const lignes = await page.locator('.atlas-row').count();
    expect(lignes).toBeLessThan(cible.n);
});

test('la feuille : un événement seul donne une carte, un clic ouvre la fiche avec « Voir sur la carte »', async ({ page }) => {
    await page.goto('/');
    await ouvrirAtlas(page);
    const cle = await page.evaluate(() => {
        let k = null;
        atlasModel.index.forEach((pile, key) => { if (!k && pile.prec === 's' && pile.items.length === 1 && !pile.items[0].flag) k = key; });
        return k;
    });
    await page.evaluate(k => atlasShowPiles([k]), cle);
    await expect(page.locator('.atlas-card-title')).toBeVisible();
    await page.locator('.atlas-card .btn').click();
    await expect(page.locator('#modal-details')).toBeVisible();
    await expect(page.locator('#modal-map-row')).toBeVisible();
    // Fermer la fiche ramène à l'Atlas, pas à l'écran d'avant.
    await page.evaluate(() => closeModal());
    expect(await visibleScreen(page)).toBe('screen-atlas');
});

test('« Voir sur la carte » depuis une fiche ouvre l\'Atlas centré sur l\'événement, sans filtre qui le cache', async ({ page }) => {
    await page.goto('/');
    await ouvrirAtlas(page);
    await page.evaluate(() => { atlasFilter = { from: 1900, to: null, cats: null }; showScreen('screen-categories'); });
    const clef = await page.evaluate(() => {
        const e = getAllEventsWithLocation().find(x => /Bataille de Verdun/.test(x.event.titre || ''));
        openModal(e.event, { theme: e.theme, categoryIndex: e.categoryIndex, subcategoryIndex: e.subcategoryIndex, themeIndex: e.themeIndex, hideRedraw: true });
        return atlasMemberPile.get(e.event);
    });
    expect(clef).toBeTruthy();
    await page.locator('#modal-map-btn').click();
    expect(await visibleScreen(page)).toBe('screen-atlas');
    // Le filtre d'époque posé avant n'a pas survécu : l'événement cherché est visible.
    expect(await page.evaluate(() => [atlasFilter.from, atlasFilter.to])).toEqual([null, null]);
});

test('retour : l\'Atlas ramène aux catégories', async ({ page }) => {
    await page.goto('/');
    await ouvrirAtlas(page);
    await page.locator('#screen-atlas .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-categories');
});

test('retour : la carte ouverte depuis une partie ramène à la partie, sans la relancer', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === 'thm_aut')), null, { timeout: 45_000 });
    await page.evaluate(() => {
        // La demande de localisation de la carte ne doit pas recouvrir le bouton « Retour » du test.
        appSettings.locationPromptShown = true;
        showScreen('screen-game');
        openAtlasAt(bdd.flatMap(c => c.themes || []).find(t => t.id === 'thm_aut').events[0]);
    });
    expect(await visibleScreen(page)).toBe('screen-atlas');
    await page.locator('#screen-atlas .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-game');
});

test('la recherche propose des lieux et des événements, et choisir un résultat ouvre la feuille', async ({ page }) => {
    await page.goto('/');
    await ouvrirAtlas(page);
    const input = page.locator('#atlas-search-input');
    await input.fill('v');
    await expect(page.locator('#atlas-search-results')).toBeHidden();
    await input.fill('verdun');
    await expect(page.locator('#atlas-search-results')).toBeVisible();
    await expect(page.locator('.atlas-search-section').first()).toBeVisible();
    expect(await page.locator('.atlas-search-item').count()).toBeGreaterThan(1);
    // Un filtre d'époque qui cacherait le résultat est levé.
    await page.locator('#atlas-presets [data-preset="ancient"]').click();
    await page.locator('.atlas-search-item').last().click();
    await expect(page.locator('#atlas-search-results')).toBeHidden();
    await expect(page.locator('#atlas-sheet')).toBeVisible();
    expect(await page.evaluate(() => [atlasFilter.from, atlasFilter.to])).toEqual([null, null]);
    // Une requête sans résultat le dit, et « × » efface.
    await input.fill('zzzzqx');
    await expect(page.locator('.atlas-search-none')).toBeVisible();
    await page.locator('#atlas-search-clear').click();
    await expect(input).toHaveValue('');
    await expect(page.locator('#atlas-search-results')).toBeHidden();
});

test('sur écran large le panneau est latéral ; le bouton le remet en bas et le choix est mémorisé', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await ouvrirAtlas(page);
    await expect(page.locator('#screen-atlas')).toHaveClass(/atlas-side/);
    const colonne = await page.locator('.atlas-bottom').boundingBox();
    expect(colonne.x).toBe(0);
    expect(colonne.width).toBeLessThan(500);
    await page.locator('#atlas-layout-btn').click();
    await expect(page.locator('#screen-atlas')).not.toHaveClass(/atlas-side/);
    await page.reload();
    await ouvrirAtlas(page);
    await expect(page.locator('#screen-atlas')).not.toHaveClass(/atlas-side/);
});

test('sur téléphone, la feuille reste en bas et le bouton de disposition est masqué', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto('/');
    await ouvrirAtlas(page);
    await expect(page.locator('#screen-atlas')).not.toHaveClass(/atlas-side/);
    await expect(page.locator('#atlas-layout-btn')).toBeHidden();
});

test('la flèche replie la colonne de gauche ; sélectionner un lieu la rouvre', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await ouvrirAtlas(page);
    const fleche = page.locator('#atlas-panel-toggle');
    await expect(fleche).toBeVisible();
    await fleche.click();
    await expect(page.locator('#screen-atlas')).toHaveClass(/atlas-collapsed/);
    await expect(page.locator('.atlas-bottom')).toBeHidden();
    expect((await page.locator('#atlas-map').boundingBox()).x).toBe(0);
    // Le choix est mémorisé.
    await page.reload();
    await ouvrirAtlas(page);
    await expect(page.locator('#screen-atlas')).toHaveClass(/atlas-collapsed/);
    // Une recherche aboutie rouvre la colonne pour y lire le résultat.
    await page.locator('#atlas-search-input').fill('verdun');
    await page.locator('.atlas-search-item').last().click();
    await expect(page.locator('#screen-atlas')).not.toHaveClass(/atlas-collapsed/);
    await expect(page.locator('#atlas-sheet')).toBeVisible();
    // Et la flèche ne se montre pas en disposition « en bas ».
    await page.locator('#atlas-layout-btn').click();
    await expect(fleche).toBeHidden();
});
