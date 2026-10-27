// Salle d'arcade (js/arcadeCore.js) : périodes, Snake et Tetris. Pur, sans navigateur ni minuteur.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../js/arcadeCore.js');

// Hasard reproductible.
function seeded(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// Un vivier réparti sur les cinq périodes, hors des années ambiguës.
function pool() {
    const out = [];
    const years = [-3000, -800, -500, -100, 100, 300, 700, 1000, 1200, 1300, 1600, 1648, 1700, 1750, 1815, 1848, 1870, 1900, 1918, 1945, 1969, 1989, 2001, 2020];
    years.forEach((date, i) => out.push({ id: 'e' + i, title: 'Événement ' + i, date }));
    return out;
}

test('les périodes : bornes 476, 1492, 1789, 1914', () => {
    assert.equal(A.periodOf(-3000), 0);
    assert.equal(A.periodOf(475), 0);
    assert.equal(A.periodOf(476), 1);
    assert.equal(A.periodOf(1491), 1);
    assert.equal(A.periodOf(1492), 2);
    assert.equal(A.periodOf(1788), 2);
    assert.equal(A.periodOf(1789), 3);
    assert.equal(A.periodOf(1913), 3);
    assert.equal(A.periodOf(1914), 4);
    assert.equal(A.periodOf(2024), 4);
    assert.equal(A.PERIODS.length, A.TETRIS_COLS);
});

test('les années des bornes discutées (476, 1453-1492) sont exclues du jeu', () => {
    [470, 476, 480, 1450, 1453, 1492, 1495].forEach((y) => assert.ok(A.isAmbiguous(y), String(y)));
    [469, 481, 1449, 1496, 1789, 1914].forEach((y) => assert.ok(!A.isAmbiguous(y), String(y)));
    const kept = A.playable([{ id: 'a', title: 'x', date: 476 }, { id: 'b', title: 'x', date: 1000 }, { id: 'c', title: '', date: 1000 }, { id: 'd', title: 'x' }]);
    assert.deepEqual(kept.map((e) => e.id), ['b']);
});

test('pickDistinct : des années toutes différentes', () => {
    const list = [{ id: 'a', date: 1 }, { id: 'b', date: 1 }, { id: 'c', date: 2 }, { id: 'd', date: 3 }];
    const out = A.pickDistinct(list, seeded(3), 3);
    assert.equal(out.length, 3);
    assert.equal(new Set(out.map((e) => e.date)).size, 3);
});

test('Snake : quatre pastilles (en difficile) aux lettres distinctes, dans une grille, hors du serpent', () => {
    const g = A.createSnake(pool(), seeded(5), { difficulty: 'hard' });
    assert.equal(g.foods.length, 4);
    assert.deepEqual(g.items.map((i) => i.letter).sort(), ['A', 'B', 'C', 'D']);
    assert.equal(g.order.length, 4);
    for (let i = 1; i < 4; i++) assert.ok(g.order[i - 1].event.date < g.order[i].event.date);
    g.foods.forEach((f) => {
        assert.ok(f.x >= 0 && f.x < A.SNAKE_SIZE && f.y >= 0 && f.y < A.SNAKE_SIZE);
        assert.ok(!g.snake.some((s) => s.x === f.x && s.y === f.y));
    });
    assert.equal(new Set(g.foods.map((f) => f.x + ',' + f.y)).size, 4);
});

test('Snake : trois pastilles en facile et en moyen, quatre en difficile', () => {
    ['easy', 'normal', 'hard'].forEach((difficulty) => {
        const n = difficulty === 'hard' ? 4 : 3;
        const g = A.createSnake(pool(), seeded(5), { difficulty });
        assert.equal(g.foods.length, n, difficulty);
        assert.equal(new Set(g.items.map((i) => i.letter)).size, n);
        assert.equal(g.order.length, n);
    });
    assert.equal(A.createSnake(pool(), seeded(5)).difficulty, 'normal', 'sans niveau : moyen');
});

test('Snake : trois manches de pastilles font une manche, quel que soit le niveau', () => {
    const g = A.createSnake(pool(), seeded(11), { difficulty: 'easy' });
    let last = [];
    g.order.slice().forEach((item) => { last = feed(g, item); g.snake = [{ x: 2, y: 6 }, { x: 1, y: 6 }, { x: 0, y: 6 }]; });
    assert.ok(last.includes('round'));
    assert.equal(g.score, 3 * 10 + 100);
    assert.equal(g.foods.length, 3);
});

test('Snake : la vitesse suit le niveau (300 / 220 / 170 ms au départ), plus vite à chaque manche sans passer sous le plancher', () => {
    const at = (difficulty, rounds) => { const g = A.createSnake(pool(), seeded(1), { difficulty }); g.rounds = rounds; return A.snakeInterval(g); };
    assert.deepEqual(['easy', 'normal', 'hard'].map((d) => at(d, 0)), [300, 220, 170]);
    assert.deepEqual(['easy', 'normal', 'hard'].map((d) => at(d, 1000)), [200, 120, 90]);
    assert.ok(at('easy', 3) < at('easy', 0));
});

test('Snake : un vivier trop pauvre ne démarre pas', () => {
    assert.ok(A.createSnake(pool().slice(0, 3), seeded(1), { difficulty: 'hard' }).empty);
    assert.ok(A.createSnake(pool().slice(0, 2), seeded(1)).empty);
});

// Place la pastille voulue juste devant la tête, et fait faire un pas.
function feed(g, item) {
    const food = g.foods.find((f) => f.item === item);
    const head = g.snake[0];
    g.dir = g.nextDir = A.DIRS.right;
    food.x = head.x + 1;
    food.y = head.y;
    return A.snakeStep(g);
}

test('Snake : manger dans l\'ordre fait grandir, manger dans le désordre coûte une vie', () => {
    const g = A.createSnake(pool(), seeded(9));
    const length = g.snake.length;
    const wrongItem = g.order[1];
    const events = feed(g, wrongItem);
    assert.deepEqual(events, ['wrong']);
    assert.equal(g.lives, A.SNAKE_LIVES - 1);
    assert.equal(g.snake.length, length);
    assert.equal(g.mistakes.length, 1);
    assert.equal(g.mistakes[0].expected, g.order[0].event);
    assert.ok(g.foods.includes(g.foods.find((f) => f.item === wrongItem)), 'la pastille réapparaît');
    const g2 = A.createSnake(pool(), seeded(9));
    const ok = feed(g2, g2.order[0]);
    assert.deepEqual(ok, ['ok']);
    assert.equal(g2.snake.length, length + 1);
    assert.equal(g2.eaten, 1);
    assert.equal(g2.score, 10);
});

test('Snake : les quatre dans l\'ordre font une manche, et une nouvelle manche arrive', () => {
    const g = A.createSnake(pool(), seeded(11), { difficulty: 'hard' });
    const first = g.order.slice();
    let last = [];
    first.forEach((item) => { last = feed(g, item); g.snake = [g.snake[0], g.snake[1], g.snake[2]]; g.snake[0] = { x: 2, y: 6 }; g.snake[1] = { x: 1, y: 6 }; g.snake[2] = { x: 0, y: 6 }; });
    assert.ok(last.includes('round'));
    assert.equal(g.rounds, 1);
    assert.equal(g.score, 4 * 10 + 100);
    assert.equal(g.foods.length, 4);
    assert.equal(g.eaten, 0);
    assert.equal(g.doneRounds.length, 1);
    assert.ok(A.snakeInterval(g) < 170);
});

test('Snake : un mur coûte une vie, trois vies et c\'est fini ; on ne fait pas demi-tour', () => {
    const g = A.createSnake(pool(), seeded(2));
    A.snakeTurn(g, 'left'); // demi-tour : ignoré
    assert.equal(g.nextDir, A.DIRS.right);
    A.snakeTurn(g, 'up');
    assert.equal(g.nextDir, A.DIRS.up);
    let events = [];
    for (let i = 0; i < 200 && !g.over; i++) {
        events = events.concat(A.snakeStep(g));
        if (!g.over) A.snakeTurn(g, i % 2 ? 'up' : 'right');
    }
    assert.ok(g.over);
    assert.equal(g.lives, 0);
    assert.ok(events.includes('crash') && events.includes('over'));
    assert.deepEqual(A.snakeStep(g), [], 'fini : plus rien ne bouge');
});

test('Tetris : cinq colonnes, un bloc au centre, un tirage équilibré par « sac »', () => {
    const g = A.createTetris(pool(), seeded(4));
    assert.equal(g.cols, 5);
    assert.equal(g.piece.col, 2);
    assert.equal(g.piece.row, 0);
    // Le tirage suit un « sac » : chaque série de cinq blocs compte une fois chaque période.
    const state = A.createTetris(pool(), seeded(8));
    const periods = [];
    for (let i = 0; i < 10; i++) {
        periods.push(A.periodOf(state.piece.event.date));
        A.tetrisMoveTo(state, periods[i]);
        A.tetrisDrop(state);
    }
    assert.deepEqual(periods.slice(0, 5).sort(), [0, 1, 2, 3, 4]);
    assert.deepEqual(periods.slice(5).sort(), [0, 1, 2, 3, 4]);
});

test('Tetris : un bloc bien rangé est vert, un autre rouge et mémorisé comme erreur', () => {
    const g = A.createTetris(pool(), seeded(6));
    const event = g.piece.event;
    const right = A.periodOf(event.date);
    A.tetrisMoveTo(g, right);
    const events = A.tetrisDrop(g);
    assert.ok(events.includes('good'));
    assert.equal(g.grid[g.rows - 1][right].good, true);
    assert.equal(g.score, 10);

    const bad = A.createTetris(pool(), seeded(6));
    const wrong = (A.periodOf(bad.piece.event.date) + 1) % 5;
    A.tetrisMoveTo(bad, wrong);
    assert.ok(A.tetrisDrop(bad).includes('bad'));
    assert.equal(bad.grid[bad.rows - 1][wrong].good, false);
    assert.equal(bad.mistakes.length, 1);
    assert.equal(bad.mistakes[0].expected, A.periodOf(bad.mistakes[0].event.date));
    assert.equal(bad.mistakes[0].chosen, wrong);
});

test('Tetris : cinq blocs verts alignés font une ligne, qui disparaît (+100) ; un bloc rouge l\'en empêche', () => {
    const g = A.createTetris(pool(), seeded(13));
    // Dix blocs bien rangés : deux lignes complètes, effacées au fur et à mesure.
    let guard = 0;
    while (g.cleared < 2 && !g.over && guard++ < 60) {
        A.tetrisMoveTo(g, A.periodOf(g.piece.event.date));
        A.tetrisDrop(g);
    }
    assert.equal(g.cleared, 2);
    assert.ok(g.score >= 200);
    assert.ok(g.grid.every((row) => row.every((c) => c === null)) || g.grid.flat().every((c) => !c || c.good));
    assert.equal(A.tetrisLevel(g), 2);

    const h = A.createTetris(pool(), seeded(13));
    // Un bloc rouge en bas : la ligne qu'il occupe ne peut plus disparaître.
    A.tetrisMoveTo(h, (A.periodOf(h.piece.event.date) + 1) % 5);
    A.tetrisDrop(h);
    for (let i = 0; i < 4; i++) { A.tetrisMoveTo(h, A.periodOf(h.piece.event.date)); A.tetrisDrop(h); }
    const bottom = h.grid[h.rows - 1];
    assert.ok(bottom.some((c) => c && !c.good));
    assert.equal(h.cleared, 0);
});

test('Tetris : un bloc ne traverse pas une pile, et la partie finit quand le départ est bouché', () => {
    const g = A.createTetris(pool(), seeded(21));
    // On empile tout dans la colonne du milieu jusqu'en haut.
    for (let i = 0; i < 40 && !g.over; i++) { A.tetrisMoveTo(g, 2); A.tetrisDrop(g); }
    assert.ok(g.over);
    assert.equal(g.piece, null);
    assert.deepEqual(A.tetrisTick(g), []);
    const h = A.createTetris(pool(), seeded(21));
    h.grid[h.piece.row][1] = { good: true, event: h.piece.event };
    assert.equal(A.tetrisMoveTo(h, 0), false, 'la pile de la colonne 1 barre la route vers la colonne 0');
    assert.equal(A.tetrisMoveTo(h, 3), true);
});

test('Tetris : un vivier sans une période ne démarre pas, la gravité accélère', () => {
    assert.ok(A.createTetris(pool().filter((e) => e.date < 1914), seeded(1)).empty);
    const g = A.createTetris(pool(), seeded(1));
    const slow = A.tetrisInterval(g);
    g.cleared = 10;
    assert.ok(A.tetrisInterval(g) < slow);
    assert.ok(A.tetrisInterval(g) >= 250);
});

test('Tetris : la gravité suit le niveau (900 / 700 / 550 ms au départ), de plus en plus vite sans passer sous le plancher', () => {
    const at = (difficulty, cleared) => { const g = A.createTetris(pool(), seeded(1), { difficulty }); g.cleared = cleared; return A.tetrisInterval(g); };
    assert.deepEqual(['easy', 'normal', 'hard'].map((d) => at(d, 0)), [900, 700, 550]);
    assert.deepEqual(['easy', 'normal', 'hard'].map((d) => at(d, 1000)), [400, 250, 180]);
    assert.ok(at('hard', 4) < at('hard', 0));
    assert.equal(A.createTetris(pool(), seeded(1)).difficulty, 'normal');
});

test('meilleurs scores : on garde le plus haut, on ignore ce qui est abîmé', () => {
    let best = A.recordBest(null, 'snake', 150);
    assert.deepEqual(best, { snake: 150, tetris: 0, pacman: 0, invaders: 0, memory: 0, who: 0, cause: 0, scene: 0, breakout: 0, flappy: 0, race: 0, hangman: 0, roman: 0 });
    best = A.recordBest(best, 'snake', 90);
    assert.equal(best.snake, 150);
    best = A.recordBest(best, 'tetris', 320);
    assert.deepEqual(best, { snake: 150, tetris: 320, pacman: 0, invaders: 0, memory: 0, who: 0, cause: 0, scene: 0, breakout: 0, flappy: 0, race: 0, hangman: 0, roman: 0 });
    assert.deepEqual(A.normalizeBest('x'), { snake: 0, tetris: 0, pacman: 0, invaders: 0, memory: 0, who: 0, cause: 0, scene: 0, breakout: 0, flappy: 0, race: 0, hangman: 0, roman: 0 });
    assert.deepEqual(A.recordBest(best, 'autre', 999), best);
});

// --- Pac-Man ---------------------------------------------------------------------------------------------
test('Pac-Man : le labyrinthe est connexe et carré, le départ et les fantômes sont dans un couloir', () => {
    const dist = A.pacDistances(A.PAC_START);
    for (let y = 0; y < A.PAC_SIZE; y++) {
        assert.equal(A.PAC_MAZE[y].length, A.PAC_SIZE);
        for (let x = 0; x < A.PAC_SIZE; x++) {
            if (A.pacOpen(x, y)) assert.ok(dist[y][x] >= 0, `case ${x},${y} inaccessible`);
        }
    }
    assert.ok(A.pacOpen(A.PAC_START.x, A.PAC_START.y));
    const g = A.createPac(pool(), seeded(3));
    g.ghosts.forEach((gh) => assert.ok(A.pacOpen(gh.x, gh.y)));
});

test('Pac-Man : trois, quatre ou cinq pastilles selon le niveau, aux années différentes, loin du départ, une consigne par pastille', () => {
    [['easy', 3], ['normal', 4], ['hard', 5]].forEach(([difficulty, count]) => {
        const g = A.createPac(pool(), seeded(7), { difficulty });
        assert.equal(g.pellets.length, count);
        assert.equal(new Set(g.pellets.map((p) => p.event.date)).size, count);
        assert.equal(new Set(g.pellets.map((p) => p.x + ',' + p.y)).size, count);
        const dist = A.pacDistances(A.PAC_START);
        g.pellets.forEach((p) => { assert.ok(A.pacOpen(p.x, p.y)); assert.ok(dist[p.y][p.x] >= 3); });
        assert.deepEqual(g.targets.map((e) => e.id).sort(), g.pellets.map((p) => p.event.id).sort());
    });
    assert.ok(A.createPac(pool().slice(0, 3), seeded(1), { difficulty: 'hard' }).empty);
    assert.equal(A.createPac(pool(), seeded(7)).difficulty, 'normal', 'sans niveau : moyen');
    assert.equal(A.createPac(pool(), seeded(7), { difficulty: 'nimporte' }).difficulty, 'normal');
});

test('Pac-Man : la partie démarre figée, rien ne bouge avant pacRelease', () => {
    const g = A.createPac(pool(), seeded(4));
    assert.equal(g.frozen, true);
    const player = { x: g.player.x, y: g.player.y };
    const ghosts = JSON.stringify(g.ghosts);
    for (let i = 0; i < 10; i++) assert.deepEqual(A.pacStep(g), []);
    assert.deepEqual(g.player, player);
    assert.equal(JSON.stringify(g.ghosts), ghosts);
    assert.equal(g.tick, 0);
    A.pacRelease(g);
    A.pacStep(g);
    assert.equal(g.tick, 1);
});

// Place Pac-Man à côté de la pastille de `event` (à sa gauche) et le fait avancer dessus ; les fantômes sont loin.
function walkOnto(g, event) {
    const p = g.pellets.find((it) => it.event === event);
    A.pacRelease(g);
    g.player = { x: p.x - 1, y: p.y };
    if (!A.pacOpen(g.player.x, g.player.y)) g.player = { x: p.x + 1, y: p.y };
    g.dir = g.nextDir = g.player.x < p.x ? A.DIRS.right : A.DIRS.left;
    g.ghosts = [];
    return A.pacStep(g);
}

test('Pac-Man : la bonne pastille rapporte, une autre coûte une vie, reste en place et refige le jeu', () => {
    const g = A.createPac(pool(), seeded(10));
    const target = A.pacTarget(g);
    assert.deepEqual(walkOnto(g, target), ['ok']);
    assert.equal(g.score, 10);
    assert.equal(g.pellets.length, 3);
    assert.notEqual(A.pacTarget(g), target);
    assert.equal(g.frozen, false);

    const h = A.createPac(pool(), seeded(10));
    const other = h.pellets.find((p) => p.event !== A.pacTarget(h)).event;
    assert.ok(walkOnto(h, other).includes('wrong'));
    assert.equal(h.lives, A.PAC_LIVES - 1);
    assert.equal(h.pellets.length, 4);
    assert.equal(h.mistakes[0].ate, other);
    assert.equal(h.mistakes[0].wanted, A.pacTarget(h));
    assert.equal(h.frozen, true, 'une vie perdue : compte à rebours');
});

test('Pac-Man : toutes les pastilles font une manche, nouvelle consigne, jeu figé ; les fantômes suivent le niveau', () => {
    const g = A.createPac(pool(), seeded(12), { difficulty: 'hard' });
    assert.equal(g.ghosts.length, 2, 'difficile : deux fantômes dès le départ');
    let last = [];
    for (let i = 0; i < 5; i++) last = walkOnto(g, A.pacTarget(g));
    assert.ok(last.includes('round'));
    assert.equal(g.rounds, 1);
    assert.equal(g.score, 5 * 10 + 100);
    assert.equal(g.pellets.length, 5);
    assert.equal(g.ghosts.length, 3, 'difficile : trois fantômes dès la manche 2');
    assert.equal(g.frozen, true, 'une manche réussie : compte à rebours');
    assert.ok(A.pacInterval(g) < 200);

    const e = A.createPac(pool(), seeded(12), { difficulty: 'easy' });
    for (let i = 0; i < 3; i++) walkOnto(e, A.pacTarget(e));
    assert.equal(e.rounds, 1);
    assert.equal(e.ghosts.length, 1, 'facile : toujours un seul fantôme');

    const m = A.createPac(pool(), seeded(12));
    assert.equal(m.ghosts.length, 1);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) walkOnto(m, A.pacTarget(m));
    assert.equal(m.rounds, 2);
    assert.equal(m.ghosts.length, 2, 'moyen : deux fantômes à partir de la manche 3');
});

