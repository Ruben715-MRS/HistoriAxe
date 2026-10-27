// =========================================================================
// === LA SALLE D'ARCADE — SNAKE CHRONOLOGIQUE ET TETRIS DES SIÈCLES (écrans) ===
// =========================================================================
// Les règles sont dans js/arcadeCore.js (pur, testé) ; ici, le vivier d'événements tiré du pack chargé, les
// minuteurs, le dessin sur canvas, les commandes (boutons, clavier, glisser du doigt) et les écrans de fin.
// Quatre jeux : Snake, Tetris, Pac-Man, Space Invaders. Le menu (`#screen-arcade`) s'ouvre depuis l'écran des
// catégories ; le Tetris est aussi proposé dans la fiche du niveau 5 du Monde 0. Un jeu rend la main à l'écran
// d'où on l'a ouvert (`snakeReturn`, `tetrisReturn`…).

const ARCADE_KEY = 'historiaxe_arcade_v1';
// Les pastilles du Snake : une couleur ET une lettre (on ne se fie jamais à la seule couleur).
const SNAKE_COLORS = { A: '#dc2626', B: '#2563eb', C: '#b45309', D: '#7e22ce' };
const ARCADE_BOARD_BG = '#0f1a33';
const ARCADE_MAX_BOARD = 360;

let arcadePoolCache = null; // { bdd, size, pool }
// Les mini-jeux sur des axes choisis (depuis l'écran des axes d'un thème) : { key, label, axes, pool }, ou null pour la salle entière.
let arcadeScope = null;
const ARCADE_SCOPE_KEY = 'historiaxe_arcade_scope_v1';   // les records de chaque sélection d'axes : { [scopeKey]: best }
// Les jeux qui tirent leur vivier (les autres ne dépendent pas des événements choisis, et restent à la salle entière).
const ARCADE_POOL_GAMES = ['snake', 'tetris', 'pacman', 'invaders', 'breakout', 'flappy', 'race', 'memory', 'hangman'];
// Ceux qui exigent des événements dans chaque grande période de l'histoire (et non seulement un nombre suffisant).
const ARCADE_PERIOD_GAMES = ['tetris', 'invaders'];

// --- Le vivier ---------------------------------------------------------------------------------------
// Seuls les ⭐ incontournables des thèmes, un seul par fait, avec leur titre : un événement obscur ne se devine pas, et le jeu n'y
// gagne rien. (Si le pack chargé en compte trop peu, on y ajoute les événements cités par plusieurs thèmes plutôt que de manquer de cartes.)
const ARCADE_MIN_POOL = 60;

function arcadePool() {
    if (arcadeScope) return arcadeScope.pool;
    const current = window.bdd || bdd || [];
    const size = current.length;
    if (arcadePoolCache && arcadePoolCache.bdd === current && arcadePoolCache.size === size) return arcadePoolCache.pool;
    const data = pathData();
    const items = PathCore.flattenEvents(current);
    const build = known => {
        const seen = new Set();
        const pool = [];
        items.forEach(item => {
            if (!known(item) || seen.has(item.cluster)) return;
            const evt = data.byId.get(item.id);
            if (!evt || !evt.titre) return;
            seen.add(item.cluster);
            pool.push({ id: item.id, title: evt.titre, date: item.date });
        });
        return pool;
    };
    let pool = build(item => item.essential);
    if (pool.length < ARCADE_MIN_POOL) pool = build(item => item.essential || item.fame >= 2);
    arcadePoolCache = { bdd: current, size, pool };
    return pool;
}

function arcadeBest() {
    if (arcadeScope) return arcadeScopeBest();
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(ARCADE_KEY)); } catch (e) { raw = null; }
    return ArcadeCore.normalizeBest(raw);
}

// Les records d'une sélection d'axes, rangés à part : un score sur cinq axes ne se compare pas à un score sur un seul.
function arcadeScopeLoad() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(ARCADE_SCOPE_KEY)); } catch (e) { raw = null; }
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}

function arcadeScopeBest() {
    return ArcadeCore.normalizeBest(arcadeScopeLoad()[arcadeScope.key]);
}

function arcadeScopeRecord(game, score) {
    const all = arcadeScopeLoad();
    all[arcadeScope.key] = ArcadeCore.recordBest(all[arcadeScope.key], game, score);
    try { localStorage.setItem(ARCADE_SCOPE_KEY, JSON.stringify(all)); } catch (e) {}
    return all[arcadeScope.key];
}

