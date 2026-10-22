// =========================================================================
// === LES CARTES HISTORIQUES (écran de la boîte à outils) ===
// =========================================================================
// Deux façons de regarder : PAR EMPIRE (un menu d'entités groupées par époque d'apogée, puis un instantané daté) ou PAR DATE (un curseur
// montre tout ce qui existe à l'année choisie). Par empire : la carte colore la zone, la fiche dit qui, quand, où,
// et liste les événements de l'app situés dans cette zone pendant la période de l'entité. Les contours sont dessinés à la main et
// approximatifs (js/historyMapsCore.js) : l'écran le dit. Ils peuvent déborder sur la mer ; un masque de mer, calculé à partir des
// contours des pays actuels (assets/geo/countries.json, chargés par js/app/countries.js), ne laisse colorée que la terre ferme.
// Comme l'Atlas des pays, la carte est autonome (sans fond réseau) et la fiche marche même sans WebGL.

let historyMap = null;
let historyMapReady = false;
let historyEntityId = 'rome';
let historySnapshotId = null;
let historyMode = 'entity';        // 'entity' : un empire et ses dates ; 'date' : tout ce qui existe à une date (curseur)
let historyYear = 1500;
const HISTORY_PRESETS = [-500, 117, 800, 1250, 1500, 1683, 1812, 1920];
const historyEventsCache = new Map();

function toolHistoryInit() {
    const status = document.getElementById('tool-history-status');
    status.textContent = t('tools.history_loading');
    if (!document.getElementById('tool-history-presets').firstChild) toolHistoryRenderPresets();
    toolHistoryRenderEntities();
    toolHistoryApplyMode();
    countriesLoad().then(ok => {
        if (!ok) { status.textContent = t('tools.countries_error'); return; }
        status.textContent = '';
        return Promise.all([historyLoadLand(), typeof atlasLoadLibrary === 'function' ? atlasLoadLibrary() : false]).then(([land, lib]) => land && lib);
    }).then(ok => {
        if (ok === undefined) return;
        if (!ok) { status.textContent = t('tools.countries_no_map'); return; }
        historyEnsureMap();
    });
}

// --- Les modes : un empire, ou une date ------------------------------------------------------------
function toolHistoryMode(mode) {
    historyMode = mode === 'date' ? 'date' : 'entity';
    toolHistoryApplyMode();
}

function toolHistoryApplyMode() {
    const date = historyMode === 'date';
    document.getElementById('tool-history-mode-entity').setAttribute('aria-pressed', date ? 'false' : 'true');
    document.getElementById('tool-history-mode-date').setAttribute('aria-pressed', date ? 'true' : 'false');
    document.getElementById('tool-history-entity-block').classList.toggle('hidden', date);
    document.getElementById('tool-history-date-block').classList.toggle('hidden', !date);
    if (historyMap && historyMapReady) historyMap.setPaintProperty('zones-fill', 'fill-opacity', date ? 0.55 : 0.72);
    if (date) {
        document.getElementById('tool-history-slider').value = String(HistoryMapsCore.yearToPosition(historyYear));
        toolHistoryDateRender();
    } else {
        toolHistorySelect(historyEntityId, historySnapshotId, { keepMap: true });
    }
}

// --- Le choix de l'empire (un menu groupé par époque d'apogée) et de la date (quelques puces) --------------------
// Vingt-trois puces d'empires encombraient l'écran : un menu déroulant natif les range en quatre groupes (HistoryMapsCore.CATEGORIES), avec
// leur emoji ; les dates de l'empire choisi (deux à quatre) restent des puces, sur une seule rangée.
function toolHistoryRenderEntities() {
    const select = document.getElementById('tool-history-entity-select');
    while (select.firstChild) select.removeChild(select.firstChild);
    HistoryMapsCore.CATEGORIES.forEach(category => {
        const group = document.createElement('optgroup');
        group.label = category.title;
        HistoryMapsCore.ENTITIES.filter(entity => HistoryMapsCore.categoryOf(entity) === category.id).forEach(entity => {
            const option = document.createElement('option');
            option.value = entity.id;
            option.textContent = entity.icon + ' ' + entity.name;
            group.appendChild(option);
        });
        select.appendChild(group);
    });
    select.value = historyEntityId;
}

