// Extrait de l'ancien js/app.js — Mode L'intrus.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// === MODE « L'INTRUS » ===
// Quatre événements, trois qui vont ensemble et un qui détonne. Aucune date
// affichée : c'est le sens de l'époque qu'on entraîne, pas la mémoire des
// années — et c'est pour ça que le révélé, lui, les montre toutes.
//
// Deux familles de questions (voir GameModes.buildIntrusQuestions) : trois
// événements d'une même période, ou trois d'un même axe thématique. L'énoncé
// dit toujours laquelle, sans quoi la question serait indécidable.

let intrusQuestions = [];
let intrusIndex = 0;

function startIntrusGame() {
    resetSessionHistory();
    currentMode = 'intrus';
    const sourceEvents = getSessionPool();

    intrusQuestions = expeditionCap(GameModes.buildIntrusQuestions(sourceEvents), 'intrus');
    if (intrusQuestions.length < 3) {
        alert(t('intrus.not_enough'));
        return;
    }

    intrusIndex = 0;
    lives = startingLives();
    score = 0;
    comboMultiplier = 1.0;
    currentRoundSize = intrusQuestions.length;
    currentGameSpan = 1;

    showScreen('screen-intrus');
    renderIntrusQuestion();
}

function renderIntrusQuestion() {
    if (intrusIndex >= intrusQuestions.length) {
        endGame(true);
        return;
    }
    isAnimating = false;
    questionStartTime = Date.now();

    const q = intrusQuestions[intrusIndex];
    document.getElementById('intrus-kicker').innerText = q.kind === 'axe'
        ? t('intrus.kicker_axe')
        : t('intrus.kicker_periode');
    document.getElementById('intrus-reveal').classList.add('hidden');

    const container = document.getElementById('intrus-options');
    container.innerHTML = '';
    A11y.focusQuestion('screen-intrus');
    container.style.pointerEvents = 'none';
    requestAnimationFrame(() => { container.style.pointerEvents = 'auto'; });

    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option intrus-option';
        btn.dataset.eventId = opt.id;
        // Aucune date ici : c'est tout le sujet du mode.
        btn.innerText = opt.titre;
        btn.onclick = () => answerIntrus(opt.id);
        container.appendChild(btn);
    });

    document.getElementById('intrus-hud-count').innerText =
        `${intrusIndex + 1} / ${intrusQuestions.length}`;
    document.getElementById('intrus-progress-fill').style.width =
        Math.round(intrusIndex / intrusQuestions.length * 100) + '%';
    animateQuestionIn('screen-intrus');
    updateIntrusHUD();
}

function answerIntrus(chosenId) {
    if (isAnimating) return;
    isAnimating = true;

    const q = intrusQuestions[intrusIndex];
    const correct = chosenId === q.intruderId;
    // Mode Classe : l'intrus désigné part au journal (js/classroom.js).
    if (typeof classOnRound === 'function') classOnRound('intrus', intrusIndex, { choice: chosenId });

    awardPoints(correct ? 0 : 1, correct);
    if (correct) { playCorrectSound(comboMultiplier); triggerHaptic('success'); }
    else { playWrongSound(); triggerHaptic('error'); }
    checkBadgeProgressOnAction(correct);
    const intruder = q.options.find(o => o.id === q.intruderId);
    srsRecord(q.intruderId, correct);
    recordSessionStep(intruder, correct, false);

    document.querySelectorAll('#intrus-options .intrus-option').forEach(b => {
        b.style.pointerEvents = 'none';
        if (b.dataset.eventId === q.intruderId) b.classList.add('correct');
        else if (b.dataset.eventId === chosenId) b.classList.add('wrong');
    });

    if (!correct) lives -= 1;
    updateIntrusHUD();
    renderIntrusReveal(q);

    appendRevealNextButton(document.getElementById('intrus-reveal'), () => {
        intrusIndex++;
        if (lives <= 0) { endGame(false); return; }
        renderIntrusQuestion();
    });
}

// Le révélé montre les dates que la question cachait, et dit ce qui liait les
// trois autres — sans quoi le joueur qui se trompe n'apprend rien.
function renderIntrusReveal(q) {
    const reveal = document.getElementById('intrus-reveal');
    reveal.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'simul-reveal-title';
    title.innerText = q.kind === 'axe'
        ? t('intrus.reveal_axe', { axe: q.axis })
        : t('intrus.reveal_periode');
    reveal.appendChild(title);

    q.options.slice().sort((a, b) => a.date - b.date).forEach(opt => {
        const row = document.createElement('div');
        row.className = 'simul-reveal-row' + (opt.id === q.intruderId ? ' is-intrus' : '');
        const year = document.createElement('span');
        year.className = 'simul-reveal-year';
        year.innerText = formatYear(opt.date);
        const text = document.createElement('span');
        text.className = 'simul-reveal-text';
        const strong = document.createElement('strong');
        strong.innerText = opt.titre;
        text.appendChild(strong);
        if (opt.id === q.intruderId) {
            const tag = document.createElement('small');
            tag.innerText = t('intrus.reveal_tag');
            text.appendChild(tag);
        }
        row.appendChild(year);
        row.appendChild(text);
        reveal.appendChild(row);
    });

    reveal.classList.remove('hidden');
}

function updateIntrusHUD() {
    document.getElementById('intrus-hud-score').innerText = score;
    renderComboChip(document.getElementById('intrus-hud-combo'), comboMultiplier);
    let pips = '';
    for (let i = 0; i < 3; i++) pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
    document.getElementById('intrus-hud-lives').innerHTML = pips;
}


