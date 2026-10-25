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

test('la boîte à outils s\'ouvre depuis les catégories, propose onze outils et revient', async ({ page }) => {
    await page.locator('#btn-tools').click();
    expect(await visibleScreen(page)).toBe('screen-tools');
    await expect(page.locator('#screen-tools .arcade-card')).toHaveCount(11);
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
    // pas de mention « à relire » dans la boîte à outils
    await expect(page.locator('#screen-tools')).not.toContainText('relire');
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

test('périodes : onze découpages au choix, et la même année vue dans chacun', async ({ page }) => {
    await ouvrir(page, 'Repères de périodes');
    await expect(page.locator('#tool-per-system option')).toHaveCount(11);
    await page.locator('#tool-per-year').fill('1500');
    // la comparaison montre l'année dans les onze découpages
    await expect(page.locator('#tool-per-compare .tool-compare-row')).toHaveCount(11);
    await expect(page.locator('#tool-per-compare')).toContainText('Ming');
    await expect(page.locator('#tool-per-compare')).toContainText('Muromachi');
    await expect(page.locator('#tool-per-compare')).toContainText('Sultanat de Delhi');
    await expect(page.locator('#tool-per-compare')).toContainText('Moscovie');
    await expect(page.locator('#tool-per-compare')).toContainText('Rois catholiques');
    await expect(page.locator('#tool-per-compare')).toContainText('Guerres d\'Italie');
    await page.locator('#tool-per-system').selectOption('chine');
    await expect(page.locator('#tool-per-list .tool-row')).toHaveCount(16);
    await expect(page.locator('#tool-per-intro')).toContainText('dynastique');
    await expect(page.locator('#tool-per-result')).toContainText('Ming');
    await expect(page.locator('#tool-per-result')).toContainText('(Chine)');
    await expect(page.locator('#tool-per-list .tool-row.is-current')).toContainText('de 1368 à 1644');
    await page.locator('#tool-per-system').selectOption('japon');
    await expect(page.locator('#tool-per-list .tool-row')).toHaveCount(15);
    await expect(page.locator('#tool-per-result')).toContainText('Muromachi');
    await page.locator('#tool-per-system').selectOption('coree');
    await expect(page.locator('#tool-per-list .tool-row')).toHaveCount(10);
    await expect(page.locator('#tool-per-result')).toContainText('Joseon');
    // avant J.-C. : les Qin en Chine
    await page.locator('#tool-per-system').selectOption('chine');
    await page.locator('#tool-per-bc').selectOption('bc');
    await page.locator('#tool-per-year').fill('215');
    await expect(page.locator('#tool-per-result')).toContainText('Qin');
    // le choix est gardé quand on revient
    await page.locator('#screen-tool-periods .back-btn').click();
    await page.locator('#screen-tools .arcade-card', { hasText: 'Repères de périodes' }).click();
    await expect(page.locator('#tool-per-system')).toHaveValue('chine');
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

test('atlas des pays : la recherche donne la fiche, avec drapeau, capitale, population et année ; les événements de l\'app s\'ouvrent', async ({ page }) => {
    await page.waitForFunction(() => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === 'thm_aut')), null, { timeout: 45_000 });
    await ouvrir(page, 'Atlas des pays');
    expect(await visibleScreen(page)).toBe('screen-tool-countries');
    await page.waitForFunction(() => typeof countriesData !== 'undefined' && countriesData !== null);
    await expect(page.locator('#tool-countries-fiche')).toContainText('Touchez un pays');
    await page.locator('#tool-countries-input').fill('japon');
    await page.locator('.tool-countries-hit', { hasText: 'Japon' }).click();
    const fiche = page.locator('#tool-countries-fiche');
    await expect(fiche.locator('.tool-countries-name')).toContainText('🇯🇵');
    await expect(fiche).toContainText('Tokyo');
    await expect(fiche).toContainText('japonais');
    await expect(fiche).toContainText('yen (JPY)');
    await expect(fiche).toContainText('estimation 2024');
    // les événements de l'app situés au Japon, repérés par leur position
    await expect(fiche.locator('.tool-countries-event').first()).toBeVisible({ timeout: 30_000 });
    expect(await fiche.locator('.tool-countries-event').count()).toBeLessThanOrEqual(10);
    await fiche.locator('.tool-countries-event').first().click();
    await expect(page.locator('#modal-details')).toBeVisible();
});

test('atlas des pays : un bouton « Jouer sur Histoire de … » entre la fiche et les événements ouvre le thème du pays', async ({ page }) => {
    await page.waitForFunction(() => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === 'thm_aut')), null, { timeout: 45_000 });
    await ouvrir(page, 'Atlas des pays');
    await page.waitForFunction(() => typeof countriesData !== 'undefined' && countriesData !== null);
    await page.locator('#tool-countries-input').fill('france');
    await page.locator('.tool-countries-hit', { hasText: 'France' }).first().click();
    const fiche = page.locator('#tool-countries-fiche');
    const play = fiche.locator('.tool-countries-play');
    await expect(play).toHaveText('Jouer sur Histoire de France');
    // la sixième ligne de la fiche : la fête nationale, après la région
    await expect(fiche.locator('.tool-countries-facts dt').last()).toHaveText('Fête nationale');
    await expect(fiche.locator('.tool-countries-facts dd').last()).toContainText('14 juillet');
    // le bouton vient après les faits et avant les événements extraits
    const order = await fiche.evaluate(el => [...el.children].map(c => c.className || c.tagName));
    expect(order.indexOf('btn tool-countries-play')).toBeGreaterThan(order.indexOf('tool-countries-facts'));
    expect(order.indexOf('btn tool-countries-play')).toBeLessThan(order.indexOf('tool-countries-events'));
    await play.click();
    expect(['screen-modes', 'screen-axes']).toContain(await visibleScreen(page));
    expect(await page.evaluate(() => getCurrentThemeList()[selectedThemeIndex].id)).toBe('thm_fr');
});

