// =========================================================================
// === HISTORIAXE — GALERIE DES PORTRAITS (Personnages illustres) ===
// =========================================================================
// Une vitrine, pas un mode de jeu : tous les personnages des Panthéons qui ont
// un portrait, en trombinoscope, rangés par ordre alphabétique, par nom de
// famille ou par date de naissance, avec une recherche par nom et deux filtres
// (pays, domaine). Toucher un visage ouvre la fiche de sa naissance (openModal),
// d'où l'on passe au portrait suivant ou précédent sans la refermer, et d'où
// deux accès directs mènent au jeu : sa biographie quand elle existe, et le
// panthéon de son pays. Après une partie lancée de là, on revient à la galerie,
// au même endroit, avec la même recherche.
//
// Rien n'est figé ici : la galerie se lit dans bdd au moment de l'afficher. Un
// panthéon ajouté y entre de lui-même, et un pack de langue sans « Panthéons »
// n'affiche simplement pas le bouton (voir findPantheonNode).

const GALLERY_ORDERS = ['alpha', 'famille', 'chrono'];

let galleryOrder = 'alpha';
let galleryQuery = '';
let galleryCountry = '';
let galleryAxis = '';
// Toutes les figures, et celles qui restent après recherche et filtres, dans
// l'ordre où elles s'affichent : la fiche s'en sert pour passer à la voisine.
let galleryEntries = [];
let galleryVisible = [];
let galleryModalIndex = -1;
// Posés quand on quitte la galerie pour jouer (markGalleryLaunch), consommés au
// retour (initGallery) : sans eux, revenir d'une partie ramenait en haut de la
// liste, recherche effacée.
let galleryReturnPending = false;
let galleryScrollTop = 0;
// Le niveau de l'arbre d'où l'on a ouvert la galerie. Lancer une partie (openThemeAt)
// écrase la sélection de catégorie : sans ce repère, la galerie ne retrouvait plus son
// nœud « Panthéons » au retour, et le bouton « ‹ » ne savait plus où ramener.
let galleryScope = null;

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

