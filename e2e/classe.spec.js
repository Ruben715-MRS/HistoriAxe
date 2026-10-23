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
    await openThemeModes(page, 'thm_be');
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
        totals: { correct: 10, wrong: 5 },
        recap: [{ mode: 'frise', ids: [ids[1]], answered: 2, wrong: 2 }, { mode: 'frise', ids: [ids[2]], answered: 2, wrong: 0 }] };
    await page.locator('#class-start-btn').click();
    await expect(page.locator('#class-panel-live')).toBeVisible();
    await expect(page.locator('#class-board .class-row')).toHaveCount(2);
    await expect(page.locator('#class-board .class-row').first()).toContainText('Léa');
    await expect(page.locator('#class-end-btn')).toBeVisible();
    expect(appels.some(a => a.action === 'start' && a.code === 'ABC234')).toBe(true);
    // La part de fautes de chaque élève se voit en rouge ; la barre de toute la classe indique 67 % de réussite.
    const rougeHugo = await page.locator('#class-board .class-row').nth(1).locator('.class-progress-bad').evaluate(el => el.style.width);
    expect(parseFloat(rougeHugo)).toBeGreaterThan(0);
    const rougeLea = await page.locator('#class-board .class-row').first().locator('.class-progress-bad').evaluate(el => el.style.width);
    expect(parseFloat(rougeLea)).toBe(0);
    await expect(page.locator('#class-meter')).toBeVisible();
    await expect(page.locator('#class-meter .class-meter-pct b')).toHaveText('67 %');
    await expect(page.locator('#class-podium')).toBeHidden();
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
    // Le podium monte à la fin de la séance : Léa première, Hugo deuxième.
    await expect(page.locator('#class-podium')).toBeVisible();
    await expect(page.locator('#class-podium .class-podium-place')).toHaveCount(2);
    await expect(page.locator('#class-podium .place-1 .class-podium-name')).toHaveText('Léa');
    await expect(page.locator('#class-podium .place-2 .class-podium-name')).toHaveText('Hugo');
    await expect.poll(() => page.locator('#class-podium .place-1 .class-podium-step').evaluate(el => el.offsetHeight), { timeout: 4000 }).toBeGreaterThan(100);
});

test('élève : rejoint, attend, joue le paquet de l\'enseignant sans élimination, voit son rang puis le bilan', async ({ page }) => {
    await openThemeModes(page, 'thm_be');
    const ids = await paquetDe8(page);
    const etat = { courant: {}, reponses: { join: { body: { status: 'lobby', lang: 'fr', themeName: 'Belgique', eventIds: ids } }, submit: { body: { score: 100, answered: 1, finished: false, rank: 1 } } } };
    const appels = await fauxServeur(page, etat);

    // Rejoindre une séance se fait depuis l'écran Équipe : il n'y a plus de bouton à part parmi les défis.
    await page.evaluate(() => { showScreen('screen-categories'); initCategories(); });
    await page.locator('#btn-daily').click();
    await expect(page.locator('#btn-challenge-class')).toHaveCount(0);
    await page.evaluate(() => openTeam('screen-categories'));
    await expect(page.locator('#team-class-form')).toBeVisible();

    // Champs manquants, puis un code inconnu.
    await page.locator('#team-class-code').fill('');
    await page.locator('#team-class-name').fill('');
    await page.locator('#team-class-btn').click();
    await expect(page.locator('#team-error')).toBeVisible();
    // Un code inconnu : la réponse d'erreur du serveur est rejouée côté client (un vrai 404 réseau salirait la console).
    await page.evaluate(() => { window.__classroomReel = HistoriAxeAPI.classroom; HistoriAxeAPI.classroom = () => Promise.resolve({ ok: false, status: 404, error: 'Séance introuvable : vérifiez le code.' }); });
    await page.locator('#team-class-code').fill('zzz-zzz');
    await page.locator('#team-class-name').fill('Léa');
    await page.locator('#team-class-btn').click();
    await expect(page.locator('#class-panel-join')).toBeVisible();
    await expect(page.locator('#class-join-error')).toContainText('introuvable');
    await page.evaluate(() => { HistoriAxeAPI.classroom = window.__classroomReel; });

    // Un bon code : le salon, tant que l'enseignant n'a pas lancé.
    etat.reponses.join = { body: { status: 'lobby', lang: 'fr', themeName: 'Belgique', eventIds: ids } };
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
    expect(soumissions.map(s => s.logs.frise.length).slice(0, 3)).toEqual([1, 2, 3]);
    expect(soumissions[soumissions.length - 1].logs.frise).toHaveLength(ids.length - 1);

    // Fin de manche : l'élève attend le classement, pas l'écran de fin habituel.
    etat.courant = { code: 'ABC234', status: 'running', total: 7, isTeacher: false, playerCount: 2,
        players: [{ rank: 1, name: 'Hugo', score: 800, answered: 7, correct: 7, finished: true }, { rank: 2, name: 'Léa', score: 300, answered: 7, correct: 3, finished: true }],
        me: { rank: 2, score: 300, answered: 7, correct: 3, finished: true } };
    await expect(page.locator('#class-panel-live')).toBeVisible({ timeout: 8000 });
    expect(await visibleScreen(page)).toBe('screen-class');
    await expect(page.locator('#class-live-status')).toContainText('2ᵉ sur 2');
    await expect(page.locator('#class-board .class-row.is-me')).toContainText('Léa');
    await expect(page.locator('#class-recap')).toBeHidden(); // pas de bilan avant la fin de la séance

    etat.courant = { ...etat.courant, status: 'ended', recap: [{ mode: 'frise', ids: [ids[3]], answered: 2, wrong: 1 }] };
    await expect(page.locator('#class-live-status')).toHaveText('Séance terminée.', { timeout: 8000 });
    await expect(page.locator('#class-recap')).toBeVisible();
});

