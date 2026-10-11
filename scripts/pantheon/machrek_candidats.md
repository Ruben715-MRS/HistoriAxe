# Machrek et péninsule Arabique : liste de candidats

Document de travail, **à valider avant toute rédaction** (voir « Ajouter un pays ou un bloc » dans le README). Il ne contient pas de panthéon : aucune fiche n'est écrite, aucun portrait n'est téléchargé dans `assets/`.

## Ce qui a été vérifié, et ce qui ne l'a pas été

- **Existence d'un article Wikipédia en français** (le bouton de la fiche en a besoin) : environ 220 titres testés, 36 introuvables à la première passe (voir plus bas).
- **Années de naissance et de décès** d'après Wikidata, pas encore recoupées avec la phrase d'ouverture de l'article (règle du README).
- **Image principale sur Commons** : taille, licence (liste du README : domaine public, CC0, CC BY, CC BY-SA) et modèles de licence, pour juger si elle est aussi libre aux États-Unis.
- **Coup d'œil sur 133 portraits** (planches de vignettes) : l'image est-elle bien celle de la personne, ou une monnaie, une tombe, une calligraphie ?
- **Non vérifié** : le dernier lot (Beaux-arts, sciences, Golfe : Karimeh Abbud, Shahbandar, Khalifa ben Zayed, Maktoum, Zaynab Fawwaz, Moussa Sadr, Ibn Butlan, al-Masudi) a été contrôlé par les métadonnées seulement, sans regarder l'image. Aucune année n'a été relue sur Wikipédia. `fetch_portraits.py` refera de toute façon le contrôle de licence page par page.

## Périmètre proposé

- **Nom** : « Grandes figures du Machrek et de la péninsule Arabique », code `machrek` (le thème serait `pan_machrek`).
- **Pays** (codes ISO) : Liban `LB`, Syrie `SY`, Irak `IQ`, Jordanie `JO`, Palestine `PS`, Arabie saoudite `SA`, Yémen `YE`, Oman `OM`, Émirats `AE`, Koweït `KW`, Qatar `QA`, Bahreïn `BH`. Dans cette liste, ni Qatar ni Bahreïn n'ont de figure avec portrait libre : ils ne figurent que pour mémoire.
- **Hors périmètre** : l'Égypte (elle a son thème), la Turquie et l'Iran (thèmes à part), la Libye (déjà au Maghreb).
- **Mots-clés de recherche** à prévoir : Proche-Orient, Moyen-Orient, Levant, Mésopotamie, Phénicie, Golfe, Arabie, Hedjaz, Palmyre, Babylone, Assyrie, Bagdad, Damas, Beyrouth, Jérusalem, et les noms des douze pays.

## Décisions prises

1. **Israël et les figures juives : un thème à part.** Ce bloc n'en contient aucune. Nom et périmètre du thème restent à définir (voir le README).
2. **Les figures de l'Antiquité** (Hammurabi, Assurbanipal, Odénat, Philippe l'Arabe, Julia Domna, Héliogabale, Sévère Alexandre, Apollodore) **sont gardées**, rangées dans le pays actuel de leur lieu de naissance, comme Carthage au Maghreb. Ce n'est pas parfait (Babylone n'est pas « l'Irak »), mais le champ `pays` est obligatoire dans un bloc, la fiche donne le nom du lieu d'époque, et c'est la seule règle qui ne demande pas de jugement cas par cas. Zénobie et Al-Mansur n'y entrent que si une date de naissance s'établit.
3. **Pas de portrait, pas de carte, sauf illustration, même imaginaire.** Cela vaut pour Mahomet et les premiers califes comme pour tous : une miniature ou une gravure légendée comme telle suffit. Conséquence immédiate : la miniature byzantine d'Al-Ma'mun, que j'avais écartée, passe en statut C. Pour Mahomet, les miniatures qui existent montrent le plus souvent le visage voilé ; on les examinera au moment de la recherche d'images, sans rien promettre.
4. **Les figures très contestées sont ajoutées**, avec leur fiche honnête (Saddam Hussein, Hafez el-Assad, le Mufti de Jérusalem, Habache, Abou Jihad, Arafat, Béchir Gemayel).
5. **Pas de remplissage.** Les chefs d'État restent nombreux et les Beaux-arts minces : on ne coupe personne pour équilibrer, on n'ajoute personne qui n'aurait pas sa place. Les axes minces sont acceptés, comme au Maghreb (2 Beaux-arts, 3 Sciences).
6. **Wahhab est écarté** : sa seule image libre est une calligraphie.

