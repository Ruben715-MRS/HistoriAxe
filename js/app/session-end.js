// Extrait de l'ancien js/app.js — Toasts, historique de session, partage, anecdotes, fin de partie.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// =========================================================================
// === MODULE DE RÉTENTION : SÉRIES (STREAKS), PARTAGE WORDLE & ANECDOTES ===
// =========================================================================

// --- GESTIONNAIRE DE SÉRIES (STREAKS) ---


// --- NOTIFICATIONS TOAST ---
let toastTimeout = null;
function showToast(message, duration = 2800) {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    // Texte seulement : un message peut contenir un nom saisi par un joueur (duel, classe…).
    toast.textContent = message;
    toast.classList.remove('hidden', 'toast-hide');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, duration);
}

// --- SUIVI DE SESSION & PARTAGE WORDLE ---
let sessionHistory = [];

function resetSessionHistory() {
    sessionHistory = [];
}

function recordSessionStep(event, isCorrect, isPartial = false) {
    if (!event) return;
    sessionHistory.push({ event, isCorrect: !!isCorrect, isPartial: !!isPartial });
}

function generateShareGrid(history) {
    if (!history || history.length === 0) return '🟩🟩🟩';
    return history.map(item => {
        if (item.isCorrect && !item.isPartial) return '🟩';
        if (item.isPartial) return '🟨';
        return '🟥';
    }).join('');
}

function generateShareText(isDaily) {
    const streak = getStreakCount();
    const grid = generateShareGrid(sessionHistory);
    const now = new Date();
    const dateFormatted = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0');

    if (isDaily) {
        const timeStr = totalTimePlayed ? ` | ⏱️ ${formatDecimal(totalTimePlayed)}s` : '';
        const streakStr = streak > 0 ? t('end.share_streak', { n: streak }) : '';
        return t('end.share_daily', { date: dateFormatted, grid, score, time: timeStr, streak: streakStr });
    } else if (currentMode === 'carte' && geoYearVariant === 'slider' && geoStats.length) {
        // Chrono-Géo : l'espace et le temps en une ligne, ce qui se compare d'un joueur à l'autre.
        const km = geoStats.reduce((sum, s) => sum + s.km, 0) / geoStats.length;
        const gaps = geoStats.filter(s => s.gap !== null);
        const years = gaps.length ? gaps.reduce((sum, s) => sum + s.gap, 0) / gaps.length : 0;
        return t('chronogeo.share', { label: geoScopeLabel, km: geoFormatKm(km), years: Math.round(years), score });
    } else {
        const theme = getCurrentTheme();
        const themeName = theme ? theme.nom : t('end.share_default_theme');
        return t('end.share_theme', { theme: themeName, grid, score });
    }
}

async function shareGameResults(isDaily) {
    const text = generateShareText(isDaily);
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'HistoriAxe',
                text: text
            });
            return;
        } catch (err) {
            if (err.name !== 'AbortError') {
                copyToClipboardFallback(text);
            }
            return;
        }
    }
    copyToClipboardFallback(text);
}

function copyToClipboardFallback(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(t('end.share_toast_copied'));
        }).catch(() => {
            showToast(t('end.share_toast_error'));
        });
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
            document.execCommand('copy');
            showToast(t('end.share_toast_copied'));
        } catch (e) {
            showToast(t('end.share_toast_error'));
        }
        document.body.removeChild(ta);
    }
}

// --- ANECDOTES HISTORIQUES (« LE SAVIEZ-VOUS ? ») ---
function pickSessionAnecdote(history) {
    if (!history || history.length === 0) return null;
    // 1. Événement raté avec description enrichie
    const missedWithDesc = history.filter(item => !item.isCorrect && item.event && item.event.description && item.event.description.length > 20);
    if (missedWithDesc.length > 0) {
        return missedWithDesc[Math.floor(Math.random() * missedWithDesc.length)].event;
    }
    // 2. N'importe quel événement avec description enrichie
    const allWithDesc = history.filter(item => item.event && item.event.description && item.event.description.length > 20);
    if (allWithDesc.length > 0) {
        return allWithDesc[Math.floor(Math.random() * allWithDesc.length)].event;
    }
    // 3. Premier événement ayant une description
    const any = history.find(item => item.event && item.event.description);
    return any ? any.event : null;
}

