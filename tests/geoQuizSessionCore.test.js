// Les parties du quiz des pays (js/geoQuizSessionCore.js) : jeu de pays par zone et difficulté, panaché, points, records.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Q = require('../js/geoQuizCore.js');
const S = require('../js/geoQuizSessionCore.js');

const root = path.join(__dirname, '..');
const facts = JSON.parse(fs.readFileSync(path.join(root, 'assets/geo/countries-facts.json'), 'utf8')).countries;

// Générateur pseudo-aléatoire reproductible (LCG 31 bits).
function seeded(seed) {
    let s = seed;
    return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x80000000;
    };
}

test('réglages : les valeurs inconnues reviennent aux valeurs par défaut, et le chrono est désactivé par défaut', () => {
    assert.deepEqual(S.normalizePrefs(null), { zone: 'world', level: 'easy', length: 10, timer: 0 });
    assert.deepEqual(S.normalizePrefs({ zone: 'mars', level: 'extreme', length: 7, timer: 99 }), { zone: 'world', level: 'easy', length: 10, timer: 0 });
    assert.deepEqual(S.normalizePrefs({ zone: 'europe', level: 'hard', length: 50, timer: 15 }), { zone: 'europe', level: 'hard', length: 50, timer: 15 });
    assert.equal(S.DEFAULT_PREFS.timer, 0);
});

test('jeu de pays : tous les territoires et entités contestées, sauf la Palestine ; jamais l’Antarctique', () => {
    const ids = new Set(S.zoneCountries(facts, 'world').map(c => c.id));
    ['TWN', 'KOS', 'HKG', 'GRL', 'SAH'].forEach(id => assert.ok(ids.has(id), id + ' doit être jouable'));
    assert.ok(!ids.has('PSX'), 'la Palestine est exclue');
    assert.ok(!ids.has('ATA'), 'l’Antarctique n’est pas un pays');
    assert.ok(ids.size > 194, 'plus de pays que le jeu historique (194), qui excluait les territoires');
});

test('chrono : les durées, dans l’ordre croissant (sans chrono, 15 s, 30 s, 1, 2, 3 minutes)', () => {
    assert.deepEqual(S.TIMERS, [0, 15, 30, 60, 120, 180]);
});

test('difficulté : une part de la zone (20 %, 50 %, tout le continent), les plus peuplés d’abord, chaque jeu inclus dans le suivant', () => {
    const all = S.zoneCountries(facts, 'world');
    const easy = S.quizPool(facts, { level: 'easy' });
    const medium = S.quizPool(facts, { level: 'medium' });
    const hard = S.quizPool(facts, { level: 'hard' });
    assert.equal(easy.length, Math.round(0.2 * all.length));
    assert.equal(medium.length, Math.round(0.5 * all.length));
    assert.equal(hard.length, all.length, 'difficile : tous les pays');
    assert.deepEqual(easy.map(c => c.id), medium.slice(0, easy.length).map(c => c.id));
    assert.deepEqual(medium.map(c => c.id), hard.slice(0, medium.length).map(c => c.id));
    for (let i = 1; i < hard.length; i++) assert.ok(hard[i - 1].pop >= hard[i].pop, 'tri par population');
    assert.ok(!easy.some(c => c.id === 'VAT'), 'le Vatican n’est pas parmi les 20 % les plus peuplés du monde');
});

test('zone : une zone garde sa part de pays, au moins MIN_POOL, et ne contient que ses continents', () => {
    S.ZONES.filter(z => z.continents).forEach(z => {
        ['easy', 'medium', 'hard'].forEach(level => {
            const pool = S.quizPool(facts, { zone: z.key, level: level });
            assert.ok(pool.length >= S.MIN_POOL, z.key + ' ' + level + ' : ' + pool.length + ' pays');
            assert.ok(pool.every(c => z.continents.indexOf(c.cont) !== -1), z.key);
        });
    });
    const americas = S.zoneCountries(facts, 'americas');
    assert.ok(americas.some(c => c.cont === 'Amérique du Nord') && americas.some(c => c.cont === 'Amérique du Sud'), 'les Amériques sont une seule zone');
    assert.equal(S.normalizePrefs({ zone: 'north_america' }).zone, 'americas', 'un réglage enregistré avant la fusion');
    assert.equal(S.normalizePrefs({ zone: 'south_america' }).zone, 'americas');
});

test('taille : une petite zone garde au moins MIN_POOL pays, et l’écran le dit', () => {
    const oce = S.levelInfo(facts, { zone: 'oceania', level: 'easy' });
    assert.equal(oce.size, S.MIN_POOL);
    assert.equal(oce.floored, true);
    const world = S.levelInfo(facts, { zone: 'world', level: 'medium' });
    assert.equal(world.floored, false);
    assert.equal(world.size, Math.round(0.5 * world.total));
});

