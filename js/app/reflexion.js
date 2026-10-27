// =========================================================================
// === LES JEUX DE RÉFLEXION — MEMORY CHRONOLOGIQUE ET « QUI SUIS-JE ? » (écrans) ===
// =========================================================================
// Les règles sont dans js/reflexionCore.js (pur, testé) et le contenu rédigé à la main dans js/reflexionContent.js ; ici,
// les vivriers tirés du pack chargé, le dessin des cartes, des indices et des scènes, et les écrans de fin. Les deux jeux se lancent depuis la salle de jeux (`screen-arcade`, voir
// js/app/arcade.js) et lui rendent la main. Meilleurs scores : mêmes clés que l'arcade (ArcadeCore.normalizeBest).

const MEMORY_HIDE_MS = 1100;

// =====================================================================================================
// === MEMORY ===
// =====================================================================================================
let memoryGame = null;
let memoryHideTimer = 0;
let memoryReturn = 'screen-arcade';

function openMemory(fromScreen) {
    memoryReturn = fromScreen || 'screen-arcade';
    showScreen('screen-memory', 'forward');
    memorySetup();
}

// Avant la partie : le choix du niveau.
function memorySetup() {
    memoryGame = null;
    document.getElementById('memory-grid').innerHTML = '';
    document.getElementById('memory-status').textContent = '';
    document.getElementById('memory-over').classList.add('hidden');
    arcadeMessage('memory-message', '');
    renderArcadeDifficulty('memory');
    document.getElementById('memory-setup').classList.remove('hidden');
}

function memoryBack() {
    clearTimeout(memoryHideTimer);
    memoryHideTimer = 0;
    gamesBackTo(memoryReturn);
}

function memoryStart() {
    clearTimeout(memoryHideTimer);
    memoryHideTimer = 0;
    const game = ReflexionCore.createMemory(arcadePool(), undefined, undefined, { difficulty: arcadeDifficulty('memory') });
    if (game.empty) { alert(t('arcade.empty')); return; }
    memoryGame = game;
    document.getElementById('memory-setup').classList.add('hidden');
    document.getElementById('memory-over').classList.add('hidden');
    arcadeMessage('memory-message', '');
    memoryRender();
}

function memoryRender() {
    const g = memoryGame;
    document.getElementById('memory-status').textContent = t('memory.status', {
        matched: Object.keys(g.matched).length, pairs: g.pairs, errors: g.errors
    });
    const grid = document.getElementById('memory-grid');
    grid.innerHTML = '';
    // Dix-huit cartes en difficile : six rangées, des cartes un peu moins hautes.
    grid.classList.toggle('is-dense', g.cards.length > 12);
    g.cards.forEach((card, i) => {
        const up = g.flipped.indexOf(i) !== -1 || g.matched[card.pair];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'memory-card' + (up ? ' is-up' : '') + (g.matched[card.pair] ? ' is-matched' : '') + (up ? ' is-' + card.side : '');
        if (!up) {
            if (g.level.colors) {
                // Facile : le dos dit le genre (couleur ET symbole, jamais la couleur seule).
                btn.classList.add('is-back-' + card.side);
                btn.textContent = card.side === 'date' ? '📅' : '📜';
                btn.setAttribute('aria-label', t(card.side === 'date' ? 'memory.card_hidden_date' : 'memory.card_hidden_event', { n: i + 1 }));
            } else {
                btn.textContent = '?';
                btn.setAttribute('aria-label', t('memory.card_hidden', { n: i + 1 }));
            }
        } else {
            const text = card.side === 'date' ? formatYear(card.event.date) : card.event.title;
            btn.textContent = text;
            btn.setAttribute('aria-label', t(card.side === 'date' ? 'memory.card_date' : 'memory.card_event', { n: i + 1, text }));
        }
        btn.disabled = !!g.matched[card.pair];
        btn.onclick = () => memoryTap(i);
        grid.appendChild(btn);
    });
}

