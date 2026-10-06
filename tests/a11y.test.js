// L'accès au clavier : ce qui se vérifie sans navigateur.
//
// Deux familles, pour la même raison que tests/simultaneity.test.js et
// tests/gameModes.test.js :
//
//  - la logique de décision de js/a11y.js (quelle touche active quoi, où va le
//    focus piégé dans une modale, quelle modale est « au-dessus »), écrite en
//    fonctions pures précisément pour qu'`npm test` puisse la vérifier ;
//  - des gardes sur les fichiers statiques (index.html, css/style.css, packs
//    de langue) qui attrapent une régression avant même d'ouvrir un navigateur.
//
// Ce qui exige un vrai navigateur — le parcours Tab/Entrée, le piège à focus
// réel, le détecteur de zones cliquables — vit dans e2e/clavier.spec.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const A = require('../js/a11y.js');

const racine = p => path.join(__dirname, '..', p);
const lire = p => fs.readFileSync(racine(p), 'utf8');

// Un événement clavier minimal, comme A11y.init le décrit à activationFor.
function touche(key, role, extra = {}) {
    return Object.assign({
        key, type: 'keydown', repeat: false, defaultPrevented: false,
        ctrlKey: false, metaKey: false, altKey: false,
        target: { tagName: 'DIV', role, isContentEditable: false }
    }, extra);
}

// --- activationFor : quelle touche active quoi ---------------------------

test('Entrée active un bouton personnalisé, au keydown', () => {
    assert.equal(A.activationFor(touche('Enter', 'button')), 'click');
});

test('Entrée ne bascule PAS une case à cocher (convention ARIA : c’est l’Espace)', () => {
    assert.equal(A.activationFor(touche('Enter', 'checkbox')), null);
    assert.equal(A.activationFor(touche('Enter', 'switch')), null);
});

test('l’Espace se joue en deux temps : keydown neutralisé, activation au keyup', () => {
    // Sans le premier temps la page défile ; sans le second on activerait
    // avant que la touche soit relâchée, contrairement à un vrai bouton.
    assert.equal(A.activationFor(touche(' ', 'button', { type: 'keydown' })), 'prevent');
    assert.equal(A.activationFor(touche(' ', 'button', { type: 'keyup' })), 'click');
    assert.equal(A.activationFor(touche(' ', 'checkbox', { type: 'keyup' })), 'click');
});

test('une touche Entrée maintenue ne relance pas l’action', () => {
    // Le keydown se répète tant que la touche est enfoncée : sans cette garde,
    // elle lancerait vingt parties de suite.
    assert.equal(A.activationFor(touche('Enter', 'button', { repeat: true })), null);
});

test('les éléments natifs ne sont jamais touchés (pas d’activation en double)', () => {
    ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'].forEach(tag => {
        const ev = touche('Enter', 'button', { target: { tagName: tag, role: 'button' } });
        assert.equal(A.activationFor(ev), null, `<${tag.toLowerCase()}> gère déjà le clavier`);
    });
});

test('un champ éditable n’est jamais détourné', () => {
    const ev = touche(' ', 'button', { target: { tagName: 'DIV', role: 'button', isContentEditable: true } });
    assert.equal(A.activationFor(ev), null);
});

test('un élément sans rôle n’est pas activable', () => {
    assert.equal(A.activationFor(touche('Enter', null)), null);
    assert.equal(A.activationFor(touche('Enter', 'img')), null);
});

test('les raccourcis du navigateur ne sont pas interceptés', () => {
    ['ctrlKey', 'metaKey', 'altKey'].forEach(mod => {
        assert.equal(A.activationFor(touche('Enter', 'button', { [mod]: true })), null, mod);
    });
});

test('un événement déjà traité n’est pas traité deux fois', () => {
    assert.equal(A.activationFor(touche('Enter', 'button', { defaultPrevented: true })), null);
});

test('les autres touches ne font rien', () => {
    ['a', 'Escape', 'Tab', 'ArrowDown'].forEach(k =>
        assert.equal(A.activationFor(touche(k, 'button')), null, k));
});

// --- trapMove : le piège à focus ------------------------------------------

test('le piège laisse le navigateur avancer au milieu de la modale', () => {
    assert.equal(A.trapMove(1, 5, false), null);
    assert.equal(A.trapMove(3, 5, true), null);
});

test('le piège boucle aux deux bords', () => {
    // Dernier élément + Tab → premier ; premier + Maj+Tab → dernier.
    assert.equal(A.trapMove(4, 5, false), 0);
    assert.equal(A.trapMove(0, 5, true), 4);
});

test('le piège ramène un focus qui a fui hors de la modale', () => {
    // -1 : l'élément focalisé n'est pas dans la modale (ou c'est son conteneur).
    assert.equal(A.trapMove(-1, 5, false), 0);
    assert.equal(A.trapMove(-1, 5, true), 4);
});

