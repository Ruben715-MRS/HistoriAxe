// =========================================================================
// === COMMANDEMENTS BIBLIQUES (écran de l'Atelier) ===
// =========================================================================
// Quatre listes, dans l'ordre — les sept lois de Noé, les dix commandements, les trente-neuf travaux du Chabbat, les 613 commandements — avec des
// boutons pour passer de l'une à l'autre. Chaque élément a son numéro, son nom, sa source et son explication ; chaque liste a un chapeau et des
// « à savoir ». La structure est dans js/commandmentsCore.js, les textes dans ui/fr.json (`tools.cmd_*`). Les 613 (js/commandments613Data.js) ont
// deux sous-listes, positifs et négatifs, regroupées par thème, et une recherche. Tout passe par textContent, jamais par du HTML.

let commandmentsSet = 'noah';
let commandments613Kind = 'all';
let commandments613Query = '';
// Le bouton « A / א » (comme sur la généalogie) : les noms hébreux en transcription (« A », par défaut) ou en lettres hébraïques (« א »).
let commandmentsLang = 'fr';
try { if (localStorage.getItem('commandmentsLang') === 'he') commandmentsLang = 'he'; } catch (e) { /* stockage indisponible : « A » */ }

function cmdText(key) { return t(key.indexOf('tools.') === 0 ? key : 'tools.' + key); }

function toolCommandmentsInit() {
    renderCommandments();
}

function commandmentsSetLang(lang) {
    commandmentsLang = lang === 'he' ? 'he' : 'fr';
    try { localStorage.setItem('commandmentsLang', commandmentsLang); } catch (e) { /* stockage indisponible */ }
    renderCommandments();
}

// Un texte en lettres hébraïques : lu de droite à gauche, avec la langue déclarée pour les lecteurs d'écran.
function cmdHebrew(el, text) {
    el.lang = 'he';
    el.dir = 'rtl';
    el.textContent = text;
    return el;
}

function toolCommandmentsPick(setId) {
    commandmentsSet = setId;
    renderCommandments();
    const screen = toolEl('screen-tool-commandments');
    if (screen) screen.scrollTop = 0;
}

