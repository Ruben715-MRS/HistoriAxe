// =========================================================================
// === VILLES DU MONDE (écran de jeu, dans la section « Villes du monde » de la Salle de jeux) ===
// =========================================================================
// Des parties de dix questions en QCM, tirées par CityGameCore (js/cityGameCore.js) à partir de assets/geo/cities.json :
//   - « Capitale ou plus grande ville ? » : la capitale d'un pays, ou sa plus grande ville (les pièges se croisent) ;
//   - « Quel pays a cette ville ? » : le pays dont une ville porte le nom.
// Les mauvaises réponses viennent de la même région (mode difficile, réglé ici). Pas de chrono : c'est un entraînement. Rien n'est
// enregistré. Les populations sont des estimations de Wikidata : elles ne servent qu'à décider qui est la plus grande ville.
// Tout ce qui vient des données passe par textContent, jamais par du HTML.

const CITIES_ROUNDS = 10;
const CITIES_DIFFICULTY = 'hard';

let cityGameData = null;          // les villes (assets/geo/cities.json)
let cityGameLoading = null;
let cityGameForm = 'capital';
let cityGameReturn = 'screen-arcade';
let cityGameQuestions = [];
let cityGameIndex = 0;
let cityGameScore = 0;
let cityGameAnswered = false;

function cityGameLoad() {
    if (cityGameData) return Promise.resolve(true);
    if (!cityGameLoading) {
        cityGameLoading = fetch('assets/geo/cities.json')
            .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(d => { cityGameData = d.cities; return true; })
            .catch(() => { cityGameLoading = null; return false; });
    }
    return cityGameLoading;
}

// Le menu des jeux sur les villes, ouvert depuis la carte « Villes du monde » de la Salle de jeux (`from`).
function openCitiesMenu(from) {
    if (from) cityGameReturn = from;
    showScreen('screen-cities', 'forward');
    cityGameShowPanel('menu');
}

// Ouvre une partie de la forme donnée (depuis le menu des villes).
function openCityGame(form) {
    cityGameForm = form;
    showScreen('screen-cities', 'forward');
    cityGameShowPanel('status');
    const status = document.getElementById('cities-status');
    status.textContent = t('tools.countries_loading');
    Promise.all([countriesLoad(), cityGameLoad()]).then(([ok, citiesOk]) => {
        if (!ok || !citiesOk) { status.textContent = t('tools.countries_error'); return; }
        cityGameStart();
    });
}

function cityGameStart() {
    const facts = countriesData.facts;
    const questions = CityGameCore.generateCityGame(cityGameData, facts, cityGameForm, { count: CITIES_ROUNDS, difficulty: CITIES_DIFFICULTY });
    if (!questions.length) { document.getElementById('cities-status').textContent = t('cities.none'); return; }
    cityGameQuestions = questions;
    cityGameIndex = 0;
    cityGameScore = 0;
    document.getElementById('cities-status').textContent = '';
    cityGameShowPanel('play');
    cityGameRender();
}

// Un seul panneau visible à la fois : le menu, l'état d'attente, la partie, ou le score.
function cityGameShowPanel(which) {
    document.getElementById('cities-menu').classList.toggle('hidden', which !== 'menu');
    document.getElementById('cities-status').classList.toggle('hidden', which !== 'status');
    document.getElementById('cities-play').classList.toggle('hidden', which !== 'play');
    document.getElementById('cities-end').classList.toggle('hidden', which !== 'end');
}

function cityGameCountry(cc) {
    const c = countriesData.facts.find(f => f.iso2 === cc);
    return c ? c.n : cc;
}

function cityGameById(id) {
    return cityGameData.find(c => c.id === id);
}

function cityGameRender() {
    const q = cityGameQuestions[cityGameIndex];
    cityGameAnswered = false;
    document.getElementById('cities-progress').textContent = t('cities.progress', { n: cityGameIndex + 1, total: cityGameQuestions.length });
    document.getElementById('cities-score-now').textContent = t('cities.score_now', { score: cityGameScore });
    const ask = q.form === 'country'
        ? t('cities.ask_country', { city: cityGameById(q.target).n })
        : t('cities.ask_' + q.form, { country: cityGameCountry(q.country) });
    document.getElementById('cities-ask').textContent = ask;
    document.getElementById('cities-options').replaceChildren(...q.options.map((o, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option';
        btn.textContent = o.value;
        btn.onclick = () => cityGameAnswer(i);
        return btn;
    }));
    document.getElementById('cities-feedback').textContent = '';
    document.getElementById('cities-next').classList.add('hidden');
}

// Un piège expliqué : la capitale prise pour la plus grande ville, et l'inverse.
function cityGameTrapText(q, chosen) {
    const big = cityGameData.filter(c => c.cc === cityGameById(q.target).cc && c.pop).sort((a, b) => b.pop - a.pop)[0];
    if (q.form === 'capital' && chosen.id !== q.target && big && chosen.id === big.id) return t('cities.trap_largest', { answer: chosen.n });
    if (q.form === 'largest' && chosen.cap && chosen.id !== q.target) return t('cities.trap_capital', { answer: chosen.n });
    return '';
}

function cityGameAnswer(i) {
    if (cityGameAnswered) return;
    cityGameAnswered = true;
    const q = cityGameQuestions[cityGameIndex];
    const buttons = Array.from(document.querySelectorAll('#cities-options .quiz-option'));
    const correct = q.options.findIndex(o => o.id === q.target);
    buttons.forEach((b, k) => {
        b.disabled = true;
        if (k === correct) b.classList.add('correct');
    });
    const feedback = document.getElementById('cities-feedback');
    if (i === correct) {
        cityGameScore++;
        feedback.textContent = t('cities.right');
    } else {
        buttons[i].classList.add('wrong');
        const trap = cityGameTrapText(q, cityGameById(q.options[i].id));
        feedback.textContent = (trap ? trap + ' ' : '') + t('cities.wrong', { answer: buttons[correct].textContent });
    }
    const last = cityGameIndex === cityGameQuestions.length - 1;
    const next = document.getElementById('cities-next');
    next.textContent = t(last ? 'geoquiz.finish' : 'geoquiz.next');
    next.classList.remove('hidden');
    next.focus({ preventScroll: true });
}

function cityGameNext() {
    cityGameIndex++;
    if (cityGameIndex >= cityGameQuestions.length) { cityGameEnd(); return; }
    cityGameRender();
}

function cityGameEnd() {
    cityGameShowPanel('end');
    document.getElementById('cities-score').textContent = t('geoquiz.score', { score: cityGameScore, total: cityGameQuestions.length });
    document.getElementById('cities-score').focus({ preventScroll: true });
}

// « Retour » : depuis une partie, au menu des villes ; depuis le menu, à la Salle de jeux.
function cityGameQuit() {
    if (!document.getElementById('cities-menu').classList.contains('hidden')) { showScreen(cityGameReturn, 'back'); return; }
    openCitiesMenu();
}
