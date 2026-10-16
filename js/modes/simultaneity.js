// Extrait de l'ancien js/app.js — Mode « Pendant ce temps, ailleurs… » et son défi.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// === MODE « PENDANT CE TEMPS, AILLEURS… » ===
// Le seul mode qui sorte du thème : l'ancre en vient, les quatre réponses
// non. Toute la génération vit dans js/simultaneity.js — un module sans DOM,
// donc testable par `npm test` (voir tests/simultaneity.test.js), ce que
// l'écran ci-dessous ne serait pas. Ici : l'affichage, le score et le révélé.

let simulQuestions = [];
let simulIndex = 0;
// Distingue le Défi de simultanéité (ancres tirées de l'historique du joueur,
// lancé depuis l'écran des catégories) du mode lancé depuis un thème : même
// écran et mêmes règles, mais ni score rattaché à un thème ni retour vers lui.
let simulChallengeMode = false;

// Toujours passer par ici plutôt que de lire le drapeau nu : il reste levé
// jusqu'au prochain screenAfterGame(), et une partie lancée entre-temps par un
// chemin qui ne le remet pas à zéro verrait sinon son score non enregistré et
// son retour arrière détourné. Le croiser avec currentMode rend le drapeau
// inoffensif partout ailleurs.
function isSimultaneityChallenge() {
    return currentMode === 'simultaneity' && simulChallengeMode;
}
// Le vivier de réponses traverse les 795 thèmes : on ne le reconstruit pas à
// chaque partie. Le cache est indexé sur la base elle-même plutôt que sur la
// langue, parce que c'est bien `window.bdd` qui est remplacé lors d'un
// changement de pack (voir js/i18n.js: loadLanguage) — et aussi à l'ajout
// d'un thème personnalisé.
let simulPoolCache = null;
let simulTagIndexCache = null;
let simulPoolCacheSource = null;

function getSimultaneityIndexes() {
    const source = window.bdd || bdd || [];
    if (simulPoolCache && simulPoolCacheSource === source) {
        return { pool: simulPoolCache, tagByEventId: simulTagIndexCache };
    }
    const options = {
        countryByTheme: (typeof GEO_THEME_COUNTRY !== 'undefined' && GEO_THEME_COUNTRY) || {},
        excludedThemeIds: (typeof DailyEngine !== 'undefined' && DailyEngine.EXCLUDED_THEME_IDS) || []
    };
    simulPoolCache = Simultaneity.buildAnswerPool(source, options);
    simulTagIndexCache = Simultaneity.buildTagIndex(source, options);
    simulPoolCacheSource = source;
    return { pool: simulPoolCache, tagByEventId: simulTagIndexCache };
}

// Prépare des ancres à partir d'événements bruts. Chaque ancre porte
// l'étiquette de SON thème d'origine — pas celle du thème en cours. La
// nuance ne change rien à une partie ordinaire, mais elle est décisive
// partout où les ancres viennent de plusieurs thèmes (Révision, Défi de
// simultanéité) : sans elle, une réponse pourrait sortir du thème même dont
// l'ancre est issue. Le nom du thème est embarqué ici plutôt que relu à
// l'affichage, faute de « thème courant » dans ces deux cas.
function buildSimultaneityAnchors(events, tagByEventId, defaultThemeName) {
    return (events || [])
        .filter(e => e && typeof e.date === 'number' && tagByEventId[e.id])
        .map(e => Object.assign({}, e, {
            tag: tagByEventId[e.id],
            themeName: e.__themeName || defaultThemeName || ''
        }));
}