function renderCommandments() {
    const set = CommandmentsCore.getSet(commandmentsSet);
    const tabs = toolEl('tool-commandments-tabs');
    toolClear(tabs);
    CommandmentsCore.SETS.forEach(s => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.id = 'tool-commandments-tab-' + s.id;
        btn.setAttribute('aria-pressed', s.id === set.id ? 'true' : 'false');
        btn.textContent = s.icon + ' ' + cmdText('commandments_tab_' + s.id);
        btn.onclick = () => toolCommandmentsPick(s.id);
        tabs.appendChild(btn);
    });

    // Le bouton « A / א » : sans objet pour les 613, dont les énoncés sont en français.
    toolEl('tool-commandments-lang').parentNode.classList.toggle('hidden', set.kind === 'list613');
    toolEl('tool-commandments-lang-fr').setAttribute('aria-pressed', commandmentsLang === 'fr' ? 'true' : 'false');
    toolEl('tool-commandments-lang-he').setAttribute('aria-pressed', commandmentsLang === 'he' ? 'true' : 'false');
    const hebrew = commandmentsLang === 'he' && set.kind !== 'list613';

    const body = toolEl('tool-commandments-body');
    toolClear(body);

    const head = document.createElement('header');
    head.className = 'cmd-head';
    const h = document.createElement('h3');
    h.className = 'tool-h cmd-title';
    h.textContent = cmdText('cmd_' + set.id + '_title');
    const sub = document.createElement('p');
    sub.className = 'cmd-subtitle';
    if (hebrew) cmdHebrew(sub, cmdText('cmd_' + set.id + '_he'));
    else sub.textContent = cmdText('cmd_' + set.id + '_subtitle');
    const lead = document.createElement('p');
    lead.className = 'tool-small';
    lead.textContent = cmdText('cmd_' + set.id + '_lead');
    head.append(h, sub, lead);
    body.appendChild(head);

    if (set.themeMenu) body.appendChild(sectionThemeMenu(set));

    if (set.kind === 'list613') render613(body, set);

    // Les éléments, par groupe. Les numéros courent d'un groupe à l'autre.
    let number = 0;
    set.groups.forEach(group => {
        if (set.restartPerGroup) number = 0; // chaque thème recommence à 1
        const section = document.createElement('section');
        section.className = 'cmd-group';
        section.id = 'cmd-group-' + set.id + '-' + group.id;
        if (set.groups.length > 1) {
            const gh = document.createElement('h4');
            gh.className = 'cmd-group-title';
            gh.textContent = cmdText('cmd_' + set.id + '_group_' + group.id);
            section.appendChild(gh);
            // Le résumé du thème, sous son titre, quand il existe (les six ordres de la Michna).
            const sumKey = 'tools.cmd_' + set.id + '_group_' + group.id + '_summary';
            if (t(sumKey) !== sumKey) {
                const sum = document.createElement('p');
                sum.className = 'tool-small cmd-group-summary';
                sum.textContent = t(sumKey);
                section.appendChild(sum);
            }
        }
        const list = document.createElement('ol');
        list.className = 'cmd-list';
        list.start = number + 1;
        group.items.forEach(itemId => {
            number++;
            list.appendChild(commandmentItem(set.id, itemId, hebrew));
        });
        section.appendChild(list);
        body.appendChild(section);
    });

    // À savoir.
    const know = document.createElement('section');
    know.className = 'cmd-know';
    const kh = document.createElement('h4');
    kh.className = 'cmd-group-title';
    kh.textContent = cmdText('commandments_know');
    know.appendChild(kh);
    const kl = document.createElement('ul');
    kl.className = 'cmd-know-list';
    for (let i = 1; ; i++) {
        const key = 'cmd_' + set.id + '_know_' + i;
        const text = cmdText(key);
        if (!text || text === 'tools.' + key) break; // la clé n'existe pas : plus de « à savoir »
        const li = document.createElement('li');
        li.textContent = text;
        kl.appendChild(li);
    }
    know.appendChild(kl);
    body.appendChild(know);

    const note = document.createElement('p');
    note.className = 'tool-small cmd-note';
    note.textContent = cmdText('commandments_tradition');
    body.appendChild(note);

    // Les boutons pour passer à la liste d'avant ou d'après.
    const nav = document.createElement('div');
    nav.className = 'cmd-nav';
    [[-1, 'commandments_prev', '‹ '], [1, 'commandments_next', ' ›']].forEach(([step, labelKey, deco]) => {
        const other = CommandmentsCore.neighbor(set.id, step);
        if (!other) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn cmd-nav-btn';
        const small = document.createElement('small');
        small.textContent = cmdText(labelKey);
        const name = document.createElement('strong');
        name.textContent = step < 0 ? deco + cmdText('commandments_tab_' + other.id) : cmdText('commandments_tab_' + other.id) + deco;
        btn.append(small, name);
        btn.onclick = () => toolCommandmentsPick(other.id);
        nav.appendChild(btn);
    });
    body.appendChild(nav);
}

