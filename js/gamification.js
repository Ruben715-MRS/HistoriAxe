// =========================================================================
// === HISTORIAXE — MODULE DE GAMIFICATION (XP, RANGS & TROPHÉES) ===
// =========================================================================

// Les titres et icônes sont traduits via ui/<lang>.json (clé gamification.ranks.<level>.title),
// avec le texte français ci-dessous comme repli si la clé est absente (voir rankTitle()).
const RANKS = [
    { level: 1, title: "Novice des Annales", minXP: 0, maxXP: 500, icon: "📜" },
    { level: 2, title: "Apprenti Chroniqueur", minXP: 500, maxXP: 1500, icon: "✍️" },
    { level: 3, title: "Scribe des Parchemins", minXP: 1500, maxXP: 3000, icon: "🖋️" },
    { level: 4, title: "Gardien du Savoir", minXP: 3000, maxXP: 5500, icon: "🕯️" },
    { level: 5, title: "Archiviste des Rois", minXP: 5500, maxXP: 9000, icon: "🏛️" },
    { level: 6, title: "Historien Émérite", minXP: 9000, maxXP: 14000, icon: "📖" },
    { level: 7, title: "Grand Érudit", minXP: 14000, maxXP: 21000, icon: "🎓" },
    { level: 8, title: "Maître des Époques", minXP: 21000, maxXP: 30000, icon: "🧭" },
    { level: 9, title: "Grand Chronomancien", minXP: 30000, maxXP: 42000, icon: "⏳" },
    { level: 10, title: "Maître du Temps", minXP: 42000, maxXP: 42000, icon: "👑" }
];

// Titre traduit d'un grade (repli sur le libellé français figé dans RANKS ci-dessus
// si la clé i18n manque, ex. hors-ligne sans pack de langue chargé).
function rankTitle(rank) {
    if (!rank) return '';
    const key = 'gamification.ranks.' + (rank.titleLevel || rank.level) + '.title';
    const translated = (typeof t === 'function') ? t(key) : key;
    return (translated && translated !== key) ? translated : rank.title;
}

// Multiplicateur d'XP lié à la série quotidienne en cours (jours consécutifs de
// Défi du jour/partie gagnée, cf. js/storage.js: getStreakCount). Contrairement
// au combo intra-partie (comboMultiplier dans js/app.js, remis à 1.0 à chaque
// erreur DANS une partie), ce multiplicateur porte sur TOUT l'XP gagné et
// retombe à ×1.0 dès qu'un jour est manqué (streak cassée) — c'est le vrai
// risque de perte demandé : pas de « gel de série » pour l'amortir.
const STREAK_XP_MULTIPLIER_TIERS = [
    { minDays: 0, multiplier: 1.0 },
    { minDays: 3, multiplier: 1.1 },
    { minDays: 7, multiplier: 1.25 },
    { minDays: 14, multiplier: 1.5 },
    { minDays: 30, multiplier: 2.0 }
];

function getStreakXpMultiplier(streakCount) {
    const days = Math.max(0, Math.round(streakCount) || 0);
    let mult = STREAK_XP_MULTIPLIER_TIERS[0].multiplier;
    for (let i = 0; i < STREAK_XP_MULTIPLIER_TIERS.length; i++) {
        if (days >= STREAK_XP_MULTIPLIER_TIERS[i].minDays) mult = STREAK_XP_MULTIPLIER_TIERS[i].multiplier;
    }
    return mult;
}

// Palier suivant (pour l'affichage « Encore N jours pour ×1.5 » dans le profil) :
// renvoie null si le palier maximum est déjà atteint.
function getNextStreakXpTier(streakCount) {
    const days = Math.max(0, Math.round(streakCount) || 0);
    for (let i = 0; i < STREAK_XP_MULTIPLIER_TIERS.length; i++) {
        if (STREAK_XP_MULTIPLIER_TIERS[i].minDays > days) return STREAK_XP_MULTIPLIER_TIERS[i];
    }
    return null;
}