test('Découvrir › Pays : un pays au hasard dans l\'Atlas, « Un autre pays » en bas, et le retour aux catégories', async ({ page }) => {
    await page.waitForFunction(() => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === 'thm_aut')), null, { timeout: 45_000 });
    await page.evaluate(() => { markRecapShownThisWeek(); showScreen('screen-categories'); initCategories(); });
    await page.locator('#btn-discover').click();
    await page.locator('#btn-discover-country').click();
    await expect(page.locator('#screen-tool-countries')).toBeVisible();
    const fiche = page.locator('#tool-countries-fiche');
    await expect(fiche.locator('.tool-countries-name')).toBeVisible({ timeout: 30_000 });
    // la sixième ligne et la carte : la fiche de l'Atlas
    await expect(fiche.locator('.tool-countries-facts dt').last()).toHaveText('Fête nationale');
    const premier = await fiche.locator('.tool-countries-name').innerText();
    const another = page.locator('#tool-countries-another');
    await expect(another).toBeVisible();
    await expect(another).toHaveText('Un autre pays');
    // pas de bannière aujourd'hui, sauf si c'est une fête : on ne l'exige pas ici
    let differ = false;
    for (let k = 0; k < 4 && !differ; k++) {
        await another.click();
        await page.waitForTimeout(150);
        differ = (await fiche.locator('.tool-countries-name').innerText()) !== premier;
    }
    expect(differ).toBe(true);
    // retour : la boîte à outils n'est pas concernée, on revient aux catégories
    await page.locator('#screen-tool-countries .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-categories');
    // l'Atlas normal, lui, n'a pas le bouton « Un autre pays »
    await ouvrir(page, 'Atlas des pays');
    await expect(page.locator('#tool-countries-another')).toBeHidden();
});

test('Découvrir › Pays : le 14 juillet, la France d\'abord, avec la bannière « Fête nationale aujourd\'hui »', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-07-14T10:00:00'));
    await page.waitForFunction(() => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === 'thm_aut')), null, { timeout: 45_000 });
    await page.evaluate(() => { markRecapShownThisWeek(); showScreen('screen-categories'); initCategories(); });
    await page.locator('#btn-discover').click();
    await page.locator('#btn-discover-country').click();
    await expect(page.locator('#tool-countries-fiche .tool-countries-name')).toContainText('France', { timeout: 30_000 });
    await expect(page.locator('.tool-countries-festive')).toContainText("Fête nationale aujourd'hui");
    await page.locator('#tool-countries-another').click();
    await expect(page.locator('.tool-countries-festive')).toHaveCount(0);
});

