// Les générateurs des cinq modes « Remise en ordre », « Blitz »,
// « Curseur », « Intrus » et « Qui est-ce ? » (js/gameModes.js).
//
// Comme pour js/simultaneity.js, toute la fabrication des questions vit dans
// un module sans DOM : elle se vérifie donc ici, et pas seulement dans un
// navigateur. Deux familles de tests, pour la même raison que là-bas :
//
//  - sur des viviers écrits à la main, où chaque règle peut être mise en
//    défaut isolément ;
//  - sur le VRAI pack français, parce que les contraintes de ces modes ont
//    été déduites de ses données — un test qui ne tournerait que sur une
//    maquette ne dirait rien du jour où le contenu bouge.

const test = require('node:test');
const assert = require('node:assert/strict');

const G = require('../js/gameModes.js');

function seededRng(seed) {
    let s = seed >>> 0;
    return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

// Vivier jouet : dates distinctes, deux axes, de quoi nourrir les quatre
// générateurs sans dépendre du contenu réel.
function viv(n, opts = {}) {
    const base = opts.base === undefined ? 1900 : opts.base;
    const pas = opts.pas || 5;
    const axes = opts.axes || ['A', 'B'];
    return Array.from({ length: n }, (_, i) => ({
        id: 'e' + i,
        date: base + i * pas,
        titre: 'Événement ' + i,
        axe: axes[i % axes.length]
    }));
}

// --- 1. REMISE EN ORDRE --------------------------------------------------

test('une manche de remise en ordre sert cinq cartes et leur solution triée', () => {
    const rounds = G.buildOrderRounds(viv(20), { rng: seededRng(1), count: 2 });
    assert.equal(rounds.length, 2);
    rounds.forEach(r => {
        assert.equal(r.cards.length, G.ORDER_CARDS);
        assert.equal(r.solution.length, G.ORDER_CARDS);
        // La solution est bien l'ordre chronologique des cartes servies.
        const parDate = r.cards.slice().sort((a, b) => a.date - b.date).map(e => e.id);
        assert.deepEqual(r.solution, parDate);
    });
});

test('les cartes sont bien mélangées, et non servies dans l’ordre des dates', () => {
    // Ce qui compte n'est pas qu'AUCUNE manche ne sorte triée — cinq cartes
    // mélangées tombent dans l'ordre une fois sur 120, et le joueur, qui ne
    // voit pas les dates, n'y verrait de toute façon rien — mais que le
    // générateur ne les serve pas systématiquement triées. Le seuil est à
    // une dizaine d'écarts-types de l'espérance (≈ 1,7 sur 200) : ce test ne
    // peut pas rougir par malchance.
    const rounds = G.buildOrderRounds(viv(1000), { rng: seededRng(4), count: 200 });
    assert.equal(rounds.length, 200);
    const triees = rounds.filter(r => r.cards.map(c => c.id).join() === r.solution.join()).length;
    assert.ok(triees < 15, `${triees} manches sur 200 servies déjà dans l'ordre`);
});

test('deux événements de la même année ne tombent jamais dans la même manche', () => {
    // « Lequel est antérieur ? » n'a pas de réponse pour deux 1789.
    const doublons = Array.from({ length: 30 }, (_, i) => ({
        id: 'd' + i, date: 1800 + (i % 6), titre: 'Doublon ' + i
    }));
    G.buildOrderRounds(doublons, { rng: seededRng(5) }).forEach(r => {
        const dates = r.cards.map(c => c.date);
        assert.equal(new Set(dates).size, dates.length);
    });
});

test('un vivier trop court ne produit aucune manche', () => {
    assert.deepEqual(G.buildOrderRounds(viv(4), { rng: seededRng(2) }), []);
});

test('le décompte d’une remise en ordre compte les rangs justes', () => {
    const solution = ['a', 'b', 'c', 'd', 'e'];
    assert.deepEqual(G.scoreOrderAttempt(solution, solution), { correct: 5, total: 5, perfect: true });
    // Deux cartes interverties : trois rangs restent bons.
    assert.deepEqual(G.scoreOrderAttempt(['a', 'c', 'b', 'd', 'e'], solution),
        { correct: 3, total: 5, perfect: false });
    // Un classement incomplet n'est jamais parfait, même sans erreur visible.
    assert.equal(G.scoreOrderAttempt(['a', 'b'], solution).perfect, false);
});

// --- 2. BLITZ VRAI / FAUX ------------------------------------------------

test('l’énoncé du blitz dit vrai exactement quand il doit', () => {
    const rng = seededRng(3);
    for (let i = 0; i < 200; i++) {
        const q = G.buildBlitzQuestion(viv(12), { rng });
        assert.ok(q, 'une question doit être produite');
        // L'énoncé est toujours « gauche antérieur à droite » : sa véracité
        // se vérifie donc directement sur les dates.
        assert.equal(q.answer, q.left.date < q.right.date,
            `« ${q.left.titre} » (${q.left.date}) avant « ${q.right.titre} » (${q.right.date})`);
    }
});

test('une série de blitz est exactement moitié vraie, moitié fausse', () => {
    // Sans cette contrainte, un joueur pressé gagnerait à répondre toujours
    // la même chose.
    const qs = G.buildBlitzQuestions(viv(30), { rng: seededRng(8), count: 40 });
    assert.equal(qs.length, 40);
    assert.equal(qs.filter(q => q.answer).length, 20);
});

test('le blitz ne repose jamais la même paire deux fois de suite', () => {
    const qs = G.buildBlitzQuestions(viv(8), { rng: seededRng(9), count: 60 });
    for (let i = 1; i < qs.length; i++) {
        assert.notEqual(qs[i].pairKey, qs[i - 1].pairKey);
    }
});

test('le blitz renonce plutôt que de comparer deux dates identiques', () => {
    const memeAnnee = [
        { id: 'x', date: 1789, titre: 'X' },
        { id: 'y', date: 1789, titre: 'Y' }
    ];
    assert.equal(G.buildBlitzQuestion(memeAnnee, { rng: seededRng(6) }), null);
});

// --- 3. LE CURSEUR -------------------------------------------------------

test('l’échelle du curseur déborde le vivier des deux côtés', () => {
    // Collés aux butées, les événements extrêmes se devineraient en poussant
    // le curseur à fond.
    const scale = G.sliderScaleFor(viv(10, { base: 1900, pas: 10 })); // 1900 → 1990
    assert.ok(scale.min < 1900, `min ${scale.min} devrait déborder sous 1900`);
    assert.ok(scale.max > 1990, `max ${scale.max} devrait déborder au-delà de 1990`);
});

test('la tolérance du curseur suit l’étendue du thème', () => {
    // Un thème de vingt ans et un thème de deux millénaires n'ont pas la
    // même idée de « presque juste ».
    const court = G.sliderScaleFor(viv(10, { base: 1918, pas: 2 }));   // 18 ans
    const long = G.sliderScaleFor(viv(10, { base: -500, pas: 250 }));  // 2250 ans
    assert.ok(court.tolerance < long.tolerance,
        `tolérance courte ${court.tolerance} devrait être sous la longue ${long.tolerance}`);
    assert.ok(court.tolerance >= 2, 'un plancher évite une tolérance de zéro année');
});

test('le barème du curseur se mesure à la tolérance, pas à l’échelle', () => {
    // Le défaut que ce test garde : rapportée à l'échelle, une réponse
    // fausse de trois siècles sur un thème de 6 600 ans gardait 96 % des
    // points.
    const rounds = G.buildSliderRounds(viv(40, { base: -4600, pas: 170 }), { rng: seededRng(7), count: 1 });
    const round = rounds[0];
    const vraie = round.event.date;

    assert.equal(G.scoreSliderGuess(vraie, round).ratio, 1);
    assert.equal(G.scoreSliderGuess(vraie, round).exact, true);

    const loin = G.scoreSliderGuess(vraie + round.tolerance * 3, round);
    assert.equal(loin.ratio, 0, 'à trois fois la tolérance, le score doit être nul');
    assert.equal(loin.within, false);

    const juste = G.scoreSliderGuess(vraie + round.tolerance, round);
    assert.equal(juste.within, true);
    assert.ok(juste.ratio > 0.6 && juste.ratio < 0.7, `à la tolérance pile : ${juste.ratio}`);
});

test('le curseur ne sert jamais un événement hors de son échelle', () => {
    const rounds = G.buildSliderRounds(viv(30), { rng: seededRng(10) });
    assert.ok(rounds.length > 0);
    rounds.forEach(r => {
        assert.ok(r.event.date >= r.min && r.event.date <= r.max,
            `${r.event.date} hors de [${r.min}, ${r.max}]`);
    });
});

// --- 4. L'INTRUS ---------------------------------------------------------

test('l’intrus « période » se détache nettement de son trio', () => {
    const q = G.buildPeriodIntrus(viv(40, { base: 1000, pas: 25 }), seededRng(11));
    assert.ok(q, 'une question de période doit être produite');
    assert.equal(q.kind, 'periode');
    assert.equal(q.options.length, G.INTRUS_OPTIONS);

    const trio = q.options.filter(o => o.id !== q.intruderId);
    const intrus = q.options.find(o => o.id === q.intruderId);
    const etalement = Math.max(...trio.map(e => e.date)) - Math.min(...trio.map(e => e.date));
    const ecart = Math.min(...trio.map(e => Math.abs(e.date - intrus.date)));
    // L'écart se mesure en multiples de l'étalement du trio, pour tenir
    // aussi bien sur un thème de vingt ans que de trois millénaires.
    assert.ok(ecart >= etalement * 3 || ecart >= 15,
        `écart ${ecart} trop faible pour un trio étalé sur ${etalement}`);
});

test('l’intrus « axe » vient bien d’un autre fil que le trio', () => {
    const q = G.buildAxisIntrus(viv(30, { axes: ['Guerre', 'Culture', 'Économie'] }), seededRng(12));
    assert.ok(q, 'une question d’axe doit être produite');
    assert.equal(q.kind, 'axe');
    const trio = q.options.filter(o => o.id !== q.intruderId);
    const intrus = q.options.find(o => o.id === q.intruderId);
    trio.forEach(e => assert.equal(e.axe, q.axis));
    assert.notEqual(intrus.axe, q.axis);
});

test('l’intrus « axe » renonce si le thème n’a qu’un seul axe', () => {
    assert.equal(G.buildAxisIntrus(viv(20, { axes: ['Unique'] }), seededRng(13)), null);
});

test('une série d’intrus alterne les deux familles et ne répète pas son intrus', () => {
    const qs = G.buildIntrusQuestions(viv(60, { axes: ['A', 'B', 'C'] }), { rng: seededRng(14), count: 8 });
    assert.ok(qs.length >= 6, `seulement ${qs.length} manches produites`);
    const familles = new Set(qs.map(q => q.kind));
    assert.equal(familles.size, 2, 'les deux familles doivent être représentées');
    const intrus = qs.map(q => q.intruderId);
    assert.equal(new Set(intrus).size, intrus.length, 'un intrus ne doit pas revenir');
});

// --- SUR LE VRAI PACK FRANÇAIS -------------------------------------------

const frData = require('../data/fr.json');

function tousLesThemes() {
    const out = [];
    (function walk(nodes) {
        nodes.forEach(n => {
            (n.themes || []).forEach(t => out.push(t));
            if (n.subcategories) walk(n.subcategories);
        });
    })(frData.categories);
    return out;
}
const THEMES = tousLesThemes();
const theme = id => THEMES.find(t => t.id === id);

test('aucune date hors échelle historique n’atteint les quatre modes', () => {
    // « Histoire de France » contient des événements préhistoriques : trois
    // d'entre eux étiraient l'échelle du Curseur de -486162 à 38186, avec une
    // tolérance de ±22601 ans. Ils restent jouables sur la frise, mais ces
    // modes-ci, qui comparent des dates, les écartent.
    const fr = theme('thm_fr');
    assert.ok(fr, 'thm_fr doit exister dans le pack');
    assert.ok(fr.events.some(e => Math.abs(e.date) >= G.HISTORICAL_YEAR_LIMIT),
        'ce test ne vaut que si le thème contient encore de telles dates');

    const scale = G.sliderScaleFor(fr.events);
    assert.ok(Math.abs(scale.min) < G.HISTORICAL_YEAR_LIMIT, `min ${scale.min} hors échelle`);
    assert.ok(Math.abs(scale.max) < G.HISTORICAL_YEAR_LIMIT, `max ${scale.max} hors échelle`);

    const rng = seededRng(21);
    G.buildOrderRounds(fr.events, { rng, count: 10 }).forEach(r => {
        r.cards.forEach(c => assert.ok(Math.abs(c.date) < G.HISTORICAL_YEAR_LIMIT));
    });
    G.buildIntrusQuestions(fr.events, { rng, count: 10 }).forEach(q => {
        q.options.forEach(o => assert.ok(Math.abs(o.date) < G.HISTORICAL_YEAR_LIMIT));
    });
});

test('les quatre modes tiennent sur des thèmes de tailles très différentes', () => {
    const rng = seededRng(22);
    ['thm_aut', 'thm_fr', 'thm_rome', 'thm_jp'].forEach(id => {
        const th = theme(id);
        if (!th) return;
        const ev = th.events;
        assert.ok(G.buildOrderRounds(ev, { rng, count: 3 }).length >= 3, `${id} : remise en ordre`);
        assert.equal(G.buildBlitzQuestions(ev, { rng, count: 20 }).length, 20, `${id} : blitz`);
        assert.equal(G.buildSliderRounds(ev, { rng, count: 10 }).length, 10, `${id} : curseur`);
        assert.ok(G.buildIntrusQuestions(ev, { rng, count: 10 }).length >= 8, `${id} : intrus`);
    });
});

test('sur tout le pack français, aucun intrus n’appartient à son propre groupe', () => {
    const rng = seededRng(23);
    const echantillon = THEMES.filter(t => (t.events || []).length >= 20).slice(0, 60);
    let posees = 0;
    echantillon.forEach(th => {
        G.buildIntrusQuestions(th.events, { rng, count: 4 }).forEach(q => {
            posees++;
            assert.equal(q.groupIds.includes(q.intruderId), false,
                `« ${th.nom} » : l'intrus figure aussi dans le groupe`);
            assert.equal(q.options.length, G.INTRUS_OPTIONS);
            assert.equal(new Set(q.options.map(o => o.id)).size, G.INTRUS_OPTIONS,
                `« ${th.nom} » : un événement apparaît deux fois dans les options`);
        });
    });
    assert.ok(posees > 100, `échantillon trop maigre : ${posees} manches`);
});


// --- 5. QUI EST-CE ? ------------------------------------------------------

const fs = require('node:fs');
const path = require('node:path');

function fig(id, nom, axe) {
    return { id, axe, date: 1800, titre: 'Naissance de ' + nom, image: { src: `assets/portraits/${id}.jpg` } };
}

// Dix figures, deux domaines, aucun nom de famille en commun.
function vivierWho() {
    return [
        fig('a1', 'Alice Martin', 'Arts'), fig('a2', 'Bruno Durand', 'Arts'), fig('a3', 'Claire Petit', 'Arts'),
        fig('a4', 'Denis Moreau', 'Arts'), fig('a5', 'Émile Laurent', 'Arts'),
        fig('s1', 'Fanny Leroy', 'Sciences'), fig('s2', 'Gilles Roux', 'Sciences'), fig('s3', 'Hélène Blanc', 'Sciences'),
        fig('s4', 'Ivan Garnier', 'Sciences'), fig('s5', 'Julie Faure', 'Sciences')
    ];
}

test('Qui est-ce ? : quatre noms distincts par portrait, dont la bonne réponse, une seule fois', () => {
    const qs = G.buildWhoQuestions(vivierWho(), { rng: seededRng(7), count: 6 });
    assert.equal(qs.length, 6);
    qs.forEach(q => {
        assert.equal(q.options.length, G.WHO_OPTIONS);
        assert.equal(new Set(q.options.map(o => o.name)).size, G.WHO_OPTIONS, 'deux options au même nom');
        assert.equal(q.options.filter(o => o.id === q.correctId).length, 1);
        assert.equal(q.options.find(o => o.id === q.correctId).name, q.name);
        assert.equal(q.name, G.whoNameOf(q.correct));
    });
    // Chaque figure ne sert qu'une fois de bonne réponse.
    assert.equal(new Set(qs.map(q => q.correctId)).size, qs.length);
});

test('Qui est-ce ? : les mauvaises réponses préfèrent le domaine de la bonne', () => {
    G.buildWhoQuestions(vivierWho(), { rng: seededRng(3), count: 10 }).forEach(q => {
        const axes = q.options.map(o => vivierWho().find(e => e.id === o.id).axe);
        assert.ok(axes.every(a => a === q.correct.axe), `${q.name} : un domaine différent parmi ${axes}`);
    });
});

test('Qui est-ce ? : jamais deux noms de famille identiques dans une même question', () => {
    const pool = vivierWho().concat([
        fig('g1', 'Jacob Grimm', 'Arts'), fig('g2', 'Wilhelm Grimm', 'Arts'),
        fig('l1', 'Louis XIV', 'Arts'), fig('l2', 'Louis XVI', 'Arts')
    ]);
    G.buildWhoQuestions(pool, { rng: seededRng(11), count: 14 }).forEach(q => {
        const familles = q.options.map(o => {
            const mots = o.name.split(' ');
            return /^(Ier|Ire|[IVX]+)$/.test(mots[mots.length - 1]) ? mots[0] : mots[mots.length - 1];
        });
        assert.equal(new Set(familles).size, familles.length, `${q.name} : ${q.options.map(o => o.name).join(' / ')}`);
    });
});

test('Qui est-ce ? : sans portrait ou sans assez de figures, pas de question', () => {
    const sansImage = vivierWho().map(e => ({ id: e.id, titre: e.titre, axe: e.axe }));
    assert.deepEqual(G.buildWhoQuestions(sansImage, { rng: seededRng(1) }), []);
    assert.deepEqual(G.buildWhoQuestions(vivierWho().slice(0, 3), { rng: seededRng(1) }), []);
    assert.deepEqual(G.buildWhoQuestions([], {}), []);
    // Deux événements au même nom ne font qu'une figure.
    const doublon = vivierWho().slice(0, 3).concat([fig('x', 'Alice Martin', 'Arts')]);
    assert.equal(G.whoCandidates(doublon).length, 3);
});

test('Qui est-ce ? : le nom se tire du titre comme dans la galerie', () => {
    assert.equal(G.whoNameOf({ titre: 'Naissance de Victor Hugo' }), 'Victor Hugo');
    assert.equal(G.whoNameOf({ titre: "Naissance d'Édith Piaf" }), 'Édith Piaf');
    assert.equal(G.whoNameOf({ titre: 'Naissance du Caravage' }), 'le Caravage');
    assert.equal(G.whoNameOf({ titre: 'Autre chose' }), 'Autre chose');
    // Même découpage que js/gallery.js, sur les 838 titres réels : deux copies d'une règle ne
    // doivent pas s'écarter sans qu'un test le dise.
    const { galleryNameOf } = require('../js/gallery.js');
    const fr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'fr.json'), 'utf8'));
    const illustres = fr.categories.find(c => c.nom === 'Personnages illustres');
    const panth = illustres.subcategories.find(s => s.nom === 'Panthéons');
    let n = 0;
    panth.themes.forEach(theme => theme.events.forEach(e => {
        assert.equal(G.whoNameOf(e), galleryNameOf(e).name, e.titre);
        n++;
    }));
    assert.equal(n, 838);
});

