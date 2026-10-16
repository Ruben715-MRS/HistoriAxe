// Extrait de l'ancien js/app.js — Sélection d'événements, révision espacée, progression par thème.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// === SÉLECTION D'ÉVÉNEMENTS ===
let isSelectionActive = false;
let selectedEventsIds = new Set();

function deleteCustomEvent(eventId) {
    showConfirm(t('selection.confirm_delete_event'), () => {
        const theme = getCurrentTheme();
        if (!theme) return;

        theme.events = theme.events.filter(e => e.id !== eventId);
        selectedEventsIds.delete(eventId);

        if (theme.isCustom) {
            saveCustomThemesToStorage();
        } else {
            const custom = customEventsLoad();
            if (custom[theme.id]) {
                custom[theme.id] = custom[theme.id].filter(e => e.id !== eventId);
                customEventsSave(custom);
            }
        }

        openSelectionMode();
    }, { okLabel: t('nav.delete') });
}

function openSelectionMode() {
    const theme = getCurrentTheme();
    const container = document.getElementById('selection-list-container');
    container.innerHTML = '';

    if (!isSelectionActive) {
        // Par défaut tout est sélectionné
        selectedEventsIds = new Set(theme.events.map(e => e.id));
    }

    if (!theme.events || theme.events.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:30px 10px; color:var(--muted-text); font-style:italic;">${t('selection.empty')}</div>`;
        showScreen('screen-selection');
        return;
    }

    theme.events.forEach(e => {
        const isCustom = e.isCustom || (typeof e.id === 'string' && e.id.startsWith('custom_evt_'));
        const item = document.createElement('div');
        item.className = 'selection-item';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = e.id;
        cb.checked = selectedEventsIds.has(e.id);
        // La case native EST le contrôle clavier de la ligne (la ligne n'a de
        // clic que pour la souris, d'où `data-kbd-proxy`) : sans nom, un
        // lecteur d'écran annonçait cinquante « case à cocher » identiques.
        cb.setAttribute('aria-label', e.titre);
        item.dataset.kbdProxy = 'checkbox';
        cb.onchange = () => {
            if (cb.checked) selectedEventsIds.add(e.id);
            else selectedEventsIds.delete(e.id);
        };

        const title = document.createElement('span');
        title.className = 'selection-item-title';
        title.innerText = e.titre;

        const date = document.createElement('span');
        date.className = 'selection-item-date';
        date.innerText = formatYear(e.date);

        item.appendChild(cb);
        item.appendChild(title);
        item.appendChild(date);

        if (isCustom) {
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'selection-item-delete';
            delBtn.title = t('selection.delete_event_title');
            delBtn.setAttribute('aria-label', `${t('selection.delete_event_title')} — ${e.titre}`);
            delBtn.innerHTML = '🗑️';
            delBtn.onclick = (event) => {
                event.stopPropagation();
                deleteCustomEvent(e.id);
            };
            item.appendChild(delBtn);
        }

        item.onclick = (event) => {
            if (event.target === cb || event.target.closest('.selection-item-delete')) return;
            cb.checked = !cb.checked;
            if (cb.checked) selectedEventsIds.add(e.id);
            else selectedEventsIds.delete(e.id);
        };

        container.appendChild(item);
    });

    showScreen('screen-selection');
}

function selectAllEvents(checked) {
    const cbs = document.querySelectorAll('#selection-list-container input[type="checkbox"]');
    cbs.forEach(cb => {
        cb.checked = checked;
        if (checked) selectedEventsIds.add(cb.value);
        else selectedEventsIds.delete(cb.value);
    });
}

function saveSelectionAndReturn() {
    if (selectedEventsIds.size === 0) {
        alert(t('modes.select_at_least_one'));
        return;
    }
    isSelectionActive = true;
    showScreen('screen-modes');
}

// === RÉVISION ESPACÉE (SRS) ===
// Système de type Leitner à 5 boîtes, stocké dans le navigateur (localStorage).
// Boîte 1 = tout juste manqué, boîte 5 = remaîtrisé (sort du lot des points faibles).

// Événements dont l'échéance de révision est passée (js/srs.js), les plus urgents d'abord :
// boîte basse, puis échéance la plus ancienne. Même forme d'éléments que getAllEventsWithLocation.
function getDueEvents(now = Date.now()) {
    const data = srsLoad();
    return getAllEventsWithLocation()
        .map(item => ({ item, entry: data[item.event.id] }))
        .filter(x => x.entry && SRS.isDue(x.entry, now))
        .sort(SRS.compareUrgency)
        .map(x => x.item);
}

