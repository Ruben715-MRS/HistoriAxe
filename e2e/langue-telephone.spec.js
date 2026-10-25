// La langue du téléphone : au premier lancement, l'app propose le pack de cette langue, et le
// télécharge si le joueur accepte. La règle de choix (langue présente, anglais sinon, une seule fois)
// est testée sans navigateur dans tests/portraits.test.js.
//
// Le marqueur « proposition déjà faite » vaut `en` dans les fixtures : un téléphone en allemand reçoit
// donc bien la proposition, alors qu'un téléphone en anglais, lui, n'en reçoit pas.

const { test, expect } = require('./fixtures');

test.describe('langue du téléphone en allemand', () => {
    test.use({ locale: 'de-DE' });

    test('la proposition apparaît dans la langue proposée, et accepter télécharge et active le pack', async ({ page }) => {
        const modal = page.locator('#modal-confirm');
        await expect(modal).toBeVisible({ timeout: 8000 });
        await expect(page.locator('#confirm-message')).toHaveText('Sprachpaket Deutsch herunterladen?');
        await expect(page.locator('#confirm-ok-btn')).toHaveText('Herunterladen');
        await expect(page.locator('#confirm-cancel-btn')).toHaveText('Später');

        await page.locator('#confirm-ok-btn').click();

        await expect.poll(() => page.evaluate(() => document.documentElement.lang), { timeout: 20000 }).toBe('de');
        const installed = await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_installed_languages_v1')));
        expect(installed).toContain('de');
    });
});
