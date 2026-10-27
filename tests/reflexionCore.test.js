// Jeux de réflexion (js/reflexionCore.js) : Memory chronologique et « Qui suis-je ? ». Pur, sans navigateur.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../js/reflexionCore.js');
const G = require('../js/gameModes.js');
const C = require('../js/reflexionContent.js');

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

test('Memory : six paires en facile et en moyen (dos colorés en facile), neuf paires en difficile', () => {
    const make = (difficulty) => R.createMemory(pool(), seeded(5), undefined, { difficulty });
    assert.deepEqual(['easy', 'normal', 'hard'].map((d) => make(d).cards.length), [12, 12, 18]);
    assert.deepEqual(['easy', 'normal', 'hard'].map((d) => make(d).pairs), [6, 6, 9]);
    assert.deepEqual(['easy', 'normal', 'hard'].map((d) => make(d).level.colors), [true, false, false]);
    assert.equal(R.createMemory(pool(), seeded(5)).difficulty, 'normal');
    // Neuf paires : neuf années différentes, chaque paire a ses deux cartes.
    const hard = make('hard');
    assert.equal(new Set(hard.cards.map((c) => c.event.date)).size, 9);
    for (let pair = 0; pair < 9; pair++) assert.equal(hard.cards.filter((c) => c.pair === pair).length, 2);
    // Gagner en difficile demande les neuf paires ; le score maximal monte avec le nombre de paires.
    let last = [];
    for (let pair = 0; pair < 9; pair++) { const [e, d] = pairOf(hard, pair); R.memoryFlip(hard, e); last = R.memoryFlip(hard, d); }
    assert.deepEqual(last, ['match', 'done']);
    assert.equal(R.memoryScore(hard), 900);
    assert.equal(R.memoryScore(make('normal')), 600, 'six paires : 600 points au mieux');
    // Le nombre de paires donné l'emporte sur celui du niveau.
    assert.equal(R.createMemory(pool(), seeded(5), 4, { difficulty: 'hard' }).cards.length, 8);
    // Un vivier trop pauvre pour neuf paires ne démarre pas en difficile, mais joue en moyen.
    const small = pool().slice(0, 7);
    assert.ok(R.createMemory(small, seeded(1), undefined, { difficulty: 'hard' }).empty);
    assert.ok(!R.createMemory(small, seeded(1)).empty);
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
        cause: ['title', 'desc', 'status', 'ask_cause', 'ask_effect', 'right', 'wrong', 'links', 'next', 'finish', 'found', 'card_aria'],
        scene: ['title', 'desc', 'status', 'when', 'check', 'check_none', 'hint', 'result', 'found_item', 'missed_item', 'wrong_item', 'next', 'finish', 'over_text', 'result_line'],
        hangman: ['title', 'desc', 'status', 'prompt', 'bc', 'lives', 'try_label', 'try', 'earlier', 'later', 'solved', 'lost', 'answer', 'next', 'finish', 'found', 'result_found', 'result_lost'],
        who: ['title', 'loading', 'desc', 'status', 'more', 'clue_axis', 'clue_country', 'clue_period', 'clue_portrait', 'worth', 'right', 'lost', 'answer', 'next', 'finish', 'found', 'result_found', 'result_lost']
    };
    Object.keys(need).forEach((g) => need[g].forEach((k) => assert.ok(ui[g] && ui[g][k], `${g}.${k}`)));
    assert.equal(ui.arcade.title, 'Salle de jeux');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    ['js/reflexionContent.js', 'js/reflexionCore.js', 'js/app/reflexion.js'].forEach((f) => {
        assert.ok(html.includes(`<script src="${f}">`), f + ' dans index.html');
        assert.ok(sw.includes(`'./${f}'`), f + ' dans sw.js');
    });
    ['screen-memory', 'screen-who', 'screen-cause', 'screen-scene', 'screen-hangman'].forEach((id) => assert.ok(html.includes(`id="${id}"`), id));
    // Trois sections : quatre mini-jeux, sept jeux d'arcade, cinq jeux de réflexion.
    ['games-h-mini', 'games-h-arcade', 'games-h-reflexion'].forEach((id) => assert.ok(html.includes(`id="${id}"`), id));
    // Les cartes de la salle de jeux seulement (la boîte à outils réutilise la même classe, dans son propre écran).
    const hub = html.slice(html.indexOf('id="screen-arcade"'), html.indexOf('<div id="screen-', html.indexOf('id="screen-arcade"') + 10));
    // 16 + le quiz des pays (js/modes/geoquiz.js) + la carte « Villes du monde » (js/modes/cities.js).
    assert.equal((hub.match(/class="arcade-card"/g) || []).length, 18);
});

