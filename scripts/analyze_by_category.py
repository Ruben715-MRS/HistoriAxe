import json
import sys
from analyze_sentences import split_sentences

sys.stdout.reconfigure(encoding='utf-8')

with open('data/fr.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

by_cat = {}
def rec(node, current_cat=''):
    if isinstance(node, dict):
        # Check if top category
        nom = node.get('nom', current_cat)
        if 'categories' in node:
            pass
        elif 'subcategories' in node:
            current_cat = nom
        if 'events' in node and isinstance(node['events'], list):
            for ev in node['events']:
                cnt = len(split_sentences(ev.get('description', '')))
                if current_cat not in by_cat:
                    by_cat[current_cat] = {'total': 0, '1': 0, '2': 0, '3': 0, '4+': 0}
                by_cat[current_cat]['total'] += 1
                if cnt == 1:
                    by_cat[current_cat]['1'] += 1
                elif cnt == 2:
                    by_cat[current_cat]['2'] += 1
                elif cnt == 3:
                    by_cat[current_cat]['3'] += 1
                else:
                    by_cat[current_cat]['4+'] += 1
        for k, v in node.items():
            if k != 'events':
                rec(v, current_cat)
    elif isinstance(node, list):
        for i in node:
            rec(i, current_cat)

rec(data)

print(f"{'Catégorie':<45} | {'Total':>6} | {'Déjà 3 phrases':>15} | {'À traiter':>10}")
print("-" * 82)
tot_all = 0
tot_3 = 0
tot_need = 0
for cat, stats in sorted(by_cat.items(), key=lambda x: -x[1]['total']):
    need = stats['1'] + stats['2'] + stats['4+']
    pct = stats['3'] / stats['total'] * 100
    tot_all += stats['total']
    tot_3 += stats['3']
    tot_need += need
    print(f"{cat:<45} | {stats['total']:>6} | {stats['3']:>8} ({pct:>5.1f}%) | {need:>10}")

print("-" * 82)
print(f"{'TOTAL':<45} | {tot_all:>6} | {tot_3:>8} ({tot_3/tot_all*100:>5.1f}%) | {tot_need:>10}")