test('Pac-Man : la vitesse suit le niveau (320 / 260 / 200 ms au départ), de plus en plus vite sans passer sous le plancher', () => {
    const at = (difficulty, rounds) => { const g = A.createPac(pool(), seeded(1), { difficulty }); g.rounds = rounds; return A.pacInterval(g); };
    assert.deepEqual(['easy', 'normal', 'hard'].map((d) => at(d, 0)), [320, 260, 200]);
    assert.deepEqual(['easy', 'normal', 'hard'].map((d) => at(d, 1000)), [260, 200, 120]);
    assert.ok(at('hard', 3) < at('hard', 0));
});

test('Pac-Man : un fantôme avance un pas sur deux, un sur trois en facile', () => {
    ['easy', 'normal'].forEach((difficulty) => {
        const g = A.createPac(pool(), () => 0.5, { difficulty });
        A.pacRelease(g);
        g.pellets = [];
        g.player = { x: 9, y: 9 };
        g.ghosts = [{ x: 1, y: 1, last: null }];
        const moves = [];
        for (let i = 0; i < 6; i++) {
            const before = g.ghosts[0].x + ',' + g.ghosts[0].y;
            g.player = { x: 9, y: 9 };
            g.dir = g.nextDir = A.DIRS.right;
            A.pacStep(g);
            moves.push(g.ghosts[0].x + ',' + g.ghosts[0].y !== before);
        }
        assert.equal(moves.filter(Boolean).length, difficulty === 'easy' ? 2 : 3, difficulty);
    });
});

