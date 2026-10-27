// =========================================================================
// === LA SALLE DE JEUX — CASSE-BRIQUES DES REPÈRES, FLAPPY CLIO, COURSE DE CHARS (écrans) ===
// =========================================================================
// Les règles sont dans js/arcadeExtraCore.js (pur, testé, avec un temps en secondes) ; ici, la boucle d'animation, le dessin sur canvas,
// les commandes et les écrans de fin. Mêmes conventions que js/app/arcade.js : un jeu rend la main à l'écran d'où il a été ouvert
// (`gamesBackTo`), s'arrête dès que son écran n'est plus affiché, et garde son meilleur score (`arcadeRecord`).

// Le pas de temps d'un jeu en continu : le temps réel écoulé, borné — un onglet resté caché ne doit pas faire sauter la balle.
function arcadeDelta(last, now) {
    return Math.min(0.05, Math.max(0, (now - last) / 1000));
}

// Dessine dans le repère logique du jeu (360 × 440), mis à l'échelle de l'écran.
function arcadeWorldCanvas(canvasId, world) {
    const canvas = document.getElementById(canvasId);
    const fit = arcadeFitCanvas(canvas, world.W, world.H, 1);
    fit.ctx.save();
    fit.ctx.scale(fit.cellW, fit.cellW);
    return { canvas, ctx: fit.ctx, scale: fit.cellW, width: fit.width, height: fit.height };
}

function arcadeHearts(lives) {
    return '♥'.repeat(Math.max(0, lives));
}

// =====================================================================================================
// === CASSE-BRIQUES DES REPÈRES ===
// =====================================================================================================
const BRICK_COLORS = ['#2563eb', '#7e22ce', '#b45309', '#0f766e', '#be123c', '#4338ca', '#15803d', '#c2410c'];
let boGame = null;
let boFrame = 0;
let boLast = 0;
let boDir = 0;
let boReturn = 'screen-arcade';
let boInputBound = false;

function openBreakout(fromScreen) {
    boReturn = fromScreen || 'screen-arcade';
    breakoutStop();
    boGame = null;
    showScreen('screen-breakout', 'forward');
    document.getElementById('breakout-over').classList.add('hidden');
    document.getElementById('breakout-start').classList.remove('hidden');
    document.getElementById('breakout-status').textContent = '';
    arcadeMessage('breakout-message', '');
    breakoutBindInput();
    breakoutDraw();
}

function breakoutBack() {
    breakoutStop();
    gamesBackTo(boReturn);
}

function breakoutStop() {
    if (boFrame) cancelAnimationFrame(boFrame);
    boFrame = 0;
}

function breakoutStart() {
    const game = ArcadeExtraCore.createBreakout(arcadePool());
    if (game.empty) { alert(t('arcade.empty')); return; }
    breakoutStop();
    boGame = game;
    document.getElementById('breakout-start').classList.add('hidden');
    document.getElementById('breakout-over').classList.add('hidden');
    arcadeMessage('breakout-message', '');
    breakoutRenderStatus();
    boLast = performance.now();
    boFrame = requestAnimationFrame(breakoutLoop);
}

function breakoutRenderStatus() {
    const g = boGame;
    document.getElementById('breakout-status').textContent = t('breakout.status', { round: g.rounds + 1, lives: arcadeHearts(g.lives), score: g.score });
}

function breakoutLoop(now) {
    boFrame = 0;
    if (!boGame || !arcadeScreenVisible('screen-breakout')) return;
    const dt = document.hidden ? 0 : arcadeDelta(boLast, now);
    boLast = now;
    if (boDir) ArcadeExtraCore.breakoutMovePaddle(boGame, boGame.paddle.x + boDir * 320 * dt);
    const events = ArcadeExtraCore.breakoutStep(boGame, dt);
    breakoutAfter(events);
    breakoutDraw();
    if (boGame.over) { breakoutFinish(); return; }
    boFrame = requestAnimationFrame(breakoutLoop);
}

