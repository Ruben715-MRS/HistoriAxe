// =========================================================================
// === HISTORIAXE — MODULE DÉFI DU JOUR (DAILY CHALLENGE & LEADERBOARD) ===
// =========================================================================

function getDailySeedString() {
    const now = new Date();
    const adjusted = new Date(now.getTime() - 5 * 3600 * 1000);
    const year = adjusted.getUTCFullYear();
    const month = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
    const day = String(adjusted.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function mulberry32(seed) {
    return function() {
        var t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashStringToSeed(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash) || 123456789;
}

// Siècle numérique signé (ex : 1789 → 18, -450 → -5), pour regrouper les
// événements du tirage quotidien et éviter une frise concentrée sur une
// seule période (voir generateDailyEvents ci-dessous).
function getCenturyKey(year) {
    if (year == null) return 0;
    if (year < 0) return -Math.ceil(Math.abs(year) / 100);
    return Math.ceil((year === 0 ? 1 : year) / 100);
}

// Tire les 10 événements du Défi du jour : mélange déterministe de toute la
// base (graine = date du jour, identique pour tous les joueurs), avec leur
// emplacement complet dans l'arbre bdd (attendu par startDailyChallenge),
// puis sélection gloutonne qui refuse tout événement dépassant 2
// représentants du même siècle, pour éviter un tirage trop concentré.
function generateDailyEvents() {
    const allWithLocation = (typeof getAllEventsWithLocation === 'function') ? getAllEventsWithLocation() : [];
    if (allWithLocation.length === 0) return [];

    const seedStr = getDailySeedString();
    const seed = hashStringToSeed('historiaxe_daily_' + seedStr);
    const rng = mulberry32(seed);

    const shuffled = [...allWithLocation];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const MAX_PER_CENTURY = 2;
    const picked = [];
    const centuryCounts = {};

    shuffled.forEach(item => {
        if (picked.length >= 10) return;
        const century = getCenturyKey(item.event.date);
        const count = centuryCounts[century] || 0;
        if (count >= MAX_PER_CENTURY) return;
        picked.push(item);
        centuryCounts[century] = count + 1;
    });

    // Filet de sécurité : si le lissage strict laisse moins de 10 événements,
    // on complète avec le reste du tirage mélangé plutôt que de renvoyer un
    // défi incomplet.
    if (picked.length < 10) {
        for (const item of shuffled) {
            if (picked.length >= 10) break;
            if (picked.indexOf(item) === -1) picked.push(item);
        }
    }

    return picked;
}

function getDeterministicDailyEvents(allEvents, count = 10) {
    if (!allEvents || allEvents.length === 0) return [];
    const seedStr = getDailySeedString();
    const seed = hashStringToSeed('historiaxe_daily_' + seedStr);
    const rng = mulberry32(seed);

    const richPool = allEvents.filter(e => e.description && e.description.length > 20);
    const poolToUse = richPool.length >= count * 2 ? richPool : allEvents;

    const copy = [...poolToUse];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const temp = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
    }

    return copy.slice(0, Math.min(count, copy.length));
}

function dailyLeaderboardLoad() {
    const today = getDailySeedString();
    try {
        const data = JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || {};
        if (data.date === today && Array.isArray(data.entries)) {
            return data;
        }
        return { date: today, entries: [] };
    } catch (e) {
        return { date: today, entries: [] };
    }
}

function dailyLeaderboardSave(data) {
    try {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(data));
    } catch (e) {}
}

function dailyLeaderboardAdd(pseudo, score, time) {
    const lb = dailyLeaderboardLoad();
    lb.entries.push({
        pseudo: (pseudo || 'Anonyme').trim().slice(0, 20),
        score: Math.round(score) || 0,
        time: (typeof time === 'number') ? parseFloat(time.toFixed(1)) : 0,
        timestamp: Date.now()
    });

    lb.entries.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.time - b.time;
    });

    dailyLeaderboardSave(lb);
    return lb;
}

