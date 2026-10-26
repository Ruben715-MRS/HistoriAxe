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
        for (const key of ['title', 'start', 'progress', 'right', 'wrong', 'next', 'finish', 'score', 'replay', 'back', 'none', 'credit', 'pop_label', 'map_label', 'locate_ask', 'locate_right', 'locate_wrong', 'menu_intro', 'menu_qcm', 'menu_flag', 'menu_map', 'menu_mix', 'arcade_desc', 'clue_flag']) {
            assert.ok(ui[key], `${lang} : geoquiz.${key}`);
        }
    }
});

test('distance : Paris → Lyon, environ 390 km ; zéro pour le même point', () => {
    const d = Q.distanceKm([2.35, 48.85], [4.83, 45.76]);
    assert.ok(Math.abs(d - 392) < 5, `distance ${d}`);
    assert.equal(Q.distanceKm([10, 10], [10, 10]), 0);
});

test('touche le pays : un pays de taille normale compte s\'il est touché à l\'intérieur, pas à côté', () => {
    assert.equal(Q.locateCorrect({ inside: true, tiny: false, distanceKm: 900 }), true);
    assert.equal(Q.locateCorrect({ inside: false, tiny: false, distanceKm: 5 }), false);
});

test('touche le pays : un pays trop petit compte dans un rayon de LOCATE_TINY_KM', () => {
    assert.equal(Q.locateCorrect({ inside: false, tiny: true, distanceKm: Q.LOCATE_TINY_KM - 1 }), true);
    assert.equal(Q.locateCorrect({ inside: false, tiny: true, distanceKm: Q.LOCATE_TINY_KM + 1 }), false);
});

test('touche le pays : questions sans options, un pays chacune, distinctes', () => {
    const qs = Q.generateLocateQuestions(pool, { count: 10, rng: seeded(13) });
    assert.equal(qs.length, 10);
    assert.equal(new Set(qs.map(q => q.target)).size, 10);
    for (const q of qs) {
        assert.equal(q.ask, 'locate');
        assert.deepEqual(q.options, []);
        assert.equal(q.clues[0].value, pool.find(c => c.id === q.target).n);
    }
});

test('drapeau : un indice emoji, et le mode drapeau ne donne que cet indice', () => {
    assert.deepEqual(Q.clueValues({ iso2: 'FR' }, 'flag'), ['🇫🇷']);
    assert.deepEqual(Q.clueValues({ iso2: '' }, 'flag'), []);
    const qs = Q.generateQuestions(pool, { count: 60, asks: ['name'], clues: ['flag'], rng: seeded(31) });
    assert.ok(qs.length >= 55, `${qs.length} questions`);
    for (const q of qs) {
        assert.deepEqual(q.clues.map(c => c.key), ['flag']);
        assert.equal(Q.isValid(q, pool), true);
    }
});

test('indices restreints : le quiz général n\'utilise jamais le drapeau', () => {
    const qs = Q.generateQuestions(pool, { count: 100, rng: seeded(8) });
    for (const q of qs) assert.equal(q.clues.some(c => c.key === 'flag'), false);
});

// --- Les nouveaux modes : carte → nom, fêtes, qui suis-je, saisie libre, pays mystère -------------

const allPool = Q.playablePool(facts, { includeSpecial: true }).filter(c => c.id !== 'PSX');

test('réponses acceptées : chaque capitale citée, sans les précisions entre parenthèses', () => {
    assert.deepEqual(Q.acceptedAnswers('Pretoria (exécutive) ; Le Cap (législative) ; Bloemfontein (judiciaire)', 'cap'), ['Pretoria', 'Le Cap', 'Bloemfontein']);
    assert.deepEqual(Q.acceptedAnswers('Washington (D.C.)', 'cap'), ['Washington']);
    assert.deepEqual(Q.acceptedAnswers('Côte d\'Ivoire', 'name'), ['Côte d\'Ivoire']);
    assert.deepEqual(Q.acceptedAnswers('Birmanie (Myanmar)', 'name'), ['Birmanie', 'Myanmar'], 'le nom entre parenthèses est un autre nom du pays');
    assert.deepEqual(Q.acceptedAnswers('Yamoussoukro (capitale économique : Abidjan)', 'cap'), ['Yamoussoukro'], 'une note n\'est pas une capitale');
});

