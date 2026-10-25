// =========================================================================
// === LE QUIZ DES PAYS (écran de jeu, lancé depuis l'Atlas des pays ou la Salle de jeux) ===
// =========================================================================
// Un menu de RÉGLAGES (zone, difficulté, nombre de questions, chrono) puis quatre formes de jeu, un même écran, un même score :
//   - QCM : un ou deux indices (capitale, monnaie…), quatre réponses (startGeoQuizForm('qcm')) ;
//   - « Drapeau → pays » : un drapeau, quatre noms ('flag') ;
//   - « Touche le pays » : le nom d'un pays, et une carte du monde à toucher ('map') ;
//   - « Panaché » : les trois formes mélangées dans une même partie ('mix'). Chaque question porte sa forme (q.kind).
// Les questions viennent de GeoQuizCore (js/geoQuizCore.js) ; la partie (jeu de pays, mélange, points, records) de GeoQuizSessionCore
// (js/geoQuizSessionCore.js). Sans chrono par défaut : c'est d'abord un entraînement. Avec un chrono, la vitesse rapporte des points ;
// un temps écoulé compte comme une erreur.
// Les records et l'historique sont enregistrés (js/storage.js : geoQuizStateSave) et synchronisés avec le compte ; les réglages restent
// sur l'appareil. À la fin d'une partie, les erreurs sont listées et peuvent être rejouées (partie de révision : rien n'est enregistré).
//
// LA CARTE du quiz n'est pas celle de l'Atlas : elle n'a ni couche de noms ni police, donc aucun nom de pays ne peut y apparaître
// avant la réponse. Les contours viennent de countriesData.geo (local, hors ligne). Contenu en français et en anglais. Tout ce qui vient
// des données passe par textContent, jamais par du HTML.

// Neutre : une couleur par continent donnerait l'indice qu'on cherche.
const GEOQUIZ_FILL = { light: '#dfe6ee', dark: '#334155' };
const GEOQUIZ_TARGET = { light: '#f59e0b', dark: '#f2c14e' };
const GEOQUIZ_WORLD = [[-170, -58], [190, 78]];
const GEOQUIZ_RECENT = 10;         // parties récentes montrées dans « Mes scores »

let geoQuizForm = 'qcm';           // 'qcm' | 'flag' | 'map' | 'mix'
let geoQuizPrefs = null;           // les réglages du menu (chargés à l'ouverture)
let geoQuizGamePrefs = null;       // les réglages de la partie en cours (ils ne changent pas en cours de partie)
let geoQuizReturn = 'screen-tool-countries';   // l'écran où le menu a été ouvert (Atlas des pays, ou Salle de jeux)
let geoQuizQuestions = [];
let geoQuizIndex = 0;
let geoQuizAnswers = [];           // une entrée par question jouée : { ok, points, q, summary, correctText, givenText }
let geoQuizStreak = 0;
let geoQuizReview = false;         // partie de révision (« Rejouer mes erreurs ») : ni record ni historique
let geoQuizAnswered = false;
let geoQuizTimerSeconds = 0;       // 0 : sans chrono
let geoQuizTimerId = null;
let geoQuizTimerStart = 0;
let geoQuizMap = null;
let geoQuizMapReady = false;
let geoQuizOnReady = [];           // actions à faire une fois la carte chargée (surlignage après une réponse)

function geoQuizEl(id) { return document.getElementById(id); }

// Le menu s'ouvre depuis l'Atlas des pays ou la Salle de jeux ; « Retour » y ramène.
function openGeoQuizMenu(from) {
    geoQuizReturn = from || 'screen-tool-countries';
    showScreen('screen-geoquiz', 'forward');
    geoQuizShowMenu();
}

function geoQuizShowPanel(id) {
    ['geoquiz-menu', 'geoquiz-scores', 'geoquiz-play', 'geoquiz-end'].forEach(p => geoQuizEl(p).classList.toggle('hidden', p !== id));
}

