// Extrait de l'ancien js/app.js — Mode Le fil du temps.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// === MODE LE FIL DU TEMPS ===
// Les événements du pool sont triés chronologiquement (du plus ancien au plus
// récent) et présentés un par un ; il faut en saisir l'année exacte au clavier
// numérique. Le principe de score par écart d'années et de combo est identique
// aux autres modes (voir awardPoints).
function startFilGame() {
    resetSessionHistory();
    currentMode = 'fil';
    const sourceEvents = getSessionPool();
    if (sourceEvents.length === 0) {
        alert(t('modes.no_events_theme'));
        return;
    }

    filEvents = expeditionCap([...sourceEvents], 'fil').sort((a, b) => a.date - b.date);
    filIndex = 0;
    lives = startingLives();
    score = 0;
    comboMultiplier = 1.0;

    const gameDates = sourceEvents.map(e => e.date);
    currentGameSpan = Math.max(1, Math.max(...gameDates) - Math.min(...gameDates));

    showScreen('screen-fil');
    renderFilQuestion();
}

function renderFilQuestion() {
    if (filIndex >= filEvents.length) {
        endGame(true);
        return;
    }
    isAnimating = false;
    filInput = '';
    filEra = 1;
    filHintsRevealed = 0;
    document.getElementById('fil-hint-btn').disabled = false;

    const evt = filEvents[filIndex];
    filCorrectYearString = Math.abs(evt.date).toString();

    document.getElementById('fil-prompt').innerText = evt.titre;

    const badge = document.getElementById('fil-answer-badge');
    badge.className = 'fil-answer-badge hidden';
    badge.innerText = '';

    updateFilDisplay();

    document.getElementById('fil-hud-count').innerText = `${filIndex + 1} / ${filEvents.length}`;
    const pct = Math.round(filIndex / filEvents.length * 100);
    document.getElementById('fil-progress-fill').style.width = pct + '%';
    animateQuestionIn('screen-fil');
    updateFilHUD();
}

function filUseHint() {
    if (isAnimating) return;
    const evt = filEvents[filIndex];
    const targetStr = filCorrectYearString;

    if (filHintsRevealed === 0) {
        filEra = evt.date < 0 ? -1 : 1;
    }

    if (filHintsRevealed < targetStr.length) {
        filHintsRevealed++;
        let currentInput = filInput;
        let newStr = '';
        for (let i = 0; i < targetStr.length; i++) {
            if (i < filHintsRevealed) {
                newStr += targetStr[i];
            } else if (i < currentInput.length) {
                newStr += currentInput[i];
            }
        }
        filInput = newStr;
        updateFilDisplay();

        if (filHintsRevealed === targetStr.length) {
            filSubmit(true);
        }
    }
}

function filToggleEra() {
    if (isAnimating || filHintsRevealed > 0) return;
    filEra = filEra === 1 ? -1 : 1;
    updateFilDisplay();
}

function filKeyPress(digit) {
    if (isAnimating) return;
    if (filInput.length >= 7) return;
    filInput += digit;
    updateFilDisplay();
}

function filBackspace() {
    if (isAnimating) return;
    if (filInput.length > filHintsRevealed) {
        filInput = filInput.slice(0, -1);
        updateFilDisplay();
    }
}

function filClear() {
    if (isAnimating) return;
    filInput = filInput.slice(0, filHintsRevealed);
    updateFilDisplay();
}

function updateFilDisplay() {
    const eraBtn = document.getElementById('fil-era-btn');
    eraBtn.innerText = filEra === 1 ? 'apr. J.-C.' : 'av. J.-C.';
    eraBtn.classList.toggle('era-bc', filEra === -1);

    const display = document.getElementById('fil-display-value');
    if (!filInput) {
        display.innerHTML = '—';
    } else {
        let html = '';
        for (let i = 0; i < filInput.length; i++) {
            if (i < filHintsRevealed) {
                html += `<span style="color: #2CA85A;">${filInput[i]}</span>`;
            } else {
                html += filInput[i];
            }
        }
        display.innerHTML = html;
    }
    display.classList.remove('fil-feedback-correct', 'fil-feedback-wrong');

    document.getElementById('fil-validate-btn').disabled = filInput.length === 0 && filHintsRevealed === 0;
    document.getElementById('fil-hint-btn').disabled = (filHintsRevealed >= filCorrectYearString.length);
}

function filSubmit(autoFailByHint = false) {
    // handle event signature difference since onclick passes no args
    if (typeof autoFailByHint !== 'boolean') autoFailByHint = false;
    if (isAnimating) return;
    if (!autoFailByHint && filInput.length === 0) return;
    isAnimating = true;

    const evt = filEvents[filIndex];
    const guessedYear = filEra * parseInt(filInput, 10);
    const gap = autoFailByHint ? Infinity : Math.abs(guessedYear - evt.date);
    const isPerfect = gap === 0;

    if (autoFailByHint) {
        lives -= 1;
        comboMultiplier = 1.0;
        playWrongSound();
    } else {
        let deduction = filHintsRevealed * 25;
        if (deduction > 100) deduction = 100;

        let points = 0;
        if (isPerfect) {
            points = Math.max(0, 100 - deduction);
            if (filHintsRevealed === 0) {
                points = Math.round(points * comboMultiplier);
                comboMultiplier = Math.min(5.0, comboMultiplier + 0.1);
            } else {
                comboMultiplier = 1.0;
            }
            score += points;
            playCorrectSound(comboMultiplier);
            triggerHaptic('success');
            triggerHaptic('success');
        } else {
            lives -= 1;
            const maxGap = Math.max(currentGameSpan, 10);
            let basePts = 100 * (1 - (gap / maxGap));
            if (basePts < 0) basePts = 0;
            points = Math.max(0, Math.round(basePts) - deduction);
            score += points;
            comboMultiplier = 1.0;
            playWrongSound();
            triggerHaptic('error');
            triggerHaptic('error');
        }
    }

    srsRecord(evt.id, isPerfect);
    recordSessionStep(evt, isPerfect, isPerfect && filHintsRevealed > 0);
    checkBadgeProgressOnAction(isPerfect);
    updateFilHUD();

    const display = document.getElementById('fil-display-value');
    display.classList.add(isPerfect ? 'fil-feedback-correct' : 'fil-feedback-wrong');
    document.getElementById('fil-validate-btn').disabled = true;
    document.getElementById('fil-hint-btn').disabled = true;

    const badge = document.getElementById('fil-answer-badge');
    if (!isPerfect) {
        badge.innerText = t('game.correct_answer', { year: formatYear(evt.date) });
        badge.className = 'fil-answer-badge badge-wrong';
    } else if (isPerfect && filHintsRevealed > 0) {
        badge.innerText = t('game.exact_with_hint');
        badge.className = 'fil-answer-badge badge-correct';
    } else {
        badge.innerText = t('game.exact');
        badge.className = 'fil-answer-badge badge-correct';
    }

    setTimeout(() => {
        filIndex++;
        if (lives <= 0) {
            endGame(false);
        } else {
            renderFilQuestion();
        }
    }, 1800);
}

function updateFilHUD() {
    document.getElementById('fil-hud-score').innerText = score;
    renderComboChip(document.getElementById('fil-hud-combo'), comboMultiplier);
    let pips = '';
    for (let i = 0; i < 3; i++) {
        pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
    }
    document.getElementById('fil-hud-lives').innerHTML = pips;
}

