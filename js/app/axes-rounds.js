// Extrait de l'ancien js/app.js — Axes thématiques, longueur de la manche, viviers de parties.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// PALETTE DE COULEURS POUR LES AXES THÉMATIQUES
const AXIS_PALETTE = [
    { name: 'blue', border: '#2980b9' },
    { name: 'green', border: '#27ae60' },
    { name: 'orange', border: '#e67e22' },
    { name: 'purple', border: '#8e44ad' },
    { name: 'red', border: '#c0392b' },
    { name: 'teal', border: '#16a085' },
    { name: 'gold', border: '#b8892e' },
    { name: 'pink', border: '#d81b60' }
];

function getAxisColor(axeName) {
    if (!axeName) return null;
    let axesList = currentThemeAxes;
    if (!axesList || axesList.length === 0) {
        const theme = getCurrentTheme();
        if (theme && theme.events) {
            axesList = [...new Set(theme.events.map(e => e.axe).filter(Boolean))];
            if (theme.axeOrder) {
                axesList = theme.axeOrder.filter(a => axesList.includes(a));
            }
        }
    }
    const idx = axesList ? axesList.indexOf(axeName) : -1;
    const paletteIndex = idx >= 0 ? (idx % AXIS_PALETTE.length) : 0;
    return AXIS_PALETTE[paletteIndex];
}

// --- LONGUEUR DE LA MANCHE ---
// Tous les modes qui piochent dans un thème passaient par le même bloc,
// recopié à l'identique sept fois : « les événements du thème (ou de la
// révision), moins ceux qu'une Sélection a écartés ». Il vit désormais ici,
// et c'est du même coup le seul endroit où appliquer la longueur de manche.
//
// Deux portes plutôt qu'une : `getModePoolRaw` rend le vivier entier, que la
// Découverte et les Défis doivent garder (consulter une frise amputée n'a pas
// de sens, et le tirage d'un défi est fixé ailleurs) ; `getSessionPool` en
// rend une manche.
// Sélecteur affiché sous l'en-tête de l'écran des modes. Il se redessine à
// chaque ouverture parce que la taille du vivier change avec le thème, mais
// aussi avec le filtre d'axes ou les ⭐ Incontournables : « 20 » n'a plus de
// sens une fois l'axe réduit à 14 événements.
function renderRoundLengthPicker() {
    const box = document.getElementById('round-length');
    if (!box) return;
    box.innerHTML = '';

    // La révision impose déjà sa taille au lancement : deux réglages
    // concurrents sur le même écran ne feraient que se contredire.
    const poolSize = revisionMode ? 0 : getModePoolRaw().length;
    const choices = roundLengthChoicesFor(poolSize);
    box.classList.toggle('hidden', choices.length === 0);
    if (!choices.length) return;

    const current = resolveRoundLength(appSettings.roundLength, poolSize);
    // Un seul bouton actif, même quand deux jouent la même partie (« 50 » et
    // « Tout » sur un thème de 50 pile) : voir activeRoundLengthChoice.
    const activeChoice = activeRoundLengthChoice(choices, appSettings.roundLength, poolSize);
    choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'round-length-btn';
        btn.innerText = choice === 0 ? t('rounds.all', { count: poolSize }) : String(choice);
        const active = choice === activeChoice;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.onclick = () => {
            appSettings.roundLength = choice;
            settingsSave(appSettings);
            A11y.keepFocus(box, renderRoundLengthPicker);
        };
        box.appendChild(btn);
    });

    const hint = document.createElement('span');
    hint.className = 'round-length-hint';
    hint.innerText = t('rounds.hint', { count: current });
    box.appendChild(hint);
}

function getModePoolRaw() {
    let sourceEvents = revisionMode ? revisionEvents : getCurrentThemeEventsForMode();
    if (isSelectionActive && !revisionMode) {
        sourceEvents = sourceEvents.filter(e => selectedEventsIds.has(e.id));
    }
    return sourceEvents;
}

function getSessionPool() {
    const pool = applyRoundLength(getModePoolRaw());
    // Mémorisé pour l'historique des scores : sans lui, une manche de 10 et
    // une partie de 217 s'y afficheraient dans la même colonne, incomparables
    // mais présentées comme si elles l'étaient.
    currentRoundSize = pool.length;
    return pool;
}

// La révision a déjà sa propre taille, choisie par le joueur au lancement
// (voir launchRandomRevision) : la borner une seconde fois lui retirerait des
// points faibles qu'il vient justement de demander à revoir.
function applyRoundLength(events) {
    if (revisionMode) return events;
    const size = resolveRoundLength(appSettings.roundLength, events.length);
    if (size >= events.length) return events;
    // Tirage au sort dans tout le thème, plutôt qu'une tranche chronologique :
    // une manche doit balayer toute la période couverte, pas seulement son
    // début — sinon la fin d'un gros thème ne serait jamais jouée.
    return shuffleArray(events).slice(0, size);
}

function getCurrentThemeEventsForMode() {
    const theme = getCurrentTheme();
    let sourceEvents = (axisFilterActive && selectedAxes.size > 0)
        ? theme.events.filter(e => selectedAxes.has(e.axe))
        : theme.events;
    if (essentialFilterActive && theme.essentiel) {
        const essentialIds = new Set(theme.essentiel);
        sourceEvents = sourceEvents.filter(e => essentialIds.has(e.id));
    }
    return sourceEvents;
}

