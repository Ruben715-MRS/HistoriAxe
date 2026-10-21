// =========================================================================
// === LE CHEMIN DU TEMPS — LA CARTE DES NIVEAUX ET LE LANCEMENT D'UN NIVEAU ===
// =========================================================================
// Un parcours commun à tous les joueurs : une carte qu'on gravit niveau après niveau (le premier en
// bas, le boss du monde en haut), des étoiles à gagner, un chemin parcouru qui se colore. Complète le
// jeu libre (thèmes, modes), ne le remplace pas.
//
// Ici : l'écran (`#screen-path`), le contenu des niveaux tiré des packs, la progression stockée, la
// récompense à la fin d'un niveau. Les règles (étoiles, déblocage, composition d'un niveau) sont dans
// js/pathCore.js, testé hors navigateur ; les épreuves sont celles de l'Expédition
// (js/app/expedition.js), lancées avec un « plan » (voir l'en-tête de ce fichier).

// Un niveau a besoin d'au moins ce nombre d'événements dans le pack chargé (autres langues : moins de contenu).
const PATH_MIN_EVENTS = 8;
// Mise en page de la carte (unités du viewBox SVG : 300 de large).
// padTop laisse la place du monument qui garde la fin du monde (voir js/pathScenery.js) au-dessus de la pastille du boss.
const PATH_MAP = { width: 300, step: 100, padTop: 250, padBottom: 70, amplitude: 78 };

let pathCache = null; // { bdd, size, pools, byId }
let pathSelectedId = null;

// Les identifiants d'événements de chaque niveau, et un index id → événement du pack chargé.
function pathData() {
    const current = window.bdd || bdd || [];
    const size = current.length;
    if (pathCache && pathCache.bdd === current && pathCache.size === size) return pathCache;
    const flat = PathCore.flattenEvents(current);
    const pools = {};
    PathCore.WORLDS.forEach(world => Object.assign(pools, PathCore.buildWorldPools(world, flat)));
    const byId = new Map();
    getAllEventsWithLocation().forEach(item => byId.set(item.event.id, item.event));
    pathCache = { bdd: current, size, pools, byId };
    return pathCache;
}

function pathLevelEvents(levelId) {
    const data = pathData();
    return (data.pools[levelId] || []).map(id => data.byId.get(id)).filter(Boolean);
}

function pathProgress() {
    return PathCore.normalizeProgress(typeof pathProgressLoad === 'function' ? pathProgressLoad() : null);
}

function pathLevelTitle(world, level) {
    return level.boss
        ? t('path.worlds.' + world.id + '.boss')
        : t('path.worlds.' + world.id + '.levels.' + level.n);
}

function pathLocateLevel(levelId) {
    for (const world of PathCore.WORLDS) {
        const level = PathCore.levelsOf(world).find(l => l.id === levelId);
        if (level) return { world, level };
    }
    return null;
}

function pathStarsText(stars) {
    return '★'.repeat(stars) + '☆'.repeat(PathCore.MAX_STARS - stars);
}

function pathYearRange(level) {
    return t('path.range', { from: formatYear(level.from), to: formatYear(level.shownTo !== undefined ? level.shownTo : level.to) });
}

// --- Entrée dans le Chemin ----------------------------------------------------
// `pathView` : null = la carte des mondes ; l'identifiant d'une île = la carte de cette île seule.
let pathView = null;

function openPath(islandId) {
    pathSelectedId = null;
    pathView = islandId || null;
    showScreen('screen-path', 'forward');
    renderPath();
}

// La flèche de l'écran : de l'île vers la carte des mondes, de la carte vers les catégories.
function pathBack() {
    if (pathView) {
        pathView = null;
        renderPath();
        return;
    }
    showScreen('screen-categories', 'back');
}

// Le niveau à jouer ensuite, tous mondes confondus (voir PathCore.nextTarget).
function pathNextTarget() {
    const progress = pathProgress();
    const target = PathCore.nextTarget(progress);
    const located = target ? pathLocateLevel(target.levelId) : null;
    return located ? { world: located.world, level: located.level, progress } : { world: null, level: null, progress };
}

function pathTotalStars(progress) {
    return PathCore.WORLDS.reduce((sum, w) => sum + PathCore.worldStars(w, progress), 0);
}
function pathTotalMaxStars() {
    return PathCore.WORLDS.reduce((sum, w) => sum + PathCore.worldMaxStars(w), 0);
}

function pathWorldTitle(world) {
    return t('path.worlds.' + world.id + '.title');
}

