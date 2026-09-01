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
        WEEKLY_RECAP: 1003
    };

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
        if (!isSupported() || !userEnabled()) return;
        try {
            var streak = typeof getStreakCount === 'function' ? getStreakCount() : 0;
            var streakData = typeof streakLoad === 'function' ? streakLoad() : null;
            var today = typeof getTodayStringUTC === 'function' ? getTodayStringUTC() : null;
            var alreadyPlayedToday = !!(streakData && streakData.lastPlayedDate === today);
            if (alreadyPlayedToday) return;

            var target = new Date();
            target.setHours(20, 0, 0, 0);
            if (target.getTime() <= Date.now()) return; // Trop tard pour ce soir : le prochain refresh reprogrammera pour demain.

            var body = streak > 0
                ? 'Ta série de ' + streak + ' jour' + (streak > 1 ? 's' : '') + ' va se briser ce soir. Relève le Défi du jour pour la garder !'
                : 'Le Défi du jour t’attend : 2 minutes pour lancer ta série 🔥.';
            scheduleOne({
                id: IDS.STREAK_REMINDER,
                title: '🔥 Ta série est en péril',
                body: body,
                schedule: { at: target }
            });
        } catch (e) {}
    }

    // --- Défi du jour disponible : rappel quotidien répété (~9h heure locale).
    function scheduleDailyAvailable() {
        cancel(IDS.DAILY_AVAILABLE);
        if (!isSupported() || !userEnabled()) return;
        try {
            scheduleOne({
                id: IDS.DAILY_AVAILABLE,
                title: '🌍 Le Défi du jour est disponible',
                body: 'Dix événements à replacer dans l’ordre chronologique. À toi de jouer !',
                schedule: { on: { hour: 9, minute: 0 }, repeats: true }
            });
        } catch (e) {}
    }

    // --- Récap hebdomadaire prêt : rappel hebdo répété (lundi ~19h — voir
    // js/recap.js pour le contenu réel du récap).
    function scheduleWeeklyRecap() {
        cancel(IDS.WEEKLY_RECAP);
        if (!isSupported() || !userEnabled()) return;
        try {
            scheduleOne({
                id: IDS.WEEKLY_RECAP,
                title: '📊 Ton récap de la semaine est prêt',
                body: 'Découvre ton XP gagné, tes défis relevés et tes thèmes maîtrisés cette semaine.',
                schedule: { on: { weekday: 2, hour: 19, minute: 0 }, repeats: true }
            });
        } catch (e) {}
    }

    // --- Nudge duel : rappel ponctuel +24h après la création d'un duel (voir
    // js/apiClient.js: createDuel). Volontairement approximatif — sans push
    // serveur, impossible de confirmer en temps réel que l'adversaire a joué ;
    // ce rappel se contente d'inciter à revenir ouvrir l'app pour vérifier.
    function scheduleDuelNudge(duelId) {
        if (!isSupported() || !userEnabled() || !duelId) return;
        try {
            var id = 2000 + (hashCode(String(duelId)) % 100000);
            var target = new Date(Date.now() + 24 * 3600 * 1000);
            scheduleOne({
                id: id,
                title: '⚔️ Ton duel t’attend',
                body: 'Viens voir si ton ami a relevé ton défi — et si tu as été dépassé.',
                schedule: { at: target }
            });
        } catch (e) {}
    }

    // --- Point d'entrée global : reprogramme tous les rappels récurrents à
    // partir de l'état actuel (série, réglage utilisateur). Appelé au
    // démarrage de l'app et à chaque retour au premier plan (voir js/app.js:
    // window.onload, Capacitor App.addListener('appStateChange')). N'a d'effet
    // que si la permission a déjà été accordée — elle n'est jamais demandée ici.
    function refreshAll() {
        if (!isSupported()) return;
        if (!userEnabled()) {
            cancel(IDS.STREAK_REMINDER);
            cancel(IDS.DAILY_AVAILABLE);
            cancel(IDS.WEEKLY_RECAP);
            return;
        }
        hasPermission().then(function (granted) {
            if (!granted) return;
            scheduleStreakReminder();
            scheduleDailyAvailable();
            scheduleWeeklyRecap();
        });
    }

    // Activation initiale : demande la permission puis programme tout. Appelé
    // après la première partie terminée (voir js/app.js: endGame) ou quand
    // l'utilisateur active le réglage manuellement (voir modal-settings).
    function enableAndSchedule() {
        if (!isSupported()) return Promise.resolve(false);
        return requestPermission().then(function (granted) {
            if (granted) {
                scheduleStreakReminder();
                scheduleDailyAvailable();
                scheduleWeeklyRecap();
            }
            return granted;
        });
    }

    function cancelAll() {
        cancel(IDS.STREAK_REMINDER);
        cancel(IDS.DAILY_AVAILABLE);
        cancel(IDS.WEEKLY_RECAP);
    }

    return {
        isSupported: isSupported,
        requestPermission: requestPermission,
        enableAndSchedule: enableAndSchedule,
        refreshAll: refreshAll,
        scheduleStreakReminder: scheduleStreakReminder,
        scheduleDuelNudge: scheduleDuelNudge,
        cancelAll: cancelAll
    };
})();