test('QCM : chaque question est valable, sur des pays tous différents, dans le jeu de pays', () => {
    ['easy', 'medium', 'hard'].forEach(level => {
        const prefs = { level, length: 20 };
        const { questions, poolSize } = S.generateGame(facts, 'qcm', prefs, { rng: seeded(11) });
        const pool = S.quizPool(facts, prefs);
        assert.equal(poolSize, pool.length);
        assert.equal(questions.length, 20, level);
        assert.equal(new Set(questions.map(q => q.target)).size, 20, level + ' : pays distincts');
        questions.forEach(q => {
            assert.equal(q.kind, 'qcm');
            assert.ok(pool.some(c => c.id === q.target), 'la cible est dans le jeu de pays');
            assert.ok(Q.isValid(q, pool), level + ' : question non valable pour ' + q.target);
        });
    });
});

test('drapeau et carte : formes et pays distincts', () => {
    const flag = S.generateGame(facts, 'flag', { length: 10 }, { rng: seeded(3) }).questions;
    assert.equal(flag.length, 10);
    flag.forEach(q => { assert.equal(q.kind, 'flag'); assert.equal(q.ask, 'name'); assert.equal(q.clues[0].key, 'flag'); });
    const map = S.generateGame(facts, 'map', { length: 10 }, { rng: seeded(4) }).questions;
    assert.equal(map.length, 10);
    map.forEach(q => { assert.equal(q.kind, 'map'); assert.equal(q.ask, 'locate'); assert.deepEqual(q.options, []); });
    assert.equal(new Set(map.map(q => q.target)).size, 10);
});

test('panaché : les trois formes, un pays une seule fois, jamais plus de deux fois la même forme de suite', () => {
    for (let seed = 1; seed <= 30; seed++) {
        const { questions } = S.generateGame(facts, 'mix', { length: 20, level: 'medium' }, { rng: seeded(seed) });
        assert.equal(questions.length, 20, 'seed ' + seed);
        assert.equal(new Set(questions.map(q => q.target)).size, 20, 'seed ' + seed + ' : un pays une seule fois');
        const kinds = new Set(questions.map(q => q.kind));
        assert.ok(kinds.has('qcm') && kinds.has('flag') && kinds.has('map'), 'seed ' + seed + ' : ' + [...kinds]);
        for (let i = 2; i < questions.length; i++) {
            assert.ok(!(questions[i].kind === questions[i - 1].kind && questions[i].kind === questions[i - 2].kind), 'seed ' + seed + ' : trois de suite en ' + i);
        }
    }
});

test('panaché : la répartition est équilibrée entre les formes, et on peut retirer la carte (sans WebGL)', () => {
    const { questions } = S.generateGame(facts, 'mix', { length: 50, level: 'hard' }, { rng: seeded(8) });
    const count = k => questions.filter(q => q.kind === k).length;
    S.MIX_KINDS.forEach(k => assert.ok(count(k) >= 4 && count(k) <= 7, k + ' : ' + count(k)));
    const noMap = S.generateGame(facts, 'mix', { length: 20 }, { rng: seeded(9), kinds: ['qcm', 'flag', 'typed', 'fete', 'who'] }).questions;
    assert.equal(noMap.length, 20);
    assert.ok(noMap.every(q => !S.MAP_KINDS.includes(q.kind)));
});

test('chaque forme produit des questions de sa forme, valables, sur des pays distincts', () => {
    const prefs = { level: 'hard', length: 10 };
    const pool = S.quizPool(facts, prefs);
    ['qcm', 'flag', 'map', 'mapname', 'typed', 'fete', 'who', 'mystery'].forEach(form => {
        const { questions } = S.generateGame(facts, form, prefs, { rng: seeded(17) });
        assert.equal(questions.length, 10, form);
        assert.ok(questions.every(q => q.kind === form), form + ' : forme des questions');
        assert.equal(new Set(questions.map(q => q.target)).size, 10, form);
        questions.forEach(q => assert.ok(pool.some(c => c.id === q.target), form + ' : cible hors du jeu de pays'));
        if (['qcm', 'flag', 'fete', 'who'].includes(form)) questions.forEach(q => assert.ok(Q.isValid(q, pool), `${form} : ${q.target} non valable`));
    });
});