test('saisie : accents, majuscules, tirets, apostrophes, article au début et fautes de frappe légères sont tolérés', () => {
    const ok = (input, answers) => Q.isTypedCorrect(input, Array.isArray(answers) ? answers : [answers]);
    assert.equal(ok('etats unis', 'États-Unis'), true);
    assert.equal(ok('ETATS-UNIS', 'États-Unis'), true);
    assert.equal(ok('cote divoire', 'Côte d\'Ivoire'), true);
    assert.equal(ok('Côte d’Ivoire', 'Côte d\'Ivoire'), true);
    assert.equal(ok('Gambie', 'la Gambie'), true);
    assert.equal(ok('Ouagadougou', 'Ouagadougou'), true);
    assert.equal(ok('Ouagadougo', 'Ouagadougou'), true, 'une lettre de moins sur un long mot');
    assert.equal(ok('Myanmar', ['Birmanie', 'Myanmar']), true);
    assert.equal(ok('Le Cap', ['Pretoria', 'Le Cap']), true);
    assert.equal(ok('', 'Paris'), false);
    assert.equal(ok('Lyon', 'Paris'), false);
    assert.equal(ok('Limo', 'Lima'), false, 'pas de tolérance sur un mot de moins de 5 lettres');
    assert.equal(ok('Pari', 'Paris'), true, 'une lettre de moins sur un mot de 5 lettres');
});

test('saisie : jamais assez de tolérance pour passer d\'un pays à un autre (Niger / Nigeria, Mali / Malawi, Iran / Irak)', () => {
    const ok = (input, answer, others) => Q.isTypedCorrect(input, [answer], others);
    assert.equal(ok('Niger', 'Nigeria'), false);
    assert.equal(ok('Nigeria', 'Niger'), false);
    assert.equal(ok('Mali', 'Malawi'), false);
    assert.equal(ok('Iran', 'Irak'), false);
    assert.equal(ok('Oman', 'Romain'), false);
    // Une saisie qui est exactement la réponse d'un autre pays est refusée, même à une lettre de la bonne.
    assert.equal(ok('Zambie', 'Gambie'), true, 'sans autre pays connu, une lettre de différence est tolérée');
    assert.equal(ok('Zambie', 'Gambie', ['Zambie', 'Gambie']), false);
    assert.equal(ok('Gambia', 'Gambie', ['Zambie']), true, 'une faute plus proche de la bonne réponse que de l\'autre');
    assert.equal(ok('Kingston', 'Kingstown', ['Kingston']), false);
    assert.equal(ok('Kingstown', 'Kingston', ['Kingstown']), false);
    // Contrôle sur tout le jeu de données : la réponse d'un pays n'est jamais acceptée pour un autre, sauf si les deux s'écrivent pareil
    // (George Town et Georgetown).
    const clash = [];
    for (const ask of ['name', 'cap']) {
        const banks = allPool.map(c => ({ id: c.id, list: Q.acceptedAnswers(Q.answerOf(c, ask), ask) }));
        const everyone = banks.flatMap(b => b.list.map(a => ({ id: b.id, answer: a })));
        for (const b of banks) {
            const others = everyone.filter(e => e.id !== b.id).map(e => e.answer);
            for (const a of banks) {
                if (a.id === b.id) continue;
                const sameSpelling = a.list.some(x => b.list.some(y => Q.compact(x) === Q.compact(y)));
                if (sameSpelling) continue;
                if (a.list.some(x => Q.isTypedCorrect(x, b.list, others))) clash.push(`${ask} : ${a.id} accepté pour ${b.id}`);
            }
        }
    }
    assert.deepEqual(clash, []);
});

test('saisie libre : chaque question a des indices non ambigus, aucune proposition, et les réponses acceptées du pays', () => {
    const questions = Q.generateTypedQuestions(allPool, { count: 80, rng: seeded(21) });
    assert.ok(questions.length >= 60, 'au moins 60 questions sur 80 : ' + questions.length);
    assert.equal(new Set(questions.map(q => q.target)).size, questions.length);
    questions.forEach(q => {
        assert.ok(['cap', 'name'].includes(q.ask));
        assert.deepEqual(q.options, []);
        assert.ok(q.answers.length >= 1);
        assert.equal(Q.isTypedCorrect(q.answers[0], q.answers), true);
        const answer = Q.answerOf(allPool.find(c => c.id === q.target), q.ask);
        assert.equal(answer, q.answer);
        assert.ok(Q.isUnambiguous(allPool, q.clues, q.ask, answer), `${q.target} : indices ambigus`);
    });
});

test('carte → nom : quatre noms distincts dont le pays montré, sans indice écrit', () => {
    const questions = Q.generateMapNameQuestions(allPool, { count: 40, rng: seeded(5), difficulty: 'hard' });
    assert.equal(questions.length, 40);
    questions.forEach(q => {
        assert.deepEqual(q.clues, []);
        assert.equal(q.options.length, 4);
        assert.equal(new Set(q.options.map(o => o.value)).size, 4);
        assert.equal(q.options.filter(o => o.id === q.target).length, 1);
        const target = allPool.find(c => c.id === q.target);
        assert.equal(q.options.find(o => o.id === q.target).value, target.n);
    });
});

