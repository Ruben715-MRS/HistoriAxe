// La salle d'arcade (js/app/arcade.js : Snake chronologique, Tetris des siècles) et le convertisseur d'ères
// (js/app/eras.js) : le parcours depuis l'écran des catégories et la fiche du Chemin. Les règles sont testées
// dans tests/arcadeCore.test.js et tests/eraConverter.test.js.

const { test, expect, visibleScreen } = require('./fixtures');

test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
        markRecapShownThisWeek();
        ['historiaxe_arcade_v1', 'historiaxe_arcade_difficulty_v1', 'historiaxe_eras_v1', 'historiaxe_wheel_v1', 'historiaxe_advent_v1'].forEach(k => localStorage.removeItem(k));
        localStorage.setItem('historiaxe_path_v1', JSON.stringify({ levels: {}, skipped: [] }));
        showScreen('screen-categories');
        initCategories();
    });
});

test('la salle d\'arcade s\'ouvre depuis les catégories et mène aux deux jeux', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    expect(await visibleScreen(page)).toBe('screen-arcade');
    await expect(page.locator('#arcade-best-snake')).toContainText('Pas encore joué');
    await page.locator('.arcade-card', { hasText: 'Snake' }).click();
    expect(await visibleScreen(page)).toBe('screen-snake');
    await page.locator('#screen-snake .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-arcade');
    await page.locator('.arcade-card', { hasText: 'Tetris' }).click();
    expect(await visibleScreen(page)).toBe('screen-tetris');
    await page.locator('#screen-tetris .back-btn').click();
    await page.locator('#screen-arcade .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-categories');
});

test('Snake : trois pastilles lettrées (niveau moyen), un serpent qui avance, une fin de partie qui garde le score', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Snake' }).click();
    await expect(page.locator('#snake-difficulty .is-active')).toHaveText('Moyen');
    await page.locator('#snake-start').click();
    await expect(page.locator('#snake-legend .snake-legend-item')).toHaveCount(3);
    await expect(page.locator('#snake-status')).toContainText('3 vies'.replace('3 vies', '♥♥♥'));
    const x0 = await page.evaluate(() => snakeGame.snake[0].x);
    await expect.poll(() => page.evaluate(() => snakeGame.snake[0].x)).toBeGreaterThan(x0);
    // Tourner : la direction suivante est prise en compte.
    await page.locator('#screen-snake .arcade-key-down').click();
    expect(await page.evaluate(() => snakeGame.nextDir.y)).toBe(1);
    // Fin : on mange dans le désordre jusqu'à la dernière vie.
    await page.evaluate(() => {
        for (let i = 0; i < 3; i++) {
            const g = snakeGame;
            const food = g.foods.find(f => f.item === g.order[g.order.length - 1]);
            g.dir = g.nextDir = ArcadeCore.DIRS.right;
            food.x = g.snake[0].x + 1; food.y = g.snake[0].y;
            ArcadeCore.snakeStep(g);
        }
        snakeFinish();
    });
    await expect(page.locator('#snake-over')).toBeVisible();
    await expect(page.locator('#snake-over-list li').first()).toContainText('avant');
});

test('Tetris : un bloc bien rangé rapporte 10 points, un mauvais est rouge ; la partie se termine', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Tetris' }).click();
    await expect(page.locator('#tetris-heads .tetris-head')).toHaveCount(5);
    await page.locator('#tetris-start').click();
    await expect(page.locator('#tetris-banner')).toContainText('Dans quelle période');
    await page.evaluate(() => { ArcadeCore.tetrisMoveTo(tetrisGame, ArcadeCore.periodOf(tetrisGame.piece.event.date)); });
    await page.locator('#screen-tetris .arcade-key-wide').click();
    await expect(page.locator('#tetris-status')).toContainText('10 pts');
    // Le bouton d'une période y envoie le bloc.
    await page.locator('#tetris-heads .tetris-head').nth(4).click();
    expect(await page.evaluate(() => tetrisGame.piece.col)).toBe(4);
    // On empile jusqu'à la fin, dans la mauvaise colonne.
    await page.evaluate(() => {
        for (let i = 0; i < 60 && !tetrisGame.over; i++) { ArcadeCore.tetrisMoveTo(tetrisGame, 2); tetrisAfter(ArcadeCore.tetrisDrop(tetrisGame)); }
    });
    await expect(page.locator('#tetris-over')).toBeVisible();
    await page.locator('#screen-tetris .back-btn').click();
    await expect(page.locator('#arcade-best-tetris')).toContainText('Meilleur score');
});

test('Convertisseur d\'ères : ouvert depuis la fiche du niveau 3, huit questions, des étoiles à la fin', async ({ page }) => {
    await page.locator('#btn-path').click();
    await page.evaluate(() => pathOpenSheet('monde0-3'));
    await expect(page.locator('#path-sheet-game')).toContainText('convertisseur');
    await page.locator('#path-sheet-game').click();
    expect(await visibleScreen(page)).toBe('screen-eras');
    for (let i = 0; i < 8; i++) {
        await expect(page.locator('#eras-greg .eras-cell')).toHaveCount(5);
        if (i === 0) {
            // Une mauvaise réponse : la règle est expliquée.
            await page.evaluate(() => erasSlide(erasCurrent().era.max));
            await page.locator('#eras-check').click();
            await expect(page.locator('#eras-feedback-title')).toHaveText('Pas tout à fait…');
        } else {
            await page.evaluate(() => { const { q, era } = erasCurrent(); erasSlide(era.answers(q.g)[0]); });
            await page.locator('#eras-check').click();
            await expect(page.locator('#eras-feedback-title')).toHaveText('Juste !');
        }
        await page.locator('#eras-next').click();
    }
    await expect(page.locator('#eras-done')).toBeVisible();
    await expect(page.locator('#eras-done-stars')).toHaveText('★★★');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_eras_v1')))).toEqual({ stars: 3, errors: 1 });
});