function geoQuizShowMenu() {
    geoQuizStopTimer();
    geoQuizEl('geoquiz-status').textContent = '';
    geoQuizShowPanel('geoquiz-menu');
    geoQuizRenderSettings();
}

// --- Les réglages ------------------------------------------------------------------------------

function geoQuizPrefsNow() {
    if (!geoQuizPrefs) geoQuizPrefs = geoQuizPrefsLoad();
    return geoQuizPrefs;
}

function geoQuizRenderSettings() {
    const prefs = geoQuizPrefsNow();
    const core = GeoQuizSessionCore;
    geoQuizFillChips('geoquiz-zone', core.ZONES.map(z => ({ value: z.key, label: t('geoquiz.zone_' + z.key) })), 'zone', prefs.zone);
    geoQuizFillChips('geoquiz-level', Object.keys(core.LEVELS).map(k => ({ value: k, label: t('geoquiz.level_' + k) })), 'level', prefs.level);
    geoQuizEl('geoquiz-level-hint').textContent = t('geoquiz.level_' + prefs.level + '_hint');
    geoQuizFillChips('geoquiz-length', core.LENGTHS.map(n => ({ value: n, label: String(n) })), 'length', prefs.length);
    geoQuizFillChips('geoquiz-timer-choice', core.TIMERS.map(s => ({ value: s, label: t('geoquiz.timer_' + s) })), 'timer', prefs.timer);
}

function geoQuizFillChips(id, items, key, current) {
    geoQuizEl(id).replaceChildren(...items.map(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'geoquiz-chip';
        btn.dataset.pref = key;
        btn.textContent = item.label;
        btn.setAttribute('aria-pressed', item.value === current ? 'true' : 'false');
        btn.onclick = () => geoQuizSetPref(key, item.value);
        return btn;
    }));
}

function geoQuizSetPref(key, value) {
    geoQuizPrefs = GeoQuizSessionCore.normalizePrefs(Object.assign({}, geoQuizPrefsNow(), { [key]: value }));
    geoQuizPrefsSave(geoQuizPrefs);
    geoQuizRenderSettings();
    // Le menu a été redessiné : le clavier reste sur le choix qu'on vient de faire.
    const kept = document.querySelector('#geoquiz-menu .geoquiz-chip[data-pref="' + key + '"][aria-pressed="true"]');
    if (kept) kept.focus({ preventScroll: true });
}

// --- Une partie ---------------------------------------------------------------------------------

function startGeoQuizForm(form) { geoQuizBegin(GeoQuizSessionCore.FORMS.indexOf(form) === -1 ? 'qcm' : form, null); }

function geoQuizReplay() { geoQuizBegin(geoQuizForm, null); }

// « Rejouer mes erreurs » : les questions ratées, dans l'ordre, sans enregistrer la partie.
function geoQuizReplayErrors() {
    const missed = geoQuizAnswers.filter(a => !a.ok).map(a => a.q);
    if (!missed.length) return;
    geoQuizBegin(geoQuizForm, missed);
}

