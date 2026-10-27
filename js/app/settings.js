// Extrait de l'ancien js/app.js — Réglages, orientation, apparence, disposition de la frise.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).

function openSettings() {
    if (typeof triggerHaptic === 'function') triggerHaptic('light');
    renderSettingsUI();
    if (typeof renderAccountSettings === 'function') renderAccountSettings();
    const modal = document.getElementById('modal-settings');
    if (modal) modal.classList.remove('hidden');
}

function closeSettings() {
    const modal = document.getElementById('modal-settings');
    if (modal) modal.classList.add('hidden');
}

// Relance la séquence de coach-marks d'onboarding (voir js/onboarding.js)
// depuis le tout début, à la demande de l'utilisateur.
function restartOnboarding() {
    if (typeof Onboarding === 'undefined') return;
    Onboarding.restart();
    closeSettings();
    showScreen('screen-categories');
}

function openScoringInfo() {
    const modal = document.getElementById('modal-scoring-info');
    if (modal) modal.classList.remove('hidden');
}
function closeScoringInfo() {
    const modal = document.getElementById('modal-scoring-info');
    if (modal) modal.classList.add('hidden');
}

// Efface les favoris, les thèmes/événements personnalisés, l'historique de révision (SRS)
// et la progression de déverrouillage des modes Chrono/Expert. Les réglages d'affichage
// sont conservés (ce ne sont pas des données de progression, mais des préférences d'interface).
function resetGameData() {
    showConfirm(
        t('settings.reset_confirm_full'),
        () => {
            resetAllGameData();
            if (typeof customCategory !== 'undefined') customCategory.themes = [];
            if (typeof syncPushProgress === 'function') syncPushProgress();
            closeSettings();
            showScreen('screen-categories');
        },
        { okLabel: t('settings.reset_confirm_ok') }
    );
}

let appSettings = settingsLoad();

const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const systemLandscapeQuery = window.matchMedia('(orientation: landscape)');

