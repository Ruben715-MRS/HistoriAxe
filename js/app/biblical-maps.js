// =========================================================================
// === LES CARTES BIBLIQUES (écran de l'Atelier) ===
// =========================================================================
// Quatre cartes du Levant (js/biblicalMapsCore.js), dessinées à la main sur le fond des cartes historiques : un menu choisit la carte, des puces
// choisissent la vue (d'ensemble ou de détail) et, pour la poursuite d'Abraham, l'une des deux versions. Les lieux sont des repères HTML posés sur
// la carte (et non des couches de texte) : ils portent le nom hébreu, ne demandent aucune police du réseau et se touchent comme des boutons.
// Les plus fins n'apparaissent qu'au zoom (niveau `lv`), pour que les noms ne s'empilent pas. Comme partout dans l'Atelier, la fiche (la liste des
// lieux, avec leur note) marche même sans WebGL ou hors-ligne, et tout texte passe par textContent.

let bibMap = null;
let bibMapReady = false;
let bibMapId = 'abraham';
let bibViewId = null;
let bibVariant = 'v1';
let bibSelected = null;
let bibMarkers = [];
let bibPopup = null;
let bibBaseZoom = 0;
const BIB_ARROW_COLORS = ['#4d7c0f', '#5b3a1e', '#c2410c'];
const BIB_LEVEL_STEP = 0.9;
const BIB_LAND = { light: '#ecdcb8', dark: '#3a3428' };
const BIB_WATER = { light: '#a9cde8', dark: '#2c4a63' };

function bibCurrent() {
    return BiblicalMapsCore.mapById(bibMapId) || BiblicalMapsCore.MAPS[0];
}

function bibCurrentView() {
    return BiblicalMapsCore.viewById(bibCurrent(), bibViewId);
}

function toolBiblicalInit() {
    const status = document.getElementById('tool-biblical-status');
    status.textContent = t('tools.biblical_loading');
    bibRenderMenu();
    bibShow({ fit: false });
    countriesLoad().then(ok => {
        if (!ok) { status.textContent = t('tools.countries_error'); return; }
        status.textContent = '';
        return typeof atlasLoadLibrary === 'function' ? atlasLoadLibrary() : false;
    }).then(ok => {
        if (ok === undefined) return;
        if (!ok) { status.textContent = t('tools.countries_no_map'); return; }
        bibEnsureMap();
    });
}

// --- Les choix : la carte, la vue, la version ------------------------------------------------------------------
function bibRenderMenu() {
    const select = document.getElementById('tool-biblical-select');
    if (select.options.length === 0) {
        BiblicalMapsCore.MAPS.forEach(map => {
            const option = document.createElement('option');
            option.value = map.id;
            option.textContent = map.icon + ' ' + map.name;
            select.appendChild(option);
        });
    }
    select.value = bibMapId;
}

function toolBiblicalPick(mapId) {
    const map = BiblicalMapsCore.mapById(mapId) || BiblicalMapsCore.MAPS[0];
    bibMapId = map.id;
    bibViewId = map.views[0].id;
    bibVariant = map.variants ? map.variants.options[0].id : 'v1';
    bibSelected = null;
    bibShow({ fit: true });
}

function bibChip(label, pressed, onclick, dataKey, dataValue) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tool-history-chip is-date';
    btn.textContent = label;
    btn.dataset[dataKey] = dataValue;
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    btn.onclick = onclick;
    return btn;
}

function bibRenderChips() {
    const map = bibCurrent();
    const views = document.getElementById('tool-biblical-views');
    toolClear(views);
    map.views.forEach(view => views.appendChild(bibChip(view.label, view.id === bibCurrentView().id, () => bibPickView(view.id), 'view', view.id)));
    const block = document.getElementById('tool-biblical-variant-block');
    block.classList.toggle('hidden', !map.variants);
    const holder = document.getElementById('tool-biblical-variants');
    toolClear(holder);
    if (!map.variants) return;
    document.getElementById('tool-biblical-variant-label').textContent = map.variants.label;
    map.variants.options.forEach(option => holder.appendChild(bibChip(option.label, option.id === bibVariant, () => bibPickVariant(option.id), 'variant', option.id)));
}