test('Rafale et Survie : beaucoup de questions rapides, sans saisie ni indices progressifs', () => {
    const prefs = { level: 'hard', length: 5 };
    const burst = S.generateGame(facts, 'burst', prefs, { rng: seeded(2) });
    assert.ok(burst.questions.length >= 70, 'de quoi tenir soixante secondes : ' + burst.questions.length);
    assert.ok(burst.questions.every(q => S.kindsOf('burst').includes(q.kind)), 'QCM et drapeau seulement');
    const survival = S.generateGame(facts, 'survival', prefs, { rng: seeded(3) });
    assert.ok(survival.questions.length >= 100, 'tant qu\'il reste des vies : ' + survival.questions.length);
    assert.ok(survival.questions.every(q => S.kindsOf('survival').includes(q.kind)));
    assert.ok(!survival.questions.some(q => q.kind === 'typed' || q.kind === 'mystery'));
    const noMap = S.generateGame(facts, 'survival', prefs, { rng: seeded(3), kinds: ['qcm', 'flag', 'fete', 'who'] }).questions;
    assert.ok(noMap.every(q => !S.MAP_KINDS.includes(q.kind)));
    assert.equal(new Set(burst.questions.map(q => q.target)).size, burst.questions.length);
});

test('règles : Rafale 60 s, Survie 3 vies ; le chrono par question ne s\'applique qu\'aux parties normales', () => {
    assert.equal(S.rulesOf('burst'), 'burst');
    assert.equal(S.rulesOf('survival'), 'survival');
    ['qcm', 'flag', 'map', 'mapname', 'typed', 'fete', 'who', 'mystery', 'mix'].forEach(f => assert.equal(S.rulesOf(f), 'standard', f));
    assert.equal(S.BURST_SECONDS, 60);
    assert.equal(S.LIVES, 3);
    const prefs = { timer: 30 };
    assert.equal(S.gameTimer('qcm', prefs, false), 30);
    assert.equal(S.gameTimer('mix', prefs, false), 30);
    assert.equal(S.gameTimer('mystery', prefs, false), 0, 'six essais, pas de chrono');
    assert.equal(S.gameTimer('burst', prefs, false), 0);
    assert.equal(S.gameTimer('survival', prefs, false), 0);
    assert.equal(S.gameTimer('qcm', prefs, true), 0, 'pas de chrono en révision');
});

test('points : qui suis-je (bonus par indice resté caché) et pays mystère (bonus par essai resté)', () => {
    assert.equal(S.whoPoints(true, 1, 7, 0), 100 + 6 * 20);
    assert.equal(S.whoPoints(true, 7, 7, 0), 100);
    assert.equal(S.whoPoints(true, 3, 7, 2), 100 + 20 + 4 * 20);
    assert.equal(S.whoPoints(false, 1, 7, 3), 0);
    assert.equal(S.mysteryPoints(true, 1, 6, 0), 100 + 5 * 20);
    assert.equal(S.mysteryPoints(true, 6, 6, 0), 100);
    assert.equal(S.mysteryPoints(true, 2, 6, 3), 100 + 30 + 4 * 20);
    assert.equal(S.mysteryPoints(false, 6, 6, 0), 0);
});

test('longueur : jamais plus de questions que de pays dans la zone', () => {
    const { questions, poolSize } = S.generateGame(facts, 'map', { zone: 'oceania', level: 'easy', length: 50 }, { rng: seeded(2) });
    assert.ok(questions.length <= poolSize);
    assert.ok(questions.length >= S.MIN_POOL);
});

test('points : 100, + 10 par bonne réponse de suite (jusqu’à 50), sans bonus de vitesse', () => {
    assert.equal(S.pointsFor(true, 0), 100);
    assert.equal(S.pointsFor(true, 3), 130);
    assert.equal(S.pointsFor(true, 5), 150);
    assert.equal(S.pointsFor(true, 12), 150, 'le bonus de série est plafonné');
    assert.equal(S.pointsFor(false, 4), 0);
});

test('bilan : score, bonnes réponses et meilleure série', () => {
    const answers = [true, true, false, true, true, true].map((ok, i) => ({ ok, points: ok ? 100 + 10 * i : 0 }));
    const s = S.summarize(answers);
    assert.equal(s.total, 6);
    assert.equal(s.correct, 5);
    assert.equal(s.bestStreak, 3);
    assert.equal(s.score, 100 + 110 + 130 + 140 + 150);
    assert.deepEqual(S.summarize([]), { score: 0, correct: 0, total: 0, bestStreak: 0 });
});