function breakoutAfter(events) {
    if (!events.length) return;
    const g = boGame;
    if (events.includes('break')) {
        const ev = g.log[g.log.length - 1];
        arcadeSound('good');
        arcadeMessage('breakout-message', t('breakout.break', { year: formatYear(ev.date), title: ev.title }), false);
    }
    if (events.includes('wrong')) {
        const m = g.mistakes[g.mistakes.length - 1];
        arcadeSound('bad');
        arcadeMessage('breakout-message', t('breakout.wrong', { year: formatYear(m.hit.date), expected: formatYear(m.expected.date) }), true);
    }
    if (events.includes('lost')) {
        arcadeSound('bad');
        arcadeMessage('breakout-message', t('breakout.lost'), true);
    }
    breakoutRenderStatus();
}

function breakoutLaunchNow() {
    if (boGame && !boGame.over) ArcadeExtraCore.breakoutLaunch(boGame);
}

function breakoutDraw() {
    const { ctx } = arcadeWorldCanvas('breakout-canvas', ArcadeExtraCore.BO);
    const BO = ArcadeExtraCore.BO;
    ctx.fillStyle = ARCADE_BOARD_BG;
    ctx.fillRect(0, 0, BO.W, BO.H);
    const g = boGame;
    if (g) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        g.bricks.forEach((b, i) => {
            ctx.fillStyle = BRICK_COLORS[(b.event.date % BRICK_COLORS.length + BRICK_COLORS.length) % BRICK_COLORS.length];
            if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 5); ctx.fill(); } else ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.fillStyle = '#fff';
            const year = arcadeShortYear(b.event.date);
            ctx.font = '700 ' + (year.length > 4 ? 10 : 12) + 'px sans-serif';
            ctx.fillText(year, b.x + b.w / 2, b.y + b.h / 2 + 1);
        });
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(g.paddle.x - g.paddle.w / 2, g.paddle.y - g.paddle.h / 2, g.paddle.w, g.paddle.h);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(g.ball.x, g.ball.y, ArcadeExtraCore.BO.BALL_R, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

function breakoutFinish() {
    breakoutStop();
    const g = boGame;
    const best = arcadeRecord('breakout', g.score);
    document.getElementById('breakout-over-text').textContent =
        t('breakout.over_text', { broken: g.broken, score: g.score }) + ' ' + t('arcade.best', { score: best.breakout });
    const list = document.getElementById('breakout-over-list');
    list.innerHTML = '';
    g.mistakes.slice(0, 5).forEach(m => {
        const li = document.createElement('li');
        li.textContent = t('breakout.mistake', {
            hit: m.hit.title, hit_year: formatYear(m.hit.date), expected: m.expected.title, expected_year: formatYear(m.expected.date)
        });
        list.appendChild(li);
    });
    document.getElementById('breakout-over').classList.remove('hidden');
    document.getElementById('breakout-start').classList.add('hidden');
    breakoutDraw();
}

// Les commandes : le doigt ou la souris sur le plateau déplace la raquette, un tap lance la balle ; ◀ ▶ (maintenus) et les flèches
// aussi ; Espace lance. Le CSS laisse `pan-y` au navigateur (voir arcadeBindSwipe : pas de `touch-action: none`).
function breakoutBindInput() {
    if (boInputBound) return;
    boInputBound = true;
    const canvas = document.getElementById('breakout-canvas');
    const toWorld = e => {
        const rect = canvas.getBoundingClientRect();
        return (e.clientX - rect.left) / rect.width * ArcadeExtraCore.BO.W;
    };
    canvas.addEventListener('pointermove', e => {
        if (boGame && !boGame.over && (e.pointerType === 'mouse' || e.buttons)) ArcadeExtraCore.breakoutMovePaddle(boGame, toWorld(e));
    });
    canvas.addEventListener('pointerdown', e => {
        if (boGame && !boGame.over) { ArcadeExtraCore.breakoutMovePaddle(boGame, toWorld(e)); }
    });
    canvas.addEventListener('click', () => breakoutLaunchNow());
    const hold = (id, dir) => {
        const btn = document.getElementById(id);
        btn.addEventListener('pointerdown', () => { boDir = dir; });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(type => btn.addEventListener(type, () => { if (boDir === dir) boDir = 0; }));
        btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (boGame) ArcadeExtraCore.breakoutMovePaddle(boGame, boGame.paddle.x + dir * 30); } });
    };
    hold('breakout-left', -1);
    hold('breakout-right', 1);
    document.addEventListener('keydown', e => {
        if (!arcadeScreenVisible('screen-breakout') || !boGame || boGame.over) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); boDir = -1; }
        else if (e.key === 'ArrowRight') { e.preventDefault(); boDir = 1; }
        else if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); breakoutLaunchNow(); }
    });
    document.addEventListener('keyup', e => {
        if ((e.key === 'ArrowLeft' && boDir === -1) || (e.key === 'ArrowRight' && boDir === 1)) boDir = 0;
    });
}

