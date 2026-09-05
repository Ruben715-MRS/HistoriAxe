"""
Fusionne tous les *_done.json de batches_essentiel/ dans essentiel_map.json.
Valide que chaque thème a exactement 30 IDs (ou le bon nombre selon la taille).
"""
import json
import os
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

batches_dir = 'scripts/batches_essentiel'
output_file = 'scripts/essentiel_map.json'

# Load existing map if any
if os.path.exists(output_file):
    with open(output_file, encoding='utf-8') as f:
        essentiel_map = json.load(f)
else:
    essentiel_map = {}

# Load all _done files
done_files = sorted([f for f in os.listdir(batches_dir) if f.endswith('_done.json')])
print(f"Found {len(done_files)} done files.")

new_entries = 0
warnings = 0
for fname in done_files:
    fpath = os.path.join(batches_dir, fname)
    with open(fpath, encoding='utf-8') as f:
        content = json.load(f)

    # Content can be a list or a single dict
    if isinstance(content, dict):
        content = [content]

    for entry in content:
        theme_id = entry.get('theme_id', '')
        theme_nom = entry.get('theme_nom', '')
        essentiel = entry.get('essentiel', [])
        key = theme_id or theme_nom

        if not essentiel:
            print(f"  WARNING [{fname}]: empty essentiel for {theme_nom}")
            warnings += 1
            continue

        if len(essentiel) != 30:
            print(f"  WARNING [{fname}]: {theme_nom} has {len(essentiel)} events (expected 30)")
            warnings += 1

        # Check for duplicates
        if len(set(essentiel)) != len(essentiel):
            dupes = [x for x in essentiel if essentiel.count(x) > 1]
            print(f"  WARNING [{fname}]: {theme_nom} has duplicate IDs: {set(dupes)}")
            warnings += 1

        if key not in essentiel_map:
            new_entries += 1
        essentiel_map[key] = {
            'theme_nom': theme_nom,
            'essentiel': essentiel
        }

print(f"\nTotal themes in map: {len(essentiel_map)}")
print(f"New entries this run: {new_entries}")
print(f"Warnings: {warnings}")

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(essentiel_map, f, ensure_ascii=False, indent=2)

print(f"\nessentiel_map.json saved ({len(essentiel_map)} themes).")
