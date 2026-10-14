// =========================================================================
// === HISTORIAXE — ATLAS (CARTE DE DÉCOUVERTE) ===
// =========================================================================
// Tous les événements qui ont un lieu (assets/geo/events-geo.json), posés sur une
// carte du monde que l'on zoome au doigt. Pas un mode de jeu : une vitrine, comme
// la galerie des portraits. Filtres par catégorie et par époque ; toucher un point
// (ou une pile d'événements au même endroit) ouvre la fiche, d'où les liens
// « Vu aussi dans… » mènent aux autres thèmes qui racontent le même fait.
//
// La logique (un point par fait, fiche la plus pertinente, filtres, échelle du temps)
// est dans js/atlasCore.js, qui se teste sans navigateur. Ici : l'écran et la carte.
//
// MapLibre GL (assets/vendor/maplibre-gl/, licence BSD-3) n'est chargé qu'à
// l'ouverture de l'Atlas : il pèse 800 Ko et la plupart des parties ne le verront
// pas. Le fond de carte (tuiles vectorielles OpenStreetMap servies par OpenFreeMap,
// sans clé) demande du réseau ; hors-ligne, les points s'affichent sur fond uni.
// L'attribution « © OpenStreetMap » est portée par le contrôle de la carte.

const ATLAS_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const ATLAS_VENDOR_DIR = 'assets/vendor/maplibre-gl/';
const ATLAS_GEO_URL = 'assets/geo/events-geo.json';
// Une couleur par catégorie (index dans bdd) ; la dernière sert aux catégories en trop.
const ATLAS_CAT_COLORS = ['#2f6fdb', '#d9822b', '#2e9d6b', '#8a5cf0', '#d1438a', '#0f9db5', '#6b7b8c'];
// Au-delà, une pile est tronquée dans la liste : 800 lignes à la file n'aident personne.
const ATLAS_LIST_CAP = 300;

const ATLAS_PRESETS = [
    { id: 'all', from: null, to: null },
    { id: 'ancient', from: null, to: 500 },
    { id: 'medieval', from: 500, to: 1500 },
    { id: 'modern', from: 1500, to: 1800 },
    { id: 'contemporary', from: 1800, to: null }
];

let atlasPoints = null;
let atlasGeoPromise = null;
let atlasLibPromise = null;
let atlasModel = null;
let atlasModelBdd = null;
let atlasMemberPile = null;   // objet événement → clé de pile (pour « Voir sur la carte »)
let atlasMap = null;
let atlasMapLoaded = false;
let atlasFilter = { from: null, to: null, cats: null };
let atlasFilterTimer = null;
let atlasPendingFocus = null;

function atlasStatus(text) {
    const el = document.getElementById('atlas-status');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('hidden', !text);
}

function atlasYearLabel(year) {
    if (year < 0) return t('atlas.year_bc', { y: Math.abs(year).toLocaleString(i18n && i18n.currentLang ? i18n.currentLang : 'fr') });
    return String(year);
}

// --- CHARGEMENT PARESSEUX -------------------------------------------------

function atlasLoadGeo() {
    if (atlasPoints) return Promise.resolve(true);
    if (atlasGeoPromise) return atlasGeoPromise;
    atlasGeoPromise = fetch(ATLAS_GEO_URL).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (j) { atlasPoints = j.points || {}; return true; })
        .catch(function (err) {
            console.error('[Atlas] Échec du chargement des points :', err);
            atlasGeoPromise = null;   // permet de réessayer (retour du réseau)
            return false;
        });
    return atlasGeoPromise;
}

function atlasLoadLibrary() {
    if (typeof maplibregl !== 'undefined') return Promise.resolve(true);
    if (atlasLibPromise) return atlasLibPromise;
    atlasLibPromise = new Promise(function (resolve) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = ATLAS_VENDOR_DIR + 'maplibre-gl.css';
        document.head.appendChild(css);
        const js = document.createElement('script');
        js.src = ATLAS_VENDOR_DIR + 'maplibre-gl.js';
        js.onload = function () { resolve(true); };
        js.onerror = function () { atlasLibPromise = null; resolve(false); };
        document.head.appendChild(js);
    });
    return atlasLibPromise;
}

