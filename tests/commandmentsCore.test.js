// Mitsvot et principes (js/commandmentsCore.js) : les effectifs de la tradition, et un texte pour chaque élément dans ui/fr.json.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../js/commandmentsCore.js');

const fr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ui', 'fr.json'), 'utf8'));
const text = key => fr.tools[key.replace(/^tools\./, '')];

test('les listes sont dans l\'ordre : lois de Noé, dix commandements, travaux du Chabbat, 613 commandements', () => {
    assert.deepEqual(C.SETS.map(s => s.id), ['noah', 'decalogue', 'shabbat', 'mitzvot', 'pratiques', 'principes', 'avot']);
});

test('effectifs de la tradition : 7 lois de Noé, 10 commandements, 39 travaux (11 + 13 + 9 + 6)', () => {
    assert.equal(C.itemsOf('noah').length, 7);
    assert.equal(C.itemsOf('decalogue').length, 10);
    assert.equal(C.itemsOf('shabbat').length, 39);
    assert.deepEqual(C.getSet('shabbat').groups.map(g => g.items.length), [11, 13, 9, 6]);
    assert.deepEqual(C.getSet('decalogue').groups.map(g => g.items.length), [5, 5]);
    C.SETS.filter(s => s.kind !== 'list613').forEach(s => assert.equal(C.itemsOf(s.id).length, s.count, s.id));
    assert.equal(C.getSet('mitzvot').count, 613);
});

test('les éléments sont numérotés de 1 à N sans trou ni doublon', () => {
    C.SETS.filter(s => s.kind !== 'list613').forEach(s => {
        const items = C.itemsOf(s.id);
        const sets = s.restartPerGroup ? s.groups.map(g => g.items.map((_, i) => i + 1)).flat() : items.map((_, i) => i + 1);
        assert.deepEqual(items.map(i => i.n), sets, s.id);
        assert.equal(new Set(items.map(i => i.id)).size, items.length, 'identifiants uniques : ' + s.id);
    });
});

test('chaque élément a son nom, son explication et sa source dans ui/fr.json (la source est facultative pour les travaux du Chabbat)', () => {
    C.SETS.filter(s => s.kind !== 'list613').forEach(s => {
        C.itemsOf(s.id).forEach(item => {
            C.fieldsOf(s.id).forEach(field => {
                const value = text(C.itemKey(s.id, item.id, field));
                assert.equal(typeof value, 'string', `${s.id}/${item.id}/${field} manque`);
                if (field !== 'ref' || s.id !== 'shabbat') assert.ok(value.trim().length > 0, `${s.id}/${item.id}/${field} est vide`);
            });
        });
    });
});

test('les sources des lois de Noé et des dix commandements sont toutes renseignées', () => {
    ['noah', 'decalogue'].forEach(id => C.itemsOf(id).forEach(item => assert.ok(text(C.itemKey(id, item.id, 'ref')), `${id}/${item.id}`)));
});

test('chaque liste a son titre, son chapeau et ses « à savoir » ; chaque groupe affiché a son titre', () => {
    C.SETS.forEach(s => {
        ['title', 'subtitle', 'lead', 'know_1'].forEach(f => assert.ok(text('cmd_' + s.id + '_' + f), `${s.id} : ${f}`));
        assert.ok(text('commandments_tab_' + s.id), 'onglet ' + s.id);
        if (s.groups.length > 1) s.groups.forEach(g => assert.ok(text('cmd_' + s.id + '_group_' + g.id), `${s.id} : groupe ${g.id}`));
    });
    for (let i = 1; i <= 7; i++) assert.ok(text('cmd_mitzvot_know_' + i), 'cmd_mitzvot_know_' + i);
});

test('on passe d\'une liste à la suivante, et il n\'y a rien avant la première ni après la dernière', () => {
    assert.equal(C.neighbor('noah', 1).id, 'decalogue');
    assert.equal(C.neighbor('decalogue', 1).id, 'shabbat');
    assert.equal(C.neighbor('shabbat', 1).id, 'mitzvot');
    assert.equal(C.neighbor('mitzvot', -1).id, 'shabbat');
    assert.equal(C.neighbor('noah', -1), null);
    assert.equal(C.neighbor('mitzvot', 1).id, 'pratiques');
    assert.equal(C.neighbor('pratiques', 1).id, 'principes');
    assert.equal(C.neighbor('principes', 1).id, 'avot');
    assert.equal(C.neighbor('avot', 1), null);
});

