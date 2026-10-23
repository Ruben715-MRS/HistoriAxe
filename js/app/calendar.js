// =========================================================================
// === LE CALENDRIER ANNUEL (écran de la boîte à outils) ===
// =========================================================================
// Une longue liste qui commence au 1er janvier et finit au 31 décembre : à gauche la date, à droite les fêtes du jour (le nom des pays
// qui fêtent leur fête nationale, avec leur drapeau émoji, et les fêtes chrétiennes à date fixe). Une barre de mois permet d'aller
// directement à un mois. Sur grand écran, les mois se rangent en colonnes. Les règles sont dans js/calendarYearCore.js (testé).

let calendarBuilt = false;

function toolCalendarInit() {
    const status = document.getElementById('cal-status');
    status.textContent = t('tools.countries_loading');
    if (!calendarBuilt) buildCalendarMonthBar();
    countriesLoad().then(ok => {
        if (!ok) { status.textContent = t('tools.countries_error'); return; }
        status.textContent = '';
        renderCalendarYear();
    });
}

// La barre des mois : douze boutons, qui font défiler la page jusqu'au titre du mois.
function buildCalendarMonthBar() {
    const bar = document.getElementById('cal-months');
    CalendarYearCore.MONTHS.forEach((name, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cal-month-btn';
        btn.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        btn.onclick = () => {
            const title = document.getElementById('cal-month-' + (i + 1));
            const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            title.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        };
        bar.appendChild(btn);
    });
    calendarBuilt = true;
}

function renderCalendarYear() {
    const year = document.getElementById('cal-year');
    while (year.firstChild) year.removeChild(year.firstChild);
    const now = new Date();
    const todayM = now.getMonth() + 1, todayD = now.getDate();
    const days = CalendarYearCore.yearDays(countriesData.facts);
    let section = null;
    days.forEach(d => {
        if (d.day === 1) {
            section = document.createElement('section');
            section.className = 'cal-month';
            const h = document.createElement('h3');
            h.className = 'cal-month-title';
            h.id = 'cal-month-' + d.month;
            h.textContent = CalendarYearCore.monthName(d.month).replace(/^./, c => c.toUpperCase());
            section.appendChild(h);
            year.appendChild(section);
        }
        const row = document.createElement('div');
        const feasts = d.religious.length + d.countries.length;
        row.className = 'cal-row' + (feasts ? '' : ' is-empty') + (d.month === todayM && d.day === todayD ? ' is-today' : '');
        const date = document.createElement('span');
        date.className = 'cal-date';
        date.textContent = CalendarYearCore.dateLabel(d.month, d.day);
        const list = document.createElement('span');
        list.className = 'cal-feasts';
        d.countries.forEach(c => {
            const line = document.createElement('span');
            line.className = 'cal-country';
            line.textContent = CountriesCore.flagEmoji(c.iso2) + ' ' + c.n;
            list.appendChild(line);
        });
        d.religious.forEach(label => {
            const line = document.createElement('span');
            line.className = 'cal-religious';
            line.textContent = label;
            list.appendChild(line);
        });
        row.appendChild(date);
        row.appendChild(list);
        section.appendChild(row);
    });
}
