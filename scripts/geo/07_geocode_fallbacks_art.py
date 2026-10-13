import json,time,urllib.request,urllib.parse,sys
sys.path.insert(0,'.')
from annot_art import A
nom=json.load(open('nominatim_art.json'))
used={q for q,_ in A.values()}
empty=[q for q in used if not nom.get(q)]
# variantes plus simples, essayées dans l'ordre
manual={'Basilique Saint-Marc, Venise':['Basilique Saint-Marc'],'Basilique Saint-Vital, Ravenne':['Basilica di San Vitale, Ravenna'],
'Bayon, Angkor Thom':['Bayon Temple, Siem Reap'],"Cathédrale Saint-Lazare d'Autun":['Cathédrale Saint-Lazare, Autun','Autun'],
'Cercles mégalithiques de Wassu':['Wassu Stone Circles','Wassu, Gambie'],'Chambre de la Signature, Vatican':['Musées du Vatican'],
'Chapelle des Scrovegni, Padoue':['Cappella degli Scrovegni','Padoue'],'Chapelle palatine, Aix-la-Chapelle':['Cathédrale d\'Aix-la-Chapelle'],
'Château de Schönbrunn':['Schloss Schönbrunn, Vienne'],'Cloud Gate, Millennium Park, Chicago':['Millennium Park, Chicago'],
'Grand Sphinx de Gizeh':['Sphinx de Gizeh','Great Sphinx of Giza'],'Grand Stûpa de Sânchî':['Sanchi Stupa','Sanchi'],
'Grande Mosquée de Kilwa Kisiwani':['Kilwa Kisiwani'],'Grande Mosquée des Omeyyades, Damas':['Mosquée des Omeyyades, Damas'],
'Grotte de Seokguram, Gyeongju':['Seokguram'],"Grottes d'Ajanta":['Ajanta Caves'],'Julien Levy Gallery, New York':['East 57th Street, New York'],
'Mathaf, Doha':['Mathaf: Arab Museum of Modern Art'],"Musée d'art islamique, Doha":['Museum of Islamic Art, Doha'],
"Musée d'art islamique, Le Caire":['Museum of Islamic Art, Cairo'],'Musée national du Brésil, Rio de Janeiro':['Museu Nacional, Rio de Janeiro','Quinta da Boa Vista, Rio'],
'Musée national du Palais, Taipei':['National Palace Museum, Taipei'],'Mont Suribachi, Iwo Jima':['Mount Suribachi'],'Mosquée Shah, Ispahan':['Mosquée de l\'Imam, Ispahan','Imam Mosque, Isfahan'],
'Mosquée-madrasa du sultan Hassan, Le Caire':['Mosque-Madrasa of Sultan Hasan, Cairo'],"Obélisques d'Aksoum":['Aksum Obelisk','Aksoum'],
'Palais national, Mexico':['Palacio Nacional, Ciudad de México'],'Pyramide de Kukulcán, Chichén Itzá':['El Castillo, Chichén Itzá','Chichén Itzá'],
'Temple de Kailasa, Ellora':['Kailasa Temple, Ellora','Ellora Caves'],'Temple des Inscriptions, Palenque':['Palenque'],
'Théâtre de Babylone, Paris':['Paris'],'Tombeau de Humayun, Delhi':['Humayun\'s Tomb'],'Églises rupestres de Lalibela':['Lalibela'],
'Île de la Grande Jatte, Courbevoie':['Île de la Jatte, Neuilly-sur-Seine']}
for q in empty:
    for v in manual.get(q,[q.split(',')[0]]):
        j=json.load(urllib.request.urlopen(urllib.request.Request('https://nominatim.openstreetmap.org/search?'+urllib.parse.urlencode({'q':v,'format':'jsonv2','limit':1,'accept-language':'fr'}),headers={'User-Agent':'HistoriAxeGeoPrototype/0.1 (ruben.arditti@gmail.com)'}),timeout=30))
        time.sleep(1.2)
        if j:
            nom[q]=[{'lat':float(j[0]['lat']),'lon':float(j[0]['lon']),'name':j[0]['display_name'],'type':j[0].get('type'),'via':v}]; break
json.dump(nom,open('nominatim_art.json','w'),ensure_ascii=False,indent=1)
print('encore vides:',[q for q in used if not nom.get(q)])
