// =========================================================================
// === HISTORIAXE — MODULE MODE CARTE (LOCALISATION GÉOGRAPHIQUE) ===
// =========================================================================
// Mode de jeu : chaque événement est d'abord situé dans l'ESPACE — on pose un
// repère sur une carte sans noms, et les points dépendent de la distance — puis
// dans le TEMPS (une année parmi 4, comme en mode Quiz). Les deux notes se
// cumulent dans le même score : c'est le double axe (temporel + spatial) qui
// donne son nom à HistoriAxe.
//
// D'où viennent les lieux. Plus de pays déduit du thème : chaque événement a SON
// lieu (assets/geo/events-geo.json, produit par scripts/geo/ ; même fichier que
// l'Atlas, voir js/atlas.js). Seuls les faits au lieu sûr — un site ou une ville,
// sans drapeau « lieu discutable » — deviennent des questions, ce qui ouvre le
// mode à tous les thèmes, pas seulement aux « Histoires nationales ». La logique
// (distance, échelle, points, tirage) est dans js/geoPlace.js, qui se teste sans
// navigateur ; ici, l'écran, la carte et le déroulé d'une manche.
//
// La carte est celle de l'Atlas (MapLibre, fond OpenStreetMap), dont on retire
// tous les noms de lieux : ce serait la réponse. Il faut donc du réseau pour jouer.
//
// Ce qui reste de l'ancien mode : assets/geo/theme-country-map.json (thème → pays),
// toujours lu par le Défi de simultanéité (voir js/simultaneity.js), et les petits
// utilitaires de drapeaux et de noms de pays utilisés par les fiches.

let GEO_THEME_COUNTRY = null;
let geoAssetsPromise = null;

const GEO_SESSION_MAX_ROUNDS = 12;
const GEO_SESSION_MIN_EVENTS = 6;
// Points d'un placement parfait, avant combo. Valeur inchangée depuis le mode à choix de pays : les
// points d'expérience (XP) ne bougent donc pas.
const GEO_LOCATE_BASE_POINTS = 80;

// État de la partie en cours (mode 'carte' uniquement)
let geoScopeLabel = '';
// Le nœud de l'arbre d'où la partie est partie : « Rejouer » (js/app.js: replayCurrentGame) relance la
// même zone, ce que le seul libellé ne permet pas.
let geoLastNode = null;
let geoReturnScreen = 'screen-themes';
let geoSessionPool = [];   // [{ event, entry, lat, lon, prec, label, place, themeName }], un par manche
let geoRoundIndex = 0;
let geoCurrentRound = null;
let geoScale = 500;        // échelle D (km) de la zone jouée, voir GeoPlace.scaleKm
let geoBounds = null;      // [[ouest, sud], [est, nord]] où cadrer la carte au début de chaque manche
let geoPhase = 'place';    // 'place' (on vise) → 'reveal' (le résultat) → 'time' (l'année)
let geoGuess = null;       // { lat, lon } : le repère posé, pas encore validé
let geoMap = null;
let geoMapLoaded = false;
let geoStylePromise = null;
let geoGuessMarker = null;
let geoAnswerMarker = null;

// --- CHARGEMENT DES ASSETS (paresseux, une seule fois) ---
function loadGeoAssets() {
    if (GEO_THEME_COUNTRY) return Promise.resolve(true);
    if (geoAssetsPromise) return geoAssetsPromise;
    geoAssetsPromise = fetch('assets/geo/theme-country-map.json')
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(themeMap => {
            GEO_THEME_COUNTRY = themeMap;
            return true;
        }).catch(err => {
            console.error('[GeoMap] Échec du chargement de la table thème → pays :', err);
            geoAssetsPromise = null; // permet de réessayer plus tard (ex. retour du réseau)
            return false;
        });
    return geoAssetsPromise;
}

// Emoji drapeau à partir d'un code ISO-3166-1 alpha-2 (indicateurs régionaux
// Unicode) — aucune table de données nécessaire.
function isoToFlagEmoji(iso2) {
    if (!iso2 || iso2.length !== 2) return '🏳️';
    const codePoints = [...iso2.toUpperCase()].map(c => 0x1F1E6 + (c.charCodeAt(0) - 65));
    return String.fromCodePoint(...codePoints);
}

