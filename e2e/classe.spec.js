// Mode Classe (js/classroom.js) : l'écran des deux rôles, avec un faux serveur de séance. La logique serveur
// (rejeu, classement, bilan, purge) a ses propres tests sur Postgres en mémoire (tests/classroom.test.js) ;
// ici, on vérifie que l'interface suit le protocole : salon, départ, manche de l'élève, classement, bilan.

const { test, expect, visibleScreen, openThemeModes } = require('./fixtures');

// Un faux /api/classroom. `etat` est ce que renverra le prochain GET ; `appels` garde tout ce qui a été posté.
async function fauxServeur(page, etat) {
    const appels = [];
    await page.route(/\/api\/classroom/, async route => {
        const req = route.request();
        if (req.method() === 'GET') {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(etat.courant) });
        }
        const corps = JSON.parse(req.postData());
        appels.push(corps);
        const reponse = etat.reponses[corps.action] || { status: 200, body: {} };
        return route.fulfill({ status: reponse.status || 200, contentType: 'application/json', body: JSON.stringify(reponse.body || {}) });
    });
    return appels;
}

async function paquetDe8(page) {
    return page.evaluate(() => {
        const seen = new Set(); const ids = [];
        for (const e of getCurrentTheme().events) { if (!seen.has(e.date)) { seen.add(e.date); ids.push(e.id); } if (ids.length === 8) break; }
        return ids;
    });
}

test('enseignant : réglage, salon avec le code, départ, séance en direct, bilan', async ({ page }) => {
    await openThemeModes(page, 'thm_rome');
    const etat = { courant: {}, reponses: { create: { body: { code: 'ABC234' } }, start: { body: { status: 'running' } }, end: { body: { status: 'ended' } } } };
    const appels = await fauxServeur(page, etat);
    const ids = await paquetDe8(page);

    await page.locator('#mode-card-class').click();
    await expect(page.locator('#screen-class')).toBeVisible();
    await expect(page.locator('#class-panel-setup')).toBeVisible();
    await page.locator('#class-size-picker button', { hasText: '10' }).click();
    await expect(page.locator('#class-size-picker button.active')).toHaveText('10');

    etat.courant = { code: 'ABC234', status: 'lobby', total: 9, isTeacher: true, players: [{ rank: 1, name: 'Léa', score: 0, answered: 0, correct: 0, finished: false }] };
    await page.locator('#class-create-btn').click();
    await expect(page.locator('#class-panel-lobby')).toBeVisible();
    const creation = appels.find(a => a.action === 'create');
    expect(creation.eventIds).toHaveLength(10);
    expect(new Set(creation.eventIds).size).toBe(10);
    expect(creation.lang).toBe('fr');
    // Le code se lit de loin : gros, espacé.
    await expect(page.locator('#class-code')).toHaveText('ABC234');
    await expect(page.locator('#class-code')).toHaveAttribute('aria-label', /A B C 2 3 4/);
    await expect(page.locator('#class-lobby-players li')).toHaveText(['Léa']);
    await expect(page.locator('#class-start-btn')).toBeEnabled();

    // Départ, puis la séance en direct : l'enseignant voit toute la classe.
    etat.courant = { code: 'ABC234', status: 'running', total: 9, isTeacher: true, playerCount: 2,
        players: [{ rank: 1, name: 'Léa', score: 540, answered: 6, correct: 6, finished: false }, { rank: 2, name: 'Hugo', score: 210, answered: 9, correct: 4, finished: true }],
        recap: [{ eventId: ids[1], answered: 2, wrong: 2 }, { eventId: ids[2], answered: 2, wrong: 0 }] };
    await page.locator('#class-start-btn').click();
    await expect(page.locator('#class-panel-live')).toBeVisible();
    await expect(page.locator('#class-board .class-row')).toHaveCount(2);
    await expect(page.locator('#class-board .class-row').first()).toContainText('Léa');
    await expect(page.locator('#class-end-btn')).toBeVisible();
    expect(appels.some(a => a.action === 'start' && a.code === 'ABC234')).toBe(true);
    // Le bilan s'affiche à l'enseignant dès que ça se joue : la carte la plus ratée, avec son titre.
    await expect(page.locator('#class-recap')).toBeVisible();
    await expect(page.locator('#class-recap-list li')).toHaveCount(1);
    await expect(page.locator('#class-recap-list li').first()).toContainText('100 % d\'erreurs');
    const titre = await page.evaluate(id => getAllEventsWithLocation().find(i => i.event.id === id).event.titre, ids[1]);
    await expect(page.locator('#class-recap-list li').first()).toContainText(titre);

    // Fin de séance : confirmation, puis plus de bouton « Terminer ».
    etat.courant = { ...etat.courant, status: 'ended' };
    await page.locator('#class-end-btn').click();
    await page.locator('#confirm-ok-btn').click();
    await expect(page.locator('#class-live-status')).toHaveText('Séance terminée.');
    await expect(page.locator('#class-end-btn')).toBeHidden();
    await expect(page.locator('#class-again-btn')).toBeVisible();
});

