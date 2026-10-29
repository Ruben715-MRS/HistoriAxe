// La renommée des personnages à l'écran : le contour coloré du portrait (bronze, argent, or) et son étiquette. Les règles (niveau,
// libellés, réglage « afficher / cacher ») sont dans js/renown.js (pur, testé) ; les couleurs et les filets, dans css/style.css (`.renown-*`).
// Le contour est un indice (une figure à contour or est connue de tous) : on ne le pose qu'une fois la réponse donnée.

// « Renommée mondiale », ou '' pour une figure sans niveau.
function renownLabel(evt) {
    const key = Renown.keyOf(evt);
    return key ? t('renown.' + key) : '';
}

// Pose (ou retire) le contour d'une image : seulement si `on`, si la figure a un niveau et si le joueur n'a pas désactivé la renommée.
function renownFrameImage(img, evt, on) {
    if (!img) return;
    img.classList.remove('renown-img', 'renown-1', 'renown-2', 'renown-3');
    const level = Renown.levelOf(evt);
    if (on && level && Renown.shown()) img.classList.add('renown-img', 'renown-' + level);
}

// L'étiquette d'une figure : des pastilles (une, deux ou trois, de la couleur du niveau) et le libellé. Rien si `on` est faux, si le niveau
// manque ou si la renommée est désactivée : l'élément se masque.
function renownFillChip(el, evt, on) {
    if (!el) return;
    const level = Renown.levelOf(evt);
    el.textContent = '';
    el.classList.remove('renown-1', 'renown-2', 'renown-3');
    const visible = !!(on && level && Renown.shown());
    el.classList.toggle('hidden', !visible);
    if (!visible) return;
    el.classList.add('renown-' + level);
    const pips = document.createElement('span');
    pips.className = 'renown-pips';
    pips.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) pips.appendChild(document.createElement('i'));
    const text = document.createElement('span');
    text.className = 'renown-chip-text';
    text.textContent = renownLabel(evt);
    el.append(pips, text);
}