function memoryTap(index) {
    const g = memoryGame;
    if (!g || g.over) return;
    const events = ReflexionCore.memoryFlip(g, index);
    if (!events.length) return;
    if (events.includes('match')) {
        const card = g.cards[index];
        arcadeSound('good');
        arcadeMessage('memory-message', t('memory.match', { year: formatYear(card.event.date), title: card.event.title }), false);
    }
    if (events.includes('miss')) {
        arcadeSound('bad');
        const a = g.cards[g.flipped[0]], b = g.cards[g.flipped[1]];
        const ev = a.side === 'event' ? a : b.side === 'event' ? b : null;
        const dt = a.side === 'date' ? a : b.side === 'date' ? b : null;
        arcadeMessage('memory-message', ev && dt
            ? t('memory.miss_pair', { title: ev.event.title, year: formatYear(dt.event.date) })
            : t('memory.miss_same'), true);
        memoryHideTimer = setTimeout(() => {
            memoryHideTimer = 0;
            ReflexionCore.memoryHide(g);
            memoryRender();
        }, MEMORY_HIDE_MS);
    }
    memoryRender();
    if (events.includes('done')) memoryFinish();
}

function memoryFinish() {
    const g = memoryGame;
    const score = ReflexionCore.memoryScore(g);
    const weighted = arcadeWeighted('memory', score, g.difficulty);
    const best = arcadeRecord('memory', weighted.total);
    document.getElementById('memory-over-text').textContent =
        t('memory.over_text', { errors: g.errors, score }) + weighted.note + ' ' + t('arcade.best', { score: best.memory });
    renderArcadeDifficulty('memory', 'memory-difficulty-over');
    document.getElementById('memory-over').classList.remove('hidden');
}

// =====================================================================================================
// === QUI SUIS-JE ? ===
// =====================================================================================================
let whoGame = null;
let whoReturn = 'screen-arcade';
let whoFiguresCache = null; // { bdd, size, candidates, known }
let whoLoadToken = 0;      // pour ignorer un chargement dont le joueur n'attend plus le résultat

function whoCountryName(iso) {
    try {
        return new Intl.DisplayNames([i18n.currentLang || 'fr'], { type: 'region' }).of(iso) || '';
    } catch (e) {
        return '';
    }
}

// La longueur de la notice d'une figure : le texte lui-même, ou `dl` quand le pack découpé ne l'a pas encore apporté.
function whoDescriptionLength(evt) {
    return evt.description !== undefined ? String(evt.description).length : (evt.dl || 0);
}

// Les figures à portrait du pack chargé. Seulement les ⭐ incontournables de leur panthéon quand il y en a assez (sinon aussi celles
// citées par plusieurs thèmes) : un joueur ne devine pas un chef oorlam du XIXe siècle. Il faut aussi une notice, d'où viennent les indices.
function whoFigures() {
    const current = window.bdd || bdd || [];
    const size = current.length;
    if (whoFiguresCache && whoFiguresCache.bdd === current && whoFiguresCache.size === size) return whoFiguresCache;
    const raw = getAllEventsWithLocation().map(item => item.event);
    const candidates = GameModes.whoCandidates(raw).filter(e => portraitOf(e) && whoDescriptionLength(e) >= 80);
    const items = PathCore.flattenEvents(current);
    const among = known => { const ids = new Set(); items.forEach(item => { if (known(item)) ids.add(item.id); }); return candidates.filter(e => ids.has(e.id)); };
    let known = among(item => item.essential);
    if (known.length < 40) known = among(item => item.essential || item.fame >= 2);
    whoFiguresCache = { bdd: current, size, candidates, known: known.length >= 40 ? known : candidates };
    return whoFiguresCache;
}

// Les manches : un tirage parmi les figures connues, trois mauvaises réponses prises parmi toutes (voisines en date et
// en domaine, comme au mode « Qui est-ce ? »), puis les notices (qui arrivent thème par thème dans un pack découpé) et
// les indices de chaque figure. Une figure dont la notice n'a pas pu être chargée (hors ligne) est écartée.
async function whoBuildQuestions() {
    const figures = whoFigures();
    const sample = ArcadeCore.shuffle(figures.known).slice(0, 60);
    const questions = GameModes.buildWhoQuestions(sample, { pool: figures.candidates, count: ReflexionCore.WHO_ROUNDS + 2 });
    await ensureDescriptions(questions.map(q => q.correct));
    return questions
        .filter(q => String(q.correct.description || '').length >= 80)
        .slice(0, ReflexionCore.WHO_ROUNDS)
        .map(q => ({
            correctId: q.correctId, name: q.name, options: q.options, event: q.correct,
            clues: ReflexionCore.buildClues(q.correct, q.name, whoCountryName)
        }));
}

