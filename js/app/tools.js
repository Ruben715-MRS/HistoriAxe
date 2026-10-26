// =========================================================================
// === LA BOÎTE À OUTILS (écrans) ===
// =========================================================================
// Des utilitaires, pas des jeux : on saisit une valeur, le résultat s'affiche aussitôt, avec la règle qui l'explique. Pas d'étoiles, rien
// n'est enregistré. Les calculs sont dans js/toolsCore.js (pur, testé). Le hub (`screen-tools`) s'ouvre depuis une carte de l'écran des
// catégories (js/app/path.js) ; certains outils sont aussi proposés dans la fiche d'un niveau du Monde 0 (`openToolEras`, `openToolRoman`),
// et rendent alors la main au Chemin. Tout ce qui vient de la saisie passe par textContent, jamais par du HTML.

const TOOL_SCREENS = {
    eras: 'screen-tool-eras', roman: 'screen-tool-roman', centuries: 'screen-tool-centuries',
    duration: 'screen-tool-duration', dates: 'screen-tool-dates', periods: 'screen-tool-periods', countries: 'screen-tool-countries', history: 'screen-tool-history', biblical: 'screen-tool-biblical',
    calendar: 'screen-tool-calendar', genealogy: 'screen-tool-genealogy', leaders: 'screen-tool-leaders',
    dictionary: 'screen-tool-dictionary'
};
const toolReturns = {};

function openTools() {
    showScreen('screen-tools', 'forward');
}

function toolsHubBack() {
    showScreen('screen-categories', 'back');
}

function toolEl(id) { return document.getElementById(id); }

// Ouvre un outil. `from` : l'écran à retrouver au retour (le hub, ou le Chemin).
function openTool(id, from) {
    toolReturns[id] = from || 'screen-tools';
    showScreen(TOOL_SCREENS[id], 'forward');
    const init = {
        eras: toolErasInit, roman: toolRomanInit, centuries: toolCenturiesInit,
        duration: toolDurationInit, dates: toolDatesInit, periods: toolPeriodsInit, countries: toolCountriesInit, history: toolHistoryInit, biblical: toolBiblicalInit,
        calendar: toolCalendarInit, genealogy: toolGenealogyInit, leaders: toolLeadersInit, dictionary: toolDictionaryInit
    }[id];
    if (init) init();
}

function toolBack(id) {
    const to = toolReturns[id] || 'screen-tools';
    showScreen(to, 'back');
    if (to === 'screen-path' && typeof renderPath === 'function') renderPath();
}

function openToolEras(from) { openTool('eras', from); }
function openToolRoman(from) { openTool('roman', from); }

// --- Briques communes ------------------------------------------------------------------
// La saisie d'une année : un nombre et « avant J.-C. » ou non. null si c'est vide ou impossible (0, hors bornes).
function toolReadYear(inputId, bcId) {
    const raw = toolEl(inputId).value.trim();
    if (!raw) return { empty: true, year: null };
    const n = Number(raw);
    return { empty: false, year: ToolsCore.signedYear(n, toolEl(bcId).value === 'bc') };
}

function toolSetYear(inputId, bcId, year) {
    toolEl(inputId).value = String(Math.abs(year));
    toolEl(bcId).value = year < 0 ? 'bc' : 'ad';
}

function toolClear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
}

// Une ligne de résultat : un titre, la valeur, une remarque, et la règle repliable.
function toolRow(container, row) {
    const el = document.createElement('div');
    el.className = 'tool-row' + (row.available === false ? ' is-off' : '');
    const head = document.createElement('div');
    head.className = 'tool-row-head';
    const title = document.createElement('strong');
    title.textContent = (row.icon ? row.icon + ' ' : '') + row.name;
    const value = document.createElement('span');
    value.className = 'tool-row-value';
    value.textContent = row.available === false ? (row.offText || '—') : row.text;
    head.appendChild(title);
    head.appendChild(value);
    el.appendChild(head);
    if (row.note && row.available !== false) {
        const note = document.createElement('small');
        note.className = 'tool-row-note';
        note.textContent = row.note;
        el.appendChild(note);
    }
    if (row.rule) {
        const details = document.createElement('details');
        details.className = 'tool-row-rule';
        const summary = document.createElement('summary');
        summary.textContent = t('tools.rule');
        const p = document.createElement('p');
        p.textContent = row.rule;
        details.appendChild(summary);
        details.appendChild(p);
        el.appendChild(details);
    }
    container.appendChild(el);
}