test('les travaux du Chabbat suivent l\'ordre de la Michna : le premier est « semer », le dernier « transporter »', () => {
    assert.equal(text('cmd_shabbat_m01_name'), 'Semer');
    assert.equal(text('cmd_shabbat_m11_name'), 'Cuire');
    assert.equal(text('cmd_shabbat_m37_name'), 'Allumer');
    assert.equal(text('cmd_shabbat_m39_name'), 'Transporter');
});

// --- Les 613 commandements (js/commandments613Data.js) ------------------------------------------------------------------------------------

test('613 commandements selon le Rambam : 248 positifs et 365 négatifs', () => {
    assert.equal(C.list613('pos').length, 248);
    assert.equal(C.list613('neg').length, 365);
    assert.equal(C.list613('pos').length + C.list613('neg').length, 613);
    assert.deepEqual(C.list613('zzz'), []);
});

test('613 : chaque commandement a un énoncé et un verset bien formé, numérotés sans trou', () => {
    ['pos', 'neg'].forEach(kind => {
        C.list613(kind).forEach((c, i) => {
            assert.equal(c.n, i + 1);
            assert.ok(c.text.trim().length >= 6, `${kind} ${c.n} : énoncé`);
            assert.match(c.ref, /^(Genèse|Exode|Lévitique|Nombres|Deutéronome) \d+:\d+/, `${kind} ${c.n} : verset « ${c.ref} »`);
        });
    });
});

test('613 : aucun énoncé en anglais ni aucun reste du texte d\'origine', () => {
    ['pos', 'neg'].forEach(kind => C.list613(kind).forEach(c => {
        assert.doesNotMatch(c.text, /\b(the|Not to|To |mitzvah|states)\b/, `${kind} ${c.n} : ${c.text}`);
        assert.doesNotMatch(c.text + c.ref, /[\[\]<>]/, `${kind} ${c.n}`);
    }));
});

test('613 : les regroupements se suivent sans trou, de 1 jusqu\'au dernier numéro, et chacun a son titre dans ui/fr.json', () => {
    [['pos', 248], ['neg', 365]].forEach(([kind, last]) => {
        const groups = C.LISTS613[kind].groups;
        assert.equal(groups[0].from, 1);
        assert.equal(groups[groups.length - 1].to, last);
        groups.forEach((g, i) => {
            assert.ok(g.to >= g.from, `${kind} ${g.id}`);
            if (i) assert.equal(g.from, groups[i - 1].to + 1, `${kind} ${g.id} : trou ou chevauchement`);
            assert.ok(text(`cmd_mitzvot_${kind}_group_${g.id}`), `titre de ${kind}/${g.id}`);
        });
        C.list613(kind).forEach(c => assert.ok(c.group, `${kind} ${c.n} sans regroupement`));
        assert.equal(new Set(groups.map(g => g.id)).size, groups.length, 'identifiants de groupes uniques : ' + kind);
    });
});

test('613 : repères connus du décompte (Exode 20:2 en premier, Deutéronome 17:17 en dernier, l\'écriture d\'un rouleau de la Torah…)', () => {
    const pos = C.list613('pos'), neg = C.list613('neg');
    assert.equal(pos[0].text, 'Savoir qu\'il y a un Dieu');
    assert.equal(pos[0].ref, 'Exode 20:2');
    assert.equal(pos[1].ref, 'Deutéronome 6:4');
    assert.match(pos[210 - 1].text, /père et sa mère/);
    assert.equal(pos[210 - 1].ref, 'Exode 20:12');
    assert.match(pos[212 - 1].text, /fécond/);
    assert.equal(neg[0].ref, 'Exode 20:3');
    assert.match(neg[320 - 1].text, /Chabbat/);
    assert.match(neg[365 - 1].text, /roi/);
    assert.equal(neg[365 - 1].ref, 'Deutéronome 17:17');
    assert.match(neg[289 - 1].text, /innocent/);
});

