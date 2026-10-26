// =========================================================================
// === LE DICTIONNAIRE (écrans de la boîte à outils) ===
// =========================================================================
// Une liste longue des termes, classée par lettre, avec une barre de recherche qui reste en haut de l'écran. Un toucher ouvre le
// terme : sa définition, ses exemples, puis les termes qu'on confond avec lui (ceux de sa fiche). Le « mode concours » ajoute, au
// même endroit, le critère décisif, le piège et la mention du rapport du jury. Les règles sont dans js/dictionnaireCore.js (pur,
// testé) ; les données dans assets/dictionnaire/termes.json (extraites du .docx par scripts/dictionnaire/extract.py).
// Tout ce qui vient des données passe par textContent, jamais par du HTML. Contenu en français seulement ; **à relire par un enseignant**.

const DICT_URL = 'assets/dictionnaire/termes.json';
const DICT_CONCOURS_KEY = 'historiaxe.dictionnaire.concours';

let dictData = null;          // { domaines, fiches, termes } une fois chargé
let dictLoading = null;       // promesse en cours, pour ne charger qu'une fois
let dictById = null;          // Map id de terme → terme
let dictTermId = null;        // terme affiché dans la fiche
let dictConcours = dictReadConcours();

function dictReadConcours() {
    try { return localStorage.getItem(DICT_CONCOURS_KEY) === '1'; } catch (e) { return false; }
}

function dictWriteConcours(on) {
    try { localStorage.setItem(DICT_CONCOURS_KEY, on ? '1' : '0'); } catch (e) { /* pas de stockage : le réglage tient le temps de la session */ }
}

function dictionaryLoad() {
    if (dictData) return Promise.resolve(true);
    if (dictLoading) return dictLoading;
    dictLoading = fetch(DICT_URL)
        .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(data => {
            dictData = data;
            dictById = DictionnaireCore.indexById(data.termes);
            return true;
        })
        .catch(() => {
            dictLoading = null;   // on réessaiera à la prochaine ouverture
            return false;
        });
    return dictLoading;
}

function dictDomaineName(id) {
    const d = dictData.domaines.find(x => x.id === id);
    return d ? d.nom : '';
}

function dictFiche(term) {
    return dictData.fiches.find(f => f.id === term.fiche);
}

function toolDictionaryInit() {
    document.getElementById('dict-concours').checked = dictConcours;
    dictionaryLoad().then(ok => {
        const status = document.getElementById('dict-status');
        if (!ok) {
            status.textContent = "Le dictionnaire n'a pas pu être chargé. Vérifiez la connexion, puis rouvrez l'écran.";
            return;
        }
        dictFillDomains();
        dictionaryRender();
    });
}

// La liste des domaines, une seule fois : « Tous les domaines » puis chaque domaine.
function dictFillDomains() {
    const select = document.getElementById('dict-domain');
    if (select.options.length) return;
    const all = document.createElement('option');
    all.value = 'all';
    all.textContent = 'Tous les domaines';
    select.appendChild(all);
    dictData.domaines.forEach(d => {
        const opt = document.createElement('option');
        opt.value = String(d.id);
        opt.textContent = d.id + '. ' + d.nom;
        select.appendChild(opt);
    });
}

// Redessine la liste selon la recherche et le domaine.
function dictionaryRender() {
    if (!dictData) return;
    const query = document.getElementById('dict-search').value;
    const domain = document.getElementById('dict-domain').value;
    const found = DictionnaireCore.search(dictData.termes, query, domain);
    const groups = DictionnaireCore.groupByLetter(found);

    const nav = document.getElementById('dict-letters');
    const list = document.getElementById('dict-list');
    nav.textContent = '';
    list.textContent = '';

    groups.forEach(g => {
        const jump = document.createElement('button');
        jump.type = 'button';
        jump.className = 'dict-letter-btn';
        jump.textContent = g.letter;
        jump.setAttribute('aria-label', 'Aller à la lettre ' + g.letter);
        jump.onclick = () => document.getElementById('dict-letter-' + dictLetterId(g.letter)).scrollIntoView({ block: 'start' });
        nav.appendChild(jump);

        const head = document.createElement('h3');
        head.className = 'dict-letter';
        head.id = 'dict-letter-' + dictLetterId(g.letter);
        head.textContent = g.letter;
        list.appendChild(head);
        g.termes.forEach(t => list.appendChild(dictItem(t)));
    });

    const status = document.getElementById('dict-status');
    status.textContent = found.length
        ? found.length + (found.length > 1 ? ' termes' : ' terme')
        : 'Aucun terme ne correspond à cette recherche.';
}

