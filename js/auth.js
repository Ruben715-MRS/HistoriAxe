// =========================================================================
// === HISTORIAXE — COMPTES JOUEURS (Supabase Auth) ===
// =========================================================================
// Connexion facultative : e-mail + mot de passe, lien magique par e-mail,
// Google (Apple viendra avec l'app iPhone). Appels directs à l'API REST de
// Supabase Auth, sans bibliothèque : l'app reste légère et hors ligne.
//
// Une fois connecté, le serveur (api/account.js) renvoie le device_id du
// compte : il remplace celui de l'appareil, et tout le reste de l'app
// (scores, classements, duels, sauvegarde) suit sans autre changement.
// L'URL et la clé « publishable » ci-dessous sont publiques par nature.

var Auth = (function () {
    'use strict';

    var SUPABASE_URL = 'https://mcdzwbrncawqsznhrcta.supabase.co';
    var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_uTIev5ZkPi3GIM02Z-GURw_o4dpZvs_';
    var SESSION_KEY = 'historiaxe_auth_session_v1';
    var MIN_PASSWORD = 8;
    // Identifiant de l'app iOS (Client ID « natif » côté Apple, voir capacitor.config.ts).
    var APPLE_BUNDLE_ID = 'com.historiaxe.app';

    function isNative() {
        try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
        catch (e) { return false; }
    }

    // Page où Supabase renvoie après un clic dans un e-mail ou une connexion
    // Google. Dans l'app native, la page locale n'a pas d'adresse web : on
    // renvoie vers le site.
    function redirectUrl() {
        if (isNative()) {
            var base = (typeof HistoriAxeAPI !== 'undefined' && HistoriAxeAPI.getApiBase()) || '';
            return base ? base + '/' : '';
        }
        return window.location.origin + window.location.pathname;
    }

    // --- Session (jetons) ---
    function loadSession() {
        try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch (e) { return null; }
    }
    function saveSession(s) {
        try {
            if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
            else localStorage.removeItem(SESSION_KEY);
        } catch (e) {}
    }
    function sessionFromTokens(tok) {
        return {
            access_token: tok.access_token,
            refresh_token: tok.refresh_token,
            expires_at: tok.expires_at ? Number(tok.expires_at) : Math.floor(Date.now() / 1000) + Number(tok.expires_in || 3600),
            email: (tok.user && tok.user.email) || null
        };
    }

    // Nonce aléatoire (32 caractères hexadécimaux) et son empreinte SHA-256, pour Apple.
    function randomNonce() {
        var bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    }
    function sha256Hex(text) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
            return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        });
    }

    function gotrue(method, path, body, accessToken) {
        var headers = { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' };
        if (accessToken) headers.Authorization = 'Bearer ' + accessToken;
        return fetch(SUPABASE_URL + '/auth/v1' + path, {
            method: method, headers: headers, body: body ? JSON.stringify(body) : undefined
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                if (!res.ok) {
                    var err = new Error(data.msg || data.error_description || data.message || ('HTTP ' + res.status));
                    err.code = data.error_code || data.code || data.error || '';
                    throw err;
                }
                return data;
            });
        });
    }

    // Jeton d'accès valide (rafraîchi s'il expire dans moins d'une minute), ou null.
    function getAccessToken() {
        var s = loadSession();
        if (!s) return Promise.resolve(null);
        if (s.expires_at - 60 > Date.now() / 1000) return Promise.resolve(s.access_token);
        return gotrue('POST', '/token?grant_type=refresh_token', { refresh_token: s.refresh_token })
            .then(function (tok) {
                var next = sessionFromTokens(tok);
                next.email = next.email || s.email;
                saveSession(next);
                return next.access_token;
            })
            .catch(function (err) {
                // Hors ligne : on garde la session pour plus tard. Jeton refusé : déconnexion locale.
                if (err && err.code) saveSession(null);
                return null;
            });
    }

    // --- Après connexion : rattacher l'appareil au compte, puis fusionner la progression ---
    function completeSignIn(session) {
        saveSession(session);
        setMessage(t('account.msg_syncing'));
        return HistoriAxeAPI.linkAccount(session.access_token, getOrCreateDeviceId(), pseudoLoad() || null)
            .then(function (res) {
                if (!res.ok) throw new Error(res.error || 'link');
                setDeviceId(res.data.deviceId);
                if (res.data.pseudo && res.data.pseudo !== 'Anonyme') pseudoSave(res.data.pseudo);
                if (res.data.email) { session.email = res.data.email; saveSession(session); }
                return typeof syncProgress === 'function' ? syncProgress() : false;
            })
            .then(function () {
                // Recharger réaffiche partout la progression fusionnée (série, XP, badges…).
                window.location.reload();
            })
            .catch(function () {
                saveSession(null);
                setBusy(false);
                setMessage(t('account.err_generic'), true);
            });
    }

    // Retour depuis Supabase : #access_token=…&refresh_token=…&type=… (connexion
    // Google, lien magique, confirmation d'inscription, mot de passe oublié)
    // ou #error=…&error_description=…. Renvoie true si une connexion est en cours.
    function handleRedirect() {
        var hash = window.location.hash || '';
        if (hash.indexOf('access_token=') === -1 && hash.indexOf('error=') === -1) return false;
        var params = new URLSearchParams(hash.slice(1));
        try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}

        if (params.get('error')) {
            openAccountModal();
            setMessage(params.get('error_description') || t('account.err_generic'), true);
            return false;
        }
        var session = sessionFromTokens({
            access_token: params.get('access_token'),
            refresh_token: params.get('refresh_token'),
            expires_at: params.get('expires_at'),
            expires_in: params.get('expires_in')
        });
        if (params.get('type') === 'recovery') {
            saveSession(session);
            openAccountModal();
            showNewPasswordForm(true);
            return false;
        }
        openAccountModal();
        completeSignIn(session);
        return true;
    }

    // --- Interface ---
    function el(id) { return document.getElementById(id); }

    function setMessage(text, isError) {
        var m = el('account-message');
        if (!m) return;
        m.textContent = text || '';
        m.style.color = isError ? 'var(--danger-red-text)' : '';
    }

    function setBusy(busy) {
        var form = el('modal-account');
        if (!form) return;
        Array.prototype.forEach.call(form.querySelectorAll('button, input'), function (b) { b.disabled = !!busy; });
    }

    function showNewPasswordForm(show) {
        el('account-form').classList.toggle('hidden', !!show);
        el('account-new-password').classList.toggle('hidden', !show);
    }

    function readCredentials(needPassword) {
        var email = (el('account-email').value || '').trim();
        var password = el('account-password').value || '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMessage(t('account.err_email'), true); return null; }
        if (needPassword && password.length < MIN_PASSWORD) { setMessage(t('account.err_password_short'), true); return null; }
        return { email: email, password: password };
    }

    function errorMessage(err) {
        var code = (err && err.code) || '';
        var map = {
            invalid_credentials: 'account.err_credentials',
            email_not_confirmed: 'account.err_not_confirmed',
            weak_password: 'account.err_password_short',
            user_already_exists: 'account.err_exists',
            over_email_send_rate_limit: 'account.err_rate_limit',
            over_request_rate_limit: 'account.err_rate_limit'
        };
        if (map[code]) return t(map[code]);
        if (err instanceof TypeError) return t('account.err_offline'); // fetch hors ligne
        return t('account.err_generic');
    }

    function run(promise, okMessage) {
        setBusy(true);
        setMessage('');
        return promise
            .then(function (r) { if (okMessage) setMessage(okMessage); return r; })
            .catch(function (err) { setMessage(errorMessage(err), true); })
            .finally(function () { setBusy(false); });
    }

    function redirectQuery() {
        var url = redirectUrl();
        return url ? '?redirect_to=' + encodeURIComponent(url) : '';
    }

    var api = {
        isSignedIn: function () { return !!loadSession(); },
        email: function () { var s = loadSession(); return s && s.email; },
        getAccessToken: getAccessToken,

        init: function () {
            var handling = handleRedirect();
            // Garde la session vivante (et détecte un compte supprimé ailleurs).
            if (!handling && loadSession()) getAccessToken();
            return handling;
        },

        signIn: function () {
            var c = readCredentials(true);
            if (!c) return;
            setBusy(true);
            setMessage('');
            gotrue('POST', '/token?grant_type=password', c)
                .then(function (tok) { return completeSignIn(sessionFromTokens(tok)); })
                .catch(function (err) { setBusy(false); setMessage(errorMessage(err), true); });
        },

        signUp: function () {
            var c = readCredentials(true);
            if (!c) return;
            run(gotrue('POST', '/signup' + redirectQuery(), c).then(function (data) {
                // Confirmation par e-mail désactivée : Supabase renvoie directement une session.
                if (data && data.access_token) return completeSignIn(sessionFromTokens(data));
                setMessage(t('account.msg_check_email_signup'));
            }));
        },

        magicLink: function () {
            var c = readCredentials(false);
            if (!c) return;
            run(gotrue('POST', '/otp' + redirectQuery(), { email: c.email, create_user: true }),
                t('account.msg_check_email_link'));
        },

        forgotPassword: function () {
            var c = readCredentials(false);
            if (!c) return;
            run(gotrue('POST', '/recover' + redirectQuery(), { email: c.email }),
                t('account.msg_check_email_reset'));
        },

        saveNewPassword: function () {
            var pw = el('account-new-password-input').value || '';
            if (pw.length < MIN_PASSWORD) { setMessage(t('account.err_password_short'), true); return; }
            setBusy(true);
            getAccessToken()
                .then(function (token) {
                    if (!token) throw new Error('session');
                    return gotrue('PUT', '/user', { password: pw }, token).then(function () {
                        return completeSignIn(loadSession());
                    });
                })
                .catch(function (err) { setBusy(false); setMessage(errorMessage(err), true); });
        },

        // Connexion Apple native (iPhone) : le plugin renvoie un jeton d'identité, que
        // Supabase vérifie. Le nonce brut va à Supabase ; Apple reçoit son empreinte SHA-256.
        apple: function () {
            var plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SignInWithApple;
            if (!plugin) return;
            var rawNonce = randomNonce();
            setBusy(true);
            setMessage('');
            sha256Hex(rawNonce)
                .then(function (hashedNonce) {
                    return plugin.authorize({
                        clientId: APPLE_BUNDLE_ID,
                        redirectURI: redirectUrl() || window.location.origin + '/',
                        scopes: 'email name',
                        nonce: hashedNonce
                    });
                })
                .then(function (res) {
                    return gotrue('POST', '/token?grant_type=id_token', {
                        provider: 'apple',
                        id_token: res.response.identityToken,
                        nonce: rawNonce
                    });
                })
                .then(function (data) { return completeSignIn(sessionFromTokens(data)); })
                .catch(function (err) { setBusy(false); setMessage(errorMessage(err), true); });
        },

        google: function () {
            var url = redirectUrl();
            window.location.href = SUPABASE_URL + '/auth/v1/authorize?provider=google' +
                (url ? '&redirect_to=' + encodeURIComponent(url) : '');
        },

        // Déconnexion : la progression reste sauvegardée dans le compte ; cet
        // appareil repart de zéro, en joueur anonyme.
        signOut: function () {
            var s = loadSession();
            if (s) gotrue('POST', '/logout', null, s.access_token).catch(function () {});
            saveSession(null);
            resetAllGameData();
            pseudoSave('');
            setDeviceId(null);
            window.location.reload();
        },

        deleteAccount: function () {
            return getAccessToken().then(function (token) {
                if (!token) throw new Error('session');
                return HistoriAxeAPI.deleteAccount(token);
            }).then(function (res) {
                if (!res.ok) throw new Error(res.error || 'delete');
                saveSession(null);
                resetAllGameData();
                // Les parties jouées hors ligne appartiennent à ce compte, supprimé avec son historique.
                historyOutboxSave([]);
                pseudoSave('');
                setDeviceId(null);
                window.location.reload();
            });
        },

        isNative: isNative,
        showNewPasswordForm: showNewPasswordForm,
        setMessage: setMessage
    };
    return api;
})();

