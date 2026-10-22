// =========================================================================
// === HISTORIAXE — ÉQUIPE : PROFIL, MEMBRES PAR NIVEAU, RECHERCHE ET DÉFIS (voir api/team.js) ===
// =========================================================================
// L'écran de l'équipe (js/app/team.js) a la forme d'une fiche de clan : écusson, identifiant (#ABC234, unique, à
// donner pour être rejoint), description, pays, langue, membres classés par niveau de joueur. L'enseignant édite le
// profil et l'écusson ; il peut aussi défier une autre équipe, retrouvée par son nom ou son identifiant : pendant
// sept jours on compare les points gagnés par chaque équipe. Ce fichier porte ce qui s'ajoute au coffre commun.
//
// Tout texte venu du serveur (nom, description, prénoms) est posé en texte (textContent), jamais en HTML.

let teamEditProfile = null;
let teamEditBadge = null;
let teamCreateProfile = null;
let teamLevelSending = false;
let teamSearchUid = 0;

// --- Noms de pays et de langues, dans la langue de l'app (aucune table à traduire : c'est le navigateur) -------

function teamAppLang() {
    return (typeof i18n !== 'undefined' && i18n.currentLang) ? i18n.currentLang : 'fr';
}

function teamRegionName(iso) {
    try { return new Intl.DisplayNames([teamAppLang(), 'fr', 'en'], { type: 'region' }).of(iso) || iso; } catch (e) { return iso; }
}

function teamLanguageName(code) {
    try { return new Intl.DisplayNames([teamAppLang(), 'fr', 'en'], { type: 'language' }).of(code) || code; } catch (e) { return code; }
}

function teamCountryLabel(iso) {
    return iso ? `${typeof isoToFlagEmoji === 'function' ? isoToFlagEmoji(iso) : ''} ${teamRegionName(iso)}`.trim() : t('team.profile_none');
}

function teamLanguageLabel(code) {
    return code ? teamLanguageName(code) : t('team.profile_none');
}

// Le niveau du joueur : celui de son grade (js/gamification.js). Il sert à classer les membres.
function teamMyLevel() {
    try {
        const level = getRankInfo(gamificationLoad().xp).currentRank.level;
        return TeamProfile.sanitizeLevel(level) || 1;
    } catch (e) { return 1; }
}

function teamRankIcon(level) {
    return (typeof RANKS !== 'undefined' && RANKS[level - 1] && RANKS[level - 1].icon) || '🎖️';
}

// Prévient le serveur quand le niveau du joueur a changé (membre ou chef d'équipe) : la liste reste triée juste.
function teamSyncLevel(state) {
    const saved = teamLoad();
    if (!saved || teamLevelSending || !(state.isMember || state.isTeacher)) return;
    const level = teamMyLevel();
    if (saved.levelSent === level) return;
    teamLevelSending = true;
    HistoriAxeAPI.team('level', { code: saved.code, deviceId: getOrCreateDeviceId(), level }).then(res => {
        teamLevelSending = false;
        if (res.ok) teamSave(Object.assign({}, teamLoad() || saved, { levelSent: level }));
    }, () => { teamLevelSending = false; });
}

// --- Éditeur du profil : description, pays, langue --------------------------------------------------------------

function teamProfileEditor(host, values) {
    host.innerHTML = '';
    host.className = 'team-profile-editor';
    const desc = document.createElement('textarea');
    desc.id = 'tp-desc-' + (++teamSearchUid);
    desc.className = 'form-input team-textarea';
    desc.rows = 3;
    desc.maxLength = TeamProfile.MAX_DESCRIPTION;
    desc.placeholder = t('team.desc_placeholder');
    desc.value = values.description || '';
    const select = (labelKey, options, current) => {
        const id = 'tp-' + (++teamSearchUid);
        const label = document.createElement('label');
        label.className = 'class-label';
        label.htmlFor = id;
        label.textContent = t(labelKey);
        const el = document.createElement('select');
        el.id = id;
        el.className = 'form-input team-select';
        const none = document.createElement('option');
        none.value = '';
        none.textContent = t('team.profile_none');
        el.appendChild(none);
        options.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.value;
            opt.textContent = o.label;
            el.appendChild(opt);
        });
        el.value = options.some(o => o.value === current) ? current : '';
        return { label, el };
    };
    const collator = new Intl.Collator(teamAppLang());
    const countries = TeamProfile.COUNTRIES.map(c => ({ value: c, label: teamCountryLabel(c) })).sort((a, b) => collator.compare(a.label, b.label));
    const languages = TeamProfile.LANGUAGES.map(l => ({ value: l, label: teamLanguageName(l) }));
    const country = select('team.country_label', countries, values.country || '');
    const lang = select('team.lang_label', languages, values.lang || '');
    const descLabel = document.createElement('label');
    descLabel.className = 'class-label';
    descLabel.htmlFor = desc.id;
    descLabel.textContent = t('team.desc_label');
    // Visible dans la recherche : décoché par défaut (l'équipe ne se rejoint alors qu'avec son identifiant).
    const listedLabel = document.createElement('label');
    listedLabel.className = 'team-listed';
    const listed = document.createElement('input');
    listed.type = 'checkbox';
    listed.checked = values.listed === true;
    const listedText = document.createElement('span');
    const listedTitle = document.createElement('b');
    listedTitle.textContent = t('team.listed_label');
    const listedHint = document.createElement('small');
    listedHint.textContent = t('team.listed_hint');
    listedText.append(listedTitle, listedHint);
    listedLabel.append(listed, listedText);
    host.append(descLabel, desc, country.label, country.el, lang.label, lang.el, listedLabel);
    return { get: () => ({ description: desc.value, country: country.el.value, lang: lang.el.value, listed: listed.checked }) };
}

