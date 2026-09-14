// =========================================================================
// === HISTORIAXE — CARTES MENTALES (FICHES DE RÉVISION DÉPLIABLES) ======
// =========================================================================

// Un thème peut porter, en plus de ses événements, une carte mentale :
// une fiche de synthèse organisée en branches dépliables (voir le champ
// facultatif `carteMentale` dans data/<lang>.json, et sa validation dans
// tests/data-schema.test.js). Elle ne remplace pas la frise — elle donne
// la structure thématique que la frise, ordonnée par dates, ne montre
// jamais : ce qui se joue en parallèle, les notions transversales, les
// séries d'exemples comparables d'un empire à l'autre.
//
// Le rendu n'embarque aucun HTML venu du pack de données : la donnée est
// du texte (avec un seul marqueur d'emphase **gras**), mis en forme ici.
// C'est ce qui permet à une carte mentale de suivre automatiquement le
// thème clair/sombre, le réglage de taille de texte et la langue de
// l'interface, là où un document HTML autonome resterait figé.

// Chaque branche peut déclarer une `couleur` parmi la palette d'axes de
// js/app.js (AXIS_PALETTE) ; à défaut, elle prend celle de son rang.
const MINDMAP_FALLBACK_COLORS = ['blue', 'green', 'orange', 'purple', 'red', 'teal', 'gold', 'pink'];

const MINDMAP_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function romanNumeral(index) {
    return MINDMAP_ROMAN[index] || String(index + 1);
}

function themeHasMindMap(theme) {
    return !!(theme && theme.carteMentale && Array.isArray(theme.carteMentale.branches)
        && theme.carteMentale.branches.length > 0);
}

// Texte de donnée → HTML : échappement complet, puis le seul balisage
// autorisé (**gras**). Volontairement minimal — la donnée reste lisible
// telle quelle dans le pack de langue, et rien d'exécutable ne peut y
// être glissé.
function renderMindMapText(text) {
    return escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

// Ouvre la carte mentale du thème courant. Le retour se fait vers l'écran
// des modes : la carte est une façon de réviser le thème, pas une partie.
function openMindMap() {
    const theme = getCurrentTheme();
    if (!themeHasMindMap(theme)) return;
    renderMindMap(theme);
    showScreen('screen-mindmap', 'forward');
}

function renderMindMap(theme) {
    const carte = theme.carteMentale;

    const titleEl = document.getElementById('mindmap-title');
    if (titleEl) titleEl.innerText = theme.nom;

    const subtitleEl = document.getElementById('mindmap-subtitle');
    if (subtitleEl) {
        subtitleEl.innerText = carte.sousTitre || '';
        subtitleEl.classList.toggle('hidden', !carte.sousTitre);
    }

    const espritEl = document.getElementById('mindmap-esprit');
    if (espritEl) {
        espritEl.innerHTML = carte.esprit ? renderMindMapText(carte.esprit) : '';
        espritEl.classList.toggle('hidden', !carte.esprit);
    }

    const container = document.getElementById('mindmap-branches');
    if (!container) return;
    container.innerHTML = '';

    carte.branches.forEach((branch, index) => {
        container.appendChild(buildMindMapBranch(theme, branch, index));
    });
}

function buildMindMapBranch(theme, branch, index) {
    const details = document.createElement('details');
    details.className = 'mindmap-branch';
    details.dataset.axis = branch.couleur || MINDMAP_FALLBACK_COLORS[index % MINDMAP_FALLBACK_COLORS.length];
    // Première branche ouverte d'entrée : l'écran ne s'ouvre jamais sur
    // une simple liste de titres fermés, dont on ne devine pas le contenu.
    details.open = index === 0;

    const summary = document.createElement('summary');
    summary.innerHTML = `<span class="mindmap-branch-num">${romanNumeral(index)}.</span>`
        + `<span class="mindmap-branch-title">${escapeHtml(branch.titre)}</span>`;
    details.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'mindmap-branch-body';

    if (branch.intro) {
        const intro = document.createElement('p');
        intro.className = 'mindmap-branch-intro';
        intro.innerHTML = renderMindMapText(branch.intro);
        body.appendChild(intro);
    }

    (branch.sousBranches || []).forEach(sub => {
        body.appendChild(buildMindMapSubBranch(theme, sub));
    });

    if (Array.isArray(branch.reperes)) {
        body.appendChild(buildMindMapTimeline(theme, branch.reperes));
    }

    // Axe de révision de la branche : proposé une seule fois, en bas de
    // branche, et seulement s'il n'est pas déjà porté par l'une de ses
    // sous-branches (sinon le même bouton apparaîtrait deux fois de suite).
    const subAxes = (branch.sousBranches || []).map(sub => sub.axe).filter(Boolean);
    if (branch.axe && !subAxes.includes(branch.axe)) {
        const chip = buildMindMapAxisChip(theme, branch.axe);
        if (chip) body.appendChild(chip);
    }

    details.appendChild(body);
    return details;
}

function buildMindMapSubBranch(theme, sub) {
    const details = document.createElement('details');
    details.className = 'mindmap-sub';

    const summary = document.createElement('summary');
    summary.innerText = sub.titre;
    details.appendChild(summary);

    const wrap = document.createElement('div');
    wrap.className = 'mindmap-sub-body';

    const list = document.createElement('ul');
    list.className = 'mindmap-items';
    (sub.items || []).forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = renderMindMapText(item);
        list.appendChild(li);
    });
    wrap.appendChild(list);

    if (sub.axe) {
        const chip = buildMindMapAxisChip(theme, sub.axe);
        if (chip) wrap.appendChild(chip);
    }

    details.appendChild(wrap);
    return details;
}

