// « Vu aussi dans… » — la fiche d'un événement présent dans plusieurs thèmes
// renvoie vers les autres (js/linkedEvents.js). La règle est vérifiée en
// unitaire ; ici, le rendu et le parcours réels : le bloc apparaît, un clic
// ouvre la fiche de l'événement dans l'autre thème, et une fiche sans
// jumeau n'affiche rien.

const { test, expect } = require('./fixtures');

// Ouvre la fiche d'un événement de la base, choisi par une condition sur son
// thème (les identifiants d'événements ne sont pas uniques d'un thème à l'autre).
async function ouvrirFiche(page, themeId, titre) {
    const ok = await page.evaluate(({ themeId, titre }) => {
        const entry = getAllEventsWithLocation().find(e => e.theme.id === themeId && e.event.titre === titre);
        if (!entry) return false;
        openModal(entry.event, entry);
        return true;
    }, { themeId, titre });
    expect(ok, `événement introuvable : ${themeId} / ${titre}`).toBe(true);
}

test('la fiche d\'un événement carrefour propose les autres thèmes, et le clic y mène', async ({ page }) => {
    await ouvrirFiche(page, 'psn_ar_t5', 'Invasion argentine des îles Malouines');
    const themeOrigine = await page.evaluate(() => getAllThemesWithPath().find(i => i.theme.id === 'psn_ar_t5').theme.nom);

    const bloc = page.locator('#modal-linked-row');
    await expect(bloc).toBeVisible();
    const boutons = page.locator('#modal-linked-list .modal-linked-btn');
    await expect(boutons.first()).toBeVisible();
    // Le thème d'origine n'est jamais proposé comme « autre thème ».
    await expect(page.locator('#modal-linked-list .modal-linked-theme').filter({ hasText: new RegExp('^' + themeOrigine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') })).toHaveCount(0);

    const titreAvant = await page.locator('#modal-titre').innerText();
    const themeLie = await boutons.first().locator('.modal-linked-theme').innerText();
    await boutons.first().click();

    // La fiche reste ouverte, change d'événement, et offre de jouer sur le thème lié.
    await expect(page.locator('#modal-details')).toBeVisible();
    await expect(page.locator('#modal-titre')).not.toHaveText(titreAvant);
    await expect(page.locator('#modal-theme-btn')).toContainText(themeLie);
    // De là, le lien repart vers le thème de départ.
    await expect(page.locator('#modal-linked-row')).toBeVisible();
});

test('une fiche sans jumeau dans un autre thème n\'affiche pas « Vu aussi dans… »', async ({ page }) => {
    const titre = await page.evaluate(() => {
        const idx = getLinkIndex();
        const entry = getAllEventsWithLocation().find(e => !e.category.isCustomCategory && idx.linksFor(e.event).length === 0);
        openModal(entry.event, entry);
        return entry.event.titre;
    });
    await expect(page.locator('#modal-titre')).toHaveText(titre);
    await expect(page.locator('#modal-linked-row')).toBeHidden();
});
