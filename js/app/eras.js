// =========================================================================
// === LE CONVERTISSEUR D'ÈRES — MINI-JEU DU NIVEAU 3 DU MONDE 0 (« Compter les années ») ===
// =========================================================================
// Une année de notre calendrier est donnée ; on fait coulisser la règle d'une autre ère (boutons, curseur) jusqu'à
// l'année qui lui correspond. La règle du bas défile sous celle du haut : quand on la fait glisser, on voit le
// décalage entre les deux. Après chaque réponse, la règle de conversion est expliquée. Facultatif, à côté du
// niveau : pas d'étoiles au Chemin. Données et règles : js/eraConverter.js (pur, testé).

const ERAS_KEY = 'historiaxe_eras_v1';

let erasGame = null; // { questions, index, errors, value, answered }
let erasReturn = 'screen-path';

function erasProgress() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(ERAS_KEY)); } catch (e) { raw = null; }
    return EraConverter.normalizeProgress(raw);
}

function erasProgressSave(data) {
    try { localStorage.setItem(ERAS_KEY, JSON.stringify(data)); } catch (e) {}
}

function openEras(fromScreen) {
    erasReturn = fromScreen || 'screen-path';
    showScreen('screen-eras', 'forward');
    erasRestart();
}

function erasBack() {
    gamesBackTo(erasReturn);
}

function erasRestart() {
    erasGame = { questions: EraConverter.deal(), index: 0, errors: 0, value: 0, answered: false };
    document.getElementById('eras-play').classList.remove('hidden');
    document.getElementById('eras-done').classList.add('hidden');
    erasRenderQuestion();
}

function erasCurrent() {
    const q = erasGame.questions[erasGame.index];
    return { q, era: EraConverter.find(q.era) };
}

function erasRenderStatus() {
    document.getElementById('eras-status').textContent = t('eras.status', {
        n: erasGame.index + 1, total: erasGame.questions.length, errors: erasGame.errors
    });
}

function erasRenderQuestion() {
    const { q, era } = erasCurrent();
    erasGame.answered = false;
    erasGame.value = era.start;
    erasRenderStatus();
    document.getElementById('eras-question').textContent = t('eras.question', {
        year: EraConverter.gregorianText(q.g), label: q.label, era: era.name
    });
    document.getElementById('eras-era-name').textContent = era.icon + ' ' + era.name;
    const slider = document.getElementById('eras-slider');
    slider.min = String(era.min);
    slider.max = String(era.max);
    document.getElementById('eras-feedback').classList.add('hidden');
    document.getElementById('eras-check').classList.remove('hidden');
    document.querySelectorAll('#eras-play [data-step]').forEach(btn => {
        // Pas de gros pas sur une règle courte : −100 ne mènerait nulle part.
        btn.classList.toggle('hidden', Math.abs(Number(btn.dataset.step)) * 2 > era.max - era.min);
    });
    document.querySelectorAll('#eras-play .arcade-key, #eras-slider').forEach(el => { el.disabled = false; });
    erasRenderRuler();
}

// Les deux règles : cinq années de chaque côté, celle du bas change avec la valeur choisie.
function erasRenderRuler() {
    const { q, era } = erasCurrent();
    const value = erasGame.value;
    document.getElementById('eras-value').textContent = String(value);
    document.getElementById('eras-slider').value = String(value);
    const fill = (id, center, text) => {
        const row = document.getElementById(id);
        row.innerHTML = '';
        for (let d = -2; d <= 2; d++) {
            const cell = document.createElement('span');
            cell.className = 'eras-cell' + (d === 0 ? ' is-center' : '');
            cell.textContent = text(center + d);
            row.appendChild(cell);
        }
    };
    fill('eras-greg', q.g, g => EraConverter.gregorianText(g));
    fill('eras-era-row', value, v => (v >= era.min - 2 && v <= era.max + 2 && v > 0 ? String(v) : '·'));
}

function erasStep(delta) { erasSlide(erasGame.value + delta); }

function erasSlide(raw) {
    if (!erasGame || erasGame.answered) return;
    const { era } = erasCurrent();
    erasGame.value = Math.max(era.min, Math.min(era.max, Math.round(Number(raw))));
    erasRenderRuler();
}

function erasCheck() {
    if (erasGame.answered) return;
    erasGame.answered = true;
    const { q, era } = erasCurrent();
    const ok = EraConverter.accepts(era, q.g, erasGame.value);
    if (ok) {
        if (typeof playCorrectSound === 'function') playCorrectSound(1.0);
        if (typeof triggerHaptic === 'function') triggerHaptic('success');
    } else {
        erasGame.errors += 1;
        if (typeof playWrongSound === 'function') playWrongSound();
        if (typeof triggerHaptic === 'function') triggerHaptic('error');
    }
    erasRenderStatus();
    const answer = EraConverter.answerText(era, q.g);
    const feedback = document.getElementById('eras-feedback');
    feedback.classList.toggle('is-wrong', !ok);
    document.getElementById('eras-feedback-title').textContent = t(ok ? 'eras.right' : 'eras.wrong');
    document.getElementById('eras-feedback-text').textContent =
        t(ok ? 'eras.answer_right' : 'eras.answer_wrong', { answer }) + ' ' + era.rule;
    const last = erasGame.index + 1 >= erasGame.questions.length;
    const next = document.getElementById('eras-next');
    next.textContent = t(last ? 'eras.finish' : 'eras.next');
    feedback.classList.remove('hidden');
    document.getElementById('eras-check').classList.add('hidden');
    document.querySelectorAll('#eras-play .arcade-key, #eras-slider').forEach(el => { el.disabled = true; });
    next.focus();
}

function erasNext() {
    if (!erasGame.answered) return;
    erasGame.index += 1;
    if (erasGame.index >= erasGame.questions.length) { erasFinish(); return; }
    erasRenderQuestion();
}

function erasFinish() {
    erasProgressSave(EraConverter.recordResult(erasProgress(), erasGame.errors));
    const stars = EraConverter.starsFor(erasGame.errors);
    document.getElementById('eras-play').classList.add('hidden');
    document.getElementById('eras-done').classList.remove('hidden');
    document.getElementById('eras-done-stars').textContent = '★'.repeat(stars) + '☆'.repeat(EraConverter.MAX_STARS - stars);
    document.getElementById('eras-done-text').textContent = t('eras.done', { errors: erasGame.errors, total: erasGame.questions.length });
    document.getElementById('eras-status').textContent = '';
}