test('Le niveau 5 propose les siècles romains et le Tetris ; aucun mini-jeu sur le niveau 2', async ({ page }) => {
    await page.locator('#btn-path').click();
    await page.evaluate(() => pathOpenSheet('monde0-5'));
    await expect(page.locator('#path-sheet-game')).toContainText('chiffres romains');
    await expect(page.locator('#path-sheet-game-2')).toContainText('Tetris');
    await page.locator('#path-sheet-game-2').click();
    expect(await visibleScreen(page)).toBe('screen-tetris');
    await page.locator('#screen-tetris .back-btn').click();
    await expect(page.locator('#screen-path')).toBeVisible();
    await page.evaluate(() => pathOpenSheet('monde0-5'));
    await page.locator('#path-sheet-game').click();
    expect(await visibleScreen(page)).toBe('screen-roman');
    await page.locator('#screen-roman .back-btn').click();
    await page.evaluate(() => pathOpenSheet('monde0-2'));
    await expect(page.locator('#path-sheet-game')).toBeHidden();
    await expect(page.locator('#path-sheet-game-2')).toBeHidden();
});

test('Pac-Man : un labyrinthe, une consigne, un bon et un mauvais bonbon, une partie qui se termine', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Pac-Man' }).click();
    expect(await visibleScreen(page)).toBe('screen-pacman');
    // Trois niveaux au choix avant de jouer ; moyen par défaut.
    await expect(page.locator('#pacman-difficulty .arcade-difficulty-btn')).toHaveCount(3);
    await expect(page.locator('#pacman-difficulty .is-active')).toHaveText('Moyen');
    await page.locator('#pacman-start').click();
    await expect(page.locator('#pacman-banner')).toContainText('Où est la date de');
    await expect(page.locator('#pacman-status')).toContainText('♥♥♥');
    // La consigne est lisible pendant le compte à rebours, et Pac-Man ne bouge pas avant le « Go ! ».
    await expect(page.locator('#pacman-countdown')).toBeVisible();
    const frozenAt = await page.evaluate(() => JSON.stringify(pacGame.player));
    expect(await page.evaluate(() => pacGame.frozen)).toBe(true);
    await expect(page.locator('#pacman-countdown')).toHaveText('Go !', { timeout: 6000 });
    await expect(page.locator('#pacman-countdown')).toBeHidden();
    // Pac-Man avance tout seul.
    const before = await page.evaluate(() => JSON.stringify(pacGame.player));
    await expect.poll(() => page.evaluate(() => JSON.stringify(pacGame.player))).not.toBe(before);
    // La bonne pastille : on le place à côté et on le laisse avancer.
    await page.evaluate(() => {
        pacmanStop();
        const g = pacGame;
        g.ghosts = [];
        g.lives = 3;
        ArcadeCore.pacRelease(g);
        const p = g.pellets.find(it => it.event === ArcadeCore.pacTarget(g));
        g.player = { x: p.x - 1, y: p.y };
        if (!ArcadeCore.pacOpen(g.player.x, g.player.y)) g.player = { x: p.x + 1, y: p.y };
        g.dir = g.nextDir = g.player.x < p.x ? ArcadeCore.DIRS.right : ArcadeCore.DIRS.left;
        pacmanLoop();
        pacmanStop();
    });
    await expect(page.locator('#pacman-message')).toContainText('Bien vu');
    // Une mauvaise : un message qui dit de quel événement il s'agit.
    await page.evaluate(() => {
        const g = pacGame;
        const p = g.pellets.find(it => it.event !== ArcadeCore.pacTarget(g));
        g.ghosts = [];
        ArcadeCore.pacRelease(g);
        g.player = { x: p.x - 1, y: p.y };
        if (!ArcadeCore.pacOpen(g.player.x, g.player.y)) g.player = { x: p.x + 1, y: p.y };
        g.dir = g.nextDir = g.player.x < p.x ? ArcadeCore.DIRS.right : ArcadeCore.DIRS.left;
        pacmanLoop();
        pacmanStop();
    });
    await expect(page.locator('#pacman-message')).toContainText('Pas celle-là');
    // Une vie perdue : le jeu se fige (le compte à rebours repart ensuite).
    expect(await page.evaluate(() => pacGame.frozen)).toBe(true);
    await page.evaluate(() => { pacGame.lives = 0; pacGame.over = true; pacmanFinish(); });
    await expect(page.locator('#pacman-over')).toBeVisible();
    await expect(page.locator('#pacman-over-list li').first()).toContainText('au lieu de');
});

test('Space Invaders : une période, des cartes qui descendent, un tir sur un anachronisme', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Space Invaders' }).click();
    expect(await visibleScreen(page)).toBe('screen-invaders');
    await page.locator('#invaders-start').click();
    await expect(page.locator('#invaders-banner')).toContainText('Période');
    // Les cartes arrivent d\'elles-mêmes.
    await expect.poll(() => page.evaluate(() => invGame.cards.length), { timeout: 8000 }).toBeGreaterThan(0);
    // Un anachronisme dans la voie du vaisseau : le tir le touche et dit pourquoi.
    await page.evaluate(() => {
        invadersStop();
        const g = invGame;
        const bad = g.queue.find(c => !c.good) || g.cards.find(c => !c.good);
        g.cards = [{ event: bad.event, good: false, lane: g.lane, y: 0.4 }];
        g.cooldown = 0;
    });
    await page.locator('#screen-invaders .arcade-key-wide').click();
    await expect(page.locator('#invaders-message')).toContainText('Bien vu');
    expect(await page.evaluate(() => invGame.score)).toBe(10);
    // Une carte de la période : un tir de trop coûte une vie.
    await page.evaluate(() => {
        const g = invGame;
        const good = g.queue.find(c => c.good) || { event: g.pool.find(e => ArcadeCore.periodOf(e.date) === g.period) };
        g.cards = [{ event: good.event, good: true, lane: g.lane, y: 0.4 }];
        g.cooldown = 0;
    });
    await page.locator('#screen-invaders .arcade-key-wide').click();
    await expect(page.locator('#invaders-message')).toContainText('Raté');
    expect(await page.evaluate(() => invGame.lives)).toBe(2);
    // Les boutons ◀ ▶ changent de voie.
    await page.locator('#screen-invaders .arcade-controls .arcade-key').first().click();
    expect(await page.evaluate(() => invGame.lane)).toBe(0);
    await page.evaluate(() => { invGame.lives = 0; invGame.over = true; invadersFinish(); });
    await expect(page.locator('#invaders-over')).toBeVisible();
});