// `review` : les questions d'une partie de révision, ou null pour tirer une nouvelle partie.
function geoQuizBegin(form, review) {
    geoQuizStopTimer();
    geoQuizForm = form;
    geoQuizReview = !!review;
    geoQuizGamePrefs = Object.assign({}, geoQuizPrefsNow());
    geoQuizTimerSeconds = review ? 0 : geoQuizGamePrefs.timer;
    showScreen('screen-geoquiz', 'forward');
    geoQuizShowPanel(null);
    const status = geoQuizEl('geoquiz-status');
    status.textContent = t('tools.countries_loading');
    const wantsMap = review ? review.some(q => q.kind === 'map') : (form === 'map' || form === 'mix');
    const library = wantsMap ? atlasLoadLibrary() : Promise.resolve(true);
    Promise.all([countriesLoad(), library]).then(([ok, libOk]) => {
        if (!ok) { status.textContent = t('tools.countries_error'); return; }
        // Sans carte (bibliothèque absente ou pas de WebGL), le panaché se joue sans la forme « carte » ; les autres formes qui en ont besoin s'arrêtent.
        const mapOk = !wantsMap || (libOk && !!geoQuizEnsureMap());
        if (!mapOk && form !== 'mix') { status.textContent = libOk ? t('tools.countries_no_webgl') : t('tools.countries_no_map'); return; }
        let questions;
        if (review) {
            questions = review.map(q => Object.assign({}, q));
        } else {
            const opts = form === 'mix' && !mapOk ? { kinds: ['qcm', 'flag'] } : {};
            questions = GeoQuizSessionCore.generateGame(countriesData.facts, form, geoQuizGamePrefs, opts).questions;
        }
        if (!questions.length) { status.textContent = t('geoquiz.none'); return; }
        status.textContent = '';
        geoQuizQuestions = questions;
        geoQuizIndex = 0;
        geoQuizAnswers = [];
        geoQuizStreak = 0;
        geoQuizShowPanel('geoquiz-play');
        geoQuizRender();
    });
}

function geoQuizScoreNow() { return geoQuizAnswers.reduce((sum, a) => sum + a.points, 0); }

function geoQuizUpdateHead() {
    geoQuizEl('geoquiz-progress').textContent = t('geoquiz.progress', { n: geoQuizIndex + 1, total: geoQuizQuestions.length });
    geoQuizEl('geoquiz-points').textContent = t('geoquiz.points_label', { score: geoQuizScoreNow() });
}

function geoQuizRender() {
    const q = geoQuizQuestions[geoQuizIndex];
    const locate = q.kind === 'map';
    geoQuizAnswered = false;
    geoQuizUpdateHead();
    geoQuizEl('geoquiz-feedback').textContent = '';
    geoQuizEl('geoquiz-next').classList.add('hidden');
    geoQuizEl('geoquiz-qcm').classList.toggle('hidden', locate);
    geoQuizEl('geoquiz-locate').classList.toggle('hidden', !locate);
    if (locate) {
        geoQuizRenderLocate(q);
    } else {
        // Espace insécable avant « ? » : le point d'interrogation ne passe pas seul à la ligne.
        geoQuizEl('geoquiz-ask').textContent = t('geoquiz.ask_' + q.ask).replace(' ?', '\u00A0?');
        geoQuizEl('geoquiz-clues').replaceChildren(...q.clues.map(clue => {
            const li = document.createElement('li');
            if (clue.key === 'flag') {
                // Le drapeau seul, en grand : pas de libellé à lire avant l'emoji.
                li.className = 'geoquiz-flag';
                li.textContent = clue.value;
            } else {
                li.textContent = t('geoquiz.clue_' + clue.key) + ' : ' + clue.value;
            }
            return li;
        }));
        geoQuizEl('geoquiz-options').replaceChildren(...q.options.map((o, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quiz-option';
            btn.textContent = geoQuizLabel(q.ask, o.value);
            btn.onclick = () => geoQuizAnswer(i);
            return btn;
        }));
    }
    geoQuizStartTimer();
}

// Une réponse telle qu'on la lit : la population en lettres (« 68,4 millions »), le reste tel quel.
function geoQuizLabel(ask, value) {
    return ask === 'pop' ? t('geoquiz.pop_label', { n: CountriesCore.formatPopulation(value) }) : value;
}

// La question en une ligne, pour la liste des erreurs.
function geoQuizSummary(q) {
    if (q.kind === 'map') return t('geoquiz.summary_locate', { name: q.clues[0].value });
    if (q.clues.length === 1 && q.clues[0].key === 'flag') return t('geoquiz.summary_flag', { flag: q.clues[0].value });
    return t('geoquiz.ask_' + q.ask) + ' ' + q.clues.map(c => t('geoquiz.clue_' + c.key) + ' : ' + c.value).join(' ; ');
}

