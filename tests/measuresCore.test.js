// Poids et mesures bibliques (js/measuresCore.js) : les tableaux des livres servent de référence, le calcul doit les retrouver.

const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/measuresCore.js');

const size = (cat, id) => M.findUnit(cat, id).size;
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);

test('monnaies : la chaîne commune aux trois avis — 1 issar = 8 proutot, 1 dinar = 6 ma\'ot, 1 sela = 4 dinars, 1 sicle = 2 dinars, 1 mine = 25 sela, 1 talent = 60 mines', () => {
    assert.equal(size('money', 'issar'), 8);
    assert.equal(size('money', 'pundion'), 16);
    assert.equal(size('money', 'maah'), 32);
    assert.equal(size('money', 'dinar'), 6 * 32);
    assert.equal(size('money', 'shekel'), 4 * size('money', 'dinar'));
    assert.equal(size('money', 'beka'), 2 * size('money', 'dinar'));
    assert.equal(size('money', 'mane'), 25 * size('money', 'shekel'));
    assert.equal(size('money', 'talent'), 60 * size('money', 'mane'));
    assert.equal(size('money', 'talent_sacre'), 2 * size('money', 'talent'));
});

test('monnaies : le tableau « Vaut / Cette monnaie » suit la chaîne (1 dinar = 6 ma\'ot, 1 sela = 24 ma\'ot, 1 sela = 768 proutot)', () => {
    const cell = (row, col) => M.MONEY_TABLE.rows.find(r => r.id === row).cells[M.MONEY_TABLE.columns.indexOf(col)];
    assert.equal(cell('maah', 'dinar'), 6);
    assert.equal(cell('maah', 'shekel'), 24);
    assert.equal(cell('proutah', 'shekel'), 768);
    assert.equal(cell('dinar', 'shekel'), 4);
    assert.equal(cell('beka', 'shekel'), 2);
    assert.equal(cell('mane', 'talent'), 60);
    assert.equal(cell('shekel', 'talent'), 1500);
    assert.equal(cell('shekel', 'talent_sacre'), 3000);
    assert.equal(cell('talent', 'talent_sacre'), 2);
    // Case vide : la monnaie de la ligne n'est pas plus petite que celle de la colonne.
    assert.equal(cell('talent', 'talent'), null);
    assert.equal(cell('talent', 'mane'), null);
});

test('monnaies : la sela pèse 19,2 g (Rav Naé), 17 g (Gueonim), 14,1 g (Rashi) ; le talent 28,8 kg, 25,5 kg, 21,15 kg', () => {
    close(M.factor('money', 'shekel', 'nae'), 19.2);
    close(M.factor('money', 'shekel'), 19.2);
    close(M.factor('money', 'shekel', 'gueonim'), 17);
    close(M.factor('money', 'shekel', 'rashi'), 14.1);
    close(M.factor('money', 'talent', 'nae'), 28800);
    close(M.factor('money', 'talent', 'gueonim'), 25500);
    close(M.factor('money', 'talent', 'rashi'), 21150);
    close(M.factor('money', 'talent_sacre', 'nae'), 57600);
    // Les tableaux de l'avis : dinar, demi-sela, mine, proutah.
    close(M.factor('money', 'dinar', 'nae'), 4.8);
    close(M.factor('money', 'dinar', 'gueonim'), 4.25);
    close(M.factor('money', 'beka', 'nae'), 9.6);
    close(M.factor('money', 'beka', 'gueonim'), 8.5);
    close(M.factor('money', 'mane', 'nae'), 480);
    close(M.factor('money', 'maah', 'nae'), 0.8);
    close(M.factor('money', 'issar', 'nae'), 0.2);
    close(M.factor('money', 'proutah', 'nae'), 0.025);
    close(M.factor('money', 'proutah', 'gueonim') * 192, 4.25);
});

