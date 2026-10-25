// Le quiz des pays (js/modes/geoquiz.js, js/geoQuizSessionCore.js) : réglages, partie, points, records, révision des erreurs, chrono,
// panaché, scores. Le moteur de questions est testé dans tests/geoQuizCore.test.js et tests/geoQuizSessionCore.test.js.

const { test, expect, visibleScreen } = require('./fixtures');

test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
        markRecapShownThisWeek();
        ['historiaxe_geoquiz_v1', 'historiaxe_geoquiz_prefs_v1'].forEach(k => localStorage.removeItem(k));
        showScreen('screen-categories');
        initCategories();
    });
});

async function openQuiz(page) {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Quiz des pays' }).click();
    expect(await visibleScreen(page)).toBe('screen-geoquiz');
}

const chip = (page, group, label) => page.locator(`#${group} .geoquiz-chip`, { hasText: new RegExp(`^${label}$`) });

// L'indice de la bonne réponse de la question affichée (QCM et drapeau).
const correctIndex = page => page.evaluate(() => {
    const q = geoQuizQuestions[geoQuizIndex];
    return q.options.findIndex(o => o.id === q.target);
});

// Joue la question affichée : bonne réponse, ou mauvaise si `right` est faux ; touche le centre du pays pour la carte.
async function playQuestion(page, right) {
    await page.locator('#geoquiz-play').waitFor({ state: 'visible' });
    const kind = await page.evaluate(() => geoQuizQuestions[geoQuizIndex].kind);
    if (kind === 'typed') {
        const answer = await page.evaluate(() => geoQuizQuestions[geoQuizIndex].answers[0]);
        await page.locator('#geoquiz-typed-input').fill(right ? answer : 'zzzz');
        await page.locator('#geoquiz-typed-input').press('Enter');
    } else if (kind === 'map') {
        await page.evaluate(right => {
            const q = geoQuizQuestions[geoQuizIndex];
            const target = countriesData.byId.get(q.target);
            // Une mauvaise réponse : le point opposé de la planète.
            geoQuizTap(right ? target.c[0] : ((target.c[0] + 180) % 360) - 180, right ? target.c[1] : -target.c[1]);
        }, right);
    } else {
        const good = await correctIndex(page);
        await page.locator('#geoquiz-options .quiz-option').nth(right ? good : (good + 1) % 4).click();
    }
    await page.locator('#geoquiz-next').click();
}

test('le menu propose les réglages (sans chrono par défaut), les formes et les scores, et retient le choix', async ({ page }) => {
    await openQuiz(page);
    for (const [group, label] of [['geoquiz-zone', 'Monde'], ['geoquiz-level', 'Facile'], ['geoquiz-length', '10'], ['geoquiz-timer-choice', 'Sans chrono']]) {
        await expect(chip(page, group, label)).toHaveAttribute('aria-pressed', 'true');
    }
    await expect(page.locator('#geoquiz-zone .geoquiz-chip')).toHaveCount(7);
    await expect(page.locator('#geoquiz-menu > .btn')).toHaveCount(12);   // 4 classiques, 5 autres façons, 2 défis, « Mes scores »
    await expect(page.locator('#geoquiz-level-hint')).toContainText('40 pays');
    await chip(page, 'geoquiz-level', 'Difficile').click();
    await expect(page.locator('#geoquiz-level-hint')).toContainText('Tous les pays');
    await chip(page, 'geoquiz-timer-choice', '30 s').click();
    await chip(page, 'geoquiz-zone', 'Europe').click();
    await expect(chip(page, 'geoquiz-zone', 'Europe')).toHaveAttribute('aria-pressed', 'true');
    await expect(chip(page, 'geoquiz-zone', 'Monde')).toHaveAttribute('aria-pressed', 'false');
    // Les réglages restent sur l'appareil : ils survivent à un retour au menu.
    await page.locator('#screen-geoquiz .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-arcade');
    await page.locator('.arcade-card', { hasText: 'Quiz des pays' }).click();
    await expect(chip(page, 'geoquiz-level', 'Difficile')).toHaveAttribute('aria-pressed', 'true');
    const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_geoquiz_prefs_v1')));
    expect(prefs).toEqual({ zone: 'europe', level: 'hard', length: 10, timer: 30 });
});