// Construit (ou reconstruit, si la base a changé : langue, thème ajouté) les entités à dessiner.
function atlasBuildModel() {
    if (!atlasPoints) return false;
    const bdd = window.bdd;
    if (atlasModel && atlasModelBdd === bdd) return true;
    atlasModel = AtlasCore.buildAtlas(getAllEventsWithLocation(), atlasPoints);
    atlasModelBdd = bdd;
    atlasMemberPile = new Map();
    atlasModel.index.forEach(function (pile, pileKey) {
        pile.items.forEach(function (item) {
            item.members.forEach(function (m) { atlasMemberPile.set(m.event, pileKey); });
        });
    });
    return true;
}

function atlasEnsureData() {
    return atlasLoadGeo().then(function (ok) { return ok && atlasBuildModel(); });
}

// Le bouton « Voir sur la carte » des fiches n'apparaît que si les points sont déjà là :
// on les prépare donc en arrière-plan, une fois l'app posée (un seul fichier, 800 Ko, mis en cache).
function atlasPrefetch() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const run = function () { atlasEnsureData(); };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 8000 });
    else setTimeout(run, 4000);
}
window.addEventListener('load', function () { setTimeout(atlasPrefetch, 3000); });

// --- ÉCRAN ------------------------------------------------------------------

function initAtlas() {
    renderAtlasControls();
    atlasBindSearch();
    closeAtlasSheet();
    atlasStatus(t('atlas.loading'));
    atlasEnsureData().then(function (ok) {
        if (!ok) { atlasStatus(t('atlas.error')); return false; }
        return atlasLoadLibrary();
    }).then(function (ok) {
        if (ok === false) return;
        if (!ok) { atlasStatus(t('atlas.error')); return; }
        atlasEnsureMap();
    });
}

function backFromAtlas() {
    closeAtlasSheet();
    showScreen('screen-categories', 'back');
}

function atlasEnsureMap() {
    if (atlasMap) {
        atlasMap.resize();
        atlasRefresh();
        atlasConsumeFocus();
        return;
    }
    let map;
    try {
        map = new maplibregl.Map({
            container: 'atlas-map',
            style: ATLAS_STYLE_URL,
            center: [12, 30],
            zoom: 1.4,
            minZoom: 0.8,
            maxZoom: 17,
            attributionControl: { compact: true },
            dragRotate: false,
            pitchWithRotate: false
        });
    } catch (e) {
        console.error('[Atlas] Carte indisponible :', e);
        atlasStatus(t('atlas.no_webgl'));
        return;
    }
    atlasMap = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.touchZoomRotate.disableRotation();
    map.on('load', function () {
        atlasLocalizeLabels();
        atlasAddLayers();
        atlasMapLoaded = true;
        atlasStatus('');
        atlasRefresh();
        atlasConsumeFocus();
    });
    // Un style ou une tuile qui ne vient pas (hors-ligne) n'empêche pas les points : on les pose quand même.
    map.on('error', function (e) {
        if (!atlasMapLoaded && e && e.error && /style|fetch|Failed/i.test(String(e.error.message || e.error))) {
            atlasStatus(t('atlas.offline_basemap'));
        }
    });
}

// Les noms de lieux du fond de carte, dans la langue de l'app quand OpenStreetMap la connaît
// (le style livre « Norway » ; un joueur français veut « Norvège »), sinon le nom local.
function atlasLocalizeLabels() {
    const lang = (typeof i18n !== 'undefined' && i18n.currentLang) ? i18n.currentLang : 'fr';
    atlasMap.getStyle().layers.forEach(function (layer) {
        if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
            atlasMap.setLayoutProperty(layer.id, 'text-field',
                ['coalesce', ['get', 'name:' + lang], ['get', 'name:latin'], ['get', 'name']]);
        }
    });
}

function atlasCategoryColorExpression() {
    const expr = ['match', ['get', 'c']];
    ATLAS_CAT_COLORS.slice(0, -1).forEach(function (color, i) { expr.push(i, color); });
    expr.push(ATLAS_CAT_COLORS[ATLAS_CAT_COLORS.length - 1]);
    return expr;
}

