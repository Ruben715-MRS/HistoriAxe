// Extrait de l'ancien js/app.js — Chronomètre, tirage de la carte suivante, rendu de la frise, placement.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// CHRONOMÈTRE
function startTimer() {
    startTime = Date.now();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        let elapsed = (Date.now() - startTime) / 1000;
        document.getElementById('hud-timer').innerText = formatDecimal(elapsed);
    }, 100);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    totalTimePlayed = (Date.now() - startTime) / 1000;
}

// Certains noms de thème se terminent par une période entre parenthèses
// (« Le Watergate (1972-1974) », « La guerre des Malouines (1982) »...), ce
// qui est précieux dans les menus de navigation mais donnerait la réponse
// si on l'affichait tel quel comme indice pendant un défi. On retire donc
// cette parenthèse finale uniquement à l'affichage, ici, sans toucher au
// nom stocké dans les données (utilisé partout ailleurs).
function stripThemePeriodSuffix(nom) {
    return (nom || '').replace(/\s*\([^()]*\d[^()]*\)\s*$/, '').trim();
}

// LOGIQUE DE JEU
function pickNextEvent() {
    playCardSlideSound();
    if (currentPool.length === 0) {
        if (currentMode === 'multi') {
            endMultiplayerGame();
        } else {
            endGame(true);
        }
        return;
    }
    eventToPlace = currentPool.pop();
    questionStartTime = Date.now();
    // L'événement en jeu reste « en main », épinglé en bas de l'écran, date masquée
    const hand = document.getElementById('hand');
    hand.classList.remove('hand-revealed');
    document.getElementById('hand-kicker').innerText =
        (placedEvents.length === 1) ? t('game.hand_kicker_first') : t('game.hand_kicker_default');
    document.getElementById('hand-year').innerText = '?';
    // Défis du jour/hebdomadaire : les événements viennent de thèmes très
    // divers, et un titre seul manque parfois de contexte (« Fondation
    // légendaire par saint Marin », « Colonisation française »...). On
    // rappelle donc le thème d'origine entre parenthèses tant que
    // l'événement est « en main » ; une fois placé sur la frise, buildEntry
    // n'affiche plus que le titre, comme dans les autres modes.
    const challengeEventsWithLocation = dailyChallengeMode
        ? dailyChallengeEventsWithLocation
        : (weeklyChallengeMode ? weeklyChallengeEventsWithLocation : null);
    const challengeThemeName = challengeEventsWithLocation
        ? (challengeEventsWithLocation.find(item => item.event.id === eventToPlace.id) || {}).theme
        : null;
    document.getElementById('hand-title').innerHTML = challengeThemeName
        ? `${eventToPlace.titre} <em class="hand-title-theme">(${stripThemePeriodSuffix(challengeThemeName.nom)})</em>`
        : eventToPlace.titre;
    setPortraitImg(document.getElementById('hand-portrait'), eventToPlace);
    renderTimeline();
}

// =====================================================================
// MICRO-ANIMATIONS PARTAGÉES (voir css/style.css : .stagger-in, .combo-pulse,
// .xp-rise, .streak-pop) — utilisées par plusieurs modes de jeu et écrans.
// =====================================================================

// Apparition en cascade des cartes d'une liste qui vient de s'afficher
// (catégories, thèmes, favoris, points faibles à réviser...) : décale
// légèrement l'entrée de chaque enfant du conteneur au lieu d'un affichage
// simultané figé. Index plafonné pour qu'une longue liste ne fasse pas
// attendre ses dernières cartes une éternité (au-delà, même délai maximal).
function applyStagger(container) {
    if (!container) return;
    Array.from(container.children).forEach((el, i) => {
        el.style.setProperty('--stagger-i', Math.min(i, 10));
        el.classList.add('stagger-in');
    });
}

// Met à jour un badge de combo (×1.2, ×1.3...) et le fait pulser (voir
// .combo-pulse) uniquement quand la valeur affichée change réellement — pas
// à chaque simple rafraîchissement du HUD — pour que le pulse reste un vrai
// signal de bonne réponse, pas un scintillement continu. Partagé par tous
// les modes de jeu (frise, quiz, avant/après, périodes, fil, écart, carte).
function renderComboChip(el, multiplier) {
    if (!el) return;
    if (multiplier > 1) {
        const val = multiplier.toFixed(1);
        if (el.dataset.mult !== val) {
            el.classList.remove('combo-pulse');
            void el.offsetWidth;
            el.classList.add('combo-pulse');
            el.dataset.mult = val;
        }
        el.innerText = `×${val}`;
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
        delete el.dataset.mult;
    }
}

