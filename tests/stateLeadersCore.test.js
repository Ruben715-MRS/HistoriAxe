const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/stateLeadersCore.js');

const rows = S.rowsOf('france');

test('chefs d’État : la France part de Clovis et finit à Emmanuel Macron, en fonction', () => {
    assert.strictEqual(rows[0].row.name, 'Clovis Ier');
    assert.strictEqual(rows[0].row.from, 481);
    const last = rows[rows.length - 1].row;
    assert.strictEqual(last.name, 'Emmanuel Macron');
    assert.strictEqual(last.to, null);
});

test('chefs d’État : il y a une vingtaine de pays en plus de la France, et la liste des pays est triée', () => {
    const list = S.countryList();
    assert.ok(list.length >= 21, 'au moins 21 pays');
    assert.ok(list.some(c => c.key === 'france'));
    const names = list.map(c => c.name);
    assert.deepStrictEqual(names, names.slice().sort((a, b) => a.localeCompare(b, 'fr')));
});

test('chefs d’État : pour chaque pays, dates cohérentes, dans l’ordre du début du règne', () => {
    S.countryList().forEach(c => {
        const items = S.rowsOf(c.key);
        assert.ok(items.length > 0, c.name + ' : liste vide');
        items.forEach((it, i) => {
            const r = it.row;
            if (r.to !== null) assert.ok(r.to >= r.from, c.name + ' / ' + r.name + ' : fin avant début');
            if (i > 0) assert.ok(r.from >= items[i - 1].row.from, c.name + ' / ' + r.name + ' : hors ordre chronologique');
        });
    });
});

test('chefs d’État : pour chaque pays, la dernière ligne est en fonction et chaque ligne a un nom, une fonction et un groupe connu', () => {
    S.countryList().forEach(c => {
        const items = S.rowsOf(c.key);
        assert.strictEqual(items[items.length - 1].row.to, null, c.name + ' : pas de chef en fonction');
        items.forEach(it => {
            const r = it.row;
            assert.ok(r.name && r.title, c.name + ' : champ manquant');
            assert.ok(S.COUNTRIES[c.key].groups[r.group], c.name + ' / ' + r.name + ' : groupe inconnu');
            assert.ok(it.color, c.name + ' : couleur manquante');
        });
        assert.ok(S.noteOf(c.key).endsWith('Liste indicative.'), c.name + ' : note sans mention « liste indicative »');
    });
});

test('chefs d’État : une barre de dynastie ou de régime s’affiche au début et à chaque changement, et seulement là', () => {
    S.countryList().forEach(c => {
        const items = S.rowsOf(c.key);
        const changes = items.filter((it, i) => i > 0 && it.row.group !== items[i - 1].row.group).length;
        assert.strictEqual(items.filter(it => it.divider).length, changes + 1, c.name);
        assert.strictEqual(items[0].divider, S.COUNTRIES[c.key].groups[items[0].row.group].label, c.name);
    });
    assert.strictEqual(S.rowsOf('france')[0].divider, S.COUNTRIES.france.groups.merovingiens.label);
});

test('chefs d’État : la recherche ignore les accents et les apostrophes, et cherche aussi la fonction', () => {
    assert.strictEqual(S.search(rows, 'petain').length, 1);
    assert.strictEqual(S.search(rows, 'Pétain')[0].row.name, 'Philippe Pétain');
    assert.strictEqual(S.search(rows, 'd’outremer')[0].row.name, 'Louis IV d’Outremer');
    assert.strictEqual(S.search(rows, 'premier consul')[0].row.name, 'Napoléon Bonaparte');
    assert.strictEqual(S.search(rows, '').length, rows.length);
    assert.strictEqual(S.search(rows, 'zzzz').length, 0);
});

test('chefs d’État : aux États-Unis, la couleur suit le parti (bleu démocrate, rouge républicain, jaune sinon)', () => {
    const us = S.rowsOf('etats_unis');
    us.forEach(it => {
        const want = { democrate: '#bfdbfe', republicain: '#fecaca', autre: '#fef08a', aucun: '#fef08a' }[it.row.party];
        assert.ok(want, it.row.name + ' : parti inconnu');
        assert.strictEqual(it.color, want, it.row.name);
    });
    assert.strictEqual(us.find(it => it.row.name === 'Abraham Lincoln').color, '#fecaca');
    assert.strictEqual(us.find(it => it.row.name === 'Joe Biden').color, '#bfdbfe');
    assert.strictEqual(us.find(it => it.row.name === 'George Washington').color, '#fef08a');
    assert.strictEqual(us.filter(it => it.divider).length, 1, 'un seul groupe : pas de barre intermédiaire');
});