// INIT ÉCRAN DES AXES THÉMATIQUES (Amériques, Campagne, ou tout thème taggé)
function initAxes() {
    const theme = getCurrentTheme();
    let axes = [...new Set(theme.events.map(e => e.axe).filter(Boolean))];
    if (theme.axeOrder) {
        // Ordre d'affichage explicite défini par le thème, prioritaire sur l'ordre
        // d'apparition dans le tableau d'événements (qui reste, lui, chronologique).
        axes = theme.axeOrder.filter(a => axes.includes(a));
    }
    // Comparaison sur l'identité du thème, et non sur sa liste d'axes :
    // openThemeAt() renseigne déjà currentThemeAxes avec les axes du thème
    // qu'on vient d'ouvrir avant d'afficher cet écran, si bien qu'une
    // comparaison de listes se concluait toujours par « même thème ». La
    // sélection du thème précédent restait alors active : les axes du
    // nouveau thème s'affichaient tous décochés, le sous-titre annonçait
    // « 0 événement sélectionné », et lancer un mode se soldait par
    // « Ce thème ne contient aucun événement » sur un thème qui en a 50.
    const sameTheme = selectedAxesThemeId === theme.id;
    currentThemeAxes = axes;
    if (!sameTheme || selectedAxes.size === 0) {
        selectedAxes = new Set(axes); // nouveau thème (ou état vide) : tout sélectionné par défaut
    }
    selectedAxesThemeId = theme.id;
    renderAxesScreen();
}

function renderAxesScreen() {
    const theme = getCurrentTheme();
    const container = document.getElementById('axes-container');
    const essentialZone = document.getElementById('essentiel-zone');
    container.innerHTML = '';
    essentialZone.innerHTML = '';
    if (theme.essentiel) {
        const essentialCard = document.createElement('div');
        essentialCard.className = 'essentiel-card' + (essentialFilterActive ? ' active' : '');
        essentialCard.innerHTML = `<span class="essentiel-icon">⭐</span><span><strong>${t('axes.essential_title')}</strong><small>${t('axes.essential_desc', { count: theme.essentiel.length })}</small></span>`;
        essentialCard.onclick = () => {
            essentialFilterActive = true;
            axisFilterActive = false;
            selectedAxes = new Set(currentThemeAxes);
            showScreen('screen-modes', 'forward');
        };
        A11y.activatable(essentialCard);
        essentialZone.appendChild(essentialCard);
    }
    currentThemeAxes.forEach(axe => {
        const count = theme.events.filter(e => e.axe === axe).length;
        const essentialCount = theme.essentiel
            ? theme.essentiel.filter(id => theme.events.some(e => e.id === id && e.axe === axe)).length
            : 0;
        const card = document.createElement('div');
        const isSelected = selectedAxes.has(axe);
        const color = getAxisColor(axe);
        card.className = 'axis-card' + (isSelected ? ' selected' : '');
        if (color) {
            card.dataset.axis = color.name;
        }
        const essentialBadge = theme.essentiel ? `<span class="axis-essentiel-badge">⭐ ${essentialCount}</span>` : '';
        card.innerHTML = `<h3>${escapeHtml(axe)}</h3><p>${t('categories.events_count', { count })} ${essentialBadge}</p>`;
        card.onclick = () => {
            if (selectedAxes.has(axe)) { selectedAxes.delete(axe); }
            else { selectedAxes.add(axe); }
            // Cocher un axe reconstruit toute la liste : le focus est rendu à la
            // même position, sans quoi chaque case cochée renvoyait au haut de
            // l'écran.
            A11y.keepFocus(document.getElementById('screen-axes'), renderAxesScreen);
        };
        // Un axe se coche et se décoche : c'est une case à cocher, pas un
        // bouton — l'Espace la bascule (convention ARIA), pas Entrée.
        A11y.activatable(card, { role: 'checkbox', checked: isSelected });
        container.appendChild(card);
    });
    const totalCount = theme.events.filter(e => selectedAxes.has(e.axe)).length;
    // Note du thème (renvoi vers un autre panthéon, par exemple) : le premier écran qu'on voit en l'ouvrant.
    const noteBox = document.getElementById('axes-theme-note');
    if (noteBox) {
        document.getElementById('axes-theme-note-text').innerText = theme.note || '';
        collapseImportantNote(noteBox);
        noteBox.classList.toggle('hidden', !theme.note);
    }
    const subtitle = document.getElementById('axes-subtitle');
    subtitle.innerText = selectedAxes.size > 0
        ? t('axes.subtitle_selected', { theme: theme.nom, count: totalCount })
        : t('axes.subtitle_select_one', { theme: theme.nom });
    document.getElementById('axes-continue-btn').disabled = selectedAxes.size === 0;
    document.getElementById('axes-minigames-btn').disabled = selectedAxes.size === 0;

    // « Tout sélectionner » / « Tout désélectionner » : l'état courant est
    // celui du bouton enfoncé, comme pour le sélecteur de longueur de manche.
    const allSelected = selectedAxes.size === currentThemeAxes.length;
    const noneSelected = selectedAxes.size === 0;
    [['axes-select-all', allSelected, () => new Set(currentThemeAxes)],
     ['axes-select-none', noneSelected, () => new Set()]].forEach(([id, active, next]) => {
        const btn = document.getElementById(id);
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.onclick = () => {
            selectedAxes = next();
            A11y.keepFocus(document.getElementById('screen-axes'), renderAxesScreen);
        };
    });
}

function confirmAxesSelection() {
    if (selectedAxes.size === 0) return;
    essentialFilterActive = false;
    axisFilterActive = true;
    showScreen('screen-modes', 'forward');
}