test('records : le meilleur score de chaque réglage, et l’historique des 50 dernières parties', () => {
    const game = (extra) => Object.assign({ at: 1000, form: 'qcm', zone: 'world', level: 'easy', length: 10, timer: 0, score: 700, correct: 7, total: 10 }, extra);
    let r = S.recordGame(S.emptyState(), game());
    assert.equal(r.isRecord, true);
    assert.equal(r.previous, null);
    assert.equal(r.state.best['qcm|world|easy|10|0'].score, 700);
    r = S.recordGame(r.state, game({ at: 2000, score: 700 }));
    assert.equal(r.isRecord, false, 'un score égal n’est pas un record');
    r = S.recordGame(r.state, game({ at: 3000, score: 650 }));
    assert.equal(r.isRecord, false);
    assert.equal(r.state.best['qcm|world|easy|10|0'].score, 700);
    r = S.recordGame(r.state, game({ at: 4000, score: 900, correct: 9 }));
    assert.equal(r.isRecord, true);
    assert.equal(r.previous.score, 700);
    assert.equal(r.state.best['qcm|world|easy|10|0'].correct, 9);
    // Un autre réglage a son propre record.
    r = S.recordGame(r.state, game({ at: 5000, form: 'flag', score: 400 }));
    assert.equal(r.isRecord, true);
    assert.equal(Object.keys(r.state.best).length, 2);
    // Un score nul n’est jamais un record.
    assert.equal(S.recordGame(S.emptyState(), game({ score: 0, correct: 0 })).isRecord, false);
    // L’historique : le plus récent en premier, 50 au plus.
    let st = S.emptyState();
    for (let i = 0; i < 70; i++) st = S.recordGame(st, game({ at: 10 + i, score: i + 1 })).state;
    assert.equal(st.history.length, S.HISTORY_MAX);
    assert.equal(st.history[0].at, 79);
    assert.equal(st.history[49].at, 30);
});

test('records : la liste est triée, et un état abîmé ne fait jamais d’erreur', () => {
    let st = S.emptyState();
    [['qcm', 300], ['flag', 800], ['map', 500]].forEach(([form, score], i) => {
        st = S.recordGame(st, { at: i + 1, form, zone: 'world', level: 'easy', length: 10, timer: 0, score, correct: 3, total: 10 }).state;
    });
    assert.deepEqual(S.bestList(st).map(b => b.form), ['flag', 'map', 'qcm']);
    assert.equal(S.bestList(st)[0].timer, 0);
    [null, undefined, 3, 'x', [], { best: 5, history: 'x' }, { best: { a: { score: 'x' }, b: null }, history: [null, 3, { at: 1 }] }].forEach(raw => {
        const n = S.normalizeState(raw);
        assert.deepEqual(Object.keys(n.best), []);
        assert.deepEqual(n.history, []);
    });
});

test('clé de réglage : stable, et change avec la zone, la difficulté, la longueur et le chrono', () => {
    const base = S.configKey('qcm', {});
    assert.equal(base, 'qcm|world|easy|10|0');
    assert.notEqual(base, S.configKey('qcm', { zone: 'asia' }));
    assert.notEqual(base, S.configKey('qcm', { level: 'hard' }));
    assert.notEqual(base, S.configKey('qcm', { length: 20 }));
    assert.notEqual(base, S.configKey('qcm', { timer: 15 }));
    assert.notEqual(base, S.configKey('mix', {}));
});

test('clé de réglage : Rafale et Survie ignorent longueur et chrono, le Pays mystère ignore le chrono', () => {
    assert.equal(S.configKey('burst', { length: 50, timer: 15 }), 'burst|world|easy|0|0');
    assert.equal(S.configKey('burst', {}), S.configKey('burst', { length: 5, timer: 30 }));
    assert.equal(S.configKey('survival', { zone: 'asia', level: 'hard', length: 20, timer: 15 }), 'survival|asia|hard|0|0');
    assert.equal(S.configKey('mystery', { length: 5, timer: 30 }), 'mystery|world|easy|5|0');
    assert.notEqual(S.configKey('mystery', { length: 5 }), S.configKey('mystery', { length: 10 }));
});

test('textes : chaque libellé utilisé par l’écran du quiz existe en français et en anglais', () => {
    const source = fs.readFileSync(path.join(root, 'js/modes/geoquiz.js'), 'utf8') + fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const used = new Set();
    for (const m of source.matchAll(/'geoquiz\.([a-z_0-9]+)'/g)) used.add(m[1]);
    for (const m of source.matchAll(/data-i18n(?:-attr)?="[^"]*?geoquiz\.([a-z_0-9]+)/g)) used.add(m[1]);
    // Les libellés construits : zone_*, level_*, timer_*, form_*, ask_*, clue_*.
    S.ZONES.forEach(z => used.add('zone_' + z.key));
    Object.keys(S.LEVELS).forEach(k => { used.add('level_' + k); used.add('level_' + k + '_hint'); });
    S.TIMERS.forEach(s => used.add('timer_' + s));
    S.FORMS.forEach(f => used.add('form_' + f));
    for (const lang of ['fr', 'en']) {
        const ui = JSON.parse(fs.readFileSync(path.join(root, 'ui', lang + '.json'), 'utf8')).geoquiz;
        for (const key of used) {
            if (key.endsWith('_') || key === 'ask_' || key === 'clue_') continue;
            assert.ok(ui[key] !== undefined, `${lang} : geoquiz.${key} manque`);
        }
    }
});

// --- Lot 3 : maîtrise des pays, pays faibles, défi du jour, XP et trophées ---------------------------

