// =========================================================================
// === HISTORIAXE — ÉQUIPE DE CLASSE (voir api/team.js) ===
// =========================================================================
// L'enseignant crée une équipe (un code de 6 caractères, comme le Mode Classe), les élèves la rejoignent avec leur
// prénom. Les étoiles gagnées sur le Chemin du Temps et les bonnes réponses des séances de Mode Classe liées à
// l'équipe remplissent un coffre commun ; plein, il verse des pièces à chacun et, un coffre sur trois, une carte
// rare à chacun. Un élève connecté à un compte personnel touche en plus une pièce par point apporté — et ses points
// d'équipe lui restent acquis (cumul serveur, players.team_points).
//
// L'écran interroge le serveur à son ouverture puis toutes les 6 s tant qu'il est affiché ; les récompenses des
// coffres ouverts se réclament automatiquement (le serveur ne les paie qu'une fois).

const TEAM_POLL_MS = 6000;
const TEAM_NO_ALBUM_COINS = 40;

let teamReturn = 'screen-categories';
let teamTimer = null;
let teamClaiming = false;
let teamCache = null; // dernier état reçu du serveur (alimente la pastille de la barre de récompenses)

function teamApiReady() {
    return typeof HistoriAxeAPI !== 'undefined' && HistoriAxeAPI.isConfigured();
}

function teamSetError(message) {
    const el = document.getElementById('team-error');
    if (!el) return;
    el.innerText = message || '';
    el.classList.toggle('hidden', !message);
}

function teamShowPanel(name) {
    ['none', 'view'].forEach(p => document.getElementById('team-panel-' + p).classList.toggle('hidden', p !== name));
}

function teamStopPolling() {
    if (teamTimer) { clearInterval(teamTimer); teamTimer = null; }
}

// --- Ouverture / fermeture ----------------------------------------------------------------------------

// --- Écusson : éditeur et affichage (le dessin est dans js/teamBadge.js) ---------------------------------------

let teamBadgeUid = 0;
let teamCreateEditor = null;

// Un éditeur d'écusson dans `host` : aperçu, puis une rangée de choix pour le fond, le motif, la couleur du motif
// et la bordure (verrouillée tant que la classe n'a pas ouvert assez de coffres). `chests` : coffres ouverts.
function teamBadgeEditor(host, value, chests) {
    const state = TeamBadge.parse(value) || TeamBadge.parse(TeamBadge.DEFAULT);
    const ROWS = [
        { key: 'bg', label: 'team.badge_background', count: TeamBadge.COLORS.length },
        { key: 'pattern', label: 'team.badge_pattern', count: TeamBadge.PATTERNS_COUNT },
        { key: 'color', label: 'team.badge_pattern_color', count: TeamBadge.COLORS.length },
        { key: 'border', label: 'team.badge_border', count: TeamBadge.BORDERS.length }
    ];
    const unlocked = TeamBadge.unlockedBorders(chests);
    const draw = (extra, opts) => TeamBadge.render(TeamBadge.stringify(Object.assign({}, state, extra)), Object.assign({ uid: 'e' + (++teamBadgeUid) }, opts));
    function render(focus) {
        host.innerHTML = '';
        host.className = 'tb-editor';
        const preview = document.createElement('div');
        preview.className = 'tb-preview';
        preview.innerHTML = draw({}, { level: TeamBadge.levelOf(chests), label: t('team.badge_aria') });
        host.appendChild(preview);
        ROWS.forEach(row => {
            const wrap = document.createElement('div');
            wrap.className = 'tb-row';
            const title = document.createElement('h4');
            title.className = 'tb-row-title';
            title.textContent = t(row.label);
            const options = document.createElement('div');
            options.className = 'tb-options';
            options.setAttribute('role', 'group');
            options.setAttribute('aria-label', t(row.label));
            for (let i = 0; i < row.count; i++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'tb-opt';
                btn.dataset.row = row.key;
                btn.dataset.index = String(i);
                btn.setAttribute('aria-label', t('team.badge_option_aria', { kind: t(row.label), n: i + 1 }));
                btn.setAttribute('aria-pressed', String(state[row.key] === i));
                if (row.key === 'bg' || row.key === 'color') {
                    btn.innerHTML = '<span class="tb-swatch" style="background:' + TeamBadge.COLORS[i] + '"></span>';
                } else if (row.key === 'pattern') {
                    btn.innerHTML = draw({ pattern: i, border: 0 });
                } else {
                    btn.innerHTML = draw({ border: i });
                    if (i >= unlocked) {
                        btn.classList.add('is-locked');
                        btn.setAttribute('aria-disabled', 'true');
                        btn.title = t('team.badge_locked', { n: TeamBadge.BORDERS[i].chests, have: chests });
                    }
                }
                btn.onclick = () => {
                    if (row.key === 'border' && i >= unlocked) { showToast(t('team.badge_locked', { n: TeamBadge.BORDERS[i].chests, have: chests }), 3500); return; }
                    state[row.key] = i;
                    render({ row: row.key, index: i });
                };
                options.appendChild(btn);
            }
            wrap.append(title, options);
            host.appendChild(wrap);
        });
        if (focus) {
            const again = host.querySelector('.tb-opt[data-row="' + focus.row + '"][data-index="' + focus.index + '"]');
            if (again) again.focus({ preventScroll: true });
        }
    }
    render(null);
    return { get: () => TeamBadge.stringify(state) };
}

