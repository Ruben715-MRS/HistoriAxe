// =========================================================================
// === HISTORIAXE — MODULE DÉFI HEBDOMADAIRE (WEEKLY CHALLENGE) ===
// =========================================================================
// Miroir de js/daily.js, en plus difficile : 30 événements (au lieu de 10)
// tirés une fois par semaine ISO (au lieu d'une fois par jour). Le tirage et
// le calcul du score font appel à js/dailyEngine.js (partagé avec le
// backend, voir api/_lib/weeklyChallenge.js et api/weeklyScores.js) : ce
// fichier ne fait que piloter l'UI et parler au backend via js/apiClient.js.
// Le score envoyé au classement mondial n'est JAMAIS la variable locale
// `score` : c'est le serveur qui le recalcule à partir du journal
// `weeklyChallengeRoundLog` (voir js/app.js: checkPlacement).

const WEEKLY_CHALLENGE_EVENT_COUNT = 30;

function getWeeklyChallengeSeedString() {
    return DailyEngine.getWeeklySeedString();
}

// Tire les 30 événements du Défi hebdomadaire : mélange déterministe de toute
// la base officielle (graine = semaine ISO en cours, identique pour tous les
// joueurs). Mêmes exclusions que generateDailyEvents (js/daily.js) : thèmes/
// événements personnalisés (propres au localStorage de chaque joueur) et
// thèmes au calendrier non grégorien (DailyEngine.EXCLUDED_THEME_IDS).
function generateWeeklyChallengeEvents() {
    const allWithLocation = (typeof getAllEventsWithLocation === 'function' ? getAllEventsWithLocation() : [])
        .filter(item => item && item.event
            && typeof item.event.date === 'number'
            && !item.event.isCustom
            && !(item.theme && item.theme.isCustom)
            && !(item.theme && DailyEngine.EXCLUDED_THEME_IDS.includes(item.theme.id)));
    if (allWithLocation.length === 0) return [];

    const seedStr = getWeeklyChallengeSeedString();
    return DailyEngine.pickDailyItems(allWithLocation, seedStr, WEEKLY_CHALLENGE_EVENT_COUNT, item => item.event.date, 'historiaxe_weekly_');
}

function openWeeklyChallengeResultsModal(isWin) {
    const modal = document.getElementById('modal-weekly-results');
    if (!modal) return;

    const titleEl = document.getElementById('weekly-results-title');
    const scoreEl = document.getElementById('weekly-results-score');
    const timeEl = document.getElementById('weekly-results-time');
    const feedbackEl = document.getElementById('weekly-submit-feedback');
    const submitBtn = document.getElementById('btn-weekly-submit');
    const pseudoInput = document.getElementById('weekly-pseudo-input');

    if (titleEl) titleEl.innerText = isWin
        ? (t('weekly.title_win') || '🌍 Défi hebdomadaire relevé !')
        : (t('weekly.title_over') || '🌍 Défi hebdomadaire terminé');
    if (scoreEl) scoreEl.innerText = Math.round(score);
    if (timeEl) timeEl.innerText = `${formatDecimal(totalTimePlayed)} s`;

    if (feedbackEl) { feedbackEl.innerText = ''; feedbackEl.className = 'daily-submit-feedback'; }
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('hidden');
        submitBtn.innerText = t('weekly.submit_btn') || 'Envoyer mon score';
    }
    if (pseudoInput) {
        pseudoInput.classList.remove('hidden');
        pseudoInput.value = (typeof pseudoLoad === 'function' ? pseudoLoad() : '') || '';
    }

    updateWeeklyChallengeCountdown();
    if (weeklyChallengeCountdownInterval) clearInterval(weeklyChallengeCountdownInterval);
    weeklyChallengeCountdownInterval = setInterval(updateWeeklyChallengeCountdown, 1000);

    renderWeeklyChallengeLeaderboardPreview();
    modal.classList.remove('hidden');
}

function closeWeeklyChallengeResultsModal() {
    const modal = document.getElementById('modal-weekly-results');
    if (modal) modal.classList.add('hidden');
    if (weeklyChallengeCountdownInterval) { clearInterval(weeklyChallengeCountdownInterval); weeklyChallengeCountdownInterval = null; }
    showScreen('screen-categories');
}

