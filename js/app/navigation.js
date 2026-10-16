// Extrait de l'ancien js/app.js — Navigation entre écrans, défis, relance d'une partie.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// Certaines catégories (ex. « Histoires nationales », « Programmes scolaires »)
// insèrent un ou plusieurs niveaux de sous-catégories entre la catégorie et les
// thèmes (parfois imbriqués : Programmes scolaires > Lycée > Terminale). On
// représente donc la position choisie à ce niveau comme un CHEMIN d'indices
// (tableau), plutôt qu'un simple indice — vide au sommet, il s'allonge d'un cran
// à chaque sous-catégorie traversée. Ces fonctions centralisent la résolution du
// nœud courant et de la liste de thèmes qui en découle, à profondeur quelconque.
function resolveSubcategory(category, path) {
    let node = category;
    // Chemin défensif : si un segment est invalide (ex. index hors bornes suite à
    // une navigation corrompue), on ignore simplement la suite plutôt que de planter
    // sur `undefined.subcategories` — on reste sur le dernier nœud valide rencontré.
    (path || []).forEach(idx => {
        if (node && node.subcategories && node.subcategories[idx]) {
            node = node.subcategories[idx];
        }
    });
    return node;
}
function countThemesRecursive(node) {
    return node.subcategories
        ? node.subcategories.reduce((sum, s) => sum + countThemesRecursive(s), 0)
        : node.themes.length;
}
function getCurrentThemeList() {
    const category = bdd[selectedCategoryIndex];
    // Aucune catégorie/thème encore sélectionné (ex. « Hasard » depuis l'accueil,
    // avant toute navigation) : pas de thème courant, ce que getCurrentTheme()
    // gère déjà (undefined) chez ses appelants.
    if (!category) return [];
    const node = category.subcategories ? resolveSubcategory(category, selectedSubcategoryIndex) : category;
    // `node` peut être un nœud intermédiaire (pas encore un thème-parent) si le
    // chemin de sous-catégories s'est arrêté tôt sur un segment invalide.
    return node.themes || [];
}
function getCurrentTheme() {
    return getCurrentThemeList()[selectedThemeIndex];
}

function backFromThemes() {
    if (favoritesMode) {
        favoritesMode = false;
        showScreen('screen-categories', 'back');
        return;
    }
    const category = bdd[selectedCategoryIndex];
    if (category.subcategories && selectedSubcategoryIndex && selectedSubcategoryIndex.length > 0) {
        selectedSubcategoryIndex = selectedSubcategoryIndex.slice(0, -1);
        showScreen('screen-subcategories', 'back');
    } else {
        showScreen('screen-categories', 'back');
    }
}

// Remonte d'un cran dans la hiérarchie de sous-catégories (ex. Terminale → Lycée),
// ou revient aux catégories si l'on est déjà au premier niveau de sous-catégories.
function backFromSubcategories() {
    if (selectedSubcategoryIndex && selectedSubcategoryIndex.length > 0) {
        selectedSubcategoryIndex = selectedSubcategoryIndex.slice(0, -1);
        showScreen('screen-subcategories', 'back');
    } else {
        showScreen('screen-categories', 'back');
    }
}

// Bascule d'écran différée par le fondu ci-dessous : si une nouvelle navigation
// arrive avant qu'elle ne se déclenche (double-tap, ou une deuxième carte touchée
// pendant que l'écran quitté est encore visible le temps du fondu), on l'annule —
// sinon elle finirait par s'exécuter en retard et écraser la navigation plus récente,
// parfois vers un écran resté vide (voir showScreen ci-dessous).
let pendingFadeSwitch = null;