function arcadeRecord(game, score) {
    if (arcadeScope) return arcadeScopeRecord(game, score);
    const next = ArcadeCore.recordBest(arcadeBest(), game, score);
    try { localStorage.setItem(ARCADE_KEY, JSON.stringify(next)); } catch (e) {}
    return next;
}

// --- La difficulté : facile / moyen / difficile, retenue jeu par jeu --------------------------------------------
// Le niveau choisi pèse sur le score compté pour le record (ArcadeCore.difficultyScore) : un seul meilleur score par jeu.
const ARCADE_DIFFICULTY_KEY = 'historiaxe_arcade_difficulty_v1';

function arcadeDifficulty(game) {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(ARCADE_DIFFICULTY_KEY)); } catch (e) { raw = null; }
    return ArcadeCore.normalizeDifficulty(raw && typeof raw === 'object' ? raw[game] : null);
}

function arcadeSetDifficulty(game, difficulty) {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(ARCADE_DIFFICULTY_KEY)); } catch (e) { raw = null; }
    const next = Object.assign({}, raw && typeof raw === 'object' ? raw : {}, { [game]: ArcadeCore.normalizeDifficulty(difficulty) });
    try { localStorage.setItem(ARCADE_DIFFICULTY_KEY, JSON.stringify(next)); } catch (e) {}
}

function arcadeMultiplierLabel(difficulty) {
    return new Intl.NumberFormat(document.documentElement.lang || 'fr').format(ArcadeCore.DIFFICULTY_MULTIPLIER[difficulty]);
}

// Trois boutons à choix unique dans `#<game>-difficulty`, et une ligne qui dit ce que le niveau change aux points.
function renderArcadeDifficulty(game) {
    const box = document.getElementById(game + '-difficulty');
    if (!box) return;
    const current = arcadeDifficulty(game);
    box.innerHTML = '';
    const group = document.createElement('div');
    group.className = 'arcade-difficulty-group';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', t('arcade.difficulty_label'));
    ArcadeCore.DIFFICULTIES.forEach(level => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'arcade-difficulty-btn' + (level === current ? ' is-active' : '');
        btn.setAttribute('aria-pressed', level === current ? 'true' : 'false');
        btn.textContent = t('arcade.difficulty_' + level);
        btn.addEventListener('click', () => { arcadeSetDifficulty(game, level); renderArcadeDifficulty(game); });
        group.appendChild(btn);
    });
    const hint = document.createElement('small');
    hint.className = 'arcade-difficulty-hint';
    hint.textContent = t('arcade.difficulty_hint', { mult: arcadeMultiplierLabel(current) });
    box.appendChild(group);
    box.appendChild(hint);
}

// La fin d'une partie : le score compté pour le record, et une phrase qui montre le calcul quand le niveau le change.
function arcadeWeighted(game, rawScore, difficulty) {
    const total = ArcadeCore.difficultyScore(rawScore, difficulty);
    const note = difficulty === 'normal' ? '' : ' ' + t('arcade.weighted', {
        level: t('arcade.difficulty_' + difficulty), mult: arcadeMultiplierLabel(difficulty), total
    });
    return { total, note };
}

// L'année sur un bloc : courte (−461 pour 461 av. J.-C.), elle doit tenir dans une case.
function arcadeShortYear(year) {
    return year < 0 ? '−' + Math.abs(year) : String(year);
}

// Le glisser du doigt sur un plateau : appelle `onDir('up'|'down'|'left'|'right')`. Le CSS ne pose pas
// `touch-action: none` (une règle de tests/a11y.test.js l'interdit : il empêcherait aussi le pincement) : on
// retient le défilement de la page seulement pendant un glissement sur le plateau, par écouteur non passif.
function arcadeBindSwipe(el, onDir) {
    let start = null;
    el.addEventListener('touchstart', e => {
        const t0 = e.changedTouches[0];
        start = { x: t0.clientX, y: t0.clientY };
    }, { passive: true });
    el.addEventListener('touchmove', e => {
        if (!start) return;
        e.preventDefault();
        const t0 = e.changedTouches[0];
        const dx = t0.clientX - start.x, dy = t0.clientY - start.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        onDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        start = { x: t0.clientX, y: t0.clientY };
    }, { passive: false });
    el.addEventListener('touchend', () => { start = null; }, { passive: true });
}

