# Afrique du Sud : fiches en attente de portrait

> **État** : le thème `pan_za` est construit (56 figures ; voir « Un pays à part : l'Afrique du Sud » dans `docs/personnages-illustres.md`).

## Fiches rédigées, portrait absent

Seize figures ont leur fiche écrite et vérifiée (dates relues sur l'article français de Wikipédia), mais aucun portrait libre convenable : soit Commons n'en
a pas, soit le garde-fou de `fetch_portraits.py` l'a refusé, soit Wikimedia répondait 429 à la miniature. Pour réintégrer une figure : recopier son objet dans
`personnages` de `scripts/pantheon/za.json`, y ajouter un `portrait` (`fichier` Commons et `legende`, plus `recadrage` si le visage est petit), lancer
`python3 scripts/fetch_portraits.py za --only <slug>`, puis `python3 scripts/build_pantheon.py za`, `npm run build:pack`, et mettre à jour les compteurs
(`js/i18n.js`, `tests/gallery.test.js`, `tests/gameModes.test.js`, `e2e/personnages.spec.js`) et les versions de cache de `sw.js`. Les manques les plus sensibles :
**Chris Hani** (figure majeure de la lutte contre l'apartheid), **Brenda Fassie** et **Joseph Shabalala** pour la musique, et **Irma Stern** pour les Beaux-arts, qui n'ont que trois figures.

Notes par figure :

- **Dingane** (1795, Guerres et résistances) : Roi zoulou, qui fait tuer Piet Retief en 1838. Images libres trouvées : une sculpture au Maropeng (CC BY-SA 4.0, « Zulu King Dingane kaSenzangakhona, Maropeng, South Africa.jpg ») et une peinture de Woodville de 1897 (« Dingane - 'Bulalani abathakathi' - 1897.jpg », domaine public, le visage y est petit) ; aucune n'a été retenue.
- **Piet Retief** (1780, Guerres et résistances) : Aucun portrait libre : seuls un monument, une signature et une image de film sont sur Commons.
- **Chris Hani** (1942, Guerres et résistances) : Aucun portrait libre : seul un monument (« Chris Hani Monument 4.jpg », CC BY-SA 4.0) est sur Commons.
- **Herman Charles Bosman** (1905, Littérature et pensée) : « HC Bosman.jpg » a été refusé par le garde-fou de `fetch_portraits.py` (alerte « non-free » sur la page du fichier).
- **Alex La Guma** (1924, Littérature et pensée) : Aucun portrait libre trouvé sur Commons.
- **Athol Fugard** (1932, Littérature et pensée) : Aucun portrait libre trouvé : seules des photographies de scène (spectacles de 1987-1989, CC BY 4.0) montrent des pièces de lui.
- **Bessie Head** (1937, Littérature et pensée) : Aucun portrait libre trouvé : l'image de l'article anglais est locale et non libre.
- **Irma Stern** (1894, Beaux-arts) : Aucun portrait libre trouvé : l'image de l'article anglais est locale et non libre.
- **Ernest Mancoba** (1904, Beaux-arts) : Aucun portrait libre trouvé : seule une œuvre (« Mancoba African Madonna.jpg ») est sur Commons.
- **Walter Battiss** (1906, Beaux-arts) : Image trouvée : « Battiss.jpg » (portrait de l'article anglais, Commons), mais Wikimedia a répondu 429 à toute miniature, quelle que soit la largeur demandée (330, 500, 960) ; à retélécharger.
- **David Goldblatt** (1930, Beaux-arts) : Aucun portrait libre : l'image « David Goldblatt (14271185078).jpg » montre un autre homme (un intervenant au micro) et ne convient pas.
- **Ernest Cole** (1940, Beaux-arts) : Aucun portrait libre trouvé : seule une photographie de panneaux d'apartheid, prise par lui, est sur Commons.
- **Basil D'Oliveira** (1931, Musique, spectacle et sport) : Aucun résultat sur Commons.
- **Joseph Shabalala** (1940, Musique, spectacle et sport) : « Joseph Shabalala.jpg » (800 × 450, CC BY-SA 4.0) existe mais son auteur est « IMDB » : provenance douteuse, écartée.
- **Brenda Fassie** (1964, Musique, spectacle et sport) : Aucun portrait libre trouvé.
- **Raymond Dart** (1893, Sciences, techniques et innovation) : « Raymond Dart- Smithsonian Institution Archives - SIA-SIA2008-0845 (cropped).jpg » est refusé par le garde-fou (alerte « fair use »).

```json
[
 {
  "slug": "dingane",
  "nom": "Dingane",
  "classement": "Dingane",
  "titre": "Naissance de Dingane",
  "axe": "Guerres et résistances",
  "naissance": 1795,
  "description": "Dingane (vers 1795-1840) est un roi zoulou, demi-frère et successeur de Chaka, qu'il fait assassiner en 1828. En février 1838, il fait tuer le chef voortrekker Piet Retief et ses compagnons, avant d'être battu par Andries Pretorius à Blood River, le 16 décembre 1838. Vaincu en 1840 par son demi-frère Mpande, allié aux Boers, il s'enfuit et meurt peu après.",
  "wikipedia": "Dingane kaSenzangakhona"
 },
 {
  "slug": "retief",
  "nom": "Piet Retief",
  "classement": "Retief, Piet",
  "titre": "Naissance de Piet Retief",
  "axe": "Guerres et résistances",
  "naissance": 1780,
  "description": "Piet Retief (1780-1838) est un chef voortrekker, né dans la colonie du Cap. Auteur en 1837 d'un manifeste qui justifie le départ des Boers de la colonie britannique, il conduit l'un des convois du Grand Trek vers le Natal. Il est tué avec ses hommes par ordre du roi Dingane, en février 1838, un épisode devenu fondateur dans la mémoire afrikaner.",
  "wikipedia": "Piet Retief"
 },
 {
  "slug": "hani",
  "nom": "Chris Hani",
  "classement": "Hani, Chris",
  "titre": "Naissance de Chris Hani",
  "axe": "Guerres et résistances",
  "naissance": 1942,
  "description": "Chris Hani (1942-1993) est un dirigeant communiste sud-africain, né à Cofimvaba, dans le Transkei. Chef d'état-major de l'Umkhonto we Sizwe, la branche armée de l'ANC, puis secrétaire général du Parti communiste à partir de 1991, il est très populaire parmi la jeunesse noire. Il est assassiné le 10 avril 1993 par un extrémiste d'origine polonaise, Janusz Waluś, ce qui manque de faire échouer les négociations sur la fin de l'apartheid.",
  "wikipedia": "Chris Hani"
 },
 {
  "slug": "bosman",
  "nom": "Herman Charles Bosman",
  "classement": "Bosman, Herman Charles",
  "titre": "Naissance de Herman Charles Bosman",
  "axe": "Littérature et pensée",
  "naissance": 1905,
  "description": "Herman Charles Bosman (1905-1951) est un écrivain de langue anglaise, issu de la communauté afrikaner. Condamné à mort en 1926 pour meurtre, peine commuée en détention, il en tire « Cold Stone Jug » (1949). Ses nouvelles du Marico, racontées par l'ironique Oom Schalk Lourens, sont des classiques de la littérature sud-africaine.",
  "wikipedia": "Herman Charles Bosman"
 },
 {
  "slug": "lagumma",
  "nom": "Alex La Guma",
  "classement": "La Guma, Alex",
  "titre": "Naissance d'Alex La Guma",
  "axe": "Littérature et pensée",
  "naissance": 1924,
  "description": "Alex La Guma (1924-1985) est un romancier et militant communiste, né au Cap. Accusé de haute trahison en 1956, il décrit dans « A Walk in the Night » (1962) la vie des quartiers métis du Cap. Exilé en 1966, il représente l'ANC à La Havane, où il meurt en 1985.",
  "wikipedia": "Alex La Guma"
 },
 {
  "slug": "fugard",
  "nom": "Athol Fugard",
  "classement": "Fugard, Athol",
  "titre": "Naissance d'Athol Fugard",
  "axe": "Littérature et pensée",
  "naissance": 1932,
  "description": "Athol Fugard (1932-2025) est un dramaturge, acteur et metteur en scène, né à Middelburg, dans la province du Cap. Il crée à Port Elizabeth une troupe interraciale et écrit des pièces sur l'apartheid, dont « Boesman et Lena » (1969) et « L'Île » (1973). Ses textes sont joués dans le monde entier.",
  "wikipedia": "Athol Fugard"
 },
 {
  "slug": "head",
  "nom": "Bessie Head",
  "classement": "Head, Bessie",
  "titre": "Naissance de Bessie Head",
  "axe": "Littérature et pensée",
  "naissance": 1937,
  "description": "Bessie Head (1937-1986) est une romancière née à Pietermaritzburg d'une mère blanche et d'un père noir inconnu. Exilée en 1964 au Botswana avec son fils, elle vit à Serowe et écrit « Maru » (1971) et « A Question of Power » (1973). Elle y meurt en 1986.",
  "wikipedia": "Bessie Head"
 },
 {
  "slug": "stern",
  "nom": "Irma Stern",
  "classement": "Stern, Irma",
  "titre": "Naissance d'Irma Stern",
  "axe": "Beaux-arts",
  "naissance": 1894,
  "description": "Irma Stern (1894-1966) est une peintre expressionniste née à Schweizer-Reneke. Formée en Allemagne auprès de Max Pechstein, elle expose à Berlin en 1919 et s'installe définitivement au Cap en 1926. Voyageuse infatigable, elle peint ses séjours à Zanzibar, au Congo ou au Sénégal ; sa maison est devenue un musée.",
  "wikipedia": "Irma Stern"
 },
 {
  "slug": "mancoba",
  "nom": "Ernest Mancoba",
  "classement": "Mancoba, Ernest",
  "titre": "Naissance d'Ernest Mancoba",
  "axe": "Beaux-arts",
  "naissance": 1904,
  "description": "Ernest Mancoba (1904-2002) est un artiste franco-sud-africain, né à Johannesburg. Il quitte l'Afrique du Sud en 1938, rencontre la sculptrice danoise Sonja Ferlov et participe au mouvement CoBrA. Il passe l'essentiel de sa vie en Europe et meurt à Clamart ; le Centre Pompidou lui consacre une exposition en 2019.",
  "wikipedia": "Ernest Mancoba"
 },
 {
  "slug": "battiss",
  "nom": "Walter Battiss",
  "classement": "Battiss, Walter",
  "titre": "Naissance de Walter Battiss",
  "axe": "Beaux-arts",
  "naissance": 1906,
  "description": "Walter Battiss (1906-1982) est un peintre né à Somerset East, dans le Karoo. Passionné par l'art rupestre des San, auquel il consacre son premier livre en 1939, il se lie d'amitié avec Picasso en 1949 et fonde la revue « De Arte ». Il invente l'île imaginaire de Fook, territoire de liberté et d'art dont il dessine passeports et timbres.",
  "wikipedia": "Walter Battiss"
 },
 {
  "slug": "goldblatt",
  "nom": "David Goldblatt",
  "classement": "Goldblatt, David",
  "titre": "Naissance de David Goldblatt",
  "axe": "Beaux-arts",
  "naissance": 1930,
  "description": "David Goldblatt (1930-2018) est un photographe né à Randfontein, dans une famille juive d'origine lituanienne. Pendant plus de cinquante ans, il documente la société sud-africaine, sous l'apartheid puis après lui, par des images sobres de paysages, de lieux et de gens ordinaires. Il fonde en 1989 le Market Photo Workshop pour former de jeunes photographes noirs.",
  "wikipedia": "David Goldblatt"
 },
 {
  "slug": "cole",
  "nom": "Ernest Cole",
  "classement": "Cole, Ernest",
  "titre": "Naissance d'Ernest Cole",
  "axe": "Beaux-arts",
  "naissance": 1940,
  "description": "Ernest Cole (1940-1990) est un photographe né à Eersterust, près de Pretoria. L'un des premiers photographes noirs à documenter l'apartheid, il publie en 1967 « House of Bondage », interdit en Afrique du Sud, ce qui le contraint à l'exil. Il meurt à New York en 1990 ; une partie de ses négatifs, retrouvée en Suède en 2017, a permis une nouvelle édition de son livre.",
  "wikipedia": "Ernest Cole"
 },
 {
  "slug": "doliveira",
  "nom": "Basil D'Oliveira",
  "classement": "D'Oliveira, Basil",
  "titre": "Naissance de Basil D'Oliveira",
  "axe": "Musique, spectacle et sport",
  "naissance": 1931,
  "description": "Basil D'Oliveira (1931-2011) est un joueur de cricket né au Cap dans une famille métisse, que l'apartheid écarte des compétitions nationales. Il émigre en Angleterre en 1960 et joue pour l'équipe d'Angleterre à partir de 1966. En 1968, le gouvernement sud-africain refuse qu'il revienne au pays avec la sélection anglaise ; l'affaire annule la tournée et conduit à l'exclusion de l'Afrique du Sud du cricket international.",
  "wikipedia": "Basil D'Oliveira"
 },
 {
  "slug": "shabalala",
  "nom": "Joseph Shabalala",
  "classement": "Shabalala, Joseph",
  "titre": "Naissance de Joseph Shabalala",
  "axe": "Musique, spectacle et sport",
  "naissance": 1940,
  "description": "Joseph Shabalala (1940-2020) est un chanteur et compositeur né à Ladysmith, fondateur du groupe Ladysmith Black Mambazo en 1960. Il fait connaître au monde l'isicathamiya, un chant a cappella zoulou né dans les foyers de mineurs. Sa collaboration avec Paul Simon sur « Graceland » (1986) donne au groupe une audience mondiale.",
  "wikipedia": "Joseph Shabalala"
 },
 {
  "slug": "fassie",
  "nom": "Brenda Fassie",
  "classement": "Fassie, Brenda",
  "titre": "Naissance de Brenda Fassie",
  "axe": "Musique, spectacle et sport",
  "naissance": 1964,
  "description": "Brenda Fassie (1964-2004) est une chanteuse pop née à Langa, au Cap, surnommée « la Madonna des townships ». Révélée en 1983 par « Weekend Special », elle devient une icône de la jeunesse noire par ses chansons et son franc-parler. Minée par la drogue, elle meurt à Johannesbourg en 2004.",
  "wikipedia": "Brenda Fassie"
 },
 {
  "slug": "dart",
  "nom": "Raymond Dart",
  "classement": "Dart, Raymond",
  "titre": "Naissance de Raymond Dart",
  "axe": "Sciences, techniques et innovation",
  "naissance": 1893,
  "description": "Raymond Dart (1893-1988) est un anatomiste né à Toowong, dans le Queensland, en Australie. Professeur d'anatomie à l'université du Witwatersrand à partir de 1922, il décrit en 1925 le crâne de l'enfant de Taung, premier fossile d'Australopithèque. Son hypothèse d'une origine africaine de l'humanité, d'abord rejetée, s'impose après la Seconde Guerre mondiale.",
  "wikipedia": "Raymond Dart"
 }
]
```

## Figures non écrites

Sans article en français (donc sans lien Wikipédia possible pour une fiche) : John Langalibalele Dube, Pixley ka Isaka Seme, Lilian Ngoyi, Nat Nakasa,
Jacob Hendrik Pierneef, Dumile Feni, Helen Martins, Cecil Skotnes, Kippie Moeketsi, Hansie Cronjé, Mahlathini et Maqoma. Avec un article, mais non
retenus à ce stade (fiche non écrite, image non cherchée) : Dolly Rathebe, Peter Abrahams, Chris McGregor, Basil Schonland et Alexander du Toit
(la recherche d'image libre de ces trois derniers n'a rien donné). Écartés pour d'autres raisons : Credo Mutwa (figure controversée), Laurens van der Post
(écrivain britannique d'origine sud-africaine), Roy Campbell et N. P. van Wyk Louw (pas d'image libre convenable : un cliché de groupe, un monument), Krotoa
(le seul fichier proposé par l'article est une image moderne, non examinée), Basil Rathbone (né à Johannesburg mais acteur britannique et américain).
Les vivants n'entrent pas dans un panthéon : Elon Musk, Thabo Mbeki, Jacob Zuma, J. M. Coetzee, Abdullah Ibrahim, Caster Semenya, Charlize Theron, Trevor Noah.
Gandhi (Inde) et Tolkien (Royaume-Uni), qui ont vécu ou sont nés en Afrique du Sud, sont dans leur panthéon.
