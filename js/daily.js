// =========================================================================
// === HISTORIAXE — MODULE DÉFI DU JOUR (DAILY CHALLENGE & LEADERBOARD) ===
// =========================================================================
// Le tirage et le calcul du score font appel à js/dailyEngine.js (partagé
// avec le backend, voir api/_lib/dailyChallenge.js et api/scores.js) : ce
// fichier ne fait plus que piloter l'UI et parler au backend via
// js/apiClient.js. Le score envoyé au classement mondial n'est JAMAIS la
// variable locale `score` : c'est le serveur qui le recalcule à partir du
// journal `dailyRoundLog` (voir js/app.js: checkPlacement).

function getDailySeedString() {
    return DailyEngine.getDailySeedString();
}

// Tire les 10 événements du Défi du jour : mélange déterministe de toute la
// base officielle (graine = date du jour, identique pour tous les joueurs).
// Les thèmes/événements personnalisés sont exclus du tirage — ils n'existent
// que dans le localStorage de chaque joueur, le serveur ne les connaît pas,
// et les inclure romprait l'équité (et la validation) du classement mondial.
function generateDailyEvents() {
    const allWithLocation = (typeof getAllEventsWithLocation === 'function' ? getAllEventsWithLocation() : [])
        .filter(item => item && item.event
            && typeof item.event.date === 'number'
            && !item.event.isCustom
            && !(item.theme && item.theme.isCustom));
    if (allWithLocation.length === 0) return [];

    const seedStr = getDailySeedString();
    return DailyEngine.pickDailyItems(allWithLocation, seedStr, 10, item => item.event.date);
}

function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function openDailyResultsModal(isWin) {
    const modal = document.getElementById('modal-daily-results');
    if (!modal) return;

    const titleEl = document.getElementById('daily-results-title');
    const scoreEl = document.getElementById('daily-results-score');
    const timeEl = document.getElementById('daily-results-time');
    const feedbackEl = document.getElementById('daily-submit-feedback');
    const submitBtn = document.getElementById('btn-daily-submit');
    const pseudoInput = document.getElementById('daily-pseudo-input');

    if (titleEl) titleEl.innerText = isWin
        ? (t('daily.title_win') || '🌍 Défi du jour relevé !')
        : (t('daily.title_over') || '🌍 Défi du jour terminé');
    if (scoreEl) scoreEl.innerText = Math.round(score);
    if (timeEl) timeEl.innerText = `${totalTimePlayed.toFixed(1).replace('.', ',')} s`;

    if (feedbackEl) { feedbackEl.innerText = ''; feedbackEl.className = 'daily-submit-feedback'; }
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('hidden');
        submitBtn.innerText = t('daily.submit_btn') || 'Envoyer mon score';
    }
    if (pseudoInput) {
        pseudoInput.classList.remove('hidden');
        pseudoInput.value = (typeof pseudoLoad === 'function' ? pseudoLoad() : '') || '';
    }

    updateDailyCountdown();
    if (dailyCountdownInterval) clearInterval(dailyCountdownInterval);
    dailyCountdownInterval = setInterval(updateDailyCountdown, 1000);

    renderDailyLeaderboardPreview();
    if (typeof renderDuelComparisonIfPending === 'function') renderDuelComparisonIfPending();
    modal.classList.remove('hidden');
}

function closeDailyResultsModal() {
    const modal = document.getElementById('modal-daily-results');
    if (modal) modal.classList.add('hidden');
    if (dailyCountdownInterval) { clearInterval(dailyCountdownInterval); dailyCountdownInterval = null; }
    showScreen('screen-categories');
}

function currentDailyLang() {
    try {
        if (typeof appSettings !== 'undefined' && appSettings && appSettings.lang) return appSettings.lang;
    } catch (e) {}
    return 'fr';
}

function renderLeaderboardRow(entry, isMe) {
    let medal = '#' + entry.rank;
    if (entry.rank === 1) medal = '🥇';
    else if (entry.rank === 2) medal = '🥈';
    else if (entry.rank === 3) medal = '🥉';
    return `
        <div class="leaderboard-row${isMe ? ' leaderboard-row-me' : ''}">
            <span class="leaderboard-rank">${medal}</span>
            <span class="leaderboard-pseudo">${escapeHtml(entry.pseudo)}${isMe ? ' <em>(vous)</em>' : ''}</span>
            <span class="leaderboard-score">${entry.score} pts</span>
            <span class="leaderboard-time">${entry.timeSeconds}s</span>
        </div>
    `;
}

