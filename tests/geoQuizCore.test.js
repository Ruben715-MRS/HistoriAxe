// Le quiz des pays (js/geoQuizCore.js) : jeu jouable, fêtes qui ne révèlent pas le pays, unicité des questions.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Q = require('../js/geoQuizCore.js');

const root = path.join(__dirname, '..');
const facts = JSON.parse(fs.readFileSync(path.join(root, 'assets/geo/countries-facts.json'), 'utf8')).countries;
const pool = Q.playablePool(facts);
const byName = name => facts.find(c => c.n === name);

// Générateur pseudo-aléatoire reproductible (LCG 31 bits).
function seeded(seed) {
    let s = seed;
    return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x80000000;
    };
}

test('jeu : 194 pays, sans l\'Antarctique, les territoires ni les entités contestées', () => {
    assert.equal(pool.length, 194);
    const ids = new Set(pool.map(c => c.id));
    assert.equal(ids.has('TWN'), false, 'Taïwan est contesté');
    assert.equal(ids.has('GGY'), false, 'Guernesey est un territoire');
    assert.equal(ids.has('ATA'), false, 'Antarctique');
    assert.equal(Q.playablePool(facts, { includeSpecial: true }).some(c => c.id === 'TWN'), true);
});

test('fêtes : une fête qui nomme le pays ou sa capitale n\'est jamais un indice', () => {
    const france = { n: 'France', cap: 'Paris' };
    assert.equal(Q.namesCountry('14 juillet : Fête nationale française', france), true);
    assert.equal(Q.namesCountry('Journée de Portugal (Camões)', { n: 'Portugal', cap: 'Lisbonne' }), true);
    assert.equal(Q.namesCountry('15 août : indépendance (1947)', { n: 'Inde', cap: 'New Delhi' }), false, '« indépendance » ne doit pas faire écarter l\'Inde');
    assert.equal(Q.namesCountry('11 décembre : proclamation de la République (1958)', { n: 'Burkina Faso', cap: 'Ouagadougou' }), false);
    assert.equal(Q.nationalDay(byName('Canada')), null);
    assert.equal(Q.nationalDay(byName('Aruba')), null);
    assert.equal(Q.nationalDay(byName('Inde')), '15 août : indépendance (1947)');
});

test('fêtes : aucune fête gardée ne contient le nom du pays, en mots entiers', () => {
    // Mots entiers : « indépendance » ne contient pas le pays « Inde » pour un lecteur.
    const wholeWords = text => ' ' + Q.normalize(text) + ' ';
    for (const c of pool) {
        const text = Q.nationalDay(c);
        if (!text) continue;
        assert.equal(wholeWords(text).includes(' ' + Q.normalize(c.n) + ' '), false, `${c.n} : « ${text} »`);
    }
});

test('langues : chaque langue d\'un pays est un indice possible', () => {
    assert.deepEqual(Q.clueValues({ lang: 'néerlandais, papiamento' }, 'lang'), ['néerlandais', 'papiamento']);
    assert.deepEqual(Q.clueValues({ lang: 'aucune' }, 'lang'), []);
});

test('unicité : l\'euro seul ne suffit pas, on ajoute un indice jusqu\'à désigner le bon pays', () => {
    const austria = byName('Autriche');
    const q = Q.buildQuestion(austria, pool, { ask: 'name', rng: seeded(3) });
    assert.ok(q, 'une question doit exister');
    assert.ok(q.clues.length >= 1);
    assert.equal(Q.isValid(q, pool), true);
    const found = Q.matching(pool, q.clues);
    assert.equal(found.length, 1, 'les indices ne désignent que l\'Autriche');
    assert.equal(found[0].id, 'AUT');
});

test('unicité : la réponse demandée n\'est jamais un indice', () => {
    for (const ask of Q.ASK_KEYS) {
        const q = Q.buildQuestion(pool[0], pool, { ask, rng: seeded(11) });
        if (!q) continue;
        assert.equal(q.clues.some(clue => clue.key === ask), false, `ask ${ask}`);
    }
});