// --- La salle de jeux : le menu ----------------------------------------------------------------------
// L'écran garde son ancien identifiant (`screen-arcade`). Trois sections — mini-jeux, arcade, réflexion — et, sur
// chaque carte, ce que le joueur y a fait : meilleur score, étoiles, calendriers terminés.
function openArcade() {
    arcadeScope = null;
    showScreen('screen-arcade', 'forward');
    renderGamesHub();
}

// Un jeu peut-il se jouer avec le vivier courant ? Chaque jeu refuse lui-même un vivier trop petit (`empty`) : on le lui demande.
function arcadeGameFits(game) {
    const pool = arcadePool();
    const make = {
        snake: () => ArcadeCore.createSnake(pool),
        tetris: () => ArcadeCore.createTetris(pool),
        pacman: () => ArcadeCore.createPac(pool),
        invaders: () => ArcadeCore.createInvaders(pool),
        breakout: () => ArcadeExtraCore.createBreakout(pool),
        flappy: () => ArcadeExtraCore.createFlappy(pool),
        race: () => ArcadeExtraCore.createRace(pool),
        memory: () => ReflexionCore.createMemory(pool),
        hangman: () => ReflexionCore.createHangman(pool)
    };
    return !make[game]().empty;
}

// Les cartes de la salle, en mode « axes choisis » : seuls les jeux à vivier, et ceux qui ont assez d'événements sont accessibles.
function renderGamesScope() {
    const banner = document.getElementById('arcade-scope');
    banner.classList.toggle('hidden', !arcadeScope);
    if (arcadeScope) banner.textContent = t('arcade.scope_banner', { theme: arcadeScope.label, axes: arcadeScope.axes, count: arcadeScope.pool.length });
    // Chaque carte du menu : son jeu (d'après son compteur de meilleur score), ou aucun (le Quiz des pays ne dépend pas des événements).
    document.querySelectorAll('#screen-arcade .arcade-card').forEach(card => {
        const best = card.querySelector('[id^="arcade-best-"]');
        const game = best ? best.id.slice('arcade-best-'.length) : null;
        const inScope = !arcadeScope || ARCADE_POOL_GAMES.includes(game);
        card.classList.toggle('hidden', !inScope);
        const fits = !arcadeScope || !inScope || arcadeGameFits(game);
        card.disabled = !fits;
        card.classList.toggle('is-unavailable', !fits);
        let why = card.querySelector('.arcade-why');
        if (!fits && !why) {
            why = document.createElement('small');
            why.className = 'arcade-why';
            card.querySelector('.arcade-card-text').appendChild(why);
        }
        if (why) {
            why.classList.toggle('hidden', fits);
            if (!fits) why.textContent = ARCADE_PERIOD_GAMES.includes(game) ? t('arcade.scope_periods') : t('arcade.scope_too_few', { count: arcadeScope.pool.length });
        }
    });
    // Une section sans carte visible (les jeux géographiques, en portée) n'a pas lieu d'être affichée.
    document.querySelectorAll('#screen-arcade .games-section').forEach(section => {
        section.classList.toggle('hidden', !section.querySelector('.arcade-card:not(.hidden)'));
    });
}

function renderGamesHub() {
    const best = arcadeBest();
    ['snake', 'tetris', 'pacman', 'invaders', 'memory', 'who', 'cause', 'scene', 'breakout', 'flappy', 'race', 'hangman', 'roman'].forEach(game => {
        document.getElementById('arcade-best-' + game).textContent = best[game] > 0
            ? t('arcade.best', { score: best[game] }) : t('arcade.no_best');
    });
    renderGamesScope();
    const done = Object.keys(wheelProgress()).length;
    document.getElementById('arcade-best-wheel').textContent = done > 0
        ? t('arcade.wheel_progress', { done, total: CalendarWheel.CALENDARS.length }) : t('arcade.no_best');
    // L'Avent : les cases ouvertes cette année (le calendrier se joue une fois par case, pas pour un score).
    const advent = MiniGamesCore.adventCounts(adventProgress(), adventYear());
    document.getElementById('arcade-best-advent').textContent = advent.opened > 0
        ? t('arcade.advent_progress', { opened: advent.opened, total: MiniGamesCore.ADVENT_DAYS, right: advent.right }) : t('arcade.no_best');
    const eras = erasProgress();
    document.getElementById('arcade-best-eras').textContent = eras
        ? t('arcade.stars_best', { stars: '★'.repeat(eras.stars) + '☆'.repeat(EraConverter.MAX_STARS - eras.stars) }) : t('arcade.no_best');
}

