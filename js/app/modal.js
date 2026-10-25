// Extrait de l'ancien js/app.js — Portraits et fiche d'événement (modale).
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// =====================================================================
// PORTRAITS — champ facultatif `image` d'un événement
// =====================================================================
// { src, legende, auteur, licence, source } : voir docs/personnages-illustres.md « Portraits ».
// Les fichiers vivent dans assets/portraits/, que le service worker garde dans
// un cache à part, épargné par le ménage des mises à jour (voir sw.js).
//
// Trois règles pour qu'une image ne puisse jamais abîmer un écran :
//  - un chemin qui ne vient pas de assets/portraits/ n'est pas affiché : la
//    donnée est de confiance, mais ce garde-fou coûte une ligne ;
//  - une image qui ne charge pas (hors-ligne avant de l'avoir vue, fichier
//    absent) s'efface d'elle-même au lieu de laisser l'icône « image cassée » ;
//  - hors de la fiche, la pastille est décorative (alt vide) : le titre dit
//    déjà de qui il s'agit, et la légende complète est dans la fiche.
const PORTRAIT_SRC_PATTERN = /^assets\/portraits\/[A-Za-z0-9_.-]+\.jpg$/;

// Adresse à donner à un <img> (voir HistoriAxe.assetUrl : l'app native charge les portraits depuis le backend).
function portraitUrl(image) {
    return HistoriAxeAPI.assetUrl(image.src);
}

function portraitOf(evt) {
    const image = evt && evt.image;
    return image && PORTRAIT_SRC_PATTERN.test(image.src || '') ? image : null;
}

// Pose (ou retire) le portrait d'un <img> déjà présent dans le HTML.
function setPortraitImg(imgEl, evt) {
    if (!imgEl) return;
    const image = portraitOf(evt);
    imgEl.onerror = null;
    if (!image) {
        imgEl.classList.add('hidden');
        imgEl.removeAttribute('src');
        return;
    }
    imgEl.onerror = () => imgEl.classList.add('hidden');
    imgEl.src = portraitUrl(image);
    imgEl.classList.remove('hidden');
}

// Crée une pastille de portrait pour un repère de la frise ; null sans image.
function createPortraitThumb(evt, className) {
    const image = portraitOf(evt);
    if (!image) return null;
    const img = document.createElement('img');
    img.className = className;
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.addEventListener('error', () => img.remove(), { once: true });
    img.src = portraitUrl(image);
    return img;
}

// Pays d'un événement (champ facultatif `pays`, code ISO à deux lettres) : les
// panthéons de région, comme « Amérique hispanique », rassemblent des figures de
// pays différents, et la fiche dit lequel. Drapeau en emoji et nom localisé par
// le navigateur (voir js/geoMap.js) — aucune table à maintenir. Masqué sans
// `pays`, ou si le code n'est pas deux lettres.
function renderModalCountry(evt) {
    const el = document.getElementById('modal-pays');
    if (!el) return;
    const iso = evt && typeof evt.pays === 'string' && /^[A-Za-z]{2}$/.test(evt.pays) ? evt.pays.toUpperCase() : '';
    if (!iso || typeof isoToFlagEmoji !== 'function' || typeof countryDisplayName !== 'function') {
        el.classList.add('hidden');
        el.textContent = '';
        return;
    }
    el.textContent = `${isoToFlagEmoji(iso)} ${countryDisplayName(iso)}`;
    el.classList.remove('hidden');
}

