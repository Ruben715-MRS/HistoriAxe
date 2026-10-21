// =========================================================================
// === HISTORIAXE — MODE CLASSE (séance en direct, voir api/classroom.js) ===
// =========================================================================
// L'enseignant choisit un thème et obtient un code de 6 caractères ; les élèves le saisissent sur leur
// téléphone et placent les MÊMES cartes dans le même ordre. Le classement s'affiche en direct, puis un bilan
// montre les cartes les plus ratées de la classe.
//
// Aucun temps réel : on interroge le serveur toutes les 2,5 s (une classe, ~30 requêtes de quelques Ko). Le score
// n'est jamais déclaré par l'élève : il envoie le journal cumulatif de ses placements, que le serveur rejoue.
//
// Deux rôles sur le même écran (#screen-class), des panneaux qui se relaient :
//   enseignant : réglage → salon (code, élèves) → séance en direct → bilan
//   élève      : rejoindre → salon → (la frise, mode 'class') → attente du classement → bilan

const CLASS_POLL_MS = 2500;
const CLASS_SIZES = [10, 15, 20];

let classState = null;   // null hors Mode Classe
let classRoundLog = [];  // journal cumulatif des placements de l'élève (voir checkPlacement)
let classEventIndex = null;

// --- Aides -------------------------------------------------------------------
function classEventsById() {
    if (!classEventIndex || classEventIndex.source !== window.bdd) {
        const map = new Map();
        getAllEventsWithLocation().forEach(item => map.set(item.event.id, item.event));
        classEventIndex = { source: window.bdd, map };
    }
    return classEventIndex.map;
}

// Le paquet de la séance, en événements de CE pack (startActualGame('class') s'en sert).
function classDeckEvents() {
    const index = classEventsById();
    return classState.eventIds.map(id => index.get(id));
}

function classShowPanel(name) {
    ['setup', 'join', 'lobby', 'live'].forEach(p => {
        document.getElementById('class-panel-' + p).classList.toggle('hidden', p !== name);
    });
}

function classSetError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerText = message || '';
    el.classList.toggle('hidden', !message);
}

function classApiReady() {
    if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) {
        showConfirm(t('classroom.offline'), null, { alertOnly: true });
        return false;
    }
    return true;
}

function classStopPolling() {
    if (classState && classState.timer) { clearInterval(classState.timer); classState.timer = null; }
}

function classStartPolling() {
    classStopPolling();
    classPollOnce();
    classState.timer = setInterval(classPollOnce, CLASS_POLL_MS);
}

// --- Enseignant ----------------------------------------------------------------
function openClassSetup() {
    const pool = getModePoolRaw();
    if (pool.length < 6) {
        showConfirm(t('classroom.not_enough'), null, { alertOnly: true });
        return;
    }
    classLeave(true);
    classState = { role: 'teacher', size: Math.min(15, pool.length), eventIds: null, code: null, status: 'setup', timer: null };
    const theme = getCurrentTheme();
    document.getElementById('class-title').innerText = t('classroom.title');
    document.getElementById('class-subtitle').innerText = t('classroom.setup_subtitle', { theme: theme ? theme.nom : '' });
    classRenderSizes(pool.length);
    // Un enseignant qui a une équipe peut y verser les bonnes réponses de la séance.
    const team = typeof teamLoad === 'function' ? teamLoad() : null;
    const linkable = !!team && team.role === 'teacher';
    document.getElementById('class-team-link').classList.toggle('hidden', !linkable);
    if (linkable) document.getElementById('class-team-link-label').innerText = t('team.link_session', { name: team.name });
    classSetError('class-setup-error', '');
    classShowPanel('setup');
    showScreen('screen-class', 'forward');
}

function classRenderSizes(poolSize) {
    const box = document.getElementById('class-size-picker');
    box.innerHTML = '';
    const sizes = CLASS_SIZES.filter(n => n <= poolSize);
    if (!sizes.includes(classState.size)) classState.size = sizes[sizes.length - 1] || poolSize;
    sizes.forEach(n => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'round-length-btn';
        btn.innerText = String(n);
        const active = n === classState.size;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.onclick = () => { classState.size = n; classRenderSizes(poolSize); };
        box.appendChild(btn);
    });
}