test('Qui est-ce ? : sur le vrai pack, chaque panthéon donne dix questions bien formées', () => {
    const fr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'fr.json'), 'utf8'));
    const illustres = fr.categories.find(c => c.nom === 'Personnages illustres');
    const panth = illustres.subcategories.find(s => s.nom === 'Panthéons');
    panth.themes.forEach(theme => {
        assert.ok(G.whoCandidates(theme.events).length >= G.WHO_MIN_PORTRAITS, theme.id);
        const qs = G.buildWhoQuestions(theme.events, { rng: seededRng(5) });
        assert.equal(qs.length, G.WHO_ROUNDS, theme.id);
        qs.forEach(q => {
            assert.equal(new Set(q.options.map(o => o.name)).size, G.WHO_OPTIONS, `${theme.id} : ${q.name}`);
            assert.ok(q.correct.image.src, `${theme.id} : ${q.name} sans portrait`);
            assert.ok(q.options.every(o => theme.events.some(e => e.id === o.id)), 'une option hors du thème');
        });
    });
});

test('Portrait du jour : même graine, même question — quel que soit l’ordre des événements', () => {
    const D = require('../js/dailyEngine.js');
    const rngDuJour = date => D.mulberry32(D.hashStringToSeed('historiaxe_portrait_' + date));
    const fr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'fr.json'), 'utf8'));
    const panth = fr.categories.find(c => c.nom === 'Personnages illustres').subcategories.find(s => s.nom === 'Panthéons');
    const tous = panth.themes.flatMap(t => t.events);

    const a = G.buildDailyWhoQuestion(tous, rngDuJour('2026-10-10'));
    const b = G.buildDailyWhoQuestion(tous, rngDuJour('2026-10-10'));
    assert.deepEqual(a.options, b.options);
    assert.equal(a.correctId, b.correctId);
    // Un autre ordre d'entrée (autre pack, autre langue) ne change pas le tirage.
    const inverse = G.buildDailyWhoQuestion(tous.slice().reverse(), rngDuJour('2026-10-10'));
    assert.equal(inverse.correctId, a.correctId);
    assert.deepEqual(inverse.options.map(o => o.id), a.options.map(o => o.id));

    // Les jours se suivent sans se ressembler : sur 60 jours, beaucoup de portraits différents.
    const ids = new Set();
    for (let j = 1; j <= 60; j++) {
        const q = G.buildDailyWhoQuestion(tous, rngDuJour(`2026-11-${String(j).padStart(2, '0')}`));
        assert.equal(q.options.length, G.WHO_OPTIONS);
        assert.equal(new Set(q.options.map(o => o.name)).size, G.WHO_OPTIONS);
        ids.add(q.correctId);
    }
    assert.ok(ids.size >= 45, `seulement ${ids.size} portraits différents en 60 jours`);
});