test('fêtes nationales : la fête désigne le pays (ou le pays sa fête), jamais en nommant le pays', () => {
    const questions = Q.generateFeteQuestions(allPool, { count: 60, rng: seeded(33) });
    assert.ok(questions.length >= 50, 'au moins 50 questions sur 60 : ' + questions.length);
    const asks = new Set(questions.map(q => q.ask));
    assert.ok(asks.has('name') && asks.has('fete'), 'les deux sens : ' + [...asks]);
    questions.forEach(q => {
        assert.ok(Q.isValid(q, allPool), `${q.target} : question non valable`);
        if (q.ask === 'name') assert.equal(q.clues[0].key, 'fete', 'la fête vient en premier');
        else assert.deepEqual(q.clues.map(c => c.key), ['name']);
        const text = JSON.stringify(q.clues.concat(q.options.map(o => o.value))).toLowerCase();
        assert.ok(text.length > 0);
    });
});

test('qui suis-je : des indices dans l\'ordre, qui désignent le pays sans ambiguïté, et quatre pays à choisir', () => {
    const questions = Q.generateWhoQuestions(allPool, { count: 40, rng: seeded(8) });
    assert.ok(questions.length >= 35, 'au moins 35 questions sur 40 : ' + questions.length);
    questions.forEach(q => {
        assert.ok(q.clues.length >= 4 && q.clues.length <= Q.WHO_KEYS.length);
        const order = q.clues.map(c => Q.WHO_KEYS.indexOf(c.key));
        assert.deepEqual(order, order.slice().sort((a, b) => a - b), 'ordre des indices');
        assert.equal(q.clues[0].key, 'cont', 'le plus vague d\'abord');
        assert.ok(Q.isValid(q, allPool), `${q.target} : question non valable`);
        assert.equal(q.options.length, 4);
    });
});

test('pays mystère : distance, direction et proximité', () => {
    const paris = byName('France'), madrid = byName('Espagne'), lyonish = { id: 'X', c: [4.83, 45.76] };
    assert.equal(Q.arrowOf(0), '⬆️');
    assert.equal(Q.arrowOf(90), '➡️');
    assert.equal(Q.arrowOf(180), '⬇️');
    assert.equal(Q.arrowOf(270), '⬅️');
    assert.equal(Q.arrowOf(359), '⬆️');
    assert.equal(Q.arrowOf(46), '↗️');
    assert.equal(Q.proximity(0), 100);
    assert.equal(Q.proximity(20000), 0);
    assert.equal(Q.proximity(50000), 0, 'jamais négatif');
    assert.equal(Q.proximity(10000), 50);
    assert.equal(Q.mysteryGuess(paris, paris).correct, true);
    assert.equal(Q.mysteryGuess(paris, paris).arrow, '🎯');
    // De l'Espagne vers la France : au nord (un peu à l'est).
    const g = Q.mysteryGuess(paris, madrid);
    assert.equal(g.correct, false);
    assert.ok(g.km > 800 && g.km < 1500, 'km : ' + g.km);
    assert.ok(['⬆️', '↗️'].includes(g.arrow), 'direction : ' + g.arrow);
    assert.ok(Math.abs(Q.bearingDeg([2.35, 48.85], [2.35, 50]) - 0) < 1);
    assert.ok(Math.abs(Q.bearingDeg([0, 0], [10, 0]) - 90) < 1);
    assert.equal(Q.MYSTERY_TRIES, 6);
    assert.equal(Q.generateMysteryQuestions(allPool, { count: 7, rng: seeded(1) }).length, 7);
    assert.ok(lyonish.id);
});

test('qui suis-je ? : le premier indice montré sépare toujours des propositions (pas de région commune aux quatre)', () => {
    const qs = Q.generateWhoQuestions(pool, { count: 80, difficulty: 'hard', rng: seeded(17) });
    assert.ok(qs.length >= 40, `${qs.length} questions`);
    for (const q of qs) {
        const choices = q.options.map(o => pool.find(c => c.id === o.id));
        const first = q.clues[0];
        const separates = choices.some(c => Q.clueValues(c, first.key).indexOf(first.value) === -1);
        assert.ok(separates, `${q.target} : le premier indice (${first.key} : ${first.value}) ne sépare aucune proposition`);
        assert.equal(Q.isValid({ ...q, ask: 'name' }, pool), true, `${q.target} valable`);
    }
});