test('Pac-Man : on ne traverse pas un mur, et un fantôme qui rattrape coûte une vie puis tout repart du départ', () => {
    const g = A.createPac(pool(), seeded(2));
    A.pacRelease(g);
    g.player = { x: 1, y: 1 };
    g.dir = g.nextDir = A.DIRS.up;
    g.ghosts = [];
    A.pacStep(g);
    assert.deepEqual(g.player, { x: 1, y: 1 }, 'le mur du haut arrête Pac-Man');
    g.ghosts = [{ x: 2, y: 1, last: null }];
    g.player = { x: 1, y: 1 };
    g.dir = g.nextDir = A.DIRS.right;
    g.pellets = [];
    const events = A.pacStep(g);
    assert.ok(events.includes('caught'));
    assert.equal(g.lives, A.PAC_LIVES - 1);
    assert.deepEqual(g.player, A.PAC_START);
    assert.equal(g.frozen, true);
});

test('Pac-Man : la partie finit à la dernière vie ; les fantômes poursuivent Pac-Man', () => {
    const g = A.createPac(pool(), seeded(5));
    for (let i = 0; i < 600 && !g.over; i++) { A.pacRelease(g); A.pacStep(g); }
    assert.ok(g.over, 'laissé sans pilote, Pac-Man finit par être rattrapé');
    assert.deepEqual(A.pacStep(g), []);
    // Un fantôme, sans hasard, se rapproche à chaque pas.
    const h = A.createPac(pool(), () => 0.5);
    A.pacRelease(h);
    h.player = { x: 9, y: 9 };
    h.ghosts = [{ x: 1, y: 1, last: null }];
    const dist = A.pacDistances(h.player);
    const before = dist[1][1];
    h.dir = h.nextDir = A.DIRS.left;
    h.player = { x: 9, y: 9 };
    h.tick = 1;
    h.pellets = [];
    for (let i = 0; i < 4; i++) { h.player = { x: 9, y: 9 }; A.pacStep(h); }
    const after = A.pacDistances({ x: 9, y: 9 })[h.ghosts[0].y][h.ghosts[0].x];
    assert.ok(after < before, `${after} < ${before}`);
});