// --- Contenu rédigé à la main ---------------------------------------------------------------------------
test('Cause ou conséquence : au moins quarante paires, aux identifiants uniques, la cause jamais après sa conséquence', () => {
    assert.ok(C.CAUSES.length >= 40);
    assert.equal(new Set(C.CAUSES.map((c) => c.id)).size, C.CAUSES.length);
    C.CAUSES.forEach((c) => {
        assert.ok(c.cause.title && c.effect.title && c.cause.title !== c.effect.title, c.id);
        assert.ok(Number.isInteger(c.cause.year) && Number.isInteger(c.effect.year), c.id);
        assert.ok(c.cause.year <= c.effect.year, `${c.id} : la cause (${c.cause.year}) précède sa conséquence (${c.effect.year})`);
        assert.ok(c.explain.length > 60, `${c.id} : une explication qui dit le mécanisme`);
    });
    // Deux paires ne doivent pas se contredire : un même titre ne peut pas être la cause ici et la conséquence là en sens inverse.
    const causeTitles = new Set(C.CAUSES.map((c) => c.cause.title));
    C.CAUSES.forEach((c) => assert.ok(!causeTitles.has(c.effect.title) || c.cause.year < c.effect.year, c.id));
});

test('Chasse aux anachronismes : treize scènes de huit éléments, un à quatre anachronismes (chaque nombre est représenté), chacun expliqué', () => {
    assert.ok(C.SCENES.length >= 12);
    assert.equal(new Set(C.SCENES.map((s) => s.id)).size, C.SCENES.length);
    C.SCENES.forEach((s) => {
        assert.ok(s.title && s.when && s.intro, s.id);
        assert.equal(s.elements.length, 8, s.id);
        const bad = s.elements.filter((e) => e.anachronism).length;
        assert.ok(bad >= 1 && bad <= 4, `${s.id} : ${bad} anachronismes`);
        // L'emoji est tout ce qu'on voit d'un élément à côté de son texte : un doublon prêterait à confusion.
        assert.equal(new Set(s.elements.map((e) => e.icon)).size, 8, `${s.id} : emojis`);
        s.elements.forEach((e) => assert.ok(e.icon && e.text && e.why && e.why.length > 15, `${s.id} : ${e.text}`));
        assert.equal(R.sceneTotal(s), bad);
    });
    const counts = new Set(C.SCENES.map((s) => R.sceneTotal(s)));
    [1, 2, 3, 4].forEach((n) => assert.ok(counts.has(n), `aucune scène à ${n} anachronisme(s)`));
});

// --- Cause ou conséquence : les manches --------------------------------------------------------------------------
test('Cause ou conséquence : huit questions, jamais deux fois la même paire, des sens mêlés', () => {
    const g = R.createCause(C.CAUSES, seeded(4));
    assert.equal(g.questions.length, 8);
    assert.equal(new Set(g.questions.map((q) => q.item.id)).size, 8);
    const many = R.createCause(C.CAUSES, seeded(9), 40);
    assert.ok(many.questions.some((q) => q.kind === 'cause') && many.questions.some((q) => q.kind === 'effect'));
    assert.ok(many.questions.some((q) => q.causeSide === 0) && many.questions.some((q) => q.causeSide === 1));
    assert.ok(R.createCause([], seeded(1)).empty);
});

