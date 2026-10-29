// =========================================================================
// === HISTORIAXE — LIGUE HEBDOMADAIRE ET CLASSEMENTS (voir api/league.js) ===
// =========================================================================
// Trois onglets sur le même XP vérifié de la semaine :
//   - la ligue : un groupe d'une trentaine de joueurs, tiré au hasard, qui se réinitialise chaque lundi ;
//   - le classement national : les joueurs qui ont déclaré le même pays (choisi ici, une fois) ;
//   - le classement mondial : tous les joueurs.
// Les deux derniers n'apparaissent qu'à partir d'un minimum de joueurs actifs (voir api/league.js).

let leagueScope = 'group';

function openLeagueModal() {
    if (typeof triggerHaptic === 'function') triggerHaptic('light');
    const modal = document.getElementById('modal-league');
    if (modal) modal.classList.remove('hidden');
    renderLeagueModal();
}

function closeLeagueModal() {
    const modal = document.getElementById('modal-league');
    if (modal) modal.classList.add('hidden');
}

function renderLeagueRow(entry, isMe) {
    let medal = '#' + entry.rank;
    if (entry.rank === 1) medal = '🥇';
    else if (entry.rank === 2) medal = '🥈';
    else if (entry.rank === 3) medal = '🥉';
    return `
        <div class="leaderboard-row${isMe ? ' leaderboard-row-me' : ''}">
            <span class="leaderboard-rank">${medal}</span>
            <span class="leaderboard-pseudo">${escapeHtml(entry.pseudo)}${isMe ? ' <em>' + t('league.you_suffix') + '</em>' : ''}</span>
            <span class="leaderboard-score">${entry.xp} XP</span>
        </div>
    `;
}

// Sélecteur de pays (liste fermée de TeamProfile, noms affichés dans la langue de l'app).
function renderLeagueCountryPicker(current) {
    const lang = (typeof i18n !== 'undefined' && i18n.currentLang) || 'fr';
    const names = new Intl.DisplayNames([lang], { type: 'region' });
    const countries = TeamProfile.COUNTRIES
        .map(code => ({ code: code, label: names.of(code) || code }))
        .sort((a, b) => a.label.localeCompare(b.label, lang));
    const options = `<option value="">${escapeHtml(t('league.country_placeholder'))}</option>` + countries
        .map(c => `<option value="${c.code}"${c.code === current ? ' selected' : ''}>${escapeHtml(c.label)}</option>`)
        .join('');
    const prompt = current ? '' : `<div class="daily-leaderboard-empty">${t('league.country_prompt')}</div>`;
    return `
        <div class="league-country-row">
            <label>${escapeHtml(t('league.country_label'))}
                <select onchange="setLeagueCountry(this.value)">${options}</select>
            </label>
        </div>
        ${prompt}
    `;
}

function setLeagueCountry(country) {
    if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) return;
    HistoriAxeAPI.setWeeklyLeagueCountry({
        deviceId: getOrCreateDeviceId(),
        isoWeek: getIsoWeekString(),
        country: country
    }).then(() => renderLeagueModal());
}

function renderLeagueModal() {
    document.querySelectorAll('#league-scope-tabs button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === leagueScope);
        btn.onclick = () => {
            leagueScope = btn.dataset.value;
            renderLeagueModal();
        };
    });

    // XP affiché = celui des défis que le serveur a rejoués (voir api/league.js) ;
    // il s'affiche une fois la réponse reçue, sur chaque onglet.
    const hintEl = document.getElementById('league-week-hint');
    const setHintXp = (xp, key) => {
        if (hintEl) hintEl.innerHTML = t(key, { xp: `<strong id="league-my-xp">${xp}</strong>` });
    };
    setHintXp('–', leagueScope === 'group' ? 'league.week_hint' : 'league.week_hint_ranking');

    const container = document.getElementById('league-list-container');
    if (!container) return;

    if (typeof HistoriAxeAPI === 'undefined' || !HistoriAxeAPI.isConfigured()) {
        container.innerHTML = `<div class="daily-leaderboard-empty">${t('league.offline')}</div>`;
        return;
    }

    container.innerHTML = `<div class="daily-leaderboard-empty">${t('league.loading')}</div>`;

    const scope = leagueScope;
    const deviceId = getOrCreateDeviceId();
    HistoriAxeAPI.getWeeklyLeague({
        isoWeek: getIsoWeekString(),
        deviceId: deviceId,
        scope: scope,
        limit: 30
    }).then(res => {
        if (scope !== leagueScope) return; // l'utilisateur a changé d'onglet entre-temps
        if (!res.ok) {
            container.innerHTML = `<div class="daily-leaderboard-empty">${t('league.error')}</div>`;
            return;
        }
        const data = res.data;
        setHintXp(data.me && data.me.xp != null ? data.me.xp : 0, scope === 'group' ? 'league.week_hint' : 'league.week_hint_ranking');

        let html = scope === 'country' ? renderLeagueCountryPicker(data.country) : '';
        if (scope === 'country' && !data.country) {
            container.innerHTML = html;
            return;
        }
        if (!data.ranked) {
            container.innerHTML = html + `<div class="daily-leaderboard-empty">${t('league.not_ranked', { min: data.minRanked })}</div>`;
            return;
        }

        const entries = data.entries || [];
        if (entries.length === 0) {
            container.innerHTML = html + `<div class="daily-leaderboard-empty">${t('league.empty')}</div>`;
            return;
        }
        html += entries.map(entry => renderLeagueRow(entry, false)).join('');
        const me = data.me;
        if (me && me.rank != null && !entries.some(e => e.rank === me.rank)) {
            html += renderLeagueRow(me, true);
        }
        container.innerHTML = html;
    });
}