// Anime un compteur numérique de `from` à `to` (utilisé pour l'XP gagnée en
// fin de partie) : à chaque frame, `onFrame(val, isDone)` reçoit la valeur
// intermédiaire arrondie — c'est l'appelant qui décide comment l'afficher
// (ici en rappelant t() pour rester juste dans toutes les langues, plutôt
// que de manipuler le texte déjà traduit). Respecte prefers-reduced-motion.
function animateCountUp(from, to, duration, onFrame) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        onFrame(to, true);
        return;
    }
    const start = performance.now();
    const diff = to - from;
    function tick(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubique
        const done = progress >= 1;
        onFrame(done ? to : Math.round(from + diff * eased), done);
        if (!done) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// Rejoue une animation CSS déjà en cours (ou déjà jouée) sur `el` en forçant
// un reflow entre le retrait et l'ajout de la classe — sinon le navigateur ne
// redétecte pas de changement et l'animation ne se relance pas.
function replayAnimClass(el, className) {
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
}

function updateHUD() {
    if (currentMode === 'multi') {
        const cp = multiPlayers[currentMultiPlayerIndex];
        document.getElementById('hud-score').innerText = cp.score;
        renderComboChip(document.getElementById('hud-combo'), cp.comboMultiplier);

        let pips = `<span class="multi-player-hud">${cp.name}</span> `;
        for (let i = 0; i < 2; i++) {
            pips += `<span class="pip${i < cp.lives ? '' : ' spent'}"></span>`;
        }
        document.getElementById('hud-lives').innerHTML = pips;
    } else {
        document.getElementById('hud-score').innerText = score;
        renderComboChip(document.getElementById('hud-combo'), comboMultiplier);

        if (currentMode !== 'training' && currentMode !== 'discovery') {
            const maxLives = (currentMode === 'expert') ? 1 : 3;
            let pips = '';
            for (let i = 0; i < maxLives; i++) {
                pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
            }
            document.getElementById('hud-lives').innerHTML = pips;
        }
    }

    if (currentMode !== 'discovery') {
        document.getElementById('hud-count').innerText = `${placedEvents.length} / ${totalEvents}`;
        const pct = totalEvents ? Math.round(placedEvents.length / totalEvents * 100) : 0;
        document.getElementById('hud-progress-fill').style.width = pct + '%';
    }
}

// Icônes œil ouvert / œil barré du bouton d'épinglage de la légende des axes.
const AXES_EYE_OPEN_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>';
const AXES_EYE_CLOSED_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.32 20.32 0 0 1 5.06-6.06M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.32 20.32 0 0 1-3.22 4.36M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';

function renderAxesLegend() {
    const legendEl = document.getElementById('timeline-axes-legend');
    if (!legendEl) return;
    if (currentMode === 'discovery' && currentThemeAxes && currentThemeAxes.length > 1) {
        const pinned = appSettings.axesLegendPinned !== false;
        const timeline = document.getElementById('timeline');
        if (timeline) {
            timeline.classList.toggle('axes-entry-badges-hidden', !pinned);
            // La légende donne le sens des couleurs : sur grand écran, les
            // repères n'ont alors plus besoin de leur étiquette d'axe (voir
            // le liseré de couleur, css/style.css).
            timeline.classList.add('axes-legend-visible');
        }
        const badges = currentThemeAxes.map(axe => {
            const color = getAxisColor(axe);
            return `<span class="entry-axe-badge" data-axis="${color ? color.name : 'blue'}">${axe}</span>`;
        }).join('');
        const toggleLabel = pinned
            ? t('game.axes_legend_hide')
            : t('game.axes_legend_show');
        legendEl.innerHTML = `<span class="axes-legend-title">${t('game.axes_legend_label')}</span>` + badges +
            `<button type="button" class="axes-legend-toggle" onclick="toggleAxesLegendPin()" aria-label="${toggleLabel}" aria-pressed="${pinned}" title="${toggleLabel}">${pinned ? AXES_EYE_OPEN_SVG : AXES_EYE_CLOSED_SVG}</button>`;
        legendEl.classList.remove('hidden');
        legendEl.classList.toggle('pinned', pinned);
    } else {
        const timeline = document.getElementById('timeline');
        if (timeline) timeline.classList.remove('axes-entry-badges-hidden', 'axes-legend-visible');
        legendEl.classList.add('hidden');
    }
}

// Bascule entre légende des axes toujours épinglée (œil ouvert) et
// légende visible seulement au début de la frise (œil fermé).
function toggleAxesLegendPin() {
    appSettings.axesLegendPinned = appSettings.axesLegendPinned === false;
    settingsSave(appSettings);
    renderAxesLegend();
}

// RENDU DE LA COLONNE CHRONOLOGIQUE
// Un intervalle d'insertion nommé est intercalé entre chaque repère :
// le joueur choisit explicitement la fourchette où il pense placer l'événement.
function renderTimeline() {
    const timeline = document.getElementById('timeline');
    const isPlaying = currentMode !== 'discovery';
    // Chaque placement reconstruit toute la frise, ce qui détruisait le
    // créneau qui avait le focus. On en retient la position : après un
    // placement, le focus reste au voisinage de la carte posée, et l'on peut
    // continuer à parcourir la frise de là plutôt que du haut de la page.
    // Le mode peut avoir changé depuis le dernier dessin (le serpentin et les
    // voies par axe ne valent qu'en Découverte) : on met la disposition à jour.
    applyLandscapeFlow();
    const byAxis = landscapeByAxisActive();
    landscapeSignature = effectiveLandscapeFlow() + '|' + byAxis;
    A11y.keepFocus(timeline, () => {
        timeline.className = isPlaying ? 'chrono playing' : 'chrono';
        if (byAxis) timeline.classList.add('axis-lanes');
        timeline.innerHTML = '';

        renderAxesLegend();

        if (byAxis) {
            renderAxisLanes(timeline);
            return;
        }
        for (let i = 0; i <= placedEvents.length; i++) {
            if (isPlaying) timeline.appendChild(buildSlot(i));
            if (i < placedEvents.length) timeline.appendChild(buildEntry(placedEvents[i]));
        }
    });
    markTimelineRows();
}

// Une voie par axe thématique, dans l'ordre des axes du thème, chacune avec
// ses événements en ordre chronologique ; ceux qui n'ont pas d'axe (ou un
// axe hors liste) terminent dans une dernière voie sans couleur.
function renderAxisLanes(timeline) {
    const lanes = new Map(currentThemeAxes.map(axe => [axe, []]));
    const others = [];
    placedEvents.forEach(evt => (lanes.get(evt.axe) || others).push(evt));
    const groups = [...lanes].filter(([, events]) => events.length).map(([axe, events]) => ({ axe, events }));
    if (others.length) groups.push({ axe: null, events: others });
    groups.forEach(({ axe, events }) => {
        const label = axe || t('game.axes_lane_other');
        const color = axe ? getAxisColor(axe) : null;
        const lane = document.createElement('div');
        lane.className = 'axis-lane';
        lane.setAttribute('role', 'group');
        lane.setAttribute('aria-label', label);
        const head = document.createElement('div');
        head.className = 'axis-lane-head';
        const badge = document.createElement('span');
        badge.className = 'entry-axe-badge axis-lane-badge';
        badge.dataset.axis = color ? color.name : 'none';
        badge.textContent = label;
        head.appendChild(badge);
        const row = document.createElement('div');
        row.className = 'axis-lane-row';
        events.forEach(evt => row.appendChild(buildEntry(evt)));
        lane.append(head, row);
        timeline.appendChild(lane);
    });
}

// Libellé de l'intervalle : « Avant 1789 », « Entre 1789 et 1848 », « Après 1981 »
function slotLabel(index) {
    const before = placedEvents[index - 1];
    const after = placedEvents[index];
    if (!before) return t('game.slot_before', { year: formatYear(after.date) });
    if (!after) return t('game.slot_after', { year: formatYear(before.date) });
    return t('game.slot_between', { year1: formatYear(before.date), year2: formatYear(after.date) });
}

function buildSlot(index) {
    const label = slotLabel(index);
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot';
    slot.setAttribute('aria-label', t('game.place_here_aria', { label }));
    slot.innerHTML = `<span class="slot-grid"><span></span><span class="slot-caret"></span>` +
        `<span class="slot-body"><span class="slot-label">${label}</span></span></span>`;
    slot.onclick = () => checkPlacement(index, slot);
    return slot;
}

function buildEntry(evt) {
    const row = document.createElement('div');
    row.className = evt.missed ? 'entry entry-missed' : 'entry';
    row.dataset.eventId = evt.id;

    let axeHtml = '';
    if (evt.axe) {
        const color = getAxisColor(evt.axe);
        if (color) {
            // Sur grand écran, la carte porte un liseré de cette couleur
            // (voir « .entry[data-axis] » dans css/style.css).
            row.dataset.axis = color.name;
            row.style.setProperty('--axis-c', color.border);
            axeHtml = `<span class="entry-axe-badge" data-axis="${color.name}" title="${evt.axe}">${evt.axe}</span>`;
        }
    }

    const dateText = currentMode === 'discovery' ? formatEventDate(evt) : formatYear(evt.date);
    // Voir .entry-year-long (css/style.css) : corps réduit pour que les rares
    // dates très longues (Préhistoire) restent sur une ligne dans la
    // gouttière existante, sans en changer la largeur pour tous les repères.
    const yearIsLong = isLongYear(evt.date) || (evt.dateFin != null && isLongYear(evt.dateFin));
    const yearClass = 'entry-year' + (yearIsLong ? ' entry-year-long' : '');
    row.innerHTML = `<span class="${yearClass}">${dateText}</span>` +
        `<span class="entry-tick"></span>` +
        `<span class="entry-body"><span class="entry-main"><span class="entry-title">${evt.titre}</span>` +
        axeHtml +
        (evt.missed ? `<span class="entry-flag">${t('game.missed_tag')}</span>` : '') +
        `</span><span class="entry-chevron" aria-hidden="true">›</span></span>`;
    // Pastille de portrait avant le titre, pour les événements qui en ont un.
    const thumb = createPortraitThumb(evt, 'entry-portrait');
    if (thumb) {
        const body = row.querySelector('.entry-body');
        body.insertBefore(thumb, body.firstChild);
    }
    row.onclick = () => {
        // Défis du jour/hebdomadaire : les événements viennent de thèmes
        // divers, donc on affiche la ligne « Jouer sur ce thème »
        // (.modal-theme-row) pour pouvoir rejoindre le thème d'origine —
        // sans proposer de repiochage, qui n'a pas de sens pour un tirage
        // commun à tous les joueurs.
        if (dailyChallengeMode || weeklyChallengeMode) {
            const events = dailyChallengeMode ? dailyChallengeEventsWithLocation : weeklyChallengeEventsWithLocation;
            const ctx = events.find(item => item.event.id === evt.id);
            openModal(evt, ctx ? { ...ctx, hideRedraw: true } : null);
        } else {
            openModal(evt);
        }
    };
    A11y.activatable(row);
    return row;
}

// Amène un repère au centre de la colonne et le signale visuellement.
// extraClass accepte une ou plusieurs classes séparées par un espace (ex.
// 'entry-new entry-correct-pulse') — classList.add() refuse un seul token
// contenant un espace, d'où la répartition ci-dessous.
function focusEntry(eventId, extraClass) {
    const row = document.querySelector(`#timeline .entry[data-event-id="${eventId}"]`);
    if (!row) return;
    if (extraClass) extraClass.split(' ').filter(Boolean).forEach(c => row.classList.add(c));
    row.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
}

// Calcule et applique les points d'une réponse (frise ou Quiz), et fait évoluer le
// combo en conséquence. gap = écart en années entre la date réelle et la réponse
// choisie (0 si la réponse est parfaite). Voir la modale « Explications du calcul
// des points » pour le détail pédagogique de cette formule.
function awardPoints(gap, isPerfect, opts = {}) {
    if (currentMode === 'training' || currentMode === 'discovery') return 0;
    const ratio = Math.max(0, 1 - gap / currentGameSpan);
    let pts = Math.round(100 * ratio * (isPerfect ? comboMultiplier : 1));
    // Frise : une erreur ne rapporte rien, quel que soit l'écart (voir
    // checkPlacement). Sur un thème très étendu, la proximité rapportait
    // jusqu'à 95 points pour trois siècles d'erreur, presque autant qu'une
    // bonne réponse.
    if (opts.noPartial && !isPerfect) pts = 0;
    if (opts.speedBonus) pts += opts.speedBonus;
    if (opts.halved) pts = Math.round(pts / 2);
    if (currentMode === 'multi') {
        multiPlayers[currentMultiPlayerIndex].score += pts;
        multiPlayers[currentMultiPlayerIndex].comboMultiplier = isPerfect ? Math.round((multiPlayers[currentMultiPlayerIndex].comboMultiplier + 0.1) * 10) / 10 : 1.0;
    } else {
        score += pts;
    }
    comboMultiplier = isPerfect ? Math.round((comboMultiplier + 0.1) * 10) / 10 : 1.0;
    return pts;
}

function checkPlacement(index, slotElement) {
    if (isAnimating || currentMode === 'discovery') return;

    const dateToPlace = eventToPlace.date;

    // Défis du jour/hebdomadaire : on journalise l'action brute (où, en
    // combien de temps) avant tout calcul local — c'est ce journal, et non
    // le score affiché, qui sera envoyé au serveur pour validation (voir
    // startDailyChallenge/startWeeklyChallenge, submitDailyScoreToServer/
    // submitWeeklyChallengeScoreToServer dans daily.js/weekly.js).
    if (currentMode === 'daily') {
        dailyRoundLog.push({ slotIndex: index, elapsedMs: Date.now() - questionStartTime });
    } else if (currentMode === 'weekly') {
        weeklyChallengeRoundLog.push({ slotIndex: index, elapsedMs: Date.now() - questionStartTime });
    }

    let isCorrect = true;
    let gap = 0;

    if (index > 0) {
        const prevEvent = placedEvents[index - 1];
        if (dateToPlace < prevEvent.date) { isCorrect = false; gap = prevEvent.date - dateToPlace; }
    }
    if (index < placedEvents.length) {
        const nextEvent = placedEvents[index];
        if (dateToPlace > nextEvent.date) { isCorrect = false; gap = Math.max(gap, dateToPlace - nextEvent.date); }
    }

    if (isCorrect) {
        let speedBonus = 0;
        if (currentMode === 'chrono' || currentMode === 'expert' || currentMode === 'daily' || currentMode === 'weekly') {
            const elapsed = (Date.now() - questionStartTime) / 1000;
            speedBonus = Math.round(50 * Math.max(0, 1 - elapsed / 15));
        }
        awardPoints(0, true, { speedBonus });
        playCorrectSound(comboMultiplier);
        playCardPlaceSound();
        triggerHaptic('success');
        srsRecord(eventToPlace.id, true);
        checkBadgeProgressOnAction(true);
        recordSessionStep(eventToPlace, true, false);
        const placedId = eventToPlace.id;
        placedEvents.splice(index, 0, eventToPlace);
        updateHUD();
        focusEntry(placedId, 'entry-new entry-correct-pulse');
        if (currentMode === 'multi') {
            setTimeout(() => nextMultiPlayerTurn(), 1000);
        } else {
            pickNextEvent();
        }
    } else {
        isAnimating = true;
        awardPoints(gap, false, { noPartial: true });
        playWrongSound();
        triggerHaptic('error');
        const handEl = document.getElementById('hand');
        if (handEl) {
            handEl.classList.remove('shake-anim');
            void handEl.offsetWidth;
            handEl.classList.add('shake-anim');
        }
        srsRecord(eventToPlace.id, false);
        recordSessionStep(eventToPlace, false, false);

        if (currentMode === 'multi') {
            let cp = multiPlayers[currentMultiPlayerIndex];
            cp.lives -= 1;
            if (cp.lives <= 0) cp.eliminated = true;
        } else if (currentMode !== 'training') {
            lives -= 1;
        }
        updateHUD();

        // Position réelle de l'événement dans la colonne
        let correctIndex = placedEvents.length;
        for (let j = 0; j < placedEvents.length; j++) {
            if (eventToPlace.date <= placedEvents[j].date) {
                correctIndex = j;
                break;
            }
        }

        // L'intervalle choisi indique la direction de l'erreur
        const wrongKey = (correctIndex < index) ? 'game.slot_higher' : 'game.slot_lower';
        slotElement.classList.add('slot-wrong');
        const labelEl = slotElement.querySelector('.slot-label');
        if (labelEl) labelEl.innerText = t(wrongKey, { date: formatYear(dateToPlace) });

        // La date se dévoile sur la carte en main avant que le repère rejoigne sa place
        const hand = document.getElementById('hand');
        hand.classList.add('hand-revealed');
        document.getElementById('hand-year').innerText = formatYear(dateToPlace);
        document.getElementById('hand-kicker').innerText = t('game.date_revealed');

        eventToPlace.missed = true;
        const missedId = eventToPlace.id;

        wrongAnswerTimeoutId = setTimeout(() => {
            wrongAnswerTimeoutId = null;
            placedEvents.splice(correctIndex, 0, eventToPlace);
            // La carte rejoint la frise 2,2 s après le clic : le bandeau doit
            // en tenir compte ici. L'updateHUD() plus haut a bien enregistré
            // la vie perdue, mais il s'exécutait avant cette insertion — sans
            // ce rappel, le compteur et la barre de progression restaient en
            // retard d'une carte jusqu'au prochain placement réussi (le
            // chemin correct, lui, met à jour juste après son propre splice).
            updateHUD();

            if (currentMode === 'multi') {
                focusEntry(missedId, 'entry-reveal');
                setTimeout(() => nextMultiPlayerTurn(), 900);
            } else if (lives <= 0 && currentMode !== 'training') {
                renderTimeline();
                focusEntry(missedId, 'entry-reveal');
                setTimeout(() => endGame(false), 900);
            } else {
                pickNextEvent();
                focusEntry(missedId, 'entry-reveal');
            }

            isAnimating = false;
        }, 2200);
    }
}


