#!/usr/bin/env python3
"""Veille des prix et récompenses : pour chaque prix suivi, le lauréat le plus récent attendu est-il dans les sources ?

    python3 scripts/veille/prix.py               # écrit le rapport du jour
    python3 scripts/veille/prix.py --date 2026-10-29
    python3 scripts/veille/prix.py --stdout      # affiche sans écrire

Lecture seule : ne modifie ni scripts/prix/, ni scripts/nobel/, ni data/. Le rapport liste les lauréats
à rechercher ; les ajouts se font après validation, dans le fichier source du prix.
Calendrier des prix suivis : scripts/veille/calendrier_prix.json.
"""
import argparse
import datetime
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.dirname(HERE)
RAPPORTS = os.path.join(HERE, 'rapports')
CALENDRIER = os.path.join(HERE, 'calendrier_prix.json')


def events_of(entry):
    with open(os.path.join(SCRIPTS, entry['fichier']), encoding='utf8') as f:
        data = json.load(f)
    events = data['events'] if isinstance(data, dict) else data
    if entry.get('axe'):
        events = [e for e in events if e.get('axe') == entry['axe']]
    return events


def expected_year(today, month):
    """Dernière année dont le lauréat est déjà annoncé à la date donnée."""
    return today.year if today.month >= month else today.year - 1


def build(today):
    with open(CALENDRIER, encoding='utf8') as f:
        calendrier = json.load(f)['prix']
    lignes = []
    manquants = []
    for entry in calendrier:
        if not entry['continu']:
            continue
        events = events_of(entry)
        latest = max((e['date'] for e in events), default=None)
        attendu = expected_year(today, entry['mois']) - entry.get('decalage', 0)
        if latest is None or latest < attendu:
            statut = 'à rechercher : lauréat de ' + str(attendu)
            manquants.append((entry['nom'], attendu))
        else:
            statut = 'à jour'
        lignes.append('| ' + entry['nom'] + ' | ' + entry['fichier'] + ' | ' + str(latest or '—') + ' | ' + str(attendu) + ' | ' + statut + ' |')

    out = ['# Veille des prix et récompenses : état au ' + today.isoformat(), '',
           'Un prix est « à rechercher » lorsque son lauréat de l’année attendue ne figure pas encore dans les sources. ' +
           'Les prix sans rythme annuel (calendrier, « continu » à false) ne sont pas contrôlés.', '',
           '| Prix | Fichier source | Dernière année présente | Lauréat attendu de | Statut |',
           '|---|---|---|---|---|'] + lignes + ['', '## À rechercher', '']
    if manquants:
        out += ['- ' + nom + ' : lauréat de ' + str(annee) for nom, annee in manquants]
    else:
        out.append('Aucun.')
    out.append('')
    return '\n'.join(out), len(lignes), len(manquants)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--date', help='date de référence (AAAA-MM-JJ), par défaut aujourd’hui')
    parser.add_argument('--stdout', action='store_true', help='affiche le rapport sans l’écrire')
    args = parser.parse_args()
    today = datetime.date.fromisoformat(args.date) if args.date else datetime.date.today()
    texte, suivis, manquants = build(today)
    if args.stdout:
        print(texte)
        return
    os.makedirs(RAPPORTS, exist_ok=True)
    chemin = os.path.join(RAPPORTS, 'prix-' + today.isoformat() + '.md')
    with open(chemin, 'w', encoding='utf8') as f:
        f.write(texte)
    print(str(suivis) + ' prix suivis, ' + str(manquants) + ' à rechercher. Rapport : ' + chemin)


if __name__ == '__main__':
    main()
