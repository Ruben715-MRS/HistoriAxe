# Pays baltes : fiches en attente de portrait et candidats écartés

> **État** : le thème `pan_baltes` est construit (65 figures ; voir « Un bloc : les pays baltes » dans `docs/personnages-illustres.md`).

## Fiches rédigées, portrait non téléchargé

Onze figures ont leur fiche écrite et leur fichier Commons choisi (licence relevée sur la page du fichier : domaine public ou CC), mais le
téléchargement de l'image a échoué : Wikimedia répondait 429 (« Too many requests ») à toute requête de miniature depuis cet environnement, des
heures durant. Pour les réintégrer : recopier l'objet dans `personnages` de `scripts/pantheon/baltes.json`, lancer
`python3 scripts/fetch_portraits.py baltes --only <slug>`, écrire `classement` (`python3 scripts/pantheon_classement.py --write baltes`), puis
`python3 scripts/build_pantheon.py baltes` et les compteurs des tests. Les légendes ci-dessous sont à relire sur l'image obtenue.
Zenta Mauriņa : l'image de Commons a le visage au bord gauche de la photographie, il faut un `recadrage` (vers `[0, 0, 0.55, 0.85]`) ;
Eduard Vilde et Konstantin Päts (⭐) sont les deux manques les plus sensibles.

