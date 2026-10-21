// =========================================================================
// === LA SALLE D'ARCADE — SNAKE CHRONOLOGIQUE ET TETRIS DES SIÈCLES (écrans) ===
// =========================================================================
// Les règles sont dans js/arcadeCore.js (pur, testé) ; ici, le vivier d'événements tiré du pack chargé, les
// minuteurs, le dessin sur canvas, les commandes (boutons, clavier, glisser du doigt) et les écrans de fin.
// Le menu (`#screen-arcade`) s'ouvre depuis l'écran des catégories ; le Tetris est aussi proposé dans la fiche
// du niveau 5 du Monde 0. Un jeu rend la main à l'écran d'où on l'a ouvert (`snakeReturn`, `tetrisReturn`).

const ARCADE_KEY = 'historiaxe_arcade_v1';
// Les pastilles du Snake : une couleur ET une lettre (on ne se fie jamais à la seule couleur).
const SNAKE_COLORS = { A: '#dc2626', B: '#2563eb', C: '#b45309', D: '#7e22ce' };
const ARCADE_BOARD_BG = '#0f1a33';
const ARCADE_MAX_BOARD = 360;

let arcadePoolCache = null; // { bdd, size, pool }

// --- Le vivier ---------------------------------------------------------------------------------------
// Les événements connus (incontournables ou cités par plusieurs thèmes), un seul par fait, avec leur titre.
function arcadePool() {
    const current = window.bdd || bdd || [];
    const size = current.length;
    if (arcadePoolCache && arcadePoolCache.bdd === current && arcadePoolCache.size === size) return arcadePoolCache.pool;
    const data = pathData();
    const seen = new Set();
    const pool = [];
    PathCore.flattenEvents(current).forEach(item => {
        if (!(item.essential || item.fame >= 2) || seen.has(item.cluster)) return;
        const evt = data.byId.get(item.id);
        if (!evt || !evt.titre) return;
        seen.add(item.cluster);
        pool.push({ id: item.id, title: evt.titre, date: item.date });
    });
    arcadePoolCache = { bdd: current, size, pool };
    return pool;
}

function arcadeBest() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(ARCADE_KEY)); } catch (e) { raw = null; }
    return ArcadeCore.normalizeBest(raw);
}

function arcadeRecord(game, score) {
    const next = ArcadeCore.recordBest(arcadeBest(), game, score);
    try { localStorage.setItem(ARCADE_KEY, JSON.stringify(next)); } catch (e) {}
    return next;
}

// L'année sur un bloc : courte (−461 pour 461 av. J.-C.), elle doit tenir dans une case.
function arcadeShortYear(year) {
    return year < 0 ? '−' + Math.abs(year) : String(year);
}

// --- Le menu ------------------------------------------------------------------------------------------
function openArcade() {
    showScreen('screen-arcade', 'forward');
    const best = arcadeBest();
    ['snake', 'tetris'].forEach(game => {
        document.getElementById('arcade-best-' + game).textContent = best[game] > 0
            ? t('arcade.best', { score: best[game] }) : t('arcade.no_best');
    });
}

function arcadeBack() {
    showScreen('screen-categories', 'back');
}

// Le canvas, à la taille du conteneur (au plus ARCADE_MAX_BOARD), net sur les écrans à forte densité.
function arcadeFitCanvas(canvas, cols, rows, cellRatio) {
    const wrap = canvas.parentElement;
    const width = Math.max(200, Math.min(ARCADE_MAX_BOARD, wrap.clientWidth || ARCADE_MAX_BOARD));
    const cell = width / cols;
    const height = Math.round(cell * cellRatio * rows);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height, cellW: cell, cellH: cell * cellRatio };
}

function arcadeScreenVisible(id) {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
}

function arcadeSound(kind) {
    if (kind === 'good' && typeof playCorrectSound === 'function') playCorrectSound(1.0);
    if (kind === 'bad' && typeof playWrongSound === 'function') playWrongSound();
    if (typeof triggerHaptic === 'function') triggerHaptic(kind === 'good' ? 'success' : 'error');
}

// =====================================================================================================
// === SNAKE ===
// =====================================================================================================
let snakeGame = null;
let snakeTimer = 0;
let snakeReturn = 'screen-arcade';
let snakeTouch = null;

function openSnake(fromScreen) {
    snakeReturn = fromScreen || 'screen-arcade';
    snakeStop();
    snakeGame = null;
    showScreen('screen-snake', 'forward');
    document.getElementById('snake-over').classList.add('hidden');
    document.getElementById('snake-start').classList.remove('hidden');
    document.getElementById('snake-legend').innerHTML = '';
    document.getElementById('snake-status').textContent = '';
    snakeBindInput();
    snakeDraw();
}