// Nom de pays localisé dans la langue active de l'app, via l'API standard
// Intl.DisplayNames (aucune table de noms à maintenir/traduire nous-mêmes).
function countryDisplayName(iso2) {
    try {
        const lang = (typeof i18n !== 'undefined' && i18n.currentLang) ? i18n.currentLang : 'fr';
        const dn = new Intl.DisplayNames([lang, 'fr', 'en'], { type: 'region' });
        return dn.of(iso2) || iso2;
    } catch (e) {
        return iso2;
    }
}

// --- LE VIVIER DE QUESTIONS D'UN NŒUD ---
// Les thèmes d'un nœud de bdd (catégorie, sous-catégorie ou thème isolé).
function geoThemesOf(node) {
    const themes = [];
    (function walk(n) {
        if (!n) return;
        if (n.subcategories) n.subcategories.forEach(walk);
        else if (n.themes) n.themes.forEach(theme => themes.push(theme));
    })(node);
    return themes;
}

function geoEntriesOf(node) {
    const entries = [];
    geoThemesOf(node).forEach((theme, themeIndex) => {
        (theme.events || []).forEach(event => entries.push({ event, theme, themeIndex, categoryIndex: 0, subcategoryIndex: [] }));
    });
    return entries;
}

function geoPointsReady() {
    return (typeof atlasPoints !== 'undefined' && atlasPoints) ? atlasPoints : null;
}

// --- CARTE SANS NOMS ---
// Le style de l'Atlas, privé de ses couches de texte et d'icônes : il reste les côtes, les frontières,
// les fleuves, le relief et, de près, les rues — sans un seul nom.
function geoLoadStyle() {
    if (!geoStylePromise) {
        geoStylePromise = fetch(ATLAS_STYLE_URL)
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(style => {
                style.layers = style.layers.filter(layer => layer.type !== 'symbol');
                return style;
            }).catch(err => {
                geoStylePromise = null;
                throw err;
            });
    }
    return geoStylePromise;
}

function geoEnsureMap() {
    if (geoMap) { geoMap.resize(); return; }
    return geoLoadStyle().then(style => {
        geoMap = new maplibregl.Map({
            container: 'geo-map',
            style: style,
            bounds: geoBounds || [[-170, -55], [170, 70]],
            fitBoundsOptions: { padding: 24 },
            minZoom: 0.8,
            maxZoom: 16,
            attributionControl: { compact: true },
            dragRotate: false,
            pitchWithRotate: false
        });
        geoMap.touchZoomRotate.disableRotation();
        geoMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        geoMap.on('click', geoOnMapClick);
        geoMap.on('load', () => {
            geoMapLoaded = true;
            geoMap.addSource('geo-line', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            geoMap.addLayer({
                id: 'geo-line', type: 'line', source: 'geo-line',
                paint: { 'line-color': '#26457f', 'line-width': 3, 'line-dasharray': [2, 1.5] }
            });
        });
        // Au clavier : Entrée ou Espace pose le repère au centre de la carte (la mire s'affiche au focus,
        // voir .geo-crosshair) ; les flèches et +/− déplacent et zooment la carte, nativement.
        const container = document.getElementById('geo-map');
        container.addEventListener('keydown', e => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target === container) {
                e.preventDefault();
                const c = geoMap.getCenter();
                geoSetGuess(c.lat, c.lng);
            }
        });
    });
}

function geoMarkerElement(kind) {
    const el = document.createElement('div');
    el.className = 'geo-pin geo-pin-' + kind;
    el.setAttribute('aria-hidden', 'true');
    return el;
}

function geoClearRoundVisuals() {
    if (geoGuessMarker) { geoGuessMarker.remove(); geoGuessMarker = null; }
    if (geoAnswerMarker) { geoAnswerMarker.remove(); geoAnswerMarker = null; }
    if (geoMap && geoMapLoaded && geoMap.getSource('geo-line')) {
        geoMap.getSource('geo-line').setData({ type: 'FeatureCollection', features: [] });
    }
}