// Sans accent ni casse : « Édith » se trouve en tapant « edith ». Même
// normalisation que la recherche de thèmes ; dupliquée ici pour que ce fichier
// se teste sans le reste de l'application.
function galleryNormalize(str) {
    return (str || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// L'initiale d'un intertitre : la première lettre sans accent, ou « # ».
function galleryInitial(text) {
    const first = galleryNormalize(text).charAt(0).toUpperCase();
    return /[A-Z]/.test(first) ? first : '#';
}

// Collection : un portrait se débloque quand le personnage a été rencontré en jeu, c'est-à-dire
// quand le suivi de révision (srsLoad) a une fiche pour son événement — la même définition que
// « événements rencontrés » du Défi de simultanéité. Lire une fiche dans la galerie n'y compte pas.
function galleryUnlockedCount(entries, srs) {
    return entries.filter(entry => srs && srs[entry.evt.id]).length;
}

// 'bw' : portraits en noir et blanc jusqu'à la rencontre, avec un compteur ; sinon tout en couleur.
function portraitCollectionOn() {
    return typeof appSettings !== 'undefined' && appSettings.portraitCollection === 'bw';
}

// Toutes les figures à portrait des panthéons de `pantheon`, avec de quoi
// rouvrir leur thème (ci/si/ti, au format d'openThemeAt).
function collectGalleryEntries(pantheon) {
    if (!pantheon || !Array.isArray(pantheon.themes)) return [];
    const ids = new Set(pantheon.themes.map(theme => theme.id));
    const entries = [];
    const allItems = getAllThemesWithPath();
    // Les thèmes de la catégorie Biographies : une figure n'a de biographie que si son lien en désigne un
    // (même test que le bouton de la fiche, renderModalBiographyButton).
    const themeIds = new Set(allItems.map(item => item.theme.id));
    allItems.forEach(item => {
        if (!ids.has(item.theme.id)) return;
        (item.theme.events || []).forEach(evt => {
            if (!portraitOf(evt) || typeof evt.date !== 'number') return;
            const names = galleryNameOf(evt);
            entries.push(Object.assign({
                evt,
                item,
                iso: galleryCountryOf(evt, item.theme),
                // Le nom de classement est écrit dans les données (voir
                // scripts/pantheon_classement.py) ; à défaut, le nom lui-même.
                hasBio: !!evt.biographie && themeIds.has(evt.biographie),
                classement: evt.classement || names.sortName,
                haystack: galleryNormalize(`${evt.titre} ${evt.classement || ''}`)
            }, names));
        });
    });
    return entries;
}

// Recherche et filtres, sans toucher à l'ordre. Chaque mot tapé doit se trouver
// dans le nom : « hugo victor » et « victor hugo » trouvent la même figure.
function filterGalleryEntries(entries, { query = '', country = '', axis = '' } = {}) {
    const words = galleryNormalize(query).split(/\s+/).filter(Boolean);
    return entries.filter(entry =>
        (!country || entry.iso === country)
        && (!axis || entry.evt.axe === axis)
        && words.every(word => entry.haystack.includes(word)));
}

// Comparateur d'un ordre : à égalité (deux Louis, deux Grimm), la date de
// naissance départage — les rois se rangent ainsi dans l'ordre de leurs règnes.
function compareGalleryEntries(order) {
    const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
    const textOf = order === 'famille' ? (e => e.classement) : (e => e.sortName);
    const byText = (a, b) => collator.compare(textOf(a), textOf(b)) || (a.evt.date - b.evt.date);
    return order === 'chrono'
        ? (a, b) => (a.evt.date - b.evt.date) || collator.compare(a.sortName, b.sortName)
        : byText;
}

// Trie et regroupe : par initiale en ordre alphabétique et par nom de famille,
// par siècle de naissance en ordre chronologique.
function sortGalleryEntries(entries, order) {
    const sorted = entries.slice().sort(compareGalleryEntries(order));
    const groups = [];
    sorted.forEach(entry => {
        const label = order === 'chrono'
            ? getCenturyLabel(entry.evt.date)
            : galleryInitial(order === 'famille' ? entry.classement : entry.sortName);
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
    const all = collectGalleryEntries(pantheon);
    const count = all.length;
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
            <button type="button" class="challenge-picker-btn" data-order="famille">
                <span class="challenge-picker-icon" aria-hidden="true">👤</span>
                <span></span>
            </button>
            <button type="button" class="challenge-picker-btn" data-order="chrono">
                <span class="challenge-picker-icon" aria-hidden="true">⏳</span>
                <span></span>
            </button>
        </div>
    `;
    wrap.querySelector('.gallery-launcher-title').textContent = t('gallery.title');
    // En mode collection, le bouton annonce l'avancement plutôt que le nombre de visages.
    wrap.querySelector('.gallery-launcher-sub').textContent = portraitCollectionOn()
        ? t('gallery.collection_count', { unlocked: galleryUnlockedCount(all, srsLoad()), total: count })
        : t('gallery.launcher_sub', { count });
    wrap.querySelectorAll('.gallery-order-picker .challenge-picker-btn').forEach(b => {
        b.lastElementChild.textContent = t('gallery.order_' + b.dataset.order);
        b.onclick = () => openGallery(b.dataset.order);
    });

    const btn = wrap.querySelector('#btn-gallery');
    const picker = wrap.querySelector('#gallery-order-picker');
    btn.onclick = () => {
        const nowOpen = picker.classList.toggle('hidden') === false;
        btn.setAttribute('aria-expanded', String(nowOpen));
        btn.classList.toggle('is-open', nowOpen);
    };
    return wrap;
}

// Ouverture depuis le bouton : une galerie neuve, sans la recherche ni les
// filtres d'une visite précédente.
function openGallery(order) {
    galleryOrder = GALLERY_ORDERS.includes(order) ? order : 'alpha';
    galleryQuery = '';
    galleryCountry = '';
    galleryAxis = '';
    galleryReturnPending = false;
    galleryScope = { ci: selectedCategoryIndex, si: Array.isArray(selectedSubcategoryIndex) ? [...selectedSubcategoryIndex] : [] };
    showScreen('screen-gallery', 'forward');
}

// Le nœud dont la galerie montre les panthéons : celui de l'écran des
// sous-catégories d'où l'on vient, que la galerie ne modifie pas.
function currentGalleryPantheon() {
    const category = bdd[selectedCategoryIndex];
    if (!category) return null;
    return findPantheonNode(resolveSubcategory(category, selectedSubcategoryIndex) || category);
}

// « 🇫🇷 France (68) » : le pays, avec le nombre de portraits qu'il apporte.
function galleryCountryLabel(iso, count) {
    const flag = typeof isoToFlagEmoji === 'function' ? isoToFlagEmoji(iso) + ' ' : '';
    const name = typeof countryDisplayName === 'function' ? countryDisplayName(iso) : iso;
    return `${flag}${name} (${count})`;
}

function fillGallerySelect(select, allLabel, options, current) {
    select.textContent = '';
    const all = document.createElement('option');
    all.value = '';
    all.textContent = allLabel;
    select.appendChild(all);
    options.forEach(({ value, label }) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        select.appendChild(opt);
    });
    select.value = options.some(o => o.value === current) ? current : '';
    return select.value;
}

// Les deux listes déroulantes se déduisent des figures elles-mêmes, avec leur
// effectif : un pays ou un domaine sans portrait n'y figure pas.
function initGalleryFilters() {
    const countries = new Map();
    const axes = new Map();
    galleryEntries.forEach(entry => {
        if (entry.iso) countries.set(entry.iso, (countries.get(entry.iso) || 0) + 1);
        if (entry.evt.axe) axes.set(entry.evt.axe, (axes.get(entry.evt.axe) || 0) + 1);
    });
    const collator = new Intl.Collator('fr', { sensitivity: 'base' });
    const countryOptions = [...countries].map(([iso, n]) => ({ value: iso, label: galleryCountryLabel(iso, n) }))
        .sort((a, b) => collator.compare(a.label.replace(/^\S+\s/, ''), b.label.replace(/^\S+\s/, '')));
    const axisOptions = [...axes].map(([axe, n]) => ({ value: axe, label: `${axe} (${n})` }))
        .sort((a, b) => collator.compare(a.label, b.label));

    const countrySel = document.getElementById('gallery-filter-country');
    const axisSel = document.getElementById('gallery-filter-axis');
    galleryCountry = fillGallerySelect(countrySel, t('gallery.filter_country_all'), countryOptions, galleryCountry);
    galleryAxis = fillGallerySelect(axisSel, t('gallery.filter_axis_all'), axisOptions, galleryAxis);
    // Un seul pays (pack réduit) : le filtre n'aurait rien à choisir.
    countrySel.parentElement.classList.toggle('hidden', countryOptions.length < 2);
    countrySel.onchange = () => { galleryCountry = countrySel.value; renderGalleryGrid(); };
    axisSel.onchange = () => { galleryAxis = axisSel.value; renderGalleryGrid(); };
}

function initGallery() {
    const container = document.getElementById('gallery-container');
    if (!container) return;
    const returning = galleryReturnPending;
    galleryReturnPending = false;
    // Rétablit la sélection que la partie a écrasée : le « ‹ » de la galerie ramène
    // alors à « Personnages illustres », et non à la racine des catégories.
    if (galleryScope) {
        selectedCategoryIndex = galleryScope.ci;
        selectedSubcategoryIndex = [...galleryScope.si];
    }
    galleryEntries = collectGalleryEntries(currentGalleryPantheon());
    galleryModalIndex = -1;

    initGalleryFilters();
    renderGalleryCollection();

    const search = document.getElementById('gallery-search');
    search.value = galleryQuery;
    let timer = null;
    search.oninput = () => {
        galleryQuery = search.value;
        clearTimeout(timer);
        timer = setTimeout(renderGalleryGrid, 120);
    };

    document.querySelectorAll('#gallery-order-toggle [data-order]').forEach(b => {
        b.onclick = () => {
            if (galleryOrder === b.dataset.order) return;
            galleryOrder = b.dataset.order;
            renderGalleryGrid();
            scrollGalleryTo(0);
        };
    });
    document.getElementById('gallery-reset').onclick = () => {
        galleryQuery = '';
        galleryCountry = '';
        galleryAxis = '';
        search.value = '';
        document.getElementById('gallery-filter-country').value = '';
        document.getElementById('gallery-filter-axis').value = '';
        renderGalleryGrid();
    };

    bindGalleryModalGestures();
    renderGalleryGrid();
    // Après showScreen, qui replace le focus et peut remonter la page : on
    // attend la fin de la bascule avant de remettre la liste où on l'avait laissée.
    requestAnimationFrame(() => scrollGalleryTo(returning ? galleryScrollTop : 0));
}

function scrollGalleryTo(top) {
    const screen = document.getElementById('screen-gallery');
    if (screen) screen.scrollTop = top;
}

// Dessine les intertitres et les cartes selon l'ordre, la recherche et les
// filtres courants. Ne touche pas aux champs : la saisie garde son focus.
function renderGalleryGrid() {
    const container = document.getElementById('gallery-container');
    const subtitle = document.getElementById('gallery-subtitle');
    container.innerHTML = '';

    document.querySelectorAll('#gallery-order-toggle [data-order]').forEach(b => {
        const active = b.dataset.order === galleryOrder;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
    });

    const matching = filterGalleryEntries(galleryEntries, { query: galleryQuery, country: galleryCountry, axis: galleryAxis });
    const groups = sortGalleryEntries(matching, galleryOrder);
    galleryVisible = groups.flatMap(group => group.entries);

    const filtered = !!(galleryQuery.trim() || galleryCountry || galleryAxis);
    document.getElementById('gallery-reset').classList.toggle('hidden', !filtered);
    // En mode collection, le compteur « 30 / 838 portraits débloqués » dit déjà le total : le décompte
    // ne reparaît que filtré (« 12 portraits sur 838 »).
    subtitle.classList.toggle('hidden', !filtered && portraitCollectionOn());
    subtitle.textContent = filtered
        ? t(matching.length === 1 ? 'gallery.count_filtered_one' : 'gallery.count_filtered', { count: matching.length, total: galleryEntries.length })
        : t('gallery.count', { count: galleryEntries.length });

    if (matching.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-msg';
        empty.textContent = t(galleryEntries.length ? 'gallery.no_result' : 'gallery.empty');
        container.appendChild(empty);
        return;
    }

    // En mode collection, une carte reste en noir et blanc tant que son personnage n'a pas été rencontré.
    const srs = portraitCollectionOn() ? srsLoad() : null;
    const fragment = document.createDocumentFragment();
    groups.forEach(group => {
        const section = document.createElement('section');
        section.className = 'gallery-section';
        const heading = document.createElement('h3');
        heading.className = 'gallery-section-title';
        heading.textContent = group.label;
        section.appendChild(heading);
        const grid = document.createElement('div');
        grid.className = 'gallery-grid';
        group.entries.forEach(entry => grid.appendChild(buildGalleryCard(entry, !!srs && !srs[entry.evt.id])));
        section.appendChild(grid);
        fragment.appendChild(section);
    });
    container.appendChild(fragment);
}

// Une carte du trombinoscope : portrait, nom, drapeau et année de naissance.
// Un vrai <button>, dont le nom accessible est celui de la figure ; le portrait
// est décoratif (alt vide), comme la pastille de la frise.
function buildGalleryCard(entry, locked = false) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'gallery-card' + (locked ? ' is-locked' : '');
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
    // Biographie disponible : une pastille dans l'angle de la photo, sans rien ajouter à la mise en
    // page — une carte sans biographie garde exactement le même gabarit.
    if (entry.hasBio) {
        const bio = document.createElement('span');
        bio.className = 'gallery-card-bio';
        bio.setAttribute('aria-hidden', 'true');
        bio.textContent = '📖';
        frame.appendChild(bio);
    }

    const name = document.createElement('span');
    name.className = 'gallery-card-name';
    name.textContent = entry.name;

    const meta = document.createElement('span');
    meta.className = 'gallery-card-meta';
    const flag = entry.iso && typeof isoToFlagEmoji === 'function' ? isoToFlagEmoji(entry.iso) + ' ' : '';
    meta.textContent = flag + formatEventDate(entry.evt);
    if (entry.iso && typeof countryDisplayName === 'function') meta.title = countryDisplayName(entry.iso);

    card.append(frame, name, meta);
    card.setAttribute('aria-label', `${entry.name}, ${formatEventDate(entry.evt)}${entry.hasBio ? ', ' + t('gallery.bio_aria') : ''}${locked ? ', ' + t('gallery.locked_aria') : ''}`);
    card.onclick = () => openGalleryPortrait(entry);
    return card;
}

// La fiche d'une figure : sa naissance, son portrait crédité, puis les deux
// accès directs (biographie, panthéon de son pays) et le passage au voisin.
function openGalleryPortrait(entry) {
    galleryModalIndex = galleryVisible.indexOf(entry);
    const { item } = entry;
    openModal(entry.evt, {
        theme: item.theme,
        categoryIndex: item.ci,
        subcategoryIndex: item.si,
        themeIndex: item.ti,
        hideRedraw: true,
        fromGallery: true,
        // Pas encore rencontré en jeu : la fiche garde le portrait en noir et blanc et dit comment le débloquer.
        locked: portraitCollectionOn() && !srsLoad()[entry.evt.id]
    });
    renderGalleryModalNav();
}

function renderGalleryModalNav() {
    const prev = document.getElementById('modal-gallery-prev');
    const next = document.getElementById('modal-gallery-next');
    const pos = document.getElementById('modal-gallery-pos');
    if (!prev || !next || !pos) return;
    const total = galleryVisible.length;
    prev.disabled = galleryModalIndex <= 0;
    next.disabled = galleryModalIndex < 0 || galleryModalIndex >= total - 1;
    pos.textContent = t('gallery.nav_position', { n: galleryModalIndex + 1, total });
}

// Passe au portrait voisin dans l'ordre affiché. S'arrête aux extrémités plutôt
// que de boucler : on sait où l'on en est dans la liste.
function stepGalleryPortrait(delta) {
    const target = galleryVisible[galleryModalIndex + delta];
    if (!target) return;
    openGalleryPortrait(target);
    const content = document.querySelector('#modal-details .modal-content');
    if (content) content.scrollTop = 0;
}

function galleryModalOpen() {
    const modal = document.getElementById('modal-details');
    return !!modal && !modal.classList.contains('hidden')
        && modal.querySelector('.modal-content').classList.contains('from-gallery');
}

let galleryGesturesBound = false;
// Boutons, flèches du clavier et glissement horizontal font la même chose. Le
// glissement ne compte que s'il est franchement horizontal : un défilement
// vertical de la description ne doit pas tourner la page.
function bindGalleryModalGestures() {
    if (galleryGesturesBound) return;
    galleryGesturesBound = true;
    document.getElementById('modal-gallery-prev').onclick = () => stepGalleryPortrait(-1);
    document.getElementById('modal-gallery-next').onclick = () => stepGalleryPortrait(1);

    document.addEventListener('keydown', e => {
        if (!galleryModalOpen() || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); stepGalleryPortrait(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); stepGalleryPortrait(1); }
    });

    const content = document.querySelector('#modal-details .modal-content');
    let start = null;
    content.addEventListener('touchstart', e => {
        start = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    }, { passive: true });
    content.addEventListener('touchend', e => {
        if (!start || !galleryModalOpen()) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        start = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) stepGalleryPortrait(dx < 0 ? 1 : -1);
    }, { passive: true });
}

// On quitte la galerie pour jouer (biographie ou panthéon de la fiche) : on
// retient où l'on en était, pour y revenir à la fin de la partie.
function markGalleryLaunch() {
    const screen = document.getElementById('screen-gallery');
    galleryScrollTop = screen ? screen.scrollTop : 0;
    galleryReturnPending = true;
}

// Où retourner après une partie : la galerie si c'est d'elle qu'on est parti.
function galleryReturnTarget(fallback) {
    return galleryReturnPending ? 'screen-gallery' : fallback;
}

// Bannière en tête de galerie : compteur et barre en mode collection, sinon un accès pour l'activer.
function renderGalleryCollection() {
    const on = portraitCollectionOn();
    const meter = document.getElementById('gallery-collection-meter');
    const toggle = document.getElementById('gallery-collection-toggle');
    if (!meter || !toggle) return;
    meter.classList.toggle('hidden', !on);
    if (on) {
        const unlocked = galleryUnlockedCount(galleryEntries, srsLoad());
        const total = galleryEntries.length;
        const pct = total ? Math.round(unlocked / total * 100) : 0;
        document.getElementById('gallery-collection-count').textContent = t('gallery.collection_count', { unlocked, total });
        document.getElementById('gallery-collection-fill').style.width = pct + '%';
        document.getElementById('gallery-collection-bar').setAttribute('aria-valuenow', String(pct));
    }
    toggle.textContent = t(on ? 'gallery.collection_off_btn' : 'gallery.collection_on_btn');
    toggle.onclick = () => setPortraitCollection(on ? 'color' : 'bw');
}

// Change le réglage (galerie, Réglages ou écran de première ouverture) et rafraîchit ce qui l'affiche.
function setPortraitCollection(mode) {
    appSettings.portraitCollection = mode === 'bw' ? 'bw' : 'color';
    settingsSave(appSettings);
    const visible = id => { const el = document.getElementById(id); return !!el && !el.classList.contains('hidden'); };
    if (visible('screen-gallery')) {
        renderGalleryCollection();
        renderGalleryGrid();
    }
    // Le bouton de la galerie annonce l'avancement : on le redessine, sans quitter l'écran.
    if (visible('screen-subcategories')) initSubcategories();
}

function closeCollectionChoice() {
    document.getElementById('modal-collection').classList.add('hidden');
}

// Réponse à la question de première ouverture. La croix et Échap répondent « tout en couleur » :
// on ne repose pas la question, et le réglage reste à portée de main.
function chooseCollection(mode) {
    closeCollectionChoice();
    setPortraitCollection(mode);
}

// À la première ouverture de « Personnages illustres », avant tout autre geste : on demande si les
// portraits se collectionnent. Une fois répondu — oui ou non — on ne le redemande jamais.
function maybeAskPortraitCollection(category) {
    if (appSettings.portraitCollection) return;
    const pantheon = findPantheonNode(category);
    if (!pantheon || collectGalleryEntries(pantheon).length === 0) return;
    document.getElementById('modal-collection').classList.remove('hidden');
}

function backFromGallery() {
    showScreen('screen-subcategories', 'back');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        galleryNameOf, galleryCountryOf, findPantheonNode, galleryNormalize, galleryInitial,
        filterGalleryEntries, compareGalleryEntries, galleryUnlockedCount
    };
}