// Le retour d'un jeu vers l'écran d'où on l'a ouvert (la salle de jeux, ou le Chemin), mis à jour.
function gamesBackTo(screenId) {
    showScreen(screenId, 'back');
    if (screenId === 'screen-arcade') renderGamesHub();
    else if (screenId === 'screen-path' && typeof renderPath === 'function') renderPath();
}

function arcadeBack() {
    if (arcadeScope) {
        arcadeScope = null;
        showScreen('screen-axes', 'back');
        return;
    }
    showScreen('screen-categories', 'back');
}

// « Mini-jeux » sur l'écran des axes : la salle s'ouvre sur les seuls événements des axes cochés, tous, incontournables ou non.
function openMinigamesFromAxes() {
    const theme = getCurrentTheme();
    const axes = [...selectedAxes];
    if (!theme || !axes.length) return;
    const pool = ArcadeCore.themePool(theme.events, axes);
    arcadeScope = { key: ArcadeCore.scopeKey(theme.id, axes), label: theme.nom, axes: axes.length, pool: pool };
    showScreen('screen-arcade', 'forward');
    renderGamesHub();
}

// Le canvas, à la taille du conteneur (au plus ARCADE_MAX_BOARD), net sur les écrans à forte densité.
function arcadeFitCanvas(canvas, cols, rows, cellRatio) {
    const wrap = canvas.parentElement;
    const width = Math.max(200, Math.min(ARCADE_MAX_BOARD, wrap.clientWidth || ARCADE_MAX_BOARD));
    const cell = width / cols;
    const height = Math.round(cell * cellRatio * rows);
    const dpr = window.devicePixelRatio || 1;
    const pxW = Math.round(width * dpr);
    const pxH = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (canvas.width !== pxW || canvas.height !== pxH) {
        // Redimensionner efface et réalloue le canevas : seulement quand la taille change, pas à chaque image.
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.width = pxW;
        canvas.height = pxH;
    } else {
        ctx.clearRect(0, 0, pxW, pxH);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height, cellW: cell, cellH: cell * cellRatio };
}

function arcadeScreenVisible(id) {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
}

// Les bruitages propres aux jeux (js/audio.js) : tir, explosion, pas de Pac-Man, battement d'ailes…
function arcadeSfx(kind) {
    if (typeof playArcadeSfx === 'function') playArcadeSfx(kind);
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
    gamesBackTo(snakeReturn);
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

// Les commandes : flèches (et WASD) au clavier, glisser du doigt sur le plateau (arcadeBindSwipe).
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
    arcadeBindSwipe(document.getElementById('snake-canvas'), snakeTurnTo);
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
    gamesBackTo(tetrisReturn);
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
    if (tetrisGame && !tetrisGame.over) { ArcadeCore.tetrisMove(tetrisGame, dx); arcadeSfx('move'); tetrisDraw(); }
}