test('QCM sans faute : points avec série, premier record enregistré, synchronisé avec le compte', async ({ page }) => {
    await openQuiz(page);
    await chip(page, 'geoquiz-length', '5').click();
    await page.locator('#geoquiz-menu .btn', { hasText: 'QCM' }).click();
    await expect(page.locator('#geoquiz-progress')).toHaveText('Question 1 sur 5');
    await expect(page.locator('#geoquiz-timer')).toBeHidden();
    for (let i = 0; i < 5; i++) {
        await expect(page.locator('#geoquiz-progress')).toHaveText(`Question ${i + 1} sur 5`);
        await playQuestion(page, true);
    }
    // 100 + 110 + 120 + 130 + 140
    await expect(page.locator('#geoquiz-score')).toHaveText('600 points');
    await expect(page.locator('#geoquiz-detail')).toContainText('5 bonne(s) réponse(s) sur 5 · meilleure série : 5');
    await expect(page.locator('#geoquiz-record')).toContainText('Premier score enregistré');
    await expect(page.locator('#geoquiz-errors-title')).toHaveText('Sans faute : bravo !');
    await expect(page.locator('#geoquiz-replay-errors')).toBeHidden();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_geoquiz_v1')));
    expect(saved.best['qcm|world|easy|5|0'].score).toBe(600);
    expect(saved.history).toHaveLength(1);
    // Le compte : la clé fait partie de ce qui est envoyé au cloud.
    expect(await page.evaluate(() => Object.keys(exportSyncableState()))).toContain('historiaxe_geoquiz_v1');
});

test('les erreurs se listent et se rejouent, sans enregistrer la partie de révision ; le record ne baisse pas', async ({ page }) => {
    await openQuiz(page);
    await chip(page, 'geoquiz-length', '5').click();
    await page.locator('#geoquiz-menu .btn', { hasText: 'Drapeau' }).click();
    for (let i = 0; i < 5; i++) await playQuestion(page, i >= 2);   // deux erreurs, puis trois bonnes réponses
    await expect(page.locator('#geoquiz-errors-title')).toHaveText('À revoir');
    await expect(page.locator('#geoquiz-errors li')).toHaveCount(2);
    await expect(page.locator('#geoquiz-errors li').first()).toContainText(/bonne réponse/i);
    await expect(page.locator('#geoquiz-errors li').first()).toContainText(/votre réponse/i);
    await expect(page.locator('#geoquiz-score')).toHaveText('330 points');   // 0 + 0 + 100 + 110 + 120
    const first = await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_geoquiz_v1')));
    expect(first.history).toHaveLength(1);
    // Rejouer les deux erreurs : une partie de révision, qui ne s'enregistre pas.
    await page.locator('#geoquiz-replay-errors').click();
    await expect(page.locator('#geoquiz-progress')).toHaveText('Question 1 sur 2');
    await playQuestion(page, true);
    await playQuestion(page, true);
    await expect(page.locator('#geoquiz-record')).toContainText('Partie de révision');
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_geoquiz_v1')));
    expect(after.history).toHaveLength(1);
    // « Rejouer » relance une vraie partie (nouvelles questions, même forme), enregistrée.
    await page.locator('#geoquiz-end .btn', { hasText: /^Rejouer$/ }).click();
    await expect(page.locator('#geoquiz-progress')).toHaveText('Question 1 sur 5');
    for (let i = 0; i < 5; i++) await playQuestion(page, true);
    await expect(page.locator('#geoquiz-record')).toContainText('Nouveau record');
    const final = await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_geoquiz_v1')));
    expect(final.history).toHaveLength(2);
    expect(final.best['flag|world|easy|5|0'].score).toBe(600);
});

