// =========================================================================
// === HISTORIAXE — MODULE MODE CARTE (LOCALISATION GÉOGRAPHIQUE) ===
// =========================================================================
// Nouveau mode de jeu : chaque événement est d'abord situé dans l'ESPACE
// (un pays parmi 4 pions posés sur une carte du monde), puis dans le TEMPS
// (une année parmi 4, comme en mode Quiz). Les deux notes se cumulent dans
// le même score — c'est le double axe (temporel + spatial) qui donne son
// nom à HistoriAxe.
//
// Le pool d'événements est construit à la volée à partir de la catégorie
// « Histoires nationales » : chaque thème de cette catégorie correspond à
// UN pays (ex. thm_de → Allemagne), donc TOUS ses événements partagent ce
// même pays. GEO_THEME_COUNTRY (assets/geo/theme-country-map.json) porte
// cette correspondance thème → code ISO-3166-1 alpha-2 ; aucune donnée
// géographique par événement n'est nécessaire.
//
// Assets embarqués localement (aucun tuile/CDN cartographique — l'app doit
// rester jouable hors-ligne) :
//   - assets/geo/world-basemap.svg   : silhouette des continents (dérivée
//     de world-atlas@2/countries-110m, licence ISC), projection équirectangulaire,
//     viewBox 1000×440.
//   - assets/geo/country-pins.json   : { "FR": [x, y], ... } — position en
//     pixels (même repère que la viewBox) du centroïde de chaque pays.
//   - assets/geo/theme-country-map.json : { "thm_fr": "FR", ... }.

let GEO_PINS = null;
let GEO_THEME_COUNTRY = null;
let GEO_BASEMAP_MARKUP = null;
let geoAssetsPromise = null;

const GEO_MAP_VIEWBOX = { w: 1000, h: 440 };
const GEO_SESSION_MAX_ROUNDS = 12;
const GEO_SESSION_MIN_EVENTS = 4;
const GEO_LOCATE_BASE_POINTS = 80;

// État de la partie en cours (mode 'carte' uniquement)
let geoScopeLabel = '';
let geoReturnScreen = 'screen-themes';
let geoSessionPool = [];   // [{ event, iso2, themeName }], un par round de la session
let geoRoundIndex = 0;
let geoCurrentRound = null;