function atlasAddLayers() {
    const map = atlasMap;
    const color = atlasCategoryColorExpression();
    const empty = { type: 'FeatureCollection', features: [] };
    const FONT = ['Noto Sans Bold'];

    map.addSource('atlas-zones', { type: 'geojson', data: empty });
    map.addLayer({
        id: 'atlas-zones', type: 'circle', source: 'atlas-zones', minzoom: 3,
        paint: {
            'circle-color': color,
            'circle-opacity': 0.14,
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 7, 6, 28, 10, 60],
            'circle-stroke-color': color,
            'circle-stroke-width': 1.5,
            'circle-stroke-opacity': 0.55
        }
    });

    map.addSource('atlas-piles', {
        type: 'geojson', data: empty, cluster: true, clusterMaxZoom: 12, clusterRadius: 42,
        clusterProperties: { total: ['+', ['get', 'n']] }
    });
    map.addLayer({
        id: 'atlas-clusters', type: 'circle', source: 'atlas-piles', filter: ['has', 'point_count'],
        paint: {
            'circle-color': '#26457f',
            'circle-opacity': 0.88,
            'circle-radius': ['step', ['get', 'total'], 14, 25, 18, 150, 23, 800, 29],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
        }
    });
    map.addLayer({
        id: 'atlas-cluster-count', type: 'symbol', source: 'atlas-piles', filter: ['has', 'point_count'],
        layout: { 'text-field': ['to-string', ['get', 'total']], 'text-font': FONT, 'text-size': 12, 'text-allow-overlap': true },
        paint: { 'text-color': '#ffffff' }
    });
    const pileBonus = ['min', 7, ['*', 2, ['ln', ['get', 'n']]]];
    map.addLayer({
        id: 'atlas-points', type: 'circle', source: 'atlas-piles', filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': color,
            'circle-opacity': ['case', ['==', ['get', 'flag'], 1], 0.55, 0.95],
            'circle-radius': ['interpolate', ['linear'], ['zoom'],
                2, ['+', 3.5, pileBonus], 10, ['+', 6, pileBonus], 16, ['+', 9, pileBonus]],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.5
        }
    });
    map.addLayer({
        id: 'atlas-pile-count', type: 'symbol', source: 'atlas-piles',
        filter: ['all', ['!', ['has', 'point_count']], ['>', ['get', 'n'], 1]],
        layout: { 'text-field': ['to-string', ['get', 'n']], 'text-font': FONT, 'text-size': 11, 'text-allow-overlap': true },
        paint: { 'text-color': '#ffffff' }
    });

    map.on('click', atlasOnMapClick);
    ['atlas-clusters', 'atlas-points', 'atlas-zones'].forEach(function (layer) {
        map.on('mouseenter', layer, function () { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, function () { map.getCanvas().style.cursor = ''; });
    });
}

function atlasOnMapClick(e) {
    const r = 12;
    const hits = atlasMap.queryRenderedFeatures(
        [[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r]],
        { layers: ['atlas-clusters', 'atlas-points', 'atlas-zones'] }
    );
    if (hits.length === 0) { closeAtlasSheet(); return; }
    const cluster = hits.find(function (f) { return f.layer.id === 'atlas-clusters'; });
    if (cluster) {
        atlasMap.getSource('atlas-piles').getClusterExpansionZoom(cluster.properties.cluster_id).then(function (zoom) {
            atlasMap.easeTo({ center: cluster.geometry.coordinates, zoom: zoom + 0.5 });
        });
        return;
    }
    // Les cercles de zone sont grands et passent sous les points : un point touché l'emporte.
    const points = hits.filter(function (f) { return f.layer.id === 'atlas-points'; });
    const keys = [];
    (points.length ? points : hits).forEach(function (f) {
        if (f.properties.pile && keys.indexOf(f.properties.pile) === -1) keys.push(f.properties.pile);
    });
    atlasShowPiles(keys);
}

// --- DONNÉES AFFICHÉES ------------------------------------------------------

function atlasRefresh() {
    if (!atlasMapLoaded || !atlasModel) return;
    const filter = {
        from: atlasFilter.from,
        to: atlasFilter.to,
        cats: atlasFilter.cats
    };
    const pts = AtlasCore.applyFilter(atlasModel.features, atlasModel.index, filter);
    const zones = AtlasCore.applyFilter(atlasModel.zones, atlasModel.index, filter);
    atlasMap.getSource('atlas-piles').setData({ type: 'FeatureCollection', features: pts });
    atlasMap.getSource('atlas-zones').setData({ type: 'FeatureCollection', features: zones });
    const total = AtlasCore.countEvents(pts) + AtlasCore.countEvents(zones);
    const count = document.getElementById('atlas-count');
    if (count) count.textContent = t(total === 1 ? 'atlas.count_one' : 'atlas.count', { n: total.toLocaleString(i18n && i18n.currentLang ? i18n.currentLang : 'fr') });
}

