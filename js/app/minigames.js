// =========================================================================
// === LES MINI-JEUX DU COURS — SIÈCLES EN CHIFFRES ROMAINS ET CALENDRIER DE L'AVENT HISTORIQUE (écrans) ===
// =========================================================================
// Les règles sont dans js/minigamesCore.js (pur, testé), le contenu de l'Avent dans js/adventContent.js. Les deux jeux se lancent
// depuis la salle de jeux (`screen-arcade`) et lui rendent la main ; les siècles romains sont aussi proposés dans la fiche du niveau 5
// du Monde 0. En décembre, la case du jour s'affiche sur l'écran des catégories (`adventHomeCard`, appelée par js/app/path.js).

const ADVENT_KEY = 'historiaxe_advent_v1';

// =====================================================================================================
// === SIÈCLES EN CHIFFRES ROMAINS ===
// =====================================================================================================
let romanGame = null;
let romanReturn = 'screen-arcade';

function openRoman(fromScreen) {
    romanReturn = fromScreen || 'screen-arcade';
    showScreen('screen-roman', 'forward');
    romanStart();
}

function romanBack() {
    gamesBackTo(romanReturn);
}

function romanStart() {
    romanGame = MiniGamesCore.createRoman();
    document.getElementById('roman-over').classList.add('hidden');
    document.getElementById('roman-play').classList.remove('hidden');
    romanRender();
}

function romanRenderStatus() {
    const g = romanGame;
    document.getElementById('roman-status').textContent = t('roman.status', { n: g.index + 1, total: g.questions.length, score: g.score });
}

function romanRender() {
    const g = romanGame;
    const q = MiniGamesCore.romanQuestion(g);
    romanRenderStatus();
    document.getElementById('roman-feedback').classList.add('hidden');
    const numeral = document.getElementById('roman-numeral');
    numeral.classList.toggle('hidden', q.type !== 'numeral');
    numeral.textContent = q.type === 'numeral' ? q.roman : '';
    const prompt = q.type === 'numeral' ? t('roman.ask_numeral')
        : q.type === 'span' ? t('roman.ask_span', { label: q.label })
        : q.type === 'which' ? t('roman.ask_which', { year: q.yearText, label: q.label })
        : t('roman.ask_order');
    document.getElementById('roman-prompt').textContent = prompt;
    const box = document.getElementById('roman-options');
    box.innerHTML = '';
    if (q.type === 'order') {
        // Les siècles, mêlés : on les touche du plus ancien au plus récent ; chacun reçoit son numéro d'ordre.
        q.items.forEach((item, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quiz-option cause-card roman-tile';
            btn.dataset.item = String(i);
            btn.textContent = item.name;
            btn.onclick = () => romanTapItem(i);
            box.appendChild(btn);
        });
    } else {
        q.options.forEach((text, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quiz-option cause-card';
            btn.dataset.choice = String(i);
            btn.textContent = text;
            btn.onclick = () => romanChoose(i);
            box.appendChild(btn);
        });
    }
}

function romanShowFeedback(q) {
    const g = romanGame;
    const right = g.resolved === 'right';
    const feedback = document.getElementById('roman-feedback');
    feedback.classList.toggle('is-wrong', !right);
    const result = g.results[g.results.length - 1];
    let title;
    if (q.type === 'order') title = right ? t('roman.order_done', { points: result.points }) : t('roman.order_errors', { errors: g.errors, points: result.points });
    else title = t(right ? 'roman.right' : 'roman.wrong');
    document.getElementById('roman-feedback-title').textContent = title;
    document.getElementById('roman-feedback-text').textContent = q.explain;
    const last = g.index + 1 >= g.questions.length;
    const next = document.getElementById('roman-next');
    next.textContent = t(last ? 'roman.finish' : 'roman.next');
    next.classList.remove('hidden');
    feedback.classList.remove('hidden');
    romanRenderStatus();
    next.focus();
}

function romanChoose(choice) {
    const g = romanGame;
    const events = MiniGamesCore.romanAnswer(g, choice);
    if (!events.length) return;
    const q = MiniGamesCore.romanQuestion(g);
    arcadeSound(g.resolved === 'right' ? 'good' : 'bad');
    document.querySelectorAll('#roman-options .quiz-option').forEach(btn => {
        const i = Number(btn.dataset.choice);
        btn.disabled = true;
        if (i === q.answer) btn.classList.add('correct');
        else if (i === choice) btn.classList.add('wrong');
    });
    romanShowFeedback(q);
}