test('Difficulté : trois niveaux, un multiplicateur de score (×0,5 / ×1 / ×1,5), moyen par défaut', () => {
    assert.deepEqual(A.DIFFICULTIES, ['easy', 'normal', 'hard']);
    assert.equal(A.difficultyScore(100, 'easy'), 50);
    assert.equal(A.difficultyScore(100, 'normal'), 100);
    assert.equal(A.difficultyScore(100, 'hard'), 150);
    assert.equal(A.difficultyScore(110, 'hard'), 165);
    assert.equal(A.difficultyScore(15, 'easy'), 8);
    assert.equal(A.difficultyScore(100, 'inconnu'), 100);
    assert.equal(A.difficultyScore(undefined, 'hard'), 0);
    assert.equal(A.normalizeDifficulty(undefined), 'normal');
});

// --- Space Invaders ----------------------------------------------------------------------------------------
test('Invaders : une manche de huit cartes, quatre de la période et quatre anachronismes, aux années différentes', () => {
    const g = A.createInvaders(pool(), seeded(4));
    assert.equal(g.queue.length, 8);
    assert.equal(g.queue.filter((c) => c.good).length, 4);
    g.queue.forEach((c) => assert.equal(A.periodOf(c.event.date) === g.period, c.good));
    assert.equal(new Set(g.queue.map((c) => c.event.date)).size, 8);
    assert.ok(A.createInvaders(pool().filter((e) => e.date < 1914), seeded(1)).empty);
});