## Les chiffres

**97 candidats avec une image utilisable** (51 en A, 26 en B, 20 en C : voir plus bas).

| Axe | Candidats |
|---|---|
| Chefs d'État et dirigeants | 42 |
| Guerres et résistances | 11 |
| Littérature et pensée | 32 |
| Beaux-arts | 2 |
| Musique, spectacle et sport | 4 |
| Sciences, techniques et innovation | 6 |

| Pays | Candidats |
|---|---|
| Liban | 24 |
| Syrie | 22 |
| Irak | 18 |
| Palestine | 14 |
| Arabie saoudite | 8 |
| Yémen | 3 |
| Jordanie | 3 |
| Koweït | 2 |
| Émirats | 2 |
| Oman | 1 |

Le Liban pèse 24 % : sous le seuil de 40 % du constructeur.

**Équilibre.** Le bloc est un bloc de dirigeants et d'écrivains, et on l'accepte (décision 5). Les trois axes minces le sont pour des raisons d'images ou d'articles :
- **Beaux-arts : 2** (Apollodore de Damas, Karimeh Abbud). Les peintres et sculpteurs libanais, irakiens et syriens n'ont pas d'article en français, pas d'image libre, ou les deux. Zaha Hadid, qui aurait sa place ici, est en « à chercher ».
- **Musique, spectacle et sport : 4**. Fairuz est vivante (exclue par la règle), Asmahan et Wadih el-Safi sont à rechercher. Le sport n'a aucun candidat.
- **Sciences : 6**, dont cinq en C (images imaginaires).

## Légende des statuts

- **A** : image qui montre bien la personne, taille suffisante (300 px au plus petit côté), licence de la liste **et** modèle américain ou CC (libre aussi aux États-Unis).
- **B** : même chose, mais seule la loi du pays est citée (PD-Irak, PD-Syrie, PD-Arabie saoudite, PD-Liban, PD-Jordanie…). C'est exactement le cas des photographies argentines et cubaines qui avaient coûté huit figures à l'Amérique hispanique : **à confirmer avant de rédiger la fiche**.
- **C** : image faible (monnaie, dessin imaginaire, statue, miniature, ou à peine 290 px). Possible avec une légende qui le dit, comme pour l'Égypte ancienne, mais à remplacer si mieux apparaît.

Les années sont celles de Wikidata ; **celles des personnages qui ont une biographie dans l'appli doivent reprendre la date de la biographie** (voir plus bas).

## Chefs d'État et dirigeants

