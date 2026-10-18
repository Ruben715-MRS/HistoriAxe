# Événements des thèmes « CAPES & Agrégation »

Un fichier JSON par thème (`grc.json` pour `thm_grc`, `20s.json` pour `thm_20s`…). Ces fichiers sont la source de
vérité des **événements** des 22 thèmes de la catégorie ; `python3 scripts/build_capes.py` les écrit dans
`data/fr.json`. Le sommaire (`carteMentale`), la difficulté et l'identifiant du thème ne sont pas touchés, à une
exception près : le rattachement d'un repère chronologique à son événement (`reperes`, ci-dessous).

Après une modification : `python3 scripts/build_capes.py`, puis `npm run build:pack`, puis `npm test`. Si la
frise change de taille, il faut aussi mettre à jour `eventCount` dans `js/i18n.js` et monter les versions de cache
(`I18N_DATA_CACHE`, `DATA_CACHE` et `CACHE_VERSION` dans `sw.js`).

## Format

```json
{
  "theme": "thm_grc",
  "essentiel": ["grc1", "grc7"],
  "reperes": [{ "texte": "Début du texte du repère", "eventId": "grc12" }],
  "axes": ["Axe A", "Axe B"],
  "events": [
    { "id": "grc99", "axe": 2, "date": -480, "titre": "Bataille de Salamine",
      "ws": "Bataille de Salamine", "description": "…" },
    { "id": "grc3", "description": "…" }
  ]
}
```

- `essentiel` : les ⭐ incontournables du thème.
- `reperes` (facultatif) : associe un repère du sommaire qui n'avait pas d'`eventId` à un événement, par le début de
  son texte. Les tests vérifient que chaque `eventId` d'un repère existe.
- `axes` (facultatif) : ordre des axes de la frise ; peut introduire un axe absent (ex. l'entre-deux-guerres dans
  `thm_20s`).
- Un événement **nouveau** donne tous ses champs : `id` (unique dans le pack), `axe` (le texte, ou son rang dans
  l'ordre des axes), `date` (entier, négatif avant J.-C.), `titre`, `description`, et le lien Wikipédia par `wp`
  (titre d'article), `ws` (recherche, qui mène à l'article quand le terme est exact) ou `url`.
- Un événement **existant** ne donne que les champs qu'on remplace ; il garde son lien Wikipédia sauf mention.

## Règles vérifiées par `--check`

- description en **trois phrases** de 220 à 760 caractères : ce qu'est l'événement et son contexte, puis ce qui le
  rend déterminant pour le thème ; la formule « compte pour le concours » est à proscrire ;
- le titre ne contient pas de date ;
- axe connu, identifiant unique dans tout le pack, date entière ;
- les événements sont groupés par axe (dans l'ordre de `axes`, sinon d'apparition), puis par date.

Le compteur de phrases coupe sur « . », « ! » ou « ? » suivis d'une majuscule : une phrase qui se terminerait par
une initiale (« Mohammed V. », « 1,5 °C. ») est mal comptée, il faut la reformuler.

## Ce qui n'est pas fait

Les nouveaux événements n'ont pas de point dans `assets/geo/events-geo.json` (l'Atlas ne les montre pas), sauf quand
ils sont liés à une fiche déjà localisée (même lien Wikipédia et même année dans un autre thème) : le test
`tests/geo.test.js` impose alors le même point à toutes les fiches du fait.
