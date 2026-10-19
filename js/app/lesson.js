// =========================================================================
// === ÉPREUVE « LEÇON » — QUESTIONS RÉDIGÉES À LA MAIN (Chemin du Temps, Monde 0) ===
// =========================================================================
// Une leçon pose quelques questions d'une ou plusieurs séries de js/pathLessons.js. Après chaque réponse,
// juste ou fausse, l'explication s'affiche : c'est un cours, pas seulement un test. Une erreur coûte une
// vie, comme dans les autres épreuves. Elle n'existe que dans un niveau du Chemin du Temps : sa fin rend
// la main au parcours par endGame (voir expeditionOnStageEnd), comme tout mode de l'Expédition.

const LESSON_POINTS = 100;

let lessonQuestions = [];
let lessonIndex = 0;
let lessonAnswered = false;

function startLessonStage(stage) {
    resetSessionHistory();
    currentMode = 'lecon';
    lessonQuestions = (typeof PathLessons !== 'undefined')
        ? PathLessons.draw(stage.set, stage.take || PathLessons.DEFAULT_TAKE)
        : [];
    if (!lessonQuestions.length) {
        alert(t('lesson.empty'));
        return;
    }
    lessonIndex = 0;
    lives = startingLives();
    score = 0;
    comboMultiplier = 1.0;
    currentRoundSize = lessonQuestions.length;
    currentGameSpan = 1;
    showScreen('screen-lesson');
    renderLessonQuestion();
}

function updateLessonHUD() {
    document.getElementById('lesson-hud-score').innerText = score;
    let pips = '';
    for (let i = 0; i < 3; i++) pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
    const livesEl = document.getElementById('lesson-hud-lives');
    livesEl.innerHTML = pips;
    livesEl.setAttribute('aria-label', t('expedition.lives_aria', { count: Math.max(0, lives) }));
}

function renderLessonQuestion() {
    const q = lessonQuestions[lessonIndex];
    lessonAnswered = false;
    isAnimating = false;
    document.getElementById('lesson-kicker').innerText = q.setTitle;
    document.getElementById('lesson-prompt').innerText = q.prompt;
    document.getElementById('lesson-hud-count').innerText = `${lessonIndex + 1} / ${lessonQuestions.length}`;
    document.getElementById('lesson-progress-fill').style.width = Math.round(lessonIndex / lessonQuestions.length * 100) + '%';
    document.getElementById('lesson-feedback').classList.add('hidden');

    const options = document.getElementById('lesson-options');
    options.innerHTML = '';
    q.choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option lesson-option';
        btn.dataset.index = String(i);
        btn.innerText = choice.text;
        btn.onclick = () => answerLesson(i);
        options.appendChild(btn);
    });
    updateLessonHUD();
    if (typeof A11y !== 'undefined' && A11y.focusQuestion) A11y.focusQuestion('screen-lesson');
}

function answerLesson(index) {
    if (lessonAnswered) return;
    lessonAnswered = true;
    const q = lessonQuestions[lessonIndex];
    const correct = !!(q.choices[index] && q.choices[index].correct);
    if (correct) {
        score += LESSON_POINTS;
        if (typeof playCorrectSound === 'function') playCorrectSound(1.0);
        if (typeof triggerHaptic === 'function') triggerHaptic('success');
    } else {
        lives -= 1;
        if (typeof playWrongSound === 'function') playWrongSound();
        if (typeof triggerHaptic === 'function') triggerHaptic('error');
    }
    document.querySelectorAll('#lesson-options .lesson-option').forEach(btn => {
        const choice = q.choices[Number(btn.dataset.index)];
        btn.disabled = true;
        if (choice.correct) btn.classList.add('correct');
        else if (Number(btn.dataset.index) === index) btn.classList.add('wrong');
    });

    const feedback = document.getElementById('lesson-feedback');
    feedback.classList.toggle('is-wrong', !correct);
    document.getElementById('lesson-feedback-title').innerText = t(correct ? 'lesson.right' : 'lesson.wrong');
    document.getElementById('lesson-feedback-text').innerText = q.explain;
    const next = document.getElementById('lesson-next');
    next.innerText = t(lives <= 0 ? 'lesson.end_lives' : (lessonIndex + 1 >= lessonQuestions.length ? 'lesson.finish' : 'lesson.next'));
    feedback.classList.remove('hidden');
    updateLessonHUD();
    next.focus();
}

function lessonContinue() {
    if (!lessonAnswered) return;
    if (lives <= 0) { endGame(false); return; }
    lessonIndex += 1;
    if (lessonIndex >= lessonQuestions.length) { endGame(true); return; }
    renderLessonQuestion();
}
