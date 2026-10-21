// =========================================================================
// === LA ROUE DES FÊTES — MINI-JEU DU NIVEAU 4 DU MONDE 0 (« Calendriers et fêtes ») ===
// =========================================================================
// Un cercle découpé en douze parts (les douze mois d'un calendrier, écrits à plat sur la jante) et, dessous,
// les fêtes de ce calendrier dans le désordre. On touche une fête, puis la part du mois où elle tombe ; on peut
// faire tourner la roue (glisser horizontalement, flèches, clavier) pour lire les mois à l'endroit.
// Facultatif et à côté du niveau : il ne rapporte pas d'étoiles au Chemin et ne bloque rien. Données et règles :
// js/calendarWheel.js (pur, testé) ; ici, seulement l'écran.

const WHEEL_KEY = 'historiaxe_wheel_v1';
const WHEEL_SVG_NS = 'http://www.w3.org/2000/svg';
// Rayons (le viewBox est centré sur 0,0) : les fêtes posées vivent dans [WHEEL_R_IN, WHEEL_R_RIM], les mois
// sur la jante entre WHEEL_R_RIM et WHEEL_R_OUT.
const WHEEL_R_RIM = 150;
const WHEEL_R_OUT = 192;
const WHEEL_R_MONTH = 171;
const WHEEL_TOKEN_R = 12;
const WHEEL_DRAG_DEG_PER_PX = 0.6;
const WHEEL_DRAG_THRESHOLD_PX = 6;

let wheelCalendarId = 'chretien';
// Une partie par calendrier, gardée tant que l'appli reste ouverte : changer d'onglet ne fait rien perdre.
const wheelGames = {};
let wheelSelectedId = null;
let wheelDrag = null;
let wheelJustDragged = false;
let wheelSpinFrame = 0;
let wheelFeedbackTimer = 0;

function wheelProgress() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(WHEEL_KEY)); } catch (e) { raw = null; }
    return CalendarWheel.normalizeProgress(raw);
}

function wheelProgressSave(data) {
    try { localStorage.setItem(WHEEL_KEY, JSON.stringify(data)); } catch (e) {}
}

function wheelNewGame(calendar) {
    return {
        order: CalendarWheel.deal(calendar),
        placed: {},          // id de fête -> numéro du mois où elle a été posée
        misses: {},          // id de fête -> erreurs sur cette fête
        errors: 0,
        done: false,
        // La part du mois 1 est centrée en haut au départ (une part fait 30°).
        rot: -15
    };
}

function wheelGame() {
    const calendar = CalendarWheel.find(wheelCalendarId);
    if (!wheelGames[calendar.id]) wheelGames[calendar.id] = wheelNewGame(calendar);
    return wheelGames[calendar.id];
}

// --- Entrée et sortie -------------------------------------------------------
// `wheelReturn` : l'écran d'où l'on vient (le Chemin), pour y revenir.
let wheelReturn = 'screen-path';

function openWheel(fromScreen) {
    wheelReturn = fromScreen || 'screen-path';
    showScreen('screen-wheel', 'forward');
    wheelRenderAll();
}

function wheelBack() {
    wheelStopSpin();
    showScreen(wheelReturn, 'back');
    if (wheelReturn === 'screen-path' && typeof renderPath === 'function') renderPath();
}

function wheelSelectCalendar(id) {
    if (!CalendarWheel.find(id)) return;
    wheelCalendarId = id;
    wheelSelectedId = null;
    wheelHideFeedback();
    wheelRenderAll();
}

function wheelRestart() {
    const calendar = CalendarWheel.find(wheelCalendarId);
    wheelGames[calendar.id] = wheelNewGame(calendar);
    wheelSelectedId = null;
    wheelHideFeedback();
    wheelRenderAll();
}

function wheelNextCalendar() {
    const list = CalendarWheel.CALENDARS;
    const i = list.findIndex(c => c.id === wheelCalendarId);
    wheelSelectCalendar(list[(i + 1) % list.length].id);
}

// --- Rendu ------------------------------------------------------------------
function wheelEl(name, attrs) {
    const el = document.createElementNS(WHEEL_SVG_NS, name);
    Object.keys(attrs || {}).forEach(k => el.setAttribute(k, attrs[k]));
    return el;
}

function wheelPoint(radius, deg) {
    const a = deg * Math.PI / 180;
    return [radius * Math.sin(a), -radius * Math.cos(a)];
}

// Une part : de l'angle `a0` à `a1` (degrés, dans le sens horaire depuis le haut), du centre au rayon `r`.
function wheelWedge(r, a0, a1, rInner) {
    const [x0, y0] = wheelPoint(r, a0);
    const [x1, y1] = wheelPoint(r, a1);
    if (!rInner) return `M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
    const [x2, y2] = wheelPoint(rInner, a1);
    const [x3, y3] = wheelPoint(rInner, a0);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)} A${rInner} ${rInner} 0 0 0 ${x3.toFixed(2)} ${y3.toFixed(2)} Z`;
}

