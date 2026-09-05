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
print(f"Total long events to shorten: {len(long_events)}")

# Common locution replacements
REPLACEMENTS = [
    # Locutions verbales
    (r"\bmet au point\b", "développe"),
    (r"\bmettent au point\b", "développent"),
    (r"\bmise au point de la\b", "développement de la"),
    (r"\bmise au point du\b", "développement du"),
    (r"\bmise au point des\b", "développement des"),
    (r"\bmise au point d'\b", "développement d'"),
    (r"\bMise au point de la\b", "Développement de la"),
    (r"\bMise au point du\b", "Développement du"),
    (r"\bMise au point des\b", "Développement des"),
    (r"\bMise au point d'\b", "Développement d'"),
    (r"\bMise au point de\b", "Développement de"),
    (r"\bmise au point de\b", "développement de"),
    (r"\bmet en place\b", "instaure"),
    (r"\bmettent en place\b", "instaurent"),
    (r"\bMise en place de la\b", "Instauration de la"),
    (r"\bMise en place du\b", "Instauration du"),
    (r"\bMise en place des\b", "Instauration des"),
    (r"\bMise en place d'\b", "Instauration d'"),
    (r"\bMise en place de\b", "Instauration de"),
    (r"\bmise en place\b", "création"),
    (r"\bmet en service\b", "lance"),
    (r"\bMise en service de la\b", "Lancement de la"),
    (r"\bMise en service du\b", "Lancement du"),
    (r"\bMise en service des\b", "Lancement des"),
    (r"\bMise en service d'\b", "Lancement d'"),
    (r"\bMise en service de\b", "Lancement de"),
    (r"\bse voit décerner le\b", "reçoit le"),
    (r"\bse voit décerner la\b", "reçoit la"),
    (r"\bse voit attribuer le\b", "reçoit le"),
    (r"\bse voit attribuer la\b", "reçoit la"),
    (r"\bse voit confier la\b", "reçoit la"),
    (r"\bse voit confier le\b", "reçoit le"),
    (r"\bprend ses fonctions de\b", "devient"),
    (r"\bprend la tête de la\b", "dirige la"),
    (r"\bprend la tête du\b", "dirige le"),
    (r"\bprend la tête des\b", "dirige les"),
    (r"\bprend la tête d'\b", "dirige"),
    (r"\bprend la direction de la\b", "dirige la"),
    (r"\bprend la direction du\b", "dirige le"),
    (r"\bprend part à la\b", "participe à la"),
    (r"\bprend part au\b", "participe au"),
    (r"\bprend part aux\b", "participe aux"),
    (r"\bprend part à\b", "participe à"),
    (r"\bfait son entrée dans\b", "entre dans"),
    (r"\bfait son entrée à\b", "entre à"),
    (r"\bfait ériger des\b", "érige des"),
    (r"\bfait ériger un\b", "érige un"),
    (r"\bfait ériger une\b", "érige une"),
    (r"\bfait construire un\b", "construit un"),
    (r"\bfait construire une\b", "construit une"),
    (r"\bfait construire des\b", "construit des"),
    
    # Locutions prépositionnelles
    (r"\bdans une famille de\b", "dans une famille"),
    (r"\bdans une famille\b", "en famille"),
    (r"\bau sein de la dynastie\b", "dans la dynastie"),
    (r"\bau sein de la\b", "dans la"),
    (r"\bau sein du\b", "dans le"),
    (r"\bau sein des\b", "dans les"),
    (r"\bau sein d'\b", "dans "),
    (r"\bà travers le monde\b", "dans le monde"),
    (r"\bdans le monde entier\b", "dans le monde"),
    (r"\bà la suite de la\b", "après la"),
    (r"\bà la suite du\b", "après le"),
    (r"\bà la suite des\b", "après les"),
    (r"\bà la suite d'\b", "après "),
    (r"\bdans le cadre de la\b", "lors de la"),
    (r"\bdans le cadre du\b", "lors du"),
    (r"\bdans le cadre des\b", "lors des"),
    (r"\bdans le cadre d'\b", "lors d'"),
    (r"\bdans le cadre de\b", "lors de"),
    (r"\bà l'occasion de la\b", "lors de la"),
    (r"\bà l'occasion du\b", "lors du"),
    (r"\bà l'occasion des\b", "lors des"),
    (r"\bà l'occasion d'\b", "lors d'"),
    (r"\bà l'occasion de\b", "lors de"),
    (r"\bsous le règne de\b", "sous"),
    (r"\bsous le commandement de\b", "sous"),
    (r"\bsous la présidence de\b", "sous"),
    (r"\bsous la direction de\b", "sous"),
    (r"\bpar l'intermédiaire de\b", "par"),
    (r"\bà destination de\b", "vers"),
    (r"\ben provenance de\b", "depuis"),
    (r"\bde la part de\b", "par"),
    (r"\ben faveur de\b", "pour"),
    (r"\bà l'encontre de\b", "contre"),
    (r"\bdans le but de\b", "pour"),
    (r"\ben vue de\b", "pour"),
    (r"\bafin de\b", "pour"),
    (r"\bà l'âge de\b", "à"),
]

def apply_replacements(title):
    t = title
    for pat, rep in REPLACEMENTS:
        t = re.sub(pat, rep, t)
    return t

fixed_by_locutions = 0
still_long = []

for p, ev in long_events:
    orig = ev['titre']
    cand = apply_replacements(orig)
    if len(cand.split()) <= 6:
        fixed_by_locutions += 1
    else:
        still_long.append((p, orig, cand))

print(f"Fixed by locution replacements alone: {fixed_by_locutions} / {len(long_events)} ({fixed_by_locutions/len(long_events)*100:.1f}%)")
print(f"Still long: {len(still_long)}")