function atlasScheduleRefresh() {
    clearTimeout(atlasFilterTimer);
    atlasFilterTimer = setTimeout(atlasRefresh, 120);
}

// --- COMMANDES ------------------------------------------------------------

function renderAtlasControls() {
    const cats = document.getElementById('atlas-cats');
    const presets = document.getElementById('atlas-presets');
    if (!cats || !presets) return;
    cats.innerHTML = '';
    (window.bdd || []).forEach(function (cat, ci) {
        if (!cat || cat.isCustomCategory) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'atlas-chip';
        btn.dataset.cat = String(ci);
        btn.setAttribute('aria-pressed', String(!!(atlasFilter.cats && atlasFilter.cats.has(AtlasCore.categoryBit({ categoryIndex: ci })))));
        const dot = document.createElement('span');
        dot.className = 'atlas-chip-dot';
        dot.style.background = ATLAS_CAT_COLORS[Math.min(ci, ATLAS_CAT_COLORS.length - 1)];
        dot.setAttribute('aria-hidden', 'true');
        btn.append(dot, document.createTextNode(cat.nom));
        btn.onclick = function () { atlasToggleCategory(ci); };
        cats.appendChild(btn);
    });
    presets.innerHTML = '';
    ATLAS_PRESETS.forEach(function (p) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'atlas-chip';
        btn.dataset.preset = p.id;
        btn.textContent = t('atlas.preset_' + p.id);
        btn.onclick = function () { atlasSetRange(p.from, p.to, true); };
        presets.appendChild(btn);
    });
    const from = document.getElementById('atlas-from');
    const to = document.getElementById('atlas-to');
    from.oninput = function () { atlasOnSlider('from'); };
    to.oninput = function () { atlasOnSlider('to'); };
    document.getElementById('atlas-sheet-close').onclick = closeAtlasSheet;
    syncAtlasControls();
}

function atlasToggleCategory(ci) {
    const bit = AtlasCore.categoryBit({ categoryIndex: ci });
    const cats = new Set(atlasFilter.cats || []);
    if (cats.has(bit)) cats.delete(bit); else cats.add(bit);
    atlasFilter.cats = cats.size ? cats : null;
    syncAtlasControls();
    atlasScheduleRefresh();
}

function atlasOnSlider(which) {
    const from = document.getElementById('atlas-from');
    const to = document.getElementById('atlas-to');
    let a = Number(from.value);
    let b = Number(to.value);
    // Les deux poignées ne se croisent pas : celle qu'on déplace pousse l'autre.
    if (a > b) { if (which === 'from') b = a; else a = b; }
    atlasFilter.from = a <= 0 ? null : AtlasCore.roundYear(AtlasCore.positionToYear(a / 1000));
    atlasFilter.to = b >= 1000 ? null : AtlasCore.roundYear(AtlasCore.positionToYear(b / 1000));
    syncAtlasControls();
    atlasScheduleRefresh();
}

function atlasSetRange(fromYear, toYear) {
    atlasFilter.from = fromYear;
    atlasFilter.to = toYear;
    syncAtlasControls();
    atlasScheduleRefresh();
}

// Remet les commandes d'accord avec le filtre (puces, curseurs, libellé de l'époque).
function syncAtlasControls() {
    const from = document.getElementById('atlas-from');
    const to = document.getElementById('atlas-to');
    if (!from || !to) return;
    from.value = String(atlasFilter.from === null ? 0 : Math.round(AtlasCore.yearToPosition(atlasFilter.from) * 1000));
    to.value = String(atlasFilter.to === null ? 1000 : Math.round(AtlasCore.yearToPosition(atlasFilter.to) * 1000));
    const years = document.getElementById('atlas-years');
    if (years) {
        years.textContent = (atlasFilter.from === null && atlasFilter.to === null)
            ? t('atlas.all_periods')
            : (atlasFilter.from === null ? t('atlas.until', { y: atlasYearLabel(atlasFilter.to) })
                : atlasFilter.to === null ? t('atlas.from', { y: atlasYearLabel(atlasFilter.from) })
                    : atlasYearLabel(atlasFilter.from) + ' → ' + atlasYearLabel(atlasFilter.to));
    }
    document.querySelectorAll('#atlas-cats .atlas-chip').forEach(function (btn) {
        const bit = AtlasCore.categoryBit({ categoryIndex: Number(btn.dataset.cat) });
        btn.setAttribute('aria-pressed', String(!!(atlasFilter.cats && atlasFilter.cats.has(bit))));
    });
    document.querySelectorAll('#atlas-presets .atlas-chip').forEach(function (btn) {
        const p = ATLAS_PRESETS.find(function (x) { return x.id === btn.dataset.preset; });
        btn.setAttribute('aria-pressed', String(!!p && p.from === atlasFilter.from && p.to === atlasFilter.to));
    });
}

