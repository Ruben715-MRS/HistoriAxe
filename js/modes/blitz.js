// Extrait de l'ancien js/app.js — Mode Blitz.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// === MODE « BLITZ 60 SECONDES » ===
// La partie courte qui manquait. Le format le plus rapide jusqu'ici était le
// Défi du jour, dix cartes ; une partie de thème peut en faire soixante-douze.
// Rien ne répondait à « j'ai deux minutes ».
//
// Pas de vies : le chronomètre EST la contrainte. Une erreur coûte trois
// secondes, ce qui punit la réponse au hasard sans jamais arrêter la partie.

let blitzQueue = [];
let blitzCurrent = null;
let blitzDeadline = 0;
let blitzInterval = null;
let blitzRight = 0;
let blitzWrong = 0;
let blitzPool = [];

function startBlitzGame() {
    resetSessionHistory();
    currentMode = 'blitz';

    // Vivier ENTIER, et non une manche : la longueur de ce mode est donnée
    // par l'horloge, pas par un nombre de cartes. Le borner à dix ferait
    // tourner les mêmes paires pendant soixante secondes (même raison que la
    // Découverte, voir getModePoolRaw).
    blitzPool = getModePoolRaw();
    const distinctes = new Set(blitzPool.filter(e => typeof e.date === 'number').map(e => e.date));
    if (distinctes.size < 2) {
        alert(t('blitz.not_enough'));
        return;
    }

    blitzQueue = [];
    blitzCurrent = null;
    blitzRight = 0;
    blitzWrong = 0;
    score = 0;
    lives = Infinity;
    comboMultiplier = 1.0;
    currentGameSpan = 1;
    currentRoundSize = 0;

    blitzDeadline = Date.now() + GameModes.BLITZ_SECONDS * 1000;
    showScreen('screen-blitz');
    nextBlitzQuestion();
    startBlitzClock();
}

function startBlitzClock() {
    stopBlitzClock();
    blitzInterval = setInterval(tickBlitzClock, 100);
    tickBlitzClock();
}

function stopBlitzClock() {
    if (blitzInterval) clearInterval(blitzInterval);
    blitzInterval = null;
}

function tickBlitzClock() {
    // Garde-fou d'auto-guérison : si le joueur a quitté l'écran pendant que
    // l'horloge tournait (abandon, retour arrière), on s'arrête ici plutôt
    // que de terminer une partie qui n'est plus à l'écran.
    if (currentMode !== 'blitz') { stopBlitzClock(); return; }

    const remaining = Math.max(0, blitzDeadline - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    const clock = document.getElementById('blitz-clock');
    clock.innerText = String(seconds);
    clock.classList.toggle('urgent', seconds <= 10);
    document.getElementById('blitz-progress-fill').style.width =
        Math.round(remaining / (GameModes.BLITZ_SECONDS * 1000) * 100) + '%';

    if (remaining <= 0) {
        stopBlitzClock();
        // Toujours une victoire : on ne « perd » pas un blitz, on le termine.
        // Le score dit ce que la partie valait.
        endGame(true);
    }
}

function nextBlitzQuestion() {
    if (!blitzQueue.length) {
        blitzQueue = GameModes.buildBlitzQuestions(blitzPool, { count: 20 });
    }
    blitzCurrent = blitzQueue.shift() || null;
    if (!blitzCurrent) { stopBlitzClock(); endGame(true); return; }

    isAnimating = false;
    questionStartTime = Date.now();
    document.getElementById('blitz-left').innerText = blitzCurrent.left.titre;
    document.getElementById('blitz-right').innerText = blitzCurrent.right.titre;
    document.querySelectorAll('.blitz-btn').forEach(b => {
        b.classList.remove('correct', 'wrong');
        b.style.pointerEvents = 'auto';
    });
    updateBlitzHUD();
}

function answerBlitz(value) {
    if (isAnimating || !blitzCurrent || currentMode !== 'blitz') return;
    isAnimating = true;

    const correct = value === blitzCurrent.answer;
    if (correct) {
        blitzRight++;
        awardPoints(0, true);
        playCorrectSound(comboMultiplier);
        triggerHaptic('success');
    } else {
        blitzWrong++;
        awardPoints(1, false);
        // Pénalité de temps plutôt que perte de vie : elle punit la réponse
        // au hasard sans jamais interrompre la partie.
        blitzDeadline -= GameModes.BLITZ_PENALTY_SECONDS * 1000;
        playWrongSound();
        triggerHaptic('error');
    }
    checkBadgeProgressOnAction(correct);
    srsRecord(blitzCurrent.left.id, correct);
    srsRecord(blitzCurrent.right.id, correct);
    recordSessionStep(blitzCurrent.left, correct, false);

    const pressed = document.getElementById(value ? 'blitz-true' : 'blitz-false');
    pressed.classList.add(correct ? 'correct' : 'wrong');
    document.querySelectorAll('.blitz-btn').forEach(b => { b.style.pointerEvents = 'none'; });

    updateBlitzHUD();
    // Très court : l'enchaînement rapide est tout l'intérêt du mode.
    setTimeout(() => {
        if (currentMode === 'blitz') nextBlitzQuestion();
    }, 320);
}

function updateBlitzHUD() {
    document.getElementById('blitz-hud-score').innerText = score;
    renderComboChip(document.getElementById('blitz-hud-combo'), comboMultiplier);
    document.getElementById('blitz-tally').innerText =
        t('blitz.tally', { right: blitzRight, wrong: blitzWrong });
}


