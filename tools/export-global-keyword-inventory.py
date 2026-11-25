#!/usr/bin/env python3
"""Read-only inventory export. Every source row accounted for; no publication or rank claims."""
import csv, json, re, html, pathlib, collections, subprocess, sys, unicodedata, urllib.parse, xml.etree.ElementTree as ET
ROOT=pathlib.Path.cwd()
OUT=ROOT/"artifacts"/"global-keywords"; OUT.mkdir(parents=True,exist_ok=True)
BASE="https://sastamilaga.com"
FIELDS=["entity_type","source_id","source_file","observed_url","candidate_url","language","market","primary_keyword_candidate","secondary_keyword_candidates","intent","parent_category","internal_link_target","search_volume","volume_status","publication_state","review_required"]
counts=collections.Counter(); errors=[]; urls=set(); ids=set()
def clean(x):return re.sub(r"\s+"," ",html.unescape(re.sub(r"<[^>]*>"," ",str(x or "")))).strip()
def safe(x):
 if isinstance(x,str) and x.lstrip().startswith(("=","+","-","@","\t","\r")):return "'"+x
 return x
def title_slug(x):return clean(x.replace("-"," ").replace("_"," "))
def slug(x):return re.sub(r"[^a-z0-9]+","-",unicodedata.normalize("NFKD",x).encode("ascii","ignore").decode().lower()).strip("-")
def parse_assignment(p,prefix):
 s=p.read_text(encoding="utf-8-sig").strip()
 if not s.startswith(prefix):raise ValueError("assignment prefix")
 return json.loads(s[len(prefix):].rstrip(";").strip())
def write(w,kind,key,src,url,proposed,lang,market,keyword,secondary,intent,category="",link="",state="REVIEW_REQUIRED"):
 w.writerow([safe(x) for x in [kind,key,src,url,proposed,lang,market,keyword,secondary,intent,category,link,"","UNMEASURED",state,"YES"]]);counts[kind]+=1
def classify(u):
 p=urllib.parse.urlsplit(u).path
 p=re.sub(r"^/ur(?=/)","",p)
 if p.startswith("/p/") or p.startswith("/product/") or p.startswith("/global-shop/p/"):return "PRODUCT_PAGE","transactional"
 if p.startswith("/c/") or p.startswith("/product-category/"):return "CATEGORY_PAGE","commercial"
 if p.startswith("/visa/"):return "VISA_PAGE","informational"
 if p.startswith("/live-tv/"):return "TV_PAGE","watch / informational"
 if p.startswith("/videos/"):return "VIDEO_PAGE","watch / commercial"
 if p.startswith("/b/") or p.startswith("/blog/"):return "BLOG_PAGE","informational"
 if p.startswith(("/travel/","/flights/","/tours/")):return "TRAVEL_PAGE","commercial / informational"
 if p.startswith(("/checkout/","/cart/","/account/","/my-account/","/thank-you/","/track/","/invoice/","/search/")):return "UTILITY_PAGE","utility"
 return "SITE_PAGE","navigational / informational"
def key_for(u):
 p=urllib.parse.urlsplit(u).path; leaf=p.rstrip("/").split("/")[-1]
 return title_slug(re.sub(r"\.html$","",leaf)) if leaf else "Sasta Milaga"
def href_for(path):
 p=path.as_posix()
 return BASE+"/"+(p[:-10] if p.endswith("index.html") else p)