function bibPickView(viewId) {
    bibViewId = viewId;
    bibShow({ fit: true });
}

function bibPickVariant(variantId) {
    bibVariant = variantId;
    if (bibSelected) {
        const place = BiblicalMapsCore.placesOf(bibCurrent()).find(p => p.id === bibSelected);
        if (place && !BiblicalMapsCore.visibleIn(place, bibCurrentView().id, bibVariant)) bibSelected = null;
    }
    bibShow({ fit: false });
}

// Tout redessiner : les puces, la fiche, puis la carte si elle est prête.
function bibShow(how) {
    if (!bibViewId || !bibCurrent().views.some(v => v.id === bibViewId)) bibViewId = bibCurrent().views[0].id;
    document.getElementById('tool-biblical-select').value = bibMapId;
    bibRenderChips();
    bibRenderFiche();
    if (bibMap && bibMapReady) bibDrawMap(how.fit);
}

// --- La carte --------------------------------------------------------------------------------------------------
function bibBuildStyle() {
    const theme = countriesTheme();
    return { version: 8, sources: {}, layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': COUNTRIES_OCEAN[theme] } }] };
}

function bibEnsureMap() {
    if (!countriesData) return;
    if (bibMap) { bibMap.resize(); return; }
    let map;
    try {
        map = new maplibregl.Map({
            container: 'tool-biblical-map',
            style: bibBuildStyle(),
            bounds: bibCurrentView().bounds,
            fitBoundsOptions: { padding: 12 },
            minZoom: 0,
            maxZoom: 10,
            renderWorldCopies: false,
            attributionControl: false,
            dragRotate: false,
            pitchWithRotate: false
        });
    } catch (e) {
        document.getElementById('tool-biblical-status').textContent = t('tools.countries_no_webgl');
        return;
    }
    bibMap = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.touchZoomRotate.disableRotation();
    map.on('load', () => {
        bibAddLayers();
        bibMapReady = true;
        bibDrawMap(true);
    });
    map.on('zoom', bibUpdateLevels);
    map.on('error', () => {});
}

// Une pointe de flèche : un triangle plein, dans la couleur de la route, cerné de blanc pour rester lisible sur le sable comme sur la mer.
function bibArrowImage(color) {
    const size = 44;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(size / 2, 4);
    ctx.lineTo(size - 8, size - 6);
    ctx.lineTo(size / 2, size - 16);
    ctx.lineTo(8, size - 6);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.fill();
    return ctx.getImageData(0, 0, size, size);
}

function bibAddLayers() {
    const map = bibMap;
    const theme = countriesTheme();
    const empty = { type: 'FeatureCollection', features: [] };
    map.addSource('land', { type: 'geojson', data: countriesData.geo });
    map.addLayer({ id: 'land-fill', type: 'fill', source: 'land', paint: { 'fill-color': BIB_LAND[theme] } });
    // Les pays actuels sont des polygones voisins : un trait de la couleur de la terre referme les fentes qui laissent voir la mer entre eux.
    map.addLayer({ id: 'land-seams', type: 'line', source: 'land', paint: { 'line-color': BIB_LAND[theme], 'line-width': 1.4 } });
    // Les zones colorées (les tribus), dessinées avant les lacs ; la mer les recouvre (bibEnsureSea) pour que la côte reste nette.
    map.addSource('zones', { type: 'geojson', data: empty });
    map.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': theme === 'dark' ? 0.75 : 0.85 } });
    map.addLayer({ id: 'zones-line', type: 'line', source: 'zones', paint: { 'line-color': theme === 'dark' ? '#1d1a14' : '#5b3a1e', 'line-width': 1, 'line-opacity': 0.7 } });
    const lakes = BiblicalMapsCore.HYDRO.lakes.map(l => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [l.ring.concat([l.ring[0]])] } }));
    const rivers = BiblicalMapsCore.HYDRO.rivers.map(r => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: BiblicalMapsCore.smooth(r.pts) } }));
    map.addSource('lakes', { type: 'geojson', data: { type: 'FeatureCollection', features: lakes } });
    map.addSource('rivers', { type: 'geojson', data: { type: 'FeatureCollection', features: rivers } });
    map.addLayer({ id: 'lakes-fill', type: 'fill', source: 'lakes', paint: { 'fill-color': BIB_WATER[theme] } });
    map.addLayer({ id: 'lakes-line', type: 'line', source: 'lakes', paint: { 'line-color': theme === 'dark' ? '#4f7390' : '#6fa3cc', 'line-width': 1 } });
    map.addLayer({ id: 'rivers-line', type: 'line', source: 'rivers', minzoom: 5.5, paint: { 'line-color': theme === 'dark' ? '#4f7390' : '#6fa3cc', 'line-width': 2 }, layout: { 'line-cap': 'round' } });
    map.addSource('routes', { type: 'geojson', data: empty });
    map.addLayer({ id: 'routes-solid', type: 'line', source: 'routes', filter: ['!=', ['get', 'dash'], true], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'w'] } });
    map.addLayer({ id: 'routes-dash', type: 'line', source: 'routes', filter: ['==', ['get', 'dash'], true], layout: { 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'w'], 'line-dasharray': [2, 1.6] } });
    BIB_ARROW_COLORS.forEach(color => map.addImage('arrow-' + color, bibArrowImage(color), { pixelRatio: 2 }));
    map.addSource('arrows', { type: 'geojson', data: empty });
    map.addLayer({
        id: 'arrow-heads', type: 'symbol', source: 'arrows',
        layout: { 'icon-image': ['get', 'icon'], 'icon-rotate': ['get', 'bearing'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-offset': [0, 9], 'icon-size': 1 }
    });
}

// Les routes visibles (la version choisie pour la poursuite d'Abraham), en lignes et en pointes de flèche.
function bibRoutesVisible(map) {
    return (map.routes || []).filter(route => !route.variant || route.variant === bibVariant);
}

// La mer par-dessus les zones : le masque de mer des cartes historiques, chargé seulement pour les cartes qui ont des zones.
function bibEnsureSea() {
    if (!bibMap || !bibMapReady || bibMap.getSource('sea') || typeof historyLoadLand !== 'function') return;
    historyLoadLand().then(ok => {
        if (!ok || !bibMap || bibMap.getSource('sea')) return;
        bibMap.addSource('sea', { type: 'geojson', data: historySeaMask(), tolerance: 0, buffer: 512 });
        bibMap.addLayer({ id: 'sea-mask', type: 'fill', source: 'sea', paint: { 'fill-color': COUNTRIES_OCEAN[countriesTheme()], 'fill-opacity': 1 } }, 'lakes-fill');
    });
}

// Les zones visibles : dans la seconde carte de Dan, les autres tribus passent en gris pour faire ressortir son héritage.
function bibZoneFeatures(map) {
    return (map.zones || []).filter(z => !z.variant || z.variant === bibVariant).map(z => ({
        type: 'Feature',
        properties: { color: bibVariant === 'dan' && !z.dan ? '#c9c2b4' : z.color },
        geometry: { type: 'Polygon', coordinates: [BiblicalMapsCore.closeRing(z.ring)] }
    }));
}

function bibDrawMap(fit) {
    const map = bibCurrent();
    const view = bibCurrentView();
    if (bibPopup) { bibPopup.remove(); bibPopup = null; }
    bibMap.getSource('zones').setData({ type: 'FeatureCollection', features: bibZoneFeatures(map) });
    if (map.zones) bibEnsureSea();
    const lines = [];
    const heads = [];
    bibRoutesVisible(map).forEach(route => {
        const path = BiblicalMapsCore.routePath(route);
        lines.push({ type: 'Feature', properties: { color: route.color, w: route.w || 3, dash: !!route.dash }, geometry: { type: 'LineString', coordinates: path } });
        heads.push({ type: 'Feature', properties: { icon: 'arrow-' + route.color, bearing: BiblicalMapsCore.endBearing(path) }, geometry: { type: 'Point', coordinates: path[path.length - 1] } });
    });
    bibMap.getSource('routes').setData({ type: 'FeatureCollection', features: lines });
    bibMap.getSource('arrows').setData({ type: 'FeatureCollection', features: heads });
    bibBuildMarkers(map, view);
    if (fit) bibFit(view);
    else bibUpdateLevels();
}

function bibFit(view) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const camera = bibMap.cameraForBounds(view.bounds, { padding: 12 });
    bibBaseZoom = camera && typeof camera.zoom === 'number' ? camera.zoom : bibMap.getZoom();
    bibMap.fitBounds(view.bounds, { padding: 12, duration: reduce ? 0 : 600 });
    bibUpdateLevels();
}

