// =========================================================================
// === COMMANDEMENTS BIBLIQUES (écran de l'Atelier) ===
// =========================================================================
// Quatre listes, dans l'ordre — les sept lois de Noé, les dix commandements, les trente-neuf travaux du Chabbat, les 613 commandements — avec des
// boutons pour passer de l'une à l'autre. Chaque élément a son numéro, son nom, sa source et son explication ; chaque liste a un chapeau et des
// « à savoir ». La structure est dans js/commandmentsCore.js, les textes dans ui/fr.json (`tools.cmd_*`). Les 613 (js/commandments613Data.js) ont
// deux sous-listes, positifs et négatifs, regroupées par thème, et une recherche. Tout passe par textContent, jamais par du HTML.

let commandmentsSet = 'noah';
let commandments613Kind = 'pos';
let commandments613Query = '';

function cmdText(key) { return t(key.indexOf('tools.') === 0 ? key : 'tools.' + key); }

function toolCommandmentsInit() {
    renderCommandments();
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

    const body = toolEl('tool-commandments-body');
    toolClear(body);

    const head = document.createElement('header');
    head.className = 'cmd-head';
    const h = document.createElement('h3');
    h.className = 'tool-h cmd-title';
    h.textContent = cmdText('cmd_' + set.id + '_title');
    const sub = document.createElement('p');
    sub.className = 'cmd-subtitle';
    sub.textContent = cmdText('cmd_' + set.id + '_subtitle');
    const lead = document.createElement('p');
    lead.className = 'tool-small';
    lead.textContent = cmdText('cmd_' + set.id + '_lead');
    head.append(h, sub, lead);
    body.appendChild(head);

    if (set.kind === 'list613') render613(body, set);

    // Les éléments, par groupe. Les numéros courent d'un groupe à l'autre.
    let number = 0;
    set.groups.forEach(group => {
        const section = document.createElement('section');
        section.className = 'cmd-group';
        if (set.groups.length > 1) {
            const gh = document.createElement('h4');
            gh.className = 'cmd-group-title';
            gh.textContent = cmdText('cmd_' + set.id + '_group_' + group.id);
            section.appendChild(gh);
        }
        const list = document.createElement('ol');
        list.className = 'cmd-list';
        list.start = number + 1;
        group.items.forEach(itemId => {
            number++;
            list.appendChild(commandmentItem(set.id, itemId));
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

// --- Les 613 : positifs ou négatifs, une recherche, des regroupements par thème ------------------------------------------------------------
function render613(body, set) {
    const intro = document.createElement('div');
    intro.className = 'cmd-613-controls';

    const kinds = document.createElement('div');
    kinds.className = 'tool-history-chips';
    kinds.setAttribute('role', 'group');
    kinds.setAttribute('aria-label', cmdText('cmd_mitzvot_kind_aria'));
    ['pos', 'neg'].forEach(kind => {
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

    const search = document.createElement('input');
    search.type = 'search';
    search.id = 'tool-commandments-search';
    search.className = 'tool-input';
    search.autocomplete = 'off';
    search.value = commandments613Query;
    search.placeholder = cmdText('cmd_mitzvot_search_placeholder');
    search.setAttribute('aria-label', cmdText('cmd_mitzvot_search_label'));
    search.oninput = () => { commandments613Query = search.value; update613(); };

    const lead = document.createElement('p');
    lead.className = 'tool-small';
    lead.id = 'tool-commandments-kind-lead';
    const count = document.createElement('p');
    count.className = 'tool-small';
    count.id = 'tool-commandments-count';
    count.setAttribute('role', 'status');
    intro.append(kinds, lead, search, count);
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
    toolEl('tool-commandments-kind-lead').textContent = cmdText('cmd_mitzvot_' + kind + '_lead');
    const total = CommandmentsCore.list613(kind).length;
    const found = CommandmentsCore.search613(kind, commandments613Query);
    toolEl('tool-commandments-count').textContent = !found.length ? cmdText('cmd_mitzvot_none')
        : found.length === 1 ? t('tools.cmd_mitzvot_count_one', { total: total })
            : t('tools.cmd_mitzvot_count', { shown: found.length, total: total });

    CommandmentsCore.LISTS613[kind].groups.forEach(group => {
        const items = found.filter(c => c.group === group.id);
        if (!items.length) return;
        const section = document.createElement('section');
        section.className = 'cmd-group';
        const gh = document.createElement('h4');
        gh.className = 'cmd-group-title';
        gh.textContent = cmdText('cmd_mitzvot_' + kind + '_group_' + group.id) + ' (' + t('tools.cmd_mitzvot_range', { from: group.from, to: group.to }) + ')';
        section.appendChild(gh);
        const list = document.createElement('ol');
        list.className = 'cmd-list';
        items.forEach(c => {
            const li = document.createElement('li');
            li.className = 'cmd-item';
            li.value = c.n; // le numéro affiché est celui du commandement, même quand la recherche en cache
            li.id = 'cmd-613-' + kind + '-' + c.n;
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
}

function commandmentItem(setId, itemId) {
    const key = field => CommandmentsCore.itemKey(setId, itemId, field);
    const li = document.createElement('li');
    li.className = 'cmd-item';
    li.id = 'cmd-' + setId + '-' + itemId;

    const name = document.createElement('strong');
    name.className = 'cmd-name';
    name.textContent = cmdText(key('name'));
    li.appendChild(name);

    if (CommandmentsCore.fieldsOf(setId).indexOf('heb') >= 0) {
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