function snakeBack() {
    snakeStop();
    showScreen(snakeReturn, 'back');
    if (snakeReturn === 'screen-arcade') openArcade();
    else if (snakeReturn === 'screen-path' && typeof renderPath === 'function') renderPath();
}

function snakeStop() {
    clearTimeout(snakeTimer);
    snakeTimer = 0;
}

function snakeStart() {
    const pool = arcadePool();
    const game = ArcadeCore.createSnake(pool);
    if (game.empty) { alert(t('arcade.empty')); return; }
    snakeStop();
    snakeGame = game;
    document.getElementById('snake-start').classList.add('hidden');
    document.getElementById('snake-over').classList.add('hidden');
    snakeRenderLegend();
    snakeRenderStatus();
    snakeDraw();
    snakeTimer = setTimeout(snakeLoop, ArcadeCore.snakeInterval(game));
}

function snakeLoop() {
    snakeTimer = 0;
    // L'écran quitté par une autre porte que « Retour » (ou l'onglet masqué) : on n'avance plus.
    if (!snakeGame || !arcadeScreenVisible('screen-snake')) return;
    if (!document.hidden) {
        const rounds = snakeGame.rounds;
        const events = ArcadeCore.snakeStep(snakeGame);
        if (events.includes('ok') || events.includes('round')) arcadeSound('good');
        if (events.includes('wrong') || events.includes('crash')) arcadeSound('bad');
        if (events.length || snakeGame.rounds !== rounds) { snakeRenderLegend(); snakeRenderStatus(); }
        snakeDraw();
        if (snakeGame.over) { snakeFinish(); return; }
    }
    snakeTimer = setTimeout(snakeLoop, ArcadeCore.snakeInterval(snakeGame));
}

function snakeTurnTo(name) {
    if (snakeGame) ArcadeCore.snakeTurn(snakeGame, name);
}

function snakeRenderStatus() {
    const g = snakeGame;
    document.getElementById('snake-status').textContent = t('snake.status', {
        round: g.rounds + 1, lives: '♥'.repeat(Math.max(0, g.lives)), score: g.score
    });
}

// Les événements de la manche, par lettre (l'ordre des lettres n'est pas l'ordre chronologique). Une fois mangé,
// un événement dévoile son année.
function snakeRenderLegend() {
    const list = document.getElementById('snake-legend');
    list.innerHTML = '';
    if (!snakeGame) return;
    snakeGame.items.slice().sort((a, b) => a.letter.localeCompare(b.letter)).forEach(item => {
        const li = document.createElement('li');
        li.className = 'snake-legend-item' + (item.eaten ? ' is-eaten' : '');
        const dot = document.createElement('span');
        dot.className = 'snake-dot';
        dot.style.background = SNAKE_COLORS[item.letter];
        dot.textContent = item.letter;
        dot.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span');
        text.textContent = item.event.title + (item.eaten ? ' — ' + formatYear(item.event.date) : '');
        li.appendChild(dot);
        li.appendChild(text);
        list.appendChild(li);
    });
}

function snakeDraw() {
    const canvas = document.getElementById('snake-canvas');
    const n = ArcadeCore.SNAKE_SIZE;
    const { ctx, width, cellW } = arcadeFitCanvas(canvas, n, n, 1);
    ctx.fillStyle = ARCADE_BOARD_BG;
    ctx.fillRect(0, 0, width, width);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i < n; i++) {
        ctx.beginPath(); ctx.moveTo(i * cellW, 0); ctx.lineTo(i * cellW, width); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cellW); ctx.lineTo(width, i * cellW); ctx.stroke();
    }
    const g = snakeGame;
    if (!g) return;
    g.foods.forEach(food => {
        const cx = (food.x + 0.5) * cellW, cy = (food.y + 0.5) * cellW;
        ctx.fillStyle = SNAKE_COLORS[food.item.letter];
        ctx.beginPath(); ctx.arc(cx, cy, cellW * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '700 ' + Math.round(cellW * 0.55) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(food.item.letter, cx, cy + 1);
    });
    g.snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? '#6ee7b7' : '#10b981';
        const pad = cellW * 0.08;
        ctx.fillRect(seg.x * cellW + pad, seg.y * cellW + pad, cellW - 2 * pad, cellW - 2 * pad);
    });
}