const answers = (state, id, run) => run.split('').reduce((s, r, i) => S.trackAnswer(s, id, r === '1', 1000 + i), state);

test('maîtrise : nouveau, à revoir, en cours, maîtrisé selon les dernières réponses', () => {
    const level = run => S.masteryOf(answers(S.emptyState(), 'FRA', run).countries.FRA);
    assert.equal(S.masteryOf(undefined), 'new');
    assert.equal(level('0'), 'weak', 'une première erreur : à revoir');
    assert.equal(level('1'), 'learning', 'une seule bonne réponse ne suffit pas à maîtriser');
    assert.equal(level('11'), 'learning');
    assert.equal(level('111'), 'mastered');
    assert.equal(level('1111'), 'mastered');
    assert.equal(level('1110'), 'weak', 'la dernière réponse fausse : à revoir');
    assert.equal(level('0111'), 'learning', '3 sur 4 : pas encore maîtrisé');
    assert.equal(level('01111'), 'mastered', '4 sur 5 : maîtrisé malgré une faute plus ancienne');
    assert.equal(level('10001'), 'weak', 'moins de la moitié de réussites sur les dernières réponses');
    assert.equal(level('0000011111'), 'mastered', 'seules les 5 dernières réponses comptent');
});

test('suivi : compte les réponses, garde les 5 dernières, et résiste à un état abîmé', () => {
    const s = answers(S.emptyState(), 'BRA', '0110111');
    assert.deepEqual(s.countries.BRA, { n: 7, ok: 5, last: 1006, run: '10111' });
    const bad = S.normalizeState({ countries: { A: { n: -3, run: '1' }, B: 'x', C: { n: 4, ok: 99, last: 'y', run: 'a1b0' }, D: { n: 2, ok: 1, run: '' } }, daily: { 'pas-une-date': { score: 5 }, '2026-01-01': { score: -1 }, '2026-01-02': { score: 800, correct: 8, total: 10 } } });
    assert.deepEqual(Object.keys(bad.countries), ['C']);
    assert.deepEqual(bad.countries.C, { n: 4, ok: 4, last: 0, run: '10' });
    assert.deepEqual(Object.keys(bad.daily), ['2026-01-02']);
});

test('suivi : enregistrer une partie garde la maîtrise et le défi du jour', () => {
    let s = answers(S.emptyState(), 'FRA', '111');
    s = S.recordDaily(s, '2026-05-01', { score: 900, correct: 9, total: 10 }).state;
    const next = S.recordGame(s, { at: 5, form: 'qcm', zone: 'world', level: 'easy', length: 10, timer: 0, score: 500, correct: 5, total: 10 }).state;
    assert.equal(next.countries.FRA.n, 3);
    assert.equal(next.daily['2026-05-01'].score, 900);
    assert.equal(next.history.length, 1);
});

test('pays faibles : les pays à revoir d’abord (les plus ratés), puis en cours, puis nouveaux, puis maîtrisés', () => {
    const pool = ['A', 'B', 'C', 'D', 'E', 'F'].map(id => ({ id }));
    let s = S.emptyState();
    s = answers(s, 'A', '111');   // maîtrisé
    s = answers(s, 'B', '0');     // à revoir, 0 %
    s = answers(s, 'C', '10');    // à revoir (dernière fausse), 50 %
    s = answers(s, 'D', '01');    // en cours
    // E, F : nouveaux
    assert.deepEqual(S.weakTargets(s, pool, 6), ['B', 'C', 'D', 'E', 'F', 'A']);
    assert.deepEqual(S.weakTargets(s, pool, 2), ['B', 'C']);
    assert.deepEqual(S.weakTargets(null, pool, 3).length, 3, 'sans suivi, on prend des pays jamais vus');
    assert.deepEqual(S.masteryCounts(s, pool), { mastered: 1, learning: 1, weak: 2, new: 2, total: 6 });
});

test('partie « pays faibles » : les questions portent sur les pays à revoir, tous niveaux confondus', () => {
    const pool = S.quizPool(facts, { level: 'hard' });
    const hardOnes = pool.slice(-12).map(c => c.id);   // les moins peuplés : hors du niveau facile
    let state = S.emptyState();
    hardOnes.forEach(id => { state = answers(state, id, '0'); });
    const game = S.generateGame(facts, 'weak', { zone: 'world', level: 'easy', length: 10, timer: 0 }, { rng: seeded(7), state: state });
    assert.equal(game.questions.length, 10);
    const targets = game.questions.map(q => q.target);
    assert.equal(new Set(targets).size, 10, 'chaque pays une fois');
    targets.forEach(id => assert.ok(hardOnes.includes(id), id + ' devait être un pays à revoir'));
    game.questions.forEach(q => assert.ok(S.MIX_KINDS.includes(q.kind)));
    assert.equal(S.gameTimer('weak', { timer: 15 }, false), 0, 'pas de chrono en révision');
});

