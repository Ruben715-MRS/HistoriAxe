// Le bouton « Jouer » de l'écran des modes lance le mode FAVORI du joueur (Réglages › Mode du bouton
// Jouer) ; Classique tant qu'il n'en a pas choisi un. Le choix est retenu (appSettings.playMode) jusqu'à
// ce que le joueur le change lui-même.
//
// Les clés de titre sont celles des cartes de l'écran des modes (index.html). `needs` nomme la
// condition qui peut rendre un mode indisponible POUR UN THÈME donné ; dans ce cas le bouton retombe
// sur Classique plutôt que de lancer un mode verrouillé ou sans matière — et son libellé le dit.
const PLAY_MODES = [
    { id: 'classic', title: 'modes.classic.title', start: () => startActualGame('classic') },
    { id: 'training', title: 'modes.training.title', start: () => startActualGame('training') },
    { id: 'chrono', title: 'modes.chrono.title', needs: 'chrono', start: () => startActualGame('chrono') },
    { id: 'expert', title: 'modes.expert.title', needs: 'expert', start: () => startActualGame('expert') },
    { id: 'quiz', title: 'modes.quiz.title', start: () => startQuizGame() },
    { id: 'blitz', title: 'blitz.title', start: () => startBlitzGame() },
    { id: 'curseur', title: 'curseur.title', start: () => startCurseurGame() },
    { id: 'intrus', title: 'intrus.title', start: () => startIntrusGame() },
    { id: 'ordre', title: 'ordre.title', start: () => startOrdreGame() },
    { id: 'avantapres', title: 'modes.avantapres.title', start: () => startAvapGame() },
    { id: 'periodes', title: 'modes.periodes.title', start: () => startPeriodesGame() },
    { id: 'simultaneity', title: 'simultaneity.title', start: () => startSimultaneityGame() },
    { id: 'whois', title: 'whois.title', needs: 'whois', start: () => startWhoisGame() },
    { id: 'fil', title: 'modes.fil.title', start: () => startFilGame() },
    { id: 'ecart', title: 'modes.ecart.title', start: () => startEcartGame() }
];

function findPlayMode(id) {
    return PLAY_MODES.find(mode => mode.id === id) || PLAY_MODES[0];
}

// Disponible pour le thème (ou la session de révision) affiché sur l'écran des modes ?
function isPlayModeAvailable(mode) {
    if (!mode.needs) return true;
    if (mode.needs === 'whois') {
        const card = document.getElementById('mode-card-whois');
        return !!card && !card.classList.contains('hidden');
    }
    // Chrono et Expert : même règle que updateModeLocks (la révision traverse plusieurs thèmes).
    if (revisionMode) return true;
    const theme = getCurrentTheme();
    if (!theme) return false;
    return mode.needs === 'chrono'
        ? isChronoUnlocked(theme.id)
        : isChronoUnlocked(theme.id) && isExpertUnlocked(theme.id);
}

// Le mode que « Jouer » lancera ici : le favori s'il est disponible, sinon Classique.
function effectivePlayMode() {
    const favorite = findPlayMode(appSettings.playMode);
    return isPlayModeAvailable(favorite) ? favorite : PLAY_MODES[0];
}

function updatePlayButton() {
    const label = document.getElementById('modes-play-mode');
    if (label) label.innerText = t('modes.play_sub', { mode: t(effectivePlayMode().title) });
}

function startFavoritePlayMode() {
    effectivePlayMode().start();
}

// Liste déroulante des Réglages.
function renderPlayModeSetting() {
    const select = document.getElementById('settings-play-mode');
    if (!select) return;
    select.innerHTML = '';
    PLAY_MODES.forEach(mode => {
        const option = document.createElement('option');
        option.value = mode.id;
        option.textContent = t(mode.title);
        select.appendChild(option);
    });
    select.value = findPlayMode(appSettings.playMode).id;
}
