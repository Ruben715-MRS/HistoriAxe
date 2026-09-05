import json
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('data/fr.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

events = []
def recurse(node, path=""):
    if isinstance(node, dict):
        if 'events' in node and isinstance(node['events'], list):
            theme_nom = node.get('nom', 'Unknown')
            for ev in node['events']:
                events.append((path + " > " + theme_nom, ev))
        for k, v in node.items():
            if k != 'events':
                name = node.get('nom', '')
                new_path = path + (" > " + name if name and k in ['categories', 'subcategories', 'themes'] else "")
                recurse(v, new_path)
    elif isinstance(node, list):
        for item in node:
            recurse(item, path)

recurse(data)
long_events = [(p, ev) for p, ev in events if len(ev.get('titre', '').split()) in (7, 8)]
print(f"Total long events: {len(long_events)}")

# Let's test a comprehensive rule-based transformation engine
def transform_title(title, path=""):
    words = title.split()
    if len(words) <= 6:
        return title

    t = title
    
    # 1. Exact phrase replacements
    EXACT_PHRASES = [
        ("en solitaire", ""),
        ("dans le monde entier", "dans le monde"),
        ("à travers le monde", "dans le monde"),
        ("au cours de la guerre", "pendant la guerre"),
        ("de la part de", "par"),
        ("en vue de", "pour"),
        ("afin de", "pour"),
        ("dans le but de", "pour"),
        ("au sein de la dynastie", "dans la dynastie"),
        ("au sein de la", "dans la"),
        ("au sein du", "dans le"),
        ("au sein des", "dans les"),
        ("au sein d'", "dans "),
        ("dans une famille de", "dans une famille"),
        ("dans une famille", "en famille"),
        ("met au point", "développe"),
        ("mettent au point", "développent"),
        ("met en place", "instaure"),
        ("mettent en place", "instaurent"),
        ("met en service", "lance"),
        ("mettent en service", "lancent"),
        ("se voit décerner le", "reçoit le"),
        ("se voit décerner la", "reçoit la"),
        ("se voit attribuer le", "reçoit le"),
        ("se voit attribuer la", "reçoit la"),
        ("se voit confier la", "reçoit la"),
        ("se voit confier le", "reçoit le"),
        ("prend ses fonctions de", "devient"),
        ("prend la tête de la", "dirige la"),
        ("prend la tête du", "dirige le"),
        ("prend la tête des", "dirige les"),
        ("prend la tête d'", "dirige "),
        ("prend la direction de la", "dirige la"),
        ("prend la direction du", "dirige le"),
        ("prend la direction d'", "dirige "),
        ("prend part à la", "participe à la"),
        ("prend part au", "participe au"),
        ("prend part aux", "participe aux"),
        ("prend part à", "participe à"),
        ("fait son entrée dans", "entre dans"),
        ("fait son entrée à", "entre à"),
        ("fait ériger des", "érige des"),
        ("fait ériger un", "érige un"),
        ("fait ériger une", "érige une"),
        ("fait ériger", "érige"),
        ("fait construire un", "construit un"),
        ("fait construire une", "construit une"),
        ("fait construire des", "construit des"),
        ("fait construire", "construit"),
        ("à la suite de la", "après la"),
        ("à la suite du", "après le"),
        ("à la suite des", "après les"),
        ("à la suite d'", "après "),
        ("dans le cadre de la", "lors de la"),
        ("dans le cadre du", "lors du"),
        ("dans le cadre des", "lors des"),
        ("dans le cadre d'", "lors d'"),
        ("dans le cadre de", "lors de"),
        ("à l'occasion de la", "lors de la"),
        ("à l'occasion du", "lors du"),
        ("à l'occasion des", "lors des"),
        ("à l'occasion d'", "lors d'"),
        ("à l'occasion de", "lors de"),
        ("sous le règne de", "sous"),
        ("sous le commandement de", "sous"),
        ("sous la présidence de", "sous"),
        ("sous la direction de", "sous"),
        ("par l'intermédiaire de", "par"),
        ("à destination de", "vers"),
        ("en provenance de", "depuis"),
        ("en faveur de", "pour"),
        ("à l'encontre de", "contre"),
        ("à l'âge de", "à"),
        ("Mise au point de la", "Développement de la"),
        ("Mise au point du", "Développement du"),
        ("Mise au point des", "Développement des"),
        ("Mise au point d'", "Développement d'"),
        ("Mise au point de", "Développement de"),
        ("Mise en place de la", "Création de la"),
        ("Mise en place du", "Création du"),
        ("Mise en place des", "Création des"),
        ("Mise en place d'", "Création d'"),
        ("Mise en place de", "Création de"),
        ("Mise en service de la", "Lancement de la"),
        ("Mise en service du", "Lancement du"),
        ("Mise en service des", "Lancement des"),
        ("Mise en service d'", "Lancement d'"),
        ("Mise en service de", "Lancement de"),
        ("Prix Nobel de", "Nobel de"),
        ("prix Nobel de", "Nobel de"),
    ]
    
    for old, new in EXACT_PHRASES:
        if old in t:
            cand = t.replace(old, new)
            cand = re.sub(r'\s+', ' ', cand).strip()
            t = cand
            if len(t.split()) <= 6:
                return t

    # 2. Leading articles (Le, La, Les, Un, Une)
    if len(t.split()) > 6:
        w = t.split()
        if w[0] in ['Le', 'La', 'Les', 'Un', 'Une'] and not w[1].startswith('«') and len(w) - 1 <= 6:
            cand = w[1].capitalize() + ' ' + ' '.join(w[2:])
            t = cand
            if len(t.split()) <= 6:
                return t

    return t

fixed = 0
for p, ev in long_events:
    res = transform_title(ev['titre'], p)
    if len(res.split()) <= 6:
        fixed += 1

print(f"Fixed so far: {fixed} / {len(long_events)}")
