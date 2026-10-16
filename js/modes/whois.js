// Extrait de l'ancien js/app.js — Mode Qui est-ce ? et portrait du jour.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// === MODE « QUI EST-CE ? » ===
// Un portrait, quatre noms. Les portraits viennent des panthéons (champ `image`) : le mode n'est donc
// proposé que pour un thème dont assez de figures en ont un (voir updateWhoisCard).
//
// La légende de l'image dit qui c'est : elle n'apparaît qu'à la réponse. Le crédit (auteur, licence),
// lui, reste sous le portrait pendant la question — c'est la condition des licences CC BY et CC BY-SA.
//
// Le révélé ne se referme pas tout seul : il porte la fiche de la personne (légende, dates, description),
// qu'on ne lit pas en deux secondes. Rencontrer une figure ici la débloque dans la galerie, comme dans
// n'importe quel autre mode (srsRecord).

let whoQuestions = [];
let whoIndex = 0;
// Vrai pendant le portrait du jour : la même question pour tous, sans points ni vies ni écran de fin.
let whoDailyMode = false;

// La carte n'a de sens que si le thème a de quoi nourrir des questions sans mauvaise réponse devinable.
function updateWhoisCard() {
    const card = document.getElementById('mode-card-whois');
    if (!card) return;
    const enough = GameModes.whoCandidates(getModePoolRaw()).length >= GameModes.WHO_MIN_PORTRAITS;
    card.classList.toggle('hidden', !enough);
}

function startWhoisGame() {
    endPortraitDayMode();
    resetSessionHistory();
    currentMode = 'whois';
    const sourceEvents = getSessionPool();

    // Les portraits à trouver viennent de la manche, les mauvaises réponses de tout le thème : davantage
    // de noms proches de l'époque à proposer qu'avec les vingt seuls événements de la manche.
    whoQuestions = GameModes.buildWhoQuestions(sourceEvents, { pool: getModePoolRaw() });
    if (whoQuestions.length < 3) {
        alert(t('whois.not_enough'));
        return;
    }

    whoIndex = 0;
    lives = 3;
    score = 0;
    comboMultiplier = 1.0;
    currentRoundSize = whoQuestions.length;
    currentGameSpan = 1;

    showScreen('screen-whois');
    renderWhoQuestion();
}

function renderWhoQuestion() {
    if (whoIndex >= whoQuestions.length) {
        endGame(true);
        return;
    }
    isAnimating = false;
    questionStartTime = Date.now();

    const q = whoQuestions[whoIndex];
    const image = portraitOf(q.correct);
    const img = document.getElementById('whois-portrait-img');
    img.alt = t('whois.portrait_alt');
    img.onerror = null;
    img.src = image.src;
    fillPortraitCredit(document.getElementById('whois-portrait-credit'), image);
    document.getElementById('whois-reveal').classList.add('hidden');
    document.getElementById('whois-kicker').innerText = t(whoDailyMode ? 'whois.daily_kicker' : 'whois.kicker');

    const container = document.getElementById('whois-options');
    container.innerHTML = '';
    A11y.focusQuestion('screen-whois');
    container.style.pointerEvents = 'none';
    requestAnimationFrame(() => { container.style.pointerEvents = 'auto'; });

    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option whois-option';
        btn.dataset.eventId = opt.id;
        btn.innerText = opt.name;
        btn.onclick = () => answerWho(opt.id);
        container.appendChild(btn);
    });

    document.getElementById('whois-hud-count').innerText = `${whoIndex + 1} / ${whoQuestions.length}`;
    document.getElementById('whois-progress-fill').style.width =
        Math.round(whoIndex / whoQuestions.length * 100) + '%';
    updateWhoHUD();
}

function answerWho(chosenId) {
    if (isAnimating) return;
    isAnimating = true;

    const q = whoQuestions[whoIndex];
    const correct = chosenId === q.correctId;

    if (correct) { playCorrectSound(comboMultiplier); triggerHaptic('success'); }
    else { playWrongSound(); triggerHaptic('error'); }
    // Rencontrer la figure la débloque dans la collection, au jour comme en partie.
    srsRecord(q.correctId, correct);

    if (whoDailyMode) {
        // Ni points, ni vie, ni série : le portrait du jour n'est pas classé. On retient seulement
        // la réponse, pour que le bouton des défis dise où l'on en est aujourd'hui.
        portraitDaySave({ date: DailyEngine.getDailySeedString(), chosenId, correct });
    } else {
        awardPoints(correct ? 0 : 1, correct);
        checkBadgeProgressOnAction(correct);
        recordSessionStep(q.correct, correct, false);
        if (!correct) lives -= 1;
        updateWhoHUD();
    }
    showWhoAnswer(q, chosenId, correct);
}

// Ce que la réponse montre : options colorées, puis la fiche. Séparé d'answerWho pour que le
// portrait du jour, déjà répondu, puisse se rouvrir tel qu'on l'a laissé sans rien recompter.
function showWhoAnswer(q, chosenId, correct) {
    document.querySelectorAll('#whois-options .whois-option').forEach(b => {
        b.style.pointerEvents = 'none';
        if (b.dataset.eventId === q.correctId) b.classList.add('correct');
        else if (b.dataset.eventId === chosenId) b.classList.add('wrong');
    });
    renderWhoReveal(q, correct);
}