function romanTapItem(item) {
    const g = romanGame;
    const q = MiniGamesCore.romanQuestion(g);
    const events = MiniGamesCore.romanTap(g, item);
    if (!events.length) return;
    const btn = document.querySelector('#roman-options .roman-tile[data-item="' + item + '"]');
    if (events.includes('miss')) {
        arcadeSound('bad');
        btn.classList.add('wrong');
        setTimeout(() => btn.classList.remove('wrong'), 600);
        romanMiss();
        return;
    }
    arcadeSound('good');
    btn.classList.add('correct');
    btn.disabled = true;
    // Le rang attribué : 1, 2, 3, 4.
    btn.textContent = g.progress + '. ' + q.items[item].name;
    document.getElementById('roman-feedback').classList.add('hidden');
    if (events.includes('done')) romanShowFeedback(q);
}

// Un mauvais siècle touché : un message dans le cadre de retour d'information, sans bouton « suivant ».
function romanMiss() {
    const box = document.getElementById('roman-feedback');
    box.classList.add('is-wrong');
    box.classList.remove('hidden');
    document.getElementById('roman-feedback-title').textContent = t('roman.order_miss');
    document.getElementById('roman-feedback-text').textContent = '';
    document.getElementById('roman-next').classList.add('hidden');
}

function romanContinue() {
    const g = romanGame;
    if (!g || !g.resolved) return;
    document.getElementById('roman-next').classList.remove('hidden');
    if (MiniGamesCore.romanNext(g).includes('done')) { romanFinish(); return; }
    romanRender();
}

function romanFinish() {
    const g = romanGame;
    const best = arcadeRecord('roman', g.score);
    document.getElementById('roman-play').classList.add('hidden');
    document.getElementById('roman-status').textContent = '';
    document.getElementById('roman-over-text').textContent =
        t('roman.found', { found: g.found, total: g.questions.length, score: g.score }) + ' ' + t('arcade.best', { score: best.roman });
    document.getElementById('roman-over').classList.remove('hidden');
}

// =====================================================================================================
// === CALENDRIER DE L'AVENT HISTORIQUE ===
// =====================================================================================================
let adventReturn = 'screen-arcade';
let adventSelected = null;

// La date d'aujourd'hui : une fonction à part, que les tests remplacent pour jouer « un 12 décembre ».
function adventNow() {
    return new Date();
}

function adventProgress() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(ADVENT_KEY)); } catch (e) { raw = null; }
    return MiniGamesCore.normalizeAdvent(raw);
}

function adventProgressSave(data) {
    try { localStorage.setItem(ADVENT_KEY, JSON.stringify(data)); } catch (e) {}
}

function adventYear() {
    return adventNow().getFullYear();
}

// L'état d'une case : 'locked', 'right', 'wrong' ou 'open' (pas encore ouverte).
function adventState(day) {
    if (!MiniGamesCore.adventOpen(day, adventNow())) return 'locked';
    const days = adventProgress()[String(adventYear())] || {};
    if (days[day] === undefined) return 'open';
    return days[day] ? 'right' : 'wrong';
}

function openAdvent(fromScreen, day) {
    adventReturn = fromScreen || 'screen-arcade';
    adventSelected = null;
    showScreen('screen-advent', 'forward');
    adventRender();
    if (day) adventOpenCase(day);
}

function adventBack() {
    gamesBackTo(adventReturn);
}

function adventRender() {
    const counts = MiniGamesCore.adventCounts(adventProgress(), adventYear());
    document.getElementById('advent-status').textContent = t('advent.status', counts);
    document.getElementById('advent-rule').textContent = t(MiniGamesCore.adventToday(adventNow()) === null ? 'advent.rule_practice' : 'advent.rule_december');
    const grid = document.getElementById('advent-grid');
    grid.innerHTML = '';
    for (let day = 1; day <= MiniGamesCore.ADVENT_DAYS; day++) {
        const state = adventState(day);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'advent-day is-' + state + (day === adventSelected ? ' is-selected' : '');
        btn.dataset.day = String(day);
        btn.textContent = state === 'locked' ? '🔒' : state === 'right' ? '✓' : state === 'wrong' ? '✗' : String(day);
        btn.setAttribute('aria-label', t(state === 'locked' ? 'advent.day_locked' : state === 'right' ? 'advent.day_done' : state === 'wrong' ? 'advent.day_missed' : 'advent.day_aria', { day }));
        if (state === 'right' || state === 'wrong') {
            const num = document.createElement('small');
            num.textContent = String(day);
            btn.appendChild(num);
        }
        btn.onclick = () => adventOpenCase(day);
        grid.appendChild(btn);
    }
}

