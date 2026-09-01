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
            <span class="leaderboard-pseudo">${escapeHtml(entry.pseudo)}${isMe ? ' <em>(vous)</em>' : ''}</span>
            <span class="leaderboard-score">${entry.xp} XP</span>
        </div>
    `;
}

function renderLeagueModal() {
    const myXpEl = document.getElementById('league-my-xp');
    if (myXpEl) myXpEl.innerText = weeklyXpLoad().xp;

    const container = document.getElementById('league-list-container');
    if (!container) return;

    if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) {
        container.innerHTML = `<div class="daily-leaderboard-empty">Ligue indisponible hors connexion.</div>`;
        return;
    }

    container.innerHTML = `<div class="daily-leaderboard-empty">Chargement…</div>`;

    const deviceId = getOrCreateDeviceId();
    HistoriAxeAPI.getWeeklyLeague({
        isoWeek: getIsoWeekString(),
        deviceId: deviceId,
        limit: 30
    }).then(res => {
        if (!res.ok) {
            container.innerHTML = `<div class="daily-leaderboard-empty">Ligue momentanément indisponible.</div>`;
            return;
        }
        const entries = res.data.entries || [];
        if (entries.length === 0) {
            container.innerHTML = `<div class="daily-leaderboard-empty">Personne dans ta ligue pour l’instant cette semaine — sois le premier à marquer des points !</div>`;
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

// Pousse le total d'XP hebdo local vers le backend (best-effort, comme
// syncPushProgress dans js/app.js). Appelé en fin de partie — throttle
// volontaire : pas un appel réseau à chaque awardXP() (voir
// js/gamification.js: weeklyXpAdd, purement local).
function pushWeeklyLeagueXp() {
    if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) return;
    try {
        const deviceId = getOrCreateDeviceId();
        const pseudo = (typeof pseudoLoad === 'function' ? pseudoLoad() : '') || null;
        const weekly = weeklyXpLoad();
        if (weekly.xp <= 0) return;
        HistoriAxeAPI.submitWeeklyXp(deviceId, pseudo, weekly.isoWeek, weekly.xp);
    } catch (e) {}
}
