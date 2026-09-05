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
print(f"Total long events to test: {len(long_events)}")

# Adjectives / qualifiers that are often superfluous in titles
WEAK_ADJECTIVES = [
    r"\bmilitaire absolu\b",
    r"\bcourageuse\b",
    r"\bsecrète\b",
    r"\blongue\b",
    r"\bgénérale\b",
    r"\bmondiale\b",
    r"\bgrandiose\b",
    r"\babsolu\b",
    r"\babsolue\b",
    r"\bmassive\b",
    r"\bmassif\b",
    r"\bmarquante\b",
    r"\bmarquant\b",
    r"\bimportant\b",
    r"\bimportante\b",
    r"\bpuissante\b",
    r"\bpuissant\b",
    r"\bconsidérable\b",
    r"\bmajeure\b",
    r"\bmajeur\b",
    r"\bclassiques et historiques\b",
    r"\bdu monde\b",
    r"\bdans le monde entier\b",
    r"\bà travers le monde\b",
    r"\bdans le monde\b",
    r"\bde manière décisive\b",
    r"\bde façon décisive\b",
]

def try_shorten(title, path):
    if len(title.split()) <= 6:
        return title
        
    orig = title
    t = title
    
    # Check for comma / colon with second part that can be pruned or shortened
    if ',' in t and len(t.split()) > 6:
        parts = [p.strip() for p in t.split(',')]
        # If first part has 3 to 6 words and represents a full title
        if 3 <= len(parts[0].split()) <= 6:
            # Check if second part is a location or qualifier
            p2 = parts[1].split()
            # e.g., "San Juan, Porto Rico", "Lugano, Suisse", "Rome, Italie"
            if len(p2) <= 3 and any(p2[-1].startswith(c) for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"):
                cand = parts[0]
                if len(cand.split()) <= 6:
                    t = cand
                    
    # Check weak adjectives
    if len(t.split()) > 6:
        for adj in WEAK_ADJECTIVES:
            cand = re.sub(r'\s+' + adj, '', t)
            cand = re.sub(adj + r'\s+', '', cand)
            if len(cand.split()) < len(t.split()):
                t = cand
                if len(t.split()) <= 6:
                    break

    # Leading article drop
    if len(t.split()) > 6:
        words = t.split()
        if words[0] in ['Le', 'La', 'Les', 'Un', 'Une'] and not words[1].startswith('«'):
            cand = words[1].capitalize() + ' ' + ' '.join(words[2:])
            if len(cand.split()) <= 6:
                t = cand

    return t

fixed = 0
for p, ev in long_events:
    cand = try_shorten(ev['titre'], p)
    if len(cand.split()) <= 6:
        fixed += 1

print(f"Fixed with simple test rules: {fixed} / {len(long_events)}")