// --- CYCLE DE VIE DE LA PARTIE ---
function getCurrentVisibleScreenId() {
    const current = Array.from(document.querySelectorAll('body > div')).find(div =>
        !div.classList.contains('hidden') &&
        div.id && div.id.startsWith('screen-')
    );
    return current ? current.id : 'screen-themes';
}

// `returnScreen` (facultatif) : l'écran où ramènera la fin de partie. Au premier lancement c'est l'écran
// affiché ; pour « Rejouer », qui part de l'écran de fin, c'est celui du lancement d'origine.
function startGeoModeFromNode(node, label, returnScreen) {
    const fromScreen = returnScreen || getCurrentVisibleScreenId();
    Promise.all([loadGeoAssets(), atlasLoadGeo(), atlasLoadLibrary(), geoLoadStyle().then(() => true).catch(() => false)]).then(results => {
        if (!results[1] || !results[2] || !results[3]) {
            alert(t('carte.load_error'));
            return;
        }
        const fullPool = GeoPlace.buildPool(geoEntriesOf(node), geoPointsReady());
        if (fullPool.length < GEO_SESSION_MIN_EVENTS) {
            alert(t('carte.not_enough_events'));
            return;
        }

        resetSessionHistory();
        currentMode = 'carte';
        revisionMode = false;
        dailyChallengeMode = false;
        geoReturnScreen = fromScreen;
        geoScopeLabel = label;
        geoLastNode = node;

        geoSessionPool = GeoPlace.pickSession(fullPool, GEO_SESSION_MAX_ROUNDS);
        // Le texte des fiches (énoncé, année de décès des leurres) vient d'un pack découpé : on le charge
        // pour les seules manches de la partie.
        const descriptionsReady = ensureDescriptions(geoSessionPool.map(item => item.event));
        geoRoundIndex = 0;
        score = 0;
        lives = 3;
        comboMultiplier = 1.0;
        totalTimePlayed = 0;

        const dates = geoSessionPool.map(item => item.event.date);
        currentGameSpan = Math.max(1, Math.max(...dates) - Math.min(...dates));

        // L'échelle et le cadrage viennent de TOUT le vivier du nœud, pas du seul échantillon de la partie :
        // la zone visible et la sévérité du barème restent stables d'une manche à l'autre.
        const coords = fullPool.map(p => [p.lat, p.lon]);
        geoScale = GeoPlace.scaleKm(coords);
        geoBounds = GeoPlace.boundsOf(coords);

        document.getElementById('geo-scope-label').innerText = label;
        showScreen('screen-carte');
        const ready = geoEnsureMap();
        // pickNextGeoRound n'attend pas la carte : elle se pose dès qu'elle est prête, et le jeu (points, vies,
        // année) ne dépend que de la manche — voir submitGeoGuess.
        descriptionsReady.then(pickNextGeoRound);
        if (ready && ready.catch) ready.catch(() => alert(t('carte.load_error')));
    });
}

function pickNextGeoRound() {
    const item = geoSessionPool[geoRoundIndex];
    geoCurrentRound = {
        item,
        correctYear: item.event.date,
        timeOptions: pickGeoYearOptions(item.event.date, item.event.id, item.event),
        geoCorrect: null,
        timeCorrect: null,
        guess: null,
        distanceKm: null,
        fraction: null,
        verdict: null,
        points: 0
    };
    renderGeoLocatePhase();
    updateGeoHUD();
}