// --- Les repères sur la carte ----------------------------------------------------------------------------------
function bibLabel(place) {
    const label = document.createElement('span');
    label.className = 'bib-label';
    const name = document.createElement('strong');
    name.textContent = place.n + (place.doubt ? ' (?)' : '');
    label.appendChild(name);
    if (place.he) {
        const he = document.createElement('small');
        he.lang = 'he';
        he.dir = 'rtl';
        he.textContent = place.he;
        label.appendChild(he);
    }
    return label;
}

function bibPinElement(place) {
    const interactive = !!place.note;
    const el = document.createElement(interactive ? 'button' : 'div');
    if (interactive) { el.type = 'button'; el.setAttribute('aria-label', place.n); }
    el.className = 'bib-pin bib-' + place.kind + ' side-' + (place.side || 'bottom') + (place.doubt ? ' is-doubt' : '') + (interactive ? ' has-note' : '') + (place.wide ? ' is-wide' : '') + (place.num ? ' is-numbered' : '');
    el.dataset.place = place.id;
    if (place.kind === 'region' || place.kind === 'water') {
        el.appendChild(bibLabel(place));
    } else {
        const mark = document.createElement('span');
        mark.className = 'bib-mark';
        mark.setAttribute('aria-hidden', 'true');
        if (place.icon) { mark.textContent = place.icon; mark.classList.add('is-icon'); }
        else if (place.kind === 'war') mark.textContent = '⚔️';
        else if (place.kind === 'altar') mark.textContent = '🔥';
        else if (place.kind === 'mountain') mark.textContent = '▲';
        if (place.num) {
            const num = document.createElement('span');
            num.className = 'bib-num';
            num.textContent = place.num;
            mark.textContent = '';
            mark.appendChild(num);
            if (place.kind === 'mountain') mark.classList.add('is-mountain');
        }
        el.appendChild(mark);
        if (place.altar) {
            const flame = document.createElement('span');
            flame.className = 'bib-flame';
            flame.setAttribute('aria-hidden', 'true');
            flame.textContent = '🔥';
            el.appendChild(flame);
        }
        if ((place.kind !== 'altar' && place.kind !== 'war') || place.icon) el.appendChild(bibLabel(place));
    }
    // Le clic ne doit pas remonter jusqu'à la carte : elle fermerait aussitôt la bulle que ce repère ouvre.
    if (interactive) el.onclick = event => { event.stopPropagation(); bibSelect(place.id, false); };
    return el;
}

