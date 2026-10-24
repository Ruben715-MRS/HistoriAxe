// =========================================================================
// === LA GÉNÉALOGIE BIBLIQUE (écran de la boîte à outils) ===
// =========================================================================
// Un seul arbre horizontal, d'Adam aux enfants de Jacob : une carte par personne (fond bleu clair pour les hommes, rose clair pour les
// femmes), des traits coudés entre parents et enfants, des pointillés pour les descendants lointains. Deux boutons collés en haut à droite
// choisissent la langue des noms : « A » (français, par défaut) ou « א » (hébreu). Les données et la mise en page sont dans
// js/genealogyCore.js (testé). Tout le texte passe par textContent.

const GEN_CARD_W = 132;
const GEN_COL_STEP = 166;
const GEN_ZOOMS = [0.4, 0.55, 0.7, 0.85, 1, 1.25];
let genLang = 'fr';
let genZoomIdx = 4;
let genCollapsed = {};
let genBuilt = false;
let genHeights = {};
let genFocus = '';

try { if (localStorage.getItem('genealogyLang') === 'he') genLang = 'he'; } catch (e) { /* stockage indisponible */ }

function genName(p) { return genLang === 'he' ? p.he : p.fr; }

function toolGenealogyInit() {
    if (!genBuilt) {
        genBuilt = true;
        document.getElementById('gen-search').addEventListener('input', genOnSearch);
    }
    genApplyLangButtons();
    genRender();
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
    p.unions.forEach(u => {
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
    const L = GenealogyCore.layout(genCollapsed, id => genHeights[id], { colStep: GEN_COL_STEP, cardWidth: GEN_CARD_W, gap: 10 });
    const scale = GEN_ZOOMS[genZoomIdx];
    const sizer = document.getElementById('gen-sizer');
    const stage = document.getElementById('gen-stage');
    sizer.style.width = Math.ceil(L.width * scale + 24) + 'px';
    sizer.style.height = Math.ceil(L.height * scale + 24) + 'px';
    stage.style.width = L.width + 'px';
    stage.style.height = L.height + 'px';
    stage.style.transform = 'scale(' + scale + ')';
    while (stage.firstChild) stage.removeChild(stage.firstChild);

    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'gen-lines');
    svg.setAttribute('width', String(L.width));
    svg.setAttribute('height', String(L.height));
    svg.setAttribute('aria-hidden', 'true');
    L.edges.forEach(e => {
        const a = L.nodes[e.from], b = L.nodes[e.to];
        const x1 = a.x + GEN_CARD_W, x2 = b.x, mid = x1 + (x2 - x1) / 2;
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', 'M' + x1 + ' ' + a.cy + ' H' + mid + ' V' + b.cy + ' H' + x2);
        path.setAttribute('class', 'gen-line' + (e.far ? ' is-far' : ''));
        svg.appendChild(path);
    });
    stage.appendChild(svg);

    Object.keys(L.nodes).forEach(id => {
        const n = L.nodes[id];
        const p = GenealogyCore.byId(id);
        const card = genBuildCard(p);
        card.style.left = n.x + 'px';
        card.style.top = n.top + 'px';
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
            btn.onclick = () => { genCollapsed[id] = open; genRender(); };
            card.appendChild(btn);
        }
        stage.appendChild(card);
    });
    stage._layout = L;
}

function genZoom(delta) {
    const next = Math.min(GEN_ZOOMS.length - 1, Math.max(0, genZoomIdx + delta));
    if (next === genZoomIdx) return;
    genZoomIdx = next;
    genRender();
}

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
    const n = document.getElementById('gen-stage')._layout.nodes[target];
    const view = document.getElementById('gen-view');
    const scale = GEN_ZOOMS[genZoomIdx];
    view.scrollTo({ left: Math.max(0, n.x * scale - view.clientWidth / 3), top: Math.max(0, n.cy * scale - view.clientHeight / 2) });
}
