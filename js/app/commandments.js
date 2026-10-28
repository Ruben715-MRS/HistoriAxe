// =========================================================================
// === COMMANDEMENTS BIBLIQUES (écran de l'Atelier) ===
// =========================================================================
// Trois listes, dans l'ordre — les sept lois de Noé, les dix commandements, les trente-neuf travaux du Chabbat — avec des boutons pour passer de
// l'une à l'autre. Chaque élément a son numéro, son nom, sa source et son explication ; chaque liste a un chapeau et des « à savoir ». La structure
// est dans js/commandmentsCore.js, les textes dans ui/fr.json (`tools.cmd_*`). Tout passe par textContent, jamais par du HTML.

let commandmentsSet = 'noah';

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
