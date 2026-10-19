// Extrait de l'ancien js/app.js — Recherche, liste des thèmes, révision, écran des modes.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// === RECHERCHE DE THÈMES (barre en tête de l'écran des catégories) ===
// Aplatit tout l'arbre bdd en une liste de thèmes, chacun avec ses indices
// exacts (ci/si/ti, au format attendu par openThemeAt) et le chemin de noms
// de catégories/sous-catégories qui mène jusqu'à lui, pour affichage et pour
// élargir la recherche au-delà du seul nom du thème.
function getAllThemesWithPath() {
    const all = [];
    bdd.forEach((cat, ci) => {
        (function walk(node, path, pathNames) {
            if (node.subcategories) {
                node.subcategories.forEach((sub, idx) => walk(sub, [...path, idx], [...pathNames, sub.nom]));
            } else {
                node.themes.forEach((theme, ti) => {
                    all.push({ theme, ci, si: path.length ? path : null, ti, pathNames });
                });
            }
        })(cat, [], [cat.nom]);
    });
    return all;
}

// Normalise pour une comparaison insensible aux accents et à la casse
// (« général » doit matcher « general », dès la première lettre tapée).
function normalizeSearchText(str) {
    return (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function onThemeSearchInput(rawValue) {
    const clearBtn = document.getElementById('theme-search-clear');
    const resultsBox = document.getElementById('theme-search-results');
    if (clearBtn) clearBtn.classList.toggle('hidden', !rawValue);

    const query = normalizeSearchText(rawValue);
    if (!query) {
        resultsBox.classList.add('hidden');
        resultsBox.innerHTML = '';
        return;
    }

    // `motsCles` : des mots que le nom du thème ne contient pas mais que l'on
    // tape pour le trouver — les pays d'un panthéon de région (« mexique » doit
    // mener à « Grandes figures d'Amérique hispanique »).
    const matches = getAllThemesWithPath().filter(item =>
        normalizeSearchText(item.theme.nom).includes(query) ||
        normalizeSearchText(item.pathNames.join(' ')).includes(query) ||
        (item.theme.motsCles || []).some(mot => normalizeSearchText(mot).includes(query))
    );
    renderThemeSearchResults(matches);
}

function renderThemeSearchResults(matches) {
    const resultsBox = document.getElementById('theme-search-results');
    resultsBox.innerHTML = '';
    resultsBox.classList.remove('hidden');

    if (matches.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'search-empty';
        empty.innerText = t('categories.search_empty');
        resultsBox.appendChild(empty);
        return;
    }

    // Limite d'affichage pour garder la liste lisible, même sur une recherche
    // très large (ex. une seule lettre fréquente).
    matches.slice(0, 40).forEach(({ theme, ci, si, ti, pathNames }) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
                    <span class="search-result-title">${escapeHtml(theme.nom)}</span>
                    <span class="search-result-path">${escapeHtml(pathNames.join(' › '))}</span>
                `;
        item.onclick = () => {
            clearThemeSearch();
            openThemeAt(ci, si, ti);
        };
        A11y.activatable(item);
        resultsBox.appendChild(item);
    });
}

function clearThemeSearch() {
    const input = document.getElementById('theme-search-input');
    const clearBtn = document.getElementById('theme-search-clear');
    const resultsBox = document.getElementById('theme-search-results');
    if (input) input.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    if (resultsBox) { resultsBox.classList.add('hidden'); resultsBox.innerHTML = ''; }
}

// Ouvre le thème indiqué par ses indices exacts dans bdd (utilisé aussi bien
// depuis la liste de thèmes normale que depuis les favoris ou la fiche de
// découverte, qui ont besoin de retrouver un thème hors de son contexte courant).
function openThemeAt(ci, si, ti) {
    selectedCategoryIndex = ci;
    selectedSubcategoryIndex = si;
    selectedThemeIndex = ti;
    revisionMode = false;
    essentialFilterActive = false;
    axisFilterActive = false;
    isSelectionActive = false;
    const theme = getCurrentThemeList()[ti];
    lastThemeSave(theme.id);
    currentThemeAxes = [...new Set(theme.events.map(e => e.axe).filter(Boolean))];
    if (theme.axeOrder) {
        currentThemeAxes = theme.axeOrder.filter(a => currentThemeAxes.includes(a));
    }
    const hasAxes = theme.events.some(e => e.axe);
    showScreen(hasAxes ? 'screen-axes' : 'screen-modes', 'forward');
}

function backFromModes() {
    isSelectionActive = false;
    showScreen(screenAfterGame(), 'back');
}

// INIT THÈMES (Sous-dossiers / quiz)
function initThemes() {
    const container = document.getElementById('themes-container');
    container.innerHTML = '';

    if (favoritesMode) {
        renderFavoritesThemes(container);
        return;
    }

    const category = bdd[selectedCategoryIndex];
    const themeList = getCurrentThemeList();
    const node = category.subcategories ? resolveSubcategory(category, selectedSubcategoryIndex) : category;
    document.getElementById('theme-screen-title').innerText = node.nom;

    // Note explicative éventuelle rattachée à ce nœud précis (ex. renvoi vers
    // une autre catégorie pour un pan d'histoire déjà traité ailleurs) — même
    // mécanisme visuel que la note de catégorie affichée sur l'écran des
    // sous-catégories (voir initSubcategories), mais au niveau du thème.
    const themeNoteBox = document.getElementById('theme-screen-note');
    if (node.note) {
        document.getElementById('theme-screen-note-text').innerText = node.note;
        themeNoteBox.classList.remove('hidden');
    } else {
        themeNoteBox.classList.add('hidden');
    }

    if (category.isCustomCategory) {
        const addCard = document.createElement('div');
        addCard.className = 'special-card';
        addCard.style.background = 'linear-gradient(135deg, #1E8449, #2ECC71)';
        addCard.style.gridColumn = '1 / -1';
        addCard.style.maxWidth = '450px';
        addCard.style.margin = '0 auto 10px auto';
        addCard.style.width = '100%';
        addCard.innerHTML = `
                    <div class="special-card-title">${t('custom.new_theme_btn')}</div>
                    <div class="special-card-subtitle">${t('custom.new_theme_subtitle')}</div>
                `;
        addCard.onclick = openAddThemeModal;
        A11y.activatable(addCard);
        container.appendChild(addCard);

        if (themeList.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-msg';
            emptyMsg.innerText = t('custom.empty_custom_themes');
            emptyMsg.style.gridColumn = '1 / -1';
            container.appendChild(emptyMsg);
            return;
        }
    }

    // Mode Carte (voir js/geoMap.js), même logique qu'à l'écran des
    // sous-catégories : disponible dès que ce nœud — ici le dernier niveau
    // avant la liste de thèmes — contient assez d'événements géolocalisables.
    if (!category.isCustomCategory && typeof isGeoEligible === 'function' && isGeoEligible(node)) {
        container.appendChild(buildGeoModeCard(node, node.nom));
        container.appendChild(buildChronoGeoCard(node, node.nom));
    }

    if (themeList.length === 0 && !category.isCustomCategory) {
        // Sous-catégorie déjà créée (ex. futur pays d'un programme scolaire)
        // mais dont les thèmes n'ont pas encore été intégrés.
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-msg';
        emptyMsg.innerText = t('themes.empty_themes');
        emptyMsg.style.gridColumn = '1 / -1';
        container.appendChild(emptyMsg);
    }

    themeList.forEach((theme, index) => {
        const card = createThemeCard(theme, () => {
            openThemeAt(selectedCategoryIndex, selectedSubcategoryIndex, index);
        });
        container.appendChild(card);
    });
    applyStagger(container);
}

// Liste des thèmes marqués en favoris, retrouvés à travers tout l'arbre bdd
// (catégories plates ou à sous-catégories), avec leur chemin d'accès exact.
function renderFavoritesThemes(container) {
    container.innerHTML = '';
    document.getElementById('theme-screen-title').innerText = t('themes.favorites_title');

    const favIds = favoritesLoad();
    const matches = [];
    bdd.forEach((cat, ci) => {
        (function walk(node, path) {
            if (node.subcategories) {
                node.subcategories.forEach((sub, idx) => walk(sub, [...path, idx]));
            } else {
                node.themes.forEach((theme, ti) => {
                    if (favIds.includes(theme.id)) matches.push({ theme, ci, si: path.length ? path : null, ti });
                });
            }
        })(cat, []);
    });

    if (matches.length === 0) {
        const msg = document.createElement('div');
        msg.className = 'empty-msg';
        msg.innerText = t('themes.favorites_empty');
        container.appendChild(msg);
        return;
    }

    matches.forEach(({ theme, ci, si, ti }) => {
        const card = createThemeCard(theme, () => {
            openThemeAt(ci, si, ti);
        }, { onFavoriteToggle: () => A11y.keepFocus(container, () => renderFavoritesThemes(container)) });
        container.appendChild(card);
    });
    applyStagger(container);
}

// Bascule entre les deux onglets de l'écran « Réviser » : Points faibles (par
// défaut) et Progression, en affichant/masquant leurs conteneurs respectifs.
function switchRevisionHubTab(tab) {
    document.querySelectorAll('#revision-hub-tabs button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === tab);
    });
    document.getElementById('revision-hub-due-container').classList.toggle('hidden', tab !== 'due');
    document.getElementById('revision-hub-weak-container').classList.toggle('hidden', tab !== 'weak');
    document.getElementById('revision-hub-progress-container').classList.toggle('hidden', tab !== 'progress');
    if (tab === 'progress') initProgress();
}

// Écran de choix affiché après avoir sélectionné « Réviser mes points faibles » :
// soit une session mélangée de taille choisie, soit la reprise d'un thème entier.
// Comporte aussi l'onglet Progression (radar + barres de maîtrise par thème).
// Onglet « À réviser » : ce qui est dû aujourd'hui, et à défaut ce qui arrive demain.
function renderDueTab() {
    const summary = getDueSummary();
    const subtitle = document.getElementById('revision-due-subtitle');
    const empty = document.getElementById('revision-due-empty');
    const content = document.getElementById('revision-due-content');
    if (summary.due === 0) {
        subtitle.innerText = '';
        empty.innerText = summary.tomorrow > 0
            ? t('revision.due_empty_tomorrow', { count: summary.tomorrow })
            : t('revision.due_empty');
        empty.classList.remove('hidden');
        content.classList.add('hidden');
        return;
    }
    empty.classList.add('hidden');
    content.classList.remove('hidden');
    subtitle.innerText = summary.overdue > 0
        ? t('revision.due_subtitle_overdue', { count: summary.due, overdue: summary.overdue })
        : t('revision.due_subtitle', { count: summary.due });
}

function initRevisionHub() {
    document.querySelectorAll('#revision-hub-tabs button').forEach(btn => {
        btn.onclick = () => switchRevisionHubTab(btn.dataset.value);
    });
    switchRevisionHubTab('due');
    renderDueTab();

    const weak = getWeakEvents();
    const weakThemes = getWeakThemes();

    document.getElementById('reset-srs-btn-hub').onclick = resetRevisionTracking;

    const subtitle = document.getElementById('revision-hub-subtitle');
    const emptyState = document.getElementById('revision-hub-empty');
    const content = document.getElementById('revision-hub-content');

    if (weak.length === 0) {
        subtitle.innerText = '';
        emptyState.classList.remove('hidden');
        content.classList.add('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    content.classList.remove('hidden');
    subtitle.innerText = t('revision.weak_count_subtitle', { count: weak.length, themeCount: weakThemes.length });

    const themesContainer = document.getElementById('revision-themes-container');
    themesContainer.innerHTML = '';
    weakThemes.forEach(({ theme, ci, si, ti, count }) => {
        const card = createThemeCard(theme, () => {
            openThemeAt(ci, si, ti);
        }, { badge: count });
        themesContainer.appendChild(card);
    });
    applyStagger(themesContainer);
}

// VERROUS DE MODE (Chrono / Expert) — recalculés à chaque ouverture de l'écran des modes
// Carte « Découverte » de l'écran des modes. Elle lance la frise, sauf pour
// un thème qui propose un sommaire : elle déplie alors le choix entre les
// deux, juste en dessous (voir js/mindMap.js: refreshDiscoveryPicker, qui
// renseigne data-available à chaque arrivée sur l'écran).
// Groupes repliables de l'écran des modes (voir index.html : .modes-group). Ouverts par défaut :
// tout reste visible tant que le joueur n'a rien replié, et son choix est retenu.
function initModesGroups() {
    const state = modesGroupsLoad();
    document.querySelectorAll('.modes-group[data-group]').forEach(section => {
        const key = section.dataset.group;
        const head = section.querySelector('.modes-group-head');
        const apply = collapsed => {
            section.classList.toggle('collapsed', collapsed);
            head.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        };
        apply(!!state[key]);
        head.onclick = () => {
            const collapsed = !section.classList.contains('collapsed');
            apply(collapsed);
            const saved = modesGroupsLoad();
            saved[key] = collapsed;
            modesGroupsSave(saved);
        };
    });
}

// « Reprendre » : un tap pour retrouver le dernier thème ouvert, au lieu de refaire six écrans.
function renderResumeCard(container) {
    // Le Chemin du Temps passe avant « Reprendre » : c'est le parcours proposé à tous.
    if (typeof renderPathCard === 'function' && typeof PathCore !== 'undefined') renderPathCard(container);
    const last = lastThemeLoad();
    if (!last || !last.themeId) return;
    const found = getAllThemesWithPath().find(item => item.theme.id === last.themeId);
    if (!found) return;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'resume-card';
    card.id = 'btn-resume';
    const sub = found.pathNames.slice(1).join(' › ');
    card.innerHTML = `
        <span class="resume-card-icon" aria-hidden="true">▶</span>
        <span class="resume-card-text">
            <small class="resume-card-kicker">${t('categories.resume')}</small>
            <strong class="resume-card-title"></strong>
            <small class="resume-card-path"></small>
        </span>`;
    card.querySelector('.resume-card-title').textContent = found.theme.nom;
    card.querySelector('.resume-card-path').textContent = sub;
    card.onclick = () => openThemeAt(found.ci, found.si, found.ti);
    container.appendChild(card);
}

function openDiscoveryMode() {
    const picker = document.getElementById('discovery-picker');
    if (picker && picker.dataset.available === 'yes') {
        picker.classList.toggle('hidden');
        return;
    }
    startActualGame('discovery');
}

function updateModeLocks() {
    // La session de révision traverse plusieurs thèmes : la notion de progression
    // « par thème » ne s'y applique pas, tous les modes y restent donc accessibles.
    let chronoUnlocked = true;
    let expertUnlocked = true;

    if (!revisionMode) {
        const theme = getCurrentTheme();
        chronoUnlocked = isChronoUnlocked(theme.id);
        expertUnlocked = chronoUnlocked && isExpertUnlocked(theme.id);
    }

    renderModeCard('mode-card-chrono', 'chrono', chronoUnlocked,
        t('modes.chrono.title'), t('modes.chrono.desc'),
        t('modes.chrono_lock'));

    renderModeCard('mode-card-expert', 'expert', expertUnlocked,
        t('modes.expert.title'), t('modes.expert.desc'),
        t('modes.expert_lock'));
}

function renderModeCard(cardId, mode, unlocked, title, description, lockMessage) {
    const card = document.getElementById(cardId);
    card.classList.toggle('locked', !unlocked);
    // Verrouillée, la carte reste atteignable et activable (le clic explique ce
    // qui la débloquera) mais s'annonce comme indisponible.
    if (unlocked) card.removeAttribute('aria-disabled');
    else card.setAttribute('aria-disabled', 'true');
    if (unlocked) {
        card.innerHTML = `<h3>${title}</h3><p>${description}</p>`;
        card.onclick = () => startActualGame(mode);
    } else {
        card.innerHTML = `<h3><span class="mode-lock-icon" aria-hidden="true">🔒</span>${title}</h3><p class="mode-unlock-hint">${lockMessage}</p>`;
        card.onclick = () => showConfirm(lockMessage, null, { alertOnly: true });
    }
}


