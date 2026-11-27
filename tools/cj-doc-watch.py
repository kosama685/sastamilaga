"""Weekly official-documentation drift check. Changes require review, never blind schema updates."""
from pathlib import Path
from html.parser import HTMLParser
import urllib.request,hashlib,json,sys,datetime
class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[];self.skip=0
 def handle_starttag(self,t,a):
  if t in ('script','style'):self.skip+=1
 def handle_endtag(self,t):
  if t in ('script','style'):self.skip=max(0,self.skip-1)
 def handle_data(self,s):
  if not self.skip:self.parts.append(s)
base='https://developers.cjdropshipping.com/en/api/api2/api/'
files=['auth','setting','product','storage','shopping','logistic','dispute','shop']
rows=[]
for name in files:
 url=base+name+'.html'
 with urllib.request.urlopen(url,timeout=45) as r:raw=r.read().decode('utf-8')
 p=Text();p.feed(raw);text=' '.join(' '.join(p.parts).split());rows.append({'url':url,'sha256':hashlib.sha256(text.encode()).hexdigest(),'characters':len(text)})
baseline=Path(__file__).with_name('cj-doc-baseline.json')
if '--baseline' in sys.argv:baseline.write_text(json.dumps(rows,indent=2)+'\n');print('Official documentation baseline saved.');sys.exit()
old={r['url']:r['sha256'] for r in json.loads(baseline.read_text())}
for r in rows:r['changed']=old.get(r['url'])!=r['sha256']
Path('artifacts').mkdir(exist_ok=True);Path('artifacts/cj-doc-watch.json').write_text(json.dumps({'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sources':rows},indent=2))
changed=[r['url'] for r in rows if r['changed']];print(json.dumps({'review_required':changed},indent=2));sys.exit(bool(changed))