// L'écusson affiché en grand sur l'écran de l'équipe, avec le niveau de l'équipe en médaillon.
function teamBadgeRender(state) {
    const view = document.getElementById('team-badge-view');
    if (!view || !state.badge) return;
    view.innerHTML = TeamBadge.render(state.badge, { level: TeamBadge.levelOf(state.chestIndex), uid: 'view', label: t('team.badge_aria') });
}

function openTeam(from) {
    teamReturn = from || 'screen-categories';
    teamSetError('');
    showScreen('screen-team', 'forward');
    if (!teamApiReady()) {
        document.getElementById('team-subtitle').innerText = t('team.offline');
        teamShowPanel('none');
        document.getElementById('team-join-form').classList.add('hidden');
        document.getElementById('team-create-form').classList.add('hidden');
        document.getElementById('team-class-form').classList.add('hidden');
        return;
    }
    document.getElementById('team-class-form').classList.remove('hidden');
    const pseudo = typeof pseudoLoad === 'function' ? pseudoLoad() : '';
    document.getElementById('team-class-code').value = '';
    document.getElementById('team-class-name').value = pseudo || '';
    document.getElementById('team-join-form').classList.remove('hidden');
    document.getElementById('team-create-form').classList.remove('hidden');
    teamCreateEditor = teamBadgeEditor(document.getElementById('team-create-badge'), TeamBadge.DEFAULT, 0);
    teamCreateProfile = teamProfileEditor(document.getElementById('team-create-profile'), { lang: TeamProfile.LANGUAGES.indexOf(teamAppLang()) >= 0 ? teamAppLang() : '' });
    teamSearchBox(document.getElementById('team-join-search'), {
        actionLabel: t('team.search_join'),
        fullBlocks: true,
        // Rejoindre depuis un résultat : l'identifiant passe dans le champ, le prénom est celui de la ligne du dessous.
        onPick: team => { document.getElementById('team-code-input').value = team.code; teamJoin(); }
    });
    document.getElementById('team-edit').classList.add('hidden');
    document.getElementById('team-challenge-find').classList.add('hidden');
    document.getElementById('team-subtitle').innerText = '';
    const saved = teamLoad();
    if (!saved) { teamShowPanel('none'); return; }
    teamShowPanel('view');
    teamRefresh();
    teamStopPolling();
    teamTimer = setInterval(teamRefresh, TEAM_POLL_MS);
}

function teamBack() {
    teamStopPolling();
    showScreen(teamReturn, 'back');
    if (teamReturn === 'screen-path' && typeof renderPath === 'function') renderPath();
    else if (typeof initCategories === 'function') initCategories();
}

// --- Rejoindre / créer / quitter ----------------------------------------------------------------------

function teamJoin() {
    const code = (document.getElementById('team-code-input').value || '').toUpperCase().replace(/[\s-]+/g, '');
    const name = (document.getElementById('team-name-input').value || '').trim();
    if (!name) { teamSetError(t('team.need_name')); return; }
    if (code.length !== 6) { teamSetError(t('team.bad_code')); return; }
    teamSetError('');
    HistoriAxeAPI.team('join', { code, deviceId: getOrCreateDeviceId(), name, level: teamMyLevel() }).then(res => {
        if (!res.ok) { teamSetError(res.status === 404 ? t('team.not_found') : (res.status === 409 ? t('team.full') : t('team.error'))); return; }
        teamSave({ code: res.data.code, role: 'member', name: '', pending: 0, levelSent: teamMyLevel() });
        openTeam(teamReturn);
    });
}

