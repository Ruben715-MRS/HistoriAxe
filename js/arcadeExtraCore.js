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
        W: 360, H: 440, PADDLE_W: 72, PADDLE_H: 10, PADDLE_Y: 410, BALL_R: 7,
        BRICK_W: 38, BRICK_H: 24, BRICK_Y: 70, SLOTS: 8, LIVES: 3,
        BASE_SPEED: 230, SPEED_GAIN: 0.06, MAX_SPEED_FACTOR: 2.4, MAX_ANGLE: Math.PI / 3
    };

    function breakoutBricks(state) {
        var n = Math.min(BO.SLOTS, 5 + state.rounds);
        var events = Arcade.pickDistinct(state.pool, state.rng, n);
        // Les briques sont posées au hasard sur huit emplacements : les années ne sont jamais rangées de gauche à droite.
        var slots = shuffle([0, 1, 2, 3, 4, 5, 6, 7], state.rng).slice(0, n);
        var slotW = BO.W / BO.SLOTS;
        state.bricks = events.map(function (event, i) {
            return { x: slots[i] * slotW + (slotW - BO.BRICK_W) / 2, y: BO.BRICK_Y, w: BO.BRICK_W, h: BO.BRICK_H, event: event };
        });
    }

    function createBreakout(pool, rng) {
        var state = {
            pool: Arcade.playable(pool), rng: rng || Math.random, w: BO.W, h: BO.H,
            paddle: { x: BO.W / 2, w: BO.PADDLE_W, y: BO.PADDLE_Y, h: BO.PADDLE_H },
            ball: { x: BO.W / 2, y: BO.PADDLE_Y - BO.PADDLE_H / 2 - BO.BALL_R, vx: 0, vy: 0, stuck: true },
            bricks: [], lives: BO.LIVES, score: 0, broken: 0, rounds: 0, over: false, mistakes: [], log: []
        };
        if (Arcade.pickDistinct(state.pool, state.rng, 5).length < 5) { state.over = true; state.empty = true; return state; }
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
        return BO.BASE_SPEED * Math.min(BO.MAX_SPEED_FACTOR, 1 + BO.SPEED_GAIN * state.broken);
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
            b.vx = speed * Math.sin(off * BO.MAX_ANGLE);
            b.vy = -speed * Math.cos(off * BO.MAX_ANGLE);
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
        W: 360, H: 440, CLIO_X: 80, CLIO_R: 13, GRAVITY: 1100, FLAP: -340, GATE_W: 46, SPACING: 190, GAP: 96,
        LIVES: 3, CHAIN: 8, INVULN: 1.2, BASE_SPEED: 110, SPEED_GAIN: 8, MAX_SPEED: 190
    };

    function flappySpeed(state) {
        return Math.min(FL.MAX_SPEED, FL.BASE_SPEED + FL.SPEED_GAIN * state.rounds);
    }

    // Une chaîne : des repères de plus en plus récents. À chaque porte, deux années : la suivante de la chaîne, et une plus ancienne
    // que le dernier repère franchi (la mauvaise). La première porte n'a qu'une seule grande ouverture : le départ.
    function flappyChain(state) {
        var events = ascendingYears(state.pool, state.rng, FL.CHAIN);
        var years = events.map(function (e) { return e.date; });
        var startX = state.gates.length ? state.gates[state.gates.length - 1].x + FL.SPACING + 120 : FL.W + 80;
        events.forEach(function (event, k) {
            var gate = { x: startX + k * FL.SPACING, w: FL.GATE_W, event: event, done: false, chain: state.chains, k: k };
            if (k === 0) {
                gate.gaps = [{ y: FL.H / 2, h: 130, year: event.date, correct: true, event: event }];
            } else {
                var prev = years[k - 1];
                var spread = Math.max(10, Math.round(Math.abs(prev) * 0.15));
                var wrong = prev - (1 + Math.floor(state.rng() * spread));
                for (var guard = 0; guard < 20 && (years.indexOf(wrong) !== -1 || wrong === 0); guard++) wrong -= 1;
                var okFirst = state.rng() < 0.5;
                var top = { y: 95 + state.rng() * 55, h: FL.GAP };
                var bottom = { y: 290 + state.rng() * 55, h: FL.GAP };
                var good = { year: event.date, correct: true, event: event };
                var bad = { year: wrong, correct: false };
                gate.gaps = okFirst ? [Object.assign(top, good), Object.assign(bottom, bad)] : [Object.assign(top, bad), Object.assign(bottom, good)];
            }
            state.gates.push(gate);
        });
        state.chains += 1;
        state.chainDone = 0;
    }

    function createFlappy(pool, rng) {
        var state = {
            pool: Arcade.playable(pool), rng: rng || Math.random, w: FL.W, h: FL.H,
            clio: { x: FL.CLIO_X, y: FL.H / 2, vy: 0, r: FL.CLIO_R }, started: false, invulnerable: 0,
            gates: [], chains: 0, chainDone: 0, lives: FL.LIVES, score: 0, passed: 0, rounds: 0, last: null, over: false, mistakes: []
        };
        if (Arcade.pickDistinct(state.pool, state.rng, FL.CHAIN).length < FL.CHAIN) { state.over = true; state.empty = true; return state; }
        flappyChain(state);
        return state;
    }

    // Un battement d'ailes. Le premier lance la partie (avant, Clio flotte).
    function flappyFlap(state) {
        if (state.over) return false;
        state.started = true;
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

    function flappyLoseLife(state, events, why) {
        state.lives -= 1;
        events.push(why);
        state.invulnerable = FL.INVULN;
        state.clio.y = FL.H / 2;
        state.clio.vy = 0;
        if (state.lives <= 0) { state.over = true; events.push('over'); }
    }

    // Avance de `dt` secondes. Renvoie : 'good' (bonne ouverture), 'wrong' (ouverture plus ancienne), 'hit' (pilier, sol, plafond),
    // 'round' (la chaîne est terminée), 'over'.
    function flappyStep(state, dt) {
        var events = [];
        if (state.over || !state.started) return events;
        var c = state.clio;
        state.invulnerable = Math.max(0, state.invulnerable - dt);
        c.vy += FL.GRAVITY * dt;
        c.y += c.vy * dt;
        var speed = flappySpeed(state);
        state.gates.forEach(function (g) { g.x -= speed * dt; });

        if (c.y - c.r < 0 || c.y + c.r > FL.H) {
            if (!state.invulnerable) flappyLoseLife(state, events, 'hit');
            else { c.y = clamp(c.y, c.r, FL.H - c.r); c.vy = 0; }
            if (state.over) return events;
        }
        for (var i = 0; i < state.gates.length; i++) {
            var g = state.gates[i];
            if (g.done) continue;
            if (!state.invulnerable && g.x < c.x + c.r && g.x + g.w > c.x - c.r) {
                var hit = gateSolids(g).some(function (s) { return circleHitsRect(c.x, c.y, c.r, s); });
                if (hit) { gateDone(state, g); flappyLoseLife(state, events, 'hit'); if (state.over) return events; continue; }
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
                    state.mistakes.push({ chosen: gap.year, expected: expected.event, previous: state.last });
                    flappyLoseLife(state, events, 'wrong');
                    if (state.over) return events;
                }
            }
        }
        // Chaîne terminée : toutes ses portes franchies. La suivante est déjà posée plus loin.
        var open = state.gates.filter(function (g) { return !g.done; });
        if (state.chainDone >= FL.CHAIN) {
            state.rounds += 1;
            state.score += 50;
            events.push('round');
            state.gates = open;
            flappyChain(state);
        }
        state.gates = state.gates.filter(function (g) { return g.x + g.w > -20; });
        return events;
    }

    // =====================================================================================================
    // === COURSE DE CHARS ===
    // =====================================================================================================
    var RACE = { LENGTH: 12, ANSWER_TIME: 10, TURBO_TIME: 4, RIVAL: { easy: 0.5, normal: 0.65, hard: 0.8 } };

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
            pos: [0, 0], turn: 0, round: 0, question: null, pending: null, used: {}, last: null, over: false, winner: null, history: []
        };
        if (state.pool.length < 8) { state.over = true; state.empty = true; return state; }
        raceNextQuestion(state);
        return state;
    }

    // Un char avance d'une case par bonne réponse, de deux si elle est rapide (turbo).
    function raceSteps(right, elapsed) {
        return right ? (elapsed <= RACE.TURBO_TIME ? 2 : 1) : 0;
    }

    function raceFinish(state, details) {
        var a = state.pos[0], b = state.pos[1];
        if (a < state.length && b < state.length) return;
        state.over = true;
        if (a !== b) state.winner = a > b ? 0 : 1;
        else if (state.mode === 'solo' && details && details.rivalTime !== undefined) state.winner = details.elapsed <= details.rivalTime ? 0 : 1;
        else state.winner = null; // égalité
    }

    // Répond à la question en cours : `year` (null : temps écoulé), `elapsed` en secondes.
    // Solo : le rival « répond » aussi (juste avec la probabilité de sa difficulté, en un temps tiré au hasard). Duo : deux joueurs jouent
    // chacun leur question, à tour de rôle ; la manche se joue quand le second a répondu.
    // Renvoie : 'right', 'wrong', 'turbo', 'rival', 'next-player' (duo, joueur 2 à toi), 'round', 'over'.
    function raceAnswer(state, year, elapsed) {
        var out = [];
        if (state.over || !state.question) return out;
        var right = year !== null && year === state.question.answer;
        var t = clamp(elapsed, 0, RACE.ANSWER_TIME);
        var steps = raceSteps(right, t);
        out.push(right ? 'right' : 'wrong');
        if (steps === 2) out.push('turbo');
        state.history.push({ player: state.turn, right: right, event: state.question.event, year: year, steps: steps });
        if (state.mode === 'solo') {
            state.pos[0] += steps;
            var rivalRight = state.rng() < RACE.RIVAL[state.difficulty];
            var rivalTime = 2 + state.rng() * 7;
            var rivalSteps = raceSteps(rivalRight, rivalTime);
            state.pos[1] += rivalSteps;
            state.last = { steps: steps, rivalSteps: rivalSteps, right: right, rivalRight: rivalRight };
            if (rivalSteps) out.push('rival');
            state.round += 1;
            raceFinish(state, { elapsed: t, rivalTime: rivalTime });
            out.push(state.over ? 'over' : 'round');
        } else {
            state.pos[state.turn] += steps;
            state.last = { player: state.turn, steps: steps, right: right };
            if (state.turn === 0) {
                state.turn = 1;
                out.push('next-player');
            } else {
                state.turn = 0;
                state.round += 1;
                raceFinish(state, null);
                out.push(state.over ? 'over' : 'round');
            }
        }
        if (!state.over) raceNextQuestion(state);
        return out;
    }

    // Le score gardé au tableau : dix points par case franchie, cent de plus pour une victoire (joueur 1).
    function raceScore(state) {
        return state.pos[0] * 10 + (state.winner === 0 ? 100 : 0);
    }

    return {
        BO: BO, FL: FL, RACE: RACE,
        createBreakout: createBreakout, breakoutTarget: breakoutTarget, breakoutSpeed: breakoutSpeed, breakoutMovePaddle: breakoutMovePaddle,
        breakoutLaunch: breakoutLaunch, breakoutStep: breakoutStep,
        createFlappy: createFlappy, flappyFlap: flappyFlap, flappyStep: flappyStep, flappySpeed: flappySpeed, gateSolids: gateSolids,
        raceQuestion: raceQuestion, createRace: createRace, raceAnswer: raceAnswer, raceScore: raceScore
    };
}));