function showScreen(screenId, direction) {
    if (pendingFadeSwitch) {
        clearTimeout(pendingFadeSwitch);
        pendingFadeSwitch = null;
    }
    // Dernier degré de catégorie → thèmes : on efface rapidement l'écran quitté
    // avant de basculer, plutôt que de le faire glisser hors champ. On reporte le
    // changement d'écran à la fin de ce court fondu de sortie (relancé avec la
    // marque interne 'fade-in' pour que le bloc ci-dessous applique le fondu d'entrée).
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (direction === 'fade' && !reduceMotion) {
        const current = Array.from(document.querySelectorAll('body > div')).find(div =>
            !div.classList.contains('hidden') &&
            div.id !== 'modal-details' && div.id !== 'modal-confirm' && div.id !== 'modal-settings' && div.id !== 'modal-scoring-info' && div.id !== 'modal-daily-results'
        );
        if (current && current.id !== screenId) {
            current.classList.remove('screen-fade-out');
            void current.offsetWidth;
            current.classList.add('screen-fade-out');
            pendingFadeSwitch = setTimeout(() => {
                pendingFadeSwitch = null;
                showScreen(screenId, 'fade-in');
            }, 150);
            return;
        }
    }

    document.querySelectorAll('body > div').forEach(div => {
        if (div.id !== 'modal-details' && div.id !== 'modal-confirm' && div.id !== 'modal-settings' && div.id !== 'modal-scoring-info' && div.id !== 'modal-daily-results') div.classList.add('hidden');
    });
    // Toute bulle d'onboarding affichée sur l'écran quitté n'a plus de sens
    // une fois l'écran caché (sa cible n'est plus visible) : on la retire.
    document.querySelectorAll('.onboarding-overlay').forEach(el => el.remove());
    const targetScreen = document.getElementById(screenId);
    targetScreen.classList.remove('hidden');

    // Glissement vers la droite quand on ouvre (catégorie → sous-catégories/thèmes),
    // vers la gauche quand on revient en arrière. On retire d'abord les classes pour
    // pouvoir rejouer l'animation même si l'écran ciblé est déjà celui affiché juste
    // avant (ex. sous-catégories imbriquées).
    targetScreen.classList.remove('screen-slide-forward', 'screen-slide-back', 'screen-fade-in', 'screen-fade-out');
    if (direction === 'forward' || direction === 'back') {
        void targetScreen.offsetWidth; // force le reflow pour relancer l'animation
        targetScreen.classList.add(direction === 'forward' ? 'screen-slide-forward' : 'screen-slide-back');
    } else if ((direction === 'fade' || direction === 'fade-in') && !reduceMotion) {
        void targetScreen.offsetWidth;
        targetScreen.classList.add('screen-fade-in');
    }

    // Le retour à la galerie ne vaut que pour la partie qui en est partie : rejoindre
    // l'arbre des catégories l'efface, pour qu'une partie lancée de là n'y revienne pas.
    if (['screen-home', 'screen-categories', 'screen-subcategories', 'screen-themes', 'screen-revision-hub'].includes(screenId)) {
        galleryReturnPending = false;
    }
    // Le portrait du jour n'existe que sur son écran : le quitter par n'importe quelle porte
    // (fiche, galerie, accueil) l'oublie, pour qu'une partie ordinaire n'en hérite pas.
    if (screenId !== 'screen-whois') endPortraitDayMode();
    if (screenId === 'screen-categories') initCategories();
    if (screenId === 'screen-subcategories') initSubcategories();
    if (screenId === 'screen-themes') initThemes();
    if (screenId === 'screen-axes') initAxes();
    if (screenId === 'screen-revision-hub') initRevisionHub();
    if (screenId === 'screen-gallery') initGallery();
    if (screenId === 'screen-atlas') initAtlas();

    // Onboarding guidé (voir js/onboarding.js) : chaque bulle ne s'affiche
    // qu'une fois, et jamais si le tutoriel a été terminé/passé.
    if (typeof Onboarding !== 'undefined') {
        if (screenId === 'screen-home') Onboarding.onHomeScreen();
        if (screenId === 'screen-categories') Onboarding.onCategoriesScreen();
        if (screenId === 'screen-modes') Onboarding.onModesScreen();
    }
    if (screenId === 'screen-modes') {
        const titleEl = document.getElementById('modes-header-title');
        const subtitleEl = document.getElementById('modes-header-subtitle');
        // Le nom du thème (titre) et le décompte d'axes/événements
        // (sous-titre) sont deux éléments distincts plutôt qu'une seule
        // phrase jointe par un tiret cadratin : sur petit écran, ce
        // découpage évite qu'un long nom de thème ne relègue le décompte
        // tout en bas, ou qu'un nombre se retrouve seul en fin de ligne,
        // coupé du mot qu'il qualifie (voir .modes-header-subtitle en CSS).
        let subtitle = '';
        if (revisionMode) {
            titleEl.innerText = t('revision.targeted_title', { count: revisionEvents.length });
        } else if (essentialFilterActive) {
            const theme = getCurrentTheme();
            titleEl.innerText = theme.nom;
            subtitle = t('modes.essential_summary_subtitle', { count: theme.essentiel.length });
        } else if (axisFilterActive) {
            const theme = getCurrentTheme();
            const count = theme.events.filter(e => selectedAxes.has(e.axe)).length;
            titleEl.innerText = theme.nom;
            subtitle = t('modes.axis_summary_subtitle', { axesCount: selectedAxes.size, eventsCount: count });
        } else {
            titleEl.innerText = t('modes.choose_mode');
        }
        if (subtitleEl) {
            subtitleEl.innerText = subtitle;
            subtitleEl.classList.toggle('hidden', !subtitle);
        }
        renderRoundLengthPicker();
        updateModeLocks();
        updateWhoisCard();
        // Choix Frise / Sommaire sous « Découverte » : déplié seulement
        // pour un thème qui propose un sommaire (voir js/mindMap.js).
        if (typeof refreshDiscoveryPicker === 'function') refreshDiscoveryPicker();
    }
    // Le focus suit l'écran : sans cela, l'élément qu'on vient de choisir
    // disparaît avec l'écran quitté, le focus retombe sur <body>, et Tab
    // repart du haut du document au lieu du haut du nouvel écran.
    A11y.focusScreen(targetScreen);
}