test('une modale sans contrôle focalisable bloque Tab plutôt que de laisser fuir', () => {
    assert.equal(A.trapMove(-1, 0, false), -1);
    assert.equal(A.trapMove(0, 0, true), -1);
});

test('une modale à un seul contrôle le garde sous Tab comme sous Maj+Tab', () => {
    assert.equal(A.trapMove(0, 1, false), 0);
    assert.equal(A.trapMove(0, 1, true), 0);
});

// --- topmostIndex : quelle modale est au-dessus ----------------------------

test('la modale du dessus est celle au z-index le plus haut, quel que soit l’ordre du DOM', () => {
    // La confirmation (105) s'ouvre par-dessus les autres (100), qu'elle les
    // précède ou les suive dans le document : l'ordre seul ne suffirait pas.
    assert.equal(A.topmostIndex([{ z: 105, order: 0 }, { z: 100, order: 1 }]), 0);
    assert.equal(A.topmostIndex([{ z: 100, order: 0 }, { z: 105, order: 1 }]), 1);
});

test('à z-index égal, la dernière dans le document gagne', () => {
    assert.equal(A.topmostIndex([{ z: 100, order: 0 }, { z: 100, order: 1 }, { z: 100, order: 2 }]), 2);
});

test('aucune modale, aucun index', () => {
    assert.equal(A.topmostIndex([]), -1);
});

// --- index.html : le viewport ----------------------------------------------

const html = lire('index.html');

test('la balise viewport n’interdit pas de zoomer', () => {
    const meta = /<meta\s+name="viewport"\s+content="([^"]*)"/.exec(html);
    assert.ok(meta, 'balise viewport introuvable');
    const contenu = meta[1];
    // Un lycéen malvoyant a besoin d'agrandir la page : c'est le critère
    // WCAG 1.4.4 que la balise précédente échouait franchement.
    assert.doesNotMatch(contenu, /user-scalable\s*=\s*(no|0)/i, 'user-scalable=no interdit le zoom');
    assert.doesNotMatch(contenu, /maximum-scale\s*=\s*1(\.0*)?\b/i, 'maximum-scale=1.0 interdit le zoom');
    assert.match(contenu, /width=device-width/);
});

// --- index.html : tout élément cliquable est atteignable ---------------------