test('la salle de jeux : quatre sections, dix-huit jeux, des mini-jeux qui reviennent au menu', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await expect(page.locator('#screen-arcade h2')).toHaveText('Salle de jeux');
    await expect(page.locator('#screen-arcade .games-section h3')).toHaveText(['Jeux géographiques', 'Mini-jeux', "Jeux d'arcade", 'Jeux de réflexion']);
    // Seize jeux d'origine, le quiz des pays et la carte « Villes du monde » (la section des jeux géographiques, en tête).
    await expect(page.locator('#screen-arcade .arcade-card')).toHaveCount(18);
    // Les cartes du menu disent où l'on en est.
    await expect(page.locator('#arcade-best-wheel')).toContainText('Pas encore joué');
    await page.evaluate(() => {
        localStorage.setItem('historiaxe_wheel_v1', JSON.stringify({ juif: { stars: 3, errors: 0 }, sikh: { stars: 2, errors: 3 } }));
        localStorage.setItem('historiaxe_eras_v1', JSON.stringify({ stars: 2, errors: 3 }));
    });
    // Un mini-jeu : la roue s'ouvre depuis le menu et y revient, avec sa progression à jour.
    await page.locator('.arcade-card', { hasText: 'La roue des fêtes' }).click();
    expect(await visibleScreen(page)).toBe('screen-wheel');
    await page.locator('#screen-wheel .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-arcade');
    await expect(page.locator('#arcade-best-wheel')).toContainText('2 / 38 calendriers terminés');
    await expect(page.locator('#arcade-best-eras')).toContainText('★★☆');
    await page.locator('.arcade-card', { hasText: "convertisseur d'ères" }).click();
    expect(await visibleScreen(page)).toBe('screen-eras');
    await page.locator('#screen-eras .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-arcade');
});

test('Memory : douze cartes, une erreur recachée, toutes les paires, un meilleur score au menu', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Memory' }).click();
    expect(await visibleScreen(page)).toBe('screen-memory');
    await expect(page.locator('#memory-difficulty .is-active')).toHaveText('Moyen');
    await page.locator('#memory-setup .btn').click();
    await expect(page.locator('#memory-grid .memory-card')).toHaveCount(12);
    await expect(page.locator('#memory-grid .is-back-date')).toHaveCount(0);
    await expect(page.locator('#memory-status')).toContainText('0 / 6');
    // Deux événements ne font pas une paire : message, erreur, puis les cartes se recachent.
    const events = await page.evaluate(() => memoryGame.cards.map((c, i) => c.side === 'event' ? i : -1).filter(i => i >= 0));
    await page.locator('#memory-grid .memory-card').nth(events[0]).click();
    await page.locator('#memory-grid .memory-card').nth(events[1]).click();
    await expect(page.locator('#memory-message')).toContainText('un événement ET une date');
    await expect(page.locator('#memory-status')).toContainText('Erreurs : 1');
    await expect(page.locator('#memory-grid .memory-card.is-up')).toHaveCount(2);
    await expect(page.locator('#memory-grid .memory-card.is-up')).toHaveCount(0);
    // Les six paires.
    for (let pair = 0; pair < 6; pair++) {
        const idx = await page.evaluate((pair) => [memoryGame.cards.findIndex(c => c.pair === pair && c.side === 'event'), memoryGame.cards.findIndex(c => c.pair === pair && c.side === 'date')], pair);
        await page.locator('#memory-grid .memory-card').nth(idx[0]).click();
        await page.locator('#memory-grid .memory-card').nth(idx[1]).click();
        await expect(page.locator('#memory-message')).toContainText('✓');
    }
    await expect(page.locator('#memory-over')).toBeVisible();
    await expect(page.locator('#memory-over-text')).toContainText('1 erreurs, 575 points');
    await page.locator('#screen-memory .back-btn').click();
    await expect(page.locator('#arcade-best-memory')).toContainText('575');
});

test('Qui suis-je ? : des indices un à un, une mauvaise réponse dévoile le suivant, six manches', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Qui suis-je' }).click();
    expect(await visibleScreen(page)).toBe('screen-who');
    await expect(page.locator('#who-status')).toContainText('Manche 1 / 6');
    await expect(page.locator('#who-options .who-option')).toHaveCount(4);
    // Un seul indice au départ ; « Un indice de plus » en ajoute un, sans le portrait avant la fin.
    await expect(page.locator('#who-clues .who-clue')).toHaveCount(1);
    await expect(page.locator('#who-portrait')).toBeHidden();
    await page.locator('#who-more').click();
    await expect(page.locator('#who-clues .who-clue')).toHaveCount(2);
    // Une mauvaise réponse : l'option est retirée et un indice de plus apparaît.
    const wrong = await page.evaluate(() => { const q = ReflexionCore.whoQuestion(whoGame); return q.options.find(o => o.id !== q.correctId).name; });
    await page.locator('#who-options .who-option', { hasText: wrong }).first().click();
    await expect(page.locator('#who-clues .who-clue')).toHaveCount(3);
    await expect(page.locator('#who-options .who-option.wrong')).toHaveCount(1);
    // Les six manches, en trouvant à chaque fois.
    for (let round = 0; round < 6; round++) {
        const name = await page.evaluate(() => ReflexionCore.whoQuestion(whoGame).name);
        await page.locator('#who-options .who-option:not([disabled])', { hasText: name }).first().click();
        await expect(page.locator('#who-feedback')).toBeVisible();
        await expect(page.locator('#who-portrait')).toBeVisible();
        await page.locator('#who-next').click();
    }
    await expect(page.locator('#who-over')).toBeVisible();
    await expect(page.locator('#who-over-text')).toContainText('6 figures trouvées sur 6');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_arcade_v1')).who)).toBeGreaterThan(0);
    await page.locator('#screen-who .back-btn').click();
    await expect(page.locator('#arcade-best-who')).toContainText('Meilleur score');
});