test('chrono : la barre s\'affiche, un temps écoulé compte comme une erreur sans réponse', async ({ page }) => {
    await openQuiz(page);
    await chip(page, 'geoquiz-length', '5').click();
    await chip(page, 'geoquiz-timer-choice', '15 s').click();
    await page.locator('#geoquiz-menu .btn', { hasText: 'QCM' }).click();
    await expect(page.locator('#geoquiz-timer')).toBeVisible();
    await expect(page.locator('#geoquiz-timer-text')).toHaveText(/^1[45] s$/);
    // On fait écouler le temps de la question affichée.
    await page.evaluate(() => { geoQuizTimerStart -= 20000; });
    await expect(page.locator('#geoquiz-feedback')).toContainText('Temps écoulé', { timeout: 3000 });
    await expect(page.locator('#geoquiz-options .quiz-option.correct')).toHaveCount(1);
    await expect(page.locator('#geoquiz-options .quiz-option:not([disabled])')).toHaveCount(0);
    await expect(page.locator('#geoquiz-points')).toHaveText('0 pts');
    await page.locator('#geoquiz-next').click();
    // Une réponse rapide rapporte le bonus de vitesse (jusqu'à 50 points de plus).
    await playQuestion(page, true);
    const points = await page.evaluate(() => geoQuizAnswers[1].points);
    expect(points).toBeGreaterThanOrEqual(140);
    expect(points).toBeLessThanOrEqual(150);
    for (let i = 0; i < 3; i++) await playQuestion(page, true);
    await expect(page.locator('#geoquiz-errors-title')).toHaveText('À revoir');
    await expect(page.locator('#geoquiz-errors li').first()).toContainText('temps écoulé');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_geoquiz_v1')));
    expect(Object.keys(saved.best)).toEqual(['qcm|world|easy|5|15']);
});

test('panaché : plusieurs formes dans une partie, chacune jouable, puis le score est enregistré', async ({ page }) => {
    await openQuiz(page);
    await chip(page, 'geoquiz-length', '20').click();
    await page.locator('#geoquiz-menu .btn', { hasText: 'Panaché' }).click();
    await expect(page.locator('#geoquiz-progress')).toHaveText('Question 1 sur 20');
    const kinds = await page.evaluate(() => geoQuizQuestions.map(q => q.kind));
    expect(kinds).toHaveLength(20);
    expect(new Set(kinds).size).toBeGreaterThanOrEqual(2);
    expect(kinds.every(k => ['qcm', 'flag', 'map', 'mapname', 'typed', 'fete', 'who'].includes(k))).toBe(true);
    const targets = await page.evaluate(() => geoQuizQuestions.map(q => q.target));
    expect(new Set(targets).size).toBe(20);
    for (let i = 0; i < 20; i++) await playQuestion(page, true);
    await expect(page.locator('#geoquiz-score')).toContainText(/^\d+ points$/);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_geoquiz_v1')));
    expect(Object.keys(saved.best)[0]).toBe('mix|world|easy|20|0');
});

test('la zone et la difficulté bornent les pays interrogés ; la Palestine n\'est jamais interrogée', async ({ page }) => {
    await openQuiz(page);
    await chip(page, 'geoquiz-zone', 'Afrique').click();
    await chip(page, 'geoquiz-level', 'Moyen').click();
    await chip(page, 'geoquiz-length', '20').click();
    await page.locator('#geoquiz-menu .btn', { hasText: 'QCM' }).click();
    await expect(page.locator('#geoquiz-progress')).toHaveText('Question 1 sur 20');
    const check = await page.evaluate(() => {
        const ids = geoQuizQuestions.map(q => q.target);
        return {
            allAfrica: ids.every(id => countriesData.byId.get(id).cont === 'Afrique'),
            palestine: GeoQuizSessionCore.quizPool(countriesData.facts, { level: 'hard' }).some(c => c.id === 'PSX'),
            withTerritories: GeoQuizSessionCore.quizPool(countriesData.facts, { level: 'hard' }).some(c => c.id === 'TWN')
        };
    });
    expect(check.allAfrica).toBe(true);
    expect(check.palestine).toBe(false);
    expect(check.withTerritories).toBe(true);
});

test('« Mes scores » : les records par réglage et les dernières parties ; vide au départ', async ({ page }) => {
    await openQuiz(page);
    await page.locator('#geoquiz-menu .btn', { hasText: 'Mes scores' }).click();
    await expect(page.locator('#geoquiz-scores-none')).toBeVisible();
    await page.locator('#geoquiz-scores .btn').click();
    await chip(page, 'geoquiz-length', '5').click();
    await page.locator('#geoquiz-menu .btn', { hasText: 'QCM' }).click();
    for (let i = 0; i < 5; i++) await playQuestion(page, true);
    await page.locator('#geoquiz-end .btn', { hasText: 'Changer de réglage' }).click();
    await page.locator('#geoquiz-menu .btn', { hasText: 'Mes scores' }).click();
    await expect(page.locator('#geoquiz-scores-none')).toBeHidden();
    await expect(page.locator('#geoquiz-records li')).toHaveCount(1);
    await expect(page.locator('#geoquiz-records li').first()).toContainText('600 pts');
    await expect(page.locator('#geoquiz-records li').first()).toContainText('QCM · Monde · Facile · 5 questions · Sans chrono');
    await expect(page.locator('#geoquiz-recent li')).toHaveCount(1);
});