```json
[
 {
  "slug": "vilde",
  "nom": "Eduard Vilde",
  "classement": "Vilde, Eduard",
  "titre": "Naissance d'Eduard Vilde",
  "axe": "Littérature et pensée",
  "naissance": 1865,
  "pays": "EE",
  "description": "Eduard Vilde (1865-1933) est un écrivain estonien, né à Pudivere, pionnier du roman réaliste. Journaliste, il publie le roman historique La Guerre de Mahtra (1902) et des comédies comme Pisuhänd (1913), toujours jouées. Exilé après la révolution de 1905, il revient en 1917, représente l'Estonie indépendante à Berlin et meurt à Tallinn.",
  "wikipedia": "Eduard_Vilde",
  "portrait": {
   "fichier": "Eduard Vilde 1911.jpg",
   "legende": "Eduard Vilde, photographie de 1911"
  }
 },
 {
  "slug": "pats",
  "nom": "Konstantin Päts",
  "classement": "Päts, Konstantin",
  "titre": "Naissance de Konstantin Päts",
  "axe": "Chefs d'État et dirigeants",
  "naissance": 1874,
  "pays": "EE",
  "description": "Konstantin Päts (1874-1956) est un homme d'État estonien, chef du gouvernement à plusieurs reprises puis président de la République de 1938 à 1940. Avocat et journaliste, il fait proclamer l'indépendance le 24 février 1918 et dirige le pays pendant l'entre-deux-guerres, avant d'y instaurer un régime autoritaire à partir de 1934. Déporté en Russie par les Soviétiques en 1940, il meurt interné dans un hôpital psychiatrique à Bourachevo.",
  "wikipedia": "Konstantin_Päts",
  "essentiel": true,
  "portrait": {
   "fichier": "Konstantin Pats 1934.jpg",
   "legende": "Konstantin Päts, photographie de 1934"
  }
 },
 {
  "slug": "pumpurs",
  "nom": "Andrejs Pumpurs",
  "classement": "Pumpurs, Andrejs",
  "titre": "Naissance d'Andrejs Pumpurs",
  "axe": "Littérature et pensée",
  "naissance": 1841,
  "pays": "LV",
  "description": "Andrejs Pumpurs (1841-1902) est un poète et officier letton, né à Jumprava, auteur de l'épopée nationale Lāčplēsis (« Le Pourfendeur d'ours »), publiée en 1888. Inspiré par le Kalevipoeg estonien, il y met en scène un héros qui affronte le Chevalier noir, figure des croisés allemands. Le 11 novembre, jour de Lāčplēsis, la Lettonie honore aujourd'hui les combattants de son indépendance.",
  "wikipedia": "Andrejs_Pumpurs",
  "portrait": {
   "fichier": "Andrejs Pumpurs.JPG",
   "legende": "Andrejs Pumpurs, portrait ancien, auteur inconnu"
  }
 },
 {
  "slug": "caks",
  "nom": "Aleksandrs Čaks",
  "classement": "Čaks, Aleksandrs",
  "titre": "Naissance d'Aleksandrs Čaks",
  "axe": "Littérature et pensée",
  "naissance": 1901,
  "pays": "LV",
  "description": "Aleksandrs Čaks (1901-1950) est un poète letton, né à Riga, dont il est le chantre. Il renouvelle la poésie lettone des années 1920-1930 en y mêlant argot des faubourgs et images d'avant-garde. Son poème épique Mūžības skartie (1937-1939) célèbre les tirailleurs lettons de la Première Guerre mondiale.",
  "wikipedia": "Aleksandrs_Čaks",
  "portrait": {
   "fichier": "Aleksandrs Čaks 1925.jpg",
   "legende": "Aleksandrs Čaks, photographie de 1925"
  }
 },
 {
  "slug": "maurina",
  "nom": "Zenta Mauriņa",
  "classement": "Mauriņa, Zenta",
  "titre": "Naissance de Zenta Mauriņa",
  "axe": "Littérature et pensée",
  "naissance": 1897,
  "pays": "LV",
  "description": "Zenta Mauriņa (1897-1978) est une écrivaine et essayiste lettone, née à Liepāja. Elle publie en letton, puis en allemand, des essais sur Dostoïevski et sur les écrivains européens, qui lui valent un public bien au-delà de la Lettonie. Exilée en 1944, elle vit en Suède puis en Suisse et meurt à Bâle.",
  "wikipedia": "Zenta_Mauriņa",
  "portrait": {
   "fichier": "Zenta Mauriņa (1930).jpg",
   "legende": "Zenta Mauriņa, photographie de 1930",
   "licence": "CC0 (domaine public)",
   "auteur": "Auteur inconnu",
   "recadrage": [
    0.0,
    0.0,
    0.55,
    0.85
   ]
  }
 },
 {
  "slug": "vacietis",
  "nom": "Jukums Vācietis",
  "classement": "Vācietis, Jukums",
  "titre": "Naissance de Jukums Vācietis",
  "axe": "Guerres et résistances",
  "naissance": 1873,
  "pays": "LV",
  "description": "Jukums Vācietis (1873-1938) est un officier d'origine lettone, premier commandant en chef de l'Armée rouge, de 1918 à 1919. Colonel de l'armée impériale russe à la tête des tirailleurs lettons, il écrase à Moscou l'insurrection des socialistes-révolutionnaires de gauche en juillet 1918. Arrêté pendant la Grande Terreur, il est fusillé en 1938.",
  "wikipedia": "Jukums_Vācietis",
  "portrait": {
   "fichier": "II Vatsetis 02.png",
   "legende": "Jukums Vācietis, photographie d'auteur inconnu (avant 1937)"
  }
 },
 {
  "slug": "purvitis",
  "nom": "Vilhelms Purvītis",
  "classement": "Purvītis, Vilhelms",
  "titre": "Naissance de Vilhelms Purvītis",
  "axe": "Beaux-arts",
  "naissance": 1872,
  "pays": "LV",
  "description": "Vilhelms Purvītis (1872-1945) est un peintre letton, né à Zaube, maître du paysage. Il peint avec une sensibilité impressionniste les hivers, les printemps et les rivières de Lettonie, et devient en 1919 le premier recteur de l'Académie des beaux-arts de Lettonie. Réfugié en Allemagne à la fin de la guerre, il meurt à Bad Nauheim.",
  "wikipedia": "Vilhelms_Purvītis",
  "portrait": {
   "fichier": "Vilhelms Purvītis (cropped).jpg",
   "legende": "Vilhelms Purvītis, photographie de 1942"
  }
 },
 {
  "slug": "klucis",
  "nom": "Gustav Klucis",
  "classement": "Klucis, Gustav",
  "titre": "Naissance de Gustav Klucis",
  "axe": "Beaux-arts",
  "naissance": 1895,
  "pays": "LV",
  "description": "Gustav Klucis (1895-1938) est un artiste letton, né à Ruba, l'un des pionniers du constructivisme russe et du photomontage politique. Ancien tirailleur letton, influencé par Malevitch à Moscou, il réalise dans les années 1920-1930 des affiches de propagande soviétiques aux compositions radicales. Arrêté pendant la Grande Terreur, il est fusillé en 1938 à Boutovo.",
  "wikipedia": "Gustav_Klucis",
  "portrait": {
   "fichier": "Gustav Klutsis-1915.jpg",
   "legende": "Gustav Klucis, photographie de 1915"
  }
 },
 {
  "slug": "sirvydas",
  "nom": "Konstantinas Sirvydas",
  "classement": "Sirvydas, Konstantinas",
  "titre": "Naissance de Konstantinas Sirvydas",
  "axe": "Littérature et pensée",
  "naissance": 1579,
  "pays": "LT",
  "description": "Konstantinas Sirvydas (vers 1579-1631) est un prêtre jésuite, lexicographe et prédicateur lituanien. Il publie vers 1620 le Dictionarium trium linguarum, premier dictionnaire polonais-latin-lituanien, qui fixe le vocabulaire de la langue lituanienne écrite. Ses sermons, les Punktai sakymų, sont un classique de la prose lituanienne ancienne, et il meurt à Vilnius.",
  "wikipedia": "Konstantinas_Sirvydas",
  "portrait": {
   "fichier": "Konstanty Szyrwid.PNG",
   "legende": "Konstantinas Sirvydas, portrait du XVIIIe siècle"
  }
 },
 {
  "slug": "vydunas",
  "nom": "Vydūnas",
  "classement": "Vydūnas",
  "titre": "Naissance de Vydūnas",
  "axe": "Littérature et pensée",
  "naissance": 1868,
  "pays": "LT",
  "description": "Vydūnas (1868-1953) est un philosophe, dramaturge et pédagogue de la Lituanie prussienne, de son vrai nom Wilhelm Storost, né à Jonaičiai. Il anime les sociétés culturelles lituaniennes de Prusse-Orientale et écrit des drames, comme Probočių šešėliai (Les Ombres des ancêtres, 1908). Réfugié en Allemagne à la fin de la guerre, il meurt à Detmold.",
  "wikipedia": "Vydūnas",
  "portrait": {
   "fichier": "Vydunas.jpg",
   "legende": "Vydūnas, photographie ancienne"
  }
 },
 {
  "slug": "jablonskis",
  "nom": "Jonas Jablonskis",
  "classement": "Jablonskis, Jonas",
  "titre": "Naissance de Jonas Jablonskis",
  "axe": "Littérature et pensée",
  "naissance": 1860,
  "pays": "LT",
  "description": "Jonas Jablonskis (1860-1930) est un linguiste lituanien, né à Kubilėliai, père de la langue lituanienne standard. Il publie en 1901, sous le pseudonyme de Rygiškių Jonas, une grammaire de la langue lituanienne qui fixe sa norme écrite. Professeur à l'université de Kaunas, il y meurt en 1930.",
  "wikipedia": "Jonas_Jablonskis",
  "portrait": {
   "fichier": "Jonas Jablonskis.jpg",
   "legende": "Jonas Jablonskis, photographie d'environ 1925"
  }
 }
]
```