test('calendrier annuel : la liste part du 1er janvier, une fête nationale et une fête chrétienne à leur date, la barre de mois y mène', async ({ page }) => {
    await page.waitForFunction(() => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === 'thm_aut')), null, { timeout: 45_000 });
    await ouvrir(page, 'Calendrier annuel');
    expect(await visibleScreen(page)).toBe('screen-tool-calendar');
    const annee = page.locator('#cal-year');
    await expect(annee.locator('.cal-month')).toHaveCount(12);
    await expect(annee.locator('.cal-row')).toHaveCount(366);
    // sur téléphone : pas de défilement horizontal de la page, la barre des mois tient dans l'écran
    const largeur = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, vw: window.innerWidth, barre: document.getElementById('cal-months').getBoundingClientRect().right }));
    expect(largeur.page).toBeLessThanOrEqual(largeur.vw);
    expect(largeur.barre).toBeLessThanOrEqual(largeur.vw);
    await expect(annee.locator('.cal-row').first().locator('.cal-date')).toHaveText('1er janvier');
    // le 14 juillet : la France, avec son drapeau
    const quatorze = annee.locator('.cal-row', { has: page.locator('.cal-date', { hasText: /^14 juillet$/ }) });
    await expect(quatorze.locator('.cal-country')).toHaveText('🇫🇷 France');
    // le 25 décembre : Noël, sans pays
    const noel = annee.locator('.cal-row', { has: page.locator('.cal-date', { hasText: /^25 décembre$/ }) });
    await expect(noel.locator('.cal-religious')).toHaveText('\u271D\uFE0F Noël');
    // le 29 février existe
    await expect(annee.locator('.cal-date', { hasText: /^29 février$/ })).toHaveCount(1);
    // la barre de mois : Octobre mène au titre d'Octobre, en haut de l'écran
    await page.locator('#cal-months .cal-month-btn', { hasText: 'Octobre' }).click();
    await expect.poll(async () => page.evaluate(() => Math.round(document.getElementById('cal-month-10').getBoundingClientRect().top))).toBeLessThan(200);
});

test('calendrier annuel : l\'année choisie date les fêtes mobiles, « 5 avril : Pâques (2026) »', async ({ page }) => {
    await page.waitForFunction(() => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === 'thm_aut')), null, { timeout: 45_000 });
    await ouvrir(page, 'Calendrier annuel');
    const champ = page.locator('#cal-year-input');
    await expect(champ).toHaveValue(String(new Date().getFullYear()));
    await champ.fill('2026');
    // Israël : le 5 iyar 2026, le 22 avril, avec son drapeau et l'année
    await expect(page.locator('#cal-year .cal-row', { has: page.locator('.cal-date', { hasText: /^22 avril$/ }) }).locator('.cal-country')).toHaveText('\u{1F1EE}\u{1F1F1} Israël (2026)');
    const paques = page.locator('#cal-year .cal-row', { has: page.locator('.cal-date', { hasText: /^5 avril$/ }) });
    await expect(paques.locator('.cal-religious')).toHaveText('\u271D\uFE0F Pâques (2026)');
    await expect(page.locator('#cal-year .cal-row', { has: page.locator('.cal-date', { hasText: /^14 mai$/ }) }).locator('.cal-religious')).toHaveText('\u271D\uFE0F Ascension (2026)');
    // une saisie hors bornes ne touche pas au calendrier
    await champ.fill('12');
    await expect(paques.locator('.cal-religious')).toHaveText('\u271D\uFE0F Pâques (2026)');
    // une autre année : Pâques bouge
    await champ.fill('2025');
    await expect(page.locator('#cal-year .cal-row', { has: page.locator('.cal-date', { hasText: /^20 avril$/ }) }).locator('.cal-religious')).toHaveText('\u271D\uFE0F Pâques (2025)');
    // les fêtes juives de la même année : l'étoile de David, et la ménorah pour Hanouka
    await expect(page.locator('#cal-year .cal-row', { has: page.locator('.cal-date', { hasText: /^13 avril$/ }) }).locator('.cal-religious')).toHaveText('\u2721\uFE0F Pessa\u2019h (2025)');
    await expect(page.locator('#cal-year .cal-row', { has: page.locator('.cal-date', { hasText: /^15 décembre$/ }) }).locator('.cal-religious')).toHaveText('\u{1F54E} Hanouka (2025)');
    // les fêtes musulmanes : le croissant islamique
    await expect(page.locator('#cal-year .cal-row', { has: page.locator('.cal-date', { hasText: /^1er mars$/ }) }).locator('.cal-religious')).toHaveText('\u262A\uFE0F Début du ramadan (2025)');
});