test('Cause ou conséquence ? : deux cartes, une explication à chaque réponse, huit questions', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Cause ou conséquence' }).click();
    expect(await visibleScreen(page)).toBe('screen-cause');
    await expect(page.locator('#cause-status')).toContainText('Question 1 / 8');
    await expect(page.locator('#cause-cards .cause-card')).toHaveCount(2);
    // Une mauvaise réponse : la bonne carte est montrée, avec le lien et l'explication.
    const wrongSide = await page.evaluate(() => { const q = ReflexionCore.causeQuestion(causeGame); return 1 - (q.kind === 'cause' ? q.causeSide : 1 - q.causeSide); });
    await page.locator(`#cause-cards .cause-card[data-side="${wrongSide}"]`).click();
    await expect(page.locator('#cause-feedback-title')).toHaveText('Pas tout à fait…');
    await expect(page.locator('#cause-cards .cause-card.correct')).toHaveCount(1);
    await expect(page.locator('#cause-cards .cause-card.wrong')).toHaveCount(1);
    await expect(page.locator('#cause-feedback-links')).toContainText('a provoqué');
    await expect(page.locator('#cause-feedback-text')).not.toBeEmpty();
    await page.locator('#cause-next').click();
    // Les sept autres, justes.
    for (let i = 0; i < 7; i++) {
        const side = await page.evaluate(() => { const q = ReflexionCore.causeQuestion(causeGame); return q.kind === 'cause' ? q.causeSide : 1 - q.causeSide; });
        await page.locator(`#cause-cards .cause-card[data-side="${side}"]`).click();
        await expect(page.locator('#cause-feedback-title')).toHaveText('Juste !');
        await page.locator('#cause-next').click();
    }
    await expect(page.locator('#cause-over')).toBeVisible();
    await expect(page.locator('#cause-over-text')).toContainText('7 bonnes réponses sur 8, 700 points');
    await page.locator('#screen-cause .back-btn').click();
    await expect(page.locator('#arcade-best-cause')).toContainText('700');
});

test('Chasse aux anachronismes : désigner, valider, voir pourquoi, cinq scènes', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Chasse aux anachronismes' }).click();
    expect(await visibleScreen(page)).toBe('screen-scene');
    await page.locator('#scene-setup .btn').click();
    await expect(page.locator('#scene-status')).toContainText('Scène 1 / 5');
    await expect(page.locator('#scene-grid .scene-tile')).toHaveCount(8);
    await expect(page.locator('#scene-check')).toContainText('Rien à signaler');
    // Première scène : un élément à sa place désigné à tort, un seul anachronisme trouvé.
    const first = await page.evaluate(() => {
        const scene = ReflexionCore.sceneRound(sceneGame).scene;
        return { bad: scene.elements.findIndex(e => e.anachronism), ok: scene.elements.findIndex(e => !e.anachronism), total: ReflexionCore.sceneTotal(scene) };
    });
    await page.locator(`#scene-grid .scene-tile[data-index="${first.bad}"]`).click();
    await page.locator(`#scene-grid .scene-tile[data-index="${first.ok}"]`).click();
    await expect(page.locator('#scene-check')).toContainText('2 désigné');
    await expect(page.locator(`#scene-grid .scene-tile[data-index="${first.ok}"]`)).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#scene-check').click();
    await expect(page.locator('#scene-grid .scene-tile.is-found')).toHaveCount(1);
    await expect(page.locator('#scene-grid .scene-tile.is-wrong')).toHaveCount(1);
    await expect(page.locator('#scene-grid .scene-tile.is-missed')).toHaveCount(first.total - 1);
    await expect(page.locator('#scene-feedback-list li')).toHaveCount(first.total + 1);
    await expect(page.locator('#scene-feedback-list')).toContainText('Pas un anachronisme');
    await page.locator('#scene-next').click();
    // Les quatre autres, parfaites.
    for (let i = 0; i < 4; i++) {
        const bad = await page.evaluate(() => ReflexionCore.sceneRound(sceneGame).scene.elements.map((e, i) => e.anachronism ? i : -1).filter(i => i >= 0));
        for (const idx of bad) await page.locator(`#scene-grid .scene-tile[data-index="${idx}"]`).click();
        await page.locator('#scene-check').click();
        await expect(page.locator('#scene-feedback-title')).toContainText('+100 pts');
        await page.locator('#scene-next').click();
    }
    await expect(page.locator('#scene-over')).toBeVisible();
    await expect(page.locator('#scene-over-list li')).toHaveCount(5);
    await page.locator('#screen-scene .back-btn').click();
    await expect(page.locator('#arcade-best-scene')).toContainText('Meilleur score');
});