function bibBuildMarkers(map, view) {
    bibMarkers.forEach(m => m.marker.remove());
    bibMarkers = [];
    BiblicalMapsCore.placesOf(map).forEach(place => {
        if (!BiblicalMapsCore.visibleIn(place, view.id, bibVariant)) return;
        const el = bibPinElement(place);
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(place.c).addTo(bibMap);
        // MapLibre pose « Map marker » comme nom accessible sur chaque repère : le vrai nom le remplace.
        if (place.note) el.setAttribute('aria-label', place.n);
        bibMarkers.push({ place, el, marker });
    });
    // Le numéro de chaque flèche, posé au milieu de son tracé.
    bibRoutesVisible(map).forEach(route => {
        if (!route.num) return;
        const el = document.createElement('span');
        el.className = 'bib-route-num';
        el.textContent = route.num;
        el.style.background = route.color;
        el.setAttribute('aria-hidden', 'true');
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(BiblicalMapsCore.midPoint(BiblicalMapsCore.routePath(route))).addTo(bibMap);
        bibMarkers.push({ place: null, el, marker });
    });
}

// Un lieu clé garde son nom dans une vue dense (`key: true`, ou la liste des vues où il le garde).
function bibKeepsLabel(place, view) {
    return place.key === true || (Array.isArray(place.key) && place.key.indexOf(view.id) !== -1);
}

