// =========================================================================
// === POIDS ET MESURES BIBLIQUES (écran de l'Atelier) ===
// =========================================================================
// Trois onglets — distances, volumes, monnaies — qui ont chacun un convertisseur (une valeur, une unité : les équivalents dans toutes les
// autres, bibliques et modernes) et une leçon (la logique des unités, les tableaux des livres, les opinions). Les calculs sont dans
// js/measuresCore.js (pur, testé). Tout ce qui vient de la saisie passe par textContent, jamais par du HTML.

let measuresTab = 'distances';
let measuresOpinion = 'nae';
const measuresInputs = { distances: { value: '1', unit: 'amah' }, volumes: { value: '1', unit: 'epha' }, money: { value: '1', unit: 'talent' }, surfaces: { value: '1', unit: 'beitseah' } };
const MEASURES_TABS = [
    { id: 'distances', icon: '📏' },
    { id: 'surfaces', icon: '📐' },
    { id: 'volumes', icon: '🏺' },
    { id: 'money', icon: '🪙' },
    { id: 'temps', icon: '🕐' }
];

function measuresLang() { return (typeof i18n !== 'undefined' && i18n.currentLang) || 'fr'; }
// Le bouton « A / א » : noms d'unités et avis en hébreu (choix mémorisé, comme sur la généalogie).
let measuresHe = false;
try { measuresHe = localStorage.getItem('measuresHebrew') === '1'; } catch (e) { /* stockage indisponible : transcription */ }
function measuresSetLang(lang) {
    measuresHe = lang === 'he';
    try { localStorage.setItem('measuresHebrew', measuresHe ? '1' : '0'); } catch (e) { /* stockage indisponible */ }
    toolMeasuresInit();
}
// Le libellé hébreu d'une clé, ou null s'il n'existe pas : l'appelant reprend alors le libellé français.
function measuresHebrew(key) {
    const he = t('tools.' + key);
    return he !== 'tools.' + key ? he : null;
}
function measuresName(id) { return (measuresHe && measuresHebrew('measures_he_u_' + id)) || t('tools.measures_u_' + id); }
// Le nom sans son équivalent entre parenthèses : « Coudée (amah) » → « Coudée ».
function measuresShort(id) { return measuresName(id).split(/ \(| \/ /)[0]; }
function measuresFmt(value) { return MeasuresCore.formatNumber(value, measuresLang()); }

function toolMeasuresInit() {
    const fr = toolEl('measures-lang-fr'), he = toolEl('measures-lang-he');
    if (fr && he) { fr.setAttribute('aria-pressed', measuresHe ? 'false' : 'true'); he.setAttribute('aria-pressed', measuresHe ? 'true' : 'false'); }
    const tabs = toolEl('tool-measures-tabs');
    toolClear(tabs);
    MEASURES_TABS.forEach(tab => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.id = 'tool-measures-tab-' + tab.id;
        btn.setAttribute('aria-pressed', tab.id === measuresTab ? 'true' : 'false');
        btn.textContent = tab.icon + ' ' + t('tools.measures_tab_' + tab.id);
        btn.onclick = () => {
            measuresTab = tab.id;
            // L'avis choisi reste le même d'une famille à l'autre, sauf s'il n'existe pas dans la nouvelle (ex. 'Hazon Ich pour les monnaies).
            const ops = MeasuresCore.CATEGORIES[tab.id] ? MeasuresCore.CATEGORIES[tab.id].opinions : [];
            if (ops.length && ops.indexOf(measuresOpinion) < 0) measuresOpinion = ops[0];
            toolMeasuresInit();
        };
        tabs.appendChild(btn);
    });
    toolMeasuresRender();
}

function toolMeasuresRender() {
    const body = toolEl('tool-measures-body');
    toolClear(body);
    if (measuresTab === 'temps') { body.appendChild(measuresTemps()); return; }
    body.appendChild(measuresConverter(measuresTab));
    body.appendChild(measuresLesson(measuresTab));
    toolMeasuresUpdate();
}

