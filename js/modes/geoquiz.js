// =========================================================================
// === LE QUIZ DES PAYS (écran de jeu, lancé depuis l'Atlas des pays ou la Salle de jeux) ===
// =========================================================================
// Un menu de RÉGLAGES (zone, difficulté, nombre de questions, chrono) puis des formes de jeu, un même écran, un même score. Chaque
// question porte sa forme (q.kind) ; une partie en mélange plusieurs (panaché) ou une seule :
//   - QCM, drapeau → pays, « touche le pays » sur la carte : les classiques ;
//   - carte → nom (un pays montré sur la carte, quatre noms), saisie libre (on tape la capitale ou le pays), fêtes nationales,
//     « qui suis-je ? » (des indices du moins évident au plus évident : chaque indice demandé coûte des points), pays mystère (six
//     propositions, avec la distance et la direction vers le pays à trouver) ;
//   - deux défis qui changent la règle de la partie : la Rafale (60 secondes pour répondre à un maximum de questions, sans cliquer sur
//     « suivant ») et la Survie (trois vies, jusqu'à la dernière erreur).
// Les questions viennent de GeoQuizCore (js/geoQuizCore.js) ; la partie (jeu de pays, mélange, règles, points, records) de
// GeoQuizSessionCore (js/geoQuizSessionCore.js). Sans chrono par défaut : c'est d'abord un entraînement. Avec un chrono, la vitesse
// rapporte des points ; un temps écoulé compte comme une erreur.
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
const GEOQUIZ_RECENT = 10;          // parties récentes montrées dans « Mes scores »
const GEOQUIZ_BURST_PAUSE = { right: 700, wrong: 1400 };   // en Rafale, le temps de lire la réponse avant la question suivante

let geoQuizForm = 'qcm';           // une des GeoQuizSessionCore.FORMS
let geoQuizPrefs = null;           // les réglages du menu (chargés à l'ouverture)
let geoQuizGamePrefs = null;       // les réglages de la partie en cours (ils ne changent pas en cours de partie)
let geoQuizReturn = 'screen-tool-countries';   // l'écran où le menu a été ouvert (Atlas des pays, ou Salle de jeux)
let geoQuizQuestions = [];
let geoQuizIndex = 0;
let geoQuizAnswers = [];           // une entrée par question jouée : { ok, points, q, summary, correctText, givenText }
let geoQuizStreak = 0;
let geoQuizReview = false;         // partie de révision (« Rejouer mes erreurs ») : ni record ni historique
let geoQuizRules = 'standard';     // 'standard' | 'burst' | 'survival'
let geoQuizLives = 0;
let geoQuizAnswered = false;
let geoQuizTimerSeconds = 0;       // chrono par question : 0 = aucun
let geoQuizTimerId = null;         // l'intervalle du chrono (par question, ou de la Rafale)
let geoQuizTimerStart = 0;
let geoQuizAutoNext = null;        // en Rafale, la question suivante arrive d'elle-même
let geoQuizWhoShown = 1;           // « qui suis-je ? » : le nombre d'indices montrés
let geoQuizMysteryGuesses = [];    // « pays mystère » : les pays proposés
let geoQuizNameIndex = null;       // nom normalisé → pays, pour reconnaître une proposition
let geoQuizAllPool = null;
let geoQuizMap = null;
let geoQuizMapReady = false;
let geoQuizOnReady = [];           // actions à faire une fois la carte chargée (surlignage après une réponse)

function geoQuizEl(id) { return document.getElementById(id); }