// La fiche d'un personnage s'ouvre sur « Nom (naissance-mort) est… » : cette parenthèse donne la réponse
// à la question « en quelle année ? » qui suit la carte. On y remplace l'année de naissance par « ? ».
const GEO_BIRTH_YEAR_PATTERN = /^([^()]{1,80}\()(?:vers )?\d+(?: av\. J\.-C\.)?(?=-)/;

function geoDescription(evt) {
    const desc = evt.description || '';
    if (typeof portraitOf !== 'function' || !portraitOf(evt)) return desc;
    return desc.replace(GEO_BIRTH_YEAR_PATTERN, '$1?');
}

function renderGeoLocatePhase() {
    isAnimating = false;
    geoPhase = 'place';
    geoGuess = null;
    // Le focus va à la carte-question (voir A11y.focusQuestion), pas à <body>.
    A11y.focusQuestion('screen-carte');
    const round = geoCurrentRound;

    const kicker = document.getElementById('geo-phase-kicker');
    kicker.innerText = t('carte.where_kicker');
    kicker.classList.remove('hidden');
    document.getElementById('geo-event-title').innerText = round.item.event.titre;
    document.getElementById('geo-event-desc').innerText = geoDescription(round.item.event);
    document.getElementById('geo-reveal-label').classList.add('hidden');
    document.getElementById('geo-time-phase').classList.add('hidden');
    document.getElementById('geo-map-phase').classList.remove('hidden');

    document.getElementById('geo-hint').innerText = t('carte.place_hint');
    const validate = document.getElementById('geo-validate-btn');
    validate.disabled = true;
    validate.classList.remove('hidden');
    validate.onclick = confirmGeoGuess;
    const next = document.getElementById('geo-continue-btn');
    next.classList.add('hidden');
    next.onclick = continueAfterGeoReveal;
    document.getElementById('geo-status').innerText = '';

    geoClearRoundVisuals();
    if (geoMap) {
        geoMap.resize();
        geoMap.fitBounds(geoBounds, { padding: 24, animate: false });
    }
}

function geoOnMapClick(e) {
    if (geoPhase !== 'place' || isAnimating) return;
    geoSetGuess(e.lngLat.lat, e.lngLat.lng);
}

// Pose (ou déplace) le repère. Rien n'est joué tant qu'on ne valide pas : on peut le reprendre ou le glisser.
function geoSetGuess(lat, lon) {
    if (geoPhase !== 'place' || isAnimating) return;
    geoGuess = { lat, lon };
    if (geoMap) {
        if (!geoGuessMarker) {
            geoGuessMarker = new maplibregl.Marker({ element: geoMarkerElement('player'), draggable: true, anchor: 'bottom' })
                .setLngLat([lon, lat]).addTo(geoMap);
            geoGuessMarker.on('dragend', () => {
                const p = geoGuessMarker.getLngLat();
                geoGuess = { lat: p.lat, lon: p.lng };
            });
        } else {
            geoGuessMarker.setLngLat([lon, lat]);
        }
    }
    document.getElementById('geo-validate-btn').disabled = false;
    document.getElementById('geo-status').innerText = t('carte.guess_placed');
}

function confirmGeoGuess() {
    if (!geoGuess || geoPhase !== 'place') return;
    answerGeoLocate(geoGuess.lat, geoGuess.lon);
}

// Pose et valide d'un coup : ce qu'appelle un test, ou toute entrée qui connaît déjà ses coordonnées.
function submitGeoGuess(lat, lon) {
    geoSetGuess(lat, lon);
    confirmGeoGuess();
}

function geoFormatKm(km) {
    const lang = (typeof i18n !== 'undefined' && i18n.currentLang) ? i18n.currentLang : 'fr';
    if (km < 1) return t('carte.km_under_one');
    if (km < 10) return km.toLocaleString(lang, { maximumFractionDigits: 1 });
    return Math.round(km).toLocaleString(lang);
}

function answerGeoLocate(lat, lon) {
    if (isAnimating) return;
    isAnimating = true;
    geoPhase = 'reveal';

    const round = geoCurrentRound;
    const item = round.item;
    const km = GeoPlace.haversineKm([lat, lon], [item.lat, item.lon]);
    const fraction = GeoPlace.scoreFraction(km, geoScale, item.prec);
    const verdict = GeoPlace.verdict(fraction);
    round.guess = { lat, lon };
    round.distanceKm = km;
    round.fraction = fraction;
    round.verdict = verdict;
    round.geoCorrect = verdict === 'great';

    const pts = Math.round(GEO_LOCATE_BASE_POINTS * fraction * comboMultiplier);
    round.points = pts;
    score += pts;
    if (verdict === 'great') {
        comboMultiplier = Math.round((comboMultiplier + 0.1) * 10) / 10;
        playCorrectSound(comboMultiplier);
        triggerHaptic('success');
    } else if (verdict === 'ok') {
        playCorrectSound(1.0);
    } else {
        comboMultiplier = 1.0;
        playWrongSound();
        triggerHaptic('error');
        lives -= 1;
    }

    geoShowReveal(round, lat, lon);

    const revealEl = document.getElementById('geo-reveal-label');
    const place = item.label || item.themeName;
    revealEl.innerText = fraction >= 0.995
        ? t('carte.result_exact', { place, pts })
        : t('carte.result', { place, km: geoFormatKm(km), pts });
    revealEl.classList.remove('hidden');
    revealEl.classList.toggle('is-correct', verdict === 'great');
    revealEl.classList.toggle('is-ok', verdict === 'ok');
    revealEl.classList.toggle('is-wrong', verdict === 'miss');
    document.getElementById('geo-hint').innerText = '';
    document.getElementById('geo-status').innerText = '';
    document.getElementById('geo-validate-btn').classList.add('hidden');
    const next = document.getElementById('geo-continue-btn');
    next.classList.remove('hidden');
    next.focus();

    updateGeoHUD();
}

// Le bon endroit, le trait jusqu'au repère du joueur, et un cadrage qui montre les deux.
function geoShowReveal(round, lat, lon) {
    if (!geoMap) return;
    const answer = [round.item.lon, round.item.lat];
    if (geoAnswerMarker) geoAnswerMarker.remove();
    geoAnswerMarker = new maplibregl.Marker({ element: geoMarkerElement('answer'), anchor: 'bottom' }).setLngLat(answer).addTo(geoMap);
    if (geoGuessMarker) geoGuessMarker.setDraggable(false);
    else geoGuessMarker = new maplibregl.Marker({ element: geoMarkerElement('player'), anchor: 'bottom' }).setLngLat([lon, lat]).addTo(geoMap);
    if (geoMapLoaded && geoMap.getSource('geo-line')) {
        geoMap.getSource('geo-line').setData({
            type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[lon, lat], answer] }
        });
    }
    const bounds = new maplibregl.LngLatBounds([lon, lat], [lon, lat]).extend(answer);
    geoMap.fitBounds(bounds, { padding: { top: 70, bottom: 70, left: 50, right: 50 }, maxZoom: 13, duration: 800 });
}