test('Cause ou conséquence : la cause est du côté annoncé ; on gagne 100 points en désignant la bonne carte', () => {
    const g = R.createCause(C.CAUSES, seeded(7));
    const q = R.causeQuestion(g);
    const sides = R.causeSides(q);
    assert.equal(sides[q.causeSide].role, 'cause');
    assert.equal(sides[q.causeSide].title, q.item.cause.title);
    assert.equal(sides[1 - q.causeSide].title, q.item.effect.title);
    const expected = q.kind === 'cause' ? q.causeSide : 1 - q.causeSide;
    assert.deepEqual(R.causeAnswer(g, expected), ['right']);
    assert.equal(g.score, 100);
    assert.deepEqual(R.causeAnswer(g, expected), [], 'une question résolue ne se rejoue pas');
    assert.deepEqual(R.causeNext(g), ['next']);
    const q2 = R.causeQuestion(g);
    assert.deepEqual(R.causeAnswer(g, 1 - (q2.kind === 'cause' ? q2.causeSide : 1 - q2.causeSide)), ['wrong']);
    assert.equal(g.score, 100);
    assert.equal(g.results.length, 2);
    assert.deepEqual(R.causeAnswer(g, 5), []);
});

test('Cause ou conséquence : huit réponses justes font 800 points et finissent la partie', () => {
    const g = R.createCause(C.CAUSES, seeded(11));
    let last = [];
    while (!g.over) {
        const q = R.causeQuestion(g);
        R.causeAnswer(g, q.kind === 'cause' ? q.causeSide : 1 - q.causeSide);
        last = R.causeNext(g);
    }
    assert.deepEqual(last, ['done']);
    assert.equal(g.score, 800);
    assert.equal(g.found, 8);
    assert.deepEqual(R.causeNext(g), []);
});

// --- Chasse aux anachronismes : les manches ---------------------------------------------------------------------
function indexOfAnachronisms(scene) {
    return scene.elements.map((e, i) => (e.anachronism ? i : -1)).filter((i) => i >= 0);
}

test('Anachronismes : cinq scènes différentes, les éléments mêlés mais tous présents', () => {
    const g = R.createScenes(C.SCENES, seeded(5));
    assert.equal(g.rounds.length, 5);
    assert.equal(new Set(g.rounds.map((r) => r.scene.id)).size, 5);
    g.rounds.forEach((r) => assert.deepEqual(r.order.slice().sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]));
    // Mêlés : l'ordre d'affichage n'est pas toujours celui du texte (où les anachronismes sont en dernier).
    assert.ok(g.rounds.some((r) => r.order.some((v, i) => v !== i)));
    assert.ok(R.createScenes([], seeded(1)).empty);
});

test('Anachronismes : trouver tout sans erreur fait 100 points ; une erreur retire un anachronisme trouvé', () => {
    const g = R.createScenes(C.SCENES, seeded(5));
    const scene = R.sceneRound(g).scene;
    indexOfAnachronisms(scene).forEach((i) => assert.deepEqual(R.sceneToggle(g, i), ['toggle']));
    assert.deepEqual(R.sceneValidate(g), ['validated']);
    assert.equal(g.resolved.points, 100);
    assert.equal(g.resolved.missed.length, 0);
    assert.deepEqual(R.sceneToggle(g, 0), [], 'plus de sélection après validation');
    assert.deepEqual(R.sceneValidate(g), []);
    R.sceneNext(g);

    // Tous les anachronismes trouvés, plus un élément à sa place désigné à tort : (n − 1) / n des points.
    const scene2 = R.sceneRound(g).scene;
    const bad = indexOfAnachronisms(scene2);
    bad.forEach((i) => R.sceneToggle(g, i));
    const ok = scene2.elements.findIndex((e) => !e.anachronism);
    R.sceneToggle(g, ok);
    R.sceneValidate(g);
    assert.equal(g.resolved.wrong.length, 1);
    assert.equal(g.resolved.points, Math.round(100 * (bad.length - 1) / bad.length));
    assert.equal(g.score, 100 + g.resolved.points);
});