test('un prénom saisi par un élève est affiché comme du texte, jamais comme du HTML', async ({ page }) => {
    await openThemeModes(page, 'thm_be');
    const etat = { courant: { code: 'ABC234', status: 'lobby', total: 7, isTeacher: true, players: [] }, reponses: { create: { body: { code: 'ABC234' } } } };
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
    await openThemeModes(page, 'thm_be');
    const ids = await paquetDe8(page);
    const etat = { courant: {}, reponses: { join: { body: { status: 'running', lang: 'fr', themeName: 'Belgique', eventIds: [...ids.slice(0, 7), 'evenement-inconnu'] } } } };
    await fauxServeur(page, etat);
    await page.evaluate(() => openClassJoin());
    await page.locator('#class-code-input').fill('ABC234');
    await page.locator('#class-name-input').fill('Léa');
    await page.locator('#class-join-btn').click();
    await expect(page.locator('#class-join-error')).toContainText('pas à jour');
    expect(await visibleScreen(page)).toBe('screen-class');
});

test('enseignant : les modes se cochent un par ligne, la frise d\'abord ; le dernier coché ne se décoche pas ; l\'ordre peut être aléatoire', async ({ page }) => {
    await openThemeModes(page, 'thm_be');
    const etat = { courant: { code: 'ABC234', status: 'lobby', total: 7, isTeacher: true, players: [] }, reponses: { create: { body: { code: 'ABC234' } } } };
    const appels = await fauxServeur(page, etat);
    await page.locator('#mode-card-class').click();
    await expect(page.locator('#class-panel-setup')).toBeVisible();

    const lignes = page.locator('#class-modes-list li');
    await expect(lignes).toHaveCount(9);
    await expect(lignes.first()).toContainText('La frise');
    await expect(lignes.first().locator('small')).not.toBeEmpty();
    // Au départ, seule la frise est cochée — et on ne peut pas la décocher : il faut au moins un mode.
    await expect(page.locator('#class-modes-list input:checked')).toHaveCount(1);
    await expect(lignes.first().locator('input')).toBeDisabled();
    await expect(page.locator('#class-shuffle-input')).toBeDisabled();

    // Trouve l'écart, Avant / Après : l'ordre de la liste est conservé.
    await lignes.nth(2).locator('input').check();
    await lignes.nth(3).locator('input').check();
    await expect(page.locator('#class-shuffle-input')).toBeEnabled();
    await page.locator('#class-create-btn').click();
    await expect(page.locator('#class-panel-lobby')).toBeVisible();
    expect(appels.find(a => a.action === 'create').modes).toEqual(['frise', 'ecart', 'avap']);
});