test('Siècles en chiffres romains : dix questions de quatre sortes, un siècle remis à l\'ordre, un meilleur score', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Siècles en chiffres romains' }).click();
    expect(await visibleScreen(page)).toBe('screen-roman');
    await expect(page.locator('#roman-status')).toContainText('Question 1 / 10');
    // La première question est un chiffre romain à lire : il s'affiche en grand.
    await expect(page.locator('#roman-numeral')).toBeVisible();
    const wrong = await page.evaluate(() => { const q = MiniGamesCore.romanQuestion(romanGame); return (q.answer + 1) % 4; });
    await page.locator(`#roman-options .quiz-option[data-choice="${wrong}"]`).click();
    await expect(page.locator('#roman-feedback-title')).toHaveText('Pas tout à fait…');
    await expect(page.locator('#roman-options .quiz-option.correct')).toHaveCount(1);
    await expect(page.locator('#roman-feedback-text')).toContainText('=');
    await page.locator('#roman-next').click();
    // Les neuf autres, justes ; les questions d'ordre se jouent en touchant les siècles un à un.
    for (let i = 0; i < 9; i++) {
        const q = await page.evaluate(() => { const x = MiniGamesCore.romanQuestion(romanGame); return { type: x.type, answer: x.answer, order: x.order }; });
        if (q.type === 'order') {
            await expect(page.locator('#roman-prompt')).toContainText('du plus ancien au plus récent');
            // Un mauvais siècle d'abord : message, puis le bon ordre.
            await page.locator(`#roman-options .roman-tile[data-item="${q.order[3]}"]`).click();
            await expect(page.locator('#roman-feedback-title')).toContainText('Pas celui-là');
            for (const item of q.order) await page.locator(`#roman-options .roman-tile[data-item="${item}"]`).click();
            await expect(page.locator('#roman-feedback-title')).toContainText('1 erreur');
        } else {
            await page.locator(`#roman-options .quiz-option[data-choice="${q.answer}"]`).click();
            await expect(page.locator('#roman-feedback-title')).toHaveText('Juste !');
        }
        await page.locator('#roman-next').click();
    }
    await expect(page.locator('#roman-over')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_arcade_v1')).roman)).toBeGreaterThan(500);
    await page.locator('#screen-roman .back-btn').click();
    await expect(page.locator('#arcade-best-roman')).toContainText('Meilleur score');
});

test('Calendrier de l\'Avent : un 12 décembre, la case du jour s\'ouvre, les suivantes sont fermées, la carte du menu aussi', async ({ page }) => {
    await page.evaluate(() => { adventNow = () => new Date(2026, 11, 12); initCategories(); });
    // Le menu principal : une carte spéciale, avec la case du jour.
    const card = page.locator('#btn-advent');
    await expect(card).toBeVisible();
    await expect(card).toContainText('12 décembre');
    await expect(card).toContainText('Plus que 13 jour');
    await expect(card).toContainText('premier signal radio');
    await expect(card).toContainText('Case du jour à ouvrir');
    await card.click();
    expect(await visibleScreen(page)).toBe('screen-advent');
    await expect(page.locator('#advent-grid .advent-day')).toHaveCount(31);
    await expect(page.locator('#advent-grid .advent-day.is-locked')).toHaveCount(19);
    await expect(page.locator('#advent-grid .advent-day.is-selected')).toHaveText('12');
    await expect(page.locator('#advent-case-question')).toContainText('en quelle année');
    await expect(page.locator('#advent-options .advent-option')).toHaveCount(4);
    // Une case fermée dit quand elle s'ouvrira.
    await page.locator('#advent-grid .advent-day[data-day="13"]').click();
    await expect(page.locator('#advent-case-question')).toContainText("s'ouvrira le 13 décembre");
    await expect(page.locator('#advent-options .advent-option')).toHaveCount(0);
    // La case du jour : on répond, elle se marque et ne se rejoue pas.
    await page.locator('#advent-grid .advent-day[data-day="12"]').click();
    await page.locator('#advent-options .advent-option', { hasText: '1901' }).click();
    await expect(page.locator('#advent-feedback-title')).toHaveText('Juste !');
    await expect(page.locator('#advent-feedback-text')).toContainText('Marconi');
    await expect(page.locator('#advent-grid .advent-day[data-day="12"]')).toHaveClass(/is-right/);
    await expect(page.locator('#advent-status')).toContainText('1 cases ouvertes · 1 trouvées');
    await page.locator('#advent-grid .advent-day[data-day="1"]').click();
    await page.locator('#advent-options .advent-option').first().click();
    await page.locator('#advent-grid .advent-day[data-day="12"]').click();
    await expect(page.locator('#advent-feedback-title')).toContainText('déjà ouverte');
    await expect(page.locator('#advent-options .advent-option')).toHaveCount(0);
    // Retour au menu : la carte du jour dit que la case est ouverte.
    await page.locator('#screen-advent .back-btn').click();
    await expect(page.locator('#btn-advent')).toContainText('Case du jour ouverte');
});

test('Calendrier de l\'Avent : chaque jour de décembre a son affichage, hors décembre il n\'y en a pas et tout est ouvert', async ({ page }) => {
    const seen = await page.evaluate(() => {
        const out = [];
        for (let day = 1; day <= 31; day++) {
            adventNow = () => new Date(2026, 11, day);
            const card = adventHomeCard();
            out.push({ icon: card.querySelector('.advent-card-icon').textContent, kicker: card.querySelector('.resume-card-kicker').textContent, hue: card.style.getPropertyValue('--advent-hue') });
        }
        return out;
    });
    expect(new Set(seen.map(c => c.icon)).size).toBe(31);
    expect(new Set(seen.map(c => c.hue)).size).toBeGreaterThan(25);
    expect(seen[0].kicker).toContain('Plus que 24 jour');
    expect(seen[23].kicker).toContain('Plus que 1 jour');
    expect(seen[24].kicker).toContain('Joyeux Noël');
    expect(seen[30].kicker).toContain('Entre Noël et le Nouvel An');
    await page.evaluate(() => { adventNow = () => new Date(2026, 6, 4); initCategories(); });
    await expect(page.locator('#btn-advent')).toHaveCount(0);
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: "Calendrier de l'Avent" }).click();
    expect(await visibleScreen(page)).toBe('screen-advent');
    await expect(page.locator('#advent-grid .advent-day.is-locked')).toHaveCount(0);
    await expect(page.locator('#advent-rule')).toContainText('Hors décembre');
});

