// Villes du monde (js/modes/cities.js) : la place dans la Salle de jeux, puis les cinq jeux. Le moteur de questions est testé dans
// tests/cityGameCore.test.js et tests/cityHistoryCore.test.js ; ici, l'enchaînement des écrans, la carte, et les erreurs JavaScript.

const { test, expect, visibleScreen } = require('./fixtures');

test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
        markRecapShownThisWeek();
        showScreen('screen-categories');
        initCategories();
    });
});

async function openCities(page) {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Villes du monde' }).click();
    expect(await visibleScreen(page)).toBe('screen-cities');
}

async function startGame(page, label) {
    await page.locator('#cities-menu .btn', { hasText: label }).click();
    await page.locator('#cities-play').waitFor({ state: 'visible' });
}

// Répond à la question de QCM affichée : la bonne réponse, ou une autre si `right` est faux.
async function answer(page, right) {
    const q = await page.evaluate(() => cityGameQuestions[cityGameIndex]);
    const good = q.options.findIndex(o => o.id === q.target);
    const pick = right ? good : (good + 1) % q.options.length;
    await page.locator('#cities-options .quiz-option').nth(pick).click();
}

test('« Villes du monde » est une carte de « Jeux géographiques », première section de la Salle de jeux', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    const sections = await page.locator('#screen-arcade .games-section h3').allTextContents();
    expect(sections[0]).toBe('Jeux géographiques');
    expect(sections).not.toContain('Villes du monde');
    const cards = await page.locator('#screen-arcade .games-section').first().locator('.arcade-card strong').allTextContents();
    expect(cards).toEqual(['Quiz des pays', 'Villes du monde']);
    await page.locator('.arcade-card', { hasText: 'Villes du monde' }).click();
    await expect(page.locator('#cities-menu .btn')).toHaveText([
        'Capitale ou plus grande ville ?', 'Quelle ville est la plus au nord ?', 'Touchez la ville sur la carte',
        'Classer les villes par population', "Ville de l'histoire"
    ]);
    // « Retour » ramène à la Salle de jeux.
    await page.locator('#screen-cities .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-arcade');
});

test('capitale ou plus grande ville : dix questions, 100 points chacune, une erreur est corrigée', async ({ page }) => {
    await openCities(page);
    await startGame(page, 'Capitale ou plus grande ville');
    await expect(page.locator('#cities-progress')).toHaveText('Question 1 sur 10');
    await answer(page, false);
    await expect(page.locator('#cities-feedback')).toContainText('La bonne réponse était');
    await expect(page.locator('#cities-options .quiz-option.correct')).toHaveCount(1);
    await page.locator('#cities-next').click();
    for (let i = 1; i < 10; i++) {
        await answer(page, true);
        await page.locator('#cities-next').click();
    }
    await expect(page.locator('#cities-end')).toBeVisible();
    await expect(page.locator('#cities-score')).toHaveText('Score : 900 pts sur 1000');
    // « Autres jeux sur les villes » revient au menu, « Retour » à la Salle de jeux.
    await page.locator('#cities-end .btn').click();
    await expect(page.locator('#cities-menu')).toBeVisible();
});

test('quelle ville est la plus au nord (ou au sud) : dix bonnes réponses, 1 000 pts', async ({ page }) => {
    await openCities(page);
    await startGame(page, 'Quelle ville est la plus au nord');
    await expect(page.locator('#cities-ask')).toHaveText(/Laquelle de ces villes est la plus au (nord|sud) \?/);
    for (let i = 0; i < 10; i++) {
        await answer(page, true);
        await page.locator('#cities-next').click();
    }
    await expect(page.locator('#cities-score')).toHaveText('Score : 1000 pts sur 1000');
});