function tetrisDropNow() {
    if (!tetrisGame || tetrisGame.over) return;
    arcadeSfx('drop');
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

// =====================================================================================================
// === PAC-MAN DE LA FRISE ===
// =====================================================================================================
// Durée de chaque chiffre du compte à rebours : plus longue au départ et pour une nouvelle manche (nouvelle consigne à lire).
const PAC_COUNT_ROUND_MS = 1000;
const PAC_COUNT_LIFE_MS = 750;
const PAC_GHOST_COLORS = ['#ef4444', '#f472b6', '#22d3ee'];
let pacGame = null;
let pacTimer = 0;
let pacCountTimer = 0;
let pacCountHideTimer = 0;
let pacReturn = 'screen-arcade';
let pacInputBound = false;

function arcadeMessage(id, text, wrong) {
    const box = document.getElementById(id);
    box.textContent = text;
    box.classList.toggle('is-wrong', !!wrong);
    box.classList.toggle('hidden', !text);
}

function openPacman(fromScreen) {
    pacReturn = fromScreen || 'screen-arcade';
    pacmanStop();
    pacGame = null;
    showScreen('screen-pacman', 'forward');
    document.getElementById('pacman-over').classList.add('hidden');
    document.getElementById('pacman-start').classList.remove('hidden');
    document.getElementById('pacman-banner').textContent = '';
    document.getElementById('pacman-status').textContent = '';
    arcadeMessage('pacman-message', '');
    renderArcadeDifficulty('pacman');
    document.getElementById('pacman-difficulty').classList.remove('hidden');
    pacmanBindInput();
    pacmanDraw();
}

function pacmanBack() {
    pacmanStop();
    gamesBackTo(pacReturn);
}

function pacmanStop() {
    clearTimeout(pacTimer);
    clearTimeout(pacCountTimer);
    clearTimeout(pacCountHideTimer);
    pacTimer = pacCountTimer = pacCountHideTimer = 0;
    const box = document.getElementById('pacman-countdown');
    if (box) box.classList.add('hidden');
}

// « 3, 2, 1, Go ! » sur le labyrinthe : la consigne et les dates restent lisibles, le jeu est figé jusqu'au « Go ! ».
// `stepMs` : la durée de chaque chiffre (plus longue quand il y a une nouvelle consigne à lire).
function pacmanCountdown(stepMs) {
    const box = document.getElementById('pacman-countdown');
    const steps = ['3', '2', '1', t('arcade.go')];
    let i = 0;
    box.classList.remove('hidden');
    const next = () => {
        pacCountTimer = 0;
        if (!pacGame || pacGame.over || !arcadeScreenVisible('screen-pacman')) { box.classList.add('hidden'); return; }
        box.textContent = steps[i];
        box.classList.toggle('is-go', i === steps.length - 1);
        // Relance l'animation d'arrivée du chiffre.
        box.classList.remove('is-pop');
        void box.offsetWidth;
        box.classList.add('is-pop');
        arcadeSfx(i === steps.length - 1 ? 'go' : 'count');
        if (i === steps.length - 1) {
            ArcadeCore.pacRelease(pacGame);
            pacTimer = setTimeout(pacmanLoop, ArcadeCore.pacInterval(pacGame));
            pacCountHideTimer = setTimeout(() => { pacCountHideTimer = 0; box.classList.add('hidden'); }, 700);
            return;
        }
        i += 1;
        pacCountTimer = setTimeout(next, stepMs);
    };
    next();
}

function pacmanStart() {
    const game = ArcadeCore.createPac(arcadePool(), undefined, { difficulty: arcadeDifficulty('pacman') });
    if (game.empty) { alert(t('arcade.empty')); return; }
    pacmanStop();
    pacGame = game;
    document.getElementById('pacman-start').classList.add('hidden');
    document.getElementById('pacman-over').classList.add('hidden');
    arcadeMessage('pacman-message', '');
    document.getElementById('pacman-difficulty').classList.add('hidden');
    pacmanRender();
    pacmanCountdown(PAC_COUNT_ROUND_MS);
}

function pacmanLoop() {
    pacTimer = 0;
    if (!pacGame || !arcadeScreenVisible('screen-pacman')) return;
    if (!document.hidden) {
        const target = ArcadeCore.pacTarget(pacGame);
        const before = { x: pacGame.player.x, y: pacGame.player.y };
        const events = ArcadeCore.pacStep(pacGame);
        if (pacGame.player.x !== before.x || pacGame.player.y !== before.y) arcadeSfx('chomp');
        if (events.includes('ok')) {
            arcadeSound('good');
            arcadeMessage('pacman-message', t('pacman.ok', { year: formatYear(target.date), title: target.title }), false);
        }
        if (events.includes('wrong')) {
            const m = pacGame.mistakes[pacGame.mistakes.length - 1];
            arcadeSound('bad');
            arcadeMessage('pacman-message', t('pacman.wrong', { year: formatYear(m.ate.date), title: m.ate.title, wanted: m.wanted.title }), true);
        }
        if (events.includes('caught')) {
            arcadeSound('bad');
            arcadeMessage('pacman-message', t('pacman.caught'), true);
        }
        pacmanRender();
        if (pacGame.over) { pacmanFinish(); return; }
        // Une vie perdue ou une manche réussie : on refige, on laisse relire la consigne, puis « 3, 2, 1, Go ! ».
        if (pacGame.frozen) { pacmanCountdown(events.includes('round') ? PAC_COUNT_ROUND_MS : PAC_COUNT_LIFE_MS); return; }
    }
    pacTimer = setTimeout(pacmanLoop, ArcadeCore.pacInterval(pacGame));
}

function pacmanTurnTo(name) {
    if (pacGame) ArcadeCore.pacTurn(pacGame, name);
}

function pacmanRender() {
    const g = pacGame;
    document.getElementById('pacman-status').textContent = t('pacman.status', {
        round: g.rounds + 1, lives: '♥'.repeat(Math.max(0, g.lives)), score: g.score
    });
    const target = ArcadeCore.pacTarget(g);
    document.getElementById('pacman-banner').textContent = target ? t('pacman.banner', { title: target.title }) : '';
    pacmanDraw();
}

function pacmanDraw() {
    const canvas = document.getElementById('pacman-canvas');
    const n = ArcadeCore.PAC_SIZE;
    const { ctx, width, cellW } = arcadeFitCanvas(canvas, n, n, 1);
    ctx.fillStyle = ARCADE_BOARD_BG;
    ctx.fillRect(0, 0, width, width);
    ctx.fillStyle = '#1e3a8a';
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            if (!ArcadeCore.pacOpen(x, y)) ctx.fillRect(x * cellW + 1, y * cellW + 1, cellW - 2, cellW - 2);
        }
    }
    const g = pacGame;
    if (!g) return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    g.pellets.forEach(p => {
        const cx = (p.x + 0.5) * cellW, cy = (p.y + 0.5) * cellW;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.arc(cx, cy, cellW * 0.47, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1f2937';
        const year = arcadeShortYear(p.event.date);
        ctx.font = '700 ' + Math.round(cellW * (year.length > 4 ? 0.27 : 0.32)) + 'px sans-serif';
        ctx.fillText(year, cx, cy + 1);
    });
    // Pac-Man : un disque jaune, la bouche tournée vers sa direction et qui s'ouvre un pas sur deux.
    const px = (g.player.x + 0.5) * cellW, py = (g.player.y + 0.5) * cellW;
    const facing = Math.atan2(g.dir.y, g.dir.x);
    const mouth = g.tick % 2 ? 0.1 : 0.45;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, cellW * 0.42, facing + mouth, facing + Math.PI * 2 - mouth);
    ctx.closePath();
    ctx.fill();
    g.ghosts.forEach((ghost, i) => {
        const gx = (ghost.x + 0.5) * cellW, gy = (ghost.y + 0.5) * cellW, r = cellW * 0.4;
        ctx.fillStyle = PAC_GHOST_COLORS[i % PAC_GHOST_COLORS.length];
        ctx.beginPath();
        ctx.arc(gx, gy - r * 0.1, r, Math.PI, 0);
        ctx.lineTo(gx + r, gy + r);
        ctx.lineTo(gx - r, gy + r);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(gx - r * 0.35, gy - r * 0.2, r * 0.22, 0, Math.PI * 2); ctx.arc(gx + r * 0.35, gy - r * 0.2, r * 0.22, 0, Math.PI * 2); ctx.fill();
    });
}

