// =========================================================================
// === LA SALLE D'ARCADE — RÈGLES DU SNAKE CHRONOLOGIQUE ET DU TETRIS DES SIÈCLES ===
// =========================================================================
// Quatre jeux d'adresse qui portent sur les événements du jeu. Ici, seulement les règles (états purs, sans DOM
// ni minuteur : l'écran, js/app/arcade.js, appelle `step`/`tick` à chaque pas de temps) ; testé dans
// tests/arcadeCore.test.js.
//
// Un événement du vivier : { id, title, date } (l'année, négative avant J.-C.).
//
//  - SNAKE : quatre événements sont posés sur la grille, des pastilles lettrées ; le serpent doit les manger du
//    plus ancien au plus récent. Dans le désordre : une vie en moins. Un mur ou sa queue : une vie en moins.
//  - TETRIS : un événement tombe dans une des cinq colonnes (Antiquité, Moyen Âge, Temps modernes, 1789-1914,
//    depuis 1914) ; on choisit la colonne. Un bloc bien rangé est vert, un autre est rouge et reste là. Une ligne
//    de cinq blocs verts disparaît.
//  - PAC-MAN : dans un labyrinthe, cinq pastilles portent des années ; la consigne nomme un événement, il faut manger
//    la pastille de sa date. Une autre année, ou un fantôme : une vie en moins.
//  - SPACE INVADERS : des cartes-événements descendent sur trois voies, sous l'intitulé d'une période. On tire sur
//    celles qui n'en font PAS partie (les anachronismes) et on laisse passer les autres.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.ArcadeCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // --- Les périodes ---------------------------------------------------------------------------------
    // Les bornes sont celles du programme (476, 1492, 1789, 1914). Les années voisines des deux bornes les plus
    // discutées (476 ; 1453-1492) sont exclues du jeu : un joueur ne doit pas perdre sur une convention.
    var PERIODS = [
        { id: 'antiquite', name: 'Antiquité', range: 'avant 476' },
        { id: 'moyenage', name: 'Moyen Âge', range: '476 à 1492' },
        { id: 'modernes', name: 'Temps modernes', range: '1492 à 1789' },
        { id: 'xix', name: '1789-1914', range: '1789 à 1914' },
        { id: 'contemporain', name: 'Depuis 1914', range: 'depuis 1914' }
    ];
    var BOUNDS = [476, 1492, 1789, 1914];

    function periodOf(date) {
        for (var i = 0; i < BOUNDS.length; i++) if (date < BOUNDS[i]) return i;
        return BOUNDS.length;
    }

    function isAmbiguous(date) {
        return (date >= 470 && date <= 480) || (date >= 1450 && date <= 1495);
    }

    function shuffle(list, rng) {
        var random = rng || Math.random;
        var out = list.slice();
        for (var i = out.length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
        }
        return out;
    }

    // Garde les événements jouables : une année, un titre, pas de borne discutée.
    function playable(pool) {
        return (pool || []).filter(function (e) {
            return e && typeof e.date === 'number' && e.title && !isAmbiguous(e.date);
        });
    }

    // `n` événements d'années toutes différentes.
    function pickDistinct(pool, rng, n) {
        var years = {};
        var out = [];
        shuffle(pool, rng).forEach(function (e) {
            if (out.length >= n || years[e.date]) return;
            years[e.date] = true;
            out.push(e);
        });
        return out;
    }

    // --- SNAKE ---------------------------------------------------------------------------------------
    var SNAKE_SIZE = 12;
    var SNAKE_FOODS = 4;
    var SNAKE_LIVES = 3;
    var SNAKE_LETTERS = ['A', 'B', 'C', 'D'];
    var DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

    function snakeStart() {
        var y = Math.floor(SNAKE_SIZE / 2);
        return [{ x: 2, y: y }, { x: 1, y: y }, { x: 0, y: y }];
    }

    function snakeFree(state, x, y) {
        for (var i = 0; i < state.snake.length; i++) if (state.snake[i].x === x && state.snake[i].y === y) return false;
        for (var j = 0; j < state.foods.length; j++) if (state.foods[j].x === x && state.foods[j].y === y) return false;
        return true;
    }

    function snakePlace(state, food, rng) {
        var random = rng || Math.random;
        var free = [];
        for (var x = 0; x < SNAKE_SIZE; x++) {
            for (var y = 0; y < SNAKE_SIZE; y++) {
                // Pas collée au mur du haut ni au serpent : un peu d'air pour tourner.
                if (snakeFree(state, x, y)) free.push({ x: x, y: y });
            }
        }
        var cell = free[Math.floor(random() * free.length)] || { x: 0, y: 0 };
        food.x = cell.x;
        food.y = cell.y;
        return food;
    }

    // Une manche : quatre événements, des lettres mélangées ; `order` est l'ordre chronologique attendu.
    function snakeNewRound(state, rng) {
        var events = pickDistinct(state.pool, rng, SNAKE_FOODS);
        var letters = shuffle(SNAKE_LETTERS, rng);
        state.foods = [];
        state.items = events.map(function (event, i) { return { event: event, letter: letters[i], eaten: false }; });
        state.order = state.items.slice().sort(function (a, b) { return a.event.date - b.event.date; });
        state.eaten = 0;
        state.items.forEach(function (item) {
            state.foods.push(snakePlace(state, { item: item }, rng));
        });
    }

    function createSnake(pool, rng) {
        var state = {
            pool: playable(pool), rng: rng || Math.random, size: SNAKE_SIZE,
            snake: snakeStart(), dir: DIRS.right, nextDir: DIRS.right,
            foods: [], items: [], order: [], eaten: 0,
            lives: SNAKE_LIVES, score: 0, rounds: 0, over: false,
            mistakes: [], doneRounds: []
        };
        if (pickDistinct(state.pool, state.rng, SNAKE_FOODS).length < SNAKE_FOODS) { state.over = true; state.empty = true; return state; }
        snakeNewRound(state, state.rng);
        return state;
    }

    // Tourne la tête (jamais à l'opposé de la direction déjà prise).
    function snakeTurn(state, name) {
        var d = DIRS[name];
        if (!d || state.over) return;
        if (d.x === -state.dir.x && d.y === -state.dir.y) return;
        state.nextDir = d;
    }

    function snakeLoseLife(state, why, events) {
        state.lives -= 1;
        events.push(why);
        if (state.lives <= 0) { state.over = true; events.push('over'); return; }
        // Le serpent repart de sa position de départ, les pastilles restent où elles sont (hors de son chemin).
        state.snake = snakeStart();
        state.dir = DIRS.right;
        state.nextDir = DIRS.right;
        state.foods.forEach(function (food) {
            if (!snakeFree({ snake: state.snake, foods: [] }, food.x, food.y)) snakePlace(state, food, state.rng);
        });
    }

    // Un pas de temps. Renvoie les événements survenus : 'ok', 'wrong', 'crash', 'round', 'over'.
    function snakeStep(state) {
        var events = [];
        if (state.over) return events;
        state.dir = state.nextDir;
        var head = state.snake[0];
        var next = { x: head.x + state.dir.x, y: head.y + state.dir.y };
        if (next.x < 0 || next.y < 0 || next.x >= SNAKE_SIZE || next.y >= SNAKE_SIZE) {
            snakeLoseLife(state, 'crash', events);
            return events;
        }
        // La queue avance en même temps : sa case est libre, sauf si le serpent grandit (on la garde alors).
        var body = state.snake.slice(0, -1);
        for (var i = 0; i < body.length; i++) {
            if (body[i].x === next.x && body[i].y === next.y) { snakeLoseLife(state, 'crash', events); return events; }
        }
        var food = null;
        for (var f = 0; f < state.foods.length; f++) {
            if (state.foods[f].x === next.x && state.foods[f].y === next.y) food = state.foods[f];
        }
        state.snake.unshift(next);
        if (!food) { state.snake.pop(); return events; }

        var expected = state.order[state.eaten];
        if (food.item === expected) {
            // Bon ordre : le serpent grandit (la queue reste).
            expected.eaten = true;
            state.eaten += 1;
            state.score += 10;
            state.foods.splice(state.foods.indexOf(food), 1);
            events.push('ok');
            if (state.eaten >= SNAKE_FOODS) {
                state.rounds += 1;
                state.score += 100;
                state.doneRounds.push(state.order.map(function (it) { return it.event; }));
                events.push('round');
                snakeNewRound(state, state.rng);
            }
        } else {
            state.snake.pop();
            state.mistakes.push({ ate: food.item.event, expected: expected.event });
            snakePlace(state, food, state.rng);
            state.lives -= 1;
            events.push('wrong');
            if (state.lives <= 0) { state.over = true; events.push('over'); }
        }
        return events;
    }

    // Millisecondes entre deux pas : 220 au départ, 120 au mieux, une manche réussie accélère un peu.
    function snakeInterval(state) {
        return Math.max(120, 220 - state.rounds * 10);
    }

    // --- TETRIS ---------------------------------------------------------------------------------------
    var TETRIS_COLS = PERIODS.length;
    var TETRIS_ROWS = 10;

    function emptyRow() {
        var row = [];
        for (var c = 0; c < TETRIS_COLS; c++) row.push(null);
        return row;
    }

    function createTetris(pool, rng) {
        var state = {
            pool: playable(pool), rng: rng || Math.random, cols: TETRIS_COLS, rows: TETRIS_ROWS,
            grid: [], piece: null, byPeriod: [], bag: [], used: {},
            score: 0, cleared: 0, placed: 0, good: 0, mistakes: [], over: false
        };
        for (var r = 0; r < TETRIS_ROWS; r++) state.grid.push(emptyRow());
        for (var p = 0; p < TETRIS_COLS; p++) state.byPeriod.push([]);
        state.pool.forEach(function (e) { state.byPeriod[periodOf(e.date)].push(e); });
        // Il faut de quoi remplir chaque colonne, sinon une ligne ne pourrait jamais être complète.
        if (state.byPeriod.some(function (list) { return list.length < 2; })) { state.over = true; state.empty = true; return state; }
        tetrisSpawn(state);
        return state;
    }

    // Le tirage suit un « sac » : une période de chaque, dans un ordre mêlé, puis on recommence. Chaque colonne reçoit
    // ainsi autant d'événements que les autres, et les lignes peuvent se compléter.
    function tetrisNextEvent(state) {
        if (!state.bag.length) {
            var all = [];
            for (var p = 0; p < TETRIS_COLS; p++) all.push(p);
            state.bag = shuffle(all, state.rng);
        }
        var period = state.bag.pop();
        var list = state.byPeriod[period].filter(function (e) { return !state.used[e.id]; });
        if (!list.length) {
            state.byPeriod[period].forEach(function (e) { delete state.used[e.id]; });
            list = state.byPeriod[period];
        }
        var event = list[Math.floor(state.rng() * list.length)];
        state.used[event.id] = true;
        return event;
    }

    function tetrisSpawn(state) {
        var col = Math.floor(TETRIS_COLS / 2);
        if (state.grid[0][col]) { state.over = true; state.piece = null; return; }
        state.piece = { col: col, row: 0, event: tetrisNextEvent(state) };
    }

    // Déplace le bloc d'une colonne vers `col` (une case libre à sa hauteur).
    function tetrisMoveTo(state, col) {
        if (state.over || !state.piece) return false;
        if (col < 0 || col >= TETRIS_COLS) return false;
        var step = col > state.piece.col ? 1 : -1;
        // On passe colonne après colonne : un bloc ne traverse pas une pile.
        for (var c = state.piece.col; c !== col; c += step) {
            if (state.grid[state.piece.row][c + step]) return false;
        }
        state.piece.col = col;
        return true;
    }

    function tetrisMove(state, dx) {
        return state.piece ? tetrisMoveTo(state, state.piece.col + dx) : false;
    }

    function tetrisClearRows(state) {
        var cleared = 0;
        for (var r = state.rows - 1; r >= 0; r--) {
            var row = state.grid[r];
            var full = row.every(function (cell) { return cell && cell.good; });
            if (full) {
                state.grid.splice(r, 1);
                state.grid.unshift(emptyRow());
                cleared += 1;
                r += 1; // la ligne qui vient de descendre prend la même place
            }
        }
        return cleared;
    }

    // Un pas de gravité. Renvoie les événements : 'good', 'bad', 'clear', 'over'.
    function tetrisTick(state) {
        var events = [];
        if (state.over || !state.piece) return events;
        var p = state.piece;
        if (p.row + 1 < state.rows && !state.grid[p.row + 1][p.col]) {
            p.row += 1;
            return events;
        }
        // Le bloc se pose : bien rangé, ou rouge.
        var right = periodOf(p.event.date);
        var good = right === p.col;
        state.grid[p.row][p.col] = { good: good, event: p.event };
        state.placed += 1;
        if (good) {
            state.good += 1;
            state.score += 10;
            events.push('good');
        } else {
            state.mistakes.push({ event: p.event, chosen: p.col, expected: right });
            events.push('bad');
        }
        var rows = tetrisClearRows(state);
        if (rows) {
            state.cleared += rows;
            state.score += 100 * rows;
            events.push('clear');
        }
        tetrisSpawn(state);
        if (state.over) events.push('over');
        return events;
    }

    // Chute immédiate : tous les pas jusqu'à la pose.
    function tetrisDrop(state) {
        var all = [];
        if (state.over || !state.piece) return all;
        var placed = state.placed;
        while (!state.over && state.placed === placed) all = all.concat(tetrisTick(state));
        return all;
    }

    function tetrisLevel(state) { return 1 + Math.floor(state.cleared / 2); }
    // Millisecondes entre deux pas de gravité : 700 au départ, 250 au mieux.
    function tetrisInterval(state) { return Math.max(250, 700 - (tetrisLevel(state) - 1) * 60); }


    // --- PAC-MAN ---------------------------------------------------------------------------------------
    // Le labyrinthe : '#' mur, ' ' couloir. Symétrique, sans impasse, de quoi fuir un fantôme.
    var PAC_MAZE = [
        '###########',
        '#         #',
        '# ## # ## #',
        '#         #',
        '# ## # ## #',
        '#    #    #',
        '# ## # ## #',
        '#         #',
        '# ## # ## #',
        '#         #',
        '###########'
    ];
    var PAC_SIZE = PAC_MAZE.length;
    var PAC_START = { x: 5, y: 9 };
    var PAC_GHOST_STARTS = [{ x: 1, y: 1 }, { x: 9, y: 1 }, { x: 1, y: 5 }];
    var PAC_PELLETS = 5;
    var PAC_LIVES = 3;

    function pacOpen(x, y) {
        return x >= 0 && y >= 0 && x < PAC_SIZE && y < PAC_SIZE && PAC_MAZE[y].charAt(x) === ' ';
    }

    // Distance (en pas) de chaque case à `from`, par parcours en largeur ; -1 si inaccessible.
    function pacDistances(from) {
        var dist = [];
        for (var y = 0; y < PAC_SIZE; y++) { dist.push([]); for (var x = 0; x < PAC_SIZE; x++) dist[y].push(-1); }
        var queue = [{ x: from.x, y: from.y }];
        dist[from.y][from.x] = 0;
        while (queue.length) {
            var cur = queue.shift();
            ['up', 'down', 'left', 'right'].forEach(function (name) {
                var nx = cur.x + DIRS[name].x, ny = cur.y + DIRS[name].y;
                if (pacOpen(nx, ny) && dist[ny][nx] < 0) { dist[ny][nx] = dist[cur.y][cur.x] + 1; queue.push({ x: nx, y: ny }); }
            });
        }
        return dist;
    }

    function pacResetPositions(state) {
        state.player = { x: PAC_START.x, y: PAC_START.y };
        state.dir = DIRS.left;
        state.nextDir = DIRS.left;
        var count = Math.min(PAC_GHOST_STARTS.length, 1 + state.rounds);
        state.ghosts = [];
        for (var i = 0; i < count; i++) state.ghosts.push({ x: PAC_GHOST_STARTS[i].x, y: PAC_GHOST_STARTS[i].y, last: null });
    }

    // Une manche : cinq événements aux années différentes, posés loin du départ ; la consigne les prend dans le désordre.
    function pacNewRound(state) {
        var events = pickDistinct(state.pool, state.rng, PAC_PELLETS);
        var dist = pacDistances(PAC_START);
        var cells = [];
        for (var y = 0; y < PAC_SIZE; y++) {
            for (var x = 0; x < PAC_SIZE; x++) {
                var ghostStart = PAC_GHOST_STARTS.some(function (g) { return g.x === x && g.y === y; });
                if (dist[y][x] >= 3 && !ghostStart) cells.push({ x: x, y: y });
            }
        }
        cells = shuffle(cells, state.rng);
        state.pellets = events.map(function (event, i) { return { x: cells[i].x, y: cells[i].y, event: event }; });
        state.targets = shuffle(events, state.rng);
        state.targetIndex = 0;
    }

    function createPac(pool, rng) {
        var state = {
            pool: playable(pool), rng: rng || Math.random, size: PAC_SIZE, maze: PAC_MAZE,
            player: null, dir: DIRS.left, nextDir: DIRS.left, ghosts: [], pellets: [], targets: [], targetIndex: 0,
            lives: PAC_LIVES, score: 0, rounds: 0, tick: 0, over: false, mistakes: []
        };
        if (pickDistinct(state.pool, state.rng, PAC_PELLETS).length < PAC_PELLETS) { state.over = true; state.empty = true; return state; }
        pacResetPositions(state);
        pacNewRound(state);
        return state;
    }

    function pacTurn(state, name) {
        if (DIRS[name] && !state.over) state.nextDir = DIRS[name];
    }

    function pacTarget(state) {
        return state.targets[state.targetIndex] || null;
    }

    function pacLoseLife(state, why, events) {
        state.lives -= 1;
        events.push(why);
        if (state.lives <= 0) { state.over = true; events.push('over'); }
    }

    function pacCaught(state) {
        return state.ghosts.some(function (g) { return g.x === state.player.x && g.y === state.player.y; });
    }

    function pacMoveGhost(state, ghost, dist) {
        var options = [];
        ['up', 'down', 'left', 'right'].forEach(function (name) {
            var nx = ghost.x + DIRS[name].x, ny = ghost.y + DIRS[name].y;
            if (pacOpen(nx, ny)) options.push({ x: nx, y: ny });
        });
        // Pas de demi-tour, sauf s'il n'y a pas d'autre chemin.
        var ahead = options.filter(function (o) { return !(ghost.last && o.x === ghost.last.x && o.y === ghost.last.y); });
        if (ahead.length) options = ahead;
        var pick;
        if (state.rng() < 0.75) {
            pick = options.slice().sort(function (a, b) { return dist[a.y][a.x] - dist[b.y][b.x]; })[0];
        } else {
            pick = options[Math.floor(state.rng() * options.length)];
        }
        ghost.last = { x: ghost.x, y: ghost.y };
        ghost.x = pick.x;
        ghost.y = pick.y;
    }

    // Un pas de temps. Renvoie : 'ok', 'wrong', 'caught', 'round', 'over'. Les fantômes avancent un pas sur deux.
    function pacStep(state) {
        var events = [];
        if (state.over) return events;
        state.tick += 1;
        var p = state.player;
        if (pacOpen(p.x + state.nextDir.x, p.y + state.nextDir.y)) state.dir = state.nextDir;
        if (pacOpen(p.x + state.dir.x, p.y + state.dir.y)) { p.x += state.dir.x; p.y += state.dir.y; }

        var pellet = null;
        state.pellets.forEach(function (it) { if (it.x === p.x && it.y === p.y) pellet = it; });
        if (pellet) {
            var target = pacTarget(state);
            if (pellet.event === target) {
                state.pellets.splice(state.pellets.indexOf(pellet), 1);
                state.targetIndex += 1;
                state.score += 10;
                events.push('ok');
                if (state.targetIndex >= state.targets.length) {
                    state.rounds += 1;
                    state.score += 100;
                    events.push('round');
                    pacResetPositions(state);
                    pacNewRound(state);
                }
            } else {
                state.mistakes.push({ ate: pellet.event, wanted: target });
                pacLoseLife(state, 'wrong', events);
                if (state.over) return events;
                // Une pastille ratée reste en place : on s'en écarte d'un pas pour ne pas la remanger aussitôt.
                state.nextDir = DIRS[Object.keys(DIRS).filter(function (k) { return pacOpen(p.x + DIRS[k].x, p.y + DIRS[k].y); })[0]];
            }
        }
        if (pacCaught(state)) {
            pacLoseLife(state, 'caught', events);
            if (!state.over) pacResetPositions(state);
            return events;
        }
        if (state.tick % 2 === 0) {
            var dist = pacDistances(state.player);
            state.ghosts.forEach(function (g) { pacMoveGhost(state, g, dist); });
            if (pacCaught(state)) {
                pacLoseLife(state, 'caught', events);
                if (!state.over) pacResetPositions(state);
            }
        }
        return events;
    }

    // Millisecondes entre deux pas : 200 au départ, 120 au mieux.
    function pacInterval(state) { return Math.max(120, 200 - state.rounds * 12); }

    // --- SPACE INVADERS ----------------------------------------------------------------------------------
    var INV_LANES = 3;
    var INV_LIVES = 3;
    var INV_PER_ROUND = 8;   // quatre cartes de la période, quatre anachronismes
    var INV_BREACH = 0.88;   // hauteur (0 = haut, 1 = bas) où une carte atteint le sol
    var INV_COOLDOWN = 0.3;  // secondes entre deux tirs

    function invSpeed(state) { return Math.min(0.22, 0.10 + 0.012 * state.rounds); }
    function invSpawnEvery(state) { return Math.max(1.2, 2.4 - 0.2 * state.rounds); }

    function invNewRound(state) {
        var candidates = [];
        for (var p = 0; p < PERIODS.length; p++) if (p !== state.period) candidates.push(p);
        var period = candidates[Math.floor(state.rng() * candidates.length)];
        var inside = state.byPeriod[period];
        var outside = state.pool.filter(function (e) { return periodOf(e.date) !== period; });
        var good = pickDistinct(inside, state.rng, INV_PER_ROUND / 2);
        var used = {};
        good.forEach(function (e) { used[e.date] = true; });
        var bad = pickDistinct(outside.filter(function (e) { return !used[e.date]; }), state.rng, INV_PER_ROUND / 2);
        state.period = period;
        state.queue = shuffle(good.map(function (e) { return { event: e, good: true }; })
            .concat(bad.map(function (e) { return { event: e, good: false }; })), state.rng);
        state.spawnIn = 1;
    }

    function createInvaders(pool, rng) {
        var state = {
            pool: playable(pool), rng: rng || Math.random, lane: 1, cards: [], queue: [], period: -1, byPeriod: [],
            spawnIn: 1, cooldown: 0, lives: INV_LIVES, score: 0, rounds: 0, over: false, shot: 0, saved: 0, mistakes: []
        };
        for (var p = 0; p < PERIODS.length; p++) state.byPeriod.push([]);
        state.pool.forEach(function (e) { state.byPeriod[periodOf(e.date)].push(e); });
        // Chaque période doit pouvoir fournir ses quatre cartes, avec de quoi faire les anachronismes.
        if (state.byPeriod.some(function (list) { return pickDistinct(list, state.rng, INV_PER_ROUND / 2).length < INV_PER_ROUND / 2; })) {
            state.over = true; state.empty = true; return state;
        }
        invNewRound(state);
        return state;
    }

    function invMove(state, dx) {
        if (state.over) return;
        state.lane = Math.max(0, Math.min(INV_LANES - 1, state.lane + dx));
    }

    function invMoveTo(state, lane) {
        if (!state.over) state.lane = Math.max(0, Math.min(INV_LANES - 1, lane));
    }

    function invLoseLife(state, out) {
        state.lives -= 1;
        if (state.lives <= 0) { state.over = true; out.push({ type: 'over' }); }
    }

    // Tire sur la carte la plus basse de la voie. Renvoie : 'hit' (anachronisme abattu), 'friendly' (carte de la période : une
    // vie en moins), 'miss' (voie vide). Chaque événement porte la carte touchée.
    function invFire(state) {
        var out = [];
        if (state.over || state.cooldown > 0) return out;
        state.cooldown = INV_COOLDOWN;
        var target = null;
        state.cards.forEach(function (c) { if (c.lane === state.lane && (!target || c.y > target.y)) target = c; });
        if (!target) { out.push({ type: 'miss' }); return out; }
        state.cards.splice(state.cards.indexOf(target), 1);
        if (target.good) {
            state.mistakes.push(target);
            out.push({ type: 'friendly', card: target });
            invLoseLife(state, out);
        } else {
            state.score += 10;
            state.shot += 1;
            out.push({ type: 'hit', card: target });
        }
        return out;
    }

    // Avance de `dt` secondes : les cartes descendent, de nouvelles arrivent. Renvoie : 'saved' (une carte de la période
    // atteint le sol : tant mieux), 'breach' (un anachronisme y parvient : une vie en moins), 'round', 'over'.
    function invStep(state, dt) {
        var out = [];
        if (state.over) return out;
        state.cooldown = Math.max(0, state.cooldown - dt);
        state.spawnIn -= dt;
        if (state.spawnIn <= 0 && state.queue.length) {
            var free = [];
            for (var l = 0; l < INV_LANES; l++) {
                if (!state.cards.some(function (c) { return c.lane === l && c.y < 0.3; })) free.push(l);
            }
            if (free.length) {
                var next = state.queue.shift();
                state.cards.push({ event: next.event, good: next.good, lane: free[Math.floor(state.rng() * free.length)], y: 0.05 });
                state.spawnIn = invSpawnEvery(state);
            } else {
                state.spawnIn = 0.2;
            }
        }
        var speed = invSpeed(state);
        state.cards.slice().forEach(function (c) {
            c.y += speed * dt;
            if (c.y < INV_BREACH) return;
            state.cards.splice(state.cards.indexOf(c), 1);
            if (c.good) {
                state.saved += 1;
                state.score += 5;
                out.push({ type: 'saved', card: c });
            } else {
                state.mistakes.push(c);
                out.push({ type: 'breach', card: c });
                if (!state.over) invLoseLife(state, out);
            }
        });
        if (!state.over && !state.queue.length && !state.cards.length) {
            state.rounds += 1;
            state.score += 50;
            out.push({ type: 'round' });
            invNewRound(state);
        }
        return out;
    }

    // --- Meilleurs scores (propres à l'appareil) --------------------------------------------------------
    function normalizeBest(raw) {
        var out = { snake: 0, tetris: 0, pacman: 0, invaders: 0 };
        if (raw && typeof raw === 'object') {
            ['snake', 'tetris', 'pacman', 'invaders'].forEach(function (k) {
                if (raw[k] > 0) out[k] = Math.floor(raw[k]);
            });
        }
        return out;
    }

    function recordBest(raw, game, score) {
        var best = normalizeBest(raw);
        if (game in best && score > best[game]) best[game] = Math.floor(score);
        return best;
    }

    return {
        PERIODS: PERIODS, SNAKE_SIZE: SNAKE_SIZE, SNAKE_FOODS: SNAKE_FOODS, SNAKE_LIVES: SNAKE_LIVES,
        TETRIS_COLS: TETRIS_COLS, TETRIS_ROWS: TETRIS_ROWS, DIRS: DIRS,
        periodOf: periodOf, isAmbiguous: isAmbiguous, playable: playable, pickDistinct: pickDistinct, shuffle: shuffle,
        createSnake: createSnake, snakeTurn: snakeTurn, snakeStep: snakeStep, snakeInterval: snakeInterval,
        createTetris: createTetris, tetrisMove: tetrisMove, tetrisMoveTo: tetrisMoveTo, tetrisTick: tetrisTick,
        tetrisDrop: tetrisDrop, tetrisLevel: tetrisLevel, tetrisInterval: tetrisInterval,
        PAC_SIZE: PAC_SIZE, PAC_MAZE: PAC_MAZE, PAC_START: PAC_START, PAC_LIVES: PAC_LIVES, INV_LANES: INV_LANES, INV_BREACH: INV_BREACH,
        pacOpen: pacOpen, pacDistances: pacDistances, createPac: createPac, pacTurn: pacTurn, pacStep: pacStep, pacTarget: pacTarget,
        pacInterval: pacInterval,
        createInvaders: createInvaders, invMove: invMove, invMoveTo: invMoveTo, invFire: invFire, invStep: invStep, invSpeed: invSpeed,
        normalizeBest: normalizeBest, recordBest: recordBest
    };
}));