test('Portrait du jour : sans assez de portraits, pas de question', () => {
    const D = require('../js/dailyEngine.js');
    const rng = D.mulberry32(1);
    assert.equal(G.buildDailyWhoQuestion([], rng), null);
    assert.equal(G.buildDailyWhoQuestion(vivierWho().slice(0, 3), rng), null);
});

test('Qui est-ce ? : les mauvaises réponses sont des contemporains de la bonne', () => {
    // Douze figures du même domaine, du XIe au XXe siècle : un portrait de la Renaissance ne doit pas
    // côtoyer Ovide ou Cicéron, dont le costume suffirait à le désigner.
    const siecles = [1050, 1150, 1250, 1350, 1450, 1500, 1520, 1550, 1600, 1700, 1850, 1950, 1980, 2000];
    const pool = siecles.map((date, i) => Object.assign(fig('p' + i, `Personne${String.fromCharCode(65 + i)} Nom${String.fromCharCode(65 + i)}`, 'Arts'), { date }));
    const correct = pool.find(e => e.date === 1520);
    const proches = new Set(pool.slice().sort((a, b) => Math.abs(a.date - 1520) - Math.abs(b.date - 1520))
        .filter(e => e.id !== correct.id).slice(0, 8).map(e => e.id));
    for (let graine = 1; graine <= 30; graine++) {
        const q = G.buildWhoQuestion(pool, correct, seededRng(graine), pool);
        q.options.filter(o => o.id !== correct.id).forEach(o => {
            assert.ok(proches.has(o.id), `graine ${graine} : ${o.name} (${pool.find(e => e.id === o.id).date}) est trop loin de 1520`);
        });
    }
});