test('Casse-briques : cinq briques, la balle part au lancer, la plus ancienne se casse, une autre coûte une vie', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Casse-briques' }).click();
    expect(await visibleScreen(page)).toBe('screen-breakout');
    await page.locator('#breakout-start').click();
    await expect(page.locator('#breakout-status')).toContainText('♥♥♥');
    expect(await page.evaluate(() => boGame.bricks.length)).toBe(5);
    expect(await page.evaluate(() => boGame.ball.stuck)).toBe(true);
    await page.locator('#screen-breakout .arcade-key-wide').click();
    await expect.poll(() => page.evaluate(() => boGame.ball.stuck)).toBe(false);
    // On fige la boucle pour viser : la balle sous la plus ancienne brique.
    await page.evaluate(() => {
        breakoutStop();
        const target = ArcadeExtraCore.breakoutTarget(boGame);
        boGame.ball.x = target.x + target.w / 2; boGame.ball.y = target.y + target.h + 9; boGame.ball.vx = 0; boGame.ball.vy = -ArcadeExtraCore.breakoutSpeed(boGame);
        breakoutAfter(ArcadeExtraCore.breakoutStep(boGame, 0.05));
    });
    await expect(page.locator('#breakout-message')).toContainText('✓');
    expect(await page.evaluate(() => boGame.bricks.length)).toBe(4);
    await page.evaluate(() => {
        const target = ArcadeExtraCore.breakoutTarget(boGame);
        const other = boGame.bricks.find(b => b !== target);
        boGame.ball.x = other.x + other.w / 2; boGame.ball.y = other.y + other.h + 9; boGame.ball.vx = 0; boGame.ball.vy = -ArcadeExtraCore.breakoutSpeed(boGame);
        breakoutAfter(ArcadeExtraCore.breakoutStep(boGame, 0.05));
    });
    await expect(page.locator('#breakout-message')).toContainText('Pas celle-ci');
    await expect(page.locator('#breakout-status')).toContainText('♥♥ ');
    await page.evaluate(() => { boGame.lives = 0; boGame.over = true; breakoutFinish(); });
    await expect(page.locator('#breakout-over')).toBeVisible();
    await expect(page.locator('#breakout-over-list li').first()).toContainText('avant');
    await page.locator('#screen-breakout .back-btn').click();
    await expect(page.locator('#arcade-best-breakout')).toContainText('Meilleur score');
});

test('Flappy Clio : Clio attend le premier battement, vole, passe une porte et finit sa partie', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Flappy Clio' }).click();
    expect(await visibleScreen(page)).toBe('screen-flappy');
    await page.locator('#flappy-start').click();
    await expect(page.locator('#flappy-banner')).toContainText('grande ouverture');
    expect(await page.evaluate(() => flGame.gates.length)).toBe(8);
    const y0 = await page.evaluate(() => flGame.clio.y);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => flGame.clio.y)).toBe(y0);
    await page.locator('#screen-flappy .arcade-key-wide').click();
    await expect.poll(() => page.evaluate(() => flGame.started)).toBe(true);
    // Une porte franchie par la bonne ouverture : le banner donne le repère.
    await page.evaluate(() => {
        flappyStop();
        flGame.invulnerable = 0; flGame.started = true; flGame.waiting = false;
        const gate = flGame.gates.find(g => !g.done);
        gate.x = flGame.clio.x - gate.w / 2;
        flGame.clio.y = gate.gaps.find(p => p.correct).y; flGame.clio.vy = 0;
        flappyAfter(ArcadeExtraCore.flappyStep(flGame, 0.01));
    });
    await expect(page.locator('#flappy-message')).toContainText('✓');
    await expect(page.locator('#flappy-banner')).toContainText('Dernier repère');
    await page.evaluate(() => { flGame.lives = 0; flGame.over = true; flappyFinish(); });
    await expect(page.locator('#flappy-over')).toBeVisible();
    await page.locator('#screen-flappy .back-btn').click();
    await expect(page.locator('#arcade-best-flappy')).toContainText('Meilleur score');
});