test('atlas des pays : une capitale se cherche aussi, et un statut contesté est dit', async ({ page }) => {
    await ouvrir(page, 'Atlas des pays');
    await page.waitForFunction(() => typeof countriesData !== 'undefined' && countriesData !== null);
    await page.locator('#tool-countries-input').fill('Brasilia');
    await page.locator('.tool-countries-hit', { hasText: 'Brésil' }).click();
    await expect(page.locator('#tool-countries-fiche')).toContainText('portugais');
    await page.locator('#tool-countries-input').fill('taiwan');
    await page.locator('.tool-countries-hit', { hasText: 'Taïwan' }).click();
    await expect(page.locator('.tool-countries-badge')).toContainText('Statut contesté');
    await page.locator('#tool-countries-input').fill('zzzzz');
    await expect(page.locator('.tool-countries-none')).toBeVisible();
});

test('cartes historiques : un menu groupé par époque, des dates, une fiche, et les événements de l\'app situés dans la zone', async ({ page }) => {
    await page.waitForFunction(() => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === 'thm_aut')), null, { timeout: 45_000 });
    await ouvrir(page, 'Cartes historiques');
    expect(await visibleScreen(page)).toBe('screen-tool-history');
    // trente-six entités, rangées en quatre groupes d'un seul menu (plus de mur de puces)
    const menu = page.locator('#tool-history-entity-select');
    await expect(menu.locator('option')).toHaveCount(36);
    await expect(menu.locator('optgroup')).toHaveCount(4);
    await expect(menu.locator('optgroup').first()).toHaveAttribute('label', 'Apogée jusqu\'en 500');
    await expect(menu.locator('optgroup[label="Apogée depuis 1800"] option')).toHaveCount(9);
    expect(await page.locator('#screen-tool-history').innerText()).not.toContain('tools.');
    // Rome au départ : trois dates, et la fiche de l'apogée
    await expect(menu).toHaveValue('rome');
    await expect(page.locator('#tool-history-snapshots .tool-history-chip')).toHaveCount(3);
    await expect(page.locator('#tool-history-fiche')).toContainText('Trajan');
    await expect(page.locator('#tool-history-fiche')).toContainText('27 av. J.-C.');
    // le partage de 395 a deux zones, et une légende
    await page.locator('#tool-history-snapshots [data-snapshot="partage"]').click();
    await expect(page.locator('.tool-history-legend li')).toHaveCount(2);
    await expect(page.locator('#tool-history-fiche')).toContainText('Empire romain d\'Orient');
    // les événements de l'app situés dans l'empire pendant sa période : on en ouvre un
    const first = page.locator('#tool-history-fiche .tool-countries-event').first();
    await expect(first).toBeVisible({ timeout: 30_000 });
    expect(await page.locator('#tool-history-fiche .tool-countries-event').count()).toBeLessThanOrEqual(10);
    await first.click();
    await expect(page.locator('#modal-details')).toBeVisible();
});

test('cartes historiques : changer d\'entité change les dates et la fiche', async ({ page }) => {
    await ouvrir(page, 'Cartes historiques');
    const menu = page.locator('#tool-history-entity-select');
    await menu.selectOption('mongol');
    await expect(page.locator('#tool-history-snapshots .tool-history-chip')).toHaveCount(2);
    await expect(page.locator('#tool-history-fiche')).toContainText('Kubilai');
    await expect(page.locator('.tool-history-legend li')).toHaveCount(4);
    await menu.selectOption('incas');
    await expect(page.locator('#tool-history-snapshots .tool-history-chip')).toHaveCount(3);
    await expect(page.locator('#tool-history-fiche')).toContainText('Cusco');
    await expect(page.locator('#tool-history-fiche')).toContainText('quipus');
    await menu.selectOption('carolingien');
    await page.locator('#tool-history-snapshots [data-snapshot="843"]').click();
    await expect(page.locator('.tool-history-legend li')).toHaveCount(3);
    await expect(page.locator('#tool-history-fiche')).toContainText('Verdun');
    await menu.selectOption('mesopotamie');
    await expect(page.locator('#tool-history-snapshots .tool-history-chip')).toHaveCount(4);
    await expect(page.locator('#tool-history-fiche')).toContainText('Tigre');
    await page.locator('#tool-history-snapshots [data-snapshot="sumer"]').click();
    await expect(page.locator('#tool-history-fiche')).toContainText('cités-États');
    await expect(page.locator('#tool-history-snapshots [data-snapshot="sumer"]')).toHaveAttribute('aria-pressed', 'true');
    // pas de légende quand toutes les zones ont la même couleur
    await menu.selectOption('britannique');
    await page.locator('#tool-history-snapshots [data-snapshot="1920"]').click();
    await expect(page.locator('.tool-history-legend')).toHaveCount(0);
    await expect(page.locator('#tool-history-fiche')).toContainText('soleil ne se couche jamais');
});

