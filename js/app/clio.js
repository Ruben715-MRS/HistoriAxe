// =========================================================================
// === HISTORIAXE — CLIO, LA MASCOTTE : APPARITIONS (voir js/clioCore.js) ===
// =========================================================================
// Clio est dessinée en SVG par js/clioArt.js (docs/direction-artistique.md §7). `clioAvatar` est le seul endroit qui la
// pose à l'écran : toutes les apparitions passent par lui. Un costume pas encore dessiné s'affiche en aperçu (emoji).
//
// Où elle apparaît :
//   - sur le Chemin, debout près du niveau à jouer (elle marche jusqu'au suivant après une victoire) ;
//   - à la fin d'un niveau, avec une réaction à la mesure du résultat ;
//   - à la fin d'un monde : elle fête le boss et propose le costume du monde ;
//   - à l'accueil, une fois par jour : bonjour, ou « ta série s'endort ».
// Jamais pendant une partie chronométrée ; toujours discrète, passable et courte.

function clioWornCostume() {
    const state = typeof rewardsState === 'function' ? rewardsState() : null;
    return state && state.equipped.costume ? RewardsCore.findItem(state.equipped.costume) : null;
}

// Clio dans une humeur, avec son costume. `size` : 'small' | 'medium'.
function clioAvatar(mood, size) {
    const safeMood = ClioCore.MOODS.includes(mood) ? mood : 'repos';
    const worn = clioWornCostume();
    const drawn = worn && ClioArt.hasCostume(worn.world);
    const el = document.createElement('span');
    el.className = 'clio clio-' + (size || 'medium') + ' is-' + safeMood;
    el.dataset.mood = safeMood;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', t('clio.aria'));
    el.innerHTML = ClioArt.front(safeMood, { costume: drawn ? worn.world : '' });
    if (worn && !drawn) {
        const badge = document.createElement('span');
        badge.className = 'clio-costume';
        badge.setAttribute('aria-hidden', 'true');
        badge.innerText = worn.emoji;
        el.appendChild(badge);
    }
    return el;
}

// La phrase d'un événement : une variante différente de la dernière entendue (mémorisée sur l'appareil).
function clioLine(event, params) {
    const state = clioLoad();
    const index = ClioCore.pickLine(event, typeof state.last[event] === 'number' ? state.last[event] : -1);
    state.last[event] = index;
    clioSave(state);
    return t(ClioCore.lineKey(event, index), params);
}

// Une réaction : l'avatar et sa bulle, côte à côte. Renvoie l'élément (à insérer où l'on veut).
function clioReaction(event, params, extraClass) {
    const cfg = ClioCore.EVENTS[event];
    const box = document.createElement('div');
    box.className = 'clio-react' + (extraClass ? ' ' + extraClass : '');
    box.dataset.event = event;
    box.appendChild(clioAvatar(cfg.mood));
    const bubble = document.createElement('p');
    bubble.className = 'clio-bubble';
    bubble.setAttribute('role', 'status');
    bubble.innerText = clioLine(event, params);
    box.appendChild(bubble);
    return box;
}

// --- Fin d'un niveau du Chemin -----------------------------------------------------------------------------
// `f` : expedition.finished ; `plan` : le plan du niveau. Pose la réaction (et, à la fin d'un monde, le costume proposé).
function clioRenderFinal(container, f, plan) {
    const event = ClioCore.eventForLevel({ won: !!f.won, stars: f.stars || 0, boss: !!plan.boss });
    container.appendChild(clioReaction(event, {}, 'clio-final'));
    if (!(f.won && plan.boss)) return;
    // Un monde fini : le costume de ce monde, s'il n'est pas déjà à Clio.
    const item = RewardsCore.findItem('costume-' + plan.world);
    const state = rewardsState();
    const hint = ClioCore.costumeHint(item, item && state.owned.indexOf(item.id) !== -1, state.coins);
    if (hint === 'none') return;
    const params = { name: rewardsCostumeName(item), price: item.price, missing: Math.max(0, item.price - state.coins) };
    const box = clioReaction(hint, params, 'clio-final clio-costume-hint');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn clio-shop-btn';
    btn.innerText = t('clio.see_shop');
    btn.onclick = () => openShop('screen-path');
    box.appendChild(btn);
    container.appendChild(box);
}