function openDailyResultsModal(isWin) {
    const modal = document.getElementById('modal-daily-results');
    if (!modal) return;

    const titleEl = document.getElementById('daily-results-title');
    const scoreEl = document.getElementById('daily-final-score');
    const timeEl = document.getElementById('daily-final-time');
    const streakEl = document.getElementById('daily-streak-count');
    const streakBanner = document.getElementById('daily-streak-banner');

    if (titleEl) titleEl.innerText = isWin ? (t('daily.title_win') || '🌍 Défi du jour relevé !') : (t('daily.title_over') || '🌍 Défi du jour terminé');
    if (scoreEl) scoreEl.innerText = Math.round(score);
    if (timeEl) timeEl.innerText = `${totalTimePlayed.toFixed(1)}s`;

    const streakCount = getStreakCount();
    if (streakEl) streakEl.innerText = `${streakCount} j`;
    if (streakBanner) {
        if (streakCount > 0) streakBanner.classList.remove('hidden');
        else streakBanner.classList.add('hidden');
    }

    const anecdoteContainer = document.getElementById('daily-anecdote-container');
    if (anecdoteContainer && typeof pickSessionAnecdote === 'function' && typeof renderAnecdoteCard === 'function') {
        const anecdoteEvt = pickSessionAnecdote(sessionHistory);
        renderAnecdoteCard(anecdoteContainer, anecdoteEvt);
    }

    renderDailyLeaderboardUI();
    updateDailyCountdown();
    modal.classList.remove('hidden');
}

function closeDailyResultsModal() {
    const modal = document.getElementById('modal-daily-results');
    if (modal) modal.classList.add('hidden');
    showScreen('screen-categories');
}

function renderDailyLeaderboardUI() {
    const lb = dailyLeaderboardLoad();
    const container = document.getElementById('daily-leaderboard-list');
    if (!container) return;
    container.innerHTML = '';

    if (lb.entries.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:16px; color:var(--muted-text); font-size:13px;">${t('daily.leaderboard_empty') || 'Aucun score pour l’instant.'}</div>`;
        return;
    }

    lb.entries.slice(0, 10).forEach((entry, idx) => {
        const rank = idx + 1;
        const row = document.createElement('div');
        row.className = 'leaderboard-row';
        let medal = `#${rank}`;
        if (rank === 1) medal = '🥇';
        else if (rank === 2) medal = '🥈';
        else if (rank === 3) medal = '🥉';

        row.innerHTML = `
            <span class="leaderboard-rank">${medal}</span>
            <span class="leaderboard-pseudo">${escapeHtml(entry.pseudo)}</span>
            <span class="leaderboard-score">${entry.score} pts</span>
            <span class="leaderboard-time">${entry.time}s</span>
        `;
        container.appendChild(row);
    });
}

function submitDailyScore() {
    const input = document.getElementById('daily-pseudo-input');
    const msgEl = document.getElementById('daily-submit-msg');
    const btn = document.getElementById('btn-submit-daily');
    if (!input || !msgEl || !btn) return;

    const pseudo = input.value.trim();
    if (!pseudo) {
        input.focus();
        return;
    }

    btn.disabled = true;
    btn.innerText = t('daily.submit_loading') || 'Envoi…';

    setTimeout(() => {
        const lb = dailyLeaderboardAdd(pseudo, score, totalTimePlayed);
        const myRank = lb.entries.findIndex(e => e.pseudo === pseudo && e.score === Math.round(score)) + 1;
        
        btn.classList.add('hidden');
        input.classList.add('hidden');
        msgEl.className = 'daily-submit-success';
        msgEl.innerText = t('daily.submit_success', { rank: myRank, total: lb.entries.length }) || `Score envoyé ! #${myRank} sur ${lb.entries.length}.`;
        
        renderDailyLeaderboardUI();
        triggerHaptic('success');
    }, 450);
}

function updateDailyCountdown() {
    const countdownEl = document.getElementById('daily-next-countdown');
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
