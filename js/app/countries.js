// =========================================================================
// === L'ATLAS DES PAYS (écran de la boîte à outils) ===
// =========================================================================
// Une carte du monde (MapLibre, la même bibliothèque que l'Atlas des événements) dont on touche un pays : la fiche donne son nom, son drapeau
// (un emoji), sa capitale, ses langues, sa monnaie, sa population (avec son année) et, quand l'Atlas des événements est prêt, les événements
// de l'app qui s'y sont passés. La carte est autonome : ses contours viennent de assets/geo/countries.json (Natural Earth, domaine public),
// sans fond réseau, donc elle marche hors-ligne. Seuls les noms écrits sur la carte demandent le réseau (polices d'OpenFreeMap).
//
// La recherche par nom ou par capitale donne le même résultat que le toucher : c'est la voie du clavier, et celle des petits pays qu'on
// ne toucherait pas à l'échelle du monde. La fiche marche même quand la carte ne s'ouvre pas (pas de WebGL).
// Règles et données : js/countriesCore.js (pur, testé). Le contenu est **à relire par un enseignant**.

const COUNTRIES_GEO_URL = 'assets/geo/countries.json';
const COUNTRIES_FACTS_URL = 'assets/geo/countries-facts.json';
// Une teinte douce par continent (clair, sombre) ; l'ordre est celui de COUNTRIES_CONTINENTS.
const COUNTRIES_CONTINENTS = ['Europe', 'Asie', 'Afrique', 'Amérique du Nord', 'Amérique du Sud', 'Océanie', 'Antarctique'];
const COUNTRIES_FILL = {
    light: ['#cfe0f5', '#f2d9a8', '#f4c9a6', '#cde8c0', '#e6cdea', '#bfe6e2', '#e8edf2'],
    dark: ['#3a5578', '#7a6535', '#7d5a3d', '#44684a', '#66486c', '#35686a', '#4a5560']
};
const COUNTRIES_OCEAN = { light: '#eaf3fb', dark: '#0f1a26' };
const COUNTRIES_EVENT_CAP = 10;

let countriesData = null;      // { facts: [..], byId: Map, prepared: Map, geo: FeatureCollection }
let countriesDataPromise = null;
let countriesMap = null;
let countriesMapReady = false;
let countriesSelected = null;
let countriesEventsCache = new Map();
let countriesFestive = null;   // id du pays tiré par « Découvrir » parce que c'est sa fête nationale aujourd'hui (bannière dans la fiche)
let countriesDiscoverLast = null;

function countriesTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function countriesLoad() {
    if (countriesData) return Promise.resolve(true);
    if (countriesDataPromise) return countriesDataPromise;
    const get = url => fetch(url).then(r => (r.ok ? r.json() : Promise.reject(r.status)));
    countriesDataPromise = Promise.all([get(COUNTRIES_FACTS_URL), get(COUNTRIES_GEO_URL)]).then(([facts, geo]) => {
        const byId = new Map(facts.countries.map(c => [c.id, c]));
        const prepared = new Map();
        geo.features.forEach(f => {
            prepared.set(f.properties.id, CountriesCore.prepare(f.geometry));
            const c = byId.get(f.properties.id);
            f.properties.k = Math.max(0, COUNTRIES_CONTINENTS.indexOf(c ? c.cont : ''));
        });
        countriesData = { facts: facts.countries, byId, prepared, geo, popYear: facts.popYear };
        return true;
    }).catch(() => {
        countriesDataPromise = null;   // on pourra réessayer au retour du réseau
        return false;
    });
    return countriesDataPromise;
}

function toolCountriesInit() {
    document.getElementById('tool-countries-another').classList.add('hidden');
    countriesFestive = null;
    const status = document.getElementById('tool-countries-status');
    status.textContent = t('tools.countries_loading');
    countriesLoad().then(ok => {
        if (!ok) { status.textContent = t('tools.countries_error'); return; }
        status.textContent = '';
        if (!countriesSelected) toolCountriesShowHint();
        return typeof atlasLoadLibrary === 'function' ? atlasLoadLibrary() : false;
    }).then(ok => {
        if (ok === undefined) return;
        if (!ok) { status.textContent = t('tools.countries_no_map'); return; }
        countriesEnsureMap();
    });
}

function toolCountriesShowHint() {
    const panel = document.getElementById('tool-countries-fiche');
    while (panel.firstChild) panel.removeChild(panel.firstChild);
    const p = document.createElement('p');
    p.className = 'tool-small';
    p.textContent = t('tools.countries_hint');
    panel.appendChild(p);
}

// --- La carte --------------------------------------------------------------------------
function countriesBuildStyle() {
    const theme = countriesTheme();
    return {
        version: 8,
        // Les polices ne servent qu'aux noms de pays : sans réseau, la carte reste complète, seulement muette.
        glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
        sources: {},
        layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': COUNTRIES_OCEAN[theme] } }]
    };
}