// --- Le temps : un tableau comparatif des moments du jour, selon le Gra et le Magen Avraham -------------------------------------------
function hm(minutes) {
    const m = Math.round(minutes);
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

function measuresTemps() {
    const box = document.createElement('div');
    box.className = 'measures-temps';
    measuresPara(box, 'tools.measures_temps_1');

    // Les moments-clés, selon leurs formules (fr.json : measures_temps_<id>_*).
    const rows = ['alot', 'misheyakir', 'netz', 'shema', 'tefila', 'chatzot', 'guedola', 'ketana', 'plag', 'shkia', 'tzet'];
    measuresTable(box, [t('tools.measures_temps_col_moment'), t('tools.measures_temps_col_meaning'), t('tools.measures_temps_col_gra'), t('tools.measures_temps_col_ma'), t('tools.measures_temps_col_note')],
        rows.map(id => [t('tools.measures_temps_' + id + '_name'), t('tools.measures_temps_' + id + '_meaning'),
            t('tools.measures_temps_' + id + '_gra'), t('tools.measures_temps_' + id + '_ma'), t('tools.measures_temps_' + id + '_note')]),
        { caption: t('tools.measures_temps_table') });

    // L'exemple daté : lever 6 h, coucher 18 h (jour de 12 heures) ; aube 72 min avant le lever, sortie des étoiles 72 min après le coucher.
    const netz = 6 * 60, shkia = 18 * 60, alot = netz - 72, tzet = shkia + 72;
    const gra = MeasuresCore.zmanimOf(netz, shkia), ma = MeasuresCore.zmanimOf(alot, tzet);
    const moments = ['shema', 'tefila', 'chatzot', 'guedola', 'ketana', 'plag'];
    measuresPara(box, 'tools.measures_temps_ex');
    measuresTable(box, [t('tools.measures_temps_col_moment'), t('tools.measures_temps_col_gra_ex'), t('tools.measures_temps_col_ma_ex')],
        moments.map(id => [t('tools.measures_temps_' + id + '_name'), hm(gra[id]), hm(ma[id])]),
        { caption: t('tools.measures_temps_example') });

    // Les avis sur la durée après le coucher pour la nuit (Tzet haKokhavim).
    const opinions = ['gueonim', 'cinquante', 'tam', 'quatre_vingt_dix'];
    measuresTable(box, [t('tools.measures_temps_col_opinion'), t('tools.measures_temps_col_after'), t('tools.measures_temps_col_who')],
        opinions.map(id => [t('tools.measures_temps_op_' + id + '_name'), t('tools.measures_temps_op_' + id + '_time'), t('tools.measures_temps_op_' + id + '_who')]),
        { caption: t('tools.measures_temps_opinions') });
    measuresPara(box, 'tools.measures_temps_2');
    return box;
}

// --- Le convertisseur --------------------------------------------------------------------------------
function measuresConverter(cat) {
    const panel = document.createElement('section');
    // En hébreu, le convertisseur et les lignes de résultats se lisent de droite à gauche : le nom à droite, la valeur à gauche.
    panel.className = 'tool-panel measures-converter' + (measuresHe ? ' is-he' : '');
    const h = document.createElement('h3');
    h.className = 'tool-h';
    h.textContent = t('tools.measures_converter_title');
    panel.appendChild(h);

    const field = document.createElement('div');
    field.className = 'tool-field';
    const label = document.createElement('label');
    label.setAttribute('for', 'tool-measures-value');
    label.textContent = t('tools.measures_value_label');
    const inline = document.createElement('div');
    inline.className = 'tool-inline';
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.id = 'tool-measures-value';
    input.className = 'tool-input';
    input.value = measuresInputs[cat].value;
    input.oninput = () => { measuresInputs[cat].value = input.value; toolMeasuresUpdate(); };
    const select = document.createElement('select');
    select.id = 'tool-measures-unit';
    select.className = 'tool-input';
    select.setAttribute('aria-label', t('tools.measures_unit_label'));
    ['biblical', 'modern'].forEach(group => {
        const og = document.createElement('optgroup');
        og.label = t('tools.measures_group_' + group);
        MeasuresCore.unitsOf(cat).filter(u => u.group === group).forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = measuresName(u.id);
            og.appendChild(opt);
        });
        select.appendChild(og);
    });
    select.value = measuresInputs[cat].unit;
    select.onchange = () => { measuresInputs[cat].unit = select.value; toolMeasuresUpdate(); };
    inline.append(input, select);
    field.append(label, inline);
    panel.appendChild(field);

    // Deux opinions sur la coudée : le reste des distances suit.
    if (MeasuresCore.CATEGORIES[cat].opinions.length) {
        const opinion = document.createElement('div');
        opinion.className = 'tool-field';
        const ol = document.createElement('span');
        ol.className = 'tool-small';
        ol.id = 'tool-measures-opinion-label';
        ol.textContent = (measuresHe && measuresHebrew('measures_he_label_' + cat))
            || t({ volumes: 'tools.measures_opinion_label_vol', money: 'tools.measures_opinion_label_money', surfaces: 'tools.measures_opinion_label_surf' }[cat] || 'tools.measures_opinion_label');
        const chips = document.createElement('div');
        chips.className = 'tool-history-chips';
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-labelledby', 'tool-measures-opinion-label');
        MeasuresCore.CATEGORIES[cat].opinions.forEach(op => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tool-history-chip';
            btn.setAttribute('aria-pressed', op === measuresOpinion ? 'true' : 'false');
            btn.textContent = (measuresHe && measuresHebrew('measures_he_op_' + op))
                || t('tools.measures_opinion_' + ({ volumes: 'vol_', money: 'money_', surfaces: 'surf_' }[cat] || '') + op);
            btn.onclick = () => {
                measuresOpinion = op;
                chips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
                toolMeasuresUpdate();
            };
            chips.appendChild(btn);
        });
        opinion.append(ol, chips);
        panel.appendChild(opinion);
    }

    const msg = document.createElement('p');
    msg.className = 'tool-msg';
    msg.id = 'tool-measures-msg';
    msg.setAttribute('role', 'status');
    const rows = document.createElement('div');
    rows.className = 'tool-rows';
    rows.id = 'tool-measures-rows';
    panel.append(msg, rows);
    return panel;
}

