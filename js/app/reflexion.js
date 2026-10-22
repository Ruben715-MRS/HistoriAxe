// =========================================================================
// === LES JEUX DE RÉFLEXION — MEMORY CHRONOLOGIQUE ET « QUI SUIS-JE ? » (écrans) ===
// =========================================================================
// Les règles sont dans js/reflexionCore.js (pur, testé) ; ici, les vivriers tirés du pack chargé, le dessin des cartes
// et des indices, et les écrans de fin. Les deux jeux se lancent depuis la salle de jeux (`screen-arcade`, voir
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
    memoryStart();
}

function memoryBack() {
    clearTimeout(memoryHideTimer);
    memoryHideTimer = 0;
    gamesBackTo(memoryReturn);
}

function memoryStart() {
    clearTimeout(memoryHideTimer);
    memoryHideTimer = 0;
    const game = ReflexionCore.createMemory(arcadePool());
    if (game.empty) { alert(t('arcade.empty')); return; }
    memoryGame = game;
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
    g.cards.forEach((card, i) => {
        const up = g.flipped.indexOf(i) !== -1 || g.matched[card.pair];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'memory-card' + (up ? ' is-up' : '') + (g.matched[card.pair] ? ' is-matched' : '') + (up ? ' is-' + card.side : '');
        if (!up) {
            btn.textContent = '?';
            btn.setAttribute('aria-label', t('memory.card_hidden', { n: i + 1 }));
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
    const best = arcadeRecord('memory', score);
    document.getElementById('memory-over-text').textContent =
        t('memory.over_text', { errors: g.errors, score }) + ' ' + t('arcade.best', { score: best.memory });
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

// Les figures à portrait du pack chargé. Les connues d'abord (incontournables de leur panthéon, ou citées par plusieurs
// thèmes) : un joueur ne devine pas un chef oorlam du XIXe siècle. Il faut aussi une notice, d'où viennent les indices.
function whoFigures() {
    const current = window.bdd || bdd || [];
    const size = current.length;
    if (whoFiguresCache && whoFiguresCache.bdd === current && whoFiguresCache.size === size) return whoFiguresCache;
    const raw = getAllEventsWithLocation().map(item => item.event);
    const candidates = GameModes.whoCandidates(raw).filter(e => portraitOf(e) && whoDescriptionLength(e) >= 80);
    const famous = new Set();
    PathCore.flattenEvents(current).forEach(item => { if (item.essential || item.fame >= 2) famous.add(item.id); });
    const known = candidates.filter(e => famous.has(e.id));
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