// --- CHARGEMENT DES ASSETS (paresseux, une seule fois) ---
function loadGeoAssets() {
    if (GEO_PINS && GEO_THEME_COUNTRY && GEO_BASEMAP_MARKUP) return Promise.resolve(true);
    if (geoAssetsPromise) return geoAssetsPromise;
    geoAssetsPromise = Promise.all([
        fetch('assets/geo/country-pins.json').then(r => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('assets/geo/theme-country-map.json').then(r => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('assets/geo/world-basemap.svg').then(r => r.ok ? r.text() : Promise.reject(r.status))
    ]).then(([pins, themeMap, svgText]) => {
        GEO_PINS = pins;
        GEO_THEME_COUNTRY = themeMap;
        GEO_BASEMAP_MARKUP = svgText;
        return true;
    }).catch(err => {
        console.error('[GeoMap] Échec du chargement des assets de la carte :', err);
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

// --- CONSTITUTION DU POOL D'ÉVÉNEMENTS GÉOLOCALISÉS ---
// Parcourt récursivement un nœud de bdd (catégorie, sous-catégorie ou thème
// isolé) et retient tous les événements datés dont le thème d'origine a une
// correspondance pays connue (GEO_THEME_COUNTRY).
function collectGeoPool(node) {
    const pool = [];
    (function walk(n) {
        if (!n) return;
        if (n.subcategories) {
            n.subcategories.forEach(walk);
        } else if (n.themes) {
            n.themes.forEach(theme => {
                const iso2 = GEO_THEME_COUNTRY[theme.id];
                if (!iso2 || !GEO_PINS[iso2]) return;
                (theme.events || []).forEach(evt => {
                    if (typeof evt.date !== 'number') return;
                    pool.push({ event: evt, iso2, themeName: theme.nom });
                });
            });
        }
    })(node);
    return pool;
}

function geoPixelDistance(isoA, isoB) {
    const a = GEO_PINS[isoA], b = GEO_PINS[isoB];
    if (!a || !b) return Infinity;
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

// Trois distracteurs « à profil » plutôt que purement aléatoires : un pays
// proche (piège), un de portée moyenne, un lointain (repère facile) — pour
// que les 4 pions restent lisibles sur la carte et que la difficulté varie.
function pickGeoCountryOptions(correctIso2, scopeIsoList) {
    let candidates = [...new Set(scopeIsoList)].filter(c => c !== correctIso2 && GEO_PINS[c]);
    if (candidates.length < 3) {
        candidates = Object.keys(GEO_PINS).filter(c => c !== correctIso2);
    }
    const withDist = candidates
        .map(c => ({ c, d: geoPixelDistance(correctIso2, c) }))
        .sort((a, b) => a.d - b.d);
    const n = withDist.length;
    const pools = [
        withDist.slice(0, Math.max(1, Math.floor(n * 0.25))),
        withDist.slice(Math.floor(n * 0.25), Math.max(Math.floor(n * 0.25) + 1, Math.floor(n * 0.65))),
        withDist.slice(Math.floor(n * 0.65))
    ];
    const picks = new Set();
    pools.forEach(pool => {
        if (pool.length === 0) return;
        let choice, attempts = 0;
        do { choice = pool[Math.floor(Math.random() * pool.length)].c; attempts++; }
        while (picks.has(choice) && attempts < 10);
        picks.add(choice);
    });
    let i = 0;
    while (picks.size < 3 && i < withDist.length) { picks.add(withDist[i].c); i++; }
    return shuffleArray([correctIso2, ...picks]);
}

// Distracteurs d'années : autres dates du pool de la session, également
// répartis proche/moyen/loin. Repli sur des décalages synthétiques si le
// pool est trop pauvre en dates distinctes (thème très court).
function pickGeoYearOptions(correctYear, excludeEventId) {
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

// --- CYCLE DE VIE DE LA PARTIE ---
function getCurrentVisibleScreenId() {
    const current = Array.from(document.querySelectorAll('body > div')).find(div =>
        !div.classList.contains('hidden') &&
        div.id && div.id.startsWith('screen-')
    );
    return current ? current.id : 'screen-themes';
}

function startGeoModeFromNode(node, label) {
    const fromScreen = getCurrentVisibleScreenId();
    loadGeoAssets().then(ok => {
        if (!ok) {
            alert("Impossible de charger la carte du monde. Vérifiez votre connexion puis réessayez.");
            return;
        }
        const fullPool = collectGeoPool(node);
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

        const shuffled = shuffleArray([...fullPool]);
        geoSessionPool = shuffled.slice(0, Math.min(GEO_SESSION_MAX_ROUNDS, shuffled.length));
        geoRoundIndex = 0;
        score = 0;
        lives = 3;
        comboMultiplier = 1.0;
        totalTimePlayed = 0;

        const dates = geoSessionPool.map(item => item.event.date);
        currentGameSpan = Math.max(1, Math.max(...dates) - Math.min(...dates));

        document.getElementById('geo-scope-label').innerText = label;
        const svgHolder = document.getElementById('geo-map-svg-holder');
        if (svgHolder) svgHolder.innerHTML = GEO_BASEMAP_MARKUP;

        showScreen('screen-carte');
        pickNextGeoRound();
    });
}

function pickNextGeoRound() {
    const item = geoSessionPool[geoRoundIndex];
    const scopeIsoList = geoSessionPool.map(p => p.iso2);
    const geoOptions = pickGeoCountryOptions(item.iso2, scopeIsoList);
    const timeOptions = pickGeoYearOptions(item.event.date, item.event.id);

    geoCurrentRound = {
        item,
        correctIso2: item.iso2,
        geoOptions,
        correctYear: item.event.date,
        timeOptions,
        geoCorrect: null,
        timeCorrect: null
    };

    renderGeoLocatePhase();
    updateGeoHUD();
}

function renderGeoLocatePhase() {
    isAnimating = false;
    const round = geoCurrentRound;

    document.getElementById('geo-phase-kicker').innerText = t('carte.where_kicker');
    document.getElementById('geo-event-title').innerText = round.item.event.titre;
    document.getElementById('geo-event-desc').innerText = round.item.event.description || '';
    document.getElementById('geo-reveal-label').classList.add('hidden');

    const timePhase = document.getElementById('geo-time-phase');
    if (timePhase) timePhase.classList.add('hidden');
    const mapPhase = document.getElementById('geo-map-phase');
    if (mapPhase) mapPhase.classList.remove('hidden');

    const pinsLayer = document.getElementById('geo-pins-layer');
    pinsLayer.innerHTML = '';
    const laidOut = layoutPinsAvoidingOverlap(round.geoOptions);
    laidOut.forEach(({ iso2, x, y }, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'geo-pin-btn';
        btn.dataset.iso = iso2;
        btn.style.left = (x / GEO_MAP_VIEWBOX.w * 100) + '%';
        btn.style.top = (y / GEO_MAP_VIEWBOX.h * 100) + '%';
        btn.innerHTML = `<span class="geo-pin-number">${idx + 1}</span>`;
        btn.setAttribute('aria-label', `Option ${idx + 1}`);
        btn.onclick = () => answerGeoLocate(iso2);
        pinsLayer.appendChild(btn);
    });
}

// Deux pays vraiment voisins (ex. Italie/Liechtenstein) ont des centroïdes si
// proches que leurs pions se chevauchent sur une carte de la taille d'un
// écran de téléphone — illisible et impossible à toucher précisément. On
// garde la position réelle de chaque pion comme point de départ, puis on les
// écarte les uns des autres par petites itérations (répulsion par paires)
// jusqu'à respecter un espacement minimal, en unités de la viewBox (donc
// indépendant de la largeur réellement affichée — voir aspect-ratio en CSS).
function layoutPinsAvoidingOverlap(iso2List) {
    const minDist = 70;
    const margin = 30;
    const pts = iso2List.map(iso2 => {
        const [x, y] = GEO_PINS[iso2];
        return { iso2, x, y };
    });
    for (let iter = 0; iter < 60; iter++) {
        let moved = false;
        for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
                const a = pts[i], b = pts[j];
                let dx = b.x - a.x, dy = b.y - a.y;
                let dist = Math.hypot(dx, dy);
                if (dist < minDist) {
                    moved = true;
                    if (dist < 0.01) { dx = 1; dy = 0; dist = 1; }
                    const push = (minDist - dist) / 2;
                    const ux = dx / dist, uy = dy / dist;
                    a.x -= ux * push; a.y -= uy * push;
                    b.x += ux * push; b.y += uy * push;
                }
            }
        }
        if (!moved) break;
    }
    pts.forEach(p => {
        p.x = Math.min(GEO_MAP_VIEWBOX.w - margin, Math.max(margin, p.x));
        p.y = Math.min(GEO_MAP_VIEWBOX.h - margin, Math.max(margin, p.y));
    });
    return pts;
}

function answerGeoLocate(chosenIso2) {
    if (isAnimating) return;
    isAnimating = true;

    const round = geoCurrentRound;
    const isCorrect = chosenIso2 === round.correctIso2;
    round.geoCorrect = isCorrect;

    if (isCorrect) {
        const pts = Math.round(GEO_LOCATE_BASE_POINTS * comboMultiplier);
        score += pts;
        comboMultiplier = Math.round((comboMultiplier + 0.1) * 10) / 10;
        playCorrectSound(comboMultiplier);
        triggerHaptic('success');
    } else {
        comboMultiplier = 1.0;
        playWrongSound();
        triggerHaptic('error');
        lives -= 1;
    }

    document.querySelectorAll('#geo-pins-layer .geo-pin-btn').forEach(b => {
        b.disabled = true;
        if (b.dataset.iso === round.correctIso2) b.classList.add('correct');
        else if (b.dataset.iso === chosenIso2 && !isCorrect) b.classList.add('wrong');
    });

    const revealEl = document.getElementById('geo-reveal-label');
    const flag = isoToFlagEmoji(round.correctIso2);
    const name = countryDisplayName(round.correctIso2);
    revealEl.innerHTML = isCorrect
        ? t('carte.correct_reveal', { flag, name })
        : t('carte.wrong_reveal', { flag, name });
    revealEl.classList.remove('hidden');
    revealEl.classList.toggle('is-correct', isCorrect);
    revealEl.classList.toggle('is-wrong', !isCorrect);

    updateGeoHUD();

    setTimeout(() => {
        if (lives <= 0) {
            // Partie perdue : ne PAS relâcher isAnimating — l'écran va changer
            // (endGame → screen-end) et plus aucune entrée sur cet écran ne doit
            // pouvoir déclencher un nouveau round sur un `geoCurrentRound` obsolète.
            finalizeGeoRound(round);
            endGame(false);
            return;
        }
        isAnimating = false;
        renderGeoTimePhase();
    }, 1300);
}

function renderGeoTimePhase() {
    isAnimating = false;
    const round = geoCurrentRound;

    document.getElementById('geo-map-phase').classList.add('hidden');
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
        // Idem : en cas de fin de partie, on ne relâche pas isAnimating (voir
        // answerGeoLocate) — le prochain reset a lieu au round suivant, dans
        // renderGeoLocatePhase(), qui ne s'exécute que si la partie continue.
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
// Précharge dès le lancement de l'app (petits fichiers same-origin, mis en
// cache par le service worker comme le reste) : au moment où le joueur
// atteint un écran de sous-catégories/thèmes, GEO_THEME_COUNTRY est déjà
// disponible pour décider si la carte « Mode Carte » doit y apparaître.
loadGeoAssets();

// Un nœud (catégorie, sous-catégorie ou thème isolé) est éligible au Mode
// Carte s'il contient assez d'événements dont le thème d'origine a une
// correspondance pays connue — indépendamment du nom de la catégorie, qui
// varie selon la langue (voir data/en.json etc., des packs « démo » bien
// plus courts qui n'ont pas d'équivalent à « Histoires nationales »).
function isGeoEligible(node) {
    if (!GEO_THEME_COUNTRY || !GEO_PINS) return false;
    return collectGeoPool(node).length >= GEO_SESSION_MIN_EVENTS;
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
    return card;
}