// Une longueur lisible : en centimètres sous le mètre, en kilomètres au-delà de mille mètres.
function measuresLength(metres) {
    if (metres < 1) return measuresFmt(metres * 100) + ' cm';
    if (metres < 1000) return measuresFmt(metres) + ' m';
    return measuresFmt(metres / 1000) + ' km';
}

function measuresWeight(grams) {
    return grams < 1000 ? measuresFmt(grams) + ' g' : measuresFmt(grams / 1000) + ' kg';
}

function measuresVolume(litres) {
    return litres < 1 ? measuresFmt(litres * 1000) + ' mL' : measuresFmt(litres) + ' L';
}

function toolMeasuresUpdate() {
    const cat = measuresTab;
    const rows = toolEl('tool-measures-rows');
    const msg = toolEl('tool-measures-msg');
    if (!rows || !msg) return;
    toolClear(rows);
    msg.textContent = '';
    const raw = measuresInputs[cat].value.trim().replace(/\s/g, '').replace(',', '.');
    if (!raw) { msg.textContent = t('tools.measures_empty'); return; }
    const n = Number(raw);
    if (!isFinite(n) || n < 0) { msg.textContent = t('tools.measures_invalid'); return; }
    const result = MeasuresCore.convert(cat, n, measuresInputs[cat].unit, measuresOpinion);
    if (!result) { msg.textContent = t('tools.measures_invalid'); return; }
    result.filter(r => !r.isSource).forEach(r => {
        toolRow(rows, {
            name: measuresName(r.id),
            text: (r.approx ? '≈ ' : '') + measuresFmt(r.value),
            note: r.approx ? t('tools.measures_approx_note') : ''
        });
    });
    // Pour les distances, le temps de marche : un mil se marche en 18 minutes.
    if (cat === 'distances') {
        const metres = n * MeasuresCore.factor('distances', measuresInputs[cat].unit, measuresOpinion);
        const walk = MeasuresCore.formatDuration(MeasuresCore.walkMinutes(metres, measuresOpinion));
        if (walk) toolRow(rows, { icon: '🚶', name: t('tools.measures_walk'), text: (walk.charAt(0) === '<' ? '' : '≈ ') + walk, note: t('tools.measures_walk_note') });
    }
}

