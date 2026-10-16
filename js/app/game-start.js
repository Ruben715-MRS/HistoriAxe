// Extrait de l'ancien js/app.js — Multijoueur et lancement d'une partie de frise.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// --- MULTIPLAYER LOGIC ---
function showMultiplayerSetup() {
    showScreen('screen-multiplayer-setup');
    renderMultiplayerNameInputs();
}

function renderMultiplayerNameInputs() {
    const count = parseInt(document.getElementById('multi-player-count').value);
    const container = document.getElementById('multi-player-names');
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const existingInput = document.getElementById(`multi-name-${i}`);
        const defaultVal = existingInput ? existingInput.value : (multiPlayers && multiPlayers[i - 1] ? multiPlayers[i - 1].name : t('multiplayer.player_default_name', { n: i }));
        container.innerHTML += `<input type="text" id="multi-name-${i}" placeholder="${t('multiplayer.player_name_placeholder', { n: i })}" value="${defaultVal}">`;
    }
}

function startMultiplayerGame() {
    const count = parseInt(document.getElementById('multi-player-count').value);
    multiPlayers = [];
    for (let i = 1; i <= count; i++) {
        let name = document.getElementById(`multi-name-${i}`).value.trim();
        if (!name) name = t('multiplayer.player_default_name', { n: i });
        multiPlayers.push({ name: name, score: 0, lives: 2, comboMultiplier: 1.0, eliminated: false });
    }
    multiGameActive = true;
    currentMultiPlayerIndex = 0;

    startActualGame('multi');

    document.getElementById('screen-game').classList.add('hidden');
    document.getElementById('screen-multi-turn').classList.remove('hidden');
    document.getElementById('multi-turn-text').innerText = t('multiplayer.turn_banner', { name: multiPlayers[currentMultiPlayerIndex].name });
}

function resumeMultiplayerTurn() {
    document.getElementById('screen-multi-turn').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    pickNextEvent();
    updateHUD();
}

function nextMultiPlayerTurn() {
    if (!multiGameActive) return;

    let alivePlayers = multiPlayers.filter(p => !p.eliminated);
    if (alivePlayers.length === 0) {
        setTimeout(() => endMultiplayerGame(), 1000);
        return;
    }
    if (currentPool.length === 0) {
        setTimeout(() => endMultiplayerGame(), 1000);
        return;
    }

    // Next player
    let attempts = 0;
    do {
        currentMultiPlayerIndex = (currentMultiPlayerIndex + 1) % multiPlayers.length;
        attempts++;
    } while (multiPlayers[currentMultiPlayerIndex].eliminated && attempts <= multiPlayers.length);

    document.getElementById('screen-game').classList.add('hidden');
    document.getElementById('screen-multi-turn').classList.remove('hidden');
    document.getElementById('multi-turn-text').innerText = t('multiplayer.turn_banner', { name: multiPlayers[currentMultiPlayerIndex].name });
}

function endMultiplayerGame() {
    multiGameActive = false;
    showScreen('screen-multiplayer-end');

    const sorted = [...multiPlayers].sort((a, b) => b.score - a.score);
    const container = document.getElementById('multi-podium');
    container.innerHTML = '';

    const medals = ['🥇', '🥈', '🥉', ''];
    const classes = ['gold', 'silver', 'bronze', ''];

    sorted.forEach((p, index) => {
        const medal = index < 3 ? medals[index] : `${index + 1}.`;
        const cls = index < 3 ? classes[index] : '';
        const eliminatedText = p.eliminated ? ' <em>(Éliminé)</em>' : '';
        container.innerHTML += `
                    <div class="podium-row ${cls}">
                        <span>${medal} ${p.name} ${eliminatedText}</span>
                        <span>${p.score} pts</span>
                    </div>
                `;
    });
}

// LANCEMENT DU JEU
// Annule un éventuel délai de révélation de mauvaise réponse encore en
// attente (voir checkPlacement) et réarme `isAnimating` à `false` : à
// appeler chaque fois qu'on (re)lance une partie ou qu'on la quitte, pour
// ne jamais laisser une partie suivante hériter d'un verrou de clic bloqué.
function resetPlacementAnimationState() {
    if (wrongAnswerTimeoutId) {
        clearTimeout(wrongAnswerTimeoutId);
        wrongAnswerTimeoutId = null;
    }
    isAnimating = false;
}