// Nom et description sont traduits via ui/<lang>.json (clé gamification.badges.<id>.name/.desc),
// avec le texte français ci-dessous comme repli (voir badgeName()/badgeDesc()).
const BADGES_CONFIG = [
    {
        id: "antiquaire",
        name: "Antiquaire",
        icon: "🏛️",
        desc: "Réussir 5 thèmes de l'Antiquité (dates avant 476) sans commettre la moindre faute.",
        target: 5
    },
    {
        id: "centurion",
        name: "Centurion",
        icon: "⚔️",
        desc: "Placer 100 événements d'affilée sans aucune erreur.",
        target: 100
    },
    {
        id: "memoire_elephant",
        name: "Mémoire d'éléphant",
        icon: "🐘",
        desc: "Vider entièrement votre boîte de points faibles (au moins 5 points faibles remaîtrisés).",
        target: 1
    },
    {
        id: "seigneur_medieval",
        name: "Seigneur Médiéval",
        icon: "🏰",
        desc: "Réussir 5 thèmes du Moyen Âge (476 - 1492) sans faute.",
        target: 5
    },
    {
        id: "chroniqueur_lumieres",
        name: "Chroniqueur des Lumières",
        icon: "👑",
        desc: "Réussir 5 thèmes d'Époque Moderne (1492 - 1789) sans faute.",
        target: 5
    },
    {
        id: "temoin_siecle",
        name: "Témoin du Siècle",
        icon: "🚀",
        desc: "Réussir 5 thèmes d'Époque Contemporaine (1789 à nos jours) sans faute.",
        target: 5
    },
    {
        id: "flamme_eternelle",
        name: "Flamme Éternelle",
        icon: "🔥",
        desc: "Maintenir une série de 7 jours consécutifs au Défi du jour.",
        target: 7
    },
    {
        id: "pilier_hebdomadaire",
        name: "Pilier Hebdomadaire",
        icon: "📆",
        desc: "Maintenir une série de 4 semaines consécutives au Défi hebdomadaire.",
        target: 4
    },
    {
        id: "eclair_temporel",
        name: "Éclair Temporel",
        icon: "⚡",
        desc: "Terminer un mode Chrono, Expert, Défi du jour ou Défi hebdomadaire en moins de 30 secondes.",
        target: 1
    },
    {
        id: "major_concours",
        name: "Major de Concours",
        icon: "🎓",
        desc: "Obtenir un score parfait sur un thème Scolaire ou CAPES & Agrégation.",
        target: 1
    },
    // Quiz des pays (js/modes/geoquiz.js, js/geoQuizSessionCore.js : badgesEarned).
    { id: "globe_trotter", name: "Globe-trotter", icon: "🌍", desc: "Maîtriser 50 pays au Quiz des pays.", target: 50 },
    { id: "cartographe", name: "Cartographe", icon: "🗺️", desc: "Maîtriser tous les pays d'un continent au Quiz des pays.", target: 1 },
    { id: "sans_faute_geo", name: "Sans-faute géographe", icon: "🎯", desc: "Réussir sans faute une partie d'au moins 10 questions au Quiz des pays, en difficulté Difficile.", target: 1 },
    { id: "assidu_geo", name: "Voyageur assidu", icon: "🧭", desc: "Faire le Défi du jour du Quiz des pays 7 jours de suite.", target: 7 },
    { id: "flair_detective", name: "Flair de détective", icon: "🔎", desc: "Trouver un pays mystère en 2 essais ou moins.", target: 1 },
    { id: "rafale_savant", name: "Rafale d'érudit", icon: "💨", desc: "Donner 20 bonnes réponses en une Rafale de 60 secondes.", target: 20 }
];

function badgeName(badge) {
    if (!badge) return '';
    const key = 'gamification.badges.' + badge.id + '.name';
    const translated = (typeof t === 'function') ? t(key) : key;
    return (translated && translated !== key) ? translated : badge.name;
}

function badgeDesc(badge) {
    if (!badge) return '';
    const key = 'gamification.badges.' + badge.id + '.desc';
    const translated = (typeof t === 'function') ? t(key) : key;
    return (translated && translated !== key) ? translated : badge.desc;
}

function gamificationLoad() {
    const defaults = {
        xp: 0,
        consecutiveCorrectPlacements: 0,
        maxConsecutiveCorrectPlacements: 0,
        perfectAntiquityThemes: [],
        perfectMedievalThemes: [],
        perfectModernThemes: [],
        perfectContemporaryThemes: [],
        peakWeakEventsCount: 0,
        unlockedBadges: {}
    };
    try {
        return Object.assign({}, defaults, JSON.parse(localStorage.getItem(GAMIFICATION_KEY)) || {});
    } catch (e) {
        return defaults;
    }
}