function toolResult(container, lines) {
    toolClear(container);
    lines.forEach(line => {
        const p = document.createElement('p');
        p.className = line.cls || 'tool-small';
        p.textContent = line.text;
        container.appendChild(p);
    });
}

// =====================================================================================================
// === CONVERTISSEUR D'ANNÉES (ères) ===
// =====================================================================================================
function toolErasInit() {
    if (!toolEl('tool-eras-year').value) toolSetYear('tool-eras-year', 'tool-eras-bc', new Date().getFullYear());
    toolErasUpdate();
}

function toolErasUpdate() {
    const rows = toolEl('tool-eras-rows');
    const msg = toolEl('tool-eras-msg');
    toolClear(rows);
    const read = toolReadYear('tool-eras-year', 'tool-eras-bc');
    if (read.empty) { msg.textContent = t('tools.eras_empty'); return; }
    const result = read.year === null ? null : ToolsCore.convertYear(read.year);
    if (!result) {
        msg.textContent = t('tools.eras_bad', { min: -ToolsCore.ERA_YEAR_MIN, max: ToolsCore.ERA_YEAR_MAX });
        return;
    }
    msg.textContent = t('tools.eras_result', { year: ToolsCore.yearText(read.year) });
    result.forEach(row => toolRow(rows, Object.assign({ offText: t('tools.not_yet') }, row)));
}

// =====================================================================================================
// === CHIFFRES ROMAINS ===
// =====================================================================================================
function toolRomanInit() {
    toolRomanUpdate();
}

function toolRomanUpdate() {
    const parsed = ToolsCore.parseRomanInput(toolEl('tool-roman-input').value);
    const msg = toolEl('tool-roman-msg');
    const result = toolEl('tool-roman-result');
    result.classList.add('hidden');
    msg.textContent = '';
    if (parsed.kind === 'empty') { msg.textContent = t('tools.roman_empty'); return; }
    if (parsed.kind === 'error') {
        const key = 'tools.roman_err_' + (parsed.reason === 'form' && !parsed.canonical ? 'range' : parsed.reason);
        msg.textContent = t(key, { canonical: parsed.canonical || '', max: ToolsCore.ROMAN_MAX });
        // IIII n'est pas la forme usuelle, mais on dit ce que cela veut dire et comment l'écrire.
        return;
    }
    result.classList.remove('hidden');
    toolEl('tool-roman-big').textContent = parsed.kind === 'number' ? parsed.roman : String(parsed.value);
    toolEl('tool-roman-line').textContent = parsed.kind === 'number'
        ? t('tools.roman_number_is', { n: parsed.value, roman: parsed.roman })
        : t('tools.roman_roman_is', { n: parsed.value, roman: parsed.roman });
    const parts = ToolsCore.romanBreakdown(parsed.value);
    const holder = toolEl('tool-roman-parts');
    toolClear(holder);
    parts.forEach(part => {
        const chip = document.createElement('span');
        chip.className = 'tool-chip';
        chip.setAttribute('role', 'listitem');
        const symbol = document.createElement('strong');
        symbol.textContent = part.symbol;
        const value = document.createElement('small');
        value.textContent = String(part.value);
        chip.appendChild(symbol);
        chip.appendChild(value);
        holder.appendChild(chip);
    });
    toolEl('tool-roman-sum').textContent = parts.map(p => p.value).join(' + ') + ' = ' + parsed.value;
}

// La leçon : la table des lettres, puis les trois règles (addition, soustraction, répétitions), la méthode et les siècles.
function toolRomanLesson() {
    toolRomanLessonRender();
    showScreen('screen-tool-roman-lesson', 'forward');
}

function toolRomanLessonBack() {
    showScreen('screen-tool-roman', 'back');
}

function toolLessonBlock(body, titleKey, textKeys) {
    const h = document.createElement('h3');
    h.className = 'tool-h';
    h.textContent = t(titleKey);
    body.appendChild(h);
    textKeys.forEach(key => {
        const p = document.createElement('p');
        p.className = 'tool-small';
        p.textContent = t(key);
        body.appendChild(p);
    });
}

