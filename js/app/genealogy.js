// =========================================================================
// === LA GÉNÉALOGIE BIBLIQUE (écran de la boîte à outils) ===
// =========================================================================
// Un seul arbre, d'Adam aux enfants de Jacob (vertical par défaut, Adam centré en haut ; le bouton 🔄 passe à l'horizontal) : une carte par personne (fond bleu clair pour les hommes, rose clair pour les
// femmes), des traits coudés entre parents et enfants, des pointillés pour les descendants lointains. Deux boutons collés en haut à droite
// choisissent la langue des noms : « A » (français, par défaut) ou « א » (hébreu). Les données et la mise en page sont dans
// js/genealogyCore.js (testé). Tout le texte passe par textContent.

const GEN_CARD_W = 132;
const GEN_COL_STEP = 166;
const GEN_GAP = 10;
const GEN_ROW_GAP = 26;
const GEN_ZOOMS = [0.4, 0.55, 0.7, 0.85, 1, 1.25];
let genLang = 'fr';
let genDir = 'v';
let genBoxes = {};
let genZoomIdx = 4;
let genCollapsed = {};
let genBuilt = false;
let genHeights = {};
let genFocus = '';

// Un choix déjà fait par le joueur (bouton 🔄) est mémorisé ; sans choix, le sens dépend de l'écran : sur un téléphone
// en portrait, l'arbre s'ouvre à l'horizontale (Adam à gauche, on lit de gauche à droite).
let genDirChosen = false;
try {
    if (localStorage.getItem('genealogyLang') === 'he') genLang = 'he';
    const savedDir = localStorage.getItem('genealogyDir');
    if (savedDir === 'h' || savedDir === 'v') { genDir = savedDir; genDirChosen = true; }
} catch (e) { /* stockage indisponible */ }

function genDefaultDir() {
    if (genDirChosen) return genDir;
    const phonePortrait = typeof window.matchMedia === 'function'
        && window.matchMedia('(max-width: 600px) and (orientation: portrait)').matches;
    return phonePortrait ? 'h' : 'v';
}

function genName(p) { return genLang === 'he' ? p.he : p.fr; }

function toolGenealogyInit() {
    if (!genBuilt) {
        genBuilt = true;
        document.getElementById('gen-search').addEventListener('input', genOnSearch);
    }
    genDir = genDefaultDir();
    genApplyLangButtons();
    genApplyDirButton();
    // À l'ouverture : Adam et ses trois fils, les autres branches repliées.
    genCollapseAll();
    genScrollTo('adam');
}

function genApplyDirButton() {
    const btn = document.getElementById('gen-dir');
    const label = t(genDir === 'v' ? 'tools.genealogy_dir_to_h' : 'tools.genealogy_dir_to_v');
    btn.setAttribute('aria-label', label);
    btn.title = label;
}

// Le sens de l'arbre : vertical (Adam en haut, par défaut) ou horizontal (Adam à gauche). Le choix est mémorisé.
function genToggleDir() {
    genDir = genDir === 'v' ? 'h' : 'v';
    genDirChosen = true;
    try { localStorage.setItem('genealogyDir', genDir); } catch (e) { /* stockage indisponible */ }
    genApplyDirButton();
    genRender();
    genScrollTo('adam');
}

function genApplyLangButtons() {
    document.getElementById('gen-lang-fr').setAttribute('aria-pressed', genLang === 'fr' ? 'true' : 'false');
    document.getElementById('gen-lang-he').setAttribute('aria-pressed', genLang === 'he' ? 'true' : 'false');
    const view = document.getElementById('gen-view');
    view.setAttribute('lang', genLang);
}

function genSetLang(lang) {
    genLang = lang === 'he' ? 'he' : 'fr';
    try { localStorage.setItem('genealogyLang', genLang); } catch (e) { /* stockage indisponible */ }
    genApplyLangButtons();
    genRender();
}

// Les mentions de la carte (mère, concubine…) suivent la langue choisie.
const GEN_HE = { mother: 'אמו:', concubinage: 'פילגש', interdite: 'נישואין אסורים', ex: 'מת בכנען' };
function genWord(key) { return genLang === 'he' ? GEN_HE[key] : t('tools.genealogy_' + ({ concubinage: 'concubine', interdite: 'forbidden' }[key] || key)); }

function genUnionLabel(kind) {
    return kind === 'concubinage' || kind === 'interdite' ? genWord(kind) : '';
}

// Les conjoints d'une personne : ses propres unions, et pour une femme, le mari qui la déclare (même union, vue des deux côtés).
function genSpouses(p) {
    const out = p.unions.slice();
    if (p.sex === 'f') {
        GenealogyCore.PEOPLE.forEach(q => q.unions.forEach(u => {
            if (u[0] === p.id && !out.some(o => o[0] === q.id)) out.push([q.id, u[1]]);
        }));
    }
    return out;
}