function classCreate() {
    if (!classApiReady()) return;
    // Le paquet : n cartes tirées dans le thème, de dates distinctes (une égalité n'aurait pas de bonne réponse
    // unique), dans l'ordre de jeu — la première est l'ancre.
    const pool = shuffleArray(getModePoolRaw().filter(e => typeof e.date === 'number'));
    const seen = new Set();
    const deck = [];
    for (const evt of pool) {
        if (seen.has(evt.date)) continue;
        seen.add(evt.date);
        deck.push(evt);
        if (deck.length === classState.size) break;
    }
    if (deck.length < 6) { classSetError('class-setup-error', t('classroom.not_enough')); return; }
    const theme = getCurrentTheme();
    const btn = document.getElementById('class-create-btn');
    btn.disabled = true;
    HistoriAxeAPI.classroom('create', {
        deviceId: getOrCreateDeviceId(),
        pseudo: (typeof pseudoLoad === 'function' ? pseudoLoad() : '') || null,
        lang: i18n.currentLang,
        themeName: theme ? theme.nom : t('classroom.title'),
        eventIds: deck.map(e => e.id),
        teamCode: classTeamCodeToLink()
    }).then(res => {
        btn.disabled = false;
        if (!res.ok) { classSetError('class-setup-error', res.status === 400 && res.error ? res.error : t('classroom.error')); return; }
        classState.code = res.data.code;
        classState.eventIds = deck.map(e => e.id);
        classState.themeName = theme ? theme.nom : '';
        classState.status = 'lobby';
        classRenderLobby({ players: [], total: deck.length - 1 });
        classShowPanel('lobby');
        classStartPolling();
    });
}

// Le code de l'équipe à nourrir, si l'enseignant en a une et laisse la case cochée.
function classTeamCodeToLink() {
    const team = typeof teamLoad === 'function' ? teamLoad() : null;
    const box = document.getElementById('class-team-link-input');
    return team && team.role === 'teacher' && box && box.checked ? team.code : undefined;
}

function classStart() {
    if (!classState || classState.role !== 'teacher') return;
    document.getElementById('class-start-btn').disabled = true;
    HistoriAxeAPI.classroom('start', { code: classState.code, deviceId: getOrCreateDeviceId() }).then(res => {
        document.getElementById('class-start-btn').disabled = false;
        if (!res.ok) { classSetError('class-lobby-error', t('classroom.error')); return; }
        classPollOnce();
    });
}

function classEnd() {
    if (!classState || classState.role !== 'teacher') return;
    showConfirm(t('classroom.confirm_end'), () => {
        HistoriAxeAPI.classroom('end', { code: classState.code, deviceId: getOrCreateDeviceId() }).then(() => classPollOnce());
    });
}

// --- Élève ---------------------------------------------------------------------
function openClassJoin() {
    classLeave(true);
    classState = { role: 'student', code: null, status: 'join', timer: null, playing: false, eventIds: null };
    document.getElementById('class-title').innerText = t('classroom.join_title');
    document.getElementById('class-subtitle').innerText = t('classroom.join_subtitle');
    document.getElementById('class-code-input').value = '';
    const saved = typeof pseudoLoad === 'function' ? pseudoLoad() : '';
    document.getElementById('class-name-input').value = saved || '';
    classSetError('class-join-error', '');
    classShowPanel('join');
    showScreen('screen-class', 'forward');
}

function classJoin() {
    if (!classApiReady()) return;
    const code = document.getElementById('class-code-input').value;
    const name = document.getElementById('class-name-input').value.trim();
    if (!code.trim() || !name) { classSetError('class-join-error', t('classroom.join_missing')); return; }
    const btn = document.getElementById('class-join-btn');
    btn.disabled = true;
    HistoriAxeAPI.classroom('join', { code, deviceId: getOrCreateDeviceId(), name }).then(res => {
        btn.disabled = false;
        if (!res.ok) { classSetError('class-join-error', res.status && res.error ? res.error : t('classroom.error')); return; }
        if (typeof pseudoSave === 'function') pseudoSave(name);
        classState.code = code.toUpperCase().replace(/[\s-]+/g, '');
        classState.eventIds = res.data.eventIds;
        classState.themeName = res.data.themeName;
        classState.status = res.data.status;
        // Un paquet dont un événement manque à CE pack n'est pas jouable : mieux vaut le dire que bloquer en cours de route.
        const index = classEventsById();
        if (classState.eventIds.some(id => !index.has(id))) {
            classSetError('class-join-error', t('classroom.outdated'));
            classLeave(true);
            return;
        }
        document.getElementById('class-title').innerText = classState.themeName;
        document.getElementById('class-subtitle').innerText = t('classroom.lobby_student');
        if (res.data.status === 'running') { classBeginPlay(); return; }
        classRenderLobby({ players: [], total: classState.eventIds.length - 1 });
        classShowPanel('lobby');
        classStartPolling();
    });
}