test('défi du jour : le même tirage pour la même graine, un autre pour un autre jour, réglages fixes', () => {
    const play = seed => S.generateGame(facts, 'daily', { zone: 'africa', level: 'hard', length: 50, timer: 15 }, { rng: seeded(seed) }).questions;
    const a = play(11), b = play(11), c = play(12);
    assert.equal(a.length, 10, 'toujours dix questions, quels que soient les réglages du menu');
    assert.deepEqual(a, b);
    assert.notDeepEqual(a.map(q => q.target), c.map(q => q.target));
    const pool = new Set(S.quizPool(facts, S.DAILY_PREFS).map(x => x.id));
    a.forEach(q => assert.ok(pool.has(q.target), 'monde, niveau moyen'));
    assert.equal(S.gameTimer('daily', { timer: 30 }, false), 0);
});

test('défi du jour : seule la première partie compte ; la série compte les jours de suite', () => {
    let s = S.emptyState();
    let r = S.recordDaily(s, '2026-05-01', { score: 700, correct: 7, total: 10 });
    assert.ok(r.first);
    r = S.recordDaily(r.state, '2026-05-01', { score: 1200, correct: 10, total: 10 });
    assert.ok(!r.first);
    assert.equal(r.state.daily['2026-05-01'].score, 700, 'la première partie reste');
    s = S.recordDaily(r.state, '2026-05-02', { score: 100, correct: 1, total: 10 }).state;
    s = S.recordDaily(s, '2026-05-03', { score: 100, correct: 1, total: 10 }).state;
    assert.equal(S.dailyStreak(s, '2026-05-03'), 3);
    assert.equal(S.dailyStreak(s, '2026-05-04'), 3, 'aujourd’hui pas encore fait : la série tient jusqu’à la veille');
    assert.equal(S.dailyStreak(s, '2026-05-05'), 0, 'un jour manqué casse la série');
    assert.equal(S.dailyStreak(s, '2026-03-01'), 0);
    assert.equal(S.dailyStreak(S.recordDaily(S.emptyState(), '2026-02-28', { score: 1, correct: 0, total: 1 }).state, '2026-03-01'), 1, 'passage de mois');
});

test('XP et trophées', () => {
    assert.equal(S.xpFor(1000), 200);
    assert.equal(S.xpFor(5000), 300, 'plafonné');
    assert.equal(S.xpFor(1000, { review: true }), 100);
    assert.equal(S.xpFor(1000, { newlyMastered: 3, dailyFirst: true }), 200 + 30 + 100);
    const base = { form: 'qcm', level: 'easy', rules: 'standard', correct: 5, total: 10, mysteryTries: 0, mastered: 0, zoneComplete: false, streak: 0 };
    const earned = o => S.badgesEarned(Object.assign({}, base, o));
    assert.deepEqual(earned({}), []);
    assert.deepEqual(earned({ mastered: 50 }), ['globe_trotter']);
    assert.deepEqual(earned({ zoneComplete: true }), ['cartographe']);
    assert.deepEqual(earned({ level: 'hard', correct: 10, total: 10 }), ['sans_faute_geo']);
    assert.deepEqual(earned({ level: 'easy', correct: 10, total: 10 }), [], 'seulement en difficile');
    assert.deepEqual(earned({ level: 'hard', correct: 10, total: 10, form: 'weak' }), [], 'pas en révision');
    assert.deepEqual(earned({ level: 'hard', correct: 5, total: 5 }), [], 'au moins dix questions');
    assert.deepEqual(earned({ streak: 7 }), ['assidu_geo']);
    assert.deepEqual(earned({ form: 'mystery', correct: 3, mysteryTries: 2 }), ['flair_detective']);
    assert.deepEqual(earned({ form: 'mystery', correct: 3, mysteryTries: 3 }), []);
    assert.deepEqual(earned({ form: 'burst', rules: 'burst', correct: 20, total: 25 }), ['rafale_savant']);
});

// --- Lot 4 : voisins, plus ou moins, chefs d'État, duel ----------------------------------------------

const SL = require('../js/stateLeadersCore.js');

test('voisins : la bonne réponse touche le pays, les trois autres ne le touchent pas et n’en sont pas proches', () => {
    const pool = S.quizPool(facts, { level: 'hard' });
    const byId = new Map(pool.map(c => [c.id, c]));
    const qs = Q.generateNeighborQuestions(pool, { count: 80, rng: seeded(3), difficulty: 'hard' });
    assert.ok(qs.length >= 60);
    qs.forEach(q => {
        const target = byId.get(q.target);
        assert.equal(q.options.length, 4);
        assert.ok(target.nb.includes(q.right), q.target + ' touche ' + q.right);
        q.options.filter(o => o.id !== q.right).forEach(o => {
            assert.ok(!target.nb.includes(o.id) && !(target.nr || []).includes(o.id) && o.id !== q.target, o.id + ' ne doit pas toucher ' + q.target);
        });
        assert.equal(new Set(q.options.map(o => o.id)).size, 4);
    });
});