// --- FEUILLE DU BAS : ce qu'il y a à cet endroit -----------------------------

function closeAtlasSheet() {
    const sheet = document.getElementById('atlas-sheet');
    if (sheet) sheet.classList.add('hidden');
}

function atlasOpenItem(item) {
    const e = item.entry;
    openModal(e.event, {
        theme: e.theme,
        categoryIndex: e.categoryIndex,
        subcategoryIndex: e.subcategoryIndex,
        themeIndex: e.themeIndex,
        hideRedraw: true
    });
}

function atlasShowPiles(pileKeys, focusEvt) {
    const items = [];
    pileKeys.forEach(function (pk) {
        const pile = atlasModel.index.get(pk);
        if (pile) AtlasCore.visibleItems(pile, atlasFilter).forEach(function (it) { items.push(it); });
    });
    items.sort(function (a, b) { return a.year - b.year; });
    const sheet = document.getElementById('atlas-sheet');
    const body = document.getElementById('atlas-sheet-body');
    if (!sheet || !body) return;
    if (items.length === 0) { closeAtlasSheet(); return; }
    body.innerHTML = '';
    if (items.length === 1) {
        body.appendChild(atlasBuildCard(items[0]));
    } else {
        const head = document.createElement('div');
        head.className = 'atlas-sheet-title';
        const labels = Array.from(new Set(items.map(function (i) { return i.label; }).filter(Boolean)));
        head.textContent = t('atlas.pile_title', { n: items.length.toLocaleString(i18n && i18n.currentLang ? i18n.currentLang : 'fr') })
            + (labels.length === 1 ? ' · ' + labels[0] : '');
        body.appendChild(head);
        const list = document.createElement('div');
        list.className = 'atlas-list';
        // Venu de « Voir sur la carte » : la ligne de l'événement cherché est mise en avant,
        // et reste visible même quand la pile dépasse la limite d'affichage.
        const focusAt = focusEvt ? items.findIndex(function (it) { return it.members.some(function (m) { return m.event === focusEvt; }); }) : -1;
        const shown = items.slice(0, ATLAS_LIST_CAP);
        if (focusAt >= ATLAS_LIST_CAP) shown.push(items[focusAt]);
        shown.forEach(function (it) {
            const row = atlasBuildRow(it);
            if (focusEvt && it.members.some(function (m) { return m.event === focusEvt; })) {
                row.classList.add('atlas-row-focus');
                row.setAttribute('aria-current', 'true');
            }
            list.appendChild(row);
        });
        body.appendChild(list);
        if (items.length > ATLAS_LIST_CAP) {
            const note = document.createElement('p');
            note.className = 'atlas-list-note';
            note.textContent = t('atlas.pile_cap', { n: ATLAS_LIST_CAP });
            body.appendChild(note);
        }
    }
    sheet.classList.remove('hidden');
    body.scrollTop = 0;
    const focused = body.querySelector('.atlas-row-focus');
    if (focused) focused.scrollIntoView({ block: 'center' });
}

function atlasApproxNote(item) {
    return (item.flag || item.prec === 'z') ? t('atlas.approx') : '';
}

function atlasBuildRow(item) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'atlas-row';
    const year = document.createElement('span');
    year.className = 'atlas-row-year';
    year.textContent = atlasYearLabel(item.year);
    const title = document.createElement('span');
    title.className = 'atlas-row-title';
    title.textContent = item.entry.event.titre;
    btn.append(year, title);
    const approx = atlasApproxNote(item);
    if (approx) {
        const mark = document.createElement('span');
        mark.className = 'atlas-row-approx';
        mark.textContent = '≈';
        mark.title = approx;
        btn.appendChild(mark);
        btn.setAttribute('aria-label', item.entry.event.titre + ', ' + atlasYearLabel(item.year) + ', ' + approx);
    }
    btn.onclick = function () { atlasOpenItem(item); };
    return btn;
}

