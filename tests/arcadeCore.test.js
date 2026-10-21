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

test('Snake : quatre pastilles aux lettres distinctes, dans une grille, hors du serpent', () => {
    const g = A.createSnake(pool(), seeded(5));
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

test('Snake : un vivier trop pauvre ne démarre pas', () => {
    assert.ok(A.createSnake(pool().slice(0, 3), seeded(1)).empty);
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
    const g = A.createSnake(pool(), seeded(11));
    const first = g.order.slice();
    let last = [];
    first.forEach((item) => { last = feed(g, item); g.snake = [g.snake[0], g.snake[1], g.snake[2]]; g.snake[0] = { x: 2, y: 6 }; g.snake[1] = { x: 1, y: 6 }; g.snake[2] = { x: 0, y: 6 }; });
    assert.ok(last.includes('round'));
    assert.equal(g.rounds, 1);
    assert.equal(g.score, 4 * 10 + 100);
    assert.equal(g.foods.length, 4);
    assert.equal(g.eaten, 0);
    assert.equal(g.doneRounds.length, 1);
    assert.ok(A.snakeInterval(g) < 220);
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

test('meilleurs scores : on garde le plus haut, on ignore ce qui est abîmé', () => {
    let best = A.recordBest(null, 'snake', 150);
    assert.deepEqual(best, { snake: 150, tetris: 0 });
    best = A.recordBest(best, 'snake', 90);
    assert.equal(best.snake, 150);
    best = A.recordBest(best, 'tetris', 320);
    assert.deepEqual(best, { snake: 150, tetris: 320 });
    assert.deepEqual(A.normalizeBest('x'), { snake: 0, tetris: 0 });
    assert.deepEqual(A.recordBest(best, 'autre', 999), best);
});