function wheelRenderAll() {
    wheelRenderTabs();
    wheelRenderHeader();
    wheelRenderWheel();
    wheelRenderCurrent();
    wheelRenderTray();
    wheelRenderDone();
}

function wheelRenderTabs() {
    const box = document.getElementById('wheel-tabs');
    const progress = wheelProgress();
    box.innerHTML = '';
    CalendarWheel.CALENDARS.forEach(c => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wheel-tab' + (c.id === wheelCalendarId ? ' is-active' : '');
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', c.id === wheelCalendarId ? 'true' : 'false');
        const done = progress[c.id];
        const icon = document.createElement('span');
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = c.icon;
        btn.appendChild(icon);
        btn.appendChild(document.createTextNode(' ' + c.short));
        if (done) {
            const stars = document.createElement('span');
            stars.className = 'wheel-tab-stars';
            stars.setAttribute('aria-label', t('wheel.tab_stars', { count: done.stars }));
            stars.textContent = ' ' + '★'.repeat(done.stars);
            btn.appendChild(stars);
        }
        btn.onclick = () => wheelSelectCalendar(c.id);
        box.appendChild(btn);
    });
}

function wheelRenderHeader() {
    const calendar = CalendarWheel.find(wheelCalendarId);
    const game = wheelGame();
    document.getElementById('wheel-intro').textContent = calendar.intro;
    document.getElementById('wheel-subtitle').textContent = t('wheel.progress', {
        placed: Object.keys(game.placed).length, total: calendar.events.length, errors: game.errors
    });
}

function wheelRenderWheel() {
    const calendar = CalendarWheel.find(wheelCalendarId);
    const game = wheelGame();
    const svg = document.getElementById('wheel-svg');
    svg.innerHTML = '';
    svg.setAttribute('aria-label', t('wheel.aria', { calendar: calendar.title }));

    const rot = wheelEl('g', { id: 'wheel-rot' });
    svg.appendChild(rot);

    calendar.months.forEach((name, i) => {
        const month = i + 1;
        const a0 = i * 30;
        const mid = a0 + 15;
        const group = wheelEl('g', { class: 'wheel-part', 'data-month': String(month) });

        const slice = wheelEl('path', {
            class: 'wheel-slice' + (i % 2 ? ' is-odd' : ''),
            d: wheelWedge(WHEEL_R_RIM, a0, a0 + 30),
            tabindex: '0',
            role: 'button',
            'aria-label': t('wheel.slice_aria', { month: name })
        });
        slice.onclick = () => wheelTapMonth(month);
        slice.onkeydown = e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wheelTapMonth(month); }
        };
        group.appendChild(slice);

        group.appendChild(wheelEl('path', { class: 'wheel-rim' + (i % 2 ? ' is-odd' : ''), d: wheelWedge(WHEEL_R_OUT, a0, a0 + 30, WHEEL_R_RIM) }));

        // Le nom du mois est posé à plat sur la jante : tangent au cercle, comme sur la roue en bois.
        const text = wheelEl('text', { class: 'wheel-month', transform: `rotate(${mid})`, x: '0', y: String(-WHEEL_R_MONTH), 'text-anchor': 'middle', 'dominant-baseline': 'central' });
        text.textContent = name;
        // La corde de la jante à ce rayon fait environ 88 : on réduit la police pour les noms longs.
        text.setAttribute('font-size', String(Math.max(9, Math.min(15, 84 / (name.length * 0.58)))));
        group.appendChild(text);

        // Les fêtes déjà posées dans cette part : des pastilles à l'emoji, redressées malgré la rotation.
        const here = calendar.events.filter(e => game.placed[e.id] === month);
        here.forEach((event, k) => {
            const radius = 50 + (k + 0.5) * (100 / here.length);
            const token = wheelEl('g', { class: 'wheel-token', transform: `rotate(${mid}) translate(0 ${-radius})`, tabindex: '0', role: 'button', 'aria-label': event.name + ' — ' + name });
            const upright = wheelEl('g', { class: 'wheel-upright', 'data-mid': String(mid) });
            upright.appendChild(wheelEl('circle', { r: String(WHEEL_TOKEN_R) }));
            const icon = wheelEl('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': '15' });
            icon.textContent = event.icon;
            upright.appendChild(icon);
            token.appendChild(upright);
            // Avec une fête choisie, un tap sur une pastille vaut un tap sur sa part (elles en occupent le centre) ;
            // sans fête choisie, il rouvre l'explication de la fête posée.
            const show = e => { e.stopPropagation(); if (wheelSelectedId) wheelTapMonth(month); else wheelShowEvent(event); };
            token.onclick = show;
            token.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(e); } };
            group.appendChild(token);
        });
        rot.appendChild(group);
    });

    // Le moyeu et le repère fixe du haut.
    svg.appendChild(wheelEl('circle', { class: 'wheel-hub', r: '9' }));
    svg.appendChild(wheelEl('path', { class: 'wheel-pointer', d: 'M-9 -200 L9 -200 L0 -188 Z' }));
    wheelApplyRotation();
}

