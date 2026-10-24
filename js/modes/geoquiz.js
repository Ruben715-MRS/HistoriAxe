// =========================================================================
// === LE QUIZ DES PAYS (écran de jeu, lancé depuis l'Atlas des pays) ===
// =========================================================================
// Dix questions tirées de l'Atlas des pays par GeoQuizCore (js/geoQuizCore.js) : un ou deux indices (capitale, monnaie…), quatre
// réponses. Pas de vies ni de chrono : c'est un entraînement. Rien n'est enregistré, rien ne part vers le classement.
// Les données sont celles de countriesData (js/app/countries.js). Contenu en français seulement, **à relire par un enseignant**.
// Tout ce qui vient des données passe par textContent, jamais par du HTML.

const GEOQUIZ_ROUNDS = 10;

let geoQuizQuestions = [];
let geoQuizIndex = 0;
let geoQuizScore = 0;
let geoQuizAnswered = false;

function startGeoQuiz() {
    showScreen('screen-geoquiz', 'forward');
    document.getElementById('geoquiz-play').classList.add('hidden');
    document.getElementById('geoquiz-end').classList.add('hidden');
    const status = document.getElementById('geoquiz-status');
    status.textContent = t('tools.countries_loading');
    countriesLoad().then(ok => {
        if (!ok) { status.textContent = t('tools.countries_error'); return; }
        const pool = GeoQuizCore.playablePool(countriesData.facts);
        const questions = GeoQuizCore.generateQuestions(pool, { count: GEOQUIZ_ROUNDS });
        if (!questions.length) { status.textContent = t('geoquiz.none'); return; }
        status.textContent = '';
        geoQuizQuestions = questions;
        geoQuizIndex = 0;
        geoQuizScore = 0;
        document.getElementById('geoquiz-play').classList.remove('hidden');
        geoQuizRender();
    });
}

function geoQuizRender() {
    const q = geoQuizQuestions[geoQuizIndex];
    geoQuizAnswered = false;
    document.getElementById('geoquiz-progress').textContent = t('geoquiz.progress', { n: geoQuizIndex + 1, total: geoQuizQuestions.length });
    document.getElementById('geoquiz-ask').textContent = t('geoquiz.ask_' + q.ask);
    document.getElementById('geoquiz-clues').replaceChildren(...q.clues.map(clue => {
        const li = document.createElement('li');
        li.textContent = t('geoquiz.clue_' + clue.key) + ' : ' + clue.value;
        return li;
    }));
    document.getElementById('geoquiz-options').replaceChildren(...q.options.map((o, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option';
        btn.textContent = geoQuizLabel(q.ask, o.value);
        btn.onclick = () => geoQuizAnswer(i);
        return btn;
    }));
    document.getElementById('geoquiz-feedback').textContent = '';
    document.getElementById('geoquiz-next').classList.add('hidden');
}

// Une réponse telle qu'on la lit : la population en lettres (« 68,4 millions »), le reste tel quel.
function geoQuizLabel(ask, value) {
    return ask === 'pop' ? t('geoquiz.pop_label', { n: CountriesCore.formatPopulation(value) }) : value;
}

function geoQuizAnswer(i) {
    if (geoQuizAnswered) return;
    geoQuizAnswered = true;
    const q = geoQuizQuestions[geoQuizIndex];
    const buttons = Array.from(document.querySelectorAll('#geoquiz-options .quiz-option'));
    const correct = q.options.findIndex(o => o.id === q.target);
    buttons.forEach((b, k) => {
        b.disabled = true;
        if (k === correct) b.classList.add('correct');
    });
    const feedback = document.getElementById('geoquiz-feedback');
    if (i === correct) {
        geoQuizScore++;
        feedback.textContent = t('geoquiz.right');
    } else {
        buttons[i].classList.add('wrong');
        feedback.textContent = t('geoquiz.wrong', { answer: buttons[correct].textContent });
    }
    const last = geoQuizIndex === geoQuizQuestions.length - 1;
    const next = document.getElementById('geoquiz-next');
    next.textContent = t(last ? 'geoquiz.finish' : 'geoquiz.next');
    next.classList.remove('hidden');
    next.focus({ preventScroll: true });
}

function geoQuizNext() {
    geoQuizIndex++;
    if (geoQuizIndex >= geoQuizQuestions.length) { geoQuizEnd(); return; }
    geoQuizRender();
}

function geoQuizEnd() {
    document.getElementById('geoquiz-play').classList.add('hidden');
    document.getElementById('geoquiz-score').textContent = t('geoquiz.score', { score: geoQuizScore, total: geoQuizQuestions.length });
    document.getElementById('geoquiz-end').classList.remove('hidden');
    document.getElementById('geoquiz-score').focus({ preventScroll: true });
}

// Retour à l'Atlas des pays, d'où le quiz a été lancé.
function geoQuizQuit() {
    showScreen('screen-tool-countries', 'back');
}
