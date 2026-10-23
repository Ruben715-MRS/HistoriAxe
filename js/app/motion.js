// MOUVEMENT — ce qui ne se règle pas en CSS seul : glissement des repères de la frise quand une carte
// vient d'être posée, cascade d'une nouvelle question, rebond du score, vie perdue.
// Tout le reste (écrans, modales, panneaux dévoilés, listes) est dans css/style.css, section « MOUVEMENT ».
// Chaque fonction respecte « réduire les animations » : elle ne fait alors rien, et l'état final est déjà là.

const MOTION_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

function motionReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// --- FRISE : les repères glissent vers leur nouvelle place ---------------------------------------------
// renderTimeline() reconstruit toute la colonne, si bien que poser une carte décalait tout ce qui suit
// d'un seul coup. On note donc où se trouvait chaque repère et chaque intervalle avant la reconstruction
// (clé = data-flip), puis on les fait glisser de leur ancienne place à la nouvelle (technique « FLIP »).
// Ce qui n'existait pas avant (la carte posée a sa propre animation CSS ; les deux intervalles qu'elle crée
// se déploient en fondu) n'a pas d'ancienne place et ne glisse pas.
function timelineFlipSnapshot(timeline) {
    const rects = new Map();
    if (!timeline || motionReduced()) return rects;
    timeline.querySelectorAll('[data-flip]').forEach(el => rects.set(el.dataset.flip, el.getBoundingClientRect()));
    return rects;
}

function timelineFlipPlay(timeline, before) {
    if (!timeline || !before.size) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    timeline.querySelectorAll('[data-flip]').forEach(el => {
        const old = before.get(el.dataset.flip);
        if (!old) {
            if (el.classList.contains('slot')) el.classList.add('slot-new');
            return;
        }
        const now = el.getBoundingClientRect();
        const dx = old.left - now.left;
        const dy = old.top - now.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        // Hors de l'écran des deux côtés : personne ne le verrait glisser.
        if ((old.bottom < 0 && now.bottom < 0) || (old.top > vh && now.top > vh)) return;
        if ((old.right < 0 && now.right < 0) || (old.left > vw && now.left > vw)) return;
        el.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
            { duration: 460, easing: MOTION_EASE }
        );
    });
}

// --- QUESTIONS : une nouvelle question arrive en cascade -----------------------------------------------
// Appelée par chaque mode de jeu au moment où il affiche la question suivante : la carte-question d'abord,
// puis ses réponses l'une après l'autre. Les conteneurs de réponses (…-options, …-cards) cèdent leurs
// enfants, pour que ce soient les boutons eux-mêmes qui arrivent, et non le bloc d'un seul tenant.
function animateQuestionIn(screenId) {
    if (motionReduced()) return;
    const screen = document.getElementById(screenId);
    if (!screen) return;
    const body = screen.querySelector('.quiz-body, .periodes-body, .avap-body, .fil-body');
    if (!body) return;
    const units = [];
    Array.from(body.children).forEach(child => {
        if (child.classList.contains('hidden')) return;
        if (/(?:^|-)(?:options|cards)$/.test(child.id || '') || /(?:^|-)options$/.test(child.className)) {
            units.push(...Array.from(child.children));
        } else {
            units.push(child);
        }
    });
    units.forEach(el => el.classList.remove('stagger-in'));
    void body.offsetWidth; // un seul reflow : l'animation repart de zéro pour tous
    units.forEach((el, i) => {
        el.style.setProperty('--stagger-i', Math.min(i, 8));
        el.classList.add('stagger-in');
    });
}

// Cascade sur les enfants d'un conteneur que le JS vient de remplir (liste construite à la demande).
function applyCascade(container) {
    if (!container) return;
    container.classList.add('fx-cascade');
}

// --- HUD : le score rebondit, une vie perdue se gonfle -------------------------------------------------
// Un seul observateur pour tous les modes : leurs bandeaux ont des identifiants régulier (…hud-score,
// …hud-lives) et sont réécrits d'un bloc à chaque changement.
function initMotion() {
    if (typeof MutationObserver === 'undefined') return;
    const scoreObserver = new MutationObserver(mutations => {
        mutations.forEach(m => {
            const el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
            if (!el) return;
            const text = el.textContent;
            const previous = el.dataset.motionValue;
            el.dataset.motionValue = text;
            if (previous === undefined || previous === text || motionReduced()) return;
            // Seule une hausse mérite le coup de projecteur (le score repart de 0 à chaque partie).
            if (!(parseFloat(text) > parseFloat(previous))) return;
            replayAnimClass(el, 'score-bump');
        });
    });
    document.querySelectorAll('[id$="hud-score"]').forEach(el => {
        el.dataset.motionValue = el.textContent;
        scoreObserver.observe(el, { childList: true, characterData: true, subtree: true });
    });

    const livesObserver = new MutationObserver(mutations => {
        mutations.forEach(m => {
            const el = m.target;
            const spentPips = Array.from(el.querySelectorAll('.pip.spent'));
            const spent = spentPips.length;
            // En multijoueur, le bandeau change de joueur : ses vies ne sont pas celles du précédent.
            const owner = (el.querySelector('.multi-player-hud') || {}).textContent || '';
            const previous = el.dataset.motionSpent === undefined || el.dataset.motionOwner !== owner
                ? null : Number(el.dataset.motionSpent);
            el.dataset.motionSpent = String(spent);
            el.dataset.motionOwner = owner;
            if (previous === null || spent <= previous || motionReduced()) return;
            // Les pastilles se vident de droite à gauche : les vides forment la fin de la rangée, et les
            // `spent - previous` premiers d'entre eux sont ceux qui viennent de se vider.
            spentPips.slice(0, spent - previous).forEach(p => p.classList.add('pip-lost'));
        });
    });
    document.querySelectorAll('[id$="hud-lives"]').forEach(el => {
        el.dataset.motionSpent = String(el.querySelectorAll('.pip.spent').length);
        el.dataset.motionOwner = (el.querySelector('.multi-player-hud') || {}).textContent || '';
        livesObserver.observe(el, { childList: true });
    });
}
