# Règles d'annotation géographique (étape 1)

Pour chaque fait d'un lot, dire OÙ il s'est passé. Aucune coordonnée : on donne un
nom de lieu, un pays, une précision ; un script géocode ensuite (Nominatim).

## Sortie (un fichier JSON par lot : une liste, un objet par fait du lot, dans l'ordre)
{"id": "thm_bat:bat12", "precision": "site|ville|zone|none", "place": "Azincourt, Pas-de-Calais",
 "cc": "FR", "alt": "Azincourt", "ambig": false, "conf": "high|low", "note": ""}

- `none` : `place`/`cc`/`alt` vides. Pas de point pour un mouvement artistique, une
  technique, une idée, une loi ou un traité sans lieu de signature, un événement
  réparti sur plusieurs lieux éloignés (guerre mondiale, épidémie, empire entier),
  un phénomène de durée sans centre. Dans le doute entre `none` et un lieu
  arbitraire, choisir `none`.
- `site` : un lieu précis, localisable à ~2 km (bâtiment, monument, champ de bataille
  nommé, grotte, place, ruine, institution à son adresse). `place` = nom du lieu + ville
  ("Pont du Gard", "Sainte-Chapelle, Paris"). `alt` = la ville/commune seule.
- `ville` : une commune ou une ville ("Verdun, Meuse"). `alt` = variante plus simple.
- `zone` : une région/un pays/une île quand l'événement lui est vraiment lié (< ~600 km
  d'étendue) : "Corse". Ne sert pas au jeu, seulement à la carte de découverte.

## Garde-fou : un lieu doit s'imposer
- Un point n'a de sens que si le lieu est cité dans le titre ou la description, ou s'il
  caractérise l'événement lui-même (bataille, édifice, expédition, fondation). Les
  nominations, lois, ordonnances, décrets, élections, réformes, procès ou règnes dont le
  texte ne nomme pas de lieu sont `none` : ne choisis pas la capitale « par défaut ».

## Quel lieu ?
- Le lieu où l'événement s'est PASSÉ : bataille → champ de bataille ; construction →
  l'édifice ; œuvre → lieu de création ou de première présentation ; invention/découverte →
  lieu de l'événement ; naissance/mort/étape de vie (thèmes de personnages) → la ville
  concernée par CE fait ; traité → lieu de signature ; fondation → lieu fondé.
- JAMAIS le musée où l'objet se trouve aujourd'hui, ni le pays d'origine de la personne
  par défaut.
- `ambig: true` si le lieu de création diffère du lieu évoqué par le titre (Guernica peint
  à Paris), si l'emplacement est discuté (Alésia, Champs catalauniques), ou si tu hésites
  entre deux lieux. Mettre `conf: "low"` si tu n'es pas sûr du lieu lui-même.

## Noms et pays
- Noms actuels, tels qu'OpenStreetMap les connaît : "Zülpich" (pas Tolbiac), "Slavkov u Brna"
  ou "Austerlitz", "Gdańsk". Ajouter commune/département/état pour lever l'ambiguïté
  ("Valmy, Marne", "Springfield, Illinois").
- `cc` : code ISO 3166-1 alpha-2 du pays ACTUEL qui contient le lieu, obligatoire pour
  site/ville/zone (FR, DE, EG, US…). Le script rejette tout résultat situé dans un autre pays.
- N'utilise que tes connaissances ; pas de recherche web.