test('Course de chars : pas de minuteur, l\'adversaire avance seul, départ à droite, récapitulatif ; puis à deux avec passage de l\'appareil', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Course de chars' }).click();
    expect(await visibleScreen(page)).toBe('screen-race');
    await expect(page.locator('#race-setup .btn')).toHaveCount(4);
    await page.locator('#race-setup .btn', { hasText: 'facile' }).click();
    await expect(page.locator('#race-track .race-lane')).toHaveCount(2);
    await expect(page.locator('#race-options .advent-option')).toHaveCount(4);
    await expect(page.locator('#race-timer-fill, #race-next')).toHaveCount(0);
    // Les chevaux partent de la droite, la ligne d'arrivée est à gauche.
    const lefts = () => page.evaluate(() => raceCars.map(c => parseFloat(c.style.left)));
    const flagLeft = await page.evaluate(() => { const f = document.querySelector('.race-flag'); const r = f.getBoundingClientRect(), road = f.parentElement.getBoundingClientRect(); return r.left - road.left; });
    expect(flagLeft).toBeLessThan(20);
    const start = await lefts();
    expect(start[0]).toBeGreaterThan(90);
    expect(start[1]).toBeGreaterThan(90);
    // L'adversaire avance sans qu'on réponde.
    await expect.poll(async () => (await lefts())[1], { timeout: 15_000 }).toBeLessThan(start[1] - 1);
    expect((await lefts())[0]).toBe(start[0]);
    // Une bonne réponse : une case, la bonne réponse reste visible, puis la question suivante arrive d'elle-même.
    const first = await page.evaluate(() => ({ answer: raceGame.question.answer, title: raceGame.question.event.title }));
    await page.locator(`#race-options .advent-option[data-year="${first.answer}"]`).click();
    await expect(page.locator('#race-feedback-title')).toContainText('Juste');
    await expect(page.locator('#race-options .advent-option.correct')).toHaveCount(1);
    await expect(page.locator('#race-status')).toContainText(/1 \/ 12/);
    await expect(page.locator('#race-feedback')).toBeHidden({ timeout: 3_000 });
    await expect(page.locator('#race-question')).not.toContainText(first.title);
    expect((await lefts())[0]).toBeLessThan(start[0] - 5);
    // Une mauvaise réponse : pas d'avance.
    const wrongYear = await page.evaluate(() => raceGame.question.options.find(y => y !== raceGame.question.answer));
    const posBefore = await page.evaluate(() => raceGame.pos[0]);
    await page.locator(`#race-options .advent-option[data-year="${wrongYear}"]`).click();
    await expect(page.locator('#race-feedback-title')).toHaveText('Pas tout à fait…');
    expect(await page.evaluate(() => raceGame.pos[0])).toBe(posBefore);
    await expect(page.locator('#race-feedback')).toBeHidden({ timeout: 3_000 });
    // Jusqu'à l'arrivée : douze bonnes réponses en tout, sans autre bouton que les années.
    for (let i = 0; i < 14; i++) {
        if (await page.locator('#race-over').isVisible()) break;
        await page.locator('#race-options .advent-option:not([disabled])').first().waitFor();
        const a = await page.evaluate(() => raceGame.question.answer);
        await page.locator(`#race-options .advent-option[data-year="${a}"]`).click();
        await page.waitForTimeout(1_150);
    }
    await expect(page.locator('#race-over')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#race-over-title')).toHaveText('Victoire !');
    // Le récapitulatif : toutes les questions, avec leurs réussites et l'erreur.
    const total = await page.evaluate(() => raceGame.history.length);
    await expect(page.locator('#race-over-list li')).toHaveCount(total);
    await expect(page.locator('#race-over-list li.race-recap-wrong')).toHaveCount(1);
    await expect(page.locator('#race-over-list li.race-recap-wrong')).toContainText('réponse donnée');
    await expect(page.locator('#race-over-list li.race-recap-right').first()).toContainText('✓');
    await expect(page.locator('#race-recap-title')).toContainText(`12 bonne(s) réponse(s) sur ${total}`);
    await page.locator('#race-over .btn').click();
    await expect(page.locator('#race-setup')).toBeVisible();
    // À deux : la question du joueur 2 reste cachée jusqu'au « Prêt ».
    await page.locator('#race-setup .race-duo').click();
    await expect(page.locator('#race-turn')).toContainText('Joueur 1');
    const a1 = await page.evaluate(() => raceGame.question.answer);
    await page.locator(`#race-options .advent-option[data-year="${a1}"]`).click();
    await expect(page.locator('#race-handover')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('#race-play')).toBeHidden();
    await expect(page.locator('#race-handover-title')).toContainText('Joueur 2');
    await page.locator('#race-handover .btn').click();
    await expect(page.locator('#race-play')).toBeVisible();
    await expect(page.locator('#race-turn')).toContainText('Joueur 2');
    await page.locator('#screen-race .back-btn').click();
    expect(await visibleScreen(page)).toBe('screen-arcade');
});

test('Course de chars : l\'adversaire qui franchit la ligne le premier met fin à la course, récapitulatif compris', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Course de chars' }).click();
    await page.locator('#race-setup .btn', { hasText: 'difficile' }).click();
    await page.evaluate(() => { raceGame.pos[1] = raceGame.length - 0.05; });
    await expect(page.locator('#race-over')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#race-over-title')).toHaveText('Défaite…');
    await expect(page.locator('#race-play')).toBeHidden();
    await expect(page.locator('#race-recap-title')).toContainText('0 bonne(s) réponse(s) sur 0');
    expect(await page.evaluate(() => raceMusicTimer)).toBe(0);
});

test('la salle de jeux ne tire que des événements ⭐ incontournables (le vivier et les figures de « Qui suis-je ? »)', async ({ page }) => {
    await page.waitForFunction(() => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === 'thm_aut')), null, { timeout: 45_000 });
    const result = await page.evaluate(() => {
        const items = PathCore.flattenEvents(window.bdd);
        const essential = new Set(items.filter(i => i.essential).map(i => i.id));
        const pool = arcadePool();
        const figures = whoFigures().known;
        return {
            pool: pool.length,
            poolOutside: pool.filter(e => !essential.has(e.id)).length,
            figures: figures.length,
            figuresOutside: figures.filter(e => !essential.has(e.id)).length
        };
    });
    expect(result.pool).toBeGreaterThan(100);
    expect(result.poolOutside).toBe(0);
    expect(result.figures).toBeGreaterThan(40);
    expect(result.figuresOutside).toBe(0);
});

test('Pendu des dates : des chiffres à proposer, une année entière avec « plus tôt / plus tard », cinq événements', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Pendu des dates' }).click();
    expect(await visibleScreen(page)).toBe('screen-hangman');
    await page.locator('#hangman-setup .btn').click();
    await expect(page.locator('#hangman-status')).toContainText('Événement 1 / 5');
    await expect(page.locator('#hangman-pad .hangman-digit')).toHaveCount(10);
    const info = await page.evaluate(() => { const q = ReflexionCore.hangmanQuestion(hangmanGame); return { digits: q.digits, date: q.event.date }; });
    await expect(page.locator('#hangman-slots .hangman-slot')).toHaveCount(info.digits.length);
    // Un chiffre qui n'y est pas : une vie de moins.
    const absent = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].find(d => !info.digits.includes(String(d)));
    await page.locator(`#hangman-pad .hangman-digit[data-digit="${absent}"]`).click();
    await expect(page.locator('#hangman-lives')).toHaveAttribute('aria-label', '3 vies');
    await expect(page.locator(`#hangman-pad .hangman-digit[data-digit="${absent}"]`)).toHaveClass(/wrong/);
    // Un chiffre qui y est : il se dévoile.
    await page.locator(`#hangman-pad .hangman-digit[data-digit="${info.digits[0]}"]`).click();
    await expect(page.locator('#hangman-slots .hangman-slot.is-found').first()).toHaveText(info.digits[0]);
    // Une année entière fausse : « plus tôt » ou « plus tard ».
    const tooLate = Math.abs(info.date) + 400 > 9999 ? 9999 : Math.abs(info.date) + 400;
    await page.locator('#hangman-year').fill(String(tooLate));
    if (info.date < 0) await page.locator('#hangman-year-bc').check();
    await page.locator('#hangman-try button').click();
    await expect(page.locator('#hangman-hint')).toBeVisible();
    await expect(page.locator('#hangman-hint')).toContainText(/plus (TÔT|TARD)/);
    // La bonne année : gagné.
    await page.locator('#hangman-year').fill(String(Math.abs(info.date)));
    if (info.date < 0) await page.locator('#hangman-year-bc').check(); else await page.locator('#hangman-year-bc').uncheck();
    await page.locator('#hangman-try button').click();
    await expect(page.locator('#hangman-feedback-title')).toContainText('Trouvé');
    await page.locator('#hangman-next').click();
    for (let i = 0; i < 4; i++) {
        const d = await page.evaluate(() => ReflexionCore.hangmanQuestion(hangmanGame).event.date);
        await page.locator('#hangman-year').fill(String(Math.abs(d)));
        if (d < 0) await page.locator('#hangman-year-bc').check();
        await page.locator('#hangman-try button').click();
        await page.locator('#hangman-next').click();
    }
    await expect(page.locator('#hangman-over')).toBeVisible();
    await expect(page.locator('#hangman-over-list li')).toHaveCount(5);
    await page.locator('#screen-hangman .back-btn').click();
    await expect(page.locator('#arcade-best-hangman')).toContainText('Meilleur score');
});

