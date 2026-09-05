import re
import sys
sys.path.append('scripts')
from analyze_sentences import split_sentences
import json

with open('scripts/batches_desc/batch_001_done.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

for eid, desc in d.items():
    s = split_sentences(desc)
    if len(s) != 3:
        print(f"[{eid}] ({len(s)} phrases): {desc}")
