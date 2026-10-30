# scripts/

Outils du projet. Ce qui est là sert encore ; le reste a été retiré (voir plus bas).

| Fichier / dossier | Rôle |
|---|---|
| `build.js` | construit `www/` pour Capacitor / Vercel (`npm run build`) ; injecte `HISTORIAXE_API_BASE_URL` pour l'app native |
| `build_pack.js` | découpe `data/fr.json` en `data/pack/fr/` (`npm run build:pack`) — à relancer après toute modification de `data/fr.json` |
| `pantheon/` + `build_pantheon.py` + `pantheon_classement.py` | sources des panthéons (`<pays>.json`) et leur écriture dans `data/fr.json` |
| `nobel/` + `build_nobel.py` | sources du thème « Prix Nobel » (un fichier JSON par prix) et son écriture dans `data/fr.json` : `python3 scripts/build_nobel.py` (`--check` pour valider seulement) ; il déplace aussi les événements de prix qui vivaient dans d'autres thèmes de « Culture générale » |
| `prix/` + `build_prix.py` | sources des thèmes de « Prix et récompenses » hors Nobel (Oscars, festivals, prix littéraires, scientifiques, sportifs, musicaux), un JSON par thème, et leur écriture dans `data/fr.json` : `python3 scripts/build_prix.py` (`--check` valide, `--verify` compare) |
| `capes/` + `build_capes.py` | sources des événements des 23 thèmes de « CAPES & Agrégation » (un JSON par thème, voir `capes/README.md`) et leur écriture dans `data/fr.json` : `python3 scripts/build_capes.py` (`--check` valide, `--verify` compare, `--export` réécrit les sources depuis le JSON) |
| `fetch_portraits.py`, `search_portraits.py` | collecte des portraits (Wikimedia) |
| `geo/` | chaîne de géolocalisation des événements → `assets/geo/events-geo.json` (voir `geo/README.md`) |
| `transport/` | génération du thème « Grandes catastrophes de transport » |
| `veille/` | veille d'actualité, lecture seule : `dirigeants.js` (chefs d'État et de gouvernement), `prix.py` (lauréats des prix suivis, calendrier dans `calendrier_prix.json`), `transport.py` (couverture des catastrophes de transport). Rapports datés dans `veille/rapports/`. Aucune donnée modifiée : les ajouts se font après validation |

## Ce qui a été retiré

Un grand ménage a supprimé, du dossier courant (tout reste dans l'historique git, avant le
commit « Nettoyage du dépôt ») : les lots JSON des campagnes de réécriture par lots
(titres raccourcis, descriptions, ⭐ Incontournables, ordre des axes — `batches*/`, ~9 Mo),
leurs scripts de préparation/fusion, les rapports et journaux, les échantillons, les scripts
d'inspection et d'essai, et les scripts uniques de la racine (`add_events*.py`,
`generate_sunni_shia*.py`, `check*.py`, `fix_app.py`, `bump_sw.py`) dont les résultats sont
déjà dans `data/fr.json`. Pour en retrouver un : `git log --diff-filter=D --name-only -- scripts/`
puis `git show <commit>^:scripts/<fichier>`.
