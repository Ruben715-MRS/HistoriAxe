// La boîte à outils (js/app/tools.js) : le parcours depuis l'écran des catégories et depuis le Chemin. Les calculs sont
// testés dans tests/toolsCore.test.js.

const { test, expect, visibleScreen } = require('./fixtures');

test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
        markRecapShownThisWeek();
        localStorage.setItem('historiaxe_path_v1', JSON.stringify({ levels: {}, skipped: [] }));
        showScreen('screen-categories');
        initCategories();
    });
});

async function ouvrir(page, texte) {
    await page.locator('#btn-tools').click();
    expect(await visibleScreen(page)).toBe('screen-tools');
    await page.locator('#screen-tools .arcade-card', { hasText: texte }).click();
}

test('la boîte à outils s\'ouvre depuis les catégories, propose six outils et revient', async ({ page }) => {
    await page.locator('#btn-tools').click();
    expect(await visibleScreen(page)).toBe('screen-tools');
    await expect(page.locator('#screen-tools .arcade-card')).toHaveCount(6);
    await page.locator('#screen-tools .arcade-card', { hasText: 'Chiffres romains' }).click();
    expect(await visibleScreen(page)).toBe('screen-tool-roman');
    await page.locator('#screen-tool-roman .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-tools');
    await page.locator('#screen-tools .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-categories');
});

test('chiffres romains : dans les deux sens, forme refusée, leçon', async ({ page }) => {
    await ouvrir(page, 'Chiffres romains');
    const input = page.locator('#tool-roman-input');
    await input.fill('1994');
    await expect(page.locator('#tool-roman-big')).toHaveText('MCMXCIV');
    await expect(page.locator('#tool-roman-parts .tool-chip')).toHaveCount(4);
    await expect(page.locator('#tool-roman-sum')).toHaveText('1000 + 900 + 90 + 4 = 1994');
    await input.fill('xiv');
    await expect(page.locator('#tool-roman-big')).toHaveText('14');
    await input.fill('IIII');
    await expect(page.locator('#tool-roman-msg')).toContainText('IV');
    await expect(page.locator('#tool-roman-result')).toBeHidden();
    await input.fill('0');
    await expect(page.locator('#tool-roman-msg')).toContainText('zéro');
    await input.fill('4000');
    await expect(page.locator('#tool-roman-msg')).toContainText('3999');
    await input.fill('abc');
    await expect(page.locator('#tool-roman-msg')).toContainText('I, V, X');
    await page.getByRole('button', { name: /La leçon/ }).click();
    expect(await visibleScreen(page)).toBe('screen-tool-roman-lesson');
    await expect(page.locator('#tool-lesson-body .tool-table tr')).toHaveCount(8);
    await page.getByRole('button', { name: 'Essayer avec 1994' }).click();
    expect(await visibleScreen(page)).toBe('screen-tool-roman');
    await expect(page.locator('#tool-roman-big')).toHaveText('MCMXCIV');
});

test('convertisseur d\'années : toutes les ères, les années hors ère sont dites', async ({ page }) => {
    await ouvrir(page, 'Convertisseur d\'années');
    await page.locator('#tool-eras-year').fill('1789');
    const rows = page.locator('#tool-eras-rows .tool-row');
    await expect(rows).toHaveCount(11);
    await expect(rows.filter({ hasText: 'Calendrier juif' })).toContainText('5549 ou 5550');
    await expect(rows.filter({ hasText: 'Hégire (calendrier musulman)' })).toContainText('1203');
    await expect(rows.filter({ hasText: 'Ère Reiwa' })).toContainText('pas d\'année correspondante');
    await page.locator('#tool-eras-bc').selectOption('bc');
    await page.locator('#tool-eras-year').fill('44');
    await expect(rows.filter({ hasText: 'Ère romaine' })).toContainText('710');
    await page.locator('#tool-eras-year').fill('0');
    await expect(page.locator('#tool-eras-msg')).toContainText('année entière');
    // la règle de conversion est repliée, et s'ouvre
    await page.locator('#tool-eras-year').fill('1904');
    await page.locator('#tool-eras-bc').selectOption('ad');
    await rows.filter({ hasText: 'Meiji' }).locator('summary').click();
    await expect(rows.filter({ hasText: 'Meiji' }).locator('details p')).toContainText('1867');
});