with (OUT/"page-keyword-inventory.csv").open("w",encoding="utf-8-sig",newline="") as f:
 w=csv.writer(f);w.writerow(FIELDS)
 # Enumerate all tracked XML sitemap files, not just the root index, and all HTML files.
 tracked=subprocess.check_output(["git","ls-files","-z"],text=True).split("\0")
 sitemap_paths=[pathlib.Path(p) for p in tracked if p.endswith(".xml") and "sitemap" in p.lower()]
 for p in sitemap_paths:
  try:
   root=ET.parse(p).getroot()
   for node in root:
    if node.tag.split("}")[-1]!="url":continue
    loc=next((x.text for x in node if x.tag.split("}")[-1]=="loc"),None)
    if not loc:errors.append([str(p),"missing URL"]);continue
    if loc in urls:counts["duplicate_sitemap_memberships"]+=1;continue
    urls.add(loc);kind,intent=classify(loc);kw=key_for(loc)
    write(w,kind,loc,str(p),loc,"","ur" if "/ur/" in loc else "und","",kw,"",intent,state="SITEMAP_DECLARED_NOT_LIVE_VERIFIED")
  except Exception as e:errors.append([str(p),str(e)[:250]])
 for name in tracked:
  if not name.lower().endswith((".html",".htm")):continue
  p=pathlib.Path(name);u=href_for(p)
  if u in urls:counts["html_already_in_sitemap"]+=1;continue
  try:
   t=p.read_text(encoding="utf-8",errors="replace");match=re.search(r"<title\b[^>]*>(.*?)</title>",t,re.I|re.S);kw=clean(match.group(1)) if match else key_for(u)
   kind,intent=classify(u)
   internal=name.startswith((".github/","backup/","staging/","docs/","tools/","assets/","examples/","wordpress/","server/","partials/","reports/","integrations/"))
   write(w,"INTERNAL_HTML" if internal else kind,name,name,"" if internal else u,"","ur" if name.startswith("ur/") else "und","",kw,"",intent,state="INTERNAL_REVIEW_NO_INDEX" if internal else "SOURCE_PRESENT_ROUTE_UNVERIFIED")
   urls.add(u)
  except Exception as e:errors.append([name,str(e)[:250]])
 # Preserve supplier identities even if no indexable page exists. No generated URL is asserted canonical.
 manifest=parse_assignment(ROOT/"data/cj/manifest.js","window.SM_CJ=")
 seen_categories=set();n=0
 for c in manifest["cats"]:
  cat=c["s"];name=c["n"];p=ROOT/"data/cj/c"/(cat+".js");seen_categories.add(cat)
  try:
   text=p.read_text(encoding="utf-8-sig").strip()
   m=re.fullmatch(r'SM_CJ_SHARD\((".*?"),(\[.*\])\);?',text,re.S)
   if not m or json.loads(m[1])!=cat:raise ValueError("shard category mismatch")
   rows=json.loads(m[2])
   if len(rows)!=c["c"]:errors.append([str(p),f"count drift expected {c['c']} got {len(rows)}"])
   for row in rows:
    if not isinstance(row,list) or len(row)<7:errors.append([str(p),"malformed row"]);continue
    pid,sku,product=row[:3];pid=str(pid);sku=str(sku);product=clean(product)
    ident=(pid,sku);n+=1
    if ident in ids:counts["duplicate_cj_id_sku"]+=1
    ids.add(ident)
    write(w,"CJ_PRODUCT_RECORD",pid+"|"+sku,str(p.relative_to(ROOT)),"",BASE+"/global-shop/p/"+urllib.parse.quote(pid,safe="")+"/"+(slug(product) or "product")+"/","en","",product,product+" specifications | "+product+" delivery options" if product else "","commercial",name,BASE+"/c/global/"+cat+".html","SUPPLIER_SNAPSHOT_NO_PUBLICATION_APPROVAL")
  except Exception as e:errors.append([str(p),str(e)[:250]])
 for p in (ROOT/"data/cj/c").glob("*.js"):
  if p.stem not in seen_categories:errors.append([str(p),"unregistered shard: reconcile, do not silently omit"])
 if n!=manifest["total"]:errors.append(["CJ manifest",f"expected {manifest['total']} rows, parsed {n}"])
 # Account for all CSV source records independently; never sum overlapping local exports as unique.
 for p in sorted((ROOT/"products-csv").glob("*.csv")):
  try:
   with p.open(encoding="utf-8-sig",newline="",errors="strict") as src:
    reader=csv.DictReader(src)
    if not reader.fieldnames:raise ValueError("missing CSV header")
    for i,row in enumerate(reader,2):
     fields={str(k).strip().lower():v for k,v in row.items() if k is not None}
     def field(*keys):return next((clean(fields.get(k)) for k in keys if clean(fields.get(k))),"")
     ident=field("sku","variant sku","id","item id","handle") or "row-"+str(i)
     title=field("name","title","product title")
     category=field("categories","product category","type","google_product_category")
     link=field("link","url","product url","permalink")
     link=link if link.startswith(BASE+"/") else ""
     write(w,"LOCAL_OR_FEED_SOURCE_RECORD",p.name+"|"+ident+"|"+str(i),str(p.relative_to(ROOT)),link,"","und","",title,"","commercial",category,"","SOURCE_ROW_RECONCILIATION_REQUIRED")
     if not title:counts["source_rows_missing_title"]+=1
  except Exception as e:errors.append([str(p),str(e)[:250]])
 # Parse the JSON portion of the TV snapshot without executing any JavaScript.
 try:
  p=ROOT/"data/livetv/channels.js";raw=p.read_text(encoding="utf-8-sig")
  marker="window.SM_LIVETV=";offset=raw.index(marker)+len(marker)
  db,_=json.JSONDecoder().raw_decode(raw[offset:].lstrip())
  for i,c in enumerate(db["items"]):
   ident=str(c.get("id") or "row-"+str(i));name=clean(c.get("name"))
   country=clean(c.get("cc") or c.get("country"));lang=clean(c.get("language"))
   write(w,"TV_CHANNEL_RECORD",ident,str(p.relative_to(ROOT)),"",BASE+"/live-tv/?channel="+urllib.parse.quote(ident,safe=""),lang,country,name,name+" TV schedule" if name else "","watch / informational",clean(c.get("category") or c.get("cat")),BASE+"/live-tv/","PLAYBACK_RIGHTS_AND_EPG_UNVERIFIED")
  dr=json.loads((ROOT/"data/livetv/discovery-report.json").read_text())
  if len(db["items"])!=dr["channels"]:errors.append(["TV snapshot","discovery count drift"])
 except Exception as e:errors.append(["TV snapshot",str(e)[:250]])

