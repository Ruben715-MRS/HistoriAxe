import json,time,urllib.request,urllib.error
ev=json.load(open('events_fr.json'))
titles=sorted({e['wikipedia'].split('/wiki/')[-1] for e in ev})
try: out=json.load(open('wp_coords.json'))
except Exception: out={}
for i,t in enumerate(titles):
    if t in out: continue
    while True:
        try:
            req=urllib.request.Request('https://fr.wikipedia.org/api/rest_v1/page/summary/'+t,headers={'User-Agent':'HistoriAxeProbe/0.1 (ruben.arditti@gmail.com)'})
            j=json.load(urllib.request.urlopen(req,timeout=30))
            out[t]={'title':j.get('title'),'coords':j.get('coordinates')}; break
        except urllib.error.HTTPError as e:
            if e.code==404: out[t]={'error':404}; break
            time.sleep(int(e.headers.get('retry-after','20'))+1)
        except Exception: time.sleep(5)
    time.sleep(0.6)
    if i%10==0: json.dump(out,open('wp_coords.json','w'),ensure_ascii=False)
json.dump(out,open('wp_coords.json','w'),ensure_ascii=False); print('done')