test('siècles : le piège des années rondes, dans les deux sens', async ({ page }) => {
    await ouvrir(page, 'Siècles et années');
    await page.locator('#tool-cent-year').fill('1700');
    await expect(page.locator('#tool-cent-year-result')).toContainText('XVIIe siècle');
    await expect(page.locator('#tool-cent-year-result')).toContainText('DERNIÈRE');
    await page.locator('#tool-cent-year').fill('1701');
    await expect(page.locator('#tool-cent-year-result')).toContainText('XVIIIe siècle');
    await page.locator('#tool-cent-n').fill('xx');
    await expect(page.locator('#tool-cent-n-result')).toContainText('1901 à 2000');
    await page.locator('#tool-cent-n').fill('5');
    await page.locator('#tool-cent-n-bc').selectOption('bc');
    await expect(page.locator('#tool-cent-n-result')).toContainText('500 à 401 av. J.-C.');
    await page.locator('#tool-cent-n').fill('hello');
    await expect(page.locator('#tool-cent-n-result')).toContainText('de 1 à 99');
});

test('durées : pas d\'an 0, dans les deux calculs', async ({ page }) => {
    await ouvrir(page, 'Calculateur de durées');
    // les valeurs d'exemple : de 44 av. J.-C. à 14, et 57 ans après 44 av. J.-C.
    await expect(page.locator('#tool-dur-between')).toContainText('57 ans');
    await expect(page.locator('#tool-dur-between')).toContainText('pas d\'an 0');
    await expect(page.locator('#tool-dur-add')).toContainText('14');
    await page.locator('#tool-dur-a-bc').selectOption('ad');
    await page.locator('#tool-dur-a').fill('1789');
    await page.locator('#tool-dur-b').fill('1799');
    await page.locator('#tool-dur-b-bc').selectOption('ad');
    await expect(page.locator('#tool-dur-between')).toContainText('10 ans');
    await page.locator('#tool-add-dir').selectOption('earlier');
    await page.locator('#tool-add-bc').selectOption('ad');
    await page.locator('#tool-add-year').fill('14');
    await page.locator('#tool-add-n').fill('57');
    await expect(page.locator('#tool-dur-add')).toContainText('44 av. J.-C.');
});

test('dates : le même jour dans les autres calendriers', async ({ page }) => {
    await ouvrir(page, 'autres calendriers');
    await expect(page.locator('#tool-dates-rows .tool-row')).toHaveCount(9);
    await page.locator('#tool-dates-input').fill('1794-07-27');
    const rows = page.locator('#tool-dates-rows .tool-row');
    await expect(rows.filter({ hasText: 'républicain' })).toContainText('9 thermidor an II');
    await expect(rows.filter({ hasText: 'julien' })).toContainText('16 juillet 1794');
    await page.locator('#tool-dates-input').fill('1917-11-07');
    await expect(rows.filter({ hasText: 'julien' })).toContainText('25 octobre 1917');
    await expect(rows.filter({ hasText: 'républicain' })).toContainText('hors de la période d\'usage');
    await page.getByRole('button', { name: 'Aujourd\'hui' }).click();
    await expect(rows.filter({ hasText: 'Calendrier grégorien' })).toContainText(String(new Date().getFullYear()));
});

test('périodes : la période d\'une année, et les bornes discutées', async ({ page }) => {
    await ouvrir(page, 'Repères de périodes');
    await expect(page.locator('#tool-per-list .tool-row')).toHaveCount(6);
    await page.locator('#tool-per-year').fill('1000');
    await expect(page.locator('#tool-per-result')).toContainText('Moyen Âge');
    await expect(page.locator('#tool-per-list .tool-row.is-current')).toContainText('Moyen Âge');
    await page.locator('#tool-per-year').fill('476');
    await expect(page.locator('#tool-per-result')).toContainText('borne discutée');
    await page.locator('#tool-per-bc').selectOption('bc');
    await page.locator('#tool-per-year').fill('44');
    await expect(page.locator('#tool-per-result')).toContainText('Antiquité');
});

test('depuis le Chemin : le niveau 3 propose l\'outil des ères, le niveau 5 celui des chiffres romains, et rendent la main', async ({ page }) => {
    await page.locator('#btn-path').click();
    await page.evaluate(() => pathOpenSheet('monde0-3'));
    await expect(page.locator('#path-sheet-game-2')).toContainText('convertir une année');
    await page.locator('#path-sheet-game-2').click();
    expect(await visibleScreen(page)).toBe('screen-tool-eras');
    await page.locator('#screen-tool-eras .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-path');
    await page.evaluate(() => pathOpenSheet('monde0-5'));
    await expect(page.locator('#path-sheet-game-3')).toContainText('chiffres romains');
    await page.locator('#path-sheet-game-3').click();
    expect(await visibleScreen(page)).toBe('screen-tool-roman');
    await page.locator('#screen-tool-roman .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-path');
});