// Rejoindre une séance de Mode Classe depuis l'écran Équipe : le code et le prénom saisis ici passent au formulaire
// de la séance (js/classroom.js), qui prend la suite — salon, puis partie.
function teamClassJoin() {
    const code = document.getElementById('team-class-code').value;
    const name = document.getElementById('team-class-name').value.trim();
    if (!code.trim() || !name) { teamSetError(t('classroom.join_missing')); return; }
    teamSetError('');
    openClassJoin();
    document.getElementById('class-code-input').value = code;
    document.getElementById('class-name-input').value = name;
    classJoin();
}

function teamCreate() {
    const name = (document.getElementById('team-new-name').value || '').trim();
    if (!name) { teamSetError(t('team.need_team_name')); return; }
    teamSetError('');
    HistoriAxeAPI.team('create', Object.assign({
        deviceId: getOrCreateDeviceId(),
        pseudo: (typeof pseudoLoad === 'function' ? pseudoLoad() : '') || null,
        name,
        badge: teamCreateEditor ? teamCreateEditor.get() : TeamBadge.DEFAULT,
        level: teamMyLevel()
    }, teamCreateProfile ? teamCreateProfile.get() : {})).then(res => {
        if (!res.ok) { teamSetError(t('team.error')); return; }
        teamSave({ code: res.data.code, role: 'teacher', name, pending: 0, levelSent: teamMyLevel() });
        openTeam(teamReturn);
    });
}

function teamLeave() {
    const saved = teamLoad();
    if (!saved) return;
    showConfirm(t(saved.role === 'teacher' ? 'team.confirm_forget' : 'team.confirm_leave'), () => {
        if (saved.role !== 'teacher') HistoriAxeAPI.team('leave', { code: saved.code, deviceId: getOrCreateDeviceId() });
        teamSave(null);
        teamCache = null;
        teamStopPolling();
        openTeam(teamReturn);
    });
}

function teamDelete() {
    const saved = teamLoad();
    if (!saved || saved.role !== 'teacher') return;
    showConfirm(t('team.confirm_delete'), () => {
        HistoriAxeAPI.team('delete', { code: saved.code, deviceId: getOrCreateDeviceId() }).then(() => {
            teamSave(null);
            teamCache = null;
            teamStopPolling();
            openTeam(teamReturn);
        });
    });
}

function teamKick(ref, name) {
    const saved = teamLoad();
    if (!saved || saved.role !== 'teacher') return;
    showConfirm(t('team.confirm_kick', { name }), () => {
        HistoriAxeAPI.team('kick', { code: saved.code, deviceId: getOrCreateDeviceId(), ref }).then(() => teamRefresh());
    });
}

// --- État affiché -----------------------------------------------------------------------------------

function teamRefresh() {
    const saved = teamLoad();
    if (!saved || !teamApiReady()) return;
    HistoriAxeAPI.getTeam(saved.code, getOrCreateDeviceId()).then(res => {
        if (!res.ok) {
            if (res.status === 404) { // l'équipe n'existe plus (supprimée) : on l'oublie
                teamSave(null); teamCache = null; teamStopPolling(); teamShowPanel('none');
                teamSetError(t('team.gone'));
            }
            return;
        }
        const state = res.data;
        // Le serveur est la vérité : un élève exclu ou parti n'est plus membre.
        if (saved.role === 'member' && !state.isMember) {
            teamSave(null); teamCache = null; teamStopPolling(); teamShowPanel('none');
            teamSetError(t('team.removed'));
            return;
        }
        teamCache = state;
        teamSyncLevel(state);
        if (!document.getElementById('screen-team').classList.contains('hidden')) teamRender(state);
        if (state.me && state.me.unclaimed.length) teamClaim();
    });
}

function teamRender(state) {
    teamShowPanel('view');
    document.getElementById('team-title').innerText = state.name;
    teamBadgeRender(state);
    document.getElementById('team-subtitle').innerText = '';
    const pct = Math.min(100, Math.round(100 * state.progress / state.target));
    const bar = document.getElementById('team-chest-bar');
    bar.style.width = pct + '%';
    const barBox = document.getElementById('team-chest-track');
    barBox.setAttribute('aria-valuenow', String(state.progress));
    barBox.setAttribute('aria-valuemax', String(state.target));
    document.getElementById('team-chest-text').innerText = t('team.chest_progress', { have: state.progress, target: state.target });
    document.getElementById('team-chest-next').innerText = state.untilCard === 1
        ? t('team.next_card_now')
        : t('team.next_card', { count: state.untilCard });
    document.getElementById('team-chest-count').innerText = t('team.chests_opened', { count: state.chestIndex, cards: state.cards });

    const mine = document.getElementById('team-me');
    mine.classList.toggle('hidden', !state.me);
    if (state.me) {
        const lines = [t('team.my_points', { count: state.me.points })];
        lines.push(state.me.account ? t('team.account_on', { total: state.me.teamPoints }) : t('team.account_off'));
        mine.innerText = lines.join(' ');
    }

    const code = document.getElementById('team-code');
    code.innerText = state.code.slice(0, 3) + ' ' + state.code.slice(3);
    code.setAttribute('aria-label', state.code.split('').join(' '));

    teamRenderHeader(state);
    teamRenderMembers(state);
    teamRenderChallenge(state);
    document.getElementById('team-teacher-tools').classList.toggle('hidden', !state.isTeacher);
    document.getElementById('team-delete-btn').classList.toggle('hidden', !state.isTeacher);
    document.getElementById('team-leave-btn').innerText = t(state.isTeacher ? 'team.forget' : 'team.leave');
}