function pacmanFinish() {
    pacmanStop();
    const g = pacGame;
    const weighted = arcadeWeighted('pacman', g.score, g.difficulty);
    const best = arcadeRecord('pacman', weighted.total);
    document.getElementById('pacman-over-text').textContent =
        t('pacman.over_text', { rounds: g.rounds, score: g.score }) + weighted.note + ' ' + t('arcade.best', { score: best.pacman });
    const list = document.getElementById('pacman-over-list');
    list.innerHTML = '';
    g.mistakes.slice(0, 5).forEach(m => {
        const li = document.createElement('li');
        li.textContent = t('pacman.mistake', {
            year: formatYear(m.ate.date), ate: m.ate.title, wanted: m.wanted.title, wanted_year: formatYear(m.wanted.date)
        });
        list.appendChild(li);
    });
    document.getElementById('pacman-over').classList.remove('hidden');
    document.getElementById('pacman-start').classList.add('hidden');
    renderArcadeDifficulty('pacman');
    document.getElementById('pacman-difficulty').classList.remove('hidden');
}

function pacmanBindInput() {
    if (pacInputBound) return;
    pacInputBound = true;
    const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    document.addEventListener('keydown', e => {
        if (!arcadeScreenVisible('screen-pacman') || !pacGame || pacGame.over) return;
        const dir = KEYS[e.key];
        if (!dir) return;
        e.preventDefault();
        pacmanTurnTo(dir);
    });
    arcadeBindSwipe(document.getElementById('pacman-canvas'), pacmanTurnTo);
}

