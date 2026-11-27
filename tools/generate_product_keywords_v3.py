#!/usr/bin/env python3
"""V3 review-only normalization. Input membership is not entity or publication approval."""
import argparse,collections,csv,hashlib,io,json,pathlib,re,tempfile,zipfile
from urllib.parse import urlsplit,parse_qsl
SCHEMAS={
"legacy_page":"url page_type section primary_keyword secondary_keywords search_intent target_market language priority index_action recommended_url recommended_title recommended_meta_description recommended_h1 question_h2s_faq link_to notes",
"legacy_locale":"concept english_url english_keyword hreflang localized_keyword localized_url target_market rollout_tier status",
"inventory_v1":"entity_type source_id source_file observed_url candidate_url language market primary_keyword_candidate secondary_keyword_candidates intent parent_category internal_link_target search_volume volume_status publication_state review_required",
"keyword_v2":"source_id source_file source_row entity_type observed_url candidate_url language market primary_keyword secondary_keywords search_intent recommended_title recommended_meta_description recommended_h1 question_h2s_faq category internal_link_candidate search_volume volume_status publication_state index_action review_status notes",
"gsc":"observed_url actual_query clicks impressions ctr_percent average_position page_type intent_candidate start_date end_date source monthly_search_volume volume_status review_status"}
SCHEMAS={k:set(v.split()) for k,v in SCHEMAS.items()}
FIELDS="membership_id input_source input_row source_schema source_id entity_type observed_url_raw candidate_url_raw observed_url_state candidate_url_state raw_language_label normalized_language language_state raw_market_label market_candidate keyword_candidate intent_candidate source_review_state normalized_review_state index_action volume_status raw_source_json".split()
# Language identifiers only, not proof of locale, translation or hreflang eligibility.
LABELS={"國語":"zh","英文":"en","English":"en","西班牙語":"es","法語":"fr","العربية":"ar","阿拉伯語":"ar","印地語":"hi","俄語":"ru","粵語":"yue","意大利語":"it","德語":"de","土耳其語":"tr","日語":"ja","韓語":"ko","Bahasa Melayu":"ms","烏爾都語":"ur","印尼語":"id","越南語":"vi","高棉語":"km","波斯語":"fa","eng":"en","fra":"fr","spa":"es","tur":"tr","ben":"bn","rus":"ru","deu":"de","ara":"ar","lav":"lv"}
ACTION={"add-to-cart","sm_buy_now","remove_item","undo_item","wc-ajax","_wpnonce","pay_for_order","cancel_order","action"}
def safe(v):
 v=str(v if v is not None else "")
 return "'"+v if v.lstrip().startswith(("=","+","-","@")) or v.startswith(("\t","\r","\n")) else v
def url_state(raw):
 if not raw:return "ABSENT"
 try:
  if any(ord(c)<32 or c=="\\" for c in raw):return "INVALID"
  p=urlsplit(raw)
  if p.scheme!="https" or p.netloc.lower()!="sastamilaga.com" or p.fragment:return "INVALID_OR_EXTERNAL"
  if any(k.lower() in ACTION for k,_ in parse_qsl(p.query,keep_blank_values=True)):return "ACTION_DO_NOT_PROBE"
  if re.match(r"^/(?:wp-admin|wp-login\.php|cart|checkout|my-account|account|wp-json|api)(?:/|$)",p.path,re.I):return "PRIVATE_OR_UTILITY_REVIEW"
  return "PUBLIC_CANDIDATE_UNVERIFIED"
 except ValueError:return "INVALID"
def language(raw,registry):
 x=raw.strip()
 if not x or x=="und":return "und","UNKNOWN"
 if x in LABELS:return LABELS[x],"LABEL_MAPPED_NOT_LOCALE_APPROVED"
 if x.lower() in registry:return registry[x.lower()],"REGISTRY_DECLARED_NOT_PAGE_VERIFIED"
 return "und","UNMAPPED_REVIEW"
def normalize(r,kind,label,n,registry):
 u=r.get("observed_url","") or r.get("url","") or (r.get("english_url","") if kind=="legacy_locale" else "")
 c=r.get("candidate_url","") or r.get("recommended_url","") or r.get("localized_url","")
 raw=r.get("language","") or r.get("hreflang","")
 lang,ls=language(raw,registry)
 m=r.get("market","") or r.get("target_market","")
 kw=r.get("primary_keyword","") or r.get("primary_keyword_candidate","") or r.get("localized_keyword","") or r.get("actual_query","")
 us,cs=url_state(u),url_state(c)
 status="MISSING_TITLE" if not kw.strip() else "REVIEW_REQUIRED"
 if any(s in {"INVALID","INVALID_OR_EXTERNAL","ACTION_DO_NOT_PROBE","PRIVATE_OR_UTILITY_REVIEW"} for s in (us,cs)):status="URL_OR_ACTION_REVIEW"
 return dict(zip(FIELDS,[hashlib.sha256((label+"\0"+str(n)).encode()).hexdigest(),label,n,kind,r.get("source_id",""),r.get("entity_type","") or r.get("page_type","") or kind,u,c,us,cs,raw,lang,ls,m,m if re.fullmatch(r"[A-Z]{2}",m) else "",kw,r.get("search_intent","") or r.get("intent","") or r.get("intent_candidate",""),r.get("review_status","") or r.get("status",""),status,"PRESERVE_EXISTING_REVIEW_ONLY","UNMEASURED",json.dumps(r,ensure_ascii=False,separators=(",",":"))]))
