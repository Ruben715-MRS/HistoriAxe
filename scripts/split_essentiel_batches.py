"""
Découpe essentiel_themes.json en fichiers d'entrée pour les sous-agents.
Groupes : 1 thème seul pour les >150 events, 2 pour 70-150, 3 pour <70.
"""
import json
import os
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('scripts/essentiel_themes.json', encoding='utf-8') as f:
    themes = json.load(f)

os.makedirs('scripts/batches_essentiel', exist_ok=True)

# Grouping strategy
solo = [t for t in themes if t['event_count'] >= 150]   # 4 themes alone
duo  = [t for t in themes if 70 <= t['event_count'] < 150]  # 2 per batch
trio = [t for t in themes if t['event_count'] < 70]    # 3 per batch

batches = []
for t in solo:
    batches.append([t])
for i in range(0, len(duo), 2):
    batches.append(duo[i:i+2])
for i in range(0, len(trio), 3):
    batches.append(trio[i:i+3])

print(f"Total batches: {len(batches)}")
for i, batch in enumerate(batches, 1):
    names = [t['theme_nom'] for t in batch]
    counts = [t['event_count'] for t in batch]
    fname = f'scripts/batches_essentiel/batch_{i:02d}.json'
    with open(fname, 'w', encoding='utf-8') as f:
        json.dump(batch, f, ensure_ascii=False, indent=2)
    print(f"  Batch {i:02d}: {names} ({counts})")

print("\nDone.")
