// Extrait de l'ancien js/app.js — Écrans des catégories et des sous-catégories.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// INIT CATÉGORIES (Dossiers)
function initCategories() {
    updateHeaderProfileBar();
    clearThemeSearch();
    const container = document.getElementById('categories-container');
    if (!container) return;
    container.innerHTML = '';
    container.className = 'w-full max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop space-y-lg md:space-y-xl mt-sm md:mt-xl pb-32';

    const currentBdd = window.bdd || bdd || [];
    const nonCustomCategories = currentBdd.filter(c => c && !c.isCustomCategory);

    // Si la base de données est en cours de téléchargement, afficher un indicateur de chargement propre
    if (nonCustomCategories.length === 0 && typeof i18n !== 'undefined' && i18n.isLoading) {
        const loadingBox = document.createElement('div');
        loadingBox.className = 'flex flex-col items-center justify-center p-8 text-center';
        loadingBox.style.padding = '60px 20px';
        loadingBox.style.textAlign = 'center';
        loadingBox.innerHTML = `
                    <div style="font-size: 40px; margin-bottom: 16px; animation: spin 2s linear infinite;">⏳</div>
                    <h3 style="font-size: 20px; font-weight: 700; color: var(--primary-blue, #001a4b); margin-bottom: 8px;">${t('themes.loading_title')}</h3>
                    <p style="color: var(--text-muted, #64748b); font-size: 14px; max-width: 400px; margin: 0 auto;">${t('themes.loading_subtitle', { events: '16 664', themes: '646' })}</p>
                `;
        container.appendChild(loadingBox);
        return;
    }

    // « Réviser (n) » : n = ce qui est dû AUJOURD'HUI (js/srs.js), pas la liste des points faibles.
    const weakCount = (typeof getDueSummary === 'function') ? getDueSummary().due : 0;
    const favCount = (typeof favoritesLoad === 'function') ? favoritesLoad().length : 0;

    renderResumeCard(container);

    // --- QUICK ACTION GRID ---
    const gridSection = document.createElement('section');
    gridSection.className = 'w-full';
    gridSection.style.marginTop = '24px';
    gridSection.innerHTML = `
                <div class="grid grid-cols-4 gap-sm md:gap-md" style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; text-align: center;">
                    <div class="flex flex-col items-center gap-2" id="btn-favoris" style="cursor: pointer;" role="button" tabindex="0">
                        <div class="quick-action-circle rounded-full flex items-center justify-center transition-colors cursor-pointer group mx-auto" style="border-radius: 50%; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: var(--surface); border: 1px solid var(--border-soft); box-shadow: var(--card-shadow);">
                            <span style="font-size: 28px;">⭐</span>
                        </div>
                        <span class="quick-action-label" style="font-size: 13px; font-weight: 600;">${(typeof t === 'function' ? t('categories.special_favorites') : 'Favoris')} (${favCount})</span>
                    </div>
                    <div class="flex flex-col items-center gap-2" id="btn-discover" style="cursor: pointer;" role="button" tabindex="0" aria-expanded="false" aria-controls="discover-picker">
                        <div class="quick-action-circle rounded-full flex items-center justify-center transition-colors cursor-pointer group mx-auto" style="border-radius: 50%; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: var(--surface); border: 1px solid var(--border-soft); box-shadow: var(--card-shadow);">
                            <span style="font-size: 28px;">🎲</span>
                        </div>
                        <span class="quick-action-label" style="font-size: 13px; font-weight: 600;">${(typeof t === 'function' ? t('categories.special_discover') : 'Hasard')}</span>
                    </div>
                    <div class="flex flex-col items-center gap-2" id="btn-daily" style="cursor: pointer;" role="button" tabindex="0" aria-expanded="false" aria-controls="challenge-picker">
                        <div class="quick-action-circle rounded-full flex items-center justify-center transition-colors cursor-pointer group mx-auto" style="border-radius: 50%; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: var(--surface); border: 1px solid var(--border-soft); box-shadow: var(--card-shadow);">
                            <span style="font-size: 28px;">🎯</span>
                        </div>
                        <span class="quick-action-label" style="font-size: 13px; font-weight: 600;">${(typeof t === 'function' ? t('categories.special_challenges') : 'Défis')}</span>
                    </div>
                    <div class="flex flex-col items-center gap-2" id="btn-reviser" style="cursor: pointer;" role="button" tabindex="0">
                        <div class="quick-action-circle rounded-full flex items-center justify-center transition-colors cursor-pointer group mx-auto" style="border-radius: 50%; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: var(--surface); border: 1px solid var(--border-soft); box-shadow: var(--card-shadow);">
                            <span style="font-size: 28px;">🧠</span>
                        </div>
                        <span class="quick-action-label" style="font-size: 13px; font-weight: 600;">${(typeof t === 'function' ? t('categories.special_revision') : 'Réviser')} (${weakCount})</span>
                    </div>
                    <div class="flex flex-col items-center gap-2" id="btn-atlas" style="cursor: pointer;" role="button" tabindex="0">
                        <div class="quick-action-circle rounded-full flex items-center justify-center transition-colors cursor-pointer group mx-auto" style="border-radius: 50%; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: var(--surface); border: 1px solid var(--border-soft); box-shadow: var(--card-shadow);">
                            <span style="font-size: 28px;">🗺️</span>
                        </div>
                        <span class="quick-action-label" style="font-size: 13px; font-weight: 600;">${(typeof t === 'function' ? t('categories.special_atlas') : 'Atlas')}</span>
                    </div>
                </div>
                <div class="challenge-picker hidden" id="discover-picker">
                    <button type="button" class="challenge-picker-btn" id="btn-discover-event">
                        <span class="challenge-picker-icon" aria-hidden="true">🕰️</span>
                        <span>${t('categories.discover_event')}</span>
                    </button>
                    <button type="button" class="challenge-picker-btn" id="btn-discover-person">
                        <span class="challenge-picker-icon" aria-hidden="true">👤</span>
                        <span>${t('categories.discover_person')}</span>
                    </button>
                </div>
                <div class="challenge-picker hidden" id="challenge-picker">
                    <button type="button" class="challenge-picker-btn" id="btn-challenge-daily">
                        <span class="challenge-picker-icon">☀️</span>
                        <span>${(typeof t === 'function' ? t('categories.special_daily') : 'Défi du jour')}</span>
                    </button>
                    <button type="button" class="challenge-picker-btn" id="btn-challenge-weekly">
                        <span class="challenge-picker-icon">🗓️</span>
                        <span>${(typeof t === 'function' ? t('categories.special_weekly') : 'Défi hebdomadaire')}</span>
                    </button>
                    <button type="button" class="challenge-picker-btn" id="btn-challenge-simul">
                        <span class="challenge-picker-icon">🌍</span>
                        <span>${(typeof t === 'function' ? t('simultaneity.challenge_title') : 'Défi de simultanéité')}</span>
                    </button>
                    <button type="button" class="challenge-picker-btn" id="btn-challenge-class">
                        <span class="challenge-picker-icon" aria-hidden="true">🏫</span>
                        <span>${t('classroom.join_entry')}</span>
                    </button>
                    <button type="button" class="challenge-picker-btn portrait-day-btn hidden" id="btn-challenge-portrait">
                        <span class="challenge-picker-icon" aria-hidden="true">🖼️</span>
                        <span class="portrait-day-text">
                            <span class="portrait-day-title">${t('whois.daily_title')}</span>
                            <small class="portrait-day-status" id="portrait-day-status"></small>
                        </span>
                    </button>
                </div>
            `;
    container.appendChild(gridSection);

    const btnAtlas = gridSection.querySelector('#btn-atlas');
    if (btnAtlas) btnAtlas.onclick = () => showScreen('screen-atlas', 'forward');
    const btnFav = gridSection.querySelector('#btn-favoris');
    if (btnFav) btnFav.onclick = () => openFavorites();
    const btnDisc = gridSection.querySelector('#btn-discover');
    // « Découvrir » propose un événement ou un personnage, sous forme de deux boutons dépliés sous la grille
    // (comme « Défis »). Sans aucun portrait dans la base (pack sans panthéons), il n'y a pas de choix à
    // offrir : il pioche un événement directement, comme avant.
    const discoverPicker = gridSection.querySelector('#discover-picker');
    const challengePickerEl = gridSection.querySelector('#challenge-picker');
    if (btnDisc && discoverPicker) {
        btnDisc.onclick = () => {
            if (getDiscoverablePortraits().length === 0) { discoverRandomEvent(); return; }
            const nowOpen = discoverPicker.classList.toggle('hidden') === false;
            btnDisc.setAttribute('aria-expanded', String(nowOpen));
            // Un seul volet à la fois : « Défis » se referme.
            if (nowOpen && challengePickerEl) {
                challengePickerEl.classList.add('hidden');
                const btnDaily = gridSection.querySelector('#btn-daily');
                if (btnDaily) btnDaily.setAttribute('aria-expanded', 'false');
            }
        };
        gridSection.querySelector('#btn-discover-event').onclick = () => discoverRandomEvent();
        gridSection.querySelector('#btn-discover-person').onclick = () => discoverRandomPortrait();
    }
    // Le bouton « Défis » ne lance plus directement le Défi du jour : il
    // déplie/replie un choix entre Défi du jour et Défi hebdomadaire, sous
    // forme de deux boutons côte à côte sous la grille (voir #challenge-picker
    // en CSS).
    const btnDay = gridSection.querySelector('#btn-daily');
    const challengePicker = gridSection.querySelector('#challenge-picker');
    if (btnDay && challengePicker) {
        btnDay.onclick = () => {
            const nowOpen = challengePicker.classList.toggle('hidden') === false;
            btnDay.setAttribute('aria-expanded', String(nowOpen));
            if (nowOpen && discoverPicker) {
                discoverPicker.classList.add('hidden');
                if (btnDisc) btnDisc.setAttribute('aria-expanded', 'false');
            }
        };
    }
    const btnChallengeDaily = gridSection.querySelector('#btn-challenge-daily');
    if (btnChallengeDaily) btnChallengeDaily.onclick = () => startDailyChallenge();
    const btnChallengeWeekly = gridSection.querySelector('#btn-challenge-weekly');
    if (btnChallengeWeekly) btnChallengeWeekly.onclick = () => startWeeklyChallenge();
    // Le Défi de simultanéité reste VISIBLE tant qu'il est verrouillé, avec
    // sa condition d'ouverture au clic, plutôt que caché : un mode qu'on ne
    // voit pas ne donne envie de rien (même parti pris que les verrous
    // Chrono/Expert, voir renderModeCard).
    const btnChallengeSimul = gridSection.querySelector('#btn-challenge-simul');
    if (btnChallengeSimul) {
        const simulLocked = !getSimultaneityChallengeStatus().unlocked;
        btnChallengeSimul.classList.toggle('locked', simulLocked);
        // Toujours activable (le clic explique ce qui l'ouvrira), mais annoncé
        // comme indisponible plutôt que comme un bouton ordinaire.
        btnChallengeSimul.setAttribute('aria-disabled', String(simulLocked));
        btnChallengeSimul.onclick = () => startSimultaneityChallenge();
    }
    const btnChallengeClass = gridSection.querySelector('#btn-challenge-class');
    if (btnChallengeClass) btnChallengeClass.onclick = () => openClassJoin();
    // Portrait du jour : un compagnon non classé du Défi du jour, qui n'apparaît que si la base a des portraits.
    const btnPortrait = gridSection.querySelector('#btn-challenge-portrait');
    if (btnPortrait) {
        btnPortrait.onclick = () => startPortraitOfTheDay();
        refreshPortraitDayButton(btnPortrait);
    }
    const btnRev = gridSection.querySelector('#btn-reviser');
    if (btnRev) btnRev.onclick = () => showScreen('screen-revision-hub');

    // --- BROWSE ARCHIVES (Categories) ---
    const catSection = document.createElement('section');
    catSection.className = 'w-full pb-xl';
    catSection.style.paddingBottom = '80px';
    const catGrid = document.createElement('div');
    catGrid.id = 'cat-grid';
    catGrid.style.display = 'grid';
    catGrid.style.gridTemplateColumns = (typeof window !== 'undefined' && window.innerWidth >= 768) ? 'repeat(3, minmax(0, 1fr))' : 'repeat(1, minmax(0, 1fr))';
    catGrid.style.gap = '16px';
    catGrid.style.marginTop = '32px';
    catSection.appendChild(catGrid);
    container.appendChild(catSection);

    currentBdd.forEach((cat, index) => {
        let bgImg = 'assets/images/cat_culture_generale.webp';
        if (cat.nom.toLowerCase().includes('culture')) bgImg = 'assets/images/cat_culture_generale.webp';
        if (cat.nom.toLowerCase().includes('bio') || cat.nom.toLowerCase().includes('illustres')) bgImg = 'assets/images/cat_biographies.webp';
        if (cat.nom.toLowerCase().includes('nationale')) bgImg = 'assets/images/cat_histoires_nationales.webp';
        if (cat.nom.toLowerCase().includes('programmes')) bgImg = 'assets/images/cat_programmes_scolaires.webp';
        if (cat.nom.toLowerCase().includes('capes') || cat.nom.toLowerCase().includes('agrég')) bgImg = 'assets/images/cat_agregation.webp';
        if (cat.isCustomCategory || cat.nom.toLowerCase().includes('personnalisé')) bgImg = 'assets/images/cat_themes_personnalises.webp';

        const card = document.createElement('div');
        card.className = 'relative h-32 md:h-40 rounded-[24px] overflow-hidden group cursor-pointer shadow-executive';
        card.style.height = '140px';
        card.style.borderRadius = '24px';
        card.style.overflow = 'hidden';
        card.style.position = 'relative';
        card.style.boxShadow = '0px 10px 30px rgba(0, 26, 75, 0.05)';
        card.style.marginBottom = '12px';
        card.style.cursor = 'pointer';

        card.innerHTML = `
                    <div class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style="background-image: url('${bgImg}'); background-color: var(--primary-blue, #001a4b); position: absolute; inset: 0;"></div>
                    <div class="category-card-veil"></div>
                    <div class="absolute bottom-0 left-0 p-md w-full" style="position: absolute; bottom: 0; left: 0; padding: 16px;">
                        <h4 class="font-headline-md text-on-primary" style="color: white; font-weight: 700; font-size: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${cat.nom}</h4>
                        <p class="font-label-sm text-primary-fixed-dim mt-xs" style="color: #fff; font-size: 12px; margin-top: 4px; text-shadow: 0 1px 4px rgba(0,0,0,0.7);">${cat.subcategories ? t('themes.subcategories_count', { count: cat.subcategories.length }) : (cat.isCustomCategory ? t('themes.your_themes') : t('themes.select_cta'))}</p>
                    </div>
                `;
        card.onclick = () => {
            selectedCategoryIndex = index;
            selectedSubcategoryIndex = cat.subcategories ? [] : null;

            if (cat.nom === "CAPES & Agrégation" || cat.isCustomCategory) {
                showScreen('screen-themes', 'forward');
            } else {
                showScreen('screen-subcategories', 'forward');
                // Première ouverture de « Personnages illustres » : on demande si les portraits
                // se collectionnent (voir js/gallery.js).
                maybeAskPortraitCollection(cat);
            }
        };
        A11y.activatable(card);
        catGrid.appendChild(card);
    });
    applyStagger(catGrid);
}

