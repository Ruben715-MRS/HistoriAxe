// =========================================================================
// === LE QUIZ DES PAYS (écran de jeu, lancé depuis l'Atlas des pays) ===
// =========================================================================
// Un menu (openGeoQuizMenu) puis quatre formes, un même écran et un même score :
//   - QCM : un ou deux indices (capitale, monnaie…), quatre réponses ; facile ou difficile (startGeoQuiz) ;
//   - « Drapeau → pays » : un drapeau, quatre noms (startGeoQuizFlag) ;
//   - « Touche le pays » : le nom d'un pays, et une carte du monde à toucher (startGeoQuizMap).
// Les questions viennent de GeoQuizCore (js/geoQuizCore.js). Pas de vies ni de chrono : c'est un entraînement. Rien n'est
// enregistré, rien ne part vers le classement. Les données sont celles de countriesData (js/app/countries.js).
//
// LA CARTE du quiz n'est pas celle de l'Atlas : elle n'a ni couche de noms ni police, donc aucun nom de pays ne peut y apparaître
// avant la réponse. Les contours viennent de countriesData.geo (local, hors ligne). Contenu en français seulement. Tout ce qui vient des données passe par textContent, jamais par du HTML.

const GEOQUIZ_ROUNDS = 10;
// Neutre : une couleur par continent donnerait l'indice qu'on cherche.
const GEOQUIZ_FILL = { light: '#dfe6ee', dark: '#334155' };
const GEOQUIZ_TARGET = { light: '#f59e0b', dark: '#f2c14e' };
const GEOQUIZ_WORLD = [[-170, -58], [190, 78]];

let geoQuizMode = 'qcm';          // 'qcm' | 'flag' | 'map'
let geoQuizDifficulty = 'easy';   // pour le QCM : 'easy' | 'hard'
let geoQuizReturn = 'screen-tool-countries';   // l'écran où le menu a été ouvert (Atlas des pays, ou Salle de jeux)
let geoQuizQuestions = [];
let geoQuizIndex = 0;
let geoQuizScore = 0;
let geoQuizAnswered = false;
let geoQuizMap = null;
let geoQuizMapReady = false;
let geoQuizOnReady = [];           // actions à faire une fois la carte chargée (surlignage après une réponse)

// Le menu s'ouvre depuis l'Atlas des pays ou la Salle de jeux ; « Retour » y ramène.
function openGeoQuizMenu(from) {
    geoQuizReturn = from || 'screen-tool-countries';
    showScreen('screen-geoquiz', 'forward');
    geoQuizShowMenu();
}

function geoQuizShowMenu() {
    document.getElementById('geoquiz-play').classList.add('hidden');
    document.getElementById('geoquiz-end').classList.add('hidden');
    document.getElementById('geoquiz-status').textContent = '';
    document.getElementById('geoquiz-menu').classList.remove('hidden');
}

function startGeoQuiz(difficulty) { geoQuizBegin('qcm', difficulty === 'hard' ? 'hard' : 'easy'); }
function startGeoQuizFlag() { geoQuizBegin('flag', 'easy'); }
function startGeoQuizMap() { geoQuizBegin('map', 'easy'); }

// Rejoue la même forme, depuis le score.
function geoQuizReplay() { geoQuizBegin(geoQuizMode, geoQuizDifficulty); }

// Les questions d'une forme. Le QCM facile tire ses indices de tout l'Atlas ; le difficile prend ses distracteurs sur le même continent ;
// le mode drapeau n'a que le drapeau pour indice.
function geoQuizQuestionsFor(mode, difficulty, pool) {
    const count = GEOQUIZ_ROUNDS;
    if (mode === 'map') return GeoQuizCore.generateLocateQuestions(pool, { count: count });
    if (mode === 'flag') return GeoQuizCore.generateQuestions(pool, { count: count, asks: ['name'], clues: ['flag'] });
    return GeoQuizCore.generateQuestions(pool, { count: count, difficulty: difficulty });
}

function geoQuizBegin(mode, difficulty) {
    geoQuizMode = mode;
    geoQuizDifficulty = difficulty;
    showScreen('screen-geoquiz', 'forward');
    document.getElementById('geoquiz-menu').classList.add('hidden');
    document.getElementById('geoquiz-play').classList.add('hidden');
    document.getElementById('geoquiz-end').classList.add('hidden');
    const status = document.getElementById('geoquiz-status');
    status.textContent = t('tools.countries_loading');
    const library = mode === 'map' ? atlasLoadLibrary() : Promise.resolve(true);
    Promise.all([countriesLoad(), library]).then(([ok, libOk]) => {
        if (!ok) { status.textContent = t('tools.countries_error'); return; }
        if (!libOk) { status.textContent = t('tools.countries_no_map'); return; }
        const pool = GeoQuizCore.playablePool(countriesData.facts);
        const questions = geoQuizQuestionsFor(mode, difficulty, pool);
        if (!questions.length) { status.textContent = t('geoquiz.none'); return; }
        if (mode === 'map' && !geoQuizEnsureMap()) { status.textContent = t('tools.countries_no_webgl'); return; }
        status.textContent = '';
        geoQuizQuestions = questions;
        geoQuizIndex = 0;
        geoQuizScore = 0;
        document.getElementById('geoquiz-play').classList.remove('hidden');
        geoQuizRender();
    });
}