| Nom | Pays | Vie | Image | Statut | Remarque |
|---|---|---|---|---|---|
| Julia Domna | Syrie | 165 – 217 | 2245 × 2500, Public domain | A | née à Émèse (Homs) |
| Héliogabale | Syrie | 203 – 222 | 3079 × 4787, CC BY-SA 2.0 | A | né à Émèse ; titre fr. « Héliogabale » |
| Philippe l'Arabe | Syrie | 204 – 249 | 3702 × 3623, CC BY-SA 4.0 | A | né à Shahba (Syrie) |
| Sévère Alexandre | Liban | 208 – 235 | 1950 × 2600, Public domain | A | né à Arqa (Liban) |
| Fakhreddine II | Liban | 1572 – 1635 | 579 × 705, CC BY-SA 3.0 | A | peinture ; 1572 |
| Zahir al-Umar | Palestine | 1689 – 1775 | 601 × 801, CC BY-SA 3.0 | A | gravure ; Galilée |
| Moubarak Al-Sabah | Koweït | 1844 – 1915 | 693 × 842, Public domain | A |  |
| Hussein ben Ali (chérif de La Mecque) | Arabie saoudite | 1853 – 1931 | 852 × 1200, Public domain | A | né à Constantinople ; Arabie ou Jordanie, à trancher |
| Imam Yahya | Yémen | 1869 – 1948 | 871 × 1089, Public domain | A |  |
| Abdallah Ier de Jordanie | Jordanie | 1882 – 1951 | 1024 × 1301, Public domain | A |  |
| Mohammed Amin al-Husseini | Palestine | 1895 – 1974 | 1317 × 1752, Public domain | A | figure très contestée (collaboration avec l’Axe) : la fiche doit le dire |
| Camille Chamoun | Liban | 1900 – 1987 | 975 × 1365, Public domain | A |  |
| Fouad Chéhab | Liban | 1902 – 1973 | 595 × 808, Public domain | A |  |
| Kamal Joumblatt | Liban | 1917 – 1977 | 465 × 685, Public domain | A |  |
| Abdallah ben Abdelaziz Al Saoud | Arabie saoudite | 1924 – 2015 | 648 × 848, Public domain | A |  |
| Jaber al-Ahmad al-Jaber al-Sabah | Koweït | 1926 – 2006 | 1284 × 1878, CC BY-SA 4.0 | A |  |
| Yasser Arafat | Palestine | 1929 – 2004 | 1380 × 2007, CC BY 4.0 | A | né au Caire ; figure contestée |
| Hussein de Jordanie | Jordanie | 1935 – 1999 | 1378 × 1880, Public domain | A |  |
| Qabus ibn Saïd | Oman | 1940 – 2020 | 1157 × 1579, Public domain | A |  |
| Ibrahim al-Hamdi | Yémen | 1943 – 1977 | 719 × 868, Public domain | A |  |
| Rafiq Hariri | Liban | 1944 – 2005 | 968 × 1259, CC BY 4.0 | A |  |
| Ali Abdallah Saleh | Yémen | 1947 – 2017 | 1220 × 1627, CC BY 4.0 | A |  |
| Béchir Gemayel | Liban | 1947 – 1982 | 755 × 973, CC BY 3.0 | A | assassiné avant son investiture ; Sabra et Chatila ont suivi sa mort |
| Khalifa ben Zayed Al Nahyane | Émirats | 1948 – 2022 | 532 × 516, CC BY-SA 2.5 | A |  |
| Ibn Saoud | Arabie saoudite | 1876 – 1953 | 1411 × 1802, Public domain | B |  |
| Nouri Saïd | Irak | 1888 – 1958 | 746 × 921, Public domain | B |  |
| Fayçal ben Abdelaziz Al Saoud | Arabie saoudite | 1906 – 1975 | 768 × 945, Public domain | B |  |
| Khaled ben Abdelaziz Al Saoud | Arabie saoudite | 1911 – 1982 | 1124 × 1532, Public domain | B |  |
| Ghazi Ier | Irak | 1912 – 1939 | 340 × 440, Public domain | B |  |
| Abdel Karim Kassem | Irak | 1914 – 1963 | 516 × 696, Public domain | B |  |
| Ahmed Hassan al-Bakr | Irak | 1914 – 1982 | 640 × 843, Public domain | B |  |
| Fahd ben Abdelaziz Al Saoud | Arabie saoudite | 1921 – 2005 | 632 × 794, Public domain | B |  |
| Hafez el-Assad | Syrie | 1930 – 2000 | 852 × 1200, Public domain | B | figure très contestée (Hama, 1982) : la fiche doit le dire |
| Fayçal II | Irak | 1935 – 1958 | 536 × 640, Public domain | B |  |
| Saddam Hussein | Irak | 1937 – 2006 | 900 × 1188, Public domain | B | figure très contestée : la fiche doit le dire |
| Maktoum ben Rachid Al Maktoum | Émirats | 1943 – 2006 | 672 × 853, domaine public (PD-UAE) | B |  |
| Hammurabi | Irak | -1810 – -1750 | 3170 × 3500, CC BY 3.0 | C | une stèle (le roi devant Shamash) tient lieu de portrait ; date « vers 1810 » (fr) |
| Assurbanipal | Irak | -685 – -631 | 2048 × 1361, CC BY-SA 4.0 | C | bas-relief de chasse au lion, détail |
| Mu'awiya Ier | Arabie saoudite | 603 – 680 | 800 × 392, CC BY-SA 3.0 | C | seulement une monnaie ; né à La Mecque |
| Abd al-Malik ibn Marwan | Arabie saoudite | 646 – 705 | 1173 × 1161, Public domain | C | seulement un dinar d’or ; né à Médine |
| Bachir Chehab II | Liban | 1767 – 1850 | 287 × 401, Public domain | C | 287 × 401 px |
| Wasfi al-Tal | Jordanie | 1919 – 1971 | 550 × 439, Public domain | C | seule image : photographie de groupe |