function gamificationSave(data) {
    try {
        localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(data));
    } catch (e) {}
}

// Au-delà du grade 10 (« Maître du Temps », 42 000 XP) il n'y a plus de nouveau titre, mais les niveaux continuent
// jusqu'à MAX_LEVEL. Un niveau demande toujours un peu plus d'XP que le précédent : l'écart entre deux niveaux
// (12 000 XP entre le 9 et le 10) grandit de 400 XP à chaque niveau. Une hausse de ×1,2 par niveau serait
// impraticable (×1,2 puissance 290 donne environ 10^23) ; la hausse linéaire garde le niveau 300 lointain mais
// atteignable (environ 20 millions d'XP).
const MAX_LEVEL = 300;
const BEYOND_GAP_START = 12000;
const BEYOND_GAP_STEP = 400;

// XP total à atteindre pour un niveau donné (1 à MAX_LEVEL).
function levelMinXP(level) {
    level = Math.min(MAX_LEVEL, Math.max(1, Math.round(level) || 1));
    if (level <= RANKS.length) return RANKS[level - 1].minXP;
    const m = level - RANKS.length;
    return RANKS[RANKS.length - 1].minXP + BEYOND_GAP_START * m + BEYOND_GAP_STEP * m * (m + 1) / 2;
}

// Niveau « au-delà » : garde le titre et l'icône du dernier grade (titleLevel sert à retrouver la traduction).
function beyondRank(level) {
    const top = RANKS[RANKS.length - 1];
    return { level, titleLevel: top.level, title: top.title, icon: top.icon, minXP: levelMinXP(level), maxXP: levelMinXP(level + 1), beyond: true };
}

function getRankInfo(xp) {
    xp = Math.max(0, Math.round(xp) || 0);
    const topXp = RANKS[RANKS.length - 1].minXP;
    if (xp >= topXp) {
        let level = RANKS.length;
        while (level < MAX_LEVEL && xp >= levelMinXP(level + 1)) level++;
        const currentRank = level === RANKS.length ? RANKS[RANKS.length - 1] : beyondRank(level);
        const nextRank = level < MAX_LEVEL ? beyondRank(level + 1) : null;
        let progressPct = 100;
        let xpToNext = 0;
        if (nextRank) {
            const range = nextRank.minXP - levelMinXP(level);
            progressPct = Math.min(100, Math.max(0, Math.round(((xp - levelMinXP(level)) / range) * 100)));
            xpToNext = nextRank.minXP - xp;
        }
        return { currentRank, nextRank, progressPct, xpToNext, xp };
    }
    for (let i = RANKS.length - 2; i >= 0; i--) {
        if (xp >= RANKS[i].minXP) {
            const currentRank = RANKS[i];
            const nextRank = RANKS[i + 1];
            const range = nextRank.minXP - currentRank.minXP;
            const progressPct = Math.min(100, Math.max(0, Math.round(((xp - currentRank.minXP) / range) * 100)));
            return { currentRank, nextRank, progressPct, xpToNext: nextRank.minXP - xp, xp };
        }
    }
    return { currentRank: RANKS[0], nextRank: RANKS[1], progressPct: 0, xpToNext: 500, xp: 0 };
}

function awardXP(points, reason = '') {
    if (points <= 0) return;
    const streakCount = typeof getStreakCount === 'function' ? getStreakCount() : 0;
    const multiplier = getStreakXpMultiplier(streakCount);
    const finalPoints = Math.round(points * multiplier);

    const data = gamificationLoad();
    const prevRank = getRankInfo(data.xp).currentRank;
    data.xp += finalPoints;
    gamificationSave(data);

    // Ligue hebdomadaire (voir js/league.js + api/league.js) : accumulateur
    // local, poussé au backend en fin de partie (throttle, voir js/app.js:
    // endGame → pushWeeklyLeagueXp), pas à chaque appel d'awardXP.
    if (typeof weeklyXpAdd === 'function') weeklyXpAdd(finalPoints);

    const newRankInfo = getRankInfo(data.xp);
    newRankInfo.xpAwarded = finalPoints;
    newRankInfo.streakMultiplier = multiplier;
    updateHeaderProfileBar();

    if (newRankInfo.currentRank.level > prevRank.level) {
        setTimeout(() => {
            playVictorySound();
            triggerHaptic('victory');
            triggerConfetti(3500);
            const rankTitleTxt = rankTitle(newRankInfo.currentRank);
            const beyond = newRankInfo.currentRank.beyond;
            const msg = typeof t === 'function'
                ? t(beyond ? 'gamification.new_level_toast' : 'gamification.new_rank_toast', { title: rankTitleTxt, level: newRankInfo.currentRank.level })
                : `👑 NOUVEAU GRADE : ${rankTitleTxt} (Niv. ${newRankInfo.currentRank.level}) !`;
            showToast(msg, 4000);
        }, 800);
    }
    return newRankInfo;
}

