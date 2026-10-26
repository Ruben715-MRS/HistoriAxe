// =========================================================================
// === VILLES DU MONDE (écran de jeu, depuis la carte « Villes du monde » de la Salle de jeux) ===
// =========================================================================
// Quatre jeux, des parties de dix questions tirées par CityGameCore (js/cityGameCore.js) à partir de assets/geo/cities.json :
//   - « Capitale ou plus grande ville ? » et « Quel pays a cette ville ? » : un QCM à quatre réponses ;
//   - « Touchez la ville sur la carte » : le point touché rapporte d'autant moins qu'il est loin de la ville ;
//   - « Classez les villes par population » : quatre villes à remettre de la plus peuplée à la moins peuplée ;
//   - « Ville de l'histoire » : un fait de l'Atlas des événements, dont le titre ne nomme pas la ville, à situer en touchant la ville
//     (CityHistoryCore, js/cityHistoryCore.js). Après la réponse, la description du fait s'affiche.
// Pas de chrono : c'est un entraînement. Rien n'est enregistré. Les populations sont des estimations de Wikidata : elles ne servent
// qu'à décider qui est la plus grande ville et à classer. Tout ce qui vient des données passe par textContent, jamais par du HTML.

const CITIES_ROUNDS = 10;
const CITIES_DIFFICULTY = 'hard';
const CITIES_WORLD = [[-170, -58], [190, 78]];
const CITIES_FILL = { light: '#dfe6ee', dark: '#334155' };

let cityGameData = null;          // les villes (assets/geo/cities.json)
let cityGameLoading = null;
let cityGameForm = 'capital';
let cityGameReturn = 'screen-arcade';
let cityGameQuestions = [];
let cityGameIndex = 0;
let cityGameScore = 0;            // en points
let cityGameAnswered = false;
let citySequence = [];            // « classer » : les villes choisies, dans l'ordre
let cityMap = null;
let cityMapReady = false;
let cityMapQueue = [];

function cityGameLoad() {
    if (cityGameData) return Promise.resolve(true);
    if (!cityGameLoading) {
        cityGameLoading = fetch('assets/geo/cities.json')
            .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(d => { cityGameData = d.cities; return true; })
            .catch(() => { cityGameLoading = null; return false; });
    }
    return cityGameLoading;
}

// Le menu des jeux sur les villes, ouvert depuis la carte « Villes du monde » de la Salle de jeux (`from`).
function openCitiesMenu(from) {
    if (from) cityGameReturn = from;
    showScreen('screen-cities', 'forward');
    cityGameShowPanel('menu');
}

// Ouvre une partie de la forme donnée (depuis le menu des villes).
function openCityGame(form) {
    cityGameForm = form;
    showScreen('screen-cities', 'forward');
    cityGameShowPanel('status');
    const status = document.getElementById('cities-status');
    status.textContent = t('tools.countries_loading');
    // La bibliothèque de cartes ne se charge qu'avec un jeu de carte ; les lieux de l'Atlas, qu'avec le jeu d'histoire.
    const onMap = cityGameForm === 'touch' || cityGameForm === 'history';
    const library = onMap ? atlasLoadLibrary() : Promise.resolve(true);
    const events = cityGameForm === 'history' ? atlasEnsureData() : Promise.resolve(true);
    Promise.all([countriesLoad(), cityGameLoad(), library, events]).then(([ok, citiesOk, libOk, eventsOk]) => {
        if (!ok || !citiesOk) { status.textContent = t('tools.countries_error'); return; }
        if (!libOk) { status.textContent = t('tools.countries_no_map'); return; }
        if (!eventsOk) { status.textContent = t('cities.history_error'); return; }
        if (onMap && !cityGameEnsureMap()) { status.textContent = t('tools.countries_no_webgl'); return; }
        cityGameStart();
    });
}

// Les questions de la partie : les faits de l'Atlas rattachés à une ville pour « Ville de l'histoire », les autres jeux selon leur forme.
function cityGameQuestionsFor(form) {
    if (form === 'history') {
        const pool = CityHistoryCore.buildHistoryPool(CityHistoryCore.factsFromAtlas(atlasModel.index), cityGameData);
        return CityHistoryCore.generateHistoryGame(pool, { count: CITIES_ROUNDS });
    }
    return CityGameCore.generateCityGame(cityGameData, countriesData.facts, form, { count: CITIES_ROUNDS, difficulty: CITIES_DIFFICULTY });
}

