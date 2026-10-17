// Extrait de l'ancien js/app.js — Mode Périodes & Ères.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// === MODE PÉRIODES & ÈRES ===
let periodesQuestions = [];
let periodesIndex = 0;

function startPeriodesGame() {
    resetSessionHistory();
    currentMode = 'periodes';
    const sourceEvents = getSessionPool();
    if (sourceEvents.length < 4) {
        alert(t('modes.min_events_periodes'));
        return;
    }

    periodesQuestions = expeditionCap(buildPeriodesQuestions(sourceEvents), 'periodes');
    if (periodesQuestions.length === 0) {
        alert(t('modes.cannot_generate'));
        return;
    }

    periodesIndex = 0;
    lives = startingLives();
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
            const axeSub = t('periodes.era_axis_label');
            const options = shuffleArray([
                { main: correctAxe, sub: axeSub, isCorrect: true, evt: evt },
                ...distractorAxes.map(a => ({ main: a, sub: axeSub, isCorrect: false, evt: null }))
            ]);
            questions.push({
                kicker: t('periodes.epoch_kicker'),
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

            const durationSub = durationText ? t('periodes.duration_label', { val: durationText }) : '';
            const options = shuffleArray([
                { main: correctText, sub: durationSub, isCorrect: true, evt: evt },
                ...distractorSpans.map(s => ({ main: s, sub: durationSub, isCorrect: false, evt: null }))
            ]);

            questions.push({
                kicker: t('periodes.duration_period_kicker'),
                prompt: evt.titre,
                tag: t('periodes.long_event_tag'),
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
                    kicker: t('periodes.contemporary_kicker'),
                    prompt: t('periodes.which_contemporary'),
                    // html-safe: affiché par innerText
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
            const sliceSub = t('periodes.century_kicker');
            const options = [
                { main: correctLabel, sub: sliceSub, isCorrect: true, evt: evt, sortYear: evt.date },
                ...distractorEntries.map(d => ({ main: d.label, sub: sliceSub, isCorrect: false, evt: null, sortYear: d.year }))
            ].sort((a, b) => a.sortYear - b.sortYear);

            questions.push({
                kicker: t('periodes.century_kicker'),
                prompt: evt.titre,
                tag: evt.axe ? t('periodes.axe_tag', { axe: evt.axe }) : '',
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
    A11y.focusQuestion('screen-periodes');
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
        btn.innerHTML = `<span class="periodes-option-main">${escapeHtml(opt.main)}</span>` +
            (opt.sub ? `<span class="periodes-option-sub">${escapeHtml(opt.sub)}</span>` : '');
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
    renderComboChip(document.getElementById('periodes-hud-combo'), comboMultiplier);
    let pips = '';
    for (let i = 0; i < 3; i++) {
        pips += `<span class="pip${i < lives ? '' : ' spent'}"></span>`;
    }
    document.getElementById('periodes-hud-lives').innerHTML = pips;
}