// INIT SOUS-CATÉGORIES (régions, niveaux scolaires, etc. — potentiellement imbriquées)
function initSubcategories() {
    const container = document.getElementById('subcategories-container');
    container.innerHTML = '';

    // Appliquer le style conteneur Tailwind (similaire à l'accueil)
    container.className = 'w-full max-w-7xl mx-auto space-y-lg md:space-y-xl mt-sm md:mt-xl pb-32';

    const category = bdd[selectedCategoryIndex];
    let node = resolveSubcategory(category, selectedSubcategoryIndex);
    if (!node || !node.subcategories) {
        // Chemin invalide (ex. navigation corrompue par un double-tap) : on revient
        // à la racine des sous-catégories plutôt que de planter sur cet écran.
        selectedSubcategoryIndex = [];
        node = category;
    }
    // Figé au moment du rendu : les cartes ci-dessous appendent toujours à CE chemin,
    // jamais à `selectedSubcategoryIndex` (qui peut déjà avoir changé si une autre
    // carte de cet écran a été touchée avant que la navigation précédente n'ait eu le
    // temps de basculer d'écran — double-tap, ou deux cartes cliquées coup sur coup).
    const basePath = selectedSubcategoryIndex;

    // Update Header title style
    const titleEl = document.getElementById('subcategory-screen-title');
    titleEl.innerText = node.nom;
    titleEl.style.fontWeight = '700';
    titleEl.style.fontSize = '24px';
    titleEl.style.color = 'var(--text-dark)';
    titleEl.style.textAlign = 'center';
    titleEl.style.marginBottom = '24px';

    // La note est celle du nœud AFFICHÉ, à n'importe quelle profondeur : au
    // sommet c'est celle de la catégorie (node === category), plus bas celle de
    // la sous-catégorie ouverte. Elle ne se limitait autrefois qu'au sommet, ce
    // qui aurait fait disparaître l'explication d'une sous-catégorie qui porte
    // elle-même des sous-catégories (« Personnages illustres > Biographies »).
    const noteBox = document.getElementById('subcategory-note');
    if (node.note) {
        document.getElementById('subcategory-note-text').innerText = node.note;
        noteBox.classList.remove('hidden');
    } else {
        noteBox.classList.add('hidden');
    }

    // Grille pour les sous-catégories
    const gridSection = document.createElement('div');
    gridSection.className = 'grid grid-cols-1 md:grid-cols-3 gap-sm md:gap-md';
    gridSection.style.display = 'grid';
    gridSection.style.gap = '16px';
    if (window.innerWidth >= 768) {
        gridSection.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
    }
    container.appendChild(gridSection);

    // Mode Carte (voir js/geoMap.js) : accessible dès que cette zone contient
    // assez d'événements géolocalisables, quel que soit le niveau de la
    // hiérarchie régionale où l'on se trouve (monde entier, un continent, ou
    // une sous-région) — c'est ce nœud qui devient le périmètre de la partie.
    if (typeof isGeoEligible === 'function' && isGeoEligible(node)) {
        gridSection.appendChild(buildGeoModeCard(node, node.nom));
        gridSection.appendChild(buildChronoGeoCard(node, node.nom));
    }

    node.subcategories.forEach((sub, index) => {
        const nbThemes = countThemesRecursive(sub);
        let textThemes = nbThemes === 0 ? t('themes.soon_available') : t('categories.themes_count', { count: nbThemes });

        let bgImg = 'assets/images/cat_culture_generale.webp'; // default fallback
        const nomLower = sub.nom.toLowerCase();

        // Mappings for available images
        // « Personnages illustres » d'abord : « Panthéons » contient « panth »,
        // que la règle des mythologies (plus bas) lui volerait. Égalité stricte,
        // et non `includes` : « Mythologies et panthéons antiques » doit garder
        // sa propre image.
        if (nomLower === 'panthéons' || nomLower === 'pantheons') bgImg = 'assets/images/sub_themes_generaux.webp';
        else if (nomLower === 'biographies') bgImg = 'assets/images/cat_biographies.webp';
        else if (nomLower.includes('europe')) bgImg = 'assets/images/sub_europe.webp';
        else if (nomLower.includes('amérique')) bgImg = 'assets/images/sub_ameriques.webp';
        else if (nomLower.includes('asie')) bgImg = 'assets/images/sub_asie.webp';
        else if (nomLower.includes('moyen-orient')) bgImg = 'assets/images/sub_moyen_orient.webp';
        else if (nomLower.includes('afrique')) bgImg = 'assets/images/sub_afrique.webp';
        else if (nomLower.includes('océanie')) bgImg = 'assets/images/sub_oceanie.webp';
        else if (nomLower.includes('empires')) bgImg = 'assets/images/sub_empires.webp';
        else if (nomLower.includes('sciences')) bgImg = 'assets/images/sub_sciences_techniques.webp';
        else if (nomLower.includes('arts') || nomLower.includes('spectacle')) bgImg = 'assets/images/sub_arts_litterature.webp';
        else if (nomLower.includes('juda')) bgImg = 'assets/images/sub_judaisme.webp';
        else if (nomLower.includes('islam')) bgImg = 'assets/images/sub_islam.webp';
        else if (nomLower.includes('christianisme')) bgImg = 'assets/images/sub_christianisme.webp';
        else if (nomLower.includes('hindouisme')) bgImg = 'assets/images/sub_hindouisme.webp';
        else if (nomLower.includes('bouddhisme')) bgImg = 'assets/images/sub_bouddhisme.webp';
        else if (nomLower.includes('panth')) bgImg = 'assets/images/sub_mythologies.webp';
        else if (nomLower.includes('grandes religions')) bgImg = 'assets/images/sub_grandes_religions.webp';
        else if (nomLower.includes('religions') || nomLower.includes('croyances')) bgImg = 'assets/images/sub_religions_croyances.webp';
        else if (nomLower.includes('société') || nomLower.includes('societe') || nomLower.includes('géopolitique') || nomLower.includes('geopolitique') || nomLower.includes('généraux')) bgImg = 'assets/images/sub_themes_generaux.webp';
        else if (nomLower.includes('rois, reines')) bgImg = 'assets/images/sub_rois_reines.webp';
        else if (nomLower.includes('chefs militaires')) bgImg = 'assets/images/sub_chefs_militaires.webp';
        else if (nomLower.includes('savants, scientifiques')) bgImg = 'assets/images/sub_savants_scientifiques.webp';
        else if (nomLower.includes('philosophes et penseurs')) bgImg = 'assets/images/sub_philosophes_penseurs.webp';
        else if (nomLower.includes('crivains et po')) bgImg = 'assets/images/sub_ecrivains_poetes.webp';
        else if (nomLower.includes('artistes et musiciens')) bgImg = 'assets/images/sub_artistes_musiciens.webp';
        else if (nomLower.includes('explorateurs et grands voyageurs')) bgImg = 'assets/images/sub_explorateurs_voyageurs.webp';
        else if (nomLower.includes('figures religieuses')) bgImg = 'assets/images/sub_figures_religieuses.webp';
        else if (nomLower.includes('militants, r')) bgImg = 'assets/images/sub_militants_resistants.webp';
        else if (nomLower.includes('acteurs, chanteurs')) bgImg = 'assets/images/sub_acteurs_chanteurs.webp';
        else if (nomLower.includes('architectes, designers')) bgImg = 'assets/images/sub_architectes_designers.webp';
        else if (nomLower.includes('entrepreneurs et magnats')) bgImg = 'assets/images/sub_entrepreneurs_magnats.webp';
        else if (nomLower.includes('sportifs et ath')) bgImg = 'assets/images/sub_sportifs_athletes.webp';
        else if (nomLower.includes('collège') || node.nom.toLowerCase().includes('collège')) bgImg = 'assets/images/sub_programmes_college.webp';
        else if (nomLower.includes('lycée') || node.nom.toLowerCase().includes('lycée')) bgImg = 'assets/images/sub_programmes_lycee.webp';
        else if (category.nom.toLowerCase().includes('scolaire')) bgImg = 'assets/images/cat_programmes_scolaires.webp';
        else if (category.nom.toLowerCase().includes('bio')) bgImg = 'assets/images/cat_biographies.webp';
        else if (category.nom.toLowerCase().includes('capes') || category.nom.toLowerCase().includes('agrég')) bgImg = 'assets/images/cat_agregation.webp';
        else if (category.nom.toLowerCase().includes('nationale')) bgImg = 'assets/images/cat_histoires_nationales.webp';

        const card = document.createElement('div');
        card.className = 'relative h-32 md:h-40 rounded-[24px] overflow-hidden group cursor-pointer shadow-executive';
        card.style.height = '140px';
        card.style.borderRadius = '24px';
        card.style.overflow = 'hidden';
        card.style.position = 'relative';
        card.style.boxShadow = '0px 10px 30px rgba(0, 26, 75, 0.05)';
        card.style.marginBottom = '12px';

        // Handle missing image loading fallback
        card.innerHTML = `
                    <div class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style="background-image: url('${bgImg}'); background-color: var(--primary-blue); position: absolute; inset: 0;"></div>
                    <div class="category-card-veil"></div>
                    <div class="absolute bottom-0 left-0 p-md w-full" style="position: absolute; bottom: 0; left: 0; padding: 16px;">
                        <h4 class="font-headline-md text-on-primary" style="color: white; font-weight: 700; font-size: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${sub.nom}</h4>
                        <p class="font-label-sm text-primary-fixed-dim mt-xs" style="color: #fff; font-size: 12px; margin-top: 4px; text-shadow: 0 1px 4px rgba(0,0,0,0.7);">${textThemes}</p>
                    </div>
                `;

        const canEnter = nbThemes > 0 || !!sub.subcategories || !!sub.note;
        card.onclick = () => {
            if (canEnter) {
                selectedSubcategoryIndex = [...basePath, index];
                showScreen(sub.subcategories ? 'screen-subcategories' : 'screen-themes', 'forward');
            }
        };
        // Une carte sans thème ni sous-niveau n'ouvre rien : elle reste
        // atteignable (on peut y lire son nom) mais se déclare indisponible.
        A11y.activatable(card, { disabled: !canEnter });
        gridSection.appendChild(card);
    });
    applyStagger(gridSection);

    // Galerie des portraits (voir js/gallery.js) : sous la grille, et non dans
    // elle, parce qu'elle n'est ni une sous-catégorie ni un mode de jeu. Elle
    // n'apparaît qu'au niveau qui porte les « Panthéons ».
    const pantheon = typeof findPantheonNode === 'function' ? findPantheonNode(node) : null;
    const launcher = pantheon ? buildGalleryLauncher(pantheon) : null;
    if (launcher) container.appendChild(launcher);
}