// --- Le chrono ----------------------------------------------------------------------------------

function geoQuizStartTimer() {
    geoQuizStopTimer();
    const box = geoQuizEl('geoquiz-timer');
    box.classList.toggle('hidden', !geoQuizTimerSeconds);
    if (!geoQuizTimerSeconds) return;
    geoQuizTimerStart = performance.now();
    geoQuizTimerTick();
    geoQuizTimerId = setInterval(geoQuizTimerTick, 100);
}

function geoQuizStopTimer() {
    if (geoQuizTimerId !== null) clearInterval(geoQuizTimerId);
    geoQuizTimerId = null;
}

// La part du temps qui reste, de 1 à 0.
function geoQuizRemaining() {
    if (!geoQuizTimerSeconds) return null;
    const elapsed = (performance.now() - geoQuizTimerStart) / 1000;
    return Math.max(0, Math.min(1, 1 - elapsed / geoQuizTimerSeconds));
}

function geoQuizTimerTick() {
    const remaining = geoQuizRemaining();
    if (remaining === null) return;
    const seconds = Math.ceil(remaining * geoQuizTimerSeconds);
    geoQuizEl('geoquiz-timer-fill').style.width = (remaining * 100).toFixed(1) + '%';
    geoQuizEl('geoquiz-timer-text').textContent = t('geoquiz.timer_seconds', { n: seconds });
    geoQuizEl('geoquiz-timer').setAttribute('aria-valuenow', String(Math.round(remaining * 100)));
    geoQuizEl('geoquiz-timer').classList.toggle('is-low', remaining <= 0.25);
    if (remaining <= 0 && !geoQuizAnswered) geoQuizTimeout();
}

// Le temps est écoulé : une erreur, sans réponse donnée ; la bonne réponse s'affiche.
function geoQuizTimeout() {
    if (geoQuizAnswered) return;
    const q = geoQuizQuestions[geoQuizIndex];
    const feedback = geoQuizEl('geoquiz-feedback');
    if (q.kind === 'map') {
        const target = countriesData.byId.get(q.target);
        const tiny = CountriesCore.isTiny(countriesData.prepared.get(q.target));
        geoQuizSettle(false, { summary: geoQuizSummary(q), correctText: target.n, givenText: null });
        geoQuizWhenReady(() => geoQuizSetHighlight(q.target, tiny, null));
        feedback.textContent = t('geoquiz.locate_timeout', { answer: target.n });
    } else {
        const buttons = Array.from(document.querySelectorAll('#geoquiz-options .quiz-option'));
        const correct = q.options.findIndex(o => o.id === q.target);
        buttons.forEach((b, k) => { b.disabled = true; if (k === correct) b.classList.add('correct'); });
        const answer = geoQuizLabel(q.ask, q.options[correct].value);
        geoQuizSettle(false, { summary: geoQuizSummary(q), correctText: answer, givenText: null });
        feedback.textContent = t('geoquiz.timeout', { answer: answer });
    }
    geoQuizShowNext();
}

// --- Répondre -----------------------------------------------------------------------------------

// Clôt la question : les points (avec la vitesse si un chrono tourne), la série, l'entrée du bilan. Renvoie les points gagnés.
function geoQuizSettle(ok, info) {
    geoQuizAnswered = true;
    const remaining = geoQuizRemaining();
    geoQuizStopTimer();
    const points = GeoQuizSessionCore.pointsFor(ok, geoQuizStreak, remaining);
    geoQuizStreak = ok ? geoQuizStreak + 1 : 0;
    geoQuizAnswers.push(Object.assign({ ok: ok, points: points, q: geoQuizQuestions[geoQuizIndex] }, info));
    geoQuizUpdateHead();
    return points;
}