// La carte posée en tête de l'écran des catégories (avant « Reprendre »).
function renderPathCard(container) {
    if (typeof renderRewardsBar === 'function') renderRewardsBar(container, 'screen-categories');
    const greeting = typeof clioHomeGreeting === 'function' ? clioHomeGreeting() : null;
    if (greeting) container.appendChild(greeting);
    const target = pathNextTarget();
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'resume-card path-card';
    card.id = 'btn-path';
    const stars = pathTotalStars(target.progress);
    const sub = target.level
        ? (target.level.boss
            ? pathLevelTitle(target.world, target.level)
            : t('path.card_next', { n: target.level.n, title: pathLevelTitle(target.world, target.level) }))
        : t('path.card_done');
    card.innerHTML = `
        <span class="resume-card-icon" aria-hidden="true">🗺️</span>
        <span class="resume-card-text">
            <small class="resume-card-kicker">${escapeHtml(target.world ? pathWorldTitle(target.world) : t('path.title'))} · ★ ${stars}/${pathTotalMaxStars()}</small>
            <strong class="resume-card-title"></strong>
        </span>`;
    card.querySelector('.resume-card-title').textContent = sub;
    card.onclick = () => openPath();
    container.appendChild(card);
}

// --- Le paysage ------------------------------------------------------------------
// Les dessins (js/pathSprites.js) sont posés une fois dans la page, sous forme de <symbol>, puis réutilisés par <use>.
function pathEnsureSprites() {
    if (document.getElementById('path-sprites') || typeof PathSprites === 'undefined') return;
    let symbols = '';
    Object.keys(PathSprites.decor).forEach(name => {
        symbols += `<symbol id="sp-${name}" viewBox="${PathSprites.DECOR_VIEWBOX}" overflow="visible">${PathSprites.decor[name]}</symbol>`;
    });
    Object.keys(PathSprites.landmarks).forEach(name => {
        symbols += `<symbol id="sp-${name}" viewBox="${PathSprites.LANDMARK_VIEWBOX}" overflow="visible">${PathSprites.landmarks[name]}</symbol>`;
    });
    const holder = document.createElement('div');
    holder.id = 'path-sprites';
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    holder.innerHTML = `<svg width="0" height="0" focusable="false"><defs>${symbols}</defs></svg>`;
    document.body.appendChild(holder);
}

// Le paysage d'un monde : sol et route (variables CSS posées sur la piste), décors de part et d'autre du chemin,
// monument au bout. Renvoie l'élément à insérer sous les pastilles.
function pathBuildScenery(track, world, positions, height) {
    if (typeof PathScenery === 'undefined') return null;
    pathEnsureSprites();
    const pixelWidth = Math.min(420, document.getElementById('path-map').clientWidth || 340) - 16;
    const scene = PathScenery.layout(world.id, { height, padTop: PATH_MAP.padTop, positions, width: PATH_MAP.width, pixelWidth });
    track.style.setProperty('--sc-ground-a', scene.theme.ground[0]);
    track.style.setProperty('--sc-ground-b', scene.theme.ground[1]);
    track.style.setProperty('--sc-road', scene.theme.road);
    const layer = document.createElement('div');
    layer.className = 'path-scenery';
    layer.setAttribute('aria-hidden', 'true');
    const unit = 100 / PATH_MAP.width;
    const lm = scene.landmark;
    // viewBox du monument : 128 × 114
    let html = `<svg class="sc sc-landmark" style="left:${(lm.x * unit).toFixed(2)}%;top:${lm.y}px;width:${lm.size}px;height:${Math.round(lm.size * 114 / 128)}px" viewBox="${PathSprites.LANDMARK_VIEWBOX}" focusable="false"><use href="#sp-${lm.sprite}"/></svg>`;
    scene.decor.forEach(item => {
        html += `<svg class="sc${item.flip ? ' flip' : ''}" style="left:${(item.x * unit).toFixed(2)}%;top:${item.y}px;width:${item.size}px;height:${item.size}px" viewBox="${PathSprites.DECOR_VIEWBOX}" focusable="false"><use href="#sp-${item.sprite}"/></svg>`;
    });
    layer.innerHTML = html;
    return layer;
}

// --- La carte -------------------------------------------------------------------
function pathNodeX(index, boss) {
    if (boss) return PATH_MAP.width / 2;
    return PATH_MAP.width / 2 + PATH_MAP.amplitude * Math.sin(index * 0.95 + 0.4);
}