function openWho(fromScreen) {
    whoReturn = fromScreen || 'screen-arcade';
    showScreen('screen-who', 'forward');
    whoStart();
}

function whoBack() {
    whoLoadToken += 1;
    gamesBackTo(whoReturn);
}

async function whoStart() {
    const token = ++whoLoadToken;
    document.getElementById('who-over').classList.add('hidden');
    document.getElementById('who-play').classList.add('hidden');
    document.getElementById('who-status').textContent = t('who.loading');
    const questions = await whoBuildQuestions();
    // Le joueur est reparti, ou a relancé une partie, pendant le chargement des notices.
    if (token !== whoLoadToken) return;
    if (questions.length < 3) { alert(t('who.empty')); return; }
    whoGame = ReflexionCore.createWho(questions);
    document.getElementById('who-play').classList.remove('hidden');
    whoRender();
}

function whoRender() {
    const g = whoGame;
    const q = ReflexionCore.whoQuestion(g);
    document.getElementById('who-status').textContent = t('who.status', { n: g.index + 1, total: g.questions.length, score: g.score });
    document.getElementById('who-feedback').classList.add('hidden');

    // Les indices montrés, dans l'ordre ; le portrait est le dernier, hors de la liste.
    const list = document.getElementById('who-clues');
    list.innerHTML = '';
    let portrait = false;
    q.clues.slice(0, g.shown).forEach(clue => {
        const li = document.createElement('li');
        li.className = 'who-clue';
        if (clue.type === 'domain') {
            li.textContent = [clue.axis && t('who.clue_axis', { axis: clue.axis }), clue.country && t('who.clue_country', { country: clue.country })]
                .filter(Boolean).join(' · ');
        } else if (clue.type === 'period') {
            li.textContent = t('who.clue_period', { label: clue.label });
        } else if (clue.type === 'text') {
            li.textContent = clue.text;
        } else {
            portrait = true;
            li.textContent = t('who.clue_portrait');
        }
        list.appendChild(li);
    });
    const fig = document.getElementById('who-portrait');
    fig.classList.toggle('hidden', !portrait && !g.resolved);
    if (portrait || g.resolved) {
        const image = portraitOf(q.event);
        const img = document.getElementById('who-portrait-img');
        img.alt = g.resolved ? q.name : t('whois.portrait_alt');
        img.src = image.src;
        fillPortraitCredit(document.getElementById('who-portrait-credit'), image);
    }

    // « Un indice de plus » : il coûte les points entre l'indice actuel et le suivant.
    const more = document.getElementById('who-more');
    const hasMore = !g.resolved && g.shown < q.clues.length;
    more.classList.toggle('hidden', !hasMore);
    if (hasMore) {
        more.textContent = t('who.more', { cost: ReflexionCore.whoPoints(g.shown) - ReflexionCore.whoPoints(g.shown + 1) })
            + ' · ' + t('who.worth', { points: ReflexionCore.whoPoints(g.shown) });
    }

    const box = document.getElementById('who-options');
    box.innerHTML = '';
    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option who-option' + (g.disabled[opt.id] ? ' wrong' : '') + (g.resolved && opt.id === q.correctId ? ' correct' : '');
        btn.textContent = opt.name;
        btn.disabled = !!g.resolved || !!g.disabled[opt.id];
        btn.onclick = () => whoAnswer(opt.id);
        box.appendChild(btn);
    });
}

function whoMore() {
    if (!whoGame || !ReflexionCore.whoReveal(whoGame).length) return;
    whoRender();
}