// --- Les nouveaux modes -------------------------------------------------------------------------

const startForm = (page, label) => page.locator('#geoquiz-menu .btn', { hasText: label }).click();
const strip = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

test('saisie libre : accents, majuscules et fautes légères tolérés ; « je ne sais pas » et mauvaise réponse listées', async ({ page }) => {
    await openQuiz(page);
    await chip(page, 'geoquiz-length', '5').click();
    await startForm(page, 'Saisie libre');
    await expect(page.locator('#geoquiz-typed')).toBeVisible();
    await expect(page.locator('#geoquiz-options')).toBeHidden();
    // 1. une mauvaise réponse
    await page.locator('#geoquiz-typed-input').fill('zzzz');
    await page.locator('#geoquiz-typed .btn', { hasText: 'Valider' }).click();
    await expect(page.locator('#geoquiz-feedback')).toContainText('La bonne réponse était');
    await page.locator('#geoquiz-next').click();
    // 2. « Je ne sais pas »
    await page.locator('#geoquiz-typed .btn', { hasText: 'Je ne sais pas' }).click();
    await expect(page.locator('#geoquiz-feedback')).toContainText('La bonne réponse était');
    await expect(page.locator('#geoquiz-typed-input')).toBeDisabled();
    await page.locator('#geoquiz-next').click();
    // 3. sans accents ni majuscules, 4. avec majuscules, 5. exactement comme dans l'Atlas
    for (const mode of ['strip', 'upper', 'exact']) {
        const answer = await page.evaluate(() => geoQuizQuestions[geoQuizIndex].answers[0]);
        await page.locator('#geoquiz-typed-input').fill(mode === 'strip' ? strip(answer) : mode === 'upper' ? answer.toUpperCase() : answer);
        await page.locator('#geoquiz-typed-input').press('Enter');
        await expect(page.locator('#geoquiz-feedback')).toContainText('Bonne réponse');
        await page.locator('#geoquiz-next').click();
    }
    await expect(page.locator('#geoquiz-score')).toHaveText('330 points');   // 0 + 0 + 100 + 110 + 120
    await expect(page.locator('#geoquiz-errors li')).toHaveCount(2);
    await expect(page.locator('#geoquiz-errors li').first()).toContainText('votre réponse : zzzz');
    await expect(page.locator('#geoquiz-errors li').nth(1)).toContainText('sans réponse');
});

test('fêtes nationales : une fête désigne le pays, ou un pays sa fête', async ({ page }) => {
    await openQuiz(page);
    await chip(page, 'geoquiz-length', '5').click();
    await startForm(page, 'Fêtes nationales');
    const kinds = await page.evaluate(() => geoQuizQuestions.map(q => [q.kind, q.ask]));
    expect(kinds).toHaveLength(5);
    expect(kinds.every(([kind, ask]) => kind === 'fete' && (ask === 'name' || ask === 'fete'))).toBe(true);
    for (let i = 0; i < 5; i++) await playQuestion(page, true);
    await expect(page.locator('#geoquiz-score')).toHaveText('600 points');
});

