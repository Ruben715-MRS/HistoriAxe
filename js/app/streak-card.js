// =========================================================================
// === CARTE DE LA SÉRIE : LES 7 JOURS, UNE FOIS PAR JOUR ===
// =========================================================================
// Juste après la première partie terminée du jour, une carte descend du haut de l'écran : la flamme s'allume, le compteur
// passe de N à N+1 et la pastille d'aujourd'hui (la sixième) se coche. Elle reste quatre à cinq secondes, puis disparaît ;
// on ne la revoit pas avant le lendemain. Le reste du temps, seul le badge « 🔥 N » de l'en-tête rappelle la série.
// Les jours viennent de StreakCore (js/streakCore.js) ; la carte ne bloque jamais le jeu (aucun clic capté).

let streakCardTimers = [];

function streakCardWeekday(dateStr) {
    try {
        const lang = (typeof i18n !== 'undefined' && i18n.currentLang) || 'fr';
        const label = new Intl.DateTimeFormat(lang, { weekday: 'short', timeZone: 'UTC' }).format(new Date(dateStr + 'T12:00:00Z'));
        const clean = label.replace(/[.\s]/g, '');
        const cut = lang === 'ja' ? clean.slice(0, 1) : clean.slice(0, 2);
        return cut.charAt(0).toUpperCase() + cut.slice(1);
    } catch (e) {
        return '';
    }
}

function streakCardClear() {
    streakCardTimers.forEach(clearTimeout);
    streakCardTimers = [];
    const old = document.getElementById('streak-card');
    if (old) old.remove();
}

// `data` : la série renvoyée par streakRecordToday() (isNewDay vrai). Sans effet dans les autres cas.
function showStreakCard(data) {
    if (!data || !data.isNewDay || typeof StreakCore === 'undefined' || typeof document === 'undefined') return;
    streakCardClear();

    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const today = getStreakDayString();
    const slots = StreakCore.windowFor(today, data.days);
    const after = data.currentStreak || 1;
    const before = Math.max(0, after - 1);

    const card = document.createElement('div');
    card.id = 'streak-card';
    card.className = 'streak-card' + (reduce ? ' streak-card-reduced' : '');
    card.setAttribute('role', 'status');
    card.setAttribute('aria-live', 'polite');
    const tFn = (typeof t === 'function') ? t : (k) => k;
    const aria = tFn('categories.streak_card_aria', { n: after });
    card.setAttribute('aria-label', aria && aria !== 'categories.streak_card_aria' ? aria : '🔥 ' + after);

    const flame = document.createElement('div');
    flame.className = 'streak-card-flame' + (reduce ? ' is-lit' : '');
    const icon = document.createElement('span');
    icon.className = 'streak-card-flame-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🔥';
    const count = document.createElement('span');
    count.className = 'streak-card-count';
    count.textContent = String(reduce ? after : before);
    flame.append(icon, count);

    const row = document.createElement('div');
    row.className = 'streak-card-days';
    row.setAttribute('aria-hidden', 'true');
    let todayDot = null;
    slots.forEach((slot) => {
        const cell = document.createElement('div');
        cell.className = 'streak-card-day';
        const label = document.createElement('span');
        label.className = 'streak-card-weekday';
        label.textContent = streakCardWeekday(slot.date);
        const dot = document.createElement('span');
        // Aujourd'hui part « vide » et se coche pendant l'animation, sauf si les animations sont réduites.
        const state = slot.state === 'todayDone' && !reduce ? 'today' : slot.state;
        dot.className = 'streak-card-dot is-' + state;
        if (slot.state === 'todayDone') todayDot = dot;
        cell.append(label, dot);
        row.append(cell);
    });

    card.append(flame, row);
    document.body.appendChild(card);

    if (reduce) {
        streakCardTimers.push(setTimeout(streakCardClear, 4200));
        return;
    }

    // Déroulé : 0 s la carte descend · 0,8 s la pastille se coche, la flamme s'allume, le compteur monte · 4,2 s fondu · 4,6 s retirée.
    requestAnimationFrame(() => card.classList.add('is-in'));
    streakCardTimers.push(setTimeout(() => {
        if (todayDot) { todayDot.classList.remove('is-today'); todayDot.classList.add('is-todayDone', 'is-pop'); }
        flame.classList.add('is-lit');
        count.textContent = String(after);
        count.classList.add('is-bump');
        if (typeof triggerHaptic === 'function') triggerHaptic('success');
    }, 800));
    streakCardTimers.push(setTimeout(() => card.classList.add('is-out'), 4200));
    streakCardTimers.push(setTimeout(streakCardClear, 4600));
}
