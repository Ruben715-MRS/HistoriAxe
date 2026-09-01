// =========================================================================
// === HISTORIAXE — RÉCAP HEBDOMADAIRE / MENSUEL ===
// =========================================================================
// Renforce le sentiment de progression (« Cette semaine : 4 défis relevés,
// 230 XP, 12 thèmes maîtrisés ») à partir du journal compact tenu par
// js/storage.js (recapLogLoad/addRecapLogEntry), lui-même alimenté par
// js/app.js: endGame() à chaque partie non-Découverte terminée. Entièrement
// local, aucun backend nécessaire.

var currentRecapPeriod = 'week';

// Regroupe recapLogLoad() par semaine ISO ou par mois calendaire, puis
// additionne xp/themesWon/jours actifs pour la période demandée et la
// précédente (pour le delta affiché).
function aggregateRecapLog(keyOfEntry, currentKey, previousKey) {
    const log = (typeof recapLogLoad === 'function') ? recapLogLoad() : [];
    const current = { xp: 0, themesWon: 0, daysPlayed: 0 };
    const previous = { xp: 0, themesWon: 0, daysPlayed: 0 };
    let hasPreviousData = false;

    log.forEach(entry => {
        const key = keyOfEntry(entry);
        const bucket = key === currentKey ? current : (key === previousKey ? previous : null);
        if (!bucket) return;
        bucket.xp += entry.xp || 0;
        bucket.themesWon += entry.themesWon || 0;
        if ((entry.xp || 0) > 0 || (entry.themesWon || 0) > 0) bucket.daysPlayed += 1;
        if (bucket === previous) hasPreviousData = true;
    });

    const xpDeltaPct = hasPreviousData && previous.xp > 0
        ? Math.round(((current.xp - previous.xp) / previous.xp) * 100)
        : null;

    return {
        xp: current.xp,
        themesWon: current.themesWon,
        daysPlayed: current.daysPlayed,
        xpDeltaPct: xpDeltaPct,
        streak: (typeof getStreakCount === 'function') ? getStreakCount() : 0
    };
}

function computeWeeklyRecap() {
    const currentWeek = getIsoWeekString();
    const previousWeek = getIsoWeekString(new Date(Date.now() - 7 * 24 * 3600 * 1000));
    const result = aggregateRecapLog(
        entry => getIsoWeekString(new Date(entry.date + 'T00:00:00')),
        currentWeek,
        previousWeek
    );
    result.period = 'week';
    return result;
}

function computeMonthlyRecap() {
    const now = new Date();
    const currentMonth = getLocalDateString(now).slice(0, 7);
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = getLocalDateString(prevMonthDate).slice(0, 7);
    const result = aggregateRecapLog(entry => entry.date.slice(0, 7), currentMonth, previousMonth);
    result.period = 'month';
    return result;
}

function computeRecap(period) {
    return period === 'month' ? computeMonthlyRecap() : computeWeeklyRecap();
}

function openRecapModal() {
    if (typeof triggerHaptic === 'function') triggerHaptic('light');
    currentRecapPeriod = 'week';
    renderRecapModal();
    const modal = document.getElementById('modal-recap');
    if (modal) modal.classList.remove('hidden');
    markRecapShownThisWeek();
}

function closeRecapModal() {
    const modal = document.getElementById('modal-recap');
    if (modal) modal.classList.add('hidden');
}

function renderRecapModal() {
    document.querySelectorAll('#recap-period-tabs button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === currentRecapPeriod);
    });

    const recap = computeRecap(currentRecapPeriod);
    const isMonth = currentRecapPeriod === 'month';

    const titleEl = document.getElementById('recap-title');
    if (titleEl) titleEl.innerText = isMonth ? '📊 Ton récap du mois' : '📊 Ton récap de la semaine';

    const xpEl = document.getElementById('recap-stat-xp');
    const themesEl = document.getElementById('recap-stat-themes');
    const daysEl = document.getElementById('recap-stat-days');
    const streakEl = document.getElementById('recap-stat-streak');
    const deltaEl = document.getElementById('recap-delta');

    if (xpEl) xpEl.innerText = recap.xp;
    if (themesEl) themesEl.innerText = recap.themesWon;
    if (daysEl) daysEl.innerText = recap.daysPlayed;
    if (streakEl) streakEl.innerText = `${recap.streak} 🔥`;

    if (deltaEl) {
        const prevLabel = isMonth ? 'le mois dernier' : 'la semaine dernière';
        if (recap.daysPlayed === 0) {
            deltaEl.innerText = isMonth
                ? 'Aucune activité ce mois-ci pour l’instant — le Défi du jour t’attend !'
                : 'Aucune activité cette semaine pour l’instant — le Défi du jour t’attend !';
        } else if (recap.xpDeltaPct === null) {
            deltaEl.innerText = `Premi${isMonth ? 'er mois' : 'ère semaine'} suivi${isMonth ? '' : 'e'} — reviens la prochaine fois pour voir ta progression !`;
        } else if (recap.xpDeltaPct >= 0) {
            deltaEl.innerText = `📈 +${recap.xpDeltaPct}% d'XP par rapport à ${prevLabel} !`;
        } else {
            deltaEl.innerText = `📉 ${recap.xpDeltaPct}% d'XP par rapport à ${prevLabel}.`;
        }
    }
}

function initRecapControls() {
    document.querySelectorAll('#recap-period-tabs button').forEach(btn => {
        btn.onclick = () => {
            currentRecapPeriod = btn.dataset.value;
            renderRecapModal();
        };
    });
}

// Réutilise le pattern de partage texte déjà en place pour le Défi du jour
// (voir js/app.js: shareGameResults) : navigator.share si disponible, sinon
// copie presse-papiers.
function shareRecapResults() {
    const recap = computeRecap(currentRecapPeriod);
    const periodLabel = currentRecapPeriod === 'month' ? 'Ce mois-ci' : 'Cette semaine';
    const text = `📊 HistoriAxe — ${periodLabel} : ${recap.xp} XP, ${recap.themesWon} partie(s) gagnée(s), ${recap.daysPlayed} jour(s) actif(s) !`;

    if (navigator.share) {
        navigator.share({ text: text }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            if (typeof showToast === 'function') showToast('Récap copié dans le presse-papiers !', 2500);
        }).catch(() => {});
    }
}

// --- Déclenchement automatique (une fois par semaine ISO, à l'ouverture de
// l'app) : voir js/app.js: window.onload → maybeShowAutoRecap(). ---
const RECAP_LAST_SHOWN_KEY = 'historiaxe_last_recap_shown_v1';

function markRecapShownThisWeek() {
    try { localStorage.setItem(RECAP_LAST_SHOWN_KEY, getIsoWeekString()); } catch (e) {}
}

function maybeShowAutoRecap() {
    try {
        const lastShown = localStorage.getItem(RECAP_LAST_SHOWN_KEY);
        const currentWeek = getIsoWeekString();
        if (lastShown === currentWeek) return; // Déjà montré cette semaine (manuellement ou automatiquement).

        // Rien à montrer pour un tout premier lancement : pas encore de
        // progression, et on ne veut pas superposer deux flux d'aide/pop-up
        // (voir js/onboarding.js) dès la première ouverture.
        const log = (typeof recapLogLoad === 'function') ? recapLogLoad() : [];
        if (log.length === 0) { markRecapShownThisWeek(); return; }
        if (typeof Onboarding !== 'undefined' && !Onboarding.isDone()) return;

        openRecapModal();
    } catch (e) {}
}
