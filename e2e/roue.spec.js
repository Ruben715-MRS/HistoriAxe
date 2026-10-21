// La roue des fêtes (js/app/wheel.js, js/calendarWheel.js) : le mini-jeu du niveau 4 du Monde 0.
// On vérifie le parcours (ouverture depuis la fiche du niveau, pose juste et fausse, rotation, fin) ;
// les règles de contenu sont dans tests/calendarWheel.test.js.

const { test, expect, visibleScreen } = require('./fixtures');

test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
        markRecapShownThisWeek();
        localStorage.removeItem('historiaxe_wheel_v1');
        localStorage.setItem('historiaxe_path_v1', JSON.stringify({ levels: {}, skipped: [] }));
        showScreen('screen-categories');
        initCategories();
    });
});

// Ouvre la liste d'une famille et y choisit un calendrier par son nom.
async function choisir(page, famille, nom) {
    await page.locator('#wheel-kind-' + famille).click();
    await page.locator('#wheel-choices .wheel-choice', { hasText: nom }).click();
}

async function ouvrirRoue(page) {
    await page.locator('#btn-path').click();
    await expect(page.locator('#screen-path')).toBeVisible();
    // Niveau 4 du Monde 0, verrouillé pour un joueur tout neuf : le mini-jeu s'ouvre quand même.
    await page.evaluate(() => pathOpenSheet('monde0-4'));
    await expect(page.locator('#path-sheet-wheel')).toBeVisible();
    await page.locator('#path-sheet-wheel').click();
    await expect(page.locator('#screen-wheel')).toBeVisible();
}

test('le bouton du mini-jeu n\'apparaît que sur le niveau 4 du Monde 0', async ({ page }) => {
    await page.locator('#btn-path').click();
    await page.evaluate(() => pathOpenSheet('monde0-3'));
    await expect(page.locator('#path-sheet-wheel')).toBeHidden();
    await page.evaluate(() => pathOpenSheet('monde0-4'));
    await expect(page.locator('#path-sheet-wheel')).toBeVisible();
});

test('la roue : douze mois sur la jante, deux familles, fêtes dans le désordre', async ({ page }) => {
    await ouvrirRoue(page);
    expect(await visibleScreen(page)).toBe('screen-wheel');
    await expect(page.locator('#wheel-svg .wheel-month')).toHaveCount(12);
    // Deux boutons ; la liste est fermée tant qu'on n'en touche aucun.
    await expect(page.locator('#wheel-kinds .wheel-kind')).toHaveText(['Religieux', 'Civil']);
    await expect(page.locator('#wheel-choices')).toBeHidden();
    await page.locator('#wheel-kind-religieux').click();
    await expect(page.locator('#wheel-choices .wheel-choice')).toHaveCount(8);
    const religieux = await page.locator('#wheel-choices .wheel-choice').allTextContents();
    expect(religieux.map(t => t.trim().replace(/^\S+\s/, ''))).toEqual(['Bahaïsme', 'Bouddhisme', 'Christianisme', 'Hindouisme', 'Islam', 'Judaïsme', 'Sikhisme', 'Zoroastrisme']);
    await page.locator('#wheel-kind-civil').click();
    await expect(page.locator('#wheel-choices .wheel-choice')).toHaveCount(30);
    const civils = (await page.locator('#wheel-choices .wheel-choice').allTextContents()).map(t => t.trim().replace(/^\S+\s/, ''));
    expect(civils).toEqual([...civils].sort((a, b) => a.localeCompare(b, 'fr')));
    // Toucher de nouveau le bouton referme la liste.
    await page.locator('#wheel-kind-civil').click();
    await expect(page.locator('#wheel-choices')).toBeHidden();
    const total = await page.evaluate(() => CalendarWheel.find('chretien').events.length);
    await expect(page.locator('#wheel-tray .wheel-chip')).toHaveCount(total);
    const mois = await page.locator('#wheel-svg .wheel-month').allTextContents();
    expect(mois[0]).toBe('Janvier');
    expect(mois[11]).toBe('Décembre');
    await choisir(page, 'religieux', 'Judaïsme');
    await expect(page.locator('#wheel-choices')).toBeHidden();
    await expect(page.locator('#wheel-cal')).toContainText('Calendrier juif');
    const juifs = await page.locator('#wheel-svg .wheel-month').allTextContents();
    expect(juifs).toEqual(['Tichri', 'Hechvan', 'Kislev', 'Tevet', 'Chevat', 'Adar', 'Nissan', 'Iyar', 'Sivan', 'Tamouz', 'Av', 'Elloul']);
});