function toolLessonChips(body, numbers) {
    const holder = document.createElement('div');
    holder.className = 'tool-chips';
    numbers.forEach(n => {
        const chip = document.createElement('span');
        chip.className = 'tool-chip';
        const symbol = document.createElement('strong');
        symbol.textContent = ToolsCore.toRoman(n);
        const value = document.createElement('small');
        value.textContent = String(n);
        chip.appendChild(symbol);
        chip.appendChild(value);
        holder.appendChild(chip);
    });
    body.appendChild(holder);
}

function toolRomanLessonRender() {
    const body = toolEl('tool-lesson-body');
    toolClear(body);
    toolLessonBlock(body, 'tools.lesson_letters_title', ['tools.lesson_letters_text']);
    const table = document.createElement('table');
    table.className = 'tool-table';
    const caption = document.createElement('caption');
    caption.className = 'sr-only';
    caption.textContent = t('tools.lesson_letters_title');
    table.appendChild(caption);
    const head = document.createElement('tr');
    ['tools.lesson_col_letter', 'tools.lesson_col_value', 'tools.lesson_col_hint'].forEach(key => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = t(key);
        head.appendChild(th);
    });
    table.appendChild(head);
    ToolsCore.ROMAN_LETTERS.forEach(row => {
        const tr = document.createElement('tr');
        [row.letter, String(row.value), row.hint].forEach((text, i) => {
            const cell = document.createElement(i === 0 ? 'th' : 'td');
            if (i === 0) cell.scope = 'row';
            cell.textContent = text;
            tr.appendChild(cell);
        });
        table.appendChild(tr);
    });
    body.appendChild(table);
    toolLessonBlock(body, 'tools.lesson_add_title', ['tools.lesson_add_text']);
    toolLessonChips(body, [8, 13, 30, 2026]);
    toolLessonBlock(body, 'tools.lesson_sub_title', ['tools.lesson_sub_text']);
    toolLessonChips(body, [4, 9, 40, 90, 400, 900]);
    toolLessonBlock(body, 'tools.lesson_rep_title', ['tools.lesson_rep_text', 'tools.lesson_rep_clock']);
    toolLessonBlock(body, 'tools.lesson_method_title', ['tools.lesson_method_text']);
    toolLessonChips(body, [1000, 900, 90, 4]);
    const sum = document.createElement('p');
    sum.className = 'tool-small';
    sum.textContent = t('tools.lesson_method_result');
    body.appendChild(sum);
    toolLessonBlock(body, 'tools.lesson_limits_title', ['tools.lesson_limits_text']);
    toolLessonBlock(body, 'tools.lesson_use_title', ['tools.lesson_use_text']);
    const demo = document.createElement('button');
    demo.type = 'button';
    demo.className = 'btn';
    demo.textContent = t('tools.lesson_try');
    demo.onclick = () => {
        toolEl('tool-roman-input').value = '1994';
        toolRomanUpdate();
        toolRomanLessonBack();
    };
    body.appendChild(demo);
}

// =====================================================================================================
// === SIÈCLES ET ANNÉES ===
// =====================================================================================================
function toolCenturiesInit() {
    if (!toolEl('tool-cent-year').value) toolSetYear('tool-cent-year', 'tool-cent-bc', 1789);
    if (!toolEl('tool-cent-n').value) toolEl('tool-cent-n').value = 'XVIII';
    toolCenturiesUpdate();
}

function toolCenturiesUpdate() {
    const out = toolEl('tool-cent-year-result');
    const read = toolReadYear('tool-cent-year', 'tool-cent-bc');
    if (read.empty) {
        toolResult(out, [{ text: t('tools.year_empty') }]);
    } else if (read.year === null) {
        toolResult(out, [{ text: t('tools.year_bad') }]);
    } else {
        const c = ToolsCore.centuryOfYear(read.year);
        toolResult(out, [
            { cls: 'tool-big', text: c.name },
            { text: t('tools.century_years', { span: c.span }) },
            { text: ToolsCore.centuryExplain(read.year) }
        ]);
    }
    const out2 = toolEl('tool-cent-n-result');
    const parsed = ToolsCore.parseRomanInput(toolEl('tool-cent-n').value);
    if (parsed.kind === 'empty') {
        toolResult(out2, [{ text: t('tools.century_empty') }]);
    } else if (parsed.kind === 'error' || !ToolsCore.centuryYears(parsed.value, false)) {
        toolResult(out2, [{ text: t('tools.century_bad') }]);
    } else {
        const c = ToolsCore.centuryYears(parsed.value, toolEl('tool-cent-n-bc').value === 'bc');
        toolResult(out2, [
            { cls: 'tool-big', text: c.span },
            { text: c.name + ' (' + parsed.value + 'e)' },
            { text: t(c.first < 0 ? 'tools.century_rule_bc' : 'tools.century_rule', { n: parsed.value }) }
        ]);
    }
}