## Guerres et résistances

| Nom | Pays | Vie | Image | Statut | Remarque |
|---|---|---|---|---|---|
| Odénat | Syrie | 220 – 267 | 447 × 700, Public domain | A | buste dont l’identification est traditionnelle |
| Youssef Karam | Liban | 1823 – 1923 | 400 × 550, CC BY-SA 4.0 | A |  |
| Abd al-Rahman Shahbandar | Syrie | 1880 – 1940 | 600 × 934, domaine public (+ CC BY-SA) | A |  |
| Izz al-Din al-Qassam | Palestine | 1882 – 1935 | 590 × 730, Public domain | A |  |
| Saleh al-Ali | Syrie | 1883 – 1950 | 433 × 452, Public domain | B |  |
| Sultan al-Atrash | Syrie | 1891 – 1982 | 307 × 450, Public domain | B |  |
| Mustafa Barzani | Irak | 1903 – 1979 | 506 × 720, Public domain | B | kurde d’Irak ; né à Barzan |
| George Habache | Palestine | 1926 – 2008 | 385 × 500, Public domain | B | chef du FPLP (détournements) : figure contestée |
| Abou Jihad | Palestine | 1935 – 1988 | 500 × 643, Public domain | B | chef militaire du Fatah : figure contestée ; photographie avec un autre homme |
| Youssef al-Azmeh | Syrie | 1884 – 1920 | 293 × 450, Public domain | C | 293 × 450 px |
| Abdel Kader al-Husseini | Palestine | 1908 – 1948 | 296 × 448, Public domain | C | 296 × 448 px |

## Littérature et pensée