test('Anachronismes : désélectionner, ne rien désigner (0 point, tout manqué), et jamais de points négatifs', () => {
    const g = R.createScenes(C.SCENES, seeded(8));
    const scene = R.sceneRound(g).scene;
    R.sceneToggle(g, 0);
    R.sceneToggle(g, 0);
    assert.deepEqual(g.selected, {});
    R.sceneValidate(g);
    assert.equal(g.resolved.points, 0);
    assert.equal(g.resolved.missed.length, R.sceneTotal(scene));
    R.sceneNext(g);
    // Que des erreurs : 0 et non un score négatif.
    const scene2 = R.sceneRound(g).scene;
    scene2.elements.forEach((e, i) => { if (!e.anachronism) R.sceneToggle(g, i); });
    R.sceneValidate(g);
    assert.equal(g.resolved.points, 0);
    assert.ok(g.score >= 0);
});

test('Anachronismes : cinq scènes parfaites font 500 points et finissent la partie', () => {
    const g = R.createScenes(C.SCENES, seeded(12));
    let last = [];
    while (!g.over) {
        indexOfAnachronisms(R.sceneRound(g).scene).forEach((i) => R.sceneToggle(g, i));
        R.sceneValidate(g);
        last = R.sceneNext(g);
    }
    assert.deepEqual(last, ['done']);
    assert.equal(g.score, 500);
    assert.equal(g.results.length, 5);
    assert.deepEqual(R.sceneNext(g), []);
});

test('Anachronismes : une erreur retire la moitié d\'un anachronisme en facile, un seul en moyen, deux en difficile ; seul le facile annonce le nombre', () => {
    const play = (difficulty) => {
        const g = R.createScenes(C.SCENES, seeded(5), undefined, { difficulty });
        const scene = R.sceneRound(g).scene;
        const bad = indexOfAnachronisms(scene);
        bad.forEach((i) => R.sceneToggle(g, i));
        scene.elements.forEach((e, i) => { if (!e.anachronism && R.sceneRound(g).scene === scene && Object.keys(g.selected).length < bad.length + 1) R.sceneToggle(g, i); });
        R.sceneValidate(g);
        return { g, total: bad.length };
    };
    const easy = play('easy'), normal = play('normal'), hard = play('hard');
    const expected = (r, penalty) => Math.max(0, Math.round(100 * (r.total - penalty) / r.total));
    assert.equal(easy.g.resolved.wrong.length, 1);
    assert.equal(easy.g.resolved.points, expected(easy, 0.5));
    assert.equal(normal.g.resolved.points, expected(normal, 1));
    assert.equal(hard.g.resolved.points, expected(hard, 2));
    assert.ok(easy.g.resolved.points >= normal.g.resolved.points && normal.g.resolved.points >= hard.g.resolved.points);
    assert.deepEqual(['easy', 'normal', 'hard'].map((d) => R.SCENE_LEVELS[d].announce), [true, false, false]);
    assert.equal(R.createScenes(C.SCENES, seeded(5)).difficulty, 'normal');
});

// --- Qui suis-je ? : les niveaux ------------------------------------------------------------------------------
function figures(n, stars) {
    return Array.from({ length: n }, (_, i) => ({ id: `f${stars}_${i}`, titre: `Figure ${stars} ${i}`, etoiles: stars }));
}