// Un monde : son en-tête, puis soit sa piste de niveaux, soit (replié) seulement son verrou.
// Renvoie la pastille du niveau à jouer s'il est dans ce monde.
function pathRenderWorld(container, world, progress, currentId, collapsed) {
    const levels = PathCore.levelsOf(world);
    const worldOpen = PathCore.isWorldUnlocked(world, progress);
    const section = document.createElement('section');
    const bossCleared = !!levels.length && PathCore.starsOf(progress, levels[levels.length - 1].id) > 0;
    section.className = 'path-world' + (bossCleared ? ' is-complete' : '') + (worldOpen ? '' : ' is-locked') + (collapsed ? ' is-collapsed' : '') + (world.island ? ' is-island' : '');
    section.dataset.world = world.id;
    const head = document.createElement('header');
    head.className = 'path-world-head';
    head.innerHTML = '<span class="path-world-icon" aria-hidden="true"></span><h3 class="path-world-title"></h3><span class="path-world-stars"></span>';
    head.querySelector('.path-world-icon').innerText = worldOpen ? world.icon : '🔒';
    head.querySelector('.path-world-title').innerText = pathWorldTitle(world);
    head.querySelector('.path-world-stars').innerText = '★ ' + PathCore.worldStars(world, progress) + ' / ' + PathCore.worldMaxStars(world);
    section.appendChild(head);
    // Un monde replié n'est qu'un en-tête verrouillé : sa note ferait croire qu'elle parle du monde du dessous.
    if (!collapsed) pathRenderWorldNote(section, world, progress, worldOpen);
    container.appendChild(section);
    if (collapsed) return null;

    // Les îles bonus de ce monde, au-dessus de sa piste : un monde à moitié fait en propose une.
    if (!world.island) PathCore.islandsOf(world).forEach(island => pathRenderIslandCard(section, island, world, progress));

    const count = levels.length;
    const height = PATH_MAP.padTop + PATH_MAP.padBottom + (count - 1) * PATH_MAP.step;
    const track = document.createElement('div');
    track.className = 'path-track';
    track.style.height = height + 'px';
    const pos = levels.map((l, i) => ({
        x: pathNodeX(i, l.boss),
        y: PATH_MAP.padTop + (count - 1 - i) * PATH_MAP.step
    }));

    // Le chemin : plein et coloré jusqu'au dernier niveau réussi, pointillé au-delà.
    let doneD = '', todoD = '';
    for (let i = 0; i < count - 1; i++) {
        const a = pos[i], b = pos[i + 1], mid = (a.y + b.y) / 2;
        const seg = `M${a.x.toFixed(1)} ${a.y} C${a.x.toFixed(1)} ${mid} ${b.x.toFixed(1)} ${mid} ${b.x.toFixed(1)} ${b.y} `;
        if (PathCore.starsOf(progress, levels[i].id) > 0) doneD += seg; else todoD += seg;
    }
    const scenery = pathBuildScenery(track, world, pos, height);
    if (scenery) track.appendChild(scenery);
    const roadD = doneD + todoD;
    const svg = `<svg class="path-lines" viewBox="0 0 ${PATH_MAP.width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path class="path-road-edge" d="${roadD}" vector-effect="non-scaling-stroke"/>
        <path class="path-road" d="${roadD}" vector-effect="non-scaling-stroke"/>
        <path class="path-line-todo" d="${todoD}" vector-effect="non-scaling-stroke"/>
        <path class="path-line-done" d="${doneD}" vector-effect="non-scaling-stroke"/></svg>`;
    track.insertAdjacentHTML('beforeend', svg);

    let currentNode = null;
    levels.forEach((level, i) => {
        const unlocked = PathCore.isUnlocked(world, level.id, progress);
        const stars = PathCore.starsOf(progress, level.id);
        const state = !unlocked ? 'is-locked' : (stars > 0 ? 'is-done' : 'is-current');
        const title = pathLevelTitle(world, level);
        const node = document.createElement('button');
        node.type = 'button';
        node.className = 'path-node ' + state + (level.boss ? ' is-boss' : '') + (level.id === currentId ? ' is-next' : '');
        node.dataset.level = level.id;
        node.style.left = (pos[i].x / PATH_MAP.width * 100) + '%';
        node.style.top = pos[i].y + 'px';
        node.setAttribute('aria-label', t(unlocked ? 'path.node_aria' : 'path.node_locked_aria', {
            n: level.n, title, stars
        }));
        node.innerHTML = '<span class="path-node-disc" aria-hidden="true"></span><span class="path-node-stars" aria-hidden="true"></span><span class="path-node-label" aria-hidden="true"></span>';
        node.querySelector('.path-node-disc').innerText = !unlocked ? '🔒' : (level.boss ? '👑' : String(level.n));
        node.querySelector('.path-node-stars').innerText = unlocked ? pathStarsText(stars) : '';
        const label = node.querySelector('.path-node-label');
        label.innerText = title;
        label.classList.add(pos[i].x < PATH_MAP.width / 2 ? 'to-right' : 'to-left');
        node.onclick = () => pathOpenSheet(level.id);
        track.appendChild(node);
        if (level.id === currentId) {
            currentNode = node;
            // Clio se tient près du niveau à jouer, du côté opposé à son titre.
            if (typeof clioPathMarker === 'function') clioPathMarker(track, node, pos[i].x < PATH_MAP.width / 2);
        }
    });
    section.appendChild(track);
    return currentNode;
}