function atlasBuildCard(item) {
    const evt = item.entry.event;
    const card = document.createElement('div');
    card.className = 'atlas-card';
    const title = document.createElement('h3');
    title.className = 'atlas-card-title';
    title.textContent = evt.titre;
    const meta = document.createElement('div');
    meta.className = 'atlas-card-meta';
    meta.textContent = atlasYearLabel(item.year) + (item.label ? ' · ' + item.label : '');
    card.append(title, meta);
    const approx = atlasApproxNote(item);
    if (approx) {
        const note = document.createElement('div');
        note.className = 'atlas-card-approx';
        note.textContent = approx;
        card.appendChild(note);
    }
    const desc = document.createElement('p');
    desc.className = 'atlas-card-desc';
    const text = evt.description || '';
    desc.textContent = text.length > 220 ? text.slice(0, 217).replace(/\s+\S*$/, '') + '…' : text;
    card.appendChild(desc);
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'btn';
    open.textContent = t('atlas.open_card');
    open.onclick = function () { atlasOpenItem(item); };
    card.appendChild(open);
    return card;
}

// --- DEPUIS UNE FICHE : « Voir sur la carte » ------------------------------

// Appelée par openModal : le bouton n'apparaît que si cet événement a un point sur la carte.
function renderModalMapButton(evt) {
    const row = document.getElementById('modal-map-row');
    const btn = document.getElementById('modal-map-btn');
    if (!row || !btn) return;
    const ready = !!(atlasModel && atlasModelBdd === window.bdd && atlasMemberPile && atlasMemberPile.has(evt));
    row.classList.toggle('hidden', !ready);
    btn.onclick = ready ? function () { closeModal(); openAtlasAt(evt); } : null;
}

function openAtlasAt(evt) {
    atlasPendingFocus = evt;
    // Un filtre qui cacherait l'événement qu'on vient chercher n'aurait pas de sens.
    atlasFilter = { from: null, to: null, cats: null };
    showScreen('screen-atlas');
}

function atlasConsumeFocus() {
    const evt = atlasPendingFocus;
    atlasPendingFocus = null;
    if (!evt || !atlasMemberPile) return;
    const pk = atlasMemberPile.get(evt);
    const pile = pk && atlasModel.index.get(pk);
    if (!pile) return;
    atlasMap.jumpTo({ center: pile.coords, zoom: pile.prec === 'z' ? 5 : 9 });
    atlasShowPiles([pk], evt);
}


// --- RECHERCHE --------------------------------------------------------------
// Un champ en haut de la carte : on tape un titre ou un nom de lieu, la liste propose des lieux
// (regroupés par nom) puis des événements ; choisir l'un d'eux cadre la carte et ouvre la feuille.

let atlasSearchBound = false;
let atlasSearchTimer = null;
let atlasSearchHits = [];   // actions des résultats affichés, dans l'ordre (Entrée prend la première)

function atlasBindSearch() {
    if (atlasSearchBound) return;
    const input = document.getElementById('atlas-search-input');
    const clear = document.getElementById('atlas-search-clear');
    if (!input || !clear) return;
    atlasSearchBound = true;
    input.addEventListener('input', function () {
        clear.classList.toggle('hidden', input.value === '');
        clearTimeout(atlasSearchTimer);
        atlasSearchTimer = setTimeout(atlasRunSearch, 120);
    });
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (input.value) atlasClearSearch(); else input.blur();
            e.stopPropagation();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(atlasSearchTimer);
            atlasRunSearch();
            if (atlasSearchHits.length) atlasSearchHits[0]();
        }
    });
    clear.addEventListener('click', function () { atlasClearSearch(); input.focus(); });
}

function atlasClearSearch() {
    const input = document.getElementById('atlas-search-input');
    if (input) input.value = '';
    const clear = document.getElementById('atlas-search-clear');
    if (clear) clear.classList.add('hidden');
    atlasHideSearchResults();
}