// Identifiant d'ancre pour une lettre (« # » n'est pas valable dans un id).
function dictLetterId(letter) {
    return letter === '#' ? 'other' : letter;
}

function dictItem(term) {
    const fiche = dictFiche(term);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dict-item';
    btn.onclick = () => dictionaryOpen(term.id);

    const name = document.createElement('strong');
    name.textContent = term.nom;
    const meta = document.createElement('small');
    meta.textContent = dictDomaineName(term.domaine);
    btn.appendChild(name);
    btn.appendChild(meta);

    if (dictConcours && fiche && fiche.rapport2026) {
        const tag = document.createElement('span');
        tag.className = 'dict-jury';
        tag.textContent = 'Rapport 2026';
        btn.appendChild(tag);
    }
    return btn;
}

// Ouvre la fiche d'un terme. Depuis un autre terme (« à ne pas confondre »), on reste sur la fiche et on remonte en haut.
function dictionaryOpen(id) {
    const term = dictById && dictById.get(id);
    if (!term) return;
    dictTermId = id;
    const screen = document.getElementById('screen-tool-dictionary-term');
    if (screen.classList.contains('hidden')) showScreen('screen-tool-dictionary-term', 'forward');
    dictRenderTerm(term);
    window.scrollTo(0, 0);
    screen.scrollTop = 0;
}

function dictionaryBackToList() {
    showScreen('screen-tool-dictionary', 'back');
}

function dictionaryToggleConcours(on) {
    dictConcours = on;
    dictWriteConcours(on);
    dictionaryRender();
    const screen = document.getElementById('screen-tool-dictionary-term');
    if (!screen.classList.contains('hidden') && dictTermId) dictRenderTerm(dictById.get(dictTermId));
}

// Une rubrique de la fiche : un titre et un texte. Rien n'est affiché si le texte est vide.
function dictSection(body, title, text) {
    if (!text) return;
    const wrap = document.createElement('div');
    wrap.className = 'dict-section';
    const h = document.createElement('h3');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = text;
    wrap.appendChild(h);
    wrap.appendChild(p);
    body.appendChild(wrap);
}

// Les exemples du terme, en liste. À défaut, l'exemple qui accompagne la fiche.
function dictExamples(body, term, fiche) {
    const items = term.exemples && term.exemples.length ? term.exemples : (fiche && fiche.exemples ? [fiche.exemples] : []);
    if (!items.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'dict-section';
    const h = document.createElement('h3');
    h.textContent = 'Exemples';
    const list = document.createElement('ul');
    list.className = 'dict-examples';
    items.forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        list.appendChild(li);
    });
    wrap.appendChild(h);
    wrap.appendChild(list);
    body.appendChild(wrap);
}

function dictRenderTerm(term) {
    const fiche = dictFiche(term);
    document.getElementById('dict-term-name').textContent = term.nom;
    document.getElementById('dict-term-meta').textContent =
        dictDomaineName(term.domaine) + (fiche ? ' · Fiche ' + fiche.id + ' : ' + fiche.titre : '');

    const body = document.getElementById('dict-term-body');
    body.textContent = '';
    dictSection(body, 'Définition', term.definition);
    dictExamples(body, term, fiche);
    if (fiche && dictConcours) {
        dictSection(body, 'Critère décisif', fiche.critere);
        dictSection(body, 'Piège', fiche.piege);
        if (fiche.rapport2026) {
            const jury = document.createElement('p');
            jury.className = 'dict-jury-note';
            jury.textContent = 'Distinction signalée par le rapport du jury 2026.';
            body.appendChild(jury);
        }
    }

    const near = DictionnaireCore.neighbours(dictData.termes, term);
    if (near.length) {
        const wrap = document.createElement('div');
        wrap.className = 'dict-section';
        const h = document.createElement('h3');
        h.textContent = 'À ne pas confondre avec';
        const row = document.createElement('div');
        row.className = 'dict-near';
        near.forEach(n => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'dict-near-btn';
            b.textContent = n.nom;
            b.onclick = () => dictionaryOpen(n.id);
            row.appendChild(b);
        });
        wrap.appendChild(h);
        wrap.appendChild(row);
        body.appendChild(wrap);
    }
}
