# -*- coding: utf-8 -*-
"""Ajoute (ou remplace) le thème « Grandes catastrophes de transport » dans data/fr.json,
et ses points dans assets/geo/events-geo.json. Relançable sans doublon.

    python3 scripts/transport/build_theme.py

Un événement qui partage lien Wikipédia ET année avec un événement existant est le même fait
(js/linkedEvents.js) : il reprend le point de ce dernier, pour que le fait n'ait qu'un lieu.
"""
import json
import os
import sys
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import events as E  # noqa: E402

THEME_ID = 'thm_catastrophes_transport'
THEME_NAME = 'Grandes catastrophes de transport'
PARENT = 'Société et Géopolitique'
# Note importante affichée à l'ouverture du thème (écran des axes, js/app/axes-rounds.js).
THEME_NOTE = ("Seuil principal : un accident entre dans ce thème lorsqu'il a fait au moins 50 morts. "
              "Seuil élargi : au moins 20 morts, pour inclure des accidents très médiatisés ou importants dans l'histoire. "
              "En dessous de 20 morts, quelques évènements sont conservés pour leur portée sur la sécurité des transports : "
              "l'accident de Brétigny-sur-Orge (7 morts, défaut de maintenance), les accidents d'Apollo 1, de Challenger et de "
              "Columbia (3 à 7 morts, sécurité des vols habités), l'incendie du tunnel du Saint-Gothard (11 morts, sécurité des "
              "tunnels) et l'accident de la gare Montparnasse (1 mort, image emblématique des débuts du chemin de fer). "
              "Les marées noires et l'effondrement du pont de Tacoma ne sont pas dans ce thème : elles sont traitées ailleurs, "
              "dans les thèmes sur le littoral et l'environnement. "
              "Les bilans sont ceux connus à la date de rédaction (octobre 2026) et peuvent évoluer : ceux de 2025 et 2026 "
              "sont souvent provisoires. Les lieux marqués « approximatif » ne sont pas des positions précises. "
              "La liste n'est pas exhaustive : les catastrophes routières et maritimes sont les moins bien couvertes, "
              "surtout entre 2015 et 2025.")
FR = os.path.join(ROOT, 'data', 'fr.json')
GEO = os.path.join(ROOT, 'assets', 'geo', 'events-geo.json')


# Liens repris tels quels de la base : ces faits y figurent déjà (thèmes aviation, espace, littoraux…),
# et c'est l'identité du lien qui les relie (« Vu aussi dans… », un seul lieu).
EXISTING_URLS = {
    'cat3': 'https://fr.wikipedia.org/wiki/Titanic',
    'cat8': 'https://fr.wikipedia.org/w/index.php?search=Amoco+Cadiz',
    'cat11': "https://fr.wikipedia.org/w/index.php?search=Marée+noire+de+l'Exxon+Valdez",
    'cat13': 'https://fr.wikipedia.org/wiki/Erika_(p%C3%A9trolier)',
    'cat16': 'https://fr.wikipedia.org/wiki/R101_(dirigeable)',
    'cat17': 'https://fr.wikipedia.org/wiki/Catastrophe_de_Hindenburg',
    'cat19': 'https://fr.wikipedia.org/wiki/Collision_aérienne_du_Grand_Canyon_de_1956',
    'cat22': 'https://fr.wikipedia.org/wiki/Apollo_1',
    'cat23': 'https://fr.wikipedia.org/wiki/Catastrophe_aérienne_de_Tenerife',
    'cat25': 'https://fr.wikipedia.org/wiki/Accident_de_la_navette_spatiale_Challenger',
    'cat26': 'https://fr.wikipedia.org/wiki/Attentat_de_Lockerbie',
    'cat28': 'https://fr.wikipedia.org/wiki/Vol_Air_France_4590',
    'cat29': 'https://fr.wikipedia.org/wiki/Catastrophe_de_la_navette_spatiale_Columbia',
    'cat53': 'https://fr.wikipedia.org/wiki/Vol_Fuerza_Aérea_Uruguaya_571',
    'cat54': 'https://fr.wikipedia.org/wiki/Vol_Germanwings_9525',
    'cat47': 'https://fr.wikipedia.org/w/index.php?search=Incendie+du+tunnel+du+Mont-Blanc',
}