function wheelApplyRotation() {
    const game = wheelGame();
    const rot = document.getElementById('wheel-rot');
    if (!rot) return;
    rot.setAttribute('transform', `rotate(${game.rot.toFixed(2)})`);
    rot.querySelectorAll('.wheel-upright').forEach(el => {
        el.setAttribute('transform', `rotate(${(-(Number(el.dataset.mid) + game.rot)).toFixed(2)})`);
    });
}

function wheelRenderCurrent() {
    const calendar = CalendarWheel.find(wheelCalendarId);
    const game = wheelGame();
    const box = document.getElementById('wheel-current');
    box.innerHTML = '';
    const event = wheelSelectedId ? CalendarWheel.findEvent(calendar, wheelSelectedId) : null;
    box.classList.toggle('hidden', game.done);
    if (game.done) return;
    if (!event) {
        box.textContent = t('wheel.pick');
        return;
    }
    const label = document.createElement('span');
    label.textContent = t('wheel.place');
    const strong = document.createElement('strong');
    strong.textContent = event.icon + ' ' + event.name;
    box.appendChild(label);
    box.appendChild(document.createTextNode(' '));
    box.appendChild(strong);
}

function wheelRenderTray() {
    const calendar = CalendarWheel.find(wheelCalendarId);
    const game = wheelGame();
    const tray = document.getElementById('wheel-tray');
    tray.innerHTML = '';
    const remaining = game.order.filter(id => game.placed[id] === undefined);
    document.getElementById('wheel-tray-label').classList.toggle('hidden', !remaining.length);
    remaining.forEach(id => {
        const event = CalendarWheel.findEvent(calendar, id);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wheel-chip' + (id === wheelSelectedId ? ' is-selected' : '');
        btn.setAttribute('aria-pressed', id === wheelSelectedId ? 'true' : 'false');
        const icon = document.createElement('span');
        icon.className = 'wheel-chip-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = event.icon;
        const label = document.createElement('span');
        label.className = 'wheel-chip-label';
        label.textContent = event.name;
        btn.appendChild(icon);
        btn.appendChild(label);
        if (event.local) {
            const local = document.createElement('span');
            local.className = 'wheel-chip-local';
            local.textContent = event.local;
            label.appendChild(local);
        }
        btn.onclick = () => wheelSelect(id);
        tray.appendChild(btn);
    });
}

function wheelRenderDone() {
    const calendar = CalendarWheel.find(wheelCalendarId);
    const game = wheelGame();
    const box = document.getElementById('wheel-done');
    box.classList.toggle('hidden', !game.done);
    if (!game.done) return;
    const stars = CalendarWheel.starsFor(game.errors);
    document.getElementById('wheel-done-stars').textContent = '★'.repeat(stars) + '☆'.repeat(CalendarWheel.MAX_STARS - stars);
    document.getElementById('wheel-done-text').textContent = t('wheel.done', { calendar: calendar.title, errors: game.errors });
}

// --- Jeu ----------------------------------------------------------------------
function wheelSelect(id) {
    wheelSelectedId = wheelSelectedId === id ? null : id;
    wheelRenderCurrent();
    wheelRenderTray();
}

function wheelTapMonth(month) {
    // Un glissement qui fait tourner la roue ne doit pas compter comme un tap sur la part sous le doigt.
    if (wheelJustDragged) { wheelJustDragged = false; return; }
    const calendar = CalendarWheel.find(wheelCalendarId);
    const game = wheelGame();
    if (game.done) return;
    const monthName = calendar.months[month - 1];
    const event = wheelSelectedId ? CalendarWheel.findEvent(calendar, wheelSelectedId) : null;
    if (!event) {
        wheelShowFeedback(t('wheel.pick_first', { month: monthName }), true);
        return;
    }
    if (CalendarWheel.accepts(event, month)) {
        game.placed[event.id] = month;
        if (typeof playCorrectSound === 'function') playCorrectSound(1.0);
        if (typeof triggerHaptic === 'function') triggerHaptic('success');
        const left = game.order.filter(id => game.placed[id] === undefined);
        wheelSelectedId = left.length ? left[0] : null;
        if (!left.length) wheelFinish(calendar, game);
        wheelRenderAll();
        wheelShowEvent(event, true);
        return;
    }
    game.errors += 1;
    game.misses[event.id] = (game.misses[event.id] || 0) + 1;
    if (typeof playWrongSound === 'function') playWrongSound();
    if (typeof triggerHaptic === 'function') triggerHaptic('error');
    // Après deux ratés sur la même fête, on donne sa date : c'est une explication, pas la réponse du jeu.
    const message = game.misses[event.id] >= 2
        ? t('wheel.wrong_hint', { event: event.name, month: monthName, when: event.when })
        : t('wheel.wrong', { event: event.name, month: monthName });
    wheelRenderHeader();
    wheelShowFeedback(message, true);
}

