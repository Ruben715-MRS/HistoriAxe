// Portraits hors ligne (réglages) : l'état du téléchargement, et la demande de confirmation avant de
// télécharger les ~113 Mo. Le téléchargement lui-même n'est pas lancé ici : la logique de reprise et
// de cache est couverte par le service worker et le navigateur, et le poids ferait un test lent.

const { test, expect } = require('./fixtures');

test('les réglages montrent combien de portraits sont téléchargés, et demandent confirmation avant', async ({ page }) => {
    await page.evaluate(() => openSettings());
    const status = page.locator('#settings-portraits-status');
    await expect(status).toHaveText('0 portraits sur 4248 téléchargés');
    await expect(page.locator('#settings-portraits-download')).toBeVisible();
    await expect(page.locator('#settings-portraits-delete')).toBeHidden();

    await page.locator('#settings-portraits-download').click();
    await expect(page.locator('#confirm-message')).toContainText('113 Mo');
    await page.locator('#confirm-cancel-btn').click();
    await expect(page.locator('#modal-confirm')).toBeHidden();
    await expect(status).toHaveText('0 portraits sur 4248 téléchargés');
});