// =====================================================================================================
// === CALCULATEUR DE DURÉES ===
// =====================================================================================================
function toolDurationInit() {
    if (!toolEl('tool-dur-a').value) toolSetYear('tool-dur-a', 'tool-dur-a-bc', -44);
    if (!toolEl('tool-dur-b').value) toolSetYear('tool-dur-b', 'tool-dur-b-bc', 14);
    if (!toolEl('tool-add-year').value) toolSetYear('tool-add-year', 'tool-add-bc', -44);
    if (!toolEl('tool-add-n').value) toolEl('tool-add-n').value = '57';
    toolDurationUpdate();
}

function toolDurationUpdate() {
    const a = toolReadYear('tool-dur-a', 'tool-dur-a-bc');
    const b = toolReadYear('tool-dur-b', 'tool-dur-b-bc');
    const between = toolEl('tool-dur-between');
    if (a.empty || b.empty) {
        toolResult(between, [{ text: t('tools.year_empty') }]);
    } else if (a.year === null || b.year === null) {
        toolResult(between, [{ text: t('tools.year_bad') }]);
    } else {
        const r = ToolsCore.yearsBetween(a.year, b.year);
        const lines = [
            { cls: 'tool-big', text: t(r.years === 1 ? 'tools.dur_years_one' : 'tools.dur_years_many', { n: r.years }) },
            { text: t('tools.dur_between', { a: ToolsCore.yearText(r.earlier), b: ToolsCore.yearText(r.later) }) }
        ];
        if (r.crossesBc) lines.push({ text: t('tools.dur_no_zero', { a: -r.earlier, b: r.later, n: r.years }) });
        toolResult(between, lines);
    }
    const start = toolReadYear('tool-add-year', 'tool-add-bc');
    const nText = toolEl('tool-add-n').value.trim();
    const add = toolEl('tool-dur-add');
    const n = Number(nText);
    if (start.empty || !nText) {
        toolResult(add, [{ text: t('tools.add_empty') }]);
    } else if (start.year === null || !Number.isInteger(n) || n < 0 || n > 20000) {
        toolResult(add, [{ text: t('tools.add_bad') }]);
    } else {
        const later = toolEl('tool-add-dir').value === 'later';
        const result = ToolsCore.addYears(start.year, later ? n : -n);
        if (result === null) {
            toolResult(add, [{ text: t('tools.add_bad') }]);
        } else {
            const lines = [
                { cls: 'tool-big', text: ToolsCore.yearText(result) },
                { text: t(later ? 'tools.add_later' : 'tools.add_earlier', { n, start: ToolsCore.yearText(start.year), result: ToolsCore.yearText(result) }) }
            ];
            if ((start.year < 0) !== (result < 0)) lines.push({ text: t('tools.add_no_zero') });
            toolResult(add, lines);
        }
    }
}

// =====================================================================================================
// === UNE DATE DANS LES AUTRES CALENDRIERS ===
// =====================================================================================================
function toolDatesToday() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    toolEl('tool-dates-input').value = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    toolDatesUpdate();
}

function toolDatesInit() {
    if (!toolEl('tool-dates-input').value) toolDatesToday();
    else toolDatesUpdate();
}

function toolDatesUpdate() {
    const rows = toolEl('tool-dates-rows');
    const msg = toolEl('tool-dates-msg');
    toolClear(rows);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toolEl('tool-dates-input').value);
    if (!match) { msg.textContent = t('tools.date_empty'); return; }
    const result = ToolsCore.convertDate(Number(match[1]), Number(match[2]), Number(match[3]));
    if (!result) { msg.textContent = t('tools.date_bad', { min: ToolsCore.DATE_YEAR_MIN, max: ToolsCore.DATE_YEAR_MAX }); return; }
    msg.textContent = t('tools.date_result');
    result.forEach(row => toolRow(rows, Object.assign({ offText: t('tools.date_off') }, row)));
}

// =====================================================================================================
// === REPÈRES DE PÉRIODES ===
// =====================================================================================================
const PERIOD_SYSTEM_KEY = 'historiaxe_period_system_v1';