function cityGameStart() {
    const questions = cityGameQuestionsFor(cityGameForm);
    if (!questions.length) { document.getElementById('cities-status').textContent = t('cities.none'); return; }
    cityGameQuestions = questions;
    cityGameIndex = 0;
    cityGameScore = 0;
    document.getElementById('cities-status').textContent = '';
    document.getElementById('cities-credit').textContent = t('cities.credit') + (cityGameForm === 'history' ? ' ' + t('cities.history_credit') : '');
    cityGameShowPanel('play');
    cityGameRender();
}

// Un seul panneau visible à la fois : le menu, l'état d'attente, la partie, ou le score.
function cityGameShowPanel(which) {
    document.getElementById('cities-menu').classList.toggle('hidden', which !== 'menu');
    document.getElementById('cities-status').classList.toggle('hidden', which !== 'status');
    document.getElementById('cities-play').classList.toggle('hidden', which !== 'play');
    document.getElementById('cities-end').classList.toggle('hidden', which !== 'end');
}

function cityGameById(id) {
    return cityGameData.find(c => c.id === id);
}

function cityGameCountry(cc) {
    const c = countriesData.facts.find(f => f.iso2 === cc);
    return c ? c.n : cc;
}

// La question, selon sa forme réelle (capitale, plus grande ville, pays, carte, classement).
function cityGameAsk(q) {
    if (q.ask === 'country') return t('cities.ask_country', { city: cityGameById(q.target).n });
    if (q.ask === 'touch') return t('cities.ask_touch', { city: cityGameById(q.target).n });
    if (q.ask === 'history') return t('cities.ask_history');
    if (q.ask === 'order') return t('cities.ask_order');
    return t('cities.ask_' + q.ask, { country: cityGameCountry(q.country) });
}

function cityGameRender() {
    const q = cityGameQuestions[cityGameIndex];
    cityGameAnswered = false;
    citySequence = [];
    document.getElementById('cities-progress').textContent = t('cities.progress', { n: cityGameIndex + 1, total: cityGameQuestions.length });
    document.getElementById('cities-score-now').textContent = t('cities.score_now', { score: cityGameScore });
    document.getElementById('cities-ask').textContent = cityGameAsk(q);
    const onMap = q.ask === 'touch' || q.ask === 'history';
    const ordering = q.ask === 'order';
    cityGameRenderFact(q);
    document.getElementById('cities-map-wrap').classList.toggle('hidden', !onMap);
    document.getElementById('cities-options').classList.toggle('hidden', onMap);
    document.getElementById('cities-sequence').classList.toggle('hidden', !ordering);
    document.getElementById('cities-sequence').textContent = '';
    document.getElementById('cities-reset').classList.add('hidden');
    if (!onMap) {
        document.getElementById('cities-options').replaceChildren(...q.options.map((o, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quiz-option';
            btn.textContent = o.value;
            btn.onclick = () => (ordering ? cityGamePick(i) : cityGameAnswer(i));
            return btn;
        }));
    } else {
        cityGameMapWhenReady(() => cityGameResetMap());
    }
    document.getElementById('cities-feedback').textContent = '';
    document.getElementById('cities-next').classList.add('hidden');
}

// La fiche du fait, pour « Ville de l'histoire » : le titre, l'année et le thème (sans la description, qui nomme souvent la ville :
// elle ne s'affiche qu'après la réponse).
function cityGameRenderFact(q) {
    const fact = document.getElementById('cities-fact');
    const history = q.ask === 'history';
    fact.classList.toggle('hidden', !history);
    document.getElementById('cities-fact-desc').classList.add('hidden');
    if (!history) return;
    document.getElementById('cities-fact-title').textContent = q.title;
    document.getElementById('cities-fact-meta').textContent = atlasYearLabel(q.year) + (q.theme ? ' · ' + q.theme : '');
    document.getElementById('cities-fact-desc').textContent = '';
}

// La description du fait, une fois la réponse donnée : elle nomme souvent la ville, et dans un pack découpé elle se charge à la demande
// (Pack.ensureDescriptions). Si le joueur est déjà passé à la question suivante, elle ne s'affiche pas.
function cityGameShowDescription(q) {
    const show = () => {
        if (cityGameQuestions[cityGameIndex] !== q) return;
        const text = (q.event && q.event.description) || q.description || '';
        const el = document.getElementById('cities-fact-desc');
        el.textContent = text;
        el.classList.toggle('hidden', !text);
    };
    if (q.event && typeof Pack !== 'undefined') Pack.ensureDescriptions([q.event]).then(show);
    else show();
}