function startSimultaneityGame() {
    resetSessionHistory();
    currentMode = 'simultaneity';
    simulChallengeMode = false;

    // Vivier entier : ce mode a déjà sa propre longueur (SESSION_ROUNDS), et
    // ses ancres doivent être choisies parmi TOUS les événements du thème —
    // beaucoup n'ont aucun contemporain dans le vivier des réponses, si bien
    // qu'une pré-coupe à 20 réduirait la session bien en dessous de 12.
    const sourceEvents = getModePoolRaw();

    const { pool, tagByEventId } = getSimultaneityIndexes();
    const theme = revisionMode ? null : getCurrentTheme();
    const anchors = buildSimultaneityAnchors(sourceEvents, tagByEventId, theme ? theme.nom : '');

    const questions = Simultaneity.buildSession(anchors, pool, {
        count: Simultaneity.SESSION_ROUNDS
    });

    // Un thème dont l'époque est mal couverte par le vivier ne peut pas
    // remplir une session : le dire franchement vaut mieux que de lancer
    // trois questions et de conclure par une victoire qui n'en est pas une.
    if (questions.length < 4) {
        alert(t('simultaneity.not_enough'));
        return;
    }
    launchSimultaneitySession(questions);
}

function launchSimultaneitySession(questions) {
    currentRoundSize = questions.length;
    simulQuestions = questions;
    simulIndex = 0;
    lives = 3;
    score = 0;
    comboMultiplier = 1.0;

    const dates = questions.map(q => q.anchor.date);
    currentGameSpan = Math.max(1, Math.max(...dates) - Math.min(...dates));

    showScreen('screen-simultaneity');
    renderSimultaneityQuestion();
}


// --- DÉFI DE SIMULTANÉITÉ (version globale, depuis l'écran des catégories) ---
//
// Le mode par thème garantit que le joueur connaît l'ancre : c'est le thème
// qu'il vient d'ouvrir. Une version globale perd cette garantie — d'où la
// règle qui la rend jouable : les ancres sont tirées de ce que le joueur a
// DÉJÀ RENCONTRÉ, jamais de toute la base.
//
// Le signal utilisé est le SRS (js/storage.js: srsRecord), alimenté par tous
// les modes sans exception : y figurent exactement les événements sur
// lesquels le joueur a été interrogé au moins une fois. On préfère ceux qu'il
// a déjà réussis (boîte ≥ 2) — ceux-là, il les connaît vraiment — et on
// n'élargit aux simples rencontres que si le stock est trop mince.
//
// Ce défi n'est PAS classé, et c'est structurel : le tirage dépend de
// l'historique de chaque joueur, donc deux joueurs ne répondent jamais aux
// mêmes questions. Aucun score n'est envoyé au serveur, contrairement au Défi
// du jour et au Défi hebdomadaire (voir README). Il garde en revanche leur
// rythme : la graine mêle l'identifiant d'appareil au jour courant, si bien
// que les 10 questions restent les mêmes jusqu'à demain.

// En dessous, le vivier personnel est trop mince pour faire une session qui
// ne se répète pas. Atteint après deux ou trois parties — assez tôt pour ne
// pas frustrer, assez tard pour que « déjà travaillé » veuille dire quelque
// chose.
const SIMUL_CHALLENGE_MIN_ENCOUNTERED = 20;

// Événements déjà rencontrés par le joueur, résolus en objets jouables.
// `known` = déjà réussi au moins une fois (boîte ≥ 2), `seen` = rencontré.
function getEncounteredEvents() {
    const srs = srsLoad();
    const known = [];
    const seen = [];
    getAllEventsWithLocation().forEach(item => {
        const entry = srs[item.event.id];
        if (!entry) return;
        // Le nom du thème voyage avec l'événement : au Défi, il n'y a pas de
        // « thème courant » à interroger au moment de l'affichage.
        const evt = Object.assign({}, item.event, { __themeName: item.theme ? item.theme.nom : '' });
        seen.push(evt);
        if ((entry.box || 1) >= 2) known.push(evt);
    });
    return { known, seen };
}

// État du verrou, sans résoudre les événements : l'écran des catégories se
// redessine à chaque retour, et getEncounteredEvents() balaie les 19 781
// événements de la base (~11 ms). Le nombre de fiches SRS suffit à décider de
// l'affichage. Il peut surestimer légèrement — une fiche peut pointer un
// événement disparu (thème personnalisé supprimé, changement de langue) —
// mais la résolution réelle a lieu au lancement, et `challenge_thin` rattrape
// le cas où elle ne donnerait pas assez d'ancres.
function getSimultaneityChallengeStatus() {
    let count = 0;
    try { count = Object.keys(srsLoad()).length; } catch (e) { count = 0; }
    return {
        count,
        unlocked: count >= SIMUL_CHALLENGE_MIN_ENCOUNTERED,
        missing: Math.max(0, SIMUL_CHALLENGE_MIN_ENCOUNTERED - count)
    };
}

