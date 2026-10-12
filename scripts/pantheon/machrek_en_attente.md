# Machrek : fiches en attente d'un portrait

Ces trois fiches sont écrites et valident, mais leur portrait n'a pas pu être téléchargé (Wikimedia limitait les requêtes de l'environnement : erreur 429 sur chaque tentative pendant plus d'une heure, et, pour Harun, un fichier refusé par `fetch_portraits.py` parce que sa page mentionne « fair use »). Le panthéon exige un portrait par personnage : elles ne sont donc pas dans `machrek.json`. Pour les y remettre : ajouter l'objet au tableau `personnages` (triés par naissance, puis `slug`), lancer `python3 scripts/pantheon_classement.py --write machrek`, `python3 scripts/fetch_portraits.py machrek --only <slug>`, puis `python3 scripts/build_pantheon.py machrek`.

- **Harun al-Rashid** (`harun`, biographie `bio_harunalrashid`, naissance 763) : le fichier prévu est refusé ; il faut une autre illustration (voir `scripts/search_portraits.py "Harun al-Rashid"`).
- **Al-Ma'mun** (`mamun`) : le fichier `Mamun_sends_an_envoy_to_Theophilos_(cropped).png` est valide, il manque seulement le téléchargement.
- **Salah al-Din al-Bitar** (`bitar`) : le fichier `Salah_Bitar.jpg` est valide, il manque seulement le téléchargement.

```json
[
  {
    "slug": "harun",
    "nom": "Harun al-Rashid",
    "classement": "Harun al-Rashid",
    "titre": "Naissance de Harun al-Rashid",
    "axe": "Chefs d'État et dirigeants",
    "naissance": 763,
    "pays": "IQ",
    "description": "Harun al-Rashid (vers 763-809) est le cinquième calife abbasside, né à Rayy, qui règne de 786 à sa mort. Son règne, où Bagdad devient l'une des plus grandes villes du monde et où prospèrent lettrés, poètes et traducteurs, reste dans la mémoire comme l'âge d'or du califat abbasside, et les Mille et Une Nuits en ont fait un personnage de légende. Il échange des ambassades avec Charlemagne, affronte Byzance et partage son empire entre ses fils al-Amin et al-Ma'mun, ce qui provoque la guerre civile qui suit sa mort à Tus en 809.",
    "wikipedia": "Hâroun_ar-Rachîd",
    "essentiel": true,
    "biographie": "bio_harunalrashid",
    "portrait": {
      "fichier": "Harun Al-Rashid and the World of the Thousand and One Nights.jpg",
      "legende": "Miniature persane du XVIe siècle attribuée à tort à Bihzad et présentée comme un portrait de Harun al-Rashid : une image imaginée, sept siècles après lui",
      "auteur": "Auteur inconnu (miniature persane)"
    }
  },
  {
    "slug": "mamun",
    "nom": "Al-Ma'mun",
    "classement": "Al-Ma'mun",
    "titre": "Naissance d'Al-Ma'mun",
    "axe": "Chefs d'État et dirigeants",
    "naissance": 786,
    "pays": "IQ",
    "description": "Al-Ma'mun (786-833) est un calife abbasside de 813 à 833, né à Bagdad, fils de Harun al-Rashid et d'une esclave perse. Vainqueur de la guerre civile contre son frère al-Amin, qui s'achève par la prise de Bagdad en 813, il installe d'abord sa cour à Merv et revient à Bagdad en 819. Protecteur de la Maison de la sagesse, où l'on traduit les savants grecs, il impose en 833 l'inquisition de la mihna, qui oblige les juristes à reconnaître que le Coran est créé, et meurt la même année à Tarse.",
    "wikipedia": "Al-Ma'mūn",
    "portrait": {
      "fichier": "Mamun_sends_an_envoy_to_Theophilos_(cropped).png",
      "legende": "Al-Ma'mun, miniature byzantine qui le montre sur son trône envoyant un ambassadeur à l'empereur Théophile : une image faite à l'étranger, longtemps après sa mort",
      "auteur": "Auteur inconnu (miniature byzantine)"
    }
  },
  {
    "slug": "bitar",
    "nom": "Salah al-Din al-Bitar",
    "classement": "Bitar, Salah al-Din al-",
    "titre": "Naissance de Salah al-Din al-Bitar",
    "axe": "Littérature et pensée",
    "naissance": 1912,
    "pays": "SY",
    "description": "Salah al-Din al-Bitar (1912-1980) est un homme politique syrien, né à Damas, cofondateur du parti Baas avec Michel Aflak. Rencontré à Paris pendant leurs études, Aflak et lui définissent une doctrine qui mêle nationalisme arabe et socialisme, fondent le mouvement en 1940, et Bitar dirige plusieurs gouvernements syriens entre 1963 et 1966. Contraint de fuir en 1966 après la radicalisation du Baas et la prise du pouvoir par les militaires, il vit en Europe jusqu'à son assassinat à Paris le 21 juillet 1980.",
    "wikipedia": "Salah_Eddine_Bitar",
    "portrait": {
      "fichier": "Salah_Bitar.jpg",
      "legende": "Salah al-Din al-Bitar, photographie de 1966 tirée d'un ancien magazine du parti Baas",
      "auteur": "Auteur inconnu (magazine du parti Baas)"
    }
  }
]
```