function toolHistoryPick(entityId) {
    toolHistorySelect(entityId, null, {});
}

function toolHistoryRenderSnapshots(entity) {
    const holder = document.getElementById('tool-history-snapshots');
    while (holder.firstChild) holder.removeChild(holder.firstChild);
    entity.snapshots.forEach(snapshot => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip is-date';
        btn.dataset.snapshot = snapshot.id;
        const year = document.createElement('strong');
        year.textContent = ToolsCore.yearText(snapshot.year) + ' ';
        btn.appendChild(year);
        btn.appendChild(document.createTextNode(snapshot.label));
        btn.setAttribute('aria-pressed', snapshot.id === historySnapshotId ? 'true' : 'false');
        btn.onclick = () => toolHistorySelect(entity.id, snapshot.id, {});
        holder.appendChild(btn);
    });
}

// Sans instantané choisi, on prend celui qui est le plus près de l'apogée de l'entité.
function historyDefaultSnapshot(entity) {
    return entity.snapshots.reduce((best, snapshot) => (Math.abs(snapshot.year - entity.peak) < Math.abs(best.year - entity.peak) ? snapshot : best), entity.snapshots[0]);
}

function toolHistorySelect(entityId, snapshotId, how) {
    const entity = HistoryMapsCore.entityById(entityId) || HistoryMapsCore.ENTITIES[0];
    const snapshot = HistoryMapsCore.snapshotOf(entity, snapshotId) || historyDefaultSnapshot(entity);
    historyEntityId = entity.id;
    historySnapshotId = snapshot.id;
    document.getElementById('tool-history-entity-select').value = entity.id;
    toolHistoryRenderSnapshots(entity);
    toolHistoryRenderFiche(entity, snapshot);
    historyShowOnMap(entity, snapshot, !(how && how.keepMap));
}

// --- Le curseur temporel -------------------------------------------------------------------------------
function toolHistoryRenderPresets() {
    const holder = document.getElementById('tool-history-presets');
    while (holder.firstChild) holder.removeChild(holder.firstChild);
    HISTORY_PRESETS.forEach(year => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip is-date';
        btn.dataset.year = String(year);
        btn.textContent = ToolsCore.yearText(year);
        btn.onclick = () => { historyYear = year; document.getElementById('tool-history-slider').value = String(HistoryMapsCore.yearToPosition(year)); toolHistoryDateRender(); };
        holder.appendChild(btn);
    });
}

function toolHistorySlide(position) {
    historyYear = HistoryMapsCore.positionToYear(Number(position));
    toolHistoryDateRender();
}

// À une date, toutes les entités qui existent, chacune avec la carte la plus proche ; la liste dit de quelle année est chaque carte.
function toolHistoryDateRender() {
    const active = HistoryMapsCore.activeAt(historyYear);
    document.getElementById('tool-history-year').textContent = ToolsCore.yearText(historyYear);
    document.querySelectorAll('#tool-history-presets .tool-history-chip').forEach(btn => {
        btn.setAttribute('aria-pressed', Number(btn.dataset.year) === historyYear ? 'true' : 'false');
    });
    const panel = document.getElementById('tool-history-fiche');
    while (panel.firstChild) panel.removeChild(panel.firstChild);
    const title = document.createElement('h3');
    title.className = 'tool-countries-name';
    title.textContent = t(active.length > 1 ? 'tools.history_active_many' : active.length === 1 ? 'tools.history_active_one' : 'tools.history_active_none', { year: ToolsCore.yearText(historyYear), n: active.length });
    panel.appendChild(title);
    if (active.length) {
        const note = document.createElement('p');
        note.className = 'tool-small';
        note.textContent = t('tools.history_active_note');
        panel.appendChild(note);
    }
    const list = document.createElement('div');
    list.className = 'tool-countries-event-list';
    active.forEach(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-countries-event tool-history-active';
        btn.dataset.entity = item.entity.id;
        const dot = document.createElement('span');
        dot.className = 'tool-history-dot';
        dot.style.background = item.entity.color;
        dot.setAttribute('aria-hidden', 'true');
        btn.appendChild(dot);
        const name = document.createElement('strong');
        name.textContent = ' ' + item.entity.name;
        btn.appendChild(name);
        const map = document.createElement('small');
        map.className = 'tool-row-note';
        map.textContent = ' · ' + t('tools.history_map_of', { year: ToolsCore.yearText(item.snapshot.year), label: item.snapshot.label });
        btn.appendChild(map);
        btn.onclick = () => { historyMode = 'entity'; historyEntityId = item.entity.id; historySnapshotId = item.snapshot.id; toolHistoryApplyMode(); };
        list.appendChild(btn);
    });
    panel.appendChild(list);
    historyShowYear(active);
}

