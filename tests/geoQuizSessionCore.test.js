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
    const ids = new Set(S.quizPool(facts, { level: 'hard' }).map(c => c.id));
    ['TWN', 'KOS', 'HKG', 'GRL', 'SAH'].forEach(id => assert.ok(ids.has(id), id + ' doit être jouable'));
    assert.ok(!ids.has('PSX'), 'la Palestine est exclue');
    assert.ok(!ids.has('ATA'), 'l’Antarctique n’est pas un pays');
    assert.ok(ids.size > 194, 'plus de pays que le jeu historique (194), qui excluait les territoires');
});

test('difficulté : facile = les 40 pays les plus peuplés, moyen = 80, difficile = tous', () => {
    const easy = S.quizPool(facts, { level: 'easy' });
    const medium = S.quizPool(facts, { level: 'medium' });
    const hard = S.quizPool(facts, { level: 'hard' });
    assert.equal(easy.length, 40);
    assert.equal(medium.length, 80);
    assert.ok(hard.length > 80);
    // Les plus peuplés d’abord ; chaque jeu est inclus dans le suivant.
    assert.deepEqual(easy.map(c => c.id), medium.slice(0, 40).map(c => c.id));
    assert.deepEqual(medium.map(c => c.id), hard.slice(0, 80).map(c => c.id));
    for (let i = 1; i < hard.length; i++) assert.ok(hard[i - 1].pop >= hard[i].pop, 'tri par population');
    assert.ok(!easy.some(c => c.id === 'VAT'), 'le Vatican n’est pas dans les 40 plus peuplés');
});

test('zone : un continent ne contient que ses pays, et une petite zone reste jouable même en facile', () => {
    S.ZONES.filter(z => z.continent).forEach(z => {
        const pool = S.quizPool(facts, { zone: z.key, level: 'hard' });
        assert.ok(pool.length >= 8, z.key + ' : ' + pool.length + ' pays');
        assert.ok(pool.every(c => c.cont === z.continent), z.key);
    });
    const sa = S.quizPool(facts, { zone: 'south_america', level: 'easy' });
    assert.ok(sa.length < 40 && sa.length >= 12, 'toute l’Amérique du Sud, moins de 40 pays');
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

test('panaché : la répartition est équilibrée, et on peut retirer la carte (sans WebGL)', () => {
    const { questions } = S.generateGame(facts, 'mix', { length: 10 }, { rng: seeded(8) });
    const count = k => questions.filter(q => q.kind === k).length;
    ['qcm', 'flag', 'map'].forEach(k => assert.ok(count(k) >= 3 && count(k) <= 4, k + ' : ' + count(k)));
    const noMap = S.generateGame(facts, 'mix', { length: 10 }, { rng: seeded(9), kinds: ['qcm', 'flag'] }).questions;
    assert.equal(noMap.length, 10);
    assert.ok(noMap.every(q => q.kind !== 'map'));
});

test('longueur : jamais plus de questions que de pays dans la zone', () => {
    const { questions, poolSize } = S.generateGame(facts, 'map', { zone: 'oceania', level: 'easy', length: 50 }, { rng: seeded(2) });
    assert.ok(questions.length <= poolSize);
    assert.ok(questions.length >= 10);
});

test('points : 100, + 10 par bonne réponse de suite (jusqu’à 50), + jusqu’à 50 de vitesse avec un chrono', () => {
    assert.equal(S.pointsFor(true, 0, null), 100);
    assert.equal(S.pointsFor(true, 3, null), 130);
    assert.equal(S.pointsFor(true, 5, null), 150);
    assert.equal(S.pointsFor(true, 12, null), 150, 'le bonus de série est plafonné');
    assert.equal(S.pointsFor(true, 0, 1), 150);
    assert.equal(S.pointsFor(true, 0, 0.5), 125);
    assert.equal(S.pointsFor(true, 5, 1), 200);
    assert.equal(S.pointsFor(true, 0, -3), 100, 'un temps négatif ne retire rien');
    assert.equal(S.pointsFor(false, 4, 0.9), 0);
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