function geoQuizAnswer(i) {
    if (geoQuizAnswered) return;
    const q = geoQuizQuestions[geoQuizIndex];
    const buttons = Array.from(document.querySelectorAll('#geoquiz-options .quiz-option'));
    const correct = q.options.findIndex(o => o.id === q.target);
    buttons.forEach((b, k) => {
        b.disabled = true;
        if (k === correct) b.classList.add('correct');
    });
    const ok = i === correct;
    const points = geoQuizSettle(ok, {
        summary: geoQuizSummary(q),
        correctText: buttons[correct].textContent,
        givenText: buttons[i].textContent
    });
    const feedback = geoQuizEl('geoquiz-feedback');
    if (ok) {
        feedback.textContent = t('geoquiz.right_pts', { n: points });
    } else {
        buttons[i].classList.add('wrong');
        feedback.textContent = t('geoquiz.wrong', { answer: buttons[correct].textContent });
    }
    geoQuizShowNext();
}

function geoQuizShowNext() {
    const last = geoQuizIndex === geoQuizQuestions.length - 1;
    const next = geoQuizEl('geoquiz-next');
    next.textContent = t(last ? 'geoquiz.finish' : 'geoquiz.next');
    next.classList.remove('hidden');
    next.focus({ preventScroll: true });
}

function geoQuizNext() {
    geoQuizIndex++;
    if (geoQuizIndex >= geoQuizQuestions.length) { geoQuizEnd(); return; }
    geoQuizRender();
}

// --- La fin de partie : points, record, erreurs --------------------------------------------------

function geoQuizEnd() {
    geoQuizStopTimer();
    const summary = GeoQuizSessionCore.summarize(geoQuizAnswers);
    geoQuizShowPanel('geoquiz-end');
    geoQuizEl('geoquiz-score').textContent = t('geoquiz.end_score', { score: summary.score });
    geoQuizEl('geoquiz-detail').textContent = t('geoquiz.end_detail', { correct: summary.correct, total: summary.total, streak: summary.bestStreak });
    geoQuizEl('geoquiz-record').textContent = geoQuizReview ? t('geoquiz.review_note') : geoQuizSaveGame(summary);
    geoQuizRenderErrors();
    geoQuizEl('geoquiz-score').focus({ preventScroll: true });
}

// Enregistre la partie (record, historique), la pousse vers le compte, et renvoie la phrase du record.
function geoQuizSaveGame(summary) {
    const p = geoQuizGamePrefs;
    const game = {
        at: Date.now(), form: geoQuizForm, zone: p.zone, level: p.level, length: p.length, timer: p.timer,
        score: summary.score, correct: summary.correct, total: summary.total
    };
    const result = GeoQuizSessionCore.recordGame(geoQuizStateLoad(), game);
    geoQuizStateSave(result.state);
    if (typeof syncPushProgress === 'function') syncPushProgress();
    if (!result.previous) return t('geoquiz.record_first');
    if (result.isRecord) return t('geoquiz.record_new', { score: result.previous.score });
    return t('geoquiz.record_best', { score: result.previous.score });
}

function geoQuizRenderErrors() {
    const missed = geoQuizAnswers.filter(a => !a.ok);
    geoQuizEl('geoquiz-errors-title').textContent = t(missed.length ? 'geoquiz.errors_title' : 'geoquiz.errors_none');
    geoQuizEl('geoquiz-errors').replaceChildren(...missed.map(a => {
        const li = document.createElement('li');
        const question = document.createElement('strong');
        question.textContent = a.summary;
        const answer = document.createElement('span');
        let text = t('geoquiz.error_answer', { answer: a.correctText });
        if (a.givenText != null) text += a.q.kind === 'map' ? t('geoquiz.error_km', { km: a.givenText }) : t('geoquiz.error_given', { given: a.givenText });
        else text += t('geoquiz.error_timeout');
        answer.textContent = text;
        li.append(question, document.createElement('br'), answer);
        return li;
    }));
    geoQuizEl('geoquiz-replay-errors').classList.toggle('hidden', !missed.length);
}

// --- Mes scores ---------------------------------------------------------------------------------

