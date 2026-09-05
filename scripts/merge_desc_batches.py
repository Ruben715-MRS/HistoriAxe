import json
import glob
import os
import sys
from analyze_sentences import split_sentences

sys.stdout.reconfigure(encoding='utf-8')

master_map = {}
if os.path.exists('scripts/desc_map.json'):
    with open('scripts/desc_map.json', 'r', encoding='utf-8') as f:
        master_map = json.load(f)

done_files = sorted(glob.glob('scripts/batches_desc/batch_*_done.json'))
for fpath in done_files:
    with open(fpath, 'r', encoding='utf-8') as f:
        d = json.load(f)
        master_map.update(d)

with open('scripts/desc_map.json', 'w', encoding='utf-8') as f:
    json.dump(master_map, f, ensure_ascii=False, indent=2)

print(f"Total entries in desc_map: {len(master_map)} / 9857 ({len(master_map)/9857*100:.1f}%)")
print(f"Completed batch files: {len(done_files)} / 198")

# Check if any description does not have exactly 3 sentences
bad = {}
for k, v in master_map.items():
    s = split_sentences(v)
    if len(s) != 3:
        bad[k] = (len(s), v)

if bad:
    print(f"WARNING: {len(bad)} descriptions do not have exactly 3 sentences:")
    for k, (cnt, text) in list(bad.items())[:5]:
        print(f"  {k} ({cnt} phrases): {text}")
else:
    print("All entries in master desc_map strictly have exactly 3 sentences!")