test('Qui suis-je : chaque niveau tire ses figures selon leur notoriété, et ses mauvaises réponses selon le niveau', () => {
    const all = [...figures(40, 1), ...figures(40, 2), ...figures(40, 3), { id: 'sans', titre: 'Sans étoiles' }];
    const easy = R.whoSelect(all, 'easy'), normal = R.whoSelect(all, 'normal'), hard = R.whoSelect(all, 'hard');
    assert.ok(easy.correct.length === 40 && easy.correct.every((e) => e.etoiles === 3));
    assert.ok(normal.correct.every((e) => R.whoStars(e) === 2), 'une figure sans étoiles compte pour moyennement connue');
    assert.equal(normal.correct.length, 41);
    assert.ok(hard.correct.length === 40 && hard.correct.every((e) => e.etoiles === 1));
    // Mauvaises réponses : toutes en facile, les plus connues en moyen, aussi peu connues que la bonne en difficile.
    assert.equal(easy.distractors.length, all.length);
    assert.ok(normal.distractors.every((e) => R.whoStars(e) >= 2));
    assert.ok(hard.distractors.every((e) => e.etoiles === 1));
    assert.equal(R.whoSelect(all).correct.length, 41, 'sans niveau : moyen');
    // Trop peu de figures pour un niveau : on retombe sur toutes (jamais une partie vide).
    const few = [...figures(5, 3), ...figures(60, 1)];
    assert.equal(R.whoSelect(few, 'easy').correct.length, few.length);
    assert.equal(R.whoSelect(few, 'easy').distractors.length, few.length);
    assert.deepEqual(R.whoSelect([], 'hard'), { correct: [], distractors: [] });
});

test('Qui suis-je : deux indices dès le départ en facile, un en moyen et en difficile, à chaque manche', () => {
    const q = (id) => ({ correctId: id, name: id, options: [{ id: 'x', name: 'X' }, { id, name: id }], clues: [{ type: 'domain' }, { type: 'period' }, { type: 'text' }, { type: 'portrait' }] });
    const start = (difficulty) => R.createWho([q('a'), q('b')], { difficulty });
    assert.deepEqual(['easy', 'normal', 'hard'].map((d) => start(d).shown), [2, 1, 1]);
    assert.equal(R.createWho([q('a')]).difficulty, 'normal');
    // Les points suivent les indices montrés : au mieux 80 en facile (deux indices), 100 sinon.
    const easy = start('easy');
    R.whoPick(easy, 'a');
    assert.equal(easy.score, 80);
    R.whoNext(easy);
    assert.equal(easy.shown, 2, 'la manche suivante repart avec deux indices');
    const hard = start('hard');
    R.whoPick(hard, 'a');
    assert.equal(hard.score, 100);
    // Une question qui n'a qu'un indice n'en montre jamais deux.
    const one = R.createWho([{ correctId: 'a', name: 'a', options: [{ id: 'a', name: 'a' }], clues: [{ type: 'portrait' }] }], { difficulty: 'easy' });
    assert.equal(one.shown, 1);
});

test('Qui suis-je : sur le pack français, chaque figure à portrait a ses étoiles (1 à 3) et chaque niveau a de quoi jouer', () => {
    const events = [];
    const walk = (n) => { (n.themes || []).forEach((t) => (t.events || []).forEach((e) => events.push(e))); (n.subcategories || []).forEach(walk); };
    fr.categories.forEach(walk);
    const withPortrait = events.filter((e) => e.image && e.image.src);
    assert.ok(withPortrait.length > 4000);
    const bad = withPortrait.filter((e) => ![1, 2, 3].includes(e.etoiles));
    assert.deepEqual(bad.map((e) => e.id).slice(0, 5), [], 'figures sans étoiles');
    const candidates = G.whoCandidates(events).filter((e) => String(e.description || '').length >= 80);
    ['easy', 'normal', 'hard'].forEach((difficulty, i) => {
        const { correct, distractors } = R.whoSelect(candidates, difficulty);
        assert.ok(correct.length >= [200, 800, 1500][i], `${difficulty} : ${correct.length} figures`);
        assert.ok(correct.every((e) => e.etoiles === 3 - i), difficulty);
        assert.ok(distractors.length >= 200, `${difficulty} : ${distractors.length} mauvaises réponses possibles`);
    });
    // Quelques repères : les noms que tout le monde connaît sont ★★★, un héros local ★.
    const stars = (name) => withPortrait.find((e) => e.titre.includes(name));
    ['Napoléon Bonaparte', 'Albert Einstein', 'Charles de Gaulle', 'Mozart'].forEach((n) => assert.equal(stars(n).etoiles, 3, n));
});