test('monnaies : convertir un talent des usages sacrés en kilos (avis de Rav Naé), et des kilos en talents', () => {
    const talent = M.convert('money', 1, 'talent_sacre', 'nae').find(r => r.id === 'kg');
    close(talent.value, 57.6);
    assert.equal(talent.approx, true);
    const retour = M.convert('money', 57.6, 'kg', 'nae').find(r => r.id === 'talent_sacre');
    close(retour.value, 1);
    // Entre deux monnaies bibliques, le rapport est exact.
    const chekels = M.convert('money', 1, 'talent', 'nae').find(r => r.id === 'shekel');
    close(chekels.value, 1500);
    assert.equal(chekels.approx, false);
});

test('volumes : les relations du livre (en œufs, log, kav, omer, séa) se retrouvent par le calcul', () => {
    M.VOLUME_TABLE.forEach(row => {
        row.rels.forEach(([unit, n]) => close(size('volumes', row.id) / size('volumes', unit), n, 1e-9));
    });
});

test('volumes : les valeurs modernes de Rav Naé, à partir de l\'œuf de 57,6 mL — épha 24,8832 L, omer 2,48832 L, séa 8,2944 L, kav 1,3824 L, hin 4,1472 L, log 0,3456 L, homer 248,832 L', () => {
    const L = id => M.factor('volumes', id);
    close(L('betsa'), 0.0576);
    close(L('log'), 0.3456);
    close(L('kav'), 1.3824);
    close(L('omer'), 2.48832);
    close(L('sea'), 8.2944);
    close(L('epha'), 24.8832);
    close(L('bath'), 24.8832);
    close(L('hin'), 4.1472);
    close(L('lethech'), 124.416);
    close(L('homer'), 248.832);
});

test('volumes : avec l\'avis du \'Hazon Ich, l\'œuf vaut ≈ 99,5 mL, le log ≈ 0,597 L, le hin 7,2 L, l\'épha 43 L, le homer 430 L', () => {
    const H = id => M.factor('volumes', id, 'hazon');
    assert.ok(H('betsa') * 1000 >= 99.5 && H('betsa') * 1000 <= 100, 'œuf');
    assert.ok(H('log') >= 0.597 && H('log') <= 0.600, 'log');
    close(H('epha'), 43);
    close(H('hin'), 7.2, 0.01);
    close(H('homer'), 430);
});

test('volumes : l\'épha et le bath sont la même capacité, le homer et le cor aussi ; le hin vaut 12 log', () => {
    assert.equal(size('volumes', 'epha'), size('volumes', 'bath'));
    assert.equal(size('volumes', 'hin'), 12 * size('volumes', 'log'));
    assert.equal(size('volumes', 'homer'), 10 * size('volumes', 'epha'));
    assert.equal(size('volumes', 'lethech'), 5 * size('volumes', 'epha'));
    // Le mnémotechnique : épha = 3 séa, séa = 6 kav, kav = 4 log, log = 6 œufs.
    assert.equal(size('volumes', 'epha') / size('volumes', 'sea'), 3);
    assert.equal(size('volumes', 'sea') / size('volumes', 'kav'), 6);
    assert.equal(size('volumes', 'kav') / size('volumes', 'log'), 4);
    assert.equal(size('volumes', 'log') / size('volumes', 'betsa'), 6);
});

test('distances : la chaîne doigt, palme, empan, coudée, mil, parsa, journée de marche', () => {
    M.DISTANCE_CHAIN.forEach(link => assert.equal(size('distances', link.id) / size('distances', link.per), link.n, link.id));
    assert.equal(size('distances', 'amah'), 2 * size('distances', 'zeret'), 'une coudée = 2 empans');
});

