// =========================================================================
// === HISTORIAXE — GALERIE DES PORTRAITS (Personnages illustres) ===
// =========================================================================
// Une vitrine, pas un mode de jeu : tous les personnages des Panthéons qui ont
// un portrait, en trombinoscope, rangés par ordre alphabétique ou par date de
// naissance. Toucher un visage ouvre la fiche de sa naissance (openModal), avec
// deux accès directs : sa biographie quand elle existe, et le panthéon de son
// pays.
//
// Rien n'est figé ici : la galerie se lit dans bdd au moment de l'afficher. Un
// panthéon ajouté y entre de lui-même, et un pack de langue sans « Panthéons »
// n'affiche simplement pas le bouton (voir findPantheonNode).

let galleryOrder = 'alpha';

// La sous-catégorie « Panthéons » d'un nœud de l'arbre, ou null. Même test
// d'égalité stricte que pour l'image de sa tuile (initSubcategories) :
// « Mythologies et panthéons antiques » ne doit pas s'y prendre.
function findPantheonNode(node) {
    if (!node || !node.subcategories) return null;
    return node.subcategories.find(sub => {
        const nom = (sub.nom || '').toLowerCase();
        return nom === 'panthéons' || nom === 'pantheons';
    }) || null;
}

// « Naissance de Victor Hugo » → « Victor Hugo » ; « Naissance du Caravage »
// → « le Caravage », rangé à C comme dans un index. Un titre qui ne suit pas
// le modèle reste entier : mieux vaut un nom trop long qu'un nom amputé.
function galleryNameOf(evt) {
    const titre = (evt.titre || '').trim();
    let m = /^Naissance (?:de |d'|d’)(.+)$/.exec(titre);
    if (m) return { name: m[1], sortName: m[1] };
    m = /^Naissance du (.+)$/.exec(titre);
    if (m) return { name: 'le ' + m[1], sortName: m[1] };
    return { name: titre, sortName: titre };
}

// Pays d'une figure : le champ `pays` dans un panthéon de région, sinon le
// code du thème quand c'est un code ISO (pan_fr, pan_gb…).
function galleryCountryOf(evt, theme) {
    if (typeof evt.pays === 'string' && /^[A-Za-z]{2}$/.test(evt.pays)) return evt.pays.toUpperCase();
    const m = /^pan_([a-z]{2})$/.exec(theme.id || '');
    return m ? m[1].toUpperCase() : '';
}

// Toutes les figures à portrait des panthéons de `pantheon`, avec de quoi
// rouvrir leur thème (ci/si/ti, au format d'openThemeAt).
function collectGalleryEntries(pantheon) {
    if (!pantheon || !Array.isArray(pantheon.themes)) return [];
    const ids = new Set(pantheon.themes.map(theme => theme.id));
    const entries = [];
    getAllThemesWithPath().forEach(item => {
        if (!ids.has(item.theme.id)) return;
        (item.theme.events || []).forEach(evt => {
            if (!portraitOf(evt) || typeof evt.date !== 'number') return;
            entries.push(Object.assign({ evt, item, iso: galleryCountryOf(evt, item.theme) }, galleryNameOf(evt)));
        });
    });
    return entries;
}

// Trie et regroupe : par initiale (sans accent) en ordre alphabétique, par
// siècle de naissance en ordre chronologique.
function sortGalleryEntries(entries, order) {
    const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
    const byName = (a, b) => collator.compare(a.sortName, b.sortName);
    const sorted = entries.slice().sort(order === 'chrono'
        ? (a, b) => (a.evt.date - b.evt.date) || byName(a, b)
        : byName);
    const groups = [];
    sorted.forEach(entry => {
        const label = order === 'chrono'
            ? getCenturyLabel(entry.evt.date)
            : (normalizeSearchText(entry.sortName).charAt(0).toUpperCase() || '#');
        const last = groups[groups.length - 1];
        if (last && last.label === label) last.entries.push(entry);
        else groups.push({ label, entries: [entry] });
    });
    return groups;
}

// Bouton « Galerie des portraits » et son choix d'ordre, sous la grille des
// sous-catégories. Volontairement différent des tuiles (pleine largeur, teinte
// dorée de cadre de musée) : ce n'est ni une catégorie ni un mode de jeu.
function buildGalleryLauncher(pantheon) {
    const count = collectGalleryEntries(pantheon).length;
    if (count === 0) return null;
    const wrap = document.createElement('div');
    wrap.className = 'gallery-launcher';
    wrap.innerHTML = `
        <button type="button" class="gallery-launcher-btn" id="btn-gallery" aria-expanded="false" aria-controls="gallery-order-picker">
            <span class="gallery-launcher-icon" aria-hidden="true">🖼️</span>
            <span class="gallery-launcher-text">
                <span class="gallery-launcher-title"></span>
                <span class="gallery-launcher-sub"></span>
            </span>
            <span class="gallery-launcher-chevron" aria-hidden="true">›</span>
        </button>
        <div class="gallery-order-picker hidden" id="gallery-order-picker">
            <button type="button" class="challenge-picker-btn" data-order="alpha">
                <span class="challenge-picker-icon" aria-hidden="true">🔤</span>
                <span></span>
            </button>
            <button type="button" class="challenge-picker-btn" data-order="chrono">
                <span class="challenge-picker-icon" aria-hidden="true">⏳</span>
                <span></span>
            </button>
        </div>
    `;
    wrap.querySelector('.gallery-launcher-title').textContent = t('gallery.title');
    wrap.querySelector('.gallery-launcher-sub').textContent = t('gallery.launcher_sub', { count });
    const pickerBtns = wrap.querySelectorAll('.gallery-order-picker .challenge-picker-btn');
    pickerBtns[0].lastElementChild.textContent = t('gallery.order_alpha');
    pickerBtns[1].lastElementChild.textContent = t('gallery.order_chrono');

    const btn = wrap.querySelector('#btn-gallery');
    const picker = wrap.querySelector('#gallery-order-picker');
    btn.onclick = () => {
        const nowOpen = picker.classList.toggle('hidden') === false;
        btn.setAttribute('aria-expanded', String(nowOpen));
        btn.classList.toggle('is-open', nowOpen);
    };
    pickerBtns.forEach(b => {
        b.onclick = () => openGallery(b.dataset.order);
    });
    return wrap;
}

function openGallery(order) {
    galleryOrder = order === 'chrono' ? 'chrono' : 'alpha';
    showScreen('screen-gallery', 'forward');
}

// Le nœud dont la galerie montre les panthéons : celui de l'écran des
// sous-catégories d'où l'on vient, que la galerie ne modifie pas.
function currentGalleryPantheon() {
    const category = bdd[selectedCategoryIndex];
    if (!category) return null;
    return findPantheonNode(resolveSubcategory(category, selectedSubcategoryIndex) || category);
}

function initGallery() {
    const container = document.getElementById('gallery-container');
    const subtitle = document.getElementById('gallery-subtitle');
    if (!container) return;
    container.innerHTML = '';
    const entries = collectGalleryEntries(currentGalleryPantheon());

    document.querySelectorAll('#gallery-order-toggle [data-order]').forEach(b => {
        const active = b.dataset.order === galleryOrder;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
        b.onclick = () => {
            if (galleryOrder === b.dataset.order) return;
            galleryOrder = b.dataset.order;
            initGallery();
            const screen = document.getElementById('screen-gallery');
            if (screen) screen.scrollTop = 0;
            window.scrollTo(0, 0);
        };
    });
    subtitle.textContent = t('gallery.count', { count: entries.length });

    if (entries.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-msg';
        empty.textContent = t('gallery.empty');
        container.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();
    sortGalleryEntries(entries, galleryOrder).forEach(group => {
        const section = document.createElement('section');
        section.className = 'gallery-section';
        const heading = document.createElement('h3');
        heading.className = 'gallery-section-title';
        heading.textContent = group.label;
        section.appendChild(heading);
        const grid = document.createElement('div');
        grid.className = 'gallery-grid';
        group.entries.forEach(entry => grid.appendChild(buildGalleryCard(entry)));
        section.appendChild(grid);
        fragment.appendChild(section);
    });
    container.appendChild(fragment);
}

// Une carte du trombinoscope : portrait, nom, drapeau et année de naissance.
// Un vrai <button>, dont le nom accessible est celui de la figure ; le portrait
// est décoratif (alt vide), comme la pastille de la frise.
function buildGalleryCard(entry) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'gallery-card';
    card.dataset.eventId = entry.evt.id || '';

    const frame = document.createElement('span');
    frame.className = 'gallery-card-frame';
    const img = document.createElement('img');
    img.className = 'gallery-card-img';
    img.alt = '';
    img.width = 160;
    img.height = 200;
    img.loading = 'lazy';
    img.decoding = 'async';
    // Un portrait qui ne charge pas laisse le cadre vide plutôt que l'icône
    // « image cassée » (même règle que createPortraitThumb).
    img.addEventListener('error', () => img.remove(), { once: true });
    img.src = portraitOf(entry.evt).src;
    frame.appendChild(img);

    const name = document.createElement('span');
    name.className = 'gallery-card-name';
    name.textContent = entry.name;

    const meta = document.createElement('span');
    meta.className = 'gallery-card-meta';
    const flag = entry.iso && typeof isoToFlagEmoji === 'function' ? isoToFlagEmoji(entry.iso) + ' ' : '';
    meta.textContent = flag + formatEventDate(entry.evt);
    if (entry.iso && typeof countryDisplayName === 'function') meta.title = countryDisplayName(entry.iso);

    card.append(frame, name, meta);
    card.setAttribute('aria-label', `${entry.name}, ${formatEventDate(entry.evt)}`);
    card.onclick = () => openGalleryPortrait(entry);
    return card;
}

// La fiche d'une figure : sa naissance, son portrait crédité, puis les deux
// accès directs (biographie, panthéon de son pays).
function openGalleryPortrait(entry) {
    const { item } = entry;
    openModal(entry.evt, {
        theme: item.theme,
        categoryIndex: item.ci,
        subcategoryIndex: item.si,
        themeIndex: item.ti,
        hideRedraw: true,
        fromGallery: true
    });
}

function backFromGallery() {
    showScreen('screen-subcategories', 'back');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { galleryNameOf, galleryCountryOf, findPantheonNode };
}