// Un piège expliqué : la capitale prise pour la plus grande ville, et l'inverse.
function cityGameTrapText(q, chosen) {
    const big = cityGameData.filter(c => c.cc === cityGameById(q.target).cc && c.pop).sort((a, b) => b.pop - a.pop)[0];
    if (q.ask === 'capital' && chosen.id !== q.target && big && chosen.id === big.id) return t('cities.trap_largest', { answer: chosen.n });
    if (q.ask === 'largest' && chosen.cap && chosen.id !== q.target) return t('cities.trap_capital', { answer: chosen.n });
    return '';
}

function cityGameAnswer(i) {
    if (cityGameAnswered) return;
    const q = cityGameQuestions[cityGameIndex];
    const buttons = Array.from(document.querySelectorAll('#cities-options .quiz-option'));
    const correct = q.options.findIndex(o => o.id === q.target);
    buttons.forEach((b, k) => {
        b.disabled = true;
        if (k === correct) b.classList.add('correct');
    });
    const feedback = document.getElementById('cities-feedback');
    if (i === correct) {
        cityGameScore += CityGameCore.QCM_POINTS;
        feedback.textContent = t('cities.right', { points: CityGameCore.QCM_POINTS });
    } else {
        buttons[i].classList.add('wrong');
        const trap = cityGameTrapText(q, cityGameById(q.options[i].id));
        feedback.textContent = (trap ? trap + ' ' : '') + t('cities.wrong', { answer: buttons[correct].textContent });
    }
    cityGameShowNext();
}

// « Classer » : on choisit les villes dans l'ordre, de la plus peuplée à la moins peuplée. Quatre choix, puis la correction.
function cityGamePick(i) {
    if (cityGameAnswered) return;
    const q = cityGameQuestions[cityGameIndex];
    const button = document.querySelectorAll('#cities-options .quiz-option')[i];
    citySequence.push(q.options[i].id);
    button.disabled = true;
    document.getElementById('cities-sequence').textContent = t('cities.order_sequence', {
        list: citySequence.map(id => cityGameById(id).n).join(' › ')
    });
    document.getElementById('cities-reset').classList.remove('hidden');
    if (citySequence.length === CityGameCore.ORDER_SIZE) cityGameFinishOrder(q);
}

function cityGameResetOrder() {
    if (cityGameAnswered) return;
    citySequence = [];
    document.querySelectorAll('#cities-options .quiz-option').forEach(b => { b.disabled = false; });
    document.getElementById('cities-sequence').textContent = '';
    document.getElementById('cities-reset').classList.add('hidden');
}

function cityGameFinishOrder(q) {
    cityGameAnswered = true;
    const points = CityGameCore.orderPoints(citySequence, q.ids);
    cityGameScore += points;
    document.querySelectorAll('#cities-options .quiz-option').forEach(b => { b.disabled = true; });
    document.getElementById('cities-reset').classList.add('hidden');
    const right = points / CityGameCore.ORDER_POINTS;
    let text = t('cities.order_result', { n: right, points: points });
    if (points < CityGameCore.ORDER_POINTS * CityGameCore.ORDER_SIZE) {
        text += ' ' + t('cities.order_answer', { list: q.ids.map(id => cityGameById(id).n).join(' › ') });
    }
    document.getElementById('cities-feedback').textContent = text;
    cityGameShowNext();
}

function cityGameShowNext() {
    cityGameAnswered = true;
    const last = cityGameIndex === cityGameQuestions.length - 1;
    const next = document.getElementById('cities-next');
    next.textContent = t(last ? 'geoquiz.finish' : 'geoquiz.next');
    next.classList.remove('hidden');
    next.focus({ preventScroll: true });
}

function cityGameNext() {
    cityGameIndex++;
    if (cityGameIndex >= cityGameQuestions.length) { cityGameEnd(); return; }
    cityGameRender();
}

function cityGameEnd() {
    cityGameShowPanel('end');
    const max = cityGameQuestions.length * CityGameCore.QCM_POINTS;
    document.getElementById('cities-score').textContent = t('cities.score_end', { score: cityGameScore, max: max });
    document.getElementById('cities-score').focus({ preventScroll: true });
}

// « Retour » : depuis une partie, au menu des villes ; depuis le menu, à la Salle de jeux.
function cityGameQuit() {
    if (!document.getElementById('cities-menu').classList.contains('hidden')) { showScreen(cityGameReturn, 'back'); return; }
    openCitiesMenu();
}