function countriesFillExpression(theme) {
    const expr = ['match', ['get', 'k']];
    COUNTRIES_FILL[theme].slice(0, -1).forEach((color, i) => expr.push(i, color));
    expr.push(COUNTRIES_FILL[theme][COUNTRIES_FILL[theme].length - 1]);
    return expr;
}

function countriesEnsureMap() {
    if (!countriesData) return;
    if (countriesMap) { countriesMap.resize(); return; }
    let map;
    try {
        map = new maplibregl.Map({
            container: 'tool-countries-map',
            style: countriesBuildStyle(),
            bounds: [[-170, -58], [190, 78]],
            fitBoundsOptions: { padding: 6 },
            minZoom: -1,
            maxZoom: 8,
            renderWorldCopies: false,
            attributionControl: false,
            dragRotate: false,
            pitchWithRotate: false
        });
    } catch (e) {
        document.getElementById('tool-countries-status').textContent = t('tools.countries_no_webgl');
        return;
    }
    countriesMap = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.touchZoomRotate.disableRotation();
    map.on('load', () => { countriesAddLayers(); countriesMapReady = true; if (countriesSelected) countriesHighlight(countriesSelected, true); });
    // Une police ou une tuile qui ne vient pas (hors-ligne) n'empêche rien : la carte reste utilisable.
    map.on('error', () => {});
}

function countriesPointCollection(filter) {
    return {
        type: 'FeatureCollection',
        features: countriesData.facts.filter(filter).map(c => ({
            type: 'Feature', geometry: { type: 'Point', coordinates: c.c }, properties: { id: c.id, n: c.n, z: c.z }
        }))
    };
}

function countriesAddLayers() {
    const map = countriesMap;
    const theme = countriesTheme();
    map.addSource('countries', { type: 'geojson', data: countriesData.geo });
    map.addLayer({ id: 'countries-fill', type: 'fill', source: 'countries', paint: { 'fill-color': countriesFillExpression(theme), 'fill-opacity': 1 } });
    map.addLayer({ id: 'countries-line', type: 'line', source: 'countries', paint: { 'line-color': theme === 'dark' ? '#0f1a26' : '#ffffff', 'line-width': 0.7 } });
    map.addLayer({
        id: 'countries-selected', type: 'fill', source: 'countries', filter: ['==', ['get', 'id'], ''],
        paint: { 'fill-color': theme === 'dark' ? '#f2c14e' : '#e8590c', 'fill-opacity': 0.55 }
    });
    map.addLayer({
        id: 'countries-selected-line', type: 'line', source: 'countries', filter: ['==', ['get', 'id'], ''],
        paint: { 'line-color': theme === 'dark' ? '#f2c14e' : '#c2410c', 'line-width': 2 }
    });
    // Les petits pays reçoivent un point : on ne les toucherait pas à l'échelle du monde.
    const tiny = countriesData.facts.filter(c => CountriesCore.isTiny(countriesData.prepared.get(c.id)));
    map.addSource('countries-dots', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: tiny.map(c => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c.c }, properties: { id: c.id } })) }
    });
    map.addLayer({
        id: 'countries-dots', type: 'circle', source: 'countries-dots', minzoom: 1.2, maxzoom: 5.5,
        paint: { 'circle-radius': 4, 'circle-color': theme === 'dark' ? '#f2c14e' : '#c2410c', 'circle-stroke-color': theme === 'dark' ? '#0f1a26' : '#ffffff', 'circle-stroke-width': 1.5 }
    });
    // Les noms, du plus grand pays au plus petit à mesure qu'on zoome (trois couches : MapLibre ne filtre pas sur le zoom).
    map.addSource('countries-labels', { type: 'geojson', data: countriesPointCollection(() => true) });
    const textColor = theme === 'dark' ? '#e8eef5' : '#26323f';
    const halo = theme === 'dark' ? '#0f1a26' : '#ffffff';
    [['countries-labels-1', 1.2, ['<=', ['get', 'z'], 2.5]], ['countries-labels-2', 2.5, ['all', ['>', ['get', 'z'], 2.5], ['<=', ['get', 'z'], 4.5]]], ['countries-labels-3', 4, ['>', ['get', 'z'], 4.5]]]
        .forEach(([id, minzoom, filter]) => {
            map.addLayer({
                id, type: 'symbol', source: 'countries-labels', minzoom, filter,
                layout: { 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-max-width': 6 },
                paint: { 'text-color': textColor, 'text-halo-color': halo, 'text-halo-width': 1.4 }
            });
        });
    map.on('click', event => {
        const hits = map.queryRenderedFeatures(
            [[event.point.x - 6, event.point.y - 6], [event.point.x + 6, event.point.y + 6]], { layers: ['countries-dots'] });
        const hit = hits[0] || map.queryRenderedFeatures(event.point, { layers: ['countries-fill'] })[0];
        if (hit) toolCountriesSelect(hit.properties.id, { fromMap: true });
    });
    map.on('mouseenter', 'countries-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'countries-fill', () => { map.getCanvas().style.cursor = ''; });
}

function countriesHighlight(id, fly) {
    if (!countriesMap || !countriesMapReady) return;
    const filter = ['==', ['get', 'id'], id];
    countriesMap.setFilter('countries-selected', filter);
    countriesMap.setFilter('countries-selected-line', filter);
    if (!fly) return;
    const prepared = countriesData.prepared.get(id);
    if (!prepared) return;
    // On cadre la plus grande île ou le plus grand bloc : la boîte de la France entière, avec la Guyane, couvrirait l'Atlantique.
    const b = prepared.largest;
    const size = Math.max(b[2] - b[0], b[3] - b[1]);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    countriesMap.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 40, maxZoom: size < 1.6 ? 6 : 5, duration: reduce ? 0 : 700 });
}

