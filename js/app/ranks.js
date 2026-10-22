// =========================================================================
// === HISTORIAXE — LA COLONNE DES GRADES (tous les niveaux d'un coup d'œil) ===
// =========================================================================
// Une grande colonne romaine : le premier grade à son pied, le dernier sous le chapiteau. Le fût se remplit comme
// un thermomètre — une ligne d'or qui monte avec l'XP — et chaque grade est un anneau gravé sur le fût, avec à
// gauche l'XP à atteindre et à droite le titre. Les grades atteints sont dorés, les autres en pierre pâle ; le
// grade actuel est signalé « Vous êtes ici ». Les grades ne sont pas espacés selon l'XP (le dernier demanderait
// quarante mille points) : chacun a la même hauteur, et la ligne monte de façon continue à l'intérieur du grade.
//
// Les grades et leurs seuils sont ceux de js/gamification.js (RANKS, getRankInfo).

const RANKS_ROW = 100; // hauteur d'un grade, en px

// Chapiteau ionique (volutes) et base attique, dessinés en SVG simple : originaux, en pierre claire.
const RANKS_CAPITAL_SVG = '<svg viewBox="0 0 160 70" class="ranks-capital-svg" aria-hidden="true" focusable="false">' +
    '<rect x="8" y="6" width="144" height="12" rx="3" fill="#E9E1D2" stroke="#BFB39B"/>' +
    '<path d="M22 18 H138 C132 34 118 40 104 42 H56 C42 40 28 34 22 18 Z" fill="#F1EADB" stroke="#BFB39B"/>' +
    '<circle cx="30" cy="38" r="15" fill="#E9E1D2" stroke="#BFB39B"/><circle cx="30" cy="38" r="8" fill="none" stroke="#BFB39B" stroke-width="3"/><circle cx="30" cy="38" r="2.5" fill="#BFB39B"/>' +
    '<circle cx="130" cy="38" r="15" fill="#E9E1D2" stroke="#BFB39B"/><circle cx="130" cy="38" r="8" fill="none" stroke="#BFB39B" stroke-width="3"/><circle cx="130" cy="38" r="2.5" fill="#BFB39B"/>' +
    '<rect x="44" y="52" width="72" height="10" rx="2" fill="#E3DACA" stroke="#BFB39B"/></svg>';
const RANKS_BASE_SVG = '<svg viewBox="0 0 160 70" class="ranks-base-svg" aria-hidden="true" focusable="false">' +
    '<rect x="44" y="2" width="72" height="9" rx="2" fill="#E3DACA" stroke="#BFB39B"/>' +
    '<ellipse cx="80" cy="22" rx="52" ry="11" fill="#F1EADB" stroke="#BFB39B"/>' +
    '<ellipse cx="80" cy="38" rx="62" ry="11" fill="#E9E1D2" stroke="#BFB39B"/>' +
    '<rect x="6" y="46" width="148" height="18" rx="3" fill="#DDD3C1" stroke="#BFB39B"/></svg>';

let ranksReturn = 'screen-categories';

function openRanks() {
    if (typeof closeProfileModal === 'function') closeProfileModal();
    ranksReturn = 'screen-categories';
    showScreen('screen-ranks', 'forward');
    renderRanks();
    // On amène le grade actuel au milieu de l'écran.
    requestAnimationFrame(() => {
        const here = document.querySelector('#ranks-column .ranks-row.is-current');
        if (here && here.scrollIntoView) here.scrollIntoView({ block: 'center' });
    });
}

function ranksBack() {
    showScreen(ranksReturn, 'back');
    if (typeof initCategories === 'function') initCategories();
}

