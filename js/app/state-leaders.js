// =========================================================================
// === LES CHEFS D'ÉTAT (écran de la boîte à outils) ===
// =========================================================================
// Une longue liste verticale, du plus ancien au plus récent : à gauche les années de début et de fin, à droite le nom et la fonction.
// Le fond de chaque ligne indique la dynastie ou le régime ; un trait avec son nom sépare deux régimes. La recherche filtre les noms et
// les fonctions. Les données et la recherche sont dans js/stateLeadersCore.js (testé). Tout le texte passe par textContent.

let leadersBuilt = false;

function toolLeadersInit() {
    const search = document.getElementById('leaders-search');
    if (!leadersBuilt) {
        leadersBuilt = true;
        search.addEventListener('input', () => leadersRender(search.value));
    }
    search.value = '';
    leadersRender('');
}

function leadersRender(query) {
    const list = document.getElementById('leaders-list');
    const count = document.getElementById('leaders-count');
    while (list.firstChild) list.removeChild(list.firstChild);
    const all = StateLeadersCore.rowsOf('france');
    const q = String(query || '').trim();
    // Avec une recherche, on ne montre que les lignes trouvées, sans les traits de régime.
    const items = q ? StateLeadersCore.search(all, q).map(it => ({ row: it.row, divider: null })) : all;
    count.textContent = q ? (items.length ? t('tools.leaders_results', { n: items.length }) : t('tools.leaders_none')) : '';
    items.forEach(it => {
        if (it.divider) {
            const sep = document.createElement('div');
            sep.className = 'leaders-divider';
            sep.setAttribute('role', 'separator');
            const label = document.createElement('span');
            label.textContent = it.divider;
            sep.appendChild(label);
            list.appendChild(sep);
        }
        const r = it.row;
        const line = document.createElement('div');
        line.className = 'leader-row';
        line.style.background = StateLeadersCore.GROUPS[r.group].color;
        const dates = document.createElement('div');
        dates.className = 'leader-dates';
        const from = document.createElement('span');
        from.className = 'leader-from';
        from.textContent = String(r.from);
        const to = document.createElement('span');
        to.className = 'leader-to';
        to.textContent = r.to === null ? t('tools.leaders_now') : String(r.to);
        dates.appendChild(from);
        dates.appendChild(to);
        const name = document.createElement('div');
        name.className = 'leader-name';
        const strong = document.createElement('strong');
        strong.textContent = r.name;
        const small = document.createElement('small');
        small.textContent = r.title;
        name.appendChild(strong);
        name.appendChild(small);
        line.appendChild(dates);
        line.appendChild(name);
        list.appendChild(line);
    });
}
