# Citations : le recueil de l'Atelier

> Règles d'écriture et d'ajout. Le README n'en garde que l'essentiel (voir « L'Atelier »).

L'outil **Citations** de l'Atelier est un recueil de phrases qui ont marqué l'histoire. Il n'a pas de nombre fixé : le fichier
grossit par lots. Chaque citation dit d'où elle vient, dans quelles circonstances elle a été prononcée ou écrite, et **si on peut
vraiment la prêter à son auteur**. Le contenu est **à relire par un enseignant**.

## Où sont les fichiers

| Fichier | Rôle |
|---|---|
| `assets/citations/index.json` | la liste des lots, dans l'ordre : `{ "lots": ["01.json", "02.json"] }` |
| `assets/citations/NN.json` | un lot : `{ "citations": [ … ] }`, environ 20 citations |
| `js/citationsCore.js` | les règles pures : recherche, filtres, tri, validation |
| `js/app/citations.js` | les écrans (liste, fiche) et les liens vers les cartes de l'app |
| `tests/citationsCore.test.js` | les règles, et l'intégrité des données |

Pour ajouter des citations : écrire un nouveau lot `NN.json`, l'ajouter à `index.json` **et** à la liste `APP_SHELL_FILES` de
`sw.js` (avec un numéro de `CACHE_VERSION` plus élevé), puis lancer `npm test`. Le test refuse un lot qui n'est pas dans l'index, un
identifiant en double, une entrée mal formée ou un lien vers une carte qui n'existe pas.

## Une entrée

```json
{
  "id": "cit_descartes_cogito",
  "texte": "Je pense, donc je suis.",
  "auteur": "René Descartes",
  "classement": "Descartes",
  "annee": 1637,
  "theme": "savoir",
  "fiabilite": "attestee",
  "contexte": "Dans la quatrième partie du Discours, …",
  "source": { "oeuvre": "Discours de la méthode", "ref": "4e partie" },
  "repere": true,
  "naissance": "pan_fr_descartes"
}
```

| Champ | Obligatoire | Sens |
|---|---|---|
| `id` | oui | `cit_` puis minuscules, chiffres et `_`. **Stable** : il servira aux favoris et aux jeux. Jamais un numéro d'ordre. |
| `texte` | oui | la phrase **en français**, sans guillemets (l'écran les ajoute) |
| `original`, `langue` | non | la version dans la langue d'origine, quand `texte` est une traduction ; `langue` est alors obligatoire |
| `auteur` | oui | le nom tel qu'on l'écrit ; pour une phrase apocryphe, le nom de celui à qui on la prête |
| `classement` | non | le nom sous lequel ranger l'auteur dans le tri « Par auteur » (Gaulle pour de Gaulle) ; à défaut, `auteur` |
| `annee` | oui | entier signé (−49 = 49 av. J.-C.), pas d'an 0 |
| `vers` | non | `true` quand l'année est approchée |
| `anneeNote` | non | ce que l'année désigne quand ce n'est pas la parole elle-même (« première trace connue ») |
| `theme` | oui | `liberte`, `pouvoir`, `guerre`, `savoir` ou `humain` (voir `THEMES`) |
| `fiabilite` | oui | `attestee`, `attribuee` ou `apocryphe` (voir ci-dessous) |
| `contexte` | oui | deux ou trois phrases : les circonstances, ce que la phrase voulait dire |
| `source` | oui | `{ "oeuvre": …, "ref": … }` : l'œuvre, le discours ou le texte, et l'endroit précis (livre, chapitre, date) |
| `note` | si non attestée | pourquoi le statut n'est pas « attestée » ; facultative sinon |
| `repere` | non | `true` pour les citations les plus célèbres (filtre « Incontournables ») |
| `naissance` | non | l'identifiant de la carte « Naissance de… » de l'auteur dans les panthéons (`pan_fr_descartes`) |
| `biographie` | non | l'identifiant d'un thème de biographie (`bio_…`), à défaut de celui que porte la carte de naissance |

## Le statut de fiabilité

C'est le point le plus important : beaucoup de phrases célèbres ne sont pas de ceux à qui on les prête.

- **Attestée** : une source précise (œuvre, discours daté, journal) rapporte la phrase, et on peut dire où. Une traduction reste
  attestée, tant que l'original l'est.
- **Attribuée** : la tradition la prête à son auteur, mais sans preuve, ou rapportée longtemps après lui (Archimède par Pappus,
  près de six siècles plus tard), ou résumée d'un passage plus long (« Je sais que je ne sais rien »). La `note` dit pourquoi.
- **Apocryphe** : l'auteur supposé ne l'a pas dite. On la garde **exprès**, avec sa note : « Elle n'a jamais dit cela » est plus
  instructif que l'oubli. La `note` donne la vraie origine et la première trace connue.

## Règles d'écriture

1. **Pas de citation sans source vérifiable.** Si l'on ne peut pas dire d'où elle vient, elle n'entre pas, même célèbre. Mieux vaut
   en avoir moins que d'en avoir de fausses.
2. **Citer la source la plus ancienne** que l'on connaît, pas le livre de citations qui la reprend.
3. **Une traduction** garde le sens et le registre ; on donne l'original quand il est court, et on dit sa langue.
4. **Le contexte explique, il ne juge pas** : les circonstances, puis ce que la phrase a produit ou signifie.
5. **Varier** : les époques, les régions du monde, les voix (les femmes, les peuples colonisés, les vaincus) ; éviter que le recueil
   ne devienne un florilège d'hommes européens.
6. **Typographie** : espace insécable (U+00A0) à l'intérieur des guillemets français « comme ceci », avant `:`, `;`, `!` et `?`. Le test
   refuse un guillemet suivi d'une espace ordinaire.

## Retrouver l'identifiant « Naissance de… » d'un auteur

Les cartes des panthéons ont un identifiant `pan_<pays>_<nom>` (voir `docs/personnages-illustres.md`). Pour le retrouver :

```bash
node -e "
const d = require('./data/fr.json');
(function w(n){ (n.themes||[]).forEach(t => (t.events||[]).forEach(e => /Descartes/.test(e.titre) && console.log(e.id, e.titre, e.biographie || '')));
  (n.subcategories||[]).forEach(w); })({ subcategories: d.categories });"
```

Tous les auteurs n'ont pas de carte : Marie-Antoinette, Jésus, Bouddha n'en ont pas, et la citation s'affiche alors sans bouton, ce qui
est normal. Le test vérifie que chaque `naissance` existe et que c'est bien une carte « Naissance de… ».

## Idées pour la suite

Favoris de citations, jeu « Qui a dit ça ? » (les données sont prêtes : un auteur, une phrase, un statut), « citation du jour » à l'accueil.
