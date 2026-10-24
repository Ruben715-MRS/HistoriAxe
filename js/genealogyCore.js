// =========================================================================
// === LA GÉNÉALOGIE BIBLIQUE — DONNÉES ET RÈGLES (outil de la boîte à outils) ===
// =========================================================================
// Un seul arbre, d'Adam aux descendants de Jacob, qui réunit les tableaux généalogiques de l'appendice A de la Torah de Mesorah Publications
// (Genèse 10 : les soixante-dix nations ; la famille d'Abraham ; la famille d'Ésaü ; la maison de Jacob arrivée en Égypte ; les familles de
// Moïse, d'Aaron et de Miriam), plus la lignée d'Adam à Noé, donnée en texte. Les maillons que ces tableaux ne montrent pas (de Peleg à
// Térah : Réou, Seroug, Na'hor, Genèse 11) sont ajoutés pour que l'arbre soit d'un seul tenant.
// Contenu en français et en hébreu (sans voyelles). Pur, sans DOM : testé dans tests/genealogyCore.test.js.
//
// Une personne : { id, fr, he, sex ('m' | 'f'), father (id de l'arbre : le parent sous lequel on la range), mother (id, quand le père a plusieurs
// unions), unions: [[id de la partenaire, 'mariage' | 'concubinage' | 'interdite']], far (lien « descendant lointain », ligne en pointillés),
// nation (numéro de 1 à 70 dans le tableau de Genèse 10), ex (hors des soixante-dix de la maison de Jacob : Er et Onan, morts en Canaan) }.
// L'ordre du tableau PEOPLE est l'ordre d'affichage des enfants d'un même père. Une femme sans père connu (Ève, Tamar, Bilha…) n'a pas de
// place propre dans l'arbre : elle apparaît à côté de son conjoint.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.GenealogyCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var PEOPLE = [];
    var BY = {};

    function add(sex, id, fr, he, father, o) {
        var opts = o || {};
        var p = {
            id: id, fr: fr, he: he, sex: sex, father: father || null, mother: opts.mother || null, unions: opts.unions || [],
            far: !!opts.far, nation: opts.nation || 0, ex: !!opts.ex
        };
        PEOPLE.push(p);
        BY[id] = p;
        return p;
    }
    function m(id, fr, he, father, o) { return add('m', id, fr, he, father, o); }
    function f(id, fr, he, father, o) { return add('f', id, fr, he, father, o); }

    // --- D'Adam à Noé -------------------------------------------------------------------------------
    m('adam', 'Adam', 'אדם', null, { unions: [['eve', 'mariage']] });
    f('eve', 'Ève', 'חוה', null);
    m('cain', 'Caïn', 'קין', 'adam', { mother: 'eve' });
    m('henoch_cain', 'Hénoc', 'חנוך', 'cain');
    m('irad', 'Irad', 'עירד', 'henoch_cain');
    m('mehujael', 'Mehujaël', 'מחויאל', 'irad');
    m('metuschael', 'Metuschaël', 'מתושאל', 'mehujael');
    m('lemec_cain', 'Lémec', 'למך', 'metuschael', { unions: [['ada_lemec', 'mariage'], ['tsilla', 'mariage']] });
    f('ada_lemec', 'Ada', 'עדה', null);
    f('tsilla', 'Tsilla', 'צלה', null);
    m('jabal', 'Jabal', 'יבל', 'lemec_cain', { mother: 'ada_lemec' });
    m('jubal', 'Jubal', 'יובל', 'lemec_cain', { mother: 'ada_lemec' });
    m('tubal_cain', 'Tubal-Caïn', 'תובל קין', 'lemec_cain', { mother: 'tsilla' });
    f('naama', 'Naama', 'נעמה', 'lemec_cain', { mother: 'tsilla' });
    m('abel', 'Abel', 'הבל', 'adam', { mother: 'eve' });
    m('seth', 'Seth', 'שת', 'adam', { mother: 'eve' });
    m('enosh', 'Énosh', 'אנוש', 'seth');
    m('kenan', 'Kénan', 'קינן', 'enosh');
    m('mahalaleel', 'Mahalaleel', 'מהללאל', 'kenan');
    m('jered', 'Jéred', 'ירד', 'mahalaleel');
    m('henoch_seth', 'Hénoc', 'חנוך', 'jered');
    m('metuschelah', 'Metuschélah', 'מתושלח', 'henoch_seth');
    m('lemec_seth', 'Lémec', 'למך', 'metuschelah');
    m('noe', 'Noé', 'נח', 'lemec_seth');
    m('sem', 'Sem', 'שם', 'noe');
    m('cham', 'Cham', 'חם', 'noe');
    m('japhet', 'Japhet', 'יפת', 'noe');

    // --- Les soixante-dix nations (Genèse 10) --------------------------------------------------------
    m('gomer', 'Gomer', 'גמר', 'japhet', { nation: 1 });
    m('achkenaz', 'Achkenaz', 'אשכנז', 'gomer', { nation: 8 });
    m('rifat', 'Rifat', 'ריפת', 'gomer', { nation: 9 });
    m('togarma', 'Togarma', 'תגרמה', 'gomer', { nation: 10 });
    m('magog', 'Magog', 'מגוג', 'japhet', { nation: 2 });
    m('madai', 'Madaï', 'מדי', 'japhet', { nation: 3 });
    m('yavan', 'Yavan', 'יון', 'japhet', { nation: 4 });
    m('elicha', 'Elicha', 'אלישה', 'yavan', { nation: 11 });
    m('tarchich', 'Tarchich', 'תרשיש', 'yavan', { nation: 12 });
    m('kitim', 'Kitim', 'כתים', 'yavan', { nation: 13 });
    m('dodanim', 'Dodanim', 'דדנים', 'yavan', { nation: 14 });
    m('touval', 'Touval', 'תבל', 'japhet', { nation: 5 });
    m('mechekh', 'Mechekh', 'משך', 'japhet', { nation: 6 });
    m('tiras', 'Tiras', 'תירס', 'japhet', { nation: 7 });

    m('kouch', 'Kouch', 'כוש', 'cham', { nation: 15 });
    m('seva', 'Seva', 'סבא', 'kouch', { nation: 19 });
    m('havila_kouch', 'Havila', 'חוילה', 'kouch', { nation: 20 });
    m('savta', 'Savta', 'סבתה', 'kouch', { nation: 21 });
    m('rama', 'Rama', 'רעמה', 'kouch', { nation: 22 });
    m('cheva_rama', 'Cheva', 'שבא', 'rama', { nation: 24 });
    m('dedan_rama', 'Dedan', 'דדן', 'rama', { nation: 25 });
    m('savtekha', 'Savtekha', 'סבתכא', 'kouch', { nation: 23 });
    m('nimrod', 'Nimrod', 'נמרד', 'kouch', { nation: 26 });
    m('mitsraim', 'Mitsraïm', 'מצרים', 'cham', { nation: 16 });
    m('loudim', 'Loudim', 'לודים', 'mitsraim', { nation: 27 });
    m('anamim', 'Anamim', 'ענמים', 'mitsraim', { nation: 28 });
    m('lehavim', 'Lehavim', 'להבים', 'mitsraim', { nation: 29 });
    m('naftouhim', 'Naftou’him', 'נפתחים', 'mitsraim', { nation: 30 });
    m('patroussim', 'Patroussim', 'פתרסים', 'mitsraim', { nation: 31 });
    m('kaslouhim', 'Kaslou’him', 'כסלחים', 'mitsraim', { nation: 32 });
    m('pelichtim', 'Pelichtim', 'פלשתים', 'kaslouhim');
    m('kaftorim', 'Kaftorim', 'כפתרים', 'mitsraim', { nation: 33 });
    m('pout', 'Pout', 'פוט', 'cham', { nation: 17 });
    m('canaan', 'Canaan', 'כנען', 'cham', { nation: 18 });
    m('tsidon', 'Tsidon', 'צידון', 'canaan', { nation: 34 });
    m('het', 'Het', 'חת', 'canaan', { nation: 35 });
    m('elon_het', 'Elon', 'אילן', 'het', { far: true });
    f('ada_esau', 'Ada (Basmat)', 'עדה (בשמת)', 'elon_het');
    m('hayevoussi', 'Hayevoussi', 'היבוסי', 'canaan', { nation: 36 });
    m('haemori', 'Haémori', 'האמרי', 'canaan', { nation: 37 });
    m('haguirgachi', 'Haguirgachi', 'הגרגשי', 'canaan', { nation: 38 });
    m('hahivi', 'Ha’hivi', 'החוי', 'canaan', { nation: 39 });
    m('haarki', 'Haarki', 'הערקי', 'canaan', { nation: 40 });
    m('hassini', 'Hassini', 'הסיני', 'canaan', { nation: 41 });
    m('haarvadi', 'Haarvadi', 'הארודי', 'canaan', { nation: 42 });
    m('hatsemari', 'Hatsémari', 'הצמרי', 'canaan', { nation: 43 });
    m('hahamati', 'Ha’hamati', 'החמתי', 'canaan', { nation: 44 });

    m('elam', 'Elam', 'עילם', 'sem', { nation: 45 });
    m('achour', 'Achour', 'אשור', 'sem', { nation: 46 });
    m('arpakhchad', 'Arpakhchad', 'ארפכשד', 'sem', { nation: 47 });
    m('chelah', 'Chela’h', 'שלח', 'arpakhchad', { nation: 54 });
    m('ever', 'Ever', 'עבר', 'chelah', { nation: 55 });
    m('peleg', 'Peleg', 'פלג', 'ever', { nation: 56 });
    // Genèse 11 (absent des tableaux) : de Peleg à Térah.
    m('reou', 'Réou', 'רעו', 'peleg');
    m('seroug', 'Seroug', 'שרוג', 'reou');
    m('nahor_seroug', 'Na’hor', 'נחור', 'seroug');
    m('terah', 'Téra’h', 'תרח', 'nahor_seroug');
    m('yaktan', 'Yaktan', 'יקטן', 'ever', { nation: 57 });
    m('almodad', 'Almodad', 'אלמודד', 'yaktan', { nation: 58 });
    m('chelef', 'Chelef', 'שלף', 'yaktan', { nation: 59 });
    m('hatsarmavet', 'Hatsarmavet', 'חצרמות', 'yaktan', { nation: 60 });
    m('yerah', 'Yera’h', 'ירח', 'yaktan', { nation: 61 });
    m('hadoram', 'Hadoram', 'הדורם', 'yaktan', { nation: 62 });
    m('ouzal', 'Ouzal', 'אוזל', 'yaktan', { nation: 63 });
    m('dikla', 'Dikla', 'דקלה', 'yaktan', { nation: 64 });
    m('oval', 'Oval', 'עובל', 'yaktan', { nation: 65 });
    m('avimael', 'Avimaël', 'אבימאל', 'yaktan', { nation: 66 });
    m('cheva_yaktan', 'Cheva', 'שבא', 'yaktan', { nation: 67 });
    m('ofir', 'Ofir', 'אופיר', 'yaktan', { nation: 68 });
    m('havila_yaktan', 'Havila', 'חוילה', 'yaktan', { nation: 69 });
    m('yovav', 'Yovav', 'יובב', 'yaktan', { nation: 70 });
    m('loud', 'Loud', 'לוד', 'sem', { nation: 48 });
    m('aram_sem', 'Aram', 'ארם', 'sem', { nation: 49 });
    m('outs_aram', 'Outs', 'עוץ', 'aram_sem', { nation: 50 });
    m('houl', 'Houl', 'חול', 'aram_sem', { nation: 51 });
    m('gueter', 'Gueter', 'גתר', 'aram_sem', { nation: 52 });
    m('mach', 'Mach', 'מש', 'aram_sem', { nation: 53 });

    // --- La famille d'Abraham -----------------------------------------------------------------------
    m('nahor', 'Na’hor', 'נחור', 'terah', { unions: [['milca', 'mariage'], ['reouma', 'concubinage']] });
    m('haran', 'Haran', 'הרן', 'terah');
    m('abraham', 'Abraham', 'אברהם', 'terah', { unions: [['sara', 'mariage'], ['hagar', 'concubinage'], ['ketoura', 'concubinage']] });
    m('loth', 'Loth', 'לוט', 'haran');
    m('moav', 'Moav', 'מואב', 'loth');
    m('ben_ami', 'Ben Ami', 'בן עמי', 'loth');
    f('milca', 'Milca', 'מלכה', 'haran');
    f('sara', 'Sara / Yisca', 'שרה / יסכה', 'haran');

    f('reouma', 'Réouma', 'ראומה', null);
    f('hagar', 'Hagar', 'הגר', null);
    f('ketoura', 'Kétoura', 'קטורה', null);

    m('outs_milca', 'Outs', 'עוץ', 'nahor', { mother: 'milca' });
    m('bouz', 'Bouz', 'בוז', 'nahor', { mother: 'milca' });
    m('kemouel', 'Kémouel', 'קמואל', 'nahor', { mother: 'milca' });
    m('aram_kemouel', 'Aram', 'ארם', 'kemouel');
    m('kessed', 'Kessed', 'כשד', 'nahor', { mother: 'milca' });
    m('hazo', '’Hazo', 'חזו', 'nahor', { mother: 'milca' });
    m('pildach', 'Pildach', 'פלדש', 'nahor', { mother: 'milca' });
    m('yidlaf', 'Yidlaf', 'ידלף', 'nahor', { mother: 'milca' });
    m('bethouel', 'Béthouel', 'בתואל', 'nahor', { mother: 'milca' });
    m('laban', 'Laban', 'לבן', 'bethouel');
    f('lea', 'Léa', 'לאה', 'laban');
    f('rachel', 'Rachel', 'רחל', 'laban');
    f('rebecca', 'Rébecca', 'רבקה', 'bethouel');
    m('teva', 'Téva’h', 'טבח', 'nahor', { mother: 'reouma' });
    m('gaham', 'Ga’ham', 'גחם', 'nahor', { mother: 'reouma' });
    m('tahach', 'Ta’hach', 'תחש', 'nahor', { mother: 'reouma' });
    m('maakha', 'Maakha', 'מעכה', 'nahor', { mother: 'reouma' });

    m('ichmael', 'Ichmaël', 'ישמעאל', 'abraham', { mother: 'hagar' });
    m('nevayot', 'Névayot', 'נביות', 'ichmael');
    m('kedar', 'Kédar', 'קדר', 'ichmael');
    m('adbeel', 'Adbéel', 'אדבאל', 'ichmael');
    m('mivsam', 'Mivsam', 'מבשם', 'ichmael');
    m('michma', 'Michma', 'משמע', 'ichmael');
    m('douma', 'Douma', 'דומה', 'ichmael');
    m('massa', 'Massa', 'משא', 'ichmael');
    m('hadad', '’Hadad', 'חדד', 'ichmael');
    m('tema', 'Téma', 'תימא', 'ichmael');
    m('yetour', 'Yétour', 'יטור', 'ichmael');
    m('nafich', 'Nafich', 'נפיש', 'ichmael');
    m('kedema', 'Kédema', 'קדמה', 'ichmael');
    f('basmat', 'Basmat (Ma’halat)', 'בשמת (מחלת)', 'ichmael');

    m('isaac', 'Isaac', 'יצחק', 'abraham', { mother: 'sara', unions: [['rebecca', 'mariage']] });

    m('zimran', 'Zimran', 'זמרן', 'abraham', { mother: 'ketoura' });
    m('yokchan', 'Yokchan', 'יקשן', 'abraham', { mother: 'ketoura' });
    m('cheva_yokchan', 'Chéva', 'שבא', 'yokchan');
    m('dedan_yokchan', 'Dédan', 'דדן', 'yokchan');
    m('achourim', 'Achourim', 'אשורים', 'dedan_yokchan');
    m('letouchim', 'Létouchim', 'לטושים', 'dedan_yokchan');
    m('leoumim', 'Léoumim', 'לאמים', 'dedan_yokchan');
    m('medan', 'Médan', 'מדן', 'abraham', { mother: 'ketoura' });
    m('midian', 'Midian', 'מדין', 'abraham', { mother: 'ketoura' });
    m('efa', 'Efa', 'עיפה', 'midian');
    m('efer', 'Efer', 'עפר', 'midian');
    m('hanokh_midian', '’Hanokh', 'חנך', 'midian');
    m('avida', 'Avida', 'אבידע', 'midian');
    m('eldaa', 'Eldaa', 'אלדעה', 'midian');
    m('jethro', 'Jethro', 'יתרו', 'midian', { far: true });
    f('tsippora', 'Tsippora', 'צפרה', 'jethro');
    m('yichbak', 'Yichbak', 'ישבק', 'abraham', { mother: 'ketoura' });
    m('chouah', 'Choua’h', 'שוח', 'abraham', { mother: 'ketoura' });

    // --- La famille d'Ésaü (Genèse 36) --------------------------------------------------------------
    m('esau', 'Esaü', 'עשו', 'isaac', {
        mother: 'rebecca',
        unions: [['ada_esau', 'mariage'], ['basmat', 'mariage'], ['aholibama', 'mariage']]
    });
    m('eliphaz', 'Eliphaz', 'אליפז', 'esau', { mother: 'ada_esau', unions: [['timna', 'concubinage'], ['aholibama', 'interdite']] });
    m('teman', 'Téman', 'תימן', 'eliphaz');
    m('omar', 'Omar', 'אומר', 'eliphaz');
    m('tsefo', 'Tséfo', 'צפו', 'eliphaz');
    m('gatam', 'Gatam', 'געתם', 'eliphaz');
    m('kenaz', 'Kénaz', 'קנז', 'eliphaz');
    f('timna', 'Timna', 'תמנע', null);
    m('amalek', 'Amalek', 'עמלק', 'eliphaz', { mother: 'timna' });
    m('korah_edom', 'Kora’h', 'קרח', 'eliphaz', { mother: 'aholibama' });
    m('reouel', 'Réouel', 'רעואל', 'esau', { mother: 'basmat' });
    m('nahat', 'Na’hat', 'נחת', 'reouel');
    m('zerah_reouel', 'Zéra’h', 'זרח', 'reouel');
    m('chamma', 'Chamma', 'שמה', 'reouel');
    m('mizzaw', 'Mizzaw', 'מזה', 'reouel');
    m('yeouch', 'Yéouch', 'יעוש', 'esau', { mother: 'aholibama' });
    m('yalam', 'Yalam', 'יעלם', 'esau', { mother: 'aholibama' });

    m('seir', 'Seïr', 'שעיר', 'noe', { far: true, unions: [['femme_seir', 'mariage']] });
    f('femme_seir', 'La femme de Seïr', 'אשת שעיר', null);
    m('lotan', 'Lotan', 'לוטן', 'seir');
    m('hori', '’Hori', 'חרי', 'lotan');
    m('hemam', 'Hemam', 'הימם', 'lotan');
    m('choval', 'Choval', 'שובל', 'seir');
    m('alvan', 'Alvan', 'עלון', 'choval');
    m('manahat', 'Mana’hat', 'מנחת', 'choval');
    m('eval', 'Eval', 'עיבל', 'choval');
    m('chefo', 'Chéfo', 'שפו', 'choval');
    m('onam', 'Onam', 'אונם', 'choval');
    m('tsivon', 'Tsivon', 'צבעון', 'seir', { unions: [['femme_seir', 'interdite']] });
    m('aya', 'Aya', 'איה', 'tsivon');
    m('ana', 'Ana', 'ענה', 'tsivon', { mother: 'femme_seir' });
    m('dichon_ana', 'Dichon', 'דשן', 'ana');
    f('aholibama', 'Aholibama (Judith)', 'אהליבמה (יהודית)', 'ana');
    m('dichon', 'Dichon', 'דשון', 'seir');
    m('hemdan', '’Hemdan', 'חמדן', 'dichon');
    m('echban', 'Echban', 'אשבן', 'dichon');
    m('itran', 'Itran', 'יתרן', 'dichon');
    m('kheran', 'Khéran', 'כרן', 'dichon');
    m('etser', 'Etser', 'אצר', 'seir');
    m('bilhan', 'Bilhan', 'בלהן', 'etser');
    m('zaavan', 'Zaavan', 'זעון', 'etser');
    m('akan', 'Akan', 'עקן', 'etser');
    m('dichan', 'Dichan', 'דישן', 'seir');
    m('outs_dichan', 'Outs', 'עוץ', 'dichan');
    m('aran', 'Aran', 'ארן', 'dichan');

    // --- La maison de Jacob arrivée en Égypte (Genèse 46) ---------------------------------------------
    m('jacob', 'Jacob', 'יעקב', 'isaac', {
        mother: 'rebecca',
        unions: [['lea', 'mariage'], ['rachel', 'mariage'], ['bilha', 'concubinage'], ['zilpa', 'concubinage']]
    });
    f('bilha', 'Bilha', 'בלהה', null);
    f('zilpa', 'Zilpa', 'זלפה', null);

    m('ruben', 'Ruben', 'ראובן', 'jacob', { mother: 'lea' });
    m('hanokh_ruben', '’Hanokh', 'חנוך', 'ruben');
    m('palou', 'Palou', 'פלוא', 'ruben');
    m('hetsron_ruben', '’Hetsron', 'חצרון', 'ruben');
    m('carmi', 'Carmi', 'כרמי', 'ruben');
    m('simeon', 'Siméon', 'שמעון', 'jacob', { mother: 'lea' });
    m('yemouel', 'Yémouel', 'ימואל', 'simeon');
    m('yamin', 'Yamin', 'ימין', 'simeon');
    m('ohad', 'Ohad', 'אהד', 'simeon');
    m('yakhin', 'Yakhin', 'יכין', 'simeon');
    m('tsohar', 'Tso’har', 'צחר', 'simeon');
    m('saul', 'Saül (fils de la Cananéenne)', 'שאול בן הכנענית', 'simeon');
    m('levi', 'Lévi', 'לוי', 'jacob', { mother: 'lea' });
    m('guerchon', 'Guerchon', 'גרשון', 'levi');
    m('kehat', 'Kéhat', 'קהת', 'levi');
    m('amram', 'Amram', 'עמרם', 'kehat', { unions: [['yokheved', 'mariage']] });
    f('miriam', 'Miriam', 'מרים', 'amram', { mother: 'yokheved' });
    m('aaron', 'Aaron', 'אהרן', 'amram', { mother: 'yokheved', unions: [['elicheva', 'mariage']] });
    m('nadav', 'Nadav', 'נדב', 'aaron', { mother: 'elicheva' });
    m('avihou', 'Avihou', 'אביהוא', 'aaron', { mother: 'elicheva' });
    m('elazar', 'Elazar', 'אלעזר', 'aaron', { mother: 'elicheva' });
    m('pinhas', 'Pin’has', 'פינחס', 'elazar');
    // La lignée sacerdotale d'Éléazar à Esdras le Scribe (1 Chroniques 5:30-40 ; Esdras 7:1-5). Le Azaria fils de Meraïot et le Azaria fils de Hilkiah ont des identifiants distincts.
    m('abishua', 'Abishoua', 'אבישוע', 'pinhas');
    m('bukki', 'Bukki', 'בוקי', 'abishua');
    m('uzzi', 'Ouzi', 'עזי', 'bukki');
    m('zerahiah', 'Zeraḥia', 'זרחיה', 'uzzi');
    m('meraioth', 'Meraïot', 'מריות', 'zerahiah');
    m('azariah_mer', 'Azaria', 'עזריה', 'meraioth');
    m('amariah', 'Amaria', 'עמריה', 'azariah_mer');
    m('ahitub', 'Ahitoub', 'אחיטוב', 'amariah');
    m('tsadok', 'Tsadok', 'צדוק', 'ahitub');
    m('shallum_tsadok', 'Shallum', 'שלום', 'tsadok');
    m('hilkiah', 'Hilkiah', 'חלקיה', 'shallum_tsadok');
    m('azariah_hilkiah', 'Azaria', 'עזריה', 'hilkiah');
    m('seraiah', 'Seraya', 'שריה', 'azariah_hilkiah');
    m('ezra', 'Esdras (le scribe)', 'עזרא', 'seraiah');
    m('itamar', 'Itamar', 'איתמר', 'aaron', { mother: 'elicheva' });
    m('moise', 'Moïse', 'משה', 'amram', { mother: 'yokheved', unions: [['tsippora', 'mariage']] });
    m('guerchom', 'Guerchom', 'גרשם', 'moise', { mother: 'tsippora' });
    m('eliezer', 'Eliézer', 'אליעזר', 'moise', { mother: 'tsippora' });
    m('itshar', 'Itshar', 'יצהר', 'kehat');
    m('korah_levi', 'Kora’h', 'קרח', 'itshar');
    m('hevron', '’Hévron', 'חברון', 'kehat');
    m('ouziel', 'Ouziel', 'עזיאל', 'kehat');
    m('eltsafan', 'Eltsafan', 'אלצפן', 'ouziel');
    m('michael', 'Michaël', 'מישאל', 'ouziel');
    m('merari', 'Mérari', 'מררי', 'levi');
    f('yokheved', 'Yokhéved', 'יוכבד', 'levi');
    m('juda', 'Juda', 'יהודה', 'jacob', { mother: 'lea', unions: [['tamar', 'mariage']] });
    f('tamar', 'Tamar', 'תמר', null);
    m('er', 'Er', 'ער', 'juda', { ex: true });
    m('onan', 'Onan', 'אונן', 'juda', { ex: true });
    m('chela', 'Chéla', 'שלה', 'juda');
    m('perets', 'Pérets', 'פרץ', 'juda', { mother: 'tamar' });
    m('hetsron_perets', '’Hetsron (Yefouné)', 'חצרון (יפנה)', 'perets');
    m('belier', 'Bélier', 'רם', 'hetsron_perets');
    m('aminadav', 'Aminadav', 'עמינדב', 'belier');
    m('nahchon', 'Na’hchon', 'נחשון', 'aminadav');
    // La lignée de David (Ruth 4:18-22 ; 1 Chroniques 2:5-15 ; 2 Samuel 3 et 5 ; 1 Chroniques 3 et 14).
    m('salmon', 'Salmon', 'שלמון', 'nahchon', { unions: [['rahab', 'mariage']] });
    f('rahab', 'Rahab', 'רחב', null);
    m('boaz', 'Boaz', 'בועז', 'salmon', { mother: 'rahab', unions: [['ruth', 'mariage']] });
    f('ruth', 'Ruth', 'רות', null);
    m('obed', 'Obed', 'עובד', 'boaz', { mother: 'ruth' });
    m('jesse', 'Jessé', 'ישי', 'obed');
    // Les fils de Jessé, dans l'ordre : David est le septième.
    m('eliab', 'Eliab', 'אליאב', 'jesse');
    m('abinadab', 'Abinadab', 'אבינדב', 'jesse');
    m('shamma', 'Shamma', 'שמא', 'jesse');
    m('netanel', 'Netanel', 'נתנאל', 'jesse');
    m('raddai', 'Raddaï', 'רדי', 'jesse');
    m('otsem', 'Otsem', 'עצם', 'jesse');
    m('david', 'David', 'דוד', 'jesse', { unions: [
        ['achinoam', 'mariage'], ['abigail_carmel', 'mariage'], ['maaca', 'mariage'], ['haggith', 'mariage'],
        ['abital', 'mariage'], ['eglah', 'mariage'], ['bathsheba', 'mariage']
    ] });
    // Les sœurs de David : Tserouya (mère de Joab, Abishaï et Asaël) et Abigaïl (mère d'Amasa).
    f('tserouya', 'Tserouya', 'צרויה', 'jesse');
    f('abigail_soeur', 'Abigaïl', 'אביגיל', 'jesse');
    m('joab', 'Joab', 'יואב', 'tserouya');
    m('abishai', 'Abishaï', 'אבישי', 'tserouya');
    m('asahel', 'Asaël', 'עשהאל', 'tserouya');
    m('amasa', 'Amasa', 'עמשא', 'abigail_soeur');
    // Les épouses de David.
    f('achinoam', 'Achinoam', 'אחינועם', null);
    f('abigail_carmel', 'Abigaïl (de Carmel)', 'אביגיל', null);
    f('maaca', 'Maaca', 'מעכה', null);
    f('haggith', 'Haggith', 'חגית', null);
    f('abital', 'Abital', 'אבית', null);
    f('eglah', 'Égla', 'עגלה', null);
    f('bathsheba', 'Bath-Schéba', 'בת שבע', null);
    // Les fils nés à Hébron.
    m('amnon', 'Amnon', 'אמנון', 'david', { mother: 'achinoam' });
    m('daniel_kileab', 'Daniel (Kiléab)', 'דניאל', 'david', { mother: 'abigail_carmel' });
    m('absalom', 'Absalom', 'אבשלום', 'david', { mother: 'maaca' });
    m('adonija', 'Adonija', 'אדניה', 'david', { mother: 'haggith' });
    m('shephatia', 'Schephatia', 'שפטיה', 'david', { mother: 'abital' });
    m('ithream', 'Jithream', 'יתרעם', 'david', { mother: 'eglah' });
    // Les fils nés à Jérusalem, dont quatre de Bath-Schéba.
    m('shimea', 'Schimea', 'שמעא', 'david', { mother: 'bathsheba' });
    m('shobab', 'Schobab', 'שובב', 'david', { mother: 'bathsheba' });
    m('nathan_david', 'Nathan', 'נתן', 'david', { mother: 'bathsheba' });
    m('salomon', 'Salomon', 'שלמה', 'david', { mother: 'bathsheba', unions: [['naama_ammonite', 'mariage']] });
    // La descendance de Salomon : Roboam (de Naama l'Ammonite), puis la lignée royale de Juda, puis les descendants après l'exil (1 Chroniques 3).
    // Salomon eut aussi beaucoup d'autres femmes et de fils (1 Rois 11:3), non nommés dans ces généalogies : seuls les noms donnés sont figurés.
    f('naama_ammonite', 'Naama l’Ammonite', 'נעמה', null);
    m('rehoboam', 'Roboam', 'רחבעם', 'salomon', { mother: 'naama_ammonite' });
    m('abijam', 'Abija', 'אביה', 'rehoboam');
    m('asa_roi', 'Asa', 'אסא', 'abijam');
    m('josaphat', 'Josaphat', 'יהושפט', 'asa_roi');
    m('joram_roi', 'Joram', 'יהורם', 'josaphat');
    m('achazia', 'Achazia', 'אחזיה', 'joram_roi');
    m('joas', 'Joas', 'יואש', 'achazia');
    m('amatsia', 'Amatsia', 'אמציה', 'joas');
    m('azaria', 'Azaria', 'עזריה', 'amatsia');
    m('jotham_roi', 'Jotham', 'יותם', 'azaria');
    m('achaz', 'Achaz', 'אחז', 'jotham_roi');
    m('ezechias', 'Ézéchias', 'יחזקיהו', 'achaz');
    m('manasse_roi', 'Manassé', 'מנשה', 'ezechias');
    m('amon_roi', 'Amon', 'אמון', 'manasse_roi');
    m('josias', 'Josias', 'יאשיהו', 'amon_roi');
    m('johanan_josias', 'Jochanan', 'יוחנן', 'josias');
    m('jehoiakim', 'Jojakim', 'יהויקים', 'josias');
    m('zedekiah', 'Sédécias', 'צדקיהו', 'josias');
    m('shallum_josias', 'Schallum', 'שלום', 'josias');
    m('jeconiah', 'Jéconias', 'יכניהו', 'jehoiakim');
    m('shealtiel', 'Schealthiel', 'שאלתיאל', 'jeconiah');
    m('pedaiah', 'Pedaja', 'פדיה', 'jeconiah');
    m('zerubbabel', 'Zorobabel', 'זרובבל', 'pedaiah');
    m('meshullam', 'Meschullam', 'משלם', 'zerubbabel');
    m('hanania_zerub', 'Hanania', 'חנניה', 'zerubbabel');
    f('shelomith', 'Shelomith', 'שלומית', 'zerubbabel');
    m('jibhar', 'Jibhar', 'יבחר', 'david');
    m('elishua', 'Élischoua', 'אלישוע', 'david');
    m('eliphelet_1', 'Éliphéleth', 'אליפלט', 'david');
    m('nogah', 'Noga', 'נוגה', 'david');
    m('nepheg', 'Népheg', 'נפג', 'david');
    m('japhia', 'Japhia', 'יפיע', 'david');
    m('elishama_david', 'Élischama', 'אלישמע', 'david');
    m('eliada', 'Éliada', 'אליעדע', 'david');
    m('eliphelet_2', 'Éliphéleth', 'אליפלט', 'david');
    f('tamar_david', 'Tamar', 'תמר', 'david', { mother: 'maaca' });
    f('elicheva', 'Elichéva', 'אלישבע', 'aminadav');
    m('calev', 'Calev', 'כלב', 'hetsron_perets', { unions: [['miriam', 'mariage']] });
    m('hour', '’Hour', 'חור', 'calev', { mother: 'miriam' });
    m('ouri', 'Ouri', 'אורי', 'hour');
    m('betsalel', 'Bétsalel', 'בצלאל', 'ouri');
    m('hamoul', '’Hamoul', 'חמול', 'perets');
    m('zerah_juda', 'Zéra’h', 'זרח', 'juda', { mother: 'tamar' });
    m('dan', 'Dan', 'דן', 'jacob', { mother: 'bilha' });
    m('houchim', '’Houchim', 'חשים', 'dan');
    // Sanson (Juges 13) : la Bible ne donne pas les ancêtres de Manoah. Il est rattaché à Dan par un lien en pointillés, comme Élon ou Jéthro.
    // Sa mère n'est pas nommée : elle n'a pas de carte. Sanson n'a pas de descendance dans le texte.
    m('manoah', 'Manoah', 'מנוח', 'dan', { far: true });
    m('samson', 'Sanson', 'שמשון', 'manoah');
    m('naphtali', 'Naphtali', 'נפתלי', 'jacob', { mother: 'bilha' });
    m('yahtseel', 'Ya’htséel', 'יחצאל', 'naphtali');
    m('gouni', 'Gouni', 'גוני', 'naphtali');
    m('yetser', 'Yétser', 'יצר', 'naphtali');
    m('chilem', 'Chilem', 'שלם', 'naphtali');
    m('gad', 'Gad', 'גד', 'jacob', { mother: 'zilpa' });
    m('tsifion', 'Tsifion', 'צפיון', 'gad');
    m('hagui', '’Hagui', 'חגי', 'gad');
    m('chouni', 'Chouni', 'שוני', 'gad');
    m('etsbon', 'Etsbon', 'אצבון', 'gad');
    m('eri', 'Eri', 'ערי', 'gad');
    m('arodi', 'Arodi', 'ארודי', 'gad');
    m('areli', 'Aréli', 'אראלי', 'gad');
    m('acher', 'Acher', 'אשר', 'jacob', { mother: 'zilpa' });
    m('yimna', 'Yimna', 'ימנה', 'acher');
    m('yichva', 'Yichva', 'ישוה', 'acher');
    m('yichvi', 'Yichvi', 'ישוי', 'acher');
    m('beria', 'Béria', 'בריעה', 'acher');
    m('hever', '’Héver', 'חבר', 'beria');
    m('malkiel', 'Malkiel', 'מלכיאל', 'beria');
    f('serah', 'Séra’h', 'שרח', 'acher');
    m('issakhar', 'Issakhar', 'יששכר', 'jacob', { mother: 'lea' });
    m('tola', 'Tola', 'תולע', 'issakhar');
    m('pouva', 'Pouva', 'פוה', 'issakhar');
    m('yov', 'Yov', 'יוב', 'issakhar');
    m('chimron', 'Chimron', 'שמרון', 'issakhar');
    m('zebulon', 'Zébulon', 'זבולן', 'jacob', { mother: 'lea' });
    m('sered', 'Séred', 'סרד', 'zebulon');
    m('elon_zebulon', 'Elon', 'אלון', 'zebulon');
    m('yahleel', 'Ya’hléel', 'יחלאל', 'zebulon');
    f('dina', 'Dina', 'דינה', 'jacob', { mother: 'lea' });
    m('joseph', 'Joseph', 'יוסף', 'jacob', { mother: 'rachel', unions: [['asenath', 'mariage']] });
    m('manasse', 'Manassé', 'מנשה', 'joseph', { mother: 'asenath' });
    m('ephraim', 'Ephraïm', 'אפרים', 'joseph', { mother: 'asenath' });
    // La lignée d'Éphraïm jusqu'à Josué (1 Chroniques 7:20-27). Béria, fils d'Éphraïm, n'est pas le Béria fils d'Acher, d'où son identifiant.
    m('shuthelah_eph', 'Schutélach', 'שותלח', 'ephraim');
    m('bered_eph', 'Béred', 'ברד', 'shuthelah_eph');
    m('tahath_eph', 'Thachath', 'תחת', 'bered_eph');
    m('eleadah_eph', 'Éleada', 'אלעדה', 'tahath_eph');
    m('tahath2_eph', 'Thachath', 'תחת', 'eleadah_eph');
    m('zabad_eph', 'Zabad', 'זבד', 'tahath2_eph');
    m('shuthelah2_eph', 'Schutélach', 'שותלח', 'zabad_eph');
    m('ezer_eph', 'Ézer', 'עזר', 'ephraim');
    m('elead_eph', 'Élead', 'אלעד', 'ephraim');
    m('beria_ephraim', 'Béria', 'בריעה', 'ephraim');
    m('rephah', 'Réphach', 'רפח', 'beria_ephraim');
    m('resheph', 'Réscheph', 'רשף', 'rephah');
    m('telah', 'Thélach', 'תלח', 'resheph');
    m('tahan', 'Thachan', 'תחן', 'telah');
    m('ladan', 'Laedan', 'לעדן', 'tahan');
    m('ammihud', 'Ammihud', 'עמיהוד', 'ladan');
    m('elishama', 'Élischama', 'אלישמע', 'ammihud');
    m('nun', 'Noun', 'נון', 'elishama');
    m('josue', 'Josué', 'יהושע', 'nun');
    m('benjamin', 'Benjamin', 'בנימין', 'jacob', { mother: 'rachel' });
    m('bela', 'Béla', 'בלע', 'benjamin');
    m('bekher', 'Békher', 'בכר', 'benjamin');
    m('achbel', 'Achbel', 'אשבל', 'benjamin');
    m('guera', 'Guéra', 'גרא', 'benjamin');
    m('naaman', 'Naaman', 'נעמן', 'benjamin');
    m('ehi', 'E’hi', 'אחי', 'benjamin');
    m('roch', 'Roch', 'ראש', 'benjamin');
    m('moupim', 'Moupim', 'מפים', 'benjamin');
    m('houpim', '’Houpim', 'חפים', 'benjamin');
    m('ard', 'Ard', 'ארד', 'benjamin');

    // === Suite : toute la Bible jusqu'à Jésus ===
    // Une personne dont la Bible ne donne pas l'ascendance est rattachée à sa tribu ou à son peuple par un lien en pointillés (far).

    // Asenath, épouse de Joseph (Genèse 41:45).
    f('asenath', 'Asenath', 'אסנת', null);

    // Éli, grand-prêtre de Silo, de la lignée d'Ithamar (1 Chroniques 24:3), et ses fils (1 Samuel 1-4).
    m('eli', 'Éli', 'עלי', 'itamar');
    m('hophni', 'Hophni', 'חפני', 'eli');
    m('phinees_eli', 'Phinées (fils d’Éli)', 'פינחס', 'eli');
    m('ichabod', 'Ichabod', 'איכבוד', 'phinees_eli');

    // Gédéon et sa lignée (Juges 6-9) : Manassé, Makhir, Galaad, Abiézer, Yoash.
    m('machir', 'Makhir', 'מכיר', 'manasse');
    m('gilead', 'Galaad', 'גלעד', 'machir');
    m('abiezer', 'Abiézer', 'אביעזר', 'gilead');
    m('yoash_gideon', 'Yoash', 'יואש', 'abiezer');
    m('gideon', 'Gédéon', 'גדעון', 'yoash_gideon');
    m('abimelech_gideon', 'Abimélec (fils de Gédéon)', 'אבימלך', 'gideon');
    m('yotham_gideon', 'Yotham (fils de Gédéon)', 'יותם', 'gideon');
    // Jephté, fils de Galaad (Juges 11).
    m('jephte', 'Jephté', 'יפתח', 'gilead');

    // Othniel, neveu de Caleb (Juges 3:9 ; 1 Chroniques 4:13-15).
    m('kenaz_caleb', 'Kénaz', 'קנז', 'calev');
    m('othniel', 'Othniel', 'עתניאל', 'kenaz_caleb');
    m('seraiah_kenaz', 'Seraya (fils de Kénaz)', 'שריה', 'kenaz_caleb');

    // Ehoud, de Benjamin, fils de Guéra (Juges 3:15).
    m('ehud', 'Ehoud', 'אהוד', 'guera');

    // Déborah et Lapidot, d'Éphraïm (Juges 4:5) ; Barak de Nephtali (Juges 4:6).
    m('lapidot', 'Lapidot', 'לפידות', 'ephraim', { far: true, unions: [['deborah', 'mariage']] });
    f('deborah', 'Déborah', 'דבורה', null);
    m('barak', 'Barak', 'ברק', 'naphtali', { far: true });

    // Héber le Kénite et Jaël (Juges 4:17), Yabin roi de Hatsor et Sisera son chef d'armée (Juges 4).
    m('heber_kenite', 'Héber le Kénite', 'חבר הקיני', 'midian', { far: true, unions: [['jael', 'mariage']] });
    f('jael', 'Jaël', 'יעל', null);
    m('jabin', 'Yabin', 'יבין', 'canaan', { far: true });
    m('sisera', 'Sisera', 'סיסרא', 'jabin');

    // --- Requêtes sur l'arbre -----------------------------------------------------------------------
    var CHILDREN = {};
    PEOPLE.forEach(function (p) {
        if (p.father) (CHILDREN[p.father] = CHILDREN[p.father] || []).push(p.id);
    });

    function childrenOf(id) {
        return CHILDREN[id] || [];
    }

    // Les ancêtres d'une personne, du père à Adam.
    function ancestorsOf(id) {
        var out = [];
        var p = BY[id];
        while (p && p.father) {
            out.push(p.father);
            p = BY[p.father];
        }
        return out;
    }

    // Combien de personnes sous `id` (lui exclu).
    function descendantsCount(id) {
        var n = 0;
        childrenOf(id).forEach(function (c) { n += 1 + descendantsCount(c); });
        return n;
    }

    // Toutes les personnes qui ont des enfants (pour « tout replier »).
    function parentsIds() {
        return PEOPLE.filter(function (p) { return childrenOf(p.id).length > 0; }).map(function (p) { return p.id; });
    }

    // --- La mise en page : un arbre horizontal, la racine à gauche ---------------------------------------
    // `collapsed` : { id: true } des personnes dont on cache les enfants. `heightOf(id)` : la hauteur de la carte. `opts` : { colStep, gap }.
    // Renvoie { nodes: { id: { x, cy, top, h, depth } }, edges: [{ from, to, far }], width, height }. Une feuille occupe sa hauteur ; un
    // parent occupe au moins sa hauteur et se place au milieu de ses premier et dernier enfants.
    function layout(collapsed, heightOf, opts) {
        var o = opts || {};
        var colStep = o.colStep || 166;
        var cardWidth = o.cardWidth || 132;
        var gap = o.gap === undefined ? 10 : o.gap;
        var hidden = collapsed || {};
        var memo = {};
        var nodes = {};
        var edges = [];
        var maxDepth = 0;

        function kidsOf(id) { return hidden[id] ? [] : childrenOf(id); }

        function extent(id) {
            if (memo[id] !== undefined) return memo[id];
            var kids = kidsOf(id);
            var own = heightOf(id);
            if (!kids.length) { memo[id] = own; return own; }
            var sum = 0;
            kids.forEach(function (k) { sum += extent(k); });
            sum += gap * (kids.length - 1);
            memo[id] = Math.max(own, sum);
            return memo[id];
        }

        function place(id, depth, top) {
            var ext = extent(id);
            var h = heightOf(id);
            var kids = kidsOf(id);
            var cy;
            if (!kids.length) {
                cy = top + ext / 2;
            } else {
                var sum = 0;
                kids.forEach(function (k) { sum += extent(k); });
                sum += gap * (kids.length - 1);
                var cursor = top + (ext - sum) / 2;
                var centers = [];
                kids.forEach(function (k) {
                    centers.push(place(k, depth + 1, cursor));
                    cursor += extent(k) + gap;
                });
                cy = (centers[0] + centers[centers.length - 1]) / 2;
                cy = Math.min(Math.max(cy, top + h / 2), top + ext - h / 2);
                kids.forEach(function (k) { edges.push({ from: id, to: k, far: !!BY[k].far }); });
            }
            nodes[id] = { x: depth * colStep, cy: cy, top: cy - h / 2, h: h, depth: depth };
            if (depth > maxDepth) maxDepth = depth;
            return cy;
        }

        var rootId = PEOPLE[0].id;
        place(rootId, 0, 0);
        return { nodes: nodes, edges: edges, width: maxDepth * colStep + cardWidth, height: extent(rootId) };
    }

    // --- La recherche -----------------------------------------------------------------------------
    function normalize(text) {
        return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[-/()]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Les personnes dont le nom (français ou hébreu) contient la saisie, les noms qui commencent par elle d'abord.
    function search(query, limit) {
        var q = normalize(query);
        if (!q) return [];
        var starts = [], contains = [];
        PEOPLE.forEach(function (p) {
            var fr = normalize(p.fr), he = normalize(p.he);
            if (fr.indexOf(q) === 0 || he.indexOf(q) === 0) starts.push(p);
            else if (fr.indexOf(q) !== -1 || he.indexOf(q) !== -1) contains.push(p);
        });
        return starts.concat(contains).slice(0, limit || 8);
    }

    return {
        PEOPLE: PEOPLE, byId: function (id) { return BY[id] || null; }, childrenOf: childrenOf, ancestorsOf: ancestorsOf,
        descendantsCount: descendantsCount, parentsIds: parentsIds, layout: layout, normalize: normalize, search: search
    };
}));