with (OUT/"language-country-coverage.csv").open("w",encoding="utf-8-sig",newline="") as f:
 w=csv.writer(f);w.writerow(["dimension","code","source_status","observations","release_status"])
 langs=json.loads((ROOT/"data/i18n/languages.json").read_text())
 for x in langs:w.writerow(["language",x["code"],x["status"],"registry declaration only","VERIFY_EVERY_TRANSLATED_PAGE"])
 countries=json.loads((ROOT/"data/landing/country-shipping-evidence.json").read_text())
 for k,v in sorted(countries["results"].items()):w.writerow(["destination",k,"historical sample only",v.get("methods"),"VERIFY_VARIANT_MARKET_ADDRESS"])
counts["language_registry"]=len(langs);counts["destination_registry"]=len(countries["results"])
# Unlisted database/feed records and dynamic routes need a separate authenticated export and reconciliation.
report={"counts":dict(counts),"unique_url_sources":len(urls),"cj_manifest_expected":manifest["total"],"cj_rows_parsed":n,"unique_cj_id_sku":len(ids),"errors":errors,"limitations":["Repository snapshot, not a live crawl or D1/CJ full reconciliation","Sitemap URL presence does not prove indexability","Dynamic TV programmes/EPG, WordPress-only posts, upstream missing supplier records and locale/market combinations need separate evidence exports","Candidates are unmeasured; no invented volume, approval or live availability","Source paths and candidate permalinks require validation before publication"]}
(OUT/"coverage.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False)[:12000])
if errors:sys.exit(1)