// Fait paraître toutes les cartes de la manche, dans l'ordre de la file.
function spawnAll(g) {
    const events = [];
    for (let i = 0; i < 200 && g.queue.length; i++) events.push(...A.invStep(g, 0.1));
    return events;
}

test('Invaders : les cartes naissent en haut, sur des voies libres, et descendent', () => {
    const g = A.createInvaders(pool(), seeded(4));
    A.invStep(g, 1.1);
    assert.equal(g.cards.length, 1);
    const y = g.cards[0].y;
    assert.ok(y < 0.3 && g.cards[0].lane >= 0 && g.cards[0].lane < 3);
    A.invStep(g, 0.5);
    assert.ok(g.cards[0].y > y);
});

test('Invaders : tirer sur un anachronisme rapporte, sur une carte de la période coûte une vie, voie vide : rien', () => {
    const g = A.createInvaders(pool(), seeded(4));
    const bad = { event: g.queue.find((c) => !c.good).event, good: false, lane: 1, y: 0.5 };
    const good = { event: g.queue.find((c) => c.good).event, good: true, lane: 0, y: 0.5 };
    g.cards = [bad, good];
    g.lane = 1;
    assert.equal(A.invFire(g)[0].type, 'hit');
    assert.equal(g.score, 10);
    assert.equal(g.cards.length, 1);
    assert.deepEqual(A.invFire(g), [], 'le délai entre deux tirs');
    g.cooldown = 0;
    assert.equal(A.invFire(g)[0].type, 'miss', 'voie vide');
    A.invMove(g, -1);
    g.cooldown = 0;
    const events = A.invFire(g);
    assert.equal(events[0].type, 'friendly');
    assert.equal(g.lives, 2);
    assert.equal(g.mistakes.length, 1);
});