function whoAnswer(optionId) {
    const g = whoGame;
    const events = ReflexionCore.whoPick(g, optionId);
    if (!events.length) return;
    if (events.includes('right')) arcadeSound('good');
    if (events.includes('wrong')) arcadeSound('bad');
    whoRender();
    if (!g.resolved) return;
    const q = ReflexionCore.whoQuestion(g);
    const result = g.results[g.results.length - 1];
    document.getElementById('who-status').textContent = t('who.status', { n: g.index + 1, total: g.questions.length, score: g.score });
    const feedback = document.getElementById('who-feedback');
    feedback.classList.toggle('is-wrong', g.resolved === 'lost');
    document.getElementById('who-feedback-title').textContent = g.resolved === 'right' ? t('who.right', { points: result.points }) : t('who.lost');
    document.getElementById('who-feedback-text').textContent = t('who.answer', { name: q.name });
    const last = g.index + 1 >= g.questions.length;
    const next = document.getElementById('who-next');
    next.textContent = t(last ? 'who.finish' : 'who.next');
    feedback.classList.remove('hidden');
    next.focus();
}

function whoContinue() {
    const g = whoGame;
    if (!g || !g.resolved) return;
    if (ReflexionCore.whoNext(g).includes('done')) { whoFinish(); return; }
    whoRender();
}

function whoFinish() {
    const g = whoGame;
    const best = arcadeRecord('who', g.score);
    document.getElementById('who-play').classList.add('hidden');
    document.getElementById('who-status').textContent = '';
    document.getElementById('who-over-text').textContent =
        t('who.found', { found: g.found, total: g.questions.length, score: g.score }) + ' ' + t('arcade.best', { score: best.who });
    const list = document.getElementById('who-over-list');
    list.innerHTML = '';
    g.results.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r.points > 0 ? t('who.result_found', { name: r.name, points: r.points }) : t('who.result_lost', { name: r.name });
        list.appendChild(li);
    });
    document.getElementById('who-over').classList.remove('hidden');
}

// =====================================================================================================
// === CAUSE OU CONSÉQUENCE ? ===
// =====================================================================================================
let causeGame = null;
let causeReturn = 'screen-arcade';

function openCause(fromScreen) {
    causeReturn = fromScreen || 'screen-arcade';
    showScreen('screen-cause', 'forward');
    causeStart();
}

function causeBack() {
    gamesBackTo(causeReturn);
}

function causeStart() {
    causeGame = ReflexionCore.createCause(ReflexionContent.CAUSES);
    document.getElementById('cause-over').classList.add('hidden');
    document.getElementById('cause-play').classList.remove('hidden');
    causeRender();
}

function causeStatus() {
    const g = causeGame;
    document.getElementById('cause-status').textContent = t('cause.status', { n: g.index + 1, total: g.questions.length, score: g.score });
}

function causeRender() {
    const g = causeGame;
    const q = ReflexionCore.causeQuestion(g);
    causeStatus();
    document.getElementById('cause-question').textContent = t(q.kind === 'cause' ? 'cause.ask_cause' : 'cause.ask_effect');
    document.getElementById('cause-feedback').classList.add('hidden');
    const box = document.getElementById('cause-cards');
    box.innerHTML = '';
    ReflexionCore.causeSides(q).forEach((side, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option cause-card';
        btn.dataset.side = String(i);
        btn.textContent = side.title;
        btn.setAttribute('aria-label', t('cause.card_aria', { n: i + 1, title: side.title }));
        btn.onclick = () => causeAnswer(i);
        box.appendChild(btn);
    });
}