test('qui suis-je ? : un indice de plus à chaque erreur ou à la demande ; chaque indice caché rapporte des points', async ({ page }) => {
    await openQuiz(page);
    await chip(page, 'geoquiz-length', '5').click();
    await startForm(page, 'Qui suis-je');
    await expect(page.locator('#geoquiz-clues li')).toHaveCount(1);
    const total = await page.evaluate(() => geoQuizQuestions[geoQuizIndex].clues.length);
    expect(total).toBeGreaterThanOrEqual(4);
    // Une mauvaise réponse : la proposition est écartée, un indice de plus apparaît, la question continue.
    const good = await correctIndex(page);
    await page.locator('#geoquiz-options .quiz-option').nth((good + 1) % 4).click();
    await expect(page.locator('#geoquiz-clues li')).toHaveCount(2);
    await expect(page.locator('#geoquiz-feedback')).toContainText('un indice de plus');
    await expect(page.locator('#geoquiz-options .quiz-option').nth((good + 1) % 4)).toBeDisabled();
    await expect(page.locator('#geoquiz-next')).toBeHidden();
    await page.locator('#geoquiz-options .quiz-option').nth(good).click();
    await page.locator('#geoquiz-next').click();
    const first = await page.evaluate(() => geoQuizAnswers[0].points);
    expect(first).toBe(100 + (total - 2) * 20);
    // La question suivante : demander un indice, puis répondre juste (série de 1 : + 10).
    const total2 = await page.evaluate(() => geoQuizQuestions[geoQuizIndex].clues.length);
    await page.locator('#geoquiz-who-more').click();
    await expect(page.locator('#geoquiz-clues li')).toHaveCount(2);
    await page.locator('#geoquiz-options .quiz-option').nth(await correctIndex(page)).click();
    await page.locator('#geoquiz-next').click();
    expect(await page.evaluate(() => geoQuizAnswers[1].points)).toBe(100 + 10 + (total2 - 2) * 20);
    // Le dernier indice montré : le bouton disparaît.
    for (let i = 0; i < 3; i++) await playQuestion(page, true);
    await expect(page.locator('#geoquiz-score')).toContainText(/^\d+ points$/);
});

test('pays mystère : distance et direction à chaque proposition, nom inconnu ou déjà proposé refusés', async ({ page }) => {
    await openQuiz(page);
    await chip(page, 'geoquiz-length', '5').click();
    await startForm(page, 'Pays mystère');
    await expect(page.locator('#geoquiz-mystery')).toBeVisible();
    await expect(page.locator('#geoquiz-timer')).toBeHidden();
    await expect(page.locator('#geoquiz-mystery-tries')).toHaveText('Essai 1 sur 6');
    const names = await page.evaluate(() => {
        const q = geoQuizQuestions[geoQuizIndex];
        const others = geoQuizEveryCountry().filter(c => c.id !== q.target).slice(0, 8).map(c => c.n);
        return { target: countriesData.byId.get(q.target).n, others };
    });
    const guess = async name => {
        await page.locator('#geoquiz-mystery-input').fill(name);
        await page.locator('#geoquiz-mystery-form .btn').click();
    };
    await guess('Zorglubland');
    await expect(page.locator('#geoquiz-feedback')).toContainText('pas dans la liste');
    await expect(page.locator('#geoquiz-guesses li')).toHaveCount(0);
    await guess(names.others[0]);
    await expect(page.locator('#geoquiz-guesses li')).toHaveCount(1);
    await expect(page.locator('#geoquiz-guesses li').first()).toContainText(/\d.* km .* % de proximité/);
    await expect(page.locator('#geoquiz-mystery-tries')).toHaveText('Essai 2 sur 6');
    await guess(names.others[0]);
    await expect(page.locator('#geoquiz-feedback')).toContainText('déjà proposé');
    await guess(names.target);
    await expect(page.locator('#geoquiz-feedback')).toContainText('Trouvé en 2 essai');
    await expect(page.locator('#geoquiz-points')).toHaveText(`${100 + 4 * 20} pts`);
    await page.locator('#geoquiz-next').click();
    // Six erreurs : le pays est révélé, la question compte pour rien.
    const second = await page.evaluate(() => {
        const q = geoQuizQuestions[geoQuizIndex];
        return { target: countriesData.byId.get(q.target).n, others: geoQuizEveryCountry().filter(c => c.id !== q.target).slice(0, 6).map(c => c.n) };
    });
    for (const name of second.others) await guess(name);
    await expect(page.locator('#geoquiz-feedback')).toContainText(`le pays mystère était ${second.target}`);
    await page.locator('#geoquiz-next').click();
    for (let i = 0; i < 3; i++) {
        const target = await page.evaluate(() => countriesData.byId.get(geoQuizQuestions[geoQuizIndex].target).n);
        await guess(target);
        await page.locator('#geoquiz-next').click();
    }
    await expect(page.locator('#geoquiz-errors li')).toHaveCount(1);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_geoquiz_v1')));
    expect(Object.keys(saved.best)).toEqual(['mystery|world|easy|5|0']);
});