| Nom | Pays | Vie | Image | Statut | Remarque |
|---|---|---|---|---|---|
| Jean Damascène | Syrie | 675 – 749 | 440 × 600, Public domain | A | icône |
| Nassif al-Yazigi | Liban | 1800 – 1871 | 630 × 839, Public domain | A |  |
| Boutros al-Boustani | Liban | 1819 – 1883 | 720 × 924, Public domain | A |  |
| Charbel Makhlouf | Liban | 1828 – 1898 | 419 × 595, Public domain | A | saint maronite ; image pieuse |
| Rafqa | Liban | 1832 – 1914 | 1154 × 1545, CC BY-SA 4.0 | A | sainte maronite ; image pieuse |
| Jorge Zaydan | Liban | 1861 – 1914 | 396 × 600, CC0 | A |  |
| Rashid Rida | Liban | 1865 – 1935 | 501 × 657, Public domain | A |  |
| Muhammad Kurd Ali | Syrie | 1876 – 1953 | 1129 × 1587, CC BY 4.0 | A |  |
| Amin al-Rihani | Liban | 1876 – 1940 | 306 × 450, Public domain | A |  |
| Khalil Sakakini | Palestine | 1878 – 1953 | 500 × 754, CC BY-SA 3.0 | A |  |
| Antoun Saadé | Liban | 1904 – 1949 | 694 × 825, Public domain | A | fondateur du Parti social nationaliste syrien : figure contestée |
| Charles Malik | Liban | 1906 – 1987 | 1871 × 2359, Public domain | A | né à Bterram ; rédacteur de la Déclaration universelle (ONU), image de l’ONU |
| Michel Aflak | Syrie | 1910 – 1989 | 789 × 1110, CC BY-SA 3.0 nl | A |  |
| Saïd Akl | Liban | 1911 – 2014 | 635 × 810, CC BY-SA 4.0 | A |  |
| Émile Habibi | Palestine | 1922 – 1996 | 2052 × 3066, Public domain | A |  |
| Edward Said | Palestine | 1935 – 2003 | 559 × 745, CC0 | A |  |
| Samih al-Qasim | Palestine | 1939 – 2014 | 3072 × 2304, Public domain | A |  |
| Mahmoud Darwich | Palestine | 1941 – 2008 | 384 × 474, CC BY-SA 3.0 | A |  |
| Zaynab Fawwaz | Liban | 1844 – 1914 | 662 × 939, domaine public (PD-Liban) | B |  |
| Abd al-Rahman al-Kawakibi | Syrie | 1855 – 1902 | 417 × 540, Public domain | B |  |
| Zaki al-Arsouzi | Syrie | 1899 – 1968 | 769 × 986, Public domain | B |  |
| Salah al-Din al-Bitar | Syrie | 1912 – 1980 | 443 × 480, Public domain | B |  |
| Ali al-Wardi | Irak | 1913 – 1995 | 354 × 494, Public domain | B |  |
| Nizar Qabbani | Syrie | 1923 – 1998 | 313 × 400, Public domain | B |  |
| Badr Shakir al-Sayyab | Irak | 1926 – 1964 | 500 × 611, Public domain | B |  |
| Moussa Sadr | Liban | 1928 – 1978 | 585 × 846, domaine public (PD-Liban) | B | né à Qom, disparu en Libye en 1978 : « décès » = disparition |
| Abu Nuwas | Irak | 756 – 814 | 833 × 1063, Public domain | C | dessin moderne d’un portrait imaginaire ; né à Ahvaz (Iran), honoré à Bagdad |
| Al-Mutanabbi | Irak | 920 – 965 | 388 × 557, Public domain | C | dessin de Khalil Gibran (portrait imaginaire) |
| Al-Maari | Syrie | 973 – 1057 | 362 × 565, Public domain | C | dessin de Khalil Gibran (portrait imaginaire) ; titre fr. « Abou al-Alaa al-Maari » |
| Oussama Ibn Mounqidh | Syrie | 1095 – 1188 | 909 × 665, Public domain | C | dessin moderne |
| Nazik al-Malaika | Irak | 1922 – 2007 | 960 × 1280, CC BY-SA 4.0 | C | statue |
| Shireen Abu Akleh | Palestine | 1971 – 2022 | 3936 × 5511, CC BY-SA 4.0 | C | tuée en 2022 : très récente et très contestée, à trancher |

## Beaux-arts

| Nom | Pays | Vie | Image | Statut | Remarque |
|---|---|---|---|---|---|
| Apollodore de Damas | Syrie | 50 – 125 | 1920 × 2560, CC BY-SA 3.0 | A | hermès du Glyptothek, identification traditionnelle |
| Karimeh Abbud | Palestine | 1893 – 1955 | 316 × 516, domaine public (PD-old) | A | photographe de Nazareth ; vérifier que l’image est bien son portrait |

## Musique, spectacle et sport

| Nom | Pays | Vie | Image | Statut | Remarque |
|---|---|---|---|---|---|
| Farid El Atrache | Syrie | 1917 – 1974 | 600 × 710, CC BY-SA 3.0 | A |  |
| Mansour Rahbani | Liban | 1925 – 2009 | 399 × 500, CC BY-SA 4.0 | A |  |
| Sabah Fakhri | Syrie | 1933 – 2021 | 1250 × 1356, Public domain | B |  |
| Sabah (chanteuse) | Liban | 1927 – 2014 | 1280 × 960, Public domain | C | photographie ordinaire de 2007, la qualité est faible |