// --- La carte --------------------------------------------------------------------------
// Un masque de mer : le monde entier, percé d'un trou par masse de terre (assets/geo/land.json : l'union des pays, calculée une fois pour toutes,
// sinon les trous de pays voisins se touchent et la triangulation se trompe). Tout ce qui est dessiné dessous (les zones historiques)
// n'apparaît donc que sur terre. Les lacs et mers intérieures de cette silhouette (la Caspienne) redeviennent de la mer.
const HISTORY_LAND_URL = 'assets/geo/land.json';
let historyLand = null;
let historyLandPromise = null;

function historyLoadLand() {
    if (historyLand) return Promise.resolve(true);
    if (historyLandPromise) return historyLandPromise;
    historyLandPromise = fetch(HISTORY_LAND_URL).then(r => (r.ok ? r.json() : Promise.reject(r.status))).then(land => {
        historyLand = land;
        return true;
    }).catch(() => { historyLandPromise = null; return false; });
    return historyLandPromise;
}

function historySeaMask() {
    const world = [[-181, -86], [181, -86], [181, 86], [-181, 86], [-181, -86]];
    const polygons = [[world].concat(historyLand.coordinates.map(polygon => polygon[0]))];
    historyLand.coordinates.forEach(polygon => polygon.slice(1).forEach(lake => polygons.push([lake])));
    return { type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates: polygons } };
}

function historyEnsureMap() {
    if (!countriesData || !historyLand) return;
    if (historyMap) { historyMap.resize(); return; }
    let map;
    try {
        map = new maplibregl.Map({
            container: 'tool-history-map',
            style: countriesBuildStyle(),
            bounds: [[-20, -10], [150, 62]],
            fitBoundsOptions: { padding: 6 },
            minZoom: -1,
            maxZoom: 8,
            renderWorldCopies: false,
            attributionControl: false,
            dragRotate: false,
            pitchWithRotate: false
        });
    } catch (e) {
        document.getElementById('tool-history-status').textContent = t('tools.countries_no_webgl');
        return;
    }
    historyMap = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.touchZoomRotate.disableRotation();
    map.on('load', () => {
        historyAddLayers();
        historyMapReady = true;
        if (historyMode === 'date') { toolHistoryApplyMode(); return; }
        const entity = HistoryMapsCore.entityById(historyEntityId);
        if (entity) historyShowOnMap(entity, HistoryMapsCore.snapshotOf(entity, historySnapshotId), true);
    });
    map.on('error', () => {});
}

