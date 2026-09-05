import json
import os
import sys
from analyze_sentences import split_sentences

sys.stdout.reconfigure(encoding='utf-8')

os.makedirs('scripts/batches_desc', exist_ok=True)

# Load master map of already processed descriptions if exists
master_desc = {}
if os.path.exists('scripts/desc_map.json'):
    with open('scripts/desc_map.json', 'r', encoding='utf-8') as f:
        master_desc = json.load(f)

print(f"Existing master desc map has {len(master_desc)} entries.")

# Load fr.json
with open('data/fr.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

events = []
def recurse(node, cat_nom="", subcat_nom="", theme_nom=""):
    if isinstance(node, dict):
        if 'categories' in node:
            for c in node['categories']:
                recurse(c, c.get('nom', ''), subcat_nom, theme_nom)
            return
        if 'subcategories' in node:
            for sc in node['subcategories']:
                recurse(sc, cat_nom, sc.get('nom', ''), theme_nom)
            return
        if 'themes' in node:
            for th in node['themes']:
                recurse(th, cat_nom, subcat_nom, th.get('nom', ''))
            return
        if 'events' in node and isinstance(node['events'], list):
            for ev in node['events']:
                events.append({
                    'category': cat_nom,
                    'subcategory': subcat_nom,
                    'theme': theme_nom,
                    'axe': ev.get('axe', ''),
                    'id': ev.get('id', ''),
                    'titre': ev.get('titre', ''),
                    'date': ev.get('date', ''),
                    'description': ev.get('description', ''),
                    'wikipedia': ev.get('wikipedia', '')
                })
            return

recurse(data)

print(f"Total events traversed: {len(events)}")

# Filter events that need 3 sentences and are not already in master_desc
to_process = []
seen_ids = set()
for ev in events:
    eid = ev['id']
    if eid in seen_ids:
        continue
    seen_ids.add(eid)
    
    current_desc = master_desc.get(eid, ev['description'])
    sents = split_sentences(current_desc)
    if len(sents) != 3:
        to_process.append(ev)

print(f"Total unique events needing 3 sentences: {len(to_process)}")

# Split into batches of 50 events
BATCH_SIZE = 50
batches = []
for i in range(0, len(to_process), BATCH_SIZE):
    chunk = to_process[i:i + BATCH_SIZE]
    batch_num = (i // BATCH_SIZE) + 1
    batch_in = f"scripts/batches_desc/batch_{batch_num:03d}.json"
    batch_out = f"scripts/batches_desc/batch_{batch_num:03d}_done.json"
    
    if not os.path.exists(batch_out):
        with open(batch_in, 'w', encoding='utf-8') as f:
            json.dump(chunk, f, ensure_ascii=False, indent=2)
    batches.append((batch_num, batch_in, batch_out, len(chunk)))

print(f"Generated/verified {len(batches)} batches of up to {BATCH_SIZE} events each in scripts/batches_desc/")
