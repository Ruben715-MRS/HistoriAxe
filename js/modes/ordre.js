// Extrait de l'ancien js/app.js — Mode Remise en ordre.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// === MODE « REMISE EN ORDRE » ===
// Cinq cartes mélangées, sans leurs dates, à classer d'un coup. Ce n'est pas
// la frise en plus petit : la frise donne une suite déjà triée où glisser une
// carte, ici rien n'est acquis et chaque carte se situe par rapport aux
// quatre autres. C'est l'exercice d'examen (« classez ces événements »).
//
// L'interaction est le toucher seul, jamais le glisser-déposer : on touche
// les cartes du plus ancien au plus récent, et un rang s'inscrit sur
// chacune. Le glisser-déposer serait plus joli et inutilisable au clavier,
// pénible au doigt sur une liste qui défile, et cassé par les lecteurs
// d'écran — pour un gain nul, puisque l'ordre se dit aussi bien en touchant.
// Toucher une carte déjà rangée la retire, et celles d'après se décalent.

let ordreRounds = [];
let ordreIndex = 0;
let ordreAttempt = [];

function startOrdreGame() {
    resetSessionHistory();
    currentMode = 'ordre';
    const sourceEvents = getSessionPool();

    ordreRounds = expeditionCap(GameModes.buildOrderRounds(sourceEvents), 'ordre');
    if (!ordreRounds.length) {
        alert(t('ordre.not_enough', { count: GameModes.ORDER_CARDS }));
        return;
    }

    ordreIndex = 0;
    ordreAttempt = [];
    lives = startingLives();
    score = 0;
    comboMultiplier = 1.0;
    currentRoundSize = ordreRounds.length;

    // Barème « tout ou rien » par manche (voir answerOrdre) : l'écart passé à
    // awardPoints vaut 0 ou la totalité, l'étendue n'a donc qu'à être non nulle.
    currentGameSpan = 1;

    showScreen('screen-ordre');
    renderOrdreRound();
}

function renderOrdreRound() {
    if (ordreIndex >= ordreRounds.length) {
        endGame(true);
        return;
    }
    isAnimating = false;
    ordreAttempt = [];
    questionStartTime = Date.now();
    A11y.focusQuestion('screen-ordre');

    document.getElementById('ordre-reveal').classList.add('hidden');
    document.getElementById('ordre-reset-btn').classList.add('hidden');
    document.getElementById('ordre-hud-count').innerText =
        `${ordreIndex + 1} / ${ordreRounds.length}`;
    document.getElementById('ordre-progress-fill').style.width =
        Math.round(ordreIndex / ordreRounds.length * 100) + '%';

    renderOrdreCards();
    updateOrdreHUD();
}

function renderOrdreCards() {
    const round = ordreRounds[ordreIndex];
    const container = document.getElementById('ordre-cards');
    container.innerHTML = '';

    round.cards.forEach(card => {
        const rank = ordreAttempt.indexOf(card.id);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ordre-card' + (rank >= 0 ? ' placed' : '');
        btn.dataset.eventId = card.id;

        const badge = document.createElement('span');
        badge.className = 'ordre-rank';
        badge.innerText = rank >= 0 ? String(rank + 1) : '';

        const label = document.createElement('span');
        label.className = 'ordre-card-title';
        // innerText et non innerHTML : un titre peut venir d'un thème
        // personnalisé, donc d'une saisie du joueur.
        label.innerText = card.titre;

        btn.appendChild(badge);
        btn.appendChild(label);
        btn.setAttribute('aria-label', rank >= 0
            ? t('ordre.card_placed_aria', { rank: rank + 1, titre: card.titre })
            : t('ordre.card_free_aria', { titre: card.titre }));
        btn.onclick = () => tapOrdreCard(card.id);
        container.appendChild(btn);
    });

    const hint = document.getElementById('ordre-hint');
    hint.innerText = t('ordre.hint', {
        placed: ordreAttempt.length,
        total: round.cards.length
    });
    document.getElementById('ordre-reset-btn').classList.toggle('hidden', ordreAttempt.length === 0);
}

