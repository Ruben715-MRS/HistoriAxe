#!/usr/bin/env python3
"""Propose le « nom de classement » de chaque personnage d'un panthéon.

    python3 scripts/pantheon_classement.py             # liste ce qui serait écrit
    python3 scripts/pantheon_classement.py --write     # l'écrit dans scripts/pantheon/*.json
    python3 scripts/pantheon_classement.py --write fr  # un seul panthéon

Le champ `classement` d'un personnage dit sous quelle entrée on le range quand la
galerie trie « par nom de famille » : « Hugo, Victor », « Gaulle, Charles de »,
« Louis XIV ». Il sert à TRIER et à choisir l'initiale d'un intertitre ; il ne
s'affiche jamais sur une carte (la carte garde le nom tel qu'on le dit).

Une règle générale suffit pour la grande majorité des noms (« Prénom Nom » →
« Nom, Prénom », les particules en minuscules passant à la fin : « de Gaulle » →
« Gaulle, Charles de »). Le reste — souverains et saints qu'on range par leur
prénom, noms arabes à article, surnoms, doubles noms espagnols — est écrit une à
une dans EXCEPTIONS ci-dessous, parce qu'aucune règle ne le devine. Un nouveau
panthéon se passe d'abord ici ; ce qui sort étonnant s'ajoute à EXCEPTIONS.

Ce script ne touche qu'aux champs `classement` : les autres champs d'une source
sont réécrits tels quels (même indentation, même ordre).
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SOURCES = os.path.join(ROOT, 'scripts', 'pantheon')

# Particules qui se rangent après le prénom quand elles sont en minuscules.
LOWER_PARTICLES = {'de', 'du', 'des', "d'", 'von', 'van', 'der', 'den', 'da', 'di', 'del', 'della', 'dos', 'das', 'zu'}
# Numéral de règne : un souverain se range par son prénom (« Louis XIV »).
REGNAL = re.compile(r'^(?:Ier|Ire|[IVX]+)$')
ARTICLES = ("Le ", "La ", "L'")

# Rangés tels qu'écrits — par leur prénom ou leur surnom, ou parce que leur nom
# n'en a pas (Ibn Khaldun), ou parce que l'usage les range ainsi (Jeanne d'Arc).
KEEP_AS_WRITTEN = {
    'Jésus de Nazareth', 'Frédéric Barberousse', "Marie-Thérèse d'Autriche", 'Ibn al-Fârid', 'Méhémet Ali', 'Ibrahim Pacha',
    'Ismaïl Pacha', 'Hugues Capet', "Jeanne d'Arc", 'La Fayette', 'Marie Stuart', 'Marc Aurèle',
    "Scipion l'Africain", "François d'Assise", "Thomas d'Aquin", "Guido d'Arezzo", "Pline l'Ancien",
    'Hannibal Barca', 'Septime Sévère', "Augustin d'Hippone", "Athanase d'Alexandrie", 'Fatima al-Fihriya',
    "Constantin l'Africain", 'Ibn Tûmart', 'Ibn Khaldun', 'Ibn Battûta', 'Abd el-Kader', 'Moulay Ismaïl',
    'Moncef Bey', 'Messali Hadj', 'Oum Kalthoum', 'Malcolm X', 'Red Cloud', 'Sitting Bull', 'Crazy Horse',
    'Le Corbusier', 'Túpac Katari', 'Hildegarde de Bingen', 'Nicolas de Flue', 'Mathilde de Toscane',
    'Benoît de Nursie', 'Catherine de Sienne', 'Pic de la Mirandole', 'Piero della Francesca',
    'Ali Bey al-Kabir', 'Albert le Grand', 'Alfred le Grand', 'Antoine le Grand', 'Guillaume le Conquérant',
    'Pakal le Grand', 'Bède le Vénérable',
    # Espagne : saints et religieux par leur prénom, noms d'artiste, un nom d'usage.
    'Charles Quint', "Agustina d'Aragon", "Thérèse d'Avila", 'Isidore de Séville', 'Ibn Arabi',
    'Dominique de Guzmán', 'Ignace de Loyola', 'François Xavier', 'Jean de la Croix',
    'Garcilaso de la Vega', 'Lope de Vega', 'Tirso de Molina', 'Camarón de la Isla', 'Paco de Lucía',
    # France : deux rois rangés par leur prénom, une princesse de Monaco aussi.
    'Philippe Auguste', 'Philippe le Bel', 'Charlotte de Monaco',
    # Machrek : empereurs, califes et souverains rangés par leur nom d'usage ou leur prénom, noms à « ibn ».
    "Philippe l'Arabe", 'Apollodore de Damas', 'Julia Domna', 'Sévère Alexandre', 'Abou Bakr', 'Othman ibn Affan',
    'Omar ibn al-Khattab', 'Ali ibn Abi Talib', 'Abd al-Malik', 'Jean Damascène', 'Abou Nouwas', 'Harun al-Rashid',
    'Hunayn ibn Ishaq', 'Qusta ibn Luqa', 'Ibn al-Haytham', 'Ibn Butlan', 'Taqi al-Din', 'Zahir al-Umar',
    'Moubarak Al-Sabah', 'Jaber al-Ahmad al-Jaber al-Sabah', 'Ibn Saoud', 'Fayçal ben Abdelaziz Al Saoud',
    'Khaled ben Abdelaziz Al Saoud', 'Fahd ben Abdelaziz Al Saoud', 'Abdallah ben Abdelaziz Al Saoud',
    'Qabus ibn Saïd', 'Khalifa ben Zayed Al Nahyane', 'Maktoum ben Rachid Al Maktoum', 'Hussein ben Ali',
    'Yahya Hamid ed-Din', 'Hussein de Jordanie', 'Abou Jihad',
    # Scandinavie : souverains par leur prénom ou leur surnom, Islandais par leur prénom (patronymes).
    'Canut le Grand', 'Christine de Suède', 'Harald Hardrada', 'Jón Sigurðsson', 'Jón Arason', 'Snorri Sturluson',
    # Sous-continent indien : souverains, saints et maîtres rangés par leur nom d'usage, noms d'une seule
    # famille ou sans nom de famille (Ranjit Singh, Guru Nanak), noms de cour et titres (Shah Jahan, Mère Teresa).
    'Sher Shah Suri', 'Shah Jahan', 'Nur Jahan', 'Razia Sultana', 'Ranjit Singh', 'Tipû Sâhib', 'Maharana Pratap',
    'Lakshmî Bâî', 'Mère Teresa', 'Adi Shankara', 'Chaitanya Mahaprabhu', 'Guru Nanak', 'Guru Gobind Singh',
    'Ramana Maharshi', 'Sri Aurobindo', 'Drukpa Kunley', 'Pema Lingpa', 'Ngawang Namgyal', 'Lalon Shah',
    'Prithvi Narayan Shah', 'Sri Vikrama Rajasinha', 'Siddhartha Gautama', 'Faiz Ahmed Faiz', 'Begum Rokeya',
    'Ziaur Rahman', 'Tajuddin Ahmad', 'Zainul Abedin', 'Noor Jehan', 'Nusrat Fateh Ali Khan', 'Dilip Kumar',
    'Milkha Singh', 'Raja Ravi Varma', 'Nek Chand', 'Pasang Lhamu Sherpa', 'Bhanubhakta Acharya',
    'Abdul Ghaffar Khan', 'Liaquat Ali Khan', 'Allauddin Khan',
    # Turquie : sultans, mystiques et lettrés d'avant les noms de famille de 1934, rangés par leur nom d'usage.
    'Alp Arslan', 'Yunus Emre', 'Cheikh Bedreddin', 'Piri Reis', 'Matrakçı Nasuh', 'Turgut Reis', 'Soliman le Magnifique',
    'Sokollu Mehmed Pacha', 'Kösem Sultan', 'Evliya Çelebi', 'Kara Mustafa Pacha', 'Dede Efendi', 'Midhat Pacha',
    'Osman Hamdi Bey', 'Nene Hatun', 'Fatma Aliye', 'Enver Pacha', 'Seyit Onbaşı', 'Âşık Veysel', 'Namık Kemal',
    # Chine : le nom de famille vient en premier (Mao Zedong, Li Bai), les noms de règne et de temple ne se coupent pas ;
    # les noms de Hong Kong, de Taïwan et de la diaspora, écrits à l'occidentale, passent par EXCEPTIONS.
    'Qin Shi Huang', 'Liu Bang', 'Han Wudi', 'Guangwu des Han', 'Liu Bei', 'Wendi des Sui', 'Taizong des Tang', 'Wu Zetian', 'Xuanzong des Tang', 'Taizu des Song', 'Kubilai Khan', 'Hongwu', 'Yongle', 'Kangxi', 'Qianlong', 'Cixi', 'Puyi', 'Sun Yat-sen', 'Tchang Kaï-chek', 'Mao Zedong', 'Zhou Enlai', 'Deng Xiaoping', 'Shang Yang', 'Wang Anshi', 'Li Hongzhang', 'Yuan Shikai', 'Sun Tzu', 'Xiang Yu', 'Ban Chao', 'Cao Cao', 'Zhuge Liang', 'Guan Yu', 'Yue Fei', 'Wen Tianxiang', 'Qi Jiguang', 'Zheng He', 'Koxinga', 'Lin Zexu', 'Hong Xiuquan', 'Zeng Guofan', 'Qiu Jin', 'Zhu De', 'Peng Dehuai', 'Zhang Xueliang', 'Mozi', 'Xunzi', 'Han Feizi', 'Qu Yuan', 'Sima Qian', 'Tao Yuanming', 'Li Bai', 'Du Fu', 'Wang Wei', 'Bai Juyi', 'Han Yu', 'Su Shi', 'Li Qingzhao', 'Zhu Xi', 'Wang Yangming', 'Luo Guanzhong', "Wu Cheng'en", 'Cao Xueqin', 'Pu Songling', 'Kang Youwei', 'Liang Qichao', 'Lu Xun', 'Hu Shi', 'Lao She', 'Ba Jin', 'Zhang Ailing', 'Jin Yong', 'Guo Moruo', 'Shen Congwen', 'Liu Xiaobo', 'Xuanzang', 'Huineng', 'Wang Xizhi', 'Gu Kaizhi', 'Yan Zhenqing', 'Huizong des Song', 'Mi Fu', 'Zhao Mengfu', 'Shen Zhou', 'Dong Qichang', 'Bada Shanren', 'Shitao', 'Zheng Banqiao', 'Qi Baishi', 'Xu Beihong', 'Zhang Daqian', 'Lin Fengmian', 'Wu Guanzhong', 'Liang Sicheng', 'Zao Wou-ki', 'Mei Lanfang', 'Ruan Lingyu', 'Nie Er', 'Xian Xinghai', 'Zhou Xuan', 'Abing', 'Cai Lun', 'Zhang Heng', 'Zu Chongzhi', 'Zhang Zhongjing', 'Hua Tuo', 'Yi Xing', 'Bi Sheng', 'Shen Kuo', 'Su Song', 'Guo Shoujing', 'Li Shizhen', 'Xu Guangqi', 'Zhan Tianyou', 'Qian Xuesen', 'Deng Jiaxian', 'Yuan Longping', 'Yang Chen-Ning', 'Hua Luogeng', 'Confucius', 'Zhuangzi', 'Mencius',
    # Japon : le nom de famille vient en premier (Oda Nobunaga, Natsume Sōseki) ; les noms de plume, de règne et d'artiste
    # (Bashō, Hokusai, Foujita) se rangent tels qu'on les dit.
    'Shōtoku Taishi', 'Fujiwara no Michinaga', 'Minamoto no Yoritomo', 'Hōjō Tokimune', 'Ashikaga Takauji', 'Oda Nobunaga', 'Toyotomi Hideyoshi', 'Tokugawa Ieyasu', 'Tokugawa Yoshimune', 'Mutsuhito', 'Itō Hirobumi', 'Hara Takashi', 'Hirohito', 'Yoshida Shigeru', 'Satō Eisaku', 'Minamoto no Yoshitsune', 'Takeda Shingen', 'Uesugi Kenshin', 'Date Masamune', 'Miyamoto Musashi', 'Ōishi Kuranosuke', 'Saigō Takamori', 'Sakamoto Ryōma', 'Kondō Isami', 'Tōgō Heihachirō', 'Yamamoto Isoroku', 'Kūkai', 'Sei Shōnagon', 'Murasaki Shikibu', 'Dōgen', 'Nichiren', 'Zeami', 'Matsuo Bashō', 'Ihara Saikaku', 'Chikamatsu Monzaemon', 'Motoori Norinaga', 'Kobayashi Issa', 'Yoshida Shōin', 'Fukuzawa Yukichi', 'Mori Ōgai', 'Natsume Sōseki', 'Higuchi Ichiyō', 'Nishida Kitarō', 'Suzuki Daisetsu', 'Yosano Akiko', "Tanizaki Jun'ichirō", 'Akutagawa Ryūnosuke', 'Miyazawa Kenji', 'Kawabata Yasunari', 'Dazai Osamu', 'Mishima Yukio', 'Ōe Kenzaburō', 'Sesshū', 'Sen no Rikyū', 'Hasegawa Tōhaku', 'Ogata Kōrin', 'Itō Jakuchū', 'Utamaro', 'Hokusai', 'Hiroshige', 'Kuroda Seiki', 'Okakura Kakuzō', 'Foujita', 'Tange Kenzō', 'Kanō Jigorō', 'Funakoshi Gichin', 'Ueshiba Morihei', 'Mizoguchi Kenji', 'Ozu Yasujirō', 'Kurosawa Akira', 'Honda Ishirō', 'Mifune Toshirō', 'Hara Setsuko', 'Tezuka Osamu', 'Takemitsu Tōru', 'Misora Hibari', 'Sakamoto Kyū', 'Sakamoto Ryūichi', 'Seki Takakazu', 'Hiraga Gennai', 'Sugita Genpaku', 'Inō Tadataka', 'Kitasato Shibasaburō', 'Takamine Jōkichi', 'Ikeda Kikunae', 'Nagaoka Hantarō', 'Toyoda Sakichi', 'Noguchi Hideyo', 'Yukawa Hideki', "Tomonaga Shin'ichirō", 'Iwasaki Yatarō', 'Shibusawa Eiichi', 'Matsushita Kōnosuke', 'Toyoda Kiichirō', 'Honda Sōichirō', 'Andō Momofuku', 'Ibuka Masaru', 'Morita Akio',
    # Russie : tsars rangés par leur prénom et leur surnom.
    'Ivan le Terrible', 'Pierre le Grand',
    # Asie centrale et Afghanistan : khans, émirs et sultans rangés par leur nom d'usage (« Khan », « Beg », « Datka » sont des
    # titres, non des noms de famille), souverains et savants médiévaux sans nom de famille, noms de scène.
    'Abylaï Khan', 'Kenesary Khan', 'Mohammed Alim Khan', 'Dost Mohammad Khan', 'Wazir Akbar Khan', 'Abdur Rahman Khan',
    'Amanullah Khan', 'Mohammed Daoud Khan', 'Ulugh Beg', 'Toghrul Beg', 'Ahmad Sanjar', 'Kurmanjan Datka',
    'Magtymguly Pyragy', 'Yusuf Khass Hajib', 'Nasir Khusraw', 'Mahmoud de Ghazni', 'Husayn Bayqara', 'Ahmad Shah Durrani',
    'Tamara Khanum', 'Hamza Hakimzade Niyazi', 'Meena Keshwar Kamal',
    # Nouvelle-Zélande et Pacifique : noms māori, hawaïens, tahitiens et samoans rangés sous leur premier mot
    # (« Te » ou « Pa » font partie du nom, « Hika », « Oopa » ou « Ariki » ne sont pas des noms de famille).
    'Pōtatau Te Wherowhero', 'Te Rauparaha', 'Hongi Hika', 'Te Kooti', 'Te Whiti o Rongomai', 'Te Puea Hērangi',
    'Te Rangi Hīroa', "Emma d'Hawaï", 'Pouvanaa a Oopa', "Mata'afa Iosefo", 'Pa Tepaeru Terito Ariki',
}

# Écrits à la main : (nom de la source) → nom de classement.
EXCEPTIONS = {
    # Portugal : noms composés (le dernier mot n'est pas toujours le nom de famille) et surnoms.
    'Henri le Navigateur': 'Henri le Navigateur',
    'Catherine de Bragance': 'Catherine de Bragance',
    'Le marquis de Pombal': 'Pombal, marquis de',
    'Antoine de Padoue': 'Antoine de Padoue',
    'Josefa de Óbidos': 'Josefa de Óbidos',
    'Maria Severa Onofriana': 'Severa, Maria',
    'Fernand de Magellan': 'Magellan, Fernand de',
    'Francisco Sá Carneiro': 'Sá Carneiro, Francisco',
    'Nuno Álvares Pereira': 'Álvares Pereira, Nuno',
    'Duarte Pacheco Pereira': 'Pacheco Pereira, Duarte',
    'Aristides de Sousa Mendes': 'Sousa Mendes, Aristides de',
    'Otelo Saraiva de Carvalho': 'Saraiva de Carvalho, Otelo',
    'Fernão Mendes Pinto': 'Mendes Pinto, Fernão',
    'Almeida Garrett': 'Almeida Garrett',
    'Camilo Castelo Branco': 'Castelo Branco, Camilo',
    'Sophia de Mello Breyner Andresen': 'Mello Breyner Andresen, Sophia de',
    'António Soares dos Reis': 'Soares dos Reis, António',
    'Rafael Bordalo Pinheiro': 'Bordalo Pinheiro, Rafael',
    'Columbano Bordalo Pinheiro': 'Bordalo Pinheiro, Columbano',
    'Almada Negreiros': 'Almada Negreiros',
    'Maria Helena Vieira da Silva': 'Vieira da Silva, Maria Helena',
    'Egas Moniz': 'Egas Moniz',
    'Gago Coutinho': 'Gago Coutinho',
    'Sá de Miranda': 'Sá de Miranda',
    'Louis-Hippolyte La Fontaine': 'La Fontaine, Louis-Hippolyte',
    "Pierre Le Moyne d'Iberville": "Iberville, Pierre Le Moyne d'",
    "Marie de l'Incarnation": "Marie de l'Incarnation",
    'La Bolduc': 'Bolduc, La',
    'Claude Ptolémée': 'Ptolémée, Claude',
    'Saint Louis': 'Louis, saint',
    'Jules César': 'César, Jules',
    'Marc Antoine': 'Antoine, Marc',
    'Le cardinal de Richelieu': 'Richelieu, cardinal de',
    'Le pape François': 'François, pape',
    'Chef Joseph': 'Joseph, chef',
    'Madam Walker': 'Walker, Madam',
    'Man Ray': 'Ray, Man',
    'Lord Byron': 'Byron, Lord',
    'Lord Kelvin': 'Kelvin, Lord',
    'Fra Angelico': 'Angelico, Fra',
    'Kateb Yacine': 'Kateb, Yacine',
    'Élisabeth de Wittelsbach, dite Sissi': 'Wittelsbach, Élisabeth de',
    'Lucas Cranach l\'Ancien': "Cranach l'Ancien, Lucas",
    'Hans Holbein le Jeune': 'Holbein le Jeune, Hans',
    'Johann Strauss fils': 'Strauss fils, Johann',
    'William Pitt le Jeune': 'Pitt le Jeune, William',
    'Ludwig Mies van der Rohe': 'Mies van der Rohe, Ludwig',
    'Mustafa Lutfi al-Manfaluti': 'Manfaluti, Mustafa Lutfi al-',
    'Mohammad Zaher Shah': 'Zaher Shah, Mohammad',
    "Rifa'a al-Tahtawi": "Tahtawi, Rifa'a al-",
    'Abbas al-Akkad': 'Akkad, Abbas al-',
    'Tawfiq al-Hakim': 'Hakim, Tawfiq al-',
    'Ahmed al-Mansour': 'Mansour, Ahmed al-',
    'Omar al-Mokhtar': 'Mokhtar, Omar al-',
    'Abdelkrim el-Khattabi': 'Khattabi, Abdelkrim el-',
    'Anouar el-Sadate': 'Sadate, Anouar el-',
    'Gamal Abdel Nasser': 'Nasser, Gamal Abdel',
    'Mohamed Abdel Wahab': 'Abdel Wahab, Mohamed',
    'Abdel Halim Hafez': 'Hafez, Abdel Halim',
    'Nawal El Saadawi': 'El Saadawi, Nawal',
    'Abdelhamid Ben Badis': 'Ben Badis, Abdelhamid',
    'Ahmed Ben Bella': 'Ben Bella, Ahmed',
    "Larbi Ben M'hidi": "Ben M'hidi, Larbi",
    'Mehdi Ben Barka': 'Ben Barka, Mehdi',
    'Bchira Ben Mrad': 'Ben Mrad, Bchira',
    'Tawhida Ben Cheikh': 'Ben Cheikh, Tawhida',
    # Nouvelle-Zélande et Pacifique : le mutin du Bounty, distinct du président américain (titres uniques entre panthéons).
    'John Adams (Pitcairn)': 'Adams, John (Pitcairn)',
    'Allal El Fassi': 'El Fassi, Allal',
    'Moktar Ould Daddah': 'Ould Daddah, Moktar',
    'Abou el Kacem Chebbi': 'Chebbi, Abou el Kacem',
    'Edmond Amran El Maleh': 'El Maleh, Edmond Amran',
    "El Hadj M'Hamed El Anka": "El Anka, El Hadj M'Hamed",
    "Lalla Fatma N'Soumer": "N'Soumer, Lalla Fatma",
    'Alcide De Gasperi': 'De Gasperi, Alcide',
    'Vittorio De Sica': 'De Sica, Vittorio',
    'William Edward Burghardt Du Bois': 'Du Bois, William Edward Burghardt',
    'Jean de La Fontaine': 'La Fontaine, Jean de',
    'Léonard de Vinci': 'Vinci, Léonard de',
    'Cosme de Médicis': 'Médicis, Cosme de',
    'Laurent de Médicis': 'Médicis, Laurent de',
    'Ralph Vaughan Williams': 'Vaughan Williams, Ralph',
    'David Lloyd George': 'Lloyd George, David',
    'Inca Garcilaso de la Vega': 'Garcilaso de la Vega, Inca',
    'Sor Juana Inés de la Cruz': 'Juana Inés de la Cruz, Sor',
    'Gabriel García Márquez': 'García Márquez, Gabriel',
    'Mario Vargas Llosa': 'Vargas Llosa, Mario',
    'Joaquín Torres García': 'Torres García, Joaquín',
    'Agustín Barrios Mangoré': 'Barrios Mangoré, Agustín',
    'José Figueres Ferrer': 'Figueres Ferrer, José',
    'Augusto Roa Bastos': 'Roa Bastos, Augusto',
    'Andrés de Santa Cruz': 'Santa Cruz, Andrés de',
    'José de San Martín': 'San Martín, José de',
    'Le Tasse': 'Tasse',
    'Le Tintoret': 'Tintoret',
    'Le Caravage': 'Caravage',
    'Le Bernin': 'Bernin',
    "L'Arioste": 'Arioste',
    'Paul Véronèse': 'Véronèse, Paul',
    'Kazi Nazrul Islam': 'Nazrul Islam, Kazi',
    'Sheikh Mujibur Rahman': 'Mujibur Rahman, Sheikh',
    'Lala Lajpat Rai': 'Lajpat Rai, Lala',
    # Espagne : le nom de famille est souvent double (« Pérez Galdós »), et on range sous le premier.
    'Antonio Cánovas del Castillo': 'Cánovas del Castillo, Antonio',
    'Pablo Iglesias Posse': 'Iglesias Posse, Pablo',
    'Gonzalo Fernández de Córdoba': 'Fernández de Córdoba, Gonzalo',
    'Bartolomé de las Casas': 'Las Casas, Bartolomé de',
    "Don Juan d'Autriche": "Juan d'Autriche, don",
    'Pedro Calderón de la Barca': 'Calderón de la Barca, Pedro',
    'Benito Pérez Galdós': 'Pérez Galdós, Benito',
    'Emilia Pardo Bazán': 'Pardo Bazán, Emilia',
    'José Ortega y Gasset': 'Ortega y Gasset, José',
    'Federico García Lorca': 'García Lorca, Federico',
    'Carmen Martín Gaite': 'Martín Gaite, Carmen',
    'Luis García Berlanga': 'García Berlanga, Luis',
    'Vasco Núñez de Balboa': 'Núñez de Balboa, Vasco',
    'Álvar Núñez Cabeza de Vaca': 'Cabeza de Vaca, Álvar Núñez',
    'Santiago Ramón y Cajal': 'Ramón y Cajal, Santiago',
    'Leonardo Torres Quevedo': 'Torres Quevedo, Leonardo',
    'Abbas ibn Firnas': 'Ibn Firnas, Abbas',
    'Le Cid': 'Cid',
    'Le Greco': 'Greco',
    # France : un nom à particule majuscule, et un nom d'usage qui ne range pas sous le dernier mot.
    'André Le Nôtre': 'Le Nôtre, André',
    'Philippe Leclerc de Hauteclocque': 'Leclerc de Hauteclocque, Philippe',
    # Machrek : noms arabes à article, rangés sous le nom sans l'article, l'article passant à la fin.
    'Oussama Ibn Mounqidh': 'Ibn Mounqidh, Oussama',
    'Abou al-Alaa al-Maari': 'Maari, Abou al-Alaa al-',
    'Nassif al-Yazigi': 'Yazigi, Nassif al-',
    'Boutros al-Boustani': 'Boustani, Boutros al-',
    'Zaki al-Arsouzi': 'Arsouzi, Zaki al-',
    'Salah al-Din al-Bitar': 'Bitar, Salah al-Din al-',
    'Abd al-Rahman al-Kawakibi': 'Kawakibi, Abd al-Rahman al-',
    'Muhammad Kurd Ali': 'Kurd Ali, Muhammad',
    'Amin al-Rihani': 'Rihani, Amin al-',
    'Izz al-Din al-Qassam': 'Qassam, Izz al-Din al-',
    'Saleh al-Ali': 'Ali, Saleh al-',
    'Youssef al-Azmeh': 'Azmeh, Youssef al-',
    'Sultan al-Atrash': 'Atrash, Sultan al-',
    'Mohammed Amin al-Husseini': 'Husseini, Mohammed Amin al-',
    'Abdel Kader al-Husseini': 'Husseini, Abdel Kader al-',
    'Ali al-Wardi': 'Wardi, Ali al-',
    'Ahmed Hassan al-Bakr': 'Bakr, Ahmed Hassan al-',
    'Wasfi al-Tal': 'Tal, Wasfi al-',
    'Nazik al-Malaika': 'Malaika, Nazik al-',
    'Badr Shakir al-Sayyab': 'Sayyab, Badr Shakir al-',
    'Hafez el-Assad': 'Assad, Hafez el-',
    'Ibrahim al-Hamdi': 'Hamdi, Ibrahim al-',
    'Samih al-Qasim': 'Qasim, Samih al-',
    'Shireen Abu Akleh': 'Abu Akleh, Shireen',
    # Chine : noms écrits à l'occidentale (prénom d'abord).
    'I. M. Pei': 'Pei, I. M.',
    'Bruce Lee': 'Lee, Bruce',
    'Teresa Teng': 'Teng, Teresa',
    'Anita Mui': 'Mui, Anita',
    'Leslie Cheung': 'Cheung, Leslie',
    'Chien-Shiung Wu': 'Wu, Chien-Shiung',
    # Russie : nom à particule balte, rangé sous « Barclay de Tolly ».
    'Michel Barclay de Tolly': 'Barclay de Tolly, Michel',
}


def strip_article(name):
    for article in ARTICLES:
        if name.startswith(article):
            return name[len(article):]
    return name


def classement(nom):
    """Nom de classement d'un nom de source ; voir le docstring du module."""
    if nom in EXCEPTIONS:
        return EXCEPTIONS[nom]
    if nom in KEEP_AS_WRITTEN:
        return nom
    words = nom.split()
    # Souverains, papes, pharaons : « Louis XIV », « Henri IV du Saint-Empire ».
    if any(REGNAL.match(w) for w in words[1:]):
        return nom
    # Un seul mot (Voltaire, Michel-Ange, L'Arioste) : rien à inverser.
    if len(words) == 1:
        return strip_article(nom)
    # Cas général : le dernier mot est le nom ; les particules minuscules qui le
    # précédent vont après le prénom (« Charles de Gaulle » → « Gaulle, Charles de »).
    surname = words[-1]
    given = words[:-1]
    particles = []
    while given and (given[-1] in LOWER_PARTICLES or given[-1].endswith("'") and given[-1][:-1].lower() == 'd'):
        particles.insert(0, given.pop())
    if not given:  # « de Gaulle » seul : on garde tout
        return nom
    tail = ' '.join(given + particles)
    return f'{surname}, {tail}'


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    write = '--write' in sys.argv
    paths = sorted(glob.glob(os.path.join(SOURCES, '*.json')))
    if args:
        paths = [p for p in paths if os.path.basename(p)[:-5] in args]
    changed = 0
    for path in paths:
        with open(path, encoding='utf-8') as f:
            src = json.load(f)
        people = []
        for p in src['personnages']:
            entry = classement(p['nom'])
            if p.get('classement') == entry:
                people.append(p)
                continue
            changed += 1
            if not write:
                print(f"{src['code']:8} {p['nom']:42} → {entry}")
            # `classement` juste après `nom`, pour que la source se lise bien.
            rebuilt = {}
            for key, value in p.items():
                if key == 'classement':
                    continue
                rebuilt[key] = value
                if key == 'nom':
                    rebuilt['classement'] = entry
            people.append(rebuilt)
        if write:
            src['personnages'] = people
            with open(path, 'w', encoding='utf-8') as f:
                f.write(json.dumps(src, ensure_ascii=False, indent=2) + '\n')
    print(f'{changed} classement(s) {"écrits" if write else "à écrire"}.')


if __name__ == '__main__':
    main()