// --- Les 613 : tous, positifs ou négatifs ; un menu de thèmes ; une recherche ; des regroupements par thème ---------------------------------
function render613(body, set) {
    const intro = document.createElement('div');
    intro.className = 'cmd-613-controls';

    const kinds = document.createElement('div');
    kinds.className = 'tool-history-chips';
    kinds.setAttribute('role', 'group');
    kinds.setAttribute('aria-label', cmdText('cmd_mitzvot_kind_aria'));
    ['all', 'pos', 'neg'].forEach(kind => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.id = 'tool-commandments-kind-' + kind;
        btn.setAttribute('aria-pressed', kind === commandments613Kind ? 'true' : 'false');
        btn.textContent = cmdText('cmd_' + set.id + '_' + kind);
        btn.onclick = () => {
            commandments613Kind = kind;
            kinds.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
            update613();
        };
        kinds.appendChild(btn);
    });

    const lead = document.createElement('p');
    lead.className = 'tool-small';
    lead.id = 'tool-commandments-kind-lead';

    // Le menu des thèmes : on y choisit où aller, la liste reste entière. Ses options suivent le choix (tous, positifs ou négatifs).
    const theme = document.createElement('select');
    theme.id = 'tool-commandments-theme';
    theme.className = 'tool-input';
    theme.setAttribute('aria-label', cmdText('cmd_mitzvot_theme_label'));
    theme.onchange = () => {
        const target = theme.value && document.getElementById(theme.value);
        if (target) {
            const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
        }
        theme.value = ''; // pour pouvoir choisir deux fois de suite le même thème
    };

    const search = document.createElement('input');
    search.type = 'search';
    search.id = 'tool-commandments-search';
    search.className = 'tool-input';
    search.autocomplete = 'off';
    search.value = commandments613Query;
    search.placeholder = cmdText('cmd_mitzvot_search_placeholder');
    search.setAttribute('aria-label', cmdText('cmd_mitzvot_search_label'));
    search.oninput = () => { commandments613Query = search.value; update613(); };

    const count = document.createElement('p');
    count.className = 'tool-small';
    count.id = 'tool-commandments-count';
    count.setAttribute('role', 'status');
    intro.append(kinds, lead, theme, search, count);
    body.appendChild(intro);

    const host = document.createElement('div');
    host.id = 'tool-commandments-613';
    host.className = 'cmd-613-list';
    body.appendChild(host);
    update613();
}

function update613() {
    const host = toolEl('tool-commandments-613');
    if (!host) return;
    toolClear(host);
    const kind = commandments613Kind;
    const kinds = CommandmentsCore.kindsOf(kind);
    toolEl('tool-commandments-kind-lead').textContent = cmdText('cmd_mitzvot_' + kind + '_lead');
    const total = CommandmentsCore.list613(kind).length;
    const found = CommandmentsCore.search613(kind, commandments613Query);
    toolEl('tool-commandments-count').textContent = !found.length ? cmdText('cmd_mitzvot_none')
        : found.length === 1 ? t('tools.cmd_mitzvot_count_one', { total: total })
            : t('tools.cmd_mitzvot_count', { shown: found.length, total: total });

    // Le menu : un seul choix de liste → les thèmes ; « tous » → les thèmes des positifs puis ceux des négatifs, sous deux intitulés.
    // Avec une recherche, seuls les thèmes où il reste des commandements (les autres ne sont pas affichés, on ne pourrait pas y aller).
    const theme = toolEl('tool-commandments-theme');
    toolClear(theme);
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = cmdText('cmd_mitzvot_theme_placeholder');
    theme.appendChild(placeholder);

    kinds.forEach(k => {
        const outer = kinds.length > 1 ? document.createElement('optgroup') : theme;
        if (kinds.length > 1) outer.label = cmdText('cmd_mitzvot_kind_title_' + k);
        const kindItems = found.filter(c => c.kind === k);
        if (kinds.length > 1 && kindItems.length) {
            const kh = document.createElement('h3');
            kh.className = 'tool-h cmd-kind-title';
            kh.textContent = cmdText('cmd_mitzvot_kind_title_' + k);
            host.appendChild(kh);
        }
        CommandmentsCore.LISTS613[k].groups.forEach(group => {
            const items = kindItems.filter(c => c.group === group.id);
            if (!items.length) return;
            const title = cmdText('cmd_mitzvot_' + k + '_group_' + group.id);
            const sectionId = 'cmd-613-group-' + k + '-' + group.id;

            const option = document.createElement('option');
            option.value = sectionId;
            option.textContent = title;
            outer.appendChild(option);

            const section = document.createElement('section');
            section.className = 'cmd-group';
            section.id = sectionId;
            const gh = document.createElement('h4');
            gh.className = 'cmd-group-title';
            gh.textContent = title + ' (' + t('tools.cmd_mitzvot_range', { from: group.from, to: group.to }) + ')';
            section.appendChild(gh);
            const list = document.createElement('ol');
            list.className = 'cmd-list';
            items.forEach(c => {
                const li = document.createElement('li');
                li.className = 'cmd-item';
                li.value = c.n; // le numéro affiché est celui du commandement, même quand la recherche en cache
                li.id = 'cmd-613-' + c.kind + '-' + c.n;
                const name = document.createElement('strong');
                name.className = 'cmd-name';
                name.textContent = c.text;
                const r = document.createElement('p');
                r.className = 'cmd-ref';
                const label = document.createElement('span');
                label.textContent = cmdText('commandments_source') + ' : ';
                r.append(label, document.createTextNode(c.ref));
                li.append(name, r);
                list.appendChild(li);
            });
            section.appendChild(list);
            host.appendChild(section);
        });
        if (kinds.length > 1 && outer.children.length) theme.appendChild(outer);
    });
}

