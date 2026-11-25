#!/usr/bin/env python3
"""Streaming review-only keyword map. Accepts CSV, sitemap XML, or PR151 ZIP."""
import argparse, collections, csv, hashlib, io, json, pathlib, re, tempfile, unicodedata, zipfile
from urllib.parse import urlsplit, unquote
from xml.etree import ElementTree as ET
FIELDS="source_id source_file source_row entity_type observed_url candidate_url language market primary_keyword secondary_keywords search_intent recommended_title recommended_meta_description recommended_h1 question_h2s_faq category internal_link_candidate search_volume volume_status publication_state index_action review_status notes".split()
PRODUCTS={"PRODUCT_PAGE","CJ_PRODUCT_RECORD","LOCAL_OR_FEED_SOURCE_RECORD"}
def clean(v):return " ".join(unicodedata.normalize("NFC",str(v or "")).split())
def safe(v):
 v=str(v if v is not None else "")
 return "'"+v if v.lstrip().startswith(("=","+","-","@","\t","\r")) else v
def valid(u):
 try:
  p=urlsplit(u);return p.scheme=="https" and p.netloc.lower()=="sastamilaga.com" and not p.fragment
 except ValueError:return False
def product(u):
 if not valid(u):return False
 p=urlsplit(u).path
 if not p.startswith(("/p/","/product/","/global-shop/p/")):p=re.sub(r"^/[a-z]{2}(?:-[a-zA-Z]{2,8})?(?=/)","",p)
 return p.startswith(("/p/","/product/","/global-shop/p/"))
def slug(u):
 if not valid(u):return ""
 t=unquote(urlsplit(u).path.rstrip("/").split("/")[-1])
 t=re.sub(r"\.html$","",t,flags=re.I)
 return clean(re.sub(r"-(?:hhc-\d+(?:-\d+)?|shp-[0-9a-f]{16}|pe-[\d-]+)$","",t,flags=re.I).replace("-"," "))
def row(r,source,n):
 u=clean(r.get("observed_url") or r.get("url"));candidate=clean(r.get("candidate_url"))
 kind=clean(r.get("entity_type")) or ("PRODUCT_PAGE" if product(u) else "UNCLASSIFIED_SOURCE")
 title=clean(r.get("title") or r.get("primary_keyword_candidate"))
 origin="source title or prior candidate" if title else "URL-derived candidate"
 title=title or slug(u);q=title if len(title)<=240 else (title[:240].rsplit(" ",1)[0] or title[:240])
 if not re.search(r"[^\W_]",q):q=""
 lang=clean(r.get("language")) or "und";market=clean(r.get("market"))
 if not re.fullmatch("[A-Z]{2}",market):market=""
 isprod=kind in PRODUCTS
 state="URL_REVIEW_REQUIRED" if u and not valid(u) else ("REVIEW_REQUIRED" if q else "MISSING_TITLE")
 secondary="; ".join([q+" specifications",q+" product details"]) if q and isprod and lang=="en" else ""
 return dict(zip(FIELDS,[clean(r.get("source_id") or r.get("id")) or f"{source}:{n}",clean(r.get("source_file")) or source,n,kind,u,candidate,lang,market,q,secondary,clean(r.get("intent")) or ("commercial" if isprod else "unclassified"),q+" | Sasta Milaga" if q else "",("Explore "+q+". Check product details and available options.") if q and isprod and lang=="en" else "",title,("What are the listed specifications? | Which options are available? | How can I check delivery and returns?") if q and isprod and lang=="en" else "",clean(r.get("parent_category") or r.get("category")),clean(r.get("internal_link_target")),"","UNMEASURED",clean(r.get("publication_state")) or "UNVERIFIED","PRESERVE_EXISTING_REVIEW_ONLY",state,origin+"; no inferred delivery, stock, COD, brand, volume or redirect approval; candidate URLs require verification"]))
def csv_rows(s):
 r=csv.DictReader(s)
 if not r.fieldnames or not set(r.fieldnames)&{"url","observed_url","source_id","title","primary_keyword_candidate"}:raise ValueError("unrecognized CSV schema")
 for n,x in enumerate(r,2):
  if None in x:raise ValueError(f"extra CSV fields at {n}")
  yield n,x
def xml_rows(s):
 stack=[];n=0
 for event,el in ET.iterparse(s,events=("start","end")):
  tag=el.tag.rsplit("}",1)[-1]
  if event=="start":stack.append(tag);continue
  if tag=="loc" and len(stack)==3 and stack[-2] in ("url","sitemap"):
   n+=1;u=clean(el.text);yield n,{"url":u,"entity_type":"SITEMAP_INDEX_REFERENCE" if stack[-2]=="sitemap" else ("PRODUCT_PAGE" if product(u) else "OTHER_URL")}
  stack.pop();el.clear()
def export(inputs,output):
 out=pathlib.Path(output);out.parent.mkdir(parents=True,exist_ok=True)
 counts=collections.Counter();review=collections.Counter();sources={}
 with tempfile.TemporaryDirectory(dir=out.parent) as tmp:
  tmp=pathlib.Path(tmp);dest=tmp/"keyword-map.csv"
  with dest.open("w",encoding="utf-8-sig",newline="") as f:
   w=csv.DictWriter(f,fieldnames=FIELDS);w.writeheader()
   def consume(records,label):
    if label in sources:raise ValueError("duplicate source "+label)
    sources[label]=0
    for n,r in records:
     x=row(r,label,n);w.writerow({k:safe(v) for k,v in x.items()});counts[x["entity_type"]]+=1;review[x["review_status"]]+=1;sources[label]+=1
   for p in map(pathlib.Path,inputs):
    if p.suffix.lower()==".zip":
     with zipfile.ZipFile(p) as z:
      members=[n for n in z.namelist() if pathlib.PurePosixPath(n).name=="page-keyword-inventory.csv"]
      if len(members)!=1:raise ValueError("expected one inventory CSV")
      with io.TextIOWrapper(z.open(members[0]),encoding="utf-8-sig",newline="") as s:consume(csv_rows(s),p.name+"!"+members[0])
    elif p.suffix.lower()==".csv":
     with p.open(encoding="utf-8-sig",newline="") as s:consume(csv_rows(s),p.name)
    elif p.suffix.lower()==".xml":
     with p.open("rb") as s:consume(xml_rows(s),p.name)
    else:raise ValueError("unsupported input "+str(p))
  with dest.open("rb") as f:digest=hashlib.file_digest(f,"sha256").hexdigest()
  m={"schema":2,"total_rows":sum(counts.values()),"source_counts":sources,"entity_counts":dict(counts),"review_counts":dict(review),"sha256_keyword_map_csv":digest,"publication_approvals":0,"redirect_actions":0,"measured_search_volumes":0,"scope":"input records only; not upstream completeness or live URL validation"}
  with zipfile.ZipFile(tmp/"export.zip","w",compression=zipfile.ZIP_DEFLATED,compresslevel=4) as z:z.write(dest,"keyword-map.csv");z.writestr("manifest.json",json.dumps(m,indent=2,ensure_ascii=False))
  (tmp/"export.zip").replace(out)
 return m
if __name__=="__main__":
 p=argparse.ArgumentParser(description=__doc__);p.add_argument("inputs",nargs="+");p.add_argument("--output",default="keyword-map-v2.zip");a=p.parse_args();print(json.dumps(export(a.inputs,a.output),ensure_ascii=False,indent=2))