test('Invaders : on tire sur la carte la plus basse de la voie ; le vaisseau reste sur ses trois voies', () => {
    const g = A.createInvaders(pool(), seeded(4));
    const ev = g.queue[0].event;
    g.cards = [{ event: ev, good: false, lane: 2, y: 0.2 }, { event: g.queue[1].event, good: false, lane: 2, y: 0.6 }];
    g.lane = 2;
    A.invFire(g);
    assert.equal(g.cards.length, 1);
    assert.equal(g.cards[0].y, 0.2);
    A.invMove(g, 5);
    assert.equal(g.lane, 2);
    A.invMove(g, -9);
    assert.equal(g.lane, 0);
    A.invMoveTo(g, 1);
    assert.equal(g.lane, 1);
});

test('Invaders : une carte de la période qui touche le sol est sauvée (+5), un anachronisme coûte une vie', () => {
    const g = A.createInvaders(pool(), seeded(4));
    g.queue = [];
    g.cards = [{ event: pool()[0], good: true, lane: 0, y: A.INV_BREACH - 0.001 }, { event: pool()[5], good: false, lane: 1, y: A.INV_BREACH - 0.001 }];
    const events = A.invStep(g, 0.1);
    assert.deepEqual(events.map((e) => e.type).filter((t) => t !== 'round'), ['saved', 'breach']);
    assert.equal(g.score >= 5, true);
    assert.equal(g.lives, 2);
});