// Tous les pays jouables (le monde, tous niveaux) : pour reconnaître une saisie, et ne jamais prendre un pays pour un autre.
function geoQuizEveryCountry() {
    if (!geoQuizAllPool) geoQuizAllPool = GeoQuizSessionCore.quizPool(countriesData.facts, { level: 'hard' });
    return geoQuizAllPool;
}

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
    geoQuizClearAuto();
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
    const core = GeoQuizSessionCore;
    geoQuizStopTimer();
    geoQuizClearAuto();
    geoQuizForm = form;
    geoQuizReview = !!review;
    geoQuizGamePrefs = Object.assign({}, geoQuizPrefsNow());
    geoQuizRules = review ? 'standard' : core.rulesOf(form);
    geoQuizLives = core.LIVES;
    geoQuizTimerSeconds = core.questionTimer(form, geoQuizGamePrefs, !!review);
    showScreen('screen-geoquiz', 'forward');
    geoQuizShowPanel(null);
    const status = geoQuizEl('geoquiz-status');
    status.textContent = t('tools.countries_loading');
    const needsMap = review ? review.some(q => core.MAP_KINDS.includes(q.kind)) : core.kindsOf(form).some(k => core.MAP_KINDS.includes(k));
    const library = needsMap ? atlasLoadLibrary() : Promise.resolve(true);
    Promise.all([countriesLoad(), library]).then(([ok, libOk]) => {
        if (!ok) { status.textContent = t('tools.countries_error'); return; }
        // Sans carte (bibliothèque absente ou pas de WebGL), le panaché, la Rafale et la Survie se jouent sans les formes « carte » ;
        // une forme qui n'existe que par la carte s'arrête.
        const mapOk = !needsMap || (libOk && !!geoQuizEnsureMap());
        if (!mapOk && (review || core.MAP_KINDS.includes(form))) { status.textContent = libOk ? t('tools.countries_no_webgl') : t('tools.countries_no_map'); return; }
        let questions;
        if (review) {
            questions = review.map(q => Object.assign({}, q));
        } else {
            const opts = mapOk ? {} : { kinds: core.QUESTION_KINDS.filter(k => !core.MAP_KINDS.includes(k)) };
            questions = core.generateGame(countriesData.facts, form, geoQuizGamePrefs, opts).questions;
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
    const open = geoQuizRules !== 'standard';
    geoQuizEl('geoquiz-progress').textContent = open
        ? t('geoquiz.progress_open', { n: geoQuizIndex + 1 })
        : t('geoquiz.progress', { n: geoQuizIndex + 1, total: geoQuizQuestions.length });
    geoQuizEl('geoquiz-points').textContent = t('geoquiz.points_label', { score: geoQuizScoreNow() });
    const lives = geoQuizEl('geoquiz-lives');
    lives.classList.toggle('hidden', geoQuizRules !== 'survival');
    if (geoQuizRules === 'survival') {
        const max = GeoQuizSessionCore.LIVES;
        lives.textContent = '❤️'.repeat(geoQuizLives) + '🖤'.repeat(max - geoQuizLives);
        lives.setAttribute('role', 'img');
        lives.setAttribute('aria-label', t('geoquiz.lives_label', { n: geoQuizLives }));
    }
}

// Montre ce que la forme de la question demande, et cache le reste.
function geoQuizRender() {
    const q = geoQuizQuestions[geoQuizIndex];
    const kind = q.kind;
    const onMap = kind === 'map' || kind === 'mapname';
    geoQuizAnswered = false;
    geoQuizUpdateHead();
    geoQuizEl('geoquiz-feedback').textContent = '';
    geoQuizEl('geoquiz-next').classList.add('hidden');
    geoQuizEl('geoquiz-locate').classList.toggle('hidden', !onMap);
    geoQuizEl('geoquiz-map').classList.toggle('is-short', kind === 'mapname');
    geoQuizEl('geoquiz-qcm').classList.toggle('hidden', kind === 'map' || kind === 'mystery');
    geoQuizEl('geoquiz-card').classList.toggle('hidden', kind === 'mapname');
    geoQuizEl('geoquiz-options').classList.toggle('hidden', kind === 'typed');
    geoQuizEl('geoquiz-typed').classList.toggle('hidden', kind !== 'typed');
    geoQuizEl('geoquiz-who-more').classList.toggle('hidden', kind !== 'who');
    geoQuizEl('geoquiz-mystery').classList.toggle('hidden', kind !== 'mystery');
    if (onMap) geoQuizRenderMap(q);
    // « Carte → nom » montre la carte et les quatre noms ; « touche le pays » n'a que la carte ; le mystère a son propre panneau.
    if (kind === 'mystery') geoQuizRenderMystery(q);
    else if (kind !== 'map') geoQuizRenderCard(q);
    geoQuizStartTimer();
}

// La question et ses réponses : QCM, drapeau, fêtes, qui suis-je ?, saisie libre, et les quatre noms de « carte → nom ».
function geoQuizRenderCard(q) {
    if (q.kind !== 'mapname') {
        // Espace insécable avant « ? » : le point d'interrogation ne passe pas seul à la ligne.
        geoQuizEl('geoquiz-ask').textContent = t('geoquiz.ask_' + q.ask).replace(' ?', ' ?');
        if (q.kind === 'who') geoQuizWhoShown = 1;
        geoQuizRenderClues(q);
    }
    if (q.kind === 'typed') {
        const input = geoQuizEl('geoquiz-typed-input');
        input.value = '';
        input.disabled = false;
        input.focus({ preventScroll: true });
        return;
    }
    if (q.kind === 'who') geoQuizWhoRefreshMore(q);
    geoQuizEl('geoquiz-options').replaceChildren(...q.options.map((o, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option';
        btn.textContent = geoQuizLabel(q.ask, o.value);
        btn.onclick = () => geoQuizAnswer(i);
        return btn;
    }));
}

// Les indices : tous, sauf pour « qui suis-je ? » où on en montre un de plus à chaque coup.
function geoQuizRenderClues(q) {
    const clues = q.kind === 'who' ? q.clues.slice(0, geoQuizWhoShown) : q.clues;
    geoQuizEl('geoquiz-clues').replaceChildren(...clues.map(clue => {
        const li = document.createElement('li');
        if (clue.key === 'flag') {
            // Le drapeau seul, en grand : pas de libellé à lire avant l'emoji.
            li.className = 'geoquiz-flag';
            li.textContent = clue.value;
        } else {
            li.textContent = geoQuizClueText(clue);
        }
        return li;
    }));
}

function geoQuizClueText(clue) {
    if (clue.key === 'pop') return t('geoquiz.clue_pop') + ' : ' + t('geoquiz.pop_label', { n: CountriesCore.formatPopulation(clue.value) });
    return t('geoquiz.clue_' + clue.key) + ' : ' + clue.value;
}

// Une réponse telle qu'on la lit : la population en lettres (« 68,4 millions »), le reste tel quel.
function geoQuizLabel(ask, value) {
    return ask === 'pop' ? t('geoquiz.pop_label', { n: CountriesCore.formatPopulation(value) }) : value;
}

// La question en une ligne, pour la liste des erreurs.
function geoQuizSummary(q) {
    if (q.kind === 'map') return t('geoquiz.summary_locate', { name: q.clues[0].value });
    if (q.kind === 'mapname') return t('geoquiz.summary_mapname');
    if (q.kind === 'mystery') return t('geoquiz.summary_mystery');
    if (q.kind === 'flag') return t('geoquiz.summary_flag', { flag: q.clues[0].value });
    const clues = q.kind === 'who' ? q.clues.slice(0, 3) : q.clues;
    return t('geoquiz.ask_' + q.ask) + ' ' + clues.map(geoQuizClueText).join(' ; ');
}

// --- Le chrono ----------------------------------------------------------------------------------

// Le chrono d'une question (en secondes, geoQuizTimerSeconds), ou en Rafale celui de toute la partie (60 secondes, lancé une fois).
function geoQuizStartTimer() {
    const box = geoQuizEl('geoquiz-timer');
    if (geoQuizRules === 'burst') {
        box.classList.remove('hidden');
        if (geoQuizTimerId === null) {
            geoQuizTimerStart = performance.now();
            geoQuizBurstTick();
            geoQuizTimerId = setInterval(geoQuizBurstTick, 100);
        }
        return;
    }
    geoQuizStopTimer();
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

function geoQuizClearAuto() {
    if (geoQuizAutoNext !== null) clearTimeout(geoQuizAutoNext);
    geoQuizAutoNext = null;
}

// La part du temps de la question qui reste, de 1 à 0 ; null sans chrono par question (et en Rafale, où seule la partie est chronométrée).
function geoQuizRemaining() {
    if (!geoQuizTimerSeconds) return null;
    const elapsed = (performance.now() - geoQuizTimerStart) / 1000;
    return Math.max(0, Math.min(1, 1 - elapsed / geoQuizTimerSeconds));
}

function geoQuizDrawTimer(remaining, seconds) {
    geoQuizEl('geoquiz-timer-fill').style.width = (remaining * 100).toFixed(1) + '%';
    geoQuizEl('geoquiz-timer-text').textContent = t('geoquiz.timer_seconds', { n: seconds });
    geoQuizEl('geoquiz-timer').setAttribute('aria-valuenow', String(Math.round(remaining * 100)));
    geoQuizEl('geoquiz-timer').classList.toggle('is-low', remaining <= 0.25);
}

function geoQuizTimerTick() {
    const remaining = geoQuizRemaining();
    if (remaining === null) return;
    geoQuizDrawTimer(remaining, Math.ceil(remaining * geoQuizTimerSeconds));
    if (remaining <= 0 && !geoQuizAnswered) geoQuizTimeout();
}

// Rafale : quand les 60 secondes sont écoulées, la partie s'arrête, même au milieu d'une question (elle n'est pas comptée).
function geoQuizBurstTick() {
    const total = GeoQuizSessionCore.BURST_SECONDS;
    const remaining = Math.max(0, 1 - (performance.now() - geoQuizTimerStart) / 1000 / total);
    geoQuizDrawTimer(remaining, Math.ceil(remaining * total));
    if (remaining <= 0) {
        geoQuizStopTimer();
        geoQuizClearAuto();
        geoQuizEnd();
    }
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
    } else if (q.kind === 'typed') {
        geoQuizSettle(false, { summary: geoQuizSummary(q), correctText: q.answer, givenText: null });
        feedback.textContent = t('geoquiz.timeout', { answer: q.answer });
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

// Les points de la question qu'on clôt : selon sa forme (indices non montrés pour « qui suis-je ? », essais restants pour le mystère).
function geoQuizPoints(ok, q, remaining) {
    const core = GeoQuizSessionCore;
    if (q.kind === 'who') return core.whoPoints(ok, geoQuizWhoShown, q.clues.length, geoQuizStreak, remaining);
    if (q.kind === 'mystery') return core.mysteryPoints(ok, geoQuizMysteryGuesses.length, GeoQuizCore.MYSTERY_TRIES, geoQuizStreak);
    return core.pointsFor(ok, geoQuizStreak, remaining);
}

// Clôt la question : les points (avec la vitesse si un chrono tourne), la série, les vies, l'entrée du bilan. Renvoie les points gagnés.
function geoQuizSettle(ok, info) {
    geoQuizAnswered = true;
    const q = geoQuizQuestions[geoQuizIndex];
    const remaining = geoQuizRemaining();
    // En Rafale, l'intervalle est celui de toute la partie : on ne l'arrête qu'à la fin.
    if (geoQuizRules !== 'burst') geoQuizStopTimer();
    const points = geoQuizPoints(ok, q, remaining);
    geoQuizStreak = ok ? geoQuizStreak + 1 : 0;
    if (!ok && geoQuizRules === 'survival') geoQuizLives--;
    geoQuizAnswers.push(Object.assign({ ok: ok, points: points, q: q }, info));
    geoQuizEl('geoquiz-who-more').disabled = true;
    geoQuizEl('geoquiz-typed-input').disabled = true;
    geoQuizEl('geoquiz-mystery-input').disabled = true;
    geoQuizUpdateHead();
    return points;
}

// QCM, drapeau, fêtes, carte → nom : un choix parmi des propositions. « Qui suis-je ? » a ses propres règles.
function geoQuizAnswer(i) {
    if (geoQuizAnswered) return;
    const q = geoQuizQuestions[geoQuizIndex];
    if (q.kind === 'who') { geoQuizWhoAnswer(i); return; }
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
    const last = geoQuizIndex === geoQuizQuestions.length - 1 || (geoQuizRules === 'survival' && geoQuizLives <= 0);
    const next = geoQuizEl('geoquiz-next');
    if (geoQuizRules === 'burst') {
        // En Rafale, pas de bouton : la question suivante arrive après le temps de lire la réponse.
        const ok = geoQuizAnswers[geoQuizAnswers.length - 1].ok;
        geoQuizClearAuto();
        geoQuizAutoNext = setTimeout(geoQuizNext, ok ? GEOQUIZ_BURST_PAUSE.right : GEOQUIZ_BURST_PAUSE.wrong);
        return;
    }
    next.textContent = t(last ? 'geoquiz.finish' : 'geoquiz.next');
    next.classList.remove('hidden');
    next.focus({ preventScroll: true });
}

function geoQuizNext() {
    geoQuizClearAuto();
    // Une partie finie (ou quittée) ne repart pas : le délai de la Rafale a pu se terminer après.
    if (geoQuizEl('geoquiz-play').classList.contains('hidden')) return;
    geoQuizIndex++;
    const noLife = geoQuizRules === 'survival' && geoQuizLives <= 0;
    if (noLife || geoQuizIndex >= geoQuizQuestions.length) { geoQuizEnd(); return; }
    geoQuizRender();
}

// --- « Qui suis-je ? » --------------------------------------------------------------------------

// Le bouton qui montre un indice de plus, tant qu'il en reste ; il coûte les points de l'indice.
function geoQuizWhoRefreshMore(q) {
    const more = geoQuizEl('geoquiz-who-more');
    more.disabled = false;
    more.classList.toggle('hidden', geoQuizWhoShown >= q.clues.length);
    more.textContent = t('geoquiz.who_more', { n: 20 });
}

function geoQuizWhoMore() {
    const q = geoQuizQuestions[geoQuizIndex];
    if (geoQuizAnswered || q.kind !== 'who' || geoQuizWhoShown >= q.clues.length) return;
    geoQuizWhoShown++;
    geoQuizRenderClues(q);
    geoQuizWhoRefreshMore(q);
}

// Une mauvaise réponse écarte la proposition et montre l'indice suivant ; sans indice à montrer, la question est perdue.
function geoQuizWhoAnswer(i) {
    const q = geoQuizQuestions[geoQuizIndex];
    const buttons = Array.from(document.querySelectorAll('#geoquiz-options .quiz-option'));
    const correct = q.options.findIndex(o => o.id === q.target);
    const feedback = geoQuizEl('geoquiz-feedback');
    if (i !== correct && geoQuizWhoShown < q.clues.length) {
        buttons[i].classList.add('wrong');
        buttons[i].disabled = true;
        geoQuizWhoShown++;
        geoQuizRenderClues(q);
        geoQuizWhoRefreshMore(q);
        feedback.textContent = t('geoquiz.who_next');
        return;
    }
    buttons.forEach((b, k) => {
        b.disabled = true;
        if (k === correct) b.classList.add('correct');
    });
    const ok = i === correct;
    const points = geoQuizSettle(ok, { summary: geoQuizSummary(q), correctText: buttons[correct].textContent, givenText: buttons[i].textContent });
    if (ok) {
        feedback.textContent = t('geoquiz.right_pts', { n: points });
    } else {
        buttons[i].classList.add('wrong');
        feedback.textContent = t('geoquiz.wrong', { answer: buttons[correct].textContent });
    }
    geoQuizShowNext();
}

// --- Saisie libre -------------------------------------------------------------------------------

function geoQuizTypedSubmit(ev) {
    ev.preventDefault();
    const q = geoQuizQuestions[geoQuizIndex];
    if (geoQuizAnswered || !q || q.kind !== 'typed') return;
    const value = geoQuizEl('geoquiz-typed-input').value.trim();
    if (!value) return;
    const others = GeoQuizCore.otherAnswers(geoQuizEveryCountry(), q.target, q.ask);
    geoQuizTypedSettle(GeoQuizCore.isTypedCorrect(value, q.answers, others), value);
}

// « Je ne sais pas » : une erreur sans réponse donnée.
function geoQuizTypedSkip() {
    const q = geoQuizQuestions[geoQuizIndex];
    if (geoQuizAnswered || !q || q.kind !== 'typed') return;
    geoQuizTypedSettle(false, '');
}

function geoQuizTypedSettle(ok, given) {
    const q = geoQuizQuestions[geoQuizIndex];
    const points = geoQuizSettle(ok, { summary: geoQuizSummary(q), correctText: q.answer, givenText: given });
    geoQuizEl('geoquiz-feedback').textContent = ok ? t('geoquiz.right_pts', { n: points }) : t('geoquiz.wrong', { answer: q.answer });
    geoQuizShowNext();
}

// --- Pays mystère -------------------------------------------------------------------------------

// Le pays qu'un nom désigne (le nom de l'Atlas ou celui entre parenthèses : « Myanmar »), sans accents ni tirets.
function geoQuizCountryNamed(text) {
    if (!geoQuizNameIndex) {
        geoQuizNameIndex = new Map();
        geoQuizEveryCountry().forEach(c => GeoQuizCore.acceptedAnswers(c.n, 'name').forEach(name => geoQuizNameIndex.set(GeoQuizCore.compact(name), c)));
    }
    return geoQuizNameIndex.get(GeoQuizCore.compact(text)) || null;
}

function geoQuizRenderMystery(q) {
    geoQuizMysteryGuesses = [];
    geoQuizEl('geoquiz-mystery-ask').textContent = t('geoquiz.mystery_ask');
    geoQuizEl('geoquiz-guesses').replaceChildren();
    const list = geoQuizEl('geoquiz-names');
    if (!list.children.length) {
        list.replaceChildren(...geoQuizEveryCountry().map(c => c.n).sort((a, b) => a.localeCompare(b, 'fr')).map(name => {
            const option = document.createElement('option');
            option.value = name;
            return option;
        }));
    }
    const input = geoQuizEl('geoquiz-mystery-input');
    input.value = '';
    input.disabled = false;
    geoQuizMysteryTries();
    input.focus({ preventScroll: true });
}

function geoQuizMysteryTries() {
    geoQuizEl('geoquiz-mystery-tries').textContent = t('geoquiz.mystery_try', {
        n: Math.min(geoQuizMysteryGuesses.length + 1, GeoQuizCore.MYSTERY_TRIES), max: GeoQuizCore.MYSTERY_TRIES
    });
}

function geoQuizMysterySubmit(ev) {
    ev.preventDefault();
    const q = geoQuizQuestions[geoQuizIndex];
    if (geoQuizAnswered || !q || q.kind !== 'mystery') return;
    const input = geoQuizEl('geoquiz-mystery-input');
    const value = input.value.trim();
    if (!value) return;
    const feedback = geoQuizEl('geoquiz-feedback');
    const guess = geoQuizCountryNamed(value);
    if (!guess) { feedback.textContent = t('geoquiz.mystery_unknown'); return; }
    if (geoQuizMysteryGuesses.indexOf(guess.id) !== -1) { feedback.textContent = t('geoquiz.mystery_already'); return; }
    const target = countriesData.byId.get(q.target);
    const result = GeoQuizCore.mysteryGuess(target, guess);
    geoQuizMysteryGuesses.push(guess.id);
    const li = document.createElement('li');
    li.textContent = result.correct
        ? t('geoquiz.mystery_hit', { name: guess.n })
        : t('geoquiz.mystery_guess', { name: guess.n, km: result.km.toLocaleString('fr-FR'), arrow: result.arrow, percent: result.percent });
    geoQuizEl('geoquiz-guesses').appendChild(li);
    input.value = '';
    feedback.textContent = '';
    if (result.correct || geoQuizMysteryGuesses.length >= GeoQuizCore.MYSTERY_TRIES) {
        const tries = geoQuizMysteryGuesses.length;
        const points = geoQuizSettle(result.correct, { summary: geoQuizSummary(q), correctText: target.n, givenText: result.correct ? null : guess.n });
        feedback.textContent = result.correct ? t('geoquiz.mystery_found', { n: tries, pts: points }) : t('geoquiz.mystery_lost', { answer: target.n });
        geoQuizEl('geoquiz-mystery-tries').textContent = '';
        geoQuizShowNext();
    } else {
        geoQuizMysteryTries();
    }
}

// --- La fin de partie : points, record, erreurs --------------------------------------------------

function geoQuizEnd() {
    geoQuizStopTimer();
    geoQuizClearAuto();
    const summary = GeoQuizSessionCore.summarize(geoQuizAnswers);
    geoQuizShowPanel('geoquiz-end');
    geoQuizEl('geoquiz-score').textContent = t('geoquiz.end_score', { score: summary.score });
    geoQuizEl('geoquiz-detail').textContent = t(geoQuizRules === 'standard' ? 'geoquiz.end_detail' : 'geoquiz.end_detail_open',
        { correct: summary.correct, total: summary.total, streak: summary.bestStreak });
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
        if (a.givenText === null) text += t('geoquiz.error_timeout');
        else if (a.givenText === '') text += t('geoquiz.error_skipped');
        else text += a.q.kind === 'map' ? t('geoquiz.error_km', { km: a.givenText }) : t('geoquiz.error_given', { given: a.givenText });
        answer.textContent = text;
        li.append(question, document.createElement('br'), answer);
        return li;
    }));
    geoQuizEl('geoquiz-replay-errors').classList.toggle('hidden', !missed.length);
}

// --- Mes scores ---------------------------------------------------------------------------------

function geoQuizConfigLine(g) {
    const parts = { form: t('geoquiz.form_' + g.form), zone: t('geoquiz.zone_' + g.zone), level: t('geoquiz.level_' + g.level) };
    // Rafale et Survie n'ont ni nombre de questions ni chrono à régler.
    if (GeoQuizSessionCore.rulesOf(g.form) !== 'standard') return t('geoquiz.config_line_open', parts);
    return t('geoquiz.config_line', Object.assign(parts, { length: g.length, timer: t('geoquiz.timer_' + g.timer) }));
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

// --- La carte : « touche le pays » et « carte → nom » -----------------------------------------

function geoQuizRenderMap(q) {
    // La carte a été créée cachée : on la redimensionne une fois visible.
    geoQuizMap.resize();
    if (q.kind === 'mapname') {
        // Le pays à nommer, surligné, avec son voisinage ; aucun nom n'est écrit sur la carte.
        geoQuizEl('geoquiz-locate-ask').textContent = t('geoquiz.ask_name').replace(' ?', ' ?');
        const target = countriesData.byId.get(q.target);
        const tiny = CountriesCore.isTiny(countriesData.prepared.get(q.target));
        geoQuizMap.jumpTo({ center: target.c, zoom: Math.max(0.4, target.z - 1.3) });
        geoQuizWhenReady(() => geoQuizSetHighlight(q.target, tiny, null));
        return;
    }
    geoQuizEl('geoquiz-locate-ask').textContent = t('geoquiz.locate_ask', { name: q.clues[0].value });
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

// Le pays visé (après réponse seulement, ou dès le début pour « carte → nom ») et le point du clic. `id` : null pour rien surligner.
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

// Un clic sur la carte : réussi s'il tombe dans le pays visé (ou à côté, pour un petit pays). Sans effet en « carte → nom ».
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
