import json,sys
d=json.load(open('/home/user/HistoriAxe/data/fr.json'))
def find(n,tid):
    for k in ('subcategories','themes','categories'):
        for c in n.get(k,[]) or []:
            if c.get('id')==tid: return c
            r=find(c,tid)
            if r: return r
t=find(d,'thm_fr')
json.dump([{'id':e['id'],'date':e['date'],'titre':e['titre'],'description':e['description'],'wikipedia':e['wikipedia']} for e in t['events']],open('events_fr.json','w'),ensure_ascii=False,indent=1)
print(len(t['events']))