function unlockBadge(badgeId) {
    const data = gamificationLoad();
    if (data.unlockedBadges && data.unlockedBadges[badgeId]) return;

    const badgeConfig = BADGES_CONFIG.find(b => b.id === badgeId);
    if (!badgeConfig) return;

    if (!data.unlockedBadges) data.unlockedBadges = {};
    data.unlockedBadges[badgeId] = Date.now();
    gamificationSave(data);

    awardXP(250, `Badge ${badgeConfig.name}`);
    playVictorySound();
    triggerHaptic('victory');
    triggerConfetti(2800);
    const badgeNameTxt = badgeName(badgeConfig);
    const msg = typeof t === 'function'
        ? t('gamification.new_badge_toast', { name: badgeNameTxt })
        : `🏆 NOUVEAU TROPHÉE : « ${badgeNameTxt} » débloqué (+250 XP) !`;
    showToast(msg, 4000);
}

function checkBadgeProgressOnAction(isCorrect) {
    const data = gamificationLoad();
    let shouldUnlockCenturion = false;
    if (isCorrect) {
        data.consecutiveCorrectPlacements = (data.consecutiveCorrectPlacements || 0) + 1;
        data.maxConsecutiveCorrectPlacements = Math.max(data.maxConsecutiveCorrectPlacements || 0, data.consecutiveCorrectPlacements);
        if (data.consecutiveCorrectPlacements >= 100 && (!data.unlockedBadges || !data.unlockedBadges['centurion'])) {
            shouldUnlockCenturion = true;
        }
    } else {
        data.consecutiveCorrectPlacements = 0;
    }
    gamificationSave(data);
    if (shouldUnlockCenturion) {
        unlockBadge('centurion');
    }
}