## Sciences, techniques et innovation

| Nom | Pays | Vie | Image | Statut | Remarque |
|---|---|---|---|---|---|
| Ibn al-Haytham | Irak | 965 – 1038 | 1079 × 1259, Public domain | A | gravure ; biographie liée (965) |
| Hunayn ibn Ishaq | Irak | 808 – 873 | 400 × 354, Public domain | C | lettrine enluminée médiévale |
| Qusta ibn Luqa | Liban | 820 – 912 | 503 × 577, Public domain | C | dessin moderne |
| Al-Masudi | Irak | 896 – 957 | 2952 × 5220, CC BY-SA 4.0 (statue de façade, Vienne) | C | statue de façade du musée d’histoire naturelle de Vienne |
| Ibn Butlan | Irak | 1001 – 1066 | 2630 × 2890, domaine public (miniature) | C | miniature du Tacuinum |
| Taqi al-Din | Syrie | 1526 – 1580 | 1348 × 1965, Public domain | C | miniature de l’observatoire d’Istanbul, où il figure parmi d’autres |

## Images à chercher à la main (importants, mais sans image convenable)

- **Hâroun ar-Rachîd** (Irak, Chefs d'État et dirigeants) : la miniature trouvée montre un jeune archer, pas le calife ; biographie liée, date 763 (né à Rayy, en Iran).
- **Saladin** (Irak, Guerres et résistances) : seulement une monnaie ; biographie liée, date 1137. Un portrait de convention du XIXe siècle serait honnête s’il est légendé comme tel.
- **Khalid ibn al-Walid** (Arabie saoudite, Guerres et résistances) : seul un dessin imaginaire, sous modèle « Not-PD-US » ; biographie liée, date 592.
- **Khalil Gibran** (Liban, Littérature et pensée) : seule image trouvée : 274 × 379 px. La photographie de Fred Holland Day (1898) existe en grand format.
- **Ghassan Kanafani** (Palestine, Littérature et pensée) : photographie sous modèle « Not-PD-US » (rétablie aux États-Unis).
- **Zaha Hadid** (Irak, Beaux-arts) : photographie sous Free Art License, hors liste ; une image CC BY ou CC BY-SA est à chercher ; biographie liée, date 1950.
- **Fairuz** (Liban, Musique, spectacle et sport) : EXCLUE : vivante (la règle du panthéon exige un décès). Sa biographie reste en Biographies.
- **Asmahan** (Syrie, Musique, spectacle et sport) : photographie sous modèle « Not-PD-US ».

**Sans image libre trouvée** (aucun fichier principal sur la page française) : Hiram Ier de Tyr, Ibn Asakir, Abou al-Fida, Ibn al-Athir, Samir Kassir, Hanna Mina, Mohammed al-Maghout, Saadallah Wannous, Jabra Ibrahim Jabra, Ghazi Al-Gosaibi, Abdel Rahman Mounif, Mustafa Akkad, Ziriab, Salima Mourad, Mohammed ibn Saoud, Yaqout al-Hamawi, Thabit ibn Qurra, Georges Nasser, Saloua Raouda Choucair, Paul Guiragossian.

**Sans article en français, ou titre non retrouvé** : Zénobie et Al-Mansur (leur page française ne donne aucune année de naissance, ce que le format exige), Ibrahim Hananu, Jawad Selim, Mohamed Makiya, Daoud Corm, Omar Onsi, Moustapha Farroukh, Fateh Moudarres, Ismail Shammout, Nazem al-Ghazali, Maruf al-Rusafi, Jamil Sidqi al-Zahawi, Mohammed Mahdi al-Jawahiri, Mohammad Baqir al-Sadr, Mustafa Wahbi Tal (Arar), Abdallah al-Baradouni, Al-Khansa, Antara ibn Chaddad, Imrou l-Qays, Al-Hamdani, al-Shawkani, Ahmad ibn Majid (qui a pourtant une biographie dans l'appli), Hassan Kamel al-Sabbah, Omar Abou Richa, Jassim ben Mohammed Al Thani, Moubarak Ier, Saïd ben Taïmour, Ahmed ben Saïd d'Oman, Zayed Ier. Une partie vient sans doute de titres français mal devinés : **à relancer avec une recherche plus fine** avant de les déclarer perdus. Zénobie, Al-Mansur et Ahmad ibn Majid sont les plus importants.

## Écartés pour l'image

Nabuchodonosor II (un cylindre inscrit), Al-Ma'mun (miniature d'un envoi d'ambassadeur), Nur ad-Din (164 × 194 px), Arwa al-Sulayhi (son mausolée), Muhammad ibn Abd al-Wahhab (une calligraphie), Choukri al-Kouwatli (photographie indienne de 1957, non libre aux États-Unis), Fares al-Khoury (251 px), Al-Jahiz (un timbre), Rabia al-Adawiyya (miniature d'une femme qui pile, pas elle ; biographie liée, date 717), Nadia Tuéni (une salle de conférences), Gebrane Tuéni (70 × 93 px), Fadwa Touqan (une plaque de rue), Ibrahim Touqan (230 px), Naji al-Ali (un graffiti), Louay Kayyali (aucune image), Rifat Chadirji, Etel Adnan, Assi Rahbani, Munir Bashir, Wadih el-Safi (images de moins de 270 px), Al-Kindi, Ibn al-Nafis (images de 200 px), Banou Moussa (un dessin d'appareil), Al-Muqaddasi (une vue de Jérusalem), Ahmed Zaki Yamani (161 px), Fayçal Ier d'Irak (« Not-PD-US-URAA »), Zayed ben Sultan et Rachid ben Saïd (images de 160 à 225 px), Abdallah al-Salim al-Sabah (« Not-PD-US »), Riad El Solh (244 px), Al-Hariri (miniature d'une scène), Hasan al-Basri (calligraphie), Mikhail Naimy (un mausolée), Sati al-Husri (262 px), Michael Atiyah et Michael DeBakey (hors périmètre : britannique et américain).

## Dates à aligner avec les biographies déjà dans l'appli

Huit figures de ce périmètre ont une biographie. Leur naissance doit porter **la même date** que la biographie (règle « une personne ne naît pas deux fois »). Wikidata, lui, n'est pas toujours d'accord :

| Personne | Date de la biographie | Wikidata | Remarque |
|---|---|---|---|
| Harun al-Rashid | 763 (Rayy, Perse) | 766 | né en Iran : à ranger peut-être dans le futur thème de l’Iran |
| Khalid ibn al-Walid | 592 | 586 | portrait à trouver |
| Saladin | 1137 | 1138 |  |
| Rabia al-Adawiyya | 717 | 710 | image à trouver |
| Ibn al-Haytham | 965 | 965 | concordant |
| Zaha Hadid | 1950 | 1950 | concordant ; image à trouver |
| Ahmad ibn Majid | 1432 (Julfar) | — | article fr à retrouver |
| Fairuz | 1934 | 1935 | vivante, exclue |

## Suite proposée

1. Trancher les six décisions ci-dessus.
2. Retrouver les titres français des noms « introuvables » et refaire une passe d'images sur les axes minces (Beaux-arts, Musique, Sciences).
3. Confirmer le statut américain des images en B (c'est la partie qui a coûté le plus cher à l'Amérique hispanique).
4. Constituer la liste définitive (cible : 80 à 100), puis suivre « Ajouter un pays ou un bloc » : `scripts/pantheon/machrek.json`, `scripts/pantheon_classement.py --write`, `scripts/fetch_portraits.py machrek`, `scripts/build_pantheon.py machrek`, version de `sw.js`, tests.