function snakeFinish() {
    snakeStop();
    const g = snakeGame;
    const best = arcadeRecord('snake', g.score);
    const over = document.getElementById('snake-over');
    document.getElementById('snake-over-text').textContent =
        t('snake.over_text', { rounds: g.rounds, score: g.score }) + ' ' + t('arcade.best', { score: best.snake });
    const list = document.getElementById('snake-over-list');
    list.innerHTML = '';
    g.mistakes.slice(0, 5).forEach(m => {
        const li = document.createElement('li');
        li.textContent = t('snake.mistake', {
            ate: m.ate.title, ate_year: formatYear(m.ate.date), expected: m.expected.title, expected_year: formatYear(m.expected.date)
        });
        list.appendChild(li);
    });
    over.classList.remove('hidden');
    document.getElementById('snake-start').classList.add('hidden');
}

// Les commandes : flèches (et WASD) au clavier, glisser du doigt sur le plateau. Le CSS ne pose pas
// `touch-action: none` (une règle de tests/a11y.test.js l'interdit : il empêcherait aussi le pincement) : on
// retient le défilement de la page seulement pendant un glissement sur le plateau, par écouteur non passif.
let snakeInputBound = false;
function snakeBindInput() {
    if (snakeInputBound) return;
    snakeInputBound = true;
    const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    document.addEventListener('keydown', e => {
        if (!arcadeScreenVisible('screen-snake') || !snakeGame || snakeGame.over) return;
        const dir = KEYS[e.key];
        if (!dir) return;
        e.preventDefault();
        snakeTurnTo(dir);
    });
    const board = document.getElementById('snake-canvas');
    board.addEventListener('touchstart', e => {
        const t0 = e.changedTouches[0];
        snakeTouch = { x: t0.clientX, y: t0.clientY };
    }, { passive: true });
    board.addEventListener('touchmove', e => {
        if (!snakeTouch || !snakeGame) return;
        e.preventDefault();
        const t0 = e.changedTouches[0];
        const dx = t0.clientX - snakeTouch.x, dy = t0.clientY - snakeTouch.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        snakeTurnTo(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        snakeTouch = { x: t0.clientX, y: t0.clientY };
    }, { passive: false });
    board.addEventListener('touchend', () => { snakeTouch = null; }, { passive: true });
}

// =====================================================================================================
// === TETRIS ===
// =====================================================================================================
let tetrisGame = null;
let tetrisTimer = 0;
let tetrisReturn = 'screen-arcade';
let tetrisInputBound = false;
// Une case est plus large que haute : cinq colonnes pour dix lignes tiennent sur un écran de téléphone.
const TETRIS_CELL_RATIO = 0.6;

function openTetris(fromScreen) {
    tetrisReturn = fromScreen || 'screen-arcade';
    tetrisStop();
    tetrisGame = null;
    showScreen('screen-tetris', 'forward');
    document.getElementById('tetris-over').classList.add('hidden');
    document.getElementById('tetris-start').classList.remove('hidden');
    document.getElementById('tetris-banner').textContent = '';
    document.getElementById('tetris-status').textContent = '';
    tetrisRenderHeads();
    tetrisBindInput();
    tetrisDraw();
}

function tetrisBack() {
    tetrisStop();
    showScreen(tetrisReturn, 'back');
    if (tetrisReturn === 'screen-arcade') openArcade();
    else if (tetrisReturn === 'screen-path' && typeof renderPath === 'function') renderPath();
}

function tetrisStop() {
    clearTimeout(tetrisTimer);
    tetrisTimer = 0;
}

// Les cinq périodes, au-dessus des colonnes : ce sont aussi des boutons (on y envoie le bloc).
function tetrisRenderHeads() {
    const box = document.getElementById('tetris-heads');
    box.innerHTML = '';
    ArcadeCore.PERIODS.forEach((period, col) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tetris-head';
        btn.onclick = () => tetrisGoTo(col);
        const name = document.createElement('strong');
        name.textContent = period.name;
        const range = document.createElement('small');
        range.textContent = period.range;
        btn.appendChild(name);
        btn.appendChild(range);
        box.appendChild(btn);
    });
}

function tetrisStart() {
    const game = ArcadeCore.createTetris(arcadePool());
    if (game.empty) { alert(t('arcade.empty')); return; }
    tetrisStop();
    tetrisGame = game;
    document.getElementById('tetris-start').classList.add('hidden');
    document.getElementById('tetris-over').classList.add('hidden');
    tetrisRender();
    tetrisTimer = setTimeout(tetrisLoop, ArcadeCore.tetrisInterval(game));
}