// Affiche le top du classement mondial de la semaine (best-effort : hors
// ligne ou backend indisponible, un simple message s'affiche à la place —
// la partie reste jouable sans connexion).
function renderWeeklyChallengeLeaderboardPreview() {
    const container = document.getElementById('weekly-leaderboard-preview');
    if (!container) return;

    if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) {
        container.innerHTML = `<div class="daily-leaderboard-empty">${t('weekly.submit_offline') || 'Classement mondial indisponible hors connexion.'}</div>`;
        return;
    }

    container.innerHTML = `<div class="daily-leaderboard-empty">${t('weekly.leaderboard_loading') || 'Chargement du classement…'}</div>`;

    const deviceId = getOrCreateDeviceId();
    HistoriAxeAPI.getWeeklyChallengeLeaderboard({
        lang: currentDailyLang(),
        isoWeek: getWeeklyChallengeSeedString(),
        deviceId: deviceId,
        limit: 10
    }).then(res => {
        if (!res.ok) {
            container.innerHTML = `<div class="daily-leaderboard-empty">${t('weekly.leaderboard_error') || 'Classement momentanément indisponible.'}</div>`;
            return;
        }
        const entries = res.data.entries || [];
        if (entries.length === 0) {
            container.innerHTML = `<div class="daily-leaderboard-empty">${t('weekly.leaderboard_empty') || 'Aucun score envoyé pour l’instant. Soyez le premier !'}</div>`;
            return;
        }
        let html = entries.map(entry => renderLeaderboardRow(entry, false)).join('');
        const me = res.data.me;
        if (me && !entries.some(e => e.rank === me.rank)) {
            html += renderLeaderboardRow(me, true);
        }
        container.innerHTML = html;
    });
}

// Déclenché par le bouton « Envoyer mon score » de la modale de résultats.
function handleWeeklyChallengeScoreSubmit() {
    const input = document.getElementById('weekly-pseudo-input');
    if (!input) return;

    const pseudo = input.value.trim();
    if (!pseudo) {
        input.focus();
        return;
    }
    if (typeof pseudoSave === 'function') pseudoSave(pseudo);
    submitWeeklyChallengeScoreToServer(pseudo);
}

// Envoie le journal brut de la partie (weeklyChallengeRoundLog, rempli par
// checkPlacement dans js/app.js) au backend, qui recalcule et renvoie le
// score authentique ainsi que le rang mondial du joueur.
function submitWeeklyChallengeScoreToServer(pseudo) {
    const feedbackEl = document.getElementById('weekly-submit-feedback');
    const submitBtn = document.getElementById('btn-weekly-submit');
    const input = document.getElementById('weekly-pseudo-input');

    if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) {
        if (feedbackEl) {
            feedbackEl.className = 'daily-submit-feedback error';
            feedbackEl.innerText = t('weekly.submit_offline') || 'Classement mondial indisponible hors connexion.';
        }
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = t('weekly.submit_loading') || 'Envoi en cours…';
    }

    const deviceId = getOrCreateDeviceId();
    const payload = {
        deviceId: deviceId,
        pseudo: pseudo || (typeof pseudoLoad === 'function' ? pseudoLoad() : '') || 'Anonyme',
        lang: currentDailyLang(),
        isoWeek: getWeeklyChallengeSeedString(),
        rounds: (typeof weeklyChallengeRoundLog !== 'undefined' && Array.isArray(weeklyChallengeRoundLog)) ? weeklyChallengeRoundLog : []
    };

    HistoriAxeAPI.submitWeeklyChallengeScore(payload).then(res => {
        if (!res.ok) {
            if (feedbackEl) {
                feedbackEl.className = 'daily-submit-feedback error';
                feedbackEl.innerText = t('weekly.submit_error') || "Impossible d'envoyer le score pour le moment. Réessayez.";
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = t('weekly.submit_btn') || 'Envoyer mon score';
            }
            return;
        }

        const data = res.data;
        if (feedbackEl) {
            feedbackEl.className = 'daily-submit-feedback success';
            feedbackEl.innerText = t('weekly.submit_success', { rank: data.rank, total: data.totalPlayers })
                || `Score envoyé ! #${data.rank} sur ${data.totalPlayers} dans le monde.`;
        }
        if (submitBtn) submitBtn.classList.add('hidden');
        if (input) input.classList.add('hidden');
        if (typeof triggerHaptic === 'function') triggerHaptic('success');

        renderWeeklyChallengeLeaderboardPreview();
    });
}

// Décompte jusqu'à la prochaine semaine ISO (même frontière que le Défi du
// jour, 05h00 UTC le lundi — voir DailyEngine.getWeeklySeedString).
function updateWeeklyChallengeCountdown() {
    const countdownEl = document.getElementById('weekly-countdown-val');
    if (!countdownEl) return;

    const now = new Date();
    const nextReset = new Date(now);
    const dayNum = (nextReset.getUTCDay() + 6) % 7; // Lundi=0 ... Dimanche=6
    const daysUntilNextMonday = (dayNum === 0 && now.getUTCHours() < 5) ? 0 : (7 - dayNum);
    nextReset.setUTCDate(nextReset.getUTCDate() + daysUntilNextMonday);
    nextReset.setUTCHours(5, 0, 0, 0);

    const diff = Math.max(0, nextReset.getTime() - now.getTime());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    countdownEl.innerText = days > 0
        ? `${days}j ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`
        : `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
}
