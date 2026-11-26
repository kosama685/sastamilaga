#!/usr/bin/env python3
"""Repair exact HHC export-ID suffixes. Preserve all non-title bytes and product identity."""
import argparse, collections, csv, html, pathlib, re, os, tempfile, json
BRAND=" | Sasta Milaga"
ID=re.compile(r"-hhc-(\d{6,}(?:-\d{6,})?)\.html$",re.I)
PATTERNS=[
 re.compile(rb'(<title>)([^<]*)(</title>)',re.I),
 re.compile(rb'(<meta property="og:title" content=")([^"]*)(")',re.I),
 re.compile(rb'(<meta name="twitter:title" content=")([^"]*)(")',re.I)]
H1=re.compile(rb'<h1(?:\s[^>]*)?>(.*?)</h1>',re.I|re.S)
DANGLING=set("for with and & of in on to the a an by from - – | , +".split())
def visible(b):return " ".join(html.unescape(re.sub(r"<[^>]*>","",b.decode("utf-8"))).split())
def trim(s,n):
 if len(s)>n and not s[n].isspace():s=s[:n].rsplit(" ",1)[0] if " " in s[:n] else s
 else:s=s[:n]
 while s.split() and s.split()[-1].lower().strip(",;:") in DANGLING:s=s.rsplit(" ",1)[0] if " " in s else ""
 for a,b in [("(",")"),("[","]")]:
  if s.count(a)>s.count(b):s=s[:s.rfind(a)]
 return s.strip(" ,;:–-")
def candidate(name,variant,limit):
 # Preserve source numbers, capacities, model identifiers and option labels.
 if variant and " - " in name:
  main,opt=name.rsplit(" - ",1)
  if 1<=len(opt)<=35:
   base=trim(main.split(" | ")[0],max(22,limit-len(opt)-3))
   if base:return base+" – "+opt
  # Do not silently drop a long option: retain the complete visible title.
  return name
 head=name.split(" | ")[0]
 if len(head)<20 and " | " in name:head=" ".join(name.split(" | ")[:2])
 return trim(head,limit)
def inspect(p):
 raw=p.read_bytes();head=raw.split(b"</head>",1)[0]
 tags=[list(x.finditer(head)) for x in PATTERNS]
 old=visible(tags[0][0].group(2)) if len(tags[0])==1 else ""
 ident=ID.search(p.name)
 exact=bool(ident and old.endswith(" "+ident[1]+BRAND))
 if not exact:
  if re.search(r'\d{6,}',old) or not old:return old,"", "REVIEW_NUMERIC_OR_MISSING_TITLE",raw
  return old,"","UNCHANGED",raw
 if any(len(t)!=1 for t in tags) or len({visible(t[0].group(2)) for t in tags})!=1:return old,"","HELD_TITLE_TAG_MISMATCH",raw
 hs=H1.findall(raw)
 if len(hs)!=1:return old,"","HELD_H1",raw
 name=visible(hs[0]);suffix=" "+ident[1]
 if name.endswith(suffix):name=name[:-len(suffix)].strip()
 if not name or re.fullmatch(r'(?:product[- ]?)?[\d\- ]+',name,re.I):return old,"","HELD_NO_PRODUCT_NAME",raw
 return old,name,"CANDIDATE",raw
def normalized(raw):
 head,sep,rest=raw.partition(b"</head>")
 for pat in PATTERNS:head=pat.sub(lambda m:m[1]+b'__TITLE__'+m[3],head)
 return head+sep+rest
def rewrite(raw,new):
 head,sep,rest=raw.partition(b"</head>")
 if not sep:raise ValueError("head absent")
 v=html.escape(new,quote=True).encode()
 for pat in PATTERNS:
  head,n=pat.subn(lambda m:m[1]+v+m[3],head)
  if n!=1:raise ValueError("ambiguous title tag")
 out=head+sep+rest
 if normalized(out)!=normalized(raw):raise ValueError("non-title byte drift")
 return out
def safe(v):return "'"+v if v.lstrip().startswith(("=","+","-","@")) or v.startswith(("\t","\r","\n")) else v
def run(root,write,report,minimum=19000):
 root=pathlib.Path(root);files=sorted((root/"p").glob("*.html"))
 if len(files)<minimum:raise ValueError("unexpected catalog size: "+str(len(files)))
 taken=collections.Counter();pending=[];rows=[];stats=collections.Counter();brands=0;variants=0
 for p in files:
  old,name,state,raw=inspect(p)
  # Report unresolved source claims separately; never change schema or canonicals.
  brands+=bool(re.search(rb'"brand"\s*:\s*\{[^{}]*"name"\s*:\s*"Sasta Milaga"',raw))
  variants+=bool(re.search(r'-hhc-\d+-\d+\.html$',p.name))
  if state=="CANDIDATE":pending.append((p,old,name))
  else:
   taken[old.casefold()]+=1;stats[state]+=1
   if state!="UNCHANGED":rows.append([str(p.relative_to(root)),old,"",state])
 for p,old,name in pending:
  variant=bool(re.search(r'-hhc-\d+-\d+\.html$',p.name));new=""
  for lim in (52,60,68):
   val=candidate(name,variant,lim)
   if len(val)>=8 and not taken[(val+BRAND).casefold()]:new=val+BRAND;break
  state="FIXED"
  if not new:
   val=candidate(name,variant,68)
   if len(val)<8:
    rows.append([str(p.relative_to(root)),old,"","HELD_NAME_TOO_SHORT"]);stats["HELD_NAME_TOO_SHORT"]+=1;continue
   new=val+BRAND;state="FIXED_DUPLICATE_REVIEW"
  # A source title that cannot be distinguished from the exact suffix is held.
  ident=ID.search(p.name)
  if new.endswith(" "+ident[1]+BRAND):
   rows.append([str(p.relative_to(root)),old,"","HELD_SOURCE_ID"]);stats["HELD_SOURCE_ID"]+=1;continue
  if write:
   raw=p.read_bytes();old2,name2,state2,_=inspect(p)
   if (old2,name2,state2)!=(old,name,"CANDIDATE"):raise ValueError("source changed "+p.name)
   out=rewrite(raw,new)
   with tempfile.NamedTemporaryFile(dir=p.parent,delete=False) as tmp:tmp.write(out);temp=tmp.name
   os.chmod(temp,p.stat().st_mode & 0o777);os.replace(temp,p)
  taken[new.casefold()]+=1;stats[state]+=1;rows.append([str(p.relative_to(root)),old,new,state])
 report=pathlib.Path(report);report.parent.mkdir(parents=True,exist_ok=True)
 with report.open("w",encoding="utf-8-sig",newline="") as f:
  w=csv.writer(f);w.writerow(["file","old_title","new_title","status"]);w.writerows([[safe(v) for v in r] for r in rows])
 result={"pages":len(files),"status":dict(stats),"repaired_or_proposed":sum(stats[k] for k in ("FIXED","FIXED_DUPLICATE_REVIEW")),"brand_review_pages":brands,"variant_review_pages":variants,"write":write}
 print(json.dumps(result));return result
if __name__=="__main__":
 p=argparse.ArgumentParser();p.add_argument("--root",default=".");g=p.add_mutually_exclusive_group(required=True);g.add_argument("--write",action="store_true");g.add_argument("--check",action="store_true");g.add_argument("--plan",action="store_true");p.add_argument("--report",required=True);a=p.parse_args();r=run(a.root,a.write,a.report);raise SystemExit(1 if a.check and r["repaired_or_proposed"] else 0)