test('enseignant : l\'ordre aléatoire envoie les mêmes modes, dans un ordre quelconque', async ({ page }) => {
    await openThemeModes(page, 'thm_be');
    const etat = { courant: { code: 'ABC234', status: 'lobby', total: 7, isTeacher: true, players: [] }, reponses: { create: { body: { code: 'ABC234' } } } };
    const appels = await fauxServeur(page, etat);
    await page.locator('#mode-card-class').click();
    const lignes = page.locator('#class-modes-list li');
    for (const i of [1, 2, 3]) await lignes.nth(i).locator('input').check();
    await page.locator('#class-shuffle-input').check();
    await page.locator('#class-create-btn').click();
    await expect(page.locator('#class-panel-lobby')).toBeVisible();
    const modes = appels.find(a => a.action === 'create').modes;
    expect([...modes].sort()).toEqual(['avap', 'ecart', 'fil', 'frise']);
});

test('élève : la séance enchaîne les modes choisis, journal par mode, jusqu\'à l\'attente du classement', async ({ page }) => {
    test.setTimeout(150000);
    await openThemeModes(page, 'thm_be');
    const ids = await paquetDe8(page);
    const etat = {
        courant: { code: 'ABC234', status: 'running', total: 18, isTeacher: false, modes: ['avap', 'ecart', 'fil'], players: [], me: null },
        reponses: {
            join: { body: { status: 'running', lang: 'fr', themeName: 'Belgique', eventIds: ids, modes: ['avap', 'ecart', 'fil'] } },
            submit: { body: { score: 0, answered: 0, finished: false, rank: 1 } }
        }
    };
    const appels = await fauxServeur(page, etat);
    await page.evaluate(() => { showScreen('screen-categories'); initCategories(); });
    await page.evaluate(() => openTeam('screen-categories'));
    await page.locator('#team-class-code').fill('abc234');
    await page.locator('#team-class-name').fill('Léa');
    await page.locator('#team-class-btn').click();

    // 1. Avant / Après : 7 manches, un choix chacune.
    await expect(page.locator('#screen-avant-apres')).toBeVisible({ timeout: 8000 });
    for (let i = 0; i < 7; i++) {
        await page.waitForFunction(n => avapIndex === n && !isAnimating, i, { timeout: 8000 });
        await page.locator('#avap-option-a').click();
    }
    // 2. Trouve l'écart : 4 paires, la bonne réponse du premier coup.
    await expect(page.locator('#screen-ecart')).toBeVisible({ timeout: 8000 });
    for (let i = 0; i < 4; i++) {
        await page.waitForFunction(n => ecartIndex === n && !isAnimating, i, { timeout: 8000 });
        await page.evaluate(() => { ecartInput = String(ecartQuestions[ecartIndex].gap); updateEcartDisplay(); ecartSubmit(); });
    }
    // 3. Le fil du temps : 7 années, sans indice (le bouton est masqué).
    await expect(page.locator('#screen-fil')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#fil-hint-btn')).toBeHidden();
    for (let i = 0; i < 7; i++) {
        await page.waitForFunction(n => filIndex === n && !isAnimating, i, { timeout: 8000 });
        await page.evaluate(() => { const d = filEvents[filIndex].date; filInput = String(Math.abs(d)); filEra = d < 0 ? -1 : 1; updateFilDisplay(); filSubmit(); });
    }

    // Tout est joué : l'élève attend le classement, et le journal porte les trois modes.
    await expect(page.locator('#class-panel-live')).toBeVisible({ timeout: 8000 });
    const dernier = appels.filter(a => a.action === 'submit').pop();
    expect(dernier.logs.avap).toHaveLength(7);
    expect(dernier.logs.ecart).toHaveLength(4);
    expect(dernier.logs.ecart.every(r => r.guesses.length === 1)).toBe(true);
    expect(dernier.logs.fil).toHaveLength(7);
    expect(dernier.logs.avap.every(r => r.choice === 0)).toBe(true);
});

test('élève : quiz, remise en ordre, curseur, blitz et intrus s\'enchaînent sur le paquet, avec un journal par mode', async ({ page }) => {
    test.setTimeout(240000);
    await openThemeModes(page, 'thm_be');
    const ids = await paquetDe8(page);
    const modes = ['quiz', 'ordre', 'curseur', 'blitz', 'intrus'];
    const etat = {
        courant: { code: 'ABC234', status: 'running', total: 30, isTeacher: false, modes, players: [], me: null },
        reponses: {
            join: { body: { status: 'running', lang: 'fr', themeName: 'Belgique', eventIds: ids, modes } },
            submit: { body: { score: 0, answered: 0, finished: false, rank: 1 } }
        }
    };
    const appels = await fauxServeur(page, etat);
    // Les manches que le moteur commun bâtit sur ce paquet (« L'intrus » peut n'en avoir aucune sur huit cartes).
    const manches = await page.evaluate(({ ids, modes }) => {
        const index = new Map(getAllEventsWithLocation().map(i => [i.event.id, i.event]));
        const cards = ids.map(id => index.get(id));
        return Object.fromEntries(modes.map(m => [m, ClassModes.roundsFor(m, cards)]));
    }, { ids, modes });
    expect(manches.quiz).toBe(7);
    expect(manches.ordre).toBe(1);
    expect(manches.curseur).toBe(7);

    await page.evaluate(() => { showScreen('screen-categories'); initCategories(); });
    await page.evaluate(() => openTeam('screen-categories'));
    await page.locator('#team-class-code').fill('abc234');
    await page.locator('#team-class-name').fill('Léa');
    await page.locator('#team-class-btn').click();

    // 1. Quiz : une réponse par question, pas de 50/50.
    await expect(page.locator('#screen-quiz')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#quiz-fifty-btn')).toBeHidden();
    for (let i = 0; i < manches.quiz; i++) {
        await page.waitForFunction(n => quizIndex === n && !isAnimating, i, { timeout: 8000 });
        await page.locator('#quiz-options .quiz-option').first().click();
    }
    // 2. Remise en ordre : cinq cartes touchées, puis « suivant ».
    await expect(page.locator('#screen-ordre')).toBeVisible({ timeout: 8000 });
    for (let i = 0; i < manches.ordre; i++) {
        await page.waitForFunction(n => ordreIndex === n && !isAnimating, i, { timeout: 8000 });
        for (let c = 0; c < 5; c++) await page.locator('#ordre-cards .ordre-card:not(.placed)').first().click();
        await page.locator('#ordre-reveal button').click();
    }
    // 3. Le curseur : on valide au milieu.
    await expect(page.locator('#screen-curseur')).toBeVisible({ timeout: 8000 });
    for (let i = 0; i < manches.curseur; i++) {
        await page.waitForFunction(n => curseurIndex === n && !isAnimating, i, { timeout: 8000 });
        await page.locator('#curseur-validate').click();
    }
    // 4. Blitz : « vrai » à chaque énoncé, sans chronomètre.
    await expect(page.locator('#screen-blitz')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#blitz-clock')).toHaveText('');
    for (let i = 0; i < manches.blitz; i++) {
        await page.waitForFunction(n => blitzRight + blitzWrong === n && !isAnimating, i, { timeout: 8000 });
        await page.locator('#blitz-true').click();
    }
    // 5. L'intrus, s'il y a des manches : on désigne la première option.
    for (let i = 0; i < manches.intrus; i++) {
        await expect(page.locator('#screen-intrus')).toBeVisible({ timeout: 8000 });
        await page.waitForFunction(n => intrusIndex === n && !isAnimating, i, { timeout: 8000 });
        await page.locator('#intrus-options .intrus-option').first().click();
        await page.locator('#intrus-reveal button').click();
    }

    await expect(page.locator('#class-panel-live')).toBeVisible({ timeout: 10000 });
    const logs = appels.filter(a => a.action === 'submit').pop().logs;
    expect(logs.quiz).toHaveLength(manches.quiz);
    expect(logs.quiz.every(r => typeof r.choice === 'string')).toBe(true);
    expect(logs.ordre).toHaveLength(manches.ordre);
    expect(logs.ordre[0].order).toHaveLength(5);
    expect(logs.curseur).toHaveLength(manches.curseur);
    expect(logs.curseur.every(r => typeof r.guess === 'number')).toBe(true);
    expect(logs.blitz).toHaveLength(manches.blitz);
    expect(logs.blitz.every(r => r.answer === true)).toBe(true);
    expect((logs.intrus || []).length).toBe(manches.intrus);
});