// =====================================================================================================
// === FLAPPY CLIO ===
// =====================================================================================================
// Le dessin de Clio en vol, avec son costume, converti une fois en image pour le canevas (normale, et yeux en croix
// après un choc).
const FLAPPY_CLIO_ANCHOR = { x: 140 / ClioArt.FLY.W, y: 94 / ClioArt.FLY.H };
const flappyClioSprites = {};
let flappyClioCostume = ''; // lu une fois par partie (flappyStart), pas à chaque image
function flappyClioSprite(hurt) {
    const costume = flappyClioCostume;
    const key = (hurt ? 'hurt' : 'ok') + ':' + costume;
    if (!flappyClioSprites[key]) {
        const img = new Image();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ClioArt.fly({ hurt: hurt, costume: costume }));
        flappyClioSprites[key] = img;
    }
    return flappyClioSprites[key];
}

let flGame = null;
let flFrame = 0;
let flLast = 0;
let flReturn = 'screen-arcade';
let flInputBound = false;
let flEra = '';
let flEraFrom = '';
let flFade = 1;

function openFlappy(fromScreen) {
    flReturn = fromScreen || 'screen-arcade';
    flappyStop();
    flGame = null;
    showScreen('screen-flappy', 'forward');
    document.getElementById('flappy-over').classList.add('hidden');
    document.getElementById('flappy-start').classList.remove('hidden');
    document.getElementById('flappy-status').textContent = '';
    document.getElementById('flappy-banner').textContent = '';
    arcadeMessage('flappy-message', '');
    flappyBindInput();
    flappyDraw();
}

function flappyBack() {
    flappyStop();
    gamesBackTo(flReturn);
}

function flappyStop() {
    if (flFrame) cancelAnimationFrame(flFrame);
    flFrame = 0;
}

function flappyStart() {
    const worn = typeof clioWornCostume === 'function' ? clioWornCostume() : null;
    flappyClioCostume = worn ? worn.world : '';
    const game = ArcadeExtraCore.createFlappy(arcadePool());
    if (game.empty) { alert(t('arcade.empty')); return; }
    flappyStop();
    flGame = game;
    flEra = flappyEraOf(game);
    flEraFrom = flEra;
    flFade = 1;
    document.getElementById('flappy-start').classList.add('hidden');
    document.getElementById('flappy-over').classList.add('hidden');
    arcadeMessage('flappy-message', '');
    flappyRenderStatus();
    flLast = performance.now();
    flFrame = requestAnimationFrame(flappyLoop);
}

function flappyRenderStatus() {
    const g = flGame;
    document.getElementById('flappy-status').textContent = t('flappy.status', { round: g.rounds + 1, lives: arcadeHearts(g.lives), score: g.score });
    document.getElementById('flappy-banner').textContent = g.last
        ? t('flappy.banner_last', { year: formatYear(g.last.date), title: g.last.title })
        : t('flappy.banner_start');
}

function flappyLoop(now) {
    flFrame = 0;
    if (!flGame || !arcadeScreenVisible('screen-flappy')) return;
    const dt = document.hidden ? 0 : arcadeDelta(flLast, now);
    flLast = now;
    const events = ArcadeExtraCore.flappyStep(flGame, dt);
    flappyEraTick(dt);
    flappyAfter(events);
    flappyDraw();
    if (flGame.over) { flappyFinish(); return; }
    flFrame = requestAnimationFrame(flappyLoop);
}