// --- La recherche ----------------------------------------------------------------------
function toolCountriesSearch() {
    const input = document.getElementById('tool-countries-input');
    const list = document.getElementById('tool-countries-results');
    while (list.firstChild) list.removeChild(list.firstChild);
    const query = input.value;
    if (!countriesData || !query.trim()) { list.classList.add('hidden'); input.setAttribute('aria-expanded', 'false'); return; }
    const hits = CountriesCore.searchCountries(countriesData.facts, query, 8);
    if (!hits.length) {
        const li = document.createElement('li');
        li.className = 'tool-countries-none';
        li.textContent = t('tools.countries_none');
        list.appendChild(li);
    }
    hits.forEach(c => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-countries-hit';
        btn.textContent = CountriesCore.flagEmoji(c.iso2) + ' ' + c.n;
        const cap = document.createElement('small');
        cap.textContent = c.cap && c.cap !== 'aucune' ? c.cap : '';
        btn.appendChild(cap);
        btn.onclick = () => { toolCountriesSelect(c.id, { fromSearch: true }); };
        li.appendChild(btn);
        list.appendChild(li);
    });
    list.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
}

function toolCountriesInputKey(event) {
    if (event.key === 'Enter') {
        const first = document.querySelector('#tool-countries-results .tool-countries-hit');
        if (first) first.click();
        event.preventDefault();
    } else if (event.key === 'Escape') {
        document.getElementById('tool-countries-input').value = '';
        toolCountriesSearch();
    }
}

// --- Découvrir : un pays au hasard (bouton « Pays » du menu Découvrir) -------------------------
// Le pays dont c'est la fête nationale aujourd'hui d'abord, sinon au hasard ; « Un autre pays » repioche. La fiche et la carte sont
// celles de l'Atlas. Le tirage est dans CountriesCore.discoverPick (testé).
function discoverCountry() {
    openTool('countries', 'screen-categories');
    document.getElementById('tool-countries-another').classList.remove('hidden');
    countriesLoad().then(ok => {
        if (!ok) { document.getElementById('tool-countries-status').textContent = t('tools.countries_error'); return; }
        discoverPickCountry(true);
    });
}

function discoverAnotherCountry() {
    discoverPickCountry(false);
}

function discoverPickCountry(first) {
    if (!countriesData) return;
    const now = new Date();
    const pick = CountriesCore.discoverPick(countriesData.facts, Math.random, { month: now.getMonth() + 1, day: now.getDate() },
        { first, previousId: countriesDiscoverLast });
    countriesDiscoverLast = pick.country.id;
    countriesFestive = pick.festive ? pick.country.id : null;
    toolCountriesSelect(pick.country.id);
    document.getElementById('tool-countries-another').focus({ preventScroll: true });
}

// --- La fiche --------------------------------------------------------------------------
function toolCountriesSelect(id, how) {
    if (!countriesData) return;
    const country = countriesData.byId.get(id);
    if (!country) return;
    countriesSelected = id;
    if (how && how.fromSearch) {
        const input = document.getElementById('tool-countries-input');
        input.value = '';
        toolCountriesSearch();
    }
    if (countriesFestive !== id) countriesFestive = null;
    countriesHighlight(id, true);
    toolCountriesRenderFiche(country);
    // La fiche est sous la carte : on la montre, sans faire sauter la page si elle est déjà visible.
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('tool-countries-fiche').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
}

