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
let geoQuizNoRecord = false;       // révision, pays faibles ou défi du jour : la partie n'entre pas dans les records par réglage
let geoQuizDailyDate = '';         // le jour du défi en cours
let geoQuizDuel = null;            // duel à deux : { names, scores, streaks } ; les joueurs se relaient, un par question
let geoQuizMasteredBefore = null;  // les pays déjà maîtrisés au début de la partie
let geoQuizRules = 'standard';     // 'standard' | 'burst' | 'survival'
let geoQuizLives = 0;
let geoQuizAnswered = false;
let geoQuizTimerSeconds = 0;       // chrono par question : 0 = aucun
let geoQuizTimerId = null;         // l'intervalle du chrono (par question, ou de la Rafale)
let geoQuizTimerStart = 0;
let geoQuizAutoNext = null;        // en Rafale, la question suivante arrive d'elle-même
let geoQuizWhoShown = 1;           // « qui suis-je ? » : le nombre d'indices montrés
let geoQuizWhoWrong = 0;           // « qui suis-je ? » : les mauvais choix déjà faits sur cette question
let geoQuizMysteryGuesses = [];    // « pays mystère » : les pays proposés
let geoQuizNameIndex = null;       // nom normalisé → pays, pour reconnaître une proposition
let geoQuizAllPool = null;
let geoQuizMap = null;
let geoQuizMapReady = false;
let geoQuizOnReady = [];           // actions à faire une fois la carte chargée (surlignage après une réponse)

function geoQuizEl(id) { return document.getElementById(id); }

// L'identifiant de la bonne réponse d'une question à propositions : le pays visé, sauf « voisins », « plus ou moins » et « chefs d'État ».
function geoQuizRight(q) { return q.right || q.target; }

// Tous les pays jouables (le monde, tous niveaux) : pour reconnaître une saisie, et ne jamais prendre un pays pour un autre.
function geoQuizEveryCountry() {
    if (!geoQuizAllPool) geoQuizAllPool = GeoQuizSessionCore.zoneCountries(countriesData.facts, 'world');
    return geoQuizAllPool;
}

// Le menu s'ouvre depuis l'Atlas des pays ou la Salle de jeux ; « Retour » y ramène.
function openGeoQuizMenu(from) {
    geoQuizReturn = from || 'screen-tool-countries';
    showScreen('screen-geoquiz', 'forward');
    geoQuizShowMenu();
}

function geoQuizShowPanel(id) {
    ['geoquiz-menu', 'geoquiz-scores', 'geoquiz-mastery', 'geoquiz-play', 'geoquiz-end'].forEach(p => geoQuizEl(p).classList.toggle('hidden', p !== id));
}

function geoQuizShowMenu() {
    geoQuizStopTimer();
    geoQuizClearAuto();
    geoQuizEl('geoquiz-status').textContent = '';
    geoQuizShowPanel('geoquiz-menu');
    geoQuizRenderSettings();
    geoQuizRenderToday();
}

// Les jours du défi et les pays à revoir, lus dans l'état (sans charger les données des pays).
function geoQuizToday() { return DailyEngine.getDailySeedString(); }

function geoQuizMasteredIds(state) {
    const core = GeoQuizSessionCore;
    return new Set(Object.keys(state.countries).filter(id => core.masteryOf(state.countries[id]) === 'mastered'));
}

function geoQuizRenderToday() {
    const core = GeoQuizSessionCore;
    const state = geoQuizStateLoad();
    const done = state.daily[geoQuizToday()];
    const streak = core.dailyStreak(state, geoQuizToday());
    geoQuizEl('geoquiz-daily-btn').textContent = done ? t('geoquiz.daily_done', { score: done.score, correct: done.correct, total: done.total }) : t('geoquiz.menu_daily');
    geoQuizEl('geoquiz-daily-line').textContent = streak > 0 ? t('geoquiz.daily_streak', { n: streak }) : t('geoquiz.daily_hint');
    const ids = Object.keys(state.countries);
    const weak = ids.filter(id => core.masteryOf(state.countries[id]) === 'weak').length;
    const mastered = geoQuizMasteredIds(state).size;
    geoQuizEl('geoquiz-weak-line').textContent = ids.length ? t('geoquiz.weak_line', { weak: weak, mastered: mastered }) : t('geoquiz.weak_none');
}