function renderAnecdoteCard(container, anecdoteEvt) {
    if (!container) return;
    if (!anecdoteEvt || !anecdoteEvt.description) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }
    const wikiHref = safeHttpUrl(anecdoteEvt.wikipedia);
    const wikiLink = wikiHref
        ? `<a href="${escapeHtml(wikiHref)}" target="_blank" rel="noopener" class="anecdote-wiki-link">${t('anecdote.read_more_wiki')}</a>`
        : '';
    container.innerHTML = `
                <div class="anecdote-card">
                    <div class="anecdote-header">
                        <span class="anecdote-badge">${t('anecdote.did_you_know')}</span>
                        <span class="anecdote-date">${formatYear(anecdoteEvt.date)}</span>
                    </div>
                    <div class="anecdote-event-title">${escapeHtml(anecdoteEvt.titre)}</div>
                    <div class="anecdote-desc">${escapeHtml(anecdoteEvt.description)}</div>
                    ${wikiLink}
                </div>
            `;
    container.classList.remove('hidden');
}


// FIN ET NAVIGATION
function endGame(isWin) {
    stopTimer();
    // Le Blitz a sa propre horloge (compte à rebours plutôt que chronomètre) :
    // elle doit s'arrêter ici aussi, sinon elle continuerait de tourner sur
    // l'écran de fin et rappellerait endGame à zéro.
    stopBlitzClock();

    // Expédition : la fin d'une épreuve n'est pas la fin d'une partie — on rend la main au parcours
    // (js/app/expedition.js), qui garde les vies et les points d'une épreuve à l'autre.
    if (typeof expeditionOnStageEnd === 'function' && expeditionOnStageEnd(isWin)) return;
    // Mode Classe : la fin de la manche de l'élève n'est pas la fin de la séance (js/classroom.js).
    if (typeof classOnGameEnd === 'function' && classOnGameEnd()) return;

    if (isWin) { playVictorySound(); triggerHaptic('victory'); triggerConfetti(); } else { triggerHaptic('error'); }

    if (isWin && !revisionMode && !dailyChallengeMode && !weeklyChallengeMode && (currentMode === 'classic' || currentMode === 'chrono')) {
        const theme = getCurrentTheme();
        progressRecordWin(theme.id, currentMode);
    }

    // Le Défi de simultanéité se lance depuis l'écran des catégories : ses
    // ancres viennent de thèmes divers et il n'y a aucun theme.id auquel
    // rattacher le score, exactement comme pour les deux autres défis.
    if (!revisionMode && !dailyChallengeMode && !weeklyChallengeMode && !isSimultaneityChallenge() && currentMode !== 'discovery' && currentMode !== 'training' && currentMode !== 'carte') {
        const theme = getCurrentTheme();
        saveScoreToLeaderboard(theme.id, currentMode, score);
    }
    // Le Mode Carte pioche dans plusieurs thèmes à la fois (toute une
    // région) : il n'y a pas de theme.id unique à qui rattacher le score,
    // on utilise donc un identifiant synthétique dérivé de la zone jouée.
    if (currentMode === 'carte') {
        const scopeSlug = normalizeSearchText(geoScopeLabel || 'monde').replace(/[^a-z0-9]+/g, '-');
        saveScoreToLeaderboard('geo:' + scopeSlug, geoYearVariant === 'slider' ? 'chronogeo' : 'carte', score);
    }

    // Enregistrement de la série quotidienne (Défi du jour toujours, ou
    // toute autre victoire hors Découverte/Entraînement) et de la série
    // hebdomadaire (Défi hebdomadaire uniquement — cf. trophée
    // « pilier_hebdomadaire », propre à ce défi et non à l'activité
    // générale de la semaine, déjà suivie par ailleurs via la ligue XP).
    if (currentMode === 'daily' || (isWin && currentMode !== 'discovery' && currentMode !== 'training')) {
        streakRecordToday();
    }
    if (currentMode === 'weekly') {
        weeklyChallengeStreakRecordThisWeek();
    }

    // Notifications locales (voir js/notifications.js) : demande la
    // permission (no-op si déjà répondue ou déjà accordée) puis
    // reprogramme les rappels — en particulier le rappel de série, qui
    // doit maintenant tenir compte de la partie qui vient d'être jouée.
    if (currentMode !== 'discovery' && typeof HistoriAxeNotifications !== 'undefined') {
        HistoriAxeNotifications.enableAndSchedule();
    }

    // Calcul des erreurs de la session
    const sessionMistakes = sessionHistory.filter(item => !item.isCorrect).length;

    // Attribution d'XP selon le mode et le score
    let awardedXpInfo = null;
    if (currentMode !== 'discovery') {
        let xpGain = Math.round(score * 0.5);
        if (isWin) xpGain += 50; // Bonus victoire
        if (sessionMistakes === 0 && isWin) xpGain += 100; // Bonus parfait
        if (currentMode === 'daily' || currentMode === 'weekly') xpGain += 100; // Bonus Défi du jour/hebdomadaire
        awardedXpInfo = awardXP(xpGain, 'Fin de partie');

        // Journal du récap hebdo/mensuel (voir js/recap.js et
        // js/storage.js: addRecapLogEntry) : XP réellement crédité (après
        // multiplicateur de série) + une victoire de plus si la partie est
        // gagnée.
        if (typeof addRecapLogEntry === 'function') {
            addRecapLogEntry(awardedXpInfo ? awardedXpInfo.xpAwarded : 0, isWin ? 1 : 0);
        }
    }

    // Pièces d'une partie libre (js/app/rewards.js) : peu, plafonnées par jour, aucune sans enjeu (entraînement…).
    const gameCoins = typeof rewardsOnGameEnd === 'function'
        ? rewardsOnGameEnd({ mode: currentMode, isWin, score, perfect: isWin && sessionMistakes === 0 })
        : null;

    // Vérification de la progression des trophées
    checkBadgeProgressOnGameEnd(isWin, sessionMistakes);

    showScreen('screen-end');
    document.getElementById('end-score-val').innerText = score;
    const titleElement = document.getElementById('end-title');
    const timeDisplay = document.getElementById('end-time-display');

    if (isWin) {
        let winTitle = t('end.victory_default');
        if (currentMode === 'quiz') winTitle = t('end.victory_quiz');
        if (currentMode === 'avantapres') winTitle = t('end.victory_avap');
        if (currentMode === 'fil') winTitle = t('end.victory_fil');
        if (currentMode === 'periodes') winTitle = t('end.victory_periodes');
        if (currentMode === 'ecart') winTitle = t('end.victory_ecart');
        if (currentMode === 'carte') winTitle = t(geoYearVariant === 'slider' ? 'end.victory_chronogeo' : 'end.victory_carte');
        if (currentMode === 'simultaneity') {
            winTitle = isSimultaneityChallenge()
                ? t('end.victory_simultaneity_challenge')
                : t('end.victory_simultaneity');
        }
        if (currentMode === 'ordre') winTitle = t('end.victory_ordre');
        if (currentMode === 'curseur') winTitle = t('end.victory_curseur');
        if (currentMode === 'intrus') winTitle = t('end.victory_intrus');
        if (currentMode === 'whois') winTitle = t('end.victory_whois');
        // Le Blitz ne se « gagne » pas : il se termine quand l'horloge tombe à
        // zéro, et c'est le nombre de bonnes réponses qui dit ce qu'il valait.
        if (currentMode === 'blitz') winTitle = t('end.victory_blitz', { right: blitzRight });
        if (currentMode === 'daily') winTitle = t('end.victory_daily');
        if (currentMode === 'weekly') winTitle = t('end.victory_weekly');
        titleElement.innerText = winTitle;
        titleElement.style.color = "#27ae60";
    } else {
        titleElement.innerText = t('end.game_over');
        titleElement.style.color = "var(--danger-red)";
    }

    if (currentMode === 'chrono' || currentMode === 'expert' || currentMode === 'daily' || currentMode === 'weekly') {
        timeDisplay.innerText = t('end.final_time', { val: formatDecimal(totalTimePlayed) });
        timeDisplay.classList.remove('hidden');
    } else {
        timeDisplay.classList.add('hidden');
    }

    // Affichage de l'XP gagné (et du multiplicateur de série, s'il y en a un) :
    // la puce "rebondit" à l'affichage (.xp-rise) et le nombre compte en
    // montant de 0 jusqu'au gain réel plutôt que de s'afficher figé — à
    // chaque frame on rappelle t() avec la valeur intermédiaire pour rester
    // juste dans toutes les langues (voir animateCountUp()).
    if (typeof rewardsShowEndCoins === 'function') rewardsShowEndCoins(gameCoins);
    const xpDisplay = document.getElementById('end-xp-display');
    if (xpDisplay) {
        if (awardedXpInfo && awardedXpInfo.xpAwarded > 0) {
            const mult = awardedXpInfo.streakMultiplier || 1;
            const xpTarget = awardedXpInfo.xpAwarded;
            xpDisplay.classList.remove('hidden');
            replayAnimClass(xpDisplay, 'xp-rise');
            animateCountUp(0, xpTarget, 700, (val) => {
                xpDisplay.innerText = mult > 1
                    ? t('game.xp_gain_streak', { xp: val, mult })
                    : t('game.xp_gain', { xp: val });
            });
        } else {
            xpDisplay.classList.add('hidden');
        }
    }

    // Affichage de la série sur l'écran de fin : un vrai rebond d'entrée
    // (.streak-pop) pour la célébrer, plutôt qu'un chiffre qui se contente
    // de changer dans un texte statique.
    const streakDisplay = document.getElementById('end-streak-display');
    if (streakDisplay) {
        const streak = getStreakCount();
        if (streak > 0) {
            streakDisplay.innerText = t('end.streak_banner', { count: streak });
            streakDisplay.classList.remove('hidden');
            replayAnimClass(streakDisplay, 'streak-pop');
        } else {
            streakDisplay.classList.add('hidden');
        }
    }

    // Affichage du résumé Wordle et bouton de partage
    const shareContainer = document.getElementById('end-share-container');
    if (shareContainer && currentMode !== 'discovery' && sessionHistory.length > 0) {
        const grid = generateShareGrid(sessionHistory);
        shareContainer.innerHTML = `
                    <div class="share-card-header">${t('end.share_title')}</div>
                    <div class="share-emojis-grid">${grid}</div>
                    <button class="btn-share" onclick="shareGameResults(false)">
                        <span>${t('end.share_btn')}</span> <span>📤</span>
                    </button>
                `;
        shareContainer.classList.remove('hidden');
    } else if (shareContainer) {
        shareContainer.classList.add('hidden');
    }

    // Affichage de l'anecdote historique « Le Saviez-vous ? »
    const anecdoteContainer = document.getElementById('end-anecdote-container');
    if (anecdoteContainer && currentMode !== 'discovery' && sessionHistory.length > 0) {
        // Les fiches des événements joués sont chargées avant de choisir l'anecdote.
        const playedEvents = sessionHistory.map(item => item.event).filter(Boolean);
        anecdoteContainer.classList.add('hidden');
        ensureDescriptions(playedEvents).then(() => {
            renderAnecdoteCard(anecdoteContainer, pickSessionAnecdote(sessionHistory));
        });
    } else if (anecdoteContainer) {
        anecdoteContainer.classList.add('hidden');
    }

    if (currentMode === 'daily') {
        openDailyResultsModal(isWin);
    } else if (currentMode === 'weekly') {
        openWeeklyChallengeResultsModal(isWin);
    } else if (typeof Onboarding !== 'undefined') {
        // Les modales de résultats des Défis du jour/hebdomadaire prennent
        // le dessus sur screen-end : on ne propose la bulle d'onboarding de
        // fin de partie que si elle est effectivement visible (voir
        // js/onboarding.js: onFirstGameEnd).
        Onboarding.onFirstGameEnd();
    }

    // Sauvegarde cloud best-effort de la progression (XP, badges, série,
    // SRS, favoris...) après chaque partie — voir syncPushProgress ci-dessus.
    if (currentMode !== 'discovery') {
        syncPushProgress();
    }
}

