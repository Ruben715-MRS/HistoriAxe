// Casse-briques, Flappy Clio, Course de chars (js/arcadeExtraCore.js). Pur, sans navigateur : le temps est une valeur qu'on passe.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../js/arcadeExtraCore.js');

const root = path.resolve(__dirname, '..');
const ui = JSON.parse(fs.readFileSync(path.join(root, 'ui', 'fr.json'), 'utf8'));

function seeded(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function pool() {
    const years = [-3000, -800, -500, -100, 100, 300, 700, 1000, 1200, 1300, 1600, 1648, 1700, 1750, 1815, 1848, 1870, 1900, 1918, 1945, 1969, 1989, 2001, 2020];
    return years.map((date, i) => ({ id: 'e' + i, title: 'Événement ' + i, date }));
}

// --- Casse-briques ------------------------------------------------------------------------------------------
test('Casse-briques : cinq briques d\'années différentes, jamais rangées de gauche à droite, sur des emplacements distincts', () => {
    const g = E.createBreakout(pool(), seeded(3));
    assert.equal(g.bricks.length, 5);
    assert.equal(new Set(g.bricks.map((b) => b.event.date)).size, 5);
    assert.equal(new Set(g.bricks.map((b) => b.x)).size, 5);
    g.bricks.forEach((b) => assert.ok(b.x >= 0 && b.x + b.w <= E.BO.W));
    // Sur plusieurs parties, l'ordre de gauche à droite n'est pas toujours croissant.
    let shuffled = false;
    for (let seed = 1; seed < 20 && !shuffled; seed++) {
        const bricks = E.createBreakout(pool(), seeded(seed)).bricks.slice().sort((a, b) => a.x - b.x).map((b) => b.event.date);
        shuffled = bricks.some((d, i) => i && d < bricks[i - 1]);
    }
    assert.ok(shuffled);
    assert.ok(E.createBreakout(pool().slice(0, 3), seeded(1)).empty);
});

test('Casse-briques : la balle part du plateau, immobile tant qu\'on ne la lance pas ; la raquette reste dans le plateau', () => {
    const g = E.createBreakout(pool(), seeded(3));
    E.breakoutStep(g, 0.5);
    assert.ok(g.ball.stuck);
    E.breakoutMovePaddle(g, 100);
    assert.equal(g.ball.x, 100);
    E.breakoutMovePaddle(g, -50);
    assert.equal(g.paddle.x, g.paddle.w / 2);
    E.breakoutMovePaddle(g, 9999);
    assert.equal(g.paddle.x, E.BO.W - g.paddle.w / 2);
    assert.ok(E.breakoutLaunch(g));
    assert.ok(g.ball.vy < 0 && !g.ball.stuck);
    assert.ok(!E.breakoutLaunch(g));
});

test('Casse-briques : trois niveaux — raquette, vitesse de départ et plafond, angle de renvoi, briques par vague', () => {
    const make = (difficulty) => E.createBreakout(pool(), seeded(3), { difficulty });
    const levels = ['easy', 'normal', 'hard'];
    assert.deepEqual(levels.map((d) => make(d).paddle.w), [96, 80, 72]);
    assert.deepEqual(levels.map((d) => make(d).bricks.length), [4, 5, 5]);
    assert.deepEqual(levels.map((d) => Math.round(E.breakoutSpeed(make(d)))), [190, 220, 230]);
    assert.equal(make('hard').difficulty, 'hard');
    assert.equal(E.createBreakout(pool(), seeded(3)).difficulty, 'normal', 'sans niveau : moyen');
    assert.equal(E.createBreakout(pool(), seeded(3), { difficulty: 'n_importe_quoi' }).difficulty, 'normal');
    assert.deepEqual(levels.map((d) => make(d).level.showTarget), [true, false, false]);

    // Le plafond de vitesse : × 1,5 / × 1,9 / × 2,4 la vitesse de départ, à force de briques.
    levels.forEach((d) => {
        const g = make(d);
        g.broken = 1000;
        assert.ok(Math.abs(E.breakoutSpeed(g) - g.level.baseSpeed * g.level.maxSpeedFactor) < 1e-9, d);
    });

    // Les vagues grandissent d'une brique, sans dépasser 6 (facile) ou 8.
    const easy = make('easy');
    easy.rounds = 10;
    assert.equal(Math.min(E.BO.SLOTS, easy.level.maxBricks, easy.level.firstBricks + easy.rounds), 6);
    assert.equal(E.BO_LEVELS.hard.maxBricks, 8);

    // L'angle de renvoi au bord de la raquette : 45° / 55° / 60°.
    const edgeAngle = (d) => {
        const g = make(d);
        g.bricks = [];
        g.ball.stuck = false;
        g.ball.x = g.paddle.x + g.paddle.w / 2;
        g.ball.y = g.paddle.y - g.paddle.h / 2 - E.BO.BALL_R;
        g.ball.vx = 0;
        g.ball.vy = 100;
        E.breakoutStep(g, 1 / 120);
        return Math.round(Math.atan2(Math.abs(g.ball.vx), -g.ball.vy) * 180 / Math.PI);
    };
    assert.deepEqual(levels.map(edgeAngle), [45, 55, 60]);
});

test('Casse-briques : un vivier de quatre années suffit en facile, pas en moyen', () => {
    assert.ok(!E.createBreakout(pool().slice(0, 4), seeded(1), { difficulty: 'easy' }).empty);
    assert.ok(E.createBreakout(pool().slice(0, 4), seeded(1)).empty);
});

// Place la balle juste sous une brique, montant vers elle.
function aimAt(g, brick) {
    g.ball.stuck = false;
    g.ball.x = brick.x + brick.w / 2;
    g.ball.y = brick.y + brick.h + E.BO.BALL_R + 2;
    g.ball.vx = 0;
    g.ball.vy = -E.breakoutSpeed(g);
}

test('Casse-briques : seule la plus ancienne se casse ; elle accélère la balle et rapporte', () => {
    const g = E.createBreakout(pool(), seeded(3));
    const target = E.breakoutTarget(g);
    assert.equal(target.event.date, Math.min(...g.bricks.map((b) => b.event.date)));
    const speed = E.breakoutSpeed(g);
    aimAt(g, target);
    const events = E.breakoutStep(g, 0.05);
    assert.ok(events.includes('break'));
    assert.equal(g.bricks.length, 4);
    assert.equal(g.score, 10);
    assert.ok(E.breakoutSpeed(g) > speed);
    const norm = Math.hypot(g.ball.vx, g.ball.vy);
    assert.ok(Math.abs(norm - E.breakoutSpeed(g)) < 1, 'la balle va à la nouvelle vitesse');
    assert.equal(g.log[0], target.event);
});

test('Casse-briques : une autre brique rebondit, reste en place et coûte une vie', () => {
    const g = E.createBreakout(pool(), seeded(3));
    const target = E.breakoutTarget(g);
    const other = g.bricks.find((b) => b !== target);
    aimAt(g, other);
    const events = E.breakoutStep(g, 0.05);
    assert.ok(events.includes('wrong'));
    assert.equal(g.bricks.length, 5);
    assert.equal(g.lives, 2);
    assert.equal(g.mistakes[0].hit, other.event);
    assert.equal(g.mistakes[0].expected, target.event);
    assert.ok(g.ball.vy > 0, 'la balle repart vers le bas');
});

test('Casse-briques : la balle perdue coûte une vie et revient sur la raquette ; trois vies et c\'est fini', () => {
    const g = E.createBreakout(pool(), seeded(3));
    for (let life = 0; life < 3; life++) {
        g.ball.stuck = false;
        g.ball.x = 20; g.ball.y = E.BO.H + 20; g.ball.vx = 0; g.ball.vy = 100;
        const events = E.breakoutStep(g, 0.01);
        assert.ok(events.includes('lost'));
        if (!g.over) assert.ok(g.ball.stuck);
    }
    assert.ok(g.over);
    assert.equal(g.lives, 0);
    assert.deepEqual(E.breakoutStep(g, 0.1), []);
});

test('Casse-briques : rebonds sur les murs et la raquette, jamais de sortie du plateau', () => {
    const g = E.createBreakout(pool(), seeded(8));
    g.bricks = g.bricks.slice(0, 1);
    E.breakoutLaunch(g);
    for (let i = 0; i < 1200 && !g.over; i++) {
        E.breakoutMovePaddle(g, g.ball.x); // le plateau suit la balle : elle ne tombe jamais
        E.breakoutStep(g, 1 / 60);
        assert.ok(g.ball.x >= 0 && g.ball.x <= E.BO.W && g.ball.y >= 0 && g.ball.y <= E.BO.H + 1, `balle sortie : ${g.ball.x}, ${g.ball.y}`);
        if (g.mistakes.length) break;
    }
    assert.ok(g.lives >= 1);
});

test('Casse-briques : toutes les briques cassées dans l\'ordre font une manche (+100) et une vague plus grande', () => {
    const g = E.createBreakout(pool(), seeded(5));
    let last = [];
    while (g.rounds === 0) {
        aimAt(g, E.breakoutTarget(g));
        last = E.breakoutStep(g, 0.05);
    }
    assert.ok(last.includes('round'));
    assert.equal(g.score, 5 * 10 + 100);
    assert.equal(g.bricks.length, 6);
    assert.ok(g.ball.stuck);
    assert.equal(g.lives, 3);
});

// --- Flappy Clio ---------------------------------------------------------------------------------------------
test('Flappy : une chaîne de huit portes aux repères croissants ; la première a une seule grande ouverture', () => {
    const g = E.createFlappy(pool(), seeded(4));
    assert.equal(g.gates.length, 8);
    assert.equal(g.gates[0].gaps.length, 1);
    const years = g.gates.map((gate) => gate.gaps.find((p) => p.correct).year);
    assert.deepEqual(years, years.slice().sort((a, b) => a - b));
    assert.equal(new Set(years).size, 8);
    g.gates.slice(1).forEach((gate, i) => {
        assert.equal(gate.gaps.length, 2);
        const good = gate.gaps.find((p) => p.correct), bad = gate.gaps.find((p) => !p.correct);
        assert.ok(bad.year < years[i], 'la mauvaise année est plus ancienne que le dernier repère');
        assert.ok(good.year > years[i]);
        assert.ok(!years.includes(bad.year));
    });
    assert.ok(E.createFlappy(pool().slice(0, 5), seeded(1)).empty);
});

test('Flappy : Clio flotte tant qu\'on n\'a pas battu des ailes ; un battement la fait monter, la gravité la fait tomber', () => {
    const g = E.createFlappy(pool(), seeded(4));
    const y0 = g.clio.y;
    E.flappyStep(g, 0.5);
    assert.equal(g.clio.y, y0);
    E.flappyFlap(g);
    E.flappyStep(g, 0.1);
    assert.ok(g.clio.y < y0);
    for (let i = 0; i < 20; i++) E.flappyStep(g, 0.05);
    assert.ok(g.lives < 3 || g.clio.y > y0 - 100, 'sans battement, elle finit par tomber (ou par se cogner)');
});

// Mène Clio devant la bonne (ou la mauvaise) ouverture de la prochaine porte, à chaque pas.
function flyThrough(g, steps, chooser) {
    const events = [];
    for (let i = 0; i < steps && !g.over; i++) {
        const gate = g.gates.find((x) => !x.done);
        if (!gate) break;
        const gap = chooser(gate);
        g.clio.y = gap.y;
        g.clio.vy = 0;
        E.flappyStep(g, 1 / 60).forEach((e) => events.push(e));
        if (events.includes('round')) break;
    }
    return events;
}

test('Flappy : la bonne ouverture rapporte 10 points ; une chaîne finie fait une manche (+50) et en pose une autre', () => {
    const g = E.createFlappy(pool(), seeded(4));
    E.flappyFlap(g);
    const events = flyThrough(g, 6000, (gate) => gate.gaps.find((p) => p.correct));
    assert.equal(events.filter((e) => e === 'good').length, 8);
    assert.ok(events.includes('round'));
    assert.equal(g.rounds, 1);
    assert.equal(g.score, 8 * 10 + 50);
    assert.equal(g.lives, 3);
    assert.equal(g.gates.filter((x) => !x.done).length, 8, 'la chaîne suivante est posée');
    assert.ok(E.flappySpeed(g) > E.FL.BASE_SPEED);
});

test('Flappy : la mauvaise ouverture (une date plus ancienne) coûte une vie et se retient', () => {
    const g = E.createFlappy(pool(), seeded(4));
    E.flappyFlap(g);
    // Première porte sans choix, puis la mauvaise ouverture à la deuxième.
    flyThrough(g, 6000, (gate) => (gate.k === 0 ? gate.gaps[0] : gate.gaps.find((p) => !p.correct)));
    assert.ok(g.lives < 3);
    assert.equal(g.mistakes[0].chosen < g.mistakes[0].previous.date, true);
    assert.ok(g.mistakes[0].expected.date > g.mistakes[0].previous.date);
});

test('Flappy : heurter un pilier ou le sol coûte une vie ; le monde attend alors le prochain battement, Clio repart devant une ouverture', () => {
    const g = E.createFlappy(pool(), seeded(4));
    E.flappyFlap(g);
    const gate = g.gates[1];
    // Clio dans la partie pleine entre les deux ouvertures, au niveau de la porte.
    gate.x = g.clio.x - 5;
    g.clio.y = (gate.gaps[0].y + gate.gaps[1].y) / 2;
    g.clio.vy = 0;
    const events = E.flappyStep(g, 0.01);
    assert.ok(events.includes('hit'));
    assert.equal(g.lives, 2);
    assert.equal(g.started, false);
    assert.equal(g.waiting, true);
    assert.deepEqual(E.flappyStep(g, 1), [], 'le monde est figé tant qu\'on n\'a pas battu des ailes');
    // Les portes jugées ont disparu ; la prochaine est à bonne distance et Clio est au centre d'une de ses ouvertures.
    const next = g.gates[0];
    assert.ok(!next.done);
    assert.ok(next.x >= g.clio.x + E.FL.READY_GAP - 0.001);
    assert.ok(next.gaps.some((p) => Math.abs(p.y - g.clio.y) < 0.001));
    assert.ok(g.invulnerable > 1);
    E.flappyFlap(g);
    assert.equal(g.waiting, false);
    // Le plafond n'est plus mortel.
    g.clio.y = -50;
    assert.ok(!E.flappyStep(g, 0.01).includes('hit'));
    assert.equal(g.lives, 2);
    assert.ok(g.clio.y >= g.clio.r - 0.001);
    // Le sol l'est, une fois le répit passé.
    for (let i = 0; i < 2; i++) {
        g.invulnerable = 0;
        g.started = true;
        g.clio.y = E.FL.H;
        E.flappyStep(g, 0.01);
    }
    assert.ok(g.over);
    assert.deepEqual(E.flappyStep(g, 0.1), []);
});

// Un pilote automatique qui ne connaît que la physique : il vise l'ouverture voulue de la prochaine porte.
function autopilot(g, seconds, choose) {
    const events = [];
    for (let i = 0; i < seconds * 60 && !g.over; i++) {
        if (g.waiting) E.flappyFlap(g);
        const gate = g.gates.find((x) => !x.done);
        const target = gate ? choose(gate).y : (E.FL.H - E.FL.GROUND) / 2;
        const c = g.clio;
        if (c.y > target + 20) E.flappyFlap(g);
        E.flappyStep(g, 1 / 60).forEach((e) => events.push(e));
    }
    return events;
}

test('Flappy : la partie est jouable — un pilote qui bat des ailes à la bonne cadence passe trois chaînes sans une égratignure', () => {
    for (const seed of [1, 4, 9]) {
        const g = E.createFlappy(pool(), seeded(seed));
        const events = autopilot(g, 190, (gate) => gate.gaps.find((p) => p.correct));
        assert.equal(g.lives, 3, `seed ${seed} : ${events.join(',')}`);
        assert.ok(g.rounds >= 3, `seed ${seed} : ${g.rounds} manches`);
    }
});

test('Flappy : après un choc, le pilote repart sans se cogner de nouveau', () => {
    for (let seed = 1; seed < 15; seed++) {
        const g = E.createFlappy(pool(), seeded(seed));
        E.flappyFlap(g);
        const gate = g.gates[1];
        gate.x = g.clio.x - 5;
        g.clio.y = (gate.gaps[0].y + gate.gaps[1].y) / 2;
        E.flappyStep(g, 0.01);
        assert.equal(g.lives, 2);
        const events = autopilot(g, 25, (x) => x.gaps.find((p) => p.correct));
        assert.equal(g.lives, 2, `seed ${seed} : ${events.join(',')}`);
    }
});

test('Flappy : la hauteur d\'un battement ne dépend pas de la fluidité de l\'écran', () => {
    const peak = (dt) => {
        const g = E.createFlappy(pool(), seeded(4));
        E.flappyFlap(g);
        let top = g.clio.y;
        for (let t = 0; t < 0.6; t += dt) { E.flappyStep(g, dt); top = Math.min(top, g.clio.y); }
        return top;
    };
    const fine = peak(1 / 120), coarse = peak(0.05);
    assert.ok(Math.abs(fine - coarse) < 1.5, `${fine} / ${coarse}`);
});

test('Flappy : le décor suit l\'époque du dernier repère', () => {
    assert.equal(E.flappyEra(-10000), 'prehistoire');
    assert.equal(E.flappyEra(-2500), 'orient');
    assert.equal(E.flappyEra(-400), 'antique');
    assert.equal(E.flappyEra(476), 'antique');
    assert.equal(E.flappyEra(1066), 'medieval');
    assert.equal(E.flappyEra(1648), 'moderne');
    assert.equal(E.flappyEra(1830), 'industriel');
    assert.equal(E.flappyEra(1969), 'contemporain');
});

test('Flappy : les pleins d\'une porte laissent exactement les ouvertures libres', () => {
    const g = E.createFlappy(pool(), seeded(4));
    const gate = g.gates[3];
    const solids = E.gateSolids(gate);
    gate.gaps.forEach((gap) => {
        solids.forEach((s) => assert.ok(s[1] + s[3] <= gap.y - gap.h / 2 + 0.001 || s[1] >= gap.y + gap.h / 2 - 0.001, 'un plein recouvre une ouverture'));
    });
    const total = solids.reduce((n, s) => n + s[3], 0) + gate.gaps.reduce((n, p) => n + p.h, 0);
    assert.ok(Math.abs(total - E.FL.H) < 0.001, `${total}`);
});

// --- Course de chars -------------------------------------------------------------------------------------------
test('Course : une question à quatre années distinctes dont la bonne, jamais dans le futur ni à l\'an 0', () => {
    for (let seed = 1; seed < 40; seed++) {
        pool().forEach((event) => {
            const q = E.raceQuestion(event, seeded(seed));
            assert.equal(q.options.length, 4, `${event.date}`);
            assert.equal(new Set(q.options).size, 4);
            assert.ok(q.options.includes(event.date));
            q.options.forEach((y) => assert.ok(y !== 0 && y <= 2026));
        });
    }
});

test('Course en solo : une bonne réponse avance d\'une case, une fausse de zéro ; plus de minuteur', () => {
    const g = E.createRace(pool(), seeded(2), { mode: 'solo', difficulty: 'easy' });
    let out = E.raceAnswer(g, g.question.answer);
    assert.ok(out.includes('right') && out.includes('round'));
    assert.equal(g.pos[0], 1);
    out = E.raceAnswer(g, g.question.answer);
    assert.equal(g.pos[0], 2);
    const wrong = g.question.options.find((y) => y !== g.question.answer);
    out = E.raceAnswer(g, wrong);
    assert.ok(out.includes('wrong'));
    assert.equal(g.pos[0], 2);
    assert.equal(g.pos[1], 0, 'l\'adversaire n\'avance plus à chaque réponse : il avance avec le temps');
    assert.equal(g.history.length, 3);
    assert.deepEqual(Object.keys(g.history[2]).sort(), ['answer', 'event', 'player', 'right', 'steps', 'year']);
    assert.equal(g.history[2].right, false);
    assert.equal(g.history[2].answer, g.history[2].event.date);
    assert.equal(E.RACE.ANSWER_TIME, undefined);
});

test('Course en solo : l\'adversaire avance sans cesse, plus vite quand c\'est difficile, avec des élans', () => {
    const run = (difficulty, seconds) => {
        const g = E.createRace(pool(), seeded(7), { mode: 'solo', difficulty });
        for (let t = 0; t < seconds * 10; t++) E.raceTick(g, 0.1);
        return g;
    };
    const easy = run('easy', 20), normal = run('normal', 20), hard = run('hard', 20);
    assert.ok(easy.pos[1] > 0 && easy.pos[1] < normal.pos[1] && normal.pos[1] < hard.pos[1]);
    // ~ vitesse × temps, à l'ondulation près
    assert.ok(Math.abs(hard.pos[1] - E.RACE.RIVAL.hard * 20) < E.RACE.RIVAL.hard * 20 * E.RACE.WOBBLE + 0.05);
    // la vitesse varie d'un instant à l'autre
    const g = E.createRace(pool(), seeded(7), { mode: 'solo', difficulty: 'normal' });
    const speeds = new Set();
    for (let t = 0; t < 60; t++) { E.raceTick(g, 0.5); speeds.add(E.raceRivalSpeed(g).toFixed(3)); }
    assert.ok(speeds.size > 10);
    // le découpage du temps ne change pas la distance
    const a = E.createRace(pool(), seeded(7), { mode: 'solo', difficulty: 'normal' });
    const b = E.createRace(pool(), seeded(7), { mode: 'solo', difficulty: 'normal' });
    for (let t = 0; t < 100; t++) E.raceTick(a, 0.05);
    for (let t = 0; t < 10; t++) E.raceTick(b, 0.5);
    assert.ok(Math.abs(a.pos[1] - b.pos[1]) < 0.15, `${a.pos[1]} / ${b.pos[1]}`);
});

test('Course en solo : un joueur parfait gagne ; un joueur qui ne répond jamais est rattrapé, et l\'arrivée ne se joue plus qu\'une fois', () => {
    const g = E.createRace(pool(), seeded(9), { mode: 'solo', difficulty: 'hard' });
    let guard = 0;
    while (!g.over && guard++ < 50) E.raceAnswer(g, g.question.answer);
    assert.ok(g.over);
    assert.equal(g.winner, 0);
    assert.equal(g.pos[0], g.length);
    assert.equal(E.raceScore(g), g.length * 10 + 100);
    assert.deepEqual(E.raceAnswer(g, 1), []);
    assert.deepEqual(E.raceTick(g, 100), [], 'la course est finie : l\'adversaire ne gagne pas après coup');
    assert.equal(g.winner, 0);

    const h = E.createRace(pool(), seeded(9), { mode: 'solo', difficulty: 'hard' });
    let events = [];
    for (let t = 0; t < 2000 && !h.over; t++) events = events.concat(E.raceTick(h, 0.1));
    assert.ok(h.over);
    assert.deepEqual(events, ['over']);
    assert.equal(h.winner, 1);
    assert.equal(E.raceScore(h), 0);
    assert.equal(h.pos[1], h.length);
    assert.deepEqual(E.raceAnswer(h, h.question.answer), [], 'plus de réponse après la défaite');
});

test('Course en solo : un joueur qui répond juste à la cadence d\'un joueur normal bat l\'adversaire facile, pas toujours le difficile', () => {
    const play = (difficulty, secondsPerQuestion, rightRate, seed) => {
        const g = E.createRace(pool(), seeded(seed), { mode: 'solo', difficulty });
        const rng = seeded(seed + 100);
        for (let guard = 0; guard < 200 && !g.over; guard++) {
            for (let t = 0; t < secondsPerQuestion * 10 && !g.over; t++) E.raceTick(g, 0.1);
            if (g.over) break;
            const ok = rng() < rightRate;
            E.raceAnswer(g, ok ? g.question.answer : g.question.options.find((y) => y !== g.question.answer));
        }
        return g.winner === 0;
    };
    const wins = (difficulty) => [1, 2, 3, 4, 5, 6, 7, 8].filter((seed) => play(difficulty, 4.5, 0.8, seed)).length;
    assert.equal(wins('easy'), 8);
    assert.ok(wins('hard') < wins('easy'));
});

test('Course à deux : chacun joue sa question, la manche se joue après le second ; égalité possible ; pas de minuteur', () => {
    const g = E.createRace(pool(), seeded(3), { mode: 'duo' });
    const q1 = g.question;
    let out = E.raceAnswer(g, q1.answer);
    assert.ok(out.includes('next-player'));
    assert.equal(g.turn, 1);
    assert.equal(g.pos[0], 1);
    assert.notEqual(g.question, q1, 'une autre question pour le joueur 2');
    out = E.raceAnswer(g, g.question.answer);
    assert.ok(out.includes('round'));
    assert.equal(g.turn, 0);
    assert.equal(g.pos[1], 1);
    assert.equal(g.round, 1);
    assert.deepEqual(E.raceTick(g, 100), [], 'en duo, rien n\'avance tout seul');
    assert.equal(g.pos[1], 1);
    assert.deepEqual(g.history.map((h) => h.player), [0, 1]);
    // Les deux arrivent dans la même manche, à égalité : match nul.
    const h = E.createRace(pool(), seeded(3), { mode: 'duo' });
    h.pos = [11, 11];
    E.raceAnswer(h, h.question.answer);
    E.raceAnswer(h, h.question.answer);
    assert.ok(h.over);
    assert.equal(h.winner, null);
    // Le joueur 1 ne gagne pas avant que le joueur 2 ait joué sa manche.
    const k = E.createRace(pool(), seeded(3), { mode: 'duo' });
    k.pos = [11, 10];
    E.raceAnswer(k, k.question.answer);
    assert.ok(!k.over);
    E.raceAnswer(k, 999999);
    assert.ok(k.over);
    assert.equal(k.winner, 0);
});

test('textes, scripts et écrans des jeux d\'arcade ajoutés', () => {
    const need = {
        breakout: ['title', 'desc', 'board_aria', 'rule', 'left', 'right', 'launch', 'hint', 'status', 'break', 'wrong', 'lost', 'over_text', 'mistake'],
        flappy: ['title', 'desc', 'board_aria', 'flap', 'hint', 'status', 'banner_start', 'banner_last', 'good', 'wrong', 'hit', 'over_text', 'mistake', 'tap'],
        race: ['title', 'desc', 'rule', 'solo_easy', 'solo_normal', 'solo_hard', 'duo', 'handover', 'ready', 'status', 'turn_solo', 'turn_duo', 'question', 'right', 'wrong', 'answer', 'recap_title', 'recap_right', 'recap_wrong', 'win', 'lose', 'draw', 'win_player', 'over_solo', 'over_duo']
    };
    Object.keys(need).forEach((g) => need[g].forEach((k) => assert.ok(ui[g] && ui[g][k], `${g}.${k}`)));
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    ['js/arcadeExtraCore.js', 'js/app/arcade-extra.js'].forEach((f) => {
        assert.ok(html.includes(`<script src="${f}">`), f + ' dans index.html');
        assert.ok(sw.includes(`'./${f}'`), f + ' dans sw.js');
    });
    ['screen-breakout', 'screen-flappy', 'screen-race'].forEach((id) => assert.ok(html.includes(`id="${id}"`), id));
});

test('bruitages : tir, explosion, pas de Pac-Man, battement d\'ailes et musique du galop sont branchés', () => {
    const audio = fs.readFileSync(path.join(root, 'js/audio.js'), 'utf8');
    ['function playArcadeSfx', 'function startRaceMusic', 'function stopRaceMusic', 'function playHoof'].forEach((f) => assert.ok(audio.includes(f), f));
    ['shoot', 'explosion', 'chomp', 'flap'].forEach((k) => assert.ok(audio.includes(`'${k}'`), k));
    const arcade = fs.readFileSync(path.join(root, 'js/app/arcade.js'), 'utf8');
    ["arcadeSfx('shoot')", "arcadeSfx('explosion')", "arcadeSfx('chomp')"].forEach((c) => assert.ok(arcade.includes(c), c));
    const extra = fs.readFileSync(path.join(root, 'js/app/arcade-extra.js'), 'utf8');
    assert.ok(extra.includes("arcadeSfx('flap')") && extra.includes('startRaceMusic(') && extra.includes('stopRaceMusic()'));
    // la musique s'arrête quand on quitte la course
    assert.match(extra, /function raceBack\(\) \{\s*raceStopAll\(\);/);
});