// Petit lecteur de balises : pas de DOM sous node, et le HTML de l'app est
// assez régulier pour qu'un lecteur à expressions rationnelles suffise. Les
// commentaires et les scripts en sont retirés d'abord : ils contiennent des
// morceaux de balises qui ne sont pas du balisage.
function balises(source) {
    const propre = source
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<script[\s\S]*?<\/script>/g, '');
    const re = /<([a-zA-Z][\w-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g;
    const out = [];
    let m;
    while ((m = re.exec(propre))) {
        const attrs = {};
        const reAttr = /([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
        let a;
        while ((a = reAttr.exec(m[2]))) {
            attrs[a[1].toLowerCase()] = a[2] !== undefined ? a[2] : (a[3] !== undefined ? a[3] : (a[4] !== undefined ? a[4] : ''));
        }
        out.push({ tag: m[1].toLowerCase(), attrs });
    }
    return out;
}

const NATIFS = new Set(['button', 'select', 'textarea', 'summary', 'input']);

test('chaque élément cliquable de index.html est atteignable au clavier', () => {
    // Avant le correctif : 32 éléments statiques (l'accueil, 18 cartes de mode,
    // 11 croisillons de modale…) se cliquaient sans pouvoir se prendre au clavier.
    const clic = balises(html).filter(b => 'onclick' in b.attrs);
    const personnalises = clic.filter(b => !NATIFS.has(b.tag) && !(b.tag === 'a' && 'href' in b.attrs));

    // Garde contre un test vide : si le lecteur de balises cessait de rien
    // trouver, tout « passerait ».
    assert.ok(personnalises.length >= 25,
        `le lecteur n'a trouvé que ${personnalises.length} éléments personnalisés cliquables`);

    const fautifs = personnalises.filter(b => {
        // Le fond d'une modale ne se clique que pour la fermer : Échap fait de même.
        if ((b.attrs.class || '').split(/\s+/).includes('modal-overlay')) return false;
        return !('tabindex' in b.attrs) || !b.attrs.role;
    });
    assert.deepEqual(
        fautifs.map(b => `<${b.tag} ${b.attrs.id ? '#' + b.attrs.id : '.' + (b.attrs.class || '?').split(' ')[0]}>`),
        [],
        'ces éléments se cliquent mais n’ont pas role + tabindex'
    );
});

test('chaque croisillon de modale a un nom accessible', () => {
    // Un « × » seul ne se nomme pas : un lecteur d'écran annonçait « bouton »
    // sans dire lequel.
    const croisillons = balises(html).filter(b => (b.attrs.class || '').split(/\s+/).includes('close-btn'));
    assert.ok(croisillons.length >= 10, `seulement ${croisillons.length} croisillons trouvés`);
    croisillons.forEach(b => {
        assert.ok(b.attrs['aria-label'], 'un croisillon sans aria-label');
        assert.match(b.attrs['data-i18n-attr'] || '', /aria-label:nav\.close/,
            'son nom doit suivre la langue de l’interface');
    });
});

test('chaque modale a un .modal-content, sur lequel se pose son rôle de dialogue', () => {
    // A11y.declareModals déclare role="dialog" sur le `.modal-content` ; une
    // modale qui n'en aurait pas resterait muette pour un lecteur d'écran.
    const b = balises(html);
    const overlays = b.filter(x => (x.attrs.class || '').split(/\s+/).includes('modal-overlay')).length;
    const contenus = b.filter(x => (x.attrs.class || '').split(/\s+/).includes('modal-content')).length;
    assert.ok(overlays >= 12);
    assert.equal(contenus, overlays, 'une modale n’a pas de .modal-content');
});

test('les cartes-questions sont balisées pour recevoir le focus', () => {
    // A11y.focusQuestion cherche [data-focus-target] dans l'écran ; sans ce
    // marqueur le focus retombait sur le conteneur et Tab repartait du bouton
    // « Quitter » à chaque question.
    const marques = balises(html).filter(b => 'data-focus-target' in b.attrs);
    assert.ok(marques.length >= 6, `seulement ${marques.length} cartes-questions balisées`);
});

test('le module d’accès clavier est chargé avant app.js, et précaché hors ligne', () => {
    const scripts = [...html.matchAll(/<script src="js\/([\w.]+)"/g)].map(m => m[1]);
    assert.ok(scripts.includes('a11y.js'), 'a11y.js n’est pas chargé');
    assert.ok(scripts.indexOf('a11y.js') < scripts.indexOf('app.js'),
        'app.js appelle A11y à l’exécution : le module doit être chargé avant');
    assert.match(lire('sw.js'), /\.\/js\/a11y\.js/, 'a11y.js absent du précache hors ligne');
});

// --- css/style.css ----------------------------------------------------------

const css = lire('css/style.css');

function regle(selecteur) {
    const i = css.indexOf(selecteur + ' {');
    assert.ok(i >= 0, `règle « ${selecteur} » introuvable`);
    return css.slice(i, css.indexOf('}', i));
}

test('un champ de saisie ne descend pas sous 16 px (zoom automatique d’iOS)', () => {
    // Sous 16 px, iOS zoome dans la page à chaque focus. Cela ne se voyait pas
    // tant que maximum-scale=1.0 le masquait : le rendre aux utilisateurs
    // l'aurait réactivé en pleine saisie.
    const taille = /font-size:\s*(\d+(?:\.\d+)?)px/.exec(regle('.form-input'));
    assert.ok(taille, '.form-input sans font-size en px');
    assert.ok(Number(taille[1]) >= 16, `.form-input à ${taille[1]} px`);
});

test('un anneau de focus visible existe, par thème', () => {
    assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--focus-ring\)/);
    // Une couleur par thème : le bleu marine est invisible sur fond sombre.
    assert.match(css, /:root\s*\{\s*--focus-ring:\s*#[0-9A-Fa-f]{6}/);
    assert.match(css, /:root\[data-theme="dark"\]\s*\{\s*--focus-ring:\s*#[0-9A-Fa-f]{6}/);
});

test('le double-tap est neutralisé sans interdire le pincement', () => {
    const bloc = /a, area, button[^{]*\{([^}]*)\}/.exec(css);
    assert.ok(bloc, 'règle touch-action introuvable');
    assert.match(bloc[1], /touch-action:\s*manipulation/);
    // « none » interdirait aussi le pincement : ce serait rendre le zoom d'une
    // main pour le reprendre de l'autre.
    assert.doesNotMatch(css, /touch-action:\s*none/);
});

// --- packs de langue -----------------------------------------------------------

test('les libellés accessibles existent dans les six packs', () => {
    ['fr', 'en', 'es', 'de', 'it', 'ja'].forEach(lang => {
        const d = JSON.parse(lire(`ui/${lang}.json`));
        assert.ok(d.home && d.home.start_aria, `${lang} : home.start_aria`);
        assert.ok(d.carte && d.carte.pin_aria, `${lang} : carte.pin_aria`);
        assert.ok(d.nav && d.nav.close, `${lang} : nav.close`);
        assert.match(d.carte.pin_aria, /\{n\}/, `${lang} : pin_aria doit porter le numéro`);
        assert.match(d.carte.pin_aria, /\{country\}/, `${lang} : pin_aria doit porter le pays`);
    });
});
