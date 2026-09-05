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

# Let's test a comprehensive dictionary of substitutions
SUBS = [
    (r"\bmet au point la\b", "conçoit la"),
    (r"\bmet au point le\b", "conçoit le"),
    (r"\bmet au point les\b", "conçoit les"),
    (r"\bmet au point l'\b", "conçoit l'"),
    (r"\bmet au point d'\b", "conçoit d'"),
    (r"\bmet au point de\b", "conçoit"),
    (r"\bmet au point un\b", "conçoit un"),
    (r"\bmet au point une\b", "conçoit une"),
    (r"\bmet au point des\b", "conçoit des"),
    (r"\bmet au point\b", "conçoit"),
    (r"\bmettent au point\b", "conçoivent"),
    (r"\bmet en place la\b", "instaure la"),
    (r"\bmet en place le\b", "instaure le"),
    (r"\bmet en place les\b", "instaure les"),
    (r"\bmet en place l'\b", "instaure l'"),
    (r"\bmet en place un\b", "instaure un"),
    (r"\bmet en place une\b", "instaure une"),
    (r"\bmet en place des\b", "instaure des"),
    (r"\bmet en place\b", "instaure"),
    (r"\bmettent en place\b", "instaurent"),
    (r"\bmet en service\b", "lance"),
    (r"\bmettent en service\b", "lancent"),
    (r"\bprend ses fonctions de\b", "devient"),
    (r"\bprend ses fonctions\b", "entre en fonction"),
    (r"\bprend la tête de la\b", "dirige la"),
    (r"\bprend la tête du\b", "dirige le"),
    (r"\bprend la tête des\b", "dirige les"),
    (r"\bprend la tête d'\b", "dirige "),
    (r"\bprend la direction de la\b", "dirige la"),
    (r"\bprend la direction du\b", "dirige le"),
    (r"\bprend la direction des\b", "dirige les"),
    (r"\bprend la direction d'\b", "dirige "),
    (r"\bprend part à la\b", "participe à la"),
    (r"\bprend part au\b", "participe au"),
    (r"\bprend part aux\b", "participe aux"),
    (r"\bprend part à\b", "participe à"),
    (r"\bfait son entrée dans\b", "entre dans"),
    (r"\bfait son entrée à\b", "entre à"),
    (r"\bfait son entrée au\b", "entre au"),
    (r"\bfait ériger des\b", "érige des"),
    (r"\bfait ériger un\b", "érige un"),
    (r"\bfait ériger une\b", "érige une"),
    (r"\bfait ériger\b", "érige"),
    (r"\bfait construire des\b", "construit des"),
    (r"\bfait construire un\b", "construit un"),
    (r"\bfait construire une\b", "construit une"),
    (r"\bfait construire\b", "construit"),
    (r"\bse voit décerner le\b", "reçoit le"),
    (r"\bse voit décerner la\b", "reçoit la"),
    (r"\bse voit décerner les\b", "reçoit les"),
    (r"\bse voit décerner l'\b", "reçoit l'"),
    (r"\bse voit attribuer le\b", "reçoit le"),
    (r"\bse voit attribuer la\b", "reçoit la"),
    (r"\bse voit attribuer les\b", "reçoit les"),
    (r"\bse voit attribuer l'\b", "reçoit l'"),
    (r"\bse voit confier la\b", "reçoit la"),
    (r"\bse voit confier le\b", "reçoit le"),
    (r"\bse voit confier les\b", "reçoit les"),
    (r"\bse voit confier l'\b", "reçoit l'"),
    (r"\bà travers le monde\b", "dans le monde"),
    (r"\bdans le monde entier\b", "dans le monde"),
    (r"\bau cours de la guerre\b", "pendant la guerre"),
    (r"\bau cours de la\b", "pendant la"),
    (r"\bau cours du\b", "pendant le"),
    (r"\bau cours des\b", "pendant les"),
    (r"\bau cours d'\b", "pendant "),
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
    (r"\bde la part de\b", "par"),
    (r"\ben faveur de\b", "pour"),
    (r"\bà l'encontre de\b", "contre"),
    (r"\bdans le but de\b", "pour"),
    (r"\ben vue de\b", "pour"),
    (r"\bafin de\b", "pour"),
    (r"\bà l'âge de\b", "à"),
    (r"\ben solitaire\b", ""),
    (r"\bdans une famille de\b", "dans une famille"),
    (r"\bdans une famille\b", "en famille"),
    (r"\bau sein de la dynastie\b", "dans la dynastie"),
    (r"\bau sein de la\b", "dans la"),
    (r"\bau sein du\b", "dans le"),
    (r"\bau sein des\b", "dans les"),
    (r"\bau sein d'\b", "dans "),
    (r"\bMise au point de la\b", "Développement de la"),
    (r"\bMise au point du\b", "Développement du"),
    (r"\bMise au point des\b", "Développement des"),
    (r"\bMise au point d'\b", "Développement d'"),
    (r"\bMise au point de\b", "Développement de"),
    (r"\bMise en place de la\b", "Création de la"),
    (r"\bMise en place du\b", "Création du"),
    (r"\bMise en place des\b", "Création des"),
    (r"\bMise en place d'\b", "Création d'"),
    (r"\bMise en place de\b", "Création de"),
    (r"\bMise en service de la\b", "Lancement de la"),
    (r"\bMise en service du\b", "Lancement du"),
    (r"\bMise en service des\b", "Lancement des"),
    (r"\bMise en service d'\b", "Lancement d'"),
    (r"\bMise en service de\b", "Lancement de"),
    (r"\bPrix Nobel de\b", "Nobel de"),
    (r"\bprix Nobel de\b", "Nobel de"),
]

def clean_spaces(text):
    return re.sub(r'\s+', ' ', text).strip()

fixed = 0
for p, ev in long_events:
    t = ev['titre']
    for pat, rep in SUBS:
        t = re.sub(pat, rep, t)
    t = clean_spaces(t)
    if len(t.split()) <= 6:
        fixed += 1
    else:
        # Try dropping leading article
        w = t.split()
        if w[0] in ['Le', 'La', 'Les', 'Un', 'Une'] and not w[1].startswith('«'):
            t2 = w[1].capitalize() + ' ' + ' '.join(w[2:])
            if len(t2.split()) <= 6:
                fixed += 1

print(f"Fixed: {fixed} / {len(long_events)}")