// Confirmation intégrée à l'interface (remplace window.confirm, qui peut être
// bloqué ou silencieusement ignoré dans certains environnements d'affichage)
function showConfirm(message, onConfirm, options = {}) {
    const modal = document.getElementById('modal-confirm');
    document.getElementById('confirm-message').innerText = message;
    modal.classList.remove('hidden');
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const alertOnly = !!options.alertOnly;
    cancelBtn.classList.toggle('hidden', alertOnly);
    okBtn.innerText = options.okLabel || (alertOnly ? t('nav.understood') : t('nav.quit'));
    const cleanup = () => {
        modal.classList.add('hidden');
        okBtn.onclick = null;
        cancelBtn.onclick = null;
    };
    okBtn.onclick = () => { cleanup(); if (onConfirm) onConfirm(); };
    cancelBtn.onclick = () => { cleanup(); };
}

function quitGame() {
    // Le portrait du jour ne se joue pas à enjeu : on en sort sans confirmation, et la question reste à
    // répondre — rien n'est enregistré avant la réponse.
    if (whoDailyMode) {
        showScreen('screen-categories', 'back');
        return;
    }
    if (currentMode === 'discovery') {
        showScreen(screenAfterGame());
        return;
    }
    showConfirm(t('game.confirm_quit'), () => {
        resetPlacementAnimationState();
        stopTimer();
        multiGameActive = false;
        // Quitter une épreuve d'Expédition abandonne tout le parcours et ramène à l'écran des modes.
        const expeditionExit = typeof expeditionAbort === 'function' ? expeditionAbort() : null;
        if (expeditionExit) {
            showScreen(expeditionExit, 'back');
            if (expeditionExit === 'screen-path' && typeof renderPath === 'function') renderPath();
            return;
        }
        // Quitter la manche d'une séance de classe : on sort de la séance (l'enseignant voit l'élève s'arrêter).
        if ((currentMode === 'class' || (typeof classRunning === 'function' && classRunning())) && typeof classLeave === 'function') { classLeave(); return; }
        showScreen(screenAfterGame());
    });
}