test('chefs d’État : les régimes parlementaires ont aussi la liste des chefs du gouvernement, dates cohérentes', () => {
    ['royaume_uni', 'israel', 'canada', 'australie'].forEach(k => {
        assert.ok(S.hasGovernment(k), k);
        const items = S.rowsOf(k, 'gouvernement');
        assert.strictEqual(items[items.length - 1].row.to, null, k + ' : pas de chef du gouvernement en fonction');
        items.forEach((it, i) => {
            const r = it.row;
            if (r.to !== null) assert.ok(r.to >= r.from, k + ' / ' + r.name);
            if (i > 0) assert.ok(r.from >= items[i - 1].row.from, k + ' / ' + r.name + ' : hors ordre');
        });
    });
    assert.strictEqual(S.rowsOf('royaume_uni', 'gouvernement')[0].row.name, 'Robert Walpole');
    assert.ok(S.hasGovernment('france'), 'la France a le mode « Premiers ministres »');
    // Par défaut, on obtient les chefs d’État.
    assert.strictEqual(S.rowsOf('royaume_uni')[0].row.name, 'Jacques Ier (Jacques VI d’Écosse)');
    assert.ok(S.noteOf('royaume_uni', 'gouvernement').startsWith('Premiers ministres'));
});

test('chefs d’État : les vice-présidents des États-Unis, dates cohérentes et couleurs selon le parti', () => {
    const items = S.rowsOf('etats_unis', 'vice');
    assert.ok(S.hasVice('etats_unis'));
    assert.strictEqual(items[items.length - 1].row.name, 'JD Vance');
    assert.strictEqual(items[items.length - 1].row.to, null);
    items.forEach((it, i) => {
        const r = it.row;
        if (r.to !== null) assert.ok(r.to >= r.from, r.name);
        if (i > 0) assert.ok(r.from >= items[i - 1].row.from, r.name + ' : hors ordre');
        const want = { democrate: '#bfdbfe', republicain: '#fecaca', autre: '#fef08a' }[r.party];
        assert.strictEqual(it.color, want, r.name);
    });
    assert.strictEqual(items.find(it => it.row.name === 'Kamala Harris').color, '#bfdbfe');
    assert.strictEqual(items.find(it => it.row.name === 'Mike Pence').color, '#fecaca');
    assert.ok(!S.hasVice('france'));
});

test('premiers ministres français : chaque ligne donne le chef de l\'État en fonction, et le bouton dit « Premiers ministres »', () => {
    const gov = S.COUNTRIES.france.gouvernement;
    assert.equal(S.govModeKey('france'), 'leaders_mode_pm');
    assert.equal(S.govModeKey('royaume_uni'), 'leaders_mode_gouv');
    const heads = new Set(S.COUNTRIES.france.rows.map(r => r[2]));
    assert.ok(gov.rows.length > 100, 'de la IIIe République à aujourd\'hui');
    for (const r of gov.rows) {
        assert.ok(r[6], `${r[2]} : seconde ligne absente`);
        const m = r[6].match(/^Président : (.+)$/);
        if (m) assert.ok(heads.has(m[1]), `${r[2]} : « ${m[1]} » n'est pas un chef de l'État de la liste`);
    }
});

test('premiers ministres français : la seconde ligne s\'affiche à la place de la fonction', () => {
    const rows = S.rowsOf('france', 'gouvernement').map(it => it.row);
    assert.equal(rows[0].sub, 'Président : Jules Grévy');
    assert.equal(rows[0].name, 'William Waddington');
});

test('chefs d’État : la Chine a le mode « Secrétaires généraux du Parti », dates cohérentes', () => {
    assert.ok(S.hasParti('chine'));
    assert.ok(!S.hasParti('france'));
    const items = S.rowsOf('chine', 'parti');
    assert.strictEqual(items[items.length - 1].row.name, 'Xi Jinping');
    assert.strictEqual(items[items.length - 1].row.to, null);
    items.forEach((it, i) => {
        const r = it.row;
        if (r.to !== null) assert.ok(r.to >= r.from, r.name);
        if (i > 0) assert.ok(r.from >= items[i - 1].row.from, r.name + ' : hors ordre');
    });
    assert.ok(!items.some(it => it.row.name === 'Deng Xiaoping'), 'Deng n’a pas occupé ces fonctions');
});