// Les lieux fins n'apparaissent qu'après un zoom ; dans une vue de détail, tout se voit.
function bibUpdateLevels() {
    if (!bibMap) return;
    const view = bibCurrentView();
    const zoom = bibMap.getZoom();
    bibMarkers.forEach(m => {
        if (!m.place) return;
        const zoomed = zoom >= bibBaseZoom + BIB_LEVEL_STEP - 0.05;
        // Dans un aperçu (`top`), seuls les lieux principaux se voient d'emblée : tout le reste attend deux crans de zoom.
        const lv = view.top && !m.place.top ? 2 : m.place.lv;
        const shown = view.full || (view.all && m.place.num) || m.place.id === bibSelected || lv === 0 || zoom >= bibBaseZoom + lv * BIB_LEVEL_STEP - 0.05;
        m.el.classList.toggle('is-off', !shown);
        // Dans une vue dense, les numéros d'étapes suffisent : leur nom ne s'écrit qu'au zoom, sauf pour les lieux clés.
        m.el.classList.toggle('no-label', !!view.dense && !!m.place.num && !bibKeepsLabel(m.place, view) && !zoomed && m.place.id !== bibSelected);
        m.el.classList.toggle('is-selected', m.place.id === bibSelected);
    });
}

// --- Un lieu choisi : sa note, en bulle sur la carte (ou dans la fiche sans WebGL) ----------------------------------------
function bibPlaceCard(place) {
    const card = document.createElement('div');
    card.className = 'bib-card';
    const head = document.createElement('strong');
    head.textContent = (place.num ? place.num + ' · ' : '') + place.n;
    card.appendChild(head);
    if (place.he) {
        const he = document.createElement('span');
        he.className = 'bib-card-he';
        he.lang = 'he';
        he.dir = 'rtl';
        he.textContent = place.he;
        card.appendChild(he);
    }
    if (place.doubt) {
        const doubt = document.createElement('em');
        doubt.className = 'bib-card-doubt';
        doubt.textContent = t('tools.biblical_doubt');
        card.appendChild(doubt);
    }
    if (place.note) {
        const note = document.createElement('p');
        note.textContent = place.note;
        card.appendChild(note);
    }
    if (place.ref) {
        const ref = document.createElement('small');
        ref.textContent = place.ref;
        card.appendChild(ref);
    }
    return card;
}

function bibSelect(placeId, fromList) {
    const place = BiblicalMapsCore.placesOf(bibCurrent()).find(p => p.id === placeId);
    if (!place) return;
    bibSelected = placeId;
    bibUpdateLevels();
    const slot = document.getElementById('tool-biblical-selected');
    toolClear(slot);
    if (bibMap && bibMapReady) {
        if (bibPopup) bibPopup.remove();
        bibPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 16, maxWidth: '260px', className: 'bib-popup' })
            .setLngLat(place.c).setDOMContent(bibPlaceCard(place)).addTo(bibMap);
        if (fromList) {
            const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            bibMap.easeTo({ center: place.c, zoom: Math.max(bibMap.getZoom(), bibBaseZoom + (bibCurrentView().full ? 0 : 1)), duration: reduce ? 0 : 500 });
            document.getElementById('tool-biblical-map').scrollIntoView({ block: 'nearest' });
        }
    } else {
        slot.appendChild(bibPlaceCard(place));
    }
}

// --- La fiche --------------------------------------------------------------------------------------------------
function bibList(items) {
    const list = document.createElement('ul');
    list.className = 'bib-list';
    items.forEach(item => {
        const li = document.createElement('li');
        const text = document.createElement('span');
        text.textContent = item.t;
        li.appendChild(text);
        if (item.he) {
            const he = document.createElement('small');
            he.lang = 'he';
            he.dir = 'rtl';
            he.textContent = item.he;
            li.appendChild(he);
        }
        list.appendChild(li);
    });
    return list;
}

