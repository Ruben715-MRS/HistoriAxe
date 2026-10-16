// =========================================================================
// === EXPÉDITION — HUIT ÉPREUVES, TIRÉES PARMI LES MODES, VIES COMMUNES ===
// =========================================================================
// Au lieu de choisir un mode parmi vingt, le joueur enchaîne huit épreuves sur le thème affiché, de
// plus en plus difficiles, avec TROIS VIES POUR TOUT LE PARCOURS : ce qu'on perd dans une épreuve, on
// ne l'a plus dans la suivante. Les modes deviennent les étapes d'un même voyage.
//
// Aucun moteur de jeu n'est réécrit : chaque épreuve est un mode existant, lancé par sa fonction
// d'origine. Trois points d'accroche seulement, tous dans le code des modes :
//  - `startingLives()` : le nombre de vies au lancement d'une épreuve (3 hors Expédition, ce qu'il
//    reste pendant l'Expédition) ;
//  - `expeditionCap(liste, mode)` : une épreuve est courte (quelques questions), pas une partie entière ;
//  - `expeditionOnStageEnd(gagné)`, appelée par endGame : la fin d'une épreuve rend la main au parcours.
//
// Les jokers se gagnent en route (après la 3e et la 6e épreuve) et ne dépendent d'aucun mode :
// « passer l'épreuve » et « regagner une vie ». « Révéler le siècle » ou « changer la carte » auraient
// demandé un branchement par moteur — voir README.

const EXPEDITION_MAX_LIVES = 3;
// Questions par épreuve (cartes pour la frise, années pour le Fil du temps…).
const EXPEDITION_CAPS = { quiz: 5, avantapres: 5, classic: 6, periodes: 4, intrus: 4, curseur: 4, ordre: 2, ecart: 3, fil: 5 };
// Difficulté croissante : deux épreuves faciles, trois moyennes, trois difficiles.
const EXPEDITION_TIERS = [
    { count: 2, modes: ['quiz', 'avantapres'] },
    { count: 3, modes: ['classic', 'periodes', 'intrus'] },
    { count: 3, modes: ['curseur', 'ordre', 'ecart', 'fil'] }
];
// Épreuves après lesquelles un joker est gagné, et lequel.
const EXPEDITION_JOKER_AFTER = { 3: 'skip', 6: 'life' };
const EXPEDITION_MIN_EVENTS = 12;

let expedition = null; // null hors Expédition

const EXPEDITION_STARTERS = {
    quiz: () => startQuizGame(),
    avantapres: () => startAvapGame(),
    classic: () => startActualGame('classic'),
    periodes: () => startPeriodesGame(),
    intrus: () => startIntrusGame(),
    curseur: () => startCurseurGame(),
    ordre: () => startOrdreGame(),
    ecart: () => startEcartGame(),
    fil: () => startFilGame()
};
const EXPEDITION_TITLES = {
    quiz: 'modes.quiz.title', avantapres: 'modes.avantapres.title', classic: 'modes.classic.title',
    periodes: 'modes.periodes.title', intrus: 'intrus.title', curseur: 'curseur.title',
    ordre: 'ordre.title', ecart: 'modes.ecart.title', fil: 'modes.fil.title'
};
const EXPEDITION_DESCS = {
    quiz: 'modes.quiz.desc', avantapres: 'modes.avantapres.desc', classic: 'modes.classic.desc',
    periodes: 'modes.periodes.desc', intrus: 'intrus.desc', curseur: 'curseur.desc',
    ordre: 'ordre.desc', ecart: 'modes.ecart.desc', fil: 'modes.fil.desc'
};

// --- Points d'accroche des moteurs ----------------------------------------
function startingLives() {
    return expedition && !expedition.finished ? expedition.lives : 3;
}

function expeditionCap(list, modeId) {
    if (!expedition || !expedition.running) return list;
    const cap = EXPEDITION_CAPS[modeId];
    // Mélangé avant de couper : une épreuve ne doit pas toujours tomber sur le début du thème.
    return cap ? shuffleArray([...list]).slice(0, cap) : list;
}

// --- Le tirage du parcours (pur : voir tests/expedition.test.js) ------------
function planExpeditionStages(rng) {
    const random = rng || Math.random;
    const shuffled = (list) => {
        const out = [...list];
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    };
    const stages = [];
    EXPEDITION_TIERS.forEach((tier, tierIndex) => {
        shuffled(tier.modes).slice(0, tier.count).forEach(mode => stages.push({ mode, tier: tierIndex }));
    });
    return stages;
}

