# Indonésie : candidats, fiches en attente de portrait et écartés

> **État** : le thème `pan_id` est construit (**58 figures** ; voir « Un pays à part : l'Indonésie » dans `docs/personnages-illustres.md`). Ce fichier garde la liste de travail
> qui l'a précédé — la liste finale est `scripts/pantheon/id.json` — et, ci-dessous, la **fiche rédigée dont l'image manque**. Les tableaux plus bas sont ceux de la
> validation : ils comptent des figures que la règle de l'article français a ensuite écartées (voir la documentation).

## Fiche rédigée, portrait non téléchargé

Une figure a sa fiche écrite et son fichier Commons choisi (licence relevée sur la page du fichier : domaine public), mais le téléchargement de l'image échoue : Wikimedia répond 429
(« Too many requests ») à toute requête sur ce fichier depuis cet environnement. C'est **Pramoedya Ananta Toer** (⭐), l'une des figures les plus sensibles du thème. Les six autres fiches qui
attendaient ont été réintégrées (voir la documentation). Pour la réintégrer : recopier l'objet dans `personnages` de `scripts/pantheon/id.json`, lancer
`python3 scripts/fetch_portraits.py id --only pramoedya`, puis `python3 scripts/build_pantheon.py id`, `npm run build:pack` et les compteurs (tests de la galerie et du mode « Qui est-ce ? »,
`js/i18n.js`, `sw.js`). La légende est à relire sur l'image obtenue.

```json
[
 {
  "slug": "pramoedya",
  "nom": "Pramoedya Ananta Toer",
  "classement": "Pramoedya Ananta Toer",
  "titre": "Naissance de Pramoedya Ananta Toer",
  "axe": "Littérature et pensée",
  "naissance": 1925,
  "description": "Pramoedya Ananta Toer (1925-2006) est le plus grand romancier indonésien, né à Blora, à Java, emprisonné sous les Néerlandais, sous Sukarno puis sous Suharto. Détenu de 1965 à 1979, dont dix ans sur l'île de Buru, il y compose oralement la tétralogie de Buru, de « Bumi Manusia » (1980) à « Rumah Kaca » (1988), qui raconte l'éveil du nationalisme indonésien. Interdits en Indonésie sous Suharto, ses livres sont traduits dans plus de trente langues, et il meurt à Jakarta en 2006.",
  "wikipedia": "Pramoedya_Ananta_Toer",
  "essentiel": true,
  "portrait": {
   "fichier": "Pramoedya Ananta Toer, Pekan Buku Indonesia 1954, p214.jpg",
   "legende": "Pramoedya Ananta Toer, photographie de 1954"
  }
 }
]
```

## Règles appliquées

- **Disparus seulement** (la phrase d'ouverture exige une année de décès), **pas d'entrepreneurs**, **sportifs seulement s'ils ont marqué l'histoire** :
  aucun sportif indonésien n'est retenu (les badistes et boxeurs restent aux Biographies, ou attendent).
- **Dates avérées et image libre.** `✓` = dates relevées dans l'introduction de l'article de fr.wikipedia ; sans `✓`, dates tirées de ma mémoire,
  **à vérifier** sur l'article au moment de la rédaction.
- Six axes communs, pas de septième (« Économie et entreprise » exigerait six figures).
- Légende de la colonne **Portrait** : **A** = portrait net, taille correcte ; **B** = utilisable mais petit, ancien ou peu net ;
  **C** = image qui n'est pas un portrait (statue moderne, billet, timbre, œuvre) ; **0** = rien d'exploitable trouvé.

## Un risque transversal : le statut américain des images

Presque tous les portraits indonésiens sont étiquetés « domaine public » par un modèle de loi indonésienne (œuvre officielle, photographie ancienne, auteur
inconnu). `search_portraits.py` affiche alors **US ?** : c'est le cas qui a coûté huit figures à l'Amérique hispanique. Les exceptions sûres (**US oui**) :
Diponegoro (Rijksmuseum, CC0), Douwes Dekker, Imam Bonjol, Teuku Umar, Kartini, Hatta, Ali Sadikin, Mochtar Kusumaatmadja, Marie Thomas, Supomo (version Anefo).
**À trancher** : accepter les « ? » d'origine gouvernementale ou datés d'avant 1946, ou ne garder que les « oui » (le thème tomberait à une vingtaine de figures).
Je recommande la première voie, en gardant la liste des « ? » dans ce fichier, comme pour le Machrek.

## Chefs d'État et dirigeants (24 retenus + 4 fragiles)

| Figure | Dates | Portrait | Remarque |
|---|---|---|---|
| ⭐ Sukarno | 1901-1970 ✓ | A | 1949, domaine public ; fr : « Soekarno » |
| ⭐ Mohammad Hatta | 1902-1980 ✓ | A | 1950, CC BY 4.0, US oui |
| ⭐ Suharto | 1921-2008 ✓ | A | portrait officiel de 1968 |
| Sutan Sjahrir | 1909-1966 | A | photo de 1947 ; article fr à retrouver (« Soetan Sjahrir ») |
| Abdurrahman Wahid | 1940-2009 ✓ | A | |
| Hamengkubuwono IX | 1912-1988 ✓ | A | portrait officiel de 1973 |
| Adam Malik | 1917-1984 ✓ | A | |
| Mohammad Natsir | 1908-1993 ✓ | A | |
| Amir Sjarifuddin | 1907-1948 ✓ | A | CC BY-SA 3.0 NL |
| Tan Malaka | 1897-1949 ✓ | A | la naissance est parfois donnée en 1894 : à écrire comme « 1897 » en le disant |
| Agus Salim | 1884-1954 ✓ | A | |
| H. O. S. Tjokroaminoto | 1882-1934 ✓ | B | 427 × 629 |
| Ki Hajar Dewantara | 1889-1959 ✓ | A | photographie colorisée |
| Soetomo | 1888-1938 ✓ | B | 650 × 871, archives nationales ; fondateur de Budi Utomo |
| Ernest Douwes Dekker | 1879-1950 ✓ | A | indo-néerlandais ; son pays d'honneur est l'Indonésie (« Setiabudi ») ; US oui |
| Mohammad Husni Thamrin | 1894-1941 | A | article fr à retrouver |
| Sam Ratulangi | 1890-1949 ✓ | B | |
| Ali Sadikin | 1926-2008 ✓ | A | gouverneur de Jakarta ; US oui |
| Soepomo | 1903-1958 | A | 1951, CC0 ; juriste de la Constitution de 1945 ; article fr à vérifier |
| Iskandar Muda (Aceh) | 1583-1636 ✓ | C | tableau du domaine public, mais sa date et son auteur sont douteux |
| Sultan Agung (Mataram) | 1593-1645 | C | image CC BY-SA, sans doute un dessin moderne ; article fr à retrouver |
| Airlangga | v. 991-1049 | C | statue en Vishnu sur Garuda (musée de Trowulan), CC BY-SA ; dates approximatives |
| Raden Wijaya (Kertarajasa) | 1273-1309 | C | statue d'Harihara ; dates à vérifier |
| Gajah Mada | v. 1290-1364 | C | statue moderne imaginée ; **naissance incertaine** : à trancher, voir ci-dessous |
| *fragile* Hamengkubuwono Ier | 1717-1792 | B | une seule image, CC BY-SA 4.0 |
| *fragile* Djuanda Kartawidjaja | 1911-1963 ✓ | B | 221 × 297 ; déclaration de 1957 sur les eaux archipélagiques |
| *fragile* Sjafruddin Prawiranegara | 1911-1989 | B | 231 × 300 |
| *fragile* Achmad Soebardjo | 1896-1978 ✓ | B | 177 × 250 |

## Guerres et résistances (14 retenus + 9 fragiles)

| Figure | Dates | Portrait | Remarque |
|---|---|---|---|
| ⭐ Diponegoro | 1785-1855 ✓ | A | portrait d'A. J. Bik (1830), Rijksmuseum, CC0, US oui |
| ⭐ Sudirman | 1916-1950 | A | octobre 1950 ; fr : « Soedirman » |
| ⭐ Bung Tomo | 1920-1981 ✓ | A | |
| Tuanku Imam Bonjol | 1772-1864 | A | portrait de 1826 environ, US oui |
| Cut Nyak Dhien | 1848-1908 ✓ | C | l'image est le billet de 1998 (portrait officiel) |
| Teuku Umar | 1854-1899 | A | photographie vers 1890, US oui |
| Abdul Haris Nasution | 1918-2000 ✓ | A | |
| Ahmad Yani | 1922-1965 | A | |
| I Gusti Ngurah Rai | 1917-1946 ✓ | B | |
| Oerip Soemohardjo | 1893-1948 ✓ | A | |
| Untung Surapati | v. 1660-1706 ✓ | C | portrait officiel de 1975, imaginé ; dates approximatives |
| Arung Palakka | 1634-1696 ✓ | C | gravure de Romeyn de Hooghe (1669) |
| Pangeran Antasari | 1797-1862 | C | portrait du billet de 2 000 roupies ; **naissance disputée** (1797 ou 1809) |
| Munir Said Thalib | 1965-2004 ✓ | B | CC BY-SA 3.0 ; assassiné en 2004 |
| *fragile* Pattimura | 1783-1817 ✓ | C | timbres seuls : on ne connaît aucun portrait authentique |
| *fragile* Cut Meutia | 1870-1910 | B | |
| *fragile* Sisingamangaraja XII | 1845-1907 | C | billet / timbre |
| *fragile* Sultan Hasanuddin | 1631-1670 | B | 273 × 375 |
| *fragile* Martha Christina Tiahahu | 1800-1818 ✓ | C | timbre, portrait imaginé |
| *fragile* Nuku de Tidore | 1738-1805 | B | |
| *fragile* Trunajaya | 1649-1680 ✓ | C | détail d'un tableau |
| *fragile* Kartosuwiryo | 1905-1962 ✓ | B | 249 × 364 ; Darul Islam, figure à décrire avec prudence |
| *fragile* Frans Kaisiepo | 1921-1979 ✓ | C | timbre ; unique figure papoue |

## Littérature et pensée (15 retenus + 1 fragile)

| Figure | Dates | Portrait | Remarque |
|---|---|---|---|
| ⭐ Raden Ajeng Kartini | 1879-1904 ✓ | A | Tropenmuseum, US oui |
| ⭐ Pramoedya Ananta Toer | 1925-2006 ✓ | B | photo de 1954, 292 × 441 : à remplacer si mieux |
| Chairil Anwar | 1922-1949 ✓ | A | |
| Hamka | 1908-1981 ✓ | B | 200 × 267 |
| Dewi Sartika | 1884-1947 ✓ | B | 288 × 432 |
| Rasuna Said | 1910-1965 ✓ | A | |
| Hasyim Asy'ari | 1871-1947 ✓ | A | fondateur de Nahdlatul Ulama |
| Mohammad Yamin | 1903-1962 ✓ | A | Sumpah Pemuda de 1928 |
| Mochtar Lubis | 1922-2004 ✓ | A | CC0 |
| Sutan Takdir Alisjahbana | 1908-1994 | A | article fr absent sous ce titre |
| W. S. Rendra | 1935-2009 | A | CC0 (2008) ; article fr à retrouver |
| Sapardi Djoko Damono | 1940-2020 ✓ | B | |
| Marah Rusli | 1889-1968 | A | auteur de *Sitti Nurbaya* |
| Ranggawarsita | 1802-1873 | B | dessin du *Serat Condrorini* |
| Maria Walanda Maramis | 1872-1924 ✓ | C | timbre seul |
| *fragile* Ahmad Dahlan (Muhammadiyah) | 1868-1923 | C | timbres seuls |

## Beaux-arts (4 retenus, **axe maigre**)

| Figure | Dates | Portrait | Remarque |
|---|---|---|---|
| ⭐ Raden Saleh | v. 1811-1880 ✓ | A | autoportrait, domaine public |
| S. Sudjojono | 1913-1986 | B | 1943, revue *Djawa Baroe* |
| Basuki Abdullah | 1915-1993 | B | 1943, revue *Djawa Baroe* |
| Friedrich Silaban | 1912-1984 | B | architecte de la mosquée Istiqlal ; CC BY-SA 4.0 |

Sans image libre trouvée : Affandi (1907-1990, seules des photos de musée et un timbre), Hendra Gunawan, Lee Man Fong, Dullah, Nyoman Gunarsa,
I Gusti Nyoman Lempad (naissance vers 1862, de toute façon non avérée). **C'est l'axe le plus faible** : je propose de le laisser à 4 à 6 figures et de
chercher Affandi par son timbre de 1997 (403 × 663) ou par une photographie d'archive.

## Musique, spectacle et sport (9 retenus + 1 fragile)

| Figure | Dates | Portrait | Remarque |
|---|---|---|---|
| ⭐ Wage Rudolf Supratman | 1903-1938 ✓ | B | compositeur d'*Indonesia Raya* ; 231 × 314 |
| Ismail Marzuki | 1914-1958 ✓ | B | |
| Usmar Ismail | 1921-1971 ✓ | B | père du cinéma indonésien |
| Sjumandjaja | 1933-1985 ✓ | A | cinéaste |
| Benyamin Sueb | 1939-1995 ✓ | B | |
| Chrisye | 1949-2007 ✓ | B | 355 × 375 |
| Didi Kempot | 1966-2020 | B | |
| Ki Nartosabdho | 1925-1985 | A | maître du wayang kulit et du gamelan |
| Titiek Puspa | 1937-2025 | B | **décès à vérifier** (l'article ne le dit pas dans son introduction) |
| *fragile* Bing Slamet | 1927-1974 | B | l'image porte une alerte de licence |

Aucun sportif ni aucun film ou chanteur vivant (Christine Hakim, Iko Uwais, Anggun, Rhoma Irama, Iwan Fals, Joey Alexander…). Gesang
(*Bengawan Solo*, 1917-2010) n'a pas de portrait libre.

## Sciences, techniques et innovation (7 retenus + 2 fragiles, **axe maigre**)

| Figure | Dates | Portrait | Remarque |
|---|---|---|---|
| ⭐ B. J. Habibie | 1936-2019 ✓ | A | ingénieur aéronautique, puis président en 1998-1999 : **dimension dominante à trancher** (Sciences ou Chefs d'État) |
| Johannes Leimena | 1905-1977 ✓ | A | médecin et ministre |
| Sardjito | 1889-1970 | A | premier recteur de l'université Gadjah Mada ; article fr absent |
| Herman Johannes | 1912-1992 | B | physicien et recteur |
| Marie Thomas | 1896-1966 | A | première femme médecin d'Indonésie ; US oui |
| Mochtar Kusumaatmadja | 1929-2021 ✓ | A | juriste du droit de la mer (principe archipélagique) |
| Soedjatmoko | 1922-1989 | A | penseur du développement |
| *fragile* Roosseno Soerjohadikoesoemo | 1908-? | C | timbre de 2003 ; décès à vérifier |
| *fragile* Sutami | 1928-1980 | B | 171 × 236 |

## Écartés

- **Vivants** : Joko Widodo, Megawati, Susilo Bambang Yudhoyono, Prabowo Subianto, Sri Mulyani, Susi Pudjiastuti, Nadiem Makarim, Goenawan Mohamad,
  Andrea Hirata, Eka Kurniawan, Garin Nugroho, Christine Hakim, Iko Uwais, Anggun, Rhoma Irama, Iwan Fals, Joey Alexander, Waldjinah.
- **Sportifs de palmarès** (leurs records restent aux Biographies) : Rudy Hartono, Liem Swie King, Susy Susanti, Alan Budikusuma, Taufik Hidayat, Hendrawan,
  Greysia Polii, Ellyas Pical, Chris John, Eko Yuli Irawan, tous vivants de toute façon.
- **Entrepreneurs** : Liem Sioe Liong, Oei Tiong Ham, Mochtar Riady, Djamaluddin Malik (producteur et entrepreneur).
- **Dates non avérées** : Prapanca (auteur du *Nagarakertagama*, xive s.), Widji Thukul (disparu en 1998, décès inconnu), Hayam Wuruk (dates sûres,
  mais aucun portrait : seules des photographies de sa tombe).
- **Faute de portrait** : Kertanagara (la statue « Joko Dolog » n'a pas été retrouvée), Robert Wolter Monginsidi (tombe seule), Nurcholish Madjid,
  Soe Hok Gie, Y. B. Mangunwijaya (tombes), Gombloh (timbre), Idris Sardi, Soeharso (la recherche a échoué par un 429), Sedyatmo.
- **Pas indonésiens** : Multatuli (Pays-Bas), Walter Spies (Allemagne), Eugène Dubois (Pays-Bas), Raffles (à trancher avec le futur bloc malais).

## Points à trancher avec vous

1. **Statut américain** des images « ? » (voir plus haut) : on accepte celles d'origine gouvernementale, ou on ne garde que les « oui » ?
2. **Les figures fragiles** (image petite, timbre ou billet) : les garder pour atteindre une quarantaine de figures par axe fort, ou s'en tenir aux
   portraits A et B ? Avec A et B seuls, le thème compte 63 figures ; avec les C, 73 ; avec les fragiles, 90.
3. **Habibie** (tableau des Sciences pour l'instant) : Sciences, où il est célèbre comme ingénieur, ou Chefs d'État, où il a été président ?
4. **Gajah Mada et Antasari**, dont la naissance est incertaine : les garder en écrivant « vers » et en le disant, comme Ashoka, ou les écarter ?
5. **Les rois d'avant le xve siècle** (Airlangga, Raden Wijaya, Gajah Mada) n'ont pas de portrait d'époque : on accepte une statue, comme le relief de
   Sanchi pour Ashoka ?
6. **Axe « Beaux-arts »** : on le laisse maigre, ou on fusionne Beaux-arts avec « Musique, spectacle et sport » pour l'Indonésie ?

## Chiffres

114 candidats examinés. Retenus : 24 Chefs d'État, 14 Guerres, 15 Littérature, 4 Beaux-arts, 9 Musique, 7 Sciences, soit **73 figures** (dont 10 avec une image
qui n'est pas un portrait : statue, billet, gravure), plus 17 fragiles, soit **90** au plus. Avec les seuls portraits A et B, 63. Onze ⭐ proposés : Sukarno, Hatta,
Suharto, Diponegoro, Sudirman, Bung Tomo, Kartini, Pramoedya, Raden Saleh, Supratman, Habibie. Le thème est fort en politique et en résistance (52 % des figures), et faible
en arts et en sciences.