test('613 : la recherche ignore les accents, les majuscules, les apostrophes et les tirets, et cherche aussi dans le verset et le numéro', () => {
    assert.equal(C.search613('pos', '').length, 248);
    assert.equal(C.search613('pos', '   ').length, 248);
    const viaTexte = C.search613('pos', 'PESSAH').map(c => c.n);
    assert.ok(viaTexte.length >= 5 && viaTexte.includes(43));
    assert.deepEqual(viaTexte, C.search613('pos', 'pessa\'h').map(c => c.n));
    assert.deepEqual(C.search613('pos', 'Exode 20:12').map(c => c.n), [210]);
    assert.deepEqual(C.search613('neg', 'convoiter').map(c => c.n), [265]);
    assert.ok(C.search613('neg', 'Deuteronome 17:17').some(c => c.n === 365));
    assert.equal(C.search613('pos', 'introuvable-xyz').length, 0);
    // Tous les mots doivent y être.
    assert.ok(C.search613('neg', 'ne pas travailler chabbat').length < C.search613('neg', 'travailler').length);
});

test('bouton « A / א » : chaque liste et chaque élément ont leur nom en lettres hébraïques, et ce sont bien des lettres hébraïques', () => {
    const hebreu = /^[\u05D0-\u05EA\u05F3\u05F4\u05BE\s׳״]+$/;
    C.SETS.forEach(s => assert.match(text('cmd_' + s.id + '_he'), hebreu, 'liste ' + s.id));
    ['noah', 'decalogue', 'shabbat', 'pratiques', 'principes', 'avot'].forEach(id => C.itemsOf(id).forEach(item => {
        const value = text(C.itemKey(id, item.id, 'he'));
        assert.match(value, hebreu, `${id}/${item.id}`);
    }));
    assert.equal(text('cmd_shabbat_m01_he'), 'זורע');
    assert.equal(text('cmd_shabbat_m39_he'), 'מוציא מרשות לרשות');
    assert.equal(text('cmd_decalogue_d6_he'), 'לא תרצח');
    assert.ok(text('commandments_lang_aria'));
});

test('613 : le choix « tous » met les 248 positifs puis les 365 négatifs, chacun gardant son numéro d\'origine', () => {
    const all = C.list613('all');
    assert.equal(all.length, 613);
    assert.deepEqual(C.kindsOf('all'), ['pos', 'neg']);
    assert.deepEqual(C.kindsOf('neg'), ['neg']);
    assert.deepEqual(C.kindsOf('zzz'), []);
    assert.deepEqual([all[0].kind, all[0].n], ['pos', 1]);
    assert.deepEqual([all[247].kind, all[247].n], ['pos', 248]);
    assert.deepEqual([all[248].kind, all[248].n], ['neg', 1]);
    assert.deepEqual([all[612].kind, all[612].n], ['neg', 365]);
    assert.equal(C.search613('all', '').length, 613);
    // Une recherche porte sur les deux listes : « convoit » trouve le commandement négatif 265 (et rien chez les positifs).
    assert.deepEqual(C.search613('all', 'convoiter').map(c => c.kind + c.n), ['neg265']);
    assert.ok(C.search613('all', 'Chabbat').some(c => c.kind === 'pos') && C.search613('all', 'Chabbat').some(c => c.kind === 'neg'));
});

test('613 : le menu des thèmes a de quoi nommer les 35 thèmes (15 positifs, 20 négatifs) et leurs deux intitulés', () => {
    assert.equal(C.LISTS613.pos.groups.length, 15);
    assert.equal(C.LISTS613.neg.groups.length, 20);
    ['all', 'pos', 'neg'].forEach(k => {
        assert.ok(text('cmd_mitzvot_' + k), 'bouton ' + k);
        assert.ok(text('cmd_mitzvot_' + k + '_lead'), 'chapeau ' + k);
    });
    ['pos', 'neg'].forEach(k => assert.ok(text('cmd_mitzvot_kind_title_' + k)));
    assert.ok(text('cmd_mitzvot_theme_label') && text('cmd_mitzvot_theme_placeholder'));
});

