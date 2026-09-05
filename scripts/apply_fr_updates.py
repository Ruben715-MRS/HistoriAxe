import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("Loading shortened_map.json...")
with open('scripts/shortened_map.json', 'r', encoding='utf-8') as f:
    shortened_map = json.load(f)

print(f"Loaded {len(shortened_map)} shortened titles.")

print("Loading data/fr.json...")
with open('data/fr.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Ensure backup exists
if not os.path.exists('data/fr.json.bak'):
    print("Creating backup data/fr.json.bak...")
    with open('data/fr.json.bak', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

replaced_count = 0
not_in_map = []
all_events_count = 0

def update_events(node):
    global replaced_count, all_events_count
    if isinstance(node, dict):
        if 'events' in node and isinstance(node['events'], list):
            for ev in node['events']:
                all_events_count += 1
                eid = ev.get('id', '')
                old_titre = ev.get('titre', '')
                if eid in shortened_map:
                    new_titre = shortened_map[eid]
                    if new_titre != old_titre:
                        ev['titre'] = new_titre
                        replaced_count += 1
                else:
                    if len(old_titre.strip().split()) > 6:
                        not_in_map.append((eid, old_titre))
        for k, v in node.items():
            if k != 'events':
                update_events(v)
    elif isinstance(node, list):
        for item in node:
            update_events(item)

update_events(data)

print(f"Total events visited: {all_events_count}")
print(f"Total titles replaced: {replaced_count}")
print(f"Titles > 6 words not in map: {len(not_in_map)}")

if not_in_map:
    print("ERROR: Some titles > 6 words were not found in map!")
    for eid, t in not_in_map[:10]:
        print(f"  {eid}: {t}")
    sys.exit(1)

# Update metadata totalEvents
data['totalEvents'] = all_events_count

print("Writing updated data/fr.json...")
with open('data/fr.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Verifying saved data/fr.json...")
with open('data/fr.json', 'r', encoding='utf-8') as f:
    reloaded = json.load(f)

over_limit = []
def check_limit(node):
    if isinstance(node, dict):
        if 'events' in node and isinstance(node['events'], list):
            for ev in node['events']:
                t = ev.get('titre', '')
                if len(t.strip().split()) > 6:
                    over_limit.append((ev.get('id', ''), t, len(t.strip().split())))
        for k, v in node.items():
            if k != 'events':
                check_limit(v)
    elif isinstance(node, list):
        for item in node:
            check_limit(item)

check_limit(reloaded)

if over_limit:
    print(f"ERROR: {len(over_limit)} titles still exceed 6 words!")
    for eid, t, wc in over_limit[:10]:
        print(f"  {eid} ({wc} words): {t}")
    sys.exit(1)

print(f"SUCCESS! All {all_events_count} events in data/fr.json strictly satisfy len(titre.split()) <= 6!")
