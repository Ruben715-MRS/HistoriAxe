// Mini-jeux du cours (js/minigamesCore.js) : siècles en chiffres romains et calendrier de l'Avent historique. Pur, sans navigateur.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../js/minigamesCore.js');
const A = require('../js/adventContent.js');

const root = path.resolve(__dirname, '..');
const ui = JSON.parse(fs.readFileSync(path.join(root, 'ui', 'fr.json'), 'utf8'));

function seeded(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// --- Chiffres romains et siècles ---------------------------------------------------------------------------
test('chiffres romains : lecture et écriture, dont la soustraction (IX, XIV, XL, MCMXCIV)', () => {
    [[4, 'IV'], [9, 'IX'], [14, 'XIV'], [19, 'XIX'], [24, 'XXIV'], [40, 'XL'], [44, 'XLIV'], [1994, 'MCMXCIV'], [2026, 'MMXXVI']].forEach(([n, r]) => {
        assert.equal(M.toRoman(n), r);
        assert.equal(M.fromRoman(r), n);
    });
});

test('siècles : 1900 et 2000 sont les derniers de leur siècle, 1789 est du XVIIIe, 1 à 100 forment le Ier', () => {
    const name = (y) => M.centuryName(M.centuryOf(y));
    assert.equal(name(1789), 'XVIIIe siècle');
    assert.equal(name(1900), 'XIXe siècle');
    assert.equal(name(1901), 'XXe siècle');
    assert.equal(name(2000), 'XXe siècle');
    assert.equal(name(2001), 'XXIe siècle');
    assert.equal(name(1), 'Ier siècle');
    assert.equal(name(100), 'Ier siècle');
    assert.equal(name(101), 'IIe siècle');
    assert.equal(name(476), 'Ve siècle');
    assert.equal(name(1000), 'Xe siècle');
});

test('siècles avant J.-C. : 44 av. J.-C. et 100 av. J.-C. sont du Ier ; 753 av. J.-C. du VIIIe ; on compte à rebours', () => {
    const name = (y) => M.centuryName(M.centuryOf(y));
    assert.equal(name(-44), 'Ier siècle av. J.-C.');
    assert.equal(name(-1), 'Ier siècle av. J.-C.');
    assert.equal(name(-100), 'Ier siècle av. J.-C.');
    assert.equal(name(-101), 'IIe siècle av. J.-C.');
    assert.equal(name(-753), 'VIIIe siècle av. J.-C.');
    assert.equal(M.centurySpan({ n: 18, bc: false }), '1701 à 1800');
    assert.equal(M.centurySpan({ n: 3, bc: true }), '300 à 201 av. J.-C.');
    assert.equal(M.centurySpan({ n: 1, bc: true }), '100 à 1 av. J.-C.');
    // Le Ve siècle av. J.-C. précède le IVe, et tous précèdent le Ier siècle de notre ère.
    assert.ok(M.centuryRank({ n: 5, bc: true }) < M.centuryRank({ n: 4, bc: true }));
    assert.ok(M.centuryRank({ n: 1, bc: true }) < M.centuryRank({ n: 1, bc: false }));
});

test('une partie : dix questions, quatre sortes, jamais de doublon, une seule bonne réponse parmi quatre options distinctes', () => {
    for (let seed = 1; seed <= 25; seed++) {
        const g = M.createRoman(seeded(seed));
        assert.equal(g.questions.length, 10, `graine ${seed}`);
        assert.deepEqual(g.questions.map((q) => q.type), M.ROMAN_PLAN);
        g.questions.forEach((q) => {
            if (q.type === 'order') {
                assert.equal(q.items.length, 4);
                assert.equal(new Set(q.items.map((i) => i.name)).size, 4);
                return;
            }
            assert.equal(q.options.length, 4, `${q.type}`);
            assert.equal(new Set(q.options).size, 4, `${q.type} : options distinctes`);
            assert.ok(q.answer >= 0 && q.answer < 4);
            assert.ok(q.explain.length > 20);
        });
    }
});

test('les réponses sont justes : chaque question à choix a pour bonne option la vraie valeur', () => {
    for (let seed = 1; seed <= 40; seed++) {
        M.createRoman(seeded(seed)).questions.forEach((q) => {
            if (q.type === 'numeral') assert.equal(Number(q.options[q.answer]), M.fromRoman(q.roman));
            if (q.type === 'which') assert.equal(q.options[q.answer], M.centuryName(M.centuryOf(q.year)));
            if (q.type === 'span') {
                const label = q.label;
                const n = M.fromRoman(label.split(/e|er/)[0]);
                const bc = /av\. J\.-C\./.test(label);
                assert.equal(q.options[q.answer], M.centurySpan({ n, bc }), label);
            }
        });
    }
});

test('le piège classique est proposé : XVIIIe siècle = 1701 à 1800, jamais seul avec 1700 à 1799 écarté', () => {
    let seen = false;
    for (let seed = 1; seed <= 200 && !seen; seed++) {
        M.createRoman(seeded(seed)).questions.filter((q) => q.type === 'span' && q.label === 'XVIIIe siècle').forEach((q) => {
            assert.equal(q.options[q.answer], '1701 à 1800');
            assert.ok(q.options.includes('1700 à 1799'), 'le décalage d\'une année est dans les options');
            seen = true;
        });
    }
    assert.ok(seen);
});

test('choix : 100 points pour une bonne réponse, une question résolue ne se rejoue pas', () => {
    const g = M.createRoman(seeded(3));
    const q = M.romanQuestion(g);
    assert.deepEqual(M.romanAnswer(g, 9), [], 'option inexistante');
    assert.deepEqual(M.romanAnswer(g, q.answer), ['right']);
    assert.equal(g.score, 100);
    assert.deepEqual(M.romanAnswer(g, q.answer), []);
    assert.deepEqual(M.romanNext(g), ['next']);
    const q2 = M.romanQuestion(g);
    assert.deepEqual(M.romanAnswer(g, (q2.answer + 1) % 4), ['wrong']);
    assert.equal(g.score, 100);
});

test('ordre : on touche les siècles du plus ancien au plus récent ; une erreur coûte 25 points', () => {
    const g = M.createRoman(seeded(5));
    while (M.romanQuestion(g).type !== 'order') {
        const q = M.romanQuestion(g);
        M.romanAnswer(g, q.answer);
        M.romanNext(g);
    }
    const q = M.romanQuestion(g);
    assert.deepEqual(M.romanAnswer(g, 0), [], 'une question d\'ordre ne se répond pas par choix');
    // Le mauvais d'abord : le dernier de l'ordre attendu.
    const wrongFirst = q.order[q.order.length - 1];
    assert.deepEqual(M.romanTap(g, wrongFirst), ['miss']);
    assert.equal(g.errors, 1);
    let last = [];
    q.order.forEach((item) => { last = M.romanTap(g, item); });
    assert.deepEqual(last, ['ok', 'done']);
    assert.equal(g.resolved, 'wrong');
    assert.equal(g.results[g.results.length - 1].points, 75);
    assert.deepEqual(M.romanTap(g, 0), []);
    // Parfait : 100.
    M.romanNext(g);
    while (M.romanQuestion(g).type !== 'order') { const x = M.romanQuestion(g); M.romanAnswer(g, x.answer); M.romanNext(g); }
    const q2 = M.romanQuestion(g);
    q2.order.forEach((item) => M.romanTap(g, item));
    assert.equal(g.results[g.results.length - 1].points, 100);
    assert.equal(g.resolved, 'right');
});

test('ordre : avant J.-C., le siècle le plus grand est le plus ancien', () => {
    for (let seed = 1; seed <= 60; seed++) {
        M.createRoman(seeded(seed)).questions.filter((q) => q.type === 'order').forEach((q) => {
            const ranks = q.order.map((i) => q.items[i].rank);
            assert.deepEqual(ranks, ranks.slice().sort((a, b) => a - b));
            assert.ok(q.items.some((i) => i.rank < 0), 'au moins un siècle avant J.-C. : c\'est là qu\'on se trompe');
        });
    }
});

test('dix bonnes réponses : 1000 points, la partie se termine', () => {
    const g = M.createRoman(seeded(11));
    let last = [];
    while (!g.over) {
        const q = M.romanQuestion(g);
        if (q.type === 'order') q.order.forEach((i) => M.romanTap(g, i));
        else M.romanAnswer(g, q.answer);
        last = M.romanNext(g);
    }
    assert.deepEqual(last, ['done']);
    assert.equal(g.score, 1000);
    assert.equal(g.found, 10);
    assert.deepEqual(M.romanNext(g), []);
});

// --- Calendrier de l'Avent ---------------------------------------------------------------------------------
test('Avent : une case par jour de décembre, un titre qui ne donne pas l\'année, une explication qui la dit', () => {
    assert.equal(A.DAYS.length, 31);
    A.DAYS.forEach((d, i) => {
        assert.equal(d.day, i + 1);
        assert.ok(d.icon && d.title && d.explain.length > 40, String(d.day));
        assert.ok(Number.isInteger(d.year) && d.year > 0 && d.year <= 2026, String(d.day));
        assert.ok(!d.title.includes(String(d.year)), `${d.day} : le titre donne l'année`);
        assert.ok(d.explain.includes(String(d.year)) || d.day === 25, `${d.day} : l'explication cite l'année ${d.year}`);
    });
    assert.equal(new Set(A.DAYS.map((d) => d.icon)).size, 31, 'un emoji par jour : c\'est lui que l\'on voit sur le menu');
    assert.equal(new Set(A.DAYS.map((d) => d.title)).size, 31);
});

test('Avent : le jour de décembre, et l\'ouverture des cases (en décembre jour après jour, sinon toutes)', () => {
    assert.equal(M.adventToday(new Date(2026, 11, 12)), 12);
    assert.equal(M.adventToday(new Date(2026, 10, 30)), null);
    assert.equal(M.adventToday(new Date(2027, 0, 1)), null);
    const dec12 = new Date(2026, 11, 12);
    assert.ok(M.adventOpen(1, dec12) && M.adventOpen(12, dec12));
    assert.ok(!M.adventOpen(13, dec12) && !M.adventOpen(31, dec12));
    const july = new Date(2026, 6, 4);
    assert.ok(M.adventOpen(1, july) && M.adventOpen(31, july), 'hors décembre, tout est ouvert');
    assert.ok(M.adventOpen(31, new Date(2026, 11, 31)));
});

test('Avent : quatre années distinctes dont la bonne, toujours les mêmes pour une case, aucune dans le futur', () => {
    for (let day = 1; day <= 31; day++) {
        const q = M.adventQuestion(day, 2026);
        assert.equal(q.options.length, 4, `case ${day}`);
        assert.equal(new Set(q.options).size, 4, `case ${day}`);
        assert.ok(q.options.includes(q.answer));
        assert.equal(q.answer, A.DAYS[day - 1].year);
        q.options.forEach((y) => assert.ok(y > 0 && y <= 2026, `case ${day} : ${y}`));
        assert.deepEqual(M.adventQuestion(day, 2026).options, q.options, 'stable d\'une ouverture à l\'autre');
    }
});

test('Avent : la progression garde la première réponse, par année civile', () => {
    let p = M.adventRecord(null, 2026, 12, true);
    p = M.adventRecord(p, 2026, 13, false);
    p = M.adventRecord(p, 2026, 12, false);
    assert.deepEqual(M.adventCounts(p, 2026), { opened: 2, right: 1 });
    assert.deepEqual(M.adventCounts(p, 2027), { opened: 0, right: 0 });
    p = M.adventRecord(p, 2027, 1, true);
    assert.deepEqual(M.adventCounts(p, 2027), { opened: 1, right: 1 });
    assert.deepEqual(M.normalizeAdvent('n\'importe quoi'), {});
    assert.deepEqual(M.normalizeAdvent({ abc: { 1: true }, 2026: { 0: true, 32: true, 5: 'oui', 6: false } }), { 2026: { 6: false } });
});

test('textes, scripts et écrans des mini-jeux', () => {
    const need = {
        roman: ['title', 'desc', 'entry', 'status', 'ask_numeral', 'ask_span', 'ask_which', 'ask_order', 'right', 'wrong', 'order_done', 'order_errors', 'order_miss', 'next', 'finish', 'found'],
        advent: ['title', 'desc', 'grid_aria', 'rule_december', 'rule_practice', 'status', 'case_title', 'question', 'locked', 'right', 'wrong', 'answer', 'closed', 'home_kicker', 'home_countdown', 'home_christmas', 'home_after', 'home_open', 'home_done']
    };
    Object.keys(need).forEach((g) => need[g].forEach((k) => assert.ok(ui[g] && ui[g][k], `${g}.${k}`)));
    assert.ok(ui.arcade.advent_progress);
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    ['js/adventContent.js', 'js/minigamesCore.js', 'js/app/minigames.js'].forEach((f) => {
        assert.ok(html.includes(`<script src="${f}">`), f + ' dans index.html');
        assert.ok(sw.includes(`'./${f}'`), f + ' dans sw.js');
    });
    ['screen-roman', 'screen-advent'].forEach((id) => assert.ok(html.includes(`id="${id}"`), id));
});