// Construit une carte-thème standard (titre, étoile de favori, chevron). Partagée
// entre la liste de thèmes normale et la liste des favoris, qui ne diffèrent que
// par la provenance des thèmes affichés et par ce qui se passe au clic.
function createThemeCard(theme, onOpen, opts = {}) {
    const card = document.createElement('div');
    card.className = 'data-card';
    const fav = isFavorite(theme.id);
    const badgeHtml = opts.badge != null ? `<span class="data-card-badge">${opts.badge}</span>` : '';
    const deleteHtml = theme.isCustom ? `<span class="data-card-delete" role="button" tabindex="0" title="${t('themes.delete_theme_title')}">🗑️</span>` : '';
    // Trois contrôles FRÈRES, et non une carte focalisable qui en contiendrait
    // deux autres : un rôle `button` ne doit pas en contenir un second, les
    // lecteurs d'écran n'exposent alors pas l'intérieur. Le titre est le
    // contrôle principal (Entrée l'ouvre, le clic remonte à la carte), l'étoile
    // et la corbeille les secondaires. La carte garde son clic à la souris et
    // se déclare `data-kbd-proxy` : son équivalent clavier est son titre.
    card.innerHTML = `
                <span class="data-card-title" role="button" tabindex="0">${theme.nom}</span>
                ${badgeHtml}
                ${deleteHtml}
                <span class="data-card-fav ${fav ? 'is-fav' : ''}" role="button" tabindex="0" aria-pressed="${fav}" title="${fav ? t('themes.remove_favorite') : t('themes.add_favorite')}">${fav ? '★' : '☆'}</span>
                <span class="data-card-icon" aria-hidden="true">›</span>
            `;
    card.dataset.kbdProxy = 'title';
    card.onclick = onOpen;
    // Étoile et corbeille répondent à « de quel thème ? » : dans une liste de
    // cinquante cartes, « Ajouter aux favoris » seul ne dit rien. Posé par
    // setAttribute et non dans le gabarit : un nom de thème personnalisé peut
    // contenir un guillemet, qui casserait l'attribut.
    const favLabel = isFav => `${isFav ? t('themes.remove_favorite') : t('themes.add_favorite')} — ${theme.nom}`;
    card.querySelector('.data-card-fav').setAttribute('aria-label', favLabel(fav));
    const delEl = card.querySelector('.data-card-delete');
    if (delEl) delEl.setAttribute('aria-label', `${t('themes.delete_theme_title')} — ${theme.nom}`);
    if (theme.isCustom) {
        const delBtn = card.querySelector('.data-card-delete');
        if (delBtn) {
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deleteCustomTheme(theme.id);
            };
        }
    }
    const favBtn = card.querySelector('.data-card-fav');
    favBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFavoriteStorage(theme.id);
        if (opts.onFavoriteToggle) {
            opts.onFavoriteToggle();
        } else {
            const nowFav = isFavorite(theme.id);
            favBtn.classList.toggle('is-fav', nowFav);
            favBtn.innerText = nowFav ? '★' : '☆';
            favBtn.title = nowFav ? t('themes.remove_favorite') : t('themes.add_favorite');
            favBtn.setAttribute('aria-pressed', String(nowFav));
            favBtn.setAttribute('aria-label', favLabel(nowFav));
        }
    };
    return card;
}