// Repères chronologiques : une branche peut lister des jalons datés plutôt
// que des sous-branches. Ceux qui correspondent à un événement du thème
// ouvrent sa fiche (même modale que depuis la frise) — la carte mentale
// renvoie ainsi vers le contenu joué, au lieu de le dupliquer. Les autres
// (antérieurs au thème, ou hors de ses 50 événements) restent du texte.
function buildMindMapTimeline(theme, reperes) {
    const list = document.createElement('dl');
    list.className = 'mindmap-timeline';

    reperes.forEach(repere => {
        const dt = document.createElement('dt');
        dt.innerText = repere.date;
        list.appendChild(dt);

        const dd = document.createElement('dd');
        const event = repere.eventId ? theme.events.find(e => e.id === repere.eventId) : null;
        if (event) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mindmap-repere-link';
            btn.innerText = repere.texte;
            btn.onclick = () => openModal(event);
            dd.appendChild(btn);
        } else {
            dd.innerText = repere.texte;
        }
        list.appendChild(dd);
    });

    return list;
}

// Passerelle vers le jeu : réviser l'axe correspondant à ce qu'on vient de
// lire. On prépare le même état que l'écran des axes (voir js/app.js:
// confirmAxesSelection) plutôt qu'un chemin parallèle, pour que les modes,
// les scores et le retour arrière se comportent exactement pareil.
function buildMindMapAxisChip(theme, axe) {
    if (!theme.events.some(e => e.axe === axe)) return null;

    const color = getAxisColor(axe);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mindmap-axis-chip';
    btn.dataset.axis = color ? color.name : 'blue';
    btn.innerHTML = `<span class="mindmap-axis-chip-icon" aria-hidden="true">⟳</span>`
        + `<span>${escapeHtml(t('mindmap.revise_axis', { axe }))}</span>`;
    btn.onclick = () => {
        essentialFilterActive = false;
        axisFilterActive = true;
        selectedAxes = new Set([axe]);
        showScreen('screen-modes', 'back');
    };
    return btn;
}

function setAllMindMapBranches(open) {
    document.querySelectorAll('#screen-mindmap details').forEach(d => { d.open = open; });
}

// --- POINT D'ENTRÉE (carte injectée dans l'écran des modes de jeu) ---
// Appelé par js/app.js: showScreen('screen-modes'). La carte n'apparaît
// que pour un thème qui en propose une, et jamais en session de révision
// (qui traverse plusieurs thèmes : il n'y a alors pas de thème courant
// dont afficher la fiche).
function refreshMindMapModeCard() {
    const card = document.getElementById('mode-card-mindmap');
    if (!card) return;
    const theme = revisionMode ? null : getCurrentTheme();
    card.classList.toggle('hidden', !themeHasMindMap(theme));
}