// =====================================================================================================
// === SPACE INVADERS DES ANACHRONISMES ===
// =====================================================================================================
const INVADERS_TICK_MS = 50;
const INVADERS_CARD_H = 0.13;
let invGame = null;
let invTimer = 0;
let invLast = 0;
let invReturn = 'screen-arcade';
let invInputBound = false;
let invFx = null; // { lane, until } : le trait du tir

function openInvaders(fromScreen) {
    invReturn = fromScreen || 'screen-arcade';
    invadersStop();
    invGame = null;
    showScreen('screen-invaders', 'forward');
    document.getElementById('invaders-over').classList.add('hidden');
    document.getElementById('invaders-start').classList.remove('hidden');
    document.getElementById('invaders-banner').textContent = '';
    document.getElementById('invaders-status').textContent = '';
    arcadeMessage('invaders-message', '');
    invadersBindInput();
    invadersDraw();
}

function invadersBack() {
    invadersStop();
    gamesBackTo(invReturn);
}

function invadersStop() {
    clearTimeout(invTimer);
    invTimer = 0;
}

function invadersStart() {
    const game = ArcadeCore.createInvaders(arcadePool());
    if (game.empty) { alert(t('arcade.empty')); return; }
    invadersStop();
    invGame = game;
    invFx = null;
    document.getElementById('invaders-start').classList.add('hidden');
    document.getElementById('invaders-over').classList.add('hidden');
    arcadeMessage('invaders-message', '');
    invadersRender();
    invLast = performance.now();
    invTimer = setTimeout(invadersLoop, INVADERS_TICK_MS);
}

function invadersLoop() {
    invTimer = 0;
    if (!invGame || !arcadeScreenVisible('screen-invaders')) return;
    const now = performance.now();
    // Un onglet resté caché ne doit pas faire tomber les cartes d'un coup au retour : on borne le pas de temps.
    const dt = document.hidden ? 0 : Math.min(0.1, (now - invLast) / 1000);
    invLast = now;
    if (dt > 0) invadersAfter(ArcadeCore.invStep(invGame, dt));
    else invadersDraw();
    if (invGame.over) return;
    invTimer = setTimeout(invadersLoop, INVADERS_TICK_MS);
}

function invadersPeriodName(event) {
    return ArcadeCore.PERIODS[ArcadeCore.periodOf(event.date)].name;
}

// Ce qui vient d'arriver, dit en une phrase : on apprend de chaque tir comme de chaque carte laissée.
function invadersAfter(events) {
    events.forEach(ev => {
        const c = ev.card;
        const base = c ? { title: c.event.title, year: formatYear(c.event.date), actual: invadersPeriodName(c.event), period: ArcadeCore.PERIODS[invGame.period].name } : null;
        if (ev.type === 'hit') { arcadeSfx('explosion'); triggerHaptic('success'); arcadeMessage('invaders-message', t('invaders.hit', base), false); }
        else if (ev.type === 'saved') arcadeMessage('invaders-message', t('invaders.saved', base), false);
        else if (ev.type === 'friendly') { arcadeSound('bad'); arcadeMessage('invaders-message', t('invaders.friendly', base), true); }
        else if (ev.type === 'breach') { arcadeSound('bad'); arcadeMessage('invaders-message', t('invaders.breach', base), true); }
        else if (ev.type === 'round') { arcadeSound('good'); arcadeMessage('invaders-message', t('invaders.round'), false); }
    });
    invadersRender();
    if (invGame.over) invadersFinish();
}

function invadersFire() {
    if (!invGame || invGame.over) return;
    const lane = invGame.lane;
    const events = ArcadeCore.invFire(invGame);
    if (events.length) { invFx = { lane, until: performance.now() + 120 }; arcadeSfx('shoot'); }
    invadersAfter(events);
}

function invadersShift(dx) {
    if (invGame && !invGame.over) { ArcadeCore.invMove(invGame, dx); invadersDraw(); }
}