function continueAfterGeoReveal() {
    if (geoPhase !== 'reveal') return;
    const round = geoCurrentRound;
    if (lives <= 0) {
        // Partie perdue : ne PAS relâcher isAnimating — l'écran va changer (endGame → screen-end) et plus
        // aucune entrée sur cet écran ne doit pouvoir déclencher un nouveau round sur un `geoCurrentRound` obsolète.
        finalizeGeoRound(round);
        endGame(false);
        return;
    }
    isAnimating = false;
    renderGeoTimePhase();
}

// Distracteurs d'années : autres dates du pool de la session, également
// répartis proche/moyen/loin. Repli sur des décalages synthétiques si le
// pool est trop pauvre en dates distinctes (thème très court).
// « Nom (naissance-mort) est… » : l'année de décès, ou null (pas de parenthèse, ou personne encore en vie
// sans année donnée). « (1960-) » vaut l'année courante.
const GEO_DEATH_YEAR_PATTERN = /^[^()]{1,80}\([^()]*?-(?:vers )?(\d+)?(?: (av)\. J\.-C\.)?\)/;

function geoDeathYear(evt) {
    const m = GEO_DEATH_YEAR_PATTERN.exec(evt.description || '');
    if (!m) return null;
    if (!m[1]) return new Date().getFullYear();
    return m[2] ? -Number(m[1]) : Number(m[1]);
}