test('chefs d’État : tous les titres de tous les pays commencent par une majuscule, dans tous les modes', () => {
    let n = 0;
    Object.keys(S.COUNTRIES).forEach(k => {
        ['etat', 'gouvernement', 'vice', 'parti'].forEach(mode => {
            S.rowsOf(k, mode).forEach(it => {
                const t = it.row.title;
                assert.ok(t && t.charAt(0) === t.charAt(0).toUpperCase() && t.charAt(0) !== t.charAt(0).toLowerCase(), `${k} / ${mode} / ${it.row.name} : « ${t} »`);
                n++;
            });
        });
    });
    assert.ok(n > 600);
    assert.strictEqual(S.rowsOf('france')[0].row.title, 'Roi des Francs');
    assert.strictEqual(S.rowsOf('france', 'gouvernement').find(it => it.row.name === 'Michel Debré').row.title, 'Premier ministre');
});

test('allemagne : le mode « Chanceliers », de Bismarck à aujourd’hui, avec le chef de l’État en fonction sur la seconde ligne', () => {
    assert.ok(S.hasGovernment('allemagne'));
    assert.equal(S.govModeKey('allemagne'), 'leaders_mode_chancelier');
    const items = S.rowsOf('allemagne', 'gouvernement');
    const rows = items.map(it => it.row);
    assert.equal(rows[0].name, 'Otto von Bismarck');
    assert.equal(rows[0].title, 'Chancelier de l’Empire');
    assert.equal(rows[rows.length - 1].name, 'Friedrich Merz');
    assert.equal(rows[rows.length - 1].to, null);
    assert.ok(rows.some(r => r.name === 'Adolf Hitler'));
    assert.ok(rows.some(r => r.name === 'Angela Merkel' && r.title === 'Chancelière fédérale'));
    // Dates cohérentes et dans l'ordre ; quatre régimes séparés par un trait.
    rows.forEach((r, i) => {
        if (r.to !== null) assert.ok(r.to >= r.from, r.name);
        if (i > 0) assert.ok(r.from >= rows[i - 1].from, r.name + ' : hors ordre');
    });
    assert.deepEqual(items.filter(it => it.divider).map(it => it.divider),
        ['Empire allemand', 'République de Weimar', 'Troisième Reich', 'République fédérale d’Allemagne']);
    // La seconde ligne : un chef de l'État de la liste, en fonction l'année où le chancelier prend ses fonctions.
    const heads = S.rowsOf('allemagne', 'etat').map(it => it.row);
    rows.filter(r => r.sub && r.group !== 'reich3').forEach(r => {
        const name = r.sub.split(' : ')[1];
        const head = heads.find(h => h.name.indexOf(name) === 0 || name.indexOf(h.name) === 0);
        assert.ok(head, `${r.name} : « ${name} » n'est pas dans la liste des chefs d'État`);
        assert.ok(head.from <= r.from && (head.to === null || head.to >= r.from), `${r.name} (${r.from}) : ${name} n'était pas en fonction`);
    });
    // Le mode chefs d'État reste le défaut.
    assert.equal(S.rowsOf('allemagne')[0].row.name, 'Guillaume Ier');
});

test('vice-présidents américains : le sous-texte dit sous quel président chacun a servi, et ce président était en fonction pendant son mandat', () => {
    const presidents = S.rowsOf('etats_unis').map(it => it.row);
    const vices = S.rowsOf('etats_unis', 'vice').map(it => it.row);
    assert.ok(vices.length >= 50);
    vices.forEach(v => {
        const m = v.title.match(/^Vice-présidente? sous (.+)$/);
        assert.ok(m, `${v.name} : « ${v.title} »`);
        m[1].split(', puis ').forEach(name => {
            // Un président en fonction à un moment du mandat du vice-président (les années de début et de fin comptent).
            const ok = presidents.some(p => p.name === name && p.from <= (v.to === null ? 9999 : v.to) && (p.to === null || p.to >= v.from));
            assert.ok(ok, `${v.name} (${v.from}-${v.to}) : « ${name} » n'était pas président à ce moment`);
        });
    });
    assert.strictEqual(vices.find(v => v.name === 'Kamala Harris').title, 'Vice-présidente sous Joe Biden');
    assert.strictEqual(vices.find(v => v.name === 'JD Vance').title, 'Vice-président sous Donald Trump');
    assert.strictEqual(vices.find(v => v.name === 'George Clinton').title, 'Vice-président sous Thomas Jefferson, puis James Madison');
    // La recherche par nom de président trouve aussi ses vice-présidents.
    const found = S.search(S.rowsOf('etats_unis', 'vice'), 'Eisenhower').map(it => it.row.name);
    assert.deepStrictEqual(found, ['Richard Nixon']);
});