test('réglages partagés avec le Quiz des pays : zone et chrono, bonus de vitesse, temps écoulé = erreur', async ({ page }) => {
    await openCities(page);
    await expect(page.locator('#cities-timer')).toBeHidden();
    await page.locator('#cities-zone .geoquiz-chip', { hasText: 'Afrique' }).click();
    await page.locator('#cities-timer-choice .geoquiz-chip', { hasText: '3 s' }).click();
    await expect(page.locator('#cities-zone .geoquiz-chip', { hasText: 'Afrique' })).toHaveAttribute('aria-pressed', 'true');
    // Le Quiz des pays a les mêmes réglages.
    await page.locator('#screen-cities .back-btn').click();
    await page.locator('.arcade-card', { hasText: 'Quiz des pays' }).click();
    await expect(page.locator('#geoquiz-zone .geoquiz-chip', { hasText: 'Afrique' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#geoquiz-timer-choice .geoquiz-chip', { hasText: '3 s' })).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#geoquiz-zone .geoquiz-chip', { hasText: 'Monde' }).click();
    await page.locator('#screen-geoquiz .back-btn').click();
    await page.locator('.arcade-card', { hasText: 'Villes du monde' }).click();
    expect(await visibleScreen(page)).toBe('screen-cities');
    await expect(page.locator('#cities-zone .geoquiz-chip', { hasText: 'Monde' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#cities-timer-choice .geoquiz-chip', { hasText: '3 s' })).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#cities-zone .geoquiz-chip', { hasText: 'Afrique' }).click();
    await startGame(page, 'Capitale ou plus grande ville');
    await expect(page.locator('#cities-timer')).toBeVisible();
    // Une réponse juste tout de suite : 100 pts plus un bonus de vitesse (3 secondes accordées).
    await answer(page, true);
    await expect(page.locator('#cities-feedback')).toContainText(/\+1\d\d pts/);
    await page.locator('#cities-next').click();
    // Le temps écoulé sans réponse : une erreur, la bonne réponse s'affiche.
    await expect(page.locator('#cities-feedback')).toContainText('Temps écoulé', { timeout: 6000 });
    await expect(page.locator('#cities-options .quiz-option.correct')).toHaveCount(1);
});

test('touchez la ville : une carte sans aucun nom, 100 pts sur place, des points qui baissent avec la distance', async ({ page }) => {
    await openCities(page);
    await startGame(page, 'Touchez la ville');
    await expect(page.locator('#cities-map-wrap')).toBeVisible();
    await expect(page.locator('#cities-options')).toBeHidden();
    await page.waitForFunction(() => typeof cityMapReady !== 'undefined' && cityMapReady === true);
    expect(await page.evaluate(() => cityMap.getStyle().layers.every(l => l.type !== 'symbol'))).toBe(true);
    // Sur place : 100 points. Puis un point à environ 1 300 km : de l'ordre de 37 points.
    await page.evaluate(() => { const c = cityGameById(cityGameQuestions[cityGameIndex].target); cityGameTap(c.lon, c.lat); });
    await expect(page.locator('#cities-feedback')).toContainText('100 pts');
    await page.locator('#cities-next').click();
    await page.evaluate(() => { const c = cityGameById(cityGameQuestions[cityGameIndex].target); cityGameTap(c.lon + 13 / Math.cos(c.lat * Math.PI / 180), c.lat); });
    const points = await page.evaluate(() => cityGameScore) - 100;
    expect(points).toBeGreaterThan(20);
    expect(points).toBeLessThan(60);
});

test('touchez la ville, au clavier : Entrée pose le repère au centre de la carte', async ({ page }) => {
    await openCities(page);
    await startGame(page, 'Touchez la ville');
    await page.waitForFunction(() => typeof cityMapReady !== 'undefined' && cityMapReady === true);
    // Une touche avant le focus : le navigateur ne montre le focus clavier (:focus-visible) qu'après une interaction au clavier.
    await page.keyboard.press('Shift');
    await page.locator('#cities-map').focus();
    await expect(page.locator('#cities-map-wrap .cities-crosshair')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('#cities-feedback')).toContainText('km de');
    await expect(page.locator('#cities-next')).toBeVisible();
});

test('classer par population : quatre villes à choisir dans l’ordre, Recommencer vide la sélection', async ({ page }) => {
    await openCities(page);
    await startGame(page, 'Classer les villes');
    await expect(page.locator('#cities-options .quiz-option')).toHaveCount(4);
    await page.locator('#cities-options .quiz-option').nth(0).click();
    await expect(page.locator('#cities-sequence')).toContainText('Votre ordre');
    await page.locator('#cities-reset').click();
    await expect(page.locator('#cities-sequence')).toHaveText('');
    await expect(page.locator('#cities-options .quiz-option:not([disabled])')).toHaveCount(4);
    // Le bon ordre : 100 points.
    await page.evaluate(() => {
        const q = cityGameQuestions[cityGameIndex];
        q.ids.forEach(id => document.querySelectorAll('#cities-options .quiz-option')[q.options.findIndex(o => o.id === id)].click());
    });
    await expect(page.locator('#cities-feedback')).toContainText('4 ville(s) bien placée(s) : 100 pts');
    // Un mauvais ordre : le bon est dit.
    await page.locator('#cities-next').click();
    await page.evaluate(() => {
        const q = cityGameQuestions[cityGameIndex];
        q.ids.slice().reverse().forEach(id => document.querySelectorAll('#cities-options .quiz-option')[q.options.findIndex(o => o.id === id)].click());
    });
    await expect(page.locator('#cities-feedback')).toContainText("L'ordre était");
});

test('ville de l’histoire : le titre ne nomme jamais la ville, la description vient après la réponse', async ({ page }) => {
    await openCities(page);
    await startGame(page, "Ville de l'histoire");
    await page.waitForFunction(() => typeof cityMapReady !== 'undefined' && cityMapReady === true);
    await expect(page.locator('#cities-ask')).toHaveText('Où se déroule ce fait ? Touchez la ville sur la carte.');
    for (let i = 0; i < 10; i++) {
        const info = await page.evaluate(() => {
            const q = cityGameQuestions[cityGameIndex];
            return {
                leak: CityHistoryCore.titleNames(q.title, [cityGameById(q.target).n]),
                title: document.getElementById('cities-fact-title').textContent,
                meta: document.getElementById('cities-fact-meta').textContent,
                descHidden: document.getElementById('cities-fact-desc').classList.contains('hidden'),
                factVisible: !document.getElementById('cities-fact').classList.contains('hidden')
            };
        });
        expect(info.leak).toBe(false);
        expect(info.factVisible).toBe(true);
        expect(info.title.length).toBeGreaterThan(0);
        expect(info.meta).toMatch(/\d/);
        expect(info.descHidden).toBe(true);
        await page.evaluate(() => { const c = cityGameById(cityGameQuestions[cityGameIndex].target); cityGameTap(c.lon, c.lat); });
        await expect(page.locator('#cities-feedback')).toContainText('C’était à');
        await expect(page.locator('#cities-feedback')).toContainText('100 pts');
        // La description se charge à la demande (pack découpé) : elle apparaît, sans que la partie attende.
        await expect(page.locator('#cities-fact-desc')).toBeVisible();
        await page.locator('#cities-next').click();
    }
    await expect(page.locator('#cities-score')).toHaveText('Score : 1000 pts sur 1000');
    await expect(page.locator('#cities-credit')).toContainText('Atlas des événements');
});

test('ville de l’histoire, période : le choix est gardé, et chaque fait tiré est de la période demandée', async ({ page }) => {
    await openCities(page);
    await expect(page.locator('#cities-period .geoquiz-chip', { hasText: 'Toutes' })).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#cities-period .geoquiz-chip', { hasText: 'Antiquité' }).click();
    await expect(page.locator('#cities-period .geoquiz-chip', { hasText: 'Antiquité' })).toHaveAttribute('aria-pressed', 'true');
    await startGame(page, "Ville de l'histoire");
    await page.waitForFunction(() => typeof cityMapReady !== 'undefined' && cityMapReady === true);
    const years = await page.evaluate(() => cityGameQuestions.map(q => q.year));
    expect(years.length).toBeGreaterThan(0);
    years.forEach(y => expect(y).toBeLessThanOrEqual(499));
});