function toolPeriodsSystemId() {
    const select = toolEl('tool-per-system');
    return select.value || 'france';
}

function toolPeriodsInit() {
    const select = toolEl('tool-per-system');
    if (!select.options.length) {
        ToolsCore.PERIOD_SYSTEMS.forEach(system => {
            const option = document.createElement('option');
            option.value = system.id;
            option.textContent = system.flag + ' ' + system.name;
            select.appendChild(option);
        });
        let saved = null;
        try { saved = localStorage.getItem(PERIOD_SYSTEM_KEY); } catch (e) { saved = null; }
        if (saved && ToolsCore.PERIOD_SYSTEMS.some(system => system.id === saved)) select.value = saved;
        if (!toolEl('tool-per-year').value) toolSetYear('tool-per-year', 'tool-per-bc', 1500);
    }
    toolPeriodsRender();
}

// Le choix d'un autre découpage : on le garde pour la prochaine fois, et on redessine la liste.
function toolPeriodsSystemChange() {
    try { localStorage.setItem(PERIOD_SYSTEM_KEY, toolPeriodsSystemId()); } catch (e) { /* stockage indisponible : le choix n'est pas gardé */ }
    toolPeriodsRender();
}

function toolPeriodsRender() {
    const system = ToolsCore.PERIOD_SYSTEMS.find(item => item.id === toolPeriodsSystemId()) || ToolsCore.PERIOD_SYSTEMS[0];
    toolEl('tool-per-intro').textContent = system.intro;
    const list = toolEl('tool-per-list');
    toolClear(list);
    system.periods.forEach(period => {
        const el = document.createElement('div');
        el.className = 'tool-row';
        el.dataset.period = period.id;
        const title = document.createElement('strong');
        title.textContent = period.name;
        const span = document.createElement('small');
        span.className = 'tool-row-note';
        span.textContent = ToolsCore.periodSpanText(period);
        const bounds = document.createElement('p');
        bounds.className = 'tool-small';
        bounds.textContent = period.bounds;
        el.appendChild(title);
        el.appendChild(span);
        el.appendChild(bounds);
        if (period.debated) {
            const debated = document.createElement('p');
            debated.className = 'tool-small tool-debated';
            debated.textContent = t('tools.debated') + ' ' + period.debated;
            el.appendChild(debated);
        }
        list.appendChild(el);
    });
    toolPeriodsUpdate();
}

function toolPeriodsUpdate() {
    const out = toolEl('tool-per-result');
    const compare = toolEl('tool-per-compare');
    toolClear(compare);
    const read = toolReadYear('tool-per-year', 'tool-per-bc');
    document.querySelectorAll('#tool-per-list .tool-row').forEach(el => el.classList.remove('is-current'));
    if (read.empty) { toolResult(out, [{ text: t('tools.year_empty') }]); return; }
    const systemId = toolPeriodsSystemId();
    const found = read.year === null ? null : ToolsCore.periodOfYear(read.year, systemId);
    if (!found) { toolResult(out, [{ text: t('tools.year_bad') }]); return; }
    const lines = [
        { cls: 'tool-big', text: found.period.name },
        { text: t('tools.period_of', { year: ToolsCore.yearText(read.year), period: found.period.name, system: found.system.name }) }
    ];
    if (found.doubt) lines.push({ text: t('tools.period_doubt', { doubt: found.doubt }) });
    toolResult(out, lines);
    const card = document.querySelector('#tool-per-list .tool-row[data-period="' + found.period.id + '"]');
    if (card) card.classList.add('is-current');
    // La même année dans tous les découpages : c'est là qu'on voit qu'ils ne coupent pas aux mêmes endroits.
    const title = document.createElement('h4');
    title.className = 'tool-h';
    title.textContent = t('tools.periods_compare', { year: ToolsCore.yearText(read.year) });
    compare.appendChild(title);
    ToolsCore.PERIOD_SYSTEMS.forEach(system => {
        const other = ToolsCore.periodOfYear(read.year, system.id);
        if (!other) return;
        const row = document.createElement('div');
        row.className = 'tool-row-head tool-compare-row';
        const name = document.createElement('span');
        name.textContent = system.flag + ' ' + system.name;
        const value = document.createElement('strong');
        value.textContent = other.period.name;
        row.appendChild(name);
        row.appendChild(value);
        compare.appendChild(row);
    });
}