// Entrées SRS des seuls événements qui existent encore dans la base.
function getSrsEntries() {
    const data = srsLoad();
    return getAllEventsWithLocation().map(item => data[item.event.id]).filter(Boolean);
}

// { due, overdue, tomorrow } sur les seuls événements qui existent encore dans la base.
function getDueSummary(now = Date.now()) {
    return SRS.summarize(getSrsEntries(), now);
}

function getWeakEvents() {
    const data = srsLoad();
    return getAllEventsWithLocation().filter(item => {
        const entry = data[item.event.id];
        return entry && ((entry.failCount || 0) > 0 || (entry.incorrect || 0) > 0) && entry.box < 5;
    });
}

// Regroupe les événements « points faibles » par thème d'origine, pour proposer
// au joueur de reprendre l'entraînement sur un thème entier plutôt qu'un mélange.
function getWeakThemes() {
    const map = new Map();
    getWeakEvents().forEach(item => {
        if (!map.has(item.theme.id)) {
            map.set(item.theme.id, { theme: item.theme, ci: item.categoryIndex, si: item.subcategoryIndex, ti: item.themeIndex, count: 0 });
        }
        map.get(item.theme.id).count += 1;
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
}

// Mélange de Fisher-Yates : le SEUL mélange de l'app côté joueur (le tirage
// des défis a le sien, sur graine, dans js/dailyEngine.js: pickDailyItems).
//
// Surtout pas `sort(() => Math.random() - 0.5)`, qui a longtemps servi ici :
// un comparateur aléatoire ne produit pas une permutation uniforme, et le
// biais n'était pas théorique. Mesuré dans Chromium avant ce correctif :
//
//   - ordre de pioche d'un thème (10 cartes, voir startActualGame) : la
//     première carte du pool ressortait en tête dans 19,5 % des parties au
//     lieu de 10 % ;
//   - options d'un QCM (4 choix) : la bonne réponse, toujours à l'indice 0
//     avant mélange, tombait sur les deux premières options dans 56 % des
//     cas au lieu de 50 %, et sur la quatrième dans 18,7 % au lieu de 25 %.
//
// L'ampleur exacte du second cas dépend de l'algorithme de tri du moteur JS
// (Node et Chromium ne donnaient pas les mêmes chiffres) — raison de plus
// pour mesurer dans un vrai navigateur plutôt que sur le papier : c'est ce
// que fait e2e/shuffle.spec.js, qui redeviendrait rouge si le comparateur
// revenait.
function shuffleArray(arr) {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// === PROGRESSION PAR THÈME/CATÉGORIE (vue de synthèse pour cibler ses révisions) ===
// Réutilise les mêmes boîtes de mémorisation (SRS) que la révision des points
// faibles, mais agrège la maîtrise (boîte / 5, en %) d'abord par thème, puis
// par sous-catégorie et catégorie, pour offrir une vue d'ensemble façon barre
// de progression (et un radar de synthèse par grande catégorie).

function themeMasteryStats(theme, srs) {
    let tested = 0, weak = 0, sumPct = 0;
    theme.events.forEach(evt => {
        const entry = srs[evt.id];
        if (entry) {
            tested += 1;
            sumPct += (entry.box / 5) * 100;
            if (entry.failCount > 0 && entry.box < 5) weak += 1;
        }
    });
    return { total: theme.events.length, tested, weak, sumPct, themeCount: 1 };
}

function combineProgressStats(children) {
    return children.reduce((acc, c) => {
        acc.total += c.stats.total;
        acc.tested += c.stats.tested;
        acc.weak += c.stats.weak;
        acc.sumPct += c.stats.sumPct;
        acc.themeCount += c.stats.themeCount;
        return acc;
    }, { total: 0, tested: 0, weak: 0, sumPct: 0, themeCount: 0 });
}

// Maîtrise en % : la somme des scores (boîte / 5) obtenus sur les événements
// déjà rencontrés, rapportée à la TOTALITÉ des événements du thème/de la
// catégorie (testés ou non) — et non aux seuls événements testés. Un événement
// jamais rencontré ne compte donc pas comme un échec (il ne fait pas baisser le
// score comme le ferait une mauvaise réponse), mais il ne fait pas non plus
// gonfler artificiellement le pourcentage : un thème vérifié sur seulement 2 de
// ses 20 événements, même si les 2 sont parfaitement sus, affiche une maîtrise
// encore faible, puisqu'il reste 18 événements non couverts. C'est ce qui
// permet à une catégorie et à une sous-catégorie de ne PAS afficher le même
// pourcentage alors qu'elles n'ont pas la même quantité totale d'événements,
// même quand elles partagent exactement les mêmes événements testés.
// Un nœud jamais testé du tout (tested === 0) reste à part : on affiche « — »
// plutôt que 0%, pour le distinguer visuellement d'un thème réellement fragile
// (voir getWeakEvents plus haut pour le même principe de distinction).
function masteryPctOf(stats) {
    return stats.tested > 0 ? Math.round(stats.sumPct / stats.total) : null;
}

function masteryBand(pct) {
    if (pct === null) return 'none';
    if (pct < 40) return 'low';
    if (pct < 75) return 'mid';
    return 'high';
}

// Trie du moins maîtrisé au mieux maîtrisé ; les nœuds jamais testés (pct
// null) sont relégués en fin de liste, sous les nœuds réellement fragiles.
function progressCompare(a, b) {
    const pa = masteryPctOf(a.stats), pb = masteryPctOf(b.stats);
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1;
    if (pb === null) return -1;
    return pa - pb;
}
function sortProgressChildren(children) {
    return [...children].sort(progressCompare);
}

// Construit récursivement l'arbre de progression en miroir de bdd (catégorie >
// sous-catégories imbriquées à profondeur quelconque > thèmes), chaque thème
// conservant les indices (ci/si/ti) nécessaires pour rouvrir directement son
// écran de jeu au clic (voir openThemeAt).
function buildProgressNode(node, ci, path, srs) {
    let children;
    if (node.subcategories) {
        children = node.subcategories.map((sub, idx) => buildProgressNode(sub, ci, [...path, idx], srs));
    } else {
        children = node.themes.map((theme, ti) => ({
            nom: theme.nom,
            isTheme: true,
            theme, ci, si: path.length ? path : null, ti,
            stats: themeMasteryStats(theme, srs),
            children: null
        }));
    }
    return { nom: node.nom, isTheme: false, stats: combineProgressStats(children), children };
}

// Les grandes catégories restent dans leur ordre naturel (celui de bdd, identique
// à l'écran des catégories) plutôt que triées par maîtrise : c'est un petit
// ensemble stable que le joueur connaît déjà par sa position habituelle, et le
// reclasser à chaque partie jouée serait plus perturbant qu'utile. Le tri du
// moins maîtrisé au mieux maîtrisé s'applique en revanche à l'intérieur de
// chaque catégorie, entre ses sous-catégories/thèmes (voir sortProgressChildren),
// là où il aide vraiment à repérer sur quoi se concentrer.
function getProgressTree() {
    const srs = srsLoad();
    return bdd
        .map((cat, ci) => buildProgressNode(cat, ci, [], srs))
        .filter(node => node.stats.total > 0);
}

function polarPoint(cx, cy, r, angleRad) {
    return [cx + r * Math.cos(angleRad), cy + r * Math.sin(angleRad)];
}

// Radar de synthèse : un axe par grande catégorie (Culture générale,
// Biographies, CAPES & Agrégation…), pour repérer en un coup d'œil celle(s) à
// travailler en priorité. Peu lisible en dessous de 3 axes : on le masque.
function renderProgressRadar(tree) {
    const wrap = document.getElementById('progress-radar-wrap');
    const container = document.getElementById('progress-radar-container');
    if (tree.length < 3) {
        wrap.classList.add('hidden');
        container.innerHTML = '';
        return;
    }
    wrap.classList.remove('hidden');

    const n = tree.length;
    const size = 340, cx = size / 2, cy = size / 2, maxR = 112;
    const angleFor = i => -Math.PI / 2 + i * (2 * Math.PI / n);

    let gridHtml = '';
    [25, 50, 75, 100].forEach(pct => {
        const r = maxR * pct / 100;
        const pts = tree.map((_, i) => polarPoint(cx, cy, r, angleFor(i)).map(v => v.toFixed(1)).join(',')).join(' ');
        gridHtml += `<polygon points="${pts}" class="radar-grid-ring" />`;
    });

    let axesHtml = '';
    tree.forEach((node, i) => {
        const [x, y] = polarPoint(cx, cy, maxR, angleFor(i));
        axesHtml += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="radar-axis-line" />`;
    });

    const dataPts = tree.map((node, i) => {
        const pct = masteryPctOf(node.stats) || 0;
        return polarPoint(cx, cy, maxR * pct / 100, angleFor(i));
    });
    const dataPolyPts = dataPts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');

    let pointsHtml = '', labelsHtml = '';
    tree.forEach((node, i) => {
        const pct = masteryPctOf(node.stats);
        const [px, py] = dataPts[i];
        pointsHtml += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" class="radar-point ${pct === null ? 'is-untested' : ''}" />`;

        const [lx, ly] = polarPoint(cx, cy, maxR + 30, angleFor(i));
        const angleDeg = ((angleFor(i) * 180 / Math.PI) + 360) % 360;
        let anchor = 'middle';
        if (angleDeg > 15 && angleDeg < 165) anchor = 'start';
        else if (angleDeg > 195 && angleDeg < 345) anchor = 'end';
        const shortNom = node.nom.length > 16 ? node.nom.slice(0, 15) + '…' : node.nom;
        labelsHtml += `<text x="${lx.toFixed(1)}" y="${(ly - 6).toFixed(1)}" text-anchor="${anchor}" class="radar-label">${shortNom}</text>`;
        labelsHtml += `<text x="${lx.toFixed(1)}" y="${(ly + 8).toFixed(1)}" text-anchor="${anchor}" class="radar-label-pct">${pct === null ? t('mastery.radar_untested') : pct + '%'}</text>`;
    });

    container.innerHTML = `
                <svg viewBox="0 0 ${size} ${size}" class="radar-svg" role="img" aria-label="${t('mastery.radar_aria')}">
                    ${gridHtml}
                    ${axesHtml}
                    <polygon points="${dataPolyPts}" class="radar-data-poly" />
                    ${pointsHtml}
                    ${labelsHtml}
                </svg>
            `;
}

// Construit le contenu d'une ligne de barre de maîtrise, partagé entre un
// thème (feuille cliquable) et un groupe (catégorie/sous-catégorie repliable).
function buildMasteryBarHtml(name, stats, extraMetaHtml) {
    const pct = masteryPctOf(stats);
    const band = masteryBand(pct);
    const pctLabel = pct === null ? '—' : pct + '%';
    const testedMeta = `${stats.tested}/${stats.total} événements testés`;
    const weakMeta = stats.weak > 0 ? `<span class="mastery-row-weak-badge">⚠ ${stats.weak} points faibles</span>` : '';
    return `
                <div class="mastery-row-top">
                    <span class="mastery-row-name">${name}</span>
                    <span class="mastery-row-pct band-${band}">${pctLabel}</span>
                </div>
                <div class="mastery-bar-track"><div class="mastery-bar-fill band-${band}" style="width:${pct === null ? 0 : pct}%"></div></div>
                <div class="mastery-row-meta"><span>${testedMeta}</span>${weakMeta}${extraMetaHtml || ''}</div>
            `;
}

function renderProgressLeaf(node) {
    const row = document.createElement('div');
    row.className = 'mastery-row';
    row.innerHTML = buildMasteryBarHtml(node.nom, node.stats, '');
    row.onclick = () => openThemeAt(node.ci, node.si, node.ti);
    A11y.activatable(row);
    return row;
}

function renderProgressGroup(node) {
    const details = document.createElement('details');
    details.className = 'mastery-group';

    const summary = document.createElement('summary');
    summary.className = 'mastery-group-summary';
    const themeCountMeta = `<span>${node.stats.themeCount} thèmes</span>`;
    summary.innerHTML = buildMasteryBarHtml('📁 ' + node.nom, node.stats, themeCountMeta);
    details.appendChild(summary);

    const childrenWrap = document.createElement('div');
    childrenWrap.className = 'mastery-group-children';
    sortProgressChildren(node.children).forEach(child => {
        childrenWrap.appendChild(child.isTheme ? renderProgressLeaf(child) : renderProgressGroup(child));
    });
    details.appendChild(childrenWrap);

    return details;
}

function initProgress() {
    const tree = getProgressTree();

    const emptyState = document.getElementById('progress-empty');
    const container = document.getElementById('progress-groups-container');
    const radarWrap = document.getElementById('progress-radar-wrap');
    container.innerHTML = '';

    const anyTested = tree.some(node => node.stats.tested > 0);
    if (!anyTested) {
        emptyState.classList.remove('hidden');
        container.classList.add('hidden');
        radarWrap.classList.add('hidden');
        document.getElementById('progress-radar-container').innerHTML = '';
        return;
    }
    emptyState.classList.add('hidden');
    container.classList.remove('hidden');
    renderProgressRadar(tree);

    tree.forEach(node => container.appendChild(renderProgressGroup(node)));
}

// Réinitialise entièrement le suivi de révision espacée (boîtes, historique)
function resetRevisionTracking() {
    showConfirm(t('revision.reset_srs_confirm'), () => {
        srsSave({});
        if (!document.getElementById('screen-revision-hub').classList.contains('hidden')) {
            initRevisionHub();
            initProgress();
        } else {
            initCategories();
        }
    }, { okLabel: t('nav.reset') });
}