function geoQuizRender() {
    const q = geoQuizQuestions[geoQuizIndex];
    const locate = geoQuizMode === 'map';
    geoQuizAnswered = false;
    document.getElementById('geoquiz-progress').textContent = t('geoquiz.progress', { n: geoQuizIndex + 1, total: geoQuizQuestions.length });
    document.getElementById('geoquiz-feedback').textContent = '';
    document.getElementById('geoquiz-next').classList.add('hidden');
    document.getElementById('geoquiz-qcm').classList.toggle('hidden', locate);
    document.getElementById('geoquiz-locate').classList.toggle('hidden', !locate);
    if (locate) { geoQuizRenderLocate(q); return; }
    document.getElementById('geoquiz-ask').textContent = t('geoquiz.ask_' + q.ask);
    document.getElementById('geoquiz-clues').replaceChildren(...q.clues.map(clue => {
        const li = document.createElement('li');
        if (clue.key === 'flag') {
            // Le drapeau seul, en grand : pas de libellé à lire avant l'emoji.
            li.className = 'geoquiz-flag';
            li.textContent = clue.value;
        } else {
            li.textContent = t('geoquiz.clue_' + clue.key) + ' : ' + clue.value;
        }
        return li;
    }));
    document.getElementById('geoquiz-options').replaceChildren(...q.options.map((o, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option';
        btn.textContent = geoQuizLabel(q.ask, o.value);
        btn.onclick = () => geoQuizAnswer(i);
        return btn;
    }));
}

// Une réponse telle qu'on la lit : la population en lettres (« 68,4 millions »), le reste tel quel.
function geoQuizLabel(ask, value) {
    return ask === 'pop' ? t('geoquiz.pop_label', { n: CountriesCore.formatPopulation(value) }) : value;
}

function geoQuizAnswer(i) {
    if (geoQuizAnswered) return;
    geoQuizAnswered = true;
    const q = geoQuizQuestions[geoQuizIndex];
    const buttons = Array.from(document.querySelectorAll('#geoquiz-options .quiz-option'));
    const correct = q.options.findIndex(o => o.id === q.target);
    buttons.forEach((b, k) => {
        b.disabled = true;
        if (k === correct) b.classList.add('correct');
    });
    const feedback = document.getElementById('geoquiz-feedback');
    if (i === correct) {
        geoQuizScore++;
        feedback.textContent = t('geoquiz.right');
    } else {
        buttons[i].classList.add('wrong');
        feedback.textContent = t('geoquiz.wrong', { answer: buttons[correct].textContent });
    }
    geoQuizShowNext();
}

function geoQuizShowNext() {
    const last = geoQuizIndex === geoQuizQuestions.length - 1;
    const next = document.getElementById('geoquiz-next');
    next.textContent = t(last ? 'geoquiz.finish' : 'geoquiz.next');
    next.classList.remove('hidden');
    next.focus({ preventScroll: true });
}

function geoQuizNext() {
    geoQuizIndex++;
    if (geoQuizIndex >= geoQuizQuestions.length) { geoQuizEnd(); return; }
    geoQuizRender();
}

function geoQuizEnd() {
    document.getElementById('geoquiz-play').classList.add('hidden');
    document.getElementById('geoquiz-score').textContent = t('geoquiz.score', { score: geoQuizScore, total: geoQuizQuestions.length });
    document.getElementById('geoquiz-end').classList.remove('hidden');
    document.getElementById('geoquiz-score').focus({ preventScroll: true });
}

// « Retour » : depuis une partie, au menu ; depuis le menu, à l'écran d'où il a été ouvert.
function geoQuizQuit() {
    if (document.getElementById('geoquiz-menu').classList.contains('hidden')) { geoQuizShowMenu(); return; }
    showScreen(geoQuizReturn, 'back');
}

// --- « Touche le pays » -----------------------------------------------------------------------

function geoQuizRenderLocate(q) {
    document.getElementById('geoquiz-locate-ask').textContent = t('geoquiz.locate_ask', { name: q.clues[0].value });
    // La carte a été créée cachée : on la redimensionne une fois visible, puis on la remet sur le monde.
    geoQuizMap.resize();
    geoQuizMap.fitBounds(GEOQUIZ_WORLD, { padding: 6, duration: 0 });
    geoQuizWhenReady(() => geoQuizSetHighlight(null, false, null));
}

