"""Append live qualified CJ sitemaps, preserving local-product and blog indexes."""
from pathlib import Path
import subprocess,requests,xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[1]
ssh=['ssh','-T','-oBatchMode=yes','-oStrictHostKeyChecking=yes','-p','21098','altugpaa@162.0.232.232']
origin='/home/altugpaa/sastamilaga.com'
private='/home/altugpaa/gdcs-private/cj-storefront-20261115'
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
new=['sitemap-cj-products.xml','sitemap-cj-categories.xml','sitemap-cj-guides.xml','sitemap-cj-images.xml']
for name in new:
 r=requests.get('https://sastamilaga.com/'+name,timeout=60);r.raise_for_status();ET.fromstring(r.content)
for name in ['sitemap.xml','sitemap-pages.xml']:
 r=subprocess.run(ssh+['if test -f '+origin+'/'+name+'; then cat '+origin+'/'+name+'; else exit 42; fi'],capture_output=True)
 if r.returncode not in (0,42):raise RuntimeError('Cannot inspect origin sitemap; no mutation performed')
 body=r.stdout.decode() if r.returncode==0 else (root/name).read_text(encoding='utf-8')
 tree=ET.fromstring(body)
 if name=='sitemap.xml':
  for entry in list(tree):
   loc=entry.find('s:loc',ns)
   if loc is not None and loc.text.rsplit('/',1)[-1] in ['sitemap-global.xml','sitemap-global-qualified.xml']+new:tree.remove(entry)
  for child in new:
   entry=ET.SubElement(tree,'{'+ns['s']+'}sitemap');ET.SubElement(entry,'{'+ns['s']+'}loc').text='https://sastamilaga.com/'+child
 else:
  for entry in list(tree):
   loc=entry.find('s:loc',ns)
   if loc is not None and any(loc.text.startswith('https://sastamilaga.com/'+p) for p in ['global/','global-shop/','c/global/']):tree.remove(entry)
 ET.register_namespace('',ns['s']);out=ET.tostring(tree,encoding='utf-8',xml_declaration=True)+b'\n'
 (root/name).write_bytes(out)
 subprocess.run(ssh+['if test -f '+origin+'/'+name+'; then test -f '+private+'/'+name+'.before || cp -p '+origin+'/'+name+' '+private+'/'+name+'.before; fi'],check=True)
 subprocess.run(ssh+['if ! test -f '+private+'/'+name+'.source-before; then cat > '+private+'/'+name+'.source-before; else cat > /dev/null; fi'],input=body.encode(),check=True)
 subprocess.run(ssh+['cat > '+origin+'/'+name+'.sm-cj-new'],input=out,check=True)
 subprocess.run(ssh+['chmod 644 '+origin+'/'+name+'.sm-cj-new && mv '+origin+'/'+name+'.sm-cj-new '+origin+'/'+name],check=True)
 print(name,'deployed',len(list(tree)),'entries; previous file retained privately')