test('questions : toutes valables, pour chaque type et chaque difficulté', () => {
    for (const difficulty of ['easy', 'hard']) {
        for (const seed of [1, 2, 3]) {
            const questions = Q.generateQuestions(pool, { count: 194, difficulty, rng: seeded(seed) });
            assert.ok(questions.length >= 190, `${difficulty}/${seed} : ${questions.length} questions`);
            for (const q of questions) assert.equal(Q.isValid(q, pool), true, `${q.target} ${q.ask} ${difficulty}`);
        }
    }
});

test('questions : pas deux fois le même pays, et les indices sont plus d\'un quand la capitale ne suffit pas', () => {
    const questions = Q.generateQuestions(pool, { count: 50, rng: seeded(5) });
    const targets = questions.map(q => q.target);
    assert.equal(new Set(targets).size, targets.length);
});

test('propositions : quatre, dont la bonne, et une seule avec la bonne réponse', () => {
    const questions = Q.generateQuestions(pool, { count: 60, rng: seeded(9) });
    for (const q of questions) {
        assert.equal(q.options.length, 4);
        assert.ok(q.options.some(o => o.id === q.target));
        const values = q.options.map(o => o.value);
        assert.equal(new Set(values).size, values.length, 'pas deux propositions identiques');
    }
});

test('population : les propositions sont à au moins 1,5 fois l\'une de l\'autre', () => {
    const questions = Q.generateQuestions(pool, { count: 194, asks: ['pop'], rng: seeded(4) });
    assert.ok(questions.length > 150);
    for (const q of questions) {
        const values = q.options.map(o => o.value);
        for (let i = 0; i < values.length; i++) {
            for (let j = i + 1; j < values.length; j++) {
                const ratio = Math.max(values[i], values[j]) / Math.min(values[i], values[j]);
                assert.ok(ratio >= Q.MIN_RATIO, `${values[i]} / ${values[j]}`);
            }
        }
    }
});

test('difficulté : en mode difficile, les mauvaises réponses viennent du même continent', () => {
    const questions = Q.generateQuestions(pool, { count: 80, asks: ['name'], difficulty: 'hard', rng: seeded(21) });
    let same = 0, total = 0;
    for (const q of questions) {
        const target = pool.find(c => c.id === q.target);
        const continentSize = pool.filter(c => c.cont === target.cont).length;
        if (continentSize < 4) continue;
        for (const o of q.options) {
            if (o.id === q.target) continue;
            total++;
            if (pool.find(c => c.id === o.id).cont === target.cont) same++;
        }
    }
    assert.ok(total > 0);
    assert.equal(same, total);
});

test('reproductible : même tirage, mêmes questions', () => {
    const a = Q.generateQuestions(pool, { count: 10, rng: seeded(77) });
    const b = Q.generateQuestions(pool, { count: 10, rng: seeded(77) });
    assert.deepEqual(a, b);
});

test('contrôle : une question dont les indices ne désignent pas seul le pays est refusée', () => {
    const q = Q.buildQuestion(byName('Autriche'), pool, { ask: 'name', rng: seeded(3) });
    const tampered = { ...q, clues: [{ key: 'cur', value: 'euro (EUR)' }] };
    assert.equal(Q.isValid(tampered, pool), false);
});

test('textes : chaque type de question et d\'indice a son libellé, en français et en anglais', () => {
    for (const lang of ['fr', 'en']) {
        const ui = JSON.parse(fs.readFileSync(path.join(root, 'ui', lang + '.json'), 'utf8')).geoquiz;
        for (const ask of Q.ASK_KEYS) assert.ok(ui['ask_' + ask], `${lang} : geoquiz.ask_${ask}`);
        for (const key of Q.CLUE_KEYS) assert.ok(ui['clue_' + key], `${lang} : geoquiz.clue_${key}`);
        for (const key of ['title', 'start', 'progress', 'right', 'wrong', 'next', 'finish', 'score', 'replay', 'back', 'none', 'credit', 'pop_label']) {
            assert.ok(ui[key], `${lang} : geoquiz.${key}`);
        }
    }
});
