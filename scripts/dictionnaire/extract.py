#!/usr/bin/env python3
# Extrait le dictionnaire (fiches « Termes proches ») du document de travail .docx vers assets/dictionnaire/termes.json.
#
# Usage : python3 scripts/dictionnaire/extract.py   (lit scripts/dictionnaire/source/termes-proches-agreg-2027.docx)
# Prérequis : pandoc. Le JSON produit est la source de l'app ; le .docx reste la source de vérité des fiches.
# Une fiche = un titre « N. … » suivi d'un tableau (terme | définition), puis « Critère décisif », « Piège », « Exemples ».
# L'annexe (méthode des images comparatives) et l'index A–Z sont ignorés.
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SOURCE = os.path.join(HERE, 'source', 'termes-proches-agreg-2027.docx')
OUT = os.path.join(ROOT, 'assets', 'dictionnaire', 'termes.json')
LABELS = ('Critère décisif :', 'Piège :', 'Exemples :')
DASHES = re.compile(r'^\s*-{3,}(\s+-{3,})*\s*$')
TOP_BORDER = re.compile(r'^\s{2}-{3,}')


def read_text():
    out = subprocess.run(['pandoc', SOURCE, '-t', 'plain', '--wrap=none'], check=True, capture_output=True, text=True)
    # Pandoc écrit des espaces insécables avant les deux-points (« Piège\u00a0: ») : on les remplace.
    return re.sub('[\u00a0\u202f]', ' ', out.stdout).splitlines()


def table_rows(lines, start):
    """Lignes d'un tableau sans en-tête : entre la ligne de tirets d'ouverture et celle de fermeture.
    Renvoie (lignes, indice de la ligne de fermeture). La première colonne (le terme) commence à l'indice 2
    et la définition à l'indice de la deuxième série de tirets (fixé par la ligne d'ouverture)."""
    opening = lines[start]
    dashes = [m.end() for m in re.finditer(r'-+', opening)]
    col2 = dashes[0] + 1 if len(dashes) > 1 else None
    j = start + 1
    body = []
    while j < len(lines) and not DASHES.match(lines[j]):
        body.append(lines[j])
        j += 1
    return body, col2, j


def parse(lines):
    domaines = []
    fiches = []
    current = None
    expect = 1
    i = 0
    n = len(lines)

    def next_nonblank(j):
        while j < n and not lines[j].strip():
            j += 1
        return j

    while i < n:
        line = lines[i]
        if line.startswith('Annexe.') and fiches:
            break  # l'annexe suit la fiche 211 ; le sommaire en parle déjà plus haut
        m = re.match(r'^(\d+)\. (.+)$', line)
        if m:
            j = next_nonblank(i + 1)
            if j < n and lines[j].startswith('Fiches '):
                # En-tête de domaine, suivi de son paragraphe d'introduction.
                intro = lines[j].split('. ', 1)[1] if '. ' in lines[j] else ''
                domaines.append({'id': int(m.group(1)), 'nom': m.group(2).strip(), 'intro': intro.strip()})
                i = j + 1
                continue
            if int(m.group(1)) == expect and domaines:
                titre = m.group(2).strip()
                rapport = titre.endswith('Rapport 2026')
                titre = re.sub(r'\s*Rapport 2026$', '', titre)
                current = {'id': expect, 'domaine': domaines[-1]['id'], 'titre': titre, 'rapport2026': rapport,
                           'critere': '', 'piege': '', 'exemples': '', 'termes': []}
                fiches.append(current)
                expect += 1
                i += 1
                continue
        if current is not None:
            if line.startswith(LABELS):
                key, _, value = line.partition(' : ')
                field = {'Critère décisif': 'critere', 'Piège': 'piege', 'Exemples': 'exemples'}[key]
                current[field] = value.strip()
            elif TOP_BORDER.match(line):
                body, col2, close = table_rows(lines, i)
                if col2 is None:
                    sys.exit('Tableau sans colonnes (fiche %d)' % current['id'])
                for row in body:
                    if not row.strip():
                        continue
                    terme, definition = row[:col2].strip(), row[col2:].strip()
                    if not terme:
                        # Ligne de suite : la définition précédente se poursuit ici.
                        current['termes'][-1]['definition'] += ' ' + definition
                    else:
                        current['termes'].append({'nom': terme, 'definition': definition})
                i = close + 1
                continue
        i += 1
    return domaines, fiches


def main():
    domaines, fiches = parse(read_text())
    if len(fiches) != 211:
        sys.exit('Attendu 211 fiches, trouvé %d' % len(fiches))
    termes = []
    for f in fiches:
        if not f['termes']:
            sys.exit('Fiche %d sans terme' % f['id'])
        for k, t in enumerate(f['termes'], 1):
            termes.append({'id': '%d-%d' % (f['id'], k), 'nom': t['nom'], 'definition': t['definition'],
                           'fiche': f['id'], 'domaine': f['domaine']})
    data = {'version': 1, 'source': 'termes-proches-agreg-2027.docx', 'domaines': domaines, 'fiches': fiches, 'termes': termes}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    print('%d domaines, %d fiches, %d termes -> %s' % (len(domaines), len(fiches), len(termes), OUT))


if __name__ == '__main__':
    main()
