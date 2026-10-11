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
    'Frédéric Barberousse', "Marie-Thérèse d'Autriche", 'Ibn al-Fârid', 'Méhémet Ali', 'Ibrahim Pacha',
    'Ismaïl Pacha', 'Hugues Capet', "Jeanne d'Arc", 'La Fayette', 'Marie Stuart', 'Marc Aurèle',
    "Scipion l'Africain", "François d'Assise", "Thomas d'Aquin", "Guido d'Arezzo", "Pline l'Ancien",
    'Hannibal Barca', 'Septime Sévère', "Augustin d'Hippone", "Athanase d'Alexandrie", 'Fatima al-Fihriya',
    "Constantin l'Africain", 'Ibn Tûmart', 'Ibn Khaldun', 'Ibn Battûta', 'Abd el-Kader', 'Moulay Ismaïl',
    'Moncef Bey', 'Messali Hadj', 'Oum Kalthoum', 'Malcolm X', 'Red Cloud', 'Sitting Bull', 'Crazy Horse',
    'Le Corbusier', 'Túpac Katari', 'Hildegarde de Bingen', 'Nicolas de Flue', 'Mathilde de Toscane',
    'Benoît de Nursie', 'Catherine de Sienne', 'Pic de la Mirandole', 'Piero della Francesca',
    'Ali Bey al-Kabir', 'Albert le Grand', 'Alfred le Grand', 'Antoine le Grand', 'Guillaume le Conquérant',
    'Pakal le Grand', 'Bède le Vénérable',
}

# Écrits à la main : (nom de la source) → nom de classement.
EXCEPTIONS = {
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
