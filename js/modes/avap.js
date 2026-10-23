// Extrait de l'ancien js/app.js — Mode Avant / Après.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// === MODE AVANT / APRÈS ===
// Chaque question pioche un événement du pool et lui oppose un autre événement
// à date distincte ; les deux sont affichés sans leur date et il faut désigner
// le plus ancien. Score « tout ou rien » (comme Périodes & Ères), pas de points
// partiels puisqu'il ne s'agit pas d'estimer une valeur mais de choisir entre deux.
function startAvapGame() {
    resetSessionHistory();
    currentMode = 'avantapres';
    const sourceEvents = getSessionPool();
    if (sourceEvents.length < 4) {
        alert(t('modes.min_events_avap'));
        return;
    }

    avapQuestions = expeditionCap(buildAvapQuestions(sourceEvents), 'avantapres');
    if (avapQuestions.length === 0) {
        alert(t('modes.cannot_generate_dates'));
        return;
    }

    avapIndex = 0;
    lives = startingLives();
    score = 0;
    comboMultiplier = 1.0;

    const gameDates = sourceEvents.map(e => e.date);
    currentGameSpan = Math.max(1, Math.max(...gameDates) - Math.min(...gameDates));

    showScreen('screen-avant-apres');
    renderAvapQuestion();
}

// Construit une question par événement du pool, opposé à un adversaire tiré au
// sort parmi les événements à date différente (pour toujours avoir un antérieur
// net). Position gauche/droite mélangée pour ne pas biaiser vers un côté.
function buildAvapQuestions(events) {
    const pool = events.filter(e => typeof e.date === 'number');
    if (pool.length < 4) return [];
    const questions = pool.map(evt => {
        const others = pool.filter(e => e.id !== evt.id && e.date !== evt.date);
        if (others.length === 0) return null;
        const opponent = others[Math.floor(Math.random() * others.length)];
        const [left, right] = shuffleArray([evt, opponent]);
        const correctEvt = evt.date < opponent.date ? evt : opponent;
        return { left, right, correctEvt };
    }).filter(Boolean);
    return shuffleArray(questions);
}

function renderAvapQuestion() {
    if (avapIndex >= avapQuestions.length) {
        endGame(true);
        return;
    }
    isAnimating = false;

    const q = avapQuestions[avapIndex];
    document.getElementById('avap-option-a-title').innerText = q.left.titre;
    document.getElementById('avap-option-b-title').innerText = q.right.titre;
    document.getElementById('avap-option-a-year').classList.add('hidden');
    document.getElementById('avap-option-b-year').classList.add('hidden');

    const btnA = document.getElementById('avap-option-a');
    const btnB = document.getElementById('avap-option-b');
    btnA.classList.remove('correct', 'wrong');
    btnB.classList.remove('correct', 'wrong');
    btnA.blur();
    btnB.blur();
    btnA.style.pointerEvents = 'auto';
    btnB.style.pointerEvents = 'auto';
    btnA.onclick = () => answerAvap(q.left, btnA);
    btnB.onclick = () => answerAvap(q.right, btnB);

    document.getElementById('avap-hud-count').innerText = `${avapIndex + 1} / ${avapQuestions.length}`;
    const pct = Math.round(avapIndex / avapQuestions.length * 100);
    document.getElementById('avap-progress-fill').style.width = pct + '%';
    animateQuestionIn('screen-avant-apres');
    updateAvapHUD();
}

function answerAvap(chosenEvent, chosenBtn) {
    if (isAnimating) return;
    isAnimating = true;

    const q = avapQuestions[avapIndex];
    const isPerfect = chosenEvent.id === q.correctEvt.id;
    // Mode Classe : le choix (0 = gauche) part au journal (js/classroom.js), le serveur rejoue la manche.
    if (typeof classOnRound === 'function') classOnRound('avap', avapIndex, { choice: chosenEvent.id === q.left.id ? 0 : 1 });

    if (isPerfect) {
        const points = Math.round(100 * comboMultiplier);
        score += points;
        comboMultiplier = Math.min(5.0, comboMultiplier + 0.1);
        playCorrectSound(comboMultiplier);
        triggerHaptic('success');
    } else {
        lives -= 1;
        comboMultiplier = 1.0;
        playWrongSound();
        triggerHaptic('error');
    }

    srsRecord(q.correctEvt.id, isPerfect);
    recordSessionStep(q.correctEvt, isPerfect, false);
    checkBadgeProgressOnAction(isPerfect);

    const btnA = document.getElementById('avap-option-a');
    const btnB = document.getElementById('avap-option-b');
    btnA.style.pointerEvents = 'none';
    btnB.style.pointerEvents = 'none';
    [[btnA, q.left], [btnB, q.right]].forEach(([btn, evt]) => {
        if (evt.id === q.correctEvt.id) btn.classList.add('correct');
        else if (btn === chosenBtn) btn.classList.add('wrong');
    });
    document.getElementById('avap-option-a-year').innerText = formatYear(q.left.date);
    document.getElementById('avap-option-b-year').innerText = formatYear(q.right.date);
    document.getElementById('avap-option-a-year').classList.remove('hidden');
    document.getElementById('avap-option-b-year').classList.remove('hidden');

    updateAvapHUD();

    setTimeout(() => {
        avapIndex++;
        if (lives <= 0) {
            endGame(false);
        } else {
            renderAvapQuestion();
        }
    }, 1300);
}

function updateAvapHUD() {
    document.getElementById('avap-hud-score').innerText = score;
    renderComboChip(document.getElementById('avap-hud-combo'), comboMultiplier);
    let pips = '';
    for (let i = 0; i < 3; i++) {
        pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
    }
    document.getElementById('avap-hud-lives').innerHTML = pips;
}


