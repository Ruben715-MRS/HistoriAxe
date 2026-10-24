// =========================================================================
// === LES CHEFS D'ÉTAT : DONNÉES DE VINGT PAYS (complète js/stateLeadersCore.js) ===
// =========================================================================
// Même forme que la France : [début, fin (null = en fonction), nom, fonction, groupe]. Chaque pays a ses groupes (dynastie ou régime),
// dont la couleur de fond et le nom apparaissent quand le régime change. Liste indicative, « à relire par un enseignant ».
// Le début de chaque liste est dit dans sa note : on ne remonte pas plus haut que le régime actuel ou la dynastie donnée.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.StateLeadersData = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function G(label, color) { return { label: label, color: color }; }
    var REP = '#d1fae5', EMP = '#fed7aa', MIL = '#e5e7eb';

    return {
        etats_unis: {
            name: "États-Unis", note: "Depuis George Washington (1789) : le président est chef de l’État.",
            groups: { presidence: G("Présidence des États-Unis", REP) },
            rows: [
                [1789, 1797, "George Washington", "président", "presidence"],
                [1797, 1801, "John Adams", "président", "presidence"],
                [1801, 1809, "Thomas Jefferson", "président", "presidence"],
                [1809, 1817, "James Madison", "président", "presidence"],
                [1817, 1825, "James Monroe", "président", "presidence"],
                [1825, 1829, "John Quincy Adams", "président", "presidence"],
                [1829, 1837, "Andrew Jackson", "président", "presidence"],
                [1837, 1841, "Martin Van Buren", "président", "presidence"],
                [1841, 1841, "William Henry Harrison", "président", "presidence"],
                [1841, 1845, "John Tyler", "président", "presidence"],
                [1845, 1849, "James K. Polk", "président", "presidence"],
                [1849, 1850, "Zachary Taylor", "président", "presidence"],
                [1850, 1853, "Millard Fillmore", "président", "presidence"],
                [1853, 1857, "Franklin Pierce", "président", "presidence"],
                [1857, 1861, "James Buchanan", "président", "presidence"],
                [1861, 1865, "Abraham Lincoln", "président", "presidence"],
                [1865, 1869, "Andrew Johnson", "président", "presidence"],
                [1869, 1877, "Ulysses S. Grant", "président", "presidence"],
                [1877, 1881, "Rutherford B. Hayes", "président", "presidence"],
                [1881, 1881, "James A. Garfield", "président", "presidence"],
                [1881, 1885, "Chester A. Arthur", "président", "presidence"],
                [1885, 1889, "Grover Cleveland", "président", "presidence"],
                [1889, 1893, "Benjamin Harrison", "président", "presidence"],
                [1893, 1897, "Grover Cleveland", "président (second mandat)", "presidence"],
                [1897, 1901, "William McKinley", "président", "presidence"],
                [1901, 1909, "Theodore Roosevelt", "président", "presidence"],
                [1909, 1913, "William Howard Taft", "président", "presidence"],
                [1913, 1921, "Woodrow Wilson", "président", "presidence"],
                [1921, 1923, "Warren G. Harding", "président", "presidence"],
                [1923, 1929, "Calvin Coolidge", "président", "presidence"],
                [1929, 1933, "Herbert Hoover", "président", "presidence"],
                [1933, 1945, "Franklin D. Roosevelt", "président", "presidence"],
                [1945, 1953, "Harry S. Truman", "président", "presidence"],
                [1953, 1961, "Dwight D. Eisenhower", "président", "presidence"],
                [1961, 1963, "John F. Kennedy", "président", "presidence"],
                [1963, 1969, "Lyndon B. Johnson", "président", "presidence"],
                [1969, 1974, "Richard Nixon", "président", "presidence"],
                [1974, 1977, "Gerald Ford", "président", "presidence"],
                [1977, 1981, "Jimmy Carter", "président", "presidence"],
                [1981, 1989, "Ronald Reagan", "président", "presidence"],
                [1989, 1993, "George H. W. Bush", "président", "presidence"],
                [1993, 2001, "Bill Clinton", "président", "presidence"],
                [2001, 2009, "George W. Bush", "président", "presidence"],
                [2009, 2017, "Barack Obama", "président", "presidence"],
                [2017, 2021, "Donald Trump", "président", "presidence"],
                [2021, 2025, "Joe Biden", "président", "presidence"],
                [2025, null, "Donald Trump", "président (second mandat)", "presidence"]
            ]
        },

        royaume_uni: {
            name: "Royaume-Uni", note: "Depuis l’union des couronnes (1603). Liste des souverains : les Premiers ministres ne sont pas chefs de l’État.",
            groups: {
                stuart: G("Maison Stuart", "#e0e7ff"), commonwealth: G("République (Commonwealth)", REP),
                hanovre: G("Maison de Hanovre", "#dbeafe"), saxe: G("Maison de Saxe-Cobourg-Gotha", "#fef3c7"),
                windsor: G("Maison de Windsor (depuis 1917)", "#fce7f3")
            },
            rows: [
                [1603, 1625, "Jacques Ier (Jacques VI d’Écosse)", "roi d’Angleterre et d’Écosse", "stuart"],
                [1625, 1649, "Charles Ier", "roi", "stuart"],
                [1653, 1658, "Oliver Cromwell", "Lord Protecteur", "commonwealth"],
                [1658, 1659, "Richard Cromwell", "Lord Protecteur", "commonwealth"],
                [1660, 1685, "Charles II", "roi", "stuart"],
                [1685, 1688, "Jacques II", "roi", "stuart"],
                [1689, 1702, "Guillaume III d’Orange", "roi (avec Marie II jusqu’en 1694)", "stuart"],
                [1702, 1714, "Anne", "reine", "stuart"],
                [1714, 1727, "George Ier", "roi", "hanovre"],
                [1727, 1760, "George II", "roi", "hanovre"],
                [1760, 1820, "George III", "roi", "hanovre"],
                [1820, 1830, "George IV", "roi", "hanovre"],
                [1830, 1837, "Guillaume IV", "roi", "hanovre"],
                [1837, 1901, "Victoria", "reine", "hanovre"],
                [1901, 1910, "Édouard VII", "roi", "saxe"],
                [1910, 1936, "George V", "roi", "windsor"],
                [1936, 1936, "Édouard VIII", "roi", "windsor"],
                [1936, 1952, "George VI", "roi", "windsor"],
                [1952, 2022, "Élisabeth II", "reine", "windsor"],
                [2022, null, "Charles III", "roi", "windsor"]
            ]
        },

        allemagne: {
            name: "Allemagne", note: "Depuis la proclamation de l’Empire allemand (1871). Les présidents de la RDA ne sont pas donnés.",
            groups: {
                empire: G("Empire allemand", EMP), weimar: G("République de Weimar", REP),
                reich3: G("Troisième Reich", MIL), rfa: G("République fédérale d’Allemagne", REP)
            },
            rows: [
                [1871, 1888, "Guillaume Ier", "empereur allemand", "empire"],
                [1888, 1888, "Frédéric III", "empereur allemand", "empire"],
                [1888, 1918, "Guillaume II", "empereur allemand", "empire"],
                [1919, 1925, "Friedrich Ebert", "président du Reich", "weimar"],
                [1925, 1934, "Paul von Hindenburg", "président du Reich", "weimar"],
                [1934, 1945, "Adolf Hitler", "Führer et chancelier", "reich3"],
                [1949, 1959, "Theodor Heuss", "président fédéral", "rfa"],
                [1959, 1969, "Heinrich Lübke", "président fédéral", "rfa"],
                [1969, 1974, "Gustav Heinemann", "président fédéral", "rfa"],
                [1974, 1979, "Walter Scheel", "président fédéral", "rfa"],
                [1979, 1984, "Karl Carstens", "président fédéral", "rfa"],
                [1984, 1994, "Richard von Weizsäcker", "président fédéral", "rfa"],
                [1994, 1999, "Roman Herzog", "président fédéral", "rfa"],
                [1999, 2004, "Johannes Rau", "président fédéral", "rfa"],
                [2004, 2010, "Horst Köhler", "président fédéral", "rfa"],
                [2010, 2012, "Christian Wulff", "président fédéral", "rfa"],
                [2012, 2017, "Joachim Gauck", "président fédéral", "rfa"],
                [2017, null, "Frank-Walter Steinmeier", "président fédéral", "rfa"]
            ]
        },

        italie: {
            name: "Italie", note: "Depuis la proclamation du Royaume d’Italie (1861). Mussolini n’était pas chef de l’État, mais chef du gouvernement.",
            groups: {
                savoie: G("Maison de Savoie", "#dbeafe"), fascisme: G("Fascisme", MIL), republique: G("République italienne", REP)
            },
            rows: [
                [1861, 1878, "Victor-Emmanuel II", "roi d’Italie", "savoie"],
                [1878, 1900, "Humbert Ier", "roi", "savoie"],
                [1900, 1946, "Victor-Emmanuel III", "roi", "savoie"],
                [1922, 1943, "Benito Mussolini", "chef du gouvernement", "fascisme"],
                [1946, 1948, "Enrico De Nicola", "chef provisoire de l’État", "republique"],
                [1948, 1955, "Luigi Einaudi", "président", "republique"],
                [1955, 1962, "Giovanni Gronchi", "président", "republique"],
                [1962, 1964, "Antonio Segni", "président", "republique"],
                [1964, 1971, "Giuseppe Saragat", "président", "republique"],
                [1971, 1978, "Giovanni Leone", "président", "republique"],
                [1978, 1985, "Sandro Pertini", "président", "republique"],
                [1985, 1992, "Francesco Cossiga", "président", "republique"],
                [1992, 1999, "Oscar Luigi Scalfaro", "président", "republique"],
                [1999, 2006, "Carlo Azeglio Ciampi", "président", "republique"],
                [2006, 2015, "Giorgio Napolitano", "président", "republique"],
                [2015, null, "Sergio Mattarella", "président", "republique"]
            ]
        },

        espagne: {
            name: "Espagne", note: "Depuis les Rois Catholiques (Isabelle en 1474, Ferdinand en 1479). Liste indicative des souverains et des présidents.",
            groups: {
                trastamare: G("Maison de Trastamare", "#fef3c7"), habsbourg: G("Maison de Habsbourg", "#e0e7ff"),
                bourbon: G("Maison de Bourbon", "#fce7f3"), bonaparte: G("Joseph Bonaparte", EMP),
                savoie: G("Maison de Savoie", "#dbeafe"), republique1: G("Première République", REP),
                republique2: G("IIe République", REP), franquisme: G("Régime de Franco", MIL)
            },
            rows: [
                [1474, 1504, "Isabelle Ire la Catholique", "reine de Castille", "trastamare"],
                [1479, 1516, "Ferdinand II le Catholique", "roi d’Aragon, co-souverain", "trastamare"],
                [1516, 1556, "Charles Ier (Charles Quint)", "roi", "habsbourg"],
                [1556, 1598, "Philippe II", "roi", "habsbourg"],
                [1598, 1621, "Philippe III", "roi", "habsbourg"],
                [1621, 1665, "Philippe IV", "roi", "habsbourg"],
                [1665, 1700, "Charles II", "roi", "habsbourg"],
                [1700, 1724, "Philippe V", "premier roi Bourbon", "bourbon"],
                [1724, 1724, "Louis Ier", "roi", "bourbon"],
                [1724, 1746, "Philippe V", "roi (retour sur le trône)", "bourbon"],
                [1746, 1759, "Ferdinand VI", "roi", "bourbon"],
                [1759, 1788, "Charles III", "roi", "bourbon"],
                [1788, 1808, "Charles IV", "roi", "bourbon"],
                [1808, 1808, "Ferdinand VII", "roi (abdication)", "bourbon"],
                [1808, 1813, "Joseph Bonaparte", "roi d’Espagne", "bonaparte"],
                [1813, 1833, "Ferdinand VII", "roi (retour sur le trône)", "bourbon"],
                [1833, 1868, "Isabelle II", "reine", "bourbon"],
                [1871, 1873, "Amédée Ier de Savoie", "roi", "savoie"],
                [1873, 1874, "Première République", "présidents successifs", "republique1"],
                [1874, 1885, "Alphonse XII", "roi", "bourbon"],
                [1886, 1931, "Alphonse XIII", "roi", "bourbon"],
                [1931, 1936, "Niceto Alcalá-Zamora", "président de la IIe République", "republique2"],
                [1936, 1939, "Manuel Azaña", "président de la République", "republique2"],
                [1936, 1975, "Francisco Franco", "chef de l’État (Caudillo)", "franquisme"],
                [1975, 2014, "Juan Carlos Ier", "roi", "bourbon"],
                [2014, null, "Felipe VI", "roi", "bourbon"]
            ]
        },

        belgique: {
            name: "Belgique", note: "Depuis l’indépendance (1831). Les rois sont chefs de l’État.",
            groups: { saxe: G("Maison de Saxe-Cobourg-Gotha", "#dbeafe") },
            rows: [
                [1831, 1865, "Léopold Ier", "roi des Belges", "saxe"],
                [1865, 1909, "Léopold II", "roi des Belges", "saxe"],
                [1909, 1934, "Albert Ier", "roi des Belges", "saxe"],
                [1934, 1951, "Léopold III", "roi des Belges", "saxe"],
                [1951, 1993, "Baudouin Ier", "roi des Belges", "saxe"],
                [1993, 2013, "Albert II", "roi des Belges", "saxe"],
                [2013, null, "Philippe Ier", "roi des Belges", "saxe"]
            ]
        },

        pays_bas: {
            name: "Pays-Bas", note: "Depuis la création du Royaume des Pays-Bas (1815). Les souverains sont chefs de l’État.",
            groups: { orange: G("Maison d’Orange-Nassau", "#ffedd5") },
            rows: [
                [1815, 1840, "Guillaume Ier", "roi", "orange"],
                [1840, 1849, "Guillaume II", "roi", "orange"],
                [1849, 1890, "Guillaume III", "roi", "orange"],
                [1890, 1948, "Wilhelmine", "reine", "orange"],
                [1948, 1980, "Juliana", "reine", "orange"],
                [1980, 2013, "Béatrix", "reine", "orange"],
                [2013, null, "Willem-Alexander", "roi", "orange"]
            ]
        },

        suede: {
            name: "Suède", note: "Depuis l’avènement de la dynastie Bernadotte (1818).",
            groups: { bernadotte: G("Maison Bernadotte", "#ecfccb") },
            rows: [
                [1818, 1844, "Charles XIV Jean", "roi", "bernadotte"],
                [1844, 1859, "Oscar Ier", "roi", "bernadotte"],
                [1859, 1872, "Charles XV", "roi", "bernadotte"],
                [1872, 1907, "Oscar II", "roi", "bernadotte"],
                [1907, 1950, "Gustave V", "roi", "bernadotte"],
                [1950, 1973, "Gustave VI Adolphe", "roi", "bernadotte"],
                [1973, null, "Charles XVI Gustave", "roi", "bernadotte"]
            ]
        },

        danemark: {
            name: "Danemark", note: "Depuis l’avènement de Christian IX (1863). Les souverains sont chefs de l’État.",
            groups: { glucksbourg: G("Maison de Glücksburg", "#ffe4e6") },
            rows: [
                [1863, 1906, "Christian IX", "roi", "glucksbourg"],
                [1906, 1912, "Frédéric VIII", "roi", "glucksbourg"],
                [1912, 1947, "Christian X", "roi", "glucksbourg"],
                [1947, 1972, "Frédéric IX", "roi", "glucksbourg"],
                [1972, 2024, "Margrethe II", "reine", "glucksbourg"],
                [2024, null, "Frédéric X", "roi", "glucksbourg"]
            ]
        },

        norvege: {
            name: "Norvège", note: "Depuis l’indépendance (1905). Les souverains sont chefs de l’État.",
            groups: { glucksbourg: G("Maison de Glücksburg", "#ffe4e6") },
            rows: [
                [1905, 1957, "Haakon VII", "roi", "glucksbourg"],
                [1957, 1991, "Olav V", "roi", "glucksbourg"],
                [1991, null, "Harald V", "roi", "glucksbourg"]
            ]
        },

        japon: {
            name: "Japon", note: "Depuis l’ère Meiji (1867). Les empereurs antérieurs ne sont pas donnés.",
            groups: { imperiale: G("Dynastie impériale", "#fecaca") },
            rows: [
                [1867, 1912, "Meiji", "empereur", "imperiale"],
                [1912, 1926, "Taishō", "empereur", "imperiale"],
                [1926, 1989, "Shōwa (Hirohito)", "empereur", "imperiale"],
                [1989, 2019, "Akihito", "empereur", "imperiale"],
                [2019, null, "Naruhito", "empereur", "imperiale"]
            ]
        },

        inde: {
            name: "Inde", note: "Depuis la République (1950). Liste des présidents de la République.",
            groups: { presidence: G("Présidence de la République", REP) },
            rows: [
                [1950, 1962, "Rajendra Prasad", "président", "presidence"],
                [1962, 1967, "Sarvepalli Radhakrishnan", "président", "presidence"],
                [1967, 1969, "Zakir Husain", "président", "presidence"],
                [1969, 1974, "V. V. Giri", "président", "presidence"],
                [1974, 1977, "Fakhruddin Ali Ahmed", "président", "presidence"],
                [1977, 1982, "Neelam Sanjiva Reddy", "président", "presidence"],
                [1982, 1987, "Zail Singh", "président", "presidence"],
                [1987, 1992, "Ramaswamy Venkataraman", "président", "presidence"],
                [1992, 1997, "Shankar Dayal Sharma", "président", "presidence"],
                [1997, 2002, "Kocheril Raman Narayanan", "président", "presidence"],
                [2002, 2007, "A. P. J. Abdul Kalam", "président", "presidence"],
                [2007, 2012, "Pratibha Patil", "présidente", "presidence"],
                [2012, 2017, "Pranab Mukherjee", "président", "presidence"],
                [2017, 2022, "Ram Nath Kovind", "président", "presidence"],
                [2022, null, "Droupadi Murmu", "présidente", "presidence"]
            ]
        },

        bresil: {
            name: "Brésil", note: "Depuis l’indépendance (1822) : l’empereur, puis les présidents à partir de la République (1889).",
            groups: {
                empire: G("Empire du Brésil", EMP), republique1: G("Première République (1889-1930)", REP),
                vargas: G("Ère Vargas (1930-1945)", MIL), republique2: G("République (1945-1964)", REP),
                militaire: G("Régime militaire (1964-1985)", MIL), nouvelle: G("Nouvelle République", REP)
            },
            rows: [
                [1822, 1831, "Pierre Ier", "empereur du Brésil", "empire"],
                [1831, 1889, "Pierre II", "empereur", "empire"],
                [1889, 1891, "Deodoro da Fonseca", "président provisoire", "republique1"],
                [1891, 1894, "Floriano Peixoto", "président", "republique1"],
                [1894, 1898, "Prudente de Morais", "président", "republique1"],
                [1898, 1902, "Campos Sales", "président", "republique1"],
                [1902, 1906, "Rodrigues Alves", "président", "republique1"],
                [1906, 1909, "Afonso Pena", "président", "republique1"],
                [1909, 1910, "Nilo Peçanha", "président", "republique1"],
                [1910, 1914, "Hermes da Fonseca", "président", "republique1"],
                [1914, 1918, "Wenceslau Brás", "président", "republique1"],
                [1918, 1919, "Delfim Moreira", "président", "republique1"],
                [1919, 1922, "Epitácio Pessoa", "président", "republique1"],
                [1922, 1926, "Artur Bernardes", "président", "republique1"],
                [1926, 1930, "Washington Luís", "président", "republique1"],
                [1930, 1945, "Getúlio Vargas", "chef du gouvernement provisoire puis dictateur", "vargas"],
                [1945, 1946, "José Linhares", "président (transition)", "republique2"],
                [1946, 1951, "Eurico Gaspar Dutra", "président", "republique2"],
                [1951, 1954, "Getúlio Vargas", "président élu", "republique2"],
                [1954, 1955, "Café Filho", "président", "republique2"],
                [1955, 1956, "Nereu Ramos", "président par intérim", "republique2"],
                [1956, 1961, "Juscelino Kubitschek", "président", "republique2"],
                [1961, 1961, "Jânio Quadros", "président", "republique2"],
                [1961, 1964, "João Goulart", "président", "republique2"],
                [1964, 1967, "Humberto de Alencar Castelo Branco", "président (régime militaire)", "militaire"],
                [1967, 1969, "Artur da Costa e Silva", "président", "militaire"],
                [1969, 1974, "Emílio Garrastazu Médici", "président", "militaire"],
                [1974, 1979, "Ernesto Geisel", "président", "militaire"],
                [1979, 1985, "João Figueiredo", "président", "militaire"],
                [1985, 1985, "Tancredo Neves", "président élu, non investi", "nouvelle"],
                [1985, 1990, "José Sarney", "président", "nouvelle"],
                [1990, 1992, "Fernando Collor de Mello", "président", "nouvelle"],
                [1992, 1995, "Itamar Franco", "président", "nouvelle"],
                [1995, 2003, "Fernando Henrique Cardoso", "président", "nouvelle"],
                [2003, 2011, "Luiz Inácio Lula da Silva", "président", "nouvelle"],
                [2011, 2016, "Dilma Rousseff", "présidente", "nouvelle"],
                [2016, 2019, "Michel Temer", "président", "nouvelle"],
                [2019, 2023, "Jair Bolsonaro", "président", "nouvelle"],
                [2023, null, "Luiz Inácio Lula da Silva", "président (second mandat)", "nouvelle"]
            ]
        },

        mexique: {
            name: "Mexique", note: "Depuis la Constitution de 1917 : liste des présidents de la République.",
            groups: { presidence: G("Présidence de la République", REP) },
            rows: [
                [1917, 1920, "Venustiano Carranza", "président", "presidence"],
                [1920, 1920, "Adolfo de la Huerta", "président intérimaire", "presidence"],
                [1920, 1924, "Álvaro Obregón", "président", "presidence"],
                [1924, 1928, "Plutarco Elías Calles", "président", "presidence"],
                [1928, 1930, "Emilio Portes Gil", "président", "presidence"],
                [1930, 1932, "Pascual Ortiz Rubio", "président", "presidence"],
                [1932, 1934, "Abelardo Rodríguez", "président", "presidence"],
                [1934, 1940, "Lázaro Cárdenas", "président", "presidence"],
                [1940, 1946, "Manuel Ávila Camacho", "président", "presidence"],
                [1946, 1952, "Miguel Alemán Valdés", "président", "presidence"],
                [1952, 1958, "Adolfo Ruiz Cortines", "président", "presidence"],
                [1958, 1964, "Adolfo López Mateos", "président", "presidence"],
                [1964, 1970, "Gustavo Díaz Ordaz", "président", "presidence"],
                [1970, 1976, "Luis Echeverría Álvarez", "président", "presidence"],
                [1976, 1982, "José López Portillo", "président", "presidence"],
                [1982, 1988, "Miguel de la Madrid", "président", "presidence"],
                [1988, 1994, "Carlos Salinas de Gortari", "président", "presidence"],
                [1994, 2000, "Ernesto Zedillo", "président", "presidence"],
                [2000, 2006, "Vicente Fox", "président", "presidence"],
                [2006, 2012, "Felipe Calderón", "président", "presidence"],
                [2012, 2018, "Enrique Peña Nieto", "président", "presidence"],
                [2018, 2024, "Andrés Manuel López Obrador", "président", "presidence"],
                [2024, null, "Claudia Sheinbaum", "présidente", "presidence"]
            ]
        },

        argentine: {
            name: "Argentine", note: "Depuis la Constitution de 1853-1854. Les régimes militaires sont en gris.",
            groups: {
                confederation: G("Confédération argentine", "#fef3c7"), republique: G("République argentine", REP),
                militaire: G("Régimes militaires", MIL)
            },
            rows: [
                [1854, 1860, "Justo José de Urquiza", "président de la Confédération", "confederation"],
                [1862, 1868, "Bartolomé Mitre", "président", "republique"],
                [1868, 1874, "Domingo Faustino Sarmiento", "président", "republique"],
                [1874, 1880, "Nicolás Avellaneda", "président", "republique"],
                [1880, 1886, "Julio Argentino Roca", "président", "republique"],
                [1886, 1890, "Miguel Juárez Celman", "président", "republique"],
                [1890, 1892, "Carlos Pellegrini", "président", "republique"],
                [1892, 1895, "Luis Sáenz Peña", "président", "republique"],
                [1895, 1898, "José Evaristo Uriburu", "président", "republique"],
                [1898, 1904, "Julio Argentino Roca", "président (second mandat)", "republique"],
                [1904, 1906, "Manuel Quintana", "président", "republique"],
                [1906, 1910, "José Figueroa Alcorta", "président", "republique"],
                [1910, 1914, "Roque Sáenz Peña", "président", "republique"],
                [1914, 1916, "Victorino de la Plaza", "président", "republique"],
                [1916, 1922, "Hipólito Yrigoyen", "président", "republique"],
                [1922, 1928, "Marcelo T. de Alvear", "président", "republique"],
                [1928, 1930, "Hipólito Yrigoyen", "président (second mandat)", "republique"],
                [1930, 1932, "José Félix Uriburu", "chef du gouvernement militaire", "militaire"],
                [1932, 1938, "Agustín P. Justo", "président", "republique"],
                [1938, 1942, "Roberto M. Ortiz", "président", "republique"],
                [1942, 1943, "Ramón Castillo", "président", "republique"],
                [1943, 1944, "Pedro Pablo Ramírez", "régime militaire", "militaire"],
                [1944, 1946, "Edelmiro Farrell", "régime militaire", "militaire"],
                [1946, 1955, "Juan Domingo Perón", "président", "republique"],
                [1955, 1955, "Eduardo Lonardi", "président provisoire après le coup d’État", "militaire"],
                [1955, 1958, "Pedro Eugenio Aramburu", "régime militaire", "militaire"],
                [1958, 1962, "Arturo Frondizi", "président", "republique"],
                [1962, 1963, "José María Guido", "président (militaire)", "militaire"],
                [1963, 1966, "Arturo Illia", "président", "republique"],
                [1966, 1970, "Juan Carlos Onganía", "régime militaire", "militaire"],
                [1970, 1971, "Roberto Marcelo Levingston", "régime militaire", "militaire"],
                [1971, 1973, "Alejandro Lanusse", "régime militaire", "militaire"],
                [1973, 1973, "Héctor José Cámpora", "président", "republique"],
                [1973, 1973, "Raúl Alberto Lastiri", "président par intérim", "republique"],
                [1973, 1974, "Juan Domingo Perón", "président (retour au pouvoir)", "republique"],
                [1974, 1976, "Isabel Perón", "présidente", "republique"],
                [1976, 1981, "Jorge Rafael Videla", "régime militaire", "militaire"],
                [1981, 1981, "Roberto Eduardo Viola", "régime militaire", "militaire"],
                [1981, 1982, "Leopoldo Galtieri", "régime militaire", "militaire"],
                [1982, 1983, "Reynaldo Bignone", "régime militaire", "militaire"],
                [1983, 1989, "Raúl Alfonsín", "président", "republique"],
                [1989, 1999, "Carlos Menem", "président", "republique"],
                [1999, 2001, "Fernando de la Rúa", "président", "republique"],
                [2001, 2002, "Adolfo Rodríguez Saá", "président intérimaire", "republique"],
                [2002, 2003, "Eduardo Duhalde", "président", "republique"],
                [2003, 2007, "Néstor Kirchner", "président", "republique"],
                [2007, 2015, "Cristina Fernández de Kirchner", "présidente", "republique"],
                [2015, 2019, "Mauricio Macri", "président", "republique"],
                [2019, 2023, "Alberto Fernández", "président", "republique"],
                [2023, null, "Javier Milei", "président", "republique"]
            ]
        },

        canada: {
            name: "Canada", note: "Depuis la Confédération (1867) : le souverain britannique est chef de l’État ; le gouverneur général le représente.",
            groups: { couronne: G("Monarchie canadienne", "#dbeafe") },
            rows: [
                [1867, 1901, "Victoria", "reine", "couronne"],
                [1901, 1910, "Édouard VII", "roi", "couronne"],
                [1910, 1936, "George V", "roi", "couronne"],
                [1936, 1936, "Édouard VIII", "roi", "couronne"],
                [1936, 1952, "George VI", "roi", "couronne"],
                [1952, 2022, "Élisabeth II", "reine", "couronne"],
                [2022, null, "Charles III", "roi", "couronne"]
            ]
        },

        australie: {
            name: "Australie", note: "Depuis la Fédération (1901) : le souverain britannique est chef de l’État ; le gouverneur général le représente.",
            groups: { couronne: G("Monarchie australienne", "#dbeafe") },
            rows: [
                [1901, 1910, "Édouard VII", "roi", "couronne"],
                [1910, 1936, "George V", "roi", "couronne"],
                [1936, 1936, "Édouard VIII", "roi", "couronne"],
                [1936, 1952, "George VI", "roi", "couronne"],
                [1952, 2022, "Élisabeth II", "reine", "couronne"],
                [2022, null, "Charles III", "roi", "couronne"]
            ]
        },

        turquie: {
            name: "Turquie", note: "Depuis la proclamation de la République (1923). Les présidents de la République sont chefs de l’État.",
            groups: { republique: G("République de Turquie", REP), militaire: G("Régime militaire (1980-1982)", MIL) },
            rows: [
                [1923, 1938, "Mustafa Kemal Atatürk", "président", "republique"],
                [1938, 1950, "İsmet İnönü", "président", "republique"],
                [1950, 1960, "Celâl Bayar", "président", "republique"],
                [1960, 1966, "Cemal Gürsel", "président (après le coup d’État de 1960)", "republique"],
                [1966, 1973, "Cevdet Sunay", "président", "republique"],
                [1973, 1980, "Fahri Korutürk", "président", "republique"],
                [1980, 1989, "Kenan Evren", "chef de l’État (junte puis président)", "militaire"],
                [1989, 1993, "Turgut Özal", "président", "republique"],
                [1993, 2000, "Süleyman Demirel", "président", "republique"],
                [2000, 2007, "Ahmet Necdet Sezer", "président", "republique"],
                [2007, 2014, "Abdullah Gül", "président", "republique"],
                [2014, null, "Recep Tayyip Erdoğan", "président", "republique"]
            ]
        },

        egypte: {
            name: "Égypte", note: "Depuis la proclamation de la République (1953). Les présidents de la République sont chefs de l’État.",
            groups: { republique: G("République égyptienne", REP), militaire: G("Pouvoir militaire (2011-2012)", MIL) },
            rows: [
                [1953, 1954, "Mohamed Naguib", "président", "republique"],
                [1954, 1970, "Gamal Abdel Nasser", "président", "republique"],
                [1970, 1981, "Anouar el-Sadate", "président", "republique"],
                [1981, 2011, "Hosni Moubarak", "président", "republique"],
                [2011, 2012, "Hussein Tantawi", "chef du Conseil suprême des forces armées", "militaire"],
                [2012, 2013, "Mohamed Morsi", "président", "republique"],
                [2013, 2014, "Adly Mansour", "président par intérim", "republique"],
                [2014, null, "Abdel Fattah al-Sissi", "président", "republique"]
            ]
        },

        israel: {
            name: "Israël", note: "Depuis la proclamation de l’État (1948). Les présidents de l’État sont chefs de l’État ; le Premier ministre ne l’est pas.",
            groups: { presidence: G("Présidence de l’État d’Israël", REP) },
            rows: [
                [1948, 1952, "Chaim Weizmann", "président", "presidence"],
                [1952, 1963, "Yitzhak Ben-Zvi", "président", "presidence"],
                [1963, 1973, "Zalman Shazar", "président", "presidence"],
                [1973, 1978, "Ephraim Katzir", "président", "presidence"],
                [1978, 1983, "Yitzhak Navon", "président", "presidence"],
                [1983, 1993, "Chaim Herzog", "président", "presidence"],
                [1993, 2000, "Ezer Weizman", "président", "presidence"],
                [2000, 2007, "Moshe Katsav", "président", "presidence"],
                [2007, 2014, "Shimon Peres", "président", "presidence"],
                [2014, 2021, "Reuven Rivlin", "président", "presidence"],
                [2021, null, "Isaac Herzog", "président", "presidence"]
            ]
        }
    };
}));
