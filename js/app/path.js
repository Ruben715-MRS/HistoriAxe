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
const PATH_MAP = { width: 300, step: 100, padTop: 100, padBottom: 70, amplitude: 78 };

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
function openPath() {
    pathSelectedId = null;
    showScreen('screen-path', 'forward');
    renderPath();
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

// --- La carte -------------------------------------------------------------------
function pathNodeX(index, boss) {
    if (boss) return PATH_MAP.width / 2;
    return PATH_MAP.width / 2 + PATH_MAP.amplitude * Math.sin(index * 0.95 + 0.4);
}

function renderPath() {
    const map = document.getElementById('path-map');
    if (!map) return;
    const progress = pathProgress();
    map.innerHTML = '';

    document.getElementById('path-subtitle').innerText = t('path.subtitle', {
        stars: pathTotalStars(progress), max: pathTotalMaxStars()
    });

    // Un monde de plus est annoncé, tout en haut : la carte ne s'arrête pas là.
    const soon = document.createElement('p');
    soon.className = 'path-soon';
    soon.innerText = t('path.coming_soon');
    map.appendChild(soon);

    // On gravit la carte : le premier monde en bas, les suivants au-dessus.
    const target = PathCore.nextTarget(progress);
    const currentId = target ? target.levelId : null;
    let currentNode = null;
    PathCore.WORLDS.slice().reverse().forEach(world => {
        const levels = PathCore.levelsOf(world);
        const worldOpen = PathCore.isWorldUnlocked(world, progress);
        const section = document.createElement('section');
        section.className = 'path-world' + (worldOpen ? '' : ' is-locked');
        section.dataset.world = world.id;
        const head = document.createElement('header');
        head.className = 'path-world-head';
        head.innerHTML = '<span class="path-world-icon" aria-hidden="true"></span><h3 class="path-world-title"></h3><span class="path-world-stars"></span>';
        head.querySelector('.path-world-icon').innerText = worldOpen ? world.icon : '🔒';
        head.querySelector('.path-world-title').innerText = pathWorldTitle(world);
        head.querySelector('.path-world-stars').innerText = '★ ' + PathCore.worldStars(world, progress) + ' / ' + PathCore.worldMaxStars(world);
        section.appendChild(head);
        pathRenderWorldNote(section, world, progress, worldOpen);

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
        const svg = `<svg class="path-lines" viewBox="0 0 ${PATH_MAP.width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path class="path-line-todo" d="${todoD}" vector-effect="non-scaling-stroke"/>
            <path class="path-line-done" d="${doneD}" vector-effect="non-scaling-stroke"/></svg>`;
        track.insertAdjacentHTML('beforeend', svg);

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
            if (level.id === currentId) currentNode = node;
        });
        section.appendChild(track);
        map.appendChild(section);
    });

    pathCloseSheet();
    // La carte s'ouvre sur le niveau à jouer, pas tout en haut.
    if (currentNode && typeof currentNode.scrollIntoView === 'function') {
        requestAnimationFrame(() => currentNode.scrollIntoView({ block: 'center' }));
    }
}

// Sous l'en-tête d'un monde : pourquoi il est fermé, ou la possibilité de le passer (Monde 0).
function pathRenderWorldNote(section, world, progress, worldOpen) {
    const idx = PathCore.WORLDS.indexOf(world);
    if (!worldOpen) {
        const note = document.createElement('p');
        note.className = 'path-world-note';
        note.innerText = t('path.locked_world', { world: pathWorldTitle(PathCore.WORLDS[idx - 1]) });
        section.appendChild(note);
        return;
    }
    const next = PathCore.WORLDS[idx + 1];
    if (world.skippable && next && !PathCore.isWorldUnlocked(next, progress)) {
        const skip = document.createElement('button');
        skip.type = 'button';
        skip.className = 'path-world-skip';
        skip.innerText = t('path.skip_world', { world: pathWorldTitle(next) });
        skip.onclick = () => pathSkipWorld(world.id);
        section.appendChild(skip);
    }
}

// « Je connais déjà » : le monde suivant s'ouvre ; celui-ci reste jouable.
function pathSkipWorld(worldId) {
    const world = PathCore.findWorld(worldId);
    const next = world && PathCore.WORLDS[PathCore.WORLDS.indexOf(world) + 1];
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
            : t('path.boss_range', { count: PathCore.BOSS_PER_LEVEL * world.levels.length, world: pathWorldTitle(world) });
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
    const prevWorld = PathCore.WORLDS[PathCore.WORLDS.indexOf(world) - 1];
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

    exp.finished.stars = stars;
    exp.finished.xp = xp;
    exp.finished.firstClear = firstClear;
    exp.finished.worldDone = !!(won && plan.boss);
    exp.finished.nextId = won ? PathCore.nextLevelId(located.world, plan.levelId, after) : null;
}
