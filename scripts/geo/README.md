# Géolocalisation des événements (scripts/geo)

Produit `assets/geo/events-geo.json` (voir « L'Atlas » dans le README racine). Un **fait** est un
événement, ou un groupe d'événements reliés entre thèmes (même lien Wikipédia ET même année, la règle de
`js/linkedEvents.js`) ; il n'est localisé qu'une fois et tous ses membres reçoivent le même point.

## Chaîne

| Étape | Script | Rôle |
|---|---|---|
| 1 | `10_build_facts.py` | construit les faits et, avec `--rest`, les lots d'annotation des faits pas encore annotés (`work/batches/`) |
| 2 | *lecture humaine ou par modèle* | un fichier `work/annot/<lot>.json` par lot, selon `ANNOTATION_RULES.md` ; `13_validate_annot.py <lot>` le contrôle |
| 3 | `11_geocode.py` | géocode les lieux annotés avec Nominatim (1 requête/s, cache, reprise) ; pays imposé, alias de territoires |
| 4 | `14_fix_unplaced.py` | reprend les échecs et corrige les points tombés sur une *région* homonyme (province de Québec…) |
| 5 | `12_merge_geo.py` | fusionne dans `assets/geo/events-geo.json` ; écrit `work/review.json` (ambigus, faible confiance, replis) |

`work/` n'est pas versionné, sauf `work/annot/`, `work/fixes.json`, `work/manual_fixes.json` : ce sont les
décisions (lectures et corrections), le reste se recalcule. `run_geocode_loop.sh` géocode en continu pendant
qu'on annote.

## Ajouter un thème

1. `python3 scripts/geo/10_build_facts.py --rest --prefix n --size 50` → lots dans `work/batches/`.
   Si un fait lié change de représentant (un nouveau thème devient « la » fiche), son ancienne annotation est
   orpheline : la reporter sur le nouvel identifiant (voir l'historique de `annot/remap01.json`).
2. Annoter chaque lot (`ANNOTATION_RULES.md`), valider.
3. `11_geocode.py`, `14_fix_unplaced.py`, `12_merge_geo.py`, puis `node --test`.

## Ce qu'on a appris (et qui explique les garde-fous)

- **Le lien Wikipédia d'un événement ne désigne pas toujours son lieu** (l'article « Bach » pour la
  jeunesse d'Ohrdruf) : le lieu vient de la lecture du titre et de la description, pas de Wikipédia.
- **Nominatim classe souvent la région homonyme avant la ville** (Québec, Nagasaki, Puebla) et peut renvoyer
  un homonyme à l'autre bout du monde : toujours contraindre au pays (`countrycodes`), lire les 5 premiers
  résultats, écarter `addresstype` région pour un site ou une ville, et ne pas déplacer un point accepté de
  plus de 150 km sans vérification (`12_merge_geo.py`).
- **Une règle « un lieu doit s'imposer »** : une nomination, une loi ou un règne dont le texte ne nomme pas de
  lieu n'a pas de point (sans elle, les lectures posent la capitale par défaut).
- Environ 40 % des événements n'ont pas de point (mouvements, techniques, lois, idées) : voulu.

## 15 — relier les fiches qui citent le même article

`15_link_same_article.py` : une fiche dont le lien est une recherche Wikipédia (`…/w/index.php?search=X`) est le même
fait que celles dont le lien est l'article X la même année, mais `js/linkedEvents.js` ne reconnaît un fait qu'à
l'identité du lien. Le script remplace ces recherches par l'article (seulement quand l'article est cité par un *autre*
thème : deux fiches d'un même thème peuvent être deux événements distincts) puis donne à chaque fait lié un seul point.
`REJETS` liste les rapprochements écartés après lecture, `OVERRIDES` les points choisis à la main.
