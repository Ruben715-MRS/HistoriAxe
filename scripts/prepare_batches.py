import json
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

os.makedirs('scripts/batches', exist_ok=True)

# 1. Load or initialize master shortened map
master_map = {}
if os.path.exists('scripts/shortened_map.json'):
    with open('scripts/shortened_map.json', 'r', encoding='utf-8') as f:
        master_map = json.load(f)

# Incorporate already done test samples
for fpath in ['scripts/sample50_done.json', 'scripts/sample50_2_done.json', 'scripts/sample100_done.json']:
    if os.path.exists(fpath):
        with open(fpath, 'r', encoding='utf-8') as f:
            d = json.load(f)
            master_map.update(d)

print(f"Current master map has {len(master_map)} entries.")

# 2. Load all events from fr.json
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

# Find all events that still need shortening (>6 words and not in master_map)
to_shorten = []
for p, ev in events:
    eid = ev.get('id', '')
    titre = master_map.get(eid, ev.get('titre', ''))
    if len(titre.split()) > 6:
        to_shorten.append((eid, titre))

print(f"Total events still to shorten: {len(to_shorten)}")

# Save remaining into batches of 150 items
batch_size = 150
batches = []
for i in range(0, len(to_shorten), batch_size):
    chunk = dict(to_shorten[i:i+batch_size])
    batch_num = (i // batch_size) + 1
    batch_in = f"scripts/batches/batch_{batch_num:03d}.json"
    batch_out = f"scripts/batches/batch_{batch_num:03d}_done.json"
    # only write if done file doesn't exist
    if not os.path.exists(batch_out):
        with open(batch_in, 'w', encoding='utf-8') as f:
            json.dump(chunk, f, ensure_ascii=False, indent=2)
    batches.append((batch_num, batch_in, batch_out, len(chunk)))

with open('scripts/shortened_map.json', 'w', encoding='utf-8') as f:
    json.dump(master_map, f, ensure_ascii=False, indent=2)

print(f"Created/verified {len(batches)} batches.")