function checkBadgeProgressOnGameEnd(isWin, sessionMistakesCount) {
    const data = gamificationLoad();
    const streak = getStreakCount();
    const badgesToUnlock = [];

    // 1. Flamme Éternelle
    if (streak >= 7 && (!data.unlockedBadges || !data.unlockedBadges['flamme_eternelle'])) {
        badgesToUnlock.push('flamme_eternelle');
    }

    // 1bis. Pilier Hebdomadaire
    const weeklyChallengeStreak = typeof getWeeklyChallengeStreakCount === 'function' ? getWeeklyChallengeStreakCount() : 0;
    if (weeklyChallengeStreak >= 4 && (!data.unlockedBadges || !data.unlockedBadges['pilier_hebdomadaire'])) {
        badgesToUnlock.push('pilier_hebdomadaire');
    }

    // 2. Éclair Temporel (< 30s)
    if (isWin && (typeof currentMode !== 'undefined') && (currentMode === 'chrono' || currentMode === 'expert' || currentMode === 'daily' || currentMode === 'weekly') && (typeof totalTimePlayed !== 'undefined') && totalTimePlayed > 0 && totalTimePlayed < 30) {
        if (!data.unlockedBadges || !data.unlockedBadges['eclair_temporel']) {
            badgesToUnlock.push('eclair_temporel');
        }
    }

    // 3. Mémoire d'éléphant
    const currentWeak = typeof getWeakEvents === 'function' ? getWeakEvents().length : 0;
    if (currentWeak > (data.peakWeakEventsCount || 0)) {
        data.peakWeakEventsCount = currentWeak;
    }
    if ((data.peakWeakEventsCount || 0) >= 5 && currentWeak === 0 && (!data.unlockedBadges || !data.unlockedBadges['memoire_elephant'])) {
        badgesToUnlock.push('memoire_elephant');
    }

    // 4. Badges d'époques sur parties sans faute
    if (isWin && sessionMistakesCount === 0 && (typeof dailyChallengeMode === 'undefined' || !dailyChallengeMode) && (typeof weeklyChallengeMode === 'undefined' || !weeklyChallengeMode) && (typeof revisionMode === 'undefined' || !revisionMode)) {
        const theme = typeof getCurrentTheme === 'function' ? getCurrentTheme() : null;
        if (theme && theme.events && theme.events.length >= 5) {
            const avgDate = theme.events.reduce((sum, e) => sum + e.date, 0) / theme.events.length;
            const cat = (typeof bdd !== 'undefined' && typeof selectedCategoryIndex !== 'undefined') ? bdd[selectedCategoryIndex] : null;
            const catNom = cat ? cat.nom.toLowerCase() : '';

            // Antiquaire (< 476)
            if (avgDate < 476) {
                if (!data.perfectAntiquityThemes) data.perfectAntiquityThemes = [];
                if (!data.perfectAntiquityThemes.includes(theme.id)) {
                    data.perfectAntiquityThemes.push(theme.id);
                    if (data.perfectAntiquityThemes.length >= 5 && (!data.unlockedBadges || !data.unlockedBadges['antiquaire'])) {
                        badgesToUnlock.push('antiquaire');
                    }
                }
            }
            // Seigneur Médiéval (476 - 1492)
            else if (avgDate >= 476 && avgDate < 1492) {
                if (!data.perfectMedievalThemes) data.perfectMedievalThemes = [];
                if (!data.perfectMedievalThemes.includes(theme.id)) {
                    data.perfectMedievalThemes.push(theme.id);
                    if (data.perfectMedievalThemes.length >= 5 && (!data.unlockedBadges || !data.unlockedBadges['seigneur_medieval'])) {
                        badgesToUnlock.push('seigneur_medieval');
                    }
                }
            }
            // Chroniqueur des Lumières (1492 - 1789)
            else if (avgDate >= 1492 && avgDate < 1789) {
                if (!data.perfectModernThemes) data.perfectModernThemes = [];
                if (!data.perfectModernThemes.includes(theme.id)) {
                    data.perfectModernThemes.push(theme.id);
                    if (data.perfectModernThemes.length >= 5 && (!data.unlockedBadges || !data.unlockedBadges['chroniqueur_lumieres'])) {
                        badgesToUnlock.push('chroniqueur_lumieres');
                    }
                }
            }
            // Témoin du Siècle (>= 1789)
            else if (avgDate >= 1789) {
                if (!data.perfectContemporaryThemes) data.perfectContemporaryThemes = [];
                if (!data.perfectContemporaryThemes.includes(theme.id)) {
                    data.perfectContemporaryThemes.push(theme.id);
                    if (data.perfectContemporaryThemes.length >= 5 && (!data.unlockedBadges || !data.unlockedBadges['temoin_siecle'])) {
                        badgesToUnlock.push('temoin_siecle');
                    }
                }
            }

            // Major de Concours
            if (catNom.includes('programme') || catNom.includes('scolaire') || catNom.includes('capes') || catNom.includes('agrég')) {
                if (!data.unlockedBadges || !data.unlockedBadges['major_concours']) {
                    badgesToUnlock.push('major_concours');
                }
            }
        }
    }

    gamificationSave(data);
    badgesToUnlock.forEach(bId => unlockBadge(bId));
}