function renderPath() {
    const map = document.getElementById('path-map');
    if (!map) return;
    const progress = pathProgress();
    map.innerHTML = '';

    const target = PathCore.nextTarget(progress);
    const currentId = target ? target.levelId : null;
    let currentNode = null;
    if (typeof renderRewardsBar === 'function') renderRewardsBar(document.getElementById('path-rewards'), 'screen-path');
    const back = document.getElementById('path-back');
    if (back) back.setAttribute('aria-label', t(pathView ? 'path.island_back' : 'nav.back'));

    if (pathView) {
        // Une île : sa seule piste. Son niveau « à jouer » est le premier qu'on n'a pas fini.
        const island = PathCore.findWorld(pathView);
        document.getElementById('path-subtitle').innerText = t('path.island') + ' · ' + t('path.subtitle', {
            stars: PathCore.worldStars(island, progress), max: PathCore.worldMaxStars(island)
        });
        const levels = PathCore.levelsOf(island);
        const first = levels.find(l => PathCore.isUnlocked(island, l.id, progress) && PathCore.starsOf(progress, l.id) === 0);
        currentNode = pathRenderWorld(map, island, progress, first ? first.id : null, false);
    } else {
        document.getElementById('path-subtitle').innerText = t('path.subtitle', {
            stars: pathTotalStars(progress), max: pathTotalMaxStars()
        });
        // Une suite est annoncée, tout en haut : le Chemin ne s'arrête pas là.
        const soon = document.createElement('p');
        soon.className = 'path-soon';
        soon.innerText = t('path.coming_soon');
        map.appendChild(soon);
        // On gravit la carte : le premier monde en bas, les suivants au-dessus. Un monde fermé n'est dessiné en
        // entier que s'il est le prochain ; les autres se replient en un simple en-tête (la carte resterait
        // sinon interminable).
        const mains = PathCore.mainWorlds();
        const firstClosed = mains.find(w => !PathCore.isWorldUnlocked(w, progress));
        mains.slice().reverse().forEach(world => {
            const open = PathCore.isWorldUnlocked(world, progress);
            const node = pathRenderWorld(map, world, progress, currentId, !open && world !== firstClosed);
            if (node) currentNode = node;
        });
    }

    pathCloseSheet();
    if (typeof clioAfterPathRender === 'function') clioAfterPathRender(map);
    // La carte s'ouvre sur le niveau à jouer, pas tout en haut.
    if (currentNode && typeof currentNode.scrollIntoView === 'function') {
        requestAnimationFrame(() => currentNode.scrollIntoView({ block: 'center' }));
    } else {
        const screen = document.getElementById('screen-path');
        if (screen) screen.scrollTop = 0;
    }
}

// Sous l'en-tête d'un monde : pourquoi il est fermé, ou la possibilité de le passer (Monde 0).
function pathRenderWorldNote(section, world, progress, worldOpen) {
    if (world.island) return;
    const mains = PathCore.mainWorlds();
    const idx = mains.indexOf(world);
    if (!worldOpen) {
        const note = document.createElement('p');
        note.className = 'path-world-note';
        note.innerText = t('path.locked_world', { world: pathWorldTitle(mains[idx - 1]) });
        section.appendChild(note);
        return;
    }
    const next = mains[idx + 1];
    if (world.skippable && next && !PathCore.isWorldUnlocked(next, progress)) {
        const skip = document.createElement('button');
        skip.type = 'button';
        skip.className = 'path-world-skip';
        skip.innerText = t('path.skip_world', { world: pathWorldTitle(next) });
        skip.onclick = () => pathSkipWorld(world.id);
        section.appendChild(skip);
    }
}

