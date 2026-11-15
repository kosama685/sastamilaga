"""URL compatibility only: old catalog data never renders new CJ pages."""
from pathlib import Path
import json,re,subprocess
root=Path(__file__).resolve().parents[1]
s=(root/'products.js').read_text(encoding='utf-8')
m=re.search(r'window\.SASTA_PRODUCTS\s*=\s*',s)
products,_=json.JSONDecoder().raw_decode(s[m.end():])
def slug(s):return re.sub(r'^-|-$','',re.sub('[^a-z0-9]+','-',str(s).lower().strip().replace('&','and')))
paths={slug(p.get('h') or p.get('n') or p['id']):'/p/'+slug(p.get('h') or p.get('n') or p['id'])[:80].rstrip('-')+'-'+slug(p['id'])+'.html' for p in products}
body=json.dumps(paths,separators=(',',':')).encode()
target='/home/altugpaa/gdcs-private/cj-storefront-20261115/legacy-urls.json'
ssh=['ssh','-T','-oBatchMode=yes','-oStrictHostKeyChecking=yes','-p','21098','altugpaa@162.0.232.232']
subprocess.run(ssh+['cat > '+target+'.new'],input=body,check=True)
subprocess.run(ssh+['chmod 600 '+target+'.new && mv '+target+'.new '+target],check=True)
print(json.dumps({'legacy_handles':len(paths),'bytes':len(body),'purpose':'URL aliases only; no old product prices or stock'}))