function atlasHideSearchResults() {
    atlasSearchHits = [];
    const box = document.getElementById('atlas-search-results');
    const input = document.getElementById('atlas-search-input');
    if (box) { box.classList.add('hidden'); box.innerHTML = ''; }
    if (input) input.setAttribute('aria-expanded', 'false');
}

function atlasRunSearch() {
    const input = document.getElementById('atlas-search-input');
    const box = document.getElementById('atlas-search-results');
    if (!input || !box) return;
    const query = input.value;
    atlasSearchHits = [];
    box.innerHTML = '';
    if (!atlasModel || query.trim().length < 2) { atlasHideSearchResults(); return; }
    const res = AtlasCore.searchAtlas(atlasModel.index, query);
    const section = function (titleKey) {
        const h = document.createElement('div');
        h.className = 'atlas-search-section';
        h.textContent = t(titleKey);
        box.appendChild(h);
    };
    const option = function (action) {
        atlasSearchHits.push(action);
        return function () { action(); };
    };
    if (res.places.length) {
        section('atlas.search_places');
        res.places.forEach(function (pl) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'atlas-search-item';
            btn.setAttribute('role', 'option');
            const name = document.createElement('span');
            name.className = 'atlas-search-main';
            name.textContent = '📍 ' + pl.label;
            const n = document.createElement('span');
            n.className = 'atlas-search-aside';
            n.textContent = t('atlas.search_place_n', { n: pl.n.toLocaleString(i18n && i18n.currentLang ? i18n.currentLang : 'fr') });
            btn.append(name, n);
            btn.onclick = option(function () { atlasGoToPlace(pl); });
            box.appendChild(btn);
        });
    }
    if (res.events.length) {
        section('atlas.search_events');
        res.events.forEach(function (hit) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'atlas-search-item';
            btn.setAttribute('role', 'option');
            const year = document.createElement('span');
            year.className = 'atlas-row-year';
            year.textContent = atlasYearLabel(hit.item.year);
            const title = document.createElement('span');
            title.className = 'atlas-search-main';
            title.textContent = hit.item.entry.event.titre;
            btn.append(year, title);
            if (hit.item.label) {
                const where = document.createElement('span');
                where.className = 'atlas-search-aside';
                where.textContent = hit.item.label;
                btn.appendChild(where);
            }
            btn.onclick = option(function () { atlasGoToEvent(hit); });
            box.appendChild(btn);
        });
    }
    if (!res.places.length && !res.events.length) {
        const none = document.createElement('div');
        none.className = 'atlas-search-none';
        none.textContent = t('atlas.search_none');
        box.appendChild(none);
    }
    box.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
}

// Un résultat de recherche ne doit pas être caché par un filtre d'époque ou de catégorie.
function atlasResetFilterForSearch() {
    const touched = atlasFilter.from !== null || atlasFilter.to !== null || atlasFilter.cats;
    if (!touched) return;
    atlasFilter = { from: null, to: null, cats: null };
    renderAtlasControls();
    syncAtlasControls();
    atlasRefresh();
}

function atlasGoToEvent(hit) {
    atlasClearSearch();
    document.getElementById('atlas-search-input').blur();
    atlasResetFilterForSearch();
    const pile = atlasModel.index.get(hit.pileKey);
    if (!pile || !atlasMap) return;
    atlasMap.flyTo({ center: pile.coords, zoom: pile.prec === 'z' ? 5 : 9, essential: true });
    atlasShowPiles([hit.pileKey], hit.item.entry.event);
}

function atlasGoToPlace(pl) {
    atlasClearSearch();
    document.getElementById('atlas-search-input').blur();
    atlasResetFilterForSearch();
    if (!atlasMap) return;
    const coords = pl.pileKeys.map(function (k) { return atlasModel.index.get(k).coords; });
    if (coords.length === 1) {
        atlasMap.flyTo({ center: coords[0], zoom: 9, essential: true });
    } else {
        const b = coords.reduce(function (acc, c) {
            return [[Math.min(acc[0][0], c[0]), Math.min(acc[0][1], c[1])], [Math.max(acc[1][0], c[0]), Math.max(acc[1][1], c[1])]];
        }, [[coords[0][0], coords[0][1]], [coords[0][0], coords[0][1]]]);
        atlasMap.fitBounds(b, { padding: 60, maxZoom: 9, essential: true });
    }
    atlasShowPiles(pl.pileKeys);
}
