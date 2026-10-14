import json,time,urllib.request,urllib.parse,sys
sys.path.insert(0,'.')
from annot import A
qs=sorted({q for q,p in A.values() if q})
try: out=json.load(open('nominatim.json'))
except Exception: out={}
for q in qs:
    if q in out: continue
    url='https://nominatim.openstreetmap.org/search?'+urllib.parse.urlencode({'q':q,'format':'jsonv2','limit':1,'accept-language':'fr'})
    for a in range(4):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'HistoriAxeGeoPrototype/0.1 (ruben.arditti@gmail.com)'})
            j=json.load(urllib.request.urlopen(req,timeout=30))
            out[q]=[{'lat':float(j[0]['lat']),'lon':float(j[0]['lon']),'name':j[0]['display_name'],'type':j[0].get('type'),'bbox':j[0].get('boundingbox')}] if j else []
            break
        except Exception as e:
            time.sleep(5)
    time.sleep(1.2)
json.dump(out,open('nominatim.json','w'),ensure_ascii=False,indent=1)
print(len(out),'queries; empty:',[q for q,v in out.items() if not v])
