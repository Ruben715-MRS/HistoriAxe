import json
import glob
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

master_map = {}
if os.path.exists('scripts/shortened_map.json'):
    with open('scripts/shortened_map.json', 'r', encoding='utf-8') as f:
        master_map = json.load(f)

done_files = sorted(glob.glob('scripts/batches/batch_*_done.json'))
for fpath in done_files:
    with open(fpath, 'r', encoding='utf-8') as f:
        d = json.load(f)
        master_map.update(d)

with open('scripts/shortened_map.json', 'w', encoding='utf-8') as f:
    json.dump(master_map, f, ensure_ascii=False, indent=2)

print(f"Total entries in master map: {len(master_map)} / 7055 ({len(master_map)/7055*100:.1f}%)")
print(f"Completed batch files: {len(done_files)} / 46")

# Check if any title in master map > 6 words
over6 = {k: v for k, v in master_map.items() if len(v.split()) > 6}
if over6:
    print(f"WARNING: {len(over6)} entries still have > 6 words:")
    for k, v in list(over6.items())[:5]:
        print(f"  {k}: {len(v.split())} words: '{v}'")
else:
    print("All entries in master map strictly <= 6 words!")