function toolCountriesRenderFiche(country) {
    const panel = document.getElementById('tool-countries-fiche');
    while (panel.firstChild) panel.removeChild(panel.firstChild);
    if (countriesFestive === country.id) {
        const festive = document.createElement('p');
        festive.className = 'tool-countries-festive';
        festive.textContent = '🎉 ' + t('tools.countries_festive') + ' 🎆';
        panel.appendChild(festive);
    }
    const head = document.createElement('h3');
    head.className = 'tool-countries-name';
    const flag = document.createElement('span');
    flag.setAttribute('aria-hidden', 'true');
    flag.textContent = CountriesCore.flagEmoji(country.iso2) + ' ';
    head.appendChild(flag);
    head.appendChild(document.createTextNode(country.n));
    panel.appendChild(head);
    if (country.st) {
        const badge = document.createElement('p');
        badge.className = 'tool-countries-badge';
        badge.textContent = country.st === 'territoire' ? t('tools.countries_territory', { sov: country.sov })
            : country.st === 'contesté' ? t('tools.countries_disputed') : t('tools.countries_no_state');
        panel.appendChild(badge);
    }
    const dl = document.createElement('dl');
    dl.className = 'tool-countries-facts';
    CountriesCore.factRows(country).forEach(row => {
        const dt = document.createElement('dt');
        dt.textContent = t('tools.countries_' + row.key);
        const dd = document.createElement('dd');
        dd.textContent = row.value;
        if (row.year) {
            const year = document.createElement('small');
            year.textContent = ' ' + t('tools.countries_pop_year', { year: row.year });
            dd.appendChild(year);
        }
        dl.appendChild(dt);
        dl.appendChild(dd);
    });
    panel.appendChild(dl);
    if (country.note) {
        const note = document.createElement('p');
        note.className = 'tool-small';
        note.textContent = country.note;
        panel.appendChild(note);
    }
    const nation = toolCountriesNationalTheme(country);
    if (nation) {
        const play = document.createElement('button');
        play.type = 'button';
        play.className = 'btn tool-countries-play';
        play.textContent = t('tools.countries_play', { theme: nation.name });
        play.onclick = () => openThemeAt(nation.ci, nation.si, nation.ti);
        panel.appendChild(play);
    }
    const events = document.createElement('div');
    events.className = 'tool-countries-events';
    events.id = 'tool-countries-events';
    panel.appendChild(events);
    toolCountriesRenderEvents(country.id);
}

// Le thème « Histoire de … » de ce pays (les « Histoires nationales » portent le drapeau du pays dans leur nom), s'il existe dans le pack chargé.
function toolCountriesNationalTheme(country) {
    if (!country.iso2 || typeof getAllThemesWithPath !== 'function') return null;
    const flag = CountriesCore.flagEmoji(country.iso2);
    const found = getAllThemesWithPath().find(item => item.theme.nom.indexOf(flag) !== -1 && /^Histoire/.test(item.theme.nom));
    if (!found) return null;
    return { name: found.theme.nom.replace(flag, '').trim(), ci: found.ci, si: found.si, ti: found.ti };
}

// Les événements de l'app situés dans ce pays : les points de l'Atlas des événements, retrouvés par leur position dans le contour.
function toolCountriesEventsOf(id) {
    if (countriesEventsCache.has(id)) return countriesEventsCache.get(id);
    const prepared = countriesData.prepared.get(id);
    const items = [];
    atlasModel.index.forEach(pile => {
        if (pile.prec === 'z') return;   // un lieu « zone » est un cercle diffus, pas un point
        if (CountriesCore.containsNear(prepared, pile.coords[0], pile.coords[1])) pile.items.forEach(item => items.push(item));
    });
    items.sort((a, b) => a.year - b.year);
    countriesEventsCache.set(id, items);
    return items;
}

// Au plus COUNTRIES_EVENT_CAP événements, répartis sur toute la durée plutôt que les plus anciens seulement.
function countriesSample(items, cap) {
    if (items.length <= cap) return items;
    const out = [];
    for (let i = 0; i < cap; i++) out.push(items[Math.floor(i * (items.length - 1) / (cap - 1))]);
    return out;
}

function toolCountriesRenderEvents(id) {
    const holder = document.getElementById('tool-countries-events');
    if (!holder) return;
    while (holder.firstChild) holder.removeChild(holder.firstChild);
    if (typeof atlasEnsureData !== 'function') return;
    const status = document.createElement('p');
    status.className = 'tool-small';
    status.textContent = t('tools.countries_events_loading');
    holder.appendChild(status);
    atlasEnsureData().then(ok => {
        // L'utilisateur a pu choisir un autre pays pendant le chargement.
        if (countriesSelected !== id || document.getElementById('tool-countries-events') !== holder) return;
        while (holder.firstChild) holder.removeChild(holder.firstChild);
        if (!ok || typeof atlasModel === 'undefined' || !atlasModel) return;
        const items = toolCountriesEventsOf(id);
        const title = document.createElement('h4');
        title.className = 'tool-h';
        title.textContent = items.length ? t('tools.countries_events_title', { n: items.length }) : t('tools.countries_events_none');
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