function startActualGame(mode) {
    resetPlacementAnimationState();
    resetSessionHistory();
    currentMode = mode;
    let sourceEvents;
    if (mode === 'daily') {
        // Défi du jour : 10 événements déjà tirés (et mélangés) de façon
        // déterministe par generateDailyEvents, indépendamment du thème
        // actuellement sélectionné dans le menu.
        sourceEvents = dailyChallengeEventsWithLocation.map(item => item.event);
    } else if (mode === 'weekly') {
        // Défi hebdomadaire : même principe, 30 événements (voir
        // generateWeeklyChallengeEvents dans js/weekly.js).
        sourceEvents = weeklyChallengeEventsWithLocation.map(item => item.event);
    } else if (mode === 'discovery') {
        // La Découverte n'est pas une partie mais une consultation : elle
        // garde le thème entier, une frise amputée n'ayant aucun sens.
        sourceEvents = getModePoolRaw();
    } else {
        sourceEvents = getSessionPool();
    }
    if (sourceEvents.length === 0) {
        alert(t('modes.no_events_theme'));
        return;
    }
    let eventsCopy = [...sourceEvents];

    if (mode === 'discovery') {
        eventsCopy.sort((a, b) => a.date - b.date);
        placedEvents = eventsCopy;
        currentPool = [];
        totalEvents = placedEvents.length;
    } else if (mode === 'daily' || mode === 'weekly') {
        // Ordre de pioche déjà mélangé de façon déterministe (même graine du
        // jour/de la semaine pour tous les joueurs) : surtout ne pas
        // re-mélanger avec Math.random ici, sous peine de casser l'équité du
        // classement mondial.
        totalEvents = eventsCopy.length;
        placedEvents = [eventsCopy.pop()];
        currentPool = eventsCopy;
    } else {
        // Même mélange que partout ailleurs : l'ordre de pioche décide quelles
        // cartes tombent en premier, donc à quel moment le joueur affronte les
        // dates les plus dures — un mélange biaisé y ferait remonter toujours
        // les mêmes.
        eventsCopy = shuffleArray(eventsCopy);
        totalEvents = eventsCopy.length;
        placedEvents = [eventsCopy.pop()];
        currentPool = eventsCopy;
    }

    if (mode === 'training' || mode === 'discovery') lives = Infinity;
    else if (mode === 'expert') lives = 1;
    else if (mode === 'multi') lives = 2; // unused directly, but for safety
    else lives = 3; // classic, chrono, daily, weekly

    score = 0;
    totalTimePlayed = 0;
    comboMultiplier = 1.0;
    const gameDates = eventsCopy.map(e => e.date);
    currentGameSpan = Math.max(1, Math.max(...gameDates) - Math.min(...gameDates));

    const hudLives = document.getElementById('hud-lives');
    const hudTimer = document.getElementById('hud-timer-container');
    const hand = document.getElementById('hand');
    const scoreContainer = document.getElementById('hud-score-container');
    const progressRail = document.getElementById('hud-progress-rail');

    hudLives.classList.remove('hidden');
    hudTimer.classList.add('hidden');
    hand.classList.remove('hidden');
    scoreContainer.classList.remove('hidden');
    progressRail.classList.remove('hidden');
    document.getElementById('hud-progress-fill').style.width = '0%';

    if (mode === 'training' || mode === 'discovery') {
        hudLives.classList.add('hidden');
        // Modes sans enjeu ni pression : pas de score affiché
        scoreContainer.classList.add('hidden');
    }

    if (mode === 'discovery') {
        // Lecture seule : ni carte en main, ni score, ni progression
        hand.classList.add('hidden');
        progressRail.classList.add('hidden');
        document.getElementById('hud-count').innerText = t('game.frise_complete', { n: totalEvents });
    }

    if (mode === 'chrono' || mode === 'expert' || mode === 'daily' || mode === 'weekly') {
        hudTimer.classList.remove('hidden');
        document.getElementById('hud-timer').innerText = "0,0";
        startTimer();
    }

    updateHUD();

    if (mode === 'discovery' || mode === 'multi') {
        renderTimeline();
    } else {
        pickNextEvent();
    }

    showScreen('screen-game');
}