// --- Cycle de vie -----------------------------------------------------------
function startExpedition() {
    if (getModePoolRaw().length < EXPEDITION_MIN_EVENTS) {
        showConfirm(t('expedition.not_enough', { count: EXPEDITION_MIN_EVENTS }), null, { alertOnly: true });
        return;
    }
    resetSessionHistory();
    expedition = {
        stages: planExpeditionStages().map(s => ({ ...s, result: null })),
        index: 0,
        lives: EXPEDITION_MAX_LIVES,
        total: 0,
        jokers: { skip: 0, life: 0 },
        earned: null,
        running: false,
        finished: null
    };
    showScreen('screen-expedition', 'forward');
    renderExpedition();
}

function currentExpeditionStage() {
    return expedition ? expedition.stages[expedition.index] : null;
}

function expeditionGo() {
    const stage = currentExpeditionStage();
    if (!expedition || expedition.finished || !stage) return;
    expedition.running = true;
    expedition.earned = null;
    // Un moteur qui manque de matière sur ce thème le dit par une alerte et ne démarre pas : on le détecte
    // plutôt que de laisser le parcours bloqué, et l'épreuve est passée sans pénalité.
    const realAlert = window.alert;
    let refused = false;
    window.alert = () => { refused = true; };
    try { EXPEDITION_STARTERS[stage.mode](); } finally { window.alert = realAlert; }
    if (refused) {
        expedition.running = false;
        stage.result = { skipped: true, unavailable: true, points: 0 };
        advanceExpedition();
    }
}

// Appelée par endGame() au début : true = fin d'épreuve prise en charge (endGame s'arrête là).
function expeditionOnStageEnd(isWin) {
    if (!expedition || !expedition.running) return false;
    expedition.running = false;
    const stage = currentExpeditionStage();
    const points = Math.max(0, Math.round(score));
    expedition.total += points;
    expedition.lives = Math.max(0, Math.min(EXPEDITION_MAX_LIVES, lives));
    const survived = isWin && expedition.lives > 0;
    stage.result = { ok: survived, points };
    if (!survived) {
        expeditionFinish(false);
        return true;
    }
    if (typeof playCorrectSound === 'function') playCorrectSound(1.0);
    advanceExpedition();
    return true;
}

function advanceExpedition() {
    expedition.index += 1;
    const joker = EXPEDITION_JOKER_AFTER[expedition.index];
    if (joker) {
        expedition.jokers[joker] += 1;
        expedition.earned = joker;
    }
    if (expedition.index >= expedition.stages.length) {
        expeditionFinish(true);
        return;
    }
    showScreen('screen-expedition', 'forward');
    renderExpedition();
}

function expeditionUseJoker(kind) {
    if (!expedition || expedition.finished || expedition.running || expedition.jokers[kind] < 1) return;
    if (kind === 'life') {
        if (expedition.lives >= EXPEDITION_MAX_LIVES) return;
        expedition.jokers.life -= 1;
        expedition.lives += 1;
        expedition.earned = null;
        renderExpedition();
    } else if (kind === 'skip') {
        expedition.jokers.skip -= 1;
        currentExpeditionStage().result = { skipped: true, points: 0 };
        advanceExpedition();
    }
}

function expeditionFinish(won) {
    expedition.finished = { won };
    // L'XP est versée une fois, à la fin du parcours (les épreuves n'en versent pas : voir endGame).
    const done = expedition.stages.filter(s => s.result && s.result.ok).length;
    let xp = Math.round(expedition.total * 0.5) + done * 10 + (won ? 150 : 0);
    if (typeof awardXP === 'function') {
        const info = awardXP(xp, 'Expédition');
        if (typeof addRecapLogEntry === 'function') addRecapLogEntry(info ? info.xpAwarded : 0, won ? 1 : 0);
    }
    if (won) { playVictorySound(); triggerHaptic('victory'); triggerConfetti(); } else { triggerHaptic('error'); }
    showScreen('screen-expedition', 'forward');
    renderExpedition();
}

// Renvoie true si une expédition était en cours (et l'abandonne) : voir quitGame.
function expeditionAbort() {
    if (!expedition) return false;
    expedition = null;
    return true;
}

function expeditionQuit() {
    const leave = () => { expeditionAbort(); showScreen('screen-modes', 'back'); };
    if (!expedition || expedition.finished) { leave(); return; }
    showConfirm(t('expedition.confirm_quit'), leave);
}