// --- Les réglages ------------------------------------------------------------------------------

function geoQuizPrefsNow() {
    if (!geoQuizPrefs) geoQuizPrefs = geoQuizPrefsLoad();
    return geoQuizPrefs;
}

// Les réglages du Quiz des pays et des Villes du monde sont les mêmes (zone, difficulté, chrono) : ils se rendent dans les deux menus.
// `prefix` : « geoquiz » ou « cities », le préfixe des identifiants des puces de chaque menu.
function geoQuizRenderCommonSettings(prefix) {
    const prefs = geoQuizPrefsNow();
    const core = GeoQuizSessionCore;
    geoQuizFillChips(prefix + '-zone', core.ZONES.map(z => ({ value: z.key, label: t('geoquiz.zone_' + z.key) })), 'zone', prefs.zone);
    geoQuizFillChips(prefix + '-level', Object.keys(core.LEVELS).map(k => ({ value: k, label: t('geoquiz.level_' + k) })), 'level', prefs.level);
    // L'aide donne le nombre de pays réel : il faut les données des pays, chargées à la demande si l'Atlas n'a pas été ouvert.
    const hint = geoQuizEl(prefix + '-level-hint');
    if (countriesData) {
        const info = core.levelInfo(countriesData.facts, prefs);
        const pct = Math.round(info.share * 100);
        hint.textContent = t('geoquiz.level_' + prefs.level + '_hint', { pct: pct, n: info.size })
            + (info.floored ? ' ' + t('geoquiz.level_floor', { min: core.MIN_POOL }) : '');
    } else {
        hint.textContent = '';
        countriesLoad().then(ok => { if (ok) { geoQuizRenderSettings(); cityGameRenderSettings(); } });
    }
    geoQuizFillChips(prefix + '-timer-choice', core.TIMERS.map(s => ({ value: s, label: t('geoquiz.timer_' + s) })), 'timer', prefs.timer);
}

function geoQuizRenderSettings() {
    const core = GeoQuizSessionCore;
    geoQuizRenderCommonSettings('geoquiz');
    geoQuizFillChips('geoquiz-length', core.LENGTHS.map(n => ({ value: n, label: String(n) })), 'length', geoQuizPrefsNow().length);
}

function geoQuizFillChips(id, items, key, current) {
    geoQuizEl(id).replaceChildren(...items.map(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'geoquiz-chip';
        btn.dataset.pref = key;
        btn.textContent = item.label;
        btn.setAttribute('aria-pressed', item.value === current ? 'true' : 'false');
        btn.onclick = () => geoQuizSetPref(key, item.value, id);
        return btn;
    }));
}