test('distances : trois opinions — coudée de 48 cm (Rav Naé), 53,975 cm (Feinstein) ou 57,6 cm (\'Hazon Ich), et tout le reste suit', () => {
    const m = (id, op) => M.factor('distances', id, op);
    close(m('amah', 'nae'), 0.48);
    close(m('amah', 'hazon'), 0.576);
    close(m('etzba', 'nae'), 0.02);
    close(m('etzba', 'hazon'), 0.024);
    close(m('tefach', 'nae'), 0.08);
    close(m('mil', 'nae'), 960);
    close(m('mil', 'hazon'), 1152);
    close(m('parsa', 'nae'), 3840);
    close(m('parsa', 'hazon'), 4608);
    close(m('yom', 'nae'), 38400);
    close(m('yom', 'hazon'), 46080);
    // Rav Moché Feinstein : 21,25 pouces = 53,975 cm ; le tefach vaut 9,0 cm, le doigt 2,25 cm, le mil 1 079,5 m.
    close(m('amah', 'feinstein'), 0.53975);
    close(m('amah', 'feinstein') * 100 / 2.54, 21.25, 1e-9);
    close(m('tefach', 'feinstein'), 0.09, 1e-3);
    close(m('etzba', 'feinstein'), 0.0225, 1e-3);
    close(m('mil', 'feinstein'), 1079.5, 1e-3);
    close(m('inch', 'nae'), 0.0254);
    // Sans opinion précisée : Rav Naé.
    close(m('amah'), 0.48);
});

test('distances : le temps de marche — un mil en 18 minutes, une parsa en 72 minutes', () => {
    close(M.walkMinutes(M.factor('distances', 'mil', 'nae'), 'nae'), 18);
    close(M.walkMinutes(M.factor('distances', 'parsa', 'nae'), 'nae'), 72);
    close(M.walkMinutes(M.factor('distances', 'parsa', 'hazon'), 'hazon'), 72, 1e-9);
    // Un kilomètre, à l'opinion courte : un peu plus d'un mil.
    assert.ok(M.walkMinutes(1000, 'nae') > 18 && M.walkMinutes(1000, 'nae') < 20);
});

test('convert : tolère une saisie invalide, marque les lignes approchées, garde l\'unité d\'origine', () => {
    assert.equal(M.convert('volumes', 'abc', 'epha'), null);
    assert.equal(M.convert('volumes', 1, 'inconnue'), null);
    const rows = M.convert('volumes', 1, 'epha');
    assert.equal(rows.length, M.unitsOf('volumes').length);
    assert.equal(rows.find(r => r.id === 'epha').isSource, true);
    close(rows.find(r => r.id === 'l').value, 24.8832);
    assert.equal(rows.find(r => r.id === 'l').approx, true);
    close(rows.find(r => r.id === 'sea').value, 3);
    assert.equal(rows.find(r => r.id === 'sea').approx, false);
    // Des litres vers les éphas.
    close(M.convert('volumes', 44, 'l').find(r => r.id === 'epha').value, 44 / 24.8832);
});

test('formatNumber et formatDuration : lisibles', () => {
    assert.equal(M.formatNumber(0, 'fr'), '0');
    assert.equal(M.formatNumber(1500, 'en'), '1,500');
    assert.equal(M.formatNumber(0.01781253, 'en'), '0.01781');
    assert.equal(M.formatNumber(34.2, 'en'), '34.2');
    assert.equal(M.formatNumber(NaN), '—');
    assert.equal(M.formatDuration(18), '18 min');
    assert.equal(M.formatDuration(72), '1 h 12');
    assert.equal(M.formatDuration(120), '2 h');
    assert.equal(M.formatDuration(125), '2 h 05');
    assert.equal(M.formatDuration(0.2), '< 1 min');
});

test('volumes : deux avis sur l\'épha, Rav Naé (≈ 24,88 L, par défaut) et \'Hazon Ich (43 L)', () => {
    close(M.factor('volumes', 'epha'), 24.8832);
    close(M.factor('volumes', 'epha', 'nae'), 24.8832);
    close(M.factor('volumes', 'epha', 'hazon'), 43);
    // Les rapports entre unités bibliques restent exacts quel que soit l'avis.
    close(M.factor('volumes', 'log', 'hazon') / M.factor('volumes', 'betsa', 'hazon'), 6);
    close(M.factor('volumes', 'epha', 'hazon') / M.factor('volumes', 'epha', 'nae'), 43 / 24.8832);
});

