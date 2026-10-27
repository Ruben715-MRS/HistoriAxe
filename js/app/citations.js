// =========================================================================
// === LES CITATIONS (écrans de l'Atelier) ===
// =========================================================================
// Une liste de citations avec une barre de recherche, quatre filtres (époque, thème, fiabilité, incontournables) et deux tris. Un toucher
// ouvre la fiche : la phrase, son contexte, sa source, et ce qu'il faut savoir de sa fiabilité. Quand l'auteur a une carte « Naissance de… »
// parmi les panthéons, la fiche l'ouvre (et, de là, sa biographie). Les règles sont dans js/citationsCore.js (pur, testé) ; les données
// dans assets/citations/ (voir docs/citations.md). Tout ce qui vient des données passe par textContent, jamais par du HTML. Contenu en
// français seulement ; **à relire par un enseignant**.

const CIT_DIR = 'assets/citations/';
const CIT_STEP = 30;            // citations ajoutées à chaque « Voir plus »

let citData = null;             // toutes les citations, une fois les lots chargés
let citLoading = null;          // promesse en cours, pour ne charger qu'une fois
let citById = null;             // Map id → citation
let citShown = CIT_STEP;        // combien la liste en montre
let citCurrentId = null;        // citation affichée dans la fiche
let citEventIndex = null;       // Map id d'événement → { evt, item } (cartes de naissance)
let citEventIndexBdd = null;
const citState = { order: 'chrono' };

function citationsLoad() {
    if (citData) return Promise.resolve(true);
    if (citLoading) return citLoading;
    const get = url => fetch(url).then(r => (r.ok ? r.json() : Promise.reject(r.status)));
    citLoading = get(CIT_DIR + 'index.json')
        .then(index => Promise.all(index.lots.map(file => get(CIT_DIR + file))))
        .then(lots => {
            citData = CitationsCore.mergeLots(lots);
            citById = CitationsCore.indexById(citData);
            return true;
        })
        .catch(() => {
            citLoading = null;   // on réessaiera à la prochaine ouverture
            return false;
        });
    return citLoading;
}

function citEl(id) { return document.getElementById(id); }

function citFillSelect(id, allLabel, options) {
    const select = citEl(id);
    if (select.options.length) return;
    const all = document.createElement('option');
    all.value = 'all';
    all.textContent = allLabel;
    select.appendChild(all);
    options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = o.label;
        select.appendChild(opt);
    });
}

let citScrollBound = false;

function toolCitationsInit() {
    // La barre de recherche se décale à droite du bouton « retour » quand elle est collée en haut, comme celle du dictionnaire.
    if (!citScrollBound) {
        citEl('screen-tool-citations').addEventListener('scroll', () => dictSyncStuck('screen-tool-citations'), { passive: true });
        citScrollBound = true;
    }
    citationsLoad().then(ok => {
        const status = citEl('cit-status');
        if (!ok) {
            status.textContent = "Les citations n'ont pas pu être chargées. Vérifiez la connexion, puis rouvrez l'écran.";
            return;
        }
        citFillSelect('cit-era', 'Toutes les époques', CitationsCore.ERAS);
        citFillSelect('cit-theme', 'Tous les thèmes', CitationsCore.THEMES);
        citFillSelect('cit-reliability', 'Toute fiabilité', CitationsCore.RELIABILITY);
        citationsRender();
    });
}

// Un critère change : la liste repart du début.
function citationsFilterChanged() {
    citShown = CIT_STEP;
    citationsRender(false);
}

function citationsSetOrder(order) {
    citState.order = order;
    citShown = CIT_STEP;
    citationsRender(false);
}

function citationsMore() {
    citShown += CIT_STEP;
    citationsRender(false);
}

function citationsCriteria() {
    return {
        query: citEl('cit-search').value,
        era: citEl('cit-era').value,
        theme: citEl('cit-theme').value,
        fiabilite: citEl('cit-reliability').value,
        repere: citEl('cit-repere').checked
    };
}

function citationsRender() {
    if (!citData) return;
    const found = CitationsCore.sorted(CitationsCore.search(citData, citationsCriteria()), citState.order);
    const shown = CitationsCore.page(found, citShown);
    const list = citEl('cit-list');
    list.textContent = '';
    shown.items.forEach(c => list.appendChild(citItem(c)));

    ['chrono', 'alpha'].forEach(o => citEl('cit-order-' + o).setAttribute('aria-pressed', citState.order === o ? 'true' : 'false'));

    const more = citEl('cit-more');
    more.classList.toggle('hidden', shown.rest === 0);
    more.textContent = 'Voir plus (' + shown.rest + ' restante' + (shown.rest > 1 ? 's' : '') + ')';

    const filtered = found.length !== citData.length;
    citEl('cit-status').textContent = found.length
        ? (filtered ? found.length + ' sur ' + citData.length + ' citations' : found.length + (found.length > 1 ? ' citations' : ' citation'))
        : 'Aucune citation ne correspond à cette recherche.';
}

// La pastille de fiabilité ; rien pour une citation attestée, qui est le cas normal.
function citBadge(c) {
    if (c.fiabilite === 'attestee') return null;
    const badge = document.createElement('span');
    badge.className = 'cit-badge cit-badge-' + c.fiabilite;
    badge.textContent = CitationsCore.labelOf(CitationsCore.RELIABILITY, c.fiabilite);
    return badge;
}

function citItem(c) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cit-item';
    btn.onclick = () => citationOpen(c.id);

    const text = document.createElement('span');
    text.className = 'cit-item-text';
    text.textContent = '«\u00a0' + c.texte + '\u00a0»';
    const meta = document.createElement('small');
    meta.className = 'cit-item-meta';
    meta.textContent = c.auteur + ' · ' + CitationsCore.formatYear(c);
    btn.appendChild(text);
    btn.appendChild(meta);
    const badge = citBadge(c);
    if (badge) btn.appendChild(badge);
    return btn;
}