test('élève : rejoint, attend, joue le paquet de l\'enseignant sans élimination, voit son rang puis le bilan', async ({ page }) => {
    await openThemeModes(page, 'thm_rome');
    const ids = await paquetDe8(page);
    const etat = { courant: {}, reponses: { join: { body: { status: 'lobby', lang: 'fr', themeName: 'Rome', eventIds: ids } }, submit: { body: { score: 100, answered: 1, finished: false, rank: 1 } } } };
    const appels = await fauxServeur(page, etat);

    await page.evaluate(() => { showScreen('screen-categories'); initCategories(); });
    await page.locator('#btn-daily').click();
    await page.locator('#btn-challenge-class').click();
    await expect(page.locator('#class-panel-join')).toBeVisible();

    // Champs manquants, puis un code inconnu.
    await page.locator('#class-join-btn').click();
    await expect(page.locator('#class-join-error')).toBeVisible();
    // Un code inconnu : la réponse d'erreur du serveur est rejouée côté client (un vrai 404 réseau salirait la console).
    await page.evaluate(() => { window.__classroomReel = HistoriAxeAPI.classroom; HistoriAxeAPI.classroom = () => Promise.resolve({ ok: false, status: 404, error: 'Séance introuvable : vérifiez le code.' }); });
    await page.locator('#class-code-input').fill('zzz-zzz');
    await page.locator('#class-name-input').fill('Léa');
    await page.locator('#class-join-btn').click();
    await expect(page.locator('#class-join-error')).toContainText('introuvable');
    await page.evaluate(() => { HistoriAxeAPI.classroom = window.__classroomReel; });

    // Un bon code : le salon, tant que l'enseignant n'a pas lancé.
    etat.reponses.join = { body: { status: 'lobby', lang: 'fr', themeName: 'Rome', eventIds: ids } };
    etat.courant = { code: 'ABC234', status: 'lobby', total: 7, isTeacher: false, players: [{ rank: 1, name: 'Léa', score: 0, answered: 0, correct: 0, finished: false }] };
    await page.locator('#class-code-input').fill('abc 234');
    await page.locator('#class-join-btn').click();
    await expect(page.locator('#class-panel-lobby')).toBeVisible();
    await expect(page.locator('#class-code-block')).toBeHidden();
    await expect(page.locator('#class-start-btn')).toBeHidden();
    const rejoindre = appels.filter(a => a.action === 'join').pop();
    expect(rejoindre).toMatchObject({ code: 'abc 234', name: 'Léa' });

    // L'enseignant lance : la frise démarre toute seule, sur LE paquet, sans vies.
    etat.courant = { ...etat.courant, status: 'running' };
    await expect(page.locator('#screen-game')).toBeVisible({ timeout: 8000 });
    expect(await page.evaluate(() => currentMode)).toBe('class');
    await expect(page.locator('#hud-lives')).toBeHidden();
    const ordre = await page.evaluate(() => [placedEvents[0].id, eventToPlace.id, ...currentPool.slice().reverse().map(e => e.id)]);
    expect(ordre).toEqual(ids);

    // Chaque placement envoie le journal CUMULATIF. On joue la moitié en se trompant exprès : pas d'élimination.
    for (let manche = 1; manche < ids.length; manche++) {
        const faux = manche % 2 === 0;
        const slot = await page.evaluate(({ faux }) => {
            let ok = 0;
            while (ok < placedEvents.length && placedEvents[ok].date < eventToPlace.date) ok++;
            return faux ? (ok === 0 ? placedEvents.length : 0) : ok;
        }, { faux });
        await page.locator('#timeline button.slot').nth(slot).click();
        // Une erreur laisse 2,2 s de révélation avant la carte suivante.
        if (manche < ids.length - 1) await page.waitForFunction(n => classRoundLog.length === n && !isAnimating, manche, { timeout: 6000 });
    }
    const soumissions = appels.filter(a => a.action === 'submit');
    expect(soumissions.length).toBeGreaterThanOrEqual(ids.length - 1);
    expect(soumissions.map(s => s.rounds.length).slice(0, 3)).toEqual([1, 2, 3]);
    expect(soumissions[soumissions.length - 1].rounds).toHaveLength(ids.length - 1);

    // Fin de manche : l'élève attend le classement, pas l'écran de fin habituel.
    etat.courant = { code: 'ABC234', status: 'running', total: 7, isTeacher: false, playerCount: 2,
        players: [{ rank: 1, name: 'Hugo', score: 800, answered: 7, correct: 7, finished: true }, { rank: 2, name: 'Léa', score: 300, answered: 7, correct: 3, finished: true }],
        me: { rank: 2, score: 300, answered: 7, correct: 3, finished: true } };
    await expect(page.locator('#class-panel-live')).toBeVisible({ timeout: 8000 });
    expect(await visibleScreen(page)).toBe('screen-class');
    await expect(page.locator('#class-live-status')).toContainText('2ᵉ sur 2');
    await expect(page.locator('#class-board .class-row.is-me')).toContainText('Léa');
    await expect(page.locator('#class-recap')).toBeHidden(); // pas de bilan avant la fin de la séance

    etat.courant = { ...etat.courant, status: 'ended', recap: [{ eventId: ids[3], answered: 2, wrong: 1 }] };
    await expect(page.locator('#class-live-status')).toHaveText('Séance terminée.', { timeout: 8000 });
    await expect(page.locator('#class-recap')).toBeVisible();
});

