// =========================================================================
// === HISTORIAXE — LIGUE HEBDOMADAIRE (voir api/league.js) ===
// =========================================================================
// Transforme le classement mondial (statique, voir js/daily.js) en boucle de
// rétention hebdomadaire récurrente : un groupe d'une trentaine de joueurs,
// classé par XP gagné cette semaine, qui se réinitialise chaque lundi. Pas de
// vraie table de cohortes ni de paliers façon Bronze/Argent persistés — voir
// le commentaire en tête d'api/league.js pour le choix assumé.

function openLeagueModal() {
    if (typeof triggerHaptic === 'function') triggerHaptic('light');
    const modal = document.getElementById('modal-league');
    if (modal) modal.classList.remove('hidden');
    renderLeagueModal();
}

function closeLeagueModal() {
    const modal = document.getElementById('modal-league');
    if (modal) modal.classList.add('hidden');
}

function renderLeagueRow(entry, isMe) {
    let medal = '#' + entry.rank;
    if (entry.rank === 1) medal = '🥇';
    else if (entry.rank === 2) medal = '🥈';
    else if (entry.rank === 3) medal = '🥉';
    return `
        <div class="leaderboard-row${isMe ? ' leaderboard-row-me' : ''}">
            <span class="leaderboard-rank">${medal}</span>
            <span class="leaderboard-pseudo">${escapeHtml(entry.pseudo)}${isMe ? ' <em>' + t('league.you_suffix') + '</em>' : ''}</span>
            <span class="leaderboard-score">${entry.xp} XP</span>
        </div>
    `;
}

function renderLeagueModal() {
    // XP de la ligue = celui des défis que le serveur a rejoués (voir
    // api/league.js) ; il s'affiche une fois la réponse reçue.
    const hintEl = document.getElementById('league-week-hint');
    const setHintXp = (xp) => {
        if (hintEl) hintEl.innerHTML = t('league.week_hint', { xp: `<strong id="league-my-xp">${xp}</strong>` });
    };
    setHintXp('–');

    const container = document.getElementById('league-list-container');
    if (!container) return;

    if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) {
        container.innerHTML = `<div class="daily-leaderboard-empty">${t('league.offline')}</div>`;
        return;
    }

    container.innerHTML = `<div class="daily-leaderboard-empty">${t('league.loading')}</div>`;

    const deviceId = getOrCreateDeviceId();
    HistoriAxeAPI.getWeeklyLeague({
        isoWeek: getIsoWeekString(),
        deviceId: deviceId,
        limit: 30
    }).then(res => {
        if (!res.ok) {
            container.innerHTML = `<div class="daily-leaderboard-empty">${t('league.error')}</div>`;
            return;
        }
        setHintXp(res.data.me ? res.data.me.xp : 0);
        const entries = res.data.entries || [];
        if (entries.length === 0) {
            container.innerHTML = `<div class="daily-leaderboard-empty">${t('league.empty')}</div>`;
            return;
        }
        let html = entries.map(entry => renderLeagueRow(entry, false)).join('');
        const me = res.data.me;
        if (me && !entries.some(e => e.rank === me.rank)) {
            html += renderLeagueRow(me, true);
        }
        container.innerHTML = html;
    });
}