// La carte d'une île bonus, sous l'en-tête de son monde d'attache : fermée tant que le joueur n'est pas à la
// moitié du monde, ouverte ensuite (elle mène à sa piste).
function pathRenderIslandCard(section, island, parent, progress) {
    const open = PathCore.isWorldUnlocked(island, progress);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'path-island-card' + (open ? '' : ' is-locked');
    card.dataset.island = island.id;
    card.innerHTML = '<span class="path-island-icon" aria-hidden="true"></span><span class="path-island-text"><small></small><strong></strong></span><span class="path-island-stars"></span>';
    card.querySelector('.path-island-icon').innerText = open ? island.icon : '🔒';
    card.querySelector('small').innerText = t('path.island');
    card.querySelector('strong').innerText = pathWorldTitle(island);
    card.querySelector('.path-island-stars').innerText = open
        ? '★ ' + PathCore.worldStars(island, progress) + '/' + PathCore.worldMaxStars(island)
        : t('path.island_locked_short', { n: island.opensAfter });
    card.onclick = () => {
        if (open) { openPath(island.id); return; }
        showConfirm(t('path.locked_island', { n: island.opensAfter, world: pathWorldTitle(parent) }), null, { alertOnly: true });
    };
    section.appendChild(card);
}

// « Je connais déjà » : le monde suivant s'ouvre ; celui-ci reste jouable.
function pathSkipWorld(worldId) {
    const world = PathCore.findWorld(worldId);
    const mains = PathCore.mainWorlds();
    const next = world && mains[mains.indexOf(world) + 1];
    if (!world || !next) return;
    showConfirm(t('path.skip_confirm', { world: pathWorldTitle(world), next: pathWorldTitle(next) }), () => {
        if (typeof pathProgressSave === 'function') pathProgressSave(PathCore.skipWorld(pathProgress(), worldId));
        renderPath();
    });
}

// La ligne « période » de la fiche d'un niveau.
function pathLevelRange(world, level) {
    if (level.boss) {
        return world.boss.ids
            ? t('path.boss_review', { world: pathWorldTitle(world) })
            : t('path.boss_range', { count: PathCore.BOSS_POOL_SIZE, world: pathWorldTitle(world) });
    }
    return level.from !== undefined ? pathYearRange(level) : '';
}

// --- La fiche d'un niveau ------------------------------------------------------
function pathOpenSheet(levelId) {
    const located = pathLocateLevel(levelId);
    if (!located) return;
    const { world, level } = located;
    const progress = pathProgress();
    const unlocked = PathCore.isUnlocked(world, level.id, progress);
    const stars = PathCore.starsOf(progress, level.id);
    const entry = progress.levels[level.id];
    pathSelectedId = level.id;
    document.querySelectorAll('.path-node.is-selected').forEach(n => n.classList.remove('is-selected'));
    const node = document.querySelector('.path-node[data-level="' + level.id + '"]');
    if (node) node.classList.add('is-selected');

    document.getElementById('path-sheet-title').innerText = (level.boss ? '👑 ' : t('path.level_n', { n: level.n }) + ' · ') + pathLevelTitle(world, level);
    const range = document.getElementById('path-sheet-range');
    range.innerText = pathLevelRange(world, level);
    range.classList.toggle('hidden', !range.innerText);
    document.getElementById('path-sheet-stages').innerText = level.stages
        .map(spec => expeditionStageTitle(typeof spec === 'string' ? { mode: spec } : spec)).join(' · ');

    const best = document.getElementById('path-sheet-best');
    best.innerText = stars > 0 ? pathStarsText(stars) + (entry && entry.best ? ' · ' + t('path.best', { score: entry.best }) : '') : '';
    best.classList.toggle('hidden', stars === 0);

    const lock = document.getElementById('path-sheet-lock');
    const play = document.getElementById('path-sheet-play');
    // Le boss demande des étoiles en plus du niveau précédent : le message dit ce qui manque vraiment.
    const needStars = level.boss && PathCore.regularStars(world, progress) < world.bossStarsRequired;
    const worldOpen = PathCore.isWorldUnlocked(world, progress);
    const mains = PathCore.mainWorlds();
    const prevWorld = mains[mains.indexOf(world) - 1];
    lock.innerText = unlocked ? '' : (!worldOpen
        ? t('path.locked_world', { world: prevWorld ? pathWorldTitle(prevWorld) : '' })
        : t(needStars ? 'path.locked_boss' : 'path.locked_level', {
            need: world.bossStarsRequired, have: PathCore.regularStars(world, progress), count: world.levels.length
        }));
    lock.classList.toggle('hidden', unlocked);
    play.classList.toggle('hidden', !unlocked);
    play.innerText = stars > 0 ? t('path.replay') : t('path.play');
    play.onclick = () => pathStartLevel(level.id);

    const sheet = document.getElementById('path-sheet');
    sheet.classList.remove('hidden');
    (unlocked ? play : document.getElementById('path-sheet-close')).focus();
}