test('un prénom saisi par un élève est affiché comme du texte, jamais comme du HTML', async ({ page }) => {
    await openThemeModes(page, 'thm_rome');
    const etat = { courant: {}, reponses: { create: { body: { code: 'ABC234' } } } };
    await fauxServeur(page, etat);
    await page.locator('#mode-card-class').click();
    etat.courant = { code: 'ABC234', status: 'lobby', total: 9, isTeacher: true, players: [{ rank: 1, name: '<img src=x onerror=window.__xss=1>', score: 0, answered: 0, correct: 0, finished: false }] };
    await page.locator('#class-create-btn').click();
    await expect(page.locator('#class-lobby-players li')).toHaveCount(1);
    await expect(page.locator('#class-lobby-players img')).toHaveCount(0);
    await expect(page.locator('#class-lobby-players li')).toContainText('<img src=x');
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
});

test('un paquet qui contient un événement inconnu de ce pack n\'est pas joué', async ({ page }) => {
    await openThemeModes(page, 'thm_rome');
    const ids = await paquetDe8(page);
    const etat = { courant: {}, reponses: { join: { body: { status: 'running', lang: 'fr', themeName: 'Rome', eventIds: [...ids.slice(0, 7), 'evenement-inconnu'] } } } };
    await fauxServeur(page, etat);
    await page.evaluate(() => openClassJoin());
    await page.locator('#class-code-input').fill('ABC234');
    await page.locator('#class-name-input').fill('Léa');
    await page.locator('#class-join-btn').click();
    await expect(page.locator('#class-join-error')).toContainText('pas à jour');
    expect(await visibleScreen(page)).toBe('screen-class');
});