function wheelFinish(calendar, game) {
    game.done = true;
    wheelProgressSave(CalendarWheel.recordResult(wheelProgress(), calendar.id, game.errors));
}

// Une fête posée : son nom, sa date et ce qu'on y célèbre (après chaque bonne réponse, ou au toucher d'une pastille).
function wheelShowEvent(event, justPlaced) {
    const title = (justPlaced ? '✓ ' : '') + event.icon + ' ' + event.name + (event.local ? ' (' + event.local + ')' : '');
    wheelShowFeedback(title + ' — ' + event.when + '. ' + event.explain, false);
}

function wheelShowFeedback(message, wrong) {
    const box = document.getElementById('wheel-feedback');
    box.textContent = message;
    box.classList.toggle('is-wrong', !!wrong);
    box.classList.remove('hidden');
    clearTimeout(wheelFeedbackTimer);
    // Une erreur s'efface seule ; l'explication d'une fête reste, le temps de la lire.
    if (wrong) wheelFeedbackTimer = setTimeout(wheelHideFeedback, 5000);
}

function wheelHideFeedback() {
    clearTimeout(wheelFeedbackTimer);
    const box = document.getElementById('wheel-feedback');
    if (box) box.classList.add('hidden');
}

// --- Rotation -----------------------------------------------------------------
function wheelStopSpin() {
    if (wheelSpinFrame) cancelAnimationFrame(wheelSpinFrame);
    wheelSpinFrame = 0;
}

// Tourne de `deg` degrés, en douceur (d'un coup si « réduire les animations » est demandé).
function wheelSpin(deg) {
    const game = wheelGame();
    wheelStopSpin();
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { game.rot += deg; wheelApplyRotation(); return; }
    const from = game.rot;
    const start = performance.now();
    const duration = 260;
    const step = now => {
        const k = Math.min(1, (now - start) / duration);
        game.rot = from + deg * (1 - Math.pow(1 - k, 3));
        wheelApplyRotation();
        wheelSpinFrame = k < 1 ? requestAnimationFrame(step) : 0;
    };
    wheelSpinFrame = requestAnimationFrame(step);
}

function wheelResetRotation() {
    const game = wheelGame();
    const turns = Math.round((game.rot + 15) / 360);
    wheelSpin(-15 + turns * 360 - game.rot);
}

// Glisser horizontalement fait tourner la roue ; le verticalement reste au défilement de la page (le CSS
// laisse `pan-y` au navigateur). On n'utilise pas la capture du pointeur : elle détournerait le clic de la part.
function wheelPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    wheelStopSpin();
    wheelJustDragged = false;
    wheelDrag = { x: e.clientX, rot: wheelGame().rot, moved: false };
}

function wheelPointerMove(e) {
    if (!wheelDrag) return;
    const dx = e.clientX - wheelDrag.x;
    if (!wheelDrag.moved && Math.abs(dx) < WHEEL_DRAG_THRESHOLD_PX) return;
    wheelDrag.moved = true;
    wheelGame().rot = wheelDrag.rot + dx * WHEEL_DRAG_DEG_PER_PX;
    wheelApplyRotation();
}

function wheelPointerUp() {
    if (wheelDrag && wheelDrag.moved) {
        wheelJustDragged = true;
        // Le clic qui suit un glissement est ignoré une fois ; si aucun clic ne vient, on lève le drapeau.
        setTimeout(() => { wheelJustDragged = false; }, 60);
    }
    wheelDrag = null;
}

function wheelKeyDown(e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); wheelSpin(-30); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); wheelSpin(30); }
}

function wheelInit() {
    const stage = document.getElementById('wheel-stage');
    if (!stage || stage.dataset.ready) return;
    stage.dataset.ready = '1';
    stage.addEventListener('pointerdown', wheelPointerDown);
    window.addEventListener('pointermove', wheelPointerMove);
    window.addEventListener('pointerup', wheelPointerUp);
    window.addEventListener('pointercancel', wheelPointerUp);
    stage.addEventListener('keydown', wheelKeyDown);
}

document.addEventListener('DOMContentLoaded', wheelInit);