function flappyAfter(events) {
    if (!events.length) return;
    const g = flGame;
    if (events.includes('good')) {
        arcadeSound('good');
        arcadeMessage('flappy-message', t('flappy.good', { year: formatYear(g.last.date), title: g.last.title }), false);
    }
    if (events.includes('wrong')) {
        const m = g.mistakes[g.mistakes.length - 1];
        arcadeSound('bad');
        arcadeMessage('flappy-message', t('flappy.wrong', { expected_year: formatYear(m.expected.date) }), true);
    }
    if (events.includes('hit')) {
        arcadeSound('bad');
        arcadeMessage('flappy-message', t('flappy.hit'), true);
    }
    flappyRenderStatus();
}

function flappyFlapNow() {
    if (flGame && !flGame.over) { ArcadeExtraCore.flappyFlap(flGame); arcadeSfx('flap'); }
}

// L'époque du décor : celle du dernier repère franchi, ou du premier à venir.
function flappyEraOf(g) {
    const next = g.gates.find(gate => !gate.done);
    const year = g.last ? g.last.date : (next ? next.event.date : 0);
    return ArcadeExtraCore.flappyEra(year);
}

function flappyEraTick(dt) {
    flFade = Math.min(1, flFade + dt / 1.2);
    const era = flappyEraOf(flGame);
    if (era !== flEra) { flEraFrom = flEra; flEra = era; flFade = 0; }
}

function flappyDrawPillar(ctx, s, H) {
    const grad = ctx.createLinearGradient(s[0], 0, s[0] + s[2], 0);
    grad.addColorStop(0, '#f1f5f9');
    grad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = grad;
    ctx.fillRect(s[0], s[1], s[2], s[3]);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(s[0] + 1, s[1] + 1, s[2] - 2, s[3] - 2);
    // Un chapiteau du côté de l'ouverture.
    ctx.fillStyle = '#64748b';
    if (s[1] > 0) { ctx.fillRect(s[0] - 3, s[1], s[2] + 6, 9); }
    if (s[1] + s[3] < H) { ctx.fillRect(s[0] - 3, s[1] + s[3] - 9, s[2] + 6, 9); }
}

function flappyDraw() {
    const { ctx } = arcadeWorldCanvas('flappy-canvas', ArcadeExtraCore.FL);
    const FL = ArcadeExtraCore.FL;
    const g = flGame;
    const ground = FL.H - FL.GROUND;
    const distance = g ? g.distance : 0;
    if (g && flFade < 1 && flEraFrom) flappyDrawBackdrop(ctx, FL.W, FL.H, ground, flEraFrom, distance, 1);
    flappyDrawBackdrop(ctx, FL.W, FL.H, ground, g ? flEra : 'antique', distance, g && flFade < 1 && flEraFrom ? flFade : 1);
    if (!g) { ctx.restore(); return; }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    g.gates.forEach(gate => {
        ArcadeExtraCore.gateSolids(gate).forEach(s => flappyDrawPillar(ctx, s, FL.H));
        // L'année de chaque ouverture, sur une pastille au centre du passage.
        gate.gaps.forEach(gap => {
            const text = arcadeShortYear(gap.year);
            ctx.font = '700 13px sans-serif';
            const w = Math.max(gate.w, ctx.measureText(text).width + 12);
            ctx.fillStyle = 'rgba(15,26,51,0.85)';
            ctx.fillRect(gate.x + gate.w / 2 - w / 2, gap.y - 11, w, 22);
            ctx.fillStyle = '#fde68a';
            ctx.fillText(text, gate.x + gate.w / 2, gap.y + 1);
        });
    });
    // Clio : un chat qui s'incline selon sa vitesse, et qui clignote pendant le répit qui suit un choc.
    const bob = g.waiting ? Math.sin(performance.now() / 260) * 4 : 0;
    if (!g.invulnerable || Math.floor(g.invulnerable * 10) % 2 === 0) {
        ctx.save();
        ctx.translate(g.clio.x, g.clio.y + bob);
        ctx.rotate(Math.max(-0.45, Math.min(0.7, g.clio.vy / 600)));
        const sprite = flappyClioSprite(g.invulnerable > 0);
        if (sprite.complete && sprite.naturalWidth) {
            // Clio en vol (js/clioArt.js) : le point d'ancrage, entre le corps et la tête, tombe sur le centre du cercle de collision.
            const w = FL.CLIO_R * 5, h = w * ClioArt.FLY.H / ClioArt.FLY.W;
            ctx.drawImage(sprite, -w * FLAPPY_CLIO_ANCHOR.x, -h * FLAPPY_CLIO_ANCHOR.y, w, h);
        } else {
            ctx.font = '26px sans-serif';
            ctx.fillText('🐱', 0, 1);
        }
        ctx.restore();
    }
    if (g.waiting && !g.over) {
        ctx.font = '700 14px sans-serif';
        const text = t('flappy.tap');
        const w = ctx.measureText(text).width + 24;
        ctx.fillStyle = 'rgba(15,26,51,0.8)';
        ctx.fillRect(FL.W / 2 - w / 2, 26, w, 30);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, FL.W / 2, 41);
    }
    ctx.restore();
}