// --- Recherche d'équipe (par nom ou par identifiant) -------------------------------------------------------------

// `opts.actionLabel` : texte du bouton de chaque résultat ; `opts.onPick(team)` : ce qu'il fait ;
// `opts.canPick(team)` : faux = bouton grisé (équipe complète…).
function teamSearchBox(host, opts) {
    host.innerHTML = '';
    host.className = 'team-find-box';
    const inputId = 'tf-' + (++teamSearchUid);
    const label = document.createElement('label');
    label.className = 'class-label';
    label.htmlFor = inputId;
    label.textContent = t('team.search_label');
    const row = document.createElement('div');
    row.className = 'team-find-row';
    const input = document.createElement('input');
    input.type = 'search';
    input.id = inputId;
    input.className = 'form-input';
    input.maxLength = 40;
    input.autocomplete = 'off';
    input.placeholder = t('team.search_placeholder');
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'btn team-find-btn';
    go.textContent = t('team.search_btn');
    row.append(input, go);
    const status = document.createElement('p');
    status.className = 'class-help';
    status.setAttribute('role', 'status');
    const list = document.createElement('ul');
    list.className = 'team-find-list';
    host.append(label, row, status, list);

    function run() {
        const q = input.value.trim();
        list.innerHTML = '';
        if (q.replace(/^#/, '').length < 2) { status.textContent = t('team.search_short'); return; }
        status.textContent = '';
        HistoriAxeAPI.team('search', { q }).then(res => {
            if (!res.ok) { status.textContent = t('team.error'); return; }
            const teams = (res.data && res.data.teams) || [];
            status.textContent = teams.length ? '' : t('team.search_none');
            teams.forEach(team => list.appendChild(teamSearchRow(team, opts)));
        });
    }
    go.onclick = run;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
    return { run };
}

function teamSearchRow(team, opts) {
    const li = document.createElement('li');
    li.className = 'team-find-item';
    const badge = document.createElement('span');
    badge.className = 'team-find-badge';
    badge.innerHTML = TeamBadge.render(team.badge, { uid: 'f' + (++teamSearchUid) });
    const info = document.createElement('span');
    info.className = 'team-find-info';
    const name = document.createElement('b');
    name.textContent = team.name;
    const meta = document.createElement('small');
    const parts = ['#' + team.code];
    if (team.country) parts.push(teamCountryLabel(team.country));
    if (team.lang) parts.push(teamLanguageName(team.lang));
    parts.push(t('team.search_members', { n: team.memberCount, max: 50 }));
    meta.textContent = parts.join(' · ');
    info.append(name, meta);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn team-find-action';
    const full = team.memberCount >= 50 && opts.fullBlocks;
    btn.textContent = full ? t('team.search_full') : opts.actionLabel;
    btn.disabled = !!full || (opts.canPick && !opts.canPick(team));
    btn.onclick = () => opts.onPick(team);
    li.append(badge, info, btn);
    return li;
}

// --- Fiche de l'équipe : en-tête, membres, défi ---------------------------------------------------------------------

function teamRenderHeader(state) {
    document.getElementById('team-id').textContent = '#' + state.code;
    const desc = document.getElementById('team-desc');
    desc.textContent = state.description || (state.isTeacher ? t('team.desc_none_teacher') : '');
    desc.classList.toggle('hidden', !desc.textContent);
    desc.classList.toggle('is-placeholder', !state.description);
    document.getElementById('team-fact-country').textContent = teamCountryLabel(state.country);
    document.getElementById('team-fact-lang').textContent = teamLanguageLabel(state.lang);
    document.getElementById('team-fact-members').textContent = state.memberCount + '/' + state.maxMembers;
    document.getElementById('team-fact-points').textContent = String(state.totalPoints || 0);
    document.getElementById('team-edit-btn').classList.toggle('hidden', !state.isTeacher);
    document.getElementById('team-challenge-btn').classList.toggle('hidden', !state.isTeacher);
    if (!state.isTeacher) {
        document.getElementById('team-edit').classList.add('hidden');
        document.getElementById('team-challenge-find').classList.add('hidden');
    }
}

function teamRenderMembers(state) {
    document.getElementById('team-members-title').textContent =
        `${t('team.members_title')} ${state.memberCount}/${state.maxMembers} · ${t('team.members_sorted')}`;
    const list = document.getElementById('team-members');
    list.innerHTML = '';
    const row = (extra) => {
        const li = document.createElement('li');
        li.className = 'team-member' + (extra.cls ? ' ' + extra.cls : '');
        const icon = document.createElement('span');
        icon.className = 'team-member-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = teamRankIcon(extra.level);
        const who = document.createElement('span');
        who.className = 'team-member-name';
        const name = document.createElement('b');
        name.textContent = extra.name;
        who.appendChild(name);
        if (extra.tag) {
            const tag = document.createElement('small');
            tag.textContent = extra.tag;
            who.appendChild(tag);
        }
        const level = document.createElement('span');
        level.className = 'team-member-level';
        level.textContent = t('team.level_short', { n: extra.level });
        li.append(icon, who, level);
        if (extra.points !== undefined) {
            const pts = document.createElement('b');
            pts.className = 'team-member-points';
            pts.textContent = String(extra.points);
            li.appendChild(pts);
        }
        return li;
    };
    // Le chef d'équipe (l'enseignant) ouvre la liste ; ensuite les élèves, du plus haut niveau au plus bas.
    const leaderName = state.leader && state.leader.name && state.leader.name !== 'Anonyme' ? state.leader.name : t('team.leader');
    list.appendChild(row({ name: leaderName, tag: state.leader && leaderName !== t('team.leader') ? t('team.leader') : '', level: (state.leader && state.leader.level) || 1, cls: 'is-leader' }));
    state.members.forEach(m => {
        const li = row({ name: m.name, level: m.level || 1, points: m.points, cls: m.me ? 'is-me' : '' });
        if (state.isTeacher && m.ref) {
            const kick = document.createElement('button');
            kick.type = 'button';
            kick.className = 'team-kick';
            kick.textContent = '×';
            kick.setAttribute('aria-label', t('team.kick_aria', { name: m.name }));
            kick.onclick = () => teamKick(m.ref, m.name);
            li.appendChild(kick);
        }
        list.appendChild(li);
    });
}

function teamRenderChallenge(state) {
    const box = document.getElementById('team-challenge-card');
    const c = state.challenge;
    box.innerHTML = '';
    box.classList.toggle('hidden', !c);
    if (!c) return;
    const title = document.createElement('h3');
    title.textContent = t('team.challenge_title');
    box.appendChild(title);
    const line = (text, cls) => { const p = document.createElement('p'); p.className = cls || 'class-help'; p.textContent = text; box.appendChild(p); return p; };
    const button = (key, onClick, cls) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn ' + (cls || 'team-secondary');
        b.textContent = t(key);
        b.onclick = onClick;
        return b;
    };
    const opp = c.opponent;
    if (c.status === 'pending') {
        if (c.direction === 'sent') {
            line(t('team.challenge_sent', { name: opp.name, code: opp.code }));
            if (state.isTeacher) box.appendChild(button('team.challenge_cancel', teamChallengeCancel));
        } else if (state.isTeacher) {
            line(t('team.challenge_received', { name: opp.name, code: opp.code }), 'team-challenge-lead');
            const row = document.createElement('div');
            row.className = 'team-challenge-actions';
            row.append(button('team.challenge_accept', () => teamChallengeReply(c.id, true), 'class-primary'), button('team.challenge_decline', () => teamChallengeReply(c.id, false)));
            box.appendChild(row);
        } else {
            line(t('team.challenge_received_student', { name: opp.name }));
        }
        return;
    }
    // Défi en cours ou terminé : les deux équipes face à face.
    const versus = document.createElement('div');
    versus.className = 'team-versus';
    const side = (badge, name, score, mineSide) => {
        const el = document.createElement('div');
        el.className = 'team-versus-side' + (mineSide ? ' is-mine' : '');
        const b = document.createElement('span');
        b.className = 'team-versus-badge';
        b.innerHTML = TeamBadge.render(badge, { uid: 'v' + (++teamSearchUid) });
        const n = document.createElement('b');
        n.textContent = name;
        const s = document.createElement('span');
        s.className = 'team-versus-score';
        s.textContent = t('team.challenge_pts', { n: score });
        el.append(b, n, s);
        return el;
    };
    const vs = document.createElement('span');
    vs.className = 'team-versus-vs';
    vs.textContent = 'VS';
    versus.append(side(state.badge, t('team.challenge_you'), c.myScore, true), vs, side(opp.badge, opp.name, c.theirScore, false));
    if (c.status === 'active') {
        line(t('team.challenge_active', { name: opp.name }), 'team-challenge-lead');
        box.appendChild(versus);
        const days = Math.max(1, Math.ceil((Date.parse(c.endsAt) - Date.now()) / 86400000));
        line(t('team.challenge_ends', { n: days }));
    } else {
        const key = c.myScore > c.theirScore ? 'team.challenge_won' : (c.myScore < c.theirScore ? 'team.challenge_lost' : 'team.challenge_draw');
        line(t(key, { name: opp.name }), 'team-challenge-lead');
        box.appendChild(versus);
    }
}

// --- Actions de l'enseignant ----------------------------------------------------------------------------------------

function teamEditToggle() {
    const box = document.getElementById('team-edit');
    const opening = box.classList.contains('hidden');
    box.classList.toggle('hidden', !opening);
    if (!opening || !teamCache) return;
    document.getElementById('team-challenge-find').classList.add('hidden');
    teamEditProfile = teamProfileEditor(document.getElementById('team-edit-profile'), teamCache);
    teamEditBadge = teamBadgeEditor(document.getElementById('team-edit-badge'), teamCache.badge, teamCache.chestIndex);
}

function teamEditSave() {
    const saved = teamLoad();
    if (!saved || saved.role !== 'teacher' || !teamEditProfile || !teamCache) return;
    const base = { code: saved.code, deviceId: getOrCreateDeviceId() };
    const badge = teamEditBadge.get();
    const jobs = [HistoriAxeAPI.team('profile', Object.assign({}, base, teamEditProfile.get()))];
    if (badge !== teamCache.badge) jobs.push(HistoriAxeAPI.team('badge', Object.assign({}, base, { badge })));
    Promise.all(jobs).then(results => {
        if (results.some(r => !r.ok)) { showToast(t('team.edit_error'), 3500); return; }
        document.getElementById('team-edit').classList.add('hidden');
        showToast(t('team.edit_saved'));
        teamRefresh();
    });
}

function teamChallengeToggle() {
    const box = document.getElementById('team-challenge-find');
    const opening = box.classList.contains('hidden');
    box.classList.toggle('hidden', !opening);
    if (!opening) return;
    document.getElementById('team-edit').classList.add('hidden');
    const saved = teamLoad();
    teamSearchBox(document.getElementById('team-challenge-search'), {
        actionLabel: t('team.challenge_go'),
        canPick: team => !saved || team.code !== saved.code,
        onPick: team => teamChallengeStart(team.code)
    });
}

function teamChallengeStart(target) {
    const saved = teamLoad();
    if (!saved || saved.role !== 'teacher') return;
    HistoriAxeAPI.team('challenge', { code: saved.code, deviceId: getOrCreateDeviceId(), target }).then(res => {
        if (res.ok) {
            document.getElementById('team-challenge-find').classList.add('hidden');
            showToast(t('team.challenge_sent_ok'));
            teamRefresh();
        } else if (res.status === 409) showToast(t('team.challenge_busy'), 3500);
        else if (res.status === 404) showToast(t('team.not_found'), 3500);
        else showToast(t('team.challenge_error'), 3500);
    });
}

function teamChallengeReply(id, accept) {
    const saved = teamLoad();
    if (!saved || saved.role !== 'teacher') return;
    HistoriAxeAPI.team('challenge_reply', { code: saved.code, deviceId: getOrCreateDeviceId(), id, accept }).then(res => {
        if (!res.ok) showToast(t('team.challenge_error'), 3500);
        teamRefresh();
    });
}

function teamChallengeCancel() {
    const saved = teamLoad();
    if (!saved || saved.role !== 'teacher') return;
    HistoriAxeAPI.team('challenge_cancel', { code: saved.code, deviceId: getOrCreateDeviceId() }).then(() => teamRefresh());
}

// L'identifiant (#ABC234) à donner pour être rejoint.
function teamCopyId() {
    const id = document.getElementById('team-id').textContent.replace('#', '');
    const done = () => showToast(t('team.id_copied'));
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(id).then(done, () => {});
    else done();
}