function pathCloseSheet() {
    const sheet = document.getElementById('path-sheet');
    if (sheet) sheet.classList.add('hidden');
    document.querySelectorAll('.path-node.is-selected').forEach(n => n.classList.remove('is-selected'));
    pathSelectedId = null;
}

// --- Lancer un niveau --------------------------------------------------------------
function pathStartLevel(levelId) {
    const located = pathLocateLevel(levelId);
    if (!located) return;
    const { world, level } = located;
    if (!PathCore.isUnlocked(world, level.id, pathProgress())) return;
    const events = pathLevelEvents(level.id);
    // Un niveau fait seulement de leçons n'a pas besoin d'événements.
    if (PathCore.levelNeedsEvents(level) && events.length < PATH_MIN_EVENTS) {
        showConfirm(t('path.not_enough', { count: PATH_MIN_EVENTS }), null, { alertOnly: true });
        return;
    }
    startExpedition({
        levelId: level.id, world: world.id, title: pathLevelTitle(world, level),
        stages: level.stages, events, boss: level.boss
    });
}

// --- Fin d'un niveau (appelée par expeditionFinish) -----------------------------------
function pathOnLevelFinish(exp, won) {
    const plan = exp.plan;
    const located = pathLocateLevel(plan.levelId);
    if (!located) return;
    const before = pathProgress();
    const stars = PathCore.starsFor(won, exp.lives);
    const prevStars = PathCore.starsOf(before, plan.levelId);
    const islandsBefore = PathCore.WORLDS.filter(w => w.island && PathCore.isWorldUnlocked(w, before)).map(w => w.id);
    const firstClear = won && PathCore.starsOf(before, plan.levelId) === 0;
    const after = PathCore.recordResult(before, plan.levelId, stars, exp.total);
    if (typeof pathProgressSave === 'function') pathProgressSave(after);

    let xp = PathCore.levelXp(!!plan.boss, won, stars, exp.total, firstClear);
    if (typeof awardXP === 'function') {
        const info = awardXP(xp, 'Chemin du Temps');
        if (info && typeof info.xpAwarded === 'number') xp = info.xpAwarded;
        if (typeof addRecapLogEntry === 'function') addRecapLogEntry(xp, won ? 1 : 0);
    }
    // Finir un niveau compte pour la série quotidienne, comme n'importe quelle victoire.
    if (won && typeof streakRecordToday === 'function') streakRecordToday();
    if (typeof HistoriAxeNotifications !== 'undefined') HistoriAxeNotifications.enableAndSchedule();

    // Pièces, série de victoires, cartes (js/app/rewards.js) : un niveau perdu paie quand même une consolation.
    if (typeof rewardsOnLevelFinish === 'function') {
        exp.finished.rewards = rewardsOnLevelFinish({
            worldId: plan.world, won, stars, prevStars, boss: !!plan.boss,
            stagesDone: exp.stages.filter(s => s.result && s.result.ok).length
        });
    }
    // Équipe de classe : une étoile gagnée de plus qu'avant = un point pour le coffre commun.
    if (typeof teamOnStars === 'function') teamOnStars(Math.max(0, stars - prevStars));
    // Clio était sur ce niveau : si le suivant s'ouvre, elle marchera jusqu'à lui à l'affichage de la carte.
    if (won && firstClear && typeof clioWalkFrom !== 'undefined') clioWalkFrom = plan.levelId;
    exp.finished.stars = stars;
    exp.finished.xp = xp;
    exp.finished.firstClear = firstClear;
    exp.finished.worldDone = !!(won && plan.boss);
    exp.finished.nextId = won ? PathCore.nextLevelId(located.world, plan.levelId, after) : null;
    // Une île bonus qui vient de s'ouvrir (le joueur a passé la moitié de son monde d'attache).
    exp.finished.newIslands = PathCore.WORLDS.filter(w => w.island && !islandsBefore.includes(w.id) && PathCore.isWorldUnlocked(w, after)).map(w => w.id);
}
