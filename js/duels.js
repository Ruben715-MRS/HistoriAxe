// =========================================================================
// === HISTORIAXE — DUELS ASYNCHRONES ENTRE AMIS (voir api/duels.js) ===
// =========================================================================
// Pas de liste d'amis ni de compte : juste un lien/code court à partager
// (SMS, messagerie...), qui pointe vers le score du créateur sur le Défi du
// jour d'une date donnée (voir js/daily.js pour ce Défi). Choix acté avec
// l'utilisateur : pas d'infrastructure de push serveur (APNs), donc pas de
// notification temps réel quand l'adversaire joue — seulement une
// vérification au mieux à l'ouverture de l'app (checkMyDuels ci-dessous),
// complétée par un rappel local approximatif (js/notifications.js:
// scheduleDuelNudge).

var pendingDuelContext = null; // Rempli si l'app est ouverte via un lien ?duel=xxx (voir checkIncomingDuelLink)

function buildDuelShareUrl(duelId) {
    const base = (typeof HistoriAxeAPI !== 'undefined' && HistoriAxeAPI.getApiBase()) || window.location.origin;
    return base.replace(/\/$/, '') + '/?duel=' + encodeURIComponent(duelId);
}

// Bouton « Défier un ami » de modal-daily-results (voir index.html), proposé
// après avoir terminé le Défi du jour.
function challengeFriendToDuel() {
    if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) {
        if (typeof showToast === 'function') showToast(t('duels.requires_connection'), 2500);
        return;
    }
    const btn = document.getElementById('btn-daily-challenge-friend');
    if (btn) { btn.disabled = true; btn.innerText = t('duels.creating'); }

    const deviceId = getOrCreateDeviceId();
    const pseudo = (typeof pseudoLoad === 'function' ? pseudoLoad() : '') || 'Anonyme';

    HistoriAxeAPI.createDuel(deviceId, pseudo, currentDailyLang(), getDailySeedString()).then(res => {
        if (btn) { btn.disabled = false; btn.innerText = t('duels.title_btn'); }
        if (!res.ok || !res.data) {
            if (typeof showToast === 'function') showToast(t('duels.create_error'), 2500);
            return;
        }

        const url = buildDuelShareUrl(res.data.id);
        const text = t('duels.share_text', { url });

        if (navigator.share) {
            navigator.share({ text: text, url: url }).catch(() => {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                if (typeof showToast === 'function') showToast(t('duels.link_copied'), 2500);
            }).catch(() => {});
        }

        if (typeof HistoriAxeNotifications !== 'undefined') {
            HistoriAxeNotifications.scheduleDuelNudge(res.data.id);
        }
    });
}

// Lecture du paramètre ?duel=xxx au lancement (voir js/app.js: window.onload).
function checkIncomingDuelLink() {
    try {
        const params = new URLSearchParams(window.location.search);
        const duelId = params.get('duel');
        if (!duelId) return;

        // Nettoie l'URL tout de suite : évite de re-déclencher la bannière à
        // chaque rechargement/reprise de l'app sur cette même page.
        try { window.history.replaceState({}, '', window.location.pathname); } catch (e) {}

        if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) return;

        const deviceId = getOrCreateDeviceId();
        HistoriAxeAPI.getDuel(duelId, deviceId).then(res => {
            if (!res.ok || !res.data) return;
            pendingDuelContext = {
                id: duelId,
                creatorPseudo: res.data.creatorPseudo,
                creatorScore: res.data.creatorScore
            };
            if (typeof showToast === 'function') {
                const scoreTxt = res.data.creatorScore ? t('duels.incoming_score_suffix', { score: res.data.creatorScore.score }) : '';
                showToast(t('duels.incoming_toast', { name: escapeHtml(res.data.creatorPseudo), scoreTxt }), 4500);
            }
        });
    } catch (e) {}
}

// Affiche la comparaison dans modal-daily-results si la partie qui vient
// d'être jouée répond à un duel entrant (voir js/daily.js: openDailyResultsModal,
// qui appelle cette fonction juste avant d'afficher la modale).
function renderDuelComparisonIfPending() {
    const container = document.getElementById('daily-duel-comparison');
    if (!container) return;

    if (!pendingDuelContext || !pendingDuelContext.creatorScore || typeof score === 'undefined') {
        container.classList.add('hidden');
        return;
    }

    const myScore = Math.round(score);
    const theirScore = pendingDuelContext.creatorScore.score;
    const name = escapeHtml(pendingDuelContext.creatorPseudo);
    let verdict;
    if (myScore > theirScore) verdict = t('duels.win', { name, score: theirScore });
    else if (myScore < theirScore) verdict = t('duels.lose', { name, score: theirScore });
    else verdict = t('duels.draw', { name });

    container.innerText = verdict;
    container.classList.remove('hidden');

    // Le duel entrant ne compare qu'une seule partie : on l'efface pour ne
    // pas ré-afficher cette comparaison sur une éventuelle partie suivante.
    pendingDuelContext = null;
}

// Vérifie si un adversaire a dépassé un de mes duels — appelé au démarrage de
// l'app (voir js/app.js: window.onload), best-effort.
function checkMyDuels() {
    if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) return;
    try {
        const deviceId = getOrCreateDeviceId();
        HistoriAxeAPI.getMyDuels(deviceId).then(res => {
            if (!res.ok || !res.data || !Array.isArray(res.data.duels)) return;
            res.data.duels.forEach(d => {
                if (typeof showToast === 'function') {
                    showToast(t('duels.overtaken_toast', { name: escapeHtml(d.opponentPseudo), date: d.challengeDate, score: d.opponentScore }), 5000);
                }
                HistoriAxeAPI.ackDuel(d.id, deviceId);
            });
        });
    } catch (e) {}
}