function causeAnswer(side) {
    const g = causeGame;
    const events = ReflexionCore.causeAnswer(g, side);
    if (!events.length) return;
    const q = ReflexionCore.causeQuestion(g);
    const right = g.resolved === 'right';
    arcadeSound(right ? 'good' : 'bad');
    causeStatus();
    // La bonne carte en vert, la carte choisie à tort en rouge ; les dates apparaissent dans l'explication.
    const expected = q.kind === 'cause' ? q.causeSide : 1 - q.causeSide;
    document.querySelectorAll('#cause-cards .cause-card').forEach(btn => {
        const i = Number(btn.dataset.side);
        btn.disabled = true;
        if (i === expected) btn.classList.add('correct');
        else if (i === side) btn.classList.add('wrong');
    });
    const feedback = document.getElementById('cause-feedback');
    feedback.classList.toggle('is-wrong', !right);
    document.getElementById('cause-feedback-title').textContent = t(right ? 'cause.right' : 'cause.wrong');
    document.getElementById('cause-feedback-links').textContent = t('cause.links', {
        cause: q.item.cause.title, cause_year: formatYear(q.item.cause.year),
        effect: q.item.effect.title, effect_year: formatYear(q.item.effect.year)
    });
    document.getElementById('cause-feedback-text').textContent = q.item.explain;
    const last = g.index + 1 >= g.questions.length;
    const next = document.getElementById('cause-next');
    next.textContent = t(last ? 'cause.finish' : 'cause.next');
    feedback.classList.remove('hidden');
    next.focus();
}

function causeContinue() {
    const g = causeGame;
    if (!g || !g.resolved) return;
    if (ReflexionCore.causeNext(g).includes('done')) { causeFinish(); return; }
    causeRender();
}

function causeFinish() {
    const g = causeGame;
    const best = arcadeRecord('cause', g.score);
    document.getElementById('cause-play').classList.add('hidden');
    document.getElementById('cause-status').textContent = '';
    document.getElementById('cause-over-text').textContent =
        t('cause.found', { found: g.found, total: g.questions.length, score: g.score }) + ' ' + t('arcade.best', { score: best.cause });
    document.getElementById('cause-over').classList.remove('hidden');
}

// =====================================================================================================
// === CHASSE AUX ANACHRONISMES ===
// =====================================================================================================
let sceneGame = null;
let sceneReturn = 'screen-arcade';

function openScene(fromScreen) {
    sceneReturn = fromScreen || 'screen-arcade';
    showScreen('screen-scene', 'forward');
    sceneSetup();
}

// Avant la partie : le choix du niveau.
function sceneSetup() {
    document.getElementById('scene-play').classList.add('hidden');
    document.getElementById('scene-over').classList.add('hidden');
    document.getElementById('scene-status').textContent = '';
    renderArcadeDifficulty('scene');
    document.getElementById('scene-setup').classList.remove('hidden');
}

function sceneBack() {
    gamesBackTo(sceneReturn);
}

function sceneStart() {
    sceneGame = ReflexionCore.createScenes(ReflexionContent.SCENES, undefined, undefined, { difficulty: arcadeDifficulty('scene') });
    document.getElementById('scene-setup').classList.add('hidden');
    document.getElementById('scene-over').classList.add('hidden');
    document.getElementById('scene-play').classList.remove('hidden');
    sceneRender();
}

function sceneRender() {
    const g = sceneGame;
    const round = ReflexionCore.sceneRound(g);
    const scene = round.scene;
    document.getElementById('scene-status').textContent = t('scene.status', { n: g.index + 1, total: g.rounds.length, score: g.score });
    document.getElementById('scene-title').textContent = t('scene.when', { title: scene.title, when: scene.when });
    // En facile, on dit combien d'intrus la scène en compte ; sinon, c'est à deviner.
    const announce = g.level.announce ? ' ' + t('scene.count_hint', { count: ReflexionCore.sceneTotal(scene) }) : '';
    document.getElementById('scene-intro').textContent = scene.intro + ' ' + t('scene.hint') + announce;
    document.getElementById('scene-feedback').classList.add('hidden');
    const grid = document.getElementById('scene-grid');
    grid.innerHTML = '';
    round.order.forEach(i => {
        const el = scene.elements[i];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'scene-tile';
        btn.dataset.index = String(i);
        btn.setAttribute('aria-pressed', 'false');
        const icon = document.createElement('span');
        icon.className = 'scene-tile-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = el.icon;
        const text = document.createElement('span');
        text.textContent = el.text;
        btn.appendChild(icon);
        btn.appendChild(text);
        btn.onclick = () => sceneTap(i);
        grid.appendChild(btn);
    });
    sceneRenderCheck();
}