test('carte → nom : le pays est surligné sur la carte, sans nom écrit, quatre noms à choisir', async ({ page }) => {
    await openQuiz(page);
    await chip(page, 'geoquiz-length', '5').click();
    await startForm(page, 'Carte → nom');
    const started = await page.locator('#geoquiz-play').waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
    test.skip(!started, 'la carte (WebGL) n\'est pas disponible dans ce navigateur');
    await expect(page.locator('#geoquiz-locate')).toBeVisible();
    await expect(page.locator('#geoquiz-card')).toBeHidden();
    await expect(page.locator('#geoquiz-options .quiz-option')).toHaveCount(4);
    await expect(page.locator('#geoquiz-locate-ask')).toContainText('Quel est ce pays');
    // Un clic sur la carte ne répond pas : seules les propositions comptent.
    await page.evaluate(() => geoQuizTap(0, 0));
    await expect(page.locator('#geoquiz-feedback')).toHaveText('');
    for (let i = 0; i < 5; i++) await playQuestion(page, true);
    await expect(page.locator('#geoquiz-score')).toHaveText('600 points');
});

test('rafale : 60 secondes pour tout, la question suivante arrive seule, la partie s\'arrête au bout du temps', async ({ page }) => {
    await openQuiz(page);
    await chip(page, 'geoquiz-timer-choice', '15 s').click();   // sans effet en Rafale
    await page.locator('#geoquiz-menu .btn', { hasText: 'Rafale' }).click();
    await expect(page.locator('#geoquiz-timer')).toBeVisible();
    await expect(page.locator('#geoquiz-timer-text')).toHaveText(/^(60|59) s$/);
    await expect(page.locator('#geoquiz-progress')).toHaveText('Question 1');
    for (let i = 1; i <= 3; i++) {
        await page.locator('#geoquiz-options .quiz-option').nth(await correctIndex(page)).click();
        await expect(page.locator('#geoquiz-next')).toBeHidden();
        await expect(page.locator('#geoquiz-progress')).toHaveText(`Question ${i + 1}`, { timeout: 3000 });
    }
    expect(await page.evaluate(() => geoQuizAnswers.map(a => a.points))).toEqual([100, 110, 120]);
    // Le temps s'écoule : la partie s'arrête, la question en cours n'est pas comptée.
    await page.evaluate(() => { geoQuizTimerStart -= 61000; });
    await expect(page.locator('#geoquiz-end')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#geoquiz-score')).toHaveText('330 points');
    await expect(page.locator('#geoquiz-detail')).toContainText('3 bonne(s) réponse(s) sur 3 question(s)');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_geoquiz_v1')));
    expect(Object.keys(saved.best)).toEqual(['burst|world|easy|0|0']);
    // Rien ne repart après la fin.
    await page.waitForTimeout(1600);
    await expect(page.locator('#geoquiz-end')).toBeVisible();
});

test('survie : trois vies, une par erreur ; la partie finit à la dernière', async ({ page }) => {
    await openQuiz(page);
    await page.locator('#geoquiz-menu .btn', { hasText: 'Survie' }).click();
    await expect(page.locator('#geoquiz-lives')).toHaveAttribute('aria-label', 'Vies : 3');
    await playQuestion(page, true);
    await expect(page.locator('#geoquiz-lives')).toHaveAttribute('aria-label', 'Vies : 3');
    // Trois erreurs : on ne peut plus continuer. (Les formes « qui suis-je ? » et « carte » se jouent différemment : on les passe.)
    let lost = 0;
    while (lost < 3) {
        const kind = await page.evaluate(() => geoQuizQuestions[geoQuizIndex].kind);
        if (kind === 'who') { await playQuestion(page, true); continue; }
        await playQuestion(page, false);
        lost++;
        if (lost < 3) await expect(page.locator('#geoquiz-lives')).toHaveAttribute('aria-label', `Vies : ${3 - lost}`);
    }
    await expect(page.locator('#geoquiz-end')).toBeVisible();
    await expect(page.locator('#geoquiz-errors li')).toHaveCount(3);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_geoquiz_v1')));
    expect(Object.keys(saved.best)).toEqual(['survival|world|easy|0|0']);
});
