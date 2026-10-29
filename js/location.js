// =========================================================================
// === HISTORIAXE — LOCALISATION (se placer sur la carte de l'Atlas) ===
// =========================================================================
// Un seul usage : montrer au joueur où il se trouve sur la carte. La position reste
// dans la mémoire de l'app : elle n'est ni enregistrée ni envoyée au serveur. Sur iPhone,
// c'est le plugin @capacitor/geolocation (autorisation système) ; sur le web, l'API du
// navigateur, qui demande elle-même l'autorisation.
//
// Demandé une seule fois, à la première ouverture d'une carte (voir askOnce) : un refus
// n'est jamais redemandé. Le bouton « Me localiser » reste disponible ensuite.
// Best-effort, comme js/notifications.js : une erreur de GPS ne bloque jamais la carte.

var HistoriAxeLocation = (function () {
    'use strict';

    var LOCATE_OPTIONS = { enableHighAccuracy: false, timeout: 10000 };

    function tFn(key, params) {
        return (typeof t === 'function') ? t(key, params) : key;
    }

    function plugin() {
        try {
            return (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() &&
                window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation) || null;
        } catch (e) {
            return null;
        }
    }

    function isSupported() {
        return !!plugin() || !!(typeof navigator !== 'undefined' && navigator.geolocation);
    }

    // 'granted' | 'denied' | 'prompt' (ou 'prompt-with-rationale' côté iPhone).
    function status() {
        var p = plugin();
        if (p) {
            return p.checkPermissions()
                .then(function (res) { return (res && res.location) || 'prompt'; })
                .catch(function () { return 'denied'; });
        }
        if (!navigator.geolocation) return Promise.resolve('denied');
        if (!navigator.permissions) return Promise.resolve('prompt');
        return navigator.permissions.query({ name: 'geolocation' })
            .then(function (r) { return r.state; })
            .catch(function () { return 'prompt'; });
    }

    // Position actuelle { lat, lon }, ou null (refus, délai dépassé, GPS indisponible).
    function currentPosition() {
        var p = plugin();
        var get = p ? p.getCurrentPosition(LOCATE_OPTIONS) : new Promise(function (resolve, reject) {
            navigator.geolocation.getCurrentPosition(resolve, reject, LOCATE_OPTIONS);
        });
        return Promise.resolve(get)
            .then(function (pos) { return { lat: pos.coords.latitude, lon: pos.coords.longitude }; })
            .catch(function () { return null; });
    }

    // Fenêtre système iPhone (le web n'en a pas besoin : getCurrentPosition demande déjà).
    function requestSystemPermission() {
        return plugin().requestPermissions()
            .then(function (res) { return !!res && res.location === 'granted'; })
            .catch(function () { return false; });
    }

    // Position pour un clic sur « Me localiser » : demande l'autorisation si besoin.
    function locate() {
        if (!plugin()) return currentPosition();
        return status().then(function (s) {
            if (s === 'denied') return null;
            if (s === 'granted') return currentPosition();
            return requestSystemPermission().then(function (granted) {
                return granted ? currentPosition() : null;
            });
        });
    }

    function markShown() {
        try {
            if (typeof appSettings === 'undefined' || !appSettings) return;
            appSettings.locationPromptShown = true;
            if (typeof settingsSave === 'function') settingsSave(appSettings);
        } catch (e) {}
    }

    // Première ouverture d'une carte : une fenêtre explique l'intérêt, une seule fois.
    // onPosition(pos) reçoit la position si le joueur accepte et que l'appareil la trouve.
    function askOnce(onPosition) {
        if (!isSupported() || typeof showConfirm !== 'function') return;
        if (typeof appSettings !== 'undefined' && appSettings && appSettings.locationPromptShown) return;
        status().then(function (s) {
            if (s !== 'prompt' && s !== 'prompt-with-rationale') return;
            markShown();
            // Laisse la carte s'afficher avant d'ouvrir la fenêtre.
            setTimeout(function () {
                showConfirm(tFn('location.ask_body'), function () {
                    locate().then(function (pos) { if (pos) onPosition(pos); });
                }, { okLabel: tFn('location.ask_ok') });
            }, 1000);
        }).catch(function () {});
    }

    // Contrôle MapLibre « Me localiser » (un bouton dans le coin de la carte).
    // onLocated(pos) reçoit la position ; onFailed() si elle n'est pas disponible.
    function locateControl(onLocated, onFailed) {
        var container = null;
        return {
            onAdd: function () {
                container = document.createElement('div');
                container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'location-ctrl-btn';
                btn.setAttribute('aria-label', tFn('location.locate_label'));
                btn.title = tFn('location.locate_label');
                btn.textContent = '◎';
                btn.onclick = function () {
                    locate().then(function (pos) {
                        if (pos) onLocated(pos);
                        else onFailed();
                    });
                };
                container.appendChild(btn);
                return container;
            },
            onRemove: function () {
                if (container && container.parentNode) container.parentNode.removeChild(container);
                container = null;
            }
        };
    }

    return {
        isSupported: isSupported,
        locate: locate,
        askOnce: askOnce,
        locateControl: locateControl
    };
})();