function classBeginPlay() {
    if (!classState || classState.playing) return;
    classState.playing = true;
    classStopPolling();
    classRoundLog = [];
    startActualGame('class');
}

// Envoie le journal cumulatif ; la réponse porte le rang, pour le suivre pendant la manche.
function classSubmitProgress() {
    if (!classState || typeof HistoriAxeAPI === 'undefined') return;
    HistoriAxeAPI.classroom('submit', {
        code: classState.code, deviceId: getOrCreateDeviceId(), rounds: classRoundLog
    });
}

// Appelée par endGame() : la manche de l'élève est finie. true = prise en charge (endGame s'arrête là).
function classOnGameEnd() {
    if (!classState || classState.role !== 'student' || currentMode !== 'class') return false;
    classState.finished = true;
    classSubmitProgress();
    triggerHaptic('success');
    document.getElementById('class-title').innerText = classState.themeName;
    classShowPanel('live');
    showScreen('screen-class', 'forward');
    classRenderBoard({ status: 'running', players: [], total: classState.eventIds.length - 1, me: null });
    classStartPolling();
    return true;
}

// --- Les deux rôles : interrogation et rendu ------------------------------------
function classPollOnce() {
    if (!classState || !classState.code) return;
    const code = classState.code;
    HistoriAxeAPI.getClassroom(code, getOrCreateDeviceId()).then(res => {
        if (!classState || classState.code !== code) return; // on a quitté entre-temps
        if (!res.ok) {
            // Séance purgée ou introuvable : on arrête de l'interroger.
            if (res.status === 404) { classStopPolling(); classSetError('class-live-error', t('classroom.gone')); }
            return;
        }
        classApplyState(res.data);
    });
}

function classApplyState(state) {
    classState.status = state.status;
    if (classState.role === 'student' && !classState.playing && !classState.finished && state.status === 'running') {
        classBeginPlay();
        return;
    }
    if (state.status === 'lobby') {
        classRenderLobby(state);
    } else if (!(classState.role === 'student' && classState.playing && !classState.finished)) {
        classShowPanel('live');
        classRenderBoard(state);
    }
    if (state.status === 'ended') classStopPolling();
}

function classRenderLobby(state) {
    const teacher = classState.role === 'teacher';
    const code = classState.code || '';
    const codeEl = document.getElementById('class-code');
    codeEl.innerText = code; // l'espacement des lettres est du CSS : une seule ligne, même sur un petit écran
    codeEl.setAttribute('aria-label', t('classroom.code_aria', { code: code.split('').join(' ') }));
    document.getElementById('class-code-block').classList.toggle('hidden', !teacher);
    document.getElementById('class-lobby-hint').innerText = teacher ? t('classroom.lobby_teacher') : t('classroom.lobby_student');
    document.getElementById('class-start-btn').classList.toggle('hidden', !teacher);
    const list = document.getElementById('class-lobby-players');
    list.innerHTML = '';
    (state.players || []).forEach(p => {
        const li = document.createElement('li');
        li.textContent = p.name; // un prénom saisi par un élève : jamais interprété comme du HTML
        list.appendChild(li);
    });
    document.getElementById('class-lobby-count').innerText = t('classroom.players_count', { count: (state.players || []).length });
    document.getElementById('class-start-btn').disabled = !(state.players || []).length;
    if (teacher) {
        document.getElementById('class-title').innerText = classState.themeName || t('classroom.title');
        document.getElementById('class-subtitle').innerText = t('classroom.total_cards', { count: classState.eventIds ? classState.eventIds.length : 0 });
    }
}

