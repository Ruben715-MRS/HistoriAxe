// Extrait de l'ancien js/app.js — Mode Trouve l'écart.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// === MODE TROUVE L'ÉCART ===
// Chaque question oppose deux événements (même appariement que Avant / Après)
// affichés sans leurs dates ; il faut saisir au clavier le nombre d'années qui
// les séparent. Reprend le mécanisme d'indice chiffre par chiffre et le principe
// de proximité du Fil du temps, appliqués ici à l'écart plutôt qu'à une année.
function startEcartGame() {
    resetSessionHistory();
    currentMode = 'ecart';
    const sourceEvents = getSessionPool();
    if (sourceEvents.length < 4) {
        alert(t('modes.min_events_ecart'));
        return;
    }

    ecartQuestions = expeditionCap(buildEcartQuestions(sourceEvents), 'ecart');
    if (ecartQuestions.length === 0) {
        alert(t('modes.cannot_generate_dates'));
        return;
    }

    ecartIndex = 0;
    lives = startingLives();
    score = 0;
    comboMultiplier = 1.0;

    const gameDates = sourceEvents.map(e => e.date);
    currentGameSpan = Math.max(1, Math.max(...gameDates) - Math.min(...gameDates));

    showScreen('screen-ecart');
    renderEcartQuestion();
}

function buildEcartQuestions(events) {
    const pool = events.filter(e => typeof e.date === 'number');
    if (pool.length < 4) return [];
    const questions = pool.map(evt => {
        const others = pool.filter(e => e.id !== evt.id && e.date !== evt.date);
        if (others.length === 0) return null;
        const opponent = others[Math.floor(Math.random() * others.length)];
        return { eventA: evt, eventB: opponent, gap: Math.abs(evt.date - opponent.date) };
    }).filter(Boolean);
    return shuffleArray(questions);
}

function renderEcartQuestion() {
    if (ecartIndex >= ecartQuestions.length) {
        endGame(true);
        return;
    }
    isAnimating = false;
    ecartInput = '';
    ecartAttemptsUsed = 0;

    const q = ecartQuestions[ecartIndex];

    document.getElementById('ecart-event-a').innerText = q.eventA.titre;
    document.getElementById('ecart-event-b').innerText = q.eventB.titre;
    document.getElementById('ecart-event-a-year').classList.add('hidden');
    document.getElementById('ecart-event-b-year').classList.add('hidden');

    const badge = document.getElementById('ecart-answer-badge');
    badge.className = 'fil-answer-badge hidden';
    badge.innerText = '';

    updateEcartChancesBadge();
    updateEcartDisplay();

    document.getElementById('ecart-hud-count').innerText = `${ecartIndex + 1} / ${ecartQuestions.length}`;
    const pct = Math.round(ecartIndex / ecartQuestions.length * 100);
    document.getElementById('ecart-progress-fill').style.width = pct + '%';
    updateEcartHUD();
}

// Puce « 🎯 N essais » au-dessus du clavier : reflète le nombre de
// propositions encore possibles sur la question en cours (5 au départ,
// voir ecartSubmit). Remplace l'ancien bouton indice, retiré lors du
// passage au format Juste Prix (plus/moins).
function updateEcartChancesBadge() {
    const badge = document.getElementById('ecart-chances-badge');
    if (badge) badge.innerText = t('game.attempts_badge', { n: 5 - ecartAttemptsUsed });
}

function ecartKeyPress(digit) {
    if (isAnimating) return;
    if (ecartInput.length >= 6) return;
    ecartInput += digit;
    updateEcartDisplay();
}

function ecartBackspace() {
    if (isAnimating) return;
    if (ecartInput.length > 0) {
        ecartInput = ecartInput.slice(0, -1);
        updateEcartDisplay();
    }
}

function ecartClear() {
    if (isAnimating) return;
    ecartInput = '';
    updateEcartDisplay();
}

function updateEcartDisplay() {
    const display = document.getElementById('ecart-display-value');
    display.innerHTML = ecartInput || '—';
    display.classList.remove('fil-feedback-correct', 'fil-feedback-wrong');
    document.getElementById('ecart-validate-btn').disabled = ecartInput.length === 0;
}

