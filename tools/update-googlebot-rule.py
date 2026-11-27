"""Narrow public-GET Googlebot exemption using Google's current published IPs.

No global security setting or existing rule is removed. CIDR collapsing preserves
the exact address union; it does not widen Google's published ranges.
"""
import ipaddress,json,os,pathlib,urllib.request
BASE='https://api.cloudflare.com/client/v4'
def api(path,method='GET',body=None):
    headers={'Authorization':'Bearer '+os.environ['CLOUDFLARE_API_TOKEN']}
    if body is not None:headers['Content-Type']='application/json'
    req=urllib.request.Request(BASE+path,headers=headers,method=method,data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req,timeout=35) as r:d=json.load(r)
    if not d.get('success'):raise RuntimeError('Cloudflare API did not confirm success')
    return d['result']
with urllib.request.urlopen('https://developers.google.com/static/crawling/ipranges/common-crawlers.json',timeout=25) as r:google=json.load(r)
nets=[ipaddress.ip_network(x.get('ipv4Prefix',x.get('ipv6Prefix'))) for x in google['prefixes']]
if not 50<len(nets)<2000:raise RuntimeError('Unexpected Google IP inventory')
collapsed=[n for version in (4,6) for n in ipaddress.collapse_addresses(n for n in nets if n.version==version)]
assert sum(n.num_addresses for n in collapsed)==sum(n.num_addresses for n in nets)
expression='(http.host in {"sastamilaga.com" "www.sastamilaga.com"} and cf.client.bot and (http.user_agent contains "Googlebot" or http.user_agent contains "GoogleOther" or http.user_agent contains "Google-InspectionTool") and ip.src in {'+' '.join(map(str,collapsed))+'} and http.request.method in {"GET" "HEAD"}'
for prefix in ['/wp-admin','/wp-login','/wp-json','/api/','/wc-api','/_sasta','/smcs-oauth','/cart','/checkout','/my-account','/account','/ur/cart','/ur/checkout','/ur/my-account','/.git','/private/','/backup/','/staging/','/test/']:
    expression+=' and not starts_with(lower(http.request.uri.path),"'+prefix+'")'
expression+=' and not (starts_with(http.request.uri.path,"/wp-content/uploads/") and ends_with(http.request.uri.path,"/"))'
for key in ['add-to-cart','sm_buy_now','wc-ajax','rest_route','order_key','remove_item']:
    expression+=' and not (http.request.uri.query contains "'+key+'")'
expression+=')'
if len(expression)>4096:raise RuntimeError('Expression exceeds the safe rule budget')
zones=api('/zones?name=sastamilaga.com');zone=zones[0]['id']
sets=api(f'/zones/{zone}/rulesets')
entry=next(x for x in sets if x['phase']=='http_request_firewall_custom' and x['kind']=='zone')
path=f'/zones/{zone}/rulesets/{entry["id"]}'
before=api(path);ref='sasta_verified_google_public_crawl_v1'
rule={'ref':ref,'description':'Verified Google crawler IPs: public read-only crawling; private and transactional routes excluded','expression':expression,'action':'skip','action_parameters':{'ruleset':'current','phases':['http_request_firewall_managed','http_ratelimit'],'products':['bic','securityLevel']},'logging':{'enabled':True},'enabled':True}
existing=next((x for x in before.get('rules',[]) if x.get('ref')==ref),None)
if existing:api(path+'/rules/'+existing['id'],'PATCH',rule)
else:
    if before.get('rules'):rule['position']={'before':before['rules'][0]['id']}
    api(path+'/rules','POST',rule)
after=api(path);preserved={x['id'] for x in before.get('rules',[]) if x.get('ref')!=ref}
assert preserved<={x['id'] for x in after.get('rules',[])}
saved=next(x for x in after['rules'] if x.get('ref')==ref)
assert saved['expression']==expression and saved['enabled']
result={'rule_id':saved['id'],'google_publication':google.get('creationTime'),'original_prefix_count':len(nets),'equivalent_collapsed_prefix_count':len(collapsed),'exact_ip_union_preserved':True,'existing_rules_preserved':True,'private_routes_excluded':True,'requires_cloudflare_verified_bot':True,'expression':expression}
pathlib.Path('artifacts').mkdir(exist_ok=True);pathlib.Path('artifacts/googlebot-rule.json').write_text(json.dumps(result,indent=2))
print(json.dumps({k:v for k,v in result.items() if k!='expression'}))