function sceneRenderCheck() {
    const count = Object.keys(sceneGame.selected).length;
    const btn = document.getElementById('scene-check');
    btn.textContent = count ? t('scene.check', { count }) : t('scene.check_none');
    btn.classList.remove('hidden');
}

function sceneTap(index) {
    if (!ReflexionCore.sceneToggle(sceneGame, index).length) return;
    const btn = document.querySelector('#scene-grid .scene-tile[data-index="' + index + '"]');
    const on = !!sceneGame.selected[index];
    btn.classList.toggle('is-selected', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    sceneRenderCheck();
}

function sceneCheck() {
    const g = sceneGame;
    if (!ReflexionCore.sceneValidate(g).length) return;
    const round = ReflexionCore.sceneRound(g);
    const scene = round.scene;
    const r = g.resolved;
    arcadeSound(r.found.length === r.total && !r.wrong.length ? 'good' : 'bad');
    document.getElementById('scene-status').textContent = t('scene.status', { n: g.index + 1, total: g.rounds.length, score: g.score });
    // Chaque tuile dit ce qu'il en était : trouvé (vert), manqué (orange), désigné à tort (rouge).
    document.querySelectorAll('#scene-grid .scene-tile').forEach(btn => {
        const i = Number(btn.dataset.index);
        btn.disabled = true;
        if (r.found.includes(i)) btn.classList.add('is-found');
        else if (r.missed.includes(i)) btn.classList.add('is-missed');
        else if (r.wrong.includes(i)) btn.classList.add('is-wrong');
    });
    document.getElementById('scene-check').classList.add('hidden');
    const feedback = document.getElementById('scene-feedback');
    feedback.classList.toggle('is-wrong', r.missed.length > 0 || r.wrong.length > 0);
    document.getElementById('scene-feedback-title').textContent = t('scene.result', {
        found: r.found.length, total: r.total, wrong: r.wrong.length, points: r.points
    });
    const list = document.getElementById('scene-feedback-list');
    list.innerHTML = '';
    const add = (key, i) => {
        const el = scene.elements[i];
        const li = document.createElement('li');
        li.textContent = t(key, { text: el.text, why: el.why });
        list.appendChild(li);
    };
    r.found.forEach(i => add('scene.found_item', i));
    r.missed.forEach(i => add('scene.missed_item', i));
    r.wrong.forEach(i => add('scene.wrong_item', i));
    const last = g.index + 1 >= g.rounds.length;
    const next = document.getElementById('scene-next');
    next.textContent = t(last ? 'scene.finish' : 'scene.next');
    feedback.classList.remove('hidden');
    next.focus();
}

function sceneContinue() {
    const g = sceneGame;
    if (!g || !g.resolved) return;
    if (ReflexionCore.sceneNext(g).includes('done')) { sceneFinish(); return; }
    sceneRender();
}

function sceneFinish() {
    const g = sceneGame;
    const weighted = arcadeWeighted('scene', g.score, g.difficulty);
    const best = arcadeRecord('scene', weighted.total);
    const found = g.results.reduce((n, r) => n + r.found, 0);
    const total = g.results.reduce((n, r) => n + r.total, 0);
    document.getElementById('scene-play').classList.add('hidden');
    document.getElementById('scene-status').textContent = '';
    document.getElementById('scene-over-text').textContent =
        t('scene.over_text', { found, total, score: g.score }) + weighted.note + ' ' + t('arcade.best', { score: best.scene });
    const list = document.getElementById('scene-over-list');
    list.innerHTML = '';
    g.results.forEach(r => {
        const li = document.createElement('li');
        li.textContent = t('scene.result_line', { title: r.title, found: r.found, total: r.total, wrong: r.wrong });
        list.appendChild(li);
    });
    renderArcadeDifficulty('scene', 'scene-difficulty-over');
    document.getElementById('scene-over').classList.remove('hidden');
}

// =====================================================================================================
// === PENDU DES DATES ===
// =====================================================================================================
let hangmanGame = null;
let hangmanReturn = 'screen-arcade';
let hangmanKeysBound = false;

function openHangman(fromScreen) {
    hangmanReturn = fromScreen || 'screen-arcade';
    showScreen('screen-hangman', 'forward');
    hangmanBindKeys();
    hangmanSetup();
}

// Avant la partie : le choix du niveau.
function hangmanSetup() {
    hangmanGame = null;
    document.getElementById('hangman-play').classList.add('hidden');
    document.getElementById('hangman-over').classList.add('hidden');
    document.getElementById('hangman-status').textContent = '';
    renderArcadeDifficulty('hangman');
    document.getElementById('hangman-setup').classList.remove('hidden');
}

function hangmanBack() {
    gamesBackTo(hangmanReturn);
}

function hangmanStart() {
    hangmanGame = ReflexionCore.createHangman(arcadePool(), undefined, undefined, { difficulty: arcadeDifficulty('hangman') });
    if (hangmanGame.empty) { alert(t('arcade.empty')); return; }
    document.getElementById('hangman-setup').classList.add('hidden');
    document.getElementById('hangman-over').classList.add('hidden');
    document.getElementById('hangman-play').classList.remove('hidden');
    hangmanRender();
}

function hangmanRenderStatus() {
    const g = hangmanGame;
    document.getElementById('hangman-status').textContent = t('hangman.status', { n: g.index + 1, total: g.questions.length, score: g.score });
}

function hangmanRenderLives() {
    const g = hangmanGame;
    const el = document.getElementById('hangman-lives');
    el.textContent = '♥'.repeat(g.lives) + '♡'.repeat(g.level.lives - g.lives);
    el.setAttribute('aria-label', t('hangman.lives', { lives: g.lives }));
}

// Les cases de l'année et le clavier de chiffres : un chiffre trouvé en vert (partout où il est), un chiffre raté en rouge.
function hangmanRender() {
    const g = hangmanGame;
    const q = ReflexionCore.hangmanQuestion(g);
    hangmanRenderStatus();
    hangmanRenderLives();
    document.getElementById('hangman-prompt').textContent = t('hangman.prompt', { title: q.event.title });
    document.getElementById('hangman-bc').classList.toggle('hidden', !q.bc);
    document.getElementById('hangman-feedback').classList.add('hidden');
    document.getElementById('hangman-hint').classList.add('hidden');
    document.getElementById('hangman-year').value = '';
    document.getElementById('hangman-year-bc').checked = false;
    hangmanRenderSlots();
    const pad = document.getElementById('hangman-pad');
    pad.innerHTML = '';
    for (let d = 0; d <= 9; d++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'arcade-key hangman-digit';
        btn.dataset.digit = String(d);
        btn.textContent = String(d);
        btn.setAttribute('aria-label', t('hangman.digit_aria', { digit: d }));
        btn.onclick = () => hangmanPick(String(d));
        pad.appendChild(btn);
    }
    hangmanSetFormDisabled(false);
    // Un chiffre déjà offert (facile) n'est plus à proposer.
    pad.querySelectorAll('.hangman-digit').forEach(btn => {
        if (g.guessed[btn.dataset.digit]) { btn.disabled = true; btn.classList.add('correct'); }
    });
}

function hangmanRenderSlots() {
    const box = document.getElementById('hangman-slots');
    box.innerHTML = '';
    ReflexionCore.hangmanSlots(hangmanGame).forEach(digit => {
        const slot = document.createElement('span');
        slot.className = 'hangman-slot' + (digit === null ? '' : ' is-found');
        slot.textContent = digit === null ? '_' : digit;
        if (digit === null) slot.setAttribute('aria-label', t('hangman.slot_empty'));
        box.appendChild(slot);
    });
}

function hangmanSetFormDisabled(disabled) {
    document.querySelectorAll('#hangman-pad .hangman-digit, #hangman-year, #hangman-year-bc, #hangman-try button').forEach(el => { el.disabled = disabled; });
}

function hangmanPick(digit) {
    const g = hangmanGame;
    const events = ReflexionCore.hangmanGuess(g, digit);
    if (!events.length) return;
    const btn = document.querySelector('#hangman-pad .hangman-digit[data-digit="' + digit + '"]');
    btn.disabled = true;
    btn.classList.add(events.includes('hit') ? 'correct' : 'wrong');
    arcadeSound(events.includes('hit') ? 'good' : 'bad');
    document.getElementById('hangman-hint').classList.add('hidden');
    hangmanRenderSlots();
    hangmanRenderLives();
    hangmanAfter();
}

// Une année entière : juste, la manche est gagnée ; fausse, une vie de moins et « plus tôt » ou « plus tard ».
function hangmanSubmit(event) {
    event.preventDefault();
    const g = hangmanGame;
    const raw = Number(document.getElementById('hangman-year').value);
    if (!Number.isInteger(raw) || raw < 1) return;
    const year = document.getElementById('hangman-year-bc').checked ? -raw : raw;
    const events = ReflexionCore.hangmanTryYear(g, year);
    if (!events.length) return;
    arcadeSound(events.includes('solved') ? 'good' : 'bad');
    const hint = document.getElementById('hangman-hint');
    if (events.includes('earlier') || events.includes('later')) {
        hint.textContent = t(events.includes('earlier') ? 'hangman.earlier' : 'hangman.later', { year: formatYear(year) });
        hint.classList.remove('hidden');
    }
    hangmanRenderSlots();
    hangmanRenderLives();
    hangmanAfter();
}

// Si la manche est résolue (gagnée ou perdue) : le détail, le bouton suivant.
function hangmanAfter() {
    const g = hangmanGame;
    if (!g.resolved) return;
    const q = ReflexionCore.hangmanQuestion(g);
    const result = g.results[g.results.length - 1];
    hangmanSetFormDisabled(true);
    hangmanRenderStatus();
    const feedback = document.getElementById('hangman-feedback');
    feedback.classList.toggle('is-wrong', g.resolved === 'lost');
    document.getElementById('hangman-feedback-title').textContent = g.resolved === 'solved' ? t('hangman.solved', { points: result.points }) : t('hangman.lost');
    document.getElementById('hangman-feedback-text').textContent = t('hangman.answer', { year: formatYear(q.event.date) });
    const last = g.index + 1 >= g.questions.length;
    const next = document.getElementById('hangman-next');
    next.textContent = t(last ? 'hangman.finish' : 'hangman.next');
    feedback.classList.remove('hidden');
    next.focus();
}

function hangmanContinue() {
    const g = hangmanGame;
    if (!g || !g.resolved) return;
    if (ReflexionCore.hangmanNext(g).includes('done')) { hangmanFinish(); return; }
    hangmanRender();
}

function hangmanFinish() {
    const g = hangmanGame;
    const weighted = arcadeWeighted('hangman', g.score, g.difficulty);
    const best = arcadeRecord('hangman', weighted.total);
    document.getElementById('hangman-play').classList.add('hidden');
    document.getElementById('hangman-status').textContent = '';
    document.getElementById('hangman-over-text').textContent =
        t('hangman.found', { found: g.found, total: g.questions.length, score: g.score }) + weighted.note + ' ' + t('arcade.best', { score: best.hangman });
    const list = document.getElementById('hangman-over-list');
    list.innerHTML = '';
    g.results.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r.solved
            ? t('hangman.result_found', { title: r.title, year: formatYear(r.date), points: r.points })
            : t('hangman.result_lost', { title: r.title, year: formatYear(r.date) });
        list.appendChild(li);
    });
    renderArcadeDifficulty('hangman', 'hangman-difficulty-over');
    document.getElementById('hangman-over').classList.remove('hidden');
}

// Au clavier : taper un chiffre le propose (sauf quand le champ « année entière » a le focus).
function hangmanBindKeys() {
    if (hangmanKeysBound) return;
    hangmanKeysBound = true;
    document.addEventListener('keydown', e => {
        if (!arcadeScreenVisible('screen-hangman') || !hangmanGame || hangmanGame.over || hangmanGame.resolved) return;
        if (document.activeElement && document.activeElement.id === 'hangman-year') return;
        if (/^[0-9]$/.test(e.key)) { e.preventDefault(); hangmanPick(e.key); }
    });
}