function updateHeaderProfileBar() {
    const data = gamificationLoad();
    const rankInfo = getRankInfo(data.xp);

    const avatarEl = document.getElementById('header-rank-avatar');
    const titleEl = document.getElementById('header-rank-title');
    const levelEl = document.getElementById('header-rank-level');
    const fillEl = document.getElementById('header-rank-fill');
    const xpTextEl = document.getElementById('header-rank-xp');
    const streakBadgeEl = document.getElementById('header-streak-badge');

    if (streakBadgeEl) {
        const streak = (typeof getStreakCount === 'function') ? getStreakCount() : 0;
        if (streak > 0) {
            const mult = getStreakXpMultiplier(streak);
            streakBadgeEl.innerText = mult > 1 ? `🔥 ${streak} ×${mult}` : `🔥 ${streak}`;
            streakBadgeEl.classList.remove('hidden');
        } else {
            streakBadgeEl.classList.add('hidden');
        }
    }

    if (avatarEl) avatarEl.innerText = rankInfo.currentRank.icon;
    if (titleEl) titleEl.innerText = rankTitle(rankInfo.currentRank);
    if (levelEl) {
        let badgeStr = (typeof t === 'function') ? t('gamification.rank_badge', { level: rankInfo.currentRank.level }) : null;
        if (!badgeStr || badgeStr === 'gamification.rank_badge' || badgeStr.includes('{level}')) {
            badgeStr = `Niv. ${rankInfo.currentRank.level}`;
        }
        levelEl.innerText = badgeStr;
    }
    if (fillEl) fillEl.style.width = `${rankInfo.progressPct}%`;
    if (xpTextEl) {
        if (rankInfo.nextRank) {
            xpTextEl.innerText = `${data.xp} / ${rankInfo.nextRank.minXP} XP`;
        } else {
            xpTextEl.innerText = `${data.xp} XP`;
        }
    }
}

function openProfileModal() {
    triggerHaptic('light');
    renderProfileModal();
    const modal = document.getElementById('modal-profile');
    if (modal) modal.classList.remove('hidden');
}

function closeProfileModal() {
    const modal = document.getElementById('modal-profile');
    if (modal) modal.classList.add('hidden');
}

// Les accès que le profil d'accueil retire de l'écran d'accueil (voir js/viewProfileCore.js) : ils restent ici.
function profileShortcut(key) {
    closeProfileModal();
    const from = 'screen-categories';
    const go = {
        path: () => openPath(),
        shop: () => openShop(from),
        album: () => openAlbum(from),
        friends: () => openFriends(from),
        team: () => openTeam(from),
        league: () => openLeagueModal()
    };
    if (go[key]) go[key]();
}

