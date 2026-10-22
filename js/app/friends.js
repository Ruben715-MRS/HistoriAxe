// =========================================================================
// === HISTORIAXE — AMIS (voir api/friends.js) ===
// =========================================================================
// Un joueur avec un compte (e-mail, Google ou Apple) a un identifiant d'ami généré au hasard, sans rapport avec son
// adresse : on ne retrouve quelqu'un que par cet identifiant exact. On envoie une demande, l'autre l'accepte (ou la
// refuse, ou bloque). Un ami voit le pseudo et le niveau de l'autre — rien d'autre.
//
// L'écran interroge le serveur à son ouverture, puis toutes les 15 s tant qu'il est affiché. Tout texte venu du
// serveur (pseudos) est posé en texte, jamais en HTML.

const FRIENDS_POLL_MS = 15000;
const FRIENDS_PREFETCH_MS = 5 * 60 * 1000;

let friendsReturn = 'screen-categories';
let friendsTimer = null;
let friendsCache = null;       // dernier état reçu (alimente la pastille « Amis » de l'accueil)
let friendsFetchedAt = 0;

function friendsApiReady() {
    return typeof HistoriAxeAPI !== 'undefined' && HistoriAxeAPI.isConfigured();
}

function friendsSignedIn() {
    return typeof Auth !== 'undefined' && Auth.isSignedIn();
}

function friendsStopPolling() {
    if (friendsTimer) { clearInterval(friendsTimer); friendsTimer = null; }
}

function friendsShowPanel(name) {
    ['account', 'main'].forEach(p => document.getElementById('friends-panel-' + p).classList.toggle('hidden', p !== name));
}

function friendsSetMessage(text, isError) {
    const el = document.getElementById('friends-add-msg');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'friends-msg' + (text ? (isError ? ' is-error' : ' is-ok') : ' hidden');
}

function friendsFormatCode(code) {
    return code && code.length === 8 ? code.slice(0, 4) + '-' + code.slice(4) : (code || '');
}

// --- Ouverture / fermeture ----------------------------------------------------------------------------

function openFriends(from) {
    friendsReturn = from || 'screen-categories';
    showScreen('screen-friends', 'forward');
    friendsSetMessage('');
    friendsShowPanel('none');
    document.getElementById('friends-subtitle').textContent = '';
    friendsStopPolling();
    if (!friendsApiReady()) { document.getElementById('friends-subtitle').textContent = t('friends.offline'); return; }
    if (!friendsSignedIn()) { friendsShowPanel('account'); return; }
    friendsShowPanel('main');
    if (friendsCache) friendsRender();
    friendsRefresh();
    friendsTimer = setInterval(friendsRefresh, FRIENDS_POLL_MS);
}

function friendsBack() {
    friendsStopPolling();
    showScreen(friendsReturn, 'back');
    if (friendsReturn === 'screen-path' && typeof renderPath === 'function') renderPath();
    else if (typeof initCategories === 'function') initCategories();
}

// Sans compte : les Réglages portent la connexion.
function friendsOpenSettings() {
    if (typeof openSettings === 'function') openSettings();
}

// --- État -----------------------------------------------------------------------------------------------

function friendsRefresh() {
    if (!friendsApiReady() || !friendsSignedIn()) return Promise.resolve(false);
    return HistoriAxeAPI.friends('list', { deviceId: getOrCreateDeviceId(), level: typeof teamMyLevel === 'function' ? teamMyLevel() : undefined }).then(res => {
        if (!res.ok) {
            if (res.status === 403 && !document.getElementById('screen-friends').classList.contains('hidden')) { friendsStopPolling(); friendsShowPanel('account'); }
            return false;
        }
        friendsCache = res.data;
        friendsFetchedAt = Date.now();
        // La pastille « Amis » de l'accueil suit toujours l'état le plus récent, que l'écran soit ouvert ou non.
        document.querySelectorAll('.rewards-friends-btn small').forEach(el => { el.textContent = friendsChipText(); });
        if (!document.getElementById('screen-friends').classList.contains('hidden')) friendsRender();
        return true;
    });
}

// Un relevé discret au chargement de l'accueil, pour que la pastille annonce les demandes en attente.
function friendsPrefetch() {
    if (!friendsApiReady() || !friendsSignedIn() || Date.now() - friendsFetchedAt < FRIENDS_PREFETCH_MS) return Promise.resolve(false);
    friendsFetchedAt = Date.now();
    return friendsRefresh();
}

function friendsPendingCount() {
    return friendsCache && friendsCache.incoming ? friendsCache.incoming.length : 0;
}

// --- Affichage ----------------------------------------------------------------------------------------