function classRenderBoard(state) {
    const teacher = classState.role === 'teacher';
    const ended = state.status === 'ended';
    classSetError('class-live-error', '');
    document.getElementById('class-live-status').innerText = ended
        ? t('classroom.status_ended')
        : (teacher ? t('classroom.status_running_teacher') : classMyStatus(state));
    document.getElementById('class-end-btn').classList.toggle('hidden', !teacher || ended);
    document.getElementById('class-again-btn').classList.toggle('hidden', !ended);

    const board = document.getElementById('class-board');
    board.innerHTML = '';
    const total = state.total || 1;
    // L'élève voit le podium et sa propre ligne ; l'enseignant, toute la classe.
    const rows = (state.players || []).filter(p => teacher || p.rank <= 5 || (state.me && p.rank === state.me.rank));
    rows.forEach(p => {
        const li = document.createElement('li');
        const mine = !teacher && state.me && p.rank === state.me.rank;
        li.className = 'class-row' + (mine ? ' is-me' : '') + (p.finished ? ' is-done' : '');
        li.innerHTML = '<span class="class-rank"></span><span class="class-name"></span><span class="class-progress"><span class="class-progress-fill"></span></span><span class="class-score"></span>';
        li.querySelector('.class-rank').innerText = '#' + p.rank;
        li.querySelector('.class-name').textContent = p.name;
        li.querySelector('.class-progress-fill').style.width = Math.round(Math.min(1, p.answered / total) * 100) + '%';
        li.querySelector('.class-progress').setAttribute('aria-label', t('classroom.progress_aria', { done: p.answered, total }));
        li.querySelector('.class-score').innerText = String(p.score);
        board.appendChild(li);
    });

    const recapBox = document.getElementById('class-recap');
    const recap = state.recap || [];
    recapBox.classList.toggle('hidden', !recap.length || (!teacher && !ended));
    if (recap.length) classRenderRecap(recap);
}

function classMyStatus(state) {
    if (!state.me) return t('classroom.status_waiting');
    return state.me.finished
        ? t('classroom.status_finished', { rank: state.me.rank, count: state.playerCount || (state.players || []).length })
        : t('classroom.status_playing', { rank: state.me.rank });
}

// Les cartes les plus ratées : celles où le plus d'élèves se sont trompés, avec leur part d'erreurs.
function classRenderRecap(recap) {
    const index = classEventsById();
    const hardest = recap
        .filter(r => r.answered > 0 && r.wrong > 0)
        .sort((a, b) => (b.wrong / b.answered) - (a.wrong / a.answered) || b.wrong - a.wrong)
        .slice(0, 5);
    const list = document.getElementById('class-recap-list');
    list.innerHTML = '';
    if (!hardest.length) {
        const li = document.createElement('li');
        li.innerText = t('classroom.recap_none');
        list.appendChild(li);
        return;
    }
    hardest.forEach(r => {
        const evt = index.get(r.eventId);
        const li = document.createElement('li');
        li.innerHTML = '<span class="class-recap-title"></span><span class="class-recap-miss"></span>';
        li.querySelector('.class-recap-title').textContent = evt ? `${evt.titre} (${formatYear(evt.date)})` : r.eventId;
        li.querySelector('.class-recap-miss').innerText = t('classroom.recap_miss', { pct: Math.round(100 * r.wrong / r.answered), wrong: r.wrong, answered: r.answered });
        list.appendChild(li);
    });
}

// --- Sortie ----------------------------------------------------------------------
// quiet : repartir de zéro sans changer d'écran (un nouveau réglage, une nouvelle séance).
function classLeave(quiet) {
    classStopPolling();
    const wasPlaying = classState && classState.playing;
    const teacher = !!classState && classState.role === 'teacher';
    classState = null;
    classRoundLog = [];
    if (quiet === true) return;
    if (wasPlaying || currentMode === 'class') { resetPlacementAnimationState(); stopTimer(); }
    // L'enseignant revient à l'écran des modes d'où il est parti, l'élève aux catégories.
    showScreen(teacher ? 'screen-modes' : 'screen-categories', 'back');
}