function renderRanks() {
    const host = document.getElementById('ranks-column');
    if (!host) return;
    const data = gamificationLoad();
    const info = getRankInfo(data.xp);
    const realLevel = info.currentRank.level;
    const top = RANKS.length;
    // Au-delà du dernier grade, la colonne est pleine : le niveau réel (jusqu'à MAX_LEVEL) est indiqué sur le dernier.
    const level = Math.min(realLevel, top);
    // Position continue sur la colonne : grade courant + part parcourue vers le suivant (0 à 9 ; 9 = sommet).
    const progress = info.nextRank ? info.progressPct / 100 : 1;
    const position = (level - 1) + (level === top ? 0 : progress);
    // La ligne part du pied de la colonne, passe par le centre de chaque grade atteint, et monte vers le suivant.
    const fillPx = level === top ? top * RANKS_ROW : RANKS_ROW / 2 + position * RANKS_ROW;

    host.innerHTML = '';
    host.setAttribute('role', 'group');
    host.setAttribute('aria-label', t('gamification.ranks_aria', { level: realLevel, max: realLevel > top ? MAX_LEVEL : top, xp: data.xp }));

    const capital = document.createElement('div');
    capital.className = 'ranks-capital';
    capital.innerHTML = RANKS_CAPITAL_SVG;
    const summit = document.createElement('p');
    summit.className = 'ranks-summit';
    summit.textContent = t('gamification.ranks_summit');
    host.append(summit, capital);

    const shaft = document.createElement('div');
    shaft.className = 'ranks-shaft';
    shaft.style.height = top * RANKS_ROW + 'px';
    const tube = document.createElement('div');
    tube.className = 'ranks-tube';
    const fill = document.createElement('div');
    fill.className = 'ranks-fill';
    fill.style.height = fillPx + 'px';
    tube.appendChild(fill);
    shaft.appendChild(tube);

    // Du plus haut grade (en haut) au premier (au pied).
    for (let k = top; k >= 1; k--) {
        const rank = RANKS[k - 1];
        const reached = k <= level;
        const row = document.createElement('div');
        row.className = 'ranks-row' + (reached ? ' is-reached' : ' is-locked') + (k === level ? ' is-current' : '');
        row.style.height = RANKS_ROW + 'px';
        row.style.bottom = (k - 1) * RANKS_ROW + 'px';

        const scale = document.createElement('span');
        scale.className = 'ranks-scale';
        scale.textContent = t('gamification.ranks_xp', { xp: rank.minXP });

        const ring = document.createElement('span');
        ring.className = 'ranks-ring';
        ring.setAttribute('aria-hidden', 'true');
        ring.textContent = rank.icon;

        const label = document.createElement('span');
        label.className = 'ranks-label';
        const title = document.createElement('b');
        title.textContent = rankTitle(rank);
        const meta = document.createElement('small');
        meta.textContent = t('gamification.rank_badge', { level: k === top ? realLevel : k });
        label.append(title, meta);
        if (k === level) {
            const here = document.createElement('em');
            here.className = 'ranks-here';
            here.textContent = t('gamification.ranks_here') + ' · ' + t('gamification.ranks_xp', { xp: data.xp });
            label.appendChild(here);
            if (realLevel >= top) {
                if (info.nextRank) {
                    const toNext = document.createElement('small');
                    toNext.textContent = t('gamification.xp_needed_level', { needed: info.xpToNext, level: info.nextRank.level });
                    label.appendChild(toNext);
                }
            } else if (info.nextRank) {
                const next = document.createElement('small');
                next.textContent = t('gamification.xp_needed', { needed: info.xpToNext, next: rankTitle(info.nextRank) });
                label.appendChild(next);
            }
        }
        // Les lecteurs d'écran entendent l'état de chaque grade.
        row.setAttribute('aria-label', `${rankTitle(rank)}, ${t('gamification.rank_badge', { level: k })}, ${t(reached ? 'gamification.ranks_reached' : 'gamification.ranks_locked')}`);
        row.setAttribute('role', 'img');
        row.append(scale, ring, label);
        shaft.appendChild(row);
    }
    host.appendChild(shaft);

    const base = document.createElement('div');
    base.className = 'ranks-base';
    base.innerHTML = RANKS_BASE_SVG;
    host.appendChild(base);
}