test('poser une fête : un mauvais mois compte une erreur, le bon la fixe dans sa part', async ({ page }) => {
    await ouvrirRoue(page);
    // Toucher une part sans fête choisie n'est pas une erreur.
    await page.locator('.wheel-part[data-month="1"] .wheel-slice').click();
    await expect(page.locator('#wheel-subtitle')).toContainText('0 erreurs');
    await page.locator('#wheel-tray .wheel-chip', { hasText: 'Noël' }).click();
    await expect(page.locator('#wheel-current')).toContainText('Noël');
    await page.locator('.wheel-part[data-month="6"] .wheel-slice').click();
    await expect(page.locator('#wheel-subtitle')).toContainText('1 erreurs');
    await expect(page.locator('#wheel-feedback')).toContainText('ne tombe pas en Juin');
    await page.locator('.wheel-part[data-month="12"] .wheel-slice').click();
    await expect(page.locator('.wheel-part[data-month="12"] .wheel-token')).toHaveCount(1);
    await expect(page.locator('#wheel-tray .wheel-chip', { hasText: 'Noël' })).toHaveCount(0);
    await expect(page.locator('#wheel-feedback')).toContainText('naissance de Jésus');
});

test('une fête mobile se pose dans l\'un ou l\'autre des deux mois', async ({ page }) => {
    await ouvrirRoue(page);
    await page.locator('#wheel-tray .wheel-chip', { hasText: /^.{0,3}\s*Pâques$/ }).click();
    await page.locator('.wheel-part[data-month="4"] .wheel-slice').click();
    await expect(page.locator('#wheel-subtitle')).toContainText('0 erreurs');
    await expect(page.locator('.wheel-part[data-month="4"] .wheel-token')).toHaveCount(1);
});

test('tourner la roue : les boutons, le glissement, et les pastilles restent droites', async ({ page }) => {
    await ouvrirRoue(page);
    const angle = () => page.evaluate(() => wheelGame().rot);
    expect(await angle()).toBe(-15);
    await page.locator('.wheel-controls .wheel-spin').nth(2).click();
    await expect.poll(angle).toBe(15);
    await page.locator('.wheel-spin-reset').click();
    await expect.poll(angle).toBe(-15);
    await page.locator('#wheel-svg').scrollIntoViewIfNeeded();
    const box = await page.locator('#wheel-svg').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    expect(await angle()).toBeGreaterThan(30);
    // Un glissement n'est pas un tap sur la part qu'il survole.
    await expect(page.locator('#wheel-feedback')).toBeHidden();
    // Une pastille posée reste à l'endroit, quel que soit l'angle de la roue.
    await page.locator('#wheel-tray .wheel-chip', { hasText: 'Noël' }).click();
    await page.locator('.wheel-part[data-month="12"] .wheel-slice').click();
    const droit = await page.evaluate(() => {
        const g = document.querySelector('.wheel-token .wheel-upright');
        const m = g.getScreenCTM();
        return Math.abs(Math.atan2(m.b, m.a) * 180 / Math.PI);
    });
    expect(droit).toBeLessThan(1);
});

test('terminer une roue : étoiles enregistrées, écran de fin, calendrier suivant', async ({ page }) => {
    await ouvrirRoue(page);
    await choisir(page, 'religieux', 'Islam');
    // Toutes les fêtes dans le bon mois, par le vrai chemin du clic.
    const plan = await page.evaluate(() => CalendarWheel.find('musulman').events.map(e => [e.id, e.months[0]]));
    for (const [id, mois] of plan) {
        // Après chaque pose, la fête suivante est déjà choisie : ne pas la désélectionner.
        await page.evaluate((id) => { if (wheelSelectedId !== id) wheelSelect(id); }, id);
        await page.locator(`.wheel-part[data-month="${mois}"] .wheel-slice`).click();
    }
    await expect(page.locator('#wheel-done')).toBeVisible();
    await expect(page.locator('#wheel-done-stars')).toHaveText('★★★');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_wheel_v1')).musulman)).toEqual({ stars: 3, errors: 0 });
    await expect(page.locator('#wheel-cal')).toContainText('★★★');
    await page.locator('#wheel-done .btn').click();
    // Le calendrier suivant de la même famille (alphabétique) : après l'Islam, le Judaïsme.
    await expect(page.locator('#wheel-cal')).toContainText('Calendrier juif');
    await page.locator('#screen-wheel .back-btn').click();
    await expect(page.locator('#screen-path')).toBeVisible();
});

test('un calendrier civil récent : Égypte, avec ses douze mois et ses fêtes', async ({ page }) => {
    await ouvrirRoue(page);
    await choisir(page, 'civil', 'Égypte');
    await expect(page.locator('#wheel-cal')).toContainText('Égypte');
    await expect(page.locator('#wheel-svg .wheel-month')).toHaveCount(12);
    const total = await page.evaluate(() => CalendarWheel.find('egypte').events.length);
    await expect(page.locator('#wheel-tray .wheel-chip')).toHaveCount(total);
    await choisir(page, 'religieux', 'Hindouisme');
    expect(await page.locator('#wheel-svg .wheel-month').allTextContents()).toContain('Phalguna');
});