function startSimultaneityChallenge() {
    const status = getSimultaneityChallengeStatus();
    if (!status.unlocked) {
        showConfirm(t('simultaneity.challenge_locked', { missing: status.missing }), null, { alertOnly: true });
        return;
    }
    const encountered = getEncounteredEvents();

    resetSessionHistory();
    currentMode = 'simultaneity';
    simulChallengeMode = true;
    revisionMode = false;
    favoritesMode = false;
    dailyChallengeMode = false;
    weeklyChallengeMode = false;
    axisFilterActive = false;
    isSelectionActive = false;

    const { pool, tagByEventId } = getSimultaneityIndexes();
    // Les événements déjà réussis d'abord ; on retombe sur les simples
    // rencontres tant qu'ils ne suffisent pas à nourrir une session variée.
    const base = encountered.known.length >= SIMUL_CHALLENGE_MIN_ENCOUNTERED
        ? encountered.known
        : encountered.seen;
    const anchors = buildSimultaneityAnchors(base, tagByEventId, '');

    // Même graine toute la journée, propre à cet appareil : le défi du jour
    // ne change pas si on le relance, mais il est renouvelé demain.
    const seed = DailyEngine.hashStringToSeed(
        'historiaxe_simul_' + getOrCreateDeviceId() + '_' + DailyEngine.getDailySeedString());
    const questions = Simultaneity.buildSession(anchors, pool, {
        rng: DailyEngine.mulberry32(seed),
        count: Simultaneity.CHALLENGE_ROUNDS
    });

    if (questions.length < 4) {
        showConfirm(t('simultaneity.challenge_thin'), null, { alertOnly: true });
        simulChallengeMode = false;
        return;
    }

    // Les ancres viennent de thèmes divers : on renseigne les axes à partir
    // du tirage plutôt que d'un thème courant qui n'existe pas (même
    // précaution que startDailyChallenge).
    currentThemeAxes = [...new Set(questions.map(q => q.anchor.axe).filter(Boolean))];
    launchSimultaneitySession(questions);
}

function renderSimultaneityQuestion() {
    if (simulIndex >= simulQuestions.length) {
        endGame(true);
        return;
    }
    isAnimating = false;
    questionStartTime = Date.now();

    const q = simulQuestions[simulIndex];
    document.getElementById('simul-anchor-year').innerText = formatYear(q.anchor.date);
    document.getElementById('simul-anchor-title').innerText = q.anchor.titre;
    // Le thème d'origine voyage avec l'ancre (voir buildSimultaneityAnchors) :
    // au Défi comme en Révision, les ancres viennent de thèmes divers et il
    // n'y a pas de « thème courant » à interroger ici.
    const themeEl = document.getElementById('simul-anchor-theme');
    themeEl.innerText = q.anchor.themeName || '';
    themeEl.classList.toggle('hidden', !q.anchor.themeName);

    const reveal = document.getElementById('simul-reveal');
    reveal.innerHTML = '';
    reveal.classList.add('hidden');

    const container = document.getElementById('simul-options');
    container.innerHTML = '';
    A11y.focusQuestion('screen-simultaneity');
    container.style.pointerEvents = 'none';
    requestAnimationFrame(() => { container.style.pointerEvents = 'auto'; });

    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option simul-option';
        btn.dataset.eventId = opt.id;
        // innerText et non innerHTML : un titre d'événement peut venir d'un
        // thème personnalisé, donc d'une saisie du joueur.
        btn.innerText = opt.titre;
        btn.onclick = () => answerSimultaneity(opt);
        container.appendChild(btn);
    });

    document.getElementById('simul-hud-count').innerText = `${simulIndex + 1} / ${simulQuestions.length}`;
    document.getElementById('simul-progress-fill').style.width =
        Math.round(simulIndex / simulQuestions.length * 100) + '%';
    updateSimultaneityHUD();
}