// Ouvre une case : la question si elle est à ouvrir, sa réponse si elle l'est déjà, un message si elle est fermée.
function adventOpenCase(day) {
    adventSelected = day;
    adventRender();
    const item = MiniGamesCore.adventContent(day);
    const panel = document.getElementById('advent-case');
    panel.classList.remove('hidden');
    const state = adventState(day);
    document.getElementById('advent-case-title').textContent = t('advent.case_title', { icon: item.icon, day });
    const question = document.getElementById('advent-case-question');
    const options = document.getElementById('advent-options');
    const feedback = document.getElementById('advent-feedback');
    options.innerHTML = '';
    feedback.classList.add('hidden');
    if (state === 'locked') {
        question.textContent = t('advent.locked', { day });
        return;
    }
    question.textContent = t('advent.question', { title: item.title });
    if (state === 'right' || state === 'wrong') {
        // Case déjà ouverte : on ne rejoue pas pour corriger, on relit.
        adventShowAnswer(item, state === 'right', true);
        return;
    }
    const q = MiniGamesCore.adventQuestion(day, adventYear());
    q.options.forEach(year => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option advent-option';
        btn.dataset.year = String(year);
        btn.textContent = formatYear(year);
        btn.onclick = () => adventAnswer(day, year);
        options.appendChild(btn);
    });
}

function adventShowAnswer(item, right, already) {
    const feedback = document.getElementById('advent-feedback');
    feedback.classList.toggle('is-wrong', !right);
    document.getElementById('advent-feedback-title').textContent = already
        ? t('advent.closed', { result: t(right ? 'advent.closed_right' : 'advent.closed_wrong') })
        : t(right ? 'advent.right' : 'advent.wrong');
    document.getElementById('advent-feedback-text').textContent = t('advent.answer', { year: formatYear(item.year) }) + ' ' + item.explain;
    feedback.classList.remove('hidden');
}

function adventAnswer(day, year) {
    if (adventState(day) !== 'open') return;
    const item = MiniGamesCore.adventContent(day);
    const right = year === item.year;
    adventProgressSave(MiniGamesCore.adventRecord(adventProgress(), adventYear(), day, right));
    arcadeSound(right ? 'good' : 'bad');
    document.querySelectorAll('#advent-options .advent-option').forEach(btn => {
        const y = Number(btn.dataset.year);
        btn.disabled = true;
        if (y === item.year) btn.classList.add('correct');
        else if (y === year) btn.classList.add('wrong');
    });
    adventShowAnswer(item, right, false);
    // La grille et le compteur suivent ; la case reste ouverte sur sa réponse.
    const counts = MiniGamesCore.adventCounts(adventProgress(), adventYear());
    document.getElementById('advent-status').textContent = t('advent.status', counts);
    const cell = document.querySelector('#advent-grid .advent-day[data-day="' + day + '"]');
    if (cell) {
        cell.className = 'advent-day is-' + (right ? 'right' : 'wrong') + ' is-selected';
        cell.textContent = right ? '✓' : '✗';
        const num = document.createElement('small');
        num.textContent = String(day);
        cell.appendChild(num);
    }
}

// La carte de l'écran des catégories : en décembre seulement, une pour chaque jour — son emoji, son titre, sa couleur (une teinte
// différente chaque jour) et le compte à rebours de Noël. Elle ouvre la case du jour.
function adventHomeCard() {
    const day = MiniGamesCore.adventToday(adventNow());
    if (day === null) return null;
    const item = MiniGamesCore.adventContent(day);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'resume-card advent-card';
    card.id = 'btn-advent';
    card.style.setProperty('--advent-hue', String((day * 37) % 360));
    const icon = document.createElement('span');
    icon.className = 'resume-card-icon advent-card-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = item.icon;
    const text = document.createElement('span');
    text.className = 'resume-card-text';
    const kicker = document.createElement('small');
    kicker.className = 'resume-card-kicker';
    // Noël est le 25 : le 24, il reste un jour ; le 25, c'est Noël ; ensuite, la semaine entre Noël et le Nouvel An.
    const countdown = day <= 24 ? t('advent.home_countdown', { n: 25 - day }) : day === 25 ? t('advent.home_christmas') : t('advent.home_after');
    kicker.textContent = t('advent.home_kicker', { day }) + ' · ' + countdown;
    const title = document.createElement('strong');
    title.className = 'resume-card-title';
    const state = adventState(day);
    title.textContent = item.title + ' — ' + (state === 'open' ? t('advent.home_open') : t('advent.home_done'));
    text.appendChild(kicker);
    text.appendChild(title);
    card.appendChild(icon);
    card.appendChild(text);
    card.onclick = () => openAdvent('screen-categories', day);
    return card;
}