// Format « Juste Prix » : le joueur propose un nombre d'années, le jeu
// répond « plus » ou « moins » et laisse retenter tant qu'il reste des
// essais (5 par question, -20 points par proposition fausse — voir
// l'explication dans le menu Réglages > scoring.ecart_*).
function ecartSubmit() {
    if (isAnimating) return;
    if (ecartInput.length === 0) return;

    const q = ecartQuestions[ecartIndex];
    const guessedGap = parseInt(ecartInput, 10);
    const isPerfect = guessedGap === q.gap;
    const badge = document.getElementById('ecart-answer-badge');

    if (isPerfect) {
        isAnimating = true;
        let points = Math.max(0, 100 - ecartAttemptsUsed * 20);
        if (ecartAttemptsUsed === 0) {
            points = Math.round(points * comboMultiplier);
            comboMultiplier = Math.min(5.0, comboMultiplier + 0.1);
        } else {
            comboMultiplier = 1.0;
        }
        score += points;
        playCorrectSound(comboMultiplier);

        srsRecord(q.eventA, true);
        srsRecord(q.eventB, true);
        recordSessionStep(q.eventA, true, ecartAttemptsUsed > 0);
        checkBadgeProgressOnAction(true);
        updateEcartHUD();

        document.getElementById('ecart-display-value').classList.add('fil-feedback-correct');
        document.getElementById('ecart-validate-btn').disabled = true;

        badge.innerText = ecartAttemptsUsed > 0 ? t('game.ecart_exact_after_tries') : t('game.exact');
        badge.className = 'fil-answer-badge badge-correct';

        document.getElementById('ecart-event-a-year').innerText = formatYear(q.eventA.date);
        document.getElementById('ecart-event-b-year').innerText = formatYear(q.eventB.date);
        document.getElementById('ecart-event-a-year').classList.remove('hidden');
        document.getElementById('ecart-event-b-year').classList.remove('hidden');

        setTimeout(() => {
            ecartIndex++;
            renderEcartQuestion();
        }, 1800);
        return;
    }

    ecartAttemptsUsed++;
    playWrongSound();

    if (ecartAttemptsUsed >= 5) {
        // Les 5 essais sont épuisés : 0 point sur la question, vie perdue.
        isAnimating = true;
        lives -= 1;
        comboMultiplier = 1.0;

        srsRecord(q.eventA, false);
        srsRecord(q.eventB, false);
        recordSessionStep(q.eventA, false, false);
        checkBadgeProgressOnAction(false);
        updateEcartHUD();

        document.getElementById('ecart-display-value').classList.add('fil-feedback-wrong');
        document.getElementById('ecart-validate-btn').disabled = true;

        badge.innerText = t('game.real_gap', { gap: q.gap });
        badge.className = 'fil-answer-badge badge-wrong';

        document.getElementById('ecart-event-a-year').innerText = formatYear(q.eventA.date);
        document.getElementById('ecart-event-b-year').innerText = formatYear(q.eventB.date);
        document.getElementById('ecart-event-a-year').classList.remove('hidden');
        document.getElementById('ecart-event-b-year').classList.remove('hidden');

        setTimeout(() => {
            ecartIndex++;
            if (lives <= 0) {
                endGame(false);
            } else {
                renderEcartQuestion();
            }
        }, 1800);
        return;
    }

    // Il reste des essais : feedback plus/moins, la question ne change pas.
    badge.innerText = guessedGap < q.gap ? t('game.ecart_feedback_more') : t('game.ecart_feedback_less');
    badge.className = 'fil-answer-badge badge-wrong';
    ecartInput = '';
    updateEcartDisplay();
    updateEcartChancesBadge();
}

function updateEcartHUD() {
    document.getElementById('ecart-hud-score').innerText = score;
    renderComboChip(document.getElementById('ecart-hud-combo'), comboMultiplier);
    let pips = '';
    for (let i = 0; i < 3; i++) {
        pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
    }
    document.getElementById('ecart-hud-lives').innerHTML = pips;
}