function answerSimultaneity(chosen) {
    if (isAnimating) return;
    isAnimating = true;

    const q = simulQuestions[simulIndex];
    const isCorrect = chosen.id === q.correct.id;
    // Même barème que le Quiz : l'écart de dates mesure à quel point la
    // réponse était plausible, pas seulement si elle était juste.
    awardPoints(Math.abs(chosen.date - q.anchor.date), isCorrect);
    if (isCorrect) { playCorrectSound(comboMultiplier); triggerHaptic('success'); }
    else { playWrongSound(); triggerHaptic('error'); }
    checkBadgeProgressOnAction(isCorrect);

    // Le SRS retient l'événement-RÉPONSE, jamais l'ancre : le joueur vient
    // de rencontrer un repère venu d'un thème qu'il n'a peut-être jamais
    // ouvert, et c'est celui-là qui mérite de revenir en révision. C'est ce
    // qui fait de ce mode une porte d'entrée vers le reste du catalogue
    // plutôt qu'un exercice de plus sur le thème en cours.
    srsRecord(q.correct.id, isCorrect);
    recordSessionStep(q.correct, isCorrect, false);

    document.querySelectorAll('#simul-options .simul-option').forEach(b => {
        b.style.pointerEvents = 'none';
        if (b.dataset.eventId === q.correct.id) b.classList.add('correct');
        else if (b.dataset.eventId === chosen.id) b.classList.add('wrong');
    });

    if (!isCorrect) lives -= 1;
    updateSimultaneityHUD();
    renderSimultaneityReveal(q);

    // Pas de minuterie : le révélé est la vraie récompense du mode, le joueur
    // le lit à son rythme et passe à la suite avec « Suivant ».
    appendRevealNextButton(document.getElementById('simul-reveal'), () => {
        simulIndex++;
        if (lives <= 0) { endGame(false); return; }
        renderSimultaneityQuestion();
    });
}

// Bouton « Suivant » placé sous un bloc de révélation : les modes à révélé
// (Simultanéité, Remise en ordre, Intrus) n'avancent pas seuls, le joueur lit
// à son rythme.
function appendRevealNextButton(reveal, onNext) {
    const btn = document.createElement('button');
    btn.className = 'btn simul-next-btn';
    btn.innerText = t('nav.next');
    btn.onclick = () => {
        btn.onclick = null;
        onNext();
    };
    reveal.appendChild(btn);
    btn.focus({ preventScroll: true });
    btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// « En 1789, pendant que la Bastille tombait : … » — deux ou trois
// contemporains réels, affichés que la réponse soit bonne ou mauvaise.
function renderSimultaneityReveal(q) {
    const reveal = document.getElementById('simul-reveal');
    reveal.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'simul-reveal-title';
    title.innerText = t('simultaneity.reveal_title', { year: formatYear(q.anchor.date) });
    reveal.appendChild(title);

    q.reveal.forEach(item => {
        const row = document.createElement('div');
        row.className = 'simul-reveal-row';

        const year = document.createElement('span');
        year.className = 'simul-reveal-year';
        year.innerText = formatYear(item.date);

        const text = document.createElement('span');
        text.className = 'simul-reveal-text';
        const label = document.createElement('strong');
        label.innerText = item.titre;
        text.appendChild(label);
        if (item.themeName) {
            const origin = document.createElement('small');
            origin.innerText = item.themeName;
            text.appendChild(origin);
        }

        row.appendChild(year);
        row.appendChild(text);
        reveal.appendChild(row);
    });

    reveal.classList.remove('hidden');
}

function updateSimultaneityHUD() {
    document.getElementById('simul-hud-score').innerText = score;
    renderComboChip(document.getElementById('simul-hud-combo'), comboMultiplier);
    let pips = '';
    for (let i = 0; i < 3; i++) pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
    document.getElementById('simul-hud-lives').innerHTML = pips;
}


