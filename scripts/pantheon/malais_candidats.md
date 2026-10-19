# Monde malais (Malaisie, Singapour, Brunei, Timor oriental) : candidats examinés

> **État** : le thème `pan_malais` est construit (32 figures ; voir « Un bloc : le monde malais » dans `docs/personnages-illustres.md`). Ce fichier garde la recherche préalable, qui a précédé la liste finale (`scripts/pantheon/malais.json`), et une fiche en attente de portrait. Pour chaque candidat disparu, on a cherché l'article de Wikipédia en français (lien interlangue de la page anglaise). Les portraits restent à chercher.
> Aucun doublon avec les panthéons existants (Raffles, Tan Kah Kee, Saloma ne sont dans aucun).

## Avec article en français (37)

| Pays | Figure | Titre fr.wikipedia |
|---|---|---|
| Malaisie | Tunku Abdul Rahman | `Tunku_Abdul_Rahman` |
| Malaisie | Abdul Razak Hussein | `Abdul_Razak` |
| Malaisie | Hussein Onn | `Hussein_Onn` |
| Malaisie | Abdullah Ahmad Badawi | `Abdullah_Ahmad_Badawi` |
| Malaisie | Tan Cheng Lock | `Tan_Cheng_Lock` |
| Malaisie | Fuad Stephens | `Fuad_Stephens` |
| Malaisie | Mustapha Harun | `Mustapha_Harun` |
| Malaisie | Azlan Shah of Perak | `Azlan_Muhibuddin_Shah` |
| Malaisie | P. Ramlee | `P._Ramlee` |
| Malaisie | Yasmin Ahmad | `Yasmin_Ahmad` |
| Malaisie | Saloma | `Saloma` |
| Malaisie | Shahnon Ahmad | `Shahnon_Ahmad` |
| Malaisie | Abdullah bin Abdul Kadir | `Abdullah_bin_Abdul_Kadir` |
| Malaisie | Ungku Abdul Aziz | `Ungku_Abdul_Aziz` |
| Malaisie | Nik Abdul Aziz Nik Mat | `Nik_Abdul_Aziz_Nik_Mat` |
| Malaisie | Tuanku Abdul Rahman | `Abdul_Rahman_(roi_de_Malaisie)` |
| Singapour | Stamford Raffles | `Thomas_Stamford_Raffles` |
| Singapour | Lee Kuan Yew | `Lee_Kuan_Yew` |
| Singapour | Yusof Ishak | `Yusof_Ishak` |
| Singapour | C. V. Devan Nair | `Devan_Nair` |
| Singapour | David Saul Marshall | `David_Marshall_(homme_politique_singapourien)` |
| Singapour | Toh Chin Chye | `Toh_Chin_Chye` |
| Singapour | Ong Teng Cheong | `Ong_Teng_Cheong` |
| Singapour | Tan Kah Kee | `Tan_Kah_Kee` |
| Singapour | Lim Bo Seng | `Lim_Bo_Seng` |
| Singapour | Zubir Said | `Zubir_Said` |
| Singapour | Georgette Chen | `Georgette_Chen` |
| Singapour | Wee Kim Wee | `Wee_Kim_Wee` |
| Singapour | S. R. Nathan | `Sellapan_Ramanathan` |
| Singapour | Benjamin Sheares | `Benjamin_Henry_Sheares` |
| Brunei | Omar Ali Saifuddien III | `Omar_Ali_Saifuddien_III` |
| Brunei | Hashim Jalilul Alam Aqamaddin | `Hashim_Jalilul_Alam_Aqamaddin` |
| Brunei | Muhammad Hasan of Brunei | `Muhammad_Hassan_(Brunei)` |
| Brunei | Omar Ali Saifuddin II | `Omar_Ali_Saifuddin_II` |
| Timor oriental | Nicolau Lobato | `Nicolau_dos_Reis_Lobato` |
| Timor oriental | Francisco Xavier do Amaral | `Francisco_Xavier_do_Amaral` |
| Timor oriental | Konis Santana | `Nino_Konis_Santana` |

## Sans article en français (écartés)

Tan Siew Sin (Malaisie), V. T. Sambanthan (Malaisie), Ismail Abdul Rahman (Malaisie), Onn Jaafar (Malaisie), Mat Salleh (Malaisie), Tok Janggut (Malaisie), Dato' Bahaman (Malaisie), Abu Bakar of Johor (Malaisie), Sudirman Arshad (Malaisie), Usman Awang (Malaisie), Za'ba (Malaisie), Syed Sheikh al-Hadi (Malaisie), Ibrahim Hussein (painter) (Malaisie), Syed Ahmad Jamal (Malaisie), Lim Chong Eu (Malaisie), Lim Lian Geok (Malaisie), Ibrahim Yaacob (Malaisie), Burhanuddin al-Helmi (Malaisie), Ahmad Boestamam (Malaisie), Ishak Haji Muhammad (Malaisie), Chin Peng (Malaisie), Fadzil Noor (Malaisie), Karpal Singh (Malaisie), Mohamed Suffian Mohamed Hashim (Malaisie), Goh Keng Swee (Singapour), S. Rajaratnam (Singapour), Lim Yew Hock (Singapour), Elizabeth Choy (Singapour), Hussein Shah of Johor (Singapour), Lim Boon Keng (Singapour), Eu Tong Sen (Singapour), Tan Howe Liang (Singapour), Cheong Soo Pieng (Singapour), Tan Tock Seng (Singapour), Tan Kim Seng (Singapour), Lim Chin Siong (Singapour), Ahmad Ibrahim (politician) (Singapour), Eunos Abdullah (Singapour), Tan Jiak Kim (Singapour), Bolkiah, Sultan of Brunei (Brunei), Abdul Momin of Brunei (Brunei), Dom Boaventura (Timor oriental), Martinho da Costa Lopes (Timor oriental), Liu Kang (la page anglaise est le personnage de jeu vidéo) (Singapour), Sebastião Gomes (Timor oriental).

## Fiche rédigée, portrait non téléchargé : Fernando Sylvan

La fiche est écrite et le fichier Commons choisi (domaine public), mais Wikimedia répond 429 à toute requête sur ce fichier depuis cet environnement. Pour la réintégrer : recopier l'objet dans
`personnages` de `scripts/pantheon/malais.json`, lancer `python3 scripts/fetch_portraits.py malais --only sylvan`, écrire `classement` (`python3 scripts/pantheon_classement.py --write malais`), puis
`python3 scripts/build_pantheon.py malais`, `npm run build:pack` et les compteurs (tests de la galerie et du mode « Qui est-ce ? », `js/i18n.js`, `sw.js`).

```json
[
 {
  "slug": "sylvan",
  "nom": "Fernando Sylvan",
  "classement": "Sylvan, Fernando",
  "titre": "Naissance de Fernando Sylvan",
  "axe": "Littérature et pensée",
  "naissance": 1917,
  "pays": "TL",
  "description": "Fernando Sylvan (1917-1993) est un écrivain, poète et essayiste timorais, né à Dili et mort à Cascais, au Portugal, où il passe presque toute sa vie. Éloigné de son île, il y puise pourtant son inspiration, en écrivant en portugais sur les traditions, les légendes et le folklore du Timor. Il est l'une des grandes voix littéraires du Timor oriental.",
  "wikipedia": "Fernando_Sylvan",
  "portrait": {
   "fichier": "Fernando Sylvan (in 'Perspectiva de Nação Portuguesa', 1965).png",
   "legende": "Fernando Sylvan, photographie de 1965"
  }
 }
]
```
