"""Download and optimize licensed destination photography for local serving."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
import requests, hashlib, io, json
dest=Path('assets/landing');dest.mkdir(exist_ok=True)
commons={
 'serbia':('Panorama of Belgrade from Kalemegdan fortress.jpg','Boksi','CC BY-SA 3.0'),
 'pakistan':('Badshahi Mosque 2024.jpg','Wikimedia Commons contributor','CC0 1.0'),
 'saudi-arabia':('Riyadh Skyline.jpg','B.alotaby','CC BY-SA 4.0')
}
unsplash={'germany':'photo-1467269204594-9661b134dd2b','uk':'photo-1513635269975-59663e0ac1ad','usa':'photo-1485871981521-5b1fd3805eee'}
def download(m):
 if m in commons:
  filename,author,license=commons[m];name=filename.replace(' ','_');h=hashlib.md5(name.encode()).hexdigest()
  url=f'https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[:2]}/{name}'
  source='https://commons.wikimedia.org/wiki/File:'+name
 else:
  url='https://images.unsplash.com/'+unsplash[m]+'?w=1600&q=85&fit=crop';source='https://unsplash.com';author='Unsplash contributor';license='Unsplash License'
 r=requests.get(url,timeout=40,headers={'User-Agent':'SastaMilaga-Website/1.0 (https://sastamilaga.com/contact/)'});r.raise_for_status()
 im=Image.open(io.BytesIO(r.content)).convert('RGB');im.thumbnail((1600,1000));im.save(dest/(m+'.webp'),'WEBP',quality=84)
 return dict(market=m,source=source,author=author,license=license,bytes=(dest/(m+'.webp')).stat().st_size)
with ThreadPoolExecutor(max_workers=6) as pool:
 result=list(pool.map(download,[*commons,*unsplash]))
(dest/'credits.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