// --- Contribution et récompenses ---------------------------------------------------------------------

// Appelé par le Chemin à chaque niveau terminé : `gained` étoiles nouvelles (jamais celles d'un niveau rejoué).
function teamOnStars(gained) {
    const saved = teamLoad();
    if (!saved || saved.role !== 'member' || !(gained > 0) || !teamApiReady()) return;
    const stars = gained + (saved.pending || 0);
    HistoriAxeAPI.team('contribute', { code: saved.code, deviceId: getOrCreateDeviceId(), stars, level: teamMyLevel() }).then(res => {
        const now = teamLoad() || saved;
        if (!res.ok) {
            if (!res.status || res.status >= 500) teamSave(Object.assign({}, now, { pending: Math.min(60, stars) })); // hors ligne : on réessaiera
            return;
        }
        teamSave(Object.assign({}, now, { pending: 0 }));
        if (res.data.account && res.data.accepted > 0) teamPayAccountBonus(res.data.accepted);
        if (res.data.opened > 0) teamClaim();
        else teamRefresh();
    });
}

// Compte personnel : une pièce par point apporté, en plus de la part du coffre.
function teamPayAccountBonus(points) {
    rewardsCommit(RewardsCore.addCoins(rewardsState(), points));
}

// Verse les coffres ouverts depuis la dernière réclamation : pièces à chacun, carte rare un coffre sur trois.
function teamClaim() {
    const saved = teamLoad();
    if (!saved || teamClaiming) return;
    teamClaiming = true;
    HistoriAxeAPI.team('claim', { code: saved.code, deviceId: getOrCreateDeviceId() }).then(res => {
        teamClaiming = false;
        if (!res.ok || !res.data.chests.length) return;
        teamGrant(res.data.chests);
        teamRefresh();
    }, () => { teamClaiming = false; });
}
function teamGrant(chests) {
    let state = rewardsState();
    const drawn = [];
    let coins = 0;
    chests.forEach(chest => {
        coins += chest.coins;
        state = RewardsCore.addCoins(state, chest.coins);
        if (chest.card) {
            const album = teamRewardAlbum();
            if (!album.length) {
                // Aucun album ouvert encore : la carte est remplacée par des pièces.
                coins += TEAM_NO_ALBUM_COINS;
                state = RewardsCore.addCoins(state, TEAM_NO_ALBUM_COINS);
            } else {
                const draw = RewardsCore.drawCards(state, album, 1, null, true);
                state = draw.state;
                drawn.push.apply(drawn, draw.drawn);
            }
        }
    });
    rewardsCommit(state);
    const note = document.getElementById('team-claimed');
    if (note) {
        note.innerText = t('team.claimed', { coins });
        note.classList.remove('hidden');
    }
    if (drawn.length && typeof rewardsRevealCards === 'function') rewardsRevealCards(drawn);
}

// L'album où tirer la carte rare du coffre : celui du monde le plus avancé que le joueur ait atteint (les mondes
// sans portrait, comme Monde 0 ou la Préhistoire, n'ont pas d'album). Vide tant qu'aucun album n'est ouvert.
function teamRewardAlbum() {
    const data = rewardsData();
    const albums = PathCore.mainWorlds()
        .filter(w => rewardsWorldReached(w.id))
        .map(w => RewardsCore.albumOfWorld(data.albums, w))
        .filter(album => album.length);
    return albums.length ? albums[albums.length - 1] : [];
}

// Pastille de la barre de récompenses : « 12/60 » quand l'élève a une équipe.
function teamChipText() {
    const saved = teamLoad();
    if (!saved) return '';
    return teamCache ? teamCache.progress + '/' + teamCache.target : '';
}