test('voisins : des frontières connues sont dans les données, et la symétrie est respectée', () => {
    const by = new Map(facts.map(c => [c.id, c]));
    const touch = (a, b) => assert.ok(by.get(a).nb.includes(b) && by.get(b).nb.includes(a), a + ' / ' + b);
    [['FRA', 'ESP'], ['FRA', 'BRA'], ['DEU', 'POL'], ['USA', 'CAN'], ['USA', 'MEX'], ['CHN', 'IND'], ['RUS', 'KAZ'], ['ZAF', 'LSO'], ['ITA', 'VAT'],
        ['KOR', 'PRK'], ['COD', 'ZMB'], ['TUR', 'GRC'], ['ESP', 'MAR'], ['KWT', 'SAU'], ['SRB', 'MKD'], ['GBR', 'IRL'], ['DOM', 'HTI']].forEach(([a, b]) => touch(a, b));
    ['AUS', 'JPN', 'ISL', 'NZL', 'CYP', 'MDG'].forEach(id => assert.equal((by.get(id).nb || []).length, 0, id + ' n’a pas de frontière terrestre'));
    facts.forEach(c => (c.nb || []).forEach(id => assert.ok(by.get(id).nb.includes(c.id), 'symétrie ' + c.id + '/' + id)));
    facts.forEach(c => assert.ok(!(c.nb || []).includes('PSX') && c.id !== 'PSX' || c.id === 'PSX'));
});

test('plus ou moins : le bon pays a vraiment plus d’habitants, ou est vraiment plus au nord', () => {
    const pool = S.quizPool(facts, { level: 'hard' });
    const byId = new Map(pool.map(c => [c.id, c]));
    const qs = Q.generateMoreQuestions(pool, { count: 100, rng: seeded(5), difficulty: 'easy' });
    assert.ok(qs.length > 60);
    assert.ok(new Set(qs.map(q => q.ask)).size === 2, 'les deux sortes');
    qs.forEach(q => {
        assert.equal(q.options.length, 2);
        const [a, b] = q.options.map(o => byId.get(o.id));
        const win = byId.get(q.right), lose = a === win ? b : a;
        assert.ok(q.options.some(o => o.id === q.right));
        if (q.ask === 'more_pop') assert.ok(win.pop >= Q.MIN_RATIO * lose.pop);
        else assert.ok(win.c[1] - lose.c[1] >= Q.NORTH_GAP);
    });
});

test('chefs d’État : une année couverte par un seul mandat, la bonne réponse parmi des chefs du même pays', () => {
    const leaders = Q.leadersFrom(SL);
    assert.ok(Object.keys(leaders).length >= 30);
    Object.keys(leaders).forEach(id => assert.ok(facts.some(c => c.id === id), id + ' est un pays du jeu'));
    const pool = S.quizPool(facts, { level: 'hard' });
    const qs = Q.generateLeaderQuestions(pool, { count: 60, rng: seeded(9), leaders: leaders, year: 2026 });
    assert.equal(qs.length, 60);
    assert.equal(new Set(qs.map(q => q.target)).size, 60, 'jamais deux fois la même question');
    qs.forEach(q => {
        const rows = leaders[q.country];
        const year = Number(q.clues[1].value);
        assert.ok(year >= 1900 && year <= 2026);
        const holders = rows.filter(r => r.from <= year && year <= (r.to == null ? 2026 : r.to));
        assert.equal(holders.length, 1, q.country + ' ' + year + ' : un seul chef');
        assert.equal(holders[0].name, q.right);
        assert.equal(q.options.length, 4);
        assert.equal(new Set(q.options.map(o => o.value)).size, 4);
        q.options.filter(o => o.id !== q.right).forEach(o => {
            assert.ok(rows.some(r => r.name === o.value), o.value + ' a dirigé ' + q.country);
            assert.ok(!holders.some(h => h.name === o.value));
        });
    });
    assert.deepEqual(Q.generateLeaderQuestions(pool, { count: 5, rng: seeded(1) }), [], 'sans listes, aucune question');
});