test('Difficulté : le niveau choisi est retenu, change les règles (pendu, anachronismes) et pèse sur le score', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    // Pendu, facile : six vies et le premier chiffre offert.
    await page.locator('.arcade-card', { hasText: 'Pendu des dates' }).click();
    await page.locator('#hangman-difficulty .arcade-difficulty-btn', { hasText: 'Facile' }).click();
    await expect(page.locator('#hangman-difficulty')).toContainText('premier chiffre offert');
    await page.locator('#hangman-setup .btn').click();
    await expect(page.locator('#hangman-lives')).toHaveAttribute('aria-label', '6 vies');
    const info = await page.evaluate(() => { const q = ReflexionCore.hangmanQuestion(hangmanGame); return { digits: q.digits }; });
    if (info.digits.length >= 3) {
        await expect(page.locator('#hangman-slots .hangman-slot.is-found').first()).toHaveText(info.digits[0]);
        await expect(page.locator(`#hangman-pad .hangman-digit[data-digit="${info.digits[0]}"]`)).toBeDisabled();
    }
    // Le score compté : ×0,5 en facile.
    await page.evaluate(() => { hangmanGame.score = 200; hangmanGame.over = true; hangmanFinish(); });
    await expect(page.locator('#hangman-over-text')).toContainText('Facile ×0,5 : 100 pts comptés');
    await expect(page.locator('#hangman-over-text')).toContainText('Meilleur score : 100');
    await page.locator('#screen-hangman .back-btn').click();
    // Retenu d'une visite à l'autre.
    await page.locator('.arcade-card', { hasText: 'Pendu des dates' }).click();
    await expect(page.locator('#hangman-difficulty .is-active')).toHaveText('Facile');
    await page.locator('#hangman-difficulty .arcade-difficulty-btn', { hasText: 'Difficile' }).click();
    await page.locator('#hangman-setup .btn').click();
    await expect(page.locator('#hangman-lives')).toHaveAttribute('aria-label', '3 vies');
    await page.locator('#screen-hangman .back-btn').click();
    // Anachronismes, facile : le nombre d'intrus est annoncé.
    await page.locator('.arcade-card', { hasText: 'Chasse aux anachronismes' }).click();
    await page.locator('#scene-difficulty .arcade-difficulty-btn', { hasText: 'Facile' }).click();
    await page.locator('#scene-setup .btn').click();
    await expect(page.locator('#scene-intro')).toContainText('Intrus à trouver :');
});

test('Memory : facile, le dos des cartes dit leur genre (couleur et symbole) ; difficile, dix-huit cartes', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Memory' }).click();
    await page.locator('#memory-difficulty .arcade-difficulty-btn', { hasText: 'Facile' }).click();
    await page.locator('#memory-setup .btn').click();
    await expect(page.locator('#memory-grid .memory-card')).toHaveCount(12);
    await expect(page.locator('#memory-grid .is-back-date')).toHaveCount(6);
    await expect(page.locator('#memory-grid .is-back-event')).toHaveCount(6);
    await expect(page.locator('#memory-grid .is-back-date').first()).toHaveText('📅');
    await expect(page.locator('#memory-grid .is-back-event').first()).toHaveAttribute('aria-label', /face cachée : événement/);
    // Retourner une carte la montre face visible, sans la couleur du dos.
    await page.locator('#memory-grid .is-back-date').first().click();
    await expect(page.locator('#memory-grid .memory-card.is-up')).toHaveCount(1);
    await expect(page.locator('#memory-grid .is-back-date')).toHaveCount(5);
    await page.locator('#screen-memory .back-btn').click();

    await page.locator('.arcade-card', { hasText: 'Memory' }).click();
    await page.locator('#memory-difficulty .arcade-difficulty-btn', { hasText: 'Difficile' }).click();
    await page.locator('#memory-setup .btn').click();
    await expect(page.locator('#memory-grid .memory-card')).toHaveCount(18);
    await expect(page.locator('#memory-status')).toContainText('0 / 9');
    await expect(page.locator('#memory-grid .is-back-date')).toHaveCount(0);
    for (let pair = 0; pair < 9; pair++) {
        const idx = await page.evaluate((pair) => [memoryGame.cards.findIndex(c => c.pair === pair && c.side === 'event'), memoryGame.cards.findIndex(c => c.pair === pair && c.side === 'date')], pair);
        await page.locator('#memory-grid .memory-card').nth(idx[0]).click();
        await page.locator('#memory-grid .memory-card').nth(idx[1]).click();
    }
    await expect(page.locator('#memory-over')).toBeVisible();
    await expect(page.locator('#memory-over-text')).toContainText('0 erreurs, 900 points');
    await expect(page.locator('#memory-over-text')).toContainText('Difficile ×1,5 : 1350 pts comptés');
});