// Crédit d'un portrait (auteur, licence, lien vers la page de l'œuvre), construit au DOM : le nom d'un
// auteur peut contenir n'importe quoi. Partagé par la fiche et par le mode « Qui est-ce ? », où le
// crédit reste sous l'image pendant la question.
function fillPortraitCredit(credit, image) {
    credit.textContent = '';
    const addText = text => credit.appendChild(document.createTextNode(text));
    const addLink = (text, href) => {
        const link = document.createElement('a');
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = text;
        credit.appendChild(link);
    };
    if (image.auteur) addText(image.auteur + ' · ');
    // Une licence CC se lie à son texte, et dit que l'image a été modifiée
    // (elle est recadrée et réduite) : c'est ce qu'exigent CC BY et CC BY-SA.
    // Le domaine public n'exige rien de tout cela.
    const licenseUrl = portraitLicenseUrl(image.licence);
    if (licenseUrl) addLink(image.licence, licenseUrl);
    else if (image.licence) addText(image.licence);
    if (/^CC BY/.test(image.licence || '')) addText(' · ' + t('modal.image_cropped'));
    addText(' · ');
    if (/^https:\/\//.test(image.source || '')) addLink('Wikimedia Commons', image.source);
    else addText('Wikimedia Commons');
}

// Portrait, légende et crédit de la fiche. Le crédit (auteur, licence, lien
// vers la page de l'œuvre sur Wikimedia Commons) n'est pas facultatif : c'est
// la condition des licences CC BY et CC BY-SA, et la moindre des politesses
// pour le domaine public. Il est bâti au DOM, jamais en HTML, parce que le nom
// d'un auteur peut contenir n'importe quoi.
function renderModalPortrait(evt) {
    const figure = document.getElementById('modal-portrait');
    const img = document.getElementById('modal-portrait-img');
    if (!figure || !img) return;
    const image = portraitOf(evt);
    img.onerror = null;
    if (!image) {
        figure.classList.add('hidden');
        img.removeAttribute('src');
        return;
    }
    // Légende et crédit décrivent une image : si elle ne charge pas, ils
    // partent avec elle plutôt que de rester orphelins.
    img.onerror = () => figure.classList.add('hidden');
    // alt vide : la légende juste dessous dit tout, la répéter ferait lire
    // deux fois la même phrase aux lecteurs d'écran.
    img.alt = '';
    img.src = portraitUrl(image);
    document.getElementById('modal-portrait-caption').textContent = image.legende || '';
    fillPortraitCredit(document.getElementById('modal-portrait-credit'), image);
    figure.classList.remove('hidden');
}

// Adresse du texte d'une licence Creative Commons, d'après son libellé
// (« CC BY-SA 3.0 », « CC BY 3.0 NL », « CC0 (domaine public) ») ; null pour
// le domaine public, qui n'a pas de texte à lier.
function portraitLicenseUrl(label) {
    const cc = /^CC BY(-SA)? (\d\.\d)(?: ([A-Z]{2,3}))?$/.exec(label || '');
    if (cc) return `https://creativecommons.org/licenses/by${cc[1] ? '-sa' : ''}/${cc[2]}/${cc[3] ? cc[3].toLowerCase() + '/' : ''}`;
    if (/^CC0/.test(label || '')) return 'https://creativecommons.org/publicdomain/zero/1.0/';
    return null;
}

// Bouton « Voir sa biographie » : seulement pour un événement qui renvoie à
// un thème de la catégorie Biographies, et jamais pendant une partie de frise
// — il ferait quitter la partie d'un tap. Le test est celui de quitGame() :
// hors Découverte, l'écran de jeu visible veut dire « partie en cours ».
function renderModalBiographyButton(evt, fromGallery = false) {
    const row = document.getElementById('modal-bio-row');
    const btn = document.getElementById('modal-bio-btn');
    if (!row || !btn) return;
    // Depuis la galerie, le bouton dit ce qu'il fait vraiment : il mène au
    // jeu, à côté de celui du panthéon.
    btn.textContent = t(fromGallery ? 'gallery.play_biography' : 'modal.biography_btn');
    const gameScreen = document.getElementById('screen-game');
    const gameRunning = !!gameScreen && !gameScreen.classList.contains('hidden') && currentMode !== 'discovery';
    const target = (evt.biographie && !gameRunning)
        ? getAllThemesWithPath().find(item => item.theme.id === evt.biographie)
        : null;
    row.classList.toggle('hidden', !target);
    btn.onclick = target ? () => {
        closeModal();
        if (fromGallery) markGalleryLaunch();
        favoritesMode = false;
        if (dailyChallengeMode || weeklyChallengeMode) stopTimer();
        dailyChallengeMode = false;
        weeklyChallengeMode = false;
        openThemeAt(target.ci, target.si, target.ti);
    } : null;
}

// « Vu aussi dans… » : les autres thèmes qui racontent le même fait (voir
// js/linkedEvents.js). Un lien ouvre la fiche de l'événement dans ce thème-là —
// avec son titre propre, qui dit l'angle choisi — et son accès « Jouer sur… ».
// L'index se recalcule quand la base change (langue, thème ajouté).
// Historique de la fiche : chaque saut par « Vu aussi dans… » empile la fiche
// quittée, et le bouton « Retour » la rouvre. Toute autre ouverture de fiche,
// et la fermeture, repartent d'un historique vide.
let modalHistory = [];
let currentModal = null;

function modalBack() {
    const previous = modalHistory.pop();
    if (!previous) return;
    openModal(previous.evt, previous.context, true);
    const content = document.querySelector('#modal-details .modal-content');
    if (content) content.scrollTop = 0;
}

function renderModalBackButton() {
    const btn = document.getElementById('modal-back-btn');
    if (!btn) return;
    btn.classList.toggle('hidden', modalHistory.length === 0);
    if (modalHistory.length > 0) {
        const previous = modalHistory[modalHistory.length - 1];
        btn.textContent = '← ' + t('nav.back') + ' : ' + previous.evt.titre;
    }
}

let linkIndexCache = null;
let linkIndexBdd = null;
const LINKED_VISIBLE = 3;

function getLinkIndex() {
    if (!linkIndexCache || linkIndexBdd !== window.bdd) {
        linkIndexCache = LinkedEvents.buildLinkIndex(getAllEventsWithLocation());
        linkIndexBdd = window.bdd;
    }
    return linkIndexCache;
}

function renderModalLinkedEvents(evt) {
    const row = document.getElementById('modal-linked-row');
    const list = document.getElementById('modal-linked-list');
    if (!row || !list) return;
    list.innerHTML = '';
    const links = (typeof LinkedEvents !== 'undefined') ? getLinkIndex().linksFor(evt) : [];
    row.classList.toggle('hidden', links.length === 0);
    if (links.length === 0) return;

    function addLink(link) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'modal-linked-btn';
        btn.setAttribute('aria-label', t('modal.linked_open', { theme: link.theme.nom }));
        const themeName = document.createElement('span');
        themeName.className = 'modal-linked-theme';
        themeName.textContent = link.theme.nom;
        const title = document.createElement('span');
        title.className = 'modal-linked-title';
        title.textContent = link.event.titre;
        btn.append(themeName, title);
        btn.onclick = () => {
            if (currentModal) modalHistory.push(currentModal);
            openModal(link.event, {
                theme: link.theme,
                categoryIndex: link.categoryIndex,
                subcategoryIndex: link.subcategoryIndex,
                themeIndex: link.themeIndex,
                hideRedraw: true
            }, true);
            const content = document.querySelector('#modal-details .modal-content');
            if (content) content.scrollTop = 0;
        };
        list.appendChild(btn);
    }

    links.slice(0, LINKED_VISIBLE).forEach(addLink);
    const rest = links.slice(LINKED_VISIBLE);
    if (rest.length > 0) {
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'modal-linked-more';
        more.textContent = t('modal.linked_more', { n: rest.length });
        more.onclick = () => {
            more.remove();
            rest.forEach(addLink);
        };
        list.appendChild(more);
    }
}