def records(s):
 reader=csv.DictReader(s)
 h=reader.fieldnames or []
 matches=[k for k,v in SCHEMAS.items() if set(h)==v and len(h)==len(v)]
 if len(matches)!=1:raise ValueError("unsupported or ambiguous CSV schema")
 for n,r in enumerate(reader,2):
  if None in r or any(v is None for v in r.values()):raise ValueError(f"malformed CSV row {n}")
  yield n,matches[0],r
def export(inputs,output,registry,allow_private=False):
 out=pathlib.Path(output);out.parent.mkdir(parents=True,exist_ok=True)
 counts=collections.Counter();states=collections.Counter();langs=collections.Counter();sources={}
 with tempfile.TemporaryDirectory(dir=out.parent) as tmp:
  tmp=pathlib.Path(tmp);dest=tmp/"keyword-map-v3.csv"
  with dest.open("w",encoding="utf-8-sig",newline="") as f:
   w=csv.DictWriter(f,fieldnames=FIELDS);w.writeheader()
   def consume(s,label):
    if label in sources:raise ValueError("duplicate input "+label)
    sources[label]=0
    for n,k,r in records(s):
     if k=="gsc" and not allow_private:raise ValueError("private GSC input requires --allow-private")
     x=normalize(r,k,label,n,registry);w.writerow({k:safe(v) for k,v in x.items()});sources[label]+=1;counts[k]+=1;states[x["normalized_review_state"]]+=1;langs[x["language_state"]]+=1
   def archive(z,label,depth=0):
    names=[n for n in z.namelist() if pathlib.PurePosixPath(n).name in ("keyword-map.csv","page-keyword-inventory.csv","keyword-map-v2.zip")]
    if len(names)!=1:raise ValueError("ambiguous archive")
    n=names[0];info=z.getinfo(n)
    if info.file_size>4*1024**3:raise ValueError("archive exceeds configured limit")
    if n.endswith(".zip"):
     if depth or info.file_size>256*1024**2:raise ValueError("nested archive limit")
     with tempfile.TemporaryFile() as inner:
      with z.open(n) as src:
       while b:=src.read(1024*1024):inner.write(b)
      inner.seek(0)
      with zipfile.ZipFile(inner) as child:archive(child,label+"!"+n,depth+1)
    else:
     with io.TextIOWrapper(z.open(n),encoding="utf-8-sig",newline="") as s:consume(s,label+"!"+n)
   for p in map(pathlib.Path,inputs):
    if p.suffix.lower()==".zip":
     with zipfile.ZipFile(p) as z:archive(z,p.name)
    elif p.suffix.lower()==".csv":
     with p.open(encoding="utf-8-sig",newline="") as s:consume(s,p.name)
    else:raise ValueError("unsupported input type")
  with dest.open("rb") as f:digest=hashlib.file_digest(f,"sha256").hexdigest()
  report={"schema":3,"total_rows":sum(counts.values()),"source_counts":sources,"schema_counts":dict(counts),"review_counts":dict(states),"language_states":dict(langs),"sha256":digest,"publication_approvals":0,"redirect_actions":0,"measured_monthly_volumes":0,"private_input_enabled":allow_private,"scope":"source memberships; no live URL, translation or product verification"}
  with zipfile.ZipFile(tmp/"export.zip","w",compression=zipfile.ZIP_DEFLATED,compresslevel=4) as z:z.write(dest,dest.name);z.writestr("manifest.json",json.dumps(report,indent=2,ensure_ascii=False))
  (tmp/"export.zip").replace(out)
 return report
if __name__=="__main__":
 p=argparse.ArgumentParser();p.add_argument("inputs",nargs="+");p.add_argument("--output",required=True);p.add_argument("--registry",default="data/i18n/languages.json");p.add_argument("--allow-private",action="store_true");a=p.parse_args()
 r=json.loads(pathlib.Path(a.registry).read_text());registry={x["code"].lower():x["code"] for x in r}
 print(json.dumps(export(a.inputs,a.output,registry,a.allow_private),ensure_ascii=False,indent=2))
