"""Select existing Pakistan products by shopping use; never derive promotional prices."""
import csv,json,re
from pathlib import Path
from urllib.parse import urlsplit
rules={'home':r'Home & Living','kitchen':r'Kitchen|Cooking|Dining|Juicer|Coffee','lighting':r'Light|Lamp|Lantern','fashion':r'Fashion & Apparel','beauty':r'Health & Beauty','electronics':r'Electronics','toys':r'Toys & Games','school':r'Books & Stationery|School|Stationery','outdoor':r'Sport|Outdoor|Water Bottle|Garden','travel':r'Bag|Travel|Luggage','christmas':r'Home & Living|Light|Lamp|Gift'}
groups={k:[] for k in rules};seen={k:set() for k in rules}
with open('products.csv',encoding='utf-8-sig',newline='') as f:
 for row in csv.DictReader(f):
  if row.get('Published')!='1' or row.get('In stock?')!='1':continue
  url=urlsplit(row.get('Page URL','')).path
  if url.startswith('/sastamilaga/'):url=url[len('/sastamilaga'):]
  if not url.startswith('/p/') or not Path('.'+url).exists():continue
  image=row.get('Images','').split(',')[0].strip()
  if not image.startswith('https://'):continue
  category=row.get('Categories','').split('>')[0].strip().split(',')[0]
  for key,pattern in rules.items():
   if len(groups[key])>=12 or url in seen[key]:continue
   if re.search(pattern,row.get('Categories','')+' '+row.get('Name',''),re.I):
    # No snapshot prices or stock assurances are displayed on campaign pages.
    groups[key].append({'id':row['ID'],'name':row['Name'],'url':url,'image':image,'category':category,'price':0,'source':'products.csv; display current details on product page'})
    seen[key].add(url)
  if all(len(v)>=12 for v in groups.values()):break
Path('data/campaigns').mkdir(exist_ok=True)
Path('data/campaigns/local-catalog.json').write_text(json.dumps({'source':'Repository catalog; selection is not a live inventory or promotional-price claim','groups':groups},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print({k:len(v) for k,v in groups.items()})