// --- Sur le Chemin ----------------------------------------------------------------------------------------------
// Clio se tient près de la pastille à jouer, du côté opposé à son titre. `walkFrom` : la pastille d'où elle vient.
let clioWalkFrom = null; // niveau quitté après une victoire : Clio y était, elle marche jusqu'au suivant

function clioPathMarker(track, node, nodeLeftOfCentre) {
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'clio-marker ' + (nodeLeftOfCentre ? 'on-left' : 'on-right');
    marker.style.left = node.style.left;
    marker.style.top = node.style.top;
    marker.setAttribute('aria-label', t('clio.aria'));
    marker.appendChild(clioAvatar('repos', 'small'));
    marker.onclick = () => clioMarkerSpeak(marker);
    track.appendChild(marker);
    return marker;
}

function clioMarkerSpeak(marker, event) {
    const old = marker.querySelector('.clio-marker-bubble');
    if (old) old.remove();
    const bubble = document.createElement('span');
    bubble.className = 'clio-marker-bubble';
    bubble.setAttribute('role', 'status');
    bubble.innerText = clioLine(event || 'tap', {});
    marker.appendChild(bubble);
    setTimeout(() => bubble.remove(), 3500);
}

// Après le rendu de la carte : Clio marche de l'ancienne pastille à la nouvelle, et se présente à la première visite.
function clioAfterPathRender(map) {
    const marker = map.querySelector('.clio-marker');
    if (!marker) { clioWalkFrom = null; return; }
    const from = clioWalkFrom ? map.querySelector('.path-node[data-level="' + clioWalkFrom + '"]') : null;
    clioWalkFrom = null;
    const reduced = typeof rewardsReducedMotion === 'function' && rewardsReducedMotion();
    const target = marker.parentElement.querySelector('.path-node.is-next');
    if (from && target && from.parentElement === target.parentElement && !reduced) {
        const dx = from.offsetLeft - target.offsetLeft;
        const dy = from.offsetTop - target.offsetTop;
        marker.style.transition = 'none';
        marker.style.transform = `translate(${dx}px, ${dy}px)`;
        marker.querySelector('.clio').classList.add('is-walking');
        void marker.offsetWidth;
        marker.style.transition = 'transform 1.1s ease-in-out';
        marker.style.transform = '';
        setTimeout(() => marker.querySelector('.clio') && marker.querySelector('.clio').classList.remove('is-walking'), 1200);
    }
    const state = clioLoad();
    if (!state.introSeen) {
        state.introSeen = true;
        clioSave(state);
        clioMarkerSpeak(marker, 'first');
    }
}

// --- À l'accueil -------------------------------------------------------------------------------------------------
// Une fois par jour : bonjour, ou la série qui s'endort. Renvoie l'élément à insérer, ou null.
function clioHomeGreeting() {
    const today = getLocalDateString();
    const state = clioLoad();
    if (state.greetedDate === today) return null;
    state.greetedDate = today;
    clioSave(state);

    const streak = typeof streakLoad === 'function' ? streakLoad() : { currentStreak: 0, lastPlayedDate: null };
    const days = streak.lastPlayedDate ? getDaysDifference(streak.lastPlayedDate, getTodayStringUTC()) : null;
    const mood = ClioCore.streakState(streak.currentStreak, days);
    const event = mood === 'risk' ? 'streakRisk' : (mood === 'ok' ? 'greetStreak' : 'greet');
    const box = clioReaction(event, { n: streak.currentStreak }, 'clio-home');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'clio-close';
    close.innerText = '×';
    close.setAttribute('aria-label', t('clio.dismiss'));
    close.onclick = () => box.remove();
    box.appendChild(close);
    return box;
}
