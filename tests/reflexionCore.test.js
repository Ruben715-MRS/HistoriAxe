// Jeux de réflexion (js/reflexionCore.js) : Memory chronologique et « Qui suis-je ? ». Pur, sans navigateur.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../js/reflexionCore.js');
const G = require('../js/gameModes.js');

const root = path.resolve(__dirname, '..');
const fr = JSON.parse(fs.readFileSync(path.join(root, 'data', 'fr.json'), 'utf8'));

function seeded(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function pool() {
    const years = [-3000, -800, -500, -100, 100, 300, 700, 1000, 1200, 1300, 1600, 1648, 1700, 1750, 1815, 1848, 1870, 1900, 1918, 1945, 1969, 1989, 2001, 2020];
    return years.map((date, i) => ({ id: 'e' + i, title: 'Événement ' + i, date }));
}

// --- Memory ------------------------------------------------------------------------------------------
test('Memory : douze cartes, six événements aux années différentes, chacun une fois en titre et une fois en date', () => {
    const g = R.createMemory(pool(), seeded(3));
    assert.equal(g.cards.length, 12);
    assert.equal(g.pairs, 6);
    const byPair = {};
    g.cards.forEach((c) => { (byPair[c.pair] = byPair[c.pair] || []).push(c.side); });
    Object.values(byPair).forEach((sides) => assert.deepEqual(sides.sort(), ['date', 'event']));
    assert.equal(new Set(g.cards.map((c) => c.event.date)).size, 6);
    assert.ok(R.createMemory(pool().slice(0, 4), seeded(1)).empty);
    // L'ordre n'est pas celui de la construction (paires côte à côte) : sinon le jeu serait trivial.
    assert.ok(g.cards.some((c, i) => i % 2 === 0 && g.cards[i + 1].pair !== c.pair));
});

// L'indice des deux cartes d'une paire.
function pairOf(g, pair) {
    return [g.cards.findIndex((c) => c.pair === pair && c.side === 'event'), g.cards.findIndex((c) => c.pair === pair && c.side === 'date')];
}

test('Memory : une paire reste, une erreur recache les cartes et compte', () => {
    const g = R.createMemory(pool(), seeded(5));
    const [e0, d0] = pairOf(g, 0);
    assert.deepEqual(R.memoryFlip(g, e0), ['flip']);
    assert.deepEqual(R.memoryFlip(g, d0), ['match']);
    assert.equal(Object.keys(g.matched).length, 1);
    assert.equal(g.flipped.length, 0);
    assert.equal(g.errors, 0);
    // Une carte d'une paire trouvée ne se retourne plus.
    assert.deepEqual(R.memoryFlip(g, e0), []);

    const [e1] = pairOf(g, 1);
    const [, d2] = pairOf(g, 2);
    R.memoryFlip(g, e1);
    assert.deepEqual(R.memoryFlip(g, d2), ['miss']);
    assert.equal(g.errors, 1);
    assert.equal(g.flipped.length, 2);
    // Tant que les deux cartes ne sont pas recachées, une troisième ne se retourne pas.
    const [e3] = pairOf(g, 3);
    assert.deepEqual(R.memoryFlip(g, e3), []);
    R.memoryHide(g);
    assert.equal(g.flipped.length, 0);
    assert.deepEqual(R.memoryFlip(g, e3), ['flip']);
});

test('Memory : deux événements, ou deux dates, ne font pas une paire ; la même carte deux fois ne compte pas', () => {
    const g = R.createMemory(pool(), seeded(8));
    const events = g.cards.map((c, i) => [c, i]).filter(([c]) => c.side === 'event').map(([, i]) => i);
    R.memoryFlip(g, events[0]);
    assert.deepEqual(R.memoryFlip(g, events[0]), [], 'la même carte');
    assert.deepEqual(R.memoryFlip(g, events[1]), ['miss']);
    assert.equal(g.errors, 1);
});

test('Memory : toutes les paires font gagner ; le score baisse de 25 par erreur', () => {
    const g = R.createMemory(pool(), seeded(9));
    let last = [];
    for (let p = 0; p < 6; p++) { const [e, d] = pairOf(g, p); R.memoryFlip(g, e); last = R.memoryFlip(g, d); }
    assert.deepEqual(last, ['match', 'done']);
    assert.ok(g.over);
    assert.equal(R.memoryScore(g), 600);
    assert.deepEqual(R.memoryFlip(g, 0), []);
    g.errors = 3;
    assert.equal(R.memoryScore(g), 525);
    g.errors = 99;
    assert.equal(R.memoryScore(g), 0);
});

// --- Outils de « Qui suis-je ? » ---------------------------------------------------------------------------
test('centuryLabel : en chiffres romains, « Ier » pour le premier, « av. J.-C. » avant', () => {
    assert.equal(R.centuryLabel(1789), 'XVIIIe siècle');
    assert.equal(R.centuryLabel(1800), 'XVIIIe siècle');
    assert.equal(R.centuryLabel(1801), 'XIXe siècle');
    assert.equal(R.centuryLabel(1), 'Ier siècle');
    assert.equal(R.centuryLabel(100), 'Ier siècle');
    assert.equal(R.centuryLabel(101), 'IIe siècle');
    assert.equal(R.centuryLabel(-44), 'Ier siècle av. J.-C.');
    assert.equal(R.centuryLabel(-753), 'VIIIe siècle av. J.-C.');
});

test('maskName : cache chaque mot du nom, avec ou sans accent, et les particules qui les lient', () => {
    const tokens = R.nameTokens('Édith Piaf');
    assert.equal(R.maskName('Édith Piaf chante. Piaf aussi, et edith.', tokens), '… chante. … aussi, et ….');
    assert.equal(R.maskName("Jeanne d'Arc est brûlée.", R.nameTokens("Jeanne d'Arc")), '… est brûlée.');
    assert.equal(R.maskName('Alphonse Ier du Kongo (vers 1457-1543) est roi du Kongo.', R.nameTokens('Alphonse Ier du Kongo')), '… (…) est roi du ….');
    // Un mot plus long qui contient un mot du nom reste intact.
    assert.equal(R.maskName('Louis XIV, un louisien.', R.nameTokens('Louis XIV')), '…, un louisien.');
    // Le nom de classement compte aussi (« Afrikaner, Jonker »).
    assert.deepEqual(R.nameTokens('Jonker Afrikaner', 'Afrikaner, Jonker'), ['Jonker', 'Afrikaner']);
    // Lettres sans décomposition : Ø, Ł, Đ.
    assert.equal(R.maskName('Orsted et Ørsted.', R.nameTokens('Ørsted')), '… et ….');
    assert.equal(R.maskName('Hans Ørsted', R.nameTokens('Hans')).startsWith('…'), true);
});

test('splitSentences : « av. J.-C. » ne coupe pas une phrase', () => {
    assert.deepEqual(R.splitSentences('Il meurt en 44 av. J.-C. à Rome. Auguste lui succède. Fin.'), ['Il meurt en 44 av. J.-C. à Rome.', 'Auguste lui succède.', 'Fin.']);
    assert.deepEqual(R.splitSentences(''), []);
});

test('buildClues : domaine et pays, siècle, deux phrases masquées, puis le portrait (dernier indice)', () => {
    const evt = {
        axe: 'Chefs d\'État et dirigeants', date: 1457, pays: 'AO', classement: 'Alphonse Ier du Kongo',
        description: "Alphonse Ier du Kongo (vers 1457-1543) est le roi du Kongo de 1509 à sa mort. Il écrit au roi du Portugal en 1526. Troisième phrase."
    };
    const clues = R.buildClues(evt, 'Alphonse Ier du Kongo', () => 'Angola');
    assert.deepEqual(clues.map((c) => c.type), ['domain', 'period', 'text', 'text', 'portrait']);
    assert.deepEqual(clues[0], { type: 'domain', axis: "Chefs d'État et dirigeants", country: 'Angola' });
    assert.equal(clues[1].label, 'XVe siècle');
    assert.ok(!/Alphonse|Kongo/.test(clues.filter((c) => c.type === 'text').map((c) => c.text).join(' ')));
    // Sans pays ni domaine, pas d'indice « domaine » ; une phrase réduite à des « … » est écartée.
    const poor = R.buildClues({ date: 1000, description: 'Hugo Hugo.' }, 'Hugo', () => '');
    assert.deepEqual(poor.map((c) => c.type), ['period', 'portrait']);
});

test('sur toutes les figures du pack français : au moins quatre indices, et aucun mot du nom dans les indices', () => {
    const events = [];
    const walk = (n) => { (n.themes || []).forEach((t) => (t.events || []).forEach((e) => events.push(e))); (n.subcategories || []).forEach(walk); };
    fr.categories.forEach(walk);
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[øđłæœß]/g, (c) => ({ 'ø': 'o', 'đ': 'd', 'ł': 'l', 'æ': 'a', 'œ': 'o', 'ß': 's' }[c]));
    const candidates = G.whoCandidates(events).filter((e) => String(e.description || '').length >= 80);
    assert.ok(candidates.length > 1000, 'des centaines de figures jouables');
    const problems = [];
    candidates.forEach((e) => {
        const name = e.titre.replace(/^Naissance (de |d'|d’|du )/, '');
        const clues = R.buildClues(e, name, () => 'Pays');
        if (clues.length < 4) problems.push(`${name} : seulement ${clues.length} indices`);
        const tokens = R.nameTokens(name, e.classement).filter((t) => norm(t).length >= 4);
        clues.filter((c) => c.type === 'text').forEach((c) => {
            const text = norm(c.text);
            tokens.forEach((t) => {
                if (new RegExp('(^|[^a-z])' + norm(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)').test(text)) problems.push(`${name} : « ${t} » dans « ${c.text.slice(0, 60)} »`);
            });
        });
    });
    assert.deepEqual(problems.slice(0, 5), []);
});

// --- Qui suis-je ? : les manches -------------------------------------------------------------------------
function questions(clueCount) {
    const clues = [{ type: 'domain', axis: 'X', country: 'Y' }, { type: 'period', label: 'XVe siècle' }, { type: 'text', text: 'Un texte assez long.' }, { type: 'text', text: 'Un autre texte assez long.' }, { type: 'portrait' }].slice(0, clueCount - 1).concat([{ type: 'portrait' }]);
    const make = (n) => ({ correctId: 'c' + n, name: 'Figure ' + n, options: [{ id: 'c' + n, name: 'Figure ' + n }, { id: 'a' + n, name: 'Autre A' }, { id: 'b' + n, name: 'Autre B' }, { id: 'd' + n, name: 'Autre D' }], clues });
    return [make(0), make(1), make(2)];
}

test('Qui suis-je ? : plus on trouve tôt, plus on marque (100, 80, 60, 40, 20)', () => {
    const g = R.createWho(questions(5));
    assert.equal(g.shown, 1);
    assert.deepEqual(R.whoPick(g, 'c0'), ['right']);
    assert.equal(g.score, 100);
    assert.deepEqual(R.whoNext(g), ['next']);
    R.whoReveal(g); R.whoReveal(g);
    assert.equal(g.shown, 3);
    R.whoPick(g, 'c1');
    assert.equal(g.score, 160);
    R.whoNext(g);
    R.whoReveal(g); R.whoReveal(g); R.whoReveal(g); R.whoReveal(g);
    assert.equal(g.shown, 5);
    assert.deepEqual(R.whoReveal(g), [], 'plus d\'indice');
    R.whoPick(g, 'c2');
    assert.equal(g.score, 180);
    assert.deepEqual(R.whoNext(g), ['done']);
    assert.ok(g.over);
    assert.equal(g.found, 3);
    assert.deepEqual(g.results.map((r) => r.points), [100, 60, 20]);
});

test('Qui suis-je ? : une mauvaise réponse retire l\'option et dévoile l\'indice suivant', () => {
    const g = R.createWho(questions(5));
    assert.deepEqual(R.whoPick(g, 'a0'), ['wrong']);
    assert.equal(g.shown, 2);
    assert.equal(g.errors, 1);
    assert.deepEqual(R.whoPick(g, 'a0'), [], 'une option retirée ne se rejoue pas');
    R.whoPick(g, 'b0');
    assert.equal(g.shown, 3);
    R.whoPick(g, 'c0');
    assert.equal(g.score, 60);
});

test('Qui suis-je ? : tous les indices vus et toujours faux : la manche est perdue quand il ne reste que la bonne', () => {
    const g = R.createWho(questions(4));
    R.whoReveal(g); R.whoReveal(g); R.whoReveal(g);
    assert.equal(g.shown, 4);
    assert.deepEqual(R.whoPick(g, 'a0'), ['wrong']);
    assert.deepEqual(R.whoPick(g, 'b0'), ['wrong']);
    assert.deepEqual(R.whoPick(g, 'd0'), ['wrong', 'lost']);
    assert.equal(g.resolved, 'lost');
    assert.equal(g.score, 0);
    assert.deepEqual(g.results[0], { id: 'c0', name: 'Figure 0', shown: 4, points: 0 });
    // Une manche résolue ne se rejoue pas, et ne se quitte que par whoNext.
    assert.deepEqual(R.whoPick(g, 'c0'), []);
    assert.deepEqual(R.whoReveal(g), []);
    assert.deepEqual(R.whoNext(g), ['next']);
    assert.equal(g.shown, 1);
    assert.deepEqual(g.disabled, {});
});

test('Qui suis-je ? : sans manche, rien ne démarre ; on ne passe pas à la suivante sans avoir résolu', () => {
    assert.ok(R.createWho([]).empty);
    const g = R.createWho(questions(5));
    assert.deepEqual(R.whoNext(g), []);
    assert.equal(g.index, 0);
});

test('la salle de jeux : textes, scripts et écrans des jeux de réflexion', () => {
    const ui = JSON.parse(fs.readFileSync(path.join(root, 'ui', 'fr.json'), 'utf8'));
    const need = {
        games: ['mini_title', 'mini_desc', 'arcade_title', 'arcade_desc', 'reflexion_title', 'reflexion_desc'],
        memory: ['title', 'desc', 'rule', 'status', 'card_hidden', 'card_event', 'card_date', 'match', 'miss_pair', 'miss_same', 'won', 'over_text'],
        who: ['title', 'loading', 'desc', 'status', 'more', 'clue_axis', 'clue_country', 'clue_period', 'clue_portrait', 'worth', 'right', 'lost', 'answer', 'next', 'finish', 'found', 'result_found', 'result_lost']
    };
    Object.keys(need).forEach((g) => need[g].forEach((k) => assert.ok(ui[g] && ui[g][k], `${g}.${k}`)));
    assert.equal(ui.arcade.title, 'Salle de jeux');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    ['js/reflexionCore.js', 'js/app/reflexion.js'].forEach((f) => {
        assert.ok(html.includes(`<script src="${f}">`), f + ' dans index.html');
        assert.ok(sw.includes(`'./${f}'`), f + ' dans sw.js');
    });
    ['screen-memory', 'screen-who'].forEach((id) => assert.ok(html.includes(`id="${id}"`), id));
    // Trois sections, six jeux d'arcade et de réflexion + deux mini-jeux : huit cartes.
    ['games-h-mini', 'games-h-arcade', 'games-h-reflexion'].forEach((id) => assert.ok(html.includes(`id="${id}"`), id));
    assert.equal((html.match(/class="arcade-card"/g) || []).length, 8);
});