function applyAppearance() {
    let isDark;
    if (appSettings.appearance === 'dark') isDark = true;
    else if (appSettings.appearance === 'light') isDark = false;
    else isDark = systemDarkQuery.matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

// Tablette, ordinateur, téléphone pliant déplié : les écrans dont le côté le
// plus court dépasse 600 px. Un téléphone ordinaire (16:9 ou 9:16) reste en
// dessous dans les deux sens — 430 px de large en portrait, environ 430 px de
// haut en paysage — et garde donc la frise sur une ligne.
const largeScreenQuery = window.matchMedia('(min-width: 600px) and (min-height: 600px)');

// Disposition réellement appliquée en paysage : le réglage de l'utilisateur,
// ramené à ce que l'écran et le mode de jeu permettent.
//  - petit écran : toujours 'line' ;
//  - serpentin : réservé à la Découverte, où il n'y a rien à placer ; en partie
//    (les intervalles sont de largeurs variables, et le sens de lecture
//    inversé une ligne sur deux y ferait se tromper de côté) il devient
//    automatiquement 'wrap'.
function effectiveLandscapeFlow() {
    if (!largeScreenQuery.matches) return 'line';
    const flow = appSettings.landscapeFlow;
    if (flow === 'line') return 'line';
    if (flow === 'snake') return currentMode === 'discovery' ? 'snake' : 'wrap';
    return 'wrap';
}

// Une ligne par axe thématique : Découverte seulement (en partie, répartir les
// intervalles par axe révélerait l'axe de la carte à placer et ferait choisir
// un intervalle parmi ceux de la voie plutôt que de la frise), et seulement
// pour un thème qui compte plusieurs axes.
function landscapeByAxisActive() {
    return effectiveLandscapeFlow() === 'wrap' && appSettings.landscapeByAxis === true &&
        currentMode === 'discovery' && Array.isArray(currentThemeAxes) && currentThemeAxes.length > 1;
}

function applyLandscapeFlow() {
    const flow = effectiveLandscapeFlow();
    const root = document.documentElement;
    root.setAttribute('data-landscape-flow', flow);
    if (flow === 'line') root.removeAttribute('data-landscape-multi');
    else root.setAttribute('data-landscape-multi', '');
    return flow;
}

// Empreinte de la disposition appliquée à la dernière frise dessinée : la frise
// n'est reconstruite que si elle change (la rotation ou le redimensionnement
// d'une fenêtre déclenchent de nombreux événements, qui ne changent rien).
let landscapeSignature = '';

function applyOrientationLayout() {
    let isLandscape;
    if (appSettings.orientation === 'horizontal') isLandscape = true;
    else if (appSettings.orientation === 'vertical') isLandscape = false;
    else isLandscape = systemLandscapeQuery.matches;
    const layoutVal = isLandscape ? 'horizontal' : 'vertical';
    document.documentElement.setAttribute('data-layout', layoutVal);
    document.documentElement.setAttribute('data-timeline-layout', layoutVal);
    applyLandscapeFlow();
    const signature = effectiveLandscapeFlow() + '|' + landscapeByAxisActive();
    const gameScreen = document.getElementById('screen-game');
    const gameVisible = gameScreen && !gameScreen.classList.contains('hidden');
    if (signature !== landscapeSignature && gameVisible && placedEvents && placedEvents.length > 0) {
        renderTimeline();
    } else {
        markTimelineRows();
    }
    landscapeSignature = signature;
    if (typeof repositionEvents === 'function' && placedEvents && placedEvents.length > 0) {
        repositionEvents();
    }
}

try {
    systemDarkQuery.addEventListener('change', () => {
        if (appSettings.appearance === 'auto') applyAppearance();
    });
    systemLandscapeQuery.addEventListener('change', () => {
        if (appSettings.orientation === 'auto') applyOrientationLayout();
    });
    window.addEventListener('resize', () => {
        if (appSettings.orientation === 'auto') applyOrientationLayout();
    });
    window.addEventListener('orientationchange', () => {
        if (appSettings.orientation === 'auto') applyOrientationLayout();
    });
    // Passer d'un petit à un grand écran (fenêtre redimensionnée, téléphone
    // pliant ouvert) change la disposition permise, quel que soit le réglage
    // d'orientation.
    largeScreenQuery.addEventListener('change', () => {
        applyOrientationLayout();
        renderSettingsUI();
        if (typeof updateLayoutButton === 'function') updateLayoutButton();
    });
    // Les retours à la ligne de la frise changent avec la largeur, et ne se
    // mesurent qu'une fois l'écran de jeu affiché : on les recalcule dès que
    // le plateau change de taille. On observe le plateau (#board), pas la
    // frise : markTimelineRows() ajuste la largeur de cette dernière, ce qui
    // ferait boucler l'observateur.
    if (typeof ResizeObserver === 'function') {
        const boardEl = document.getElementById('board');
        if (boardEl) new ResizeObserver(() => markTimelineRows()).observe(boardEl);
    }
} catch (e) { }

// Frise horizontale sur plusieurs lignes : le navigateur répartit seul les
// repères en lignes (flex-wrap) ; seul le JS sait où tombe chaque retour à la
// ligne, ou doit placer un serpentin. Ici on :
//  - marque le dernier repère de chaque ligne (.row-end, l'axe s'y termine par
//    une flèche) et le premier de la suivante (.row-start, l'axe y reprend en
//    fondu), pour que l'œil suive la continuité ;
//  - ajuste la largeur de la frise à sa ligne la plus large, pour que le bloc
//    soit centré dans l'écran tout en gardant chaque ligne alignée à gauche ;
//  - en serpentin, place chaque repère dans une grille (une ligne sur deux est
//    inversée) et ajoute les demi-tours entre les lignes.
function markTimelineRows() {
    const timeline = document.getElementById('timeline');
    if (!timeline) return;
    const items = Array.from(timeline.querySelectorAll('.entry, .slot'));
    items.forEach(el => {
        el.classList.remove('row-start', 'row-end', 'row-rtl', 'snake-end');
        el.style.gridRow = '';
        el.style.gridColumn = '';
    });
    timeline.querySelectorAll('.snake-turn').forEach(n => n.remove());
    timeline.style.removeProperty('--wrap-width');
    timeline.style.removeProperty('--snake-cols');
    const root = document.documentElement;
    if (root.getAttribute('data-layout') !== 'horizontal' || !items.length) return;
    const flow = root.getAttribute('data-landscape-flow');

    if (flow === 'wrap') {
        for (let i = 1; i < items.length; i++) {
            if (items[i].parentElement === items[i - 1].parentElement &&
                items[i].offsetTop > items[i - 1].offsetTop + 4) {
                items[i - 1].classList.add('row-end');
                items[i].classList.add('row-start');
            }
        }
        const left = timeline.getBoundingClientRect().left;
        let widest = 0;
        items.forEach(el => { widest = Math.max(widest, el.getBoundingClientRect().right - left); });
        // +1 px : une largeur arrondie à la baisse ferait tomber le dernier
        // repère de la ligne la plus large à la ligne.
        if (widest > 0 && widest + 1 < timeline.clientWidth) {
            timeline.style.setProperty('--wrap-width', Math.ceil(widest) + 1 + 'px');
        }
    } else if (flow === 'snake') {
        // En Découverte il n'y a que des repères, tous de même largeur.
        const cell = items[0].offsetWidth;
        // Les demi-tours débordent de 26 px de chaque côté.
        const cols = Math.max(1, Math.floor((timeline.clientWidth - 64) / cell));
        timeline.style.setProperty('--snake-cols', cols);
        if (cols < 2) return;
        items.forEach((el, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            el.style.gridRow = row + 1;
            el.style.gridColumn = (row % 2 === 0 ? col : cols - 1 - col) + 1;
            el.classList.toggle('row-rtl', row % 2 === 1);
            if (col === cols - 1 && i < items.length - 1) {
                el.classList.add('snake-end');
                const turn = document.createElement('span');
                turn.className = 'snake-turn';
                turn.setAttribute('aria-hidden', 'true');
                el.appendChild(turn);
            }
        });
    }
}

function renderSettingsUI() {
    document.querySelectorAll('#settings-landscape-flow button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === (appSettings.landscapeFlow || 'wrap'));
    });
    // Ces dispositions n'existent que sur tablette et ordinateur : sur un
    // téléphone ordinaire le réglage serait un bouton qui ne fait rien.
    const landscapeGroup = document.getElementById('settings-group-landscape');
    if (landscapeGroup) landscapeGroup.classList.toggle('hidden', !largeScreenQuery.matches);
    const byAxisOn = (appSettings.landscapeFlow || 'wrap') === 'wrap';
    const byAxisRow = document.getElementById('settings-landscape-axis-row');
    const byAxisHint = document.getElementById('settings-landscape-axis-hint');
    if (byAxisRow) byAxisRow.classList.toggle('hidden', !byAxisOn);
    if (byAxisHint) byAxisHint.classList.toggle('hidden', !byAxisOn);
    const byAxisBox = document.getElementById('settings-landscape-by-axis');
    if (byAxisBox) byAxisBox.checked = appSettings.landscapeByAxis === true;
    const axisUnderBox = document.getElementById('settings-axis-under-events');
    if (axisUnderBox) axisUnderBox.checked = appSettings.axisUnderEvents === true;
    document.querySelectorAll('#settings-orientation button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === appSettings.orientation);
    });
    document.querySelectorAll('#settings-appearance button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === appSettings.appearance);
    });
    document.querySelectorAll('#settings-sound button').forEach(btn => {
        btn.classList.toggle('active', (btn.dataset.value === 'on') === appSettings.sound);
    });
    document.querySelectorAll('#settings-haptics button').forEach(btn => {
        btn.classList.toggle('active', (btn.dataset.value === 'on') === appSettings.haptics);
    });
    document.querySelectorAll('#settings-portraits button').forEach(btn => {
        // Tant que la question n'a pas été posée, les portraits sont en couleur.
        btn.classList.toggle('active', btn.dataset.value === (appSettings.portraitCollection || 'color'));
    });
    document.querySelectorAll('#settings-notifications button').forEach(btn => {
        btn.classList.toggle('active', (btn.dataset.value === 'on') === appSettings.notifications);
    });
    // Réglage inutile (et silencieusement inopérant) hors app native iOS :
    // on le masque plutôt que d'afficher un bouton qui ne fait rien.
    const notifGroup = document.getElementById('settings-group-notifications');
    if (notifGroup) {
        const supported = typeof HistoriAxeNotifications !== 'undefined' && HistoriAxeNotifications.isSupported();
        notifGroup.classList.toggle('hidden', !supported);
    }
    // Un réglage par type de rappel, visible seulement quand les notifications sont activées.
    const notifTypes = document.getElementById('settings-group-notif-types');
    if (notifTypes) {
        const supported = typeof HistoriAxeNotifications !== 'undefined' && HistoriAxeNotifications.isSupported();
        notifTypes.classList.toggle('hidden', !supported || !appSettings.notifications);
        notifTypes.querySelectorAll('input[data-notif-type]').forEach(box => {
            box.checked = appSettings[NOTIF_TYPE_SETTINGS[box.dataset.notifType]] !== false;
        });
    }
    renderPlayModeSetting();
    if (typeof i18n !== 'undefined' && typeof i18n.renderLanguagePacksSettingsUI === 'function') {
        i18n.renderLanguagePacksSettingsUI();
    }
}