test('formes du lot 4 : panaché et défi du jour les mélangent ; seuls les pays connus sont suivis', () => {
    ['neighbor', 'more'].forEach(k => assert.ok(S.MIX_KINDS.includes(k)));
    assert.ok(!S.kindsOf('weak').includes('more'));
    assert.ok(!S.kindsOf('survival').includes('more'));
    ['more', 'leader'].forEach(k => assert.ok(!S.TRACKED_KINDS.includes(k)));
    assert.ok(S.TRACKED_KINDS.includes('neighbor'));
    assert.deepEqual(S.kindsOf('leader'), ['leader']);
    const leaders = Q.leadersFrom(SL);
    const game = S.generateGame(facts, 'leader', { zone: 'world', level: 'medium', length: 20, timer: 0 }, { rng: seeded(2), leaders: leaders });
    assert.equal(game.questions.length, 20);
    assert.ok(game.questions.filter(q => q.kind === 'leader').length >= 15);
    const duel = S.generateGame(facts, 'duel', { zone: 'world', level: 'easy', length: 10, timer: 0 }, { rng: seeded(4) });
    assert.equal(duel.questions.length, 20, 'dix questions par joueur');
    assert.ok(new Set(duel.questions.map(q => q.kind)).size >= 4);
});

// --- Lot 5 : statistiques -------------------------------------------------------------------------

test('statistiques : parties, réussite, meilleur score et série par forme ; rien n’est tronqué au-delà de l’historique', () => {
    let s = S.emptyState();
    for (let i = 0; i < 60; i++) s = S.recordGame(s, { at: i, form: 'qcm', zone: 'world', level: 'easy', length: 10, timer: 0, score: 100 + i, correct: 5, total: 10, bestStreak: i % 4 }).state;
    s = S.recordGame(s, { at: 99, form: 'flag', zone: 'world', level: 'easy', length: 10, timer: 0, score: 800, correct: 9, total: 10, bestStreak: 7 }).state;
    assert.equal(s.history.length, 50, 'l’historique reste borné');
    const st = S.statsOf(s);
    assert.equal(st.games, 61, 'les compteurs, eux, ne le sont pas');
    assert.equal(st.forms[0].form, 'qcm', 'les formes les plus jouées d’abord');
    assert.equal(st.forms[0].games, 60);
    assert.equal(st.forms[0].pct, 50);
    assert.equal(st.forms[0].best, 159);
    assert.equal(st.forms[0].streak, 3);
    assert.equal(st.forms[1].pct, 90);
    assert.equal(st.streak, 7, 'la plus longue série, toutes formes');
    assert.equal(st.pct, Math.round(100 * (300 + 9) / (600 + 10)));
});

test('statistiques : le défi du jour compte comme une forme ; un état vide ou abîmé donne des zéros', () => {
    let s = S.recordDaily(S.emptyState(), '2026-05-01', { score: 700, correct: 7, total: 10, bestStreak: 4 }).state;
    assert.deepEqual(S.statsOf(s).forms.map(f => f.form), ['daily']);
    assert.equal(S.statsOf(s).forms[0].streak, 4);
    assert.deepEqual(S.statsOf(null), { games: 0, pct: null, streak: 0, forms: [] });
    const bad = S.normalizeState({ forms: { qcm: { games: -2, correct: 'x', total: 10.7 }, flag: null } });
    assert.deepEqual(bad.forms.qcm, { games: 0, correct: 0, total: 10, best: 0, streak: 0 });
    assert.deepEqual(bad.forms.flag, { games: 0, correct: 0, total: 0, best: 0, streak: 0 });
});

// --- Lot 5 (suite) : pays les mieux et moins bien réussis, progression -------------------------------

test('classement des pays : les moins bien réussis (au moins deux fois vus) et les mieux réussis', () => {
    let s = S.emptyState();
    s = answers(s, 'FRA', '1111');   // 100 %
    s = answers(s, 'DEU', '0011');   // 50 %
    s = answers(s, 'ITA', '0');      // vu une seule fois : exclu
    s = answers(s, 'ESP', '1000');   // 25 %
    const r = S.countryRanking(s, ['FRA', 'DEU', 'ITA', 'ESP', 'BRA'], 5);
    assert.deepEqual(r.worst.map(x => x.id), ['ESP', 'DEU'], 'le moins bien réussi d’abord, sans les pays vus une fois');
    assert.deepEqual(r.best.map(x => x.id), ['FRA'], 'seuls les pays à au moins 80 %');
    assert.equal(r.worst[0].pct, 25);
    assert.equal(S.countryRanking(s, ['FRA'], 1).worst.length, 0, 'un pays à 100 % n’est pas « moins bien réussi »');
});

test('progression : le pourcentage de chaque partie, de la plus ancienne à la plus récente', () => {
    let s = S.emptyState();
    s = S.recordGame(s, { at: 1, form: 'qcm', zone: 'world', level: 'easy', length: 10, timer: 0, score: 1, correct: 4, total: 10 }).state;
    s = S.recordGame(s, { at: 2, form: 'flag', zone: 'world', level: 'easy', length: 10, timer: 0, score: 1, correct: 9, total: 10 }).state;
    assert.deepEqual(S.progressionOf(s).map(p => p.pct), [40, 90]);
    assert.deepEqual(S.progressionOf(S.emptyState()), []);
});