function tetrisLoop() {
    tetrisTimer = 0;
    if (!tetrisGame || !arcadeScreenVisible('screen-tetris')) return;
    if (!document.hidden) tetrisAfter(ArcadeCore.tetrisTick(tetrisGame));
    if (tetrisGame.over) return;
    tetrisTimer = setTimeout(tetrisLoop, ArcadeCore.tetrisInterval(tetrisGame));
}

function tetrisAfter(events) {
    if (events.includes('good') || events.includes('clear')) arcadeSound('good');
    if (events.includes('bad')) arcadeSound('bad');
    tetrisRender();
    if (tetrisGame.over) tetrisFinish();
}

function tetrisGoTo(col) {
    if (tetrisGame && !tetrisGame.over) { ArcadeCore.tetrisMoveTo(tetrisGame, col); tetrisDraw(); }
}

function tetrisShift(dx) {
    if (tetrisGame && !tetrisGame.over) { ArcadeCore.tetrisMove(tetrisGame, dx); tetrisDraw(); }
}

function tetrisDropNow() {
    if (!tetrisGame || tetrisGame.over) return;
    tetrisAfter(ArcadeCore.tetrisDrop(tetrisGame));
}

function tetrisRender() {
    const g = tetrisGame;
    document.getElementById('tetris-status').textContent = t('tetris.status', {
        score: g.score, rows: g.cleared, level: ArcadeCore.tetrisLevel(g)
    });
    document.getElementById('tetris-banner').textContent = g.piece ? t('tetris.banner', { title: g.piece.event.title }) : '';
    tetrisDraw();
}

function tetrisDraw() {
    const canvas = document.getElementById('tetris-canvas');
    const cols = ArcadeCore.TETRIS_COLS, rows = ArcadeCore.TETRIS_ROWS;
    const { ctx, width, height, cellW, cellH } = arcadeFitCanvas(canvas, cols, rows, TETRIS_CELL_RATIO);
    ctx.fillStyle = ARCADE_BOARD_BG;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let c = 1; c < cols; c++) {
        ctx.beginPath(); ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, height); ctx.stroke();
    }
    const g = tetrisGame;
    if (!g) return;
    const block = (col, row, fill, text) => {
        const pad = 2;
        ctx.fillStyle = fill;
        ctx.fillRect(col * cellW + pad, row * cellH + pad, cellW - 2 * pad, cellH - 2 * pad);
        ctx.fillStyle = '#fff';
        ctx.font = '700 ' + Math.round(cellH * 0.45) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, (col + 0.5) * cellW, (row + 0.5) * cellH + 1);
    };
    if (g.piece) {
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(g.piece.col * cellW, 0, cellW, height);
    }
    g.grid.forEach((line, r) => line.forEach((cell, c) => {
        if (cell) block(c, r, cell.good ? '#16a34a' : '#dc2626', arcadeShortYear(cell.event.date));
    }));
    if (g.piece) block(g.piece.col, g.piece.row, '#2563eb', '?');
}

function tetrisFinish() {
    tetrisStop();
    const g = tetrisGame;
    const best = arcadeRecord('tetris', g.score);
    document.getElementById('tetris-over-text').textContent =
        t('tetris.over_text', { placed: g.placed, good: g.good, rows: g.cleared, score: g.score }) + ' ' + t('arcade.best', { score: best.tetris });
    const list = document.getElementById('tetris-over-list');
    list.innerHTML = '';
    g.mistakes.slice(0, 5).forEach(m => {
        const li = document.createElement('li');
        li.textContent = t('tetris.mistake', {
            title: m.event.title, year: formatYear(m.event.date),
            expected: ArcadeCore.PERIODS[m.expected].name, chosen: ArcadeCore.PERIODS[m.chosen].name
        });
        list.appendChild(li);
    });
    document.getElementById('tetris-over').classList.remove('hidden');
    document.getElementById('tetris-start').classList.add('hidden');
}

function tetrisBindInput() {
    if (tetrisInputBound) return;
    tetrisInputBound = true;
    document.addEventListener('keydown', e => {
        if (!arcadeScreenVisible('screen-tetris') || !tetrisGame || tetrisGame.over) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); tetrisShift(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); tetrisShift(1); }
        else if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); tetrisDropNow(); }
    });
    // Un tap sur une colonne du plateau y envoie le bloc.
    document.getElementById('tetris-canvas').addEventListener('click', e => {
        const rect = e.currentTarget.getBoundingClientRect();
        tetrisGoTo(Math.max(0, Math.min(ArcadeCore.TETRIS_COLS - 1, Math.floor((e.clientX - rect.left) / rect.width * ArcadeCore.TETRIS_COLS))));
    });
}