function flappyFinish() {
    flappyStop();
    const g = flGame;
    const best = arcadeRecord('flappy', g.score);
    document.getElementById('flappy-over-text').textContent =
        t('flappy.over_text', { passed: g.passed, score: g.score }) + ' ' + t('arcade.best', { score: best.flappy });
    const list = document.getElementById('flappy-over-list');
    list.innerHTML = '';
    g.mistakes.slice(0, 5).forEach(m => {
        const li = document.createElement('li');
        li.textContent = t('flappy.mistake', { chosen: formatYear(m.chosen), expected_year: formatYear(m.expected.date), expected: m.expected.title });
        list.appendChild(li);
    });
    document.getElementById('flappy-over').classList.remove('hidden');
    document.getElementById('flappy-start').classList.add('hidden');
    flappyDraw();
}

function flappyBindInput() {
    if (flInputBound) return;
    flInputBound = true;
    const canvas = document.getElementById('flappy-canvas');
    canvas.addEventListener('pointerdown', e => { e.preventDefault(); flappyFlapNow(); });
    // Le CSS ne pose pas `touch-action: none` : on retient le défilement de la page seulement pendant la partie.
    canvas.addEventListener('touchmove', e => { if (flGame && !flGame.over) e.preventDefault(); }, { passive: false });
    // Onglet masqué : le monde attend le prochain battement au retour.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && flGame) { ArcadeExtraCore.flappyPause(flGame); flappyDraw(); }
    });
    document.addEventListener('keydown', e => {
        if (!arcadeScreenVisible('screen-flappy') || !flGame || flGame.over) return;
        if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); flappyFlapNow(); }
    });
}

// =====================================================================================================
// === COURSE DE CHARS DE LA FRISE ===
// =====================================================================================================
let raceGame = null;
let raceReturn = 'screen-arcade';
let raceFrame = 0;
let raceLast = 0;
let raceLocked = false;        // la réponse est donnée : on voit la bonne réponse avant la question suivante
let raceAdvanceTimer = 0;
let raceCars = [];
let raceShown = '';
let raceCurrentOnly = false; // duo : la question du joueur suivant est cachée tant qu'il n'a pas touché « Prêt »
const RACE_TEMPO = { easy: 0.92, normal: 1, hard: 1.12 };

function openRace(fromScreen) {
    raceReturn = fromScreen || 'screen-arcade';
    showScreen('screen-race', 'forward');
    raceSetup();
}

function raceBack() {
    raceStopAll();
    gamesBackTo(raceReturn);
}

function raceStopAll() {
    if (raceFrame) cancelAnimationFrame(raceFrame);
    raceFrame = 0;
    clearTimeout(raceAdvanceTimer);
    raceAdvanceTimer = 0;
    if (typeof stopRaceMusic === 'function') stopRaceMusic();
}

function raceSetup() {
    raceStopAll();
    raceGame = null;
    raceLocked = false;
    ['race-play', 'race-handover', 'race-over'].forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById('race-setup').classList.remove('hidden');
    document.getElementById('race-status').textContent = '';
}