test('Qui est-ce ? : les mauvaises réponses peuvent venir de tout le thème, pas seulement de la manche', () => {
    const theme = Array.from({ length: 30 }, (_, i) => Object.assign(
        fig('t' + i, `Prénom${String.fromCharCode(65 + i)} Famille${String.fromCharCode(65 + i)}`, 'Arts'), { date: 1500 + i * 10 }));
    const manche = theme.slice(0, 5);
    const qs = G.buildWhoQuestions(manche, { rng: seededRng(2), count: 5, pool: theme });
    assert.equal(qs.length, 5);
    const horsManche = qs.flatMap(q => q.options).filter(o => !manche.some(e => e.id === o.id));
    assert.ok(horsManche.length > 0, 'aucune mauvaise réponse tirée hors de la manche');
    qs.forEach(q => assert.ok(manche.some(e => e.id === q.correctId), 'une bonne réponse hors de la manche'));
});

test('Qui est-ce ? : un portrait dont l’image écrit le nom est écarté du jeu', () => {
    const pool = vivierWho();
    pool[0].image.nomVisible = true; // Alice Martin : inscription dans l'image
    assert.equal(G.whoCandidates(pool).length, 9);
    assert.ok(!G.whoCandidates(pool).some(e => e.id === 'a1'));
    // Ni en bonne réponse, ni en mauvaise.
    G.buildWhoQuestions(pool, { rng: seededRng(4), count: 9 }).forEach(q => {
        assert.notEqual(q.correctId, 'a1');
        assert.ok(!q.options.some(o => o.id === 'a1'));
    });
    // Le tirage du jour non plus.
    for (let graine = 1; graine <= 40; graine++) {
        const q = G.buildDailyWhoQuestion(pool, seededRng(graine));
        assert.ok(!q.options.some(o => o.id === 'a1'));
    }
});