def url_of(eid, title):
    """Lien d'un événement : celui de la base s'il y en a un ; sinon une recherche Wikipédia sur le titre
    de l'article (elle ouvre directement l'article quand il existe, et propose les résultats sinon)."""
    if eid in EXISTING_URLS:
        return EXISTING_URLS[eid]
    return 'https://fr.wikipedia.org/w/index.php?search=' + urllib.parse.quote_plus(title.replace('_', ' '))


def fact_key(url, date):
    return urllib.parse.unquote(url).lower() + '|' + str(date)


def walk_themes(node):
    if isinstance(node, dict):
        if 'events' in node and 'id' in node and 'nom' in node:
            yield node
        for v in node.values():
            yield from walk_themes(v)
    elif isinstance(node, list):
        for v in node:
            yield from walk_themes(v)


def main():
    doc = json.load(open(FR, encoding='utf-8'))
    geo = json.load(open(GEO, encoding='utf-8'))
    points = geo['points']
    # Points d'évènements retirés du thème (ex. Marrakech) : ils ne doivent pas rester orphelins.
    for stale in [k for k in points if k.startswith(THEME_ID + ':')]:
        del points[stale]

    parent = None
    for cat in doc['categories']:
        for sub in cat.get('subcategories', []):
            for t in sub.get('themes', []):
                if t['id'] == THEME_ID:
                    sub['themes'].remove(t)
            if sub['nom'] == PARENT:
                parent = sub
    assert parent is not None, PARENT

    theme = {'id': THEME_ID, 'nom': THEME_NAME, 'difficulte': 'Tous niveaux', 'note': THEME_NOTE,
             'axeOrder': list(E.AXES), 'essentiel': list(E.ESSENTIEL), 'events': []}
    new_points = {}
    for (eid, axe, date, titre, wiki, desc, lat, lon, prec, label, flag) in E.EVENTS:
        assert axe in E.AXES, eid
        url = url_of(eid, wiki)
        theme['events'].append({'id': eid, 'axe': axe, 'date': date, 'titre': titre, 'description': desc, 'wikipedia': url})
        new_points[THEME_ID + ':' + eid] = [round(lat, 4), round(lon, 4), prec, label, flag]
    ids = [e['id'] for e in theme['events']]
    assert len(ids) == len(set(ids))
    assert all(i in ids for i in theme['essentiel'])
    parent['themes'].append(theme)

    # Faits déjà présents ailleurs : même lieu pour tout le groupe.
    groups = {}
    for t in walk_themes(doc):
        for e in t['events']:
            if e.get('wikipedia') and isinstance(e.get('date'), int):
                groups.setdefault(fact_key(e['wikipedia'], e['date']), []).append(t['id'] + ':' + e['id'])
    shared = 0
    for e in theme['events']:
        k = THEME_ID + ':' + e['id']
        members = groups.get(fact_key(e['wikipedia'], e['date']), [])
        others = [m for m in members if m != k]
        if not others:
            points[k] = new_points[k]
            continue
        shared += 1
        existing = next((points[m] for m in others if m in points), None)
        # Le point existant sauf s'il n'est qu'une zone : un site ou un secteur précis vaut mieux.
        pt = existing if (existing and existing[2] != 'z') else new_points[k]
        for m in members:
            points[m] = list(pt)
        print('lié :', k, '<->', others, '| point', pt)

    doc['totalThemes'] = sum(1 for _ in walk_themes(doc))
    doc['totalEvents'] = sum(len(t['events']) for t in walk_themes(doc))
    open(FR, 'w', encoding='utf-8').write(json.dumps(doc, indent=2, ensure_ascii=False) + '\n')
    geo['points'] = dict(sorted(points.items()))
    json.dump(geo, open(GEO, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('thème :', len(theme['events']), 'événements,', shared, 'liés à des faits existants ; total', doc['totalThemes'], 'thèmes,', doc['totalEvents'], 'événements')


if __name__ == '__main__':
    main()