function bibRenderLegend(map, panel) {
    if (!map.legend) return;
    const legend = document.createElement('ul');
    legend.className = 'tool-history-legend';
    map.legend.forEach(entry => {
        const li = document.createElement('li');
        if (entry.icon) {
            const icon = document.createElement('span');
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = entry.icon;
            li.appendChild(icon);
        } else {
            const dot = document.createElement('span');
            dot.className = 'tool-history-dot';
            dot.style.background = entry.color;
            dot.setAttribute('aria-hidden', 'true');
            li.appendChild(dot);
        }
        li.appendChild(document.createTextNode(' ' + entry.text));
        legend.appendChild(li);
    });
    panel.appendChild(legend);
}

function bibRenderTimeline(timeline, panel) {
    const title = document.createElement('h4');
    title.className = 'tool-h';
    title.textContent = timeline.title;
    panel.appendChild(title);
    const note = document.createElement('p');
    note.className = 'tool-small';
    note.textContent = timeline.note;
    panel.appendChild(note);
    const holder = document.createElement('div');
    holder.className = 'bib-timeline';
    timeline.rows.forEach(row => {
        const block = document.createElement('div');
        block.className = 'bib-year';
        const year = document.createElement('strong');
        year.textContent = row.year + ' · ' + row.label;
        block.appendChild(year);
        const list = document.createElement('ul');
        row.events.forEach(([month, text]) => {
            const li = document.createElement('li');
            const m = document.createElement('b');
            m.textContent = month;
            li.appendChild(m);
            li.appendChild(document.createTextNode(' — ' + text));
            list.appendChild(li);
        });
        block.appendChild(list);
        holder.appendChild(block);
    });
    panel.appendChild(holder);
}

function bibRenderPlaces(map, panel) {
    const view = bibCurrentView();
    const places = BiblicalMapsCore.placesOf(map).filter(p => p.note && BiblicalMapsCore.visibleIn(p, view.id, bibVariant));
    if (!places.length) return;
    const details = document.createElement('details');
    details.className = 'bib-places';
    const summary = document.createElement('summary');
    summary.textContent = t('tools.biblical_places', { n: places.length });
    details.appendChild(summary);
    const list = document.createElement('div');
    list.className = 'tool-countries-event-list';
    places.forEach(place => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-countries-event';
        btn.dataset.place = place.id;
        const name = document.createElement('strong');
        name.textContent = (place.num ? place.num + ' · ' : '') + place.n + (place.doubt ? ' (?)' : '');
        btn.appendChild(name);
        if (place.ref) {
            const ref = document.createElement('small');
            ref.className = 'tool-row-note';
            ref.textContent = ' · ' + place.ref;
            btn.appendChild(ref);
        }
        btn.onclick = () => bibSelect(place.id, true);
        list.appendChild(btn);
    });
    details.appendChild(list);
    panel.appendChild(details);
}

function bibRenderFiche() {
    const map = bibCurrent();
    const panel = document.getElementById('tool-biblical-fiche');
    toolClear(panel);
    const head = document.createElement('h3');
    head.className = 'tool-countries-name';
    head.textContent = map.icon + ' ' + map.name;
    panel.appendChild(head);
    const ref = document.createElement('p');
    ref.className = 'tool-countries-badge';
    ref.textContent = map.ref;
    panel.appendChild(ref);
    const summary = document.createElement('p');
    summary.className = 'tool-small';
    summary.textContent = map.summary;
    panel.appendChild(summary);
    bibRenderLegend(map, panel);
    const slot = document.createElement('div');
    slot.id = 'tool-biblical-selected';
    panel.appendChild(slot);
    bibRenderPlaces(map, panel);
    (map.sections || []).forEach(section => {
        const title = document.createElement('h4');
        title.className = 'tool-h';
        title.textContent = section.title;
        panel.appendChild(title);
        panel.appendChild(bibList(section.items));
    });
    if (map.timeline) bibRenderTimeline(map.timeline, panel);
}