// Renvoie l'écran de destination après une partie/un retour, et quitte le mode
// révision ou le Défi du jour
function screenAfterGame() {
    let target;
    if (currentMode === 'carte') {
        // Le Mode Carte se lance depuis n'importe quel niveau de la
        // hiérarchie régionale (Histoires nationales, une région, ou une
        // sous-région) et non depuis un thème unique : on revient donc à
        // l'écran de navigation exact d'où il a été lancé (voir
        // js/geoMap.js: startGeoModeFromNode) plutôt qu'à screen-themes.
        target = geoReturnScreen || 'screen-themes';
    } else if (revisionMode) {
        target = 'screen-revision-hub';
    } else if (dailyChallengeMode || weeklyChallengeMode || isSimultaneityChallenge()) {
        target = 'screen-categories';
    } else if (essentialFilterActive || axisFilterActive) {
        target = 'screen-axes';
    } else {
        // Une partie lancée depuis la galerie des portraits y revient (js/gallery.js).
        target = galleryReturnTarget('screen-themes');
    }
    revisionMode = false;
    dailyChallengeMode = false;
    weeklyChallengeMode = false;
    simulChallengeMode = false;
    return target;
}

// Lance une session mélangée d'au plus n événements piochés parmi les points
// faibles actuels. Si le stock est plus petit que n, on affiche simplement tout.
// Session du jour : les événements arrivés à échéance (js/srs.js), les plus urgents d'abord.
function launchDueRevision(n) {
    const due = getDueEvents().map(item => item.event);
    if (due.length === 0) return;
    revisionKind = 'due';
    revisionRequestedSize = n;
    revisionMode = true;
    revisionEvents = shuffleArray(due.slice(0, n));
    showScreen('screen-modes');
}

function launchRandomRevision(n) {
    revisionKind = 'weak';
    const weak = getWeakEvents().map(item => item.event);
    if (weak.length === 0) return;
    revisionRequestedSize = n;
    revisionMode = true;
    revisionEvents = shuffleArray(weak).slice(0, n);
    showScreen('screen-modes');
}

// Ouvre la liste des thèmes marqués en favoris (indépendamment de leur catégorie
// ou sous-catégorie d'origine). La liste peut être vide : un message le signale alors.
function openFavorites() {
    favoritesMode = true;
    showScreen('screen-themes');
}

// Pioche un événement au hasard parmi tout HistoriAxe et ouvre sa fiche, avec un
// accès direct pour rejouer sur son thème d'origine (et une option pour repiocher).
function discoverRandomEvent() {
    const all = getAllEventsWithLocation();
    if (all.length === 0) return;
    const pick = all[Math.floor(Math.random() * all.length)];
    openModal(pick.event, pick);
}

// Les figures qu'on peut tirer au hasard : celles de la galerie des portraits (un portrait, une date).
function getDiscoverablePortraits() {
    return getPortraitDayPool().filter(evt => portraitOf(evt) && typeof evt.date === 'number');
}

let lastDiscoveredPortraitId = null;

// Pioche un personnage au hasard parmi ceux de la galerie des portraits et ouvre sa fiche, avec les mêmes
// accès que depuis la galerie : sa biographie quand elle existe, et son panthéon. Le bouton « Un autre
// personnage » repioche (jamais deux fois de suite le même).
function discoverRandomPortrait() {
    const all = getDiscoverablePortraits();
    if (all.length === 0) return;
    let pick;
    do { pick = all[Math.floor(Math.random() * all.length)]; }
    while (all.length > 1 && pick.id === lastDiscoveredPortraitId);
    lastDiscoveredPortraitId = pick.id;
    const context = whoThemeContext(pick);
    if (!context) return;
    context.hideRedraw = false;
    context.redraw = discoverRandomPortrait;
    context.redrawLabel = 'modal.redraw_person_btn';
    openModal(pick, context);
}