function geoQuizConfigLine(g) {
    return t('geoquiz.config_line', {
        form: t('geoquiz.form_' + g.form), zone: t('geoquiz.zone_' + g.zone), level: t('geoquiz.level_' + g.level),
        length: g.length, timer: t('geoquiz.timer_' + g.timer)
    });
}

function geoQuizShowScores() {
    geoQuizShowPanel('geoquiz-scores');
    const state = geoQuizStateLoad();
    const records = GeoQuizSessionCore.bestList(state);
    const recent = state.history.slice(0, GEOQUIZ_RECENT);
    const item = (head, line, tail) => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = head;
        li.appendChild(strong);
        li.appendChild(document.createTextNode(' ' + line + (tail ? ' · ' + tail : '')));
        return li;
    };
    geoQuizEl('geoquiz-records').replaceChildren(...records.map(r =>
        item(t('geoquiz.points_label', { score: r.score }), geoQuizConfigLine(r), t('geoquiz.result_short', { correct: r.correct, total: r.total }))));
    geoQuizEl('geoquiz-recent').replaceChildren(...recent.map(g =>
        item(new Date(g.at).toLocaleDateString('fr-FR'), geoQuizConfigLine(g), t('geoquiz.result_line', { score: g.score, correct: g.correct, total: g.total }))));
    geoQuizEl('geoquiz-scores-none').classList.toggle('hidden', records.length > 0);
}

// « Retour » : depuis une partie ou les scores, au menu ; depuis le menu, à l'écran d'où il a été ouvert.
function geoQuizQuit() {
    if (geoQuizEl('geoquiz-menu').classList.contains('hidden')) { geoQuizShowMenu(); return; }
    showScreen(geoQuizReturn, 'back');
}

// --- « Touche le pays » -----------------------------------------------------------------------

function geoQuizRenderLocate(q) {
    geoQuizEl('geoquiz-locate-ask').textContent = t('geoquiz.locate_ask', { name: q.clues[0].value });
    // La carte a été créée cachée : on la redimensionne une fois visible, puis on la remet sur le monde.
    geoQuizMap.resize();
    geoQuizMap.fitBounds(GEOQUIZ_WORLD, { padding: 6, duration: 0 });
    geoQuizWhenReady(() => geoQuizSetHighlight(null, false, null));
}

