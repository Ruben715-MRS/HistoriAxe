import json,sys,collections
sys.path.insert(0,'.')
from annot import A
ev={e['id']:e for e in json.load(open('events_fr.json'))}
nom=json.load(open('nominatim.json'))
out={};missing=[]
for i,(q,p) in A.items():
    if not q: continue
    r=nom.get(q)
    if not r: missing.append((i,q)); continue
    out[i]=[round(r[0]['lat'],4),round(r[0]['lon'],4),p,q]
json.dump(out,open('geo_fr_prototype.json','w'),ensure_ascii=False,indent=0)
print('missing',missing)
c=collections.Counter(v[2] for v in out.values()); print(c, 'none:',sum(1 for q,p in A.values() if not q))
playable=sum(1 for v in out.values() if v[2] in('site','ville')); print('jouables (site+ville):',playable,'/',len(A))
# diversité des points jouables
pts=collections.Counter(v[3] for v in out.values() if v[2] in('site','ville'))
print('lieux distincts jouables:',len(pts)); print(pts.most_common(8))
