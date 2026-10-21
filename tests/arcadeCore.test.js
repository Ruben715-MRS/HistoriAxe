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
    assert.deepEqual(best, { snake: 150, tetris: 0, pacman: 0, invaders: 0 });
    best = A.recordBest(best, 'snake', 90);
    assert.equal(best.snake, 150);
    best = A.recordBest(best, 'tetris', 320);
    assert.deepEqual(best, { snake: 150, tetris: 320, pacman: 0, invaders: 0 });
    assert.deepEqual(A.normalizeBest('x'), { snake: 0, tetris: 0, pacman: 0, invaders: 0 });
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

test('Pac-Man : cinq pastilles aux années différentes, loin du départ, une consigne par pastille', () => {
    const g = A.createPac(pool(), seeded(7));
    assert.equal(g.pellets.length, 5);
    assert.equal(new Set(g.pellets.map((p) => p.event.date)).size, 5);
    assert.equal(new Set(g.pellets.map((p) => p.x + ',' + p.y)).size, 5);
    const dist = A.pacDistances(A.PAC_START);
    g.pellets.forEach((p) => { assert.ok(A.pacOpen(p.x, p.y)); assert.ok(dist[p.y][p.x] >= 3); });
    assert.deepEqual(g.targets.map((e) => e.id).sort(), g.pellets.map((p) => p.event.id).sort());
    assert.ok(A.createPac(pool().slice(0, 3), seeded(1)).empty);
});

// Place Pac-Man à côté de la pastille de `event` (à sa gauche) et le fait avancer dessus ; les fantômes sont loin.
function walkOnto(g, event) {
    const p = g.pellets.find((it) => it.event === event);
    g.player = { x: p.x - 1, y: p.y };
    if (!A.pacOpen(g.player.x, g.player.y)) g.player = { x: p.x + 1, y: p.y };
    g.dir = g.nextDir = g.player.x < p.x ? A.DIRS.right : A.DIRS.left;
    g.ghosts = [];
    return A.pacStep(g);
}

test('Pac-Man : la bonne pastille rapporte, une autre coûte une vie et reste en place', () => {
    const g = A.createPac(pool(), seeded(10));
    const target = A.pacTarget(g);
    assert.deepEqual(walkOnto(g, target), ['ok']);
    assert.equal(g.score, 10);
    assert.equal(g.pellets.length, 4);
    assert.notEqual(A.pacTarget(g), target);

    const h = A.createPac(pool(), seeded(10));
    const other = h.pellets.find((p) => p.event !== A.pacTarget(h)).event;
    assert.ok(walkOnto(h, other).includes('wrong'));
    assert.equal(h.lives, A.PAC_LIVES - 1);
    assert.equal(h.pellets.length, 5);
    assert.equal(h.mistakes[0].ate, other);
    assert.equal(h.mistakes[0].wanted, A.pacTarget(h));
});

test('Pac-Man : cinq bonnes pastilles font une manche, et un fantôme de plus', () => {
    const g = A.createPac(pool(), seeded(12));
    let last = [];
    for (let i = 0; i < 5; i++) last = walkOnto(g, A.pacTarget(g));
    assert.ok(last.includes('round'));
    assert.equal(g.rounds, 1);
    assert.equal(g.score, 5 * 10 + 100);
    assert.equal(g.pellets.length, 5);
    assert.equal(g.ghosts.length, 2);
    assert.ok(A.pacInterval(g) < 200);
});

test('Pac-Man : on ne traverse pas un mur, et un fantôme qui rattrape coûte une vie puis tout repart du départ', () => {
    const g = A.createPac(pool(), seeded(2));
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
});

test('Pac-Man : la partie finit à la dernière vie ; les fantômes poursuivent Pac-Man', () => {
    const g = A.createPac(pool(), seeded(5));
    for (let i = 0; i < 600 && !g.over; i++) A.pacStep(g);
    assert.ok(g.over, 'laissé sans pilote, Pac-Man finit par être rattrapé');
    assert.deepEqual(A.pacStep(g), []);
    // Un fantôme, sans hasard, se rapproche à chaque pas.
    const h = A.createPac(pool(), () => 0.5);
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
    assert.deepEqual(A.normalizeBest(null), { snake: 0, tetris: 0, pacman: 0, invaders: 0 });
    assert.equal(A.recordBest(null, 'pacman', 40).pacman, 40);
    assert.equal(A.recordBest(null, 'invaders', 70).invaders, 70);
});