// --- Pendu des dates ------------------------------------------------------------------------------------------
function hangmanPool() {
    return [{ id: 'a', title: 'Prise de la Bastille', date: 1789 }, { id: 'b', title: 'Découverte de l\'Amérique', date: 1492 },
        { id: 'c', title: 'Assassinat de César', date: -44 }, { id: 'd', title: 'Couronnement de Charlemagne', date: 800 },
        { id: 'e', title: 'Bataille d\'Hastings', date: 1066 }, { id: 'f', title: 'Waterloo', date: 1815 }, { id: 'g', title: 'Fondation de Rome', date: -753 }];
}

test('Pendu : cinq événements aux années différentes ; l\'année est cachée chiffre par chiffre, le signe est connu', () => {
    const g = R.createHangman(hangmanPool(), seeded(3));
    assert.equal(g.questions.length, 5);
    assert.equal(new Set(g.questions.map((q) => q.event.date)).size, 5);
    g.questions.forEach((q) => { assert.equal(q.digits, String(Math.abs(q.event.date))); assert.equal(q.bc, q.event.date < 0); });
    assert.deepEqual(R.hangmanSlots(g), g.questions[0].digits.split('').map(() => null));
    assert.equal(R.createHangman([{ id: 'x', title: 't', date: 12345 }], seeded(1)).questions.length, 0, 'cinq chiffres : hors du jeu');
    assert.ok(R.createHangman([], seeded(1)).empty);
});

// Une partie dont la première année est connue (moyen par défaut : quatre vies, pas de chiffre offert).
function hangmanOn(date, difficulty) {
    const g = R.createHangman(hangmanPool(), seeded(3), undefined, { difficulty });
    g.questions[0] = { event: { id: 'z', title: 'Test', date }, digits: String(Math.abs(date)), bc: date < 0 };
    g.guessed = {};
    return g;
}

test('Pendu : un chiffre juste se dévoile partout où il est ; un chiffre faux coûte une vie', () => {
    const g = hangmanOn(1914);
    assert.deepEqual(R.hangmanGuess(g, '1'), ['hit']);
    assert.deepEqual(R.hangmanSlots(g), ['1', null, '1', null]);
    assert.deepEqual(R.hangmanGuess(g, '1'), [], 'un chiffre déjà proposé ne se rejoue pas');
    assert.deepEqual(R.hangmanGuess(g, '7'), ['miss']);
    assert.equal(g.lives, 3);
    assert.deepEqual(R.hangmanGuess(g, 'x'), []);
    R.hangmanGuess(g, '9');
    assert.deepEqual(R.hangmanGuess(g, '4'), ['hit', 'solved']);
    assert.equal(g.resolved, 'solved');
    assert.equal(g.score, 30 + 10 * 3);
    assert.deepEqual(R.hangmanGuess(g, '0'), [], 'manche résolue');
});

test('Pendu : quatre erreurs (moyen) perdent la manche (0 point), la réponse se dévoile', () => {
    const g = hangmanOn(1914);
    let last = [];
    ['0', '2', '3', '5'].forEach((d) => { last = R.hangmanGuess(g, d); });
    assert.deepEqual(last, ['miss', 'lost']);
    assert.equal(g.resolved, 'lost');
    assert.equal(g.score, 0);
    assert.deepEqual(R.hangmanSlots(g), ['1', '9', '1', '4']);
    assert.deepEqual(g.results[0], { id: 'z', title: 'Test', date: 1914, solved: false, lives: 0, points: 0 });
});