// Pour un personnage, les leurres de la date de naissance restent plausibles : des années de la même
// fenêtre que la vraie, de 50 à 100 ans avant la mort, ou, si la naissance en sort (mort jeune ou très âgée), ±25 ans autour
// d'elle sans dépasser la mort — sinon la seule année proche de la mort se désigne d'elle-même. null : on retombe sur le
// tirage dans le pool de la session.
function pickLifeYearOptions(birth, evt) {
    if (typeof portraitOf !== 'function' || !portraitOf(evt)) return null;
    const death = geoDeathYear(evt);
    if (death === null || death < birth) return null;
    const inWindow = birth >= death - 100 && birth <= death - 50;
    const lo = inWindow ? death - 100 : birth - 25;
    const hi = Math.min(death, inWindow ? death - 50 : birth + 25);
    const gap = Math.max(4, Math.min(10, Math.floor((hi - lo) / 6)));
    const picks = [];
    for (let attempt = 0; attempt < 200 && picks.length < 3; attempt++) {
        let y = lo + Math.floor(Math.random() * (hi - lo + 1));
        if (y === 0) y = 1;
        if (Math.abs(y - birth) < gap || picks.some(p => Math.abs(p - y) < gap)) continue;
        picks.push(y);
    }
    return picks.length === 3 ? shuffleArray([birth, ...picks]) : null;
}

function pickGeoYearOptions(correctYear, excludeEventId, evt) {
    const lifeOptions = evt ? pickLifeYearOptions(correctYear, evt) : null;
    if (lifeOptions) return lifeOptions;
    const uniqYears = new Map();
    geoSessionPool.forEach(item => {
        if (item.event.id === excludeEventId) return;
        if (item.event.date === correctYear) return;
        uniqYears.set(item.event.date, true);
    });
    let years = [...uniqYears.keys()];
    if (years.length < 3) {
        let offset = 8;
        while (years.length < 3) {
            const candidate = correctYear + (years.length % 2 === 0 ? offset : -offset);
            if (candidate !== correctYear && !years.includes(candidate)) years.push(candidate);
            offset += 7;
        }
    }
    const withDist = years.map(y => ({ y, d: Math.abs(y - correctYear) })).sort((a, b) => a.d - b.d);
    const n = withDist.length;
    const pools = [
        withDist.slice(0, Math.max(1, Math.floor(n * 0.34))),
        withDist.slice(Math.floor(n * 0.34), Math.max(Math.floor(n * 0.34) + 1, Math.floor(n * 0.67))),
        withDist.slice(Math.floor(n * 0.67))
    ];
    const picks = new Set();
    pools.forEach(pool => {
        if (pool.length === 0) return;
        let choice, attempts = 0;
        do { choice = pool[Math.floor(Math.random() * pool.length)].y; attempts++; }
        while (picks.has(choice) && attempts < 10);
        picks.add(choice);
    });
    let i = 0;
    while (picks.size < 3 && i < withDist.length) { picks.add(withDist[i].y); i++; }
    return shuffleArray([correctYear, ...picks]);
}

function renderGeoTimePhase() {
    isAnimating = false;
    geoPhase = 'time';
    A11y.focusQuestion('screen-carte');
    const round = geoCurrentRound;

    document.getElementById('geo-map-phase').classList.add('hidden');
    // La question « où ? » est close : elle ne doit pas rester au-dessus de « en quelle année ? ».
    document.getElementById('geo-phase-kicker').classList.add('hidden');
    const timePhase = document.getElementById('geo-time-phase');
    timePhase.classList.remove('hidden');
    document.getElementById('geo-time-kicker').innerText = t('game.quiz_event_to_year');

    const optionsContainer = document.getElementById('geo-time-options');
    optionsContainer.innerHTML = '';
    round.timeOptions.forEach(year => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.dataset.year = year;
        btn.innerText = formatYear(year);
        btn.onclick = () => answerGeoTime(year);
        optionsContainer.appendChild(btn);
    });
}