// Lance le Défi du jour : 10 événements tirés de façon identique pour tous les
// joueurs du monde entier (voir generateDailyEvents), joués en mode Classique
// chronométré (3 vies, temps affiché) pour alimenter le score du classement
// mondial de la modale de résultats.
function startDailyChallenge() {
    const picks = generateDailyEvents();
    if (picks.length === 0) {
        alert(t('modes.no_events_daily'));
        return;
    }
    dailyChallengeEventsWithLocation = picks;
    dailyChallengeMode = true;
    dailyRoundLog = [];
    revisionMode = false;
    favoritesMode = false;
    axisFilterActive = false;
    isSelectionActive = false;
    // Les événements du jour viennent de thèmes divers : on renseigne
    // directement la liste d'axes à partir du tirage (plutôt que du thème
    // sélectionné, potentiellement inexistant), pour que les badges d'axe et
    // getAxisColor() n'aillent pas chercher un thème courant qui n'existe pas.
    currentThemeAxes = [...new Set(picks.map(item => item.event.axe).filter(Boolean))];
    startActualGame('daily');
}

// Lance le Défi hebdomadaire : même principe que le Défi du jour ci-dessus,
// en plus difficile — 30 événements (voir generateWeeklyChallengeEvents dans
// js/weekly.js) au lieu de 10, tirés une fois par semaine ISO plutôt que par
// jour. Mêmes règles de jeu (3 vies, chronométré).
function startWeeklyChallenge() {
    const picks = generateWeeklyChallengeEvents();
    if (picks.length === 0) {
        alert(t('modes.no_events_weekly'));
        return;
    }
    weeklyChallengeEventsWithLocation = picks;
    weeklyChallengeMode = true;
    weeklyChallengeRoundLog = [];
    revisionMode = false;
    favoritesMode = false;
    axisFilterActive = false;
    isSelectionActive = false;
    currentThemeAxes = [...new Set(picks.map(item => item.event.axe).filter(Boolean))];
    startActualGame('weekly');
}

// Relance la partie en cours ; en mode révision, repioche parmi les points faibles
// actuels (en tenant compte des résultats qui viennent d'être enregistrés), en
// conservant la taille de session initialement choisie par le joueur.
function replayCurrentGame() {
    if (currentMode === 'daily') {
        // Rejoue le même tirage que le jour en cours (graine inchangée tant que
        // la date UTC de basculement n'est pas franchie), pour s'entraîner sans
        // fausser l'équité du classement mondial.
        startDailyChallenge();
        return;
    }
    if (currentMode === 'weekly') {
        startWeeklyChallenge();
        return;
    }
    if (currentMode === 'quiz') {
        startQuizGame();
        return;
    }
    if (currentMode === 'avantapres') {
        startAvapGame();
        return;
    }
    if (currentMode === 'fil') {
        startFilGame();
        return;
    }
    if (currentMode === 'periodes') {
        startPeriodesGame();
        return;
    }
    if (currentMode === 'ecart') {
        startEcartGame();
        return;
    }
    if (currentMode === 'whois') {
        startWhoisGame();
        return;
    }
    // Les modes qui ont leur propre écran : sans ces lignes, « Rejouer » les confiait à
    // startActualGame, qui ouvre la frise quel que soit currentMode.
    if (currentMode === 'intrus') {
        startIntrusGame();
        return;
    }
    if (currentMode === 'ordre') {
        startOrdreGame();
        return;
    }
    if (currentMode === 'curseur') {
        startCurseurGame();
        return;
    }
    if (currentMode === 'blitz') {
        startBlitzGame();
        return;
    }
    if (currentMode === 'simultaneity') {
        // Le Défi de simultanéité (tiré de l'historique du joueur) et le mode d'un thème ont chacun leur lanceur.
        if (isSimultaneityChallenge()) startSimultaneityChallenge();
        else startSimultaneityGame();
        return;
    }
    if (currentMode === 'carte') {
        // Même zone, même écran de retour : celui du premier lancement, pas l'écran de fin d'où l'on rejoue.
        if (geoLastNode) startGeoModeFromNode(geoLastNode, geoScopeLabel, geoReturnScreen);
        return;
    }
    if (revisionMode) {
        if (revisionKind === 'due') {
            // Ce qui reste dû après la partie (les réussites ont repoussé les échéances) : on rejoue la suite.
            const due = getDueEvents().map(item => item.event);
            revisionEvents = shuffleArray(due.slice(0, revisionRequestedSize || due.length));
        } else {
            const weak = getWeakEvents().map(item => item.event);
            revisionEvents = shuffleArray(weak).slice(0, revisionRequestedSize || weak.length);
        }
    }
    startActualGame(currentMode);
}

