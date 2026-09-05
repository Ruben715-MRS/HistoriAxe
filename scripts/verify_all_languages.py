import json
import glob
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

lang_files = sorted(glob.glob('data/*.json'))

print("=== VERIFYING ALL GAME DATASETS ===")
grand_total_events = 0
has_errors = False

for fpath in lang_files:
    if fpath.endswith('.bak'):
        continue
    with open(fpath, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except Exception as e:
            print(f"ERROR: {fpath} failed to parse: {e}")
            has_errors = True
            continue

    events = []
    def recurse(node):
        if isinstance(node, dict):
            if 'events' in node and isinstance(node['events'], list):
                for ev in node['events']:
                    events.append(ev)
            for k, v in node.items():
                if k != 'events':
                    recurse(v)
        elif isinstance(node, list):
            for item in node:
                recurse(item)

    recurse(data)
    over_limit = []
    empty_titles = []
    for ev in events:
        t = ev.get('titre', '')
        if not t or not t.strip():
            empty_titles.append(ev.get('id', 'unknown'))
        elif len(t.strip().split()) > 6:
            over_limit.append((ev.get('id', ''), t, len(t.strip().split())))

    status = "OK" if not over_limit and not empty_titles else "FAILED"
    print(f"[{status}] {fpath}: {len(events)} events | >6 words: {len(over_limit)} | empty: {len(empty_titles)}")
    if over_limit:
        has_errors = True
        for eid, t, wc in over_limit[:5]:
            print(f"    {eid} ({wc} words): {t}")
    if empty_titles:
        has_errors = True
        print(f"    Empty titles: {empty_titles[:5]}")
    grand_total_events += len(events)

print(f"\nGrand Total Events checked across all languages: {grand_total_events}")
if has_errors:
    print("FAILED: Some titles violate constraints!")
    sys.exit(1)
else:
    print("ALL LANGUAGES 100% COMPLIANT WITH <= 6 WORDS CONSTRAINT!")