// --- La fiche ------------------------------------------------------------------------------------------

function citationOpen(id) {
    const c = citById && citById.get(id);
    if (!c) return;
    citCurrentId = id;
    const screen = citEl('screen-tool-citation');
    if (screen.classList.contains('hidden')) showScreen('screen-tool-citation', 'forward');
    citRenderCard(c);
    window.scrollTo(0, 0);
    screen.scrollTop = 0;
}

function citationBackToList() {
    showScreen('screen-tool-citations', 'back');
}

// Une rubrique de la fiche : un titre et un texte. Rien n'est affiché si le texte est vide.
function citSection(body, title, text, className) {
    if (!text) return;
    const wrap = document.createElement('div');
    wrap.className = 'dict-section' + (className ? ' ' + className : '');
    const h = document.createElement('h3');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = text;
    wrap.appendChild(h);
    wrap.appendChild(p);
    body.appendChild(wrap);
}

function citSourceText(c) {
    return c.source.ref ? c.source.oeuvre + ', ' + c.source.ref : c.source.oeuvre;
}

function citRenderCard(c) {
    citEl('cit-card-author').textContent = c.auteur;
    citEl('cit-card-meta').textContent = CitationsCore.formatYear(c) + ' · ' + CitationsCore.labelOf(CitationsCore.THEMES, c.theme);

    const body = citEl('cit-card-body');
    body.textContent = '';

    const quote = document.createElement('blockquote');
    quote.className = 'cit-quote';
    quote.textContent = '«\u00a0' + c.texte + '\u00a0»';
    body.appendChild(quote);

    const reliability = CitationsCore.RELIABILITY.filter(r => r.id === c.fiabilite)[0];
    const status = document.createElement('p');
    status.className = 'cit-status cit-status-' + c.fiabilite;
    status.textContent = reliability.label + ' : ' + reliability.hint.charAt(0).toLowerCase() + reliability.hint.slice(1);
    body.appendChild(status);

    if (c.original) {
        const orig = document.createElement('p');
        orig.className = 'cit-original';
        orig.appendChild(document.createTextNode('Version originale (' + c.langue + ') :'));
        // dir="auto" : l'arabe, l'araméen et l'hébreu s'écrivent de droite à gauche, sans bousculer la phrase française autour.
        const text = document.createElement('span');
        text.dir = 'auto';
        text.textContent = c.original;
        const code = citLangCode(c.langue);
        if (code) text.lang = code;
        orig.appendChild(text);
        body.appendChild(orig);
    }

    citSection(body, 'Contexte', c.contexte);
    citSection(body, 'Source', citSourceText(c));
    citSection(body, c.fiabilite === 'attestee' ? 'À savoir' : 'Pourquoi ce statut', c.note);
    citRenderLinks(body, c);
}

// Le code de langue de la version originale, pour que le lecteur d'écran la prononce correctement.
function citLangCode(langue) {
    return { latin: 'la', anglais: 'en', allemand: 'de', italien: 'it', 'chinois classique': 'zh', chinois: 'zh', grec: 'el', 'grec ancien': 'grc', tchèque: 'cs', espagnol: 'es', arabe: 'ar', araméen: 'arc', russe: 'ru', hébreu: 'he', persan: 'fa', japonais: 'ja', vietnamien: 'vi', maori: 'mi', pali: 'pi' }[langue] || '';
}

// --- Les liens vers l'auteur ---------------------------------------------------------------------------
// Les cartes de naissance sont retrouvées par identifiant (jamais par le nom de l'auteur). L'index se refait quand la base change.
function citEventLookup(id) {
    if (typeof getAllThemesWithPath !== 'function' || !window.bdd) return null;
    if (!citEventIndex || citEventIndexBdd !== window.bdd) {
        citEventIndex = new Map();
        getAllThemesWithPath().forEach(item => (item.theme.events || []).forEach(evt => citEventIndex.set(evt.id, { evt, item })));
        citEventIndexBdd = window.bdd;
    }
    return citEventIndex.get(id) || null;
}

function citThemeLookup(id) {
    if (typeof getAllThemesWithPath !== 'function' || !window.bdd) return null;
    return getAllThemesWithPath().find(item => item.theme.id === id) || null;
}

// Même départ de partie que le bouton « Voir sa biographie » de la fiche d'un événement.
function citPlayTheme(target) {
    favoritesMode = false;
    if (dailyChallengeMode || weeklyChallengeMode) stopTimer();
    dailyChallengeMode = false;
    weeklyChallengeMode = false;
    openThemeAt(target.ci, target.si, target.ti);
}

function citLinkButton(label, onclick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = label;
    btn.onclick = onclick;
    return btn;
}

function citRenderLinks(body, c) {
    const birth = c.naissance ? citEventLookup(c.naissance) : null;
    // La biographie du lien explicite, sinon celle que porte la carte de naissance.
    const bioId = c.biographie || (birth && birth.evt.biographie) || null;
    const bio = bioId ? citThemeLookup(bioId) : null;
    if (!birth && !bio) return;

    const row = document.createElement('div');
    row.className = 'cit-links';
    if (birth) {
        row.appendChild(citLinkButton(birth.evt.titre, () => openModal(birth.evt, {
            theme: birth.item.theme,
            categoryIndex: birth.item.ci,
            subcategoryIndex: birth.item.si,
            themeIndex: birth.item.ti,
            hideRedraw: true
        })));
    }
    if (bio) row.appendChild(citLinkButton('Jouer sur sa biographie', () => citPlayTheme(bio)));
    body.appendChild(row);
}
