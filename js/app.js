
function formatEventDuration(evt) {
    if (!evt || evt.dateFin == null || evt.dateFin === evt.date) return null;
    const diff = Math.abs(evt.dateFin - evt.date);
    if (diff === 1) return "1 an";
    if (diff > 1) return `${diff} ans`;
    return null;
}


function toRoman(num) {
    if (!num || num <= 0) return '';
    const lookup = [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
        [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let roman = '';
    for (const [val, str] of lookup) {
        while (num >= val) {
            roman += str;
            num -= val;
        }
    }
    return roman;
}

function getCenturyLabel(year) {
    if (year == null) return '';
    if (year < 0) {
        const c = Math.ceil(Math.abs(year) / 100);
        return c === 1 ? 'Ier siècle av. J.-C.' : `${toRoman(c)}e siècle av. J.-C.`;
    } else {
        const c = Math.ceil((year === 0 ? 1 : year) / 100);
        return c === 1 ? 'Ier siècle' : `${toRoman(c)}e siècle`;
    }
}

function getPeriodSliceLabel(year, span) {
    const step = (span > 300) ? 100 : ((span <= 60) ? 10 : ((span <= 150) ? 25 : 50));
    const start = Math.floor(year / step) * step;
    if (step === 10 && start >= 1000) {
        return `Années ${start}`;
    }
    const end = start + step;
    return `${formatYear(start)} – ${formatYear(end)}`;
}


function formatYear(year) {
    if (year === null || year === undefined || isNaN(year)) return '';
    const num = Number(year);
    if (num < 0) {
        return `${Math.abs(num)} av. J.-C.`;
    }
    return `${num}`;
}

function formatEventDate(evt) {
    if (!evt) return '';
    if (evt.datePrecise) return evt.datePrecise;
    return formatYear(evt.date);
}


        function openSettings() {
            if (typeof triggerHaptic === 'function') triggerHaptic('light');
            renderSettingsUI();
            const modal = document.getElementById('modal-settings');
            if (modal) modal.classList.remove('hidden');
        }

        function closeSettings() {
            const modal = document.getElementById('modal-settings');
            if (modal) modal.classList.add('hidden');
        }
    
let appSettings = settingsLoad();

        const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const systemLandscapeQuery = window.matchMedia('(orientation: landscape)');

        function applyAppearance() {
            let isDark;
            if (appSettings.appearance === 'dark') isDark = true;
            else if (appSettings.appearance === 'light') isDark = false;
            else isDark = systemDarkQuery.matches;
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        }

        function applyOrientationLayout() {
            let isLandscape;
            if (appSettings.orientation === 'horizontal') isLandscape = true;
            else if (appSettings.orientation === 'vertical') isLandscape = false;
            else isLandscape = systemLandscapeQuery.matches;
            document.documentElement.setAttribute('data-timeline-layout', isLandscape ? 'horizontal' : 'vertical');
            if (typeof repositionEvents === 'function' && placedEvents && placedEvents.length > 0) {
                repositionEvents();
            }
        }

        function renderSettingsUI() {
            document.querySelectorAll('#settings-orientation button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.value === appSettings.orientation);
            });
            document.querySelectorAll('#settings-appearance button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.value === appSettings.appearance);
            });
            document.querySelectorAll('#settings-sound button').forEach(btn => {
                btn.classList.toggle('active', (btn.dataset.value === 'on') === appSettings.sound);
            });
            document.querySelectorAll('#settings-haptics button').forEach(btn => {
                btn.classList.toggle('active', (btn.dataset.value === 'on') === appSettings.haptics);
            });
            if (typeof i18n !== 'undefined' && typeof i18n.renderLanguagePacksSettingsUI === 'function') {
                i18n.renderLanguagePacksSettingsUI();
            }
        }

        function initSettingsControls() {
            document.querySelectorAll('#settings-orientation button').forEach(btn => {
                btn.onclick = () => {
                    appSettings.orientation = btn.dataset.value;
                    settingsSave(appSettings);
                    applyOrientationLayout();
                    renderSettingsUI();
                };
            });
            document.querySelectorAll('#settings-appearance button').forEach(btn => {
                btn.onclick = () => {
                    appSettings.appearance = btn.dataset.value;
                    settingsSave(appSettings);
                    applyAppearance();
                    renderSettingsUI();
                };
            });
            document.querySelectorAll('#settings-sound button').forEach(btn => {
                btn.onclick = () => {
                    appSettings.sound = (btn.dataset.value === 'on');
                    settingsSave(appSettings);
                    if (appSettings.sound) playCorrectSound(1.0);
                    renderSettingsUI();
                };
            });
            document.querySelectorAll('#settings-haptics button').forEach(btn => {
                btn.onclick = () => {
                    appSettings.haptics = (btn.dataset.value === 'on');
                    settingsSave(appSettings);
                    if (appSettings.haptics) triggerHaptic('success');
                    renderSettingsUI();
                };
            });
        }
    
// =========================================================================
// === HISTORIAXE — CONTRÔLEUR PRINCIPAL & MOTEURS DE JEU (APP.JS) ===
// =========================================================================

// =========================================================================
// =========================================================================
// =========================================================================
// === HISTORIAXE — GESTION DE LA BDD ET CATÉGORIE PERSONNALISÉE ===
// =========================================================================

if (typeof window.bdd === 'undefined') {
    window.bdd = [];
}
var bdd = window.bdd;

function getBdd() {
    return (window.bdd && window.bdd.length > 0) ? window.bdd : (bdd || []);
}

const customCategory = {
    nom: "🎨 Mes thèmes personnalisés",
    isCustomCategory: true,
    themes: []
};

function getAllEvents() {
    const all = [];
    const currentBdd = window.bdd || bdd || [];
    currentBdd.forEach(cat => {
        (function walk(node) {
            if (node.subcategories) {
                node.subcategories.forEach(walk);
            } else if (node.themes) {
                node.themes.forEach(thm => {
                    if (thm.events) thm.events.forEach(evt => all.push(evt));
                });
            } else if (node.events) {
                node.events.forEach(evt => all.push(evt));
            }
        })(cat);
    });
    return all;
}

function getAllEventsWithLocation() {
    const all = [];
    const currentBdd = window.bdd || bdd || [];
    currentBdd.forEach((cat, ci) => {
        (function walk(node, subcatPath) {
            if (node.subcategories) {
                node.subcategories.forEach((sub, si) => walk(sub, subcatPath.concat(si)));
            } else if (node.themes) {
                node.themes.forEach((thm, ti) => {
                    if (thm.events) {
                        thm.events.forEach((evt, ei) => {
                            all.push({
                                event: evt,
                                category: cat,
                                categoryIndex: ci,
                                subcategoryIndex: subcatPath,
                                theme: thm,
                                themeIndex: ti,
                                eventIndex: ei
                            });
                        });
                    }
                });
            }
        })(cat, []);
    });
    return all;
}

function ensureCustomCategoryInBdd() {
    const list = window.bdd || bdd || [];
    if (!list.some(c => c && c.isCustomCategory)) {
        list.push(customCategory);
    }
    window.bdd = list;
    bdd = list;
    loadCustomThemesIntoBdd();
}