test('cartes historiques : le curseur montre tout ce qui existe à une date', async ({ page }) => {
    await ouvrir(page, 'Cartes historiques');
    await page.locator('#tool-history-mode-date').click();
    await expect(page.locator('#tool-history-mode-date')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tool-history-entity-block')).toBeHidden();
    await expect(page.locator('#tool-history-date-block')).toBeVisible();
    // une date repère : 117, Rome et les Han
    await page.locator('#tool-history-presets [data-year="117"]').click();
    await expect(page.locator('#tool-history-year')).toHaveText('117');
    const actifs = page.locator('#tool-history-fiche .tool-history-active');
    await expect(actifs.filter({ hasText: 'Empire romain' })).toContainText('carte de 117');
    await expect(actifs.filter({ hasText: 'Empire Han' })).toContainText('carte de 100');
    await expect(actifs.filter({ hasText: 'Empire maurya' })).toHaveCount(0);
    // le curseur : tout à gauche, 3500 av. J.-C. ; tout à droite, l'an 2000, où aucune entité n'existe plus
    const slider = page.locator('#tool-history-slider');
    await slider.fill('0');
    await expect(page.locator('#tool-history-year')).toHaveText('3500 av. J.-C.');
    await slider.fill('1000');
    await expect(page.locator('#tool-history-year')).toHaveText('2000');
    await expect(page.locator('#tool-history-fiche')).toContainText('aucune des entités');
    await page.locator('#tool-history-presets [data-year="1920"]').click();
    await expect(actifs.filter({ hasText: 'Empire britannique' })).toBeVisible();
    await expect(actifs.filter({ hasText: 'Empire colonial français' })).toContainText('carte de 1930');
    // toucher une ligne ouvre l'empire, à la carte la plus proche
    await actifs.filter({ hasText: 'Empire britannique' }).click();
    await expect(page.locator('#tool-history-mode-entity')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tool-history-fiche')).toContainText('soleil ne se couche jamais');
    await expect(page.locator('#tool-history-snapshots [data-snapshot="1920"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tool-history-entity-select')).toHaveValue('britannique');
});

test('généalogie biblique : un arbre, hommes en bleu et femmes en rose, bascule français / hébreu, repli et recherche', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.locator('#btn-tools').click();
    await page.locator('#screen-tools .arcade-card', { hasText: 'Généalogie biblique' }).click();
    expect(await visibleScreen(page)).toBe('screen-tool-genealogy');
    // À l'ouverture : Adam et ses trois fils, les autres branches repliées.
    await expect(page.locator('#gen-stage .gen-card')).toHaveCount(4);
    await expect(page.locator('#gen-stage .gen-card[data-id="seth"]')).toHaveCount(1);
    await page.locator('.gen-actions .btn', { hasText: 'Tout déplier' }).click();
    await expect(page.locator('#gen-stage .gen-card')).toHaveCount(await page.evaluate(() => Object.keys(GenealogyCore.layout({}, () => 40).nodes).length));
    await expect(page.locator('#gen-stage .gen-card[data-id="josue"] .gen-name')).toHaveText('Josué');
    // Par défaut vertical : Adam en haut, Caïn et Seth plus bas.
    await expect(page.locator('#gen-stage.is-vertical')).toHaveCount(1);
    expect(await page.locator('#gen-stage .gen-card[data-id="adam"]').evaluate(el => el.offsetTop)).toBeLessThan(await page.locator('#gen-stage .gen-card[data-id="cain"]').evaluate(el => el.offsetTop));
    await page.locator('#gen-dir').click();
    await expect(page.locator('#gen-stage.is-vertical')).toHaveCount(0);
    await page.locator('#gen-dir').click();
    await expect(page.locator('#gen-lang-fr')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#gen-stage .gen-card[data-id="adam"] .gen-name')).toHaveText('Adam');
    const bg = id => page.locator(`#gen-stage .gen-card[data-id="${id}"]`).evaluate(el => getComputedStyle(el).backgroundColor);
    expect(await bg('adam')).toBe('rgb(219, 234, 254)');
    expect(await bg('naama')).toBe('rgb(252, 231, 243)');
    await page.locator('#gen-lang-he').click();
    await expect(page.locator('#gen-lang-he')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#gen-stage .gen-card[data-id="adam"] .gen-name')).toHaveText('אדם');
    await page.locator('#gen-lang-fr').click();
    // Replier Noé cache ses descendants.
    await page.locator('#gen-stage .gen-card[data-id="noe"] .gen-toggle').click();
    await expect(page.locator('#gen-stage .gen-card[data-id="sem"]')).toHaveCount(0);
    await page.locator('#gen-search').fill('moise');
    await page.locator('.gen-result', { hasText: 'Moïse' }).click();
    await expect(page.locator('#gen-stage .gen-card.is-focus .gen-name')).toHaveText('Moïse');
    // Tsippora, mariée à Moïse, porte le nom de son mari dans sa carte (encadré bleu).
    await expect(page.locator('#gen-stage .gen-card[data-id="tsippora"] .gen-spouse.is-man')).toContainText('Moïse');
    await page.locator('#screen-tool-genealogy .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-tools');
    expect(errors).toEqual([]);
});

test('chronologie des chefs d’État : de Clovis à Macron, barres de dynastie, recherche par nom', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.locator('#btn-tools').click();
    await page.locator('#screen-tools .arcade-card', { hasText: 'Chronologie des chefs d’État' }).click();
    expect(await visibleScreen(page)).toBe('screen-tool-leaders');
    const rows = page.locator('#leaders-list .leader-row');
    await expect(rows.first()).toContainText('Clovis Ier');
    await expect(rows.last()).toContainText('Emmanuel Macron');
    await expect(rows.last()).toContainText('aujourd’hui');
    await expect(page.locator('#leaders-list .leaders-divider').first()).toContainText('Dynastie mérovingienne');
    await page.locator('#leaders-search').fill('petain');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Philippe Pétain');
    await expect(page.locator('#leaders-list .leaders-divider')).toHaveCount(0);
    await page.locator('#leaders-search').fill('zzzz');
    await expect(rows).toHaveCount(0);
    await expect(page.locator('#leaders-count')).toContainText('Aucun');
    // Le bouton « Pays » ouvre la liste ; le Japon s'affiche, avec sa note.
    await page.locator('#leaders-pick').click();
    await expect(page.locator('#leaders-countries .leaders-country-btn')).toHaveCount(33);
    await page.locator('.leaders-country-btn', { hasText: 'Japon' }).click();
    await expect(page.locator('#leaders-countries')).toBeHidden();
    await expect(page.locator('#leaders-pick')).toContainText('Japon');
    await expect(rows.first()).toContainText('Meiji');
    await expect(rows.last()).toContainText('Naruhito');
    await expect(page.locator('#leaders-country-note')).toContainText('ère Meiji');
    await page.locator('#screen-tool-leaders .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-tools');
    expect(errors).toEqual([]);
});

test('chronologie : un régime parlementaire propose les chefs du gouvernement, les chefs d’État restent par défaut', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.locator('#btn-tools').click();
    await page.locator('#screen-tools .arcade-card', { hasText: 'Chronologie des chefs d’État' }).click();
    const rows = page.locator('#leaders-list .leader-row');
    await expect(page.locator('#leaders-modes')).toBeHidden();
    await page.locator('#leaders-pick').click();
    await page.locator('.leaders-country-btn', { hasText: 'Royaume-Uni' }).click();
    await expect(page.locator('#leaders-modes')).toBeVisible();
    await expect(page.locator('#leaders-mode-etat')).toHaveAttribute('aria-pressed', 'true');
    await expect(rows.first()).toContainText('Jacques Ier');
    await page.locator('#leaders-mode-gouv').click();
    await expect(page.locator('#leaders-mode-gouv')).toHaveAttribute('aria-pressed', 'true');
    await expect(rows.first()).toContainText('Robert Walpole');
    await expect(rows.last()).toContainText('Keir Starmer');
    await page.locator('#leaders-mode-etat').click();
    await expect(rows.first()).toContainText('Jacques Ier');
    await page.locator('#leaders-pick').click();
    await page.locator('.leaders-country-btn', { hasText: 'France' }).click();
    await expect(page.locator('#leaders-modes')).toBeHidden();
    expect(errors).toEqual([]);
});