function renderProfileModal() {
    const shortcuts = document.getElementById('profile-shortcuts');
    if (shortcuts) shortcuts.classList.toggle('hidden', ViewProfile.layout(currentViewProfile()).moreInProfile.length === 0);
    const data = gamificationLoad();
    const rankInfo = getRankInfo(data.xp);
    const streakData = streakLoad();
    const weeklyChallengeStreakData = typeof weeklyChallengeStreakLoad === 'function' ? weeklyChallengeStreakLoad() : { maxStreak: 0 };

    const heroIcon = document.getElementById('profile-hero-icon');
    const heroTitle = document.getElementById('profile-hero-title');
    const heroLevel = document.getElementById('profile-hero-level');
    const heroFill = document.getElementById('profile-hero-fill');
    const xpNeededEl = document.getElementById('profile-hero-xp-needed');

    if (heroIcon) heroIcon.innerText = rankInfo.currentRank.icon;
    if (heroTitle) heroTitle.innerText = rankTitle(rankInfo.currentRank);
    if (heroLevel) {
        heroLevel.innerText = (typeof t === 'function')
            ? t('gamification.hero_level_line', { level: rankInfo.currentRank.level, xp: data.xp })
            : `Niveau ${rankInfo.currentRank.level} • ${data.xp} XP`;
    }
    if (heroFill) heroFill.style.width = `${rankInfo.progressPct}%`;

    if (xpNeededEl) {
        if (rankInfo.nextRank) {
            const nextTitle = rankTitle(rankInfo.nextRank);
            xpNeededEl.innerText = (typeof t === 'function')
                ? (rankInfo.nextRank.beyond
                    ? t('gamification.xp_needed_level', { needed: rankInfo.xpToNext, level: rankInfo.nextRank.level })
                    : t('gamification.xp_needed', { needed: rankInfo.xpToNext, next: nextTitle }))
                : `Encore ${rankInfo.xpToNext} XP avant ${nextTitle}`;
        } else {
            xpNeededEl.innerText = (typeof t === 'function') ? t('gamification.max_rank') : `Grade suprême atteint !`;
        }
    }

    const statXp = document.getElementById('profile-stat-total-xp');
    const statStreak = document.getElementById('profile-stat-streak');
    const statCenturion = document.getElementById('profile-stat-centurion');
    const statBadgesCount = document.getElementById('profile-stat-badges-count');

    if (statXp) statXp.innerText = data.xp;
    if (statStreak) statStreak.innerText = `${streakData.maxStreak || 0} 🔥`;
    if (statCenturion) statCenturion.innerText = data.maxConsecutiveCorrectPlacements || 0;

    const streakMultiplierEl = document.getElementById('profile-streak-multiplier');
    if (streakMultiplierEl) {
        const currentStreak = getStreakCount();
        const currentMult = getStreakXpMultiplier(currentStreak);
        const nextTier = getNextStreakXpTier(currentStreak);
        const tFn = (typeof t === 'function') ? t : (key) => key;
        let txt = currentMult > 1
            ? tFn('gamification.streak_active', { mult: currentMult })
            : tFn('gamification.streak_inactive');
        if (nextTier) {
            const daysLeft = nextTier.minDays - currentStreak;
            txt += tFn('gamification.streak_next_tier', { days: daysLeft, mult: nextTier.multiplier });
        }
        txt += currentStreak > 0 ? tFn('gamification.streak_risk') : '';
        streakMultiplierEl.innerText = txt;
    }
    
    const unlockedCount = Object.keys(data.unlockedBadges || {}).length;
    if (statBadgesCount) statBadgesCount.innerText = `${unlockedCount} / ${BADGES_CONFIG.length}`;

    const container = document.getElementById('profile-trophies-container');
    if (!container) return;
    container.innerHTML = '';

    BADGES_CONFIG.forEach(badge => {
        const isUnlocked = !!(data.unlockedBadges && data.unlockedBadges[badge.id]);
        let currentProg = 0;
        if (badge.id === 'antiquaire') currentProg = (data.perfectAntiquityThemes || []).length;
        else if (badge.id === 'seigneur_medieval') currentProg = (data.perfectMedievalThemes || []).length;
        else if (badge.id === 'chroniqueur_lumieres') currentProg = (data.perfectModernThemes || []).length;
        else if (badge.id === 'temoin_siecle') currentProg = (data.perfectContemporaryThemes || []).length;
        else if (badge.id === 'centurion') currentProg = Math.min(100, data.maxConsecutiveCorrectPlacements || 0);
        else if (badge.id === 'flamme_eternelle') currentProg = Math.min(7, streakData.maxStreak || 0);
        else if (badge.id === 'pilier_hebdomadaire') currentProg = Math.min(4, weeklyChallengeStreakData.maxStreak || 0);
        else if (badge.id === 'globe_trotter' && typeof geoQuizStateLoad === 'function') {
            const geo = geoQuizStateLoad();
            currentProg = Math.min(50, Object.keys(geo.countries || {}).filter(id => GeoQuizSessionCore.masteryOf(geo.countries[id]) === 'mastered').length);
        } else if (badge.id === 'assidu_geo' && typeof geoQuizStateLoad === 'function') {
            currentProg = Math.min(7, GeoQuizSessionCore.dailyStreak(geoQuizStateLoad(), DailyEngine.getDailySeedString()));
        } else currentProg = isUnlocked ? badge.target : 0;

        const pct = Math.min(100, Math.round((currentProg / badge.target) * 100));

        const tFn = (typeof t === 'function') ? t : (key) => key;
        const statusTxt = isUnlocked
            ? tFn('gamification.status_unlocked')
            : tFn('gamification.progress_fraction', { current: currentProg, target: badge.target });

        const card = document.createElement('div');
        card.className = `trophy-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        card.innerHTML = `
            <div class="trophy-icon">${badge.icon}</div>
            <div class="trophy-info">
                <div class="trophy-name-row">
                    <span class="trophy-name">${badgeName(badge)}</span>
                    <span class="trophy-status-badge">${statusTxt}</span>
                </div>
                <div class="trophy-desc">${badgeDesc(badge)}</div>
                ${!isUnlocked ? `<div class="trophy-progress-bar"><div class="trophy-progress-fill" style="width:${pct}%"></div></div>` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

// Export CommonJS pour les tests unitaires (node --test tests/), sur le
// même principe que js/dailyEngine.js : ce bloc est un no-op dans le
// navigateur, où ce fichier est chargé via <script> et `module` n'existe
// pas. Seules les fonctions pures (sans dépendance DOM/localStorage) sont
// exposées ici.
if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = { RANKS, MAX_LEVEL, levelMinXP, BADGES_CONFIG, getRankInfo, STREAK_XP_MULTIPLIER_TIERS, getStreakXpMultiplier, getNextStreakXpTier };
}
