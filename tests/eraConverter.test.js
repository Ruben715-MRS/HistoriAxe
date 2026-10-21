// Le convertisseur d'ères (js/eraConverter.js) : règles de conversion, tirage, étoiles. Pur, sans navigateur.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../js/eraConverter.js');

const root = path.resolve(__dirname, '..');
const uiFr = JSON.parse(fs.readFileSync(path.join(root, 'ui', 'fr.json'), 'utf8'));
const ans = (id, g) => E.find(id).answers(g);

test('les règles de conversion, sur des années que l\'on peut vérifier', () => {
    assert.deepEqual(ans('juive', 1948), [5708, 5709]);
    assert.ok(ans('juive', 2026).includes(5786) || ans('juive', 2026).includes(5787));
    assert.ok(ans('hegire', 1789).includes(1203));
    assert.ok(ans('hegire', 1492).includes(897));
    assert.ok(ans('hegire', 2026).includes(1447));
    assert.deepEqual(ans('republicaine', 1794), [2, 3], 'le 9 thermidor est de l\'an II');
    assert.ok(ans('republicaine', 1799).includes(8), 'le 18 brumaire est de l\'an VIII');
    assert.deepEqual(ans('rome', 476), [1229]);
    assert.deepEqual(ans('rome', -44), [710]);
    assert.deepEqual(ans('rome', -27), [727], 'Octave devient Auguste en 727 de Rome');
    assert.deepEqual(ans('bouddhique', 2026), [2569]);
    assert.deepEqual(ans('persane', 1979), [1357, 1358]);
    assert.deepEqual(ans('showa', 1964), [39]);
    assert.deepEqual(ans('heisei', 1995), [7]);
    assert.deepEqual(ans('reiwa', 2024), [6]);
    assert.deepEqual(ans('meiji', 1904), [37]);
    assert.deepEqual(ans('taisho', 1923), [12]);
});

test('chaque ère est complète, et chaque réponse est dans les bornes de sa règle', () => {
    E.ERAS.forEach((era) => {
        assert.ok(era.name && era.icon && era.rule && era.items.length >= 1, era.id);
        assert.ok(era.min < era.max && era.start >= era.min && era.start <= era.max, `${era.id} : départ dans les bornes`);
        era.items.forEach((item) => {
            assert.ok(item.label, era.id);
            era.answers(item.g).forEach((a) => assert.ok(a >= era.min && a <= era.max, `${era.id} ${item.g} : ${a} hors bornes`));
        });
    });
    assert.equal(new Set(E.ERAS.map((e) => e.id)).size, E.ERAS.length);
});

test('les années de changement d\'ère japonaises ne sont jamais demandées (elles appartiennent à deux ères)', () => {
    ['meiji', 'taisho', 'showa', 'heisei', 'reiwa'].forEach((id) => {
        E.find(id).items.forEach((item) => assert.ok(![1868, 1912, 1926, 1989, 2019].includes(item.g), `${id} ${item.g}`));
    });
});

test('accepts et answerText', () => {
    const hegire = E.find('hegire');
    assert.ok(E.accepts(hegire, 1789, 1203));
    assert.ok(E.accepts(hegire, 1789, 1204));
    assert.ok(!E.accepts(hegire, 1789, 1210));
    assert.equal(E.answerText(E.find('showa'), 1964), '39');
    assert.equal(E.answerText(E.find('juive'), 1948), '5708 ou 5709');
    assert.equal(E.answerText(hegire, 1789), 'de 1202 à 1204');
    assert.equal(E.gregorianText(-44), '44 av. J.-C.');
    assert.equal(E.gregorianText(1789), '1789');
});

test('deal : huit questions, deux par ère au plus, jamais deux fois la même', () => {
    for (let i = 0; i < 20; i++) {
        const qs = E.deal();
        assert.equal(qs.length, E.QUESTIONS_PER_GAME);
        const per = {};
        qs.forEach((q) => { per[q.era] = (per[q.era] || 0) + 1; });
        assert.ok(Object.values(per).every((n) => n <= 2));
        assert.equal(new Set(qs.map((q) => q.era + q.g)).size, qs.length);
    }
});

test('étoiles et meilleur résultat', () => {
    assert.equal(E.starsFor(0), 3);
    assert.equal(E.starsFor(1), 3);
    assert.equal(E.starsFor(3), 2);
    assert.equal(E.starsFor(4), 1);
    let p = E.recordResult(null, 5);
    assert.deepEqual(p, { stars: 1, errors: 5 });
    p = E.recordResult(p, 2);
    assert.deepEqual(p, { stars: 2, errors: 2 });
    assert.deepEqual(E.recordResult(p, 7), p);
    assert.equal(E.normalizeProgress('x'), null);
});

test('l\'interface des trois jeux a ses textes dans ui/fr.json', () => {
    const need = {
        arcade: ['title', 'subtitle', 'card_kicker', 'best', 'no_best', 'play', 'replay', 'over', 'empty'],
        snake: ['title', 'desc', 'entry', 'rule', 'status', 'over_text', 'mistake'],
        tetris: ['title', 'desc', 'entry', 'status', 'banner', 'over_text', 'mistake'],
        pacman: ['title', 'desc', 'status', 'banner', 'wrong', 'ok', 'caught', 'over_text', 'mistake'],
        invaders: ['title', 'desc', 'fire', 'hint', 'status', 'banner', 'hit', 'friendly', 'breach', 'saved', 'round', 'over_text', 'mistake'],
        eras: ['title', 'entry', 'status', 'question', 'right', 'wrong', 'answer_right', 'answer_wrong', 'next', 'finish', 'done']
    };
    Object.keys(need).forEach((group) => need[group].forEach((k) => assert.ok(uiFr[group] && uiFr[group][k], `${group}.${k}`)));
});

test('les jeux sont branchés : scripts dans index.html et dans le service worker', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    ['js/eraConverter.js', 'js/arcadeCore.js', 'js/app/eras.js', 'js/app/arcade.js'].forEach((f) => {
        assert.ok(html.includes(`<script src="${f}">`), f + ' dans index.html');
        assert.ok(sw.includes(`'./${f}'`), f + ' dans sw.js');
    });
    ['screen-arcade', 'screen-snake', 'screen-tetris', 'screen-pacman', 'screen-invaders', 'screen-eras', 'path-sheet-game'].forEach((id) => assert.ok(html.includes(`id="${id}"`), id));
});