// --- « Touchez la ville sur la carte » ----------------------------------------------------------

// La carte, créée une seule fois. Renvoie null sans WebGL. Aucun nom n'y figure : pas de couche de texte.
function cityGameEnsureMap() {
    if (cityMap) return cityMap;
    const theme = countriesTheme();
    try {
        cityMap = new maplibregl.Map({
            container: 'cities-map',
            style: { version: 8, sources: {}, layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': COUNTRIES_OCEAN[theme] } }] },
            bounds: CITIES_WORLD,
            fitBoundsOptions: { padding: 6 },
            minZoom: -1,
            maxZoom: 8,
            renderWorldCopies: false,
            attributionControl: false,
            dragRotate: false,
            pitchWithRotate: false
        });
    } catch (e) {
        cityMap = null;
        return null;
    }
    cityMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    cityMap.touchZoomRotate.disableRotation();
    cityMap.on('load', () => {
        cityGameAddLayers();
        cityMapReady = true;
        cityMapQueue.splice(0).forEach(fn => fn());
    });
    cityMap.on('click', e => cityGameTap(e.lngLat.lng, e.lngLat.lat));
    cityMap.on('error', () => {});
    // Au clavier : Entrée ou Espace pose le repère au centre de la carte (la mire s'affiche au focus) ; les flèches et +/− déplacent et
    // zooment la carte, nativement. Même geste que le Mode Carte.
    const container = document.getElementById('cities-map');
    container.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === container) {
            e.preventDefault();
            const c = cityMap.getCenter();
            cityGameTap(c.lng, c.lat);
        }
    });
    return cityMap;
}

function cityGameAddLayers() {
    const map = cityMap;
    const theme = countriesTheme();
    const empty = { type: 'FeatureCollection', features: [] };
    map.addSource('cities-countries', { type: 'geojson', data: countriesData.geo });
    map.addLayer({ id: 'cities-fill', type: 'fill', source: 'cities-countries', paint: { 'fill-color': CITIES_FILL[theme], 'fill-opacity': 1 } });
    map.addLayer({ id: 'cities-line', type: 'line', source: 'cities-countries', paint: { 'line-color': theme === 'dark' ? '#0f1a26' : '#ffffff', 'line-width': 0.7 } });
    map.addSource('cities-target', { type: 'geojson', data: empty });
    map.addLayer({ id: 'cities-target', type: 'circle', source: 'cities-target', paint: { 'circle-radius': 7, 'circle-color': '#15803d', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });
    map.addSource('cities-tap', { type: 'geojson', data: empty });
    map.addLayer({ id: 'cities-tap', type: 'circle', source: 'cities-tap', paint: { 'circle-radius': 7, 'circle-color': '#c2410c', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });
}

function cityGameMapWhenReady(fn) {
    if (cityMapReady) fn(); else cityMapQueue.push(fn);
}

function cityGamePoint(lon, lat) {
    return { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: {} }] };
}

// La carte au début d'une question : vue sur le monde, rien d'affiché.
function cityGameResetMap() {
    cityMap.resize();
    cityMap.fitBounds(CITIES_WORLD, { padding: 6, duration: 0 });
    cityMap.getSource('cities-target').setData({ type: 'FeatureCollection', features: [] });
    cityMap.getSource('cities-tap').setData({ type: 'FeatureCollection', features: [] });
}

// Un clic : la distance au vrai lieu donne les points ; la vraie ville et le clic s'affichent ensuite.
function cityGameTap(lon, lat) {
    if (cityGameAnswered || (cityGameForm !== 'touch' && cityGameForm !== 'history')) return;
    const q = cityGameQuestions[cityGameIndex];
    const city = cityGameById(q.target);
    const km = GeoQuizCore.distanceKm([lon, lat], [city.lon, city.lat]);
    const points = CityGameCore.touchPoints(km);
    cityGameScore += points;
    cityGameAnswered = true;
    cityGameMapWhenReady(() => {
        cityMap.getSource('cities-target').setData(cityGamePoint(city.lon, city.lat));
        cityMap.getSource('cities-tap').setData(cityGamePoint(lon, lat));
    });
    const result = { city: city.n, km: Math.round(km).toLocaleString('fr-FR'), points: points };
    document.getElementById('cities-feedback').textContent = t(q.ask === 'history' ? 'cities.history_result' : 'cities.touch_result', result);
    if (q.ask === 'history') cityGameShowDescription(q);
    cityGameShowNext();
}
