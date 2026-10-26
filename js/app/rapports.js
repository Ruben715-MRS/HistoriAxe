// =========================================================================
// === HISTORIAXE — RAPPORTS DU JURY (CAPES & Agrégation) ===
// =========================================================================
// Des documents HTML publiés par les jurys (assets/rapports/, décrits par assets/rapports/index.json). La carte « Rapports du jury »
// s'affiche dans la rangée de la catégorie « CAPES & Agrégation », à côté de Mode Carte et Chrono-Géo, comme la galerie des portraits.
// Chaque rapport s'ouvre dans un cadre (iframe) qui peut exécuter ses scripts : `allow-same-origin` est nécessaire, sans quoi le navigateur
// signale une erreur de service worker dans la console. Cela n'est acceptable QUE pour des documents vérifiés : un rapport ajouté à
// assets/rapports/ ne doit contenir ni script autre que ses filtres, ni ressource externe (tests/rapports.test.js le contrôle). Le fichier
// n'est pas précaché : il se charge à l'ouverture. Tout texte du catalogue passe par textContent.

const RAPPORTS_CATEGORY = 'CAPES & Agrégation';
let rapportsCatalog = null;

function rapportsLoad() {
    if (rapportsCatalog) return Promise.resolve(rapportsCatalog);
    return fetch('assets/rapports/index.json')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(d => { rapportsCatalog = d.rapports || []; return rapportsCatalog; })
        .catch(() => []);
}

// La carte de la rangée : même forme que la galerie des portraits (icône, titre, sous-titre, chevron).
function buildRapportsLauncher() {
    const wrap = document.createElement('div');
    wrap.className = 'gallery-launcher rapports-launcher';
    wrap.innerHTML = `
        <button type="button" class="gallery-launcher-btn" id="btn-rapports">
            <span class="gallery-launcher-icon" aria-hidden="true">📄</span>
            <span class="gallery-launcher-text">
                <span class="gallery-launcher-title"></span>
                <span class="gallery-launcher-sub"></span>
            </span>
            <span class="gallery-launcher-chevron" aria-hidden="true">›</span>
        </button>
    `;
    wrap.querySelector('.gallery-launcher-title').textContent = t('rapports.card_title');
    wrap.querySelector('.gallery-launcher-sub').textContent = t('rapports.card_sub');
    wrap.querySelector('button').onclick = openRapports;
    return wrap;
}

// La liste des rapports, puis un rapport dans son cadre. « Retour » remonte d'un niveau.
function openRapports() {
    showScreen('screen-rapports', 'forward');
    rapportsLoad().then(list => {
        const box = document.getElementById('rapports-list');
        box.replaceChildren();
        if (!list.length) {
            const empty = document.createElement('p');
            empty.className = 'tool-small';
            empty.textContent = t('rapports.empty');
            box.appendChild(empty);
            return;
        }
        list.forEach(r => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn';
            btn.textContent = r.titre;
            btn.onclick = () => openRapport(r.id);
            const meta = document.createElement('p');
            meta.className = 'tool-small';
            meta.textContent = r.concours + ' · ' + r.annee;
            box.append(btn, meta);
        });
    });
}

function openRapport(id) {
    rapportsLoad().then(list => {
        const r = list.find(x => x.id === id);
        if (!r) return;
        const frame = document.getElementById('rapport-frame');
        frame.title = r.titre;
        frame.src = r.fichier;
        showScreen('screen-rapport', 'forward');
    });
}

// Sortir d'un rapport vide le cadre : le document cesse de tourner en arrière-plan.
function closeRapport() {
    document.getElementById('rapport-frame').removeAttribute('src');
    showScreen('screen-rapports', 'back');
}