function answerGeoTime(chosenYear) {
    if (isAnimating) return;
    isAnimating = true;

    const round = geoCurrentRound;
    const isPerfect = chosenYear === round.correctYear;
    const gap = Math.abs(chosenYear - round.correctYear);
    round.timeCorrect = isPerfect;

    awardPoints(gap, isPerfect);
    if (isPerfect) { playCorrectSound(comboMultiplier); triggerHaptic('success'); }
    else { playWrongSound(); triggerHaptic('error'); }

    document.querySelectorAll('#geo-time-options .quiz-option').forEach(b => {
        b.style.pointerEvents = 'none';
        const y = Number(b.dataset.year);
        if (y === round.correctYear) b.classList.add('correct');
        else if (y === chosenYear && !isPerfect) b.classList.add('wrong');
    });

    finalizeGeoRound(round);
    updateGeoHUD();

    setTimeout(() => {
        geoRoundIndex++;
        // En cas de fin de partie, on ne relâche pas isAnimating : le prochain reset a lieu au round
        // suivant, dans renderGeoLocatePhase(), qui ne s'exécute que si la partie continue.
        if (lives <= 0) { endGame(false); return; }
        if (geoRoundIndex >= geoSessionPool.length) { endGame(true); return; }
        pickNextGeoRound();
    }, 1300);
}

// Journalise le round (une seule fois, qu'il se termine par un abandon sur
// la phase carte ou par la phase temps) — alimente le SRS, les trophées et
// le partage de fin de partie exactement comme les autres modes.
function finalizeGeoRound(round) {
    if (round.__finalized) return;
    round.__finalized = true;
    const fullyCorrect = !!round.geoCorrect && !!round.timeCorrect;
    const isPartial = !!round.geoCorrect !== !!round.timeCorrect;
    checkBadgeProgressOnAction(fullyCorrect);
    srsRecord(round.item.event.id, fullyCorrect);
    recordSessionStep(round.item.event, fullyCorrect, isPartial);
}

function updateGeoHUD() {
    const scoreEl = document.getElementById('geo-hud-score');
    if (scoreEl) scoreEl.innerText = score;
    renderComboChip(document.getElementById('geo-hud-combo'), comboMultiplier);
    const livesEl = document.getElementById('geo-hud-lives');
    if (livesEl) {
        let pips = '';
        for (let i = 0; i < 3; i++) pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
        livesEl.innerHTML = pips;
    }
    const countEl = document.getElementById('geo-hud-count');
    if (countEl) countEl.innerText = `${Math.min(geoRoundIndex + 1, geoSessionPool.length)} / ${geoSessionPool.length}`;
    const fillEl = document.getElementById('geo-progress-fill');
    if (fillEl) fillEl.style.width = Math.round(geoRoundIndex / geoSessionPool.length * 100) + '%';
}

// --- POINTS D'ENTRÉE (cartes spéciales injectées dans les écrans de
// navigation existants — voir js/app.js: initSubcategories / initThemes) ---
// Précharge dès le lancement de l'app (petits fichiers same-origin, mis en cache par le service
// worker comme le reste) : au moment où le joueur atteint un écran de sous-catégories/thèmes, la table
// thème → pays est déjà là. Les points d'événements (800 Ko) arrivent dès le chargement de la page
// plutôt que de l'Atlas : sans eux, isGeoEligible répond « non » et la carte du mode n'apparaît pas.
loadGeoAssets();
window.addEventListener('load', () => { if (typeof atlasLoadGeo === 'function') atlasLoadGeo(); });

// Un nœud (catégorie, sous-catégorie ou thème isolé) est éligible au Mode Carte s'il contient assez
// d'événements au lieu sûr — quel que soit le nom de la catégorie, qui varie selon la langue (voir
// data/en.json etc., des packs « démo » sans points : le mode n'y est simplement pas proposé).
function isGeoEligible(node) {
    const points = geoPointsReady();
    if (!points) return false;
    return GeoPlace.countReliable(geoThemesOf(node), points, GEO_SESSION_MIN_EVENTS) >= GEO_SESSION_MIN_EVENTS;
}

function buildGeoModeCard(node, label) {
    const card = document.createElement('div');
    card.className = 'special-card geo-mode-card';
    card.style.background = 'linear-gradient(135deg, #0B6E4F, #08A045)';
    card.style.gridColumn = '1 / -1';
    card.innerHTML = `
        <div class="special-card-title">${t('carte.mode_title')}</div>
        <div class="special-card-subtitle">${t('carte.mode_subtitle', { label })}</div>
    `;
    card.onclick = () => startGeoModeFromNode(node, label);
    A11y.activatable(card);
    return card;
}
