// =========================================================================
// === LA SALLE DE JEUX — CASSE-BRIQUES DES REPÈRES, FLAPPY CLIO, COURSE DE CHARS : RÈGLES ===
// =========================================================================
// Trois jeux d'arcade de plus (voir js/arcadeCore.js pour le Snake, le Tetris, le Pac-Man et les Invaders). États purs, sans DOM
// ni minuteur : les écrans (js/app/arcade-extra.js) appellent `…Step(état, dt)` avec le temps écoulé en secondes. Testé dans
// tests/arcadeExtraCore.test.js. Un événement du vivier : { id, title, date } (voir arcadeCore.js).
//
//  - CASSE-BRIQUES : des briques portent des années ; seule la plus ANCIENNE encore debout se casse. Chaque brique cassée accélère la
//    balle. Toucher une autre brique, ou laisser tomber la balle : une vie en moins.
//  - FLAPPY CLIO : Clio vole entre des piliers. Chaque porte offre deux ouvertures marquées d'une année ; il faut passer par celle qui
//    SUIT le dernier repère dans le temps (l'autre est plus ancienne : revenir en arrière coûte une vie). Les piliers aussi.
//  - COURSE DE CHARS : douze cases à franchir en répondant juste à des questions de date ; vite, on avance de deux. Contre
//    l'ordinateur, ou à deux sur le même appareil.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./arcadeCore.js'));
    else root.ArcadeExtraCore = factory(root.ArcadeCore);
}(typeof self !== 'undefined' ? self : this, function (Arcade) {
    'use strict';

    var shuffle = Arcade.shuffle;

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    // Des années toutes différentes, triées de la plus ancienne à la plus récente.
    function ascendingYears(pool, rng, n) {
        return Arcade.pickDistinct(Arcade.playable(pool), rng, n).sort(function (a, b) { return a.date - b.date; });
    }

    // =====================================================================================================
    // === CASSE-BRIQUES ===
    // =====================================================================================================
    var BO = {
        W: 360, H: 440, PADDLE_H: 10, PADDLE_Y: 410, BALL_R: 7,
        BRICK_W: 38, BRICK_H: 24, BRICK_Y: 70, SLOTS: 8, LIVES: 3,
        SPEED_GAIN: 0.06
    };
    // Les niveaux : largeur de la raquette ; vitesse de la balle au départ (px/s) et plafond (× la vitesse de départ, atteint à force de
    // casser des briques) ; angle de renvoi maximal (au bord de la raquette : plus il est petit, plus la balle reste prévisible) ;
    // briques de la première vague, puis une de plus à chaque vague, jusqu'à `maxBricks` ; `showTarget` : la brique à viser est entourée.
    var BO_LEVELS = {
        easy: { paddleW: 96, baseSpeed: 190, maxSpeedFactor: 1.5, maxAngle: Math.PI / 4, firstBricks: 4, maxBricks: 6, showTarget: true },
        normal: { paddleW: 80, baseSpeed: 220, maxSpeedFactor: 1.9, maxAngle: Math.PI * 55 / 180, firstBricks: 5, maxBricks: 8, showTarget: false },
        hard: { paddleW: 72, baseSpeed: 230, maxSpeedFactor: 2.4, maxAngle: Math.PI / 3, firstBricks: 5, maxBricks: 8, showTarget: false }
    };

    function breakoutBricks(state) {
        var n = Math.min(BO.SLOTS, state.level.maxBricks, state.level.firstBricks + state.rounds);
        var events = Arcade.pickDistinct(state.pool, state.rng, n);
        // Les briques sont posées au hasard sur huit emplacements : les années ne sont jamais rangées de gauche à droite.
        var slots = shuffle([0, 1, 2, 3, 4, 5, 6, 7], state.rng).slice(0, n);
        var slotW = BO.W / BO.SLOTS;
        state.bricks = events.map(function (event, i) {
            return { x: slots[i] * slotW + (slotW - BO.BRICK_W) / 2, y: BO.BRICK_Y, w: BO.BRICK_W, h: BO.BRICK_H, event: event };
        });
    }

    // `options` : { difficulty: 'easy' | 'normal' | 'hard' }.
    function createBreakout(pool, rng, options) {
        var difficulty = Arcade.normalizeDifficulty(options && options.difficulty);
        var level = BO_LEVELS[difficulty];
        var state = {
            difficulty: difficulty, level: level,
            pool: Arcade.playable(pool), rng: rng || Math.random, w: BO.W, h: BO.H,
            paddle: { x: BO.W / 2, w: level.paddleW, y: BO.PADDLE_Y, h: BO.PADDLE_H },
            ball: { x: BO.W / 2, y: BO.PADDLE_Y - BO.PADDLE_H / 2 - BO.BALL_R, vx: 0, vy: 0, stuck: true },
            bricks: [], lives: BO.LIVES, score: 0, broken: 0, rounds: 0, over: false, mistakes: [], log: []
        };
        if (Arcade.pickDistinct(state.pool, state.rng, level.firstBricks).length < level.firstBricks) { state.over = true; state.empty = true; return state; }
        breakoutBricks(state);
        return state;
    }

    // Brique à casser : la plus ancienne encore debout.
    function breakoutTarget(state) {
        var target = null;
        state.bricks.forEach(function (b) { if (!target || b.event.date < target.event.date) target = b; });
        return target;
    }

    function breakoutSpeed(state) {
        return state.level.baseSpeed * Math.min(state.level.maxSpeedFactor, 1 + BO.SPEED_GAIN * state.broken);
    }

    function setSpeed(ball, speed) {
        var m = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) || 1;
        ball.vx = ball.vx / m * speed;
        ball.vy = ball.vy / m * speed;
    }

    // Le plateau suit le doigt : `x` est le centre voulu, dans [0, W].
    function breakoutMovePaddle(state, x) {
        var half = state.paddle.w / 2;
        state.paddle.x = clamp(x, half, BO.W - half);
        if (state.ball.stuck) state.ball.x = state.paddle.x;
    }

    // Lance la balle, vers le haut, avec un léger écart au hasard.
    function breakoutLaunch(state) {
        if (state.over || !state.ball.stuck) return false;
        var angle = (state.rng() - 0.5) * (Math.PI / 6);
        var speed = breakoutSpeed(state);
        state.ball.stuck = false;
        state.ball.vx = speed * Math.sin(angle);
        state.ball.vy = -speed * Math.cos(angle);
        return true;
    }

    function loseBall(state, events, why) {
        state.lives -= 1;
        events.push(why);
        state.ball.stuck = true;
        state.ball.vx = 0;
        state.ball.vy = 0;
        state.ball.x = state.paddle.x;
        state.ball.y = BO.PADDLE_Y - BO.PADDLE_H / 2 - BO.BALL_R;
        if (state.lives <= 0) { state.over = true; events.push('over'); }
    }

    function breakoutSub(state, h, events) {
        var b = state.ball;
        b.x += b.vx * h;
        b.y += b.vy * h;
        if (b.x < BO.BALL_R) { b.x = BO.BALL_R; b.vx = Math.abs(b.vx); }
        if (b.x > BO.W - BO.BALL_R) { b.x = BO.W - BO.BALL_R; b.vx = -Math.abs(b.vx); }
        if (b.y < BO.BALL_R) { b.y = BO.BALL_R; b.vy = Math.abs(b.vy); }

        // Le plateau : l'angle de renvoi dépend de l'endroit touché (centre : tout droit ; bord : en biais).
        var p = state.paddle;
        if (b.vy > 0 && b.y + BO.BALL_R >= p.y - p.h / 2 && b.y - BO.BALL_R <= p.y + p.h / 2 && Math.abs(b.x - p.x) <= p.w / 2 + BO.BALL_R) {
            var off = clamp((b.x - p.x) / (p.w / 2), -1, 1);
            var speed = breakoutSpeed(state);
            b.vx = speed * Math.sin(off * state.level.maxAngle);
            b.vy = -speed * Math.cos(off * state.level.maxAngle);
            b.y = p.y - p.h / 2 - BO.BALL_R;
        }

        if (b.y - BO.BALL_R > BO.H) { loseBall(state, events, 'lost'); return; }

        for (var i = 0; i < state.bricks.length; i++) {
            var br = state.bricks[i];
            if (b.x + BO.BALL_R < br.x || b.x - BO.BALL_R > br.x + br.w || b.y + BO.BALL_R < br.y || b.y - BO.BALL_R > br.y + br.h) continue;
            // Le côté touché : celui où l'enfoncement est le plus faible.
            var overlaps = [b.x + BO.BALL_R - br.x, br.x + br.w - (b.x - BO.BALL_R), b.y + BO.BALL_R - br.y, br.y + br.h - (b.y - BO.BALL_R)];
            var min = Math.min.apply(null, overlaps);
            if (min === overlaps[0]) { b.x = br.x - BO.BALL_R; b.vx = -Math.abs(b.vx); }
            else if (min === overlaps[1]) { b.x = br.x + br.w + BO.BALL_R; b.vx = Math.abs(b.vx); }
            else if (min === overlaps[2]) { b.y = br.y - BO.BALL_R; b.vy = -Math.abs(b.vy); }
            else { b.y = br.y + br.h + BO.BALL_R; b.vy = Math.abs(b.vy); }
            var target = breakoutTarget(state);
            if (br === target) {
                state.bricks.splice(i, 1);
                state.broken += 1;
                state.score += 10;
                state.log.push(br.event);
                setSpeed(b, breakoutSpeed(state));
                events.push('break');
                if (!state.bricks.length) {
                    state.rounds += 1;
                    state.score += 100;
                    events.push('round');
                    breakoutBricks(state);
                    b.stuck = true; b.vx = 0; b.vy = 0;
                    b.x = state.paddle.x; b.y = BO.PADDLE_Y - BO.PADDLE_H / 2 - BO.BALL_R;
                }
            } else {
                state.mistakes.push({ hit: br.event, expected: target.event });
                events.push('wrong');
                state.lives -= 1;
                if (state.lives <= 0) { state.over = true; events.push('over'); }
            }
            return;
        }
    }

    // Avance de `dt` secondes (en petits pas : la balle ne traverse jamais une brique). Renvoie : 'break', 'wrong', 'lost', 'round', 'over'.
    function breakoutStep(state, dt) {
        var events = [];
        if (state.over) return events;
        if (state.ball.stuck) { state.ball.x = state.paddle.x; return events; }
        var steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        for (var i = 0; i < steps && !state.over && !state.ball.stuck; i++) breakoutSub(state, dt / steps, events);
        return events;
    }

    // =====================================================================================================
    // === FLAPPY CLIO ===
    // =====================================================================================================
    var FL = {
        W: 360, H: 440, CLIO_X: 80, CLIO_R: 11, GRAVITY: 1000, FLAP: -330, MAX_FALL: 360, GATE_W: 46, SPACING: 240, GAP: 112, FIRST_GAP: 150,
        GROUND: 18, READY_GAP: 150, STEP: 1 / 120, LIVES: 3, CHAIN: 8, INVULN: 1.5, SPEED_GAIN: 6
    };
    // Les niveaux : vitesse de défilement des piliers au départ puis plafond (px/s ; elle monte de 6 par chaîne réussie) ; `wrong`, à quelle
    // distance dans le temps se trouve l'événement faux (plus ancien que le dernier repère) : loin, à distance moyenne, ou tout près.
    var FL_LEVELS = {
        easy: { baseSpeed: 65, maxSpeed: 110, wrong: 'far' },
        normal: { baseSpeed: 80, maxSpeed: 130, wrong: 'mid' },
        hard: { baseSpeed: 95, maxSpeed: 150, wrong: 'near' }
    };

    function flappySpeed(state) {
        return Math.min(state.level.maxSpeed, state.level.baseSpeed + FL.SPEED_GAIN * state.rounds);
    }

    // L'époque du décor, d'après une année : prehistoire, orient, antique, medieval, moderne, industriel, contemporain.
    function flappyEra(year) {
        if (year < -3000) return 'prehistoire';
        if (year < -500) return 'orient';
        if (year < 500) return 'antique';
        if (year < 1500) return 'medieval';
        if (year < 1789) return 'moderne';
        if (year < 1914) return 'industriel';
        return 'contemporain';
    }

    // Les événements du vivier plus anciens que `year`, hors ceux de la chaîne et ceux déjà proposés comme mauvaise réponse dans cette chaîne.
    function flappyEarlier(state, year, taken) {
        return state.pool.filter(function (e) { return e.date < year && !taken[e.id]; });
    }

    function flappyChainHasWrongs(state, events) {
        var ids = {};
        events.forEach(function (e) { ids[e.id] = true; });
        return events.slice(1).every(function (event, i) {
            var earlier = state.pool.filter(function (e) { return e.date < events[i].date && !ids[e.id]; });
            return earlier.length >= i + 1;
        });
    }

    // L'événement faux d'une porte : un événement plus ancien que le dernier repère, pris dans le tiers le plus éloigné (facile), le tiers du
    // milieu (moyen) ou le tiers le plus proche (difficile) de ce repère. S'il n'en existe aucun, null (la porte n'aura qu'une grande ouverture).
    function flappyWrongEvent(state, year, taken) {
        var list = flappyEarlier(state, year, taken).sort(function (a, b) { return a.date - b.date; });   // du plus éloigné au plus proche
        var n = list.length;
        if (!n) return null;
        if (state.level.wrong === 'near') {
            // Pas collé au repère : au moins quelques années d'écart, sinon on prend ce qu'il y a.
            var apart = list.filter(function (e) { return year - e.date >= 5; });
            if (apart.length) { list = apart; n = list.length; }
        }
        var from = state.level.wrong === 'far' ? 0 : state.level.wrong === 'mid' ? Math.floor(n / 3) : Math.floor(n * 2 / 3);
        var to = state.level.wrong === 'far' ? Math.ceil(n / 3) : state.level.wrong === 'mid' ? Math.ceil(n * 2 / 3) : n;
        if (to <= from) to = Math.min(n, from + 1);
        return list[from + Math.floor(state.rng() * (to - from))];
    }

    // Une chaîne : des repères de plus en plus récents. À chaque porte, deux événements : le suivant de la chaîne, et un plus ancien
    // que le dernier repère franchi (le mauvais). La première porte n'a qu'une seule grande ouverture : le départ.
    function flappyChain(state) {
        var events = ascendingYears(state.pool, state.rng, FL.CHAIN);
        // Chaque porte doit avoir un événement plus ancien à opposer au dernier repère, toujours différent des précédents : à la porte k, il en faut
        // au moins k hors de la chaîne (sinon une porte n'aurait qu'une grande ouverture). On retire la chaîne tant qu'elle ne convient pas.
        for (var tries = 0; tries < 40 && !flappyChainHasWrongs(state, events); tries++) events = ascendingYears(state.pool, state.rng, FL.CHAIN);
        var taken = {};
        events.forEach(function (e) { taken[e.id] = true; });
        var years = events.map(function (e) { return e.date; });
        var startX = state.gates.length ? state.gates[state.gates.length - 1].x + FL.SPACING + 120 : FL.W + 80;
        events.forEach(function (event, k) {
            var gate = { x: startX + k * FL.SPACING, w: FL.GATE_W, event: event, done: false, chain: state.chains, k: k };
            if (k === 0) {
                gate.gaps = [{ y: (FL.H - FL.GROUND) / 2, h: FL.FIRST_GAP, year: event.date, correct: true, event: event }];
            } else {
                var wrongEvent = flappyWrongEvent(state, years[k - 1], taken);
                if (!wrongEvent) {
                    // Rien de plus ancien dans le vivier : une seule grande ouverture, comme au départ.
                    gate.gaps = [{ y: (FL.H - FL.GROUND) / 2, h: FL.FIRST_GAP, year: event.date, correct: true, event: event }];
                    state.gates.push(gate);
                    return;
                }
                taken[wrongEvent.id] = true;
                var okFirst = state.rng() < 0.5;
                // Deux ouvertures assez proches pour passer de l'une à l'autre en trois ou quatre battements.
                var top = { y: 108 + state.rng() * 34, h: FL.GAP };
                var bottom = { y: 262 + state.rng() * 34, h: FL.GAP };
                var good = { year: event.date, correct: true, event: event };
                var bad = { year: wrongEvent.date, correct: false, event: wrongEvent };
                gate.gaps = okFirst ? [Object.assign(top, good), Object.assign(bottom, bad)] : [Object.assign(top, bad), Object.assign(bottom, good)];
            }
            state.gates.push(gate);
        });
        state.chains += 1;
        state.chainDone = 0;
    }

    // `options` : { difficulty: 'easy' | 'normal' | 'hard' }.
    function createFlappy(pool, rng, options) {
        var difficulty = Arcade.normalizeDifficulty(options && options.difficulty);
        var state = {
            difficulty: difficulty, level: FL_LEVELS[difficulty],
            pool: Arcade.playable(pool), rng: rng || Math.random, w: FL.W, h: FL.H,
            clio: { x: FL.CLIO_X, y: (FL.H - FL.GROUND) / 2, vy: 0, r: FL.CLIO_R }, started: false, waiting: true, invulnerable: 0, distance: 0,
            gates: [], chains: 0, chainDone: 0, lives: FL.LIVES, score: 0, passed: 0, rounds: 0, last: null, over: false, mistakes: []
        };
        if (Arcade.pickDistinct(state.pool, state.rng, FL.CHAIN).length < FL.CHAIN) { state.over = true; state.empty = true; return state; }
        flappyChain(state);
        return state;
    }

    // Un battement d'ailes. Le premier lance la partie (avant, et après chaque choc, le monde attend).
    function flappyFlap(state) {
        if (state.over) return false;
        state.started = true;
        state.waiting = false;
        state.clio.vy = FL.FLAP;
        return true;
    }

    // Les parties pleines d'une porte : [x, y, largeur, hauteur].
    function gateSolids(gate) {
        var gaps = gate.gaps.slice().sort(function (a, b) { return a.y - b.y; });
        var solids = [];
        var cursor = 0;
        gaps.forEach(function (g) {
            solids.push([gate.x, cursor, gate.w, Math.max(0, g.y - g.h / 2 - cursor)]);
            cursor = g.y + g.h / 2;
        });
        solids.push([gate.x, cursor, gate.w, Math.max(0, FL.H - cursor)]);
        return solids.filter(function (s) { return s[3] > 0; });
    }

    function circleHitsRect(cx, cy, r, rect) {
        var nx = clamp(cx, rect[0], rect[0] + rect[2]);
        var ny = clamp(cy, rect[1], rect[1] + rect[3]);
        return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r;
    }

    // Une porte est jugée une seule fois ; celles de la chaîne en cours sont comptées pour savoir quand elle est terminée.
    function gateDone(state, gate) {
        if (gate.done) return;
        gate.done = true;
        if (gate.chain === state.chains - 1) state.chainDone += 1;
    }

    // Une vie en moins. Le monde se met en pause : les portes déjà jugées disparaissent, la prochaine est ramenée à bonne distance et
    // Clio repart devant l'une de ses ouvertures, au repos, jusqu'au prochain battement (puis un court répit). Jamais dans un pilier.
    function flappyLoseLife(state, events, why) {
        state.lives -= 1;
        events.push(why);
        if (state.lives <= 0) { state.over = true; events.push('over'); return; }
        var c = state.clio;
        state.gates = state.gates.filter(function (g) { return !g.done; });
        var next = state.gates[0];
        c.vy = 0;
        c.y = (FL.H - FL.GROUND) / 2;
        if (next) {
            var delta = c.x + FL.READY_GAP - next.x;
            if (delta > 0) state.gates.forEach(function (g) { g.x += delta; });
            var near = next.gaps.slice().sort(function (a, b) { return Math.abs(a.y - c.y) - Math.abs(b.y - c.y); })[0];
            c.y = near.y;
        }
        state.started = false;
        state.waiting = true;
        state.invulnerable = FL.INVULN;
    }

    // Mise en pause (onglet masqué, retour à l'écran) : le monde attend le prochain battement, avec un court répit.
    function flappyPause(state) {
        if (state.over || !state.started) return false;
        state.started = false;
        state.waiting = true;
        state.invulnerable = Math.max(state.invulnerable, 0.8);
        return true;
    }

    // Un petit pas de simulation (toujours le même : la hauteur d'un battement ne dépend pas de la fluidité de l'écran).
    function flappySub(state, dt, events) {
        var c = state.clio;
        state.invulnerable = Math.max(0, state.invulnerable - dt);
        c.vy = Math.min(FL.MAX_FALL, c.vy + FL.GRAVITY * dt);
        c.y += c.vy * dt;
        var speed = flappySpeed(state);
        state.distance += speed * dt;
        state.gates.forEach(function (g) { g.x -= speed * dt; });

        // Le plafond arrête Clio sans la blesser ; le sol (la bande de terre) est mortel.
        if (c.y - c.r < 0) { c.y = c.r; if (c.vy < 0) c.vy = 0; }
        if (c.y + c.r > FL.H - FL.GROUND) {
            if (!state.invulnerable) { flappyLoseLife(state, events, 'hit'); return; }
            c.y = FL.H - FL.GROUND - c.r;
            c.vy = Math.min(c.vy, 0);
        }
        for (var i = 0; i < state.gates.length; i++) {
            var g = state.gates[i];
            if (g.done) continue;
            if (!state.invulnerable && g.x < c.x + c.r && g.x + g.w > c.x - c.r) {
                var hit = gateSolids(g).some(function (s) { return circleHitsRect(c.x, c.y, c.r, s); });
                if (hit) { gateDone(state, g); flappyLoseLife(state, events, 'hit'); return; }
            }
            // Le choix est jugé quand Clio atteint le milieu de la porte.
            if (g.x + g.w / 2 <= c.x) {
                gateDone(state, g);
                if (state.invulnerable) continue;
                var gap = g.gaps.filter(function (p) { return Math.abs(c.y - p.y) <= p.h / 2; })[0];
                if (!gap) continue;
                if (gap.correct) {
                    state.passed += 1;
                    state.score += 10;
                    state.last = g.event;
                    events.push('good');
                } else {
                    var expected = g.gaps.filter(function (p) { return p.correct; })[0];
                    state.mistakes.push({ chosen: gap.year, chosenEvent: gap.event, expected: expected.event, previous: state.last });
                    flappyLoseLife(state, events, 'wrong');
                    return;
                }
            }
        }
    }

    // Avance de `dt` secondes. Renvoie : 'good' (bonne ouverture), 'wrong' (ouverture plus ancienne), 'hit' (pilier ou sol),
    // 'round' (la chaîne est terminée), 'over'.
    function flappyStep(state, dt) {
        var events = [];
        if (state.over || !state.started) return events;
        var left = Math.max(0, dt);
        while (left > 1e-9 && !state.over && state.started) {
            var h = Math.min(FL.STEP, left);
            left -= h;
            flappySub(state, h, events);
        }
        // Chaîne terminée : toutes ses portes franchies. La suivante est posée plus loin.
        if (!state.over && state.chainDone >= FL.CHAIN) {
            state.rounds += 1;
            state.score += 50;
            events.push('round');
            state.gates = state.gates.filter(function (g) { return !g.done; });
            flappyChain(state);
        }
        state.gates = state.gates.filter(function (g) { return g.x + g.w > -20; });
        return events;
    }

    // =====================================================================================================
    // === COURSE DE CHARS ===
    // =====================================================================================================
    // Plus de minuteur : une bonne réponse avance le char d'une case. En solo, l'adversaire avance sans cesse, à une vitesse (cases par seconde)
    // qui dépend de la difficulté et qui varie un peu au fil de la course. PAUSE : le temps, en secondes, de voir la bonne réponse avant la
    // question suivante.
    var RACE = { LENGTH: 12, PAUSE: 1, WOBBLE: 0.18, RIVAL: { easy: 0.1, normal: 0.16, hard: 0.24 } };

    // La question d'un événement : son année, parmi quatre. Les fausses sont proches (écart plus large pour les époques anciennes).
    function raceQuestion(event, rng) {
        var random = rng || Math.random;
        var year = event.date;
        var base = Math.max(4, Math.round(Math.abs(year) * 0.03));
        var offsets = shuffle([-4, -2, -1, 1, 2, 3, 5].map(function (m) { return m * base; }), random);
        var options = [year];
        offsets.forEach(function (o) {
            var y = year + o;
            if (options.length < 4 && options.indexOf(y) === -1 && y !== 0 && y <= 2026) options.push(y);
        });
        return { event: event, options: shuffle(options, random), answer: year };
    }

    function raceNextQuestion(state) {
        var list = state.pool.filter(function (e) { return !state.used[e.id]; });
        if (!list.length) { state.used = {}; list = state.pool; }
        var event = list[Math.floor(state.rng() * list.length)];
        state.used[event.id] = true;
        state.question = raceQuestion(event, state.rng);
    }

    // `options` : { mode: 'solo' | 'duo', difficulty: 'easy' | 'normal' | 'hard', length }.
    function createRace(pool, rng, options) {
        var o = options || {};
        var state = {
            pool: Arcade.playable(pool), rng: rng || Math.random, mode: o.mode === 'duo' ? 'duo' : 'solo',
            difficulty: RACE.RIVAL[o.difficulty] ? o.difficulty : 'normal', length: o.length || RACE.LENGTH,
            pos: [0, 0], turn: 0, round: 0, question: null, used: {}, last: null, over: false, winner: null, history: [], clock: 0
        };
        state.phase = state.rng() * Math.PI * 2;
        if (state.pool.length < 8) { state.over = true; state.empty = true; return state; }
        raceNextQuestion(state);
        return state;
    }

    // Vitesse de l'adversaire à l'instant `clock` : celle de sa difficulté, qui ondule de ±WOBBLE (il a des élans et des essoufflements).
    function raceRivalSpeed(state) {
        return RACE.RIVAL[state.difficulty] * (1 + RACE.WOBBLE * Math.sin(state.clock * 0.9 + state.phase));
    }

    // Solo : l'adversaire avance pendant `dt` secondes. Renvoie ['over'] s'il franchit la ligne le premier.
    function raceTick(state, dt) {
        if (state.over || state.mode !== 'solo') return [];
        var d = Math.max(0, dt);
        state.clock += d;
        state.pos[1] = Math.min(state.length, state.pos[1] + raceRivalSpeed(state) * d);
        if (state.pos[1] >= state.length) {
            state.over = true;
            state.winner = 1;
            return ['over'];
        }
        return [];
    }

    // La fin d'une manche en duo : quand l'un des deux a franchi la ligne (les deux le même tour : égalité).
    function raceFinishDuo(state) {
        var a = state.pos[0], b = state.pos[1];
        if (a < state.length && b < state.length) return;
        state.over = true;
        state.winner = a === b ? null : (a > b ? 0 : 1);
    }

    // Répond à la question en cours (`year` : l'année choisie). Solo : le char avance d'une case si c'est juste, et gagne en franchissant
    // la ligne. Duo : deux joueurs jouent chacun leur question, à tour de rôle ; la manche se joue quand le second a répondu.
    // Renvoie : 'right', 'wrong', 'next-player' (duo, joueur 2 à toi), 'round', 'over'.
    function raceAnswer(state, year) {
        var out = [];
        if (state.over || !state.question) return out;
        var right = year === state.question.answer;
        var steps = right ? 1 : 0;
        out.push(right ? 'right' : 'wrong');
        state.history.push({ player: state.turn, right: right, event: state.question.event, year: year, answer: state.question.answer, steps: steps });
        state.pos[state.turn] += steps;
        state.last = { player: state.turn, steps: steps, right: right };
        if (state.mode === 'solo') {
            state.round += 1;
            if (state.pos[0] >= state.length) { state.over = true; state.winner = 0; }
            out.push(state.over ? 'over' : 'round');
        } else if (state.turn === 0) {
            state.turn = 1;
            out.push('next-player');
        } else {
            state.turn = 0;
            state.round += 1;
            raceFinishDuo(state);
            out.push(state.over ? 'over' : 'round');
        }
        if (!state.over) raceNextQuestion(state);
        return out;
    }

    // Le score gardé au tableau : dix points par case franchie, cent de plus pour une victoire (joueur 1).
    function raceScore(state) {
        return state.pos[0] * 10 + (state.winner === 0 ? 100 : 0);
    }

    return {
        BO: BO, BO_LEVELS: BO_LEVELS, FL_LEVELS: FL_LEVELS, FL: FL, RACE: RACE,
        createBreakout: createBreakout, breakoutTarget: breakoutTarget, breakoutSpeed: breakoutSpeed, breakoutMovePaddle: breakoutMovePaddle,
        breakoutLaunch: breakoutLaunch, breakoutStep: breakoutStep,
        createFlappy: createFlappy, flappyEra: flappyEra, flappyFlap: flappyFlap, flappyPause: flappyPause, flappyStep: flappyStep, flappySpeed: flappySpeed, gateSolids: gateSolids,
        raceQuestion: raceQuestion, createRace: createRace, raceAnswer: raceAnswer, raceTick: raceTick, raceRivalSpeed: raceRivalSpeed, raceScore: raceScore
    };
}));