function historyAddLayers() {
    const map = historyMap;
    const theme = countriesTheme();
    const empty = { type: 'FeatureCollection', features: [] };
    map.addSource('base', { type: 'geojson', data: countriesData.geo });
    map.addLayer({ id: 'base-land', type: 'fill', source: 'base', paint: { 'fill-color': theme === 'dark' ? '#27323f' : '#dfe5ea' } });
    map.addSource('zones', { type: 'geojson', data: empty });
    map.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.72 } });
    map.addLayer({ id: 'zones-line', type: 'line', source: 'zones', paint: { 'line-color': ['get', 'color'], 'line-width': 2.5 } });
    map.addSource('sea', { type: 'geojson', data: historySeaMask(), tolerance: 0, buffer: 512 });
    map.addLayer({ id: 'sea-mask', type: 'fill', source: 'sea', paint: { 'fill-color': COUNTRIES_OCEAN[theme], 'fill-opacity': 1 } });
    map.addLayer({ id: 'base-borders', type: 'line', source: 'base', paint: { 'line-color': theme === 'dark' ? '#0f1a26' : '#ffffff', 'line-width': 0.5, 'line-opacity': 0.8 } });
    // Les villes repères de l'entité : des points (toujours visibles) et leurs noms (qui demandent le réseau pour les polices).
    // Deux sources : si les polices ne viennent pas (hors-ligne), la source des noms n'est jamais prête, et elle bloquerait aussi les points.
    map.addSource('places', { type: 'geojson', data: empty });
    map.addSource('places-names', { type: 'geojson', data: empty });
    map.addLayer({
        id: 'places-dots', type: 'circle', source: 'places',
        paint: { 'circle-radius': 4, 'circle-color': theme === 'dark' ? '#f2f5f8' : '#26323f', 'circle-stroke-color': theme === 'dark' ? '#0f1a26' : '#ffffff', 'circle-stroke-width': 1.5 }
    });
    map.addLayer({
        id: 'places-labels', type: 'symbol', source: 'places-names',
        layout: { 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, 0.9], 'text-anchor': 'top', 'text-max-width': 7 },
        paint: { 'text-color': theme === 'dark' ? '#e8eef5' : '#26323f', 'text-halo-color': theme === 'dark' ? '#0f1a26' : '#ffffff', 'text-halo-width': 1.4 }
    });
}

// Toutes les entités actives à une date : leurs zones, chacune dans la couleur de son entité ; pas de villes (elles se mélangeraient).
function historyShowYear(active) {
    if (!historyMap || !historyMapReady) return;
    const features = [];
    active.forEach(item => HistoryMapsCore.snapshotFeatures(item.entity, item.snapshot).forEach(f => features.push(f)));
    historyMap.getSource('zones').setData({ type: 'FeatureCollection', features });
    const none = { type: 'FeatureCollection', features: [] };
    historyMap.getSource('places').setData(none);
    historyMap.getSource('places-names').setData(none);
}

function historyShowOnMap(entity, snapshot, fit) {
    if (!historyMap || !historyMapReady || !snapshot) return;
    historyMap.getSource('zones').setData({ type: 'FeatureCollection', features: HistoryMapsCore.snapshotFeatures(entity, snapshot) });
    const places = {
        type: 'FeatureCollection',
        features: (entity.places || []).map(place => ({ type: 'Feature', geometry: { type: 'Point', coordinates: place.c }, properties: { n: place.n } }))
    };
    historyMap.getSource('places').setData(places);
    historyMap.getSource('places-names').setData(places);
    if (!fit) return;
    const prepared = CountriesCore.prepare(HistoryMapsCore.snapshotGeometry(snapshot));
    const b = prepared.box;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    historyMap.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 24, maxZoom: 6, duration: reduce ? 0 : 700 });
}