function friendsRender() {
    const data = friendsCache;
    if (!data) return;
    const code = document.getElementById('friends-code');
    code.textContent = friendsFormatCode(data.code);
    code.setAttribute('aria-label', data.code.split('').join(' '));
    document.getElementById('friends-allow-input').checked = data.requests !== false;

    const lists = document.getElementById('friends-lists');
    lists.innerHTML = '';
    const person = (p, buttons) => {
        const li = document.createElement('li');
        li.className = 'friends-person';
        const icon = document.createElement('span');
        icon.className = 'friends-person-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = typeof teamRankIcon === 'function' ? teamRankIcon(p.level || 1) : '🎖️';
        const name = document.createElement('b');
        name.className = 'friends-person-name';
        name.textContent = p.name;
        li.append(icon, name);
        if (p.level) {
            const level = document.createElement('span');
            level.className = 'team-member-level';
            level.textContent = t('friends.level_short', { n: p.level });
            li.appendChild(level);
        }
        const actions = document.createElement('span');
        actions.className = 'friends-person-actions';
        buttons.forEach(b => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'friends-btn' + (b.primary ? ' is-primary' : '');
            btn.textContent = t(b.key);
            btn.onclick = b.onClick;
            actions.appendChild(btn);
        });
        li.appendChild(actions);
        return li;
    };
    const section = (titleKey, rows, build, emptyKey) => {
        if (!rows.length && !emptyKey) return;
        const wrap = document.createElement('div');
        wrap.className = 'friends-section';
        const h = document.createElement('h3');
        h.textContent = t(titleKey, { n: rows.length });
        wrap.appendChild(h);
        if (!rows.length) {
            const p = document.createElement('p');
            p.className = 'class-help';
            p.textContent = t(emptyKey);
            wrap.appendChild(p);
        } else {
            const ul = document.createElement('ul');
            ul.className = 'friends-list';
            rows.forEach(r => ul.appendChild(build(r)));
            wrap.appendChild(ul);
        }
        lists.appendChild(wrap);
    };
    section('friends.incoming_title', data.incoming, p => person(p, [
        { key: 'friends.accept', primary: true, onClick: () => friendsAct('respond', { id: p.id, accept: true }) },
        { key: 'friends.decline', onClick: () => friendsAct('respond', { id: p.id, accept: false }) },
        { key: 'friends.block', onClick: () => friendsConfirm('friends.confirm_block', p, () => friendsAct('respond', { id: p.id, block: true })) }
    ]));
    section('friends.friends_title', data.friends, p => person(p, [
        { key: 'friends.remove', onClick: () => friendsConfirm('friends.confirm_remove', p, () => friendsAct('remove', { id: p.id })) },
        { key: 'friends.block', onClick: () => friendsConfirm('friends.confirm_block', p, () => friendsAct('block', { id: p.id })) }
    ]), 'friends.friends_none');
    section('friends.outgoing_title', data.outgoing, p => person(p, [
        { key: 'friends.cancel', onClick: () => friendsAct('cancel', { id: p.id }) }
    ]));
    section('friends.blocked_title', data.blocked, p => person(p, [
        { key: 'friends.unblock', onClick: () => friendsAct('unblock', { id: p.id }) }
    ]));
}

function friendsChipText() {
    const n = friendsPendingCount();
    return n > 0 ? String(n) : '';
}

function friendsConfirm(key, person, onYes) {
    showConfirm(t(key, { name: person.name }), onYes);
}

// --- Actions ------------------------------------------------------------------------------------------

function friendsAct(action, payload) {
    HistoriAxeAPI.friends(action, Object.assign({ deviceId: getOrCreateDeviceId() }, payload)).then(res => {
        if (!res.ok) showToast(t('friends.err_generic'), 3500);
        friendsRefresh();
    });
}

// Le message d'erreur du serveur, traduit : le code HTTP et le début du texte disent de quoi il s'agit.
function friendsErrorKey(res) {
    const msg = String(res.error || '');
    if (res.status === 404) return 'friends.err_not_found';
    if (res.status === 400) return /propre/.test(msg) ? 'friends.err_self' : 'friends.err_invalid';
    if (res.status === 409) {
        if (/déjà amis/.test(msg)) return 'friends.err_already';
        if (/déjà envoyée/.test(msg)) return 'friends.err_pending';
        if (/bloqué/.test(msg)) return 'friends.err_blocked';
        return 'friends.err_limit';
    }
    return 'friends.err_generic';
}

function friendsAdd() {
    const input = document.getElementById('friends-add-input');
    const code = input.value.replace(/^#/, '').replace(/[\s-]+/g, '').toUpperCase();
    if (code.length !== 8) { friendsSetMessage(t('friends.err_invalid'), true); return; }
    friendsSetMessage('');
    HistoriAxeAPI.friends('request', { deviceId: getOrCreateDeviceId(), code }).then(res => {
        if (!res.ok) { friendsSetMessage(t(friendsErrorKey(res)), true); return; }
        input.value = '';
        friendsSetMessage(t(res.data.status === 'accepted' ? 'friends.req_accepted' : 'friends.req_sent'), false);
        friendsRefresh();
    });
}

function friendsToggleRequests(allowed) {
    HistoriAxeAPI.friends('settings', { deviceId: getOrCreateDeviceId(), requests: !!allowed }).then(res => {
        if (!res.ok) { document.getElementById('friends-allow-input').checked = !allowed; showToast(t('friends.err_generic'), 3500); }
    });
}

function friendsCopyCode() {
    if (!friendsCache) return;
    const done = () => showToast(t('friends.copied'));
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(friendsFormatCode(friendsCache.code)).then(done, () => {});
    else done();
}