// Fiches d'un pack découpé (js/pack.js) : le texte arrive thème par thème. Sans pack découpé
// (langue de démonstration, tests), tout est déjà là et la promesse est immédiate.
function ensureDescriptions(events) {
    return typeof Pack !== 'undefined' ? Pack.ensureDescriptions(events) : Promise.resolve();
}

// MODAL
// Le second paramètre (facultatif) n'est fourni que depuis « Découvrir un
// événement au hasard » : il permet d'afficher un accès direct vers le thème
// d'origine de l'événement, ainsi qu'un bouton pour repiocher.
function openModal(evt, context = null, keepHistory = false) {
    if (!keepHistory) modalHistory = [];
    currentModal = { evt, context };
    renderModalBackButton();
    document.getElementById('modal-titre').innerText = evt.titre;

    const badgeContainer = document.getElementById('modal-axe-badge-container');
    if (badgeContainer) {
        if (evt.axe) {
            const color = getAxisColor(evt.axe);
            badgeContainer.innerHTML = `<span class="entry-axe-badge" data-axis="${color ? color.name : 'blue'}">${escapeHtml(evt.axe)}</span>`;
            badgeContainer.classList.remove('hidden');
        } else {
            badgeContainer.innerHTML = '';
            badgeContainer.classList.add('hidden');
        }
    }

    const duration = formatEventDuration(evt);
    const dateStr = formatEventDate(evt);
    document.getElementById('modal-date').innerText = duration ? `${dateStr} (${t('periodes.duration_label', { val: duration })})` : dateStr;
    renderModalCountry(evt);
    document.getElementById('modal-desc').innerText = evt.description || '';
    if (evt.description === undefined) {
        // Pack découpé : la fiche s'ouvre tout de suite, le texte la rejoint dès qu'il est là
        // (sauf si une autre fiche a pris la place entre-temps).
        ensureDescriptions([evt]).then(() => {
            if (currentModal && currentModal.evt === evt) document.getElementById('modal-desc').innerText = evt.description || '';
        });
    }
    document.getElementById('modal-wiki').href = safeHttpUrl(evt.wikipedia) || '#';
    renderModalLinkedEvents(evt);
    if (typeof renderModalMapButton === 'function') renderModalMapButton(evt);
    renderModalPortrait(evt);
    const fromGallery = !!(context && context.fromGallery);
    renderModalBiographyButton(evt, fromGallery);
    // La galerie réunit ses deux boutons sous un même filet (voir CSS
    // .modal-content.from-gallery).
    const modalContent = document.querySelector('#modal-details .modal-content');
    modalContent.classList.toggle('from-gallery', fromGallery);
    // Collection : un personnage pas encore rencontré garde son portrait en noir et blanc (voir js/gallery.js).
    modalContent.classList.toggle('from-gallery-locked', fromGallery && !!context.locked);

    const themeRow = document.getElementById('modal-theme-row');
    const redrawBtn = document.getElementById('modal-redraw-btn');
    if (context && context.theme) {
        themeRow.classList.remove('hidden');
        document.getElementById('modal-theme-btn').innerText = t('modal.play_theme_btn_named', { theme: context.theme.nom });
        document.getElementById('modal-theme-btn').onclick = () => {
            closeModal();
            if (context.fromGallery) markGalleryLaunch();
            if (dailyChallengeMode || weeklyChallengeMode) stopTimer();
            favoritesMode = false;
            dailyChallengeMode = false;
            weeklyChallengeMode = false;
            openThemeAt(context.categoryIndex, context.subcategoryIndex, context.themeIndex);
        };
        // Repiocher un événement au hasard n'a de sens que depuis « Découvrir »
        // (context.hideRedraw le masque depuis les Défis du jour/hebdomadaire, cf. buildEntry).
        if (context.hideRedraw) {
            redrawBtn.classList.add('hidden');
        } else {
            redrawBtn.classList.remove('hidden');
            // « Un autre événement » depuis un événement, « Un autre personnage » depuis un personnage.
            redrawBtn.innerText = t(context.redrawLabel || 'modal.redraw_btn');
            redrawBtn.onclick = () => (context.redraw || discoverRandomEvent)();
        }
    } else {
        themeRow.classList.add('hidden');
    }

    // Déjà ouverte (événement lié, retour, repioche) : le contenu se renouvelle d'un fondu. Fermée, c'est
    // l'ouverture de la modale elle-même qui s'anime (voir css/style.css, « MOUVEMENT »).
    const overlay = document.getElementById('modal-details');
    if (!overlay.classList.contains('hidden')) replayAnimClass(modalContent, 'modal-swap');
    overlay.classList.remove('hidden');
}

function closeModal() {
    modalHistory = [];
    currentModal = null;
    document.getElementById('modal-details').classList.add('hidden');
}

// ZOOM
let currentZoom = 1;
// Réglage de la taille du texte de la colonne (A− / A+)
function changeZoom(delta) {
    currentZoom = Math.min(1.6, Math.max(0.85, currentZoom + delta));
    document.documentElement.style.setProperty('--zoom-level', currentZoom);
}

