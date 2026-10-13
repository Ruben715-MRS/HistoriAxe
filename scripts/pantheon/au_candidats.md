# Panthéon de l'Australie : fiches en attente d'un portrait

Fiches rédigées et vérifiées (dates relues sur l'article de Wikipédia), dont l'image libre est repérée sur
Commons mais n'a pas pu être téléchargée : Wikimedia a répondu par l'erreur 429 pendant plus de deux heures.
Pour les ajouter : coller l'objet JSON dans `personnages` de `scripts/pantheon/au.json`, lancer
`python3 scripts/fetch_portraits.py au --only <slug>` (qui résout la licence et télécharge l'image), puis
`python3 scripts/build_pantheon.py au`, mettre à jour les compteurs des tests (`tests/gallery.test.js`,
`tests/gameModes.test.js`, `e2e/personnages.spec.js`) et la section de l'Australie du README, et incrémenter
`CACHE_VERSION` et `DATA_CACHE` dans `sw.js`.

## Marcus Clarke

```json
{
  "slug": "clarke",
  "nom": "Marcus Clarke",
  "classement": "Clarke, Marcus",
  "titre": "Naissance de Marcus Clarke",
  "axe": "Littérature et pensée",
  "naissance": 1846,
  "description": "Marcus Clarke (1846-1881) est un romancier et journaliste né à Londres, émigré en Australie à dix-sept ans. Son roman « For the Term of His Natural Life » (1874), publié en feuilleton, décrit l'enfer des bagnes de Tasmanie et reste le grand roman du système pénitentiaire. Bohème et endetté, il meurt à trente-cinq ans.",
  "wikipedia": "Marcus Clarke",
  "portrait": {
    "fichier": "Marcus Clarke.PNG",
    "legende": "Marcus Clarke, photographie de 1874",
    "auteur": "Auteur inconnu"
  }
}
```

## Frank Hurley

```json
{
  "slug": "hurley",
  "nom": "Frank Hurley",
  "classement": "Hurley, Frank",
  "titre": "Naissance de Frank Hurley",
  "axe": "Beaux-arts",
  "naissance": 1885,
  "description": "Frank Hurley (1885-1962) est un photographe et cinéaste né à Sydney, parti à treize ans de chez lui pour travailler sur les chemins de fer. Photographe des expéditions polaires de Mawson (1911-1914) et de Shackleton (1914-1917), il sauve ses plaques de verre quand l'Endurance est écrasée par les glaces et n'en garde que les meilleures. Il est aussi photographe officiel des armées australiennes pendant les deux guerres mondiales.",
  "wikipedia": "Frank Hurley",
  "portrait": {
    "fichier": "FrankHurley.png",
    "legende": "Frank Hurley à bord de l'Endurance, vers 1914",
    "auteur": "Frank Hurley"
  }
}
```

## Shane Warne

```json
{
  "slug": "warne",
  "nom": "Shane Warne",
  "classement": "Warne, Shane",
  "titre": "Naissance de Shane Warne",
  "axe": "Musique, spectacle et sport",
  "naissance": 1969,
  "description": "Shane Warne (1969-2022) est un joueur de cricket né à Ferntree Gully, dans le Victoria, spécialiste du leg-spin. En 1993, sa première balle contre l'Angleterre aux Ashes, à Old Trafford, contourne la défense de Mike Gatting, et reste connue comme la « balle du siècle ». Il termine avec 708 guichets en matchs de test, un record à sa retraite en 2007, et meurt d'une crise cardiaque en Thaïlande à cinquante-deux ans.",
  "wikipedia": "Shane Warne",
  "portrait": {
    "fichier": "Shane Warne 2011 cropped.jpg",
    "legende": "Shane Warne, photographie de 2011",
    "auteur": "Eva Rinaldi"
  }
}
```