// --- La leçon ----------------------------------------------------------------------------------------
function measuresPara(parent, key, params) {
    const p = document.createElement('p');
    p.className = 'tool-small';
    p.textContent = t(key, params);
    parent.appendChild(p);
    return p;
}

function measuresTable(parent, headers, rows, opts) {
    const wrap = document.createElement('div');
    wrap.className = 'measures-table-wrap';
    const table = document.createElement('table');
    table.className = 'tool-table measures-table' + (opts && opts.matrix ? ' is-matrix' : '');
    if (opts && opts.caption) {
        const cap = document.createElement('caption');
        cap.textContent = opts.caption;
        table.appendChild(cap);
    }
    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    headers.forEach(text => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = text;
        hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    rows.forEach(cells => {
        const tr = document.createElement('tr');
        cells.forEach((text, i) => {
            const cell = document.createElement(i === 0 ? 'th' : 'td');
            if (i === 0) cell.scope = 'row';
            cell.textContent = text;
            tr.appendChild(cell);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    parent.appendChild(wrap);
}

function measuresLesson(cat) {
    const box = document.createElement('section');
    box.className = 'tool-panel measures-lesson';
    const h = document.createElement('h3');
    h.className = 'tool-h';
    h.textContent = t('tools.measures_lesson_title');
    box.appendChild(h);
    ({ distances: measuresLessonDistances, volumes: measuresLessonVolumes, money: measuresLessonMoney, surfaces: measuresLessonSurfaces }[cat])(box);
    return box;
}

function measuresLessonDistances(box) {
    measuresPara(box, 'tools.measures_dist_1');
    const rel = id => {
        const link = MeasuresCore.DISTANCE_CHAIN.find(l => l.id === id);
        return link ? measuresFmt(link.n) + ' × ' + measuresShort(link.per).toLowerCase() : '—';
    };
    const metres = (id, op) => MeasuresCore.factor('distances', id, op);
    const ids = ['etzba', 'tefach', 'zeret', 'amah', 'mil', 'parsa', 'yom'];
    measuresTable(box, [t('tools.measures_col_unit'), t('tools.measures_col_relation'), t('tools.measures_surf_col_nae'), t('tools.measures_surf_col_feinstein'), t('tools.measures_surf_col_hazon')],
        ids.map(id => [measuresShort(id), rel(id), measuresLength(metres(id, 'nae')), measuresLength(metres(id, 'feinstein')), measuresLength(metres(id, 'hazon'))]));
    measuresPara(box, 'tools.measures_dist_2');
    measuresPara(box, 'tools.measures_dist_3', {
        mil: MeasuresCore.MIL_WALK_MINUTES, parsa: MeasuresCore.formatDuration(4 * MeasuresCore.MIL_WALK_MINUTES),
        day: MeasuresCore.formatDuration(40 * MeasuresCore.MIL_WALK_MINUTES)
    });
    measuresPara(box, 'tools.measures_dist_4');
}

function measuresLessonVolumes(box) {
    measuresPara(box, 'tools.measures_vol_1');
    const eggs = id => MeasuresCore.findUnit('volumes', id).size;
    const rels = id => {
        const row = MeasuresCore.VOLUME_TABLE.find(r => r.id === id);
        if (!row) return '—';
        return row.rels.filter(r => r[0] !== 'betsa').map(r => r[2] + ' ' + measuresShort(r[0]).toLowerCase()).join(' · ') || '—';
    };
    const solids = ['betsa', 'log', 'kav', 'omer', 'sea', 'epha'];
    measuresTable(box, [t('tools.measures_col_unit'), t('tools.measures_col_eggs'), t('tools.measures_col_relation'), t('tools.measures_col_modern')],
        solids.map(id => [measuresShort(id), measuresFmt(eggs(id)), rels(id), '≈ ' + measuresVolume(MeasuresCore.factor('volumes', id))]),
        { caption: t('tools.measures_vol_solids') });
    measuresPara(box, 'tools.measures_vol_2');
    measuresTable(box, [t('tools.measures_col_unit'), t('tools.measures_col_relation'), t('tools.measures_col_modern')], [
        [measuresShort('hin'), '12 ' + measuresShort('log').toLowerCase(), '≈ ' + measuresVolume(MeasuresCore.factor('volumes', 'hin'))],
        [measuresShort('bath'), '= ' + measuresShort('epha').toLowerCase(), '≈ ' + measuresVolume(MeasuresCore.factor('volumes', 'bath'))],
        [measuresShort('lethech'), '5 ' + measuresShort('epha').toLowerCase(), '≈ ' + measuresVolume(MeasuresCore.factor('volumes', 'lethech'))],
        [measuresShort('homer'), '10 ' + measuresShort('epha').toLowerCase(), '≈ ' + measuresVolume(MeasuresCore.factor('volumes', 'homer'))]
    ], { caption: t('tools.measures_vol_more') });
    measuresPara(box, 'tools.measures_vol_3');
    const mnemonic = measuresPara(box, 'tools.measures_vol_mnemonic');
    mnemonic.classList.add('measures-mnemonic');
    // L'acrostiche en hébreu, une phrase par balise isolée (sinon le sens de lecture mêle les phrases entre elles).
    const hebrew = document.createElement('p');
    hebrew.className = 'measures-hebrew';
    hebrew.lang = 'he';
    hebrew.dir = 'rtl';
    ['איפה = ג׳ סאה', 'סאה = ו׳ קב', 'קב = ד׳ לוג', 'לוג = ו׳ ביצה'].forEach(text => {
        const bdi = document.createElement('bdi');
        bdi.lang = 'he';
        bdi.dir = 'rtl';
        bdi.textContent = text;
        hebrew.appendChild(bdi);
    });
    box.appendChild(hebrew);
    measuresPara(box, 'tools.measures_vol_4');
}

function measuresLessonSurfaces(box) {
    measuresPara(box, 'tools.measures_surf_1');
    measuresPara(box, 'tools.measures_surf_2');
    const ops = ['nae', 'feinstein', 'hazon'];
    const units = ['beitrova', 'beitseah', 'beitletech', 'beitkor'];
    measuresTable(box, [t('tools.measures_col_unit')].concat(ops.map(op => t('tools.measures_surf_col_' + op))),
        units.map(id => [measuresName(id)].concat(ops.map(op => measuresFmt(MeasuresCore.factor('surfaces', id, op)) + ' m²'))),
        { matrix: true, caption: t('tools.measures_surf_table') });
    measuresPara(box, 'tools.measures_surf_3');
}

function measuresLessonMoney(box) {
    const sela = op => measuresFmt(MeasuresCore.factor('money', 'shekel', op));
    measuresPara(box, 'tools.measures_money_1', { nae: sela('nae'), gueonim: sela('gueonim'), rashi: sela('rashi') });
    const ids = ['proutah', 'maah', 'dinar', 'beka', 'shekel', 'mane', 'mane_sacre', 'talent', 'talent_sacre'];
    measuresTable(box, [t('tools.measures_col_unit'), t('tools.measures_col_proutot'), t('tools.measures_col_weight')],
        ids.slice().reverse().map(id => [measuresName(id), measuresFmt(MeasuresCore.findUnit('money', id).size), '≈ ' + measuresWeight(MeasuresCore.factor('money', id))]),
        { caption: t('tools.measures_money_weights') });
    measuresPara(box, 'tools.measures_money_2');
    const tbl = MeasuresCore.MONEY_TABLE;
    measuresTable(box, [t('tools.measures_money_worth')].concat(tbl.columns.map(measuresShort)),
        tbl.rows.map(row => [measuresShort(row.id)].concat(row.cells.map(c => (c === null ? '' : measuresFmt(c))))),
        { matrix: true, caption: t('tools.measures_money_table') });
    measuresPara(box, 'tools.measures_money_read');
    measuresPara(box, 'tools.measures_money_3');
}