// Affiche le top du classement mondial du jour (best-effort : hors ligne ou
// backend indisponible, un simple message s'affiche à la place — la partie
// reste jouable sans connexion).
function renderDailyLeaderboardPreview() {
    const container = document.getElementById('daily-leaderboard-preview');
    if (!container) return;

    if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) {
        container.innerHTML = `<div class="daily-leaderboard-empty">${t('daily.submit_offline') || 'Classement mondial indisponible hors connexion.'}</div>`;
        return;
    }

    container.innerHTML = `<div class="daily-leaderboard-empty">${t('daily.leaderboard_loading') || 'Chargement du classement…'}</div>`;

    const deviceId = getOrCreateDeviceId();
    HistoriAxeAPI.getDailyLeaderboard({
        lang: currentDailyLang(),
        date: getDailySeedString(),
        deviceId: deviceId,
        limit: 10
    }).then(res => {
        if (!res.ok) {
            container.innerHTML = `<div class="daily-leaderboard-empty">${t('daily.leaderboard_error') || 'Classement momentanément indisponible.'}</div>`;
            return;
        }
        const entries = res.data.entries || [];
        if (entries.length === 0) {
            container.innerHTML = `<div class="daily-leaderboard-empty">${t('daily.leaderboard_empty') || 'Aucun score envoyé pour l’instant. Soyez le premier !'}</div>`;
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
function handleDailyScoreSubmit() {
    const input = document.getElementById('daily-pseudo-input');
    if (!input) return;

    const pseudo = input.value.trim();
    if (!pseudo) {
        input.focus();
        return;
    }
    if (typeof pseudoSave === 'function') pseudoSave(pseudo);
    submitDailyScoreToServer(pseudo);
}

// Envoie le journal brut de la partie (dailyRoundLog, rempli par
// checkPlacement dans js/app.js) au backend, qui recalcule et renvoie le
// score authentique ainsi que le rang mondial du joueur.
function submitDailyScoreToServer(pseudo) {
    const feedbackEl = document.getElementById('daily-submit-feedback');
    const submitBtn = document.getElementById('btn-daily-submit');
    const input = document.getElementById('daily-pseudo-input');

    if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) {
        if (feedbackEl) {
            feedbackEl.className = 'daily-submit-feedback error';
            feedbackEl.innerText = t('daily.submit_offline') || 'Classement mondial indisponible hors connexion.';
        }
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = t('daily.submit_loading') || 'Envoi en cours…';
    }

    const deviceId = getOrCreateDeviceId();
    const payload = {
        deviceId: deviceId,
        pseudo: pseudo || (typeof pseudoLoad === 'function' ? pseudoLoad() : '') || 'Anonyme',
        lang: currentDailyLang(),
        date: getDailySeedString(),
        rounds: (typeof dailyRoundLog !== 'undefined' && Array.isArray(dailyRoundLog)) ? dailyRoundLog : []
    };

    HistoriAxeAPI.submitDailyScore(payload).then(res => {
        if (!res.ok) {
            if (feedbackEl) {
                feedbackEl.className = 'daily-submit-feedback error';
                feedbackEl.innerText = t('daily.submit_error') || "Impossible d'envoyer le score pour le moment. Réessayez.";
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = t('daily.submit_btn') || 'Envoyer mon score';
            }
            return;
        }

        const data = res.data;
        if (feedbackEl) {
            feedbackEl.className = 'daily-submit-feedback success';
            feedbackEl.innerText = t('daily.submit_success', { rank: data.rank, total: data.totalPlayers })
                || `Score envoyé ! #${data.rank} sur ${data.totalPlayers} dans le monde.`;
        }
        if (submitBtn) submitBtn.classList.add('hidden');
        if (input) input.classList.add('hidden');
        if (typeof triggerHaptic === 'function') triggerHaptic('success');

        renderDailyLeaderboardPreview();
    });
}

function updateDailyCountdown() {
    const countdownEl = document.getElementById('daily-countdown-val');
    if (!countdownEl) return;

    const now = new Date();
    const nextReset = new Date(now);
    if (now.getUTCHours() >= 5) {
        nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    }
    nextReset.setUTCHours(5, 0, 0, 0);

    const diff = Math.max(0, nextReset.getTime() - now.getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    countdownEl.innerText = `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}