// --- La fiche --------------------------------------------------------------------------
function toolHistoryRenderFiche(entity, snapshot) {
    const panel = document.getElementById('tool-history-fiche');
    while (panel.firstChild) panel.removeChild(panel.firstChild);
    const head = document.createElement('h3');
    head.className = 'tool-countries-name';
    head.textContent = entity.icon + ' ' + entity.name;
    panel.appendChild(head);
    const span = document.createElement('p');
    span.className = 'tool-countries-badge';
    span.textContent = entity.span;
    panel.appendChild(span);
    const when = document.createElement('p');
    when.className = 'tool-history-when';
    const strong = document.createElement('strong');
    strong.textContent = ToolsCore.yearText(snapshot.year) + ' · ' + snapshot.label;
    when.appendChild(strong);
    panel.appendChild(when);
    const text = document.createElement('p');
    text.className = 'tool-small';
    text.textContent = snapshot.text;
    panel.appendChild(text);
    if (HistoryMapsCore.legendNeeded(entity, snapshot)) {
        const legend = document.createElement('ul');
        legend.className = 'tool-history-legend';
        snapshot.zones.forEach(zone => {
            const li = document.createElement('li');
            const dot = document.createElement('span');
            dot.className = 'tool-history-dot';
            dot.style.background = zone.color || entity.color;
            dot.setAttribute('aria-hidden', 'true');
            li.appendChild(dot);
            li.appendChild(document.createTextNode(' ' + zone.name));
            legend.appendChild(li);
        });
        panel.appendChild(legend);
    }
    const dl = document.createElement('dl');
    dl.className = 'tool-countries-facts';
    [['history_capital', entity.capital], ['history_period', entity.span]].forEach(([key, value]) => {
        const dt = document.createElement('dt');
        dt.textContent = t('tools.' + key);
        const dd = document.createElement('dd');
        dd.textContent = value;
        dl.appendChild(dt);
        dl.appendChild(dd);
    });
    panel.appendChild(dl);
    const summary = document.createElement('p');
    summary.className = 'tool-small';
    summary.textContent = entity.summary;
    panel.appendChild(summary);
    const events = document.createElement('div');
    events.className = 'tool-countries-events';
    events.id = 'tool-history-events';
    panel.appendChild(events);
    toolHistoryRenderEvents(entity, snapshot);
}

// Les événements de l'app situés dans la zone de l'instantané, pendant la période de l'entité.
function toolHistoryEventsOf(entity, snapshot) {
    const key = entity.id + '|' + snapshot.id;
    if (historyEventsCache.has(key)) return historyEventsCache.get(key);
    const prepared = CountriesCore.prepare(HistoryMapsCore.snapshotGeometry(snapshot));
    const items = [];
    atlasModel.index.forEach(pile => {
        if (pile.prec === 'z') return;
        if (!CountriesCore.contains(prepared, pile.coords[0], pile.coords[1])) return;
        pile.items.forEach(item => { if (HistoryMapsCore.inSpan(entity, item.year)) items.push(item); });
    });
    items.sort((a, b) => a.year - b.year);
    historyEventsCache.set(key, items);
    return items;
}

function toolHistoryRenderEvents(entity, snapshot) {
    const holder = document.getElementById('tool-history-events');
    if (!holder) return;
    while (holder.firstChild) holder.removeChild(holder.firstChild);
    if (typeof atlasEnsureData !== 'function') return;
    const status = document.createElement('p');
    status.className = 'tool-small';
    status.textContent = t('tools.countries_events_loading');
    holder.appendChild(status);
    atlasEnsureData().then(ok => {
        if (historyEntityId !== entity.id || historySnapshotId !== snapshot.id || document.getElementById('tool-history-events') !== holder) return;
        while (holder.firstChild) holder.removeChild(holder.firstChild);
        if (!ok || typeof atlasModel === 'undefined' || !atlasModel) return;
        const items = toolHistoryEventsOf(entity, snapshot);
        const title = document.createElement('h4');
        title.className = 'tool-h';
        title.textContent = items.length ? t('tools.history_events_title', { n: items.length }) : t('tools.history_events_none');
        holder.appendChild(title);
        if (!items.length) return;
        const list = document.createElement('div');
        list.className = 'tool-countries-event-list';
        countriesSample(items, COUNTRIES_EVENT_CAP).forEach(item => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tool-countries-event';
            const year = document.createElement('strong');
            year.textContent = typeof atlasYearLabel === 'function' ? atlasYearLabel(item.year) : String(item.year);
            btn.appendChild(year);
            btn.appendChild(document.createTextNode(' ' + item.entry.event.titre));
            btn.onclick = () => atlasOpenItem(item);
            list.appendChild(btn);
        });
        holder.appendChild(list);
        if (items.length > COUNTRIES_EVENT_CAP) {
            const more = document.createElement('p');
            more.className = 'tool-small';
            more.textContent = t('tools.countries_events_more', { n: COUNTRIES_EVENT_CAP });
            holder.appendChild(more);
        }
    });
}