test('Qui est-ce ? : sur le vrai pack, les portraits dont l’image écrit le nom sont écartés', () => {
    const fr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'fr.json'), 'utf8'));
    const panth = fr.categories.find(c => c.nom === 'Personnages illustres').subcategories.find(s => s.nom === 'Panthéons');
    const tous = panth.themes.flatMap(t => t.events);
    const marques = tous.filter(e => e.image.nomVisible);
    assert.equal(marques.length, 19);
    // Des cas connus : l'inscription peinte, la légende gravée, la monnaie à son nom.
    ['Naissance de Pic de la Mirandole', 'Naissance de Charlemagne', 'Naissance de Johannes Kepler',
        'Naissance de Vercingétorix', 'Naissance de William Harvey', 'Naissance de Neil Armstrong'].forEach(titre => {
        const e = tous.find(x => x.titre === titre);
        assert.ok(e && e.image.nomVisible, `${titre} devrait être marqué nomVisible`);
    });
    const jouables = new Set(G.whoCandidates(tous).map(e => e.id));
    marques.forEach(e => assert.ok(!jouables.has(e.id), `${e.id} est marqué mais reste jouable`));
    assert.equal(jouables.size, tous.length - marques.length);
    // La galerie, elle, les garde : ils ont toujours leur portrait.
    marques.forEach(e => assert.ok(e.image.src));
});