// === THÈMES ET ÉVÉNEMENTS PERSONNALISÉS ===
        
        

        
        bdd.push(customCategory);

        function loadCustomThemesIntoBdd() {
            try {
                const stored = JSON.parse(localStorage.getItem(CUSTOM_THEMES_KEY)) || [];
                customCategory.themes = stored;
            } catch (e) {
                customCategory.themes = [];
            }
        }

        function saveCustomThemesToStorage() {
            try {
                localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customCategory.themes));
            } catch (e) {}
        }

        function openAddThemeModal() {
            document.getElementById('custom-theme-name').value = '';
            document.getElementById('custom-theme-diff').value = '';
            document.getElementById('modal-add-theme').classList.remove('hidden');
        }

        function closeAddThemeModal() {
            document.getElementById('modal-add-theme').classList.add('hidden');
        }

        function saveCustomTheme() {
            const name = document.getElementById('custom-theme-name').value.trim();
            const diff = document.getElementById('custom-theme-diff').value.trim() || 'Tous niveaux';

            if (!name) {
                alert("Veuillez saisir un nom pour votre thème.");
                return;
            }

            const newTheme = {
                id: 'custom_thm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                nom: name,
                difficulte: diff,
                events: [],
                isCustom: true
            };

            customCategory.themes.push(newTheme);
            saveCustomThemesToStorage();
            closeAddThemeModal();
            initThemes();
        }

        function deleteCustomTheme(themeId) {
            showConfirm("Voulez-vous vraiment supprimer ce thème personnalisé et tous ses événements ?", () => {
                customCategory.themes = customCategory.themes.filter(t => t.id !== themeId);
                saveCustomThemesToStorage();
                initThemes();
            });
        }

        function loadCustomEventsIntoBdd() {
            try {
                const custom = JSON.parse(localStorage.getItem(CUSTOM_EVENTS_KEY)) || {};
                function traverse(categories) {
                    for (let cat of categories) {
                        if (cat.isCustomCategory) continue; // Les thèmes personnalisés gèrent déjà leurs événements
                        if (cat.themes) {
                            for (let theme of cat.themes) {
                                if (custom[theme.id]) {
                                    theme.events.push(...custom[theme.id]);
                                    theme.events.sort((a, b) => a.date - b.date);
                                }
                            }
                        }
                        if (cat.subcategories) traverse(cat.subcategories);
                    }
                }
                traverse(getBdd());
            } catch (e) {}
        }

        // Chargement initial
        loadCustomThemesIntoBdd();
        loadCustomEventsIntoBdd();

        function openAddEventModal() {
            document.getElementById('custom-event-year').value = '';
            document.getElementById('custom-event-era').value = '1';
            document.getElementById('custom-event-title').value = '';
            document.getElementById('custom-event-desc').value = '';
            document.getElementById('modal-add-event').classList.remove('hidden');
        }

        function closeAddEventModal() {
            document.getElementById('modal-add-event').classList.add('hidden');
        }

        function saveCustomEvent() {
            const yearInput = document.getElementById('custom-event-year').value;
            const era = parseInt(document.getElementById('custom-event-era').value, 10);
            const title = document.getElementById('custom-event-title').value.trim();
            const desc = document.getElementById('custom-event-desc').value.trim();

            if (!yearInput || !title) {
                alert("Veuillez remplir l'année et le titre.");
                return;
            }

            const date = parseInt(yearInput, 10) * era;
            const theme = getCurrentTheme();
            const newEvent = {
                id: 'custom_evt_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                axe: "Événements personnalisés",
                date: date,
                titre: title,
                description: desc,
                isCustom: true
            };

            if (theme.isCustom) {
                theme.events.push(newEvent);
                theme.events.sort((a, b) => a.date - b.date);
                saveCustomThemesToStorage();
            } else {
                try {
                    const custom = JSON.parse(localStorage.getItem(CUSTOM_EVENTS_KEY)) || {};
                    if (!custom[theme.id]) custom[theme.id] = [];
                    custom[theme.id].push(newEvent);
                    localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(custom));
                } catch (e) {}

                theme.events.push(newEvent);
                theme.events.sort((a, b) => a.date - b.date);
            }

            closeAddEventModal();
            alert("Événement ajouté avec succès !");
        }

        // === TABLEAU DES SCORES (LEADERBOARD) ===
        
        
        function saveScoreToLeaderboard(themeId, mode, score) {
            try {
                const data = JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || {};
                if (!data[themeId]) data[themeId] = [];
                
                const now = new Date();
                const pad = (n) => n.toString().padStart(2, '0');
                const dateStr = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} à ${pad(now.getHours())}:${pad(now.getMinutes())}`;
                
                data[themeId].push({ mode, score, date: dateStr, timestamp: now.getTime() });
                // Garder les 50 meilleurs/derniers scores par thème pour éviter la surcharge
                data[themeId].sort((a, b) => b.score - a.score);
                if (data[themeId].length > 50) data[themeId] = data[themeId].slice(0, 50);
                
                localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(data));
            } catch(e) {}
        }
        
        function openLeaderboard() {
            const theme = getCurrentTheme();
            document.getElementById('leaderboard-subtitle').innerText = "Thème : " + theme.nom;
            
            const container = document.getElementById('leaderboard-content');
            let data = {};
            try { data = JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || {}; } catch(e) {}
            
            const scores = data[theme.id] || [];
            if (scores.length === 0) {
                container.innerHTML = '<div class="leaderboard-empty">Aucun score enregistré sur ce thème pour le moment.</div>';
            } else {
                const modesFr = { 'classic': 'Classique', 'chrono': 'Chrono', 'expert': 'Expert', 'quiz': 'Quiz', 'avantapres': 'Avant / Après', 'fil': 'Le fil du temps', 'periodes': 'Périodes & Ères', 'ecart': "Trouve l'écart" };
                let html = '<table class="leaderboard-table"><thead><tr><th>Mode</th><th>Score</th><th>Date</th></tr></thead><tbody>';
                scores.forEach(s => {
                    html += `<tr><td>${modesFr[s.mode] || s.mode}</td><td class="leaderboard-score">${s.score}</td><td>${s.date}</td></tr>`;
                });
                html += '</tbody></table>';
                container.innerHTML = html;
            }
            
            document.getElementById('modal-leaderboard').classList.remove('hidden');
        }

        function closeLeaderboard() {
            document.getElementById('modal-leaderboard').classList.add('hidden');
        }

        // === SÉLECTION D'ÉVÉNEMENTS ===
        let isSelectionActive = false;
        let selectedEventsIds = new Set();
        
        function deleteCustomEvent(eventId) {
            showConfirm("Voulez-vous vraiment supprimer cet événement ?", () => {
                const theme = getCurrentTheme();
                if (!theme) return;
                
                theme.events = theme.events.filter(e => e.id !== eventId);
                selectedEventsIds.delete(eventId);

                if (theme.isCustom) {
                    saveCustomThemesToStorage();
                } else {
                    try {
                        const custom = JSON.parse(localStorage.getItem(CUSTOM_EVENTS_KEY)) || {};
                        if (custom[theme.id]) {
                            custom[theme.id] = custom[theme.id].filter(e => e.id !== eventId);
                            localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(custom));
                        }
                    } catch (e) {}
                }

                openSelectionMode();
            });
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
                container.innerHTML = '<div style="text-align:center; padding:30px 10px; color:var(--muted-text); font-style:italic;">Aucun événement dans ce thème.</div>';
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
                    delBtn.title = "Supprimer cet événement";
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
                alert("Vous devez sélectionner au moins un événement pour jouer.");
                return;
            }
            isSelectionActive = true;
            showScreen('screen-modes');
        }

        // === RÉVISION ESPACÉE (SRS) ===
        // Système de type Leitner à 5 boîtes, stocké dans le navigateur (localStorage).
        // Boîte 1 = tout juste manqué, boîte 5 = remaîtrisé (sort du lot des points faibles).
        
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

        // Mélange simple, cohérent avec le reste du code (voir startActualGame)
        function shuffleArray(arr) {
            return [...arr].sort(() => Math.random() - 0.5);
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
                    if (entry.incorrect > 0 && entry.box < 5) weak += 1;
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
            return getBdd()
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
                labelsHtml += `<text x="${lx.toFixed(1)}" y="${(ly + 8).toFixed(1)}" text-anchor="${anchor}" class="radar-label-pct">${pct === null ? 'non testé' : pct + '%'}</text>`;
            });

            container.innerHTML = `
                <svg viewBox="0 0 ${size} ${size}" class="radar-svg" role="img" aria-label="Radar de maîtrise par catégorie">
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
            const testedMeta = `${stats.tested}/${stats.total} événement(s) testé(s)`;
            const weakMeta = stats.weak > 0 ? `<span class="mastery-row-weak-badge">⚠ ${stats.weak} point(s) faible(s)</span>` : '';
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
            return row;
        }

        function renderProgressGroup(node) {
            const details = document.createElement('details');
            details.className = 'mastery-group';

            const summary = document.createElement('summary');
            summary.className = 'mastery-group-summary';
            const themeCountMeta = `<span>${node.stats.themeCount} thème(s)</span>`;
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
            showConfirm("Réinitialiser tout le suivi de révision (boîtes de mémorisation, historique) ? Cette action est irréversible.", () => {
                srsSave({});
                if (!document.getElementById('screen-revision-hub').classList.contains('hidden')) {
                    initRevisionHub();
                    initProgress();
                } else {
                    initCategories();
                }
            });
        }

        // VARIABLES GLOBALES
        let selectedCategoryIndex = null;
        let selectedSubcategoryIndex = null;
        let selectedThemeIndex = null;
        let currentMode = 'classic';
        let revisionMode = false;
        let revisionEvents = [];
        let revisionRequestedSize = 0;
        let dailyChallengeMode = false;
        let dailyChallengeEventsWithLocation = [];
        let dailyCountdownInterval = null;
        let favoritesMode = false;
        let axisFilterActive = false;
        let currentThemeAxes = [];
        let selectedAxes = new Set();
        
        let currentPool = [];       
        let placedEvents = [];      
        let eventToPlace = null;    
        let lives = 3;
        let score = 0;
        let totalEvents = 0;
        let isAnimating = false; 
        
        let timerInterval = null;
        let startTime = 0;
        let totalTimePlayed = 0; 

        // Système de points : combo (série de bonnes réponses) et étendue chronologique
        // de la partie en cours (sert à normaliser l'écart d'années des erreurs).
        // Partagés entre le mode frise et le mode Quiz, qui suivent le même principe.

        let comboMultiplier = 1.0;

        // --- MULTIPLAYER STATE ---
        let multiPlayers = [];
        let currentMultiPlayerIndex = 0;
        let multiGameActive = false;

        let currentGameSpan = 1;
        let questionStartTime = 0;

        // Mode Quiz : QCM à 4 réponses, mêlant questions « événement → année »
        // et « année → événement », piochées dans le même pool que les autres modes.
        let quizQuestions = [];
        let quizIndex = 0;
        let quizFiftyLeft = 2;
        let quizFiftyActive = false;

        // Mode Le fil du temps : les événements du pool sont présentés triés du plus
        // ancien au plus récent, et il faut en saisir l'année exacte au clavier numérique.
        let filEvents = [];
        let filIndex = 0;
        let filInput = '';
        let filEra = 1; // 1 = apr. J.-C., -1 = av. J.-C.
        let filHintsRevealed = 0;
        let filCorrectYearString = '';

        // Mode Avant / Après : chaque question oppose un événement du pool à un autre
        // événement (dates distinctes), sans révéler leurs dates ; il faut désigner
        // le plus ancien des deux. Pas de points partiels (voir answerAvap).
        let avapQuestions = [];
        let avapIndex = 0;

        // Mode Trouve l'écart : même principe d'appariement qu'Avant / Après, mais il
        // faut cette fois saisir au clavier le nombre d'années séparant les deux
        // événements. Reprend le mécanisme d'indice chiffre par chiffre du Fil du temps.
        let ecartQuestions = [];
        let ecartIndex = 0;
        let ecartInput = '';
        let ecartHintsRevealed = 0;
        let ecartCorrectGapString = '';

        // Certaines catégories (ex. « Histoires nationales », « Programmes scolaires »)
        // insèrent un ou plusieurs niveaux de sous-catégories entre la catégorie et les
        // thèmes (parfois imbriqués : Programmes scolaires > Lycée > Terminale). On
        // représente donc la position choisie à ce niveau comme un CHEMIN d'indices
        // (tableau), plutôt qu'un simple indice — vide au sommet, il s'allonge d'un cran
        // à chaque sous-catégorie traversée. Ces fonctions centralisent la résolution du
        // nœud courant et de la liste de thèmes qui en découle, à profondeur quelconque.
        function resolveSubcategory(category, path) {
            let node = category;
            // Chemin défensif : si un segment est invalide (ex. index hors bornes suite à
            // une navigation corrompue), on ignore simplement la suite plutôt que de planter
            // sur `undefined.subcategories` — on reste sur le dernier nœud valide rencontré.
            (path || []).forEach(idx => {
                if (node && node.subcategories && node.subcategories[idx]) {
                    node = node.subcategories[idx];
                }
            });
            return node;
        }
        function countThemesRecursive(node) {
            return node.subcategories
                ? node.subcategories.reduce((sum, s) => sum + countThemesRecursive(s), 0)
                : node.themes.length;
        }
        function getCurrentThemeList() {
            const category = getBdd()[selectedCategoryIndex];
            const node = category.subcategories ? resolveSubcategory(category, selectedSubcategoryIndex) : category;
            // `node` peut être un nœud intermédiaire (pas encore un thème-parent) si le
            // chemin de sous-catégories s'est arrêté tôt sur un segment invalide.
            return node.themes || [];
        }
        function getCurrentTheme() {
            return getCurrentThemeList()[selectedThemeIndex];
        }

        function backFromThemes() {
            if (favoritesMode) {
                favoritesMode = false;
                showScreen('screen-categories', 'back');
                return;
            }
            const category = getBdd()[selectedCategoryIndex];
            if (category.subcategories && selectedSubcategoryIndex && selectedSubcategoryIndex.length > 0) {
                selectedSubcategoryIndex = selectedSubcategoryIndex.slice(0, -1);
                showScreen('screen-subcategories', 'back');
            } else {
                showScreen('screen-categories', 'back');
            }
        }

        // Remonte d'un cran dans la hiérarchie de sous-catégories (ex. Terminale → Lycée),
        // ou revient aux catégories si l'on est déjà au premier niveau de sous-catégories.
        function backFromSubcategories() {
            if (selectedSubcategoryIndex && selectedSubcategoryIndex.length > 0) {
                selectedSubcategoryIndex = selectedSubcategoryIndex.slice(0, -1);
                showScreen('screen-subcategories', 'back');
            } else {
                showScreen('screen-categories', 'back');
            }
        }

        // Bascule d'écran différée par le fondu ci-dessous : si une nouvelle navigation
        // arrive avant qu'elle ne se déclenche (double-tap, ou une deuxième carte touchée
        // pendant que l'écran quitté est encore visible le temps du fondu), on l'annule —
        // sinon elle finirait par s'exécuter en retard et écraser la navigation plus récente,
        // parfois vers un écran resté vide (voir showScreen ci-dessous).
        let pendingFadeSwitch = null;

        function showScreen(screenId, direction) {
            if (pendingFadeSwitch) {
                clearTimeout(pendingFadeSwitch);
                pendingFadeSwitch = null;
            }
            // Dernier degré de catégorie → thèmes : on efface rapidement l'écran quitté
            // avant de basculer, plutôt que de le faire glisser hors champ. On reporte le
            // changement d'écran à la fin de ce court fondu de sortie (relancé avec la
            // marque interne 'fade-in' pour que le bloc ci-dessous applique le fondu d'entrée).
            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (direction === 'fade' && !reduceMotion) {
                const current = Array.from(document.querySelectorAll('body > div')).find(div =>
                    !div.classList.contains('hidden') &&
                    div.id !== 'modal-details' && div.id !== 'modal-confirm' && div.id !== 'modal-settings' && div.id !== 'modal-scoring-info' && div.id !== 'modal-daily-results'
                );
                if (current && current.id !== screenId) {
                    current.classList.remove('screen-fade-out');
                    void current.offsetWidth;
                    current.classList.add('screen-fade-out');
                    pendingFadeSwitch = setTimeout(() => {
                        pendingFadeSwitch = null;
                        showScreen(screenId, 'fade-in');
                    }, 150);
                    return;
                }
            }

            document.querySelectorAll('body > div').forEach(div => {
                if(div.id !== 'modal-details' && div.id !== 'modal-confirm' && div.id !== 'modal-settings' && div.id !== 'modal-scoring-info' && div.id !== 'modal-daily-results') div.classList.add('hidden');
            });
            const targetScreen = document.getElementById(screenId);
            targetScreen.classList.remove('hidden');

            // Glissement vers la droite quand on ouvre (catégorie → sous-catégories/thèmes),
            // vers la gauche quand on revient en arrière. On retire d'abord les classes pour
            // pouvoir rejouer l'animation même si l'écran ciblé est déjà celui affiché juste
            // avant (ex. sous-catégories imbriquées).
            targetScreen.classList.remove('screen-slide-forward', 'screen-slide-back', 'screen-fade-in', 'screen-fade-out');
            if (direction === 'forward' || direction === 'back') {
                void targetScreen.offsetWidth; // force le reflow pour relancer l'animation
                targetScreen.classList.add(direction === 'forward' ? 'screen-slide-forward' : 'screen-slide-back');
            } else if ((direction === 'fade' || direction === 'fade-in') && !reduceMotion) {
                void targetScreen.offsetWidth;
                targetScreen.classList.add('screen-fade-in');
            }

            if (screenId === 'screen-categories') initCategories();
            if (screenId === 'screen-subcategories') initSubcategories();
            if (screenId === 'screen-themes') initThemes();
            if (screenId === 'screen-axes') initAxes();
            if (screenId === 'screen-revision-hub') initRevisionHub();
            if (screenId === 'screen-modes') {
                const titleEl = document.getElementById('modes-header-title');
                if (revisionMode) {
                    titleEl.innerText = `Révision ciblée (${revisionEvents.length} événements)`;
                } else if (axisFilterActive) {
                    const theme = getCurrentTheme();
                    const count = theme.events.filter(e => selectedAxes.has(e.axe)).length;
                    titleEl.innerText = `${theme.nom} — ${selectedAxes.size} axe(s), ${count} événements`;
                } else {
                    titleEl.innerText = 'Choisissez un mode de jeu';
                }
                updateModeLocks();
            }
        }

        // Renvoie l'écran de destination après une partie/un retour, et quitte le mode
        // révision ou le Défi du jour
        function screenAfterGame() {
            let target;
            if (revisionMode) {
                target = 'screen-revision-hub';
            } else if (dailyChallengeMode) {
                target = 'screen-categories';
            } else if (axisFilterActive) {
                target = 'screen-axes';
            } else {
                target = 'screen-themes';
            }
            revisionMode = false;
            dailyChallengeMode = false;
            return target;
        }

        // Ouvre l'écran de choix de révision (session aléatoire ou reprise d'un thème entier)
        function startRevision() {
            showScreen('screen-revision-hub');
        }

        // Lance une session mélangée d'au plus n événements piochés parmi les points
        // faibles actuels. Si le stock est plus petit que n, on affiche simplement tout.
        function launchRandomRevision(n) {
            const weak = getWeakEvents().map(item => item.event);
            if (weak.length === 0) return;
            revisionRequestedSize = n;
            revisionMode = true;
            revisionEvents = shuffleArray(weak).slice(0, n);
            showScreen('screen-modes');
        }

        // Ouvre la liste des thèmes marqués en favoris (indépendamment de leur catégorie
        // ou sous-catégorie d'origine). La liste peut être vide : un message le signale alors.
        function openFavorites() {
            favoritesMode = true;
            showScreen('screen-themes');
        }

        // Pioche un événement au hasard parmi tout HistoriAxe et ouvre sa fiche, avec un
        // accès direct pour rejouer sur son thème d'origine (et une option pour repiocher).
        function discoverRandomEvent() {
            const all = getAllEventsWithLocation();
            if (all.length === 0) return;
            const pick = all[Math.floor(Math.random() * all.length)];
            openModal(pick.event, pick);
        }

        // Lance le Défi du jour : 10 événements tirés de façon identique pour tous les
        // joueurs du monde entier (voir generateDailyEvents), joués en mode Classique
        // chronométré (3 vies, temps affiché) pour alimenter le score du classement
        // mondial de la modale de résultats.
        function startDailyChallenge() {
            const picks = generateDailyEvents();
            if (picks.length === 0) {
                alert("Aucun événement disponible pour le défi du jour.");
                return;
            }
            dailyChallengeEventsWithLocation = picks;
            dailyChallengeMode = true;
            revisionMode = false;
            favoritesMode = false;
            axisFilterActive = false;
            isSelectionActive = false;
            // Les événements du jour viennent de thèmes divers : on renseigne
            // directement la liste d'axes à partir du tirage (plutôt que du thème
            // sélectionné, potentiellement inexistant), pour que les badges d'axe et
            // getAxisColor() n'aillent pas chercher un thème courant qui n'existe pas.
            currentThemeAxes = [...new Set(picks.map(item => item.event.axe).filter(Boolean))];
            startActualGame('daily');
        }

        // Relance la partie en cours ; en mode révision, repioche parmi les points faibles
        // actuels (en tenant compte des résultats qui viennent d'être enregistrés), en
        // conservant la taille de session initialement choisie par le joueur.
        function replayCurrentGame() {
            if (currentMode === 'daily') {
                // Rejoue le même tirage que le jour en cours (graine inchangée tant que
                // la date UTC de basculement n'est pas franchie), pour s'entraîner sans
                // fausser l'équité du classement mondial.
                startDailyChallenge();
                return;
            }
            if (currentMode === 'quiz') {
                startQuizGame();
                return;
            }
            if (currentMode === 'avantapres') {
                startAvapGame();
                return;
            }
            if (currentMode === 'fil') {
                startFilGame();
                return;
            }
            if (currentMode === 'periodes') {
                startPeriodesGame();
                return;
            }
            if (currentMode === 'ecart') {
                startEcartGame();
                return;
            }
            if (revisionMode) {
                const weak = getWeakEvents().map(item => item.event);
                revisionEvents = shuffleArray(weak).slice(0, revisionRequestedSize || weak.length);
            }
            startActualGame(currentMode);
        }

        // PALETTE DE COULEURS POUR LES AXES THÉMATIQUES
        const AXIS_PALETTE = [
            { name: 'blue', border: '#2980b9' },
            { name: 'green', border: '#27ae60' },
            { name: 'orange', border: '#e67e22' },
            { name: 'purple', border: '#8e44ad' },
            { name: 'red', border: '#c0392b' },
            { name: 'teal', border: '#16a085' },
            { name: 'gold', border: '#b8892e' },
            { name: 'pink', border: '#d81b60' }
        ];

        function getAxisColor(axeName) {
            if (!axeName) return null;
            let axesList = currentThemeAxes;
            if (!axesList || axesList.length === 0) {
                const theme = getCurrentTheme();
                if (theme && theme.events) {
                    axesList = [...new Set(theme.events.map(e => e.axe).filter(Boolean))];
                    if (theme.axeOrder) {
                        axesList = theme.axeOrder.filter(a => axesList.includes(a));
                    }
                }
            }
            const idx = axesList ? axesList.indexOf(axeName) : -1;
            const paletteIndex = idx >= 0 ? (idx % AXIS_PALETTE.length) : 0;
            return AXIS_PALETTE[paletteIndex];
        }

        // INIT ÉCRAN DES AXES THÉMATIQUES (Amériques, Campagne, ou tout thème taggé)
        function initAxes() {
            const theme = getCurrentTheme();
            let axes = [...new Set(theme.events.map(e => e.axe).filter(Boolean))];
            if (theme.axeOrder) {
                // Ordre d'affichage explicite défini par le thème, prioritaire sur l'ordre
                // d'apparition dans le tableau d'événements (qui reste, lui, chronologique).
                axes = theme.axeOrder.filter(a => axes.includes(a));
            }
            const sameTheme = currentThemeAxes.length === axes.length && currentThemeAxes.every(a => axes.includes(a));
            currentThemeAxes = axes;
            if (!sameTheme || selectedAxes.size === 0) {
                selectedAxes = new Set(axes); // nouveau thème (ou état vide) : tout sélectionné par défaut
            }
            renderAxesScreen();
        }

        function renderAxesScreen() {
            const theme = getCurrentTheme();
            const container = document.getElementById('axes-container');
            container.innerHTML = '';
            currentThemeAxes.forEach(axe => {
                const count = theme.events.filter(e => e.axe === axe).length;
                const card = document.createElement('div');
                const isSelected = selectedAxes.has(axe);
                const color = getAxisColor(axe);
                card.className = 'axis-card' + (isSelected ? ' selected' : '');
                if (color) {
                    card.setAttribute("data-axis", color.name);
                }
                card.innerHTML = `<h3>${axe}</h3><p>${count} événement${count > 1 ? 's' : ''}</p>`;
                card.onclick = () => {
                    if (selectedAxes.has(axe)) { selectedAxes.delete(axe); }
                    else { selectedAxes.add(axe); }
                    renderAxesScreen();
                };
                container.appendChild(card);
            });
            const totalCount = theme.events.filter(e => selectedAxes.has(e.axe)).length;
            const subtitle = document.getElementById('axes-subtitle');
            subtitle.innerText = selectedAxes.size > 0
                ? `${theme.nom} — ${totalCount} événement${totalCount > 1 ? 's' : ''} sélectionné${totalCount > 1 ? 's' : ''}`
                : `${theme.nom} — sélectionnez au moins un axe`;
            document.getElementById('axes-continue-btn').disabled = selectedAxes.size === 0;
        }

        function confirmAxesSelection() {
            if (selectedAxes.size === 0) return;
            axisFilterActive = true;
            showScreen('screen-modes', 'forward');
        }

        // Ouvre l'écran des thèmes personnalisés
        function openCustomThemes() {
            favoritesMode = false;
            let customCatIndex = getBdd().findIndex(c => c.isCustomCategory);
            if (customCatIndex === -1) {
                bdd.push(customCategory);
                customCatIndex = bdd.length - 1;
            }
            selectedCategoryIndex = customCatIndex;
            selectedSubcategoryIndex = null;
            showScreen('screen-themes');
        }

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
                    <h3 style="font-size: 20px; font-weight: 700; color: var(--primary-blue, #001a4b); margin-bottom: 8px;">Chargement de la bibliothèque historique…</h3>
                    <p style="color: var(--text-muted, #64748b); font-size: 14px; max-width: 400px; margin: 0 auto;">Initialisation des 16 664 événements et 646 thèmes.</p>
                `;
                container.appendChild(loadingBox);
                return;
            }

            const weakCount = (typeof getWeakEvents === 'function') ? getWeakEvents().length : 0;
            const favCount = (typeof favoritesLoad === 'function') ? favoritesLoad().length : 0;

            // --- QUICK ACTION GRID ---
            const gridSection = document.createElement('section');
            gridSection.className = 'w-full';
            gridSection.style.marginTop = '24px';
            gridSection.innerHTML = `
                <div class="grid grid-cols-4 gap-sm md:gap-md" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; text-align: center;">
                    <div class="flex flex-col items-center gap-2" id="btn-favoris" style="cursor: pointer;">
                        <div class="quick-action-circle rounded-full flex items-center justify-center transition-colors cursor-pointer group mx-auto" style="border-radius: 50%; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: var(--card-bg, #f3f4f6);">
                            <span style="font-size: 28px;">⭐</span>
                        </div>
                        <span class="quick-action-label" style="font-size: 13px; font-weight: 600;">Favoris (${favCount})</span>
                    </div>
                    <div class="flex flex-col items-center gap-2" id="btn-discover" style="cursor: pointer;">
                        <div class="quick-action-circle rounded-full flex items-center justify-center transition-colors cursor-pointer group mx-auto" style="border-radius: 50%; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: var(--card-bg, #f3f4f6);">
                            <span style="font-size: 28px;">🎲</span>
                        </div>
                        <span class="quick-action-label" style="font-size: 13px; font-weight: 600;">Hasard</span>
                    </div>
                    <div class="flex flex-col items-center gap-2" id="btn-daily" style="cursor: pointer;">
                        <div class="quick-action-circle rounded-full flex items-center justify-center transition-colors cursor-pointer group mx-auto" style="border-radius: 50%; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: var(--card-bg, #f3f4f6);">
                            <span style="font-size: 28px;">🎯</span>
                        </div>
                        <span class="quick-action-label" style="font-size: 13px; font-weight: 600;">Défi</span>
                    </div>
                    <div class="flex flex-col items-center gap-2" id="btn-reviser" style="cursor: pointer;">
                        <div class="quick-action-circle rounded-full flex items-center justify-center transition-colors cursor-pointer group mx-auto" style="border-radius: 50%; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: var(--card-bg, #f3f4f6);">
                            <span style="font-size: 28px;">🧠</span>
                        </div>
                        <span class="quick-action-label" style="font-size: 13px; font-weight: 600;">Réviser (${weakCount})</span>
                    </div>
                </div>
            `;
            container.appendChild(gridSection);

            const btnFav = gridSection.querySelector('#btn-favoris');
            if (btnFav) btnFav.onclick = () => openFavorites();
            const btnDisc = gridSection.querySelector('#btn-discover');
            if (btnDisc) btnDisc.onclick = () => discoverRandomEvent();
            const btnDay = gridSection.querySelector('#btn-daily');
            if (btnDay) btnDay.onclick = () => startDailyChallenge();
            const btnRev = gridSection.querySelector('#btn-reviser');
            if (btnRev) btnRev.onclick = () => startRevision();

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
                let bgImg = 'assets/images/cat_culture_generale.jpg';
                if(cat.nom.toLowerCase().includes('culture')) bgImg = 'assets/images/cat_culture_generale.jpg';
                if(cat.nom.toLowerCase().includes('bio')) bgImg = 'assets/images/cat_biographies.jpg';
                if(cat.nom.toLowerCase().includes('nationale')) bgImg = 'assets/images/cat_histoires_nationales.jpg';
                if(cat.nom.toLowerCase().includes('programmes')) bgImg = 'assets/images/cat_programmes_scolaires.jpg';
                if(cat.nom.toLowerCase().includes('capes') || cat.nom.toLowerCase().includes('agrég')) bgImg = 'assets/images/cat_agregation.jpg';
                if(cat.isCustomCategory || cat.nom.toLowerCase().includes('personnalisé')) bgImg = 'assets/images/cat_themes_personnalises.jpg';

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
                    <div class="absolute inset-0 bg-primary/40 group-hover:bg-primary/30 transition-colors" style="background: rgba(0, 26, 75, 0.5); position: absolute; inset: 0;"></div>
                    <div class="absolute bottom-0 left-0 p-md w-full" style="position: absolute; bottom: 0; left: 0; padding: 16px;">
                        <h4 class="font-headline-md text-on-primary" style="color: white; font-weight: 700; font-size: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${cat.nom}</h4>
                        <p class="font-label-sm text-primary-fixed-dim mt-xs" style="color: #b2c5ff; font-size: 12px; margin-top: 4px;">${cat.subcategories ? cat.subcategories.length + ' Sous-catégories' : (cat.isCustomCategory ? 'Vos thèmes' : 'Sélectionner')}</p>
                    </div>
                `;
                card.onclick = () => {
                    selectedCategoryIndex = index;
                    selectedSubcategoryIndex = cat.subcategories ? [] : null;
                    
                    if (cat.nom === "CAPES & Agrégation" || cat.isCustomCategory) {
                        showScreen('screen-themes', 'forward');
                    } else {
                        showScreen('screen-subcategories', 'forward');
                    }
                };
                catGrid.appendChild(card);
            });
        }
        
        // INIT SOUS-CATÉGORIES (régions, niveaux scolaires, etc. — potentiellement imbriquées)
        function initSubcategories() {
            const container = document.getElementById('subcategories-container');
            container.innerHTML = '';
            
            // Appliquer le style conteneur Tailwind (similaire à l'accueil)
            container.className = 'w-full max-w-7xl mx-auto space-y-lg md:space-y-xl mt-sm md:mt-xl pb-32';

            const category = getBdd()[selectedCategoryIndex];
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

            const noteBox = document.getElementById('subcategory-note');
            if (category.note && selectedSubcategoryIndex.length === 0) {
                document.getElementById('subcategory-note-text').innerText = category.note;
                noteBox.classList.remove('hidden');
                noteBox.style.backgroundColor = 'var(--surface-2)';
                noteBox.style.color = 'var(--text-dark)';
                noteBox.style.border = '1px solid var(--border-soft)';
                noteBox.style.borderRadius = '16px';
                noteBox.style.padding = '16px';
                noteBox.style.marginBottom = '24px';
                noteBox.style.boxShadow = 'var(--card-shadow)';
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

            node.subcategories.forEach((sub, index) => {
                const nbThemes = countThemesRecursive(sub);
                let textThemes = nbThemes === 0 ? "Bientôt disponible" : (nbThemes === 1 ? "1 thème" : `${nbThemes} thèmes`);

                let bgImg = 'assets/images/cat_culture_generale.jpg'; // default fallback
                const nomLower = sub.nom.toLowerCase();
                
                // Mappings for available images
                if(nomLower.includes('europe')) bgImg = 'assets/images/sub_europe.jpg';
                else if(nomLower.includes('amérique')) bgImg = 'assets/images/sub_ameriques.jpg';
                else if(nomLower.includes('asie')) bgImg = 'assets/images/sub_asie.jpg';
                else if(nomLower.includes('moyen-orient')) bgImg = 'assets/images/sub_moyen_orient.jpg';
                else if(nomLower.includes('afrique')) bgImg = 'assets/images/sub_afrique.jpg';
                else if(nomLower.includes('océanie')) bgImg = 'assets/images/sub_oceanie.jpg';
                else if(nomLower.includes('empires')) bgImg = 'assets/images/sub_empires.jpg';
                else if(nomLower.includes('sciences')) bgImg = 'assets/images/sub_sciences_techniques.jpg';
                else if(nomLower.includes('arts') || nomLower.includes('spectacle')) bgImg = 'assets/images/sub_arts_litterature.jpg';
                else if(nomLower.includes('religions') || nomLower.includes('croyances') || nomLower.includes('mytholog') || nomLower.includes('judaïsme') || nomLower.includes('islam') || nomLower.includes('christianisme') || nomLower.includes('hindouisme') || nomLower.includes('bouddhisme')) bgImg = 'assets/images/sub_religions_croyances.jpg';
                else if(nomLower.includes('société') || nomLower.includes('societe') || nomLower.includes('géopolitique') || nomLower.includes('geopolitique') || nomLower.includes('généraux')) bgImg = 'assets/images/sub_themes_generaux.jpg';
                else if(nomLower.includes('rois, reines')) bgImg = 'assets/images/sub_rois_reines.jpg';
                else if(nomLower.includes('chefs militaires')) bgImg = 'assets/images/sub_chefs_militaires.jpg';
                else if(nomLower.includes('savants, scientifiques')) bgImg = 'assets/images/sub_savants_scientifiques.jpg';
                else if(nomLower.includes('philosophes et penseurs')) bgImg = 'assets/images/sub_philosophes_penseurs.jpg';
                else if(nomLower.includes('crivains et po')) bgImg = 'assets/images/sub_ecrivains_poetes.jpg';
                else if(nomLower.includes('artistes et musiciens')) bgImg = 'assets/images/sub_artistes_musiciens.jpg';
                else if(nomLower.includes('explorateurs et grands voyageurs')) bgImg = 'assets/images/sub_explorateurs_voyageurs.jpg';
                else if(nomLower.includes('figures religieuses')) bgImg = 'assets/images/sub_figures_religieuses.jpg';
                else if(nomLower.includes('militants, r')) bgImg = 'assets/images/sub_militants_resistants.jpg';
                else if(nomLower.includes('acteurs, chanteurs')) bgImg = 'assets/images/sub_acteurs_chanteurs.jpg';
                else if(nomLower.includes('architectes, designers')) bgImg = 'assets/images/sub_architectes_designers.jpg';
                else if(nomLower.includes('entrepreneurs et magnats')) bgImg = 'assets/images/sub_entrepreneurs_magnats.jpg';
                else if(nomLower.includes('sportifs et ath')) bgImg = 'assets/images/sub_sportifs_athletes.jpg';
                else if(nomLower.includes('collège') || node.nom.toLowerCase().includes('collège')) bgImg = 'assets/images/sub_programmes_college.jpg';
                else if(nomLower.includes('lycée') || node.nom.toLowerCase().includes('lycée')) bgImg = 'assets/images/sub_programmes_lycee.jpg';
                else if (category.nom.toLowerCase().includes('scolaire')) bgImg = 'assets/images/cat_programmes_scolaires.jpg';
                else if (category.nom.toLowerCase().includes('bio')) bgImg = 'assets/images/cat_biographies.jpg';
                else if (category.nom.toLowerCase().includes('capes') || category.nom.toLowerCase().includes('agrég')) bgImg = 'assets/images/cat_agregation.jpg';
                else if (category.nom.toLowerCase().includes('nationale')) bgImg = 'assets/images/cat_histoires_nationales.jpg';

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
                    <div class="absolute inset-0 bg-primary/40 group-hover:bg-primary/30 transition-colors" style="background: rgba(0, 26, 75, 0.5); position: absolute; inset: 0;"></div>
                    <div class="absolute bottom-0 left-0 p-md w-full" style="position: absolute; bottom: 0; left: 0; padding: 16px;">
                        <h4 class="font-headline-md text-on-primary" style="color: white; font-weight: 700; font-size: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${sub.nom}</h4>
                        <p class="font-label-sm text-primary-fixed-dim mt-xs" style="color: #b2c5ff; font-size: 12px; margin-top: 4px;">${textThemes}</p>
                    </div>
                `;

                const canEnter = nbThemes > 0 || !!sub.subcategories;
                card.onclick = () => {
                    if (canEnter) {
                        selectedSubcategoryIndex = [...basePath, index];
                        showScreen(sub.subcategories ? 'screen-subcategories' : 'screen-themes', 'forward');
                    }
                };
                gridSection.appendChild(card);
            });
            
        }


        // Construit une carte-thème standard (titre, étoile de favori, chevron). Partagée
        // entre la liste de thèmes normale et la liste des favoris, qui ne diffèrent que
        // par la provenance des thèmes affichés et par ce qui se passe au clic.
        function createThemeCard(theme, onOpen, opts = {}) {
            const card = document.createElement('div');
            card.className = 'data-card';
            const fav = isFavorite(theme.id);
            const badgeHtml = opts.badge != null ? `<span class="data-card-badge">${opts.badge}</span>` : '';
            const deleteHtml = theme.isCustom ? `<span class="data-card-delete" title="Supprimer ce thème">🗑️</span>` : '';
            card.innerHTML = `
                <span class="data-card-title">${theme.nom}</span>
                ${badgeHtml}
                ${deleteHtml}
                <span class="data-card-fav ${fav ? 'is-fav' : ''}" title="${fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${fav ? '★' : '☆'}</span>
                <span class="data-card-icon">›</span>
            `;
            card.onclick = onOpen;
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
                toggleFavorite(theme.id);
                if (opts.onFavoriteToggle) {
                    opts.onFavoriteToggle();
                } else {
                    const nowFav = isFavorite(theme.id);
                    favBtn.classList.toggle('is-fav', nowFav);
                    favBtn.innerText = nowFav ? '★' : '☆';
                    favBtn.title = nowFav ? 'Retirer des favoris' : 'Ajouter aux favoris';
                }
            };
            return card;
        }

        // === RECHERCHE DE THÈMES (barre en tête de l'écran des catégories) ===
        // Aplatit tout l'arbre bdd en une liste de thèmes, chacun avec ses indices
        // exacts (ci/si/ti, au format attendu par openThemeAt) et le chemin de noms
        // de catégories/sous-catégories qui mène jusqu'à lui, pour affichage et pour
        // élargir la recherche au-delà du seul nom du thème.
        function getAllThemesWithPath() {
            const all = [];
            getBdd().forEach((cat, ci) => {
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

            const matches = getAllThemesWithPath().filter(item =>
                normalizeSearchText(item.theme.nom).includes(query) ||
                normalizeSearchText(item.pathNames.join(' ')).includes(query)
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
                empty.innerText = 'Aucun thème ne correspond à votre recherche.';
                resultsBox.appendChild(empty);
                return;
            }

            // Limite d'affichage pour garder la liste lisible, même sur une recherche
            // très large (ex. une seule lettre fréquente).
            matches.slice(0, 40).forEach(({ theme, ci, si, ti, pathNames }) => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `
                    <span class="search-result-title">${theme.nom}</span>
                    <span class="search-result-path">${pathNames.join(' › ')}</span>
                `;
                item.onclick = () => {
                    clearThemeSearch();
                    openThemeAt(ci, si, ti);
                };
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
            axisFilterActive = false;
            isSelectionActive = false;
            const theme = getCurrentThemeList()[ti];
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
            
            const category = getBdd()[selectedCategoryIndex];
            const themeList = getCurrentThemeList();
            const node = category.subcategories ? resolveSubcategory(category, selectedSubcategoryIndex) : category;
            document.getElementById('theme-screen-title').innerText = node.nom;
            
            if (category.isCustomCategory) {
                const addCard = document.createElement('div');
                addCard.className = 'special-card';
                addCard.style.background = 'linear-gradient(135deg, #1E8449, #2ECC71)';
                addCard.style.gridColumn = '1 / -1';
                addCard.style.maxWidth = '450px';
                addCard.style.margin = '0 auto 10px auto';
                addCard.style.width = '100%';
                addCard.innerHTML = `
                    <div class="special-card-title">➕ Créer un nouveau thème</div>
                    <div class="special-card-subtitle">Ajoutez un thème personnalisé avec vos propres dates</div>
                `;
                addCard.onclick = openAddThemeModal;
                container.appendChild(addCard);

                if (themeList.length === 0) {
                    const emptyMsg = document.createElement('div');
                    emptyMsg.className = 'empty-msg';
                    emptyMsg.innerText = "Vous n'avez pas encore créé de thème personnalisé. Cliquez sur « Créer un nouveau thème » pour commencer !";
                    emptyMsg.style.gridColumn = '1 / -1';
                    container.appendChild(emptyMsg);
                    return;
                }
            }
            
            themeList.forEach((theme, index) => {
                const card = createThemeCard(theme, () => {
                    openThemeAt(selectedCategoryIndex, selectedSubcategoryIndex, index);
                });
                container.appendChild(card);
            });
        }

        // Liste des thèmes marqués en favoris, retrouvés à travers tout l'arbre bdd
        // (catégories plates ou à sous-catégories), avec leur chemin d'accès exact.
        function renderFavoritesThemes(container) {
            container.innerHTML = '';
            document.getElementById('theme-screen-title').innerText = 'Thèmes favoris';

            const favIds = favoritesLoad();
            const matches = [];
            getBdd().forEach((cat, ci) => {
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
                msg.innerText = "Aucun thème favori pour l'instant. Depuis la liste des thèmes, touchez l'étoile ☆ pour en ajouter ici.";
                container.appendChild(msg);
                return;
            }

            matches.forEach(({ theme, ci, si, ti }) => {
                const card = createThemeCard(theme, () => {
                    openThemeAt(ci, si, ti);
                }, { onFavoriteToggle: () => renderFavoritesThemes(container) });
                container.appendChild(card);
            });
        }

        // Bascule entre les deux onglets de l'écran « Réviser » : Points faibles (par
        // défaut) et Progression, en affichant/masquant leurs conteneurs respectifs.
        function switchRevisionHubTab(tab) {
            document.querySelectorAll('#revision-hub-tabs button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.value === tab);
            });
            document.getElementById('revision-hub-weak-container').classList.toggle('hidden', tab !== 'weak');
            document.getElementById('revision-hub-progress-container').classList.toggle('hidden', tab !== 'progress');
            if (tab === 'progress') initProgress();
        }

        // Écran de choix affiché après avoir sélectionné « Réviser mes points faibles » :
        // soit une session mélangée de taille choisie, soit la reprise d'un thème entier.
        // Comporte aussi l'onglet Progression (radar + barres de maîtrise par thème).
        function initRevisionHub() {
            document.querySelectorAll('#revision-hub-tabs button').forEach(btn => {
                btn.onclick = () => switchRevisionHubTab(btn.dataset.value);
            });
            switchRevisionHubTab('weak');

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
            subtitle.innerText = `${weak.length} événement${weak.length > 1 ? 's' : ''} à retravailler, dans ${weakThemes.length} thème${weakThemes.length > 1 ? 's' : ''}`;

            const themesContainer = document.getElementById('revision-themes-container');
            themesContainer.innerHTML = '';
            weakThemes.forEach(({ theme, ci, si, ti, count }) => {
                const card = createThemeCard(theme, () => {
                    openThemeAt(ci, si, ti);
                }, { badge: count });
                themesContainer.appendChild(card);
            });
        }

        // VERROUS DE MODE (Chrono / Expert) — recalculés à chaque ouverture de l'écran des modes
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
                'Chrono', '3 vies. Placez les événements le plus vite possible.',
                'Réussissez d’abord le mode Classique sur ce thème pour débloquer Chrono.');

            renderModeCard('mode-card-expert', 'expert', expertUnlocked,
                'Expert', '1 vie, chronométré. La moindre erreur est fatale.',
                'Réussissez d’abord le mode Chrono sur ce thème pour débloquer Expert.');
        }

        function renderModeCard(cardId, mode, unlocked, title, description, lockMessage) {
            const card = document.getElementById(cardId);
            card.classList.toggle('locked', !unlocked);
            if (unlocked) {
                card.innerHTML = `<h3>${title}</h3><p>${description}</p>`;
                card.onclick = () => startActualGame(mode);
            } else {
                card.innerHTML = `<h3><span class="mode-lock-icon" aria-hidden="true">🔒</span>${title}</h3><p class="mode-unlock-hint">${lockMessage}</p>`;
                card.onclick = () => showConfirm(lockMessage, null, { alertOnly: true });
            }
        }


        // --- MULTIPLAYER LOGIC ---
        function showMultiplayerSetup() {
            showScreen('screen-multiplayer-setup');
            renderMultiplayerNameInputs();
        }

        function renderMultiplayerNameInputs() {
            const count = parseInt(document.getElementById('multi-player-count').value);
            const container = document.getElementById('multi-player-names');
            container.innerHTML = '';
            for (let i = 1; i <= count; i++) {
                const existingInput = document.getElementById(`multi-name-${i}`);
                const defaultVal = existingInput ? existingInput.value : (multiPlayers && multiPlayers[i-1] ? multiPlayers[i-1].name : `Joueur ${i}`);
                container.innerHTML += `<input type="text" id="multi-name-${i}" placeholder="Nom du joueur ${i}" value="${defaultVal}">`;
            }
        }

        function startMultiplayerGame() {
            const count = parseInt(document.getElementById('multi-player-count').value);
            multiPlayers = [];
            for (let i = 1; i <= count; i++) {
                let name = document.getElementById(`multi-name-${i}`).value.trim();
                if (!name) name = `Joueur ${i}`;
                multiPlayers.push({ name: name, score: 0, lives: 2, comboMultiplier: 1.0, eliminated: false });
            }
            multiGameActive = true;
            currentMultiPlayerIndex = 0;
            
            startActualGame('multi');
            
            document.getElementById('screen-game').classList.add('hidden');
            document.getElementById('screen-multi-turn').classList.remove('hidden');
            document.getElementById('multi-turn-text').innerText = `À ${multiPlayers[currentMultiPlayerIndex].name} de jouer !`;
        }

        function resumeMultiplayerTurn() {
            document.getElementById('screen-multi-turn').classList.add('hidden');
            document.getElementById('screen-game').classList.remove('hidden');
            pickNextEvent();
            updateHUD();
        }

        function nextMultiPlayerTurn() {
            if (!multiGameActive) return;
            
            let alivePlayers = multiPlayers.filter(p => !p.eliminated);
            if (alivePlayers.length === 0) {
                setTimeout(() => endMultiplayerGame(), 1000);
                return;
            }
            if (currentPool.length === 0) {
                setTimeout(() => endMultiplayerGame(), 1000);
                return;
            }

            // Next player
            let attempts = 0;
            do {
                currentMultiPlayerIndex = (currentMultiPlayerIndex + 1) % multiPlayers.length;
                attempts++;
            } while (multiPlayers[currentMultiPlayerIndex].eliminated && attempts <= multiPlayers.length);

            document.getElementById('screen-game').classList.add('hidden');
            document.getElementById('screen-multi-turn').classList.remove('hidden');
            document.getElementById('multi-turn-text').innerText = `À ${multiPlayers[currentMultiPlayerIndex].name} de jouer !`;
        }

        function endMultiplayerGame() {
            multiGameActive = false;
            showScreen('screen-multiplayer-end');
            
            const sorted = [...multiPlayers].sort((a, b) => b.score - a.score);
            const container = document.getElementById('multi-podium');
            container.innerHTML = '';
            
            const medals = ['🥇', '🥈', '🥉', ''];
            const classes = ['gold', 'silver', 'bronze', ''];
            
            sorted.forEach((p, index) => {
                const medal = index < 3 ? medals[index] : `${index+1}.`;
                const cls = index < 3 ? classes[index] : '';
                const eliminatedText = p.eliminated ? ' <em>(Éliminé)</em>' : '';
                container.innerHTML += `
                    <div class="podium-row ${cls}">
                        <span>${medal} ${p.name} ${eliminatedText}</span>
                        <span>${p.score} pts</span>
                    </div>
                `;
            });
        }
        
        // LANCEMENT DU JEU
        function startActualGame(mode) {
            resetSessionHistory();
            currentMode = mode;
            let sourceEvents;
            if (mode === 'daily') {
                // Défi du jour : 10 événements déjà tirés (et mélangés) de façon
                // déterministe par generateDailyEvents, indépendamment du thème
                // actuellement sélectionné dans le menu.
                sourceEvents = dailyChallengeEventsWithLocation.map(item => item.event);
            } else if (revisionMode) {
                sourceEvents = revisionEvents;
            } else {
                const themeEvents = getCurrentTheme().events;
                sourceEvents = (axisFilterActive && selectedAxes.size > 0)
                    ? themeEvents.filter(e => selectedAxes.has(e.axe))
                    : themeEvents;
            }
            if (isSelectionActive && !revisionMode) {
                sourceEvents = sourceEvents.filter(e => selectedEventsIds.has(e.id));
            }
            if (sourceEvents.length === 0) {
                alert("Ce thème ne contient aucun événement. Veuillez d'abord ajouter des événements via « Ajouter un événement » !");
                return;
            }
            let eventsCopy = [...sourceEvents];

            if (mode === 'discovery') {
                eventsCopy.sort((a, b) => a.date - b.date);
                placedEvents = eventsCopy;
                currentPool = [];
                totalEvents = placedEvents.length;
            } else if (mode === 'daily') {
                // Ordre de pioche déjà mélangé de façon déterministe (même graine du
                // jour pour tous les joueurs) : surtout ne pas re-mélanger avec
                // Math.random ici, sous peine de casser l'équité du classement mondial.
                totalEvents = eventsCopy.length;
                placedEvents = [eventsCopy.pop()];
                currentPool = eventsCopy;
            } else {
                eventsCopy.sort(() => Math.random() - 0.5);
                totalEvents = eventsCopy.length;
                placedEvents = [eventsCopy.pop()];
                currentPool = eventsCopy;
            }

            if (mode === 'training' || mode === 'discovery') lives = Infinity;
            else if (mode === 'expert') lives = 1;
            else if (mode === 'multi') lives = 2; // unused directly, but for safety
            else lives = 3; // classic, chrono, daily
            
            score = 0;
            totalTimePlayed = 0;
            comboMultiplier = 1.0;
            const gameDates = eventsCopy.map(e => e.date);
            currentGameSpan = Math.max(1, Math.max(...gameDates) - Math.min(...gameDates));
            
            const hudLives = document.getElementById('hud-lives');
            const hudTimer = document.getElementById('hud-timer-container');
            const hand = document.getElementById('hand');
            const scoreContainer = document.getElementById('hud-score-container');
            const progressRail = document.getElementById('hud-progress-rail');

            hudLives.classList.remove('hidden');
            hudTimer.classList.add('hidden');
            hand.classList.remove('hidden');
            scoreContainer.classList.remove('hidden');
            progressRail.classList.remove('hidden');
            document.getElementById('hud-progress-fill').style.width = '0%';

            if (mode === 'training' || mode === 'discovery') {
                hudLives.classList.add('hidden');
                // Modes sans enjeu ni pression : pas de score affiché
                scoreContainer.classList.add('hidden');
            }

            if (mode === 'discovery') {
                // Lecture seule : ni carte en main, ni score, ni progression
                hand.classList.add('hidden');
                progressRail.classList.add('hidden');
                document.getElementById('hud-count').innerText = `Frise complète · ${totalEvents} repères`;
            }

            if (mode === 'chrono' || mode === 'expert' || mode === 'daily') {
                hudTimer.classList.remove('hidden');
                document.getElementById('hud-timer').innerText = "0,0";
                startTimer();
            }

            updateHUD();
            
            if (mode === 'discovery' || mode === 'multi') {
                renderTimeline();
            } else {
                pickNextEvent();
            }
            
            showScreen('screen-game');
        }

        // === MODE QUIZ ===
        // QCM à 4 réponses, mêlant questions « événement → année » et « année → événement »,
        // pioché dans le même pool que les autres modes (thème, filtre d'axes, ou révision).
        function startQuizGame() {
            resetSessionHistory();
            currentMode = 'quiz';
            let sourceEvents;
            if (revisionMode) {
                sourceEvents = revisionEvents;
            } else {
                const themeEvents = getCurrentTheme().events;
                sourceEvents = (axisFilterActive && selectedAxes.size > 0)
                    ? themeEvents.filter(e => selectedAxes.has(e.axe))
                    : themeEvents;
            }
            if (isSelectionActive && !revisionMode) {
                sourceEvents = sourceEvents.filter(e => selectedEventsIds.has(e.id));
            }
            if (sourceEvents.length < 4) {
                alert("Le mode Quiz nécessite au moins 4 événements. Veuillez ajouter d'autres événements à ce thème !");
                return;
            }

            quizQuestions = buildQuizQuestions(sourceEvents);
            quizIndex = 0;
            lives = 3;
            score = 0;
            comboMultiplier = 1.0;
            quizFiftyLeft = 2;

            const gameDates = sourceEvents.map(e => e.date);
            currentGameSpan = Math.max(1, Math.max(...gameDates) - Math.min(...gameDates));

            document.getElementById('quiz-fifty-count').innerText = `(${quizFiftyLeft})`;
            document.getElementById('quiz-fifty-btn').disabled = false;

            showScreen('screen-quiz');
            renderQuizQuestion();
        }

        // Construit une question par événement du pool (mélangées), en tirant au sort le
        // sens de la question et 3 distracteurs réels pris parmi les autres événements.
        function buildQuizQuestions(events) {
            const pool = events.filter(e => typeof e.date === 'number');
            if (pool.length < 4) return [];
            const questions = pool.map(evt => {
                const type = Math.random() < 0.5 ? 'event-to-year' : 'year-to-event';
                // Find 3 distractors with unique dates, distinct from evt.date
                let availableDistractors = shuffleArray(pool.filter(e => e.date !== evt.date));
                let distractorEvents = [];
                let usedDates = new Set();
                for (let e of availableDistractors) {
                    if (!usedDates.has(e.date)) {
                        usedDates.add(e.date);
                        distractorEvents.push(e);
                        if (distractorEvents.length === 3) break;
                    }
                }
                // Fallback if not enough unique dates (rare but possible in very small specific themes)
                if (distractorEvents.length < 3) {
                    distractorEvents = shuffleArray(pool.filter(e => e.id !== evt.id)).slice(0, 3);
                }
                return { type, correct: evt, distractorEvents };
            });
            return shuffleArray(questions);
        }

        function renderQuizQuestion() {
            if (quizIndex >= quizQuestions.length) {
                endGame(true);
                return;
            }
            isAnimating = false;
            quizFiftyActive = false;
            questionStartTime = Date.now();

            const q = quizQuestions[quizIndex];
            const kicker = document.getElementById('quiz-kicker');
            const prompt = document.getElementById('quiz-prompt');
            const optionsContainer = document.getElementById('quiz-options');
            optionsContainer.innerHTML = '';
            
            if (document.activeElement) document.activeElement.blur();
            optionsContainer.style.pointerEvents = 'none';
            requestAnimationFrame(() => {
                optionsContainer.style.pointerEvents = 'auto';
            });

            let options;
            if (q.type === 'event-to-year') {
                kicker.innerText = 'En quelle année cet événement a-t-il eu lieu ?';
                prompt.innerText = q.correct.titre;
                options = [q.correct, ...q.distractorEvents].map(e => ({ label: formatYear(e.date), event: e }));
            } else {
                kicker.innerText = 'Quel événement correspond à cette année ?';
                prompt.innerText = formatYear(q.correct.date);
                options = [q.correct, ...q.distractorEvents].map(e => ({ label: e.titre, event: e }));
            }
            options = shuffleArray(options);

            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'quiz-option';
                btn.dataset.eventId = opt.event.id;
                btn.innerText = opt.label;
                btn.onclick = () => answerQuiz(opt.event);
                optionsContainer.appendChild(btn);
            });

            const fiftyBtn = document.getElementById('quiz-fifty-btn');
            fiftyBtn.disabled = quizFiftyLeft <= 0;

            document.getElementById('quiz-hud-count').innerText = `${quizIndex + 1} / ${quizQuestions.length}`;
            const pct = Math.round(quizIndex / quizQuestions.length * 100);
            document.getElementById('quiz-progress-fill').style.width = pct + '%';
            updateQuizHUD();
        }

        function answerQuiz(chosenEvent) {
            if (isAnimating) return;
            isAnimating = true;

            const q = quizQuestions[quizIndex];
            const isPerfect = chosenEvent.date === q.correct.date;
            const gap = Math.abs(chosenEvent.date - q.correct.date);
            awardPoints(gap, isPerfect, { halved: quizFiftyActive });
            if (isPerfect) { playCorrectSound(comboMultiplier); triggerHaptic('success'); } else { playWrongSound(); triggerHaptic('error'); }
            checkBadgeProgressOnAction(isPerfect);
            srsRecord(q.correct.id, isPerfect);
            recordSessionStep(q.correct, isPerfect, false);

            document.querySelectorAll('#quiz-options .quiz-option').forEach(b => {
                b.style.pointerEvents = 'none';
                if (b.dataset.eventId === q.correct.id || (isPerfect && b.dataset.eventId === chosenEvent.id)) b.classList.add('correct');
                else if (b.dataset.eventId === chosenEvent.id) b.classList.add('wrong');
            });

            if (!isPerfect) lives -= 1;
            updateQuizHUD();

            setTimeout(() => {
                quizIndex++;
                if (lives <= 0) {
                    endGame(false);
                } else {
                    renderQuizQuestion();
                }
            }, 1300);
        }

        function useFiftyFifty() {
            if (quizFiftyLeft <= 0 || quizFiftyActive || isAnimating) return;
            quizFiftyLeft -= 1;
            quizFiftyActive = true;
            document.getElementById('quiz-fifty-count').innerText = `(${quizFiftyLeft})`;
            document.getElementById('quiz-fifty-btn').disabled = true;

            const q = quizQuestions[quizIndex];
            const wrongButtons = [...document.querySelectorAll('#quiz-options .quiz-option')]
                .filter(b => b.dataset.eventId !== q.correct.id);
            shuffleArray(wrongButtons).slice(0, 2).forEach(b => {
                b.classList.add('disabled-5050');
                b.style.pointerEvents = 'none';
            });
        }

        function updateQuizHUD() {
            document.getElementById('quiz-hud-score').innerText = score;
            const comboChip = document.getElementById('quiz-hud-combo');
            if (comboMultiplier > 1) {
                comboChip.innerText = `×${comboMultiplier.toFixed(1)}`;
                comboChip.classList.remove('hidden');
            } else {
                comboChip.classList.add('hidden');
            }
            let pips = '';
            for (let i = 0; i < 3; i++) {
                pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
            }
            document.getElementById('quiz-hud-lives').innerHTML = pips;
        }


        // === MODE AVANT / APRÈS ===
        // Chaque question pioche un événement du pool et lui oppose un autre événement
        // à date distincte ; les deux sont affichés sans leur date et il faut désigner
        // le plus ancien. Score « tout ou rien » (comme Périodes & Ères), pas de points
        // partiels puisqu'il ne s'agit pas d'estimer une valeur mais de choisir entre deux.
        function startAvapGame() {
            resetSessionHistory();
            currentMode = 'avantapres';
            let sourceEvents;
            if (revisionMode) {
                sourceEvents = revisionEvents;
            } else {
                const themeEvents = getCurrentTheme().events;
                sourceEvents = (axisFilterActive && selectedAxes.size > 0)
                    ? themeEvents.filter(e => selectedAxes.has(e.axe))
                    : themeEvents;
            }
            if (isSelectionActive && !revisionMode) {
                sourceEvents = sourceEvents.filter(e => selectedEventsIds.has(e.id));
            }
            if (sourceEvents.length < 4) {
                alert("Le mode Avant / Après nécessite au moins 4 événements. Veuillez ajouter d'autres événements à ce thème !");
                return;
            }

            avapQuestions = buildAvapQuestions(sourceEvents);
            if (avapQuestions.length === 0) {
                alert("Impossible de générer des questions pour ce thème (dates toutes identiques).");
                return;
            }

            avapIndex = 0;
            lives = 3;
            score = 0;
            comboMultiplier = 1.0;

            const gameDates = sourceEvents.map(e => e.date);
            currentGameSpan = Math.max(1, Math.max(...gameDates) - Math.min(...gameDates));

            showScreen('screen-avant-apres');
            renderAvapQuestion();
        }

        // Construit une question par événement du pool, opposé à un adversaire tiré au
        // sort parmi les événements à date différente (pour toujours avoir un antérieur
        // net). Position gauche/droite mélangée pour ne pas biaiser vers un côté.
        function buildAvapQuestions(events) {
            const pool = events.filter(e => typeof e.date === 'number');
            if (pool.length < 4) return [];
            const questions = pool.map(evt => {
                const others = pool.filter(e => e.id !== evt.id && e.date !== evt.date);
                if (others.length === 0) return null;
                const opponent = others[Math.floor(Math.random() * others.length)];
                const [left, right] = shuffleArray([evt, opponent]);
                const correctEvt = evt.date < opponent.date ? evt : opponent;
                return { left, right, correctEvt };
            }).filter(Boolean);
            return shuffleArray(questions);
        }

        function renderAvapQuestion() {
            if (avapIndex >= avapQuestions.length) {
                endGame(true);
                return;
            }
            isAnimating = false;

            const q = avapQuestions[avapIndex];
            document.getElementById('avap-option-a-title').innerText = q.left.titre;
            document.getElementById('avap-option-b-title').innerText = q.right.titre;
            document.getElementById('avap-option-a-year').classList.add('hidden');
            document.getElementById('avap-option-b-year').classList.add('hidden');

            const btnA = document.getElementById('avap-option-a');
            const btnB = document.getElementById('avap-option-b');
            btnA.classList.remove('correct', 'wrong');
            btnB.classList.remove('correct', 'wrong');
            btnA.blur();
            btnB.blur();
            btnA.style.pointerEvents = 'auto';
            btnB.style.pointerEvents = 'auto';
            btnA.onclick = () => answerAvap(q.left, btnA);
            btnB.onclick = () => answerAvap(q.right, btnB);

            document.getElementById('avap-hud-count').innerText = `${avapIndex + 1} / ${avapQuestions.length}`;
            const pct = Math.round(avapIndex / avapQuestions.length * 100);
            document.getElementById('avap-progress-fill').style.width = pct + '%';
            updateAvapHUD();
        }

        function answerAvap(chosenEvent, chosenBtn) {
            if (isAnimating) return;
            isAnimating = true;

            const q = avapQuestions[avapIndex];
            const isPerfect = chosenEvent.id === q.correctEvt.id;

            if (isPerfect) {
                const points = Math.round(100 * comboMultiplier);
                score += points;
                comboMultiplier = Math.min(5.0, comboMultiplier + 0.1);
                playCorrectSound(comboMultiplier);
                triggerHaptic('success');
            } else {
                lives -= 1;
                comboMultiplier = 1.0;
                playWrongSound();
                triggerHaptic('error');
            }

            srsRecord(q.correctEvt.id, isPerfect);
            recordSessionStep(q.correctEvt, isPerfect, false);
                checkBadgeProgressOnAction(isPerfect);

            const btnA = document.getElementById('avap-option-a');
            const btnB = document.getElementById('avap-option-b');
            btnA.style.pointerEvents = 'none';
            btnB.style.pointerEvents = 'none';
            [[btnA, q.left], [btnB, q.right]].forEach(([btn, evt]) => {
                if (evt.id === q.correctEvt.id) btn.classList.add('correct');
                else if (btn === chosenBtn) btn.classList.add('wrong');
            });
            document.getElementById('avap-option-a-year').innerText = formatYear(q.left.date);
            document.getElementById('avap-option-b-year').innerText = formatYear(q.right.date);
            document.getElementById('avap-option-a-year').classList.remove('hidden');
            document.getElementById('avap-option-b-year').classList.remove('hidden');

            updateAvapHUD();

            setTimeout(() => {
                avapIndex++;
                if (lives <= 0) {
                    endGame(false);
                } else {
                    renderAvapQuestion();
                }
            }, 1300);
        }

        function updateAvapHUD() {
            document.getElementById('avap-hud-score').innerText = score;
            const comboChip = document.getElementById('avap-hud-combo');
            if (comboMultiplier > 1) {
                comboChip.innerText = `×${comboMultiplier.toFixed(1)}`;
                comboChip.classList.remove('hidden');
            } else {
                comboChip.classList.add('hidden');
            }
            let pips = '';
            for (let i = 0; i < 3; i++) {
                pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
            }
            document.getElementById('avap-hud-lives').innerHTML = pips;
        }


        // === MODE PÉRIODES & ÈRES ===
        let periodesQuestions = [];
        let periodesIndex = 0;

        function startPeriodesGame() {
            resetSessionHistory();
            currentMode = 'periodes';
            let sourceEvents;
            if (revisionMode) {
                sourceEvents = revisionEvents;
            } else {
                const themeEvents = getCurrentTheme().events;
                sourceEvents = (axisFilterActive && selectedAxes.size > 0)
                    ? themeEvents.filter(e => selectedAxes.has(e.axe))
                    : themeEvents;
            }
            if (isSelectionActive && !revisionMode) {
                sourceEvents = sourceEvents.filter(e => selectedEventsIds.has(e.id));
            }
            if (sourceEvents.length < 4) {
                alert("Le mode Périodes & Ères nécessite au moins 4 événements. Veuillez ajouter d'autres événements à ce thème !");
                return;
            }

            periodesQuestions = buildPeriodesQuestions(sourceEvents);
            if (periodesQuestions.length === 0) {
                alert("Impossible de générer des questions pour ce thème.");
                return;
            }

            periodesIndex = 0;
            lives = 3;
            score = 0;
            comboMultiplier = 1.0;

            const gameDates = sourceEvents.map(e => e.date);
            currentGameSpan = Math.max(1, Math.max(...gameDates) - Math.min(...gameDates));

            showScreen('screen-periodes');
            renderPeriodesQuestion();
        }

        function buildPeriodesQuestions(events) {
            const pool = events.filter(e => typeof e.date === 'number');
            if (pool.length < 4) return [];

            const gameDates = pool.map(e => e.date);
            const span = Math.max(1, Math.max(...gameDates) - Math.min(...gameDates));
            const distinctAxes = [...new Set(pool.map(e => e.axe).filter(Boolean))];

            const questions = [];

            pool.forEach(evt => {
                let qType = 'century';
                const hasAxe = evt.axe && distinctAxes.length >= 3;
                const hasSpan = evt.dateFin != null && evt.dateFin !== evt.date;

                const choices = ['century'];
                if (hasAxe) choices.push('axe');
                if (hasSpan) choices.push('span');
                if (pool.length >= 6) choices.push('contemporary');

                qType = choices[Math.floor(Math.random() * choices.length)];

                if (qType === 'axe') {
                    // Question : Quel est l'axe / l'époque thématique ?
                    const correctAxe = evt.axe;
                    const otherAxes = distinctAxes.filter(a => a !== correctAxe);
                    const distractorAxes = shuffleArray(otherAxes).slice(0, 3);
                    const options = shuffleArray([
                        { main: correctAxe, sub: "Ère / Axe thématique", isCorrect: true, evt: evt },
                        ...distractorAxes.map(a => ({ main: a, sub: "Ère / Axe thématique", isCorrect: false, evt: null }))
                    ]);
                    questions.push({
                        kicker: "Rattachement d'époque",
                        prompt: evt.titre,
                        tag: formatYear(evt.date),
                        options: options,
                        correctEvt: evt
                    });
                } else if (qType === 'span') {
                    // Question : Quelle est la durée / l'intervalle exact ?
                    const correctText = formatEventDate(evt);
                    const durationText = formatEventDuration(evt);
                    const diff = Math.abs(evt.dateFin - evt.date);
                    
                    // Générer 3 faux intervalles décalés
                    const offsets = [-30, -15, 15, 30, -50, 50, -100, 100];
                    const shuffledOffsets = shuffleArray(offsets);
                    const distractorSpans = [];
                    for (let off of shuffledOffsets) {
                        const fakeStart = evt.date + off;
                        const fakeEnd = fakeStart + diff;
                        const label = `${formatYear(fakeStart)} – ${formatYear(fakeEnd)}`;
                        if (label !== correctText && !distractorSpans.includes(label)) {
                            distractorSpans.push(label);
                            if (distractorSpans.length === 3) break;
                        }
                    }

                    const options = shuffleArray([
                        { main: correctText, sub: durationText ? `Durée : ${durationText}` : '', isCorrect: true, evt: evt },
                        ...distractorSpans.map(s => ({ main: s, sub: durationText ? `Durée : ${durationText}` : '', isCorrect: false, evt: null }))
                    ]);

                    questions.push({
                        kicker: "Durée & Période exacte",
                        prompt: evt.titre,
                        tag: "Événement de longue durée",
                        options: options,
                        correctEvt: evt
                    });
                } else if (qType === 'contemporary') {
                    // Question : Quel événement s'est déroulé dans la même tranche chronologique ?
                    const halfSpan = Math.max(20, Math.round(span * 0.15));
                    const contemporaries = pool.filter(e => e.id !== evt.id && Math.abs(e.date - evt.date) <= halfSpan);
                    const distantEvents = pool.filter(e => e.id !== evt.id && Math.abs(e.date - evt.date) > halfSpan);

                    if (contemporaries.length > 0 && distantEvents.length >= 3) {
                        const correctOther = contemporaries[Math.floor(Math.random() * contemporaries.length)];
                        const distractors = shuffleArray(distantEvents).slice(0, 3);

                        // Pas d'année affichée sur les options : sinon la comparaison avec
                        // la date indiquée dans l'énoncé rend la réponse trop évidente.
                        const options = shuffleArray([
                            { main: correctOther.titre, sub: '', isCorrect: true, evt: correctOther },
                            ...distractors.map(d => ({ main: d.titre, sub: '', isCorrect: false, evt: d }))
                        ]);

                        questions.push({
                            kicker: "Contemporains & Même époque",
                            prompt: `Lequel de ces événements est contemporain de :`,
                            tag: `« ${evt.titre} » (${formatYear(evt.date)})`,
                            options: options,
                            correctEvt: evt
                        });
                    } else {
                        // Fallback vers century
                        qType = 'century';
                    }
                }

                if (qType === 'century') {
                    // Question : Dans quel siècle ou grande tranche se situe l'événement ?
                    let correctLabel = (span > 300) ? getCenturyLabel(evt.date) : getPeriodSliceLabel(evt.date, span);
                    let step = (span > 300) ? 100 : ((span <= 60) ? 10 : ((span <= 150) ? 25 : 50));

                    const distractorEntries = [];
                    const offsets = [-3, -2, -1, 1, 2, 3, 4, -4];
                    for (let off of offsets) {
                        const fakeYear = evt.date + (off * step);
                        const fakeLabel = (span > 300) ? getCenturyLabel(fakeYear) : getPeriodSliceLabel(fakeYear, span);
                        if (fakeLabel !== correctLabel && !distractorEntries.some(d => d.label === fakeLabel)) {
                            distractorEntries.push({ label: fakeLabel, year: fakeYear });
                            if (distractorEntries.length === 3) break;
                        }
                    }

                    // Réponses triées chronologiquement (et non mélangées) pour que les
                    // siècles / tranches se lisent dans l'ordre.
                    const options = [
                        { main: correctLabel, sub: "Tranche chronologique", isCorrect: true, evt: evt, sortYear: evt.date },
                        ...distractorEntries.map(d => ({ main: d.label, sub: "Tranche chronologique", isCorrect: false, evt: null, sortYear: d.year }))
                    ].sort((a, b) => a.sortYear - b.sortYear);

                    questions.push({
                        kicker: "Tranche chronologique & Siècle",
                        prompt: evt.titre,
                        tag: evt.axe ? `Axe : ${evt.axe}` : '',
                        options: options,
                        correctEvt: evt
                    });
                }
            });

            return shuffleArray(questions);
        }

        function renderPeriodesQuestion() {
            if (periodesIndex >= periodesQuestions.length) {
                endGame(true);
                return;
            }

            isAnimating = false;
            const q = periodesQuestions[periodesIndex];

            document.getElementById('periodes-kicker').innerText = q.kicker;
            document.getElementById('periodes-prompt').innerText = q.prompt;

            const tagEl = document.getElementById('periodes-tag');
            if (q.tag) {
                tagEl.innerText = q.tag;
                tagEl.classList.remove('hidden');
            } else {
                tagEl.classList.add('hidden');
            }

            const optionsContainer = document.getElementById('periodes-options');
            optionsContainer.innerHTML = '';

            q.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'periodes-option';
                btn.innerHTML = `<span class="periodes-option-main">${opt.main}</span>` +
                               (opt.sub ? `<span class="periodes-option-sub">${opt.sub}</span>` : '');
                btn.onclick = () => answerPeriodes(opt, idx);
                optionsContainer.appendChild(btn);
            });

            document.getElementById('periodes-hud-count').innerText = `${periodesIndex + 1} / ${periodesQuestions.length}`;
            const pct = Math.round(periodesIndex / periodesQuestions.length * 100);
            document.getElementById('periodes-progress-fill').style.width = pct + '%';
            updatePeriodesHUD();
        }

        function answerPeriodes(chosenOption, optionIndex) {
            if (isAnimating) return;
            isAnimating = true;

            const q = periodesQuestions[periodesIndex];
            const isPerfect = chosenOption.isCorrect;

            let points = 0;
            if (isPerfect) {
                points = Math.round(100 * comboMultiplier);
                comboMultiplier = Math.min(5.0, comboMultiplier + 0.1);
                score += points;
                playCorrectSound(comboMultiplier);
                triggerHaptic('success');
            } else {
                lives -= 1;
                comboMultiplier = 1.0;
                playWrongSound();
            }

            if (q.correctEvt) {
                srsRecord(q.correctEvt.id, isPerfect);
            }

            const allButtons = document.querySelectorAll('#periodes-options .periodes-option');
            allButtons.forEach((btn, idx) => {
                btn.style.pointerEvents = 'none';
                if (q.options[idx].isCorrect) {
                    btn.classList.add('correct');
                } else if (idx === optionIndex) {
                    btn.classList.add('wrong');
                }
            });

            updatePeriodesHUD();

            setTimeout(() => {
                periodesIndex++;
                if (lives <= 0) {
                    endGame(false);
                } else {
                    renderPeriodesQuestion();
                }
            }, 1250);
        }

        function updatePeriodesHUD() {
            document.getElementById('periodes-hud-score').innerText = score;
            const comboChip = document.getElementById('periodes-hud-combo');
            if (comboMultiplier > 1) {
                comboChip.innerText = `×${comboMultiplier.toFixed(1)}`;
                comboChip.classList.remove('hidden');
            } else {
                comboChip.classList.add('hidden');
            }
            let pips = '';
            for (let i = 0; i < 3; i++) {
                pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
            }
            document.getElementById('periodes-hud-lives').innerHTML = pips;
        }

        // === MODE LE FIL DU TEMPS ===
        // Les événements du pool sont triés chronologiquement (du plus ancien au plus
        // récent) et présentés un par un ; il faut en saisir l'année exacte au clavier
        // numérique. Le principe de score par écart d'années et de combo est identique
        // aux autres modes (voir awardPoints).
        function startFilGame() {
            resetSessionHistory();
            currentMode = 'fil';
            let sourceEvents;
            if (revisionMode) {
                sourceEvents = revisionEvents;
            } else {
                const themeEvents = getCurrentTheme().events;
                sourceEvents = (axisFilterActive && selectedAxes.size > 0)
                    ? themeEvents.filter(e => selectedAxes.has(e.axe))
                    : themeEvents;
            }
            if (isSelectionActive && !revisionMode) {
                sourceEvents = sourceEvents.filter(e => selectedEventsIds.has(e.id));
            }
            if (sourceEvents.length === 0) {
                alert("Ce thème ne contient aucun événement. Veuillez d'abord ajouter des événements via « Ajouter un événement » !");
                return;
            }

            filEvents = [...sourceEvents].sort((a, b) => a.date - b.date);
            filIndex = 0;
            lives = 3;
            score = 0;
            comboMultiplier = 1.0;

            const gameDates = sourceEvents.map(e => e.date);
            currentGameSpan = Math.max(1, Math.max(...gameDates) - Math.min(...gameDates));

            showScreen('screen-fil');
            renderFilQuestion();
        }

        function renderFilQuestion() {
            if (filIndex >= filEvents.length) {
                endGame(true);
                return;
            }
            isAnimating = false;
            filInput = '';
            filEra = 1;
            filHintsRevealed = 0;
            document.getElementById('fil-hint-btn').disabled = false;

            const evt = filEvents[filIndex];
            filCorrectYearString = Math.abs(evt.date).toString();

            document.getElementById('fil-prompt').innerText = evt.titre;
            
            const badge = document.getElementById('fil-answer-badge');
            badge.className = 'fil-answer-badge hidden';
            badge.innerText = '';
            
            updateFilDisplay();

            document.getElementById('fil-hud-count').innerText = `${filIndex + 1} / ${filEvents.length}`;
            const pct = Math.round(filIndex / filEvents.length * 100);
            document.getElementById('fil-progress-fill').style.width = pct + '%';
            updateFilHUD();
        }

        function filUseHint() {
            if (isAnimating) return;
            const evt = filEvents[filIndex];
            const targetStr = filCorrectYearString;
            
            if (filHintsRevealed === 0) {
                filEra = evt.date < 0 ? -1 : 1;
            }

            if (filHintsRevealed < targetStr.length) {
                filHintsRevealed++;
                let currentInput = filInput;
                let newStr = '';
                for (let i = 0; i < targetStr.length; i++) {
                    if (i < filHintsRevealed) {
                        newStr += targetStr[i];
                    } else if (i < currentInput.length) {
                        newStr += currentInput[i];
                    }
                }
                filInput = newStr;
                updateFilDisplay();

                if (filHintsRevealed === targetStr.length) {
                    filSubmit(true);
                }
            }
        }

        function filToggleEra() {
            if (isAnimating || filHintsRevealed > 0) return;
            filEra = filEra === 1 ? -1 : 1;
            updateFilDisplay();
        }

        function filKeyPress(digit) {
            if (isAnimating) return;
            if (filInput.length >= 7) return;
            filInput += digit;
            updateFilDisplay();
        }

        function filBackspace() {
            if (isAnimating) return;
            if (filInput.length > filHintsRevealed) {
                filInput = filInput.slice(0, -1);
                updateFilDisplay();
            }
        }

        function filClear() {
            if (isAnimating) return;
            filInput = filInput.slice(0, filHintsRevealed);
            updateFilDisplay();
        }

        function updateFilDisplay() {
            const eraBtn = document.getElementById('fil-era-btn');
            eraBtn.innerText = filEra === 1 ? 'apr. J.-C.' : 'av. J.-C.';
            eraBtn.classList.toggle('era-bc', filEra === -1);

            const display = document.getElementById('fil-display-value');
            if (!filInput) {
                display.innerHTML = '—';
            } else {
                let html = '';
                for (let i = 0; i < filInput.length; i++) {
                    if (i < filHintsRevealed) {
                        html += `<span style="color: #2CA85A;">${filInput[i]}</span>`;
                    } else {
                        html += filInput[i];
                    }
                }
                display.innerHTML = html;
            }
            display.classList.remove('fil-feedback-correct', 'fil-feedback-wrong');

            document.getElementById('fil-validate-btn').disabled = filInput.length === 0 && filHintsRevealed === 0;
            document.getElementById('fil-hint-btn').disabled = (filHintsRevealed >= filCorrectYearString.length);
        }

        function filSubmit(autoFailByHint = false) {
            // handle event signature difference since onclick passes no args
            if (typeof autoFailByHint !== 'boolean') autoFailByHint = false;
            if (isAnimating) return;
            if (!autoFailByHint && filInput.length === 0) return;
            isAnimating = true;

            const evt = filEvents[filIndex];
            const guessedYear = filEra * parseInt(filInput, 10);
            const gap = autoFailByHint ? Infinity : Math.abs(guessedYear - evt.date);
            const isPerfect = gap === 0;

            if (autoFailByHint) {
                lives -= 1;
                comboMultiplier = 1.0;
                playWrongSound();
            } else {
                let deduction = filHintsRevealed * 25;
                if (deduction > 100) deduction = 100;

                let points = 0;
                if (isPerfect) {
                    points = Math.max(0, 100 - deduction);
                    if (filHintsRevealed === 0) {
                        points = Math.round(points * comboMultiplier);
                        comboMultiplier = Math.min(5.0, comboMultiplier + 0.1);
                    } else {
                        comboMultiplier = 1.0;
                    }
                    score += points;
                    playCorrectSound(comboMultiplier);
                    triggerHaptic('success');
                    triggerHaptic('success');
                } else {
                    lives -= 1;
                    const maxGap = Math.max(currentGameSpan, 10);
                    let basePts = 100 * (1 - (gap / maxGap));
                    if (basePts < 0) basePts = 0;
                    points = Math.max(0, Math.round(basePts) - deduction);
                    score += points;
                    comboMultiplier = 1.0;
                    playWrongSound();
                    triggerHaptic('error');
                    triggerHaptic('error');
                }
            }

            srsRecord(evt.id, isPerfect);
            recordSessionStep(evt, isPerfect, isPerfect && filHintsRevealed > 0);
            checkBadgeProgressOnAction(isPerfect);
            updateFilHUD();

            const display = document.getElementById('fil-display-value');
            display.classList.add(isPerfect ? 'fil-feedback-correct' : 'fil-feedback-wrong');
            document.getElementById('fil-validate-btn').disabled = true;
            document.getElementById('fil-hint-btn').disabled = true;

            const badge = document.getElementById('fil-answer-badge');
            if (!isPerfect) {
                badge.innerText = `Bonne réponse : ${formatYear(evt.date)}`;
                badge.className = 'fil-answer-badge badge-wrong';
            } else if (isPerfect && filHintsRevealed > 0) {
                 badge.innerText = `Exact (avec indice)`;
                 badge.className = 'fil-answer-badge badge-correct';
            } else {
                 badge.innerText = `Exact !`;
                 badge.className = 'fil-answer-badge badge-correct';
            }

            setTimeout(() => {
                filIndex++;
                if (lives <= 0) {
                    endGame(false);
                } else {
                    renderFilQuestion();
                }
            }, 1800);
        }

        function updateFilHUD() {
            document.getElementById('fil-hud-score').innerText = score;
            const comboChip = document.getElementById('fil-hud-combo');
            if (comboMultiplier > 1) {
                comboChip.innerText = `×${comboMultiplier.toFixed(1)}`;
                comboChip.classList.remove('hidden');
            } else {
                comboChip.classList.add('hidden');
            }
            let pips = '';
            for (let i = 0; i < 3; i++) {
                pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
            }
            document.getElementById('fil-hud-lives').innerHTML = pips;
        }

        // === MODE TROUVE L'ÉCART ===
        // Chaque question oppose deux événements (même appariement que Avant / Après)
        // affichés sans leurs dates ; il faut saisir au clavier le nombre d'années qui
        // les séparent. Reprend le mécanisme d'indice chiffre par chiffre et le principe
        // de proximité du Fil du temps, appliqués ici à l'écart plutôt qu'à une année.
        function startEcartGame() {
            resetSessionHistory();
            currentMode = 'ecart';
            let sourceEvents;
            if (revisionMode) {
                sourceEvents = revisionEvents;
            } else {
                const themeEvents = getCurrentTheme().events;
                sourceEvents = (axisFilterActive && selectedAxes.size > 0)
                    ? themeEvents.filter(e => selectedAxes.has(e.axe))
                    : themeEvents;
            }
            if (isSelectionActive && !revisionMode) {
                sourceEvents = sourceEvents.filter(e => selectedEventsIds.has(e.id));
            }
            if (sourceEvents.length < 4) {
                alert("Le mode Trouve l'écart nécessite au moins 4 événements. Veuillez ajouter d'autres événements à ce thème !");
                return;
            }

            ecartQuestions = buildEcartQuestions(sourceEvents);
            if (ecartQuestions.length === 0) {
                alert("Impossible de générer des questions pour ce thème (dates toutes identiques).");
                return;
            }

            ecartIndex = 0;
            lives = 3;
            score = 0;
            comboMultiplier = 1.0;

            const gameDates = sourceEvents.map(e => e.date);
            currentGameSpan = Math.max(1, Math.max(...gameDates) - Math.min(...gameDates));

            showScreen('screen-ecart');
            renderEcartQuestion();
        }

        function buildEcartQuestions(events) {
            const pool = events.filter(e => typeof e.date === 'number');
            if (pool.length < 4) return [];
            const questions = pool.map(evt => {
                const others = pool.filter(e => e.id !== evt.id && e.date !== evt.date);
                if (others.length === 0) return null;
                const opponent = others[Math.floor(Math.random() * others.length)];
                return { eventA: evt, eventB: opponent, gap: Math.abs(evt.date - opponent.date) };
            }).filter(Boolean);
            return shuffleArray(questions);
        }

        function renderEcartQuestion() {
            if (ecartIndex >= ecartQuestions.length) {
                endGame(true);
                return;
            }
            isAnimating = false;
            ecartInput = '';
            ecartHintsRevealed = 0;
            document.getElementById('ecart-hint-btn').disabled = false;

            const q = ecartQuestions[ecartIndex];
            ecartCorrectGapString = q.gap.toString();

            document.getElementById('ecart-event-a').innerText = q.eventA.titre;
            document.getElementById('ecart-event-b').innerText = q.eventB.titre;
            document.getElementById('ecart-event-a-year').classList.add('hidden');
            document.getElementById('ecart-event-b-year').classList.add('hidden');

            const badge = document.getElementById('ecart-answer-badge');
            badge.className = 'fil-answer-badge hidden';
            badge.innerText = '';

            updateEcartDisplay();

            document.getElementById('ecart-hud-count').innerText = `${ecartIndex + 1} / ${ecartQuestions.length}`;
            const pct = Math.round(ecartIndex / ecartQuestions.length * 100);
            document.getElementById('ecart-progress-fill').style.width = pct + '%';
            updateEcartHUD();
        }

        function ecartUseHint() {
            if (isAnimating) return;
            const targetStr = ecartCorrectGapString;

            if (ecartHintsRevealed < targetStr.length) {
                ecartHintsRevealed++;
                let currentInput = ecartInput;
                let newStr = '';
                for (let i = 0; i < targetStr.length; i++) {
                    if (i < ecartHintsRevealed) {
                        newStr += targetStr[i];
                    } else if (i < currentInput.length) {
                        newStr += currentInput[i];
                    }
                }
                ecartInput = newStr;
                updateEcartDisplay();

                if (ecartHintsRevealed === targetStr.length) {
                    ecartSubmit(true);
                }
            }
        }

        function ecartKeyPress(digit) {
            if (isAnimating) return;
            if (ecartInput.length >= 6) return;
            ecartInput += digit;
            updateEcartDisplay();
        }

        function ecartBackspace() {
            if (isAnimating) return;
            if (ecartInput.length > ecartHintsRevealed) {
                ecartInput = ecartInput.slice(0, -1);
                updateEcartDisplay();
            }
        }

        function ecartClear() {
            if (isAnimating) return;
            ecartInput = ecartInput.slice(0, ecartHintsRevealed);
            updateEcartDisplay();
        }

        function updateEcartDisplay() {
            const display = document.getElementById('ecart-display-value');
            if (!ecartInput) {
                display.innerHTML = '—';
            } else {
                let html = '';
                for (let i = 0; i < ecartInput.length; i++) {
                    if (i < ecartHintsRevealed) {
                        html += `<span style="color: #2CA85A;">${ecartInput[i]}</span>`;
                    } else {
                        html += ecartInput[i];
                    }
                }
                display.innerHTML = html;
            }
            display.classList.remove('fil-feedback-correct', 'fil-feedback-wrong');

            document.getElementById('ecart-validate-btn').disabled = ecartInput.length === 0 && ecartHintsRevealed === 0;
            document.getElementById('ecart-hint-btn').disabled = (ecartHintsRevealed >= ecartCorrectGapString.length);
        }

        function ecartSubmit(autoFailByHint = false) {
            // gère la différence de signature puisque onclick n'y passe aucun argument
            if (typeof autoFailByHint !== 'boolean') autoFailByHint = false;
            if (isAnimating) return;
            if (!autoFailByHint && ecartInput.length === 0) return;
            isAnimating = true;

            const q = ecartQuestions[ecartIndex];
            const guessedGap = parseInt(ecartInput, 10);
            const gapError = autoFailByHint ? Infinity : Math.abs(guessedGap - q.gap);
            const isPerfect = gapError === 0;

            if (autoFailByHint) {
                lives -= 1;
                comboMultiplier = 1.0;
                playWrongSound();
            } else {
                let deduction = ecartHintsRevealed * 25;
                if (deduction > 100) deduction = 100;

                let points = 0;
                if (isPerfect) {
                    points = Math.max(0, 100 - deduction);
                    if (ecartHintsRevealed === 0) {
                        points = Math.round(points * comboMultiplier);
                        comboMultiplier = Math.min(5.0, comboMultiplier + 0.1);
                    } else {
                        comboMultiplier = 1.0;
                    }
                    score += points;
                    playCorrectSound(comboMultiplier);
                } else {
                    lives -= 1;
                    const maxGap = Math.max(currentGameSpan, 10);
                    let basePts = 100 * (1 - (gapError / maxGap));
                    if (basePts < 0) basePts = 0;
                    points = Math.max(0, Math.round(basePts) - deduction);
                    score += points;
                    comboMultiplier = 1.0;
                    playWrongSound();
                }
            }

            srsRecord(q.eventA, isPerfect);
            srsRecord(q.eventB, isPerfect);
            recordSessionStep(q.eventA, isPerfect, isPerfect && ecartHintsRevealed > 0);
            checkBadgeProgressOnAction(isPerfect);
            updateEcartHUD();

            const display = document.getElementById('ecart-display-value');
            display.classList.add(isPerfect ? 'fil-feedback-correct' : 'fil-feedback-wrong');
            document.getElementById('ecart-validate-btn').disabled = true;
            document.getElementById('ecart-hint-btn').disabled = true;

            const badge = document.getElementById('ecart-answer-badge');
            if (!isPerfect) {
                badge.innerText = `Écart réel : ${q.gap} an${q.gap > 1 ? 's' : ''}`;
                badge.className = 'fil-answer-badge badge-wrong';
            } else if (ecartHintsRevealed > 0) {
                badge.innerText = `Exact (avec indice)`;
                badge.className = 'fil-answer-badge badge-correct';
            } else {
                badge.innerText = `Exact !`;
                badge.className = 'fil-answer-badge badge-correct';
            }

            document.getElementById('ecart-event-a-year').innerText = formatYear(q.eventA.date);
            document.getElementById('ecart-event-b-year').innerText = formatYear(q.eventB.date);
            document.getElementById('ecart-event-a-year').classList.remove('hidden');
            document.getElementById('ecart-event-b-year').classList.remove('hidden');

            setTimeout(() => {
                ecartIndex++;
                if (lives <= 0) {
                    endGame(false);
                } else {
                    renderEcartQuestion();
                }
            }, 1800);
        }

        function updateEcartHUD() {
            document.getElementById('ecart-hud-score').innerText = score;
            const comboChip = document.getElementById('ecart-hud-combo');
            if (comboMultiplier > 1) {
                comboChip.innerText = `×${comboMultiplier.toFixed(1)}`;
                comboChip.classList.remove('hidden');
            } else {
                comboChip.classList.add('hidden');
            }
            let pips = '';
            for (let i = 0; i < 3; i++) {
                pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
            }
            document.getElementById('ecart-hud-lives').innerHTML = pips;
        }

        // CHRONOMÈTRE
        function startTimer() {
            startTime = Date.now();
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                let elapsed = (Date.now() - startTime) / 1000;
                document.getElementById('hud-timer').innerText = elapsed.toFixed(1).replace('.', ',');
            }, 100);
        }

        function stopTimer() {
            if (timerInterval) clearInterval(timerInterval);
            totalTimePlayed = (Date.now() - startTime) / 1000;
        }

        // LOGIQUE DE JEU
        function pickNextEvent() {
            playCardSlideSound();
            if (currentPool.length === 0) {
                if (currentMode === 'multi') {
                    endMultiplayerGame();
                } else {
                    endGame(true); 
                }
                return;
            }
            eventToPlace = currentPool.pop();
            questionStartTime = Date.now();
            // L'événement en jeu reste « en main », épinglé en bas de l'écran, date masquée
            const hand = document.getElementById('hand');
            hand.classList.remove('hand-revealed');
            document.getElementById('hand-kicker').innerText =
                (placedEvents.length === 1) ? 'Touchez un intervalle' : 'À placer';
            document.getElementById('hand-year').innerText = '?';
            // Défi du jour : les 10 événements viennent de thèmes très divers, et un
            // titre seul manque parfois de contexte (« Fondation légendaire par saint
            // Marin », « Colonisation française »...). On rappelle donc le thème
            // d'origine entre parenthèses tant que l'événement est « en main » ; une
            // fois placé sur la frise, buildEntry n'affiche plus que le titre, comme
            // dans les autres modes.
            const dailyThemeName = dailyChallengeMode
                ? (dailyChallengeEventsWithLocation.find(item => item.event.id === eventToPlace.id) || {}).theme
                : null;
            document.getElementById('hand-title').innerHTML = dailyThemeName
                ? `${eventToPlace.titre} <em class="hand-title-theme">(${dailyThemeName.nom})</em>`
                : eventToPlace.titre;
            renderTimeline();
        }

        function updateHUD() {
            if (currentMode === 'multi') {
                const cp = multiPlayers[currentMultiPlayerIndex];
                document.getElementById('hud-score').innerText = cp.score;
                const comboChip = document.getElementById('hud-combo');
                if (cp.comboMultiplier > 1) {
                    comboChip.innerText = `×${cp.comboMultiplier.toFixed(1)}`;
                    comboChip.classList.remove('hidden');
                } else {
                    comboChip.classList.add('hidden');
                }
                
                let pips = `<span class="multi-player-hud">${cp.name}</span> `;
                for (let i = 0; i < 2; i++) {
                    pips += `<span class="pip${i < cp.lives ? '' : ' spent'}"></span>`;
                }
                document.getElementById('hud-lives').innerHTML = pips;
            } else {
                document.getElementById('hud-score').innerText = score;
                const comboChip = document.getElementById('hud-combo');
                if (comboMultiplier > 1) {
                    comboChip.innerText = `×${comboMultiplier.toFixed(1)}`;
                    comboChip.classList.remove('hidden');
                } else {
                    comboChip.classList.add('hidden');
                }

                if (currentMode !== 'training' && currentMode !== 'discovery') {
                    const maxLives = (currentMode === 'expert') ? 1 : 3;
                    let pips = '';
                    for (let i = 0; i < maxLives; i++) {
                        pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
                    }
                    document.getElementById('hud-lives').innerHTML = pips;
                }
            }

            if (currentMode !== 'discovery') {
                document.getElementById('hud-count').innerText = `${placedEvents.length} / ${totalEvents}`;
                const pct = totalEvents ? Math.round(placedEvents.length / totalEvents * 100) : 0;
                document.getElementById('hud-progress-fill').style.width = pct + '%';
            }
        }

        // Icônes œil ouvert / œil barré du bouton d'épinglage de la légende des axes.
        const AXES_EYE_OPEN_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>';
        const AXES_EYE_CLOSED_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.32 20.32 0 0 1 5.06-6.06M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.32 20.32 0 0 1-3.22 4.36M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';

        function renderAxesLegend() {
            const legendEl = document.getElementById('timeline-axes-legend');
            if (!legendEl) return;
            if (currentMode === 'discovery' && currentThemeAxes && currentThemeAxes.length > 1) {
                const pinned = appSettings.axesLegendPinned !== false;
                const badges = currentThemeAxes.map(axe => {
                    const color = getAxisColor(axe);
                    return `<span class="entry-axe-badge" data-axis="${color ? color.name : 'blue'}">${axe}</span>`;
                }).join('');
                const toggleLabel = pinned
                    ? "Masquer les axes pendant le défilement"
                    : "Garder les axes visibles pendant le défilement";
                legendEl.innerHTML = '<span class="axes-legend-title">Axes :</span>' + badges +
                    `<button type="button" class="axes-legend-toggle" onclick="toggleAxesLegendPin()" aria-label="${toggleLabel}" aria-pressed="${pinned}" title="${toggleLabel}">${pinned ? AXES_EYE_OPEN_SVG : AXES_EYE_CLOSED_SVG}</button>`;
                legendEl.classList.remove('hidden');
                legendEl.classList.toggle('pinned', pinned);
            } else {
                legendEl.classList.add('hidden');
            }
        }

        // Bascule entre légende des axes toujours épinglée (œil ouvert) et
        // légende visible seulement au début de la frise (œil fermé).
        function toggleAxesLegendPin() {
            appSettings.axesLegendPinned = appSettings.axesLegendPinned === false;
            settingsSave(appSettings);
            renderAxesLegend();
        }

        // RENDU DE LA COLONNE CHRONOLOGIQUE
        // Un intervalle d'insertion nommé est intercalé entre chaque repère :
        // le joueur choisit explicitement la fourchette où il pense placer l'événement.
        function renderTimeline() {
            const timeline = document.getElementById('timeline');
            const isPlaying = currentMode !== 'discovery';
            timeline.className = isPlaying ? 'chrono playing' : 'chrono';
            timeline.innerHTML = '';

            renderAxesLegend();

            for (let i = 0; i <= placedEvents.length; i++) {
                if (isPlaying) timeline.appendChild(buildSlot(i));
                if (i < placedEvents.length) timeline.appendChild(buildEntry(placedEvents[i]));
            }
        }

        // Libellé de l'intervalle : « Avant 1789 », « Entre 1789 et 1848 », « Après 1981 »
        function slotLabel(index) {
            const before = placedEvents[index - 1];
            const after = placedEvents[index];
            if (!before) return `Avant ${formatYear(after.date)}`;
            if (!after) return `Après ${formatYear(before.date)}`;
            return `Entre ${formatYear(before.date)} et ${formatYear(after.date)}`;
        }

        function buildSlot(index) {
            const label = slotLabel(index);
            const slot = document.createElement('button');
            slot.type = 'button';
            slot.className = 'slot';
            slot.setAttribute('aria-label', `Placer ici : ${label}`);
            slot.innerHTML = `<span class="slot-grid"><span></span><span class="slot-caret"></span>` +
                `<span class="slot-body"><span class="slot-label">${label}</span></span></span>`;
            slot.onclick = () => checkPlacement(index, slot);
            return slot;
        }

        function buildEntry(evt) {
            const row = document.createElement('div');
            row.className = evt.missed ? 'entry entry-missed' : 'entry';
            row.dataset.eventId = evt.id;

            let axeHtml = '';
            if (evt.axe) {
                const color = getAxisColor(evt.axe);
                if (color) {
                    axeHtml = `<span class="entry-axe-badge" data-axis="${color.name}" title="${evt.axe}">${evt.axe}</span>`;
                }
            }

            const dateText = currentMode === 'discovery' ? formatEventDate(evt) : formatYear(evt.date);
            row.innerHTML = `<span class="entry-year">${dateText}</span>` +
                `<span class="entry-tick"></span>` +
                `<span class="entry-body"><span class="entry-title">${evt.titre}</span>` +
                axeHtml +
                (evt.missed ? `<span class="entry-flag">manqué</span>` : '') +
                `<span class="entry-chevron" aria-hidden="true">›</span></span>`;
            row.onclick = () => {
                // Défi du jour : les événements viennent de thèmes divers, donc on
                // affiche la ligne « Jouer sur ce thème » (.modal-theme-row) pour
                // pouvoir rejoindre le thème d'origine — sans proposer de repiochage,
                // qui n'a pas de sens pour un tirage quotidien commun à tous.
                if (dailyChallengeMode) {
                    const ctx = dailyChallengeEventsWithLocation.find(item => item.event.id === evt.id);
                    openModal(evt, ctx ? { ...ctx, hideRedraw: true } : null);
                } else {
                    openModal(evt);
                }
            };
            return row;
        }

        // Amène un repère au centre de la colonne et le signale visuellement
        function focusEntry(eventId, extraClass) {
            const row = document.querySelector(`#timeline .entry[data-event-id="${eventId}"]`);
            if (!row) return;
            if (extraClass) row.classList.add(extraClass);
            row.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
        }

        // Calcule et applique les points d'une réponse (frise ou Quiz), et fait évoluer le
        // combo en conséquence. gap = écart en années entre la date réelle et la réponse
        // choisie (0 si la réponse est parfaite). Voir la modale « Explications du calcul
        // des points » pour le détail pédagogique de cette formule.
        function awardPoints(gap, isPerfect, opts = {}) {
            if (currentMode === 'training' || currentMode === 'discovery') return 0;
            const ratio = Math.max(0, 1 - gap / currentGameSpan);
            let pts = Math.round(100 * ratio * (isPerfect ? comboMultiplier : 1));
            if (opts.speedBonus) pts += opts.speedBonus;
            if (opts.halved) pts = Math.round(pts / 2);
            if (currentMode === 'multi') {
                multiPlayers[currentMultiPlayerIndex].score += pts;
                multiPlayers[currentMultiPlayerIndex].comboMultiplier = isPerfect ? Math.round((multiPlayers[currentMultiPlayerIndex].comboMultiplier + 0.1) * 10) / 10 : 1.0;
            } else {
                score += pts;
            }
            comboMultiplier = isPerfect ? Math.round((comboMultiplier + 0.1) * 10) / 10 : 1.0;
            return pts;
        }

        function checkPlacement(index, slotElement) {
            if (isAnimating || currentMode === 'discovery') return;

            const dateToPlace = eventToPlace.date;
            let isCorrect = true;
            let gap = 0;

            if (index > 0) {
                const prevEvent = placedEvents[index - 1];
                if (dateToPlace < prevEvent.date) { isCorrect = false; gap = prevEvent.date - dateToPlace; }
            }
            if (index < placedEvents.length) {
                const nextEvent = placedEvents[index];
                if (dateToPlace > nextEvent.date) { isCorrect = false; gap = Math.max(gap, dateToPlace - nextEvent.date); }
            }

            if (isCorrect) {
                let speedBonus = 0;
                if (currentMode === 'chrono' || currentMode === 'expert' || currentMode === 'daily') {
                    const elapsed = (Date.now() - questionStartTime) / 1000;
                    speedBonus = Math.round(50 * Math.max(0, 1 - elapsed / 15));
                }
                awardPoints(0, true, { speedBonus });
                playCorrectSound(comboMultiplier);
                playCardPlaceSound();
                triggerHaptic('success');
                srsRecord(eventToPlace.id, true);
                checkBadgeProgressOnAction(true);
                recordSessionStep(eventToPlace, true, false);
                const placedId = eventToPlace.id;
                placedEvents.splice(index, 0, eventToPlace);
                updateHUD();
                focusEntry(placedId, 'entry-new');
                if (currentMode === 'multi') {
                    setTimeout(() => nextMultiPlayerTurn(), 1000);
                } else {
                    pickNextEvent();
                }
            } else {
                isAnimating = true;
                awardPoints(gap, false);
                playWrongSound();
                triggerHaptic('error');
                const handEl = document.getElementById('hand');
                if (handEl) {
                    handEl.classList.remove('shake-anim');
                    void handEl.offsetWidth;
                    handEl.classList.add('shake-anim');
                }
                srsRecord(eventToPlace.id, false);
                recordSessionStep(eventToPlace, false, false);

                if (currentMode === 'multi') {
                    let cp = multiPlayers[currentMultiPlayerIndex];
                    cp.lives -= 1;
                    if (cp.lives <= 0) cp.eliminated = true;
                } else if (currentMode !== 'training') {
                    lives -= 1;
                }
                updateHUD();

                // Position réelle de l'événement dans la colonne
                let correctIndex = placedEvents.length;
                for (let j = 0; j < placedEvents.length; j++) {
                    if (eventToPlace.date <= placedEvents[j].date) {
                        correctIndex = j;
                        break;
                    }
                }

                // L'intervalle choisi indique la direction de l'erreur
                const direction = (correctIndex < index) ? 'plus haut' : 'plus bas';
                slotElement.classList.add('slot-wrong');
                const labelEl = slotElement.querySelector('.slot-label');
                if (labelEl) labelEl.innerText = `Non — ${formatYear(dateToPlace)} se place ${direction}`;

                // La date se dévoile sur la carte en main avant que le repère rejoigne sa place
                const hand = document.getElementById('hand');
                hand.classList.add('hand-revealed');
                document.getElementById('hand-year').innerText = formatYear(dateToPlace);
                document.getElementById('hand-kicker').innerText = 'Date révélée';

                eventToPlace.missed = true;
                const missedId = eventToPlace.id;

                setTimeout(() => {
                    placedEvents.splice(correctIndex, 0, eventToPlace);

                    if (currentMode === 'multi') {
                        focusEntry(missedId, 'entry-reveal');
                        setTimeout(() => nextMultiPlayerTurn(), 900);
                    } else if (lives <= 0 && currentMode !== 'training') {
                        renderTimeline();
                        focusEntry(missedId, 'entry-reveal');
                        setTimeout(() => endGame(false), 900);
                    } else {
                        pickNextEvent();
                        focusEntry(missedId, 'entry-reveal');
                    }

                    isAnimating = false;
                }, 2200);
            }
        }

        
        // =========================================================================
        // === MODULE DE RÉTENTION : SÉRIES (STREAKS), PARTAGE WORDLE & ANECDOTES ===
        // =========================================================================

        // --- GESTIONNAIRE DE SÉRIES (STREAKS) ---
        

        // --- NOTIFICATIONS TOAST ---
        let toastTimeout = null;
        function showToast(message, duration = 2800) {
            const toast = document.getElementById('app-toast');
            if (!toast) return;
            toast.innerHTML = message;
            toast.classList.remove('hidden', 'toast-hide');
            if (toastTimeout) clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => {
                toast.classList.add('toast-hide');
                setTimeout(() => toast.classList.add('hidden'), 300);
            }, duration);
        }

        // --- SUIVI DE SESSION & PARTAGE WORDLE ---
        let sessionHistory = [];

        function resetSessionHistory() {
            sessionHistory = [];
        }

        function recordSessionStep(event, isCorrect, isPartial = false) {
            if (!event) return;
            sessionHistory.push({ event, isCorrect: !!isCorrect, isPartial: !!isPartial });
        }

        function generateShareGrid(history) {
            if (!history || history.length === 0) return '🟩🟩🟩';
            return history.map(item => {
                if (item.isCorrect && !item.isPartial) return '🟩';
                if (item.isPartial) return '🟨';
                return '🟥';
            }).join('');
        }

        function generateShareText(isDaily) {
            const streak = getStreakCount();
            const grid = generateShareGrid(sessionHistory);
            const now = new Date();
            const dateFormatted = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0');

            if (isDaily) {
                const timeStr = totalTimePlayed ? ` | ⏱️ ${totalTimePlayed.toFixed(1).replace('.', ',')}s` : '';
                const streakStr = streak > 0 ? `\n🔥 Série : ${streak} jour${streak > 1 ? 's' : ''}` : '';
                return `⚔️ HistoriAxe — Défi du Jour (${dateFormatted})\n${grid}\n🏆 Score : ${score} pts${timeStr}${streakStr}\n\nRejoins le défi sur HistoriAxe !`;
            } else {
                const theme = getCurrentTheme();
                const themeName = theme ? theme.nom : 'Chronologie';
                return `⚔️ HistoriAxe — ${themeName}\n${grid}\n🏆 Score : ${score} points\n\nJoue sur HistoriAxe !`;
            }
        }

        async function shareGameResults(isDaily) {
            const text = generateShareText(isDaily);
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'HistoriAxe',
                        text: text
                    });
                    return;
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        copyToClipboardFallback(text);
                    }
                    return;
                }
            }
            copyToClipboardFallback(text);
        }

        function copyToClipboardFallback(text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    showToast('✨ Résultat copié dans le presse-papier !');
                }).catch(() => {
                    showToast('📋 Copié ! Prêt à être partagé.');
                });
            } else {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                try {
                    document.execCommand('copy');
                    showToast('✨ Résultat copié dans le presse-papier !');
                } catch (e) {
                    showToast('📋 Copie manuelle requise');
                }
                document.body.removeChild(ta);
            }
        }

        // --- ANECDOTES HISTORIQUES (« LE SAVIEZ-VOUS ? ») ---
        function pickSessionAnecdote(history) {
            if (!history || history.length === 0) return null;
            // 1. Événement raté avec description enrichie
            const missedWithDesc = history.filter(item => !item.isCorrect && item.event && item.event.description && item.event.description.length > 20);
            if (missedWithDesc.length > 0) {
                return missedWithDesc[Math.floor(Math.random() * missedWithDesc.length)].event;
            }
            // 2. N'importe quel événement avec description enrichie
            const allWithDesc = history.filter(item => item.event && item.event.description && item.event.description.length > 20);
            if (allWithDesc.length > 0) {
                return allWithDesc[Math.floor(Math.random() * allWithDesc.length)].event;
            }
            // 3. Premier événement ayant une description
            const any = history.find(item => item.event && item.event.description);
            return any ? any.event : null;
        }

        function renderAnecdoteCard(container, anecdoteEvt) {
            if (!container) return;
            if (!anecdoteEvt || !anecdoteEvt.description) {
                container.classList.add('hidden');
                container.innerHTML = '';
                return;
            }
            const wikiLink = anecdoteEvt.wikipedia
                ? `<a href="${anecdoteEvt.wikipedia}" target="_blank" rel="noopener" class="anecdote-wiki-link">En savoir plus sur Wikipédia ↗</a>`
                : '';
            container.innerHTML = `
                <div class="anecdote-card">
                    <div class="anecdote-header">
                        <span class="anecdote-badge">💡 Le Saviez-vous ?</span>
                        <span class="anecdote-date">${formatYear(anecdoteEvt.date)}</span>
                    </div>
                    <div class="anecdote-event-title">${anecdoteEvt.titre}</div>
                    <div class="anecdote-desc">${anecdoteEvt.description}</div>
                    ${wikiLink}
                </div>
            `;
            container.classList.remove('hidden');
        }

        
        // FIN ET NAVIGATION
        function endGame(isWin) {
            stopTimer();

            if (isWin) { playVictorySound(); triggerHaptic('victory'); triggerConfetti(); } else { triggerHaptic('error'); }

            if (isWin && !revisionMode && !dailyChallengeMode && (currentMode === 'classic' || currentMode === 'chrono')) {
                const theme = getCurrentTheme();
                progressRecordWin(theme.id, currentMode);
            }

            if (!revisionMode && !dailyChallengeMode && currentMode !== 'discovery' && currentMode !== 'training') {
                const theme = getCurrentTheme();
                saveScoreToLeaderboard(theme.id, currentMode, score);
            }

            // Enregistrement de la série quotidienne
            if (currentMode === 'daily' || (isWin && currentMode !== 'discovery' && currentMode !== 'training')) {
                streakRecordToday();
            }

            // Calcul des erreurs de la session
            const sessionMistakes = sessionHistory.filter(item => !item.isCorrect).length;

            // Attribution d'XP selon le mode et le score
            if (currentMode !== 'discovery') {
                let xpGain = Math.round(score * 0.5);
                if (isWin) xpGain += 50; // Bonus victoire
                if (sessionMistakes === 0 && isWin) xpGain += 100; // Bonus parfait
                if (currentMode === 'daily') xpGain += 100; // Bonus Défi du jour
                awardXP(xpGain, 'Fin de partie');
            }

            // Vérification de la progression des trophées
            checkBadgeProgressOnGameEnd(isWin, sessionMistakes);

            showScreen('screen-end');
            document.getElementById('end-score-val').innerText = score;
            const titleElement = document.getElementById('end-title');
            const timeDisplay = document.getElementById('end-time-display');

            if (isWin) {
                let winTitle = "Bravo ! Frise complétée !";
                if (currentMode === 'quiz') winTitle = "Bravo ! Quiz terminé !";
                if (currentMode === 'avantapres') winTitle = "Bravo ! Avant / Après maîtrisé !";
                if (currentMode === 'fil') winTitle = "Bravo ! Fil du temps parcouru !";
                if (currentMode === 'periodes') winTitle = "Bravo ! Périodes & Ères maîtrisées !";
                if (currentMode === 'ecart') winTitle = "Bravo ! Tous les écarts trouvés !";
                if (currentMode === 'daily') winTitle = "Bravo ! Défi du jour relevé !";
                titleElement.innerText = winTitle;
                titleElement.style.color = "#27ae60";
            } else {
                titleElement.innerText = "Game Over !";
                titleElement.style.color = "var(--danger-red)";
            }

            if (currentMode === 'chrono' || currentMode === 'expert' || currentMode === 'daily') {
                timeDisplay.innerText = "Durée : " + totalTimePlayed.toFixed(1).replace('.', ',') + " s";
                timeDisplay.classList.remove('hidden');
            } else {
                timeDisplay.classList.add('hidden');
            }

            // Affichage de la série sur l'écran de fin
            const streakDisplay = document.getElementById('end-streak-display');
            if (streakDisplay) {
                const streak = getStreakCount();
                if (streak > 0) {
                    streakDisplay.innerHTML = `🔥 Série en cours : <strong>${streak} jour${streak > 1 ? 's' : ''}</strong>`;
                    streakDisplay.classList.remove('hidden');
                } else {
                    streakDisplay.classList.add('hidden');
                }
            }

            // Affichage du résumé Wordle et bouton de partage
            const shareContainer = document.getElementById('end-share-container');
            if (shareContainer && currentMode !== 'discovery' && sessionHistory.length > 0) {
                const grid = generateShareGrid(sessionHistory);
                shareContainer.innerHTML = `
                    <div class="share-card-header">Votre parcours</div>
                    <div class="share-emojis-grid">${grid}</div>
                    <button class="btn-share" onclick="shareGameResults(false)">
                        <span>Partager mon score</span> <span>📤</span>
                    </button>
                `;
                shareContainer.classList.remove('hidden');
            } else if (shareContainer) {
                shareContainer.classList.add('hidden');
            }

            // Affichage de l'anecdote historique « Le Saviez-vous ? »
            const anecdoteContainer = document.getElementById('end-anecdote-container');
            if (anecdoteContainer && currentMode !== 'discovery' && sessionHistory.length > 0) {
                const anecdote = pickSessionAnecdote(sessionHistory);
                renderAnecdoteCard(anecdoteContainer, anecdote);
            } else if (anecdoteContainer) {
                anecdoteContainer.classList.add('hidden');
            }

            if (currentMode === 'daily') {
                openDailyResultsModal(isWin);
            }
        }

        // Confirmation intégrée à l'interface (remplace window.confirm, qui peut être
        // bloqué ou silencieusement ignoré dans certains environnements d'affichage)
        function showConfirm(message, onConfirm, options = {}) {
            const modal = document.getElementById('modal-confirm');
            document.getElementById('confirm-message').innerText = message;
            modal.classList.remove('hidden');
            const okBtn = document.getElementById('confirm-ok-btn');
            const cancelBtn = document.getElementById('confirm-cancel-btn');
            const alertOnly = !!options.alertOnly;
            cancelBtn.classList.toggle('hidden', alertOnly);
            okBtn.innerText = options.okLabel || (alertOnly ? 'Compris' : 'Quitter');
            const cleanup = () => {
                modal.classList.add('hidden');
                okBtn.onclick = null;
                cancelBtn.onclick = null;
            };
            okBtn.onclick = () => { cleanup(); if (onConfirm) onConfirm(); };
            cancelBtn.onclick = () => { cleanup(); };
        }

        function quitGame() {
            if(currentMode === 'discovery') {
                showScreen(screenAfterGame());
                return;
            }
            showConfirm("Voulez-vous vraiment quitter cette partie ?", () => {
                stopTimer();
                multiGameActive = false;
                showScreen(screenAfterGame());
            });
        }

        // MODAL
        // Le second paramètre (facultatif) n'est fourni que depuis « Découvrir un
        // événement au hasard » : il permet d'afficher un accès direct vers le thème
        // d'origine de l'événement, ainsi qu'un bouton pour repiocher.
        function openModal(evt, context = null) {
            document.getElementById('modal-titre').innerText = evt.titre;

            const badgeContainer = document.getElementById('modal-axe-badge-container');
            if (badgeContainer) {
                if (evt.axe) {
                    const color = getAxisColor(evt.axe);
                    badgeContainer.innerHTML = `<span class="entry-axe-badge" data-axis="${color ? color.name : 'blue'}">${evt.axe}</span>`;
                    badgeContainer.classList.remove('hidden');
                } else {
                    badgeContainer.innerHTML = '';
                    badgeContainer.classList.add('hidden');
                }
            }

            const duration = formatEventDuration(evt);
            const dateStr = formatEventDate(evt);
            document.getElementById('modal-date').innerText = duration ? `${dateStr} (Durée : ${duration})` : dateStr;
            document.getElementById('modal-desc').innerText = evt.description;
            document.getElementById('modal-wiki').href = evt.wikipedia;

            const themeRow = document.getElementById('modal-theme-row');
            const redrawBtn = document.getElementById('modal-redraw-btn');
            if (context && context.theme) {
                themeRow.classList.remove('hidden');
                document.getElementById('modal-theme-btn').innerText = `Jouer sur « ${context.theme.nom} »`;
                document.getElementById('modal-theme-btn').onclick = () => {
                    closeModal();
                    if (dailyChallengeMode) stopTimer();
                    favoritesMode = false;
                    dailyChallengeMode = false;
                    openThemeAt(context.categoryIndex, context.subcategoryIndex, context.themeIndex);
                };
                // Repiocher un événement au hasard n'a de sens que depuis « Découvrir »
                // (context.hideRedraw le masque depuis le Défi du jour, cf. buildEntry).
                if (context.hideRedraw) {
                    redrawBtn.classList.add('hidden');
                } else {
                    redrawBtn.classList.remove('hidden');
                    redrawBtn.onclick = () => discoverRandomEvent();
                }
            } else {
                themeRow.classList.add('hidden');
            }

            document.getElementById('modal-details').classList.remove('hidden');
        }

        function closeModal() {
            document.getElementById('modal-details').classList.add('hidden');
        }

        // ZOOM
        let currentZoom = 1;
        // Réglage de la taille du texte de la colonne (A− / A+)
        function changeZoom(delta) {
            currentZoom = Math.min(1.6, Math.max(0.85, currentZoom + delta));
            document.documentElement.style.setProperty('--zoom-level', currentZoom);
        }

        window.onload = async () => {
            applyAppearance();
            applyOrientationLayout();
            initSettingsControls();
            
            // Initialisation i18n et chargement de la langue active
            if (typeof i18n !== 'undefined') {
                await i18n.init();
            }
            
            if (typeof initCategories === 'function') {
                initCategories();
            }

            showScreen('screen-home');
        };
    