function genBuildCard(p) {
    const card = document.createElement('div');
    card.className = 'gen-card ' + (p.sex === 'f' ? 'is-woman' : 'is-man') + (p.far ? ' is-far' : '') + (p.ex ? ' is-ex' : '');
    card.dataset.id = p.id;
    card.setAttribute('lang', genLang);
    const name = document.createElement('div');
    name.className = 'gen-name';
    name.textContent = genName(p);
    if (p.nation) {
        const n = document.createElement('span');
        n.className = 'gen-nation';
        n.textContent = String(p.nation);
        n.title = t('tools.genealogy_nation', { n: p.nation });
        name.appendChild(n);
    }
    card.appendChild(name);
    if (p.mother) {
        const mo = GenealogyCore.byId(p.mother);
        const tag = document.createElement('div');
        tag.className = 'gen-mother';
        tag.textContent = genWord('mother') + ' ' + genName(mo);
        card.appendChild(tag);
    }
    genSpouses(p).forEach(u => {
        const partner = GenealogyCore.byId(u[0]);
        const chip = document.createElement('div');
        chip.className = 'gen-spouse ' + (partner.sex === 'f' ? 'is-woman' : 'is-man');
        const label = genUnionLabel(u[1]);
        chip.textContent = '⚭ ' + genName(partner) + (label ? ' (' + label + ')' : '');
        card.appendChild(chip);
    });
    if (p.ex) {
        const ex = document.createElement('div');
        ex.className = 'gen-mother';
        ex.textContent = genWord('ex');
        card.appendChild(ex);
    }
    return card;
}

function genMeasure() {
    const probe = document.createElement('div');
    probe.className = 'gen-stage gen-probe';
    probe.setAttribute('aria-hidden', 'true');
    document.getElementById('gen-view').appendChild(probe);
    genHeights = {};
    GenealogyCore.PEOPLE.forEach(p => {
        const card = genBuildCard(p);
        probe.appendChild(card);
        genHeights[p.id] = card.offsetHeight || 40;
    });
    probe.remove();
}

function genRender() {
    genMeasure();
    const vertical = genDir === 'v';
    const L = GenealogyCore.layout(genCollapsed, id => (vertical ? GEN_CARD_W + GEN_GAP : genHeights[id]),
        { colStep: GEN_COL_STEP, cardWidth: GEN_CARD_W, gap: GEN_GAP });
    let maxDepth = 0;
    Object.keys(L.nodes).forEach(id => { maxDepth = Math.max(maxDepth, L.nodes[id].depth); });
    // En vertical, chaque génération a la hauteur de sa plus haute carte : pas de vide entre deux générations.
    const rowTop = [];
    let rowsHeight = 0;
    if (vertical) {
        const rowH = [];
        Object.keys(L.nodes).forEach(id => { const d = L.nodes[id].depth; rowH[d] = Math.max(rowH[d] || 0, genHeights[id]); });
        for (let d = 0; d <= maxDepth; d++) { rowTop[d] = rowsHeight; rowsHeight += rowH[d] + GEN_ROW_GAP; }
        rowsHeight -= GEN_ROW_GAP;
    }

    // Une boîte par personne, dans le sens choisi : en vertical, la génération descend et les frères se rangent à côté.
    genBoxes = {};
    Object.keys(L.nodes).forEach(id => {
        const n = L.nodes[id];
        genBoxes[id] = vertical
            ? { left: n.cy - GEN_CARD_W / 2, top: rowTop[n.depth], w: GEN_CARD_W, h: genHeights[id] }
            : { left: n.x, top: n.top, w: GEN_CARD_W, h: genHeights[id] };
    });
    const width = vertical ? L.height : L.width;
    const height = vertical ? rowsHeight : L.height;

    const scale = GEN_ZOOMS[genZoomIdx];
    const sizer = document.getElementById('gen-sizer');
    const stage = document.getElementById('gen-stage');
    sizer.style.width = Math.ceil(width * scale + 24) + 'px';
    sizer.style.height = Math.ceil(height * scale + 24) + 'px';
    stage.style.width = width + 'px';
    stage.style.height = height + 'px';
    stage.style.transform = 'scale(' + scale + ')';
    stage.classList.toggle('is-vertical', vertical);
    while (stage.firstChild) stage.removeChild(stage.firstChild);

    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'gen-lines');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('aria-hidden', 'true');
    L.edges.forEach(e => {
        const a = genBoxes[e.from], b = genBoxes[e.to];
        let d;
        if (vertical) {
            const x1 = a.left + a.w / 2, y1 = a.top + a.h, x2 = b.left + b.w / 2, y2 = b.top, mid = y1 + (y2 - y1) / 2;
            d = 'M' + x1 + ' ' + y1 + ' V' + mid + ' H' + x2 + ' V' + y2;
        } else {
            const x1 = a.left + a.w, y1 = a.top + a.h / 2, x2 = b.left, y2 = b.top + b.h / 2, mid = x1 + (x2 - x1) / 2;
            d = 'M' + x1 + ' ' + y1 + ' H' + mid + ' V' + y2 + ' H' + x2;
        }
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', 'gen-line' + (e.far ? ' is-far' : ''));
        svg.appendChild(path);
    });
    stage.appendChild(svg);

    Object.keys(L.nodes).forEach(id => {
        const b = genBoxes[id];
        const p = GenealogyCore.byId(id);
        const card = genBuildCard(p);
        card.style.left = b.left + 'px';
        card.style.top = b.top + 'px';
        card.style.width = GEN_CARD_W + 'px';
        if (id === genFocus) card.classList.add('is-focus');
        const kids = GenealogyCore.childrenOf(id);
        if (kids.length) {
            const open = !genCollapsed[id];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'gen-toggle';
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            btn.setAttribute('aria-label', t(open ? 'tools.genealogy_fold' : 'tools.genealogy_unfold', { name: genName(p) }));
            btn.textContent = open ? '−' : '+' + GenealogyCore.descendantsCount(id);
            btn.onclick = () => {
                genCollapsed[id] = open;
                genRender();
                // Une branche qu'on déplie se montre tout de suite, au lieu de devoir être cherchée au doigt.
                if (!open) genRevealChildren(id);
            };
            card.appendChild(btn);
        }
        stage.appendChild(card);
    });
}

