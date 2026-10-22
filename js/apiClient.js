// =========================================================================
// === HISTORIAXE — CLIENT DU BACKEND (classement mondial & sync cloud) ===
// =========================================================================
// Toutes les requêtes vers /api/* passent par ce module. Chaque appel est
// best-effort : en cas d'échec réseau (hors ligne, backend indisponible),
// on renvoie { ok: false, error } plutôt que de lever une exception, pour
// que l'app reste pleinement jouable sans connexion.

var HistoriAxeAPI = (function () {
    'use strict';

    // Web/PWA : servi depuis le même domaine que le backend, location.origin
    // suffit — aucun réglage nécessaire.
    // App native (Capacitor) : la page est chargée depuis un bundle local
    // (scheme capacitor://localhost ou https://localhost selon la
    // plateforme), donc location.origin ne pointe PAS vers ce backend.
    // Renseignez ci-dessous l'URL de votre déploiement Vercel avant de
    // builder l'app native (voir README.md, section "Backend").
    var NATIVE_APP_API_BASE_URL = ''; // ex : 'https://histori-axe.vercel.app'

    function detectApiBase() {
        try {
            var isCapacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
            var origin = window.location && window.location.origin;
            var isHttpOrigin = origin && /^https?:\/\//.test(origin) && !/^https?:\/\/localhost(:|$)/.test(origin);
            if (!isCapacitor && isHttpOrigin) return origin;
            return NATIVE_APP_API_BASE_URL || origin || '';
        } catch (e) {
            return '';
        }
    }

    var API_BASE = detectApiBase();
    var TIMEOUT_MS = 8000;

    function withTimeout(promise, ms) {
        return new Promise(function (resolve, reject) {
            var timer = setTimeout(function () { reject(new Error('timeout')); }, ms);
            promise.then(function (v) { clearTimeout(timer); resolve(v); },
                         function (e) { clearTimeout(timer); reject(e); });
        });
    }

    // accessToken (facultatif) : jeton Supabase du joueur connecté, seulement
    // pour /api/account (voir js/auth.js) — les autres routes s'en passent.
    function request(method, path, body, accessToken) {
        if (!API_BASE) {
            return Promise.resolve({ ok: false, offline: true, error: 'Backend non configuré.' });
        }
        var url = API_BASE + path;
        var opts = { method: method, headers: {} };
        if (accessToken) opts.headers['Authorization'] = 'Bearer ' + accessToken;
        if (body !== undefined) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        return withTimeout(fetch(url, opts), TIMEOUT_MS)
            .then(function (res) {
                return res.json().catch(function () { return {}; }).then(function (data) {
                    if (!res.ok) return { ok: false, status: res.status, error: (data && data.error) || ('HTTP ' + res.status) };
                    return { ok: true, data: data };
                });
            })
            .catch(function (err) {
                return { ok: false, offline: true, error: (err && err.message) || 'Réseau indisponible.' };
            });
    }

    function qs(params) {
        var parts = [];
        Object.keys(params || {}).forEach(function (k) {
            if (params[k] === undefined || params[k] === null || params[k] === '') return;
            parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
        });
        return parts.length ? ('?' + parts.join('&')) : '';
    }

    return {
        register: function (deviceId, pseudo) {
            return request('POST', '/api/register', { deviceId: deviceId, pseudo: pseudo });
        },
        submitDailyScore: function (payload) {
            // payload : { deviceId, pseudo, lang, date, rounds }
            return request('POST', '/api/scores', payload);
        },
        getDailyLeaderboard: function (opts) {
            opts = opts || {};
            return request('GET', '/api/leaderboard' + qs({
                scope: 'daily', lang: opts.lang, date: opts.date, deviceId: opts.deviceId, limit: opts.limit
            }));
        },
        getAllTimeLeaderboard: function (opts) {
            opts = opts || {};
            return request('GET', '/api/leaderboard' + qs({
                scope: 'allTime', lang: opts.lang, deviceId: opts.deviceId, limit: opts.limit
            }));
        },
        // Défi hebdomadaire (30 événements/semaine ISO) — à ne pas confondre
        // avec getWeeklyLeague/submitWeeklyXp ci-dessous, qui portent sur la
        // ligue hebdomadaire par XP cumulé, une feature distincte.
        submitWeeklyChallengeScore: function (payload) {
            // payload : { deviceId, pseudo, lang, isoWeek, rounds }
            return request('POST', '/api/weeklyScores', payload);
        },
        getWeeklyChallengeLeaderboard: function (opts) {
            opts = opts || {};
            return request('GET', '/api/weeklyLeaderboard' + qs({
                scope: 'weekly', lang: opts.lang, isoWeek: opts.isoWeek, deviceId: opts.deviceId, limit: opts.limit
            }));
        },
        getWeeklyLeague: function (opts) {
            opts = opts || {};
            return request('GET', '/api/league' + qs({
                isoWeek: opts.isoWeek, deviceId: opts.deviceId, limit: opts.limit
            }));
        },
        createDuel: function (deviceId, pseudo, lang, date) {
            return request('POST', '/api/duels', { deviceId: deviceId, pseudo: pseudo, lang: lang, date: date });
        },
        getDuel: function (id, deviceId) {
            return request('GET', '/api/duels' + qs({ id: id, deviceId: deviceId }));
        },
        getMyDuels: function (deviceId) {
            return request('GET', '/api/duels' + qs({ mine: '1', deviceId: deviceId }));
        },
        ackDuel: function (id, deviceId) {
            return request('PATCH', '/api/duels', { id: id, deviceId: deviceId });
        },
        // Origine du backend déployé (voir detectApiBase ci-dessus) : réutilisée
        // pour construire un lien de duel partageable, valable aussi bien depuis
        // le web (déjà le bon domaine) que depuis l'app native (qui n'a pas
        // d'origine https utilisable pour un lien, voir NATIVE_APP_API_BASE_URL).
        getApiBase: function () { return API_BASE; },
        pullProgress: function (deviceId) {
            return request('GET', '/api/sync' + qs({ deviceId: deviceId }));
        },
        pushProgress: function (deviceId, pseudo, data) {
            return request('POST', '/api/sync', { deviceId: deviceId, pseudo: pseudo, data: data });
        },
        // Mode Classe (api/classroom.js) : action ∈ create | join | start | end | submit.
        classroom: function (action, payload) {
            return request('POST', '/api/classroom', Object.assign({ action: action }, payload));
        },
        getClassroom: function (code, deviceId) {
            return request('GET', '/api/classroom' + qs({ code: code, deviceId: deviceId }));
        },
        // Équipe de classe (api/team.js) : action ∈ create | join | contribute | claim | kick | leave | delete | badge | profile | level | search | challenge | challenge_reply | challenge_cancel.
        team: function (action, payload) {
            return request('POST', '/api/team', Object.assign({ action: action }, payload));
        },
        getTeam: function (code, deviceId) {
            return request('GET', '/api/team' + qs({ code: code, deviceId: deviceId }));
        },
        linkAccount: function (accessToken, deviceId, pseudo) {
            return request('POST', '/api/account', { deviceId: deviceId, pseudo: pseudo }, accessToken);
        },
        deleteAccount: function (accessToken) {
            return request('DELETE', '/api/account', undefined, accessToken);
        },
        isConfigured: function () { return !!API_BASE; }
    };
})();