function raceStart(mode, difficulty) {
    const game = ArcadeExtraCore.createRace(arcadePool(), undefined, { mode, difficulty });
    if (game.empty) { alert(t('arcade.empty')); return; }
    raceStopAll();
    raceGame = game;
    raceLocked = false;
    document.getElementById('race-setup').classList.add('hidden');
    document.getElementById('race-over').classList.add('hidden');
    document.getElementById('race-play').classList.remove('hidden');
    raceBuildTrack();
    raceRender();
    if (typeof startRaceMusic === 'function') startRaceMusic(RACE_TEMPO[game.difficulty] || 1);
    if (game.mode === 'solo') {
        raceLast = performance.now();
        raceFrame = requestAnimationFrame(raceLoop);
    }
}

// Les deux pistes : la ligne d'arrivée est à gauche, les chevaux (qui regardent à gauche) partent de la droite.
function raceBuildTrack() {
    const g = raceGame;
    const track = document.getElementById('race-track');
    track.innerHTML = '';
    raceCars = [0, 1].map(i => {
        const lane = document.createElement('div');
        lane.className = 'race-lane' + (g.mode === 'solo' && i === 1 ? ' is-rival' : '');
        const label = document.createElement('span');
        label.className = 'race-label';
        label.textContent = g.mode === 'solo' ? t(i === 0 ? 'race.you' : 'race.rival') : t('race.player', { n: i + 1 });
        const road = document.createElement('div');
        road.className = 'race-road';
        const flag = document.createElement('span');
        flag.className = 'race-flag';
        flag.textContent = '🏁';
        const car = document.createElement('span');
        car.className = 'race-car';
        car.textContent = i === 0 ? '🏇' : '🐎';
        road.appendChild(flag);
        road.appendChild(car);
        lane.appendChild(label);
        lane.appendChild(road);
        track.appendChild(lane);
        return car;
    });
    raceShown = '';
    raceUpdateTrack();
}

// La position de chaque cheval, de la droite (départ) à la gauche (arrivée).
function raceUpdateTrack() {
    const g = raceGame;
    if (!g || !raceCars.length) return;
    raceCars.forEach((car, i) => {
        const progress = Math.min(1, g.pos[i] / g.length);
        car.style.left = (94 - progress * 88) + '%';
    });
    const status = t('race.status', { a: Math.floor(g.pos[0]), b: Math.floor(g.pos[1]), len: g.length });
    if (status !== raceShown) {
        raceShown = status;
        document.getElementById('race-status').textContent = status;
    }
}

function raceRender() {
    const g = raceGame;
    raceLocked = false;
    raceUpdateTrack();
    document.getElementById('race-feedback').classList.add('hidden');
    document.getElementById('race-turn').textContent = g.mode === 'duo' ? t('race.turn_duo', { n: g.turn + 1 }) : t('race.turn_solo');
    document.getElementById('race-question').textContent = t('race.question', { title: g.question.event.title });
    const box = document.getElementById('race-options');
    box.innerHTML = '';
    g.question.options.forEach(year => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option advent-option';
        btn.dataset.year = String(year);
        btn.textContent = formatYear(year);
        btn.onclick = () => raceChoose(year);
        box.appendChild(btn);
    });
}

// L'adversaire avance sans cesse, à la vitesse de sa difficulté ; s'il franchit la ligne le premier, la course s'arrête.
function raceLoop(now) {
    raceFrame = 0;
    const g = raceGame;
    if (!g || g.over || !arcadeScreenVisible('screen-race')) return;
    const dt = document.hidden ? 0 : Math.min(0.1, Math.max(0, (now - raceLast) / 1000));
    raceLast = now;
    const events = ArcadeExtraCore.raceTick(g, dt);
    raceUpdateTrack();
    if (events.includes('over')) {
        if (!raceLocked) { clearTimeout(raceAdvanceTimer); raceAdvanceTimer = 0; raceFinish(); }
        return;
    }
    raceFrame = requestAnimationFrame(raceLoop);
}

