// La salle d'arcade (js/app/arcade.js : Snake chronologique, Tetris des siècles) et le convertisseur d'ères
// (js/app/eras.js) : le parcours depuis l'écran des catégories et la fiche du Chemin. Les règles sont testées
// dans tests/arcadeCore.test.js et tests/eraConverter.test.js.

const { test, expect, visibleScreen } = require('./fixtures');

test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
        markRecapShownThisWeek();
        ['historiaxe_arcade_v1', 'historiaxe_eras_v1', 'historiaxe_wheel_v1'].forEach(k => localStorage.removeItem(k));
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

test('Snake : quatre pastilles lettrées, un serpent qui avance, une fin de partie qui garde le score', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Snake' }).click();
    await page.locator('#snake-start').click();
    await expect(page.locator('#snake-legend .snake-legend-item')).toHaveCount(4);
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

test('Le Tetris est aussi proposé dans la fiche du niveau 5, et aucun mini-jeu sur les autres niveaux', async ({ page }) => {
    await page.locator('#btn-path').click();
    await page.evaluate(() => pathOpenSheet('monde0-5'));
    await expect(page.locator('#path-sheet-game')).toContainText('Tetris');
    await page.locator('#path-sheet-game').click();
    expect(await visibleScreen(page)).toBe('screen-tetris');
    await page.locator('#screen-tetris .back-btn').click();
    await expect(page.locator('#screen-path')).toBeVisible();
    await page.evaluate(() => pathOpenSheet('monde0-2'));
    await expect(page.locator('#path-sheet-game')).toBeHidden();
});

test('Pac-Man : un labyrinthe, une consigne, un bon et un mauvais bonbon, une partie qui se termine', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await page.locator('.arcade-card', { hasText: 'Pac-Man' }).click();
    expect(await visibleScreen(page)).toBe('screen-pacman');
    await page.locator('#pacman-start').click();
    await expect(page.locator('#pacman-banner')).toContainText('Où est la date de');
    await expect(page.locator('#pacman-status')).toContainText('♥♥♥');
    // Pac-Man avance tout seul.
    const before = await page.evaluate(() => JSON.stringify(pacGame.player));
    await expect.poll(() => page.evaluate(() => JSON.stringify(pacGame.player))).not.toBe(before);
    // La bonne pastille : on le place à côté et on le laisse avancer.
    await page.evaluate(() => {
        pacmanStop();
        const g = pacGame;
        g.ghosts = [];
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
        g.player = { x: p.x - 1, y: p.y };
        if (!ArcadeCore.pacOpen(g.player.x, g.player.y)) g.player = { x: p.x + 1, y: p.y };
        g.dir = g.nextDir = g.player.x < p.x ? ArcadeCore.DIRS.right : ArcadeCore.DIRS.left;
        pacmanLoop();
        pacmanStop();
    });
    await expect(page.locator('#pacman-message')).toContainText('Pas celle-là');
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

test('la salle de jeux : trois sections, dix jeux, des mini-jeux qui reviennent au menu', async ({ page }) => {
    await page.locator('#btn-arcade').click();
    await expect(page.locator('#screen-arcade h2')).toHaveText('Salle de jeux');
    await expect(page.locator('#screen-arcade .games-section h3')).toHaveText(['Mini-jeux', "Jeux d'arcade", 'Jeux de réflexion']);
    await expect(page.locator('#screen-arcade .arcade-card')).toHaveCount(10);
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
    await expect(page.locator('#memory-grid .memory-card')).toHaveCount(12);
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
