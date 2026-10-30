// Profil d'accueil (js/viewProfileCore.js) : le choix dans les réglages change l'accueil, jamais les accès.
const { test, expect } = require('./fixtures');

async function choisirProfil(page, valeur) {
    await page.locator('.settings-btn').click();
    await page.locator(`#settings-view-profile button[data-value="${valeur}"]`).click();
    await page.locator('#modal-settings .close-btn, #modal-settings [aria-label="Fermer"]').first().click();
}

test('profil « Concours » : quatre boutons dans l\'ordre, les concours en tête, pas d\'éléments de jeu sur l\'accueil', async ({ page }) => {
    await expect(page.locator('#btn-daily')).toBeVisible();
    await choisirProfil(page, 'concours');

    const rangee1 = await page.locator('#quick-actions-1 > .quick-action').evaluateAll(els => els.map(e => e.id));
    expect(rangee1).toEqual(['btn-favoris', 'btn-reviser', 'btn-tools', 'btn-resume']);
    await expect(page.locator('#quick-actions-2')).toHaveCount(0);
    await expect(page.locator('#btn-daily')).toHaveCount(0);
    await expect(page.locator('#btn-discover')).toHaveCount(0);
    await expect(page.locator('#btn-path')).toHaveCount(0);
    await expect(page.locator('.league-btn')).toBeHidden();

    const premiere = await page.locator('#cat-grid h4').first().innerText();
    expect(premiere).toBe('CAPES & Agrégation');
});

test('profil « Concours » : la Salle de jeux se trouve dans l\'Atelier, et « Retour » ramène à l\'Atelier', async ({ page }) => {
    await choisirProfil(page, 'concours');
    await page.locator('#btn-tools').click();
    await expect(page.locator('#screen-tools')).toBeVisible();
    await page.locator('#screen-tools .arcade-card', { hasText: 'Salle de jeux' }).click();
    await expect(page.locator('#screen-arcade')).toBeVisible();
    await page.locator('#screen-arcade .back-btn').click();
    await expect(page.locator('#screen-tools')).toBeVisible();
});

test('profil « Concours » : le Chemin, les pièces et les amis restent accessibles depuis « Profil et Trophées »', async ({ page }) => {
    await choisirProfil(page, 'concours');
    await page.locator('.profile-btn').click();
    await expect(page.locator('#profile-shortcuts')).toBeVisible();
    await page.locator('#profile-shortcuts button', { hasText: 'Chemin du temps' }).click();
    await expect(page.locator('#screen-path')).toBeVisible();
});

test('profil « Culture générale » (par défaut) : l\'accueil complet est inchangé, et les accès rapides n\'apparaissent pas', async ({ page }) => {
    await expect(page.locator('#btn-daily')).toBeVisible();
    await expect(page.locator('#btn-arcade')).toBeVisible();
    await expect(page.locator('#btn-atlas')).toBeVisible();
    await page.locator('.profile-btn').click();
    await expect(page.locator('#profile-shortcuts')).toBeHidden();
});