function raceChoose(year) {
    const g = raceGame;
    if (!g || g.over || !g.question || raceLocked) return;
    const asked = g.question;
    const events = ArcadeExtraCore.raceAnswer(g, year);
    if (!events.length) return;
    raceLocked = true;
    const right = events.includes('right');
    arcadeSound(right ? 'good' : 'bad');
    document.querySelectorAll('#race-options .advent-option').forEach(btn => {
        const y = Number(btn.dataset.year);
        btn.disabled = true;
        if (y === asked.answer) btn.classList.add('correct');
        else if (y === year) btn.classList.add('wrong');
    });
    raceUpdateTrack();
    const feedback = document.getElementById('race-feedback');
    feedback.classList.toggle('is-wrong', !right);
    document.getElementById('race-feedback-title').textContent = right ? t('race.right') + ' ' + t('race.step') : t('race.wrong');
    document.getElementById('race-feedback-text').textContent = t('race.answer', { year: formatYear(asked.answer) });
    feedback.classList.remove('hidden');
    // Une seconde pour voir la bonne réponse, puis la question suivante s'enchaîne.
    clearTimeout(raceAdvanceTimer);
    raceAdvanceTimer = setTimeout(raceAdvance, ArcadeExtraCore.RACE.PAUSE * 1000);
}

function raceAdvance() {
    raceAdvanceTimer = 0;
    const g = raceGame;
    if (!g || !arcadeScreenVisible('screen-race')) return;
    if (g.over) { raceFinish(); return; }
    if (g.mode === 'duo') {
        // Le joueur suivant ne doit pas voir la question avant d'avoir pris l'appareil.
        document.getElementById('race-play').classList.add('hidden');
        document.getElementById('race-handover-title').textContent = t('race.turn_duo', { n: g.turn + 1 });
        document.getElementById('race-handover').classList.remove('hidden');
        return;
    }
    raceRender();
}

function raceReady() {
    document.getElementById('race-handover').classList.add('hidden');
    document.getElementById('race-play').classList.remove('hidden');
    raceRender();
}

function raceFinish() {
    raceStopAll();
    const g = raceGame;
    const score = ArcadeExtraCore.raceScore(g);
    const best = g.mode === 'solo' ? arcadeRecord('race', score) : arcadeBest();
    document.getElementById('race-play').classList.add('hidden');
    document.getElementById('race-handover').classList.add('hidden');
    const title = g.winner === null ? t('race.draw')
        : g.mode === 'solo' ? t(g.winner === 0 ? 'race.win' : 'race.lose') : t('race.win_player', { n: g.winner + 1 });
    document.getElementById('race-over-title').textContent = title;
    document.getElementById('race-over-text').textContent = g.mode === 'solo'
        ? t('race.over_solo', { steps: Math.floor(g.pos[0]), score }) + ' ' + t('arcade.best', { score: best.race })
        : t('race.over_duo', { a: g.pos[0], b: g.pos[1] });
    raceRenderRecap(g);
    document.getElementById('race-over').classList.remove('hidden');
    document.getElementById('race-status').textContent = '';
    if (g.winner === 0 || (g.mode === 'duo' && g.winner !== null)) { if (typeof playVictorySound === 'function') playVictorySound(); }
    else arcadeSound('bad');
}

// Le récapitulatif : toutes les questions posées, avec ce qui a été répondu (réussites et erreurs).
function raceRenderRecap(g) {
    const right = g.history.filter(h => h.right).length;
    document.getElementById('race-recap-title').textContent = t('race.recap_title', { right, total: g.history.length });
    const list = document.getElementById('race-over-list');
    list.innerHTML = '';
    g.history.forEach(h => {
        const li = document.createElement('li');
        li.className = h.right ? 'race-recap-right' : 'race-recap-wrong';
        const line = h.right
            ? t('race.recap_right', { title: h.event.title, year: formatYear(h.answer) })
            : t('race.recap_wrong', { title: h.event.title, answer: formatYear(h.answer), chosen: formatYear(h.year) });
        li.textContent = (g.mode === 'duo' ? t('race.player', { n: h.player + 1 }) + ' · ' : '') + line;
        list.appendChild(li);
    });
}

// Onglet masqué : la musique se tait, et reprend au retour si la course est en cours.
document.addEventListener('visibilitychange', () => {
    if (typeof stopRaceMusic !== 'function' || !raceGame || raceGame.over || !arcadeScreenVisible('screen-race')) return;
    if (document.hidden) stopRaceMusic();
    else startRaceMusic(RACE_TEMPO[raceGame.difficulty] || 1);
});