// Fait défiler la vue pour centrer une personne (Adam au départ, la personne cherchée ensuite).
function genScrollTo(id) {
    const b = genBoxes[id];
    if (!b) return;
    const view = document.getElementById('gen-view');
    const scale = GEN_ZOOMS[genZoomIdx];
    view.scrollTo({
        left: Math.max(0, (b.left + b.w / 2) * scale - view.clientWidth / 2),
        top: Math.max(0, (b.top + b.h / 2) * scale - view.clientHeight / 3)
    });
}

// Amène à l'écran les enfants d'une branche qu'on vient de déplier : la vue se déplace (le minimum possible), et si la
// branche est plus grande que l'écran, son début s'aligne sur le bord. Pas utilisé par « Tout déplier ».
function genRevealChildren(id) {
    const kids = GenealogyCore.childrenOf(id).filter(k => genBoxes[k]);
    if (!kids.length) return;
    const scale = GEN_ZOOMS[genZoomIdx];
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    kids.forEach(k => {
        const bx = genBoxes[k];
        l = Math.min(l, bx.left); t = Math.min(t, bx.top);
        r = Math.max(r, bx.left + bx.w); b = Math.max(b, bx.top + bx.h);
    });
    const view = document.getElementById('gen-view');
    const pad = 12;
    const place = (start, end, current, size) => {
        if (end - start > size) return start - pad;
        if (start < current) return start - pad;
        if (end > current + size) return end - size + pad;
        return current;
    };
    const left = place(l * scale, r * scale, view.scrollLeft, view.clientWidth);
    const top = place(t * scale, b * scale, view.scrollTop, view.clientHeight);
    view.scrollTo({ left: Math.max(0, left), top: Math.max(0, top), behavior: 'smooth' });
}

function genZoom(delta) {
    const next = Math.min(GEN_ZOOMS.length - 1, Math.max(0, genZoomIdx + delta));
    if (next === genZoomIdx) return;
    genZoomIdx = next;
    genRender();
}

// Replie toutes les branches sauf celle d'Adam, pour que l'arbre s'ouvre sur Adam et ses fils.
function genCollapseAll() {
    genCollapsed = {};
    GenealogyCore.parentsIds().forEach(id => { if (id !== 'adam') genCollapsed[id] = true; });
    genRender();
}

function genExpandAll() {
    genCollapsed = {};
    genRender();
}

function genOnSearch() {
    const box = document.getElementById('gen-results');
    while (box.firstChild) box.removeChild(box.firstChild);
    const found = GenealogyCore.search(document.getElementById('gen-search').value, 8);
    found.forEach(p => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'gen-result ' + (p.sex === 'f' ? 'is-woman' : 'is-man');
        b.textContent = genName(p);
        b.onclick = () => genGoTo(p.id);
        li.appendChild(b);
        box.appendChild(li);
    });
}

// Va à une personne : déplie ses ancêtres (une femme sans père : son conjoint), la centre et la met en valeur.
function genGoTo(id) {
    let target = id;
    const p = GenealogyCore.byId(target);
    if (p && !p.father && p.id !== 'adam') {
        const husband = GenealogyCore.PEOPLE.find(q => q.unions.some(u => u[0] === p.id));
        if (husband) target = husband.id;
    }
    GenealogyCore.ancestorsOf(target).forEach(a => { delete genCollapsed[a]; });
    delete genCollapsed[target];
    genFocus = target;
    document.getElementById('gen-search').value = '';
    genOnSearch();
    genRender();
    genScrollTo(target);
}
