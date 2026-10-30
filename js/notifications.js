// =========================================================================
// === HISTORIAXE — NOTIFICATIONS LOCALES (rappels de rétention) ===
// =========================================================================
// Levier de rétention n°1 chez les apps type Duolingo (« ta série va se
// briser », « le défi du jour est disponible ») : des rappels programmés
// SUR L'APPAREIL via @capacitor/local-notifications, sans aucun serveur de
// push (voir README pour ce choix). Actif uniquement sur l'app native iOS
// (Capacitor.isNativePlatform()) — il n'existe pas d'API de notification
// programmée fiable côté navigateur sans backend push : sur le web/PWA, ce
// module est un no-op silencieux plutôt qu'une fausse promesse.
//
// Toutes les fonctions sont best-effort (try/catch), à l'image de
// js/apiClient.js : une notification qui échoue à se programmer ne doit
// jamais empêcher de jouer.

var HistoriAxeNotifications = (function () {
    'use strict';

    // Identifiants fixes (entiers 32 bits requis par le plugin) : un
    // reschedule annule d'abord l'ancien id avant d'en reprogrammer un
    // nouveau, ce qui évite les doublons.
    var IDS = {
        STREAK_REMINDER: 1001,
        DAILY_AVAILABLE: 1002,
        WEEKLY_RECAP: 1003,
        STREAK_MILESTONE: 1004
    };
    // Retour après inactivité : un rappel à J+3, un à J+7 (ids 1020, 1021), jamais plus. Chaque ouverture de
    // l'app les reprogramme, donc ils ne partent que si le joueur n'est pas revenu entre-temps.
    var COMEBACK_BASE_ID = 1020;
    var COMEBACK_DAYS = [3, 7];
    // Paliers de série annoncés la veille (« plus qu'un jour pour… »).
    var STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
    // Rappels de duel : ids 2000 à 101999 (voir scheduleDuelNudge).
    var DUEL_ID_MIN = 2000;
    var DUEL_ID_MAX = 102000;
    // Réglage par type (appSettings[...]) : tout est activé tant que le joueur n'a rien décoché.
    var TYPE_SETTING = {
        streak: 'notifStreak',
        daily: 'notifDaily',
        recap: 'notifRecap',
        review: 'notifReview',
        duel: 'notifDuel',
        milestone: 'notifMilestone',
        comeback: 'notifComeback'
    };
    // Rappels « n événements à réviser » : un par jour à venir, ids 1010, 1011, 1012… (voir
    // scheduleReviewReminders). REVIEW_SLOTS doit couvrir l'horizon de SRS.planReminders.
    var REVIEW_BASE_ID = 1010;
    var REVIEW_SLOTS = 3;

    function isSupported() {
        try {
            return !!(
                window.Capacitor &&
                window.Capacitor.isNativePlatform &&
                window.Capacitor.isNativePlatform() &&
                window.Capacitor.Plugins &&
                window.Capacitor.Plugins.LocalNotifications
            );
        } catch (e) {
            return false;
        }
    }

    function plugin() {
        return window.Capacitor.Plugins.LocalNotifications;
    }

    // Réglage utilisateur (voir js/storage.js: DEFAULT_SETTINGS.notifications,
    // modal-settings dans index.html).
    function userEnabled() {
        try {
            return typeof appSettings !== 'undefined' && appSettings && appSettings.notifications !== false;
        } catch (e) {
            return true;
        }
    }

    // Le réglage général ET celui du type de rappel.
    function typeEnabled(type) {
        if (!userEnabled()) return false;
        try {
            return !(typeof appSettings !== 'undefined' && appSettings && appSettings[TYPE_SETTING[type]] === false);
        } catch (e) {
            return true;
        }
    }

    function requestPermission() {
        if (!isSupported()) return Promise.resolve(false);
        return plugin()
            .checkPermissions()
            .then(function (res) {
                if (res && res.display === 'granted') return true;
                return plugin()
                    .requestPermissions()
                    .then(function (r2) {
                        return !!(r2 && r2.display === 'granted');
                    });
            })
            .catch(function () {
                return false;
            });
    }

    function hasPermission() {
        if (!isSupported()) return Promise.resolve(false);
        return plugin()
            .checkPermissions()
            .then(function (res) {
                return !!(res && res.display === 'granted');
            })
            .catch(function () {
                return false;
            });
    }

    function cancel(id) {
        if (!isSupported()) return;
        try {
            plugin().cancel({ notifications: [{ id: id }] });
        } catch (e) {}
    }

    function scheduleOne(notif) {
        if (!isSupported()) return;
        try {
            plugin().schedule({ notifications: [notif] });
        } catch (e) {}
    }

    function hashCode(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    // --- Rappel de série en péril : programmé pour ce soir (~20h heure locale)
    // UNIQUEMENT si le Défi du jour du jour n'a pas encore été joué. Réévalué à
    // chaque reprise de l'app et après chaque enregistrement de série (voir
    // js/storage.js: streakRecordToday, appelé depuis endGame() dans js/app.js).
    function scheduleStreakReminder() {
        cancel(IDS.STREAK_REMINDER);
        if (!isSupported() || !typeEnabled('streak')) return;
        try {
            var streak = typeof getStreakCount === 'function' ? getStreakCount() : 0;
            var streakData = typeof streakLoad === 'function' ? streakLoad() : null;
            var today = typeof getStreakDayString === 'function' ? getStreakDayString() : (typeof getTodayStringUTC === 'function' ? getTodayStringUTC() : null);
            var alreadyPlayedToday = !!(streakData && streakData.lastPlayedDate === today);
            if (alreadyPlayedToday) return;

            var target = new Date();
            target.setHours(20, 0, 0, 0);
            if (target.getTime() <= Date.now()) return; // Trop tard pour ce soir : le prochain refresh reprogrammera pour demain.

            var tFn = (typeof t === 'function') ? t : function (key) { return key; };
            var body = streak > 0
                ? tFn('notifications.streak_body', { days: streak })
                : tFn('notifications.streak_reminder_fallback');
            scheduleOne({
                id: IDS.STREAK_REMINDER,
                title: tFn('notifications.streak_title'),
                body: body,
                schedule: { at: target }
            });
        } catch (e) {}
    }

    // --- Défi du jour disponible : rappel quotidien répété (~9h heure locale).
    function scheduleDailyAvailable() {
        cancel(IDS.DAILY_AVAILABLE);
        if (!isSupported() || !typeEnabled('daily')) return;
        try {
            var tFn = (typeof t === 'function') ? t : function (key) { return key; };
            scheduleOne({
                id: IDS.DAILY_AVAILABLE,
                title: tFn('notifications.daily_title'),
                body: tFn('notifications.daily_body'),
                schedule: { on: { hour: 9, minute: 0 }, repeats: true }
            });
        } catch (e) {}
    }

    // --- Récap hebdomadaire prêt : rappel hebdo répété (dimanche ~19h — voir
    // js/recap.js pour le contenu réel du récap). Capacitor numérote les jours de 1 (dimanche) à 7 (samedi).
    function scheduleWeeklyRecap() {
        cancel(IDS.WEEKLY_RECAP);
        if (!isSupported() || !typeEnabled('recap')) return;
        try {
            var tFn = (typeof t === 'function') ? t : function (key) { return key; };
            scheduleOne({
                id: IDS.WEEKLY_RECAP,
                title: tFn('notifications.recap_title'),
                body: tFn('notifications.recap_body'),
                schedule: { on: { weekday: 1, hour: 19, minute: 0 }, repeats: true }
            });
        } catch (e) {}
    }

    // --- Révisions à faire : « n événements à réviser » (js/srs.js: planReminders), ~18 h 30, pour
    // chacun des prochains jours où assez d'événements arrivent à échéance. Reprogrammé à chaque
    // reprise de l'app et fin de partie : le compte annoncé suit ce que le joueur a réellement fait.
    function cancelReviewReminders() {
        for (var i = 0; i < REVIEW_SLOTS; i++) cancel(REVIEW_BASE_ID + i);
    }

    function scheduleReviewReminders() {
        cancelReviewReminders();
        if (!isSupported() || !typeEnabled('review')) return;
        try {
            if (typeof SRS === 'undefined' || typeof getSrsEntries !== 'function') return;
            var plan = SRS.planReminders(getSrsEntries(), Date.now());
            var tFn = (typeof t === 'function') ? t : function (key) { return key; };
            plan.slice(0, REVIEW_SLOTS).forEach(function (item, i) {
                scheduleOne({
                    id: REVIEW_BASE_ID + i,
                    title: tFn('notifications.review_title'),
                    body: tFn('notifications.review_body', { count: item.count }),
                    schedule: { at: item.at }
                });
            });
        } catch (e) {}
    }

    // --- Nudge duel : rappel ponctuel +24h après la création d'un duel (voir
    // js/apiClient.js: createDuel). Volontairement approximatif — sans push
    // serveur, impossible de confirmer en temps réel que l'adversaire a joué ;
    // ce rappel se contente d'inciter à revenir ouvrir l'app pour vérifier.
    function scheduleDuelNudge(duelId) {
        if (!isSupported() || !typeEnabled('duel') || !duelId) return;
        try {
            var id = DUEL_ID_MIN + (hashCode(String(duelId)) % (DUEL_ID_MAX - DUEL_ID_MIN));
            var target = new Date(Date.now() + 24 * 3600 * 1000);
            var tFn = (typeof t === 'function') ? t : function (key) { return key; };
            scheduleOne({
                id: id,
                title: tFn('notifications.duel_title'),
                body: tFn('notifications.duel_body'),
                schedule: { at: target }
            });
        } catch (e) {}
    }

    // Prochain jour, à l'heure donnée (heure locale de l'appareil).
    function dayAt(daysFromNow, hour) {
        var d = new Date();
        d.setDate(d.getDate() + daysFromNow);
        d.setHours(hour, 0, 0, 0);
        return d;
    }

    // --- Palier de série : la veille, si la série est à un jour d'un palier ET que le joueur a déjà joué
    // aujourd'hui (sinon c'est le rappel de série en péril qui parle). Demain midi.
    function scheduleStreakMilestone() {
        cancel(IDS.STREAK_MILESTONE);
        if (!isSupported() || !typeEnabled('milestone')) return;
        try {
            var streakData = typeof streakLoad === 'function' ? streakLoad() : null;
            var today = typeof getStreakDayString === 'function' ? getStreakDayString() : (typeof getTodayStringUTC === 'function' ? getTodayStringUTC() : null);
            if (!streakData || streakData.lastPlayedDate !== today) return;
            var streak = typeof getStreakCount === 'function' ? getStreakCount() : 0;
            var goal = 0;
            for (var i = 0; i < STREAK_MILESTONES.length; i++) {
                if (STREAK_MILESTONES[i] - streak === 1) goal = STREAK_MILESTONES[i];
            }
            if (!goal) return;
            var tFn = (typeof t === 'function') ? t : function (key) { return key; };
            scheduleOne({
                id: IDS.STREAK_MILESTONE,
                title: tFn('notifications.milestone_title', { goal: goal }),
                body: tFn('notifications.milestone_body', { goal: goal }),
                schedule: { at: dayAt(1, 12) }
            });
        } catch (e) {}
    }

    // --- Retour après inactivité : J+3 et J+7 à 18 h, puis plus rien.
    function cancelComeback() {
        for (var i = 0; i < COMEBACK_DAYS.length; i++) cancel(COMEBACK_BASE_ID + i);
    }

    function scheduleComeback() {
        cancelComeback();
        if (!isSupported() || !typeEnabled('comeback')) return;
        try {
            var tFn = (typeof t === 'function') ? t : function (key) { return key; };
            COMEBACK_DAYS.forEach(function (days, i) {
                scheduleOne({
                    id: COMEBACK_BASE_ID + i,
                    title: tFn('notifications.comeback' + days + '_title'),
                    body: tFn('notifications.comeback' + days + '_body'),
                    schedule: { at: dayAt(days, 18) }
                });
            });
        } catch (e) {}
    }

    // Annule les rappels de duel déjà programmés (leurs ids dépendent du duel : on les relit auprès du plugin).
    function cancelDuelNudges() {
        if (!isSupported()) return;
        try {
            plugin().getPending().then(function (res) {
                var ids = ((res && res.notifications) || [])
                    .filter(function (n) { return n.id >= DUEL_ID_MIN && n.id < DUEL_ID_MAX; })
                    .map(function (n) { return { id: n.id }; });
                if (ids.length) plugin().cancel({ notifications: ids });
            }).catch(function () {});
        } catch (e) {}
    }

    // Programme chaque type selon les réglages ; un type décoché est annulé. Les rappels de duel sont
    // ponctuels (programmés à la création du duel) : ici on ne fait qu'annuler s'ils sont décochés.
    function scheduleAll() {
        scheduleStreakReminder();
        scheduleDailyAvailable();
        scheduleWeeklyRecap();
        scheduleReviewReminders();
        scheduleStreakMilestone();
        scheduleComeback();
        if (!typeEnabled('duel')) cancelDuelNudges();
    }

    // --- Point d'entrée global : reprogramme tous les rappels récurrents à
    // partir de l'état actuel (série, réglage utilisateur). Appelé au
    // démarrage de l'app et à chaque retour au premier plan (voir js/app.js:
    // window.onload, Capacitor App.addListener('appStateChange')). N'a d'effet
    // que si la permission a déjà été accordée — elle n'est jamais demandée ici.
    function refreshAll() {
        if (!isSupported()) return;
        if (!userEnabled()) {
            cancelAll();
            return;
        }
        hasPermission().then(function (granted) {
            if (granted) scheduleAll();
        });
    }

    // Activation initiale : demande la permission puis programme tout. Appelé
    // après la première partie terminée (voir js/app.js: endGame) ou quand
    // l'utilisateur active le réglage manuellement (voir modal-settings).
    function enableAndSchedule() {
        if (!isSupported()) return Promise.resolve(false);
        return requestPermission().then(function (granted) {
            if (granted) scheduleAll();
            return granted;
        });
    }

    // Après la première partie terminée : une seule fois, une fenêtre explique à quoi servent les rappels
    // avant la demande système d'iOS (qui n'accepte pas de texte personnalisé). Un refus n'est jamais
    // redemandé. Si la permission a déjà été tranchée, on se contente de reprogrammer.
    function askAfterFirstGame() {
        if (!isSupported() || !userEnabled()) return;
        var alreadyAsked = !!(typeof appSettings !== 'undefined' && appSettings && appSettings.notifPromptShown);
        if (alreadyAsked || typeof showConfirm !== 'function') { refreshAll(); return; }
        plugin().checkPermissions().then(function (res) {
            if (!res || res.display !== 'prompt') { refreshAll(); return; }
            appSettings.notifPromptShown = true;
            if (typeof settingsSave === 'function') settingsSave(appSettings);
            var tFn = (typeof t === 'function') ? t : function (key) { return key; };
            // Laisse l'écran de fin de partie s'afficher avant d'ouvrir la fenêtre.
            setTimeout(function () {
                showConfirm(tFn('notifications.ask_body'), function () { enableAndSchedule(); },
                    { okLabel: tFn('notifications.ask_ok') });
            }, 1500);
        }).catch(function () {});
    }

    function cancelAll() {
        cancel(IDS.STREAK_REMINDER);
        cancel(IDS.DAILY_AVAILABLE);
        cancel(IDS.WEEKLY_RECAP);
        cancelReviewReminders();
        cancel(IDS.STREAK_MILESTONE);
        cancelComeback();
        cancelDuelNudges();
    }

    return {
        isSupported: isSupported,
        requestPermission: requestPermission,
        enableAndSchedule: enableAndSchedule,
        askAfterFirstGame: askAfterFirstGame,
        refreshAll: refreshAll,
        scheduleAll: scheduleAll,
        scheduleStreakReminder: scheduleStreakReminder,
        scheduleReviewReminders: scheduleReviewReminders,
        scheduleDuelNudge: scheduleDuelNudge,
        cancelAll: cancelAll
    };
})();