test('volumes : avec l\'avis du \'Hazon Ich, l\'œuf vaut 90 à 100 mL, le log 0,55 à 0,60 L, et l\'épha 40 à 43 L (tableau de l\'avis)', () => {
    const egg = M.factor('volumes', 'betsa', 'hazon') * 1000;
    assert.ok(egg >= 90 && egg <= 100, 'œuf : ' + egg);
    const log = M.factor('volumes', 'log', 'hazon');
    assert.ok(log >= 0.55 && log <= 0.60, 'log : ' + log);
    const epha = M.factor('volumes', 'epha', 'hazon');
    assert.ok(epha >= 40 && epha <= 43, 'épha : ' + epha);
});

test('bouton A / א : chaque unité et chaque avis a son nom en hébreu dans ui/fr.json (lettres hébraïques uniquement)', () => {
    const d = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'ui', 'fr.json'), 'utf8')).tools;
    const hebreu = /^[\u05D0-\u05EA\u05F3\u05F4\s\/()\-]+$/;
    ['distances', 'volumes', 'money', 'surfaces'].forEach(cat => {
        M.unitsOf(cat).forEach(u => {
            const he = d['measures_he_u_' + u.id];
            assert.ok(he, `nom hébreu manquant : ${cat}/${u.id}`);
            if (u.group === 'biblical') assert.match(he, hebreu, `${u.id} : ${he}`);
        });
        M.CATEGORIES[cat].opinions.forEach(op => assert.ok(d['measures_he_op_' + op], `avis ${op}`));
        assert.ok(d['measures_he_label_' + cat], `intitulé ${cat}`);
    });
});

test('superficies : le beit seah = 2 500 coudées carrées ; 576 m² (Rav Naé, 48 cm), 728,3 m² (Feinstein, 53,975 cm), 829,44 m² (\'Hazon Ich, 57,6 cm)', () => {
    close(M.factor('surfaces', 'beitseah', 'nae'), 576);
    close(M.factor('surfaces', 'beitseah'), 576);
    close(M.factor('surfaces', 'beitseah', 'feinstein'), 2500 * 0.53975 * 0.53975);
    close(M.factor('surfaces', 'beitseah', 'hazon'), 829.44);
});

test('superficies : les rapports du livre (beit rova = ¼ beit seah, beit kor = 30 beit seah, beit letech = 15 beit seah) et les conversions', () => {
    close(M.factor('surfaces', 'beitrova', 'nae'), 144);
    close(M.factor('surfaces', 'beitkor', 'nae'), 17280);
    close(M.factor('surfaces', 'beitletech', 'nae'), 8640);
    close(M.factor('surfaces', 'beitkor', 'nae') / M.factor('surfaces', 'beitseah', 'nae'), 30);
    close(M.factor('surfaces', 'beitseah', 'nae') / M.factor('surfaces', 'beitrova', 'nae'), 4);
    // Un beit kor (Rav Naé) = 1,728 hectare = 172,8 ares.
    const ha = M.convert('surfaces', 1, 'beitkor', 'nae').find(r => r.id === 'ha');
    close(ha.value, 1.728);
    assert.equal(ha.approx, true);
    close(M.convert('surfaces', 1, 'beitkor', 'nae').find(r => r.id === 'are').value, 172.8);
});

test('temps : zmanim Gra (netz 6 h, shkia 18 h → journée de 12 heures zmaniyot de 60 min)', () => {
    const z = M.zmanimOf(360, 1080);
    close(z.zmanit, 60);
    close(z.shema, 540);      // 09:00
    close(z.tefila, 600);     // 10:00
    close(z.chatzot, 720);    // 12:00
    close(z.guedola, 750);    // 12:30
    close(z.ketana, 930);     // 15:30 = shkia − 2½ heures zmaniyot
    close(z.plag, 1005);      // 16:45 = shkia − 1¼ heure zmanit
});

test('temps : zmanim Magen Avraham (alot 72 min avant le lever, tzet 72 min après le coucher)', () => {
    const z = M.zmanimOf(288, 1152);
    close(z.zmanit, 72);
    close(z.shema, 504);      // 08:24
    close(z.tefila, 576);     // 09:36
    close(z.chatzot, 720);    // 12:00
    close(z.guedola, 756);    // 12:36
    close(z.ketana, 972);     // 16:12
    close(z.plag, 1062);      // 17:42
});