function invadersRender() {
    const g = invGame;
    document.getElementById('invaders-status').textContent = t('invaders.status', {
        round: g.rounds + 1, lives: '♥'.repeat(Math.max(0, g.lives)), score: g.score
    });
    const period = ArcadeCore.PERIODS[g.period];
    // Le nom de la période, avec ses bornes sauf quand le nom les donne déjà (« 1789-1914 »).
    const label = /\d/.test(period.name) ? period.name : period.name + ' (' + period.range + ')';
    document.getElementById('invaders-banner').textContent = t('invaders.banner', { period: label });
    invadersDraw();
}

// Le titre d'une carte, coupé en lignes qui tiennent dans `maxWidth` (trois au plus, avec « … »).
function invadersWrap(ctx, text, maxWidth) {
    const lines = [];
    let line = '';
    text.split(' ').forEach(word => {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width <= maxWidth || !line) line = test;
        else { lines.push(line); line = word; }
    });
    if (line) lines.push(line);
    if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].replace(/\s*\S*$/, '') + '…'; }
    return lines;
}

function invadersDraw() {
    const canvas = document.getElementById('invaders-canvas');
    const lanes = ArcadeCore.INV_LANES;
    const { ctx, width, height, cellW } = arcadeFitCanvas(canvas, lanes, 1, 1.25 * lanes);
    ctx.fillStyle = ARCADE_BOARD_BG;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let l = 1; l < lanes; l++) { ctx.beginPath(); ctx.moveTo(l * cellW, 0); ctx.lineTo(l * cellW, height); ctx.stroke(); }
    // La ligne à ne pas laisser franchir.
    ctx.strokeStyle = 'rgba(239,68,68,0.7)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(0, ArcadeCore.INV_BREACH * height); ctx.lineTo(width, ArcadeCore.INV_BREACH * height); ctx.stroke();
    ctx.setLineDash([]);
    const g = invGame;
    if (!g) return;
    const h = INVADERS_CARD_H * height;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 11px sans-serif';
    g.cards.forEach(c => {
        const x = c.lane * cellW + 6, w = cellW - 12, top = c.y * height - h / 2;
        ctx.fillStyle = '#1d4ed8';
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, top, w, h, 8); ctx.fill(); } else ctx.fillRect(x, top, w, h);
        ctx.fillStyle = '#fff';
        const lines = invadersWrap(ctx, c.event.title, w - 10);
        lines.forEach((line, i) => ctx.fillText(line, x + w / 2, top + h / 2 + (i - (lines.length - 1) / 2) * 13));
    });
    // Le trait du tir, puis le vaisseau.
    if (invFx && performance.now() < invFx.until) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo((invFx.lane + 0.5) * cellW, height - 24); ctx.lineTo((invFx.lane + 0.5) * cellW, 0); ctx.stroke();
    }
    const sx = (g.lane + 0.5) * cellW, sy = height - 8;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.moveTo(sx, sy - 22); ctx.lineTo(sx + 18, sy); ctx.lineTo(sx - 18, sy); ctx.closePath(); ctx.fill();
}

function invadersFinish() {
    invadersStop();
    const g = invGame;
    const best = arcadeRecord('invaders', g.score);
    document.getElementById('invaders-over-text').textContent =
        t('invaders.over_text', { shot: g.shot, rounds: g.rounds, score: g.score }) + ' ' + t('arcade.best', { score: best.invaders });
    const list = document.getElementById('invaders-over-list');
    list.innerHTML = '';
    g.mistakes.slice(0, 5).forEach(c => {
        const li = document.createElement('li');
        li.textContent = t('invaders.mistake', { title: c.event.title, year: formatYear(c.event.date), actual: invadersPeriodName(c.event) });
        list.appendChild(li);
    });
    document.getElementById('invaders-over').classList.remove('hidden');
    document.getElementById('invaders-start').classList.add('hidden');
    invadersDraw();
}

function invadersBindInput() {
    if (invInputBound) return;
    invInputBound = true;
    document.addEventListener('keydown', e => {
        if (!arcadeScreenVisible('screen-invaders') || !invGame || invGame.over) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); invadersShift(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); invadersShift(1); }
        else if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); invadersFire(); }
    });
    // Un tap sur une voie y place le vaisseau.
    document.getElementById('invaders-canvas').addEventListener('click', e => {
        if (!invGame || invGame.over) return;
        const rect = e.currentTarget.getBoundingClientRect();
        ArcadeCore.invMoveTo(invGame, Math.floor((e.clientX - rect.left) / rect.width * ArcadeCore.INV_LANES));
        invadersDraw();
    });
}