## Écartés pour une autre raison

- **Nés hors du territoire actuel** : Kristjan Jaak Peterson (né à Riga : poète estonien), Georg Ots (né à Petrograd), Kārlis Zāle (né à Mažeikiai, Lituanie : sculpteur de la Lettonie), Mikhaïl Eisenstein (Saint-Pétersbourg).
- **Déjà dans un autre panthéon** : Sergueï Eisenstein (né à Riga), au panthéon de la Russie.
- **Rangés là où on les honore, ailleurs que dans les pays baltes** : Isaiah Berlin (Riga, Royaume-Uni), Mark Rothko (Daugavpils, États-Unis ; licence de l'image non établie), Romain Gary (Vilnius, France), Emmanuel Levinas (Kaunas, France), Czesław Miłosz (Šeteniai, Pologne), Jacques Lipchitz (Druskininkai). À reprendre si l'un de ces pays les accueille ou si un bloc « Litvaks » est créé.
- **Dates disputées** : Jascha Heifetz (1899 ou 1901 selon l'article), Jogaila (Ladislas II Jagellon : 1351 ou 1362), Jaan Tõnisson (décès « 1941 (?) »).
- **Vivants** : Arvo Pärt, Vaira Vīķe-Freiberga, Raimonds Pauls, Vytautas Landsbergis, Valdas Adamkus, Arvydas Sabonis.
- **Image inutilisable** : Jaan Kross (seule image libre de 184 × 250 pixels, trop petite), Jānis Jaunsudrabiņš (photographie d'un bas-relief), Walter Zapp (le visage est caché par l'appareil Minox), Adolfas Ramanauskas-Vanagas (licence « inconnue » sur Commons).
- **Écartés pour tenir l'équilibre ou pour leur rôle contesté** : Aleksandras Stulginskis, Gustavs Zemgals, Alberts Kviesis, Augustinas Voldemaras, Kazys Škirpa, Juozas Ambrazevičius, Aleksandras Lileikis, Vincas Mykolaitis-Putinas.
- **Article français introuvable sous le titre cherché** (à reprendre si un titre est retrouvé) : Jakob Hurt, Georg Lurich, Ants Piip, Jüri Vilms, Villem Reiman, Ado Vabbe, Anton Starkopf, Johann Köler, Simonas Daukantas, Motiejus Valančius, Stasys Girėnas, Jonas Biliūnas, Juozas Tumas-Vaižgantas, Antanas Baranauskas, Petras Cvirka, Oskars Kalpaks, Edvarts Virza.
