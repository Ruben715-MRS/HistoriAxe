// Extrait de l'ancien js/app.js — Mode Le curseur.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// === MODE « LE CURSEUR » ===
// Entre « Le fil du temps » (l'année exacte au clavier) et « Périodes & Ères »
// (un siècle parmi quatre), il manquait le geste approximatif : celui qui
// récompense un ordre de grandeur juste. Un seul glissement, et le score suit
// la proximité.
//
// L'échelle et la tolérance sont calculées sur le thème (voir
// GameModes.sliderScaleFor) : ±2 ans sur un thème de vingt ans, ±60 sur un
// thème qui traverse l'Antiquité. La tolérance doit suivre ce que le thème
// demande de savoir.

let curseurRounds = [];
let curseurIndex = 0;

function startCurseurGame() {
    resetSessionHistory();
    currentMode = 'curseur';
    const sourceEvents = getSessionPool();

    curseurRounds = GameModes.buildSliderRounds(sourceEvents, {
        count: Math.min(GameModes.SLIDER_ROUNDS, sourceEvents.length)
    });
    if (curseurRounds.length < 3) {
        alert(t('curseur.not_enough'));
        return;
    }

    curseurIndex = 0;
    lives = 3;
    score = 0;
    comboMultiplier = 1.0;
    currentRoundSize = curseurRounds.length;

    // awardPoints calcule 1 - écart / currentGameSpan : en lui donnant trois
    // fois la tolérance, on retrouve exactement le barème du module (pile = 1,
    // à la tolérance = 2/3, au-delà de trois fois = 0). Lui passer l'étendue du
    // thème, comme les autres modes, donnerait encore 96 % des points à une
    // réponse fausse de trois siècles sur un thème qui couvre 6 600 ans.
    currentGameSpan = Math.max(1, curseurRounds[0].tolerance * 3);

    const range = document.getElementById('curseur-range');
    range.oninput = () => {
        document.getElementById('curseur-value').innerText = formatYear(Number(range.value));
    };

    showScreen('screen-curseur');
    renderCurseurRound();
}

function renderCurseurRound() {
    if (curseurIndex >= curseurRounds.length) {
        endGame(true);
        return;
    }
    isAnimating = false;
    questionStartTime = Date.now();

    const round = curseurRounds[curseurIndex];
    document.getElementById('curseur-title').innerText = round.event.titre;
    document.getElementById('curseur-verdict').classList.add('hidden');
    document.getElementById('curseur-validate').disabled = false;

    const range = document.getElementById('curseur-range');
    range.min = String(round.min);
    range.max = String(round.max);
    // Le curseur repart du milieu à chaque manche : le laisser où il était
    // donnerait un indice sur la réponse précédente.
    const middle = Math.round((round.min + round.max) / 2);
    range.value = String(middle);
    range.disabled = false;

    document.getElementById('curseur-value').innerText = formatYear(middle);
    document.getElementById('curseur-min').innerText = formatYear(round.min);
    document.getElementById('curseur-max').innerText = formatYear(round.max);
    document.getElementById('curseur-kicker').innerText =
        t('curseur.kicker_tolerance', { tolerance: round.tolerance });

    // Le focus va au curseur lui-même : c'est ce qu'on manipule, et le bouton
    // « Valider » se désactive une fois la réponse donnée (le focus s'y
    // perdait). Un <input type="range"> focalisé n'ouvre aucun clavier à l'écran.
    range.focus({ preventScroll: true });

    document.getElementById('curseur-hud-count').innerText =
        `${curseurIndex + 1} / ${curseurRounds.length}`;
    document.getElementById('curseur-progress-fill').style.width =
        Math.round(curseurIndex / curseurRounds.length * 100) + '%';
    updateCurseurHUD();
}

function answerCurseur() {
    if (isAnimating) return;
    isAnimating = true;

    const round = curseurRounds[curseurIndex];
    const guess = Number(document.getElementById('curseur-range').value);
    const verdict = GameModes.scoreSliderGuess(guess, round);

    awardPoints(verdict.gap, verdict.within);
    if (verdict.within) { playCorrectSound(comboMultiplier); triggerHaptic('success'); }
    else { playWrongSound(); triggerHaptic('error'); }
    checkBadgeProgressOnAction(verdict.within);
    srsRecord(round.event.id, verdict.within);
    recordSessionStep(round.event, verdict.within, !verdict.within && verdict.ratio > 0);

    document.getElementById('curseur-range').disabled = true;
    document.getElementById('curseur-validate').disabled = true;

    const box = document.getElementById('curseur-verdict');
    box.className = 'curseur-verdict ' + (verdict.within ? 'is-good' : 'is-bad');
    box.innerText = verdict.exact
        ? t('curseur.verdict_exact', { year: formatYear(round.event.date) })
        : t('curseur.verdict_gap', { gap: verdict.gap, year: formatYear(round.event.date) });
    box.classList.remove('hidden');

    if (!verdict.within) lives -= 1;
    updateCurseurHUD();

    setTimeout(() => {
        curseurIndex++;
        if (lives <= 0) { endGame(false); return; }
        renderCurseurRound();
    }, 1900);
}

function updateCurseurHUD() {
    document.getElementById('curseur-hud-score').innerText = score;
    renderComboChip(document.getElementById('curseur-hud-combo'), comboMultiplier);
    let pips = '';
    for (let i = 0; i < 3; i++) pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
    document.getElementById('curseur-hud-lives').innerHTML = pips;
}


