#!/usr/bin/env python3
"""Veille des grandes catastrophes de transport : quelles catastrophes récentes manquent dans la liste ?

    python3 scripts/veille/transport.py               # écrit le rapport du jour
    python3 scripts/veille/transport.py --date 2026-10-29
    python3 scripts/veille/transport.py --stdout      # affiche sans écrire

Lecture seule : lit scripts/transport/events.py (la source du thème) et n'y écrit rien. Le rapport donne,
pour chaque axe, les évènements déjà couverts et les recherches à faire ; les ajouts se font après validation.
"""
import argparse
import datetime
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.dirname(HERE)
RAPPORTS = os.path.join(HERE, 'rapports')
sys.path.insert(0, os.path.join(SCRIPTS, 'transport'))
import events as E  # noqa: E402

# Recherches à faire pour chaque axe, sur l'actualité depuis le dernier évènement couvert.
RECHERCHES = {
    E.MER: ['naufrage 2026', 'chavirement de bateau 2026', 'incendie de navire 2026'],
    E.AIR: ['accident d’avion 2026', 'crash aérien 2026', 'catastrophe aérienne 2026'],
    E.RAIL: ['accident ferroviaire 2026', 'déraillement train 2026', 'collision de trains 2026'],
    E.ROUTE: ['accident de car 2026', 'accident de bus 2026', 'incendie de tunnel 2026', 'accident de métro 2026'],
}


def build(today):
    par_axe = {axe: [] for axe in E.AXES}
    for ev in E.EVENTS:
        par_axe[ev[1]].append(ev)

    out = ['# Veille des catastrophes de transport : état au ' + today.isoformat(), '',
           'Pour chaque axe : nombre d’évènements couverts, dernière année, et recherches à faire. ' +
           'Un évènement déjà couvert est reconnu par son lien Wikipédia et son année, pas seulement par son titre.', '',
           '| Axe | Évènements couverts | Dernière année |', '|---|---|---|']
    for axe in E.AXES:
        evs = par_axe[axe]
        derniere = max((ev[2] for ev in evs), default=None)
        out.append('| ' + axe + ' | ' + str(len(evs)) + ' | ' + str(derniere or '—') + ' |')

    out += ['', '## Évènements récents couverts (depuis 2025)', '']
    recents = [ev for ev in E.EVENTS if ev[2] >= 2025]
    if recents:
        out += ['- ' + str(ev[2]) + ' · ' + ev[3] + ' (' + ev[1] + ')' for ev in sorted(recents, key=lambda ev: ev[2])]
    else:
        out.append('Aucun.')

    out += ['', '## Recherches à faire', '']
    for axe in E.AXES:
        out.append('### ' + axe)
        out += ['- ' + q for q in RECHERCHES[axe]]
        out.append('')
    out.append('Pour chaque accident trouvé : vérifier qu’il n’est pas déjà couvert (lien Wikipédia et année), ' +
               'puis proposer axe, date, titre, description, lieu et précision.')
    out.append('')
    return '\n'.join(out), len(E.EVENTS)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--date', help='date de référence (AAAA-MM-JJ), par défaut aujourd’hui')
    parser.add_argument('--stdout', action='store_true', help='affiche le rapport sans l’écrire')
    args = parser.parse_args()
    today = datetime.date.fromisoformat(args.date) if args.date else datetime.date.today()
    texte, total = build(today)
    if args.stdout:
        print(texte)
        return
    os.makedirs(RAPPORTS, exist_ok=True)
    chemin = os.path.join(RAPPORTS, 'transport-' + today.isoformat() + '.md')
    with open(chemin, 'w', encoding='utf8') as f:
        f.write(texte)
    print(str(total) + ' évènements couverts. Rapport : ' + chemin)


if __name__ == '__main__':
    main()