// Type de rappel -> clé de appSettings (voir js/storage.js: DEFAULT_SETTINGS et js/notifications.js).
const NOTIF_TYPE_SETTINGS = {
    streak: 'notifStreak', daily: 'notifDaily', recap: 'notifRecap', review: 'notifReview',
    duel: 'notifDuel', milestone: 'notifMilestone', comeback: 'notifComeback'
};

function initSettingsControls() {
    document.querySelectorAll('#settings-landscape-flow button').forEach(btn => {
        btn.onclick = () => {
            appSettings.landscapeFlow = btn.dataset.value;
            settingsSave(appSettings);
            applyOrientationLayout();
            renderSettingsUI();
        };
    });
    const axisUnderBox = document.getElementById('settings-axis-under-events');
    if (axisUnderBox) {
        axisUnderBox.onchange = () => {
            appSettings.axisUnderEvents = axisUnderBox.checked;
            settingsSave(appSettings);
            if (typeof renderAxesLegend === 'function') renderAxesLegend();
        };
    }
    const byAxisBox = document.getElementById('settings-landscape-by-axis');
    if (byAxisBox) {
        byAxisBox.onchange = () => {
            appSettings.landscapeByAxis = byAxisBox.checked;
            settingsSave(appSettings);
            applyOrientationLayout();
            renderSettingsUI();
        };
    }
    document.querySelectorAll('#settings-orientation button').forEach(btn => {
        btn.onclick = () => {
            appSettings.orientation = btn.dataset.value;
            settingsSave(appSettings);
            applyOrientationLayout();
            renderSettingsUI();
        };
    });
    document.querySelectorAll('#settings-appearance button').forEach(btn => {
        btn.onclick = () => {
            appSettings.appearance = btn.dataset.value;
            settingsSave(appSettings);
            applyAppearance();
            renderSettingsUI();
        };
    });
    document.querySelectorAll('#settings-sound button').forEach(btn => {
        btn.onclick = () => {
            appSettings.sound = (btn.dataset.value === 'on');
            settingsSave(appSettings);
            if (appSettings.sound) playCorrectSound(1.0);
            renderSettingsUI();
        };
    });
    document.querySelectorAll('#settings-portraits button').forEach(btn => {
        btn.onclick = () => {
            setPortraitCollection(btn.dataset.value);
            renderSettingsUI();
        };
    });
    const playModeSelect = document.getElementById('settings-play-mode');
    if (playModeSelect) {
        playModeSelect.onchange = () => {
            appSettings.playMode = findPlayMode(playModeSelect.value).id;
            settingsSave(appSettings);
        };
    }
    document.querySelectorAll('#settings-haptics button').forEach(btn => {
        btn.onclick = () => {
            appSettings.haptics = (btn.dataset.value === 'on');
            settingsSave(appSettings);
            if (appSettings.haptics) triggerHaptic('success');
            renderSettingsUI();
        };
    });
    document.querySelectorAll('#settings-group-notif-types input[data-notif-type]').forEach(box => {
        box.onchange = () => {
            appSettings[NOTIF_TYPE_SETTINGS[box.dataset.notifType]] = box.checked;
            settingsSave(appSettings);
            if (typeof HistoriAxeNotifications !== 'undefined') HistoriAxeNotifications.refreshAll();
        };
    });
    document.querySelectorAll('#settings-notifications button').forEach(btn => {
        btn.onclick = () => {
            const wantsOn = (btn.dataset.value === 'on');
            appSettings.notifications = wantsOn;
            settingsSave(appSettings);
            renderSettingsUI();
            if (typeof HistoriAxeNotifications === 'undefined') return;
            if (wantsOn) HistoriAxeNotifications.enableAndSchedule();
            else HistoriAxeNotifications.cancelAll();
        };
    });
}