// La fiche de la personne : qui c'est, quand elle est née, ce qu'on voit sur l'image, ce qu'elle a fait.
// « Continuer » est un vrai bouton, qui prend le focus : Entrée suffit pour enchaîner.
function renderWhoReveal(q, correct) {
    const reveal = document.getElementById('whois-reveal');
    reveal.innerHTML = '';
    const image = portraitOf(q.correct);

    const verdict = document.createElement('div');
    verdict.className = 'whois-reveal-verdict ' + (correct ? 'is-good' : 'is-bad');
    verdict.innerText = t(correct ? 'whois.reveal_right' : 'whois.reveal_wrong');
    reveal.appendChild(verdict);

    const name = document.createElement('div');
    name.className = 'whois-reveal-name';
    name.innerText = q.name;
    const born = document.createElement('small');
    born.innerText = ` · ${formatEventDate(q.correct)}`;
    name.appendChild(born);
    reveal.appendChild(name);

    if (image && image.legende) {
        const caption = document.createElement('div');
        caption.className = 'whois-reveal-caption';
        caption.innerText = image.legende;
        reveal.appendChild(caption);
    }

    const desc = document.createElement('p');
    desc.className = 'whois-reveal-desc';
    desc.innerText = q.correct.description || '';
    if (q.correct.description === undefined) {
        ensureDescriptions([q.correct]).then(() => { desc.innerText = q.correct.description || ''; });
    }
    reveal.appendChild(desc);

    // Le portrait du jour se prolonge par la fiche complète — avec ses accès au jeu — puis se referme.
    if (whoDailyMode) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'btn btn-secondary whois-continue';
        card.id = 'whois-daily-card';
        card.innerText = t('whois.daily_card');
        card.onclick = () => openModal(q.correct, whoThemeContext(q.correct));
        reveal.appendChild(card);
    }
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn whois-continue';
    next.id = 'whois-continue';
    next.innerText = t(whoDailyMode ? 'whois.daily_done' : 'whois.continue');
    next.onclick = continueWho;
    reveal.appendChild(next);

    reveal.classList.remove('hidden');
    next.focus({ preventScroll: true });
    reveal.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function continueWho() {
    if (!isAnimating) return;
    if (whoDailyMode) {
        showScreen('screen-categories', 'back');
        return;
    }
    whoIndex++;
    if (lives <= 0) { endGame(false); return; }
    renderWhoQuestion();
}

function updateWhoHUD() {
    document.getElementById('whois-hud-score').innerText = score;
    renderComboChip(document.getElementById('whois-hud-combo'), comboMultiplier);
    let pips = '';
    for (let i = 0; i < 3; i++) pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
    document.getElementById('whois-hud-lives').innerHTML = pips;
}


// --- Portrait du jour ---
// Un « Qui est-ce ? » d'une seule question, la même pour tous les joueurs d'un jour (graine du Défi du
// jour, mais avec son propre préfixe : le tirage du Défi classé, que le serveur recalcule, n'en est
// jamais touché). Non classé : ni points, ni vies, ni série, et pas d'écran de fin. Répondu, il se
// rouvre tel qu'on l'a laissé — une seule réponse par jour.

function endPortraitDayMode() {
    whoDailyMode = false;
    const screen = document.getElementById('screen-whois');
    if (screen) screen.classList.remove('is-portrait-day');
}

// Toutes les figures à portrait des panthéons de la base.
function getPortraitDayPool() {
    const events = [];
    bdd.forEach(category => {
        const pantheon = findPantheonNode(category);
        if (pantheon) pantheon.themes.forEach(theme => events.push(...(theme.events || [])));
    });
    return events;
}

function getPortraitDayQuestion() {
    const seed = DailyEngine.hashStringToSeed('historiaxe_portrait_' + DailyEngine.getDailySeedString());
    return GameModes.buildDailyWhoQuestion(getPortraitDayPool(), DailyEngine.mulberry32(seed));
}

// Le bouton des défis : caché sans portraits (pack sans panthéons), sinon il dit où l'on en est aujourd'hui.
function refreshPortraitDayButton(btn) {
    const enough = GameModes.whoCandidates(getPortraitDayPool()).length >= GameModes.WHO_MIN_PORTRAITS;
    btn.classList.toggle('hidden', !enough);
    if (!enough) return;
    const saved = portraitDayLoad();
    const answeredToday = !!saved && saved.date === DailyEngine.getDailySeedString();
    const key = !answeredToday ? 'whois.daily_sub_new' : (saved.correct ? 'whois.daily_sub_right' : 'whois.daily_sub_wrong');
    btn.querySelector('#portrait-day-status').innerText = t(key);
}

// Le contexte d'une fiche ouverte depuis une figure : son thème, pour le bouton « Jouer sur… ».
function whoThemeContext(evt) {
    const item = getAllThemesWithPath().find(x => (x.theme.events || []).some(e => e.id === evt.id));
    if (!item) return null;
    return { theme: item.theme, categoryIndex: item.ci, subcategoryIndex: item.si, themeIndex: item.ti, hideRedraw: true };
}

function startPortraitOfTheDay() {
    const q = getPortraitDayQuestion();
    if (!q) return;
    resetSessionHistory();
    currentMode = 'whois';
    whoDailyMode = true;
    revisionMode = false;
    favoritesMode = false;
    dailyChallengeMode = false;
    weeklyChallengeMode = false;
    simulChallengeMode = false;
    axisFilterActive = false;
    isSelectionActive = false;
    whoQuestions = [q];
    whoIndex = 0;
    lives = 3;
    score = 0;
    comboMultiplier = 1.0;
    currentRoundSize = 1;
    currentGameSpan = 1;

    document.getElementById('screen-whois').classList.add('is-portrait-day');
    showScreen('screen-whois');
    renderWhoQuestion();

    const saved = portraitDayLoad();
    if (saved && saved.date === DailyEngine.getDailySeedString()) {
        isAnimating = true;
        showWhoAnswer(q, saved.chosenId, !!saved.correct);
    }
}