// --- Écran du parcours ------------------------------------------------------
function expeditionStageIcon(stage, i) {
    if (stage.result && stage.result.skipped) return '⏭';
    if (stage.result && stage.result.ok) return '✓';
    if (stage.result) return '✗';
    return i === expedition.index && !expedition.finished ? '●' : '○';
}

function renderExpedition() {
    if (!expedition) return;
    const total = expedition.stages.length;
    const finished = !!expedition.finished;
    document.getElementById('expedition-subtitle').innerText = finished
        ? ''
        : t('expedition.subtitle', { n: Math.min(expedition.index + 1, total), total });

    const track = document.getElementById('expedition-track');
    track.innerHTML = '';
    expedition.stages.forEach((stage, i) => {
        const li = document.createElement('li');
        const current = i === expedition.index && !finished;
        li.className = 'expedition-stage tier-' + stage.tier + (current ? ' is-current' : '') + (stage.result ? ' is-done' : '');
        if (current) li.setAttribute('aria-current', 'step');
        li.innerHTML = '<span class="expedition-stage-icon" aria-hidden="true"></span><span class="expedition-stage-name"></span>';
        li.querySelector('.expedition-stage-icon').innerText = expeditionStageIcon(stage, i);
        li.querySelector('.expedition-stage-name').innerText = t(EXPEDITION_TITLES[stage.mode]);
        track.appendChild(li);
    });

    let pips = '';
    for (let i = 0; i < EXPEDITION_MAX_LIVES; i++) pips += `<span class="pip${i < expedition.lives ? '' : ' spent'}"></span>`;
    const livesEl = document.getElementById('expedition-lives');
    livesEl.innerHTML = pips;
    livesEl.setAttribute('aria-label', t('expedition.lives_aria', { count: expedition.lives }));
    document.getElementById('expedition-score').innerText = expedition.total;

    document.getElementById('expedition-next').classList.toggle('hidden', finished);
    document.getElementById('expedition-final').classList.toggle('hidden', !finished);

    if (finished) {
        const done = expedition.stages.filter(s => s.result && s.result.ok).length;
        const skipped = expedition.stages.filter(s => s.result && s.result.skipped).length;
        document.getElementById('expedition-final-title').innerText = t(expedition.finished.won ? 'expedition.won_title' : 'expedition.lost_title');
        document.getElementById('expedition-final-text').innerText = t('expedition.final_text', {
            done, total, skipped, score: expedition.total, lives: expedition.lives
        });
        document.getElementById('expedition-share').focus();
        return;
    }

    const stage = currentExpeditionStage();
    document.getElementById('expedition-next-kicker').innerText = t('expedition.stage_kicker', { n: expedition.index + 1, total });
    document.getElementById('expedition-next-title').innerText = t(EXPEDITION_TITLES[stage.mode]);
    document.getElementById('expedition-next-desc').innerText = t(EXPEDITION_DESCS[stage.mode]);
    const go = document.getElementById('expedition-go');
    go.innerText = t('expedition.go');

    const jokers = document.getElementById('expedition-jokers');
    jokers.innerHTML = '';
    if (expedition.earned) {
        const earned = document.createElement('p');
        earned.className = 'expedition-earned';
        earned.setAttribute('role', 'status');
        earned.innerText = t('expedition.joker_earned_' + expedition.earned);
        jokers.appendChild(earned);
    }
    [['skip', 'expedition.joker_skip', true], ['life', 'expedition.joker_life', expedition.lives < EXPEDITION_MAX_LIVES]].forEach(([kind, key, usable]) => {
        const count = expedition.jokers[kind];
        if (count < 1) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn expedition-joker';
        btn.dataset.joker = kind;
        btn.disabled = !usable;
        btn.innerText = t(key, { count });
        btn.onclick = () => expeditionUseJoker(kind);
        jokers.appendChild(btn);
    });
    go.focus();
}

// --- Partage ----------------------------------------------------------------
function expeditionShareText() {
    const theme = getCurrentTheme();
    const row = expedition.stages.map(s => (s.result && s.result.skipped) ? '⏭' : (s.result && s.result.ok) ? '🟩' : s.result ? '🟥' : '⬜').join('');
    return t('expedition.share', {
        theme: theme ? theme.nom : t('expedition.title'),
        row, score: expedition.total, lives: expedition.lives
    });
}

async function expeditionShare() {
    if (!expedition || !expedition.finished) return;
    const text = expeditionShareText();
    if (navigator.share) {
        try {
            await navigator.share({ title: 'HistoriAxe', text });
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }
    copyToClipboardFallback(text);
}
