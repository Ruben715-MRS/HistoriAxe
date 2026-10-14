#!/usr/bin/env python3
"""Vérifie un fichier d'annotations contre son lot : python3 13_validate_annot.py <lot>  (ex. p000)"""
import json, os, sys
WORK = os.path.join(os.path.dirname(__file__), 'work')
lot = sys.argv[1]
batch = json.load(open(os.path.join(WORK, 'batches', lot + '.json')))
ann = json.load(open(os.path.join(WORK, 'annot', lot + '.json')))
errs = []
if [b['id'] for b in batch] != [a.get('id') for a in ann]:
    errs.append('les ids (ou leur ordre) ne correspondent pas au lot : %d attendus, %d reçus' % (len(batch), len(ann)))
for a in ann:
    p = a.get('precision')
    if p not in ('site', 'ville', 'zone', 'none'): errs.append(f"{a.get('id')}: precision invalide"); continue
    if p != 'none' and (not a.get('place') or not isinstance(a.get('cc'), str) or len(a['cc']) != 2): errs.append(f"{a['id']}: place/cc manquant")
    if p == 'none' and (a.get('place') or a.get('cc')): errs.append(f"{a['id']}: none doit avoir place/cc vides")
    if a.get('conf') not in ('high', 'low'): errs.append(f"{a['id']}: conf invalide")
    if not isinstance(a.get('ambig'), bool): errs.append(f"{a['id']}: ambig doit être booléen")
print('OK' if not errs else '\n'.join(errs[:20]))
sys.exit(1 if errs else 0)