// Un réglage change dans les deux menus à la fois. Le clavier reste sur le choix qu'on vient de faire (`groupId` : sa liste de puces).
function geoQuizSetPref(key, value, groupId) {
    geoQuizPrefs = GeoQuizSessionCore.normalizePrefs(Object.assign({}, geoQuizPrefsNow(), { [key]: value }));
    geoQuizPrefsSave(geoQuizPrefs);
    geoQuizRenderSettings();
    cityGameRenderSettings();
    const kept = document.querySelector('#' + groupId + ' .geoquiz-chip[aria-pressed="true"]');
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
    geoQuizNoRecord = !!review || form === 'weak' || form === 'daily' || form === 'duel';
    geoQuizDuel = form === 'duel' && !review ? geoQuizDuelStart() : null;
    geoQuizDailyDate = form === 'daily' ? geoQuizToday() : '';
    geoQuizGamePrefs = Object.assign({}, form === 'daily' ? core.DAILY_PREFS : geoQuizPrefsNow());
    geoQuizMasteredBefore = geoQuizMasteredIds(geoQuizStateLoad());
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
            if (form === 'weak') opts.state = geoQuizStateLoad();
            if (form === 'leader' && typeof StateLeadersCore !== 'undefined') opts.leaders = GeoQuizCore.leadersFrom(StateLeadersCore);
            // Le défi du jour : un tirage fixé par la date, le même pour tous.
            if (form === 'daily') opts.rng = DailyEngine.mulberry32(DailyEngine.hashStringToSeed('historiaxe_geoquiz_' + geoQuizDailyDate));
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

// Le duel : les noms tapés dans le menu (« Joueur 1 », « Joueur 2 » à défaut), les points et les séries de chacun.
function geoQuizDuelStart() {
    const name = (id, fallback) => geoQuizEl(id).value.trim().slice(0, 20) || fallback;
    return { names: [name('geoquiz-duel-p1', t('geoquiz.duel_p1')), name('geoquiz-duel-p2', t('geoquiz.duel_p2'))], scores: [0, 0], streaks: [0, 0] };
}

function geoQuizUpdateHead() {
    if (geoQuizDuel) {
        const turn = geoQuizIndex % 2;
        geoQuizEl('geoquiz-progress').textContent = t('geoquiz.duel_turn', { name: geoQuizDuel.names[turn], n: Math.floor(geoQuizIndex / 2) + 1, total: geoQuizQuestions.length / 2 });
        geoQuizEl('geoquiz-points').textContent = geoQuizDuel.names.map((n, i) => n + ' ' + geoQuizDuel.scores[i]).join(' · ');
        geoQuizEl('geoquiz-lives').classList.add('hidden');
        return;
    }
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
    if (geoQuizDuel) geoQuizStreak = geoQuizDuel.streaks[geoQuizIndex % 2];
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
        if (q.kind === 'who') geoQuizWhoShown = 1, geoQuizWhoWrong = 0;
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
    if (q.kind === 'more') return t('geoquiz.ask_' + q.ask) + ' ' + q.options.map(o => o.value).join(' / ');
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
        const correct = q.options.findIndex(o => o.id === geoQuizRight(q));
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
    if (q.kind === 'who') return core.whoPoints(ok, geoQuizWhoShown, q.clues.length, geoQuizStreak, remaining, geoQuizTimerSeconds);
    if (q.kind === 'mystery') return core.mysteryPoints(ok, geoQuizMysteryGuesses.length, GeoQuizCore.MYSTERY_TRIES, geoQuizStreak);
    return core.pointsFor(ok, geoQuizStreak, remaining, geoQuizTimerSeconds);
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
    const player = geoQuizDuel ? geoQuizIndex % 2 : 0;
    if (geoQuizDuel) { geoQuizDuel.streaks[player] = geoQuizStreak; geoQuizDuel.scores[player] += points; }
    if (!ok && geoQuizRules === 'survival') geoQuizLives--;
    geoQuizAnswers.push(Object.assign({ ok: ok, points: points, q: q, player: player, tries: q.kind === 'mystery' ? geoQuizMysteryGuesses.length : 0 }, info));
    // Chaque réponse nourrit le suivi du pays, même quittée à mi-partie.
    // « Qui suis-je ? » trouvé après des erreurs (parfois par élimination) n'est pas un pays su.
    if (!geoQuizDuel && GeoQuizSessionCore.TRACKED_KINDS.includes(q.kind)) geoQuizStateSave(GeoQuizSessionCore.trackAnswer(geoQuizStateLoad(), q.target, ok && !(q.kind === 'who' && geoQuizWhoWrong > 0), Date.now()));
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
    const correct = q.options.findIndex(o => o.id === geoQuizRight(q));
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
    next.textContent = last ? t('geoquiz.finish') : geoQuizDuel ? t('geoquiz.duel_pass', { name: geoQuizDuel.names[(geoQuizIndex + 1) % 2] }) : t('geoquiz.next');
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
    const correct = q.options.findIndex(o => o.id === geoQuizRight(q));
    const feedback = geoQuizEl('geoquiz-feedback');
    if (i !== correct && geoQuizWhoShown < q.clues.length) {
        buttons[i].classList.add('wrong');
        buttons[i].disabled = true;
        geoQuizWhoShown++;
        geoQuizWhoWrong++;
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
    if (geoQuizDuel) { geoQuizEndDuel(); return; }
    const summary = GeoQuizSessionCore.summarize(geoQuizAnswers);
    geoQuizShowPanel('geoquiz-end');
    geoQuizEl('geoquiz-score').textContent = t('geoquiz.end_score', { score: summary.score });
    geoQuizEl('geoquiz-detail').textContent = t(geoQuizRules === 'standard' ? 'geoquiz.end_detail' : 'geoquiz.end_detail_open',
        { correct: summary.correct, total: summary.total, streak: summary.bestStreak });
    let dailyFirst = false;
    let record;
    if (geoQuizForm === 'daily' && !geoQuizReview) {
        const result = geoQuizSaveDaily(summary);
        dailyFirst = result.first;
        record = result.text;
    } else if (geoQuizForm === 'weak' && !geoQuizReview) {
        record = t('geoquiz.weak_note');
    } else {
        record = geoQuizReview ? t('geoquiz.review_note') : geoQuizSaveGame(summary);
    }
    geoQuizEl('geoquiz-record').textContent = record;
    geoQuizEl('geoquiz-reward').textContent = geoQuizReward(summary, dailyFirst);
    geoQuizRenderErrors();
    geoQuizEl('geoquiz-score').focus({ preventScroll: true });
}

// La fin d'un duel : le gagnant, les points et les bonnes réponses de chacun. Rien n'est enregistré : c'est une partie entre amis.
function geoQuizEndDuel() {
    const core = GeoQuizSessionCore;
    const [a, b] = [0, 1].map(i => Object.assign({ name: geoQuizDuel.names[i] }, core.summarize(geoQuizAnswers.filter(x => x.player === i))));
    geoQuizShowPanel('geoquiz-end');
    geoQuizEl('geoquiz-score').textContent = a.score === b.score ? t('geoquiz.duel_tie', { score: a.score })
        : t('geoquiz.duel_win', { name: (a.score > b.score ? a : b).name, win: Math.max(a.score, b.score), lose: Math.min(a.score, b.score) });
    geoQuizEl('geoquiz-detail').textContent = [a, b].map(p => t('geoquiz.duel_line', { name: p.name, score: p.score, correct: p.correct, total: p.total })).join(' · ');
    geoQuizEl('geoquiz-record').textContent = t('geoquiz.duel_note');
    geoQuizEl('geoquiz-reward').textContent = '';
    geoQuizEl('geoquiz-errors-title').textContent = '';
    geoQuizEl('geoquiz-errors').replaceChildren();
    geoQuizEl('geoquiz-replay-errors').classList.add('hidden');
    geoQuizEl('geoquiz-score').focus({ preventScroll: true });
}

// Le défi du jour : seule la première partie du jour compte. Renvoie { first, text }.
function geoQuizSaveDaily(summary) {
    const core = GeoQuizSessionCore;
    const result = core.recordDaily(geoQuizStateLoad(), geoQuizDailyDate, summary);
    if (!result.first) return { first: false, text: t('geoquiz.daily_again') };
    geoQuizStateSave(result.state);
    if (typeof syncPushProgress === 'function') syncPushProgress();
    return { first: true, text: t('geoquiz.daily_saved', { n: core.dailyStreak(result.state, geoQuizDailyDate) }) };
}

// L'XP de la partie, les pays devenus maîtrisés et les trophées gagnés. Renvoie la phrase à montrer.
function geoQuizReward(summary, dailyFirst) {
    const core = GeoQuizSessionCore;
    const state = geoQuizStateLoad();
    const masteredNow = geoQuizMasteredIds(state);
    let newly = 0;
    masteredNow.forEach(id => { if (!geoQuizMasteredBefore.has(id)) newly++; });
    const xp = core.xpFor(summary.score, { review: geoQuizNoRecord && !dailyFirst, newlyMastered: newly, dailyFirst: dailyFirst });
    let awarded = 0;
    if (xp > 0 && typeof awardXP === 'function') {
        const info = awardXP(xp, 'Quiz des pays');
        awarded = info ? info.xpAwarded : 0;
        if (typeof addRecapLogEntry === 'function') addRecapLogEntry(awarded, 0);
    }
    geoQuizUnlockBadges(summary, masteredNow.size, dailyFirst);
    const parts = [];
    if (awarded > 0) parts.push(t('geoquiz.reward_xp', { n: awarded }));
    if (newly > 0) parts.push(t('geoquiz.reward_mastered', { n: newly }));
    return parts.join(' · ');
}

function geoQuizUnlockBadges(summary, masteredCount, dailyFirst) {
    if (typeof unlockBadge !== 'function') return;
    const core = GeoQuizSessionCore;
    const state = geoQuizStateLoad();
    const mystery = geoQuizAnswers.filter(a => a.q.kind === 'mystery' && a.ok).map(a => a.tries);
    const zoneComplete = core.ZONES.some(z => z.continents && (() => {
        const pool = core.zoneCountries(countriesData.facts, z.key);
        return pool.length > 0 && pool.every(c => core.masteryOf(state.countries[c.id]) === 'mastered');
    })());
    core.badgesEarned({
        form: geoQuizForm, level: geoQuizGamePrefs.level, rules: geoQuizRules, correct: summary.correct, total: summary.total,
        mysteryTries: mystery.length ? Math.min.apply(null, mystery) : 0, mastered: masteredCount, zoneComplete: zoneComplete,
        streak: dailyFirst ? core.dailyStreak(state, geoQuizDailyDate) : 0
    }).forEach(unlockBadge);
}

// Enregistre la partie (record, historique), la pousse vers le compte, et renvoie la phrase du record.
function geoQuizSaveGame(summary) {
    const p = geoQuizGamePrefs;
    const game = {
        at: Date.now(), form: geoQuizForm, zone: p.zone, level: p.level, length: p.length, timer: p.timer,
        score: summary.score, correct: summary.correct, total: summary.total, bestStreak: summary.bestStreak
    };
    const result = GeoQuizSessionCore.recordGame(geoQuizStateLoad(), game);
    geoQuizStateSave(result.state);
    if (typeof syncPushProgress === 'function') syncPushProgress();
    if (!result.previous) return t('geoquiz.record_first');
    if (result.isRecord) return t('geoquiz.record_new', { score: result.previous.score });
    return t('geoquiz.record_best', { score: result.previous.score });
}

// --- Ma maîtrise : les pays par niveau de maîtrise ------------------------------------------------

function geoQuizShowMastery() {
    geoQuizShowPanel('geoquiz-mastery');
    const status = geoQuizEl('geoquiz-status');
    status.textContent = t('tools.countries_loading');
    countriesLoad().then(ok => {
        if (!ok) { status.textContent = t('tools.countries_error'); return; }
        status.textContent = '';
        geoQuizRenderMastery();
    });
}

function geoQuizRenderMastery() {
    const core = GeoQuizSessionCore;
    const state = geoQuizStateLoad();
    const pool = geoQuizEveryCountry();
    const counts = core.masteryCounts(state, pool);
    geoQuizEl('geoquiz-mastery-total').textContent = t('geoquiz.mastery_total', { mastered: counts.mastered, total: counts.total });
    const legend = ['mastered', 'learning', 'weak', 'new'].map(level => {
        const li = document.createElement('li');
        const dot = document.createElement('span');
        dot.className = 'geoquiz-dot geoquiz-m-' + level;
        li.append(dot, document.createTextNode(' ' + t('geoquiz.mastery_' + level, { n: counts[level] })));
        return li;
    });
    geoQuizEl('geoquiz-mastery-legend').replaceChildren(...legend);
    const zones = core.ZONES.filter(z => z.continents).map(z => {
        const list = pool.filter(c => z.continents.indexOf(c.cont) !== -1).sort((a, b) => (a.n < b.n ? -1 : 1));
        const got = core.masteryCounts(state, list);
        const wrap = document.createElement('section');
        wrap.className = 'geoquiz-zone-block';
        const title = document.createElement('h4');
        title.className = 'geoquiz-zone-title';
        title.textContent = t('geoquiz.zone_' + z.key) + ' · ' + t('geoquiz.mastery_zone', { mastered: got.mastered, total: got.total });
        const bar = document.createElement('div');
        bar.className = 'geoquiz-bar';
        bar.setAttribute('aria-hidden', 'true');
        const fill = document.createElement('span');
        fill.style.width = (got.total ? Math.round(100 * got.mastered / got.total) : 0) + '%';
        bar.appendChild(fill);
        const grid = document.createElement('div');
        grid.className = 'geoquiz-grid';
        list.forEach(c => {
            const level = core.masteryOf(state.countries[c.id]);
            const cell = document.createElement('span');
            cell.className = 'geoquiz-cell geoquiz-m-' + level;
            cell.setAttribute('role', 'img');
            cell.setAttribute('aria-label', c.n + ' : ' + t('geoquiz.mastery_word_' + level));
            cell.title = c.n;
            cell.textContent = GeoQuizCore.clueValues(c, 'flag')[0] || '🏳️';
            grid.appendChild(cell);
        });
        wrap.append(title, bar, grid);
        return wrap;
    });
    geoQuizEl('geoquiz-mastery-zones').replaceChildren(...zones);
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
    geoQuizRenderStats(state);
    geoQuizRenderProgress(state);
    geoQuizRenderRanking(state);
}

// « Ma progression » : le pourcentage de bonnes réponses de chaque partie, en ligne (SVG), avec le même texte pour les lecteurs d'écran.
function geoQuizRenderProgress(state) {
    const points = GeoQuizSessionCore.progressionOf(state);
    const chart = geoQuizEl('geoquiz-progress-chart');
    geoQuizEl('geoquiz-progress-none').classList.toggle('hidden', points.length >= 2);
    if (points.length < 2) { chart.replaceChildren(); return; }
    const W = 300, H = 120, PAD = 8;
    const x = i => PAD + (i * (W - 2 * PAD)) / (points.length - 1);
    const y = p => H - PAD - (p.pct / 100) * (H - 2 * PAD);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', t('geoquiz.progress_aria', { n: points.length, first: points[0].pct, last: points[points.length - 1].pct }));
    svg.classList.add('geoquiz-chart-svg');
    const line = document.createElementNS(NS, 'polyline');
    line.setAttribute('points', points.map((p, i) => x(i) + ',' + y(p)).join(' '));
    line.setAttribute('class', 'geoquiz-chart-line');
    svg.appendChild(line);
    points.forEach((p, i) => {
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', x(i));
        dot.setAttribute('cy', y(p));
        dot.setAttribute('r', 2.5);
        dot.setAttribute('class', 'geoquiz-chart-dot');
        const title = document.createElementNS(NS, 'title');
        title.textContent = new Date(p.at).toLocaleDateString('fr-FR') + ' : ' + p.pct + ' %';
        dot.appendChild(title);
        svg.appendChild(dot);
    });
    chart.replaceChildren(svg);
}

// « Pays les moins bien réussis » et « mieux réussis » : il faut les noms des pays, donc les données de l'Atlas.
function geoQuizRenderRanking(state) {
    const worst = geoQuizEl('geoquiz-rank-worst');
    const best = geoQuizEl('geoquiz-rank-best');
    const ids = Object.keys(state.countries);
    const fill = ranking => {
        const item = r => {
            const li = document.createElement('li');
            li.textContent = countriesData.byId.get(r.id).n + ' · ' + t('geoquiz.rank_line', { pct: r.pct, ok: r.ok, n: r.n });
            return li;
        };
        worst.replaceChildren(...ranking.worst.map(item));
        best.replaceChildren(...ranking.best.map(item));
        geoQuizEl('geoquiz-rank-best-title').classList.toggle('hidden', ranking.best.length === 0);
        geoQuizEl('geoquiz-rank-none').classList.toggle('hidden', ranking.worst.length + ranking.best.length > 0);
    };
    worst.replaceChildren();
    best.replaceChildren();
    geoQuizEl('geoquiz-rank-best-title').classList.add('hidden');
    if (!ids.length) { geoQuizEl('geoquiz-rank-none').classList.remove('hidden'); return; }
    countriesLoad().then(ok => {
        if (!ok) return;
        fill(GeoQuizSessionCore.countryRanking(state, ids.filter(id => countriesData.byId.has(id)), 5));
    });
}

// « Mes statistiques » : les totaux, puis une ligne par forme jouée (parties, réussite, meilleur score, plus longue série).
function geoQuizRenderStats(state) {
    const stats = GeoQuizSessionCore.statsOf(state);
    geoQuizEl('geoquiz-stats-none').classList.toggle('hidden', stats.games > 0);
    geoQuizEl('geoquiz-stats-total').textContent = stats.games
        ? t('geoquiz.stats_total', { games: stats.games, pct: stats.pct, streak: stats.streak })
        : '';
    geoQuizEl('geoquiz-stats-forms').replaceChildren(...stats.forms.map(f => {
        const li = document.createElement('li');
        const head = document.createElement('strong');
        head.textContent = t('geoquiz.form_' + f.form);
        li.append(head, document.createTextNode(' ' + t('geoquiz.stats_form', {
            games: f.games, pct: f.pct === null ? '–' : f.pct, best: f.best, streak: f.streak
        })));
        return li;
    }));
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