function tapOrdreCard(eventId) {
    if (isAnimating) return;
    const already = ordreAttempt.indexOf(eventId);
    if (already >= 0) {
        // Retirer une carte du classement décale toutes celles d'après : c'est
        // le seul moyen de corriger un rang sans tout reprendre.
        ordreAttempt.splice(already, 1);
    } else {
        ordreAttempt.push(eventId);
    }
    // Chaque tap reconstruit les cinq cartes : sans cela le focus retombait sur
    // <body> et il fallait retabuler depuis le haut après chaque carte.
    A11y.keepFocus(document.getElementById('ordre-cards'), renderOrdreCards);

    if (ordreAttempt.length === ordreRounds[ordreIndex].cards.length) {
        answerOrdre();
    }
}

function resetOrdreAttempt() {
    if (isAnimating) return;
    ordreAttempt = [];
    renderOrdreCards();
    // Le bouton qui vient d'être actionné se masque avec le classement vide :
    // le focus passe à la première carte plutôt que de se perdre.
    const first = document.querySelector('#ordre-cards .ordre-card');
    if (first) first.focus({ preventScroll: true });
}

function answerOrdre() {
    if (isAnimating) return;
    isAnimating = true;

    const round = ordreRounds[ordreIndex];
    const verdict = GameModes.scoreOrderAttempt(ordreAttempt, round.solution);

    // Tout ou rien pour la vie, comme Avant/Après et Périodes & Ères — mais le
    // score suit le nombre de rangs justes, pour qu'une manche ratée de peu ne
    // vaille pas une manche ratée de tout.
    awardPoints(verdict.perfect ? 0 : 1, verdict.perfect);
    if (!verdict.perfect && verdict.correct > 0) {
        score += Math.round(60 * (verdict.correct / verdict.total));
    }
    if (verdict.perfect) { playCorrectSound(comboMultiplier); triggerHaptic('success'); }
    else { playWrongSound(); triggerHaptic('error'); }
    checkBadgeProgressOnAction(verdict.perfect);

    const correctOrder = round.solution
        .map(id => round.cards.find(c => c.id === id))
        .filter(Boolean);
    correctOrder.forEach((evt, index) => {
        srsRecord(evt.id, ordreAttempt[index] === evt.id);
    });
    recordSessionStep(correctOrder[0], verdict.perfect, !verdict.perfect && verdict.correct > 0);

    document.querySelectorAll('#ordre-cards .ordre-card').forEach(btn => {
        btn.style.pointerEvents = 'none';
        const rank = ordreAttempt.indexOf(btn.dataset.eventId);
        btn.classList.add(round.solution[rank] === btn.dataset.eventId ? 'correct' : 'wrong');
    });

    if (!verdict.perfect) lives -= 1;
    updateOrdreHUD();
    renderOrdreReveal(correctOrder, verdict);

    appendRevealNextButton(document.getElementById('ordre-reveal'), () => {
        ordreIndex++;
        if (lives <= 0) { endGame(false); return; }
        renderOrdreRound();
    });
}

function renderOrdreReveal(correctOrder, verdict) {
    const reveal = document.getElementById('ordre-reveal');
    reveal.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'simul-reveal-title';
    title.innerText = verdict.perfect
        ? t('ordre.reveal_perfect')
        : t('ordre.reveal_partial', { correct: verdict.correct, total: verdict.total });
    reveal.appendChild(title);

    correctOrder.forEach(evt => {
        const row = document.createElement('div');
        row.className = 'simul-reveal-row';
        const year = document.createElement('span');
        year.className = 'simul-reveal-year';
        year.innerText = formatYear(evt.date);
        const text = document.createElement('span');
        text.className = 'simul-reveal-text';
        const strong = document.createElement('strong');
        strong.innerText = evt.titre;
        text.appendChild(strong);
        row.appendChild(year);
        row.appendChild(text);
        reveal.appendChild(row);
    });

    reveal.classList.remove('hidden');
    document.getElementById('ordre-reset-btn').classList.add('hidden');
}

function updateOrdreHUD() {
    document.getElementById('ordre-hud-score').innerText = score;
    renderComboChip(document.getElementById('ordre-hud-combo'), comboMultiplier);
    let pips = '';
    for (let i = 0; i < 3; i++) pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
    document.getElementById('ordre-hud-lives').innerHTML = pips;
}