test('Pendu : proposer une année entière — juste, c\'est gagné ; fausse, une vie de moins et « plus tôt » ou « plus tard »', () => {
    const g = hangmanOn(1789);
    assert.deepEqual(R.hangmanTryYear(g, 1800), ['wrong', 'earlier', ]);
    assert.equal(g.hint, 'earlier');
    assert.equal(g.lives, 3);
    assert.deepEqual(R.hangmanTryYear(g, 1700), ['wrong', 'later']);
    assert.equal(g.hint, 'later');
    assert.equal(g.lives, 2);
    assert.deepEqual(R.hangmanTryYear(g, 0), [], 'pas d\'an 0');
    assert.deepEqual(R.hangmanTryYear(g, 17.5), []);
    assert.deepEqual(R.hangmanTryYear(g, 1789), ['solved']);
    assert.equal(g.score, 30 + 10 * 2);
    // Avant J.-C. : −44 contre −27 (plus tard dans le temps) : la vraie date est plus tôt.
    const h = hangmanOn(-44);
    assert.deepEqual(R.hangmanTryYear(h, -27), ['wrong', 'earlier']);
    assert.deepEqual(R.hangmanTryYear(h, -44), ['solved']);
});

test('Pendu : six vies en facile (avec le premier chiffre offert), quatre en moyen, trois en difficile (sans « plus tôt / plus tard »)', () => {
    assert.deepEqual(['easy', 'normal', 'hard'].map((d) => R.createHangman(hangmanPool(), seeded(3), undefined, { difficulty: d }).lives), [6, 4, 3]);
    assert.equal(R.createHangman(hangmanPool(), seeded(3)).difficulty, 'normal');
    assert.equal(R.createHangman(hangmanPool(), seeded(3), undefined, { difficulty: 'bizarre' }).lives, 4);

    // Facile : le premier chiffre est déjà dévoilé (partout où il est), à chaque manche, sans coûter de vie.
    const easy = R.createHangman(hangmanPool(), seeded(3), undefined, { difficulty: 'easy' });
    easy.questions[1] = { event: { id: 'c', title: 'Court', date: 44 }, digits: '44', bc: false };
    easy.questions[2] = { event: { id: 'r', title: 'Répété', date: 1111 }, digits: '1111', bc: false };
    for (let i = 0; i < easy.questions.length; i++) {
        const q = R.hangmanQuestion(easy);
        assert.equal(easy.lives, 6, 'une manche commence avec toutes ses vies');
        if (q.digits.length < 3) assert.deepEqual(easy.guessed, {}, 'trop court : rien d\'offert');
        else if (q.digits === '1111') assert.deepEqual(easy.guessed, {}, 'un seul chiffre répété : rien d\'offert');
        else {
            assert.equal(easy.guessed[q.digits.charAt(0)], true);
            assert.equal(R.hangmanSlots(easy)[0], q.digits.charAt(0));
            assert.equal(easy.resolved, null, 'le chiffre offert ne gagne pas la manche');
        }
        R.hangmanTryYear(easy, q.event.date);
        R.hangmanNext(easy);
    }
    assert.ok(easy.over);

    // Difficile : une année fausse coûte une vie sans dire si la vraie date est plus tôt ou plus tard.
    const h = hangmanOn(1789, 'hard');
    assert.deepEqual(R.hangmanTryYear(h, 1800), ['wrong']);
    assert.equal(h.hint, null);
    assert.equal(h.lives, 2);
    // Facile : l'indice est donné.
    const e = hangmanOn(1789, 'easy');
    assert.deepEqual(R.hangmanTryYear(e, 1800), ['wrong', 'earlier']);
    assert.equal(e.lives, 5);
});

test('Pendu : cinq événements trouvés d\'emblée font 5 × 70 = 350 points (moyen) ; une manche se quitte par hangmanNext', () => {
    const g = R.createHangman(hangmanPool(), seeded(7));
    let last = [];
    while (!g.over) {
        const q = R.hangmanQuestion(g);
        R.hangmanTryYear(g, q.event.date);
        assert.deepEqual(R.hangmanNext(g).length > 0, true);
        last = [g.over];
    }
    assert.equal(g.score, 5 * 70);
    assert.equal(g.found, 5);
    assert.deepEqual(R.hangmanNext(g), []);
    assert.equal(last[0], true);
    const h = R.createHangman(hangmanPool(), seeded(7));
    assert.deepEqual(R.hangmanNext(h), [], 'pas avant la fin de la manche');
    R.hangmanGuess(h, '1');
    R.hangmanNext(h);
    assert.equal(h.index, 0);
});
