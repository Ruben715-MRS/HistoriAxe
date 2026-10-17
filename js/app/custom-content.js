// Extrait de l'ancien js/app.js — Base de données, thèmes et événements personnalisés, historique des scores.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// =========================================================================
// =========================================================================
// === HISTORIAXE — GESTION DE LA BDD ET CATÉGORIE PERSONNALISÉE ===
// =========================================================================

if (typeof window.bdd === 'undefined') {
    window.bdd = [];
}
var bdd = window.bdd;

const customCategory = {
    // Nom de repli avant chargement du pack de langue — retraduit dynamiquement
    // dans ensureCustomCategoryInBdd() via custom.category_title (voir ui/<lang>.json).
    nom: "🎨 Mes thèmes personnalisés",
    isCustomCategory: true,
    themes: []
};

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
    bdd = window.bdd || [];
    if (typeof t === 'function') {
        const translatedNom = t('custom.category_title');
        if (translatedNom && translatedNom !== 'custom.category_title') {
            customCategory.nom = translatedNom;
        }
    }
    if (!bdd.some(c => c && c.isCustomCategory)) {
        bdd.push(customCategory);
    }
    window.bdd = bdd;
    loadCustomThemesIntoBdd();
}



// === THÈMES ET ÉVÉNEMENTS PERSONNALISÉS ===




bdd.push(customCategory);

function loadCustomThemesIntoBdd() {
    customCategory.themes = customThemesLoad();
}

function saveCustomThemesToStorage() {
    customThemesSave(customCategory.themes);
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
        alert(t('custom.theme_name_required'));
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
    showConfirm(t('custom.confirm_delete_theme'), () => {
        customCategory.themes = customCategory.themes.filter(t => t.id !== themeId);
        saveCustomThemesToStorage();
        initThemes();
    }, { okLabel: t('nav.delete') });
}

function loadCustomEventsIntoBdd() {
    try {
        const custom = customEventsLoad();
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
        traverse(bdd);
    } catch (e) { }
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
        alert(t('custom.event_fields_required'));
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
        const custom = customEventsLoad();
        if (!custom[theme.id]) custom[theme.id] = [];
        custom[theme.id].push(newEvent);
        customEventsSave(custom);

        theme.events.push(newEvent);
        theme.events.sort((a, b) => a.date - b.date);
    }

    closeAddEventModal();
    alert(t('custom.event_added_success'));
}

// === TABLEAU DES SCORES (LEADERBOARD) ===


// Combien d'événements la partie en cours retient. Renseigné au lancement
// (voir getSessionPool / launchSimultaneitySession) et conservé dans
// l'historique des scores, où deux parties de longueurs différentes ne se
// comparent pas.
let currentRoundSize = 0;

function saveScoreToLeaderboard(themeId, mode, score) {
    try {
        const data = JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || {};
        if (!data[themeId]) data[themeId] = [];

        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} à ${pad(now.getHours())}:${pad(now.getMinutes())}`;

        data[themeId].push({ mode, score, rounds: currentRoundSize || undefined, date: dateStr, timestamp: now.getTime() });
        // Garder les 50 meilleurs/derniers scores par thème pour éviter la surcharge
        data[themeId].sort((a, b) => b.score - a.score);
        if (data[themeId].length > 50) data[themeId] = data[themeId].slice(0, 50);

        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(data));
    } catch (e) { }
}

function openLeaderboard() {
    const theme = getCurrentTheme();
    document.getElementById('leaderboard-subtitle').innerText = t('leaderboard.theme_label', { name: theme.nom });

    const container = document.getElementById('leaderboard-content');
    let data = {};
    try { data = JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || {}; } catch (e) { }

    const scores = data[theme.id] || [];
    if (scores.length === 0) {
        container.innerHTML = `<div class="leaderboard-empty">${t('leaderboard.empty')}</div>`;
    } else {
        const modeNames = {
            'classic': t('modes.classic.title'), 'chrono': t('modes.chrono.title'),
            'expert': t('modes.expert.title'), 'quiz': t('modes.quiz.title'),
            'avantapres': t('modes.avantapres.title'), 'fil': t('modes.fil.title'),
            'periodes': t('modes.periodes.title'), 'ecart': t('modes.ecart.title'),
            'carte': t('carte.mode_title'), 'chronogeo': t('chronogeo.mode_title'), 'simultaneity': t('simultaneity.title'),
            'ordre': t('ordre.title'), 'blitz': t('blitz.title'),
            'curseur': t('curseur.title'), 'intrus': t('intrus.title'), 'whois': t('whois.title')
        };
        let html = `<table class="leaderboard-table"><thead><tr><th>${t('leaderboard.col_mode')}</th><th>${t('leaderboard.col_score')}</th><th>${t('leaderboard.col_date')}</th></tr></thead><tbody>`;
        scores.forEach(s => {
            // `rounds` est absent des scores enregistrés avant l'arrivée des
            // manches : on n'affiche rien plutôt que d'inventer une longueur.
            const rounds = s.rounds ? `<small class="leaderboard-rounds">${t('rounds.hint', { count: escapeHtml(s.rounds) })}</small>` : '';
            html += `<tr><td>${escapeHtml(modeNames[s.mode] || s.mode)}${rounds}</td><td class="leaderboard-score">${escapeHtml(s.score)}</td><td>${escapeHtml(s.date)}</td></tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    document.getElementById('modal-leaderboard').classList.remove('hidden');
}

function closeLeaderboard() {
    document.getElementById('modal-leaderboard').classList.add('hidden');
}