// Un menu déroulant par thème, pour une liste faite de petites sous-listes : on y va directement, sans cacher les autres.
function sectionThemeMenu(set) {
    const select = document.createElement('select');
    select.id = 'tool-commandments-theme-' + set.id;
    select.className = 'tool-input';
    select.setAttribute('aria-label', cmdText('cmd_mitzvot_theme_label'));
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = cmdText('cmd_mitzvot_theme_placeholder');
    select.appendChild(placeholder);
    set.groups.forEach(group => {
        const option = document.createElement('option');
        option.value = 'cmd-group-' + set.id + '-' + group.id;
        option.textContent = cmdText('cmd_' + set.id + '_group_' + group.id);
        select.appendChild(option);
    });
    select.onchange = () => {
        const target = select.value && document.getElementById(select.value);
        if (target) {
            const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
        }
        select.value = ''; // pour pouvoir choisir deux fois de suite le même thème
    };
    return select;
}

function commandmentItem(setId, itemId, hebrew) {
    const key = field => CommandmentsCore.itemKey(setId, itemId, field);
    const li = document.createElement('li');
    li.className = 'cmd-item';
    li.id = 'cmd-' + setId + '-' + itemId;

    const name = document.createElement('strong');
    name.className = 'cmd-name';
    name.textContent = cmdText(key('name'));
    li.appendChild(name);

    // Sous le nom : sa transcription (travaux du Chabbat) ou, avec « א », le nom en lettres hébraïques.
    if (hebrew) {
        li.appendChild(cmdHebrew(Object.assign(document.createElement('span'), { className: 'cmd-heb' }), cmdText(key('he'))));
        // Le passage complet en hébreu, en petits caractères, quand il existe (les douze Psoukim).
        const full = t(key('full'));
        if (full && full !== key('full')) li.appendChild(cmdHebrew(Object.assign(document.createElement('p'), { className: 'cmd-full' }), full));
    } else if (CommandmentsCore.fieldsOf(setId).indexOf('heb') >= 0) {
        const heb = document.createElement('em');
        heb.className = 'cmd-heb';
        heb.textContent = cmdText(key('heb'));
        li.appendChild(heb);
    }

    const text = document.createElement('p');
    text.className = 'tool-small cmd-text';
    text.textContent = cmdText(key('text'));
    li.appendChild(text);

    const ref = cmdText(key('ref'));
    if (ref) {
        const r = document.createElement('p');
        r.className = 'cmd-ref';
        const label = document.createElement('span');
        label.textContent = cmdText('commandments_source') + ' : ';
        r.append(label, document.createTextNode(ref));
        li.appendChild(r);
    }
    return li;
}
