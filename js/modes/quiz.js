// Extrait de l'ancien js/app.js — Mode Quiz.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// === MODE QUIZ ===
// QCM à 4 réponses, mêlant questions « événement → année » et « année → événement »,
// pioché dans le même pool que les autres modes (thème, filtre d'axes, ou révision).
function startQuizGame() {
    resetSessionHistory();
    currentMode = 'quiz';
    const sourceEvents = getSessionPool();
    if (sourceEvents.length < 4) {
        alert(t('modes.min_events_quiz'));
        return;
    }

    quizQuestions = expeditionCap(buildQuizQuestions(sourceEvents), 'quiz');
    quizIndex = 0;
    lives = startingLives();
    score = 0;
    comboMultiplier = 1.0;
    quizFiftyLeft = 2;

    const gameDates = sourceEvents.map(e => e.date);
    currentGameSpan = Math.max(1, Math.max(...gameDates) - Math.min(...gameDates));

    document.getElementById('quiz-fifty-count').innerText = `(${quizFiftyLeft})`;
    document.getElementById('quiz-fifty-btn').disabled = false;

    showScreen('screen-quiz');
    renderQuizQuestion();
}

// Construit une question par événement du pool (mélangées), en tirant au sort le
// sens de la question et 3 distracteurs réels pris parmi les autres événements.
function buildQuizQuestions(events) {
    const pool = events.filter(e => typeof e.date === 'number');
    if (pool.length < 4) return [];
    const questions = pool.map(evt => {
        const type = Math.random() < 0.5 ? 'event-to-year' : 'year-to-event';
        // Find 3 distractors with unique dates, distinct from evt.date
        let availableDistractors = shuffleArray(pool.filter(e => e.date !== evt.date));
        let distractorEvents = [];
        let usedDates = new Set();
        for (let e of availableDistractors) {
            if (!usedDates.has(e.date)) {
                usedDates.add(e.date);
                distractorEvents.push(e);
                if (distractorEvents.length === 3) break;
            }
        }
        // Fallback if not enough unique dates (rare but possible in very small specific themes)
        if (distractorEvents.length < 3) {
            distractorEvents = shuffleArray(pool.filter(e => e.id !== evt.id)).slice(0, 3);
        }
        return { type, correct: evt, distractorEvents };
    });
    return shuffleArray(questions);
}

function renderQuizQuestion() {
    if (quizIndex >= quizQuestions.length) {
        endGame(true);
        return;
    }
    isAnimating = false;
    quizFiftyActive = false;
    questionStartTime = Date.now();

    const q = quizQuestions[quizIndex];
    const kicker = document.getElementById('quiz-kicker');
    const prompt = document.getElementById('quiz-prompt');
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';

    // La carte-question reçoit le focus (et non plus un simple blur) : les
    // options viennent d'être reconstruites, et Tab doit repartir de la
    // question, pas du bouton « Quitter ».
    A11y.focusQuestion('screen-quiz');
    optionsContainer.style.pointerEvents = 'none';
    requestAnimationFrame(() => {
        optionsContainer.style.pointerEvents = 'auto';
    });

    let options;
    if (q.type === 'event-to-year') {
        kicker.innerText = t('game.quiz_event_to_year');
        prompt.innerText = q.correct.titre;
        options = [q.correct, ...q.distractorEvents].map(e => ({ label: formatYear(e.date), event: e }));
    } else {
        kicker.innerText = t('game.quiz_year_to_event');
        prompt.innerText = formatYear(q.correct.date);
        options = [q.correct, ...q.distractorEvents].map(e => ({ label: e.titre, event: e }));
    }
    options = shuffleArray(options);

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.dataset.eventId = opt.event.id;
        btn.innerText = opt.label;
        btn.onclick = () => answerQuiz(opt.event);
        optionsContainer.appendChild(btn);
    });

    const fiftyBtn = document.getElementById('quiz-fifty-btn');
    fiftyBtn.disabled = quizFiftyLeft <= 0;

    document.getElementById('quiz-hud-count').innerText = `${quizIndex + 1} / ${quizQuestions.length}`;
    const pct = Math.round(quizIndex / quizQuestions.length * 100);
    document.getElementById('quiz-progress-fill').style.width = pct + '%';
    updateQuizHUD();
}

function answerQuiz(chosenEvent) {
    if (isAnimating) return;
    isAnimating = true;

    const q = quizQuestions[quizIndex];
    const isPerfect = chosenEvent.date === q.correct.date;
    const gap = Math.abs(chosenEvent.date - q.correct.date);
    awardPoints(gap, isPerfect, { halved: quizFiftyActive });
    if (isPerfect) { playCorrectSound(comboMultiplier); triggerHaptic('success'); } else { playWrongSound(); triggerHaptic('error'); }
    checkBadgeProgressOnAction(isPerfect);
    srsRecord(q.correct.id, isPerfect);
    recordSessionStep(q.correct, isPerfect, false);

    document.querySelectorAll('#quiz-options .quiz-option').forEach(b => {
        b.style.pointerEvents = 'none';
        if (b.dataset.eventId === q.correct.id || (isPerfect && b.dataset.eventId === chosenEvent.id)) b.classList.add('correct');
        else if (b.dataset.eventId === chosenEvent.id) b.classList.add('wrong');
    });

    if (!isPerfect) lives -= 1;
    updateQuizHUD();

    setTimeout(() => {
        quizIndex++;
        if (lives <= 0) {
            endGame(false);
        } else {
            renderQuizQuestion();
        }
    }, 1300);
}

function useFiftyFifty() {
    if (quizFiftyLeft <= 0 || quizFiftyActive || isAnimating) return;
    quizFiftyLeft -= 1;
    quizFiftyActive = true;
    document.getElementById('quiz-fifty-count').innerText = `(${quizFiftyLeft})`;
    document.getElementById('quiz-fifty-btn').disabled = true;

    const q = quizQuestions[quizIndex];
    const wrongButtons = [...document.querySelectorAll('#quiz-options .quiz-option')]
        .filter(b => b.dataset.eventId !== q.correct.id);
    shuffleArray(wrongButtons).slice(0, 2).forEach(b => {
        b.classList.add('disabled-5050');
        b.style.pointerEvents = 'none';
    });
}

function updateQuizHUD() {
    document.getElementById('quiz-hud-score').innerText = score;
    renderComboChip(document.getElementById('quiz-hud-combo'), comboMultiplier);
    let pips = '';
    for (let i = 0; i < 3; i++) {
        pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
    }
    document.getElementById('quiz-hud-lives').innerHTML = pips;
}