test('Invaders : la manche finie, une autre période arrive, plus vite ; trois vies perdues terminent la partie', () => {
    const g = A.createInvaders(pool(), seeded(6));
    const first = g.period;
    const speed = A.invSpeed(g);
    let rounds = 0;
    for (let i = 0; i < 3000 && !g.over && !rounds; i++) {
        // On tire sur tout anachronisme de la voie du vaisseau et on laisse passer le reste.
        A.invStep(g, 0.1).forEach((e) => { if (e.type === 'round') rounds += 1; });
        g.cards.forEach((c) => { if (!c.good) { g.lane = c.lane; g.cooldown = 0; A.invFire(g); } });
    }
    assert.equal(g.rounds, 1);
    assert.notEqual(g.period, first);
    assert.ok(A.invSpeed(g) > speed);

    const h = A.createInvaders(pool(), seeded(6));
    for (let i = 0; i < 3000 && !h.over; i++) A.invStep(h, 0.1);
    assert.ok(h.over);
    assert.deepEqual(A.invStep(h, 0.1), []);
    assert.deepEqual(A.invFire(h), []);
});

test('meilleurs scores : quatre jeux', () => {
    assert.deepEqual(A.normalizeBest(null), { snake: 0, tetris: 0, pacman: 0, invaders: 0, memory: 0, who: 0, cause: 0, scene: 0, breakout: 0, flappy: 0, race: 0, hangman: 0, roman: 0 });
    assert.equal(A.recordBest(null, 'pacman', 40).pacman, 40);
    assert.equal(A.recordBest(null, 'invaders', 70).invaders, 70);
});

