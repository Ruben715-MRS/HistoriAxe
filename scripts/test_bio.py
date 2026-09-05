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
bio_long = [(p, ev) for p, ev in events if 'Biographies' in p and len(ev.get('titre', '').split()) in (7, 8)]
print(f"Total long in Biographies: {len(bio_long)}")

def shorten_bio(title, theme):
    words = title.split()
    if len(words) <= 6:
        return title
    t = title
    
    # Check "Naissance"
    if t.startswith("Naissance"):
        # "Naissance à X dans une famille Y"
        m = re.match(r"Naissance à (.+?) dans une famille (.+)", t)
        if m:
            cand = f"Naissance à {m.group(1)} en famille {m.group(2)}"
            if len(cand.split()) <= 6: return cand
            return f"Naissance à {m.group(1)}"
        # "Naissance dans une famille X à Y"
        m = re.match(r"Naissance dans une famille (.+?) à (.+)", t)
        if m:
            cand = f"Naissance en famille {m.group(1)} à {m.group(2)}"
            if len(cand.split()) <= 6: return cand
            return f"Naissance en famille {m.group(1)}"
        # "Naissance de X à Y"
        m = re.match(r"Naissance de (.+?) à (.+)", t)
        if m:
            cand = f"Naissance à {m.group(2)}"
            if len(cand.split()) <= 6: return cand
        # "Naissance au sein de la dynastie X"
        m = re.match(r"Naissance au sein de la dynastie (.+)", t)
        if m:
            return f"Naissance dans la dynastie {m.group(1)}"
            
    # Check "Mort"
    if t.startswith("Mort"):
        # "Mort à l'âge de X ans à Y"
        m = re.match(r"Mort à l'âge de (\d+) ans à (.+)", t)
        if m:
            cand = f"Mort à {m.group(1)} ans à {m.group(2)}"
            if len(cand.split()) <= 6: return cand
            return f"Mort à {m.group(1)} ans"
        # "Mort de X à Y"
        m = re.match(r"Mort de (.+?) à (.+)", t)
        if m and len(t.split()) > 6:
            # Person is theme
            cand = f"Mort à {m.group(2)}"
            if len(cand.split()) <= 6: return cand

    # Check "Devient"
    if t.startswith("Devient"):
        # "Devient une icône mondiale de la conquête spatiale" -> "Icône de la conquête spatiale"
        cand = re.sub(r"^Devient (une?|le|la|les)?\s*", "", t)
        cand = cand[0].capitalize() + cand[1:]
        if len(cand.split()) <= 6: return cand
        
    return t

fixed = 0
for p, ev in bio_long:
    th = p.split('>')[-1].strip()
    res = shorten_bio(ev['titre'], th)
    if len(res.split()) <= 6:
        fixed += 1

print(f"Fixed in Biographies with initial bio rules: {fixed} / {len(bio_long)}")