// La carte, créée une seule fois. Renvoie null si WebGL manque.
function geoQuizEnsureMap() {
    if (geoQuizMap) return geoQuizMap;
    const theme = countriesTheme();
    try {
        geoQuizMap = new maplibregl.Map({
            container: 'geoquiz-map',
            style: { version: 8, sources: {}, layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': COUNTRIES_OCEAN[theme] } }] },
            bounds: GEOQUIZ_WORLD,
            fitBoundsOptions: { padding: 6 },
            minZoom: -1,
            maxZoom: 8,
            renderWorldCopies: false,
            attributionControl: false,
            dragRotate: false,
            pitchWithRotate: false
        });
    } catch (e) {
        geoQuizMap = null;
        return null;
    }
    geoQuizMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    geoQuizMap.touchZoomRotate.disableRotation();
    geoQuizMap.on('load', () => {
        geoQuizAddLayers();
        geoQuizMapReady = true;
        geoQuizOnReady.splice(0).forEach(fn => fn());
    });
    geoQuizMap.on('click', e => geoQuizTap(e.lngLat.lng, e.lngLat.lat));
    // Une tuile ou une police qui manque (hors ligne) n'empêche rien : le quiz n'en a pas besoin.
    geoQuizMap.on('error', () => {});
    return geoQuizMap;
}

function geoQuizAddLayers() {
    const map = geoQuizMap;
    const theme = countriesTheme();
    const empty = { type: 'FeatureCollection', features: [] };
    map.addSource('geoquiz-countries', { type: 'geojson', data: countriesData.geo });
    map.addLayer({ id: 'geoquiz-fill', type: 'fill', source: 'geoquiz-countries', paint: { 'fill-color': GEOQUIZ_FILL[theme], 'fill-opacity': 1 } });
    map.addLayer({ id: 'geoquiz-line', type: 'line', source: 'geoquiz-countries', paint: { 'line-color': theme === 'dark' ? '#0f1a26' : '#ffffff', 'line-width': 0.7 } });
    map.addLayer({
        id: 'geoquiz-target', type: 'fill', source: 'geoquiz-countries', filter: ['==', ['get', 'id'], ''],
        paint: { 'fill-color': GEOQUIZ_TARGET[theme], 'fill-opacity': 0.65 }
    });
    // Le point du petit pays visé (après la réponse seulement) : un pays de la taille d'un point ne se surligne pas.
    map.addSource('geoquiz-hint', { type: 'geojson', data: empty });
    map.addLayer({ id: 'geoquiz-hint', type: 'circle', source: 'geoquiz-hint', paint: { 'circle-radius': 6, 'circle-color': GEOQUIZ_TARGET[theme], 'circle-stroke-color': theme === 'dark' ? '#0f1a26' : '#ffffff', 'circle-stroke-width': 1.5 } });
    // Le clic du joueur, vert s'il est juste, rouge sinon.
    map.addSource('geoquiz-tap', { type: 'geojson', data: empty });
    map.addLayer({
        id: 'geoquiz-tap', type: 'circle', source: 'geoquiz-tap',
        paint: { 'circle-radius': 8, 'circle-color': ['case', ['get', 'ok'], '#15803d', '#c2410c'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 }
    });
}

// Exécute `fn` maintenant si la carte est chargée, sinon au chargement.
function geoQuizWhenReady(fn) {
    if (geoQuizMapReady) fn(); else geoQuizOnReady.push(fn);
}

// Le pays visé (après réponse seulement) et le point du clic. `id` : null pour rien surligner.
function geoQuizSetHighlight(id, tiny, tap) {
    const map = geoQuizMap;
    const none = { type: 'FeatureCollection', features: [] };
    map.setFilter('geoquiz-target', ['==', ['get', 'id'], id || '']);
    const target = id ? countriesData.byId.get(id) : null;
    map.getSource('geoquiz-hint').setData(tiny && target
        ? { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: target.c }, properties: {} }] }
        : none);
    map.getSource('geoquiz-tap').setData(tap
        ? { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [tap.lon, tap.lat] }, properties: { ok: tap.ok } }] }
        : none);
}

// Un clic sur la carte : réussi s'il tombe dans le pays visé (ou à côté, pour un petit pays).
function geoQuizTap(lon, lat) {
    const q = geoQuizQuestions[geoQuizIndex];
    if (geoQuizAnswered || !q || q.kind !== 'map' || geoQuizEl('geoquiz-play').classList.contains('hidden')) return;
    const target = countriesData.byId.get(q.target);
    const prepared = countriesData.prepared.get(q.target);
    const tiny = CountriesCore.isTiny(prepared);
    const km = GeoQuizCore.distanceKm([lon, lat], target.c);
    const ok = GeoQuizCore.locateCorrect({ inside: CountriesCore.containsNear(prepared, lon, lat), tiny: tiny, distanceKm: km });
    const kmText = Math.round(km).toLocaleString('fr-FR');
    const points = geoQuizSettle(ok, { summary: geoQuizSummary(q), correctText: target.n, givenText: kmText });
    geoQuizWhenReady(() => geoQuizSetHighlight(q.target, tiny, { lon: lon, lat: lat, ok: ok }));
    geoQuizEl('geoquiz-feedback').textContent = ok
        ? t('geoquiz.locate_right', { answer: target.n }) + ' ' + t('geoquiz.right_pts', { n: points })
        : t('geoquiz.locate_wrong', { answer: target.n, km: kmText });
    geoQuizShowNext();
}