// --- Les mini-jeux sur des axes choisis (thèmes) ---------------------------------------------------

test('vivier d’un thème : tous les événements des axes retenus, incontournables ou non, une fois chacun', () => {
    const events = [
        { id: 'a', titre: 'Un', date: 1500, axe: 'Peinture' },
        { id: 'b', titre: 'Deux', date: 1510, axe: 'Peinture', essential: true },
        { id: 'c', titre: 'Trois', date: 1520, axe: 'Musique' },
        { id: 'a', titre: 'Un', date: 1500, axe: 'Peinture' },
        { id: 'd', titre: 'Quatre', date: 1530, axe: 'Sculpture' }
    ];
    const pool = A.themePool(events, ['Peinture', 'Musique']);
    assert.deepEqual(pool.map(e => e.id), ['a', 'b', 'c'], 'pas l’axe non retenu, pas de doublon');
    assert.deepEqual(pool[0], { id: 'a', title: 'Un', date: 1500 });
    assert.deepEqual(A.themePool(events, []), [], 'aucun axe, aucun événement');
    assert.deepEqual(A.themePool(null, ['Peinture']), []);
});

test('clé d’une sélection : indépendante de l’ordre des axes, propre à chaque thème', () => {
    assert.equal(A.scopeKey('t1', ['B', 'A']), A.scopeKey('t1', ['A', 'B']));
    assert.notEqual(A.scopeKey('t1', ['A']), A.scopeKey('t2', ['A']));
    assert.notEqual(A.scopeKey('t1', ['A']), A.scopeKey('t1', ['A', 'B']));
});

// Les textes de la difficulté : dans les six langues, pour le sélecteur et pour chaque jeu qui en a un.
test('Difficulté : chaque langue a les textes du sélecteur et la description des trois niveaux de chaque jeu', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const games = ['pacman', 'snake', 'tetris', 'hangman', 'scene', 'memory', 'breakout'];
    ['fr', 'en', 'de', 'es', 'it', 'ja'].forEach((lang) => {
        const ui = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ui', lang + '.json'), 'utf8'));
        ['difficulty_label', 'difficulty_easy', 'difficulty_normal', 'difficulty_hard', 'difficulty_hint', 'weighted', 'go'].forEach((k) => {
            assert.ok(ui.arcade && typeof ui.arcade[k] === 'string' && ui.arcade[k], `${lang}: arcade.${k}`);
        });
        games.forEach((game) => A.DIFFICULTIES.forEach((level) => {
            assert.ok(ui[game] && typeof ui[game]['level_' + level] === 'string' && ui[game]['level_' + level], `${lang}: ${game}.level_${level}`);
        }));
        assert.ok(ui.scene.count_hint && ui.memory.card_hidden_event && ui.memory.card_hidden_date, `${lang}: textes scène / memory`);
    });
});
