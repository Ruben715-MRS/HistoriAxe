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

def shorten_candidate(title, theme_name=""):
    words = title.split()
    orig = title
    
    # 1. Leading articles: Le, La, Les, Un, Une (only if removing gets <= 6 words or helps)
    # But preserve if part of proper name or work title in quotes
    # 2. Frequent verbose verb phrases:
    # "met au point" -> "développe" (-2 words)
    # "prend part à" -> "participe à" (-1 word)
    # "se séparent de" -> "se séparent de"
    # "fait ériger" -> "érige" (-1 word)
    # "met en place" -> "crée" (-2 words)
    # "met en service" -> "lance" (-2 words)
    # "entre en service" -> "entre en service"
    # "remporte la victoire à la bataille de" -> "victoire à la bataille de" (-2 words)
    # "est élu comme premier" -> "élu premier" (-2 words)
    # "se voit décerner le prix" -> "reçoit le prix" (-2 words)
    # "est nommé au poste de" -> "est nommé" (-2 words)
    # "se voit attribuer" -> "reçoit" (-2 words)
    # "donne son accord pour" -> "autorise" (-3 words)
    # "prend ses fonctions de" -> "devient" (-3 words)
    
    return title

print(f"Total long events: {len(long_events)}")