test('mitsvot pratiques : trois listes courtes (femmes, Pessa\'h, Soukkot), dix mitsvot, un menu par thème', () => {
    const set = C.getSet('pratiques');
    assert.equal(set.themeMenu, true);
    assert.deepEqual(set.groups.map(g => g.items.length), [3, 5, 4, 3, 4, 2]);
    assert.equal(C.itemsOf('pratiques').length, 21);
    assert.deepEqual(C.itemsOf('pratiques').map(i => i.n), [1, 2, 3, 1, 2, 3, 4, 5, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2]);
    C.itemsOf('pratiques').forEach(item => {
        assert.ok(text(C.itemKey('pratiques', item.id, 'ref')), item.id + ' : source');
        assert.ok(text(C.itemKey('pratiques', item.id, 'he')), item.id + ' : nom hébreu');
    });
    ['women', 'pesah', 'soukkot'].forEach(g => assert.ok(text('cmd_pratiques_group_' + g), 'titre ' + g));
    assert.equal(C.getSet('mitzvot').themeMenu, undefined);
});

test('principes et textes : cinq thèmes (13 principes, 7 règles de Hillel, 13 de Rabbi Ismaël, 13 attributs, 12 Psoukim), 58 éléments, numérotés par thème', () => {
    const set = C.getSet('principes');
    assert.equal(set.themeMenu, true);
    assert.equal(set.restartPerGroup, true);
    assert.deepEqual(set.groups.map(g => g.items.length), [13, 7, 13, 13, 12]);
    assert.deepEqual(C.itemsOf('principes').map(i => i.n), [].concat(...[13, 7, 13, 13, 12].map(k => Array.from({ length: k }, (_, i) => i + 1))));
    ['faith', 'hillel', 'ishmael', 'mercy', 'psoukim'].forEach(g => assert.ok(text('cmd_principes_group_' + g), 'titre ' + g));
    C.itemsOf('principes').forEach(item => assert.ok(text(C.itemKey('principes', item.id, 'ref')), item.id + ' : source'));
    // Les attributs de miséricorde s'appuient tous sur Exode 34:6-7 : c'est le texte qui les fonde.
    C.itemsOf('principes').filter(i => i.group === 'mercy').forEach(i => assert.equal(text(C.itemKey('principes', i.id, 'ref')), 'Exode 34:6-7'));
});

test('les douze Psoukim ont leur passage hébreu complet, en lettres hébraïques, qui commence par le mot de leur nom', () => {
    const hebreu = /^[\u05D0-\u05EA\u05F3\u05F4\u05BE\s׳״']+$/;
    C.itemsOf('principes').filter(i => i.group === 'psoukim').forEach(i => {
        const full = text(C.itemKey('principes', i.id, 'full'));
        assert.match(full, hebreu, 'p' + i.n);
        assert.ok(full.split(' ').length >= 5, 'p' + i.n + ' : passage trop court');
    });
    ['p6', 'p11', 'p12'].forEach(id => assert.doesNotMatch(text(C.itemKey('principes', id, 'ref')), /à compléter/));
});

test('Pirkei Avot : trois thèmes (3 piliers, 51 formulations de 6:6, 11 maximes), chacun numéroté à partir de 1, avec le menu', () => {
    const set = C.getSet('avot');
    assert.equal(set.themeMenu, true);
    assert.equal(set.restartPerGroup, true);
    assert.deepEqual(set.groups.map(g => g.items.length), [3, 51, 11]);
    assert.equal(C.itemsOf('avot').length, 65);
    const n = [].concat(Array.from({ length: 3 }, (_, i) => i + 1), Array.from({ length: 51 }, (_, i) => i + 1), Array.from({ length: 11 }, (_, i) => i + 1));
    assert.deepEqual(C.itemsOf('avot').map(i => i.n), n);
    ['piliers', 'qualites', 'maximes'].forEach(g => assert.ok(text('cmd_avot_group_' + g), 'titre ' + g));
    // La règle de Hillel n'est pas une maxime de Pirkei Avot : elle figure en « à savoir », avec sa source talmudique.
    assert.match(text('cmd_avot_know_1'), /Chabbat 31a/);
    assert.ok(!C.itemsOf('avot').some(i => /haïssable/.test(text(C.itemKey('avot', i.id, 'text')))));
});