// --- Points d'entrée appelés depuis index.html ---
function renderAccountSettings() {
    var signedIn = Auth.isSignedIn();
    var out = document.getElementById('settings-account-out');
    var inn = document.getElementById('settings-account-in');
    if (!out || !inn) return;
    out.classList.toggle('hidden', signedIn);
    inn.classList.toggle('hidden', !signedIn);
    var email = document.getElementById('settings-account-email');
    if (email) email.textContent = Auth.email() || '';
}

function openAccountModal() {
    if (typeof closeSettings === 'function') closeSettings();
    Auth.showNewPasswordForm(false);
    Auth.setMessage('');
    // Google dans l'app iPhone demande une configuration native (avec Apple) : pas encore.
    var g = document.getElementById('account-google-btn');
    if (g) g.classList.toggle('hidden', Auth.isNative());
    // Le bouton Apple n'existe que dans l'app native (iPhone/iPad).
    var a = document.getElementById('account-apple-btn');
    if (a) a.classList.toggle('hidden', !Auth.isNative());
    var modal = document.getElementById('modal-account');
    if (modal) modal.classList.remove('hidden');
}

function closeAccountModal() {
    var modal = document.getElementById('modal-account');
    if (modal) modal.classList.add('hidden');
}

function accountSignIn() { Auth.signIn(); }
function accountSignUp() { Auth.signUp(); }
function accountMagicLink() { Auth.magicLink(); }
function accountForgotPassword() { Auth.forgotPassword(); }
function accountSaveNewPassword() { Auth.saveNewPassword(); }
function accountGoogle() { Auth.google(); }
function accountApple() { Auth.apple(); }

function accountSignOut() {
    if (typeof closeSettings === 'function') closeSettings();
    showConfirm(t('account.sign_out_confirm'), function () { Auth.signOut(); },
        { okLabel: t('account.sign_out_btn') });
}

function accountDelete() {
    if (typeof closeSettings === 'function') closeSettings();
    showConfirm(t('account.delete_confirm'), function () {
        Auth.deleteAccount().catch(function () {
            showConfirm(t('account.err_delete'), null, { alertOnly: true });
        });
    }, { okLabel: t('account.delete_btn') });
}