// La carte, créée une seule fois. Renvoie null si WebGL manque.
function geoQuizEnsureMap() {
    if (geoQuizMap) return geoQuizMap;
    const theme = countriesTheme();
    try {
        geoQuizMap = new maplibregl.Map({
            container: 'geoquiz-map',
            style: { version: 8, sources: {}, layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': COUNTRIES_OCEAN[theme] } }] },
            bounds: GEOQUIZ_WORLD,
            fitBoundsOptions: { padding: 6 },
            minZoom: -1,
            maxZoom: 8,
            renderWorldCopies: false,
            attributionControl: false,
            dragRotate: false,
            pitchWithRotate: false
        });
    } catch (e) {
        geoQuizMap = null;
        return null;
    }
    geoQuizMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    geoQuizMap.touchZoomRotate.disableRotation();
    geoQuizMap.on('load', () => {
        geoQuizAddLayers();
        geoQuizMapReady = true;
        geoQuizOnReady.splice(0).forEach(fn => fn());
    });
    geoQuizMap.on('click', e => geoQuizTap(e.lngLat.lng, e.lngLat.lat));
    // Une tuile ou une police qui manque (hors ligne) n'empêche rien : le quiz n'en a pas besoin.
    geoQuizMap.on('error', () => {});
    return geoQuizMap;
}

function geoQuizAddLayers() {
    const map = geoQuizMap;
    const theme = countriesTheme();
    const empty = { type: 'FeatureCollection', features: [] };
    map.addSource('geoquiz-countries', { type: 'geojson', data: countriesData.geo });
    map.addLayer({ id: 'geoquiz-fill', type: 'fill', source: 'geoquiz-countries', paint: { 'fill-color': GEOQUIZ_FILL[theme], 'fill-opacity': 1 } });
    map.addLayer({ id: 'geoquiz-line', type: 'line', source: 'geoquiz-countries', paint: { 'line-color': theme === 'dark' ? '#0f1a26' : '#ffffff', 'line-width': 0.7 } });
    map.addLayer({
        id: 'geoquiz-target', type: 'fill', source: 'geoquiz-countries', filter: ['==', ['get', 'id'], ''],
        paint: { 'fill-color': GEOQUIZ_TARGET[theme], 'fill-opacity': 0.65 }
    });
    // Le point du petit pays visé (après la réponse seulement) : un pays de la taille d'un point ne se surligne pas.
    map.addSource('geoquiz-hint', { type: 'geojson', data: empty });
    map.addLayer({ id: 'geoquiz-hint', type: 'circle', source: 'geoquiz-hint', paint: { 'circle-radius': 6, 'circle-color': GEOQUIZ_TARGET[theme], 'circle-stroke-color': theme === 'dark' ? '#0f1a26' : '#ffffff', 'circle-stroke-width': 1.5 } });
    // Le clic du joueur, vert s'il est juste, rouge sinon.
    map.addSource('geoquiz-tap', { type: 'geojson', data: empty });
    map.addLayer({
        id: 'geoquiz-tap', type: 'circle', source: 'geoquiz-tap',
        paint: { 'circle-radius': 8, 'circle-color': ['case', ['get', 'ok'], '#15803d', '#c2410c'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 }
    });
}

// Exécute `fn` maintenant si la carte est chargée, sinon au chargement.
function geoQuizWhenReady(fn) {
    if (geoQuizMapReady) fn(); else geoQuizOnReady.push(fn);
}

// Le pays visé (après réponse seulement) et le point du clic. `id` : null pour rien surligner.
function geoQuizSetHighlight(id, tiny, tap) {
    const map = geoQuizMap;
    const none = { type: 'FeatureCollection', features: [] };
    map.setFilter('geoquiz-target', ['==', ['get', 'id'], id || '']);
    const target = id ? countriesData.byId.get(id) : null;
    map.getSource('geoquiz-hint').setData(tiny && target
        ? { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: target.c }, properties: {} }] }
        : none);
    map.getSource('geoquiz-tap').setData(tap
        ? { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [tap.lon, tap.lat] }, properties: { ok: tap.ok } }] }
        : none);
}

// Un clic sur la carte : réussi s'il tombe dans le pays visé (ou à côté, pour un petit pays).
function geoQuizTap(lon, lat) {
    if (geoQuizAnswered || geoQuizMode !== 'map') return;
    geoQuizAnswered = true;
    const q = geoQuizQuestions[geoQuizIndex];
    const target = countriesData.byId.get(q.target);
    const prepared = countriesData.prepared.get(q.target);
    const tiny = CountriesCore.isTiny(prepared);
    const km = GeoQuizCore.distanceKm([lon, lat], target.c);
    const ok = GeoQuizCore.locateCorrect({ inside: CountriesCore.containsNear(prepared, lon, lat), tiny: tiny, distanceKm: km });
    if (ok) geoQuizScore++;
    geoQuizWhenReady(() => geoQuizSetHighlight(q.target, tiny, { lon: lon, lat: lat, ok: ok }));
    const feedback = document.getElementById('geoquiz-feedback');
    feedback.textContent = ok
        ? t('geoquiz.locate_right', { answer: target.n })
        : t('geoquiz.locate_wrong', { answer: target.n, km: Math.round(km).toLocaleString('fr-FR') });
    geoQuizShowNext();
}
